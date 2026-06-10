# Plan: Make the Homepage Terminal Obviously Interactive Above the Fold

**Change**: 260610-23xc-terminal-interactive-above-fold
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

### Terminal: Above-fold surfacing

#### R1: Splash hero vertical rhythm tightened (CSS-only)
The splash hero's vertical footprint SHALL be reduced via splash-scoped rules in `sites/astro-starlight-terminal1/src/styles/terminal.css` only (hero block padding, hero stack gap, `.terminal-window` top margin on the hero page), such that on a 1280×750 viewport the terminal window starts high enough for the live prompt region (greeting + `$` line, per R2) to be visible without scrolling. `index.mdx`, the Starlight config, and doc-page layout MUST be unchanged. Exact rem values are tuned against a real browser at the acceptance viewport.

- **GIVEN** the homepage at a 1280×750 viewport with JS enabled
- **WHEN** the page finishes loading
- **THEN** the terminal window's titlebar and the top of its session viewport (greeting line + live `$` prompt, per R2) are fully inside the viewport without any scrolling
- **AND** doc pages (non-splash) render with unchanged spacing

#### R2: Top-anchored initial scroll (resting state)
At activation — after the greeting line (R3) prints and the first live prompt is emitted — the client island SHALL set the session's scroll position so the greeting line is the first visible line at the top of the fixed-height session viewport, with the live `$` prompt directly below it. The boot transcript remains in the DOM above, reachable by scrolling up. Because the content below the greeting (~2 lines) is shorter than the viewport, the island SHALL extend the session's inline `padding-bottom` by exactly the deficit (resting-state filler — the blank rows a real terminal shows after `clear`); the live prompt line remains the session's **last DOM child** (DOM order unchanged, exactly-one-trailing-prompt untouched). The scroll assignment MUST be a direct instant `scrollTop` write (no smooth scrolling — trivially motion-safe). The anchor SHALL be recomputed once after `document.fonts.ready` (JetBrains Mono loads async and shifts line metrics) but only if the user has not scrolled away from the anchored position. On the **first prompt-emitting interaction** (Enter, Ctrl-L, Ctrl-C), the filler padding SHALL be removed and the existing bottom-pinned behavior (`scrollToBottom`) resumes unchanged.

- **GIVEN** a JS-enabled page load at any viewport
- **WHEN** activation completes
- **THEN** the first visible line inside the session viewport is the greeting line, the live `$` prompt sits directly below it, and the boot transcript is reachable by scrolling up

- **GIVEN** the resting (pre-interaction) state
- **WHEN** the user commits a first command (Enter), or presses Ctrl-L or Ctrl-C
- **THEN** the filler padding is removed and the session bottom-pins via the existing `scrollToBottom` exactly as before this change

- **GIVEN** JS is disabled
- **WHEN** the page loads
- **THEN** the static transcript renders at browser-default `scrollTop = 0` exactly as today (no change)

### Terminal: Greeting line

#### R3: Activation-time greeting line
At activation, **before** the first live prompt is emitted, the island SHALL print exactly one dim greeting line (classes `shell-out shell-dim`, reusing the existing skin verbatim) stating what shll is plus the invitation `type 'help' or 'ls'`. The copy MUST fit the session's pre-formatted width at the acceptance viewport without horizontal overflow (the session is `white-space: pre`). The static no-JS transcript in `index.mdx` MUST be byte-identical to today.

- **GIVEN** a JS-enabled page load
- **WHEN** activation completes
- **THEN** one `shell-out shell-dim` line with the greeting copy appears between the boot transcript and the live prompt, and `session.scrollWidth` does not exceed `session.clientWidth` at 1280×750

- **GIVEN** JS is disabled
- **WHEN** the page loads
- **THEN** no greeting appears and the static transcript is unchanged

### Terminal: Idle ghost hint

