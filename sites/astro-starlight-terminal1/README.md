# astro-starlight-terminal1

The currently-live build of [shll.ai](https://shll.ai). Astro 6 + Starlight 0.39, terminal-themed.

## Develop

```sh
cd sites/astro-starlight-terminal1
pnpm install
pnpm dev        # http://127.0.0.1:4321
pnpm build      # static output → ./dist/
pnpm preview    # preview the build locally
```

Node ≥ 22.12 and pnpm 10. The `dist/` directory is gitignored — never commit it; CI is the single source of truth for what's live.

## Stack

- **[Astro 6](https://astro.build)** — static site generator, no SSR adapter.
- **[Starlight 0.39](https://starlight.astro.build)** — doc-site framework (sidebar nav, prev/next, search via Pagefind, a11y).
- **[Expressive Code](https://expressive-code.com)** — code block rendering, themed to the project palette.
- **JetBrains Mono** — self-hosted via `@fontsource/jetbrains-mono`.

## Layout

```
src/
├── content/docs/        # Starlight content collection
│   ├── index.mdx        # splash (ASCII shell session + loop diagram)
│   ├── getting-started/ # overview, install, philosophy
│   ├── tools/<tool>/    # per-tool: overview, install, commands, workflows
│   └── workflows/       # cross-tool recipes
├── content.config.ts    # Starlight docs loader + schema
├── components/
│   └── Diagram.astro    # theme-aware SVG <img> swap
├── assets/
│   └── logo.svg         # site logo (run-kit hexagon)
└── styles/terminal.css  # palette + terminal aesthetic overrides
public/
├── CNAME                # shll.ai custom domain
├── favicon.{svg,ico}    # browser tab icon
├── diagrams/loop-{light,dark}.svg
└── og-image.png
```

## Theming

Terminal aesthetic is achieved entirely via CSS variable overrides in `src/styles/terminal.css` — no forked Starlight components. Two palettes (paper light + dark) flip via the standard Starlight theme toggle.

Major customizations:

- Mono font everywhere (`--sl-font: JetBrains Mono`)
- Two terminal palettes (`--c-bg`, `--c-fg`, accents) mapped onto Starlight's `--sl-color-*` tokens
- Sidebar groups render as `# Group name` shell comments; nested groups too
- Caret SVGs replaced with text `+` / `-` (collapsed / expanded)
- Active sidebar/TOC item: `> ` accent marker, no background pill
- H2 headings get a `## ` sage prefix; dashed top border on H2s after content
- Code blocks: themed Expressive Code terminal frames, Mac dots hidden
- Blinking cursor on first paragraph of every doc page
- Splash: hand-written `<pre class="shell-session">` (no Starlight cards)
