/**
 * /llms.txt — the curated agent-discoverability index (change 354p), emitted as
 * a build-time static `text/plain` endpoint (Constitution I — no SSR, no runtime
 * fetch; Constitution VI — zero new deps). The agent-facing sibling of the kb1r
 * SEO layer: where og:image/JSON-LD make the site legible to crawlers and social
 * scrapers, this makes it legible to coding agents, via the llmstxt.org
 * convention (H1 title, a one-line blockquote summary, then bulleted link
 * sections).
 *
 * Data sources, all single-sourced (no fourth hand-copy — vn39 / Tool-Page-Depth
 * anti-drift):
 *   - tool one-liners ← `help/<tool>.json` `root.short` (prefix-stripped), with
 *     a fallback to the tool's overview.mdx frontmatter `description`, via the
 *     shared `src/lib/llms.ts` helper.
 *   - getting-started / reference links ← the live URL shapes the HTML pages use.
 *
 * Every URL is ABSOLUTE, built from the endpoint context `site` (`Astro.site` ===
 * `https://shll.ai`) — never hardcoded — mirroring the og:image absolute-URL
 * discipline in docs/memory/conventions/seo-social-meta.md.
 *
 * Fail-soft per tool: a tool with neither a `root.short` nor an overview
 * `description` emits a noted-omission bullet rather than an empty/undefined one,
 * and never hard-fails the build (help-collection per-tool skip-degrade).
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { TOOLS, toolShort } from '../lib/llms.ts';
import { isToolSlug } from '../lib/tool-slugs.ts';
import { repoRootFromModuleUrl } from '../lib/repo-root.ts';

/** One curated link bullet. */
interface LinkItem {
  label: string;
  /** Site-absolute path (e.g. `/wt/`). */
  pathname: string;
  /** One-line description (may be a noted omission). */
  desc: string;
}

const SUMMARY =
  'shll is a toolkit of seven small, composable command-line tools for AI-assisted ' +
  'coding — worktree and session management, a backlog-driven change pipeline, repo ' +
  'navigation, and cost tracking. Each tool does one thing and they play well together.';

export const GET: APIRoute = async ({ site }) => {
  // `site` is guaranteed present — astro.config.mjs sets `site: 'https://shll.ai'`.
  const origin = site!;
  const repoRoot = repoRootFromModuleUrl(import.meta.url);

  // Tool overview `description` frontmatter, keyed by tool slug — the fallback
  // when a tool's `root.short` is missing/empty. Sourced from the same `docs`
  // collection the HTML pages render (no hand-copy). Since change 3ke3 the overview
  // entry `id` is the bare tool slug (`idea`), not `tools/idea/overview` — the
  // `slug:` frontmatter override maps the entry id directly to the tool slug.
  const docs = await getCollection('docs');
  const overviewDesc = new Map<string, string>();
  for (const entry of docs) {
    if (isToolSlug(entry.id)) {
      const d = (entry.data.description ?? '').trim();
      if (d) overviewDesc.set(entry.id, d);
    }
  }

  // ── Tools section ──────────────────────────────────────────────────────
  const toolItems: LinkItem[] = TOOLS.map((tool) => {
    const short = toolShort(repoRoot, tool) ?? overviewDesc.get(tool) ?? null;
    return {
      label: tool,
      // Change 3ke3: the tool overview is canonical at the site root `/<tool>/`.
      pathname: `/${tool}/`,
      desc: short ?? '(description unavailable — help/<tool>.json and overview frontmatter both missing)',
    };
  });

  // ── Getting started + Reference sections (fixed live URL shapes) ─────────
  const gettingStarted: LinkItem[] = [
    { label: 'Install', pathname: '/getting-started/install/', desc: 'install the whole toolkit with one brew tap' },
    { label: 'Overview', pathname: '/getting-started/overview/', desc: 'what shll is and how the tools fit together' },
    { label: 'Philosophy', pathname: '/getting-started/philosophy/', desc: 'the design principles behind the toolkit' },
  ];
  const reference: LinkItem[] = [
    { label: 'Command index', pathname: '/reference/command-index/', desc: 'every command and flag across the toolkit, generated from each binary’s --help' },
  ];

  const bullet = (item: LinkItem): string => {
    const url = new URL(item.pathname, origin).href;
    return `- [${item.label}](${url}): ${item.desc}`;
  };

  const body = [
    '# shll — the AI coding toolkit',
    '',
    `> ${SUMMARY}`,
    '',
    '## Tools',
    '',
    ...toolItems.map(bullet),
    '',
    '## Getting started',
    '',
    ...gettingStarted.map(bullet),
    '',
    '## Reference',
    '',
    ...reference.map(bullet),
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