#### R4: Idle ghost-hint lifecycle (one-shot, visual-only)
A one-shot timer armed at activation SHALL, after 4 seconds with no interaction, show a dim ghost hint in the live prompt line. *Interaction* = any keydown on the input, focus of the input, or click on the terminal surface; interaction before the timer fires cancels it, interaction after it fires dismisses the hint, and either way the hint never returns for the rest of the page view (no re-arm, no storage gating). The ghost is a **visual-only** `aria-hidden="true"` span (class `shell-ghost`, copy `try 'ls' ⏎`) inserted into the live prompt line **after** the block cursor (fish-autosuggestion style: `$ ▊try 'ls' ⏎`). It MUST NOT be inside the contenteditable input span, MUST NOT be part of the textbox's accessible name/value, can never be submitted by Enter, and MUST NOT focus the input (the `9vbo` no-autofocus decision stands). The typing animation (where motion is allowed, R5) edits the ghost span's `textContent` in place at ~70 ms/char and MUST NOT call `print()`/`scrollToBottom()` or otherwise move the scroll position. Dismissal removes the ghost span and clears any pending timer/interval; a keydown dismissal MUST run before any `onKeydown` branch dispatch (so Tab as the first keystroke dismisses the ghost before completion logic runs).

- **GIVEN** a fresh page load with no interaction
- **WHEN** 4 seconds elapse
- **THEN** the ghost hint `try 'ls' ⏎` types into the live prompt line after the block cursor, dim, without any scroll movement and without focusing the input

- **GIVEN** the ghost hint is visible (or mid-animation)
- **WHEN** the user presses any key in the input, focuses the input, or clicks the terminal surface
- **THEN** the ghost span is removed, any pending interval/timer is cleared, and the hint never reappears this page view

- **GIVEN** the page just loaded
- **WHEN** the user interacts before the 4 s timer fires
- **THEN** the timer is cancelled and the hint never appears this page view

- **GIVEN** the ghost hint is visible
- **WHEN** the user types `ls` and presses Enter
- **THEN** the committed line is exactly `ls` (the ghost text is never part of the input value) and the frozen line carries no ghost span

#### R5: Reduced-motion presentation
When `prefers-reduced-motion: reduce` is set (checked via `window.matchMedia`), the ghost hint MUST appear statically — full text at once, no typing interval. The hint remains dim, `aria-hidden`, and dismissable identically to the animated presentation.

- **GIVEN** `prefers-reduced-motion: reduce` is set
- **WHEN** the 4 s idle timer fires
- **THEN** the full hint text appears at once with no animation, and dismissal on keydown/focus/click behaves identically

### Terminal: Invariants

#### R6: Existing invariants preserved
The change MUST add zero new dependencies (vanilla JS only), use only existing `--c-*` variables for any new color (dark/light parity), keep the build fully static, keep `index.mdx` unedited (static fallback is the no-JS source of truth), add no new prompt-emitting paths (exactly-one-trailing-prompt invariant), never autofocus on page load, and leave the `n23o` affordances (↑/↓ history, Tab-completion, Ctrl-L/Ctrl-C) behaviorally unchanged after the resting state ends.

- **GIVEN** the implemented change
- **WHEN** the site is built and the terminal exercised (commands, Ctrl-L, Ctrl-C, Tab, history)
- **THEN** exactly one `[data-terminal-prompt]` live line exists at all times, no element is focused on load, `git diff` shows no `index.mdx` or `package.json` dependency changes, and the production build succeeds

### Non-Goals

- No hero restructuring (side-by-side layout, terminal-as-hero) — explicitly out of scope per intake.
- No touch/mobile-specific work — queued as `[by18]`.
- No storage-gated "first visit ever" logic for the hint — one-shot per page view by design.
- No new test framework — the site has no test runner; verification is the production build + scripted real-browser checks (Constitution VI).

### Design Decisions

