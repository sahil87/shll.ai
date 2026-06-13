# Intake: Fix Refresh→Deploy Cascade, Standardize Workflow Names, Correct Memory

**Change**: 260613-xs1j-fix-refresh-deploy-cascade
**Created**: 2026-06-13

## Origin

> fix the broken scheduled-refresh→deploy cascade (refresh jobs push with the default GITHUB_TOKEN, which GitHub suppresses from triggering deploy.yml on:push — so fresh help/README commits to main but does NOT redeploy until the next human merge; verified via gh run list: no deploy run is titled with a chore(help)/chore(content) refresh commit), AND standardize the three workflow filenames + name: fields to the category-prefix convention (deploy.yml stays; scheduled-help-refresh.yml → refresh-help.yml name 'Refresh: Help'; scheduled-readme-refresh.yml → refresh-readme.yml name 'Refresh: README'; deploy.yml name 'Deploy to GitHub Pages' → 'Deploy'), AND correct the build-deploy memory which currently claims the help refresh is 'the reliable daily deploy driver' (it commits daily but does NOT deploy, per the same cascade bug).

**Mode**: conversational. This change emerged from a `/fab-discuss` session that began as a question about workflow inventory and timings, surfaced a misconception ("should we schedule all 3 30 min apart + deploy on every merge"), and converged on three causally-related pieces of work after the design discussion below.

**Key decisions reached in discussion**:
1. The user confirmed the *current* design (deploy event-driven on push; two refreshes ~28 min apart) is structurally correct — no schedule should be added to `deploy.yml`, and the two crons should not be moved closer (the 07:13/07:41 offset is load-bearing to avoid racing on a direct commit to `main`).
2. While confirming, the agent surfaced a **real latent bug**: the refresh→deploy cascade is broken by the well-known GitHub rule that a push made with the default `GITHUB_TOKEN` does **not** trigger `on: push` workflows (recursion guard). Verified empirically via `gh run list`: every `deploy.yml` run is titled with a human PR/merge; none is titled `chore(help): refresh…` or `chore(content): refresh…`, despite daily `chore(help)` commits existing on `main` from `github-actions[bot]`.
3. The user chose the **category-prefix** naming convention for the three workflows.
4. The user chose to package all three pieces (cascade fix + rename + memory correction) as **one fab change**.
5. Mechanism for the cascade fix (agent-proposed, user-accepted via "all three"): each refresh job, after a successful commit+push, explicitly dispatches the deploy via `workflow_dispatch` using the same default `GITHUB_TOKEN` — `workflow_dispatch` is exempt from the recursion guard, so no extra secret (`SHLLAI_TOKEN`/PAT) is needed, preserving the deliberate no-extra-secrets design of the refresh jobs.

## Why

**Problem 1 — broken cascade (the actual bug).** The two scheduled refresh jobs (`scheduled-help-refresh.yml`, `scheduled-readme-refresh.yml`) direct-commit to `main` and rely on `deploy.yml`'s `on: push: branches: [main]` trigger to ship the result. But both push with the default `secrets.GITHUB_TOKEN`. GitHub deliberately suppresses workflow runs triggered by pushes made with the default token (to prevent recursive/runaway workflow chains). **Consequence**: fresh `help/*.json` and `content/<slug>/README.md` slices land in `main` daily but the live site is **not redeployed** until the next *human* merge drags the committed-but-undeployed content out. The "daily freshness" promise the architecture documents is silently false. The user's frequent human merges have masked this — staleness never grows visible — but the mechanism is broken, not merely lucky.

**What happens if we don't fix it.** Any day with no human merge ships nothing fresh: star counts (the `d9qb` build-time ride-along data), help/command references, and README/docs-site slices all sit ≤(time-until-next-merge) stale instead of ≤24h. If human merges ever slow (quiet week, release freeze), the site silently goes stale with no signal. The build-deploy memory actively *misleads* a future contributor into assuming "a deploy happens daily" is free-standing (it explicitly says so — see Problem 3).

**Problem 2 — inconsistent workflow naming.** The three workflows follow no single convention: `deploy.yml`/`Deploy to GitHub Pages` is verb-noun-place; the two refreshes are `scheduled-<thing>-refresh.yml`/`Scheduled <Thing> refresh`. The user wants a single category-prefix convention so the two refreshes group together in the Actions UI and `deploy` stands alone as the shipping step.

