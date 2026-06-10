# Plan: Terminal Shell Affordances — History, Tab-Completion, Control Keys

**Change**: 260610-n23o-terminal-shell-affordances
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

<!-- Derived from intake.md. All three features are confined to the <script> in
     sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro — the
     onKeydown handler, module-scoped state inside initTerminal, the COMMANDS map
     (new `history` command), and the help output. Vanilla JS, zero new deps
     (Constitution VI); static-first (I); dark/light parity via existing --c-*
     vars and .shell-* classes (V). -->

### Terminal: Command History (↑ / ↓ recall)

#### R1: In-memory history of committed non-empty raw lines
The terminal SHALL maintain, at `initTerminal` scope, an array of committed, non-empty, trimmed **raw** command lines plus a navigation cursor index. On Enter commit with `raw !== ''`, the line SHALL be pushed and the cursor reset to "past the newest" (`index = length`).

- **GIVEN** the live prompt is empty and focused
- **WHEN** the user types `help`, presses Enter, types `ls`, presses Enter
- **THEN** the history array contains `['help', 'ls']` in commit order
- **AND** the navigation cursor sits at the blank-draft position (`index === length`)

#### R2: ignoredups — skip pushing a duplicate of the previous entry
On commit, if `raw` is identical to the immediately previous history entry, the terminal SHALL NOT push a second copy (bash `ignoredups`).

- **GIVEN** history is `['ls']`
- **WHEN** the user runs `ls` again
- **THEN** history remains `['ls']` (no duplicate appended)
- **AND** running `cd hop` then `cd hop` then `ls` yields `['cd hop', 'ls']`

#### R3: ↑ (ArrowUp) walks back through history
On ArrowUp the terminal SHALL `preventDefault()`, walk the cursor toward index 0 (clamped at 0), set `input.textContent` to `history[cursor]`, and move the caret to end via `caretToEnd()`. At the oldest entry it stays there.

- **GIVEN** history is `['help', 'ls']` with the live prompt blank
- **WHEN** the user presses ↑
- **THEN** the input shows `ls`
- **AND** pressing ↑ again shows `help`
- **AND** pressing ↑ a third time keeps `help` (clamped at oldest)

#### R4: ↓ (ArrowDown) walks forward; past newest = blank draft
On ArrowDown the terminal SHALL `preventDefault()`, walk the cursor forward; when it moves past the newest entry it SHALL clamp to `index = length` and restore a **blank** input line (not the newest command), caret to end.

- **GIVEN** history is `['help', 'ls']` and the user has pressed ↑ twice (input shows `help`, cursor at oldest)
- **WHEN** the user presses ↓
- **THEN** the input shows `ls`
- **AND** pressing ↓ again restores a blank input line (new-draft state)

#### R5: sessionStorage persistence (degrade silently)
The history array SHALL persist across reloads in `sessionStorage` (NOT `localStorage`). It is read once on `initTerminal` and written on each commit. All `sessionStorage` access SHALL be guarded in try/catch; private-mode or disabled storage SHALL degrade silently to in-memory-only and never throw.

- **GIVEN** a session where `help` and `ls` were run
- **WHEN** the page is reloaded within the same browser session
- **THEN** ↑ recalls `ls` then `help` (history restored from sessionStorage)
- **AND** if `sessionStorage` access throws (private mode), the terminal still works in-memory with no console error

#### R6: `history` command lists the array
A `history` entry SHALL be added to `COMMANDS` that prints the history array, one indexed line each, using the `shell-out` class — reading from the same array the recall uses. A corresponding line SHALL be added to the `help` output so it is discoverable.

- **GIVEN** history is `['help', 'ls']`
- **WHEN** the user runs `history`
- **THEN** the transcript prints indexed lines (e.g. `  1  help` / `  2  ls`) as `shell-out`
- **AND** `help` output lists a `history` line

### Terminal: Tab-Completion

#### R7: Tab suppresses default and completes the active token
On Tab the terminal SHALL `preventDefault()` (suppress focus-out from the contenteditable), then complete based on token position: the first token against the `COMMANDS` keys; the second token against `TOOLS` when the first token is `cd`, `open`, or `man`.

- **GIVEN** the input is `in`
- **WHEN** the user presses Tab
- **THEN** the default focus-out is suppressed
- **AND** completion is attempted against the `COMMANDS` keys

#### R8: single match fills the candidate
When exactly one candidate starts with the fragment, the terminal SHALL replace the fragment with the full candidate (whole input for a first-token completion; preserving the `cd `/`open `/`man ` prefix for a second-token completion) and move the caret to end.

