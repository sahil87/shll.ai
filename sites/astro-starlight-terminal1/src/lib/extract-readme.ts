/**
 * extract-readme — a pure, dependency-free build-time transform that deduces the
 * shll.ai site slice from a tool's canonical `README.md`, plus the `vn39`
 * validation gate that guards the pulled prose against fabricated commands/flags.
 *
 * This is the README-prose counterpart to `parse-help.ts` (which decomposes the
 * machine-generated command reference). Like that module it is:
 *   - PURE and TOTAL — any string input yields a result, never throws.
 *   - DEPENDENCY-FREE — no npm import (Constitution VI); plain string parsing.
 *   - BUILD-TIME ONLY (Constitution I) — invoked from the render component's
 *     frontmatter and from the scheduled pull workflow's CLI.
 *
 * The mechanical behavior here is the authority for the prose in
 * `docs/specs/readme-extraction-contract.md`; on any discrepancy the spec is
 * reconciled to this code (this is what the workflow and the component run).
 *
 * Deduction model (contract §1/§2/§6):
 *   - HEAD (§1): skip a contiguous leading run of GitHub chrome — the single H1,
 *     a single `> blockquote`, and any image/badge lines (with interleaved blank
 *     lines). Stop at the first non-blank line that is none of those; the slice
 *     begins there.
 *   - TAIL (§2): stop just before the first denylisted section heading
 *     (Contributing / Development / Building / License / Acknowledgements),
 *     matched case-insensitively on `##`/`###` heading text. Install is KEPT;
 *     Changelog / Roadmap / FAQ are KEPT.
 *   - STRIPS (§6): remove inline ```mermaid fenced blocks and any image whose URL
 *     carries the GitHub-proprietary `#gh-dark-mode-only` / `#gh-light-mode-only`
 *     fragment. Ordinary code fences and plain images survive.
 *
 * Validation gate (contract §7): `findUnknownTokens(slice, helpDoc)` returns the
 * command/flag tokens referenced by the slice that are ABSENT from the tool's
 * help tree — the SOLE guard on pulled-install accuracy now that Install is
 * pulled. The workflow fails a tool's pull when this set is non-empty; the unit
 * test pins the same behavior, so CI and test cannot drift.
 */
import { parseHelp } from './parse-help.ts';
import type { HelpDoc, Node } from './schemas.ts';

// ── §1/§2/§6 deduction ──────────────────────────────────────────────────────

/** The result of deducing the site slice from a raw README. */
export interface ExtractedReadme {
  /** The deduced + stripped site slice (markdown), with a single trailing newline. */
  slice: string;
}

/** Tail-rule denylist (contract §2): the first such heading terminates the slice.
 *  Matched case-insensitively against `##`/`###` heading TEXT. Note `Install` is
 *  deliberately ABSENT (it is pulled), as are `Changelog`/`Roadmap`/`FAQ`. */
const DENYLIST_HEADINGS = new Set([
  'contributing',
  'development',
  'building',
  'license',
  'acknowledgements',
]);

/** A `##` or `###` ATX heading line → captured heading text (trimmed of trailing #s). */
const HEADING_RE = /^#{2,3}\s+(.+?)\s*#*\s*$/;

/** A single leading H1 (`# tool-name`). Only the FIRST line may be the H1. */
const H1_RE = /^#\s+\S/;

/** A blockquote line (`>` …) — the toolkit blockquote and its wrapped lines. */
const BLOCKQUOTE_RE = /^>\s?/;

/**
 * A head-chrome image/badge line: a markdown image `![alt](url)`, a linked badge
 * `[![alt](img)](href)`, or an HTML image wrapper (`<p …><img …>`, bare `<img …>`,
 * `<picture>`/`<source>`). The whole line must be chrome (possibly several images
 * on one line) — a prose line that merely contains an inline image is NOT chrome.
 */
const BADGE_LINE_RE =
  /^(?:\s*(?:\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)|!\[[^\]]*\]\([^)]*\)|<\/?(?:p|img|picture|source|a|div)\b[^>]*>))+\s*$/i;

/** Opening fence of an inline mermaid block: ```mermaid (any indent, any fence
 *  char run length). The matching close is the next fence of the same family. */
