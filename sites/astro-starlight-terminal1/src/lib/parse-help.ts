/**
 * parse-help — a pure, dependency-free build-time decomposer for captured Cobra
 * `-h`/`--help` output (the `Node.text` blobs in `help/<tool>.json`).
 *
 * This is a DISPLAY-ONLY parser. It never derives command-tree structure — the
 * tree comes from the JSON `commands[]` (help-dump-contract §5, a producer-side
 * obligation). The raw `text` stays the verbatim authority; this module only
 * decomposes it for a richer render (flags table, badges, copy affordances) and
 * the cross-tool command index. It is a faithful port of a Python prototype that
 * parsed all 6 tools / 120 commands / 156 flags with zero ragged lines.
 *
 * No npm import (Constitution VI) — plain string parsing. Runs at build time
 * only (Constitution I), invoked from component/page frontmatter.
 *
 * Parsing model:
 *   - Anchor ONLY on exact Cobra section headers. Everything before the FIRST
 *     anchor is the verbatim `description` (hop/shll carry hand-written Long
 *     blocks with their own "Usage:"/"Subcommands:"/"Notes" prose — those must
 *     survive untouched, so we never force-parse prose).
 *   - Within `Flags:` / `Global Flags:`, each flag line is matched by a single
 *     validated regex; the description begins at the first 2+-space gap.
 *   - Missing sections are simply absent (empty), never an error.
 */

/** One parsed flag row. */
export interface ParsedFlag {
  /** Short flag letter without the dash (e.g. "h" from "-h"), or null. */
  short: string | null;
  /** Long flag name without the dashes (e.g. "worktree-name"). */
  long: string;
  /**
   * Value placeholder sitting between `--long` and the 2+-space description gap.
   * MAY contain spaces (e.g. "brew update", "cmd[=__rk_riff_pane_bare__]"),
   * or null when the flag is a boolean switch with no placeholder.
   */
  placeholder: string | null;
  /** Best-effort type token when the placeholder is a simple single token (e.g. "string", "int"), else null. */
  argtype: string | null;
  /** Value extracted from a trailing "(default …)" in the description, else null. */
  default: string | null;
  /** True when the description contains "(required)" (case-insensitive). */
  required: boolean;
  /** Description, with any trailing "(default …)" suffix stripped out. */
  desc: string;
}

/** Decomposed view of a single command's `-h` blob. */
export interface ParsedHelp {
  /** Everything before the FIRST Cobra section anchor, preserved verbatim. */
  description: string;
  /** Lines under "Usage:". */
  usage: string[];
  /** Block under "Examples:" (often empty). */
  examples: string;
  /** Flags under "Flags:". */
  flags: ParsedFlag[];
  /** Flags under "Global Flags:". */
  globalFlags: ParsedFlag[];
}

/** Known Cobra section headers we anchor on — matched EXACTLY (header line only). */
const ANCHOR_RE = /^(Usage|Aliases|Examples|Available Commands|Flags|Global Flags):\s*$/;

/**
 * Flag-line grammar (the validated prototype regex, translated to JS named groups):
 *
 *   ^\s*
 *   (?:-(?<short>[A-Za-z]),\s+)?      optional "-x, "
 *   --(?<long>[A-Za-z0-9][A-Za-z0-9-]*)
 *   (?:[ \t](?<placeholder>\S.*?))??  optional placeholder (lazy; MAY contain spaces)
 *   \s{2,}                            the 2+-space gap before the description
 *   (?<desc>\S.*?)
 *   \s*$
 *
 * The placeholder is lazy + optional so the 2+-space gap is what actually
 * delimits the description; whatever sits between `--long` and that gap is the
 * placeholder (single-token types like `string`, multi-word like `brew update`,
 * or bracketed like `cmd[=__rk_riff_pane_bare__]`).
 */
const FLAG_RE =
  /^\s*(?:-(?<short>[A-Za-z]),\s+)?--(?<long>[A-Za-z0-9][A-Za-z0-9-]*)(?:[ \t](?<placeholder>\S.*?))??\s{2,}(?<desc>\S.*?)\s*$/;

/** A simple single-token type placeholder (e.g. "string", "int", "duration"). */
const SIMPLE_TYPE_RE = /^[A-Za-z][A-Za-z0-9_-]*$/;

/**
 * Trailing "(default …)" suffix at the very end of a description. The content
 * is `[^)]*` (not `.+?`) so the match is anchored to the LAST balanced
 * `(default …)` group at end-of-string — not an earlier inline mention of the
 * word "default" (e.g. `rk riff --layout`'s desc opens with `(default "auto").`
 * mid-sentence AND closes with a trailing `(default "auto")`; only the latter is
 * the real default). Requires a space after "default" so Cobra's
 * `(default: auto — …)` colon form is NOT treated as a default token.
 */
const DEFAULT_RE = /\s*\(default\s+([^)]*)\)\s*$/;

/** The Cobra footer we always discard. */
const FOOTER_RE = /^Use\s+".*--help".*$/;

/**
 * Parse the FIRST line of a flag entry. Returns null when the line is not a
 * flag start (a wrapped continuation, or the `Use "… --help"` footer) — callers
 * treat a null as "ragged" only for diagnostics; here it just means "not a
 * flag". The returned flag's `desc` is the first-line description only;
 * `default`/`required`/`argtype` are finalized in {@link finalizeFlag} AFTER any
 * wrapped continuation lines have been folded into `desc`.
 */
function parseFlagLine(line: string): ParsedFlag | null {
  const m = FLAG_RE.exec(line);
  if (!m || !m.groups) return null;

  const placeholder = m.groups.placeholder ?? null;
  return {
    short: m.groups.short ?? null,
    long: m.groups.long,
    placeholder,
    argtype: placeholder && SIMPLE_TYPE_RE.test(placeholder) ? placeholder : null,
    default: null,
    required: false,
    desc: m.groups.desc,
  };
}

