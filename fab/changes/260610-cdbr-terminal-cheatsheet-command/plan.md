# Plan: Terminal Cheatsheet Command

**Change**: 260610-cdbr-terminal-cheatsheet-command
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

### Homepage Terminal: the `cheatsheet` command

#### R1: Output shape — the user-approved preview
The terminal SHALL gain a `cheatsheet` command that prints the full command roster, grouped: an opening line `the full roster — you found it.` (`shell-out`), then for each group a blank separator line, a dim category header (`shell-out shell-dim`), and one or more two-space-indented ` · `-joined command lines (`shell-out`), then a blank line and the closing line `(each one: help <command>)` (`shell-comment`). The five fixed category names, in order, are `navigate`, `look around`, `do things (try to)`, `classics`, `real utilities`. Display strings MAY decorate beyond the bare key (`cd <tool>`, `make plan`, `diff plan reality`, `tail -f agents.log`, `echo $VAR`, `grep <pattern>`, `sha256sum <text>`, `man <thing>`). The handler MUST return a plain `Line[]` through the normal `print` path (no stream, no nav, no `ariaHidden` — static meaningful text the cuur live region announces as-is).

- **GIVEN** the live homepage terminal
- **WHEN** the visitor runs `cheatsheet`
- **THEN** the opening line, the five groups (dim header + indented ` · `-joined lines), and the closing shell-comment print in order
- **AND** exactly one trailing prompt follows (the commitLine path, untouched)

#### R2: Anti-drift — `CHEATSHEET_GROUPS` + runtime `uncategorized`
Group membership SHALL live in one `CHEATSHEET_GROUPS` const beside the island's other named constants, with `CHEATSHEET_ALIASES` declaring alias-of keys (`vi → vim`, `more → less`, `:q → exit`). At runtime the handler MUST compute `covered` = all group entry keys ∪ alias keys, and `missing` = `COMMANDS` keys not in `covered`; when `missing` is non-empty it MUST append a final `uncategorized` group listing the missing keys bare, in `COMMANDS` declaration order. A future `COMMANDS` key can never silently vanish from the sheet.

- **GIVEN** a `COMMANDS` key not present in any group entry nor declared as an alias
- **WHEN** `cheatsheet` runs
- **THEN** that key appears under a final `uncategorized` group
- **GIVEN** every `COMMANDS` key is covered by a group entry or alias declaration
- **WHEN** `cheatsheet` runs
- **THEN** no `uncategorized` group renders

#### R3: Stale-entry tolerance
A group entry whose key is not a key of `COMMANDS` MUST be dropped at render (no crash, no ghost listing). A group whose entries are all stale-dropped SHALL be omitted entirely (no orphan header).

- **GIVEN** a `CHEATSHEET_GROUPS` entry referencing a key removed from `COMMANDS`
- **WHEN** `cheatsheet` runs
- **THEN** the stale entry is absent from the rendered sheet and the rest of the group renders normally

#### R4: Coverage rule — every key exactly once, aliases folded
Every `COMMANDS` key (52 after this change) MUST be covered exactly once. `vi`, `more`, and `:q` do NOT display — they are declared alias-of and covered by their primary's entry. `cd · open`, `curl · wget`, and `true · false` display both names adjacent (each its own entry). `cheatsheet` lists itself in `navigate` after `help`. Exact membership follows the intake's coverage table: navigate (10), look around (8), do things (try to) (11), classics (15 displayed + 3 aliases), real utilities (5).

- **GIVEN** the shipped `CHEATSHEET_GROUPS` + `CHEATSHEET_ALIASES` and the post-change `COMMANDS`
- **WHEN** `cheatsheet` runs
- **THEN** no `uncategorized` group renders (full coverage) and no key appears twice

#### R5: Width-budget chunking
Group command lines MUST be chunked greedily to a line-width budget so the session's `white-space: pre` doesn't force horizontal scroll on laptop widths (the GREETING precedent): joined text ≤ 74 chars per line (+ the 2-space indent = 76 total). A token is never split across lines, even when a single token exceeds the budget.

