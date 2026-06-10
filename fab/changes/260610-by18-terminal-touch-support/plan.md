# Plan: Terminal Touch Support

**Change**: 260610-by18-terminal-touch-support
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

### Homepage Terminal: Tap-to-focus + soft-keyboard summon

#### R1: `touch-action: manipulation` on the terminal window
`terminal.css` MUST set `touch-action: manipulation` on `.terminal-window`, removing double-tap-to-zoom heuristics that can delay or swallow the synthesized click after a tap, and preventing accidental zoom on rapid chip taps. This MUST be CSS-only with no behavior change for mouse users.

- **GIVEN** a touch-primary device viewing the homepage terminal
- **WHEN** the user taps inside `.terminal-window` (including rapid repeated taps on chips)
- **THEN** the browser dispatches the synthesized `click` without a double-tap-zoom delay and the page does not zoom
- **AND** mouse interaction on desktop is unchanged

#### R2: Tap-to-focus rides the existing synthesized-click path
A tap on the terminal surface MUST focus the live contenteditable input via the existing `onClick` handler (browsers synthesize a `click` after a tap; `focus()` inside that handler is gesture-qualified and summons the soft keyboard on iOS Safari / Android Chrome). The existing bails MUST keep working under touch: the link bail (`target?.closest('a')`) MUST keep letting transcript links navigate on tap; the selection bail MUST NOT swallow an ordinary tap. A `touchend`-based fallback SHALL be added ONLY if touch-emulation verification shows the synthesized click is unreliable — not speculatively.

- **GIVEN** the activated terminal on a touch-emulated viewport
- **WHEN** a tap lands on the terminal surface (not on a link, no active text selection, not on the command bar)
- **THEN** `document.activeElement` becomes the live input and the caret is at end

- **GIVEN** the activated terminal on a touch-emulated viewport
- **WHEN** a tap lands on a transcript `<a>` link
- **THEN** the link navigates and focus is not stolen by the terminal

### Homepage Terminal: Shared commit path

#### R3: `commitLine(focusNext)` extracted from the Enter branch
The Enter-branch commit sequence in `onKeydown` — `exitResting()` → read+trim the raw line → `freezeInput()` → empty-line short-circuit (fresh prompt only) → history push with `ignoredups` + `saveHistory()` → `historyCursor` reset → `run(raw)` → exactly one `freshPrompt(focusNext)` — MUST be extracted into a shared `commitLine(focusNext: boolean)` helper (same extraction precedent as `freezeInput(suffix?)` from `n23o`). The Enter branch MUST call `commitLine(true)`; observable behavior for typed commands MUST be unchanged.

- **GIVEN** the activated terminal with the input focused
- **WHEN** the user types `ls` and presses Enter
- **THEN** the line freezes as static echoed text, the tool listing prints, exactly one fresh trailing prompt is emitted, and that prompt is focused
- **AND** `ls` is pushed to history (skipped if it duplicates the previous entry) and persisted to sessionStorage

### Homepage Terminal: On-screen command bar

#### R4: Island-injected command bar markup
At activation (inside `initTerminal`, after the click-surface wiring), the island MUST inject a command bar as the LAST child of `.terminal-window`, below the `pre.shell-session` scroll viewport:

```html
<div class="terminal-cmdbar" role="group" aria-label="quick commands">
  <button type="button" class="terminal-chip" data-cmd="ls">ls</button>
  <button type="button" class="terminal-chip" data-cmd="help">help</button>
  <button type="button" class="terminal-chip" data-cmd="version">version</button>
  <button type="button" class="terminal-chip" data-cmd="install">install</button>
</div>
```

Chips MUST be native `<button type="button">` elements. The bar MUST NOT appear in static markup — `index.mdx` stays byte-identical (with JS off, static chips would be dead buttons, violating the progressive-enhancement boundary). If the `.terminal-window` wrapper is absent, the island MUST skip the bar gracefully (no throw; tap-to-focus unaffected).

- **GIVEN** JS is disabled
- **WHEN** the homepage renders
- **THEN** no `.terminal-cmdbar` exists anywhere in the markup and the static transcript renders verbatim

- **GIVEN** JS is enabled
- **WHEN** the island activates
- **THEN** the `.terminal-cmdbar` with the four chips is the last child of `.terminal-window`

