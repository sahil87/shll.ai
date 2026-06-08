# Plan: Interactive Terminal Prompt + Easter Eggs (Homepage)

**Change**: 260608-9vbo-interactive-terminal-prompt
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

All paths are under `sites/astro-starlight-terminal1/`.

### Terminal: Progressive-Enhancement Boundary

#### R1: No-JS baseline renders the static transcript verbatim
The homepage `<pre class="shell-session">` transcript MUST continue to render
exactly as it does today when JS is disabled — including the existing `<a>`
links and the final blinking `$ ▊` prompt line. The enhancement MUST NOT remove
or hide any existing markup for no-JS users (Constitution I; Accessibility).

- **GIVEN** a visitor with JS disabled (crawler / no-JS / pre-hydration paint)
- **WHEN** the homepage loads
- **THEN** the full hand-written transcript renders, the version-block `<a>`
  links work, and the final `$ ▊` line blinks as before
- **AND** no behavior or content regresses versus the current page

#### R2: JS upgrades ONLY the final prompt line into a focusable input
A client-island script in a NEW dedicated component
`src/components/TerminalPrompt.astro` (following the `Diagram.astro` precedent —
NOT an inline `<script>`) MUST locate the final prompt line via a data-attribute
hook (`data-terminal-prompt` on the final `.shell-line`), not positional
assumptions, and convert it into a real focusable, keyboard-navigable text-entry
control with a visible focus state. Typed text MUST echo at the caret in the
existing `.shell-line` styling with the blinking cursor at the caret position.

- **GIVEN** a visitor with JS enabled
- **WHEN** the page hydrates
- **THEN** the script finds the `[data-terminal-prompt]` line and makes it a
  focusable input region (tabbable, visible focus ring), leaving all prior lines
  untouched
- **AND** keystrokes echo inline; the blinking cursor sits at the caret
- **WHEN** the input has focus
- **THEN** a visible focus state meeting WCAG AA contrast is shown in both themes

#### R3: Enter dispatches against a static in-page command map and prints output in-stream
On Enter, the script MUST read the current line, split into `command [args…]`,
dispatch against a static in-page command map (no network, no SSR, no endpoint —
Constitution I), append the command echo and any output as NEW `.shell-line` /
`.shell-out` spans to the SAME `<pre class="shell-session">` stream (reusing
existing `.shell-*` classes and `--c-*` variables), then emit a fresh `$ ` prompt
line ready for the next command. Output styling MUST reuse only existing classes;
no new palette/fonts.

- **GIVEN** the enhanced prompt has focus and the user has typed a command
- **WHEN** the user presses Enter
- **THEN** the typed line is frozen as an echoed `.shell-line` (with `$ ` prompt),
  the handler's output is appended as `.shell-line`/`.shell-out` spans, and a
  fresh `$ ▊` prompt line becomes the new active input
- **AND** an empty line (Enter with no input) just emits a fresh prompt, no error

### Terminal: Command Dispatch Table

#### R4: Navigation/utility commands do real work
The command map MUST implement: `help` (lists every command with a one-line
description — the headline feature), `ls` (lists the 7 tools
`idea hop fab-kit wt run-kit tu shll`), `cd <tool>` and `open <tool>` (navigate
via `window.location` to `/tools/<tool>/overview/` for the 7 valid tools),
`install` (navigate to `/getting-started/install/`), `version` (and `shll version`
— re-print the existing 7-row version block verbatim from index.mdx data), and
`clear` (reset the transcript to a fresh single `$ ▊` prompt line).

- **GIVEN** the enhanced prompt
- **WHEN** the user runs `help`
- **THEN** every available command is listed with a one-line description as shell
  output
- **WHEN** the user runs `cd fab-kit` (or `open fab-kit`)
- **THEN** the browser navigates to `/tools/fab-kit/overview/`
- **WHEN** the user runs `cd <unknown-tool>`
- **THEN** a terminal-authentic "no such tool" line prints (and lists valid tools),
  no navigation occurs
