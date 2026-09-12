---
type: memory
description: "GitHub Pages deploy of sites/shll-ai-redirect-stub/ via deploy.yml (push to main, workflow_dispatch, daily cron 13 9 * * *, two hours after hexokit-site's help refresh): Node 22 only, no pnpm, no install step; node build.mjs fetches from hexokit.com at build time and fails closed so the last-good deployment never lapses; ci.yml = hermetic node --test then the live build; two-job build→deploy, pages concurrency, minimal permissions; no inbound pulls, no GITHUB_TOKEN in the build, no analytics"
---
# Deployment

## Overview

The site deploys to GitHub Pages via a single workflow at `.github/workflows/deploy.yml` (see [redirect-stub](/build-deploy/redirect-stub.md) for the generator it runs). Triggers: every push to `main`, manual `workflow_dispatch`, and a daily `schedule` cron (`13 9 * * *`, 09:13 UTC — two hours after hexokit-site's 07:13 UTC help refresh + deploy, so the day's byte copies of `/versions.json` and `/install` pick up that refresh's values).

There is no preview/staging environment and no manual deploy path — `dist/` is gitignored and never committed.

## Requirements

- Deployments MUST go through the GitHub Pages workflow. Manual deploys (uploading `dist/` to anywhere) SHALL NOT be performed.
- The `dist/` directory MUST remain gitignored. It SHALL NOT be committed under any circumstances. Rationale: CI is the single source of truth for what is live; committing `dist/` invites divergence.
- The toolchain is Node 22 via `actions/setup-node@v4` — **no pnpm, no package manager, no install step** (the generator is zero-dependency; Constitution: minimal dependencies).
- The workflow MUST have two jobs: `build` (runs `node build.mjs` in `SITE_DIR`, uploads the pages artifact) and `deploy` (`actions/deploy-pages@v4`). The split exists so artifact upload completes before deploy permissions activate.
- The `pages` concurrency group MUST have `cancel-in-progress: false` — letting in-flight deploys complete prevents partial state.
- `SITE_DIR` is `sites/shll-ai-redirect-stub`; the `CNAME` (`shll.ai`, no protocol, no path) is emitted into `dist/` by the build itself, not kept under `public/`.
- The build step MUST NOT receive `GITHUB_TOKEN` — the generator makes no GitHub API calls (no star-count fetch), and no third-party fetch is fail-soft: every fetch failure is a build-stop.

## Permissions

The workflow declares minimum required permissions:

```yaml
permissions:
  contents: read   # checkout
  pages: write     # deploy
  id-token: write  # OIDC token for actions/deploy-pages
```

These SHALL NOT be widened without explicit justification.

## Fail-closed freshness model

The daily cron is the only automated rebuild. The build fetches the redirect map and every byte copy from `https://hexokit.com` at build time with a 20 s timeout per fetch, no retries, no fallback origin — and **any fetch or validation failure exits non-zero before output is written**, so the last-good deployment stays live (the never-lapses posture, rebrand plan decision D4). A regressed or unreachable hexokit.com turns the daily run red — that red run is the alert; nothing lapses.

There are **no inbound scheduled pulls** (no help/README refresh crons) and **no analytics beacon** — the site serves static stubs and byte copies only.

## CI validation (`ci.yml`)

`.github/workflows/ci.yml` runs on `pull_request` and push to `main` (concurrency cancels superseded PR runs, never `main` runs):

1. `node --test sites/shll-ai-redirect-stub/*.test.mjs` — the hermetic unit + integration suite (synthetic map fixture, in-process HTTP server; no network).
2. `node build.mjs` in the site dir — the **real build against live hexokit.com**, the same thing the deploy does, so a PR that would fail the deploy fails here.

Until the X1 map endpoint (`https://hexokit.com/shll-ai-redirects.json`) is deployed, the second step fails closed on its 404 by design — the red run is the correct "do not merge yet" signal, not a bug to work around (the unit-test step still passes).

## Design Decisions

### Build-time fetch, fail closed, no fallback origin
**Decision**: Fetch the map and byte copies from hexokit.com at build time; any fetch or validation failure stops the build so the last-good deployment stays live.
**Why**: The constitution permits build-time data; the deploy's pre-existing `curl -f` install-script step carried the same rationale ("fail the deploy rather than ship a 404ing one-liner"); D4 requires the two binary-facing endpoints never lapse.
**Rejected**: A committed map copy (a second table that goes stale the day hexokit-site adds a page); retries or fallback origins (they mask the exact regression the floor check exists to surface).
*Introduced by*: 260912-sn0a-shll-ai-redirect-stub

### Freshness is a daily deploy cron, not a cross-repo dispatch
**Decision**: `deploy.yml` carries `schedule: '13 9 * * *'` — two hours after hexokit-site's 07:13 UTC help refresh + deploy.
**Why**: With no other daily commit path, the cron is what keeps the byte copies fresh; ≤ 24 h staleness of the fallback manifest is acceptable because shll ≥ v0.1.31 prefers hexokit.com first.
**Rejected**: A `repository_dispatch` from hexokit-site (a PAT secret in two repos for no user-visible gain).
*Introduced by*: 260912-sn0a-shll-ai-redirect-stub

### GitHub Pages, not Cloudflare/Vercel/Netlify
**Decision**: The site is static, low-traffic, and lives in a `@sahil87` repo — Pages is free, integrated, and sufficient.
**Rejected**: A third-party platform for a few hundred identical stubs.

### No PR previews configured
**Decision**: No deploy-preview infrastructure; reviewers run `node build.mjs` locally (and `ci.yml` runs the real build on every PR anyway).
**Rejected**: Preview infra contradicts the minimal-dependencies principle for a site this small.

## Operational Notes

- A deploy that succeeds in `build` but fails in `deploy` typically indicates GitHub Pages is not enabled on the repo, or the source is not set to "GitHub Actions" in repo settings.
- The workflow uses `actions/upload-pages-artifact@v3` and `actions/deploy-pages@v4`, both official GitHub actions.
