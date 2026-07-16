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

/** A leading HTML heading used as the title (`<h1 …>…</h1>`, possibly with an
 *  `align` attr). Some READMEs center the title with raw HTML instead of a
 *  markdown `#` — this is head chrome equivalent to the markdown H1 (§1, R5).
 *  Matches an opening `<h1…>` so a multi-line `<h1>\n…\n</h1>` block is consumed
 *  by the head loop (which continues skipping until the closing `</h1>`). */
const HTML_H1_OPEN_RE = /^\s*<h1\b[^>]*>/i;
const HTML_H1_CLOSE_RE = /<\/h1>\s*$/i;

/** A leading YAML frontmatter fence (`---` on the very first non-blank line).
 *  The block runs to the next `---` line and is skipped as chrome (§1, R5) so it
 *  never leaks into the slice. */
const FRONTMATTER_FENCE_RE = /^---\s*$/;

/** A blockquote line (`>` …) — the toolkit blockquote and its wrapped lines. */
const BLOCKQUOTE_RE = /^>\s?/;

/** A leading HTML comment opener (`<!-- …`). A leading comment (e.g. a
 *  markdownlint pragma) above the content is head chrome (§1, R5); the head loop
 *  skips from the opener through the closing `-->`. */
const HTML_COMMENT_OPEN_RE = /^\s*<!--/;
const HTML_COMMENT_CLOSE_RE = /-->/;

/**
 * A head-chrome image/badge line: a markdown image `![alt](url)`, a linked badge
 * `[![alt](img)](href)`, or an HTML image wrapper (`<p …><img …>`, bare `<img …>`,
 * `<picture>`/`<source>`, and the badge-row separators `<br>`/`<hr>`/`<span>`).
 * The whole line must be chrome (possibly several images on one line) — a prose
 * line that merely contains an inline image is NOT chrome.
 */
const BADGE_LINE_RE =
  /^(?:\s*(?:\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)|!\[[^\]]*\]\([^)]*\)|<\/?(?:p|img|picture|source|a|div|br|hr|span)\b[^>]*\/?>))+\s*$/i;

/** Opening fence of an inline mermaid block: ```mermaid (any indent, any fence
 *  char run length). The matching close is the next fence of the same family
 *  whose run length is >= this opening run (CommonMark — see {@link isClosingFence}). */
const MERMAID_OPEN_RE = /^(\s*)(`{3,}|~{3,})\s*mermaid\s*$/i;

/** Any fenced-code opening/closing line → the fence run (``` or ~~~). */
const FENCE_RE = /^(\s*)(`{3,}|~{3,})/;

/** A parsed open fence: its char family and its run length. */
interface OpenFence {
  /** The fence char family: '`' (backtick) or '~' (tilde). */
  char: string;
  /** The number of fence chars in the opening run (>= 3). */
  len: number;
}

/**
 * Parse a line as an opening code fence, returning its {@link OpenFence} (char
 * family + run length) or `null` if the line is not a fence. The run length is
 * load-bearing: per CommonMark a closing fence must be at least as long as the
 * opening one, so an opening ```` (4 backticks) is NOT closed by a later ```
 * (3 backticks) — see {@link isClosingFence}. Single-sources fence-open parsing
 * for `tailBoundary`, `stripMermaid`, and `codeSpans`.
 */
function openFence(line: string): OpenFence | null {
  const m = FENCE_RE.exec(line);
  if (!m) return null;
  return { char: m[2][0], len: m[2].length };
}

/**
 * Does `line` close a code block opened by `open`? Per CommonMark a closing
 * fence must be of the SAME char family AND have a run length >= the opening
 * run (and carry no info string). Tracking the open run's length is what stops a
 * 4-backtick block from being wrongly terminated by an inner 3-backtick fence.
 * Single-sourced so all three scanners apply the identical rule.
 */
function isClosingFence(line: string, open: OpenFence): boolean {
  const m = FENCE_RE.exec(line);
  if (!m) return false;
  const close: OpenFence = { char: m[2][0], len: m[2].length };
  if (close.char !== open.char || close.len < open.len) return false;
  // A closing fence carries no info string: only the fence run (and trailing
  // whitespace) may follow. Anything else (e.g. ```` ```bash ````) opens a new
  // nested block of a different family/length, not a close.
  return line.slice(m.index + m[1].length + m[2].length).trim() === '';
}