- **GIVEN** the input is `in`
- **WHEN** the user presses Tab
- **THEN** the input becomes `install` (unique `COMMANDS` prefix)
- **AND** GIVEN `cd h`, Tab yields `cd hop` (`hop` is the only TOOL starting with `h`)

#### R9: multiple matches list candidates without freezing the line
When more than one candidate matches and they share no longer common prefix, the terminal SHALL print the candidates as a single space-joined `shell-out` line via `print()` ABOVE the still-live input — WITHOUT committing/freezing the line and WITHOUT emitting a new prompt. The input text and caret SHALL remain untouched.

- **GIVEN** the input is a fragment matching several `COMMANDS` keys (e.g. `s` → `sudo sl shll`)
- **WHEN** the user presses Tab and the candidates share no longer common prefix
- **THEN** a `shell-out` line listing the candidates is printed above the live input
- **AND** the input still shows the typed fragment with the caret in place (no new prompt, no freeze)

#### R10: longest common prefix fills partially
When multiple candidates share a common prefix longer than the typed fragment, the terminal SHALL fill that common prefix (partial completion) with no listing.

- **GIVEN** `COMMANDS` contains `exit` and (hypothetically) shared-prefix keys
- **WHEN** the typed fragment's matches share a longer common prefix than typed
- **THEN** the input is extended to that common prefix and nothing is listed

#### R11: no match is a no-op
When no candidate starts with the fragment, the terminal SHALL do nothing — no listing, input unchanged.

- **GIVEN** the input is `zzz`
- **WHEN** the user presses Tab
- **THEN** the input is unchanged and nothing is printed

### Terminal: Control Keys (Ctrl-L, Ctrl-C)

#### R12: Ctrl-L clears the transcript, emits exactly one prompt
On Ctrl-L (`e.ctrlKey && e.key === 'l'`) the terminal SHALL `preventDefault()`, reuse the existing `clear()` path, then emit exactly ONE fresh prompt — never two (preserving the "exactly one trailing prompt" invariant).

- **GIVEN** a transcript with several committed lines and a live prompt
- **WHEN** the user presses Ctrl-L
- **THEN** the transcript is wiped and exactly one fresh empty prompt remains
- **AND** no command is dispatched

