# Plan: Terminal Command Polish & Accessible Output

**Change**: 260610-cuur-terminal-command-polish-accessibility
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

All work lives in `sites/astro-starlight-terminal1/` (the LIVE site). Hard invariants that every requirement below MUST preserve: the exactly-one-trailing-prompt invariant, the `23xc` resting-state top anchor + greeting flow, the byte-identical static no-JS transcript in `src/content/docs/index.mdx`, island-only behavior (progressive enhancement), zero new dependencies (Constitution VI), and dark/light parity via `--c-*` variables only (Constitution V).

### Terminal: Did-you-mean suggestion module

#### R1: Dependency-free suggestion module
A new module `src/lib/terminal-suggest.ts` SHALL export `damerauLevenshtein(a: string, b: string): number` (optimal-string-alignment edit distance where an adjacent transposition counts as 1 edit) and `suggestCommand(input: string, candidates: readonly string[]): string | null`. `suggestCommand` MUST lowercase the input, compute the distance to every candidate, and return the closest candidate whose distance is within the threshold — max distance 1 when `input.length <= 3`, else 2 — or `null` when no candidate qualifies. Tie-break: lowest distance wins; on equal distance, the earlier candidate in iteration order wins. The module MUST be dependency-free (Constitution VI) so Vite can bundle it into the client island and `node --test` can import it directly.

- **GIVEN** the candidate list `Object.keys(COMMANDS)` (which includes `help` and `fortune`)
- **WHEN** `suggestCommand('hlep', candidates)` is called
- **THEN** it returns `'help'` (adjacent transposition = 1 edit; 4-char input → threshold 2)

- **GIVEN** the same candidate list
- **WHEN** `suggestCommand('vi', candidates)` is called
- **THEN** it returns `null` (input length 2 → threshold clamped to 1; no candidate within distance 1)

- **GIVEN** candidates `['cat', 'bat']` and input `'aat'`
- **WHEN** both candidates score equal distance 1
- **THEN** `'cat'` (the earlier candidate) is returned

#### R2: Unit test pins the suggester contract
A new `scripts/terminal-suggest.test.mjs` SHALL test the module under `node --test` using the native TS type-stripping import pattern (`import … from '../src/lib/terminal-suggest.ts'`, mirroring `scripts/extract-readme.test.mjs`). It MUST pin: adjacent transposition = 1 (`hlep`→`help`), the short-input clamp (`vi`→`null`), tie-break order (equal distance → first candidate), no-match→`null`, the acceptance pair `instal`→`install`, and an egg as candidate (`forune`→`fortune`).

- **GIVEN** the new test file
- **WHEN** `node --test scripts/terminal-suggest.test.mjs` runs from the site root
- **THEN** all tests pass

### Terminal: Command UX (`TerminalPrompt.astro`)

#### R3: Did-you-mean wired into the not-found branch
`run()`'s not-found branch SHALL call `suggestCommand(name, Object.keys(COMMANDS))` (eggs included as candidates — a near-miss egg rewards curiosity; the `help` list still never reveals them). When a suggestion exists it replaces the `type 'help'` tail on the same line; otherwise the existing line is unchanged.

- **GIVEN** the live terminal island
- **WHEN** the user runs `instal`
- **THEN** the output is `command not found: instal — did you mean 'install'?`

- **GIVEN** the live terminal island
- **WHEN** the user runs `xyzzy` (no candidate within threshold)
- **THEN** the output is the existing `command not found: xyzzy — type 'help'`

#### R4: `help <command>` argument-aware detail
A new `HELP_DETAIL`-style record (module scope, beside `SYNOPSIS`) SHALL carry a per-command usage line + 1–2 detail lines for EVERY key in `COMMANDS` — listed commands AND hidden eggs (`help sudo` works once found; the top-level list stays short and unchanged). Dispatch: `help` with no args prints the existing list unchanged; `help <arg>` prints `HELP_DETAIL[arg.toLowerCase()]`. Unknown arg → `help: no help for 'xyz'` plus the suggester's `— did you mean '…'?` tail when a suggestion exists. When the arg is a tool name (in `TOOLS`) with no `HELP_DETAIL` entry → `help: no help for 'hop' — try 'man hop'`.

