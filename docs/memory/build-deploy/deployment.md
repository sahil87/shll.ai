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

## Operational Notes

- A deploy that succeeds in `build` but fails in `deploy` typically indicates GitHub Pages is not enabled on the repo, or the source is not set to "GitHub Actions" in repo settings.
- CNAME files inside `public/` are preserved verbatim in `dist/` by Astro — no special configuration needed.
- The workflow uses `actions/upload-pages-artifact@v3` and `actions/deploy-pages@v4`. Both are official actions maintained by GitHub.

## Changelog

| Date | Change |
|------|--------|
| 2026-05-17 | Generated from code analysis |
