// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mdx from '@astrojs/mdx';
import { docsSiteSidebarItems } from './src/lib/docs-site-sidebar.mjs';

export default defineConfig({
  site: 'https://shll.ai',
  // Short, memorable per-tool URLs (shll.ai/wt) that redirect to the canonical
  // docs page. Static <meta refresh> pages emitted at build — works on Pages.
  redirects: {
    '/idea': '/tools/idea/overview/',
    '/hop': '/tools/hop/overview/',
    '/fab-kit': '/tools/fab-kit/overview/',
    '/wt': '/tools/wt/overview/',
    '/run-kit': '/tools/run-kit/overview/',
    '/tu': '/tools/tu/overview/',
    '/shll': '/tools/shll/overview/',
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
      // dropdown) override slot fans out by route id — `tools/*/commands` pages
      // get the first-level command list (CommandsToc), `tools/*/readme` pages
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
                { label: 'Overview', slug: 'tools/idea/overview' },
                { label: 'Readme', slug: 'tools/idea/readme' },
                { label: 'Commands', slug: 'tools/idea/commands' },
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
                { label: 'Overview', slug: 'tools/hop/overview' },
                { label: 'Readme', slug: 'tools/hop/readme' },
                { label: 'Commands', slug: 'tools/hop/commands' },
                ...docsSiteSidebarItems('hop'),
              ],
            },
            {
              label: 'fab-kit',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'tools/fab-kit/overview' },
                { label: 'Readme', slug: 'tools/fab-kit/readme' },
                { label: 'Commands', slug: 'tools/fab-kit/commands' },
                ...docsSiteSidebarItems('fab-kit'),
              ],
            },
            {
              label: 'wt',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'tools/wt/overview' },
                { label: 'Readme', slug: 'tools/wt/readme' },
                { label: 'Commands', slug: 'tools/wt/commands' },
                ...docsSiteSidebarItems('wt'),
              ],
            },
            {
              label: 'run-kit',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'tools/run-kit/overview' },
                { label: 'Readme', slug: 'tools/run-kit/readme' },
                { label: 'Commands', slug: 'tools/run-kit/commands' },
                ...docsSiteSidebarItems('run-kit'),
              ],
            },
            {
              label: 'tu',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'tools/tu/overview' },
                { label: 'Readme', slug: 'tools/tu/readme' },
                { label: 'Commands', slug: 'tools/tu/commands' },
                ...docsSiteSidebarItems('tu'),
              ],
            },
            {
              label: 'shll',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'tools/shll/overview' },
                { label: 'Readme', slug: 'tools/shll/readme' },
                { label: 'Commands', slug: 'tools/shll/commands' },
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