- **GIVEN** the live terminal
- **WHEN** the user runs `help theme`
- **THEN** a usage line (`theme [dark|light] — switch the color theme`) and a detail line print — and the same works for every `COMMANDS` key including `sudo`, `sl`, `:q`

- **GIVEN** the live terminal
- **WHEN** the user runs `help hop` (a tool, not a command)
- **THEN** the output is `help: no help for 'hop' — try 'man hop'`

- **GIVEN** the live terminal
- **WHEN** the user runs `help` with no argument
- **THEN** the existing top-level list prints unchanged (eggs still not enumerated)

#### R5: Intentional navigation beat for `cd` / `open` / `install`
A shared helper (`navigateWithBeat(route, lines)`) SHALL replace the synchronous `window.location.assign` in `navigateTool()` and `install`: it prints context first — for `cd`/`open` the tool's `SYNOPSIS` line; `install` keeps its single line — then `opening <a href>{route}</a> … (Ctrl-C to cancel)` as a real clickable anchor (`html: true`, trusted-static-string pattern as `man`), and schedules `window.location.assign(route)` via `window.setTimeout` with a named constant `NAV_BEAT_MS = 900`. The pending timer id (`pendingNav`) lives at `initTerminal` scope; the existing Ctrl-C branch in `onKeydown` SHALL additionally clear it — a cancelled nav reads as `^C` + fresh prompt, staying on the page. Chip taps (`install` chip from `by18`) flow through the same path and inherit the beat. A new command committed during the beat does NOT cancel the pending nav (it still fires — accepted and documented in a code comment). The beat is a pure `setTimeout` (timing, not animation) — no `prefers-reduced-motion` interaction.

- **GIVEN** the live terminal
- **WHEN** the user runs `cd hop`
- **THEN** the tool synopsis line prints, then `opening /tools/hop/overview/ … (Ctrl-C to cancel)` with a clickable anchor, and navigation fires ~900 ms later

- **GIVEN** a pending nav beat after `cd hop`
- **WHEN** the user presses Ctrl-C within the beat
- **THEN** the timer is cleared, `^C` + a fresh prompt print, and the page does not navigate

- **GIVEN** a pending nav beat
- **WHEN** the user clicks the printed anchor immediately
- **THEN** the browser navigates at once (the impatient path)

### Terminal: Accessibility

