/**
 * llms — shared build-time helpers for the agent-discoverability endpoints
 * (change 354p): `src/pages/llms.txt.ts` (the curated llmstxt.org index) and
 * `src/pages/llms-full.txt.ts` (the full-content dump). Single-sources the
 * reads both endpoints need so neither retypes them (the same lib-extraction
 * precedent as commands-toc.ts and terminal-toolcard.ts).
 *
 * What lives here:
 *   - TOOLS — the canonical 7-tool list (slug order matches the homepage/sidebar).
 *   - stripToolPrefix — drop a redundant leading `<bin> — ` from a short
 *     description (mirrors terminal-toolcard.ts; the tool name is already the
 *     bullet's link text). The anti-drift rule (vn39 / Tool-Page-Depth): tool
 *     one-liners are DERIVED from the canonical machine source, never retyped.
 *   - toolShort — read `help/<tool>.json` via the shared HelpDocSchema +
 *     repo-root.ts pattern (NOT parse-help.ts, which parses raw `-h` text) and
 *     return the prefix-stripped `root.short`, or null on missing/empty/ENOENT.
 *   - readReadmeSlice — read the committed `content/<tool>/README.md` slice
 *     (already deduced by the daily puller — do NOT re-run extractReadme), or
 *     null on ENOENT.
 *   - renderCommandTree — a plain-text, indented rendering of a tool's command
 *     tree from the validated HelpDoc (the same data CommandReference renders).
 *   - flattenMdx — a pragmatic strip of frontmatter, `import` lines, and JSX
 *     component tags from an MDX body, leaving readable prose for a text/plain
 *     dump (exact fidelity is not required — intake Assumption #5/#7).
 *   - absolutize — rewrite root-relative URLs (`/tools/idea/overview/`) in
 *     appended docs content to site-absolute (`https://shll.ai/tools/idea/…`),
 *     so the absolute-URL discipline (intake Assumption #2) holds for the whole
 *     emitted file, not just the curated index. Both markdown `](/path)` and
 *     HTML `href`/`src="/path"` forms are covered.
 *
 * All disk reads are build-time only (Constitution I) and fail-soft per tool:
 * a missing slice/JSON degrades to null (the caller emits a noted omission and
 * continues), mirroring the help-collection per-tool skip-degrade — NOT a
 * build-stop. The schema read still re-throws genuine parse/validation errors
 * so a committed defect is not masked. No npm import (Constitution VI) — Node
 * stdlib `fs`/`path` plus the already-present HelpDocSchema (astro:content's
 * transitive zod).
 */
import fs from 'node:fs';
import path from 'node:path';
import { HelpDocSchema, type HelpDoc, type Node } from './schemas.ts';

/**
 * The canonical 7-tool slug list — each has a `help/<tool>.json` at the repo
 * root and a `src/content/docs/tools/<tool>/overview.mdx`. Order matches the
 * homepage terminal / sidebar so the emitted index reads consistently.
 */
export const TOOLS = [
  'fab-kit',
  'hop',
  'idea',
  'run-kit',
  'shll',
  'tu',
  'wt',
] as const;

export type Tool = (typeof TOOLS)[number];

/**
 * Strip a redundant leading `{bin} — ` (the binary's own name) from a short
 * description — run-kit's `root.short` is `"rk — tmux session manager with web
 * UI"`, and the index bullet's link text already carries the tool name, so
 * without this the bullet would read `[run-kit]: rk — tmux …`. The binary name
 * lives in the help doc's `tool` field (passed as `bin`). Idempotent; a short
 * without the prefix is returned untouched. Mirrors terminal-toolcard.ts's
 * stripToolPrefix exactly.
 */
export function stripToolPrefix(short: string, bin: string): string {
  const prefix = `${bin} — `;
  return short.startsWith(prefix) ? short.slice(prefix.length) : short;
}

/**
 * Read `<repoRoot>/help/<tool>.json`, validate against HelpDocSchema, and
 * return the prefix-stripped `root.short` — the canonical one-liner. Returns
 * null when the file is absent (ENOENT) or `root.short` is empty/whitespace, so
 * the caller can fall back to the tool's overview.mdx `description` and, failing
 * that, emit a noted omission. Re-throws genuine parse/validation errors (a
 * present-but-invalid file is a committed defect — same discipline as
 * CommandReference / commands-toc.ts).
 */
