# Plan: Website Content Accuracy + Self-Updating Homepage Versions

**Change**: 260608-jf3q-content-accuracy-version-sync
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

### VersionTable: Self-updating homepage version dump

#### R1: Build-time version sourcing from `help/*.json`
The site SHALL render the homepage version block from a new `VersionTable.astro` component that reads each tool's `version` field from `<repo-root>/help/<slug>.json` at build time, resolving the repo root via `repoRootFromModuleUrl(import.meta.url)` and validating each file against `HelpDocSchema`. No runtime fetch; no hand-typed version numbers (Constitution I).

- **GIVEN** the scheduled puller has committed current `help/*.json` files
- **WHEN** the site is built
- **THEN** the homepage version block shows each tool's current `version` from its JSON
- **AND** when a future puller bumps a version, a rebuild reflects it with no source edit

#### R2: Site-authored roster, order, labels, routes, repo URLs
The component SHALL hold the tool roster, display order, display labels, route links, and repo URLs in the component source (NOT from JSON). Only `version` comes from JSON. The roster, in order, is: shll/`shll`/`/shll`, idea/`idea`/`/idea`, hop/`hop`/`/hop`, fab-kit/`fab-kit`/`/fab-kit`, wt/`wt`/`/wt`, run-kit/`rk`/`/run-kit`, tu/`tu`/`/tu`, each linking to `https://github.com/sahil87/<slug>`.

- **GIVEN** the roster defined in the component
- **WHEN** the component renders
- **THEN** rows appear in roster order with the site-authored labels (run-kit displayed as `rk`)
- **AND** route links use `/run-kit` and repo links use `github.com/sahil87/run-kit` (repo identity preserved)

#### R3: `v`-prefix normalization
The component SHALL prepend `v` to any version string that does not already start with `v`, so output is always `v<semver>` (fab-kit JSON = `2.1.1`, tu = `0.4.17` lack the prefix; the rest carry it).

- **GIVEN** `fab-kit.json` version `2.1.1` and `shll.json` version `v0.0.14`
- **WHEN** rendered
- **THEN** fab-kit shows `v2.1.1` and shll shows `v0.0.14` (no double `vv`)

#### R4: Markup + alignment parity with the current hand-written block
The component SHALL emit the same terminal-themed markup the homepage currently hand-writes (one `<span class="shell-line">` per tool: `<a href>{label}</a>` + alignment padding + `<span class="shell-dim">{version}</span>` + padding + `<a class="shell-dim" href>[git]</a>`), preserving the column alignment (label column width 9, version column width 10) under `white-space: pre`, accounting for the `rk` label width.

- **GIVEN** the existing `.shell-session` styles and `white-space: pre`
- **WHEN** the component output replaces lines 27–33 of `index.mdx`
- **THEN** the version column and `[git]` column stay vertically aligned across all 7 rows in both light and dark themes

#### R5: Build-stopping on missing/invalid help JSON
The component SHALL fail the build loudly if a rostered `help/<slug>.json` is missing or fails `HelpDocSchema` validation (mirroring `CommandIndex.astro`). A missing-help defect MUST NOT deploy.

- **GIVEN** a rostered slug whose `help/<slug>.json` is absent or schema-invalid
- **WHEN** the site builds
- **THEN** the build throws with a descriptive error naming the offending file

### Homepage prose: index.mdx hero + captions

#### R6: Wire `<VersionTable />` into index.mdx
`index.mdx` SHALL import `VersionTable` and replace the 7 hand-typed version `<span class="shell-line">` lines with `<VersionTable />`, keeping the `$ shll version` prompt line and the trailing cursor line.

- **GIVEN** the rendered homepage
- **WHEN** viewed
- **THEN** the `$ shll version` prompt, the 7 component rows, and the cursor line render in the same visual shape as before, with current versions

#### R7: Realistic `shll install` hero output
The `shll install` hero output SHALL drop the fabricated `==> tapping sahil87/tap` line and replace the single bulk `==> installing ...` line with per-tool Homebrew-style `==> [N/M] <tool>` headers in roster order `wt, idea, tu, rk, hop, fab-kit` (6 tools, `rk` not `run-kit`), keeping the final `==> done in ...` ok line.

- **GIVEN** a visitor reading the hero
- **WHEN** they compare it to real `shll install` output
- **THEN** there is no tapping line and each tool gets its own `==> [N/M] <tool>` header (rk, not run-kit)

