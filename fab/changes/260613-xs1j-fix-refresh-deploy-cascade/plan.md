# Plan: Fix Refresh→Deploy Cascade, Standardize Workflow Names, Correct Memory

**Change**: 260613-xs1j-fix-refresh-deploy-cascade
**Intake**: `intake.md`

## Requirements

### CI: Refresh→Deploy Cascade

#### R1: Help-refresh dispatches a deploy after a real commit
The `refresh-help.yml` workflow (renamed from `scheduled-help-refresh.yml`) SHALL explicitly dispatch `deploy.yml` via `workflow_dispatch` after — and ONLY after — its commit step pushes a real change to `main`. The dispatch MUST NOT fire on a no-op refresh (no staged diff). The job's `permissions:` block MUST gain `actions: write` (in addition to the existing `contents: write`), and the dispatch step MUST set `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` in its step env. No new secret is introduced.

- **GIVEN** a scheduled help refresh run where at least one `help/*.json` capture changed
- **WHEN** the "Commit refreshed help files" step commits and pushes to `main`
- **THEN** a follow-on "Trigger deploy" step runs `gh workflow run deploy.yml --ref main`
- **AND** when no help changed (the existing `git diff --cached --quiet` no-op path, which keeps its `exit 0`), the "Trigger deploy" step is skipped — no deploy is dispatched.

#### R2: README-refresh dispatches a deploy after a real commit
The `refresh-readme.yml` workflow (renamed from `scheduled-readme-refresh.yml`) SHALL receive the identical cascade-fix treatment as R1, applied after its "Commit refreshed content slices" step: `actions: write` added to `permissions:`, a commit-happened gate, a "Trigger deploy" step with `GH_TOKEN` in step env running `gh workflow run deploy.yml --ref main`. Two independent dispatches (one per refresh job) are acceptable — `deploy.yml`'s existing `concurrency: group: pages, cancel-in-progress: false` serializes them; no deduplication is added.

- **GIVEN** a scheduled README refresh run where some slice's content changed
- **WHEN** the "Commit refreshed content slices" step commits and pushes to `main`
- **THEN** a follow-on "Trigger deploy" step runs `gh workflow run deploy.yml --ref main`
- **AND** when nothing changed (the existing no-op `exit 0` path), no deploy is dispatched.

### CI: Workflow Naming Normalization