- **WHEN** the user runs `install`
- **THEN** the browser navigates to `/getting-started/install/`
- **WHEN** the user runs `version` or `shll version`
- **THEN** the same 7 tool rows (name, `vX.Y.Z`, `[git]`) print, matching the data
  already on the page
- **WHEN** the user runs `clear`
- **THEN** the transcript resets to a single fresh `$ ▊` prompt line

#### R5: `theme` drives Starlight's existing provider/select (stays in sync)
The `theme [dark|light]` command MUST drive Starlight's EXISTING theme mechanism
(the `<starlight-theme-select>` `<select>` in the header) by setting the select's
value and dispatching a `change` event — so the header UI, the `data-theme`
attribute on `<html>`, and `localStorage` persistence all update through
Starlight's own `onThemeChange`. It MUST NOT reinvent persistence or flip
`data-theme` directly. No-arg toggles the current effective theme; `dark`/`light`
sets that theme; any other arg prints a usage line.

- **GIVEN** the page is in dark mode
- **WHEN** the user runs `theme light`
- **THEN** the page switches to light mode via the existing select, the header
  toggle reflects `light`, and the preference persists across navigation
- **WHEN** the user runs `theme` with no argument
- **THEN** the effective theme toggles (dark↔light) through the same mechanism
- **WHEN** the user runs `theme purple`
- **THEN** a usage line prints (`usage: theme [dark|light]`), no theme change

### Terminal: Easter Eggs

