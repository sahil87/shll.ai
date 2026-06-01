# Site Architecture

## Overview

shll.ai is a static Astro 6 site. There is no UI framework on top of Astro — no Starlight, no MDX. The chrome (topbar, sidebar, theme toggle, TOC) is hand-rolled in `src/components/` and `src/layouts/`. Content lives in two places: tool pages as `.md` files in a single `tools` content collection (`src/content/tools/`), and everything else (home, `/tools/` index) as `.astro` pages under `src/pages/`.

The site is a "directory of tools" — the home page presents the loop narrative and renders the seven tools as a tree-list (`├── name  description`) via the `<ToolRow>` component. Each tool gets a short page under `/tools/` that links out to its full README on GitHub. The seven tool slugs and one-line blurbs are centralized in `src/data/tools.ts` so the sidebar and the home-page tree-list stay in sync from a single source.

## Requirements

- The site MUST build to fully static output (no SSR adapter, no server endpoints, no runtime data fetching for primary content). Rationale: deploys to GitHub Pages.
- Tool pages MUST live under `src/content/tools/` as plain `.md` files and be consumed via the `tools` content collection defined in `src/content.config.ts`. Tool pages SHALL NOT be authored as `.astro` files under `src/pages/`.
- The home page and the `/tools/` landing page MUST live under `src/pages/` as `.astro` files. They are not part of the `tools` collection.
- Every page MUST go through `BaseLayout.astro` (which provides `<html>`, `<head>`, theme-init script, `<TopBar>`, and the slot for content). Tool pages additionally go through `DocLayout.astro` (which adds the sidebar and right-rail TOC).
- The sidebar's tool list MUST be derived from `src/data/tools.ts`. Adding a tool means adding one entry to that file and one `.md` under `src/content/tools/` — the sidebar updates automatically.
- The home-page Tools section MUST render via the `<ToolRow>` component (one row per tool, branch character `├──` for rows 1–6 and `└──` for row 7).
- There MUST be exactly one `<h1>` per page. The home page H1 is rendered by `<Hero>` (with `id="_top"`); tool pages have their H1 rendered by `DocLayout` from the entry's `title` frontmatter.

## Design Decisions

- **No Starlight.** The first iteration of this site shipped on Starlight 0.39 for sidebar/TOC/search/theme-toggle out of the box. After visual review against the approved mockup, the team decided Starlight's chrome drifted too far from the design — top bar layout, sidebar accent treatment, hero width, and the cost of bending `--sl-*` variables for every visual change. Replacing Starlight with hand-rolled Astro+Tailwind components removed ~80KB of JS, eliminated the `--sl-color-*` mental tax, and let the site match the mockup 1:1. Rejected: continuing to override Starlight variables and forking individual Starlight components — the cumulative drift and per-iteration friction outweighed Starlight's out-of-the-box value for an 8-page marketing site.
- **No MDX.** Previously the home page was `.mdx` so it could embed `<Hero>`, `<Diagram>`, `<HRule>`, `<ToolRow>` components inline. After the rebuild, the home page is a single `.astro` file that imports those components directly — no MDX runtime, no JSX-in-markdown ambiguity, one less dependency. Tool pages remain plain `.md` and use only standard markdown features (no embedded components).
- **Two layouts, not one.** `BaseLayout` covers chrome that every page needs (head, topbar, theme init). `DocLayout` extends it with the sidebar and TOC for tool pages. The home page uses `BaseLayout` directly because it doesn't need the sidebar — the hero and tree-list want full content width.
- **Single source of truth for tools.** `src/data/tools.ts` exports `{ slug, label, blurb }` for each tool. `Sidebar.astro` and `pages/index.astro` both import from it. The tool order across the sidebar and the home-page tree-list is identical and edited in one place.
- **Tool docs are "directory entries", not full docs.** Each tool page is ~30-40 lines: install command, at-a-glance examples, bulleted highlights, link to the GitHub README for the rest. Rationale: the toolkit's full docs live in each tool's own repo, and duplicating them here would create drift.
- **Tree-list for the Tools section.** Each row is a 3-column CSS Grid (branch / name / description) composed of Tailwind utilities inside `<ToolRow>`. The `tree(1)`-style branch characters (`├── / └──`) directly evoke the metaphor of "seven small CLIs in one toolkit."

## File Layout

```
src/
├── content.config.ts           # tools collection via glob loader + zod schema
├── content/tools/              # 7 tool pages as plain .md files
│   ├── idea.md
│   ├── hop.md
│   ├── fab-kit.md
│   ├── wt.md
│   ├── run-kit.md
│   ├── tu.md
│   └── shll.md
├── data/
│   └── tools.ts                # slug + label + blurb for each tool — sidebar + home tree-list both read this
├── pages/
│   ├── index.astro             # home — hero, loop diagram, install, tools tree, community
│   └── tools/
│       ├── index.astro         # /tools/ landing — table of tools by loop role
│       └── [tool].astro        # dynamic route → renders one entry from the tools collection
├── layouts/
│   ├── BaseLayout.astro        # html + head + theme-init + TopBar + slot
│   └── DocLayout.astro         # BaseLayout + Sidebar + main + TableOfContents
├── components/
│   ├── TopBar.astro            # [shll.ai] brand + ThemeToggle chip + social links
│   ├── Sidebar.astro           # # Start here / # Tools groups, active-state from Astro.url.pathname
│   ├── TableOfContents.astro   # right-rail H2 list from a page's headings
│   ├── ThemeToggle.astro       # chip-styled button cycling auto → light → dark, persists to localStorage
│   ├── Hero.astro              # shellpath line + canonical <h1 id="_top"> with blinking cursor + $-prefixed CTAs
│   ├── HRule.astro             # ASCII rule rendered via the .ascii-rule CSS rule
│   ├── ToolRow.astro           # one tree row: branch / name link / description with Docs+GitHub links
│   └── Diagram.astro           # swaps light/dark pre-rendered SVGs by document.documentElement.dataset.theme
├── diagrams/                   # mermaid sources (.mmd), pre-rendered to public/diagrams/
└── styles/global.css           # Tailwind v4 tokens + a small number of base / .ascii-rule / main h2::before rules
```

## Changelog

| Date | Change |
|------|--------|
| 2026-05-17 | Generated from code analysis |
| 2026-05-17 | Terminal skin (change `260517-pdsp-terminal-skin`): home Tools section migrated to tree-list, Hero migrated to Starlight component override, Diagram component added. |
| 2026-05-17 | Starlight removal (branch `starlight-removal`): dropped `@astrojs/starlight` and `@astrojs/mdx`. Site rebuilt as pure Astro+Tailwind — added `BaseLayout`, `DocLayout`, `TopBar`, `Sidebar`, `TableOfContents`, `ThemeToggle` components, plus `src/data/tools.ts` as single source of truth for the tool list. Content moved from `src/content/docs/tools/` to `src/content/tools/`. Home and `/tools/` migrated from `.mdx`/`.md` to `src/pages/*.astro`. Hero rewritten to take props directly (no `Astro.locals.starlightRoute`). |
