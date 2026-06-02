# Deployment

## Overview

The site deploys to GitHub Pages via a single workflow at `.github/workflows/deploy.yml`. Every push to `main` triggers a build-and-deploy pipeline. The custom domain `shll.ai` is configured via `public/CNAME`, which Astro copies into the output `dist/` as-is.

There is no preview/staging environment. There is no manual deploy path — `dist/` is gitignored and never committed.

## Requirements

- Deployments MUST go through the GitHub Pages workflow on push to `main`. Manual deploys (uploading `dist/` to anywhere) SHALL NOT be performed.
- The `dist/` directory MUST remain gitignored. It SHALL NOT be committed under any circumstances. Rationale: CI is the single source of truth for what is live; committing `dist/` invites divergence.
- The workflow MUST use `pnpm install --frozen-lockfile` to ensure reproducible builds. Drift between `pnpm-lock.yaml` and `node_modules` SHALL fail CI.
- Node version MUST be 22 (matching `package.json` engines `>=22.12.0`).
- The workflow MUST have two jobs: `build` (uploads pages artifact) and `deploy` (uses `actions/deploy-pages@v4`). The split exists so artifact upload completes before deploy permissions activate.
- The `pages` concurrency group MUST have `cancel-in-progress: false` — letting in-flight deploys complete prevents partial state.
- `public/CNAME` MUST contain `shll.ai` (no protocol, no path). GitHub Pages reads this to configure the custom domain.

## Permissions

The workflow declares minimum required permissions:

```yaml
permissions:
  contents: read   # checkout
  pages: write     # deploy
  id-token: write  # OIDC token for actions/deploy-pages
```

These SHALL NOT be widened without explicit justification.

## Design Decisions

- **GitHub Pages, not Cloudflare/Vercel/Netlify.** The site is static, low-traffic, and lives in a `@sahil87` repo — Pages is free, integrated, and sufficient. No need for a third-party platform for a single-page marketing site.
- **pnpm, not npm/yarn.** Matches the rest of the toolkit's tooling. Frozen lockfile in CI catches dependency drift early.
- **No PR previews configured.** [INFERRED] Adding deploy-preview infrastructure would contradict [Constitution Principle IV](../../../fab/project/constitution.md) (minimal dependencies) for a site that rarely changes. Reviewers can `pnpm dev` locally.
- **`workflow_dispatch` enabled.** Allows manual re-runs from the GitHub UI when needed (e.g., re-deploying without a code change to clear a Pages cache issue).

## Inbound help-collection PRs

Beyond developer pushes, there is one automated inbound path to `main`: the 7 sibling tool repos open PRs that update `help/<slug>.json` at the repo root (the [help-collection](../conventions/help-collection.md) contract). The flow:

1. A tool's CI opens a PR into `sahil87/shll.ai` (using the `SHLLAI_TOKEN` secret) touching only `help/**`, with auto-merge requested.
2. `.github/workflows/help-automerge.yml` triggers on `pull_request` events with a `paths: ['help/**']` filter. **The path filter controls only whether the workflow triggers, NOT whether the PR may merge** — and because this repo is **public**, `main` is **unprotected**, and merging **auto-deploys**, that distinction is load-bearing: a mixed diff (help/** *plus* other paths) still trips the trigger. The workflow therefore enables auto-merge (`gh pr merge --auto`) only when **three guards** pass — (a) every changed file is under `help/` (else a no-op; PR left open), (b) the help JSON passes the `validate-help.mjs` schema validator on the pinned pnpm 10 + Node 22 toolchain, and (c) the author is the trusted producer (`TRUSTED_AUTHOR: sahil87`). It uses `pull_request` (not `pull_request_target`).
3. On merge to `main`, the **existing** `deploy.yml` push-to-`main` deploy runs and ships the updated help — **no separate deploy trigger is added** (Constitution IV).

The receiving workflow is inert until producers begin opening PRs; its presence does not affect the deploy or any current CI.

## Operational Notes

- A deploy that succeeds in `build` but fails in `deploy` typically indicates GitHub Pages is not enabled on the repo, or the source is not set to "GitHub Actions" in repo settings.
- CNAME files inside `public/` are preserved verbatim in `dist/` by Astro — no special configuration needed.
- The workflow uses `actions/upload-pages-artifact@v3` and `actions/deploy-pages@v4`. Both are official actions maintained by GitHub.

## Changelog

| Date | Change |
|------|--------|
| 2026-05-17 | Generated from code analysis |
| 2026-06-02 | Change `xiis`: documented the inbound help-collection PR path (tool repos PR `help/<slug>.json` into shll.ai), the `help-automerge.yml` auto-merge receiving workflow scoped to `help/**`, and that the existing push-to-`main` deploy ships the result (no new deploy workflow). |
| 2026-06-02 | Change `xiis` (review rework): clarified that `help-automerge.yml`'s `help/**` path filter controls *triggering* not merge eligibility, and that auto-merge is gated by three guards (content / schema-validation / actor `sahil87`) — required because the repo is public and `main` is unprotected and auto-deploys. |
