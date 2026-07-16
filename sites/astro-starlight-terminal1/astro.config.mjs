// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mdx from '@astrojs/mdx';
import { docsSiteSidebarItems, docsSiteRedirectEntries } from './src/lib/docs-site-sidebar.mjs';

// The 7 canonical tool slugs, in display order. Kept in step with
// src/lib/tool-slugs.ts (the runtime roster) — this config-eval copy exists
// because astro.config.mjs is evaluated before the TS module graph loads.
const TOOL_SLUGS = ['idea', 'hop', 'fab-kit', 'wt', 'run-kit', 'tu', 'shll'];

export default defineConfig({
  site: 'https://shll.ai',
  // Change 3ke3: the short per-tool URLs (shll.ai/wt) are now CANONICAL real
  // pages (via `slug:` frontmatter overrides — see the tool content files), not
  // redirect stubs. The redirects are REVERSED: every previously-canonical/shared
  // deep `/tools/<tool>/*` URL now redirects to its new root path, so old links
  // still land. Static <meta refresh> pages emitted at build — works on Pages.
  // (A redirect key that collides with a real route fails the build, which is
  // why the old short-URL entries had to be removed — those paths are pages now.)
  redirects: {
    ...Object.fromEntries(
      TOOL_SLUGS.flatMap((t) => [
        // Bare `/tools/<tool>` (previously a 404) — cheap goodwill entry.
        [`/tools/${t}`, `/${t}/`],
        // The three per-tool pages: overview collapses to the tool root.
        [`/tools/${t}/overview`, `/${t}/`],
        [`/tools/${t}/readme`, `/${t}/readme/`],
        [`/tools/${t}/commands`, `/${t}/commands/`],
      ]),
    ),
    // One entry per committed docs/site page: `/tools/<tool>/<path>` →
    // `/<tool>/<path>/`. Enumerated programmatically (static builds can't
    // wildcard-redirect) by the same collector that generates the sidebar.
    ...docsSiteRedirectEntries(),
  },
  server: { host: '0.0.0.0' },
  vite: {
    server: {
      // Allow run-kit's proxy + Tailscale hostnames. `true` skips the host check entirely;
      // safe here because the dev server is for an experiment under _playground.
      allowedHosts: true,
    },
  },
  integrations: [
    starlight({
      title: 'shll',
      description: 'The shll AI coding toolkit — 7 CLIs that play well together.',
      // Explicit hexagon favicon. The .svg is emitted by default, but declaring
      // it documents intent; the by-convention root /favicon.ico fallback (used by
      // headless routes — robots.txt, sitemaps, the <meta refresh> redirect stubs)
      // is the real multi-resolution ICO at public/favicon.ico (see
      // scripts/generate-favicon-ico.mjs).
      favicon: '/favicon.svg',
      customCss: ['./src/styles/terminal.css'],
      expressiveCode: {
        // Match Starlight's theme toggle: dark = terminal-dark, light = paper.
        themes: ['github-dark', 'github-light'],
        styleOverrides: {
          // Borrow the terminal1 palette so code panels feel like part of the
          // page chrome, not a transplanted IDE.
          borderRadius: '4px',
          borderColor: 'var(--c-border)',
          codeFontFamily: 'var(--sl-font-mono)',
          codeFontSize: '0.9rem',
          codeLineHeight: '1.55',
          codeBackground: 'var(--c-surface-2)',
          frames: {
            frameBoxShadowCssValue: 'none',
            editorActiveTabBackground: 'var(--c-surface)',
            editorActiveTabForeground: 'var(--c-fg)',
            editorTabBarBackground: 'var(--c-surface)',
            editorTabBarBorderBottomColor: 'var(--c-border)',
            terminalBackground: 'var(--c-surface-2)',
            terminalTitlebarBackground: 'var(--c-surface)',
            terminalTitlebarForeground: 'var(--c-fg-dim)',
            terminalTitlebarBorderBottomColor: 'var(--c-border)',
            // Hide the Mac-style traffic light dots; tighter terminal feel.
            terminalTitlebarDotsOpacity: '0',
          },
        },
      },
      logo: { src: './src/assets/logo.svg', replacesTitle: false },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/sahil87' },
        { icon: 'discord', label: 'Discord', href: 'https://discord.gg/32XHh5mJYn' },
      ],
      pagination: true,
      lastUpdated: false,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      // Route-dispatching ToC overrides: the single right-rail (and mobile
      // dropdown) override slot fans out by route id — `<tool>/commands` pages
      // get the first-level command list (CommandsToc), `<tool>/readme` pages
      // get a nested H2/H3 list from the README slice (ReadmeToc), and every
      // other page falls through to Starlight's default ToC. See
      // src/components/TocDispatcher.astro / MobileTocDispatcher.astro.
      components: {
        TableOfContents: './src/components/TocDispatcher.astro',
        MobileTableOfContents: './src/components/MobileTocDispatcher.astro',
        // Override the built-in footer to append a site-wide copyright line.
        // The override renders Starlight's <Default /> footer first so prev/next
        // pagination is preserved — see src/components/Footer.astro.
        Footer: './src/components/Footer.astro',
        // Override the head to emit the Cloudflare Web Analytics beacon with its
        // `data-cf-beacon` JSON un-escaped. Starlight's `head:` config array spreads
        // attrs as Astro attributes, which HTML-escapes the JSON quotes to &quot;;
        // this override renders the literal <script> instead — see Head.astro.
        Head: './src/components/Head.astro',
      },
      sidebar: [
        {
          label: 'Getting started',
          items: [
            { label: 'Overview', slug: 'getting-started/overview' },
            { label: 'Install everything', slug: 'getting-started/install' },
            { label: 'Philosophy', slug: 'getting-started/philosophy' },
          ],
        },
        {
          label: 'Tools',
          items: [
            {
              label: 'idea',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'idea' },
                { label: 'Readme', slug: 'idea/readme' },
                { label: 'Commands', slug: 'idea/commands' },
                // Build-time-generated entries for the tool's pulled docs/site tree
                // (content/idea/site/**) — including any install/workflows pages the
                // tool repo publishes. Empty until the daily pull lands a tree.
                ...docsSiteSidebarItems('idea'),
              ],
            },
            {
              label: 'hop',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'hop' },
                { label: 'Readme', slug: 'hop/readme' },
                { label: 'Commands', slug: 'hop/commands' },
                ...docsSiteSidebarItems('hop'),
              ],
            },
            {
              label: 'fab-kit',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'fab-kit' },
                { label: 'Readme', slug: 'fab-kit/readme' },
                { label: 'Commands', slug: 'fab-kit/commands' },
                ...docsSiteSidebarItems('fab-kit'),
              ],
            },
            {
              label: 'wt',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'wt' },
                { label: 'Readme', slug: 'wt/readme' },
                { label: 'Commands', slug: 'wt/commands' },
                ...docsSiteSidebarItems('wt'),
              ],
            },
            {
              label: 'run-kit',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'run-kit' },
                { label: 'Readme', slug: 'run-kit/readme' },
                { label: 'Commands', slug: 'run-kit/commands' },
                ...docsSiteSidebarItems('run-kit'),
              ],
            },
            {
              label: 'tu',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'tu' },
                { label: 'Readme', slug: 'tu/readme' },
                { label: 'Commands', slug: 'tu/commands' },
                ...docsSiteSidebarItems('tu'),
              ],
            },
            {
              label: 'shll',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'shll' },
                { label: 'Readme', slug: 'shll/readme' },
                { label: 'Commands', slug: 'shll/commands' },
                ...docsSiteSidebarItems('shll'),
              ],
            },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Command index', slug: 'reference/command-index' },
          ],
        },
        {
          label: 'Workflows',
          items: [
            { label: 'Daily flow', slug: 'workflows/daily-flow' },
            { label: 'Start a new change', slug: 'workflows/new-change' },
          ],
        },
      ],
    }),
    mdx(),
  ],
});