/** A markdown image whose URL carries the GitHub theme-only fragment (§4/§6).
 *  `g` so every occurrence on a line is removed; `i` for the fragment casing. */
const GH_THEME_IMG_RE =
  /!\[[^\]]*\]\([^)]*#gh-(?:dark|light)-mode-only[^)]*\)/gi;

/** An HTML `<img …>` or `<source …>` tag (self-closing or not) carrying the
 *  gh-theme fragment in any attribute (`src`/`srcset`). Removed on strip (§4/§6,
 *  R4). `g` so multiple per line are removed; `i` for tag + fragment casing. */
const GH_THEME_HTML_IMG_RE =
  /<(?:img|source)\b[^>]*#gh-(?:dark|light)-mode-only[^>]*\/?>/gi;

/** An opening `<picture …>` / closing `</picture>` tag (used to drop a wrapper
 *  left empty after its gh-theme `<source>`/`<img>` children are stripped, R4). */
const PICTURE_OPEN_RE = /<picture\b[^>]*>/i;
const PICTURE_CLOSE_RE = /<\/picture\s*>/i;

/**
 * Compute the head boundary (contract §1): the index of the first slice line.
 * Skips a contiguous leading run of blank lines; a single leading YAML
 * frontmatter block; the single H1 (markdown `#` OR an HTML `<h1>` title); a
 * single blockquote (including its wrapped continuation lines); leading HTML
 * comments; and image/badge lines (incl. `<br>`/`<hr>`/`<span>` separators).
 * Stops at the first non-blank line that is none of those.
 */
function headBoundary(lines: string[]): number {
  let i = 0;
  // Only the FIRST leading heading is treated as the tool-name H1 chrome; a
  // later `# …` is a real section and must NOT be skipped, so it stops the head.
  let h1Consumed = false;
  // Whether we have yet passed the very top (frontmatter is ONLY valid as the
  // first non-blank line — a later `---` is a thematic break, not frontmatter).
  let seenContent = false;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i += 1;
      continue;
    }
    // YAML frontmatter — only when it is the very first non-blank line (§1, R5).
    // Consume from the opening `---` through the closing `---`.
    if (!seenContent && FRONTMATTER_FENCE_RE.test(line)) {
      i += 1;
      while (i < lines.length && !FRONTMATTER_FENCE_RE.test(lines[i])) i += 1;
      if (i < lines.length) i += 1; // consume the closing `---`
      seenContent = true;
      continue;
    }
    seenContent = true;
    // Leading HTML comment (e.g. a markdownlint pragma) — skip through `-->`.
    if (HTML_COMMENT_OPEN_RE.test(line)) {
      if (HTML_COMMENT_CLOSE_RE.test(line)) {
        i += 1;
      } else {
        i += 1;
        while (i < lines.length && !HTML_COMMENT_CLOSE_RE.test(lines[i])) i += 1;
        if (i < lines.length) i += 1; // consume the line with `-->`
      }
      continue;
    }
    // The tool-name H1 — markdown `#` form.
    if (!h1Consumed && H1_RE.test(line)) {
      h1Consumed = true;
      i += 1;
      continue;
    }
    // The tool-name H1 — HTML `<h1>…</h1>` form (possibly multi-line). Treated
    // as equivalent to the markdown H1 (still first-heading-only).
    if (!h1Consumed && HTML_H1_OPEN_RE.test(line)) {
      h1Consumed = true;
      if (HTML_H1_CLOSE_RE.test(line)) {
        i += 1;
      } else {
        i += 1;
        while (i < lines.length && !HTML_H1_CLOSE_RE.test(lines[i])) i += 1;
        if (i < lines.length) i += 1; // consume the closing `</h1>` line
      }
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
    // First line that is none of the recognized chrome: slice start.
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
  let open: OpenFence | null = null;
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i];
    if (open !== null) {
      // Inside a code block: it ends only on a same-family fence whose run is
      // >= the opening run (CommonMark). A shorter inner fence does NOT close it.
      if (isClosingFence(line, open)) open = null;
      continue; // lines inside a code block are not headings
    }
    const fence = openFence(line);
    if (fence) {
      open = fence;
      continue;
    }
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
  let mermaidOpen: OpenFence | null = null;
  for (const line of lines) {
    if (mermaidOpen === null) {
      const open = MERMAID_OPEN_RE.exec(line);
      if (open) {
        // Capture the opening fence's char + run length so a shorter inner fence
        // inside the mermaid block does not prematurely close it (CommonMark).
        mermaidOpen = { char: open[2][0], len: open[2].length };
        continue; // drop the opening fence line
      }
      out.push(line);
      continue;
    }
    // Inside a mermaid block: drop lines until the matching close fence (same
    // family, run length >= the opening run).
    if (isClosingFence(line, mermaidOpen)) {
      mermaidOpen = null;
    }
    // drop this line (the close fence itself is dropped too)
  }
  return out;
}