- **GIVEN** the classics group (15 displayed entries)
- **WHEN** `cheatsheet` renders it
- **THEN** it wraps to two indented lines, the first ending at `sl` (74 joined chars — the approved preview's exact chunking)

#### R6: Pure-logic extraction — `src/lib/terminal-cheatsheet.ts`
The coverage/alias/stale-drop computation (`buildCheatsheet(groups, aliases, commandKeys)`) and the width chunking (`chunkLine(tokens, sep, maxWidth)`) SHALL live in a new dependency-free `src/lib/terminal-cheatsheet.ts` (Vite bundles it into the island), pinned by `scripts/terminal-cheatsheet.test.mjs` under `node --test` with native TS type-stripping — the exact `terminal-suggest.ts` / `terminal-eggs.ts` pattern. The island keeps only the const data and the `Line[]` assembly. Tests MUST pin at minimum: full coverage → no `uncategorized`; an uncovered key → appears in `uncategorized`; alias-of keys not flagged missing; a stale group key dropped at render without crashing; `display` defaulting to `key`; chunking respects the width budget and never splits a token.

- **GIVEN** `sites/astro-starlight-terminal1/`
- **WHEN** `node --test scripts/terminal-cheatsheet.test.mjs` runs
- **THEN** all tests pass with zero new dependencies

#### R7: Discovery wiring — footer tip + `HELP_DETAIL`
The bare `help` footer tip is THE one sanctioned change to `help` output: `tip: a few commands aren't on this list. a curious dev might try the obvious ones — or type 'cheatsheet' for everything.` (same single `shell-comment` line, splice at the period; the curated 13-command list above stays byte-identical — `cheatsheet` is NOT added to it). `HELP_DETAIL` SHALL gain a `cheatsheet` entry appended after `tail`'s (the last entry): usage `cheatsheet — the full command roster, grouped`, detail `everything, including what 'help' won't admit to.` — giving `help cheatsheet`, `man cheatsheet` (the o33t bridge), Tab-completion, and the did-you-mean suggester pickup with zero extra wiring.

- **GIVEN** the live terminal
- **WHEN** the visitor runs bare `help`
- **THEN** the curated list is unchanged and the footer tip carries the appended cheatsheet pointer
- **GIVEN** the live terminal
- **WHEN** the visitor runs `help cheatsheet` or `man cheatsheet`
- **THEN** both print the same `HELP_DETAIL.cheatsheet` entry

#### R8: Invariants (the standing o33t set)
The change MUST NOT touch `index.mdx` (byte-identical), MUST use only existing `.shell-*` classes (no new CSS), MUST NOT add a prompt-emitting path (exactly-one-trailing-prompt untouched), MUST add zero new dependencies, MUST append the new key after all existing keys in BOTH `COMMANDS` and `HELP_DETAIL` (after `tail` — the suggester tie-break convention), and MUST keep the `Object.hasOwn` own-property guarantee for membership tests against `COMMANDS` (satisfied via `Object.keys(COMMANDS)`, which returns own properties only). House comments reference "change cdbr".

- **GIVEN** the change's diff
- **WHEN** reviewed
- **THEN** only `TerminalPrompt.astro`, the new lib, and the new test file are touched; `cheatsheet` is the last key in both records

#### R9: Verification
From `sites/astro-starlight-terminal1/`: `node --test scripts/terminal-cheatsheet.test.mjs`, `node --test scripts/terminal-eggs.test.mjs`, `node --test scripts/terminal-suggest.test.mjs`, and `pnpm build` MUST all pass (parse-help's 3 pre-existing failures are out of scope).

- **GIVEN** the completed implementation
- **WHEN** the three suites and the build run
- **THEN** all pass

### Non-Goals

- Any other change to `help` output — the footer-tip splice is the entirety
- Changing the empty-prompt Tab listing (it gains the `cheatsheet` token automatically and otherwise stays as-is)
- New CSS, `index.mdx` edits, chip-roster changes, per-command descriptions on the sheet
- Anything from the speculative pipes/VFS draft `260610-42my`

### Design Decisions

1. **Lib takes `commandKeys: string[]`, not the `COMMANDS` record** — matches the intake's proposed surface; membership via a `Set` built from `Object.keys(COMMANDS)`, which only returns own properties, so the o33t own-property guarantee holds without coupling the lib to the record shape. — *Rejected*: passing the record and using `Object.hasOwn` inside the lib (couples the pure lib to the island's record type for no behavioral gain).
2. **Width budget = 74 joined chars (+2 indent = 76 total)** — reproduces the approved preview's classics chunking exactly (its first line is 74 joined chars ending at `sl`); navigate (87 joined chars with all 10 entries) wraps by the same rule. One greedy rule, no special-casing. — *Rejected*: a larger budget to keep navigate on one line (would clip into horizontal scroll on laptop widths, the documented GREETING concern).
3. **All-stale groups dropped entirely** — an orphan dim header over nothing is broken output; dropping is the graceful degradation consistent with stale-entry tolerance.

## Tasks

### Phase 1: Core Implementation

- [x] T001 Create `sites/astro-starlight-terminal1/src/lib/terminal-cheatsheet.ts`: `CheatEntry`/`CheatGroup` types, `UNCATEGORIZED` const, `buildCheatsheet(groups, aliases, commandKeys)` (covered = group keys ∪ alias keys; stale-drop via Set membership; all-stale groups omitted; `missing` appended as `uncategorized` in declaration order; `display ?? key`), and `chunkLine(tokens, sep, maxWidth)` (greedy, never splits a token). Dependency-free, doc-comment style matching terminal-eggs.ts, "change cdbr" attribution. <!-- R2 R3 R4 R5 R6 -->
- [x] T002 Create `sites/astro-starlight-terminal1/scripts/terminal-cheatsheet.test.mjs` (`node --test`, native TS type-stripping import — the eggs/suggest pattern): full coverage → no uncategorized; uncovered key → in uncategorized (declaration order); alias keys not flagged missing; stale entry dropped without crashing; all-stale group omitted; display defaults to key / decorates when given; chunkLine one-line-within-budget, greedy wrap, exact-boundary fit, never-split-token, empty input. <!-- R6 -->

### Phase 2: Island Wiring

- [x] T003 In `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro`: add the lib import beside the eggs import; add module-scope `CHEATSHEET_GROUPS` (five groups per the intake's coverage table, with the eight decorated displays), `CHEATSHEET_ALIASES` (`vi→vim`, `more→less`, `:q→exit`), and the `CHEAT_LINE_WIDTH = 74` / `CHEAT_SEP = ' · '` named constants, in a `(change cdbr)` section beside the existing constant blocks. <!-- R2 R4 R5 -->
- [x] T004 Add the `cheatsheet` handler to `COMMANDS`, appended after `tail` (the last key): build groups via `buildCheatsheet(CHEATSHEET_GROUPS, CHEATSHEET_ALIASES, Object.keys(COMMANDS))`, assemble `Line[]` per R1 (opening shell-out line; per group a blank line + dim header + chunked indented lines; blank line + closing shell-comment). <!-- R1 R2 R3 R8 -->
- [x] T005 Append `HELP_DETAIL.cheatsheet` after `tail`'s entry (usage + detail copy per R7), and splice the bare-`help` footer tip to `…the obvious ones — or type 'cheatsheet' for everything.` (the one sanctioned help change; list above byte-identical). <!-- R7 R8 -->

### Phase 3: Verification

- [x] T006 From `sites/astro-starlight-terminal1/`: run `node --test scripts/terminal-cheatsheet.test.mjs`, `node --test scripts/terminal-eggs.test.mjs`, `node --test scripts/terminal-suggest.test.mjs`, then `pnpm build`. All pass; fix and re-run on failure (max 3 attempts). <!-- R9 -->

## Acceptance

### Functional Completeness

- [x] A-001 R1: `cheatsheet` prints the opening line, five fixed dim group headers in order, indented ` · `-joined command lines, and the closing `(each one: help <command>)` shell-comment, with blank separator lines — matching the intake's preview shape
- [x] A-002 R2: `CHEATSHEET_GROUPS` + `CHEATSHEET_ALIASES` exist beside the island's named constants; the handler computes uncovered `COMMANDS` keys at runtime and appends them under `uncategorized`
- [x] A-003 R6: `src/lib/terminal-cheatsheet.ts` exists, dependency-free, exporting `buildCheatsheet` and `chunkLine`; the island keeps only const data + `Line[]` assembly
- [x] A-004 R7: the bare `help` footer tip reads `tip: a few commands aren't on this list. a curious dev might try the obvious ones — or type 'cheatsheet' for everything.` and the curated list above it is byte-identical to pre-change
- [x] A-005 R7: `HELP_DETAIL.cheatsheet` exists (appended after `tail`), so `help cheatsheet` and `man cheatsheet` answer from the same entry

### Behavioral Correctness

- [x] A-006 R4: with the shipped consts, every one of the 52 `COMMANDS` keys is covered exactly once — no `uncategorized` group renders, `vi`/`more`/`:q` fold into their primaries, and the cd·open / curl·wget / true·false pairs display adjacent
- [x] A-007 R5: every rendered sheet line fits the 74-joined/76-total budget; classics wraps to two lines with the first ending at `sl` (the preview's chunking)

### Scenario Coverage

- [x] A-008 R2: test pins — full coverage produces no `uncategorized`; an uncovered key lands in `uncategorized` (declaration order preserved)
- [x] A-009 R3: test pins — a stale group key is dropped at render without crashing; an all-stale group is omitted
- [x] A-010 R4: test pins — alias-of keys are counted covered, never flagged missing; `display` defaults to `key`

### Edge Cases & Error Handling

- [x] A-011 R5: test pins — `chunkLine` never splits a token (an over-budget token gets its own line) and returns `[]` for empty input

### Code Quality

- [x] A-012 R8: pattern consistency — new code follows the island's existing idioms (named constants, `(change cdbr)` comment attribution, helpDetail factory, append-after-existing-keys ordering, lib/test file structure mirroring suggest/eggs)
- [x] A-013 R8: no unnecessary duplication — coverage/chunk logic lives only in the lib; group data only in the island; no magic strings/numbers (UNCATEGORIZED, CHEAT_LINE_WIDTH, CHEAT_SEP named)
- [x] A-014 R8: invariants hold — `index.mdx` untouched, no new CSS, no new dependencies, no new prompt-emitting path, `cheatsheet` is the last key in both `COMMANDS` and `HELP_DETAIL`

### Verification

- [x] A-015 R9: `node --test` passes for terminal-cheatsheet, terminal-eggs, and terminal-suggest suites; `pnpm build` succeeds (parse-help's 3 pre-existing failures excluded)

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)

## Deletion Candidates

None — this change adds new functionality without making existing code redundant. (Reviewed explicitly: the empty-prompt Tab dump and the bare-`help` curiosity tease both stay by intake design — `cheatsheet` complements rather than replaces them; no existing symbol, branch, or config lost its last call site.)

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Confident | Width budget = 74 joined chars + 2-space indent (76 total); navigate wraps to two lines (first line through `help`, `cheatsheet` on the wrap line) since its 10 entries join to 87 chars | The approved preview's classics chunk breaks at exactly 74 joined chars — the strongest budget signal; the preview's one-line navigate exceeds its own classics budget, and the intake makes the ~76 budget binding (`GREETING` horizontal-scroll precedent). One greedy rule, no special-casing | S:70 R:95 A:85 D:70 |
| 2 | Confident | Lib signature takes `commandKeys: string[]` with Set membership (island passes `Object.keys(COMMANDS)`) rather than the record + `Object.hasOwn` | The intake's own proposed surface; `Object.keys` returns own properties only, so the o33t own-property guarantee holds; keeps the pure lib decoupled from the record shape | S:75 R:90 A:85 D:75 |
| 3 | Confident | A group whose entries are all stale-dropped is omitted entirely (no orphan header) | Follows from stale-entry tolerance — a dim header over nothing is broken output; unreachable with the shipped data | S:60 R:95 A:85 D:80 |
| 4 | Certain | Blank separator lines use `{ text: '', classes: 'shell-out' }` — the existing help/shll idiom | Direct codebase precedent | S:85 R:95 A:95 D:90 |
| 5 | Certain | `HELP_DETAIL.cheatsheet` copy used verbatim from the intake's proposed entry | The intake supplies it already tone-matched; detail copy is reversible craft | S:85 R:95 A:90 D:85 |
| 6 | Certain | Footer tip wording verbatim per intake (~122-char line accepted; horizontal scroll on narrow viewports is the user's explicit wording choice) | Intake assumption #12 fixed the wording; only the splice point was free and the intake shows it | S:90 R:95 A:90 D:90 |
| 7 | Confident | The runtime `uncategorized` group renders with the same dim-header + chunked indented-line shape as the five named groups | One render path for all groups — anything else would be a second format to keep correct; the intake says "listing the missing keys (bare, declaration order)" which constrains content, not shape | S:70 R:95 A:85 D:80 |

7 assumptions (3 certain, 4 confident, 0 tentative).
