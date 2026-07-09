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

/**
 * Stable DOM id / anchor slug for a command path (e.g. "hop clone" → "cmd-hop-clone").
 * Shared so the per-command `<details>` id (CommandReference) and the
 * right-rail ToC link (CommandsToc override) agree without drift. Lowercased,
 * non-alphanumerics collapsed to single hyphens.
 */
export function commandSlug(path: string): string {
  return `cmd-${path.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
}

/** Known Cobra section headers we anchor on — matched EXACTLY (header line only). */
const ANCHOR_RE = /^(Usage|Aliases|Examples|Available Commands|Flags|Global Flags):\s*$/;

/**
 * Any line that LOOKS like a section header (a short capitalised label ending in
 * a colon, on its own line) but is NOT one of our known anchors. Hand-written
 * `Long` blocks use these — e.g. `hop`'s `Notes:` and `Getting started:`. Such a
 * header TERMINATES the current section: subsequent lines are ignored for
 * structured extraction (they remain in the verbatim raw `-h`), rather than
 * bleeding into the previous section (which made `Notes:` render as usage rows).
 * Constrained to <= ~4 words so it doesn't match ordinary prose ending in a colon.
 */
const UNKNOWN_HEADER_RE = /^[A-Z][A-Za-z]*(?: [A-Za-z]+){0,3}:\s*$/;

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
 * word "default" (e.g. `run-kit riff --layout`'s desc opens with `(default "auto").`
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
 *
 * Cobra emits the real `(default …)` at the very END of a flag's description —
 * but it wraps with the rest of the desc, so for a multi-line desc the default
 * lands on the LAST continuation line, not the first (e.g. `run-kit riff --layout`,
 * whose `(default "auto")` trails its ASCII diagram). With continuation
 * newlines+indentation now preserved, `DEFAULT_RE`'s `$` anchor no longer
 * reaches the end of the blob, so default-extraction runs on the LAST line and
 * the (stripped) last line is re-joined with the preceding lines. This also
 * still handles the single-line case (last line === only line). The mid-sentence
 * `(default "auto").` that opens the same desc is deliberately NOT matched —
 * DEFAULT_RE anchors to end-of-line, so only the genuine trailing default wins.
 */
function finalizeFlag(flag: ParsedFlag): void {
  const nl = flag.desc.lastIndexOf('\n');
  const head = nl === -1 ? '' : flag.desc.slice(0, nl + 1); // includes trailing "\n"
  const lastLine = nl === -1 ? flag.desc : flag.desc.slice(nl + 1);

  const defMatch = DEFAULT_RE.exec(lastLine);
  if (defMatch) {
    flag.default = defMatch[1];
    const trimmedLast = lastLine.slice(0, defMatch.index).replace(/\s+$/, '');
    // Drop the last line entirely if it held nothing but the default token
    // (Cobra wrapped a bare `(default …)` onto its own continuation line).
    flag.desc = trimmedLast === '' ? head.replace(/\n$/, '') : head + trimmedLast;
  }
  flag.required = /\(required\)/i.test(flag.desc);
}

/**
 * A line under a flags section is "ragged" only when it is non-blank, not the
 * footer, does NOT start a new flag, AND no flag precedes it in the section to
 * continue. Cobra wraps long flag descriptions (e.g. `run-kit riff --layout`'s ASCII
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
 * Find where Cobra's GENERATED section block begins — the index of the first
 * line of the LAST contiguous run of known anchors.
 *
 * Cobra always emits the author's free-form `Long` text FIRST, then its own
 * generated sections (Usage / Aliases / Examples / Available Commands / Flags /
 * Global Flags) as one contiguous block at the END. A hand-written `Long` may
 * itself contain header-looking prose — even lines that read exactly like a
 * Cobra anchor (`hop`'s old `Long` had its own `Usage:` and `Notes:`). The
 * robust boundary is therefore not "first anchor" but "start of the final
 * contiguous anchor run": everything before it is authored prose (→ description,
 * verbatim), everything from it on is the real generated block (→ structured).
 *
 * "Contiguous run" = anchors whose bodies (and the blank lines Cobra puts
 * between sections) contain no further authored prose. We detect a break in the
 * run when, scanning upward, the gap between two anchors contains a
 * header-looking line that is NOT itself a known anchor (e.g. `Notes:`) — that
 * marks authored prose, so the run starts at the anchor below the break.
 *
 * Returns `lines.length` if there are no anchors at all (whole text is prose).
 */
function findGeneratedBlockStart(lines: string[]): number {
  // Indices of every known-anchor line.
  const anchorIdx: number[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (ANCHOR_RE.test(lines[i])) anchorIdx.push(i);
  }
  if (anchorIdx.length === 0) return lines.length;

  // Walk anchors from the last upward; extend the run while the gap to the
  // previous anchor is "clean" (no unknown header-like prose between them).
  let start = anchorIdx[anchorIdx.length - 1];
  for (let k = anchorIdx.length - 1; k > 0; k -= 1) {
    const prev = anchorIdx[k - 1];
    const cur = anchorIdx[k];
    let proseBetween = false;
    for (let j = prev + 1; j < cur; j += 1) {
      const ln = lines[j];
      // An unknown header-like line (e.g. `Notes:`) between two anchors means the
      // earlier anchor is authored prose, not part of the generated tail.
      if (UNKNOWN_HEADER_RE.test(ln) && !ANCHOR_RE.test(ln)) {
        proseBetween = true;
        break;
      }
    }
    if (proseBetween) break; // run starts at `cur` (already in `start`)
    start = prev; // gap is clean — absorb the previous anchor into the run
  }
  return start;
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
  const exampleLines: string[] = [];

  // Split at the start of Cobra's generated tail. Everything BEFORE is the
  // author's free-form Long text — kept verbatim as the description, including
  // any hand-written `Usage:`/`Notes:`/`Cheat Sheet:` prose. Everything FROM
  // there is the real generated block, which we structure-parse below.
  const blockStart = findGeneratedBlockStart(lines);
  const descLines = lines.slice(0, blockStart);

  // Section state machine over the generated tail only (one clean Cobra block).
  type Section = 'usage' | 'aliases' | 'examples' | 'available' | 'flags' | 'global' | null;
  let section: Section = null;
  // The flag whose (possibly wrapped) description is still open, so a
  // continuation line folds into it rather than being dropped.
  let lastFlag: ParsedFlag | null = null;

  for (let i = blockStart; i < lines.length; i += 1) {
    const line = lines[i];
    const anchor = ANCHOR_RE.exec(line);
    if (anchor) {
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
          // ASCII layout diagrams under `run-kit riff --layout`). Fold it in on its
          // own line, KEEPING the raw line (with its original leading
          // whitespace) so multi-line content — diagrams, indented sub-points —
          // survives intact rather than being collapsed to a single space. The
          // trailing whitespace is trimmed; the first line's desc is untouched.
          lastFlag.desc = `${lastFlag.desc}\n${line.replace(/\s+$/, '')}`;
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
  // Trim only leading/trailing BLANK lines — preserve per-line indentation
  // (Cobra indents example lines by 2 spaces; a bare `.trim()` would strip the
  // first example's leading indent). Mirrors the description trim above.
  result.examples = exampleLines.join('\n').replace(/^\n+/, '').replace(/\s+$/, '');

  return result;
}