#### R5: Chip tap = full interaction semantics through the shared commit path
A chip activation (tap, click, Enter, or Space) MUST: (1) `dismissIdleHint()`; (2) set the live input's text to the chip's `data-cmd`; (3) commit via `commitLine(false)` — the SAME path Enter uses, so the command is echoed/frozen, pushed to history (`ignoredups` + sessionStorage), exits resting, dispatches through `COMMANDS`, prints output, and emits exactly one fresh prompt. The chip path MUST NOT focus the contenteditable (`focusNext = false`) — focusing would summon the soft keyboard over the output the user just asked for. The window-surface `onClick` handler MUST bail on clicks originating inside `.terminal-cmdbar` so the bubbled chip click does not focus the input afterward. The `install` chip dispatches the existing `install` command — a real `window.location.assign('/getting-started/install/')` navigation, identical to typing it.

- **GIVEN** the activated terminal on a touch viewport
- **WHEN** the `ls` chip is tapped
- **THEN** a frozen `$ ls` echo line appears, the tool-links output prints, exactly one trailing live prompt is emitted, and `document.activeElement` is NOT the live input

- **GIVEN** a chip-run command has been committed
- **WHEN** the user later presses ↑ or runs `history`
- **THEN** the chip-run command appears (same `history[]` array, same commit path)

- **GIVEN** the resting (top-anchored) state with the idle-hint timer armed
- **WHEN** any chip is tapped
- **THEN** the idle hint is spent (never shows again this page view), resting exits (filler cleared), and bottom-pinned scrolling resumes

#### R6: Bar visibility — touch-primary devices only
The bar MUST be hidden by default and shown only on touch-primary devices via a media query in `terminal.css`:

```css
.terminal-cmdbar { display: none; }
@media (hover: none) and (pointer: coarse) {
  .terminal-cmdbar { display: flex; flex-wrap: wrap; }
}
```

The bar appears on phones/tablets regardless of width and never on desktop, including narrow desktop windows ("not appear on desktop" chosen over "render but redundant").

- **GIVEN** a hover-capable fine-pointer environment (desktop, any width)
- **WHEN** the homepage renders
- **THEN** the `.terminal-cmdbar` computes `display: none`

- **GIVEN** a `(hover: none) and (pointer: coarse)` environment
- **WHEN** the homepage renders with JS on
- **THEN** the bar is visible as a wrapping flex row

#### R7: Skin via existing `--c-*` variables only
Bar and chip styling MUST use only existing `--c-*` variables (Constitution V — both themes for free): bar background `var(--c-surface)` with a `1px solid var(--c-border)` top border (matching the titlebar's chrome language); chips transparent with `1px solid var(--c-border)`, small radius, `var(--c-fg)` text in the inherited mono font; `:focus-visible` outline in `var(--c-accent)`. No animation (nothing new to gate behind `prefers-reduced-motion`).

- **GIVEN** either theme (dark or light)
- **WHEN** the bar renders
- **THEN** all colors derive from the theme's `--c-*` variables and no hardcoded colors or animations are introduced

#### R8: Command bar accessibility
Chips MUST be keyboard-operable (native buttons: Enter and Space fire `click`) with a visible `:focus-visible` state, and the bar MUST carry a group role with an accessible label (Constitution Accessibility).

- **GIVEN** the bar is visible and a chip has keyboard focus
- **WHEN** Enter or Space is pressed
- **THEN** the chip's command runs exactly as a tap would
- **AND** the focused chip shows a visible `var(--c-accent)` outline

### Homepage Terminal: Invariants & constraints

#### R9: Load-bearing invariants and project constraints hold
The change MUST uphold: the exactly-one-trailing-prompt invariant on the chip path (by construction, via the shared `commitLine`); the live prompt remains the session's last DOM child (the bar lives OUTSIDE `pre.shell-session`, so the resting-state top anchor, `scrollToBottom`, and the session's DOM-order invariant are untouched); zero new dependencies, vanilla JS inside the existing `TerminalPrompt.astro` island; fully static output; `index.mdx` byte-identical; the site build passes.

- **GIVEN** the implemented change
- **WHEN** `npm run build` runs in `sites/astro-starlight-terminal1/`
- **THEN** the build succeeds with fully static output, `package.json` is unchanged, and `git diff` shows no change to `index.mdx`

### Non-Goals