const MERMAID_OPEN_RE = /^(\s*)(`{3,}|~{3,})\s*mermaid\s*$/i;

/** Any fenced-code opening/closing line → the fence token (``` or ~~~ run). */
const FENCE_RE = /^(\s*)(`{3,}|~{3,})/;

/** A markdown image whose URL carries the GitHub theme-only fragment (§4/§6).
 *  `g` so every occurrence on a line is removed; `i` for the fragment casing. */
const GH_THEME_IMG_RE =
  /!\[[^\]]*\]\([^)]*#gh-(?:dark|light)-mode-only[^)]*\)/gi;

/**
 * Compute the head boundary (contract §1): the index of the first slice line.
 * Skips a contiguous leading run of blank lines, the single H1, a single
 * blockquote (including its wrapped continuation lines), and image/badge lines.
 * Stops at the first non-blank line that is none of those.
 */
function headBoundary(lines: string[]): number {
  let i = 0;
  // Only the FIRST leading heading is treated as the tool-name H1 chrome; a
  // later `# …` is a real section and must NOT be skipped, so it stops the head.
  let h1Consumed = false;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i += 1;
      continue;
    }
    if (!h1Consumed && H1_RE.test(line)) {
      h1Consumed = true;
      i += 1;
      continue;
    }
    if (BLOCKQUOTE_RE.test(line)) {
      // Consume this and any contiguous blockquote continuation lines as the
      // single leading blockquote. (Only one leading blockquote is expected;
      // contiguous `>` lines are one block.)
      i += 1;
      while (i < lines.length && BLOCKQUOTE_RE.test(lines[i])) i += 1;
      continue;
    }
    if (BADGE_LINE_RE.test(line)) {
      i += 1;
      continue;
    }
    // First line that is none of {blank, H1, blockquote, badge/image}: slice start.
    break;
  }
  return i;
}

/**
 * Compute the tail boundary (contract §2): the index one past the last slice
 * line — i.e. the index of the first denylisted heading at or after `start`, or
 * `lines.length` when none is present. Headings inside fenced code blocks are
 * NOT treated as headings (a `## ...` line inside a ```` ``` ```` block is code).
 */
function tailBoundary(lines: string[], start: number): number {
  let fenceToken: string | null = null;
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i];
    const fence = FENCE_RE.exec(line);
    if (fence) {
      const token = fence[2][0]; // '`' or '~'
      if (fenceToken === null) {
        fenceToken = token;
      } else if (fenceToken === token) {
        fenceToken = null; // closing fence of the same family
      }
      continue;
    }
    if (fenceToken !== null) continue; // inside a code block — not a heading
    const heading = HEADING_RE.exec(line);
    if (heading && DENYLIST_HEADINGS.has(heading[1].trim().toLowerCase())) {
      return i;
    }
  }
  return lines.length;
}

/**
 * Strip inline ```` ```mermaid ```` fenced blocks (contract §5/§6). Removes the
 * opening mermaid fence through its matching close. Non-mermaid fences survive.
 * Operates on whole lines so it composes cleanly with the boundary cuts.
 */
function stripMermaid(lines: string[]): string[] {
  const out: string[] = [];
  let inMermaid = false;
  let mermaidFence: string | null = null;
  for (const line of lines) {
    if (!inMermaid) {
      const open = MERMAID_OPEN_RE.exec(line);
      if (open) {
        inMermaid = true;
        mermaidFence = open[2][0]; // '`' or '~'
        continue; // drop the opening fence line
      }
      out.push(line);
      continue;
    }
    // Inside a mermaid block: drop lines until the matching close fence.
    const fence = FENCE_RE.exec(line);
    if (fence && fence[2][0] === mermaidFence) {
      inMermaid = false;
      mermaidFence = null;
    }
    // drop this line (the close fence itself is dropped too)
  }
  return out;
}

/**
 * Strip GitHub theme-only images (contract §4/§6) line-by-line. A line that
 * becomes empty after removing its only (theme-only) image is dropped entirely
 * so the slice does not accumulate blank residue.
 */