export function toolShort(repoRoot: string, tool: string): string | null {
  let raw: string;
  try {
    raw = fs.readFileSync(path.join(repoRoot, 'help', `${tool}.json`), 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  const doc = HelpDocSchema.parse(JSON.parse(raw));
  const short = doc.root.short?.trim() ?? '';
  if (!short) return null;
  return stripToolPrefix(short, doc.tool).trim();
}

/**
 * Read and validate `<repoRoot>/help/<tool>.json`, returning the full HelpDoc
 * (for the command-tree render in llms-full.txt). Returns null on ENOENT
 * (fail-soft per tool); re-throws genuine parse/validation errors.
 */
export function readHelpDoc(repoRoot: string, tool: string): HelpDoc | null {
  let raw: string;
  try {
    raw = fs.readFileSync(path.join(repoRoot, 'help', `${tool}.json`), 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  return HelpDocSchema.parse(JSON.parse(raw));
}

/**
 * Read the committed README slice at `<repoRoot>/content/<tool>/README.md` —
 * already the deduced slice produced by the daily puller (do NOT re-run
 * extractReadme). Returns the trimmed body, or null when the slice is absent or
 * empty (the caller emits a noted omission and continues — fail-soft per tool).
 */
export function readReadmeSlice(repoRoot: string, tool: string): string | null {
  let raw: string;
  try {
    raw = fs.readFileSync(
      path.join(repoRoot, 'content', tool, 'README.md'),
      'utf8',
    );
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  const body = raw.trim();
  return body.length > 0 ? body : null;
}

/**
 * Render a tool's command tree as plain, indented text — the agent-readable
 * counterpart to CommandReference's HTML render. The tree structure comes from
 * the JSON `commands[]` (the producer-side authority), never from parsing the
 * raw `-h` text. Each node is one line: `{indent}{path} — {short}` (the short
 * omitted when empty). The root line is included so a tool with zero subcommands
 * (tu) still emits a meaningful line. Two-space indent per depth level.
 */
export function renderCommandTree(root: Node): string {
  const lines: string[] = [];
  const walk = (node: Node, depth: number): void => {
    const indent = '  '.repeat(depth);
    const short = node.short?.trim() ?? '';
    lines.push(short ? `${indent}${node.path} — ${short}` : `${indent}${node.path}`);
    for (const child of node.commands) walk(child, depth + 1);
  };
  walk(root, 0);
  return lines.join('\n');
}

/**
 * Flatten an MDX body to readable prose for a text/plain dump (intake
 * Assumption #5): drop YAML frontmatter, `import ...` lines, and JSX component
 * tags — self-closing (`<GithubButton tool="x" />`), paired (`<Card>…</Card>`,
 * keeping the inner text), and `<Foo/>` — while leaving ordinary markdown and
 * the tags' text children intact. A pragmatic strip, not an MDX compiler: exact
 * fidelity is explicitly not required. JSX component tags are Capitalised
 * (`<Card>`, `<Tabs>`, `<GithubButton/>`); we only strip tags whose name starts
 * with an uppercase letter so genuine markdown/HTML lowercase tokens and
 * comparison operators in prose are left alone.
 */
export function flattenMdx(body: string): string {
  let out = body;

  // Drop a leading YAML frontmatter block (--- … ---). Starlight bodies from
  // getCollection usually exclude frontmatter, but strip defensively in case a
  // raw body carries one.
  out = out.replace(/^﻿?---\n[\s\S]*?\n---\n?/, '');

  // Drop ESM import lines (whole line).
  out = out.replace(/^[ \t]*import\s.*$/gm, '');

  // Drop JSX component tags (Capitalised tag names only): self-closing,
  // opening, and closing. Keeps the text children of paired tags. Names may be
  // dotted (`<Astro.self/>`, `<Tabs.Item>`).
  const jsxTag = /<\/?[A-Z][A-Za-z0-9.]*(?:\s[^>]*?)?\/?>/g;
  out = out.replace(jsxTag, '');

  // Collapse 3+ consecutive blank lines left by removals down to one, and trim.
  out = out.replace(/\n{3,}/g, '\n\n').trim();
  return out;
}

/**
 * Rewrite root-relative URLs in appended docs content (README slices and
 * flattened MDX) to site-absolute, so /llms-full.txt honors the same
 * absolute-URL discipline as the curated /llms.txt index (intake Assumption #2;
 * og:image precedent in seo-social-meta.md). README slices are already mostly
 * absolutized by the puller's link transforms, but the hand-authored MDX bodies
 * carry root-relative links (`[overview](/tools/idea/overview/)`, the homepage's
 * `<a href="/tools/…">`) — emitting those verbatim would leak relative URLs an
 * agent cannot resolve out of the toolkit context.
 *
 * Only genuine ROOT-relative URLs (a single leading `/`) are rewritten — both
 * markdown link targets `](/path)` and HTML `href`/`src` attributes. Left
 * untouched: already-absolute (`https://`), protocol-relative (`//host`),
 * fragment-only (`#anchor`), and document-relative (`./x`, `../x`) targets, plus
 * the leading-`/`-less tokens (`/N`, `/usr/bin`) that legitimately appear inside
 * canonical README prose — guarded by requiring the char after `/` to begin a
 * path segment and by anchoring on the link/attr syntax, never a bare `/`.
 * `origin` is `Astro.site` (`https://shll.ai`), normalized to no trailing slash.
 */
export function absolutize(content: string, origin: string): string {
  const base = origin.replace(/\/+$/, '');
  // A root-relative path: one leading `/`, NOT `//` (protocol-relative).
  // markdown: `](/path)` — capture up to the closing paren.
  let out = content.replace(
    /\]\(\/(?!\/)([^)\s]*)\)/g,
    (_m, p) => `](${base}/${p})`,
  );
  // HTML attributes: `href="/path"` / `src="/path"` (single or double quotes).
  out = out.replace(
    /\b(href|src)=(["'])\/(?!\/)([^"']*)\2/g,
    (_m, attr, q, p) => `${attr}=${q}${base}/${p}${q}`,
  );
  return out;
}
