# Plan: run-kit Formula Rename Reference Sweep

**Change**: 260709-co63-run-kit-formula-rename
**Intake**: `intake.md`

## Requirements

<!-- Derived from the intake's What Changes sections. This is a chore reference
     sweep following run-kit's v3.0.0 rename (canonical CLI/formula/binary
     identity rk → run-kit; rk survives as a brew-installed symlink alias).
     Zero runtime-behavior change beyond one display label + terminal help
     strings. No invented features. -->

### Naming: Canonical identity is `run-kit`

#### R1: Hand-authored surfaces use `run-kit` as the canonical name
Hand-authored references (workflow mapping strings, site prose, the homepage install transcript, code comments, and specs) that name run-kit's formula/binary/CLI identity SHALL read `run-kit`, matching upstream v3.0.0. The deliberate exceptions that MUST be preserved are (a) the homepage terminal's `rk` alias affordances and typed demo commands, and (b) frozen fixture *content*.

- **GIVEN** a hand-authored surface asserting run-kit's formula/binary is `rk`
- **WHEN** the sweep is applied
- **THEN** the assertion reads `run-kit` (formula = binary = CLI = `run-kit`), with `rk` described only as the short symlink alias where mentioned

#### R2: The `rk` short alias stays a first-class, described affordance
Wherever `rk` legitimately survives as the brew-installed symlink alias — the terminal island's `rk` COMMANDS key, dispatch, cheatsheet alias-fold, Tab-completion entry, `run-kit · rk` label, and typed demo commands — the affordance SHALL be kept intact; only descriptive text claiming `rk` is "the binary name" is reframed to "short alias".

- **GIVEN** the interactive terminal's `rk` alias key / dispatch / cheatsheet-fold / label / demo command
- **WHEN** the sweep is applied
- **THEN** the affordance behaves identically (still an alias of `run-kit`) and any prose calling it "the binary name" now calls it a "short alias"

### Puller workflows: `.github/workflows/`

#### R3: `refresh-help.yml` triple + comment table name the canonical formula
The `slug:formula:binary` triple `"run-kit:rk:rk"` SHALL become `"run-kit:run-kit:run-kit"`, and the three-name explanatory comment SHALL stop citing run-kit as the slug≠formula≠binary example (using fab-kit — slug `fab-kit`, binary `fab` — as the surviving divergence example), optionally noting run-kit's v3.0.0 rename with `rk` kept as symlink alias.

- **GIVEN** `refresh-help.yml`'s tools array and its three-name comment block
- **WHEN** the sweep is applied
- **THEN** the triple reads `run-kit:run-kit:run-kit`, the mapping-table row reads `run-kit -> run-kit -> run-kit`, and the divergence example is fab-kit, not run-kit

#### R4: `refresh-readme.yml` stale comment is corrected
The comment "(… run-kit's repo is `run-kit` even though its binary/formula is `rk`.)" SHALL be reworded — since v3.0.0 all three run-kit names align; fab-kit remains the slug≠binary example.

- **GIVEN** `refresh-readme.yml`'s slug/repo comment block
- **WHEN** the sweep is applied
- **THEN** it no longer claims run-kit's binary/formula is `rk`

### Live-site content pages

#### R5: Content pages teach `run-kit <cmd>` (canonical), not `rk <cmd>`
The content pages (`install.md`, `daily-flow.md`, `new-change.md`, `tools/run-kit/overview.mdx`) and the homepage transcript (`index.mdx`) SHALL present run-kit invocations and its install-transcript formula line as `run-kit`, matching the pulled README/commands the daily pullers refresh.

- **GIVEN** prose/code-block lines invoking `rk riff`, `rk serve`, `rk agent-setup`, or the transcript `==> [4/6] rk`
- **WHEN** the sweep is applied
- **THEN** each reads its `run-kit …` canonical form (and the "Without `rk`" heading + "rk is convenience" prose read `run-kit`)

### Live-site components

#### R6: `VersionTable` run-kit display label is `run-kit`
The `VersionTable.astro` ROSTER run-kit entry label SHALL change from `'rk'` to `'run-kit'`, and its doc comment SHALL reflect that CLI/brew/slug identities now all read `run-kit` (`rk` = typed short alias). Rendered column alignment SHALL remain intact (`LABEL_COL = 9` accommodates the 7-char label).