function stripGhThemeImages(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    if (!GH_THEME_IMG_RE.test(line)) {
      out.push(line);
      continue;
    }
    // Reset lastIndex (the test above advanced it on the `g` regex) before replace.
    GH_THEME_IMG_RE.lastIndex = 0;
    const stripped = line.replace(GH_THEME_IMG_RE, '').trim();
    if (stripped !== '') out.push(stripped);
    GH_THEME_IMG_RE.lastIndex = 0;
  }
  return out;
}

/**
 * Deduce the shll.ai site slice from a raw README (contract §1 head + §2 tail +
 * §6 strips). Pure and total — any input yields an {@link ExtractedReadme}.
 */
export function extractReadme(markdown: string): ExtractedReadme {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  const start = headBoundary(lines);
  const end = tailBoundary(lines, start);
  let body = lines.slice(start, end);

  body = stripMermaid(body);
  body = stripGhThemeImages(body);

  // Normalize edges: trim leading/trailing blank lines, collapse a run of 3+
  // blank lines (left by a stripped block) to a single blank line, end with one
  // trailing newline. Internal single blank lines (paragraph breaks) survive.
  let slice = body.join('\n').replace(/^\n+/, '').replace(/\n+$/, '');
  slice = slice.replace(/\n{3,}/g, '\n\n');
  return { slice: slice === '' ? '' : `${slice}\n` };
}

// ── §7 validation gate (the `vn39` cross-check) ─────────────────────────────

/** A binary name → the set of valid command PATHS in its help tree, the
 *  per-path set of valid child subcommand NAMES (so we can tell a fabricated
 *  subcommand from an ordinary positional arg), plus the set of valid flag
 *  tokens (`--long` and `-x`) across all commands. */
interface HelpFacts {
  binary: string;
  commandPaths: Set<string>;
  /** path → set of its direct child subcommand names. A path absent here (or
   *  present with an empty set) is a LEAF: tokens after it are positional args. */
  childrenOf: Map<string, Set<string>>;
  flags: Set<string>;
}

/** Depth-first walk of a help Node tree. */
function* walkNodes(node: Node): Generator<Node> {
  yield node;
  for (const child of node.commands ?? []) yield* walkNodes(child);
}

/**
 * Collect the ground-truth command paths, the parent→children map, and flag
 * tokens from a tool's help document. Command paths and the children map come
 * from the JSON `commands[]` tree (e.g. "shll" → {install, shell-init, …}); flags
 * come from the build-time `parseHelp` decomposition of each node's `text` (so
 * flag truth is the same one the command reference trusts — no second source).
 * `-h`/`--help`/`-v`/`--version` are universal and always treated as valid.
 */
function helpFacts(doc: HelpDoc): HelpFacts {
  const commandPaths = new Set<string>();
  const childrenOf = new Map<string, Set<string>>();
  const flags = new Set<string>(['--help', '-h', '--version', '-v']);
  for (const node of walkNodes(doc.root)) {
    commandPaths.add(node.path);
    childrenOf.set(node.path, new Set((node.commands ?? []).map((c) => c.name)));
    const parsed = parseHelp(node.text);
    for (const f of [...parsed.flags, ...parsed.globalFlags]) {
      flags.add(`--${f.long}`);
      if (f.short) flags.add(`-${f.short}`);
    }
  }
  return { binary: doc.root.path, commandPaths, childrenOf, flags };
}

/** Spans of `inline code` and fenced ``` code ``` — where command/flag examples
 *  live. We scan ONLY these, not free prose, to stay conservative (vn39's gate
 *  is about example accuracy, not catching the binary's name in a sentence). */
function codeSpans(slice: string): string[] {
  const spans: string[] = [];
  const lines = slice.split('\n');
  let fenceToken: string | null = null;
  for (const line of lines) {
    const fence = FENCE_RE.exec(line);
    if (fence) {
      const token = fence[2][0];
      if (fenceToken === null) fenceToken = token;
      else if (fenceToken === token) fenceToken = null;
      continue; // the fence line itself carries no command
    }
    if (fenceToken !== null) {
      spans.push(line);
      continue;
    }
    // Outside a fence: pull inline `code` spans from this prose line.
    const inline = line.match(/`[^`]+`/g);
    if (inline) for (const c of inline) spans.push(c.replace(/`/g, ''));
  }
  return spans;
}

