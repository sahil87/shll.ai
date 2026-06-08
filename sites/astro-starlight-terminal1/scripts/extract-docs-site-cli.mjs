/**
 * extract-docs-site-cli — the thin Node CLI the scheduled readme-refresh workflow
 * calls per tool to ingest the tool repo's `docs/site/` documentation TREE (the
 * §9 closed-set escape hatch, activated by change x0br). It is the multi-file
 * SIBLING of extract-readme-cli.mjs (one README in → one slice out): this CLI
 * takes a directory of extracted docs/site markdown files and copies each into
 * `content/<slug>/site/<path>.md`, preserving the subtree shape.
 *
 * Usage:
 *   node scripts/extract-docs-site-cli.mjs <slug> <docs-site-dir>
 *
 *   <slug>           the tool slug (e.g. idea, fab-kit). Names the output collector
 *                    content/<slug>/site/.
 *   <docs-site-dir>  path to the extracted docs/site directory (the workflow
 *                    untars the repo tarball filtered to the docs/site subtree
 *                    into a temp dir, then points this CLI at the docs/site root).
 *
 * Behavior (contract §closure-lint — REPORT-ONLY, mirrors §7's reporter exactly):
 *   The tool repo's docs/site tree is CANONICAL and committed verbatim. The closure
 *   lint (findClosureViolations, single-sourced from src/lib/extract-readme.ts —
 *   the SAME module the unit test pins) is a NON-FATAL reporter, not a publish gate:
 *   a relative link that escapes docs/site, or a relative image (images must be
 *   absolute, §3), emits a `::warning::` naming the file + target, and the slice is
 *   STILL committed. The fix belongs in the tool repo, never a silent exclusion here.
 *
 *   1. Walk <docs-site-dir> recursively for `*.md` files.
 *   2. For each, run findClosureViolations(relPath, markdown) and emit a
 *      `::warning::` per offending target (file + target + reason). Never withhold.
 *   3. Copy each file VERBATIM to content/<slug>/site/<relPath>. Link rewriting
 *      (the .md-strip, R5) happens at RENDER time in the dynamic route, not here —
 *      the committed slice stays a faithful copy of the canonical source (the same
 *      discipline as the README slice, whose link rewrite is also render-side).
 *   4. An EMPTY or MISSING tree dir is not an error — the tool simply has no
 *      docs/site (an expected interim state); exit 0 having written nothing.
 *   5. Exit 0 (report-only). There is no failure mode here except an I/O error
 *      while copying a file that genuinely exists (which propagates as a non-zero
 *      exit so the workflow's per-tool isolation keeps the last-good tree).
 *
 * Imports `extract-readme.ts` (dependency-free; TYPE-ONLY from schemas.ts, stripped
 * by Node's native type-stripping) — runs under plain `node`, no astro:content hook.
 */
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve as resolvePath } from 'node:path';

import { findClosureViolations } from '../src/lib/extract-readme.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
// scripts/ -> site root -> sites/ -> repo root
const repoRoot = resolvePath(scriptDir, '..', '..', '..');

function usage(msg) {
  if (msg) console.error(`error: ${msg}`);
  console.error('usage: node scripts/extract-docs-site-cli.mjs <slug> <docs-site-dir>');
  process.exit(2);
}

const args = process.argv.slice(2);
const slug = args[0];
const docsSiteDir = args[1];
if (!slug || !docsSiteDir) usage('both <slug> and <docs-site-dir> are required');

// Static per-tool page slugs OWNED BY THE SITE under src/content/docs/tools/<slug>/.
// A docs/site page that mounts at /tools/<slug>/<reserved> collides with one of
// these: the dynamic route is higher-priority than Starlight's catch-all, so the
// docs/site page SILENTLY SHADOWS the static page (build emits only a buried
// [WARN]). Contract §9.2 makes "don't use a reserved slug" a producer rule; this
// reporter surfaces a violation as a `::warning::` (same report-only posture as the
// closure lint) so the drift is visible in the run log — the page is STILL
// committed (never withhold), the fix belongs in the tool repo.
//
// The set is exactly {overview, readme, commands} (contract §9.2, PRs #41/#42):
// the hand-authored overview directory entry + the generated readme/commands pages.
// `install` and `workflows` are NOT reserved — they belong to the tool repo via
// docs/site/install.md / docs/site/workflows.md (the prior hand-authored stubs were
// removed). So a tool's docs/site/install.md mounts cleanly at /tools/<slug>/install.
const RESERVED_SLUGS = new Set(['overview', 'readme', 'commands']);

/** Recursively collect every `*.md` file under `dir`, returned as paths relative
 *  to `dir` (POSIX-separated). A missing dir yields []. */
async function collectMarkdown(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err && err.code === 'ENOENT') return []; // no docs/site tree → nothing
    throw err;
  }
  const files = [];
  for (const entry of entries) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const nested of await collectMarkdown(abs)) files.push(join(entry.name, nested));
    } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
      files.push(entry.name);
    }
  }
  return files;
}

const files = await collectMarkdown(docsSiteDir);

if (files.length === 0) {
  console.error(`no docs/site/*.md found for ${slug} at ${docsSiteDir} — nothing to commit.`);
  process.exit(0);
}

const outRoot = join(repoRoot, 'content', slug, 'site');
let written = 0;

for (const rel of files) {
  // Normalize to POSIX separators for the relPath the closure detector + URL use.
  const relPosix = rel.split(/[\\/]/).join('/');
  const srcPath = join(docsSiteDir, rel);

  const markdown = await readFile(srcPath, 'utf8');

  // Reserved-slug lint (report-only, §9.2) — the page's first mount segment is
  // its top-level path under /tools/<slug>/; if it equals a static tool-page slug,
  // the page silently shadows the hand-authored one. Warn, but still commit.
  const mountTop = relPosix.replace(/\.md$/i, '').split('/')[0];
  if (RESERVED_SLUGS.has(mountTop.toLowerCase())) {
    console.error(
      `::warning::${slug} docs/site/${relPosix} mounts at /tools/${slug}/${mountTop}, shadowing the static "${mountTop}" tool page (§9.2 reserved slug). Committing anyway; rename the docs/site page in the tool repo.`,
    );
  }

  // Closure lint (report-only) — emit a `::warning::` per violation; never withhold.
  for (const v of findClosureViolations(relPosix, markdown)) {
    const reason =
      v.kind === 'relative-image'
        ? 'relative image (images must be absolute — §3)'
        : 'relative link escapes docs/site (closure violation — §closure)';
    console.error(
      `::warning::${slug} docs/site/${relPosix} → ${v.target}: ${reason}. Committing the canonical page anyway; fix the tool repo, not the site.`,
    );
  }

  const outPath = join(outRoot, relPosix);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, markdown, 'utf8');
  written += 1;
}

console.error(
  `wrote ${written} docs/site page(s) for ${slug} to content/${slug}/site/ (relative to ${relative(repoRoot, outRoot)}).`,
);
process.exit(0);