- **GIVEN** the ROSTER entry `{ slug: 'run-kit', label: 'rk', … }`
- **WHEN** the sweep is applied
- **THEN** the label is `'run-kit'` and `labelPad('run-kit')` yields ≥1 trailing space (9−7 = 2), keeping the columns aligned

#### R7: `TerminalPrompt` keeps alias affordances, reframes descriptive text
`TerminalPrompt.astro` SHALL keep every `rk` alias affordance (R2), and SHALL update only: descriptive HELP_DETAIL text ("by its binary name" → "by its short alias"; "rk is what you actually type" reframed), comments calling `rk`/`fab` "binary aliases" (→ "short alias `rk` / binary `fab`"), the `help/run-kit.json holds binary rk` comment (→ "held binary `rk` pre-v3.0.0; holds `run-kit` after the corpus refresh"), and simulated-output lines presenting `rk` as the tool's name (`rk dashboard` → `run-kit dashboard`).

- **GIVEN** the terminal island's descriptive prose and simulated-output lines
- **WHEN** the sweep is applied
- **THEN** alias keys/dispatch/folds/labels/demo-commands are byte-unchanged in behavior, while "binary name" claims and `rk dashboard` output lines are reframed to run-kit/short-alias

#### R8: `ToolsIndex.astro` + `astro.config.mjs` comments simplified
The `ToolsIndex.astro` comments citing the "`rk` vs `run-kit` rule" (slug ≠ binary) SHALL simplify (slug and binary now coincide — no code change to the roster, which already uses `run-kit`); the `astro.config.mjs` "Allow rk-proxy" comment SHALL be reworded to run-kit's proxy.

- **GIVEN** the `ToolsIndex.astro` doc comments and the `astro.config.mjs` `allowedHosts` comment
- **WHEN** the sweep is applied
- **THEN** the comments no longer frame `rk` as run-kit's binary distinct from its slug; no code/roster value changes

### Scripts, fixtures, tests

#### R9: Fixture renamed with byte-identical content; manifest + refs updated
`scripts/fixtures/rk-riff.txt` SHALL be `git mv`'d to `run-kit-riff.txt` with **byte-identical content** (a deliberately frozen v2.5.3 specimen — its text legitimately still shows `rk riff`), the `refresh-help-fixtures.mjs` manifest entry SHALL become `{ file: 'run-kit-riff.txt', doc: 'run-kit', path: 'run-kit riff' }`, `parse-help.test.mjs` SHALL reference `fixture('run-kit-riff.txt')` with an updated test title/header comment (content expectations unchanged — they pin the frozen specimen), and `scripts/fixtures/README.md` SHALL update the provenance row + note the frozen content predates the rename.

- **GIVEN** the frozen `rk-riff.txt` fixture, its manifest entry, its test, and the fixtures README
- **WHEN** the sweep is applied
- **THEN** the file is `run-kit-riff.txt` (identical bytes), the manifest path is `run-kit riff`, the test loads the new filename, and the assertions on frozen content (`cmd[=__rk_riff_pane_bare__]`, `rk riff` usage lines) are unchanged

#### R10: Test cases mirroring run-kit's real `root.short` updated
`llms.test.mjs` and `terminal-toolcard.test.mjs` cases/comments that mirror run-kit's *real* `root.short` SHALL move from `'rk — tmux session manager with web UI'` to `'run-kit — tmux session manager with web UI'` (v3.0.0 still binary-prefixes its short, so `stripToolPrefix` stays live — the bin arg moves `'rk'` → `'run-kit'` accordingly). Generic-input guard cases (e.g. `'rkward stuff'`, wrong-bin no-strip) stay as-is.

- **GIVEN** the `stripToolPrefix` test cases pinning run-kit's real short and its bin name
- **WHEN** the sweep is applied
- **THEN** the run-kit-mirroring cases assert `stripToolPrefix('run-kit — …', 'run-kit') === '…'` while `'rkward stuff'`/wrong-bin cases remain untouched

### Code comments