/** Flag-token shape: `--long-name` or a single-letter `-x` (not `--`, not a bare
 *  hyphen, not a negative number). Captured WITHOUT any `=value` suffix. */
const FLAG_TOKEN_RE = /(?:^|\s)(--[A-Za-z][A-Za-z0-9-]*|-[A-Za-z])\b/g;

/**
 * §7 gate. Given a deduced slice and the tool's help document, return the sorted,
 * de-duplicated list of command-path / flag tokens referenced in the slice's code
 * spans that are ABSENT from the help tree. Empty list = the slice passes.
 *
 * Detection is intentionally conservative (mirrors vn39's grep-zero + per-command
 * cross-check, not a full shell parser):
 *   - COMMAND PATHS: within each code span, walk the help TREE from the binary,
 *     descending only while the next bare-word token is a known CHILD subcommand
 *     of the current node. Flag a token ONLY when the current node HAS children
 *     and the token is not one of them (a fabricated subcommand, e.g.
 *     `shll shell-install`, `wt summon`). Once a known LEAF command is reached
 *     (no children), the remaining tokens are positional ARGS and are NOT flagged
 *     (e.g. `shll install mytool`, `wt create feature`, `hop clone myrepo`).
 *     Lines not starting with the binary are ignored (not this tool's commands).
 *   - FLAGS: any `--long` / `-x` token in a code span that follows the binary and
 *     is absent from the tool's parsed flag set.
 *
 * Pure and total — never throws.
 */
export function findUnknownTokens(slice: string, doc: HelpDoc): string[] {
  const facts = helpFacts(doc);
  const unknown = new Set<string>();

  for (const span of codeSpans(slice)) {
    // Split the span into shell-ish statements (newlines, `&&`, `|`, `;`) and
    // check each independently so one statement's binary doesn't bleed into the
    // next.
    for (const rawStmt of span.split(/\n|&&|\|\||[|;]/)) {
      const stmt = rawStmt.trim();
      if (stmt === '') continue;
      // Drop a leading comment, and stop at an inline `#` comment.
      const noComment = stmt.replace(/#.*$/, '').trim();
      if (noComment === '') continue;
      const tokens = noComment.split(/\s+/);
      if (tokens[0] !== facts.binary) continue; // not a command for THIS tool

      // ── command path: walk the help TREE from the binary. Descend only while
      // the next bare-word token is a known CHILD of the current node. The moment
      // the current node has NO children (a known leaf), the rest of the line is
      // positional ARGS — stop (e.g. `shll install mytool`, `wt create feature`).
      // If the current node DOES have children and the next token is not among
      // them, that token is a fabricated subcommand — flag `<knownPath> <token>`
      // and stop (e.g. `shll shell-install`, `wt summon`).
      let knownPath = tokens[0]; // the binary root is always a known path
      for (let k = 1; k < tokens.length; k += 1) {
        const t = tokens[k];
        if (t.startsWith('-')) break; // flags begin → command path is over
        // A subcommand token is a bare word (letters/digits/hyphen). Anything
        // else (a path, a quoted string, a placeholder like [name]) is an arg.
        if (!/^[A-Za-z][A-Za-z0-9-]*$/.test(t)) break;
        const children = facts.childrenOf.get(knownPath);
        // Leaf node (no children, or unknown to the tree): remaining tokens are
        // positional args — do not flag.
        if (!children || children.size === 0) break;
        if (children.has(t)) {
          knownPath = `${knownPath} ${t}`; // descend into the known child
          continue;
        }
        // Current node has children but this token is none of them → fabricated
        // subcommand. Flag the offending path and stop.
        unknown.add(`${knownPath} ${t}`);
        break;
      }

      // ── flags: any flag token in this statement absent from the tool's set.
      let m: RegExpExecArray | null;
      FLAG_TOKEN_RE.lastIndex = 0;
      while ((m = FLAG_TOKEN_RE.exec(noComment)) !== null) {
        const flag = m[1];
        if (!facts.flags.has(flag)) unknown.add(flag);
      }
    }
  }

  return [...unknown].sort();
}