#### R8: Loop caption verb framing (plan, not spec)
The loop-diagram caption SHALL reframe the fab-kit verb from "specs" to a plan-before-code framing (e.g. "plans"). Nav link labels and `/tools/<tool>/overview/` link targets (including the `run-kit` directory label) SHALL be preserved.

- **GIVEN** the caption on line 51
- **WHEN** rendered
- **THEN** fab-kit reads as "plans" and all `/tools/<tool>/overview/` links + their visible section labels are unchanged

### Pipeline accuracy: fab-kit is 6 stages, no spec stage

#### R9: 6-stage pipeline everywhere
All hand-authored prose SHALL describe fab-kit as a 6-stage pipeline (intake → apply → review → hydrate → ship → review-PR), with no spec stage, matching fab-kit's README. Affected: `philosophy.md:10,16`, `tools/fab-kit/overview.mdx:3,11`, `getting-started/overview.md` diagram label, `workflows/daily-flow.md:33,56`.

- **GIVEN** any hand-authored mention of the fab-kit pipeline or its per-change artifacts
- **WHEN** read
- **THEN** it states 6 stages, omits a spec stage, and refers to the per-change artifact as a plan (not a spec)
- **AND** `/fab-fff`'s scope reads "apply → review → hydrate → ship → review-PR (everything after intake)"
- **AND** `[NEEDS CLARIFICATION]` markers are framed as an intake construct resolved via `/fab-clarify`

### Tool naming: `rk` for CLI tokens, `run-kit` for repo/section

#### R10: run-kit → rk for CLI-invocation/version tokens only
Where prose names the CLI a user types or that the tool prints, it SHALL use `rk`; where it names the repo or the tool's site section (nav/directory links, repo URLs, `/run-kit` routes), it SHALL keep `run-kit`.

- **GIVEN** the install list and version dump
- **WHEN** rendered
- **THEN** they show `rk`; nav/directory labels and repo links remain `run-kit`

### Command-syntax accuracy: workflows + getting-started

#### R11: hop command grammar
`workflows/daily-flow.md` SHALL use `hop --all pull` (selection precedes verb; "every cloned repo in `hop.yaml`") instead of `hop pull --all`, and `hop ls --trees` (per-repo worktree summaries; `*` = dirty, `↑N` = unpushed) instead of `hop status --all`. There is no `hop pull` or `hop status` subcommand.

- **GIVEN** the morning and end-of-day blocks
- **WHEN** a visitor copy-pastes the commands
- **THEN** the commands are valid hop invocations

#### R12: idea has no tags; no `idea list` positional filter; valid backlog line shape
`workflows/daily-flow.md:19` SHALL reword the `idea list` comment to drop the invented `#tag` concept. The replacement MUST NOT assert a positional filter on `idea list` — ground truth (`help/idea.json`) shows `idea list [flags]` only (`--all/-a`, `--done`, `--json`, `--sort`, `--reverse`), no positional `<substr>`. The accurate framing is that `idea list` prints the open backlog and narrowing is done by piping to `grep` (substring *queries* exist on per-ID commands like `show`/`done`/`rm`, not `list`). The example backlog line SHALL use a valid shape including the mandatory `YYYY-MM-DD:` date field, dropping the invented `#bug` tag. The same valid-date-line shape applies to the `idea list` output example in `new-change.md:15`.
<!-- rework cycle 1: apply replaced the #tag fabrication with a NEW fabrication (`idea list <substr>` positional filter, which does not exist — flagged must-fix by outward review, a vn39 violation). Corrected to grep-based narrowing; also fixed new-change.md:15 undated example line and the two `# seed ... from the idea` comments (daily-flow.md:24, new-change.md:21) that overstated fab-change-new coupling (see R17). -->

- **GIVEN** the idea example block
- **WHEN** read
- **THEN** no `#tag` feature and no `idea list <substr>` positional filter are implied; narrowing is shown via grep; the example line carries a `YYYY-MM-DD:` date field

#### R13: tu shows today; wt --stale lives on delete
`workflows/daily-flow.md:12` SHALL reword bare `tu` to "check today's cost so far". Line 50 SHALL stay read-only: `wt list` plus a note that `wt delete --stale` (default 7d, configurable `--stale=Nd`) prunes idle worktrees (the `--stale` flag is on `wt delete`, not `wt list`).

- **GIVEN** the morning/end-of-day blocks
- **WHEN** a visitor copy-pastes
- **THEN** bare `tu` is described as today's cost, and the stale-worktree step is read-only with the prune action correctly attributed to `wt delete --stale`

