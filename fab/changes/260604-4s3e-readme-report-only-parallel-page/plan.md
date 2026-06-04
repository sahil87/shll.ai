# Plan: README Gate → Report-Only + Parallel Readme Page

**Change**: 260604-4s3e-readme-report-only-parallel-page
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

> Revises behavior shipped in change `w32m` (PR #33). The README-extraction
> contract, pipeline, render component, and `findUnknownTokens` detector already
> exist; this change flips the gate from blocking to report-only, moves the slice
> render from `overview.mdx` injection to a parallel per-tool `readme` page, thins
> the overviews, and reframes the contract + constitution. Memory updates are
> planned for hydrate (NOT executed at apply).

### Gate: Report-Only Behavior

#### R1: CLI flips the divergence gate from blocking to report-only
The CLI `extract-readme-cli.mjs` SHALL, on a non-empty `findUnknownTokens` result,
write the slice, emit a non-fatal `::warning::`/stderr notice, and **exit 0** — it
SHALL NOT exit 1 on divergence. The `findUnknownTokens` detector and its detection
logic remain unchanged; only the consequence of a non-empty result changes.

- **GIVEN** a fetched README whose slice references a command/flag absent from `help/<slug>.json`
- **WHEN** `node scripts/extract-readme-cli.mjs <slug> <raw> --out <path>` runs
- **THEN** the slice is written to `<path>`, a `::warning::` listing the unknown tokens is printed, and the process exits 0

#### R2: A genuinely unreadable/missing INPUT README remains an error
The CLI SHALL still treat a missing or unreadable raw input README as an error
(non-zero exit) — there is nothing to render, so report-only does not apply.

- **GIVEN** a `<raw-readme-path>` that cannot be read
- **WHEN** the CLI runs
- **THEN** the CLI exits non-zero and writes no slice (nothing to render)

#### R3: Missing `help/<slug>.json` → unverified warning, still write, exit 0
The CLI SHALL, when `help/<slug>.json` is missing or unreadable, emit a "cannot
verify — unverified" `::warning::`, still write the slice (canonical wins), and
exit 0 — it SHALL NOT refuse to commit unverified prose.

- **GIVEN** a slug with no `help/<slug>.json` (e.g. `tu`)
- **WHEN** the CLI runs against a readable raw README
- **THEN** the slice is written, an "unverified" warning is printed, and the process exits 0

#### R4: Scheduled workflow always commits; warns, never skips on divergence
`.github/workflows/scheduled-readme-refresh.yml` SHALL always extract and commit a
tool's slice on divergence (emitting a `::warning::`), NOT add it to `failed=()`
and keep last-good. Per-tool **fetch-failure** isolation is KEPT: a README that
genuinely cannot be fetched still keeps last-good (a real failure, not divergence).
The `tu` case (no `help/tu.json`) SHALL still commit its README with an
"unverified" warning.

- **GIVEN** the daily refresh run pulling a tool whose README diverges from its help dump
- **WHEN** the extract step runs for that tool
- **THEN** the slice is staged/committed and a `::warning::` is emitted — the tool is NOT added to `failed`
- **AND** GIVEN a tool whose README fetch fails (no network/404 on all branches), THEN that tool keeps its last-good slice and is logged as a fetch failure

#### R5: Tests follow the revised report-only spec
`scripts/extract-readme.test.mjs` SHALL keep all `findUnknownTokens` detection
cases (true-positive + M2 positional-arg cases) unchanged. The detector is exercised
directly (returns token lists), so no test asserts CLI exit codes today; the test
file's header/doc comment SHALL be updated to describe the detector as a report-only
reporter rather than a blocking gate. New CLI-level report-only behavior is verified
out-of-band (manual divergence→exit-0 check) since the CLI has no existing unit test.

- **GIVEN** the updated test file
- **WHEN** `node --test scripts/extract-readme.test.mjs` runs
- **THEN** every test passes and no test asserts blocking/exit-1 as the divergence consequence

### Render: Parallel Readme Page

#### R6: A per-tool `readme.mdx` page renders the canonical slice for all 7 tools
For each of the 7 tools (idea, hop, fab-kit, wt, run-kit, tu, shll), a
`src/content/docs/tools/<tool>/readme.mdx` SHALL exist with frontmatter
`title: Readme` + a `description`, importing `ReadmeSlice.astro` and rendering
`<ReadmeSlice tool="<slug>" />`. Slug `/tools/<tool>/readme`.

- **GIVEN** the built site
- **WHEN** a visitor opens `/tools/<tool>/readme/`
- **THEN** the page renders the tool's `ReadmeSlice` (slice or neutral placeholder), with title "Readme"

#### R7: `ReadmeSlice` is removed from all 7 `overview.mdx`
The `ReadmeSlice` import and `<ReadmeSlice .../>` usage SHALL be removed from every
tool's `overview.mdx` (it was injected by `w32m`). `ReadmeSlice.astro` itself is
unchanged in behavior — only its placement moves.

- **GIVEN** any tool's `overview.mdx`
- **WHEN** inspected after this change
- **THEN** it contains no `ReadmeSlice` import or element

#### R8: Sidebar gains a parallel `Readme` entry per tool
`astro.config.mjs` SHALL add a `Readme` sidebar item (label "Readme",
slug `tools/<tool>/readme`) per tool, parallel to the existing `Commands` entry.
`qemq`'s `Reference` group / command-index SHALL NOT be touched.

- **GIVEN** the built sidebar
- **WHEN** a tool's group is expanded
- **THEN** a "Readme" item linking to `/tools/<tool>/readme` appears alongside Overview/Commands

### Content: Thin Overview

#### R9: Each `overview.mdx` is thinned to a directory entry
Each of the 7 `overview.mdx` SHALL shrink to a genuine directory entry: keep
`<GithubButton>`, a 1–2 sentence framing of the tool, and prominent nav links to
the readme / commands / (and where present, install / workflows) pages. Long-form
hand-written depth (e.g. fab-kit's 7-stage table, idea's distinguishing-properties
lists) SHALL be REMOVED from overview. Per intake assumption #11 that depth's
canonical home is the tool's README (a tool-repo follow-up, OUT of this repo's
scope) — within THIS repo the depth is REMOVED, NOT relocated onto the readme page.