**Problem 3 — incorrect memory.** `docs/memory/build-deploy/deployment.md` claims the help refresh's `captured_at` churn is "the reliable daily deploy **driver**" and that "freshness rides the existing daily scheduled rebuild" (echoed in `src/lib/github-stars.ts`'s comment and the `d9qb`/`260611-d9qb` intake). That is false under Problem 1: the help refresh reliably *commits* daily, but does **not** *deploy*. The memory must be corrected to describe the true mechanism (after the fix: the explicit `workflow_dispatch` dispatch is what drives the daily deploy; before the fix it did not deploy at all). Leaving the false claim in memory propagates the misconception to every future reader.

**Why this approach over alternatives** (cascade fix mechanism):
- **Chosen — explicit `workflow_dispatch` after commit**: zero new secrets, minimal blast radius, fires a deploy *only* when a refresh actually committed (no wasted runs), and `deploy.yml` already declares `workflow_dispatch` (line 6) so no change to the deploy workflow's triggers is needed.
- *Rejected — push with a PAT (`SHLLAI_TOKEN`)*: a non-default token's push *does* cascade-trigger `on: push`, but this reintroduces exactly the secret the `oa63` pull-model redesign deliberately removed ("no SHLLAI_TOKEN — just the default GITHUB_TOKEN"). Higher trust surface, against the grain of the existing design.
- *Rejected — scheduled cron on `deploy.yml`*: deploys byte-identical output on a timer when nothing changed; the user explicitly rejected adding a deploy schedule during discussion.

## What Changes

### 1. Cascade fix — `refresh-help.yml` (renamed from `scheduled-help-refresh.yml`)

After the existing "Commit refreshed help files" step commits **and pushes** a real change, add a follow-on step that dispatches the deploy. The dispatch MUST run only when a commit actually happened (the existing step early-exits with `exit 0` when `git diff --cached --quiet`, so a refresh with no diff must NOT dispatch a deploy).

Concrete shape (illustrative — exact wiring is a plan decision):

```yaml
# In the job's permissions block — ADD actions: write (currently only contents: write):
permissions:
  contents: write
  actions: write          # required so the default token may dispatch workflow_dispatch

# ... after the commit+push step, gated on a real commit having occurred:
- name: Trigger deploy
  if: <a-commit-was-pushed>          # do NOT dispatch on a no-op refresh
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}   # gh CLI needs the token in env
  run: gh workflow run deploy.yml --ref main
```

The "a commit was pushed" gate is a plan decision — candidate mechanisms: a step `id` + output set in the commit step (`echo "committed=true" >> "$GITHUB_OUTPUT"` on the commit path, consumed via `if: steps.commit.outputs.committed == 'true'`), since the current step uses a bare `exit 0` on the no-op path. The commit step's no-op `exit 0` must be preserved (a no-op refresh is success, not failure).

### 2. Cascade fix — `refresh-readme.yml` (renamed from `scheduled-readme-refresh.yml`)

Same treatment as #1, applied after this workflow's "Commit refreshed content slices" step. Same `actions: write` permission addition, same `GH_TOKEN` env, same commit-happened gate. Two independent dispatches (one per refresh job) are correct and acceptable: on a day both refreshes commit, two `workflow_dispatch` deploys fire; `deploy.yml`'s `concurrency: group: pages, cancel-in-progress: false` already serializes them safely (the second queues behind the first). No deduplication is needed or wanted.

### 3. Workflow rename + name normalization (category-prefix convention)

| Old file | New file | Old `name:` | New `name:` |
|----------|----------|-------------|-------------|
| `deploy.yml` | `deploy.yml` *(unchanged file)* | `Deploy to GitHub Pages` | `Deploy` |
| `scheduled-help-refresh.yml` | `refresh-help.yml` | `Scheduled help refresh` | `Refresh: Help` |
| `scheduled-readme-refresh.yml` | `refresh-readme.yml` | `Scheduled README refresh` | `Refresh: README` |

- Rename via `git mv` to preserve file history where possible.
- The internal `concurrency: group:` values (`scheduled-help-refresh`, `scheduled-readme-refresh`) SHOULD be renamed to match the new filenames (`refresh-help`, `refresh-readme`) for consistency — these are internal labels, not externally referenced.
- The two workflows' header comments cross-reference each other and the retired `help-automerge.yml` by name; update the **live cross-references** to the new names (the historical `help-automerge.yml` mention is a retired-model note — keep the historical reference but it is not renamed since that file is already deleted).
- **Known cost (accepted)**: renaming a workflow file resets its run-history grouping in the Actions UI (history keys on file path). Old runs under the old paths become orphaned-but-viewable. Acceptable for low-traffic crons.

### 4. Move all LIVE internal references in lockstep

The rename breaks any live reference to the old filenames. These must move together (verified present via a repo-wide grep during discussion):

