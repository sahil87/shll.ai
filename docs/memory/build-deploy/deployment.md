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

## Inbound scheduled pulls

Beyond developer pushes, there are **two** automated inbound paths to `main`, both **scheduled pulls** (not pushes), both **OFF the deploy path**, and both relying on the existing push-to-`main` deploy to ship their committed result (no separate deploy trigger — Constitution IV). They are **sibling** workflows, kept distinct because each pulls a different data kind with a different validation gate:

| Inbound pull | Workflow | Data committed | Gate | Memory |
|--------------|----------|----------------|------|--------|
| Help refresh | `scheduled-help-refresh.yml` | `help/<slug>.json` | Zod `validate-help.mjs` | [help-collection](../conventions/help-collection.md) |
| README refresh | `scheduled-readme-refresh.yml` | `content/<slug>/README.md` | `vn39` command/flag gate (`findUnknownTokens`) | [readme-extraction](../conventions/readme-extraction.md) |

### Help refresh

A scheduled job that refreshes `help/<slug>.json` at the repo root (the [help-collection](../conventions/help-collection.md) consume/pull side; forward contract in [`docs/specs/help-dump-contract.md`](../../specs/help-dump-contract.md)). As of change `oa63` (2026-06-03) this is a **pull**, not the prior push model. The flow:

1. `.github/workflows/scheduled-help-refresh.yml` runs on a **daily** `schedule` cron (plus `workflow_dispatch` for on-demand refreshes after a tool release). For each of the 7 tools it `brew install`s the tool, runs `<tool> help-dump`, captures stdout, and **stamps `captured_at`** (the shll.ai-owned field the tool does not emit) into the file.
2. It validates every `help/*.json` with the existing `validate-help.mjs` on the pinned pnpm 10 + Node 22 toolchain (reusing `deploy.yml`'s setup), then **direct-commits to `main` — gated on validation passing**, using the default `GITHUB_TOKEN` with minimal `contents: write`. No PR, no auto-merge, no `SHLLAI_TOKEN`. Per-tool **capture-failure** isolation: a tool whose capture fails (install fail / non-zero exit / empty / non-JSON) keeps its last-good committed file and does not block the others (a missing `help/tu.json` is the expected interim state, not a failure). **Schema** validity is enforced collectively by the whole-directory validator, so a valid-JSON-but-schema-invalid capture gates off the whole commit that run — a malformed capture never reaches `main` (safety), at a bounded freshness cost.
3. On commit to `main`, the **existing** `deploy.yml` push-to-`main` deploy runs and ships the updated help — **no separate deploy trigger is added** (Constitution IV).

The refresh job is deliberately **OFF the deploy path**: a flaky brew tap or a broken tool release breaks the REFRESH, not the landing-page deploy. `deploy.yml` stays untouched and toolchain-free, and the site keeps shipping last-good committed help.

### README refresh (second inbound path, change `w32m`)

A second scheduled job — `.github/workflows/scheduled-readme-refresh.yml`, a **sibling** of the help-refresh — refreshes the per-tool README slices at `content/<slug>/README.md` (the [readme-extraction](../conventions/readme-extraction.md) consume/pull side; forward contract in [`docs/specs/readme-extraction-contract.md`](../../specs/readme-extraction-contract.md)). The flow mirrors the help refresh exactly:

1. It runs on a **daily** `schedule` cron (`41 7 * * *`, offset from the help-refresh) plus `workflow_dispatch`. For each of the 7 tools it fetches the repo's `README.md` (raw.githubusercontent, main→master fallback), deduces the curated slice (head/tail boundaries + mermaid/theme-image strips via `extractReadme`), and runs the slice through the `vn39` command/flag gate (`findUnknownTokens` against `help/<slug>.json`) via `scripts/extract-readme-cli.mjs`.
2. On the gate passing it **direct-commits to `main`** the updated `content/<slug>/README.md`, using the default `GITHUB_TOKEN` with minimal `contents: write` (no PR, no auto-merge). Pinned pnpm 10 + Node 22 (reusing the help-refresh / `deploy.yml` setup). **Per-tool failure isolation**: a tool whose fetch/extraction/gate fails keeps its last-good committed slice and does not block the others. The `vn39` gate is the **sole guard on pulled-install accuracy** (the README `Install` section is included, not excluded).
3. As with the help refresh, the job is **OFF the deploy path** — when it commits to `main`, the existing `deploy.yml` ships the change (no new deploy trigger). A flaky fetch or a non-conformant README breaks the REFRESH, not the deploy; the site keeps shipping the last-good slice.

## Operational Notes

- A deploy that succeeds in `build` but fails in `deploy` typically indicates GitHub Pages is not enabled on the repo, or the source is not set to "GitHub Actions" in repo settings.
- CNAME files inside `public/` are preserved verbatim in `dist/` by Astro — no special configuration needed.
- The workflow uses `actions/upload-pages-artifact@v3` and `actions/deploy-pages@v4`. Both are official actions maintained by GitHub.

## Changelog

| Date | Change |
|------|--------|
| 2026-05-17 | Generated from code analysis |
| 2026-06-02 | Change `xiis`: documented the inbound help-collection PR path (tool repos PR `help/<slug>.json` into shll.ai), the `help-automerge.yml` auto-merge receiving workflow scoped to `help/**`, and that the existing push-to-`main` deploy ships the result (no new deploy workflow). |
| 2026-06-02 | Change `xiis` (review rework): clarified that `help-automerge.yml`'s `help/**` path filter controls *triggering* not merge eligibility, and that auto-merge is gated by three guards (content / schema-validation / actor `sahil87`) — required because the repo is public and `main` is unprotected and auto-deploys. *(Superseded by `oa63` — push model retired.)* |
| 2026-06-03 | Change `oa63`: inverted the inbound help path from PUSH to PULL. Replaced the "Inbound help-collection PRs" section (tool-repo PRs + `help-automerge.yml` + three guards + `SHLLAI_TOKEN`) with the scheduled pull model — `.github/workflows/scheduled-help-refresh.yml` (daily cron + dispatch) brew-installs the 7 tools, runs `help-dump`, stamps `captured_at`, validates, and direct-commits to `main` gated on validation, deliberately OFF the deploy path. The existing push-to-`main` deploy still ships the committed result (Constitution IV); `deploy.yml` is unchanged. |
| 2026-06-04 | Change `w32m`: added a **second inbound scheduled pull path** — `.github/workflows/scheduled-readme-refresh.yml` (daily cron + dispatch, a sibling of the help-refresh) fetches each tool's `README.md`, deduces the curated slice, runs the `vn39` command/flag gate, and direct-commits `content/<slug>/README.md` to `main` gated on the gate passing, per-tool isolated and OFF the deploy path. Generalized the section to "Inbound scheduled pulls" (two siblings: help → `help/*.json`, README → `content/<slug>/README.md`). The existing push-to-`main` deploy still ships both committed results (Constitution IV); `deploy.yml` unchanged. See [readme-extraction](../conventions/readme-extraction.md). |
