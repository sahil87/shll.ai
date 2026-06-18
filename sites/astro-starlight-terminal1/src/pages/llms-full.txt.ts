/**
 * /llms-full.txt — the full-content agent-discoverability dump (change 354p),
 * emitted as a build-time static `text/plain` endpoint (Constitution I — no SSR;
 * Constitution VI — zero new deps). The companion of /llms.txt: where the index
 * is a curated link list, this concatenates the actual toolkit content so an
 * agent can ingest the whole thing in one fetch.
 *
 * Composition (intake Assumption #5 — resolved to include hand-authored MDX):
 *   1. Per tool, in TOOLS order:
 *      - the committed README slice at `<repo-root>/content/<tool>/README.md`
 *        (already the deduced slice — do NOT re-run extractReadme), and
 *      - a plain-text `### Commands` rendering of the tool's command tree from
 *        the validated HelpDoc (the same data CommandReference renders).
 *   2. The hand-authored MDX bodies sourced via getCollection('docs') — the same
 *      content the HTML pages render (no hand-copy): getting-started/* , the
 *      reference command-index, workflows/* , and the tool overview pages — each
 *      flattened (frontmatter / `import` lines / JSX component tags stripped) to
 *      readable prose for the text/plain dump.
 *
 * Coupling is intentional (intake §3): an edit to a site-authored MDX page is now
 * also an edit to llms-full.txt. Staleness of the synced parts rides the existing
 * daily refresh — no new schedule.
 *
 * Fail-soft per tool: a missing README slice or help JSON degrades to a noted
 * omission and the build CONTINUES (help-collection per-tool skip-degrade — NOT
 * VersionTable's build-stop). The file stays non-empty for every tool because the
 * tool heading + at least one omission/section line is always emitted.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { TOOLS, readHelpDoc, readReadmeSlice, renderCommandTree, flattenMdx } from '../lib/llms.ts';
import { repoRootFromModuleUrl } from '../lib/repo-root.ts';

/** A docs-collection id prefix → human heading for the hand-authored MDX section. */
const MDX_GROUPS: { heading: string; match: (id: string) => boolean }[] = [
  { heading: 'Getting started', match: (id) => id.startsWith('getting-started/') },
  { heading: 'Reference', match: (id) => id === 'reference/command-index' },
  { heading: 'Workflows', match: (id) => id.startsWith('workflows/') },
  { heading: 'Tool overviews', match: (id) => /^tools\/[^/]+\/overview$/.test(id) },
];

export const GET: APIRoute = async () => {
  const repoRoot = repoRootFromModuleUrl(import.meta.url);
  const parts: string[] = ['# shll — full toolkit content', ''];

  // ── 1. Per-tool: README slice + command reference ───────────────────────
  for (const tool of TOOLS) {
    parts.push(`## ${tool}`, '');

    const readme = readReadmeSlice(repoRoot, tool);
    if (readme) {
      parts.push(readme, '');
    } else {
      parts.push(`_(README slice unavailable — content/${tool}/README.md missing; omitted.)_`, '');
    }

    const doc = readHelpDoc(repoRoot, tool);
    if (doc) {
      parts.push('### Commands', '', renderCommandTree(doc.root), '');
    } else {
      parts.push('### Commands', '', `_(Command reference unavailable — help/${tool}.json missing; omitted.)_`, '');
    }
  }

  // ── 2. Hand-authored MDX (getting-started / reference / workflows / overviews) ──
  const docs = await getCollection('docs');
  // Stable order: by group, then by entry id within the group.
  const sorted = [...docs].sort((a, b) => a.id.localeCompare(b.id));

  parts.push('# Guides & reference (site documentation)', '');
  for (const group of MDX_GROUPS) {
    const entries = sorted.filter((e) => group.match(e.id));
    if (entries.length === 0) continue;
    parts.push(`## ${group.heading}`, '');
    for (const entry of entries) {
      const title = (entry.data.title ?? entry.id).trim();
      const flat = flattenMdx(entry.body ?? '');
      parts.push(`### ${title}`, '');
      parts.push(flat.length > 0 ? flat : '_(no prose content)_', '');
    }
  }

  const body = parts.join('\n');
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