- `docs/specs/help-dump-contract.md` — names `scheduled-help-refresh.yml` (current-state prose, ~lines 141, 166).
- `docs/specs/readme-extraction-contract.md` — names `scheduled-help-refresh.yml` (~line 280; line 821 is a dated changelog row — see Assumption on changelog policy).
- `docs/memory/conventions/readme-extraction.md` — description frontmatter + body section heading + body prose (`scheduled-readme-refresh.yml`, `scheduled-help-refresh.yml`).
- `docs/memory/conventions/help-collection.md` — body prose (`scheduled-help-refresh.yml`, sibling mention of `scheduled-readme-refresh.yml`).
- `docs/memory/conventions/docs-site-tree.md` — description frontmatter + body (`scheduled-readme-refresh.yml`).
- `docs/memory/conventions/index.md` — the two generated description rows. **NOTE**: `index.md` is generated by `fab memory-index` from each file's `description:` frontmatter — do NOT hand-edit `index.md`; instead edit the source files' `description:` frontmatter and re-run `fab memory-index` (a plan task).
- `docs/memory/build-deploy/deployment.md` — current-state prose, the workflow table (rows naming both workflow files), and the freshness-model section (also the locus of Problem 3's correction).
- `sites/astro-starlight-terminal1/src/lib/github-stars.ts` — the code comment (lines ~9–10) names both workflows AND asserts the false daily-deploy claim. Update the names AND correct the claim.

### 5. Memory correction (Problem 3)

In `docs/memory/build-deploy/deployment.md` (and the mirrored `github-stars.ts` comment), correct the "reliable daily deploy driver" framing:
- **Before this change** the cascade was broken: the help refresh committed daily but did NOT deploy; only a human merge deployed.
- **After this change** the explicit `workflow_dispatch` step in each refresh job is what drives the deploy when (and only when) that refresh commits. The help refresh's `captured_at` churn is still the reliable daily *commit* driver — and now, via the dispatch, the reliable daily *deploy* driver too. The README refresh deploys only on the days it actually commits a slice change.
- Add a new dated changelog row in each affected memory file documenting this change (`xs1j`) — do NOT rewrite existing dated changelog rows (they record what was true on their date).

### Non-goals

- NOT adding a schedule/cron to `deploy.yml` (explicitly rejected in discussion).
- NOT changing the two refresh crons' times (07:13 / 07:41) — the offset is load-bearing.
- NOT touching `fab/changes/archive/**` or any other prior change's `intake.md`/`plan.md`/`spec.md` — those are immutable history. (Several archived artifacts name the old workflow files; they correctly record the names as they were at the time.)
- NOT rewriting existing dated changelog rows in living memory/spec files — only add new rows for this change.
- NOT introducing any new secret (`SHLLAI_TOKEN`/PAT).

## Affected Memory

- `build-deploy/deployment`: (modify) Correct the false "reliable daily deploy driver" claim; document the `workflow_dispatch` cascade fix; rename the two workflow references; add an `xs1j` changelog row. Update the workflow table rows.
- `conventions/help-collection`: (modify) Rename `scheduled-help-refresh.yml` → `refresh-help.yml` (and the sibling mention) in current-state prose + `description:` frontmatter; add an `xs1j` changelog row noting the cascade fix + rename.
- `conventions/readme-extraction`: (modify) Rename `scheduled-readme-refresh.yml` → `refresh-readme.yml` (and the sibling mention) in current-state prose + `description:` frontmatter + section heading; add an `xs1j` changelog row.
- `conventions/docs-site-tree`: (modify) Rename `scheduled-readme-refresh.yml` → `refresh-readme.yml` in current-state prose + `description:` frontmatter; add an `xs1j` changelog row.
- `conventions/index`: (modify, generated) Regenerate via `fab memory-index` after the `description:` frontmatter edits above — not hand-edited.

## Impact

**Code / CI**:
- `.github/workflows/scheduled-help-refresh.yml` → `.github/workflows/refresh-help.yml` (rename + `name:` + `actions: write` + Trigger-deploy step + concurrency group rename + comment updates).
- `.github/workflows/scheduled-readme-refresh.yml` → `.github/workflows/refresh-readme.yml` (same set).
- `.github/workflows/deploy.yml` (`name:` only — `Deploy to GitHub Pages` → `Deploy`; triggers already include `workflow_dispatch`, no trigger change).
- `sites/astro-starlight-terminal1/src/lib/github-stars.ts` (comment: rename references + correct the daily-deploy claim).

**Specs** (human-curated, not auto-generated):
- `docs/specs/help-dump-contract.md`, `docs/specs/readme-extraction-contract.md` — live cross-references to the renamed workflow(s) in current-state prose.

**Memory**: per Affected Memory above; `docs/memory/conventions/index.md` regenerated via `fab memory-index`.

**Constitution**: no amendment needed — no principle changes. (The change reinforces Constitution IV "Deploy via CI" by *making the documented CI cascade actually work.)

**Permissions / security**: adds `actions: write` to the two refresh jobs' `permissions:` blocks. This is the minimum scope to dispatch `workflow_dispatch` and is narrower than a PAT — no new secret, default token only. The repo is public with unprotected `main` and auto-deploy; `actions: write` lets the job trigger a workflow it already effectively triggers (via push), so no new capability of consequence is granted.

**Testing / verification**: no unit tests cover workflow YAML. Verification is (a) `actionlint`/YAML parse of the two renamed workflows, (b) confirm `deploy.yml` declares `workflow_dispatch` (it does), (c) post-merge empirical check via `gh run list --workflow deploy.yml` that a refresh commit is now followed by a `workflow_dispatch`-triggered deploy run, (d) a repo-wide grep proving no LIVE reference to the old filenames remains outside `fab/changes/archive/**` and dated changelog rows.

## Open Questions

- Exact "a commit happened" gating mechanism inside each refresh job (step-output flag vs. re-checking `git` state in the dispatch step). Plan decision — low blast radius.
- Whether to also rename the internal `concurrency: group:` values (recommended yes, for consistency). Plan decision.

## Clarifications

### Session 2026-06-13 (bulk confirm)

| # | Action | Detail |
|---|--------|--------|
| 3 | Confirmed | — |
| 4 | Confirmed | — |
| 5 | Confirmed | — |
| 6 | Confirmed | — |
| 8 | Confirmed | — |
| 9 | Confirmed | — |
| 10 | Confirmed | — |

### Session 2026-06-13 (questions)

| # | Question | Resolution |
|---|----------|------------|
| 11 | Should the rename also update the internal `concurrency: group:` values to match the new filenames? | Yes — rename groups to `refresh-help` / `refresh-readme` (part of the rename, not a plan-deferred option) |

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Package cascade-fix + rename + memory-correction as ONE change | User explicitly chose "One fab change, all three" via AskUserQuestion | S:100 R:80 A:95 D:100 |
| 2 | Certain | Category-prefix naming: deploy.yml→`Deploy`; →`refresh-help.yml`/`Refresh: Help`; →`refresh-readme.yml`/`Refresh: README` | User explicitly selected the category-prefix option with the exact file/name mapping shown in the preview | S:100 R:75 A:95 D:100 |
| 3 | Confident | Cascade fix = explicit `gh workflow run deploy.yml` (workflow_dispatch) after a successful commit, using the default GITHUB_TOKEN | Clarified — user confirmed | S:95 R:70 A:80 D:80 |
| 4 | Certain | The two refresh jobs need `actions: write` added (currently only `contents: write`) for the default token to dispatch workflow_dispatch | Clarified — user confirmed | S:95 R:85 A:85 D:90 |
| 5 | Certain | `gh` CLI in the dispatch step needs `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` in step env | Clarified — user confirmed | S:95 R:85 A:80 D:80 |
| 6 | Certain | Dispatch ONLY when a refresh actually committed (gate on commit-happened); preserve the existing no-op `exit 0` | Clarified — user confirmed | S:95 R:80 A:85 D:85 |
| 7 | Certain | Do NOT touch fab/changes/archive/** or other prior changes' artifacts; do NOT rewrite existing dated changelog rows — add new xs1j rows instead | User explicitly instructed this in the args; matches the project's immutable-history convention for archived changes and living-memory changelog discipline | S:100 R:75 A:90 D:95 |
| 8 | Certain | `docs/memory/conventions/index.md` is regenerated via `fab memory-index` (edit source `description:` frontmatter, not index.md directly) | Clarified — user confirmed | S:95 R:80 A:95 D:90 |
| 9 | Certain | Do NOT add a cron to deploy.yml and do NOT move the 07:13/07:41 refresh crons | Clarified — user confirmed | S:95 R:75 A:90 D:95 |
| 10 | Confident | Rename via `git mv`; accept the Actions-UI run-history reset as a known, acceptable cost | Clarified — user confirmed | S:95 R:70 A:85 D:85 |
| 11 | Confident | Rename the internal `concurrency: group:` values to match new filenames (`refresh-help`/`refresh-readme`) | Clarified — user confirmed (no longer a plan-deferred option; the rename includes the concurrency groups) | S:95 R:90 A:75 D:65 |

11 assumptions (7 certain, 4 confident, 0 tentative, 0 unresolved).
