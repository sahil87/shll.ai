# Project Context

Landing page for the **shll AI coding toolkit** at [shll.ai](https://shll.ai). The site is a front door into seven Go CLIs: `idea`, `hop`, `fab-kit`, `wt`, `run-kit`, `tu`, `shll`.

This repo is in an active **design-iteration phase** — content, tech stack, and visual theme are all in flux. To enable parallel exploration without churning the live site, the repo hosts multiple self-contained website variants under `sites/`.

## Repo layout

```
sites/
├── astro-starlight-terminal1/  # currently LIVE at shll.ai (Astro 6 + Starlight, terminal theme)
├── astro-tailwind-terminal1/   # variant (not deployed)
└── _playground/                # scratch space — experiments (no deploy)
.github/workflows/deploy.yml    # SITE_DIR env var selects which site ships
fab/                            # project meta (config, constitution, this file)
docs/                           # project-level memory + specs (NOT per-site)
```

Per-site implementation details (stack choices, file conventions, styling system) live inside that site's directory — typically a `README.md` and `docs/memory/site/` under the site root. Top-level `docs/memory/` is reserved for project-level concerns that span sites (deploy strategy, cross-site conventions).

## Deployment

GitHub Pages via `.github/workflows/deploy.yml` on push to `main`. The workflow's `SITE_DIR` env var picks which subdirectory under `sites/` is built and deployed — swap the live site by editing that one line.

`dist/` is gitignored at any depth; CI is the single source of truth for what's live (Constitution VI). Custom domain `shll.ai` set via `public/CNAME` inside the live site's directory.

## What this project is

- **A repo of website experiments** competing to be the front door to shll.ai.
- **Static-first** — every site SHALL produce fully static output. No SSR adapters, no server endpoints, no runtime data fetching for primary content.

## What this project is NOT

- Not a docs site for any one tool — each tool's full docs live in its own repo's README. Pages here are short "directory entries" linking out.
- Not a monorepo with shared dependencies — each site under `sites/` owns its own `package.json` and stack. Sharing is opt-in, not the default.
- Not server-rendered.
