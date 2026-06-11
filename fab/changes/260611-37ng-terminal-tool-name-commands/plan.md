# Plan: Terminal Tool-Name Commands

**Change**: 260611-37ng-terminal-tool-name-commands
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

### Homepage Terminal: Tool-Name Cards

#### R1: Bare tool name prints a mechanically-sourced card
Typing a bare tool name (`idea`, `hop`, `fab-kit`, `wt`, `run-kit`, `tu`) — or a binary alias (`rk`, `fab`) — in the homepage terminal MUST print that tool's card, mechanically sourced from `help/<slug>.json`, per the user-approved mock: header `{tool} — {root.short}` (`shell-out`, NOT the hand-written `SYNOPSIS`), dim `usage: {root.usage}` line, a blank line, one two-space-indented padded line per subcommand (`commands[].name` padded to a named column width, then that entry's `short`, ellipsis-truncated to the ~76-char width budget), a named-constant subcommand cap (`TOOLCARD_SUB_CAP = 8`) with a dim `(+N more — see commands)` tail when exceeded, then a blank line and the nav line (`shell-out shell-dim`, `html: true`): `docs: <a>/tools/{tool}/overview</a> · <a>readme</a> · <a>commands</a>     get it: <a>install</a>` with real anchors to `ROUTE_OVERVIEW(tool)`, `/tools/{tool}/readme/`, `/tools/{tool}/commands/`, and `ROUTE_INSTALL`. A tool with zero subcommands (`tu`) renders header + usage + nav line only — no empty block, no `(+0 more)`. All card lines are announced (no `ariaHidden`).

- **GIVEN** the activated terminal and a committed valid `help/hop.json`
- **WHEN** the visitor types `hop` and presses Enter
- **THEN** the card prints: `hop — locate, open, and operate on repos from hop.yaml.`, `usage: hop [flags]`, a blank line, 7 padded subcommand lines, a blank line, and the nav line with four working anchors
- **AND** nothing navigates — no timer, no nav beat (the card informs in place)

- **GIVEN** `help/tu.json` (zero `commands[]`)
- **WHEN** the visitor types `tu`
- **THEN** the card is header + usage + nav line only

#### R2: Build-time data path — zero runtime fetches (Constitution I)
`TerminalPrompt.astro`'s frontmatter MUST read the repo-root `help/*.json` documents at build time (resolving the repo root by ascending from `import.meta.url` via the shared `repoRootFromModuleUrl` — the VersionTable precedent), validate each against `HelpDocSchema` via `safeParse`, slim each to `{ short, usage, commands: [{ name, short }] }` (normalizations of R4 applied build-time), and emit exactly ONE `<script is:inline type="application/json" data-terminal-help>` element in the component's own template carrying the payload keyed by tool slug for all 7 tools. The island MUST locate the element by the data attribute and `JSON.parse` it at activation (the `versionRowsHtml` capture-at-init precedent). `index.mdx` MUST stay completely untouched; no runtime fetch anywhere.

- **GIVEN** a production `pnpm build`
- **WHEN** the built homepage HTML is inspected
- **THEN** it contains exactly one `data-terminal-help` JSON element whose payload has entries for all 7 tool slugs and no full `text` fields

