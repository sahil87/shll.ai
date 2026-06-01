# Astro Config

## Overview

`astro.config.mjs` is the single configuration file for the entire site. After the Starlight removal it is six lines of code: site URL plus the Tailwind v4 Vite plugin. No integrations array, no sidebar config, no component overrides, no `customCss` wiring.

Sidebar order and tool list now live in `src/data/tools.ts`; metadata that used to be set through Starlight's integration options (title, description, social links, OG image, favicon) is now emitted directly by `BaseLayout.astro`.

## Requirements

- `site` MUST be set to `https://shll.ai` (the production URL with custom domain). Rationale: Astro uses this for absolute URLs in `<link rel="canonical">` and sitemap generation.
- The Tailwind v4 Vite plugin MUST be registered via `vite.plugins: [tailwindcss()]`. See [styling](./styling.md).
- No Astro integrations SHALL be added unless justified against [Constitution Principle IV](../../../fab/project/constitution.md) (minimal dependencies). The site builds with zero integrations.
- Per-page `<head>` metadata (title, description, OG, twitter, canonical, favicon) MUST be emitted by `src/layouts/BaseLayout.astro` from `title` + `description` props. Astro pages SHALL NOT hardcode their own `<head>` blocks.

## Design Decisions

- **No Starlight integration.** Previously the site used `@astrojs/starlight` for chrome (sidebar, TOC, theme toggle, search). After visual review the chrome was rebuilt as hand-rolled Astro components. The integration was dropped wholesale rather than kept and overridden — overriding Starlight components and `--sl-*` variables had become higher friction than building the equivalent from scratch, for an 8-page marketing site that doesn't benefit much from Starlight's affordances (search was unused, sidebar was custom, theme toggle was custom).
- **No MDX integration.** The home page was previously `.mdx` to embed components inline. After the rebuild it's `.astro` and imports components directly. `@astrojs/mdx` was dropped — one less dependency, one less moving part, no JSX-in-markdown ambiguity.
- **Single config file.** No `tailwind.config.js`, no `starlight.config.ts`. Tailwind v4 reads its theme tokens from the `@theme` block in `src/styles/global.css`. Site metadata lives in `BaseLayout.astro`. Sidebar entries live in `src/data/tools.ts`. There is no config in `astro.config.mjs` beyond the site URL and the Tailwind plugin.
- **`BaseLayout` owns `<head>`.** Title format (`{page} · shll.ai`), canonical URL, OG image + dimensions, twitter card, favicon links — all centralized in `BaseLayout`. Adding a page is one Astro file that calls `<BaseLayout title="..." description="...">`; no head boilerplate to repeat. Rejected: moving these into Astro's per-page `<head>` slot — would re-fragment the metadata across every page.

## Tool list & sidebar source of truth

The sidebar's order and labels live in `src/data/tools.ts`, not in `astro.config.mjs`. `Sidebar.astro` imports the array and renders it. Adding a tool is:

1. Add an entry to `src/data/tools.ts` (`{ slug, label, blurb }`)
2. Add the matching `src/content/tools/{slug}.md` (frontmatter: `title`, `description`)
3. Done — sidebar and home-page tree-list both pick it up

The home-page tree-list reads the same `tools` array, so adding a tool also adds a row to the home page automatically.

## Per-page metadata

Pages pass `title` and `description` props to their layout. `BaseLayout` does the rest:

- `<title>{title} · shll.ai</title>`
- `<meta name="description">`
- `<link rel="canonical">` resolved against `Astro.site`
- `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` + ICO fallback
- OG: `og:type=website`, `og:title`, `og:description`, `og:url`, `og:image` (512×512)
- Twitter: `twitter:card=summary`, `twitter:image`

If a future page needs additional `<head>` content, add it to `BaseLayout` (if it should appear on every page) or pass a `<slot name="head">` (not currently set up, but trivial to add).

## Changelog

| Date | Change |
|------|--------|
| 2026-05-17 | Generated from code analysis |
| 2026-05-17 | Terminal skin (change `260517-pdsp-terminal-skin`): added `components: { Hero: '...' }` Starlight override. |
| 2026-05-17 | Starlight removal (branch `starlight-removal`): `astro.config.mjs` reduced to 6 lines — dropped the entire Starlight integration block (sidebar, social, customCss, components override, head metadata). Sidebar moved to `src/data/tools.ts`; head metadata moved to `BaseLayout.astro`. `@astrojs/starlight` and `@astrojs/mdx` removed from `package.json`. |