#### R13: Ctrl-C cancels the line with a trailing `^C`, no run
On Ctrl-C (`e.ctrlKey && e.key === 'c'`) the terminal SHALL `preventDefault()`, freeze the current line (reusing the Enter branch's live-input→static-text + drop-block-cursor logic), append `^C` to the frozen echoed text, discard the typed input (do NOT run it), and drop exactly one fresh prompt. No command is dispatched.

- **GIVEN** the input shows `ls`
- **WHEN** the user presses Ctrl-C
- **THEN** the frozen line reads `$ ls^C`, `ls` does NOT run, and one fresh empty prompt appears
- **AND** GIVEN an empty input, Ctrl-C freezes `$ ^C` and drops one fresh prompt

### Non-Goals

- No new dependencies (no xterm.js, no completion library) — Constitution VI.
- No markup/content changes to `index.mdx` or the static `pre.shell-session`; the no-JS fallback is untouched.
- No animation is added (features are non-animated), so no new `prefers-reduced-motion` CSS is required.
- Multi-line / caret-position-aware history navigation is out of scope — the prompt is enforced single-line (paste flattened, `aria-multiline=false`), so ↑/↓ drive history unconditionally.

### Design Decisions

1. **Tab multiple-match listing uses print-without-freezing** (clarification #2 / intake #11): reuse `print([{ text: matches.join('  '), classes: 'shell-out' }])` to append a listing line above the live input; do NOT freeze or re-emit a prompt — *Why*: cleanest path for the "exactly one trailing prompt" invariant (no commit/re-emit happens) and preserves caret — *Rejected*: freeze→print→`freshPrompt()`-with-reseed (more code, an extra prompt-emitting path to keep correct).
2. **Refactor the Enter-branch freeze into a `freezeInput(suffix?)` helper** reused by Enter and Ctrl-C — *Why*: avoids duplicating the ~12-line tear-down (Code Quality: no duplication; God-function avoidance) and gives Ctrl-C the exact same freeze semantics with an optional appended `^C` — *Rejected*: copy-pasting the freeze block into the Ctrl-C path (drift risk).
3. **History persisted in `sessionStorage` under a single namespaced key**, JSON-encoded, all access try/catch-guarded — *Why*: session-scoped recall survives refresh but a new session starts clean (intake), and storage failures degrade silently — *Rejected*: `localStorage` (explicitly excluded by intake).

## Tasks

### Phase 1: Setup

- [x] T001 Add module-scoped history state inside `initTerminal` (after `versionRowsHtml`): a `history: string[]` array, a `historyCursor` number, a namespaced `sessionStorage` key constant, and a try/catch-guarded `loadHistory()` (read once at init) + `saveHistory()` (write on commit) pair in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` <!-- R1 R5 -->

### Phase 2: Core Implementation

- [x] T002 Extract the Enter-branch freeze tear-down into a `freezeInput(suffix?: string)` helper (live-input → static text, strip editable attrs/listeners/`shell-input` class, remove block cursor, optionally append `suffix` to the echoed text) and call it from the Enter branch in `TerminalPrompt.astro` <!-- R13 -->
- [x] T003 Implement command-history commit in the Enter branch: when `raw !== ''`, push to `history` with `ignoredups` guard, reset `historyCursor = history.length`, and `saveHistory()` in `TerminalPrompt.astro` <!-- R1 R2 R5 -->
- [x] T004 Implement ↑/↓ history navigation in `onKeydown` (ArrowUp/ArrowDown): `preventDefault()`, move `historyCursor` (clamp at 0 / at `length`), set `input.textContent` to the entry or blank draft, `caretToEnd()` in `TerminalPrompt.astro` <!-- R3 R4 -->
- [x] T005 Add the `history` command to the `COMMANDS` map (prints indexed `shell-out` lines from the array) and add a `history` line to the `help` output in `TerminalPrompt.astro` <!-- R6 -->
- [x] T006 Implement Tab-completion in `onKeydown`: `preventDefault()`, compute the active token + candidate set (first token → `COMMANDS` keys; second token → `TOOLS` when first is `cd`/`open`/`man`) via a `completeToken` helper resolving single-fill / LCP-fill / multi-list / no-op in `TerminalPrompt.astro` <!-- R7 R8 R9 R10 R11 -->
- [x] T007 Implement Ctrl-L in `onKeydown`: detect `e.ctrlKey && e.key === 'l'`, `preventDefault()`, call `clear()` then exactly one `freshPrompt()` in `TerminalPrompt.astro` <!-- R12 -->
- [x] T008 Implement Ctrl-C in `onKeydown`: detect `e.ctrlKey && e.key === 'c'`, `preventDefault()`, `freezeInput('^C')`, then one `freshPrompt()`, no dispatch in `TerminalPrompt.astro` <!-- R13 -->

### Phase 3: Integration & Edge Cases

- [x] T009 Verify the `onKeydown` early-return structure correctly branches Enter / ArrowUp / ArrowDown / Tab / Ctrl-L / Ctrl-C and otherwise falls through to native editing; confirm Ctrl-C with empty input still freezes `$ ^C` + one prompt, and that no path double-emits a prompt in `TerminalPrompt.astro` <!-- R12 R13 -->
- [x] T010 Verify the site type-checks/builds with no TypeScript or Astro errors (run the build from `sites/astro-starlight-terminal1/`) <!-- R1 R7 R12 -->

## Execution Order

- T001 blocks T003 and T005 (state + persistence helpers must exist first)
- T002 blocks T008 (Ctrl-C reuses `freezeInput`); the Enter branch is refactored in T002 before T003 adds the commit logic to it
- T006, T007, T008 are independent of one another but all follow T002 (shared `onKeydown` edits — sequential to avoid conflicting edits)
- T009, T010 run last (integration + build verification)

## Acceptance

### Functional Completeness

- [ ] A-001 R1: History array at `initTerminal` scope collects committed non-empty raw lines in order; cursor resets to `length` on commit
- [ ] A-002 R2: `ignoredups` prevents pushing a duplicate of the immediately previous entry
- [ ] A-003 R3: ↑ walks back, sets input to `history[cursor]`, caret to end, clamps at oldest
- [ ] A-004 R4: ↓ walks forward; past newest restores a blank draft line, caret to end
- [ ] A-005 R5: History persists across same-session reloads via try/catch-guarded `sessionStorage` (not `localStorage`)
- [ ] A-006 R6: `history` command prints indexed `shell-out` lines from the array; `help` lists it
- [ ] A-007 R7: Tab `preventDefault()`s and completes the first token vs `COMMANDS` keys, the second vs `TOOLS` for `cd`/`open`/`man`
- [ ] A-008 R8: Single match fills the full candidate (whole input or preserving the arg prefix), caret to end
- [ ] A-009 R9: Multiple no-shared-prefix matches print a space-joined `shell-out` listing without freezing the line or emitting a new prompt; caret preserved
- [ ] A-010 R10: A longer common prefix fills partially with no listing
- [ ] A-011 R11: No match is a no-op (input unchanged, nothing printed)
- [ ] A-012 R12: Ctrl-L clears the transcript and emits exactly one fresh prompt
- [ ] A-013 R13: Ctrl-C freezes the line with a trailing `^C`, discards input (no run), and drops exactly one fresh prompt

### Behavioral Correctness

- [ ] A-014 R8: `in` + Tab → `install`; `cd h` + Tab → `cd hop` (intake examples hold)
- [ ] A-015 R13: Typing `ls` then Ctrl-C shows `$ ls^C` and `ls` does not run

### Scenario Coverage

- [ ] A-016 R3 R4: ↑↑↑ on `['help','ls']` yields `ls`→`help`→`help`; ↓↓ yields `ls`→blank
- [ ] A-017 R5: With `sessionStorage` throwing, the terminal still recalls in-memory and logs no error

### Edge Cases & Error Handling

- [ ] A-018 R12 R13: Neither Ctrl-L nor Ctrl-C double-emits a prompt; the "exactly one trailing prompt" invariant holds on every non-Enter prompt-emitting path
- [ ] A-019 R13: Ctrl-C with empty input freezes `$ ^C` and drops one fresh prompt
- [ ] A-020 R5: `sessionStorage` read returning malformed/non-array JSON degrades to an empty in-memory history without throwing

### Code Quality

- [ ] A-021 Pattern consistency: New code follows the file's `// ──` section dividers, `Line`/`Handler`/`Ctx` types, heavy explanatory comments, and helper-function organization
- [ ] A-022 No unnecessary duplication: The Enter-branch freeze is reused by Ctrl-C via a shared `freezeInput` helper rather than copy-pasted; recall and the `history` command read the same array
- [ ] A-023 Composition over inheritance: New behavior is added as small focused helpers wired into `onKeydown`, not via new class hierarchies
- [ ] A-024 No god functions: `onKeydown` stays readable by delegating to `freezeInput`, `completeToken`, and the history helpers rather than inlining all logic
- [ ] A-025 No magic strings/numbers: The `sessionStorage` key is a named constant; reused `.shell-*` classes and `--c-*` vars (no new hardcoded colors), per Constitution V

### Preservation (Behavioral Correctness)

- [ ] A-026 R7 R13: Existing paste-normalization (`onPaste`), focus/blur cursor-blink (`onFocus`/`onBlur` toggling `is-active`), and `aria-label`/`role=textbox` semantics on the live input are unregressed

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- The prompt `$` is a sibling `shell-prompt` span, not part of `input.textContent`; the `^C` is appended to the input's echoed text so the frozen line reads `$ <cmd>^C`.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | All material design decisions carried verbatim from intake (3 features, exact semantics, print-without-freezing for Tab, all 3 refinements in scope) | intake.md is fully resolved (11 assumptions, 0 unresolved; 2 clarifications) | S:97 R:88 A:96 D:92 |
| 2 | Confident | Extract the Enter-branch freeze into a `freezeInput(suffix?)` helper reused by Ctrl-C | Avoids duplicating ~12 lines of tear-down (code-quality: no-duplication, no god-function); gives Ctrl-C identical freeze semantics | S:88 R:82 A:85 D:80 |
| 3 | Confident | `history` command prints `  {1-based index}  {entry}` indented `shell-out` lines | Intake says "one indexed line each, shell-out class"; exact format unspecified — bash `history` is 1-based right-aligned; chose a simple readable indented form matching the `help` output's two-space indent | S:82 R:78 A:80 D:72 |
| 4 | Confident | Single namespaced `sessionStorage` key (`shll:terminal:history`), JSON array, guarded read coerces non-array/malformed to `[]` | Intake mandates sessionStorage + try/catch + silent degrade but not the key name or encoding; JSON array is the natural fit and matches "read on init / write on commit" | S:85 R:80 A:82 D:75 |
| 5 | Confident | ArrowUp/ArrowDown drive history unconditionally (no caret-boundary gate) | Intake states the prompt is enforced single-line (paste flattened, `aria-multiline=false`) so ↑/↓ can unconditionally drive history; matches assumption #3 in intake | S:86 R:80 A:84 D:78 |
| 6 | Confident | Tab listing of multiple matches lists the **candidate names** (command keys or tool names), space-joined, not the typed prefix | Bash lists candidate completions; intake example "lists the candidates" | S:84 R:78 A:82 D:74 |

6 assumptions (1 certain, 5 confident, 0 tentative).
