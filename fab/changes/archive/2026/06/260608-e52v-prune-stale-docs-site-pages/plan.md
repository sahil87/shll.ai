# Plan: Prune stale docs/site pages (the pull must mirror, not accumulate)

**Change**: 260608-e52v-prune-stale-docs-site-pages
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

### docs/site mount: mirror the upstream tree

#### R1: The CLI clears `content/<slug>/site/` before writing the freshly-pulled pages
`scripts/extract-docs-site-cli.mjs` SHALL remove the existing `content/<slug>/site/` tree before writing
the pages collected from the fresh tarball, so the mount is a **mirror** of the upstream `docs/site/`
tree, not an accumulation. The clear SHALL use `node:fs/promises` `rm(outRoot, { recursive: true, force:
true })` (a missing dir is a no-op via `force`). The clear SHALL target ONLY `outRoot = join(repoRoot,
'content', slug, 'site')` — never the README slice (`content/<slug>/README.md`) and never any broader
path.

- **GIVEN** `content/idea/site/` already holds `old.md` and `install.md`, and the fresh pull contains only `install.md`
- **WHEN** the CLI mounts
- **THEN** `content/idea/site/old.md` no longer exists and `content/idea/site/install.md` is present (the mount mirrors upstream)
- **AND** `content/idea/README.md` (if present) is untouched

#### R2: A zero-page pull empties the mount (does not strand the prior tree)
When `collectMarkdown` returns zero `*.md` files, the CLI SHALL still clear `content/<slug>/site/` and
exit 0 — it MUST NOT early-exit while leaving the stale tree in place. This is safe because the workflow
invokes the CLI only on a SUCCESSFUL tarball fetch (a fetch failure `continue`s before the CLI call,
keeping last-good); so zero files means the repo genuinely has no `docs/site/` now and the correct mirror
is empty.

- **GIVEN** `content/<slug>/site/` holds pages from a prior pull and the fresh pull contains zero `*.md`
- **WHEN** the CLI runs
- **THEN** `content/<slug>/site/` is emptied (prior pages removed) and the CLI exits 0
- **AND** a first-ever pull (no `content/<slug>/site/` yet) with zero pages is a clean no-op (clear is a no-op via `force`, nothing written)

#### R3: Per-page lints and verbatim copy are unchanged
The report-only closure lint and reserved-slug lint SHALL still run per page, and each page SHALL still
be copied verbatim. Only the clear-before-write (R1/R2) is added.

- **GIVEN** a fresh pull with a page that has a closure violation
- **WHEN** the CLI mounts (after clearing)
- **THEN** the `::warning::` is still emitted and the page is still written (report-only posture intact)

### Cleanup + reconciliation

#### R4: The existing stray `content/fab-kit/site/README.md` is removed
The stranded page `content/fab-kit/site/README.md` (upstream source already deleted in fab-kit) SHALL be
deleted in this change so `main` is clean immediately. The legitimate
`content/fab-kit/site/{install,workflows}.md` and all other tools' pages SHALL remain.

- **GIVEN** `content/fab-kit/site/README.md` exists on the branch
- **WHEN** this change is applied
- **THEN** it is `git rm`'d, while `content/fab-kit/site/install.md` and `content/fab-kit/site/workflows.md` remain

#### R5: The workflow comment and memory are reconciled to the mirror behavior
The commit step's comment in `.github/workflows/scheduled-readme-refresh.yml` (claiming `-A` handles
upstream deletions) SHALL be corrected to note the CLI now mirrors (clears stale pages) so `-A` stages
the resulting deletions. `docs/memory/conventions/docs-site-tree.md` SHALL be updated (hydrate stage) to
state the mount mirrors the upstream tree.

- **GIVEN** the CLI now clears-before-write
- **WHEN** the workflow comment and memory are read
- **THEN** neither describes the mount as purely additive / "copies verbatim" without the mirror/clear semantics

### Non-Goals

