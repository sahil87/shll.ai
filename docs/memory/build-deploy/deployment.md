---
type: memory
description: "GitHub Pages workflow, pnpm/Node versions, custom-domain CNAME, permissions, the build step's step-scoped GITHUB_TOKEN + tolerant build-time GitHub star-count fetch (7 repo calls, fail-soft to count-omission, never fails the build — d9qb), the two inbound scheduled pull paths (help refresh — gated commit; README refresh — divergence-ungated / report-only, fetch-failure-only isolation), the refresh→deploy cascade fix (each refresh explicitly dispatches deploy.yml via workflow_dispatch after a real commit, since a default-GITHUB_TOKEN push is suppressed from on:push by GitHub's recursion guard — xs1j), the corrected daily-deploy freshness model (neither pull literally always-commits; the help refresh's captured_at churn commits daily and now drives the daily deploy via that dispatch), and the site-wide Cloudflare Web Analytics beacon (cookieless, public token, Head-override injection, deliberate Constitution I exception)"
---
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

These SHALL NOT be widened without explicit justification. (The `d9qb` star-count fetch did NOT widen them — the automatic `GITHUB_TOKEN` passed to the Build step works under the existing `contents: read`.)

## Build-time GitHub API dependency (star counts, change `d9qb`)

The Astro build now makes **7 tolerant GitHub API calls** — one `GET https://api.github.com/repos/sahil87/<tool>` per tool — so each tool page's `GithubButton` can render the repo's star count statically (`src/lib/github-stars.ts`; component conventions in [conventions/tool-page-rubric](/conventions/tool-page-rubric.md#per-tool-github-affordance-live-starlight-site)). This is the build's first dependency on a **live third-party API** (everything else build-time reads committed repo artifacts), and it is **deliberately fail-soft — a star-fetch failure MUST NEVER fail the build**:

- **Any failure → count omitted, build proceeds.** Network error, non-200 (404 / 403 rate-limit), missing/malformed `stargazers_count`, or a stalled connection (each request carries a 10s `AbortSignal.timeout`, so a hang degrades in seconds rather than holding the build for undici's ~300s default) resolves to `null` with exactly one build-log warning per repo; the button renders without the count, markup otherwise unchanged. This is the deliberate opposite of `VersionTable`'s build-stop: a committed `help/*.json` artifact's absence means a defect reached `main` and must not deploy, while a live-API miss is transient noise that must not couple deploys to GitHub API availability.
- **Bounded cost**: a module-level promise cache collapses the work to one request per repo per build — 7 calls total, sub-second.
- **Token plumbing**: the "Build with Astro" step passes `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` as **step-scoped env** (least exposure — the token has a single consumer; job-wide env was rejected at plan time). Its only purpose is raising the API rate limit from shared Actions-runner IPs — unauthenticated calls from those IPs rate-limit unpredictably; the automatic token fixes this with zero secret management. The module reads the token only from `process.env.GITHUB_TOKEN`, sends it only to `api.github.com` as a Bearer header, and never logs or renders it. Local dev builds go unauthenticated and simply omit counts when rate-limited.
- **Freshness**: no new scheduling was added — rendered counts refresh with whatever rebuild happens next, in practice daily via the help refresh's `captured_at` churn (see [the corrected freshness model below](#daily-deploy-freshness-model-corrected-change-d9qb)), so a count is at most ~24h stale.

## Design Decisions

- **GitHub Pages, not Cloudflare/Vercel/Netlify.** The site is static, low-traffic, and lives in a `@sahil87` repo — Pages is free, integrated, and sufficient. No need for a third-party platform for a single-page marketing site.
- **pnpm, not npm/yarn.** Matches the rest of the toolkit's tooling. Frozen lockfile in CI catches dependency drift early.
- **No PR previews configured.** [INFERRED] Adding deploy-preview infrastructure would contradict [Constitution Principle IV](../../../fab/project/constitution.md) (minimal dependencies) for a site that rarely changes. Reviewers can `pnpm dev` locally.
- **`workflow_dispatch` enabled.** Allows manual re-runs from the GitHub UI when needed (e.g., re-deploying without a code change to clear a Pages cache issue).

## Inbound scheduled pulls

Beyond developer pushes, there are **two** automated inbound paths to `main`, both **scheduled pulls** (not pushes), both **OFF the deploy path**, and both relying on the existing push-to-`main` deploy to ship their committed result (no separate deploy trigger — Constitution IV). They are **sibling** workflows, kept distinct because each pulls a different data kind with a different validation gate:

| Inbound pull | Workflow | Data committed | Gate | Memory |
|--------------|----------|----------------|------|--------|
| Help refresh | `refresh-help.yml` | `help/<slug>.json` | Zod `validate-help.mjs` (gates the commit) | [help-collection](/conventions/help-collection.md) |
| README refresh | `refresh-readme.yml` | `content/<slug>/README.md` | `vn39` `findUnknownTokens` — **report-only, does NOT gate the commit** (change `4s3e`) | [readme-extraction](/conventions/readme-extraction.md) |

> **Asymmetry (change `4s3e`).** The help refresh's commit **is** gated on validation (a schema-invalid capture never reaches `main`). The README refresh's commit is **NOT** gated — the tool README is canonical and is committed verbatim even when its commands diverge from `help/<slug>.json` (divergence emits a CI `::warning::`). The README refresh's only "keep last-good" path is a genuine **fetch failure**, not divergence.

### Help refresh

A scheduled job that refreshes `help/<slug>.json` at the repo root (the [help-collection](/conventions/help-collection.md) consume/pull side; forward contract in [`docs/specs/help-dump-contract.md`](../../specs/help-dump-contract.md)). As of change `oa63` (2026-06-03) this is a **pull**, not the prior push model. The flow:

1. `.github/workflows/refresh-help.yml` runs on a **daily** `schedule` cron (plus `workflow_dispatch` for on-demand refreshes after a tool release). For each of the 7 tools it `brew install`s the tool, runs `<tool> help-dump`, captures stdout, and **stamps `captured_at`** (the shll.ai-owned field the tool does not emit) into the file.
2. It validates every `help/*.json` with the existing `validate-help.mjs` on the pinned pnpm 10 + Node 22 toolchain (reusing `deploy.yml`'s setup), then **direct-commits to `main` — gated on validation passing**, using the default `GITHUB_TOKEN` with minimal `contents: write`. No PR, no auto-merge, no `SHLLAI_TOKEN`. Per-tool **capture-failure** isolation: a tool whose capture fails (install fail / non-zero exit / empty / non-JSON) keeps its last-good committed file and does not block the others (a missing `help/tu.json` is the expected interim state, not a failure). **Schema** validity is enforced collectively by the whole-directory validator, so a valid-JSON-but-schema-invalid capture gates off the whole commit that run — a malformed capture never reaches `main` (safety), at a bounded freshness cost.
3. On a real commit to `main`, the job **explicitly dispatches** `deploy.yml` via `workflow_dispatch` (`gh workflow run deploy.yml --ref main`, gated on a commit having happened — change `xs1j`). This dispatch is **required**: a push made with the default `GITHUB_TOKEN` does NOT trigger `deploy.yml`'s `on: push` (GitHub's recursion guard suppresses it), so before `xs1j` the committed help sat undeployed until the next *human* merge. `workflow_dispatch` is exempt from the recursion guard, so no new secret is needed — the same default `GITHUB_TOKEN`, now with `actions: write` and `GH_TOKEN` in the dispatch step env. No `deploy.yml` trigger change (it already declared `workflow_dispatch`); Constitution IV holds — the deploy still goes through `deploy.yml`.

The refresh job is deliberately **OFF the deploy *build* path**: it does not build/deploy itself — it only *dispatches* the deploy after committing. A flaky brew tap or a broken tool release breaks the REFRESH (and its dispatch), not the deploy workflow's correctness; `deploy.yml` stays untouched and toolchain-free, and the site keeps shipping last-good committed help.

### README refresh (second inbound path, change `w32m`)

A second scheduled job — `.github/workflows/refresh-readme.yml`, a **sibling** of the help-refresh — refreshes the per-tool README slices at `content/<slug>/README.md` (the [readme-extraction](/conventions/readme-extraction.md) consume/pull side; forward contract in [`docs/specs/readme-extraction-contract.md`](../../specs/readme-extraction-contract.md)). The flow mirrors the help refresh exactly:

1. It runs on a **daily** `schedule` cron (`41 7 * * *`, offset from the help-refresh) plus `workflow_dispatch`. For each of the 7 tools it fetches the repo's `README.md` (raw.githubusercontent, main→master fallback), deduces the curated slice (head/tail boundaries + mermaid/theme-image strips via `extractReadme`), and runs the slice through the `vn39` command/flag **divergence reporter** (`findUnknownTokens` against `help/<slug>.json`) via `scripts/extract-readme-cli.mjs`.
2. It direct-commits the updated `content/<slug>/README.md` to `main` **ungated by divergence** (change `4s3e` — the commit is **NOT** gated on the cross-check; the canonical README is committed verbatim and a `::warning::` is emitted on divergence), using the default `GITHUB_TOKEN` with minimal `contents: write` (no PR, no auto-merge). **Precision (change `d9qb`): "always commits" means ungated-by-divergence, NOT commits-every-run** — like the help refresh, the commit step skips when `git diff --cached --quiet` reports nothing staged, so a run where no slice's content changed commits nothing (see [the freshness model below](#daily-deploy-freshness-model-corrected-change-d9qb)). Pinned pnpm 10 + Node 22 (reusing the help-refresh / `deploy.yml` setup). **Per-tool isolation applies ONLY to genuine fetch failures (change `4s3e`)**: a tool whose README cannot be fetched (no network / 404 on all branches) keeps its last-good committed slice and does not block the others; a tool whose slice merely *diverges* (or has no `help/<slug>.json`, e.g. `tu`) is still committed with a warning. The `vn39` cross-check is a **reporter, not a guard** — the README `Install` section is included (not excluded), and a divergent install commits with a warning rather than being withheld.
3. As with the help refresh, on a real commit the job **explicitly dispatches** `deploy.yml` via `workflow_dispatch` (gated on a commit having happened — change `xs1j`; same recursion-guard rationale, `actions: write` + `GH_TOKEN` added, no new secret). It does not build/deploy itself. A flaky *fetch* breaks the REFRESH, not the deploy workflow; the site keeps shipping the last-good slice. (A *divergent* README no longer breaks the refresh — it commits with a warning.) On a day both refreshes commit, two independent dispatches fire; `deploy.yml`'s `concurrency: group: pages, cancel-in-progress: false` serializes them (the second queues behind the first) — no deduplication is needed.

### Daily-deploy freshness model (corrected, change `d9qb`)

**The cascade that makes a commit deploy was BROKEN before change `xs1j` — corrected below.** A commit and a deploy are two separate things, and the link between them was silently severed:

- **Before `xs1j` (the bug).** Both refresh jobs direct-commit to `main` with the default `GITHUB_TOKEN` and *relied on* `deploy.yml`'s `on: push` to ship the result. But GitHub's **recursion guard suppresses `on: push` runs triggered by a default-`GITHUB_TOKEN` push**, so that deploy **never fired**. The help refresh's per-run `captured_at` churn reliably produced a *commit* every day — but **not** a deploy. The site only redeployed on the next *human* merge, which dragged the committed-but-undeployed content out. The earlier framing of the help refresh as "the reliable daily deploy **driver**" was therefore **false** — it was a reliable daily *commit* driver only. (Frequent human merges masked this; staleness never grew visible, but the cascade was broken, not merely lucky.)
- **After `xs1j` (the fix).** Each refresh job now **explicitly dispatches** `deploy.yml` via `workflow_dispatch` after — and only after — it pushes a real commit (`workflow_dispatch` is exempt from the recursion guard). So a refresh that commits now actually deploys. The **help refresh's `captured_at` churn** remains the reliable daily *commit* driver — and, via that dispatch, is now the reliable daily *deploy* driver too. The README refresh dispatches a deploy only on the days it actually commits a slice change.

**Neither scheduled pull literally always-commits.** Both workflows' commit steps skip when `git diff --cached --quiet` reports nothing staged — the `4s3e` "always commits" phrasing means *ungated by divergence* (warn-not-skip), not *commits every run*. The dispatch is gated on the commit having happened (the no-op `exit 0` path dispatches nothing), so a no-op refresh deploys nothing. `refresh-help.yml` stamps a fresh UTC timestamp into every successfully captured `help/<slug>.json` on every run, so its staged diff is non-empty whenever at least one of the 7 captures succeeds → it commits → it dispatches a deploy. `refresh-readme.yml` commits (and dispatches) **only when some slice's content actually changed** (pulled bytes carry no per-run stamp), which on most days is nothing.

Consequence: any build-time-rendered data that "rides the daily rebuild" for freshness — the `d9qb` star counts being the first — depends on **`refresh-help.yml`** committing AND its `xs1j` dispatch firing, not the README refresh. Worst case a count is ~24h stale; if the help refresh were ever disabled, failing across all 7 captures, or its dispatch step removed, counts (and any other ride-along data) would go stale until the next push to `main`. Anyone adding ride-along build-time data SHOULD note this dependency rather than assume "a deploy happens daily" is free-standing — it is the help refresh's commit-plus-dispatch that makes it so.

> **`pgox` added build-time `help/*.json` consumers, but NO new build dependency category.** The `pgox` per-tool JSON-LD descriptions (`Head.astro`) and `/tools` directory one-liners (`ToolsIndex.astro`) single-source from `help/<tool>.json` `root.short` at build time — so they too "ride the daily rebuild" exactly as the `d9qb` star counts do (a `root.short` edited by `refresh-help.yml` self-corrects on the next deploy). This added two more consumers of the **already-committed** `help/*.json` artifacts (joining `CommandReference`/`VersionTable`/`CommandIndex`); it did **not** introduce a new build dependency — no new third-party API call (unlike the `d9qb` star fetch), no new scheduled pull, no new toolchain step. The read pattern (`repoRootFromModuleUrl` + `HelpDocSchema.parse`) and its freshness model are unchanged. The two `pgox` surfaces split on missing-file posture, as a build property worth noting: `ToolsIndex` **build-stops** on a missing/invalid rostered help file (a committed directory page must be complete — `VersionTable`'s posture), while the inert JSON-LD branch **soft-omits** the description and keeps building (`CommandReference`'s posture) — see [conventions/tool-page-rubric](/conventions/tool-page-rubric.md#tools-index-page--the-tools-directory-landing-change-pgox) and [conventions/seo-social-meta](/conventions/seo-social-meta.md#per-tool-branch--softwareapplication--breadcrumblist-change-pgox).

## Analytics (Cloudflare Web Analytics, change `i2b0`)

The live site (`sites/astro-starlight-terminal1`) carries the **Cloudflare Web Analytics** beacon site-wide. It is **cookieless** (no personal data stored client-side → no consent banner / cookie gate), and its site token (`11bda8377391420f9138b4cf3128dc6e`) is **public, not a secret** — it ships in the page HTML by design, so it is hardcoded, NOT routed through an env var / `import.meta.env` / GitHub secret.

- **Mechanism**: the beacon `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "..."}'>` is injected via a **`Head.astro` component override** (`src/components/Head.astro`, registered in the `components:` block) that renders Starlight's `<Default />` then appends the literal tag via `<Fragment set:html>`. This path was chosen because Starlight's `head:` config array HTML-escapes the `data-cf-beacon` JSON attribute (`&quot;`); the override emits the literal un-escaped tag. Mechanics + the reusable head-injection gotcha live in [conventions/tool-page-rubric → Site chrome overrides](/conventions/tool-page-rubric.md#site-chrome-overrides-header-logo-footer-head-change-i2b0).
- **Constitution I exception (deliberate, user-approved)**: the beacon is client-side runtime JS, which Constitution I (Static-First, Zero Runtime) otherwise restricts. Web analytics inherently needs a client beacon; the exception is scoped to analytics only, `defer`red (never blocks/alters primary-content rendering), and the site stays fully static on GitHub Pages. Constitution VI is respected — it adds NO npm/build dependency, just an external `<script>` tag (no lockfile change, no bundled code).
- **Scope**: Cloudflare Web Analytics ONLY — no PostHog / GA / other vendor. Off the build/deploy plumbing above (it is a rendered-output `<head>` tag, not a workflow change); ships via the normal push-to-`main` deploy.

## Operational Notes

- A deploy that succeeds in `build` but fails in `deploy` typically indicates GitHub Pages is not enabled on the repo, or the source is not set to "GitHub Actions" in repo settings.
- CNAME files inside `public/` are preserved verbatim in `dist/` by Astro — no special configuration needed.
- The workflow uses `actions/upload-pages-artifact@v3` and `actions/deploy-pages@v4`. Both are official actions maintained by GitHub.