#### R6: Easter-egg commands are implemented in the site's voice
The map MUST implement these eggs, with copy/ASCII authored in good taste in the
site's voice (Assumption — content is the implementer's, PR-reviewed):
`whoami` (planning-themed line), `sudo [anything]` (cheeky refusal), `echo <text>`
(echo the args), `man <tool>` (one-line synopsis + overview link for valid tools),
`shll` (signature ASCII splash/manifesto), `sl` (ASCII steam-locomotive gag),
`fortune` (random dev aphorism — re-runnable, different each call, tied to "plan
before they code"), and `exit` / `:q` ("There is no escape from the shll.").

- **GIVEN** the enhanced prompt
- **WHEN** the user runs each egg command
- **THEN** the corresponding payload prints as shell output using existing
  `.shell-*` classes
- **WHEN** the user runs `fortune` repeatedly
- **THEN** it may print different aphorisms across calls
- **WHEN** the user runs `echo hello world`
- **THEN** `hello world` prints
- **WHEN** the user runs `man wt`
- **THEN** a one-line synopsis plus a link to `/tools/wt/overview/` prints

#### R7: Unknown commands return the strict contract
An unrecognized command MUST print exactly `command not found: <foo> — type 'help'`
(strict, with the `type 'help'` hint), where `<foo>` is the entered command name.

- **GIVEN** the enhanced prompt
- **WHEN** the user runs `git`
- **THEN** `command not found: git — type 'help'` prints
- **AND** no navigation or side effect occurs

### Terminal: Window Chrome (§5)

#### R8: A subtle CSS-only terminal window frame wraps the transcript
The transcript `<pre class="shell-session">` MUST be wrapped in a `.terminal-window`
frame: a bordered panel with a thin title bar carrying THREE dimmed traffic-light
dots (red/amber/green muted to the palette — not glossy macOS gradients). The frame
MUST be CSS-only in `terminal.css`, no-JS-safe, render in both themes using only
`--c-*` variables, and be scoped to the transcript ONLY (not hero/nav/page). It
MUST remain subtle (thin border + dimmed dots), preserving the restraint that the
`pdsp` decision feared. Exact dot tints / border weight / bar height are tuned by
the implementer (Assumption — PR-reviewed).

- **GIVEN** any visitor (JS on or off), in either theme
- **WHEN** the homepage renders
- **THEN** the transcript sits inside a single bordered panel with a thin title bar
  and three dimmed dots, drawn entirely from `--c-*` variables
- **AND** the frame wraps only the transcript block — the hero, nav, and rest of
  the page are unframed
- **AND** the frame renders identically with JS disabled

### Non-Goals

- Command history (up/down recall), tab-completion, a persistent cross-page prompt — deferred to a possible v2.
- Any server/SSR/runtime-fetch capability — permanently out (Constitution I).
- An npm terminal-emulator dependency — permanently out (Constitution VI).
- Changing the visual skin beyond the §5 transcript frame and the input focus/caret affordance.

### Design Decisions

1. **Client-island component, not inline script**: `TerminalPrompt.astro` with a `<script>` island imported into `index.mdx` — *Why*: matches the `Diagram.astro` precedent, keeps `index.mdx` readable, isolates behavior — *Rejected*: inline `<script>` in `index.mdx` (intake clarification #14 confirmed the component).
2. **`theme` drives the header `<select>` via a dispatched `change` event**: — *Why*: Starlight's `onThemeChange` is the single source of truth for `data-theme` + `localStorage` + picker UI sync; dispatching `change` on the select reuses it verbatim, so the prompt and header toggle never diverge — *Rejected*: flipping `document.documentElement.dataset.theme` directly (would desync the header UI and skip persistence).
3. **Hydration target located via `data-terminal-prompt` attribute**: a marker added to the final `.shell-line` in `index.mdx` — *Why*: keeps the static markup the single source of truth, avoids positional assumptions — *Rejected*: querying "last `.shell-line`" positionally (brittle if the transcript changes).
4. **Command map as a single `Record<string, handler>` of pure-ish handlers**: each handler takes `(args, ctx)` and returns lines and/or performs a navigation/theme/clear side effect — *Why*: small, auditable, zero-dependency dispatch; easy to extend — *Rejected*: an npm terminal emulator (Constitution VI).
5. **Version data duplicated as a small in-script constant**: the 7 rows are re-declared in the component to back `version` — *Why*: the script cannot read MDX-rendered DOM reliably for structured re-print, and the data is tiny/stable; the static block in `index.mdx` remains the no-JS source of truth — *Rejected*: scraping the rendered version rows from the DOM (fragile coupling to markup).

## Tasks

### Phase 1: Setup

- [x] T001 Add the `data-terminal-prompt` hook to the final prompt `.shell-line` in `src/content/docs/index.mdx` (the `$ ▊` line), leaving all other transcript markup unchanged. <!-- R2 -->

### Phase 2: Core Implementation

- [x] T002 Create `src/components/TerminalPrompt.astro` as a client-island component (Diagram.astro precedent): a `<script>` that locates `[data-terminal-prompt]`, upgrades it to a focusable input region, echoes keystrokes with the blinking caret, and handles Enter → read/split/dispatch → append output spans → emit fresh prompt. Implement the input/focus/keydown lifecycle and the in-stream output appender reusing `.shell-line`/`.shell-out`/`.shell-prompt`/`.shell-cursor` classes. <!-- R2 R3 -->
- [x] T003 Implement the static command dispatch map inside `TerminalPrompt.astro`: `help`, `ls`, `cd`/`open`, `install`, `version` (+ `shll version`), `clear`. Real `window.location` navigation for cd/open/install; verbatim 7-row version block; clear resets the stream. <!-- R4 -->
- [x] T004 Implement the `theme [dark|light]` handler in `TerminalPrompt.astro`: locate the header `<starlight-theme-select> select`, set `.value` and dispatch a `change` event; no-arg toggles effective theme (read from `document.documentElement.dataset.theme`), `dark`/`light` sets, other args print usage. <!-- R5 -->
- [x] T005 Author and implement the easter-egg handlers in `TerminalPrompt.astro` in the site's voice: `whoami`, `sudo`, `echo`, `man`, `shll` (ASCII splash), `sl` (steam locomotive), `fortune` (re-runnable list), `exit`/`:q`. <!-- R6 -->
- [x] T006 Import `TerminalPrompt` into `src/content/docs/index.mdx` and place the component so its island script runs on the homepage (alongside the existing `Diagram` import). <!-- R2 -->

### Phase 3: Integration & Edge Cases

- [x] T007 Implement the strict unknown-command path: `command not found: <foo> — type 'help'`; and the empty-Enter (fresh prompt, no error) and `cd`/`man` invalid-tool paths (terminal-authentic message, no navigation). <!-- R7 R4 R6 -->
- [x] T008 Add the `.terminal-window` frame CSS to `src/styles/terminal.css`: bordered panel + thin title bar + three dimmed traffic-light dots, using only `--c-*` variables, scoped to the transcript, both themes, no-JS-safe; and wrap the transcript `<pre class="shell-session">` in `index.mdx` with the frame markup. Add the input focus-state + caret CSS the static skin lacks. <!-- R8 R2 -->

### Phase 4: Polish

- [x] T009 Build the site (`pnpm build`) and fix any compile errors; manual read-through confirming (a) static transcript preserved for no-JS, (b) dispatch map covers every command, (c) window-frame CSS uses only `--c-*` and is transcript-scoped. <!-- R1 R8 -->

## Execution Order

- T001 precedes T002 (the hook must exist for the script to target).
- T002 is the foundation for T003, T004, T005, T007 (all add handlers to the same component).
- T006 (import) can follow T002 once the component exists.
- T008 (CSS + frame markup) is independent of the script and can run alongside, but the build verification (T009) must run last.

## Acceptance

### Functional Completeness

- [x] A-001 R1: With JS disabled, the homepage renders the full static transcript verbatim — existing `<a>` links present and working, final `$ ▊` line blinking — nothing regressed.
- [x] A-002 R2: With JS enabled, a NEW `src/components/TerminalPrompt.astro` client island (not an inline script) locates the `[data-terminal-prompt]` line and upgrades only it into a focusable, keyboard-navigable input with a visible focus state; prior lines untouched.
- [x] A-003 R3: Enter splits the line, dispatches the static map, appends echo+output as `.shell-line`/`.shell-out` spans to the same `<pre>`, and emits a fresh prompt; empty Enter yields a fresh prompt with no error.
- [x] A-004 R4: `help`, `ls`, `cd`/`open <tool>`, `install`, `version`/`shll version`, and `clear` all behave per spec; navigation commands use real `window.location` to existing routes.
- [x] A-005 R5: `theme [dark|light]` drives the header `<starlight-theme-select>` select via a dispatched `change` event; header UI, `data-theme`, and persistence stay in sync; no-arg toggles.
- [x] A-006 R6: All eight egg commands print authored, in-voice payloads using existing `.shell-*` classes; `fortune` is re-runnable; `echo` and `man` behave per scenarios.
- [x] A-007 R7: An unknown command prints exactly `command not found: <foo> — type 'help'` with no side effect.
- [x] A-008 R8: A CSS-only `.terminal-window` frame (bordered panel + thin title bar + three dimmed dots) wraps only the transcript, renders in both themes via `--c-*` variables, and is no-JS-safe.

### Behavioral Correctness

- [x] A-009 R5: The `theme` command never flips `data-theme` directly nor reinvents persistence — it goes through Starlight's `<select>`/`onThemeChange` path (verified by code inspection of the handler).
- [x] A-010 R1: The progressive-enhancement boundary holds — the static markup remains the single source of truth and the script only adds/upgrades, never deletes existing transcript content.

### Scenario Coverage

- [x] A-011 R4: `cd <invalid-tool>` and `man <invalid-tool>` print a terminal-authentic message listing valid tools, with no navigation.
- [x] A-012 R3: The transcript grows in place (new spans appended to the existing stream), preserving scroll/layout.

### Edge Cases & Error Handling

- [x] A-013 R7: Leading/trailing whitespace and case are handled sensibly (command token trimmed; unknown still strict); `clear` works mid-session.
- [x] A-014 R8: With JS disabled, the window frame still renders identically (CSS-only, no script dependency).

### Code Quality

- [x] A-015 Pattern consistency: `TerminalPrompt.astro` follows the `Diagram.astro` client-island structure (frontmatter + scoped `<style>` if needed + `<script>` module); CSS additions follow the existing `terminal.css` conventions and comment style.
- [x] A-016 No unnecessary duplication: Output reuses existing `.shell-*` classes and `--c-*` variables; no new fonts/palette; no reimplemented utilities. Magic strings (routes, tool list, version rows) are named constants in the script (code-quality: no magic strings).
- [x] A-017 Composition over inheritance / focused functions: the dispatch map and handlers are small, single-purpose functions; no god function (code-quality anti-patterns).

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- Zero new dependencies (Constitution VI); no `astro.config` change; output stays fully static (Constitution I, IV).

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Component placement: a NEW `src/components/TerminalPrompt.astro` client island imported into `index.mdx`, not an inline `<script>` | Intake clarification #14 + `Diagram.astro` precedent in scope | S:95 R:75 A:80 D:80 |
| 2 | Certain | `theme` drives Starlight's header `<starlight-theme-select>` `<select>` by setting `.value` + dispatching `change`, reusing `onThemeChange` (data-theme + localStorage + picker sync) | Read of Starlight ThemeSelect/ThemeProvider source confirms this is the single sync point; intake Assumption #11 | S:90 R:75 A:90 D:85 |
| 3 | Certain | Hydration target located via a `data-terminal-prompt` attribute on the final `.shell-line` | Intake §1 explicitly suggests this hook; keeps static markup authoritative | S:90 R:85 A:90 D:85 |
| 4 | Certain | Version `version`/`shll version` re-prints the 7 rows via a small in-script constant mirroring index.mdx; the static block stays the no-JS source | Intake Assumption #12; DOM-scrape is fragile; data is tiny/stable | S:85 R:80 A:85 D:80 |
| 5 | Confident | Egg copy/ASCII authored in the site's voice (whoami, sudo, shll/sl art, fortune list, man synopses) | Intake clarification #15 delegates content to the implementer, PR-reviewed; reversible | S:90 R:85 A:60 D:60 |
| 6 | Confident | Exact dot tints (red→accent, amber→accent[default], green→accent-2), 1px border weight, ~1.8em title-bar height | Intake Assumption #18 delegates tuning to the implementer; mapped to existing accents for restraint, PR-reviewed | S:85 R:85 A:65 D:60 |
| 7 | Confident | The input region is implemented as a `tabindex`/`contenteditable`-or-text-input control with a visible `:focus-visible` ring meeting WCAG AA in both themes | Intake §4 requires a real focusable control + visible focus; exact element choice is an implementation detail | S:80 R:80 A:80 D:65 |

7 assumptions (4 certain, 3 confident, 0 tentative, 0 unresolved).

## Review (2026-06-08)

**Verdict: PASS** (fab-fff review stage). 0 Must-fix; build green (43 pages). Two
Should-fix and two Nice-to-have findings were addressed in-stage (clear + low-effort,
per code-review.md), then the build was re-verified.

| Finding | Severity | Resolution |
|---------|----------|------------|
| Autofocus on page load steals focus + scrolls hero (`TerminalPrompt.astro`) | Should-fix | Parameterized `freshPrompt(focus = true)`; activation passes `false` (post-Enter/clear still focus). |
| `removeAttribute('tabindex')` is dead code (tabindex never set) | Should-fix | Removed; `contenteditable` is the deliberate native-focusable mechanism. |
| `role="textbox"` missing `aria-multiline="false"` | Nice-to-have | Added (and removed on freeze, alongside `aria-label`). |
| Stale comment claiming a non-existent navigation guard | Nice-to-have | Comment corrected to describe the actual async-nav behavior. |

Not changed (judged correct): the single hardcoded `#c2553f` red dot — decorative,
`aria-hidden`, muted at 0.55 opacity; reads acceptably on both theme surfaces.
Constitution V (parity) concerns mechanism-agnostic correctness, which holds.
