/**
 * Shared logic for the README ToC overrides (desktop + mobile). The README
 * sibling of `commands-toc.ts`: resolves the tool from a Starlight route id and
 * builds a nested H2 → H3 heading tree from the SAME `content/<tool>/README.md`
 * slice that `ReadmeSlice.astro` renders, at build time.
 *
 * Slug single-sourcing (the contract that makes the rail work): the rail must
 * link to the exact heading `id`s the rendered slice carries. Rather than
 * re-implement GitHub's slug algorithm (a second code path that could drift),
 * we render the slice with the SAME `@astrojs/markdown-remark` processor
 * `ReadmeSlice` uses and read `rendered.metadata.headings` — `{ depth, slug,
 * text }` produced by the processor's built-in heading-id pass (`github-slugger`
 * under the hood). Those slugs are byte-identical to the heading `id`s in the
 * rendered HTML, dedup suffixes (`-1`, `-2`) included, so every `href` matches
 * its target by construction. This mirrors how `commands-toc.ts` reuses the
 * shared `commandSlug` to agree with CommandReference's emitted ids — here the
 * shared source is Astro's own markdown processor.
 *
 * Build-time only (Constitution I); display-only (the tree is derived from the
 * slice's headings). Failure contract mirrors `firstLevelCommands`: a missing
 * slice degrades to `[]` (the page falls back to the default ToC), a genuine
 * read/render error re-throws so a committed defect fails the build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { repoRootFromModuleUrl } from './repo-root.ts';
import { isToolSlug } from './tool-slugs.ts';

/** Per-tool readme pages have route id `<tool>/readme` (change 3ke3: the `tools/`
 *  prefix was dropped when the namespace moved to the site root, so the captured
 *  first segment is gated on the tool-slug roster rather than the prefix — a bare
 *  `([^/]+)/readme` would otherwise false-positive on a root route). */
const README_ROUTE_RE = /^([^/]+)\/readme$/;

/** Top of the ToC depth window — matches `tableOfContents.minHeadingLevel`. */
const MIN_DEPTH = 2;
/** Bottom of the ToC depth window — matches `tableOfContents.maxHeadingLevel`. */
const MAX_DEPTH = 3;

/** One node in the nested H2 → H3 ToC tree. */
export interface TocHeading {
  /** Visible heading text, e.g. "Quick Start". */
  text: string;
  /** Anchor slug matching the rendered heading `id`, e.g. "quick-start". */
  slug: string;
  /** Heading level (2 for H2, 3 for H3). */
  depth: number;
  /** Nested H3 children of an H2 (always empty for an H3 node). */
  children: TocHeading[];
}

/** Tool slug if `id` is a per-tool readme route (`<tool>/readme`, `<tool>` in the
 *  roster), else null. */
export function toolFromReadmeRouteId(id: string): string | null {
  const m = id.match(README_ROUTE_RE);
  return m && isToolSlug(m[1]) ? m[1] : null;
}

/**
 * Fold a flat, in-document-order list of headings into a nested H2 → H3 tree.
 * H2s become top-level nodes; each H3 attaches to the most recent H2. An H3 that
 * appears before any H2 attaches at the top level rather than being dropped
 * (defensive — a well-formed README starts with an H2, but the rail must not
 * crash on an unconventional slice).
 */
function nestHeadings(flat: TocHeading[]): TocHeading[] {
  const tree: TocHeading[] = [];
  let currentH2: TocHeading | null = null;
  for (const h of flat) {
    if (h.depth === MIN_DEPTH) {
      currentH2 = h;
      tree.push(h);
    } else if (currentH2) {
      currentH2.children.push(h);
    } else {
      tree.push(h); // orphan H3 before any H2 → top level
    }
  }
  return tree;
}

/**
 * Nested H2 → H3 ToC tree for `tool`, built from `<repo-root>/content/<tool>/
 * README.md`. `moduleUrl` is the caller's `import.meta.url` (the anchor for the
 * repo-root ascent). Returns [] when the slice is missing (the page itself
 * degrades to the ReadmeSlice placeholder, and the override falls back to the
 * default ToC). Re-throws genuine read/render errors so a committed defect is
 * not masked — mirroring `firstLevelCommands`.
 */
export async function readmeToc(tool: string, moduleUrl: string): Promise<TocHeading[]> {
  const repoRoot = repoRootFromModuleUrl(moduleUrl);
  const slicePath = path.join(repoRoot, 'content', tool, 'README.md');

  let raw: string;
  try {
    raw = fs.readFileSync(slicePath, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }

  // Render with the SAME processor ReadmeSlice uses so the heading slugs match
  // the rendered `id`s exactly. We only need the heading manifest, not the HTML.
  const processor = await createMarkdownProcessor({});
  const rendered = await processor.render(raw);
  const flat: TocHeading[] = rendered.metadata.headings
    .filter((h) => h.depth >= MIN_DEPTH && h.depth <= MAX_DEPTH)
    .map((h) => ({ text: h.text, slug: h.slug, depth: h.depth, children: [] }));

  return nestHeadings(flat);
}
