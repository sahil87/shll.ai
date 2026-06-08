/**
 * docs-site-sidebar — build-time generator of Starlight sidebar entries for the
 * committed `docs/site/` trees (`content/<slug>/site/**`), consumed by
 * `astro.config.mjs` (change x0br). The Starlight sidebar is HAND-AUTHORED per
 * tool (explicit `items:` arrays, NOT autogenerate), but the docs/site page set is
 * author-VARIABLE — a tool ships any number of nested pages, landed by the daily
 * pull. So static per-tool entries can't enumerate them. This helper walks the
 * committed tree at config-evaluation time (build start) and returns the sidebar
 * items for a given tool, which the config APPENDS to that tool's hand-authored
 * items — the hand-authored Overview/Readme/Commands entries are untouched, and the
 * variable docs/site pages appear automatically with zero per-page maintenance.
 *
 * Mount math matches the dynamic route exactly (content/<slug>/site/<path>.md →
 * link `/tools/<slug>/<path>`). It is a `.mjs` (not `.ts`) so it loads cleanly
 * during Astro config evaluation. Dependency-free `node:fs` (Constitution VI); a
 * tool with no committed tree yields [] (a missing tree is an expected state).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_ASCENT = 12;

/** Ascend from `startDir` until a directory containing `help/` is found — the repo
 *  root (the same marker repo-root.ts uses). Returns null if none found, so config
 *  evaluation degrades to no extra sidebar entries rather than throwing. */
function findRepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < MAX_ASCENT; i += 1) {
    const candidate = path.join(dir, 'help');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Recursively collect `*.md` paths under `dir`, `/`-joined relative to `dir`,
 *  in stable (sorted) order. Missing dir → []. */
function walkMarkdown(dir, prefix = '') {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    if (err && err.code === 'ENOENT') return [];
    throw err;
  }
  const out = [];
  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walkMarkdown(path.join(dir, entry.name), rel));
    else if (entry.isFile() && /\.md$/i.test(entry.name)) out.push(rel);
  }
  return out;
}

/** The first markdown H1's text, or null. */
function firstH1(markdown) {
  for (const line of markdown.split('\n')) {
    const m = /^#\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) return m[1].trim();
  }
  return null;
}

/** Titleize a path tail (`advanced/hooks` → `Hooks`). */
function titleizeTail(relNoExt) {
  const tail = relNoExt.split('/').pop() ?? relNoExt;
  return tail.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const repoRoot = findRepoRoot(path.dirname(fileURLToPath(import.meta.url)));

/**
 * Return the Starlight sidebar items for a tool's committed docs/site tree, as a
 * flat list of `{ label, link }` entries (one per page). Empty when the tool has
 * no committed `content/<slug>/site/` tree. Labels come from each page's first H1
 * (fallback: titleized path tail); links are absolute site paths `/tools/<slug>/<path>`.
 */
export function docsSiteSidebarItems(slug) {
  if (!repoRoot) return [];
  const siteDir = path.join(repoRoot, 'content', slug, 'site');
  return walkMarkdown(siteDir).map((rel) => {
    const routePath = rel.replace(/\.md$/i, '');
    const abs = path.join(siteDir, rel);
    const label = firstH1(fs.readFileSync(abs, 'utf8')) ?? titleizeTail(routePath);
    return { label, link: `/tools/${slug}/${routePath}` };
  });
}