#### R6: `aria-live` output announcements
At activation (island only — the no-JS transcript stays inert), the island SHALL set `aria-live="polite"` and `aria-atomic="false"` on `pre.shell-session`, BEFORE printing the greeting (so the greeting announces once on load — the intended SR introduction). In `freshPrompt()`, the new prompt's `$` span (`.shell-prompt`) SHALL get `aria-hidden="true"` so each appended prompt line doesn't announce a stray "$" (the input's existing `aria-label` already carries the prompt semantics; the block cursor span is aria-hidden today).

- **GIVEN** a screen reader user on the activated island
- **WHEN** they run a command and output is appended via `print()`/`printBeforePrompt()`
- **THEN** the output is announced politely after the keystroke settles

- **GIVEN** `freshPrompt()` emits a new prompt line
- **WHEN** the live region processes the addition
- **THEN** no stray "$" is announced (the `.shell-prompt` span is `aria-hidden="true"`)

#### R7: Reduced-motion CSS gate
`terminal.css` SHALL gain one `@media (prefers-reduced-motion: reduce)` block setting `animation: none` for `.shell-session .shell-cursor` (static skin + live cursor), `.shell-session .shell-input-cursor.is-active`, and `.sl-markdown-content > p:first-of-type::after`. Cursors stay VISIBLE, just steady: full opacity when `.is-active` (focused), the existing 0.35 idle opacity otherwise (from the unchanged base rule). Only `animation`/opacity — colors stay on `--c-*` vars, both themes for free (Constitution V). This is the only stylesheet change.

- **GIVEN** `prefers-reduced-motion: reduce` is active
- **WHEN** the homepage (or any doc page with the first-paragraph cursor) renders
- **THEN** no cursor blinks — the terminal block cursor is steady (dim idle / full-opacity focused) and the doc-page `▊` is steady

- **GIVEN** no reduced-motion preference
- **WHEN** the same pages render
- **THEN** the existing blink behavior is unchanged

#### R8: Invariants preserved
The change SHALL NOT alter: the exactly-one-trailing-prompt invariant (no new prompt-emitting path is added — the nav beat and suggester live inside existing command/output flows); the `23xc` resting-state top anchor + greeting; the static transcript in `src/content/docs/index.mdx` (byte-identical); the `COMMANDS` roster (no new commands); the chip roster; dependency count (zero new). New island code follows the component's densely-commented rationale-comment idiom referencing change `cuur`.

- **GIVEN** the implementation is complete
- **WHEN** `git diff` is inspected and the site is built
- **THEN** `index.mdx` is untouched, `package.json` dependencies are unchanged, and only the four files in the Impact list are modified/created

### Non-Goals

- No `COMMANDS` roster changes, no new commands (further eggs are `[o33t]`).
- No edits to the static transcript in `index.mdx`, the chip roster, or `VersionTable`.
- No component test harness for island behavior (none exists; siblings shipped with build + behavioral acceptance) — unit tests cover the extracted suggester only.
- The `[rk7t]` divergence-reporter tuning (unrelated backlog item).

### Design Decisions

1. **Suggester extracted to `src/lib/`, not inlined in the island** — unit-testable under the existing `node --test scripts/*.test.mjs` pattern; Vite bundles it into the island. — *Rejected*: inline (untestable without a DOM harness).
2. **OSA Damerau-Levenshtein (adjacent transposition = 1)** — the classic typo class (`hlep`, `verison`) scores 1; plain Levenshtein would score 2 and miss them at the short-input threshold. — *Rejected*: prefix matching (misses transpositions entirely).
3. **Nav beat = auto-navigate after 900 ms with a clickable anchor + Ctrl-C cancel** — keeps the command's promise (it navigates) while giving a visible, cancellable beat; the anchor is the impatient path, Ctrl-C the stay path. — *Rejected*: link-only (breaks the "command does the thing" shell contract); confirmed in intake assumption #5.
4. **Live region = the session `pre` itself, `aria-atomic="false"`** — announces appended nodes only. — *Rejected*: a parallel visually-hidden mirror region (duplicate DOM, drift risk; intake assumption #6).

## Tasks

### Phase 1: Setup

- [x] T001 Create `sites/astro-starlight-terminal1/src/lib/terminal-suggest.ts` — dependency-free `damerauLevenshtein` (OSA, adjacent transposition = 1) + `suggestCommand` (lowercase input; threshold 1 when `len <= 3` else 2; tie → lowest distance then candidate order; no match → `null`), with a rationale-style module doc comment referencing change `cuur` <!-- R1 -->

### Phase 2: Core Implementation

- [x] T002 Create `sites/astro-starlight-terminal1/scripts/terminal-suggest.test.mjs` (`node --test`, native TS type-stripping import, mirroring `extract-readme.test.mjs`) pinning: `hlep`→`help` transposition=1, `vi`→`null` short-input clamp, tie-break order, no-match→`null`, `instal`→`install`, `forune`→`fortune`; run it and make it pass <!-- R2 -->
- [x] T003 In `TerminalPrompt.astro`: import `suggestCommand` from `../lib/terminal-suggest.ts`; in `run()`'s not-found branch, call it with `Object.keys(COMMANDS)` and replace the `— type 'help'` tail with `— did you mean '<s>'?` when a suggestion exists (existing tail when `null`) <!-- R3 -->
- [x] T004 In `TerminalPrompt.astro`: add module-scope `HELP_DETAIL` record (usage + 1–2 detail lines for EVERY `COMMANDS` key incl. eggs, in the site's voice); extend `COMMANDS.help(args)` — bare → existing list unchanged; known arg → detail; tool name → `help: no help for '<t>' — try 'man <t>'`; unknown → `help: no help for '<x>'` + suggester tail <!-- R4 -->
- [x] T005 In `TerminalPrompt.astro`: add `NAV_BEAT_MS = 900` constant (beside `HINT_DELAY_MS`) and `pendingNav` at `initTerminal` scope; add shared `navigateWithBeat(route, lines)` (context lines + clickable `opening <a>{route}</a> … (Ctrl-C to cancel)` anchor via `html: true`, then `window.setTimeout(assign, NAV_BEAT_MS)`); rewire `navigateTool()` (prepend the tool `SYNOPSIS` line) and `install` through it; clear `pendingNav` in the existing Ctrl-C branch; document that a command committed during the beat does not cancel the pending nav <!-- R5 -->

### Phase 3: Integration & Edge Cases

- [x] T006 In `TerminalPrompt.astro` Activate section: set `aria-live="polite"` + `aria-atomic="false"` on `pre.shell-session` BEFORE printing the greeting; in `freshPrompt()`, set `aria-hidden="true"` on the new `.shell-prompt` `$` span <!-- R6 -->
- [x] T007 In `terminal.css`: add one `@media (prefers-reduced-motion: reduce)` block — `animation: none` for `.shell-session .shell-cursor`, `.shell-session .shell-input-cursor.is-active` (held at full opacity), and `.sl-markdown-content > p:first-of-type::after`; cursors stay visible, steady <!-- R7 -->

### Phase 4: Polish

- [x] T008 Verify: `node --test scripts/terminal-suggest.test.mjs` passes; `pnpm build` passes (island TS type-checks); `git status` confirms only the four Impact files changed (`index.mdx` untouched, no dependency changes) <!-- R8 -->

## Acceptance

### Functional Completeness

- [x] A-001 R1: `src/lib/terminal-suggest.ts` exists, dependency-free, exporting `damerauLevenshtein` (adjacent transposition = 1) and `suggestCommand` with the length-clamped threshold (≤3 chars → 1, else 2), tie-break (lowest distance, then candidate order), lowercased input, `null` on no match
- [x] A-002 R2: `scripts/terminal-suggest.test.mjs` exists and `node --test scripts/terminal-suggest.test.mjs` passes from the site root
- [x] A-003 R3: `run()`'s not-found branch suggests via `suggestCommand(name, Object.keys(COMMANDS))`; `instal` → `command not found: instal — did you mean 'install'?`; no-suggestion input keeps the exact existing `— type 'help'` tail
- [x] A-004 R4: `HELP_DETAIL` covers EVERY `COMMANDS` key (18 keys incl. `exit`/`:q` and all eggs); `help <known>` prints usage + detail; `help` bare output is unchanged; `help <tool>` prints the `try 'man <tool>'` sideways hint; `help <unknown>` prints `no help for` + suggester tail when available
- [x] A-005 R5: `cd`/`open` print synopsis + clickable `opening … (Ctrl-C to cancel)` anchor and navigate after `NAV_BEAT_MS = 900`; `install` keeps one line with anchor + hint; chips inherit the beat
- [x] A-006 R6: at activation the island sets `aria-live="polite"`/`aria-atomic="false"` on `pre.shell-session` before the greeting prints; `freshPrompt()` marks the `$` span `aria-hidden="true"`
- [x] A-007 R7: `terminal.css` has exactly one new `@media (prefers-reduced-motion: reduce)` block gating the three animation selectors; cursors remain visible (steady) under reduce; non-reduce behavior unchanged

### Behavioral Correctness

- [x] A-008 R5: Ctrl-C during the beat clears `pendingNav` (no navigation; `^C` + exactly one fresh prompt); a command committed during the beat does not cancel the pending nav (documented in a comment)
- [x] A-009 R3: the suggester is also reused by `help <unknown>` (R4), not duplicated

### Scenario Coverage

- [x] A-010 R1/R2: the pinned test scenarios cover transposition, short-input clamp, tie-break, no-match, `instal`→`install`, and an egg candidate (`forune`→`fortune`)

### Edge Cases & Error Handling

- [x] A-011 R5: empty/invalid `cd` args still short-circuit with usage/`no such tool` and schedule NO navigation timer
- [x] A-012 R6: `clear`/Ctrl-L (`replaceChildren` removals) and the aria-hidden ghost hint stay unannounced by construction; the Ctrl-C `^C` text suffix IS announced (correct feedback)

### Code Quality

- [x] A-013 Pattern consistency: new code follows the island's rationale-comment idiom (referencing change `cuur`), module-scope named constants, and the existing lib+test conventions
- [x] A-014 No unnecessary duplication: one shared `navigateWithBeat` for all three navigation commands; one suggester used by both call sites; no magic numbers (`NAV_BEAT_MS` named)

### Invariants (R8)

- [x] A-015 R8: `index.mdx` byte-identical; no dependency changes; exactly-one-trailing-prompt and the `23xc` resting anchor untouched; `COMMANDS` roster unchanged; `pnpm build` passes

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`

## Deletion Candidates

None — this change adds new functionality without making existing code redundant. The two synchronous `window.location.assign` call sites it superseded (`navigateTool`, `install`) were rewritten in place through `navigateWithBeat`, not left behind; the `sl` gag remains a live command (the suggester never fires for it since `sl` is a real `COMMANDS` key); and the `— type 'help'` not-found tail survives as the no-suggestion fallback required by R3.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Confident | `HELP_DETAIL` line skin: usage line `shell-out`, detail line(s) `shell-out shell-dim` — matching `man`'s synopsis + dim-see-also shape | Intake shows the two-line indented shape but not classes; `man` is the closest existing per-topic output and uses exactly this pairing | S:70 R:95 A:85 D:80 |
| 2 | Confident | Bare `help` list left fully unchanged (no wording tweak to the `cd` row) | Intake permits a cd-row tweak only "if wording needs it"; the nav-beat explanation lives in `help cd`'s detail entry, so the short list stays short | S:75 R:95 A:85 D:80 |
| 3 | Confident | Tool-name sideways hint rendered as `help: no help for 'hop' — try 'man hop'` (one line, em-dash tail) | Orchestrator/task format chosen over the intake's terser `try: man hop` fragment; same semantics, consistent with the suggester tail's em-dash shape | S:70 R:95 A:85 D:75 |
| 4 | Confident | `help <unknown>` suggester candidates = `Object.keys(COMMANDS)` (identical key set to `HELP_DETAIL`) | Single source of truth for "what is a command"; intake's `did you mean 'man'?` example implies command-key candidates | S:75 R:95 A:90 D:85 |
| 5 | Certain | The `opening …` beat line keeps the `shell-out shell-dim` classes of today's `opening` lines (plus `html: true` for the anchor) | Existing skin for the same message; only the content gains the anchor + hint | S:85 R:95 A:95 D:90 |
| 6 | Certain | `pendingNav` is NOT cleared by `commitLine` — a new command during the beat lets the pending nav fire | Explicitly specified as accepted + documented in the intake/dispatch | S:95 R:90 A:90 D:90 |
| 7 | Confident | `suggestCommand` with an empty input returns `null` in practice (defensive; threshold 1 only ever matches 1-char candidates) — no special-case code | Both call sites guarantee a non-empty token (empty Enter short-circuits; `help` bare takes the no-arg branch) | S:70 R:95 A:90 D:85 |

7 assumptions (2 certain, 5 confident, 0 tentative).