- Not changing the README-slice step (single fixed overwritten path — never strands).
- Not touching the tool repos (fab-kit already removed its `docs/site/README.md`).
- Not adding a workflow `rm` step (mirror semantics live in the CLI).
- Not changing report-only lint posture or any rendering/route behavior.

### Design Decisions

1. **Clear-then-write (mirror) in the CLI** — *Why*: simplest correct realization of the mirror invariant; the tree is regenerated from canonical every run, so clearing loses nothing. *Rejected*: per-file diff/prune (more code, same result); a workflow `rm -rf` step (moves the anchor out of the testable CLI).
2. **Clear on zero-file pull too** — *Why*: the "tree went from N pages to 0" case is exactly the strand bug; the workflow's fetch-success guard makes clearing safe. *Rejected*: keep the early `exit(0)` on empty (leaves the additive bug for full-tree-removal).
3. **Reuse the existing `outRoot` for the clear** — *Why*: a too-wide `rm` is the one real hazard; binding the clear to the already-computed per-tool site path keeps the blast radius exact.

### Deprecated Requirements

#### Additive docs/site mount (mkdir+writeFile only, never removes)
**Reason**: stranded a ghost page on every upstream rename/delete (e.g. `fab-kit/site/README.md`).
**Migration**: clear-before-write mirror (R1/R2).

## Tasks

### Phase 1: CLI mirror fix

- [x] T001 In `scripts/extract-docs-site-cli.mjs`: import `rm` from `node:fs/promises`; before the write loop, clear the mount with `rm(outRoot, { recursive: true, force: true })` (compute `outRoot` before the empty-files check so both paths can clear) <!-- R1 -->
- [x] T002 Change the zero-files branch so it clears `content/<slug>/site/` and exits 0 instead of early-exiting while leaving the stale tree; keep the "nothing to mount" log <!-- R2 -->
- [x] T003 Confirm the write loop, closure lint, reserved-slug lint, and verbatim copy are otherwise unchanged (clear is purely additive to the front of the flow) <!-- R3 -->
- [x] T004 Remove the now-unused `stat` import if it is unused after the edit (tidy; only if confirmed unused) <!-- R3 -->

### Phase 2: Cleanup + reconciliation

- [x] T005 `git rm content/fab-kit/site/README.md` (leave install.md + workflows.md) <!-- R4 -->
- [x] T006 Correct the commit-step comment in `.github/workflows/scheduled-readme-refresh.yml` to describe the mirror/clear behavior <!-- R5 -->

### Phase 3: Test