- **GIVEN** any tool's thinned `overview.mdx`
- **WHEN** inspected
- **THEN** it contains GithubButton + a short framing + nav links, and no long-form depth section

### Reframe: Contract + Constitution

#### R10: README-extraction contract reframed to canonical-verbatim + report-only
`docs/specs/readme-extraction-contract.md` SHALL be reframed: §7 from "fail the
pull / keep last-good" to "README is canonical and rendered verbatim; help-dump
divergence is a non-fatal repo-level lint, never a publish gate"; §8 pull model to
"always commit, warn-not-skip" (keep fetch-failure isolation); §2/§7 Install
language from "sole install-accuracy guard" to "reporter, not guard". The
overview-injection render text SHALL be replaced with the parallel-readme-page +
thin-overview model. A changelog row SHALL be added.

- **GIVEN** the reframed contract
- **WHEN** read
- **THEN** §7/§8/§2 describe report-only + always-commit + a reporter (not a guard), the render model names the parallel readme page + thin overview, and a changelog row records change `4s3e`

#### R11: Constitution Tool-Page Depth reframed; version bumped to v2.1.1 (PATCH)
`fab/project/constitution.md` Tool-Page Depth constraint SHALL be reframed to the
canonical-verbatim + report-only model and the parallel-readme-page / thin-overview
wording. Version SHALL bump v2.1.0 → v2.1.1 (PATCH); a changelog entry SHALL be added.

- **GIVEN** the amended constitution
- **WHEN** read
- **THEN** Tool-Page Depth describes report-only divergence + parallel readme page + thin overview, Version reads `2.1.1`, and a `2.1.1` changelog entry records change `4s3e`

### Non-Goals