#### R11: Lib/component doc comments name run-kit canonically
`schemas.ts` (`tool` field example `("wt", "rk", "fab")` → `("wt", "run-kit", "fab")`), `llms.ts` + `terminal-toolcard.ts` (`root.short` quoted as `"rk — tmux …"` → `"run-kit — tmux …"`, doubling example updated), and `parse-help.ts` (4 comments) + `CommandIndex.astro` + `CommandReference.astro` (`rk riff …` examples → `run-kit riff …`) SHALL be updated. These are comment-only; no code behavior changes.

- **GIVEN** the lib/component doc comments quoting run-kit's short or `rk riff` examples
- **WHEN** the sweep is applied
- **THEN** they read the run-kit canonical forms; executable code is untouched

### Specs

#### R12: Specs record run-kit no longer diverges; fab-kit is the example
`help-dump-contract.md` (envelope/node comment `(wt, rk, fab)` and `rk riff` path/discovery examples → `run-kit riff`; the "three names" §"tool author never needs the mapping" paragraph rewritten so run-kit's three names align with a note on the v3.0.0 rename + `rk` symlink alias, fab-kit becoming the divergence example; the teardown `<tool>` example list `wt, rk, fab` updated) and `readme-extraction-contract.md` (§9 per-tool table row `| run-kit | rk |` binary column → `run-kit`) SHALL be updated to reflect reality.

- **GIVEN** the two spec files citing run-kit's binary as `rk` and using it as the slug≠binary example
- **WHEN** the sweep is applied
- **THEN** run-kit's binary reads `run-kit`, fab-kit (binary `fab`) is the divergence example, and the v3.0.0 rename (rk = symlink alias) is noted

### Non-Goals

- **Puller-owned data** — `help/*.json`, `content/run-kit/**`, `content/shll/**` — not hand-edited (mechanically synced by the daily pullers; hand-edits would conflict/be overwritten).
- **Non-live variants** — `sites/astro-tailwind-terminal1/`, `sites/_playground/` — untouched (constitution: one live site).
- **`public/diagrams/loop-*.svg`** — `rk` appears only in invisible mermaid node IDs; visible labels already read run-kit.
- **`.claude/skills/**`** — deployed via `fab sync` from fab-kit; not this repo's content.
- **Memory files** (`docs/memory/**`) — not edited during apply; hydrate handles them.
- **No commits** — changes left in the working tree; the ship stage dispatches the pullers post-merge.

### Design Decisions

1. **Fixture stays byte-identical across the rename**: `git mv` preserves content — *Why*: fixtures are deliberately frozen v2.5.3 specimens (their text legitimately shows `rk riff`); re-freezing is impossible now (corpus still pre-rename) and unnecessary (tests pin content, not filenames) — *Rejected*: re-capturing content now (corpus is pre-rename, would fabricate).
2. **Keep all `rk` alias affordances in the terminal island**: the brew formula still ships the `rk` symlink, so alias-typers are a real audience — *Why*: matches upstream's "fully interchangeable short alias" framing — *Rejected*: removing `rk` keys/dispatch (would regress a real affordance).

## Tasks

### Phase 1: Puller workflows

- [x] T001 Update `.github/workflows/refresh-help.yml`: triple `"run-kit:rk:rk"` → `"run-kit:run-kit:run-kit"`; the three-name comment block (mapping-table row + the "conflating them is a real bug" parenthetical) switches its divergence example to fab-kit and notes run-kit's v3.0.0 rename (rk = symlink alias) <!-- R1 R3 -->
- [x] T002 [P] Update `.github/workflows/refresh-readme.yml`: reword the stale "run-kit's repo is `run-kit` even though its binary/formula is `rk`" comment (all three names align since v3.0.0; fab-kit stays the slug≠binary example) <!-- R1 R4 -->

### Phase 2: Live-site content pages

- [x] T003 [P] `sites/astro-starlight-terminal1/src/content/docs/getting-started/install.md`: code line `rk agent-setup` → `run-kit agent-setup`; prose "`rk agent-setup` line above", "`rk agent-setup --uninstall` removes exactly the rk-owned entries" → run-kit forms <!-- R5 -->
- [x] T004 [P] `sites/astro-starlight-terminal1/src/content/docs/workflows/daily-flow.md`: `rk riff --skill …` (×2) → `run-kit riff …`; "`rk`'s browser dashboard" → `run-kit`'s; "`rk riff` agents in each" → `run-kit riff` <!-- R5 -->
- [x] T005 [P] `sites/astro-starlight-terminal1/src/content/docs/workflows/new-change.md`: both `rk riff --skill /fab-fff` → `run-kit riff …`; heading `## Without \`rk\`` → `## Without \`run-kit\``; "`rk` is convenience, not contract" → `run-kit` <!-- R5 -->
- [x] T006 [P] `sites/astro-starlight-terminal1/src/content/docs/tools/run-kit/overview.mdx`: `rk riff` / `rk serve` → `run-kit riff` / `run-kit serve` <!-- R5 -->
- [x] T007 [P] `sites/astro-starlight-terminal1/src/content/docs/index.mdx`: homepage transcript `==> [4/6] rk` → `==> [4/6] run-kit` <!-- R5 -->

### Phase 3: Live-site components

- [x] T008 `sites/astro-starlight-terminal1/src/components/VersionTable.astro`: ROSTER run-kit `label: 'rk'` → `label: 'run-kit'`; rewrite the doc comment (CLI/brew/slug now all `run-kit`, `rk` = typed short alias) and the `RosterEntry.label` field comment <!-- R6 -->
- [x] T009 `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro`: KEEP all `rk` alias affordances (COMMANDS key, dispatch, cheatsheet fold, `run-kit · rk` label, Tab-completion, typed demo `command: 'rk'`); UPDATE only — line 45 comment (`holds binary rk` → held-pre-v3.0.0 note), HELP_DETAIL `rk` entry (416 comment + 424-426 "binary name"→"short alias"), 746/809/2485/2788 "binary aliases (rk/fab)" comments (→ short alias `rk` / binary `fab`), 1875 label-change example, and simulated-output lines 1041/1065 `rk dashboard` → `run-kit dashboard` <!-- R7 R2 -->
- [x] T010 [P] `sites/astro-starlight-terminal1/src/components/ToolsIndex.astro`: simplify the two doc-comment blocks citing the "`rk` vs `run-kit` rule" (slug and binary now coincide); roster value already `run-kit` — no code change <!-- R8 -->
- [x] T011 [P] `sites/astro-starlight-terminal1/astro.config.mjs`: reword the "Allow rk-proxy + Tailscale hostnames" comment to run-kit's proxy <!-- R8 -->

### Phase 4: Scripts, fixtures, tests

- [x] T012 `git mv sites/astro-starlight-terminal1/scripts/fixtures/rk-riff.txt sites/astro-starlight-terminal1/scripts/fixtures/run-kit-riff.txt` — content BYTE-IDENTICAL (verify sha256 unchanged) <!-- R9 -->
- [x] T013 `sites/astro-starlight-terminal1/scripts/refresh-help-fixtures.mjs`: manifest entry → `{ file: 'run-kit-riff.txt', doc: 'run-kit', path: 'run-kit riff' }` <!-- R9 -->
- [x] T014 `sites/astro-starlight-terminal1/scripts/parse-help.test.mjs`: `fixture('rk-riff.txt')` → `fixture('run-kit-riff.txt')`; update the test title + header-comment specimen name to `run-kit riff` / `run-kit-riff.txt`; leave frozen-content assertions (`cmd[=__rk_riff_pane_bare__]`, `rk riff` usage/desc pins) unchanged <!-- R9 -->
- [x] T015 [P] `sites/astro-starlight-terminal1/scripts/fixtures/README.md`: provenance row → new file name + node path `run-kit riff`, with a note the frozen content predates the v3.0.0 rename (so its text still shows `rk`) and switches on the next deliberate re-freeze <!-- R9 -->
- [x] T016 [P] `sites/astro-starlight-terminal1/scripts/llms.test.mjs`: run-kit-mirroring `stripToolPrefix` cases `'rk — tmux …'`/`'rk'` → `'run-kit — tmux …'`/`'run-kit'`; keep the wrong-bin no-strip case (its `'rk — …'` input with bin `'wt'` documents non-match — reframe consistently) and generic cases <!-- R10 -->
- [x] T017 [P] `sites/astro-starlight-terminal1/scripts/terminal-toolcard.test.mjs`: run-kit-mirroring `stripToolPrefix` case + comment `'rk — tmux …'`/`'rk'` → `'run-kit — tmux …'`/`'run-kit'`; KEEP the `'rkward stuff'` no-strip guard as-is <!-- R10 -->

### Phase 5: Code comments (lib/components)

- [x] T018 [P] `sites/astro-starlight-terminal1/src/lib/schemas.ts`: `tool` field example `("wt", "rk", "fab")` → `("wt", "run-kit", "fab")` <!-- R11 -->
- [x] T019 [P] `sites/astro-starlight-terminal1/src/lib/llms.ts`: doc comment `root.short` `"rk — tmux …"` → `"run-kit — tmux …"`; doubling example `[run-kit]: rk — tmux …` → `[run-kit]: run-kit — tmux …` <!-- R11 -->
- [x] T020 [P] `sites/astro-starlight-terminal1/src/lib/terminal-toolcard.ts`: doc comment `root.short` `"rk — tmux …"` → `"run-kit — tmux …"`; doubling example `run-kit — rk — tmux …` → `run-kit — run-kit — tmux …` <!-- R11 -->
- [x] T021 [P] `sites/astro-starlight-terminal1/src/lib/parse-help.ts`: 4 comment `rk riff --layout` / `rk riff` examples → `run-kit riff …` <!-- R11 -->
- [x] T022 [P] `sites/astro-starlight-terminal1/src/components/CommandIndex.astro`: comment `path: string; // e.g. "rk riff"` → `"run-kit riff"` <!-- R11 -->
- [x] T023 [P] `sites/astro-starlight-terminal1/src/components/CommandReference.astro`: CSS comment `rk riff --layout` → `run-kit riff --layout` <!-- R11 -->

### Phase 6: Specs

- [x] T024 [P] `docs/specs/help-dump-contract.md`: envelope+node comments `(wt, rk, fab)` and `"rk riff"` → run-kit forms; §5 discovery `rk riff` nested-subcommand mentions → `run-kit riff`; the "three names" paragraph (~line 166) rewritten (run-kit's three names align; note v3.0.0 rename + rk symlink alias; fab-kit is the divergence example); teardown `<tool>` example list `wt, rk, fab` → `wt, run-kit, fab` <!-- R12 -->
- [x] T025 [P] `docs/specs/readme-extraction-contract.md`: §9 table row `| run-kit | rk |` binary column → `run-kit` <!-- R12 -->

### Phase 7: Verify

- [x] T026 Run the test suites: `cd sites/astro-starlight-terminal1 && node --test scripts/*.test.mjs` — all must pass <!-- R9 R10 -->
- [x] T027 Grep the edited surfaces for stray `rk` word-boundary refs (only the intended alias affordances + frozen fixture content should remain); confirm `git status` shows no puller-owned files (`help/`, `content/`) modified <!-- R1 -->

## Execution Order

- Phase 4: T012 (`git mv`) SHOULD precede T014 (the test that loads the renamed fixture) and T026 (test run), so the file exists at its new path before tests run.
- T026 (test run) and T027 (grep + git status) run last, after all edits.
- All `[P]` tasks within a phase touch distinct files and may run in parallel.

## Acceptance

### Functional Completeness

- [x] A-001 R1: Every hand-authored surface asserting run-kit's formula/binary is `rk` now reads `run-kit` (or describes `rk` only as the short alias)
- [x] A-002 R3: `refresh-help.yml` triple is `run-kit:run-kit:run-kit` and its comment table row reads `run-kit -> run-kit -> run-kit` with fab-kit as the divergence example
- [x] A-003 R4: `refresh-readme.yml` no longer claims run-kit's binary/formula is `rk`
- [x] A-004 R5: `install.md`/`daily-flow.md`/`new-change.md`/`overview.mdx` invoke `run-kit <cmd>`; `index.mdx` transcript reads `==> [4/6] run-kit`
- [x] A-005 R6: `VersionTable` run-kit label is `'run-kit'` and the doc comment reflects the aligned identity
- [x] A-006 R8: `ToolsIndex.astro` + `astro.config.mjs` comments no longer frame `rk` as run-kit's distinct binary
- [x] A-007 R11: `schemas.ts`/`llms.ts`/`terminal-toolcard.ts`/`parse-help.ts`/`CommandIndex.astro`/`CommandReference.astro` comments read the run-kit canonical forms
- [x] A-008 R12: `help-dump-contract.md` + `readme-extraction-contract.md` record run-kit's aligned names and use fab-kit as the slug≠binary example

### Behavioral Correctness

- [x] A-009 R2: All `rk` alias affordances in `TerminalPrompt.astro` (key, dispatch, cheatsheet fold, `run-kit · rk` label, Tab-completion, typed demo command) are behaviorally unchanged; only descriptive prose reframed
- [x] A-010 R6: `labelPad('run-kit')` yields ≥1 space (9−7 = 2) — column alignment preserved
- [x] A-011 R7: `TerminalPrompt.astro` simulated-output lines read `run-kit dashboard`; "binary name" claims read "short alias"
- [x] A-012 R10: `stripToolPrefix` run-kit-mirroring cases assert the `run-kit` prefix/bin; the transform code is unchanged (still live — v3.0.0 short is still binary-prefixed)

### Removal Verification

- [x] A-013 R9: `scripts/fixtures/rk-riff.txt` no longer exists; `run-kit-riff.txt` exists with byte-identical content (sha256 match); manifest + test reference the new name

### Scenario Coverage

- [x] A-014 R9 R10: `node --test scripts/*.test.mjs` passes (parse-help loads `run-kit-riff.txt`; llms/terminal-toolcard assert the run-kit-prefixed short); exact output summarized
- [x] A-015 R1: No stray `rk` word-boundary references remain in edited surfaces beyond the intended alias affordances + frozen fixture content

### Edge Cases & Error Handling

- [x] A-016 R9: Frozen-fixture content is unchanged — parse-help's content-pinned assertions (`cmd[=__rk_riff_pane_bare__]`, `rk riff` usage/desc) still pass against the renamed file

### Code Quality

- [x] A-017 Pattern consistency: Edits follow surrounding comment/prose style; the `rk` vs `run-kit` reframing is uniform across surfaces
- [x] A-018 No unnecessary duplication: No new utilities introduced; existing roster/transform code reused unchanged
- [x] A-019 No puller-owned files touched: `git status` shows no changes under `help/` or `content/`; no memory files edited during apply

## Notes

- Check items as you review: `- [x]`
- The vn39 cross-check window is transient and un-gated for site prose (the CI reporter runs only on pulled READMEs); the ship-stage puller dispatch closes it.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Fixture `rk-riff.txt` → `run-kit-riff.txt` via `git mv`, byte-identical content; frozen-content test assertions (`rk riff` usage, `cmd[=__rk_riff_pane_bare__]`) stay unchanged | Intake §4 + fixtures README: deliberately frozen v2.5.3 specimen; tests pin content not filename; re-freeze impossible pre-corpus-refresh | S:90 R:85 A:95 D:90 |
| 2 | Certain | Keep all `rk` alias affordances in `TerminalPrompt.astro`; reframe only "binary name" prose + `rk dashboard` simulated-output lines | Intake §3 explicit keep/update list; the brew formula still ships the `rk` symlink so alias-typers are real | S:85 R:80 A:90 D:85 |
| 3 | Certain | `install.md` "rk-owned entries" prose also flips to "run-kit-owned" (beyond the two lines the intake enumerates verbatim) | Same paragraph, same `rk agent-setup` referent; leaving it half-flipped would be internally inconsistent — a mechanical extension of the stated edit | S:80 R:90 A:85 D:80 |
| 4 | Confident | `help-dump-contract.md` teardown example `Replace <tool> with the binary name (e.g. wt, rk, fab)` updated `rk` → `run-kit` | `rk` is now a symlink alias, not the canonical binary; the example should name the canonical binary run-kit invokes | S:70 R:85 A:80 D:75 |
| 5 | Confident | The `llms.test.mjs` wrong-bin no-strip case (input `'rk — …'`, bin `'wt'`) reframed to `'run-kit — …'`/`'wt'` to keep it mirroring run-kit's real short consistently | It exists to document the wrong-bin no-strip path against run-kit's real short; keeping it `rk`-based would leave a stale run-kit short in a run-kit-mirroring case | S:60 R:85 A:75 D:65 |

5 assumptions (3 certain, 2 confident, 0 tentative).
