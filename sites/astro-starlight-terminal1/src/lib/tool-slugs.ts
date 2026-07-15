/**
 * tool-slugs — the single shared roster of the toolkit's 7 tool slugs, and the
 * membership test that gates every root-namespace route dispatcher (change 3ke3).
 *
 * Why this exists: before change 3ke3 the tool pages lived under a `/tools/`
 * path prefix, so a dispatcher could recognize a tool route purely by that
 * prefix (`tools/<tool>/readme`). The prefix was doing namespace duty. Now that
 * the per-tool pages are canonical at the site root (`/<tool>/`, `/<tool>/readme/`,
 * `/<tool>/commands/`), a bare `([^/]+)/readme` regex would false-positive against
 * any root-shaped route (a hypothetical `getting-started/commands`, etc.). So the
 * dispatchers match the flat route shape AND gate the captured first segment on
 * membership in this roster — a single source of truth for "is this a tool slug".
 *
 * Consumers: `commands-toc.ts`, `readme-toc.ts` (route-id gate), `Head.astro`
 * (per-tool JSON-LD pathname gate), and the llms overview-id reader. The roster
 * is deliberately SITE-AUTHORED here (not derived from `help/` or `content/`),
 * matching the `TOOLS` const in `llms.ts` and the `ROSTER` in `ToolsIndex.astro` /
 * `VersionTable.astro` — the producer repos do not dictate the site's route map.
 *
 * Order mirrors the sidebar / homepage listing for consistency where the list is
 * iterated. Dependency-free (Constitution VI); no disk read (unlike the `help/`
 * roster derivation) — the slugs are a fixed, known set.
 */

/** The canonical 7 tool slugs, in sidebar/homepage display order. */
export const TOOL_SLUGS = [
  'idea',
  'hop',
  'fab-kit',
  'wt',
  'run-kit',
  'tu',
  'shll',
] as const;

export type ToolSlug = (typeof TOOL_SLUGS)[number];

const TOOL_SLUG_SET: ReadonlySet<string> = new Set(TOOL_SLUGS);

/** True when `slug` is one of the 7 canonical tool slugs. */
export function isToolSlug(slug: string): boolean {
  return TOOL_SLUG_SET.has(slug);
}