1. **Resting-state filler via inline `padding-bottom`, not a spacer element**: the intake's `scrollTop`-only sketch is mathematically insufficient — the content below the greeting (~46 px) is far smaller than the session viewport (~325 px), so max `scrollTop` (~108 px) cannot reach the greeting offset (~400 px). Extending the session's `padding-bottom` by the deficit creates the scroll range while the live prompt stays the last DOM child. — *Why*: minimal mechanism honoring the intake's "DOM order is unchanged" decision; visually identical to a real terminal's blank rows after `clear`. — *Rejected*: a spacer `<div>` after the prompt (violates the last-child/DOM-order decision; `print()` appends after it), shrinking the session height (changes the window's size and the no-JS layout).
2. **`exitResting()` called from the three prompt-emitting branches** (Enter, Ctrl-L, Ctrl-C in `onKeydown`) — *Why*: the intake names exactly these as the paths where bottom-pinning resumes; explicit call sites are clearer than hooking `freshPrompt(focus=true)`. — *Rejected*: piggybacking on `freshPrompt`'s focus parameter (implicit, fragile coupling).
3. **Ghost dismissal precedes branch dispatch in `onKeydown`** — first statement of the handler — *Why*: intake edge case requires Tab-as-first-keystroke to dismiss before completion logic.

## Tasks

### Phase 1: Setup

- [x] T001 Install site dependencies (`pnpm install` in `sites/astro-starlight-terminal1/`), run a baseline `pnpm build`, and capture baseline fold geometry at 1280×750 with a Playwright script (uncommitted, under /tmp): hero bottom, terminal-window top, live-prompt position. <!-- R1, R2 -->
  - Baseline (1280×750): header 64px, hero 80–506 (padding-block 91px/91px, stack gap 32px), terminal window top 530, session viewport 352px (scrollHeight 460, max scrollTop 108), live prompt at y 875.7–898.5 — **below the 750px fold**, confirming the problem and the filler necessity. Session clientWidth 1078px. Discovered: `document.activeElement` is the live input on load (see Assumption 8).

### Phase 2: Core Implementation

- [x] T002 [P] Tighten splash hero vertical rhythm in `sites/astro-starlight-terminal1/src/styles/terminal.css`: splash-scoped overrides for `.hero` block padding, hero stack gap, and the hero page's `.terminal-window` top margin; values tuned against the 1280×750 measurement from T001; doc pages unaffected. <!-- R1 -->
- [x] T003 Print the activation-time greeting line in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro`: named `GREETING` constant, printed as one `shell-out shell-dim` line in the activation block after `promptLine.remove()` and before `freshPrompt(false)`; keep a reference to the greeting element for T004. <!-- R3 -->
- [x] T004 Implement the resting-state top anchor in `TerminalPrompt.astro`: `anchorToGreeting()` (computes the greeting's offset in the scrollable session, extends inline `padding-bottom` by the scroll-range deficit, assigns `session.scrollTop` directly), a `resting` flag + `exitResting()` (clears the filler) called from the Enter, Ctrl-L, and Ctrl-C branches of `onKeydown`, and a `document.fonts.ready` re-anchor guarded on the user not having scrolled. <!-- R2 -->
- [x] T005 Implement the idle ghost hint in `TerminalPrompt.astro`: named constants (`HINT_TEXT`, `HINT_DELAY_MS = 4000`, `HINT_TYPE_MS = 70`), one-shot timer armed at activation, `showGhost()` (aria-hidden `.shell-ghost` span appended after the block cursor; types via `setInterval` editing `textContent`, or full text statically under `prefers-reduced-motion: reduce`), and `dismissGhost()` (clears timer + interval, removes span, one-shot latch) wired as the first action of `onKeydown`, into `onFocus`, and at the top of the terminal-surface `onClick`. <!-- R4, R5 -->
- [x] T006 [P] Add the `.shell-ghost` style to `sites/astro-starlight-terminal1/src/styles/terminal.css`: `color: var(--c-fg-faint)`, `user-select: none` — dark/light parity via the existing variable. <!-- R4 -->

### Phase 3: Integration & Edge Cases

- [x] T007 Verify edge wiring in `TerminalPrompt.astro`: Tab as first keystroke dismisses the ghost before completion runs; mid-animation dismissal clears the interval; a committed line never contains ghost text; `anchorToGreeting` no-ops safely if the greeting element is absent; Ctrl-L while resting clears the filler so the post-clear prompt bottom-pins correctly. <!-- R4, R6 -->
- [x] T008 Build (`pnpm build`) and run the full real-browser acceptance pass at 1280×750 via Playwright against the built output: prompt visible without scrolling, greeting first visible line at session top, hint appears at ~4 s then dismisses on input, no hint after early interaction, reduced-motion emulation shows static hint, dark + light parity spot-check, exactly one `[data-terminal-prompt]` line after Enter/Ctrl-L/Ctrl-C, `index.mdx` and `package.json` diff-clean. <!-- R1, R2, R3, R4, R5, R6 -->

## Execution Order

- T001 first (baseline numbers feed T002's values).
- T003 blocks T004 (the anchor targets the greeting element).
- T002 and T006 are independent CSS tasks, parallel to T003–T005.
- T007 and T008 last, after all implementation.

## Acceptance

### Functional Completeness

- [x] A-001 R1: On a 1280×750 viewport the terminal window's titlebar, the greeting line, and the live editable `$` prompt are all visible without scrolling (verified in a real browser against the built site).
- [x] A-002 R2: At activation the greeting line is the first visible line at the top of the session viewport with the live prompt directly below; the boot transcript is reachable by scrolling up; the live prompt line is the session's last DOM child.
- [x] A-003 R3: The greeting line renders on load with classes `shell-out shell-dim`, states what shll is + `type 'help' or 'ls'`, and causes no horizontal overflow of the session at 1280×750.
- [x] A-004 R4: After 4 s without interaction the ghost hint `try 'ls' ⏎` appears in the live prompt line after the block cursor; it clears on first keydown/focus/click and never reappears that page view.
- [x] A-005 R5: With `prefers-reduced-motion: reduce` emulated, the hint appears statically (full text at once, no typing interval) and dismisses identically.

### Behavioral Correctness

- [x] A-006 R2: After the first committed command (Enter) — and equally Ctrl-L / Ctrl-C — the resting filler is gone and the session bottom-pins via the existing `scrollToBottom` exactly as before this change.
- [x] A-007 R4: The ghost span is `aria-hidden="true"`, lives outside the contenteditable input span, never appears in a committed/frozen line, and showing it never focuses the input or moves the scroll position.
- [x] A-008 R6: No element is focused on page load (no autofocus); exactly one `[data-terminal-prompt]` live line exists after each of: activation, Enter-commit, Ctrl-L, Ctrl-C, Tab multi-match listing. *(Verified as exactly one live `.shell-input` line, always trailing — pre-existing `freezeInput` leaves the `data-terminal-prompt` attribute on frozen lines, so the attribute alone is not a liveness marker.)*

### Scenario Coverage

- [x] A-009 R4: Interaction before the 4 s timer fires cancels the hint for the page view (timer cleared, nothing rendered later).
- [x] A-010 R4: Tab as the very first keystroke dismisses the ghost and then runs completion normally. *(Reaching the input by keyboard fires `focus`, which already dismisses the ghost before the Tab keydown; the `onKeydown`-first wiring covers any path where focus arrives without the handler.)*
- [x] A-011 R2: With JS disabled the static transcript renders at `scrollTop = 0` exactly as today (greeting absent, fallback byte-identical).

### Edge Cases & Error Handling

- [x] A-012 R4: Dismissal mid-typing-animation clears the interval (no orphaned interval keeps writing into a removed span).
- [x] A-013 R2: The `document.fonts.ready` re-anchor does not yank the viewport if the user has already scrolled away from the anchored position. *(Code-inspected: the callback gates on `resting && |scrollTop − anchoredScrollTop| < 2`; the font-load race is not deterministically reproducible in a scripted browser.)*

### Code Quality

- [x] A-014 Pattern consistency: new code follows the island's existing naming/structure (named constants, `initTerminal`-scoped helpers, comment style); CSS reuses existing `--c-*` vars and `.shell-*` conventions.
- [x] A-015 No unnecessary duplication: reuses `print`, `freshPrompt`, `scrollToBottom`, existing skin classes; no parallel scroll/print implementations. *(The ghost's typing interval deliberately bypasses `print()` per R4 — it must not move the scroll position.)*
- [x] A-016 No magic strings/numbers: greeting copy, hint copy, idle delay, and typing cadence are named constants (`GREETING`, `HINT_TEXT`, `HINT_DELAY_MS`, `HINT_TYPE_MS`).
- [x] A-017 R6: Zero new dependencies (`package.json` unchanged); `pnpm build` produces fully static output; `index.mdx` unchanged. *(`git status`: only `TerminalPrompt.astro` + `terminal.css` modified; build completed, 43 pages.)*

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- The Playwright measurement/acceptance scripts are throwaway verification tooling (under /tmp), not committed — the site has no test runner and adding one would be an unjustified dependency (Constitution VI).

## Deletion Candidates

None — this change adds new functionality without making existing code redundant. Scan notes: every new symbol has live call sites (`anchorToGreeting` ×2, `exitResting` ×3, `dismissIdleHint` ×3, `armIdleHint`/`showIdleHint` via the timer chain); the pre-existing `scrollToBottom()` inside `freshPrompt` remains load-bearing for all post-resting prompts (the activation-time anchor merely overrides it once); the base `.terminal-window`/`.shell-session` margin rules in `terminal.css` still apply on non-hero pages and are not shadowed by the new `[data-has-hero]` overrides.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Confident | Resting-state filler: extend the session's inline `padding-bottom` by the scroll-range deficit so the greeting can sit at the viewport top; removed on first prompt-emitting interaction; live prompt stays the last DOM child | The intake's `scrollTop`-only sketch cannot reach the greeting offset (max scroll ≈ 108 px vs ≈ 400 px needed at default metrics); padding filler is the minimal mechanism honoring the intake's DOM-order decision and mirrors a real terminal's blank rows after `clear` | S:70 R:85 A:85 D:75 |
| 2 | Confident | Greeting copy shortened to `seven small CLIs that force agents to plan first. type 'help' or 'ls'.` (~71 chars) | Measured session width at 1280×750 is 1078px (~118 chars), so the intake's ~92-char draft fits there — but the session is `white-space: pre`, and the shorter copy keeps the tail invitation (`type 'help' or 'ls'.`) visible on laptops down to ~850px wide (vs ~1040px for the draft); it also avoids verbatim duplication of the hero tagline, which the above-fold layout now shows simultaneously directly above the greeting. Intake assumption #9 explicitly defers final wording to apply; voice retained | S:75 R:95 A:85 D:70 |
| 3 | Confident | Typing cadence 70 ms/char | Midpoint of the intake's ~60–80 ms band; named constant, trivially tunable | S:85 R:95 A:90 D:85 |
| 4 | Confident | `document.fonts.ready` re-anchor only runs if the user has not scrolled away from the anchored position | Prevents yanking a user-initiated scroll during the brief font-load window; intake flags fonts.ready as an apply-time detail | S:65 R:90 A:85 D:80 |
| 5 | Confident | Hero spacing values chosen by in-browser measurement at 1280×750 (recorded in T002 once tuned), scoped via splash-only selectors | Intake assumption #10 defers exact values to apply-time browser verification; the acceptance criterion is the contract, not specific rems | S:75 R:90 A:85 D:75 |
| 6 | Certain | No new automated test files; verification is the production build + scripted real-browser checks | The site has no test runner or test script; adding a test framework would be an unjustified new dependency (Constitution VI) | S:80 R:90 A:90 D:85 |
| 7 | Confident | A click on the terminal surface dismisses the ghost even when the click lands on a link or during a text selection (dismissal runs before `onClick`'s early returns) | Intake defines interaction as "click on the terminal surface" without carve-outs; link clicks navigate away anyway and selections are still interaction | S:70 R:95 A:85 D:80 |
| 8 | Confident | Gate `caretToEnd()` in `freshPrompt` to the focusing path (`focus = true`), fixing a pre-existing subtle autofocus: baseline measurement showed `document.activeElement` is the live input on page load because placing a selection range inside a contenteditable gives it focus in Chromium | The intake lists "No autofocus on page load" as an invariant to preserve (R6) and the `9vbo` memory documents it as a deliberate decision — the current behavior is an implementation bug against that documented decision, and leaving it would fail this change's own acceptance (A-008). One-line root-cause gate; the click-to-focus and Tab paths re-place the caret. Side effect: typing before clicking/tabbing no longer reaches the input — which is the documented intended behavior | S:70 R:90 A:85 D:80 |

8 assumptions (1 certain, 7 confident, 0 tentative).