#### R3: Rename + name + concurrency-group + comment normalization (category-prefix convention)
The three workflows SHALL adopt the category-prefix convention:
- `scheduled-help-refresh.yml` → `refresh-help.yml` (via `git mv`); top-level `name:` `Scheduled help refresh` → `'Refresh: Help'`; `concurrency: group:` `scheduled-help-refresh` → `refresh-help`.
- `scheduled-readme-refresh.yml` → `refresh-readme.yml` (via `git mv`); top-level `name:` `Scheduled README refresh` → `'Refresh: README'`; `concurrency: group:` `scheduled-readme-refresh` → `refresh-readme`.
- `deploy.yml` — top-level `name:` `Deploy to GitHub Pages` → `Deploy` (file NOT renamed; the inner deploy step's `name:` is left untouched). No trigger change — `workflow_dispatch` already declared.
- Both refresh workflows' header comments that cross-reference each other by the OLD filenames SHALL be updated to the new names. The historical `help-automerge.yml` retired-model note is preserved (that file is already deleted; not renamed).

- **GIVEN** the three workflow files
- **WHEN** the rename + name + concurrency-group + comment edits are applied
- **THEN** `.github/workflows/refresh-help.yml` and `.github/workflows/refresh-readme.yml` exist with the new `name:` and `concurrency: group:` values, `scheduled-*-refresh.yml` no longer exist, and `deploy.yml`'s top-level `name:` is `Deploy`
- **AND** no live cross-reference comment inside either refresh workflow names the old filenames.

### Docs: Spec Live-Reference Migration

#### R4: Live workflow references in specs migrated; dated changelog rows untouched
The current-state prose in the two contract specs that names the old workflow filename SHALL be migrated to the new name; DATED changelog rows SHALL be left as historical record.
- `docs/specs/help-dump-contract.md` (~lines 141, 166): `scheduled-help-refresh.yml` → `refresh-help.yml` (current-state prose / live path references).
- `docs/specs/readme-extraction-contract.md` (~line 280): `scheduled-help-refresh.yml` → `refresh-help.yml` (current-state prose + the live workflow-file link). Line ~821 is a DATED changelog row — leave as-is.

- **GIVEN** the two contract spec files
- **WHEN** the current-state prose references are migrated
- **THEN** no current-state prose in either spec names `scheduled-help-refresh.yml` or `scheduled-readme-refresh.yml`
- **AND** the dated changelog row at `readme-extraction-contract.md` ~line 821 still names `scheduled-help-refresh.yml` verbatim.

### Docs/Code: Memory Live-Reference Migration + False-Claim Correction

#### R5: Memory + github-stars.ts references migrated, false daily-deploy claim corrected, new xs1j changelog rows added
Every LIVE reference to the old workflow filenames in living memory and the `github-stars.ts` comment SHALL be migrated to the new names, the false "reliable daily deploy driver" claim SHALL be corrected, and a NEW dated `xs1j` changelog row SHALL be added to each modified memory file (existing dated rows untouched).
- `docs/memory/conventions/readme-extraction.md` — `description:` frontmatter + body heading (`## The scheduled-readme-refresh.yml pull job`) + body prose (`scheduled-readme-refresh.yml`, sibling `scheduled-help-refresh.yml`); add an xs1j changelog row.
- `docs/memory/conventions/help-collection.md` — body prose (`scheduled-help-refresh.yml`, sibling `scheduled-readme-refresh.yml`); add an xs1j changelog row. (No old-name reference in its `description:` frontmatter — confirmed by grep.)
- `docs/memory/conventions/docs-site-tree.md` — `description:` frontmatter + body (`scheduled-readme-refresh.yml`); add an xs1j changelog row.
- `docs/memory/build-deploy/deployment.md` — current-state prose, the workflow-table rows (both filenames), the freshness-model section, AND the false "reliable daily deploy driver" claim corrected to the true mechanism (before: cascade broken, help committed daily but did NOT deploy, only human merges deployed; after: the explicit `workflow_dispatch` step in each refresh job drives the deploy when — and only when — that refresh commits; the help refresh's `captured_at` churn is the reliable daily COMMIT driver and now, via the dispatch, the reliable daily DEPLOY driver too); add an xs1j changelog row. The `description:` frontmatter (which states "the reliable daily driver") is corrected to reflect the dispatch mechanism.
- `sites/astro-starlight-terminal1/src/lib/github-stars.ts` (~lines 9-10) — comment: migrate both workflow names AND correct the false daily-deploy claim to match the corrected deployment.md framing.

- **GIVEN** the five living memory/code files
- **WHEN** the migrations + corrections + xs1j rows are applied
- **THEN** no current-state prose, frontmatter, heading, or comment in any of them names `scheduled-help-refresh.yml`/`scheduled-readme-refresh.yml`, the false standalone "daily deploy happens for free" framing is replaced by the dispatch-driven mechanism, and each file carries exactly one new xs1j changelog row
- **AND** every pre-existing dated changelog row in each file is unchanged.

### Docs: Generated Index Regeneration

#### R6: conventions/index.md regenerated from edited frontmatter, not hand-edited
`docs/memory/conventions/index.md` SHALL be regenerated via `fab memory-index` after the `description:` frontmatter edits in R5 (readme-extraction.md, docs-site-tree.md), never hand-edited. The regenerated rows MUST reflect the new workflow names.

- **GIVEN** the edited `description:` frontmatter in readme-extraction.md and docs-site-tree.md
- **WHEN** `fab memory-index` is run
- **THEN** `docs/memory/conventions/index.md` is regenerated and its docs-site-tree / readme-extraction description rows name `refresh-readme.yml` (not `scheduled-readme-refresh.yml`)
- **AND** the file was not hand-edited (its generated-by header is intact).

### Non-Goals

- NOT adding a schedule/cron to `deploy.yml`.
- NOT changing the two refresh crons (07:13 / 07:41 — the offset is load-bearing).
- NOT touching `fab/changes/archive/**` or any other prior change's `intake.md`/`plan.md`/`spec.md` (immutable history — includes `fab/changes/260611-d9qb-author-links-star-counts/intake.md`, which names the old workflow correctly for its date).
- NOT rewriting existing dated changelog rows in living memory/spec files.
- NOT introducing any new secret (`SHLLAI_TOKEN`/PAT).

### Design Decisions

1. **Cascade fix via `workflow_dispatch`, not a PAT push**: each refresh job dispatches `deploy.yml` after a real commit using the default `GITHUB_TOKEN` (exempt from the recursion guard) — *Why*: zero new secrets, minimal blast radius, fires a deploy only when content actually changed — *Rejected*: pushing with a `SHLLAI_TOKEN` PAT (reintroduces the secret `oa63` removed); a cron on `deploy.yml` (byte-identical timer deploys; user-rejected).
2. **Commit-happened gate via a step `id` + `$GITHUB_OUTPUT` flag**: the commit step sets `committed=true` on its real-commit path; the Trigger-deploy step gates on `if: steps.<id>.outputs.committed == 'true'` — *Why*: the existing step already branches on `git diff --cached --quiet` with a bare `exit 0`; emitting an output on the commit path is the lowest-churn, in-step signal that preserves the no-op `exit 0` exactly — *Rejected*: re-checking `git` state in the dispatch step (duplicates the diff logic, race-prone); always-dispatch (wastes a deploy run on every no-op refresh, violates R1/R2).

## Tasks

### Phase 1: Workflow renames (file moves first, so later edits land on the new paths)

- [x] T001 `git mv .github/workflows/scheduled-help-refresh.yml .github/workflows/refresh-help.yml` <!-- R3 -->
- [x] T002 `git mv .github/workflows/scheduled-readme-refresh.yml .github/workflows/refresh-readme.yml` <!-- R3 -->

### Phase 2: Workflow content edits

- [x] T003 In `.github/workflows/refresh-help.yml`: change top-level `name:` to `'Refresh: Help'`; change `concurrency: group:` to `refresh-help`; add `actions: write` to the job-level (or top-level) `permissions:` block alongside `contents: write` <!-- R1 --> <!-- R3 -->
- [x] T004 In `.github/workflows/refresh-help.yml`: give the "Commit refreshed help files" step an `id` (e.g. `commit`) and have its real-commit path emit `committed=true` to `$GITHUB_OUTPUT` (keep the no-op `exit 0` path unchanged); add a follow-on "Trigger deploy" step gated `if: steps.commit.outputs.committed == 'true'` with `env: GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` running `gh workflow run deploy.yml --ref main` <!-- R1 -->
- [x] T005 In `.github/workflows/refresh-readme.yml`: change top-level `name:` to `'Refresh: README'`; change `concurrency: group:` to `refresh-readme`; add `actions: write` to the `permissions:` block alongside `contents: write` <!-- R2 --> <!-- R3 -->
- [x] T006 In `.github/workflows/refresh-readme.yml`: give the "Commit refreshed content slices" step an `id` (e.g. `commit`) and have its real-commit path emit `committed=true` to `$GITHUB_OUTPUT` (keep the no-op `exit 0` path unchanged); add a follow-on "Trigger deploy" step gated `if: steps.commit.outputs.committed == 'true'` with `env: GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` running `gh workflow run deploy.yml --ref main` <!-- R2 -->
- [x] T007 In `.github/workflows/refresh-readme.yml`: update the header-comment cross-references that name `scheduled-help-refresh.yml` (lines ~5, ~14, ~42, ~76) to `refresh-help.yml`; keep the `help-automerge.yml` retired-model note <!-- R3 -->
- [x] T008 In `.github/workflows/deploy.yml`: change top-level `name: Deploy to GitHub Pages` → `name: Deploy` (leave the inner deploy step `name:` and all triggers/permissions untouched) <!-- R3 -->

### Phase 3: Spec + memory + code live-reference migration and memory correction

- [x] T009 [P] In `docs/specs/help-dump-contract.md`: migrate `scheduled-help-refresh.yml` → `refresh-help.yml` in current-state prose at ~lines 141, 166; do NOT touch the changelog table <!-- R4 -->
- [x] T010 [P] In `docs/specs/readme-extraction-contract.md`: migrate `scheduled-help-refresh.yml` → `refresh-help.yml` in current-state prose + the live workflow-file link at ~line 280; leave the dated changelog row at ~line 821 verbatim <!-- R4 -->
- [x] T011 [P] In `docs/memory/conventions/help-collection.md`: migrate `scheduled-help-refresh.yml` → `refresh-help.yml` and sibling `scheduled-readme-refresh.yml` → `refresh-readme.yml` in body prose (lines ~14, ~100); add a new xs1j changelog row; leave existing dated rows <!-- R5 -->
- [x] T012 [P] In `docs/memory/conventions/readme-extraction.md`: migrate `scheduled-readme-refresh.yml` → `refresh-readme.yml` and sibling `scheduled-help-refresh.yml` → `refresh-help.yml` in `description:` frontmatter, the `## The scheduled-readme-refresh.yml pull job` heading, and body prose (lines ~73, ~127, ~139); add a new xs1j changelog row; leave existing dated rows <!-- R5 -->
- [x] T013 [P] In `docs/memory/conventions/docs-site-tree.md`: migrate `scheduled-readme-refresh.yml` → `refresh-readme.yml` in `description:` frontmatter and body (lines ~2, ~74, ~76, ~108); add a new xs1j changelog row; leave existing dated rows <!-- R5 -->
- [x] T014 In `docs/memory/build-deploy/deployment.md`: migrate both filenames in the workflow table (~lines 57-58), the README-refresh section (~line 74), the freshness-model section (~lines 82, 84), and step 1 (~line 66); CORRECT the false "reliable daily deploy driver" claim to the dispatch-driven mechanism (before/after framing per R5); correct the `description:` frontmatter's daily-driver phrasing; add a new xs1j changelog row; leave existing dated rows <!-- R5 -->
- [x] T015 [P] In `sites/astro-starlight-terminal1/src/lib/github-stars.ts`: migrate `scheduled-help-refresh.yml`/`scheduled-readme-refresh.yml` → `refresh-help.yml`/`refresh-readme.yml` in the comment (~lines 9-10) AND correct the false daily-deploy claim to match the corrected deployment.md framing (the refresh's dispatch now drives the deploy) <!-- R5 -->

### Phase 4: Index regeneration + verification

- [x] T016 Run `fab memory-index` to regenerate `docs/memory/conventions/index.md` from the edited frontmatter; verify its docs-site-tree / readme-extraction rows name the new workflow filenames <!-- R6 -->
- [x] T017 Validate the two renamed workflows are syntactically valid YAML (actionlint if available, else `yq` / YAML parse); confirm `deploy.yml` still declares `workflow_dispatch`; run a repo-wide grep proving no LIVE old-name reference remains outside `fab/changes/**` and dated changelog rows <!-- R1 --> <!-- R2 --> <!-- R3 --> <!-- R4 --> <!-- R5 -->

## Execution Order

- T001, T002 (renames) MUST precede T003-T008 (content edits land on the new paths).
- T003/T004 (refresh-help) and T005/T006/T007 (refresh-readme) and T008 (deploy) are independent of each other once the files are renamed.
- T009-T015 are mutually independent ([P]); T014 is not [P] only because it carries the largest semantic correction (kept sequential for care).
- T016 (index regen) MUST follow T012 + T013 (frontmatter edits).
- T017 (verification) runs last.

## Acceptance

### Functional Completeness

- [x] A-001 R1: `refresh-help.yml` has `actions: write` in `permissions:`, a commit-happened gate, and a `Trigger deploy` step running `gh workflow run deploy.yml --ref main` with `GH_TOKEN` in step env. — VERIFIED: permissions block `contents: write` + `actions: write` (lines 52-54); commit step `id: commit` emits `committed=true` only on the real-commit path (line 254); Trigger deploy step gated `if: steps.commit.outputs.committed == 'true'` with `env: GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` (lines 262-266).
- [x] A-002 R2: `refresh-readme.yml` has the identical cascade-fix set (`actions: write`, commit gate, `Trigger deploy` step with `GH_TOKEN`). — VERIFIED: identical treatment (permissions lines 58-60; commit `id: commit` + `committed=true` at line 310; Trigger deploy lines 318-322). R1 ≡ R2.
- [x] A-003 R3: `refresh-help.yml` / `refresh-readme.yml` exist with new `name:` (`'Refresh: Help'` / `'Refresh: README'`) and `concurrency: group:` (`refresh-help` / `refresh-readme`); `scheduled-*-refresh.yml` are gone; `deploy.yml` top-level `name:` is `Deploy`. — VERIFIED via yq: names + groups correct; `git diff --name-status -M` shows both as renames (R085); deploy.yml name `Deploy`.
- [x] A-004 R4: No current-state prose in `help-dump-contract.md` or `readme-extraction-contract.md` names the old filenames; the ~line 821 dated changelog row is unchanged. — VERIFIED: help-dump-contract.md lines 141/166 migrated to `refresh-help.yml`; readme-extraction-contract.md line 280 migrated; line 821 (2026-06-04 w32m dated changelog row) untouched, still names `scheduled-help-refresh.yml`.
- [x] A-005 R5: No live frontmatter/heading/prose/comment in the four memory files + `github-stars.ts` names the old filenames; the false daily-deploy claim is corrected; each memory file has exactly one new xs1j changelog row. — VERIFIED: deployment.md, help-collection.md, readme-extraction.md, docs-site-tree.md + github-stars.ts all migrated; false "reliable daily deploy driver" claim corrected with before/after framing; each of the 4 memory files has exactly one new 2026-06-13 xs1j row; pre-existing dated rows unchanged.
- [x] A-006 R6: `conventions/index.md` was regenerated via `fab memory-index` (not hand-edited) and its rows name the new filenames. — VERIFIED: generated-by banner intact; rows for docs-site-tree (`refresh-readme.yml`) and readme-extraction (`refresh-readme.yml`) match the edited source frontmatter byte-for-byte; build-deploy/index.md row likewise matches deployment.md's corrected frontmatter. Consistent with regeneration, not hand-edit.

### Behavioral Correctness

- [x] A-007 R1: The help-refresh `Trigger deploy` step is skipped on a no-op refresh (its `if:` gate is false when `git diff --cached --quiet`); the commit step's no-op `exit 0` is preserved. — VERIFIED: no-op path `echo "No help changes to commit." / exit 0` (lines 247-250) does NOT set `committed`; `committed=true` is on the real-commit path only (after `git commit && git push`, line 254). Gate is false on no-op.
- [x] A-008 R2: The README-refresh `Trigger deploy` step is skipped on a no-op refresh; the commit step's no-op `exit 0` is preserved; two independent dispatches are accepted (no dedup added). — VERIFIED: no-op `exit 0` at lines 303-306 (committed unset); `committed=true` only after push (line 310). No dedup logic added; deployment.md documents the two-dispatch / `concurrency: group: pages` serialization.
- [x] A-009 R5: The corrected memory states the true before/after mechanism — before: cascade broken (committed daily, did NOT deploy, only human merges deployed); after: the dispatch drives the daily deploy when (and only when) a refresh commits. — VERIFIED: deployment.md §Daily-deploy freshness model explicit "Before `xs1j` (the bug)" / "After `xs1j` (the fix)" stanzas; github-stars.ts comment matches.

### Scenario Coverage

- [x] A-010 R3: `deploy.yml` still declares `workflow_dispatch` (trigger unchanged) and the inner deploy step's `name:` is untouched. — VERIFIED via yq: `.on` keys are `push` + `workflow_dispatch`; diff vs main shows ONLY the top-level `name:` line changed; inner `Deploy to GitHub Pages` step name (line 69) untouched.
- [x] A-011 R1 R2: Both renamed workflows parse as valid YAML (validation method reported). — VERIFIED: `yq -e '.' <file>` returns valid for refresh-help.yml, refresh-readme.yml, deploy.yml. (actionlint + python-yaml absent in env per plan assumption #6; yq is the reported method.)

### Edge Cases & Error Handling

- [x] A-012 R4 R5: A repo-wide grep for `scheduled-help-refresh` / `scheduled-readme-refresh` returns no LIVE hits outside `fab/changes/**` and dated changelog rows; every remaining hit is justified (archive, another change's intake, or a dated changelog row). <!-- VERIFIED (rework, cycle 1): fixed the missed live hit at content/.gitkeep:3 (scheduled-readme-refresh.yml → refresh-readme.yml, comment-only) and re-verified with an UNFILTERED `git grep -n` across ALL tracked files (covers extensionless files the original --include apply grep skipped). Remaining hits split cleanly into two justified buckets: (a) DATED changelog rows in living files — deployment.md:112/115/117, docs-site-tree.md:137/138, help-collection.md:129/132/134, readme-extraction.md:156/157, readme-extraction-contract.md:821 (all `| 2026-... |` rows, including this change's own new xs1j rows); (b) fab/changes/** artifacts — d9qb's intake plus archived oa63/4s3e/w32m/x0br/e52v/ng8c intake/plan/spec (immutable history per Non-Goals). An inverse filter (`grep -vP '\| 20[0-9]{2}-'` over non-fab/changes hits) returns ZERO live-prose matches. content/.gitkeep now reads `refresh-readme.yml`. -->

### Code Quality

- [x] A-013 Pattern consistency: The new `Trigger deploy` steps and commit-output flags follow the existing workflows' step style (`set -euo pipefail`, `$GITHUB_OUTPUT`/`$GITHUB_PATH` heredoc conventions, comment density). — VERIFIED: commit step retains `set -euo pipefail`; `echo "committed=true" >> "$GITHUB_OUTPUT"` matches the existing `>> "$GITHUB_PATH"`/`>> "$GITHUB_ENV"` quoting convention in the "Set up Homebrew" step; comment density matches the file's house style.
- [x] A-014 No unnecessary duplication: The commit-happened gate reuses the existing commit step's branch (a step output) rather than re-implementing the `git diff --cached` check in a second step. — VERIFIED: the `Trigger deploy` step consumes `steps.commit.outputs.committed`; the `git diff --cached --quiet` check exists in exactly one place (the commit step). No duplicated diff logic.
- [x] A-015 No magic strings: The cascade-fix wiring uses GitHub's documented step-output / `if:` expression idioms; no fabricated tokens; the no-op `exit 0` semantics are preserved. — VERIFIED: `committed`/`steps.commit.outputs.committed` are standard GitHub step-output idioms; `secrets.GITHUB_TOKEN` is the automatic token (no fabricated/new secret); no-op `exit 0` preserved in both files.

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- Empirical post-merge verification (a refresh commit followed by a `workflow_dispatch`-triggered deploy run, via `gh run list --workflow deploy.yml`) is OUT of this change's local scope — it can only be observed after merge to `main`.

## Deletion Candidates

- None — this change adds new functionality (the cascade-fix dispatch wiring) and migrates references in place; it makes no existing code redundant or unused. The two old workflow files were `git mv`-renamed (not orphaned), the old `concurrency:` group names were renamed (no group left dangling), and the old workflow-name strings were replaced. No symbol, file, or code path is left without call sites as a result of this change. (The `help-automerge.yml` retired-model note in `refresh-help.yml:6` references an already-deleted file by design — a historical note, not a deletion candidate.)

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Confident | Commit-happened gate = step `id` + `committed=true` to `$GITHUB_OUTPUT` on the commit path, consumed via `if: steps.commit.outputs.committed == 'true'` | Intake names this exact candidate; it is the lowest-churn signal that preserves the existing no-op `exit 0`; the alternative (re-checking git state) duplicates logic. Intake assumption #6 (Certain) confirmed gating on commit-happened | S:90 R:80 A:85 D:80 |
| 2 | Certain | `actions: write` is added to the job's existing `permissions:` block (top-level in these single-job workflows), alongside `contents: write` | Intake assumption #4 (Certain, user-confirmed); the workflows declare `permissions:` at top level today | S:95 R:85 A:90 D:90 |
| 3 | Confident | help-dump-contract.md lines 141/166 ARE current-state prose to migrate (not dated changelog rows), despite line 141 being in a "dated section" | Intake R4 explicitly lists lines 141 + 166 to update; the §Pull-model section names the live workflow file path (a live cross-reference), distinct from the changelog TABLE rows the intake says to leave | S:90 R:75 A:80 D:75 |
| 4 | Confident | The `description:` frontmatter of deployment.md is corrected (it asserts the daily-driver claim) in addition to the body | Frontmatter literally says "the reliable daily driver"; R5 targets the false-claim locus; leaving frontmatter stale would re-propagate the claim via the (non-conventions) generated index for build-deploy | S:85 R:80 A:80 D:80 |
| 5 | Certain | `fab/changes/260611-d9qb-author-links-star-counts/intake.md` (a prior change's intake naming the old workflow) is left untouched | Intake Non-goals + assumption #7 (Certain): do not touch other changes' artifacts; it is a correct historical record for its date — a justified remaining grep hit | S:95 R:80 A:90 D:95 |
| 6 | Confident | YAML validity is verified with `yq` (actionlint + python-yaml are absent in this env) | Verification section permits "YAML parse check" when actionlint is unavailable; `command -v actionlint` → missing, `python3 -c 'import yaml'` → ModuleNotFoundError, `yq` present | S:90 R:90 A:85 D:80 |

6 assumptions (2 certain, 4 confident, 0 tentative).