#### R14: rk riff creates a worktree + tmux window
`workflows/daily-flow.md:30` and `workflows/new-change.md:36` SHALL describe `rk riff` as creating a git worktree + a new tmux window (agent as pane 0), not merely "a pane".

- **GIVEN** the rk riff descriptions
- **WHEN** read
- **THEN** they mention the worktree + tmux window

#### R15: install.md update semantics
`getting-started/install.md:13` SHALL correct the false "it will only update tools that have moved": `shll install` only installs roster tools you are missing and does NOT upgrade; `shll update` upgrades already-installed tools.

- **GIVEN** the install idempotency note
- **WHEN** read
- **THEN** it does not claim `shll install` upgrades; it points to `shll update`

### Framing accuracy: getting-started/overview.md

#### R16: overview diagram + hop framing
`getting-started/overview.md` SHALL change the diagram label `spec/plan` → `plan` (keeping `constitution`), change `worktree / per change` → `worktree / per branch`, and reword the hop sentence from "the navigator that ties unrelated repos together" to "a personal directory of your git repos — jump between them and batch-update them from anywhere" (hop is a registry from `hop.yaml`; no linking concept).

- **GIVEN** the shape diagram and prose line
- **WHEN** read
- **THEN** the per-change artifact reads `plan`, wt's unit reads `per branch`, and hop is framed as a personal repo directory (no "ties repos together")

### fab change new semantics: new-change.md

#### R17: `fab change new` creates folder + `.status.yaml`; skill writes intake
`workflows/new-change.md:34` and `:70` SHALL reword `fab change new --slug` to create the change folder + `.status.yaml` (starting the intake stage); the `/fab-new` skill (or first pipeline prompt) generates `intake.md`. The "Spawns ... in a new tmux pane" sub-bullet (`:36`) SHALL be tightened to a git worktree + new tmux window (agent as pane 0 of that window).

- **GIVEN** the "what just happened" steps and the without-idea note
- **WHEN** read
- **THEN** `fab change new` is described as creating the folder + `.status.yaml`, with `intake.md` generated by the skill; and rk riff creates a worktree + tmux window

### Non-Goals

- Editing any `readme.mdx`, `commands.mdx`, `reference/command-index.mdx`, or `help/*.json` (mechanically synced / puller-owned — Constitution Tool-Page Depth; intake §5).
- Editing the `sites/_playground/` duplicate (not deployed — Constitution III).
- Changing route links (`/run-kit`) or repo URLs (`github.com/sahil87/run-kit`) — repo identity is correct.
- Adding any dependency or runtime data fetch (Constitution I, VI).

### Design Decisions