/**
 * Strip GitHub theme-only images (contract §4/§6, R4) — both markdown
 * `![](…#gh-*-mode-only)` AND HTML `<img>`/`<source>` whose `src`/`srcset` carries
 * the fragment. Operates line-by-line: a line that becomes empty after removing
 * its only theme-only image is dropped so the slice does not accumulate blank
 * residue. A second pass drops any `<picture>` wrapper left with no remaining
 * `<source>`/`<img>` child (a gh-theme `<picture>` pair collapses entirely).
 */
function stripGhThemeImages(lines: string[]): string[] {
  // Pass 1: per-line removal of markdown + HTML gh-theme images.
  const stripped: string[] = [];
  for (const line of lines) {
    let out = line;
    if (GH_THEME_IMG_RE.test(out)) {
      GH_THEME_IMG_RE.lastIndex = 0;
      out = out.replace(GH_THEME_IMG_RE, '');
    }
    GH_THEME_IMG_RE.lastIndex = 0;
    if (GH_THEME_HTML_IMG_RE.test(out)) {
      GH_THEME_HTML_IMG_RE.lastIndex = 0;
      out = out.replace(GH_THEME_HTML_IMG_RE, '');
    }
    GH_THEME_HTML_IMG_RE.lastIndex = 0;
    // Drop a line that held only theme-only image(s) (now empty); keep `<picture>`
    // / `</picture>` wrapper lines for Pass 2 to decide.
    const trimmed = out.trim();
    if (trimmed === '' && line.trim() !== '') continue;
    stripped.push(out === line ? line : trimmed);
  }

  // Pass 2: drop a `<picture>…</picture>` wrapper that no longer contains any
  // `<source>`/`<img>` child (its only children were gh-theme, now stripped).
  const out: string[] = [];
  for (let i = 0; i < stripped.length; i += 1) {
    const line = stripped[i];
    if (!PICTURE_OPEN_RE.test(line)) {
      out.push(line);
      continue;
    }
    // Find the matching `</picture>` and inspect the block in between.
    let j = i;
    let closeIdx = -1;
    while (j < stripped.length) {
      if (PICTURE_CLOSE_RE.test(stripped[j])) {
        closeIdx = j;
        break;
      }
      j += 1;
    }
    if (closeIdx === -1) {
      out.push(line); // unbalanced — leave as-is
      continue;
    }
    const block = stripped.slice(i, closeIdx + 1).join('\n');
    const hasChild = /<(?:source|img)\b/i.test(block.replace(PICTURE_OPEN_RE, '').replace(PICTURE_CLOSE_RE, ''));
    if (!hasChild) {
      i = closeIdx; // skip the whole empty wrapper
      continue;
    }
    // Keep the wrapper (it still has a non-theme child).
    for (let k = i; k <= closeIdx; k += 1) out.push(stripped[k]);
    i = closeIdx;
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
  let open: OpenFence | null = null;
  for (const line of lines) {
    if (open !== null) {
      // Inside a fenced block: a shorter inner fence does NOT close it
      // (CommonMark — same rule the boundary/strip scanners use).
      if (isClosingFence(line, open)) {
        open = null;
        continue; // the closing fence line carries no command
      }
      spans.push(line);
      continue;
    }
    const fence = openFence(line);
    if (fence) {
      open = fence;
      continue; // the opening fence line carries no command
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

// ── §9 docs/site link resolution + closure lint (change x0br) ────────────────
//
// The consumer side of the `docs/site/` closed-set contract. THREE pure,
// exported functions, all dependency-free and build-time (Constitution I/VI),
// the same single-machine-anchor discipline as extractReadme/findUnknownTokens:
//
//   - rewriteDocsSiteLinks(md, slug, mountPath) — a docs/site PAGE: resolve each
//                                      RELATIVE link/image target against the page's
//                                      own directory within the docs/site tree,
//                                      strip `.md`, emit the SITE-ABSOLUTE path
//                                      `/<slug>/<resolved>`.
//   - rewriteReadmeDocsSiteLinks(md, slug) — the README slice: a relative target
//                                      `docs/site/<p>.md` → `/<slug>/<p>`.
//   - findClosureViolations(rel, md) — REPORT-ONLY detector: relative link/image
//                                      targets that escape docs/site (`..` climb)
//                                      or relative images (must be absolute, §3).
//
// SITE-ABSOLUTE rewrite (reworked by change x0br review; namespace moved to root
// by change 3ke3): every intra-set link target becomes a site-absolute path
// `/<slug>/<resolved-path>`. This is serving-model-proof — the site serves each
// page as a trailing-slash directory (`/<slug>/<path>/`, i.e. `<path>/index.html`),
// so a RELATIVE rewrite (`./<p>` or a bare `.md`-strip) resolves one segment too
// deep (a README at `/idea/readme/` + `./install` → `/idea/readme/install`, but the
// page is at `/idea/install/`). A site-absolute target is immune to trailingSlash
// and matches Starlight's own sibling links (which are absolute, e.g.
// `/idea/install/`). Both transforms are therefore SLUG-AWARE (and the
// docs/site transform is also mount-path-aware to resolve `.`/`..`) — intended.
//
// ALL link-target editing flows through one scanner (`rewriteLinkTargets`) so the
// rewrite guard (the correctness boundary) lives in exactly one place: we only
// ever touch the `(...)` target of a markdown link/image and the href/src of raw
// HTML, and only when the target is RELATIVE. Absolute URLs (even ones whose path
// contains the literal `docs/site`), prose, and fenced/inline code that merely
// mention the text are never rewritten.

/** The repo-relative prefix a README uses to link into a docs/site page. */
const DOCS_SITE_PREFIX = 'docs/site/';

/**
 * A markdown inline link or image target: the `(...)` of `[text](target)` or
 * `![alt](target)`. Capture groups: 1 = the leading `[...]` (or `![...]`) plus
 * the opening `(` and any leading whitespace inside it; 2 = the bare target
 * (up to whitespace — a markdown `(url "title")` title is left in group 3);
 * 3 = the trailing remainder (optional title + closing `)`). A target containing
 * `)` or whitespace is matched up to that delimiter, which is correct for URL
 * targets (an unencoded `)` in a URL is not representable in this inline form).
 */
const MD_LINK_RE = /(!?\[[^\]]*\]\(\s*)([^\s)]+)(\s*(?:"[^"]*"|'[^']*')?\s*\))/g;

/** A raw-HTML `href="…"` / `src="…"` attribute (single or double quoted).
 *  Group 1 = the attribute name (`href`/`src`); 2 = the opening quote char;
 *  3 = the target; 4 = the closing quote (backreference to group 2). */
const HTML_ATTR_RE = /\b(href|src)\s*=\s*(["'])([^"']*)(\2)/gi;

/** A raw-HTML `srcset="…"` attribute (e.g. on `<source>`/`<img>`). Its value is a
 *  comma-separated candidate list (`url 1x, url2 2x`); group 2 = the whole value.
 *  Scanned ONLY by the closure lint (R4) — each candidate's URL is checked for a
 *  relative image. NOT used by the rewriter (the rewriter handles single-URL
 *  href/src only). */
const HTML_SRCSET_RE = /\bsrcset\s*=\s*(["'])([^"']*)(\1)/gi;

/** True when `target` is an ABSOLUTE/non-relative URL the guard must NOT touch:
 *  a scheme (`https:`, `mailto:`), a protocol-relative `//host`, a root-absolute
 *  `/path`, or a pure `#fragment`. Everything else is a relative path target. */
function isAbsoluteTarget(target: string): boolean {
  return (
    /^[a-z][a-z0-9+.-]*:/i.test(target) || // scheme: https:, mailto:, data:
    target.startsWith('//') || // protocol-relative
    target.startsWith('/') || // root-absolute
    target.startsWith('#') // pure fragment (same-page anchor)
  );
}

/**
 * Split a relative link target into its path part and a trailing `#fragment`
 * and/or `?query` suffix, so rewrites apply to the PATH only (a `#section`
 * anchor or `?v=1` query must survive verbatim). Returns `[path, suffix]`.
 */
function splitTargetSuffix(target: string): [string, string] {
  const m = /[#?]/.exec(target);
  if (!m) return [target, ''];
  return [target.slice(0, m.index), target.slice(m.index)];
}

/**
 * The one scanner all link rewriting goes through (the rewrite guard lives here).
 * Applies `fn` to every markdown link/image target and raw-HTML href/src target
 * in `markdown`, ABSOLUTE targets excluded (fn never sees them). `fn` returns the
 * replacement target (return the input unchanged to leave it as-is). Prose and
 * code that merely mention a path are never passed to `fn` — only real targets.
 *
 * Note on code fences: an inline `[x](y)` inside a fenced code block is rendered
 * as literal text by markdown, not a link, so rewriting it would be a (harmless)
 * over-reach. In practice docs/site link targets we care about are real links in
 * prose; we keep the scanner simple (no fence tracking) because the guard already
 * restricts edits to link/image-target SHAPES and relative paths — a code sample
 * showing a *relative* `[x](docs/site/y.md)` is vanishingly unlikely and would at
 * worst render the same resolved path. Absolute-URL code samples (the common case)
 * are untouched by the isAbsoluteTarget guard.
 */
function rewriteLinkTargets(
  markdown: string,
  fn: (target: string) => string,
): string {
  const applyToTarget = (target: string): string => {
    if (isAbsoluteTarget(target)) return target; // guard: never touch absolute
    const [path, suffix] = splitTargetSuffix(target);
    if (path === '') return target; // pure `?`/`#` target — nothing to rewrite
    return fn(path) + suffix;
  };

  let out = markdown.replace(
    MD_LINK_RE,
    (_m, lead: string, target: string, tail: string) =>
      lead + applyToTarget(target) + tail,
  );
  out = out.replace(
    HTML_ATTR_RE,
    (_m, attr: string, q: string, target: string) =>
      `${attr}=${q}${applyToTarget(target)}${q}`,
  );
  return out;
}

/** Strip a single trailing `.md` (case-insensitive) from a relative path. */
function stripMdExt(path: string): string {
  return path.replace(/\.md$/i, '');
}

/** The mount segment a closure-escaping docs/site target is rewritten under
 *  (R3). It is reserved-by-construction: not a static tool slug, and no real
 *  `docs/site/` page can mount here (this rewrite + the §closure lint own it), so
 *  the resulting `/<slug>/__unresolved__/…` URL cannot collide with a real
 *  page — it reads as broken-on-purpose, consistent with the lint's `escape`
 *  warning. (Was previously a silent clamp to the tool root, which produced a
 *  confidently-wrong link to a real page.) */
const UNRESOLVED_MARKER = '__unresolved__';

/**
 * The SINGLE shared `.`/`..` resolver (R3). Normalize `target` against `base` (the
 * directory segments the target is relative to) and report whether it climbs OUT
 * of `base` (a closure escape). Returns `{ segments, escaped }`:
 *   - `segments` — the resolved path segments (over-climbs that escape are clamped
 *     at the root so a usable path is still available).
 *   - `escaped` — true iff some `..` popped above the root (the closure-violating
 *     case). Both the rewriter (to emit the marker) and the §closure detector
 *     (to flag) consume THIS function, so "escape" means exactly one thing. Pure.
 */
function resolvePath(base: string[], target: string): { segments: string[]; escaped: boolean } {
  const stack = [...base];
  let escaped = false;
  for (const seg of target.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (stack.length > 0) stack.pop();
      else escaped = true; // climbed above the root
      continue;
    }
    stack.push(seg);
  }
  return { segments: stack, escaped };
}

/**
 * Build the site-absolute mount URL for a resolved docs/site page path under a
 * tool slug: `/<slug>/<segments…>` (no trailing slash, no `.md`). An empty
 * resolved path (target resolved to the tool root) yields `/<slug>`.
 *
 * Change 3ke3: the per-tool namespace moved from `/tools/<slug>/` to the site
 * root `/<slug>/`, so this emit target dropped its `/tools` prefix. The dynamic
 * route now lives at `src/pages/[slug]/[...path].astro` and serves these URLs.
 */
function toolMountUrl(slug: string, segments: string[]): string {
  const tail = segments.join('/');
  return tail === '' ? `/${slug}` : `/${slug}/${tail}`;
}

/**
 * R5 — a docs/site PAGE transform (SITE-ABSOLUTE). Resolve every RELATIVE
 * link/image target against the page's OWN directory within the docs/site tree
 * (`mountPath`, the page's path under `site/` without `.md`, e.g. `advanced/hooks`),
 * normalize `.`/`..`, strip `.md`, and emit the site-absolute mount URL
 * `/<slug>/<resolved>`. Closure (§9.1.1) guarantees relative targets are
 * intra-set; a `..`-escape is flagged by the §closure lint AND, here, rewritten to
 * a non-colliding `/<slug>/__unresolved__/…` marker (R3) — NOT clamped to a
 * real page (which would misroute the broken link to a confidently-wrong page).
 * Absolute URLs, prose, and code are untouched; a `#`/`?` suffix is preserved.
 * Pure and total. Example: page `advanced/hooks` linking `../install.md` →
 * `/<slug>/install`; `./sibling.md` → `/<slug>/advanced/sibling`;
 * an escaping `../../x.md` → `/<slug>/__unresolved__/x`.
 */
export function rewriteDocsSiteLinks(
  markdown: string,
  slug: string,
  mountPath: string,
): string {
  // The page's directory segments within the docs/site tree (drop the filename).
  const baseDir = mountPath.split('/').slice(0, -1);
  return rewriteLinkTargets(markdown, (path) => {
    const { segments, escaped } = resolvePath(baseDir, stripMdExt(path));
    // An escape is rewritten under the reserved marker segment so the broken
    // link is visibly dead (matching the §closure `escape` warning), never a
    // plausible-but-wrong real page.
    const mountSegs = escaped ? [UNRESOLVED_MARKER, ...segments] : segments;
    return toolMountUrl(slug, mountSegs);
  });
}

/**
 * R6 — the README SLICE transform (SITE-ABSOLUTE). A relative target of the form
 * `docs/site/<p>.md` → the site-absolute mount URL `/<slug>/<p>` (the
 * `docs/site/` prefix maps to the tool root, `.md` stripped, nested `<p>` subtree
 * preserved). Example: `[guide](docs/site/install.md)` → `[guide](/<slug>/install)`;
 * `docs/site/advanced/hooks.md` → `/<slug>/advanced/hooks`. Relative targets
 * NOT under `docs/site/` are left as-is (a README's own relative links into
 * non-docs/site files are out of scope and self-heal via the absolute-by-author
 * producer rule). Absolute URLs / prose / code untouched; `#`/`?` suffix preserved.
 * Pure and total.
 */
export function rewriteReadmeDocsSiteLinks(markdown: string, slug: string): string {
  return rewriteLinkTargets(markdown, (path) => {
    // ONLY `docs/site/<p>.md` PAGES are mounted as routes — a non-`.md` docs/site
    // target (e.g. `docs/site/img/logo.png`) is NOT pulled and would 404, so do
    // NOT rewrite it: leaving it relative keeps it visible to the README link lint
    // (findReadmeLinkViolations) rather than silently producing a dead URL.
    if (!path.startsWith(DOCS_SITE_PREFIX) || !/\.md$/i.test(path)) return path;
    const sub = stripMdExt(path.slice(DOCS_SITE_PREFIX.length));
    // The README links into the tree as if from the tree ROOT; resolve `.`/`..`
    // within the sub-path so a (rare) `docs/site/a/../b.md` still normalizes.
    const { segments, escaped } = resolvePath([], sub);
    const mountSegs = escaped ? [UNRESOLVED_MARKER, ...segments] : segments;
    return toolMountUrl(slug, mountSegs);
  });
}

// ── §closure-lint detector (R8) ──────────────────────────────────────────────

/** A single closure violation: the offending relative target and why it broke. */
export interface ClosureViolation {
  /** The relative link/image target as written in the source. */
  target: string;
  /** `escape` = a relative link/image that resolves OUT of docs/site (`..` climb);
   *  `relative-image` = a relative IMAGE target (images must be absolute, §3). */
  kind: 'escape' | 'relative-image';
}

/**
 * Resolve `target` (a relative path) against `fromRel` (the offending file's path
 * RELATIVE TO docs/site root, e.g. `advanced/hooks.md`) and return true when it
 * climbs OUT of docs/site. Delegates to the SHARED {@link resolvePath} so the
 * detector and `rewriteDocsSiteLinks` agree on what "escape" means (R3). Pure.
 */
function escapesDocsSite(fromRel: string, target: string): boolean {
  // Start from the offending file's DIRECTORY segments within docs/site.
  const dir = fromRel.split('/').slice(0, -1);
  return resolvePath(dir, target).escaped;
}

/**
 * R8 — REPORT-ONLY closure detector. Given a docs/site file's path relative to
 * the docs/site root (`relPath`, e.g. `install.md` or `advanced/hooks.md`) and its
 * markdown, return the relative link/image targets that violate closure:
 *   - a relative LINK or IMAGE whose resolved path escapes docs/site (`..` climb), or
 *   - a relative IMAGE (images MUST be absolute everywhere, §3).
 * Absolute URLs and intra-set relative links are clean (not returned). Pure and
 * total — never throws. Mirrors findUnknownTokens: detection only; the CLI decides
 * the consequence (a `::warning::`, never withholding the slice).
 */
export function findClosureViolations(
  relPath: string,
  markdown: string,
): ClosureViolation[] {
  const violations: ClosureViolation[] = [];
  const seen = new Set<string>();

  const record = (target: string, isImage: boolean) => {
    if (isAbsoluteTarget(target)) return; // absolute → clean
    const [path] = splitTargetSuffix(target);
    if (path === '') return; // pure `#`/`?` anchor → clean
    // A relative image is a violation regardless of where it resolves (§3).
    if (isImage) {
      const key = `relative-image|${target}`;
      if (!seen.has(key)) {
        seen.add(key);
        violations.push({ target, kind: 'relative-image' });
      }
      return;
    }
    if (escapesDocsSite(relPath, path)) {
      const key = `escape|${target}`;
      if (!seen.has(key)) {
        seen.add(key);
        violations.push({ target, kind: 'escape' });
      }
    }
  };

  // Markdown links/images. The leading `!` distinguishes an image from a link.
  let m: RegExpExecArray | null;
  MD_LINK_RE.lastIndex = 0;
  while ((m = MD_LINK_RE.exec(markdown)) !== null) {
    const isImage = m[1].startsWith('!');
    record(m[2], isImage);
  }
  // Raw-HTML href (link) / src (image). `src` is treated as an image target.
  HTML_ATTR_RE.lastIndex = 0;
  while ((m = HTML_ATTR_RE.exec(markdown)) !== null) {
    const isImage = m[1].toLowerCase() === 'src';
    record(m[3], isImage);
  }
  // Raw-HTML srcset (image, e.g. `<source srcset="dark.png 1x, dark2.png 2x">`).
  // The value is a comma-separated candidate list; each candidate is
  // `<url> [descriptor]` — record the URL part of each as an image target (R4).
  HTML_SRCSET_RE.lastIndex = 0;
  while ((m = HTML_SRCSET_RE.exec(markdown)) !== null) {
    for (const candidate of m[2].split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      if (url) record(url, true);
    }
  }

  return violations;
}

// ── README-slice link lint (R1/R2) ───────────────────────────────────────────
//
// The README slice's sibling of findClosureViolations: a REPORT-ONLY detector for
// links/images in a deduced README slice that would NOT resolve on the site. The
// README slice is the DEFAULT pulled surface (§9) yet — unlike the docs/site tree —
// had no link lint, so a site-escaping relative link (e.g. `[x](docs/specs/y.md)`,
// `[c](CONTRIBUTING.md)`) rendered as a live 404 with no warning. This closes that
// gap by surfacing the same kind of `::warning::` the docs/site CLI already emits.
//
// What counts as a violation:
//   - a RELATIVE link target that is NOT a `docs/site/<p>.md` link — the only
//     relative README links the consumer rewrites are `docs/site/` ones (via
//     rewriteReadmeDocsSiteLinks); every other relative link target reaches the
//     rendered page unrewritten and 404s. (Scope decision, intake assumption #9:
//     a relative link to a non-`.md` docs/site asset is NOT special-cased.)
//   - a RELATIVE image target (images MUST be absolute everywhere, §3).
// Absolute URLs, `docs/site/<p>.md` links, and pure `#`/`?` anchors are clean.

/** A single README-slice link violation: the offending relative target + why. */
export interface ReadmeLinkViolation {
  /** The relative link/image target as written in the slice. */
  target: string;
  /** `relative-link` = a relative LINK that is not a `docs/site/` link (renders a
   *  404 — the consumer rewrites only `docs/site/` relative links);
   *  `relative-image` = a relative IMAGE (images must be absolute, §3). */
  kind: 'relative-link' | 'relative-image';
}

/**
 * R1/R2 — REPORT-ONLY README-slice link detector. Given a deduced slice, return
 * the relative link/image targets that will not resolve on the site. Reuses the
 * same `isAbsoluteTarget` guard + `MD_LINK_RE`/`HTML_ATTR_RE` scanning as the
 * rewriter/closure lint, so detection and the rewrite guard cannot drift. Pure and
 * total — never throws. The CLI decides the consequence (a `::warning::`, never
 * withholding the slice).
 */
export function findReadmeLinkViolations(slice: string): ReadmeLinkViolation[] {
  const violations: ReadmeLinkViolation[] = [];
  const seen = new Set<string>();

  const record = (target: string, isImage: boolean) => {
    if (isAbsoluteTarget(target)) return; // absolute → clean
    const [path] = splitTargetSuffix(target);
    if (path === '') return; // pure `#`/`?` anchor → clean
    if (isImage) {
      const key = `relative-image|${target}`;
      if (!seen.has(key)) {
        seen.add(key);
        violations.push({ target, kind: 'relative-image' });
      }
      return;
    }
    // A relative LINK is fine ONLY if it is a `docs/site/<p>.md` link (the one
    // relative shape the consumer rewrites — see rewriteReadmeDocsSiteLinks).
    // Anything else 404s — INCLUDING a `docs/site/` target that is NOT `.md`
    // (e.g. `docs/site/img/logo.png`): only `.md` pages mount, so a non-`.md`
    // docs/site asset is neither rewritten nor resolvable, and MUST be flagged.
    if (path.startsWith(DOCS_SITE_PREFIX) && /\.md$/i.test(path)) return;
    const key = `relative-link|${target}`;
    if (!seen.has(key)) {
      seen.add(key);
      violations.push({ target, kind: 'relative-link' });
    }
  };

  // Markdown links/images. The leading `!` distinguishes an image from a link.
  let m: RegExpExecArray | null;
  MD_LINK_RE.lastIndex = 0;
  while ((m = MD_LINK_RE.exec(slice)) !== null) {
    const isImage = m[1].startsWith('!');
    record(m[2], isImage);
  }
  // Raw-HTML href (link) / src (image).
  HTML_ATTR_RE.lastIndex = 0;
  while ((m = HTML_ATTR_RE.exec(slice)) !== null) {
    const isImage = m[1].toLowerCase() === 'src';
    record(m[3], isImage);
  }
  // Raw-HTML srcset (image) — each candidate URL.
  HTML_SRCSET_RE.lastIndex = 0;
  while ((m = HTML_SRCSET_RE.exec(slice)) !== null) {
    for (const candidate of m[2].split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      if (url) record(url, true);
    }
  }

  return violations;
}