#### R3: Per-tool graceful degrade
A missing or schema-invalid `help/<slug>.json` MUST degrade that tool only — the frontmatter skips it (omitted from the payload; never a build failure — VersionTable remains the build's defect gate) and that tool's card falls back to the existing `SYNOPSIS` line + nav line only. The island MUST guard the payload parse (absent element / malformed JSON / non-object → empty record), in which case ALL tools degrade to the same fallback. The fallback path never crashes the prompt.

- **GIVEN** a payload missing the `wt` entry
- **WHEN** the visitor types `wt`
- **THEN** the output is `wt — {SYNOPSIS.wt}` plus the nav line, and a fresh prompt follows

#### R4: Mechanical normalizations (vn39-clean pure transforms)
The data pipeline MUST strip (a) a leading `Usage:` prefix (case-insensitive) from `root.usage` (tu's doc carries one — avoids `usage: Usage: tu …`) and (b) a redundant leading `{doc.tool} — ` from `root.short` (run-kit's `"rk — tmux session manager with web UI"` — avoids `run-kit — rk — tmux …`). Both are exported pure functions in the lib, applied build-time in the frontmatter (where `doc.tool` is known); `buildToolCard` re-applies the usage strip defensively (idempotent).

- **GIVEN** `help/run-kit.json` with `root.short = "rk — tmux session manager with web UI"` and `tool = "rk"`
- **WHEN** the payload is built and `run-kit` (or `rk`) is typed
- **THEN** the header reads `run-kit — tmux session manager with web UI`

#### R5: Eight new COMMANDS keys + the shll nav-line append (52 → 60)
`COMMANDS` MUST gain six tool keys in canonical `TOOLS` order then two aliases — `idea`, `hop`, `fab-kit`, `wt`, `run-kit`, `tu`, `rk` (→ run-kit's card), `fab` (→ fab-kit's card) — appended AFTER `cheatsheet` (the last existing key), all built by ONE shared handler factory (the `editorHandler`/`denyNetwork` precedent). The `shll` handler MUST keep its splash unchanged and gain the same nav line appended after the tip line — the one edit to an existing handler. Handlers return plain `Line[]` through the normal `print` path (no new prompt-emitting path). Tab-completion, the suggester, and the cheatsheet coverage check pick the keys up via `Object.keys(COMMANDS)` with zero wiring; `cd`/`open`/`man`/`install`, `TOOL_ARG_COMMANDS`, and the nav beat stay untouched.

- **GIVEN** the visitor types `rk`
- **WHEN** the handler dispatches
- **THEN** run-kit's card prints (identical to typing `run-kit`)

- **GIVEN** the visitor types `shll`
- **WHEN** the splash prints
- **THEN** the art/pitch/tip lines are byte-identical to before, with the nav line appended last

#### R6: Subcommand argument lookup
`{tool} <sub>` MUST lowercase the first argument and match it against the doc's `commands[].name` (case-insensitive). On a hit: print that ONE subcommand line (same padded shape, via the lib) plus a dim see-more anchor to `/tools/{tool}/commands/`. On a miss, no args, or a degraded tool: the full card (or fallback). Never pretend to execute anything.

- **GIVEN** the visitor types `hop clone`
- **WHEN** the handler dispatches
- **THEN** exactly one padded `clone` line prints plus `see: /tools/hop/commands/` as a real anchor

- **GIVEN** the visitor types `hop nonsense`
- **WHEN** no `commands[].name` matches
- **THEN** the full hop card prints

#### R7: Cheatsheet `tools` group + alias folding
`CHEATSHEET_GROUPS` MUST gain a new group `tools` placed FIRST (before `navigate`) listing the six tool keys with aliases folded into decorated displays (`fab-kit · fab`, `run-kit · rk`); `CHEATSHEET_ALIASES` MUST gain `rk: 'run-kit'` and `fab: 'fab-kit'` so the aliases count as covered and are never listed on their own. `shll` STAYS in `classics`. With this grouping the runtime coverage check yields NO `uncategorized` group for the 60-key roster.

- **GIVEN** the visitor types `cheatsheet`
- **WHEN** the sheet renders
- **THEN** the first group is `tools` with `idea · hop · fab-kit · fab · wt · run-kit · rk · tu` and no `uncategorized` group appears

#### R8: HELP_DETAIL entries; bare `help` byte-identical
`HELP_DETAIL` MUST gain entries for all 8 new keys (appended after `cheatsheet`'s, the last entry), in the established `helpDetail(usage, detail)` shape; alias entries point at their primary (`rk — run-kit's card, by its binary name` shape). `help hop`, `man rk`, Tab, and the suggester thereby work with zero extra wiring. The bare `help` output MUST change NOT AT ALL — neither the curated 13-command list nor the cdbr footer tip. `CHIP_COMMANDS`, the greeting, and the ghost hint: unchanged.

- **GIVEN** the visitor types `man fab`
- **WHEN** `fab` is not in `TOOLS`
- **THEN** the o33t bridge answers from `HELP_DETAIL.fab`

#### R9: Pure-logic lib + node --test suite
A new dependency-free `src/lib/terminal-toolcard.ts` MUST own the card assembly: `buildToolCard(tool, doc, opts?)` returning `{kind, text}` line descriptors (no HTML/classes), `findSubcommand(doc, name)`, `formatSubcommandLine(name, short, opts?)`, the normalization functions, and the named constants (`TOOLCARD_SUB_CAP = 8`, `TOOLCARD_NAME_COL = 12`, `TOOLCARD_LINE_WIDTH = 76`). It MUST tolerate missing fields (absent `short`/`usage`/`commands` degrade to omitted lines, never a crash — the payload crosses a JSON boundary, the lib trusts nothing). `scripts/terminal-toolcard.test.mjs` (`node --test`, native TS type-stripping) MUST pin: the full card shape from a fixture, name-column padding (incl. the ≥col-width single-space case), short truncation with ellipsis, the cap + `(+N more — see commands)` tail, zero-subcommand and missing-fields tolerance, both normalizations, the subcommand lookup (hit, miss, case), and the empty-doc → `[]` fallback trigger.

- **GIVEN** `node --test scripts/terminal-toolcard.test.mjs`
- **WHEN** the suite runs
- **THEN** all tests pass

#### R10: Standing invariants
The change MUST uphold: `index.mdx` completely untouched; `.shell-*` classes only (no new CSS; `terminal.css` untouched); exactly-one-trailing-prompt (no new prompt-emitting path); zero new dependencies; new keys appended after all existing keys in BOTH `COMMANDS` and `HELP_DETAIL`; `Object.hasOwn` own-property guards on user-keyed record lookups AND on the JSON-parsed payload record; all widths/caps as named constants; house comments referencing change `37ng`.

- **GIVEN** the completed implementation
- **WHEN** `git diff --stat` is inspected
- **THEN** `index.mdx`, `terminal.css`, and `package.json` show no changes

#### R11: Verification
From `sites/astro-starlight-terminal1/`: `node --test` MUST pass for `terminal-toolcard`, `terminal-cheatsheet`, `terminal-eggs`, and `terminal-suggest`; `pnpm build` MUST succeed; the BUILT homepage (dist/) MUST contain the `data-terminal-help` element with all 7 tools. parse-help's 3 pre-existing failures are out of scope.

- **GIVEN** the full implementation
- **WHEN** the four suites + the new one + `pnpm build` run
- **THEN** all pass, and the dist homepage payload carries 7 slug keys

### Non-Goals

- Any change to bare `help` output (the cdbr footer splice stays the one sanctioned change, untouched).
- `cd`/`open`/`man`/`install`, `TOOL_ARG_COMMANDS`, the nav beat; second-token Tab completion for the new keys.
- Flags rendering, recursive subcommand trees, any `parse-help.ts` parsing — the card uses only `short`/`usage`/`commands[].{name,short}`.
- Sourcing `shll`'s splash from json (splash stays hand-written; only the nav line is appended).
- The pipes/VFS draft `260610-42my`; parse-help's 3 pre-existing test failures.

### Design Decisions

1. **Normalization functions live in the lib, applied build-time**: the frontmatter knows `doc.tool` (the binary name, needed for the short-prefix strip); the slim payload doesn't carry it — so the short strip is build-time-only, while `buildToolCard` re-applies the (binary-independent, idempotent) usage strip defensively. — *Why*: reconciles "normalizations applied build-time" with "the lib owns the normalizations" — the lib defines them (testable), the frontmatter applies them. — *Rejected*: carrying the binary name in the payload (dead weight for one build-time-only transform).
2. **Frontmatter enumerates `help/*.json` via `readdirSync`**, not a second roster const — *Why*: the island's `TOOLS` is unreachable from frontmatter; a duplicate roster is drift risk; the directory listing IS the collection. — *Rejected*: a `TOOL_SLUGS` frontmatter const (drift).
3. **Lib descriptors carry the final rendered text (incl. the 2-space indent for sub/more lines)**; the island maps `kind` → classes only — *Why*: the lib owns all width math (padding, truncation, budget), so tests pin exact rendered text. — *Rejected*: island-side indent (splits the width budget across two files).
4. **Header line is clamped to the same 76-char budget** (idea's `root.short` makes the header 80 chars) — *Why*: the horizontal-scroll rationale applies to every card line, not just sub lines. — *Rejected*: unclamped header (clips under `white-space: pre`).

## Tasks

### Phase 1: Setup

- [x] T001 Create `sites/astro-starlight-terminal1/src/lib/terminal-toolcard.ts`: `ToolHelpDoc` type, `TOOLCARD_SUB_CAP`/`TOOLCARD_NAME_COL`/`TOOLCARD_LINE_WIDTH` constants, `stripUsagePrefix`, `stripToolPrefix`, `formatSubcommandLine`, `buildToolCard`, `findSubcommand` — dependency-free, missing-fields tolerant <!-- R1 R4 R9 -->
- [x] T002 Create `sites/astro-starlight-terminal1/scripts/terminal-toolcard.test.mjs` (`node --test`): full-card fixture shape, padding, truncation+ellipsis, cap+more tail, zero-sub/missing-fields tolerance, normalizations, sub lookup (hit/miss/case), empty-doc fallback trigger <!-- R9 -->

### Phase 2: Core Implementation

- [x] T003 `TerminalPrompt.astro` frontmatter: build-time read of repo-root `help/*.json` (readdir + `repoRootFromModuleUrl` + `HelpDocSchema.safeParse`, per-tool skip on missing/invalid), slim payload with build-time normalizations, `<` escaping; emit the ONE `<script is:inline type="application/json" data-terminal-help>` template element <!-- R2 R3 R4 -->
- [x] T004 Island: `ROUTE_README`/`ROUTE_COMMANDS` constants beside `ROUTE_OVERVIEW`; guarded payload parse at activation (`TOOL_HELP`, absent/malformed → `{}`); `toolNavLine(slug)` helper (html: true trusted-static anchors) <!-- R2 R3 -->
- [x] T005 Island: `toolCardHandler(slug)` shared factory — `Object.hasOwn` payload lookup, sub-arg lookup via `findSubcommand` (one padded line + see-more anchor), full card via `buildToolCard` + kind→class mapping + blank + nav line, SYNOPSIS+nav fallback; append the 8 `COMMANDS` keys after `cheatsheet` <!-- R5 R6 R3 -->
- [x] T006 Island: append `toolNavLine('shll')` to the `shll` splash handler after the tip line (splash otherwise byte-identical) <!-- R5 -->

### Phase 3: Integration & Edge Cases

- [x] T007 Island: insert cheatsheet group `tools` FIRST in `CHEATSHEET_GROUPS` (six keys, `fab-kit · fab` / `run-kit · rk` displays); add `rk`/`fab` to `CHEATSHEET_ALIASES`; update the surrounding house comment <!-- R7 -->
- [x] T008 Island: append 8 `HELP_DETAIL` entries after `cheatsheet`'s (six via a small `toolCardHelp(slug)` factory beside `helpDetail`, two hand-written alias entries pointing at their primaries); bare `help` handler untouched <!-- R8 -->

### Phase 4: Verification

- [x] T009 Run `node --test scripts/terminal-toolcard.test.mjs scripts/terminal-cheatsheet.test.mjs scripts/terminal-eggs.test.mjs scripts/terminal-suggest.test.mjs` from `sites/astro-starlight-terminal1/` — all green <!-- R11 -->
- [x] T010 `pnpm build` from `sites/astro-starlight-terminal1/`; verify the dist homepage contains the `data-terminal-help` element with all 7 tool slugs; `git status` confirms `index.mdx`/`terminal.css`/`package.json` untouched <!-- R11 R10 -->

## Acceptance

### Functional Completeness

- [x] A-001 R1: Typing each of `idea`/`hop`/`fab-kit`/`wt`/`run-kit`/`tu` prints the mock-shaped card (header from `root.short`, dim usage, padded subs, cap+tail, nav line); `tu` renders header+usage+nav only
- [x] A-002 R2: The frontmatter reads `help/*.json` build-time (ascend resolution, `safeParse`), emits ONE `data-terminal-help` JSON element with the slim 7-tool payload; the island parses it at activation; no runtime fetch
- [x] A-003 R5: All 8 new `COMMANDS` keys exist after `cheatsheet`, built by one shared factory; `rk`/`fab` print their primary's card; `shll` splash gains the nav line only
- [x] A-004 R6: `{tool} <sub>` prints one padded line + see-more anchor on a name hit; full card otherwise
- [x] A-005 R7: `cheatsheet` shows the `tools` group first with folded alias displays and no `uncategorized` group
- [x] A-006 R8: All 8 keys answer `help <key>` and `man <key>`; the bare `help` output is byte-identical
- [x] A-007 R9: `terminal-toolcard.ts` + `terminal-toolcard.test.mjs` exist and the suite passes

### Behavioral Correctness

- [x] A-008 R4: `tu`'s card shows `usage: tu [source] [period] [display]` (no double `Usage:`); `run-kit`'s header shows `run-kit — tmux session manager with web UI` (no `rk — ` doubling)
- [x] A-009 R5: Bare tool names inform in place — no navigation, no timer; `cd hop` still runs the cuur nav beat; `man hop` still prints the hand-written SYNOPSIS

### Scenario Coverage

- [x] A-010 R9: Tests pin card shape, padding, truncation, cap arithmetic, normalizations, sub lookup case-insensitivity, and missing-fields tolerance
- [x] A-011 R3: A degraded tool (absent from payload) and a malformed payload both fall back to SYNOPSIS+nav without throwing

### Edge Cases & Error Handling

- [x] A-012 R3: A missing/invalid `help/<slug>.json` never fails the build (per-tool skip); the island parse guard returns `{}` on absent element or bad JSON
- [x] A-013 R1: A subcommand name ≥ the name column width keeps a single separating space; an over-budget short truncates with a trailing ellipsis at the 76-char line budget

### Code Quality

- [x] A-014 Pattern consistency: new code follows the island's established conventions (named constants, shared handler factories, house comments with change id, helpDetail shape, lib+test extraction pattern)
- [x] A-015 No unnecessary duplication: reuses `repoRootFromModuleUrl`, `HelpDocSchema`, `helpDetail`, `ROUTE_OVERVIEW`/`ROUTE_INSTALL`, the cheatsheet lib; one nav-line helper serves all 7 tools + shll
- [x] A-016 No magic strings/numbers: `TOOLCARD_SUB_CAP`/`TOOLCARD_NAME_COL`/`TOOLCARD_LINE_WIDTH` and route builders are named constants
- [x] A-017 R10: `index.mdx` and `terminal.css` byte-identical; zero new dependencies; `Object.hasOwn` guards on the payload lookup; keys appended after existing in both records

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`

## Deletion Candidates

- `TerminalPrompt.astro` `helpFor` — the `isTool(topic)` branch (`help: no help for '{topic}' — try 'man {topic}'`) is now unreachable: all 7 `TOOLS` keys have `HELP_DETAIL` entries (shll's pre-existing, the six tools' added by 37ng), and the `HELP_DETAIL` lookup wins first. Dead branch — removable in a follow-up, harmless in place.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Confident | The payload embeds ALL 7 tools (incl. `shll`, whose card data the splash handler doesn't render today) | Dispatch verification requires 7 in dist; uniform roster, ~few hundred extra bytes; intake §2 said "six" but the 7-tool read is the more detailed instruction | S:70 R:95 A:85 D:75 |
| 2 | Confident | Normalization split: lib exports `stripUsagePrefix`/`stripToolPrefix`; frontmatter applies both build-time (binary name known there); `buildToolCard` re-applies only the usage strip (idempotent, binary-independent) | Reconciles "normalizations applied build-time" with "lib owns the normalizations"; slim payload omits the binary name | S:75 R:90 A:90 D:80 |
| 3 | Confident | Frontmatter enumerates `help/*.json` via `readdirSync` rather than a duplicate roster const | The island's `TOOLS` is unreachable from frontmatter; the dir listing IS the collection; a stray extra file adds an unreferenced payload entry, harmless | S:65 R:95 A:90 D:75 |
| 4 | Confident | Header line clamped to the same 76-char budget with ellipsis (idea's header would be 80 chars) | The horizontal-scroll rationale (white-space: pre) applies to every card line; intake's truncation text names sub shorts but the budget is "established" | S:60 R:95 A:85 D:75 |
| 5 | Confident | Lib descriptors carry final rendered text incl. the 2-space indent for sub/more lines; island maps kind→class only | All width math in one tested place; the cheatsheet split (island adds indent) predates per-line column math | S:65 R:95 A:85 D:75 |
| 6 | Confident | Fallback = SYNOPSIS line + nav line with no blank between (2 lines) | "SYNOPSIS line + nav line only"; blank adds nothing at 2 lines | S:70 R:98 A:90 D:85 |
| 7 | Confident | Six tool HELP_DETAIL entries via a tiny `toolCardHelp(slug)` factory (uniform copy); `rk`/`fab` hand-written pointing at primaries | Six near-identical entries hand-copied is drift risk; matches the one-body-no-drift ethos; copy implementer-final per intake #14 | S:70 R:95 A:90 D:80 |
| 8 | Confident | Sub-arg see-more line uses the `man` pattern: `see: <a>/tools/{tool}/commands/</a>` | "a dim see-more link to /tools/{tool}/commands/" — tone-matched to the established `see:` voice | S:70 R:95 A:90 D:80 |
| 9 | Certain | Payload JSON serialized with `<` escaped to `\u003c` before `set:html` | Standard script-element injection hygiene for embedded JSON; zero behavioral cost | S:85 R:98 A:95 D:90 |
| 10 | Confident | Nav-line display text shows the overview route without trailing slash (`/tools/hop/overview`), per the approved mock; hrefs use the canonical trailing-slash routes | Mock fidelity (user-approved); anchors are what's load-bearing | S:75 R:98 A:85 D:80 |
| 11 | Certain | `wt` has 7 subcommands today (intake's "real counts" said 5) — no action; the data flows through mechanically | Verified against committed `help/wt.json`; the design is count-independent | S:90 R:98 A:95 D:95 |

11 assumptions (2 certain, 9 confident, 0 tentative).
