/**
 * docs-site-tree — the single build-time walker of the committed `docs/site/`
 * collector (`content/<slug>/site/**`). Shared by BOTH the dynamic route
 * (`src/pages/[slug]/[...path].astro`, which renders one page per file) and
 * the sidebar helper (`docs-site-sidebar.mjs`, which lists them in the nav), so the
 * mount math (content/<slug>/site/<path>.md → /<slug>/<path>; namespace moved to
 * root by change 3ke3) and the page set live in exactly one place and cannot drift
 * between route and sidebar.
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
   *  to build the `/<slug>/<path>` URL. */
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

/** Matches a single ATX H1 line (`# Title`), capturing its text in group 1.
 *  Single source of the H1-line shape shared by `firstH1` (title derivation) and
 *  `stripFirstH1` (render-side de-duplication) so the derived title and the
 *  stripped line can never diverge. */
const ATX_H1_LINE = /^#\s+(.+?)\s*#*\s*$/;

/** The first markdown ATX H1 (`# Title`) text, or null if none. */
function firstH1(markdown: string): string | null {
  for (const line of markdown.split('\n')) {
    const m = ATX_H1_LINE.exec(line);
    if (m) return m[1].trim();
  }
  return null;
}

/**
 * Remove the first ATX H1 line — the exact line `firstH1` derives the title from —
 * from `markdown`, collapsing a single blank line immediately following it so the
 * rendered body has no leading gap. Returns the markdown UNCHANGED when no ATX H1
 * is present (the "title fell back to the titleized path tail — strip nothing"
 * case, so the strip is inherently conditional on a title having been derived from
 * an H1). Dependency-free plain string processing.
 *
 * Applied render-side by the docs/site dynamic route (`[slug]/[...path].astro`)
 * to de-duplicate the heading that Starlight already renders as the page title
 * from the same H1; the committed on-disk page stays byte-verbatim.
 */
export function stripFirstH1(markdown: string): string {
  const lines = markdown.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!ATX_H1_LINE.test(lines[i])) continue;
    // Drop the H1 line, plus one immediately-following blank line if present.
    const drop = lines[i + 1] !== undefined && lines[i + 1].trim() === '' ? 2 : 1;
    lines.splice(i, drop);
    return lines.join('\n');
  }
  return markdown;
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
