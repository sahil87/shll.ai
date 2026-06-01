# astro-tailwind-terminal1

The currently-live build of [shll.ai](https://shll.ai). Astro 6 + Tailwind v4, terminal-themed.

## Develop

```sh
cd sites/astro-tailwind-terminal1
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # static output → ./dist/
pnpm preview    # preview the build locally
```

Node ≥ 22.12 and pnpm 10. The `dist/` directory is gitignored — never commit it; CI is the single source of truth for what's live.

## Stack

- **[Astro 6](https://astro.build)** — static site generator, no SSR adapter.
- **[Tailwind CSS v4](https://tailwindcss.com)** — integrated via `@tailwindcss/vite`. Entry: `src/styles/global.css`.
- **Mermaid (build-time only)** — `.mmd` sources in `src/diagrams/` pre-rendered to SVGs in `public/diagrams/` via `npx mmdc`. No runtime mermaid dependency.

## Layout

```
src/
├── content/          # typed content collections (src/content.config.ts)
├── pages/            # Astro page routes
├── layouts/          # shared page layouts
├── components/       # Astro components
├── diagrams/         # mermaid sources (.mmd)
└── styles/global.css # Tailwind entry — one @import line
public/               # static assets (CNAME, favicons, pre-rendered diagrams)
```

## Site-specific memory

Implementation details (architecture, styling, config, diagrams) live under [`docs/memory/site/`](./docs/memory/site/). Project-level memory remains at the repo root under `/docs/memory/`.