/**
 * Finalize a flag after its (possibly wrapped) `desc` is fully assembled: split
 * a trailing "(default …)" out of `desc` into `default`, and set `required`.
 * Done post-fold so a `(default …)` that lands at the very end of a wrapped
 * description (e.g. `rk riff --layout`, whose default trails the ASCII art) is
 * still captured.
 */
function finalizeFlag(flag: ParsedFlag): void {
  const defMatch = DEFAULT_RE.exec(flag.desc);
  if (defMatch) {
    flag.default = defMatch[1];
    flag.desc = flag.desc.slice(0, defMatch.index).replace(/\s+$/, '');
  }
  flag.required = /\(required\)/i.test(flag.desc);
}

/**
 * A line under a flags section is "ragged" only when it is non-blank, not the
 * footer, does NOT start a new flag, AND no flag precedes it in the section to
 * continue. Cobra wraps long flag descriptions (e.g. `rk riff --layout`'s ASCII
 * layout diagrams) onto deeply-indented continuation lines — those continue the
 * previous flag's description and are NOT ragged.
 */
function isFlagStart(line: string): boolean {
  return FLAG_RE.test(line);
}

/**
 * Diagnostic-only: return the lines under a `Flags:` / `Global Flags:` section
 * that are genuinely ragged (see {@link isFlagStart}). Used by the unit test to
 * assert zero ragged lines across the whole corpus; not used at render time.
 */
export function raggedFlagLines(text: string): string[] {
  const lines = text.split('\n');
  const ANCHOR = /^(Usage|Aliases|Examples|Available Commands|Flags|Global Flags):\s*$/;
  let inFlags = false;
  let haveFlag = false; // a flag has started in the current section → continuations allowed
  const ragged: string[] = [];
  for (const line of lines) {
    const anchor = ANCHOR.exec(line);
    if (anchor) {
      inFlags = anchor[1] === 'Flags' || anchor[1] === 'Global Flags';
      haveFlag = false;
      continue;
    }
    if (!inFlags) continue;
    if (line.trim() === '') continue;
    if (FOOTER_RE.test(line)) continue;
    if (isFlagStart(line)) {
      haveFlag = true;
      continue;
    }
    // Not a flag start: a continuation of the previous flag (fine) or ragged.
    if (!haveFlag) ragged.push(line);
  }
  return ragged;
}

/**
 * Decompose a Cobra `-h` blob into its structured parts. Pure and total: any
 * input yields a `ParsedHelp` (missing sections → empty), never throws.
 */
export function parseHelp(text: string): ParsedHelp {
  const lines = text.split('\n');

  const result: ParsedHelp = {
    description: '',
    usage: [],
    examples: '',
    flags: [],
    globalFlags: [],
  };
  // Collect prose / examples line-by-line, then join into their string fields.
  const descLines: string[] = [];
  const exampleLines: string[] = [];

  // Section state machine. `null` = preamble (description), before the first anchor.
  type Section = 'usage' | 'aliases' | 'examples' | 'available' | 'flags' | 'global' | null;
  let section: Section = null;
  let seenAnchor = false;
  // The flag whose (possibly wrapped) description is still open, so a
  // continuation line folds into it rather than being dropped.
  let lastFlag: ParsedFlag | null = null;

  for (const line of lines) {
    const anchor = ANCHOR_RE.exec(line);
    if (anchor) {
      seenAnchor = true;
      lastFlag = null;
      switch (anchor[1]) {
        case 'Usage':
          section = 'usage';
          break;
        case 'Aliases':
          section = 'aliases';
          break;
        case 'Examples':
          section = 'examples';
          break;
        case 'Available Commands':
          section = 'available';
          break;
        case 'Flags':
          section = 'flags';
          break;
        case 'Global Flags':
          section = 'global';
          break;
      }
      continue;
    }

    // Discard the trailing Cobra footer wherever it appears.
    if (FOOTER_RE.test(line)) continue;

    if (!seenAnchor) {
      // Preamble: verbatim description (never force-parsed).
      descLines.push(line);
      continue;
    }

    switch (section) {
      case 'usage':
        if (line.trim() !== '') result.usage.push(line.trim());
        break;
      case 'examples':
        exampleLines.push(line);
        break;
      case 'flags':
      case 'global': {
        const target = section === 'flags' ? result.flags : result.globalFlags;
        const flag = parseFlagLine(line);
        if (flag) {
          target.push(flag);
          lastFlag = flag;
        } else if (line.trim() !== '' && lastFlag) {
          // A wrapped continuation of the open flag's description (e.g. the
          // ASCII layout diagrams under `rk riff --layout`). Fold it in so it
          // is not lost; collapse the indent to a single space.
          lastFlag.desc = `${lastFlag.desc} ${line.trim()}`.trimEnd();
        }
        break;
      }
      // 'aliases' and 'available' are not surfaced in the structured view
      // (the tree comes from JSON commands[]); we intentionally skip their bodies.
      default:
        break;
    }
  }

  // Finalize each flag once its wrapped description is fully assembled.
  for (const f of result.flags) finalizeFlag(f);
  for (const f of result.globalFlags) finalizeFlag(f);

  // Trim a leading/trailing blank line off the description but otherwise keep it
  // byte-for-byte (internal blank lines and indentation are meaningful prose).
  result.description = descLines.join('\n').replace(/^\n+/, '').replace(/\s+$/, '');
  result.examples = exampleLines.join('\n').trim();

  return result;
}