- [x] T007 Add a focused CLI filesystem test: in a temp repo-root layout, pre-seed `content/<slug>/site/old.md` + a source tarball-dir with only `install.md`, run the mount logic, assert `old.md` is gone and `install.md` present; and a zero-source case empties the mount. (If wiring the CLI's repo-root ascent into a temp dir is high-friction, fall back to extracting the clear+collect into a testable pure-ish helper, or verify out-of-band per the existing no-CLI-test precedent — decide while implementing.) <!-- R1 R2 -->
- [x] T008 Run `node --test scripts/extract-readme.test.mjs` (and the new test) — all pass <!-- R1 R2 R3 -->

### Phase 4: Verify

- [x] T009 Local CLI smoke: run `node scripts/extract-docs-site-cli.mjs fab-kit <a-temp-docs-site-with-only-install-workflows>` against a scratch copy and confirm a pre-seeded stale `README.md` is pruned (out-of-band confirmation of the real path) <!-- R1 -->
- [x] T010 `astro build` succeeds and no page is emitted at `/tools/fab-kit/README` after the stray is removed <!-- R4 -->

## Execution Order

- T001 precedes T002 (both edit the same flow; clear-before-loop first, then the empty-branch behavior).
- T005/T006 independent of the CLI edit.
- T007/T008 after Phase 1; T009/T010 last.

## Acceptance

### Functional Completeness

- [x] A-001 R1: the CLI clears `content/<slug>/site/` (via `rm` recursive+force on `outRoot`) before writing fresh pages; the mount mirrors upstream
- [x] A-002 R2: a zero-page pull empties `content/<slug>/site/` and exits 0 (no early-exit leaving a stale tree); a first-ever pull is a clean no-op
- [x] A-003 R3: closure + reserved-slug lints and verbatim copy are unchanged; clear is the only added behavior
- [x] A-004 R4: `content/fab-kit/site/README.md` is removed; `install.md` + `workflows.md` remain
- [x] A-005 R5: the workflow commit-step comment + (hydrate) the docs-site-tree memory describe the mirror/clear behavior, not purely-additive

### Behavioral Correctness

- [x] A-006 R1: a previously-mounted page absent from the fresh pull is removed from `content/<slug>/site/` (the strand bug is fixed)
- [x] A-007 R4: after removing the stray, `astro build` emits no `/tools/fab-kit/README` page

### Removal Verification

- [x] A-008 R4: no stray `content/<slug>/site/` page remains whose upstream source is gone (verified for fab-kit/README.md; others were legitimate)

### Scenario Coverage

- [x] A-009 R1/R2: a test (or documented out-of-band run) exercises both the "stale page pruned" and "zero-page empties mount" scenarios
- [x] A-010 R1/R2/R3: `node --test scripts/extract-readme.test.mjs` (+ any new test) passes

### Edge Cases & Error Handling

- [x] A-011 R2: clear-on-empty is gated by the workflow's fetch-success guard (CLI not invoked on fetch failure) — a fetch failure still keeps last-good (unchanged)
- [x] A-012 R1: the clear targets ONLY `content/<slug>/site/`; `content/<slug>/README.md` and other paths are never touched

### Code Quality

- [x] A-013 Pattern consistency: the clear uses `node:fs/promises` (already imported), follows the CLI's existing style; no new dependency
- [x] A-014 No magic paths: the clear reuses the existing `outRoot` constant, not a re-derived path string
- [x] A-015 Test integrity: any new test asserts the real filesystem mirror behavior, not a reshaped-to-pass fixture

## Notes

- Run unit tests with `node --test scripts/extract-readme.test.mjs`.
- The CLI's repo-root is `resolvePath(scriptDir, '..', '..', '..')`; the mirror test runs the real CLI as a subprocess against a throwaway slug under that root, cleaned by `t.after` (+ `.gitignore` belt-and-suspenders).

## Deletion Candidates

- `content/fab-kit/site/README.md` — the stranded ghost this change removes (T005); upstream source already deleted in fab-kit. No other dead code (the fix is additive-to-front of the mount flow).

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Clear via `rm(outRoot, {recursive:true, force:true})` before the write loop | Standard `node:fs/promises` idiom; `force` makes first-ever-pull a no-op; reuses `outRoot` (blast radius exact) | S:92 R:75 A:92 D:90 |
| 2 | Certain | Compute `outRoot` and clear BEFORE the zero-files check so the empty case also clears | The zero-files-strand is the exact bug; the clear must run on that path too | S:90 R:75 A:90 D:90 |
| 3 | Tentative | Add a temp-dir CLI filesystem test; fall back to a small extracted helper or out-of-band if the repo-root ascent makes a direct CLI test high-friction | The CLI has no unit test today, but this fix IS a filesystem effect so a test earns its keep; the ascent (`resolvePath(scriptDir,'..','..','..')`) may resist a temp harness — decide while implementing | <!-- assumed: temp-dir CLI test preferred; helper-extraction or out-of-band fallback if harness-heavy --> S:58 R:68 A:64 D:55 |
| 4 | Confident | Delete the stray in this change (T005) rather than rely on the fixed cron | Makes `main` clean now + demonstrates intent; source already gone upstream so zero regression risk | S:82 R:80 A:85 D:82 |

4 assumptions (2 certain, 1 confident, 1 tentative).
