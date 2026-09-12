# Project Context

[shll.ai](https://shll.ai) is a **permanent redirect host** for [hexokit.com](https://hexokit.com), the one website for the shll AI coding toolkit (HexoKit rebrand). This repo builds and deploys that host — nothing else. It is **downstream of [sahil87/hexokit-site](https://github.com/sahil87/hexokit-site)**: the redirect map, the install script, the version manifest, and the agent endpoints are all produced there and fetched from `hexokit.com` at build time.

## Repo layout

```
sites/
└── shll-ai-redirect-stub/      # the entire live site — a zero-dependency Node 22 generator
.github/workflows/deploy.yml    # builds the stub on push to main, manual dispatch, and a daily cron
fab/                            # project meta (config, constitution, this file)
docs/                           # project-level memory + specs (three cross-repo specs are tombstones — maintained in hexokit-site)
```

There is exactly one site and no experiments: `sites/shll-ai-redirect-stub/` emits one redirect stub per old shll.ai URL, a client-side `404.html` catch-all, and byte copies of `/install` and `/versions.json` (baked into shipped `shll` binaries — they must stay real files forever). No `package.json`, no npm dependencies — Node 22 built-ins only.

## Deployment

GitHub Pages via `.github/workflows/deploy.yml`. The build **fails closed**: any fetch or validation error (map 404, dropped endpoint, completeness-floor regression, HTML body at `/install`) stops the build before `dist/` is written, so the last-good deployment stays live. The daily schedule keeps the byte copies ≤ ~24 h behind hexokit.com.

`dist/` is gitignored at any depth; CI is the single source of truth for what's live. Custom domain `shll.ai` via the emitted `dist/CNAME`.

## What this project is

- **A redirect host** — every URL shll.ai ever served lands on its final hexokit.com page.
- **Static-first** — the stub is generated at build time from hexokit.com endpoints; no server, no runtime fetch.
- **Fail-closed** — a broken upstream means a red build, never a broken deploy.

## What this project is NOT

- Not a content site — there are no pages, docs, or pull pipelines here; the toolkit's content lives in hexokit-site.
- Not a multi-site workspace — one site, one purpose, no variants.
- Not server-rendered, and no client-side data fetching.
