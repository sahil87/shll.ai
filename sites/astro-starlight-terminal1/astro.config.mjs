// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mdx from '@astrojs/mdx';

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
      // Allow rk-proxy + Tailscale hostnames. `true` skips the host check entirely;
      // safe here because the dev server is for an experiment under _playground.
      allowedHosts: true,
    },
  },
  integrations: [
    starlight({
      title: 'shll',
      description: 'The shll AI coding toolkit — 7 CLIs that play well together.',
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
      logo: { src: './src/assets/prompt.svg', replacesTitle: false },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/sahil87' },
        { icon: 'discord', label: 'Discord', href: 'https://discord.gg/32XHh5mJYn' },
      ],
      pagination: true,
      lastUpdated: false,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      // Conditional ToC overrides: on per-tool `commands` pages, fill the right
      // rail (and mobile dropdown) with the tool's first-level commands; every
      // other page falls through to Starlight's default ToC. See
      // src/components/CommandsToc.astro / CommandsMobileToc.astro.
      components: {
        TableOfContents: './src/components/CommandsToc.astro',
        MobileTableOfContents: './src/components/CommandsMobileToc.astro',
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
                { label: 'Install', slug: 'tools/idea/install' },
                { label: 'Commands', slug: 'tools/idea/commands' },
                { label: 'Workflows', slug: 'tools/idea/workflows' },
              ],
            },
            {
              label: 'hop',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'tools/hop/overview' },
                { label: 'Commands', slug: 'tools/hop/commands' },
              ],
            },
            {
              label: 'fab-kit',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'tools/fab-kit/overview' },
                { label: 'Install', slug: 'tools/fab-kit/install' },
                { label: 'Commands', slug: 'tools/fab-kit/commands' },
                { label: 'Workflows', slug: 'tools/fab-kit/workflows' },
              ],
            },
            {
              label: 'wt',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'tools/wt/overview' },
                { label: 'Commands', slug: 'tools/wt/commands' },
              ],
            },
            {
              label: 'run-kit',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'tools/run-kit/overview' },
                { label: 'Commands', slug: 'tools/run-kit/commands' },
              ],
            },
            {
              label: 'tu',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'tools/tu/overview' },
                { label: 'Commands', slug: 'tools/tu/commands' },
              ],
            },
            {
              label: 'shll',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'tools/shll/overview' },
                { label: 'Commands', slug: 'tools/shll/commands' },
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