- No touch substitutes for ↑/↓ history or Tab completion beyond the bar itself — the bar IS the stated touch analogue (intake assumption #1)
- No fake on-screen keyboard; no read-only-with-buttons mobile mode (rejected in intake § Why)
- No speculative `touchend` fallback — built only if verification shows the synthesized click unreliable (R2)
- No memory-file edits during apply — hydrate owns `docs/memory/site/homepage-terminal.md`

### Design Decisions

1. **Chip-click bail in `onClick` (early return), not `stopPropagation()` in the chip handler**: the window-surface `onClick` gets a `target?.closest('.terminal-cmdbar')` bail placed after `dismissIdleHint()` — *Why*: follows the existing link-bail pattern in the same handler; keeps the surface handler's "a click is interaction" semantics (hint still dismissed) without suppressing event flow for any future surface listeners — *Rejected*: `e.stopPropagation()` in the chip handler (implicit coupling; silently breaks anything else listening on the surface).
2. **One delegated `click` listener on the bar container**: `onChipClick` resolves `e.target.closest('button.terminal-chip')` — *Why*: one listener instead of four; matches the dispatch-by-lookup style of the island — *Rejected*: per-button listeners (more wiring, no benefit).
3. **`CHIP_COMMANDS` named module-scope constant**: the chip roster lives beside `TOOLS`/`FORTUNES` — *Why*: code-quality rule (no magic strings); single place to amend the roster — *Rejected*: inline string literals in the injection loop.

## Tasks

### Phase 1: Setup

- [x] T001 Install site dependencies (`pnpm install` in `sites/astro-starlight-terminal1/`) so the build/verification tooling runs; verify `package.json` stays unchanged afterward <!-- R9 -->

### Phase 2: Core Implementation

- [x] T002 Extract `commitLine(focusNext: boolean)` from the Enter branch of `onKeydown` in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` (exitResting → trim → freezeInput → empty short-circuit → ignoredups history push + saveHistory → cursor reset → run → one `freshPrompt(focusNext)`); Enter branch becomes `e.preventDefault(); commitLine(true);` <!-- R3 -->
- [x] T003 Add `CHIP_COMMANDS` constant, `injectCommandBar()` (build `.terminal-cmdbar` + four `data-cmd` buttons, append as last child of `.terminal-window`, skip gracefully if wrapper absent) and delegated `onChipClick` handler (`dismissIdleHint()` → set input text → `commitLine(false)`) in `TerminalPrompt.astro`; call `injectCommandBar()` in the Activate section after the click-surface wiring <!-- R4 -->
- [x] T004 Add the `.terminal-cmdbar` bail to the window-surface `onClick` in `TerminalPrompt.astro` (after `dismissIdleHint()`, alongside the link bail) so a bubbled chip click never focuses the input / summons the keyboard <!-- R5 -->
- [x] T005 [P] Add `touch-action: manipulation` to the `.terminal-window` rule in `sites/astro-starlight-terminal1/src/styles/terminal.css` <!-- R1 -->
- [x] T006 [P] Add `.terminal-cmdbar` / `.terminal-chip` rules to `terminal.css`: hidden by default + `(hover: none) and (pointer: coarse)` flex reveal; `--c-*`-only skin (surface bar, border top, transparent bordered chips, mono font inherit, `:focus-visible` accent outline); no animation <!-- R6 -->

### Phase 3: Integration & Edge Cases

- [x] T007 Build the site (`npm run build` in `sites/astro-starlight-terminal1/`); confirm success, fully static output, and `git diff` clean for `src/content/docs/index.mdx` and `package.json` <!-- R9 -->
- [x] T008 Headless Chromium touch-emulation verification (Playwright harness OUTSIDE the repo, e.g. `/tmp` — no project dep): (a) coarse-pointer tap on the terminal surface focuses the live input (`document.activeElement`); (b) tap on a transcript link navigates; (c) each chip runs its command with a frozen echo, output, exactly one trailing prompt, and NO input focus; (d) chip commands appear in `history`; (e) bar visible under touch emulation, `display: none` under desktop emulation; (f) chip keyboard operation (Enter/Space) + `:focus-visible` outline; (g) idle-hint dismissal + resting exit on chip tap. Based on (a)/(c): decide the `touchend` fallback — add ONLY if the synthesized click failed <!-- R2 -->

## Acceptance

### Functional Completeness

- [x] A-001 R1: `.terminal-window` carries `touch-action: manipulation` in `terminal.css`
- [x] A-002 R3: `commitLine(focusNext)` exists in `TerminalPrompt.astro`; the Enter branch delegates to it with `focusNext = true`; typed-command behavior is unchanged (freeze, ignoredups history + sessionStorage, exactly one trailing prompt, next prompt focused; empty Enter → fresh prompt only)
- [x] A-003 R4: the command bar is island-injected at activation as the last child of `.terminal-window` (`role="group"`, `aria-label="quick commands"`, four native `<button type="button">` chips with `data-cmd` = ls/help/version/install); `git diff` shows `index.mdx` byte-identical
- [x] A-004 R5: a chip activation dismisses the idle hint, sets the input text, and commits via `commitLine(false)`: frozen `$ <cmd>` echo, command output, exactly one trailing prompt, input NOT focused; chip commands enter the shared `history[]` (ignoredups + sessionStorage); the `install` chip performs the real `/getting-started/install/` navigation
- [x] A-005 R6: `.terminal-cmdbar` computes `display: none` in hover/fine-pointer environments and `display: flex` (wrapping) under `(hover: none) and (pointer: coarse)`
- [x] A-006 R7: bar/chip CSS uses only existing `--c-*` variables (no new hardcoded colors), renders correctly in both themes, and introduces no animation
- [x] A-007 R8: chips are keyboard-operable (Enter/Space run the command) with a visible `:focus-visible` outline in `var(--c-accent)`; the bar carries `role="group"` + `aria-label`

### Behavioral Correctness

- [x] A-008 R2: under Chromium touch emulation, a tap on the terminal surface focuses the live input (activeElement assertion) and a tap on a transcript link navigates without focus theft; a `touchend` fallback exists ONLY if the synthesized-click verification failed (otherwise absent)
- [x] A-009 R9: the exactly-one-trailing-prompt invariant holds on the chip path; the live prompt remains the session's last DOM child; the bar lives outside `pre.shell-session` (resting anchor / `scrollToBottom` geometry untouched)

### Scenario Coverage

- [x] A-010 R5: a chip tap during the resting state exits resting (inline `padding-bottom` filler cleared, bottom-pinned scrolling resumes) and spends the one-shot idle ghost hint

### Edge Cases & Error Handling

- [x] A-011 R4: with no `.terminal-window` wrapper around the session, activation completes without throwing and simply omits the bar (tap-to-focus unaffected)
- [x] A-012 R9: `npm run build` succeeds in `sites/astro-starlight-terminal1/`; output is fully static; `package.json`/lockfile unchanged (zero new dependencies)

### Code Quality

- [x] A-013 Pattern consistency: new code follows the island's naming, comment, and structural conventions; the chip roster is a named `CHIP_COMMANDS` constant (no magic strings)
- [x] A-014 No unnecessary duplication: the chip path reuses `commitLine`/`freezeInput`/`run`/`freshPrompt`/`dismissIdleHint` — no parallel commit logic exists
- [x] A-015 No god functions: no new or modified function exceeds ~50 lines without clear reason

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`
- The soft-keyboard summon itself is NOT headlessly assertable — it follows from `focus()` being gesture-qualified (verified via activeElement under synthesized tap) plus a manual iOS Safari / Android Chrome spot-check as a best-effort pass (intake assumption #13)

## Deletion Candidates

- None — this change adds new functionality without making existing code redundant. The only superseded code (the inline Enter-branch commit sequence in `onKeydown`) was removed in the same diff by the `commitLine(focusNext)` extraction; no orphaned symbols, branches, or config remain.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Confident | The window-surface `onClick` gets a `.terminal-cmdbar` early-return bail (after `dismissIdleHint()`) so the bubbled chip click cannot focus the input and summon the keyboard | Intake fixes the no-focus outcome but not the bubbling mechanics; the bail mirrors the handler's existing link-bail pattern; chosen over `stopPropagation` (implicit, suppresses future surface listeners) | S:70 R:90 A:85 D:80 |
| 2 | Confident | One delegated `click` listener on the bar container resolving `closest('button.terminal-chip')`, not four per-button listeners | Intake specifies "chip click handler" singular-ish; delegation matches the island's lookup-dispatch style and is trivially reversible | S:60 R:95 A:85 D:80 |
| 3 | Certain | Chip roster as a named module-scope `CHIP_COMMANDS` constant beside `TOOLS`/`FORTUNES` | code-quality.md anti-pattern rule (no magic strings) + the island's existing constants convention determine this | S:80 R:95 A:95 D:90 |
| 4 | Confident | Bar injection is skipped gracefully when `.terminal-window` is absent (session-only fallback gets no bar) | The island already degrades via `closest('.terminal-window') ?? session`; chips appended inside the `pre` would corrupt the transcript stream; tap-to-focus is unaffected | S:55 R:90 A:80 D:75 |
| 5 | Confident | Chip metrics (padding ≈0.4rem 0.9rem for tap-target size, 4px radius, ~0.9rem inherited mono font, `cursor: pointer` overriding the surface's `cursor: text`, `font: inherit` on buttons) | Intake fixes colors/vars and chrome language but not exact metrics; values follow the titlebar's scale and WCAG tap-target guidance; pure-CSS, trivially tunable | S:50 R:95 A:75 D:70 |
| 6 | Confident | Verification harness lives OUTSIDE the repo (`/tmp`, Playwright + cached Chromium); no Playwright dep added to the site | Zero-new-deps constraint binds the site's `package.json`; an external throwaway harness satisfies R2/R5/R6 verification without violating it | S:60 R:95 A:80 D:80 |

6 assumptions (1 certain, 5 confident, 0 tentative).
