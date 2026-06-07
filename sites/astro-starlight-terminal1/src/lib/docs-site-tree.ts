/**
 * docs-site-tree — the single build-time walker of the committed `docs/site/`
 * collector (`content/<slug>/site/**`). Shared by BOTH the dynamic route
 * (`src/pages/tools/[slug]/[...path].astro`, which renders one page per file) and
 * the sidebar helper (`docs-site-sidebar.ts`, which lists them in the nav), so the
 * mount math (content/<slug>/site/<path>.md → /tools/<slug>/<path>) and the page
 * set live in exactly one place and cannot drift between route and sidebar.
 *
 * Build-time + dependency-free (Constitution I/VI): plain `node:fs` walk, no npm
 * import. A tool with no committed `site/` tree simply contributes no pages — a
 * missing tree is an expected interim state (the daily pull lands trees over time),
 * never an error.
 */
import fs from 'node:fs';
import path from 'node:path';

/** One committed docs/site page. */
export interface DocsSitePage {
  /** Tool slug (the `content/<slug>` directory name). */
  slug: string;
  /** Page path under `site/`, POSIX-separated, no leading slash and no `.md`
   *  (e.g. `install`, `advanced/hooks`). Used as the `[...path]` route param and
   *  to build the `/tools/<slug>/<path>` URL. */
  path: string;
  /** Absolute path to the markdown file on disk. */
  absPath: string;
  /** Display title: the first markdown H1's text, else a titleized path tail. */
  title: string;
}

/** Recursively collect `*.md` files under `dir`, as `/`-joined paths relative to
 *  `dir` (no leading slash). A missing dir yields []. */
function walkMarkdown(dir: string, prefix = ''): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  const out: string[] = [];
  // Stable order so the emitted page set + sidebar order are deterministic.
  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...walkMarkdown(path.join(dir, entry.name), rel));
    } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
      out.push(rel);
    }
  }
  return out;
}

/** The first markdown ATX H1 (`# Title`) text, or null if none. */
function firstH1(markdown: string): string | null {
  for (const line of markdown.split('\n')) {
    const m = /^#\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) return m[1].trim();
  }
  return null;
}

/** Titleize a path tail (`advanced/hooks` → `Hooks`) as a fallback title. */
function titleizeTail(relNoExt: string): string {
  const tail = relNoExt.split('/').pop() ?? relNoExt;
  return tail
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Collect every committed docs/site page across all tools under `content/`. For
 * each `content/<slug>/site/<path>.md`, returns its slug, route path (`<path>`
 * without `.md`), absolute path, and display title (first H1 or titleized tail).
 * Pure of side effects; reads the filesystem only. A repo with no `content/` dir,
 * or a tool with no `site/` subtree, contributes no pages.
 */
export function collectDocsSitePages(repoRoot: string): DocsSitePage[] {
  const contentDir = path.join(repoRoot, 'content');
  let slugs: fs.Dirent[];
  try {
    slugs = fs.readdirSync(contentDir, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }

  const pages: DocsSitePage[] = [];
  for (const slugEntry of [...slugs].sort((a, b) => a.name.localeCompare(b.name))) {
    if (!slugEntry.isDirectory()) continue;
    const slug = slugEntry.name;
    const siteDir = path.join(contentDir, slug, 'site');
    for (const rel of walkMarkdown(siteDir)) {
      const absPath = path.join(siteDir, rel);
      const routePath = rel.replace(/\.md$/i, '');
      const markdown = fs.readFileSync(absPath, 'utf8');
      pages.push({
        slug,
        path: routePath,
        absPath,
        title: firstH1(markdown) ?? titleizeTail(routePath),
      });
    }
  }
  return pages;
}