1. **Versions from `help/*.json`, site-data in component**: mirror `CommandIndex.astro`'s repo-root + schema-validate pattern; roster/labels/links live in the component so the homepage stays site-authored framing while versions self-correct. — *Why*: extends the mechanical-sync principle from readme/commands to versions, with zero new dep. — *Rejected*: pulling labels/order from JSON (would let the producer dictate site presentation).
2. **`rk` label, `/run-kit` route**: display token `rk` (CLI/brew identity) but route + repo URL stay `run-kit`. — *Why*: matches `shll version` output and brew formula; route segment is the docs section. — *Rejected*: relabeling routes (breaks existing `/run-kit` pages).
3. **Keep End-of-day `wt` step read-only**: surface stale via `wt list`, mention `wt delete --stale` as the prune. — *Why*: the original step only listed; do not silently make it destructive (intake assumption #7). — *Rejected*: switching to `wt delete --stale` in the daily flow.

## Tasks

### Phase 1: Core Implementation

- [x] T001 Create `sites/astro-starlight-terminal1/src/components/VersionTable.astro`: build-time read of each rostered `help/<slug>.json` via `repoRootFromModuleUrl(import.meta.url)` + `fs.readFileSync` + `HelpDocSchema.parse` (mirror `CommandIndex.astro`); site-authored roster (order/labels/routes/repos in component); `v`-prefix normalization; emit one `<span class="shell-line">` per tool with aligned label (col 9) + `shell-dim` version (col 10) + `[git]` link; throw build-stopping error on missing/invalid JSON <!-- R1 R2 R3 R4 R5 R10 -->

### Phase 2: Homepage wiring + hero/caption fixes (index.mdx)

- [x] T002 In `index.mdx`: import `VersionTable` alongside the `Diagram` import; replace the 7 hand-typed version `<span class="shell-line">` lines (27–33) with `<VersionTable />`, keeping the `$ shll version` prompt (26) and trailing cursor line <!-- R6 -->
- [x] T003 In `index.mdx` hero (21–24): remove `==> tapping sahil87/tap`; replace the bulk `==> installing ...` line with per-tool `==> [N/M] <tool>` headers in order `wt, idea, tu, rk, hop, fab-kit`; keep `==> done in ...` ok line <!-- R7 R10 -->
- [x] T004 In `index.mdx` caption (51): reframe fab-kit "specs" → "plans"; keep all `/tools/<tool>/overview/` links and visible section labels (incl. `run-kit`) <!-- R8 -->

### Phase 3: Prose accuracy fixes

- [x] T005 [P] `getting-started/philosophy.md`: line 16 → 6-stage list (intake → apply → review → hydrate → ship → review-PR) + drop spec from "Forcing intake and spec stages"; line 10 → "Plans (`fab-kit`) are markdown files." <!-- R9 -->
- [x] T006 [P] `tools/fab-kit/overview.mdx`: frontmatter `description` (3) "7-stage" → "6-stage"; body (11) "a 7-stage pipeline (intake → spec → apply → ...)" → 6-stage list <!-- R9 -->
- [x] T007 [P] `getting-started/overview.md`: diagram label `spec/plan` → `plan` (keep `constitution`); `worktree / per change` → `worktree / per branch`; line 19 hop sentence reworded to personal-directory framing <!-- R9 R16 -->
- [x] T008 [P] `getting-started/install.md`: line 13 corrected — `shll install` installs only missing roster tools, does not upgrade; use `shll update` <!-- R15 -->
- [x] T009 [P] `workflows/daily-flow.md`: line 11 `hop --all pull` (+ "every cloned repo in `hop.yaml`"); line 12 `tu` → "today's cost so far"; line 19 reword idea comment (substring, no tags) + fix example backlog line to `[a7q2] 2026-06-08: flaky timezone in user-profile.tsx`; line 30 rk riff → worktree + tmux window; line 33 `/fab-fff` → "apply → review → hydrate → ship → review-PR (everything after intake)"; line 48 `hop ls --trees`; line 50 read-only `wt list` + `wt delete --stale` note; line 56 spec stage → intake stage <!-- R9 R10 R11 R12 R13 R14 -->
- [x] T010 [P] `workflows/new-change.md`: line 34 `fab change new --slug` creates folder + `.status.yaml` (skill/first prompt generates `intake.md`); line 36 sub-bullet → worktree + new tmux window (agent as pane 0); line 70 tightened similarly <!-- R14 R17 -->

### Phase 4: Verify

- [x] T011 Install deps (pnpm) if needed and run the production build (`pnpm build` / `astro build`) from the site dir; confirm `VersionTable` compiles, the build succeeds, and the rendered output shows the 7 expected version rows (shll v0.0.14, idea v0.0.7, hop v0.1.16, fab-kit v2.1.1, wt v0.0.16, rk v2.2.3, tu v0.4.17) <!-- R1 R3 R4 R5 R6 -->

## Execution Order

- T001 → T002 (index.mdx imports the component); T002–T004 all edit index.mdx (sequential, same file)
- T005–T010 are `[P]` (distinct files)
- T011 last (verifies the whole set)

## Acceptance

### Functional Completeness

- [x] A-001 R1: `VersionTable.astro` reads each rostered version from `help/<slug>.json` at build time via `repoRootFromModuleUrl` + `HelpDocSchema.parse`; no hand-typed versions remain on the homepage
- [x] A-002 R2: Roster order, labels (run-kit→`rk`), `/route` links, and `github.com/sahil87/<slug>` repo URLs are defined in the component, not JSON
- [x] A-003 R3: fab-kit and tu render with a single `v` prefix (`v2.1.1`, `v0.4.17`); already-prefixed versions are not doubled — verified in dist/index.html
- [x] A-004 R4: rendered rows use `shell-line`/`shell-dim` markup and stay column-aligned (label col 9, version col 10) in both themes — verified padding in built HTML (shll+5sp, fab-kit+2sp, rk+7sp)
- [x] A-005 R5: build throws a descriptive error when a rostered `help/<slug>.json` is missing or schema-invalid — verified by removing tu.json (build threw "VersionTable: required help document missing at .../help/tu.json (rostered tool \"tu\")")
- [x] A-006 R6: `index.mdx` renders `<VersionTable />` between the `$ shll version` prompt and the cursor line
- [x] A-007 R7: hero output has no tapping line and shows per-tool `==> [N/M] <tool>` headers (`rk`, not `run-kit`) + a `==> done` line
- [x] A-008 R8: loop caption reads fab-kit "plans"; all `/tools/<tool>/overview/` links + labels preserved
- [x] A-009 R9: no hand-authored page mentions a 7-stage pipeline or spec stage; `/fab-fff` scope and `[NEEDS CLARIFICATION]`/`/fab-clarify` framing are intake-correct — grep of content tree returns zero hits for 7-stage/spec stage/spec/plan
- [x] A-010 R10: `rk` used for CLI/version tokens; `/run-kit` routes, repo URLs, and nav/section labels unchanged
- [x] A-011 R11: daily-flow uses `hop --all pull` and `hop ls --trees`; no `hop pull`/`hop status` — both confirmed against hop help JSON (documented invocations)
- [x] A-012 R12: idea comment describes substring matching (no tags); example backlog line includes `2026-06-08:` date field, no `#bug` — #tag removed, date field present (idea help confirms no tag concept)
- [x] A-013 R13: bare `tu` described as today's cost; stale step is read-only with `wt delete --stale` attributed correctly — `--stale` confirmed on `wt delete` not `wt list`; `tu` bare confirmed as today's snapshot
- [x] A-014 R14: rk riff descriptions (daily-flow:30, new-change:36) mention worktree + tmux window
- [x] A-015 R15: install.md no longer claims `shll install` upgrades; points to `shll update`
- [x] A-016 R16: overview diagram reads `plan` + `per branch`; hop framed as personal repo directory
- [x] A-017 R17: new-change describes `fab change new` creating folder + `.status.yaml` with skill-generated intake

### Behavioral Correctness

- [x] A-018 R1: a simulated version bump in a `help/*.json` would change the rendered homepage row on rebuild with no source edit (self-correcting) — verified by the inverse: removing tu.json changed build behavior with no source edit; values are read live each build (only `version` from JSON)

### Scenario Coverage

- [x] A-019 R1,R4: production build succeeds and emitted HTML for the homepage contains the 7 expected version rows — dist/index.html shows shll v0.0.14, idea v0.0.7, hop v0.1.16, fab-kit v2.1.1, wt v0.0.16, rk v2.2.3, tu v0.4.17

### Edge Cases & Error Handling

- [x] A-020 R5: missing/invalid help JSON stops the build (not a silent skip) — verified, build threw and aborted

### Code Quality

- [x] A-021 Pattern consistency: `VersionTable.astro` mirrors `CommandIndex.astro` (same imports, repo-root resolution, schema validation, error wording style) — same fs/path/HelpDocSchema/repoRootFromModuleUrl imports, same per-file try/catch throw-with-detail wording
- [x] A-022 No unnecessary duplication: reuses `repoRootFromModuleUrl` and `HelpDocSchema` rather than reimplementing repo-root/validation logic

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Label column width 9 / version column width 10 reproduces the current alignment under `white-space: pre`; `rk` (2 chars) is padded with 7 trailing spaces | Measured from index.mdx:27–33 — `shll`+5sp=9, `fab-kit`+2sp=9, versions `v0.0.11`+3sp=10, `v0.0.6`+4sp=10 | S:90 R:70 A:90 D:85 |
| 2 | Confident | Hero `==> [N/M] <tool>` uses M=6 and 1-based N in order wt,idea,tu,rk,hop,fab-kit (e.g. `==> [1/6] wt`) | Intake §E specifies the shape + order but not exact N/M formatting; Homebrew prints `[N/M]` 1-based; illustrative-but-clean per intake | S:75 R:75 A:70 D:60 |
| 3 | Confident | Caption verb "specs" → "plans" (single word swap), leaving the rest of line 51 intact | Intake R8/§B example uses "plans"; minimal change preserves the caption's parallel verb structure | S:80 R:80 A:75 D:65 |

3 assumptions (1 certain, 2 confident, 0 tentative).

## Deletion Candidates

None — this change replaced 7 hand-typed version `<span>` lines in `index.mdx` with `<VersionTable />`; those lines are removed in place (the deletion is part of the diff, nothing left orphaned). `VersionTable.astro` reuses `repoRootFromModuleUrl` (`src/lib/repo-root.ts`) and `HelpDocSchema` (`src/lib/schemas.ts`) rather than introducing a parallel utility, so no prior helper became redundant. No existing component, route, or data file is made dead by this change.