- False-positive tuning of the detector (Cobra `completion`/`help`, the `h ou<TAB>`
  completion-demo idiom, per-subcommand flag scoping) — explicitly deferred to a
  separate follow-up (intake assumption #7).
- Modifying `docs/memory/` — that is hydrate (a later stage). Memory tasks are
  enumerated below as hydrate-stage work, NOT executed at apply.
- Moving overview depth onto the readme page or into tool repos — the tool-repo
  prose-move is a follow-up out of this repo's scope (intake assumption #11).
- Touching `qemq`'s `CommandReference.astro` / `CommandIndex.astro` / `Reference`
  sidebar / `command-index.mdx` / `help/*.json` / `parse-help.ts`.
- Any `package.json` change (Constitution VI) — no new dependency.

### Design Decisions

1. **Report-not-block**: divergence → warn + write + exit 0 — *Why*: README is the
   canonical source; a blocking gate makes help-dump the de-facto authority and
   leaves 5/7 tools invisible — *Rejected*: keep blocking (status quo, contradicts
   canonical); remove the detector entirely (loses the useful drift signal).
2. **Parallel readme page over overview injection** — *Why*: separates site-authored
   framing (overview) from the tool's canonical words (readme), matches the existing
   multi-page model + `qemq`'s dedicated-commands-page precedent — *Rejected*: keep
   injecting into overview (double-pitch, unclear ownership).
3. **PATCH version bump (v2.1.1)** — *Why*: the deep-synced-content principle is
   unchanged; only gate behavior + page placement change (intake assumption #10).

### Deprecated Requirements

#### Blocking validation gate (w32m §7 "fail the pull / keep last-good")
**Reason**: contradicts "README is canonical" — a blocking gate makes help-dump the
de-facto authority and withholds the canonical README on divergence.
**Migration**: replaced by R1/R4 — the detector becomes a non-fatal reporter; the
slice is always written/committed with a `::warning::` on divergence.

#### Overview-injection render model (w32m assumption #11)
**Reason**: collides two authors (site framing + canonical slice) on one page.
**Migration**: replaced by R6/R7/R8/R9 — parallel `readme.mdx` page + thinned overview.

## Tasks

### Phase 1: Gate → Report-Only (CLI + workflow + tests)

- [x] T001 Flip `extract-readme-cli.mjs` divergence path to warn + write slice + exit 0; missing-help to "unverified" warn + write + exit 0; keep missing/unreadable INPUT README as an error. Update the file's behavior doc comment. File: `sites/astro-starlight-terminal1/scripts/extract-readme-cli.mjs` <!-- R1 R2 R3 -->
- [x] T002 Update `scheduled-readme-refresh.yml`: divergence always extracts + commits with a `::warning::` (not added to `failed`); keep per-tool fetch-failure isolation (keeps last-good); `tu`/missing-help still commits with "unverified" warning. Refresh the header/step comments to the report-only model. File: `.github/workflows/scheduled-readme-refresh.yml` <!-- R4 -->
- [x] T003 Update `extract-readme.test.mjs` doc/header comment to describe the detector as a report-only reporter (not a blocking gate); confirm all detection cases (true-positive + M2) stay; run the suite. File: `sites/astro-starlight-terminal1/scripts/extract-readme.test.mjs` <!-- R5 -->

### Phase 2: Parallel Readme Page (render + sidebar)

- [x] T004 [P] Create `readme.mdx` for all 7 tools (idea, hop, fab-kit, wt, run-kit, tu, shll): frontmatter `title: Readme` + description, import + render `<ReadmeSlice tool="<slug>" />`. Files: `sites/astro-starlight-terminal1/src/content/docs/tools/<tool>/readme.mdx` <!-- R6 -->
- [x] T005 Add a `Readme` sidebar item per tool (label "Readme", slug `tools/<tool>/readme`) parallel to `Commands`; do NOT touch the `Reference` group. File: `sites/astro-starlight-terminal1/astro.config.mjs` <!-- R8 -->

### Phase 3: Remove injection + Thin overviews

- [x] T006 Remove the `ReadmeSlice` import + `<ReadmeSlice .../>` element from all 7 `overview.mdx`. Files: `sites/astro-starlight-terminal1/src/content/docs/tools/<tool>/overview.mdx` <!-- R7 -->
- [x] T007 Thin all 7 `overview.mdx` to GithubButton + 1–2 sentence framing + nav links (readme/commands/[install]/[workflows]); remove long-form depth. Files: `sites/astro-starlight-terminal1/src/content/docs/tools/<tool>/overview.mdx` <!-- R9 -->

### Phase 4: Reframe contract + constitution

- [x] T008 [P] Reframe `docs/specs/readme-extraction-contract.md`: §7 (report-only, not block), §8 (always-commit, warn-not-skip, keep fetch isolation), §2/§7 Install (reporter not guard), render model (parallel readme page + thin overview, not overview injection), changelog row. File: `docs/specs/readme-extraction-contract.md` <!-- R10 -->
- [x] T009 [P] Reframe constitution Tool-Page Depth (canonical-verbatim + report-only + parallel-readme-page/thin-overview), bump v2.1.0 → v2.1.1 (PATCH), add changelog entry. File: `fab/project/constitution.md` <!-- R11 -->

### Phase 5: Verification

- [x] T010 Run all 4 checks: `node --test scripts/extract-readme.test.mjs`, `node scripts/validate-help.mjs` (6/6), `node --test scripts/parse-help.test.mjs`, `npx astro build` (then `rm -rf dist .astro`); plus the CLI divergence→exit-0 manual verification. <!-- R1 R5 R6 -->

## Execution Order

- Phase 1 (T001–T003) and Phase 4 (T008–T009) are independent of the render phases and of each other.
- Phase 2 (T004–T005) and Phase 3 (T006–T007) both touch the tool pages; do T004/T005 then T006/T007 so the build always has a valid render target. T006 must precede/accompany T007 (same files).
- T010 runs last (validates everything).

## Acceptance

### Functional Completeness

- [x] A-001 R1: The CLI writes the slice + prints a `::warning::` + exits 0 on a divergent README (verified manually).
- [x] A-002 R2: The CLI exits non-zero and writes no slice when the input README is missing/unreadable.
- [x] A-003 R3: The CLI writes the slice + prints an "unverified" warning + exits 0 when `help/<slug>.json` is absent.
- [x] A-004 R4: `scheduled-readme-refresh.yml` always extracts/commits on divergence (warn, not skip); fetch-failure still keeps last-good; `tu` commits with an unverified warning.
- [x] A-005 R5: `node --test scripts/extract-readme.test.mjs` passes with all detection cases intact and no blocking/exit-1 assertion remaining.
- [x] A-006 R6: All 7 `readme.mdx` exist with `title: Readme` + ReadmeSlice; each renders at `/tools/<tool>/readme/` in the build.
- [x] A-007 R7: No `overview.mdx` imports or renders `ReadmeSlice`.
- [x] A-008 R8: `astro.config.mjs` has a `Readme` item per tool parallel to `Commands`; the `Reference` group is unchanged.
- [x] A-009 R9: Each `overview.mdx` is a thin directory entry (GithubButton + short framing + nav links), with long-form depth removed.
- [x] A-010 R10: The contract's §7/§8/§2 + render model are reframed to report-only / always-commit / parallel-readme-page, with a changelog row for `4s3e`.
- [x] A-011 R11: The constitution Tool-Page Depth is reframed; Version is `2.1.1`; a `2.1.1` changelog entry exists.

### Behavioral Correctness

- [x] A-012 R1: The `findUnknownTokens` detector logic in `extract-readme.ts` is byte-for-byte unchanged (only its consequence at call sites changes).
- [x] A-013 R4: The workflow keeps fetch-failure isolation (genuinely unfetchable README → last-good preserved) distinct from divergence (always commit).

### Removal Verification

- [x] A-014 R7: No residual `ReadmeSlice` import/usage anywhere under `src/content/docs/tools/*/overview.mdx`.
- [x] A-015 R1: No `process.exit(1)` remains on the divergence path of `extract-readme-cli.mjs`.

### Scenario Coverage

- [x] A-016 R6/R8: `npx astro build` succeeds and emits both `overview` and `readme` pages for all 7 tools (page count verified).
- [x] A-017 R1/R3: Manual CLI runs (divergent slice → exit 0 + warning + slice written; missing help → exit 0 + unverified + slice written) confirmed.

### Edge Cases & Error Handling

- [x] A-018 R2: Missing input README → CLI errors (non-zero), no slice — distinct from the report-only divergence path.
- [x] A-019 R6: A tool with no committed slice (e.g. hop/tu) renders the neutral placeholder on its readme page (build succeeds), not a hard failure.

### Code Quality

- [x] A-020 Pattern consistency: New `readme.mdx` files mirror `commands.mdx` structure; sidebar entries mirror the `Commands` entry shape; CLI warnings follow the existing `::warning::`/stderr style.
- [x] A-021 No unnecessary duplication: `ReadmeSlice.astro` is reused unchanged; no detector logic is reimplemented; no new helper duplicates existing utilities.
- [x] A-022 No magic strings: the "Readme" label/slug and warning prefixes are used consistently across config + pages + CLI.

## Notes

- Check items as you review: `- [x]`
- Memory updates (hydrate stage, NOT apply): `docs/memory/conventions/readme-extraction.md` (gate now report-only; render = parallel readme page, not overview injection; detector retained as reporter), `docs/memory/conventions/tool-page-rubric.md` (overview thin again — depth moved to readme page, not GitHub), `docs/memory/conventions/help-collection.md` (vn39 rule has two modes: hard rule for hand-written prose, report-only for pulled README prose), `docs/memory/build-deploy/deployment.md` (refresh always commits) + indexes + Last Updated.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | The `extract-readme.test.mjs` suite exercises `findUnknownTokens` directly (token lists), not the CLI's exit code — so updating it to the report-only spec means updating only the doc/header comment, not deleting/rewriting assertions. The CLI's new exit-0 behavior is verified out-of-band (manual divergence run) per intake (no pre-existing CLI unit test) | Read the test file: every gate test calls `findUnknownTokens(...)` and asserts on the returned array; none spawns the CLI or checks `process.exit`. Per Test Integrity the detection cases stay; the consequence change lives in the CLI/workflow | S:90 R:80 A:90 D:85 |
| 2 | Certain | The `tu`/missing-help path is shared between R3 (CLI) and R4 (workflow): the CLI's exit-0-on-missing-help is what makes the workflow commit `tu` without a special branch — so the workflow needs no `tu`-specific code, only the CLI flip + comment refresh | Follows from intake assumption #8 + the CLI being single-sourced into the workflow; the workflow already loops uniformly over all 7 tools | S:90 R:75 A:85 D:80 |
| 3 | Confident | Thin overviews keep the existing per-tool nav-link tail (e.g. "See the commands reference…") and the 1-sentence backtick framing already present, but drop the `## Why`, `## At a glance`, `## Key ideas`, distinguishing-properties, and 7-stage-table depth blocks; idea/fab-kit lose the most. Each thinned overview links to readme + commands (+ install/workflows where those pages exist) | Intake R9 + assumption #3/#11 specify thin = GithubButton + 1–2 sentence framing + nav links; judgment per tool on framing length. Some overviews (hop/wt/run-kit/shll/tu) already carry an Install + At-a-glance block hand-written — those are long-form depth and are removed too | S:80 R:60 A:75 D:70 |
| 4 | Certain | `readme.mdx` import path mirrors `commands.mdx` (`../../../../components/ReadmeSlice.astro`) since both live at the same `tools/<tool>/` depth | Direct structural match to the existing `commands.mdx` files | S:95 R:85 A:95 D:90 |
| 5 | Confident | The contract's §9 (`docs/site/` reserved) and §1/§3/§4/§5/§6 (head/tail/image/dark/mermaid/strip mechanics) are unchanged — only §2 (Install language), §7 (gate→reporter), §8 (pull model + render text) need reframing, plus a changelog row | Intake scopes the reframe to §7/§8/§2 + render model; the deduction mechanics and the reserved escape hatch are untouched by a block→report flip | S:80 R:70 A:80 D:75 |
| 6 | Confident | Hydrate-stage memory tasks are recorded in plan Notes (not as `## Tasks`) so apply does not execute them; hydrate will pick them up | Intake explicitly says "Do NOT modify docs/memory/ — that's hydrate; plan memory tasks for hydrate but do not execute them now" | S:85 R:80 A:85 D:80 |

6 assumptions (4 certain, 2 confident, 0 tentative, 0 unresolved).
