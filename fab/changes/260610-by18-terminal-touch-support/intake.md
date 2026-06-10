# Intake: Terminal Touch Support

**Change**: 260610-by18-terminal-touch-support
**Created**: 2026-06-10
**Status**: Draft

## Origin

> by18

One-shot `/fab-new` from backlog ID `[by18]` (`fab/backlog.md`). The full backlog entry:

> Make the homepage terminal usable on touch devices — currently unreachable on mobile. Problem: input handling in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` is keyboard/click only; there are no `touch`/`tap` handlers, tapping may not reliably raise the soft keyboard, and touch users have no ↑/↓ history or Tab completion (the affordances added in `[n23o]`). A meaningful share of traffic can't interact at all. Scope: (1) **Tap-to-focus + keyboard summon** — tapping anywhere in the `.terminal-window` reliably focuses the live contenteditable input and raises the mobile soft keyboard (the existing click-to-focus path at the bottom of the component is a starting point; verify it fires on touch and that focusing a contenteditable summons the keyboard on iOS Safari + Android Chrome). (2) **On-screen command bar** — a small row of tappable chips (`ls` `help` `version`, maybe `install`) shown on touch/narrow viewports that inject + run the command, giving mobile users the discoverability that ↑/↓/Tab give desktop users. Constraints: vanilla JS, zero new deps; dark/light parity via `--c-*` vars; the bar must be keyboard-navigable and have visible focus states (Constitution accessibility) and not appear (or be redundant) on desktop. Acceptance: on a mobile viewport, tapping the terminal raises the keyboard and focuses the prompt; the command bar runs `ls`/`help`/`version` on tap. Depends on [23xc] (prompt must be visible first). Source: terminal-UX review on 2026-06-10 (finding #3).

The `[23xc]` dependency (prompt visible above the fold) is satisfied — change `260610-23xc-terminal-interactive-above-fold` is fully done (intake → review-pr all `done`, PR #51).

## Why

1. **The pain point**: the homepage terminal — the site's signature interaction and primary discovery surface for the seven CLIs — is keyboard/click only. `TerminalPrompt.astro` has no touch-specific handling: the single pointer-input path is a `click` listener on `.terminal-window` (`onClick`, ~line 829) that focuses the live `contenteditable` input. On a phone, tapping may or may not focus + summon the soft keyboard (unverified), and even when it does, the desktop discoverability affordances (↑/↓ history, Tab completion, Ctrl-keys — change `n23o`) have no touch equivalent. The idle ghost hint says `try 'ls' ⏎` — a mobile user who can't type `ls` is being taunted.

2. **The consequence of not fixing**: a meaningful share of traffic (mobile visitors) can't interact with the centerpiece at all. The `23xc` work made the prompt visible above the fold; on touch devices that visibility now advertises an interaction that doesn't work — strictly worse than looking decorative.

3. **Why this approach**: two complementary levers from the backlog entry. (a) Make the *existing* input path work on touch — the `click` event is synthesized after a tap, and `focus()` inside a click handler is gesture-qualified (summons the keyboard on iOS Safari / Android Chrome), so the cheapest correct path is to verify and harden what's there rather than build a parallel touch-event system. (b) A tappable command bar gives touch users zero-typing access to the highest-value commands — the touch analogue of what ↑/↓/Tab give desktop users. Alternatives rejected: a fake on-screen keyboard (absurd effort, fights the OS), making the terminal read-only-with-buttons on mobile (gives up the real interaction where it does work), and doing nothing on the grounds that mobile users skim (the funnel argument cuts the other way — `install` is the primary CTA and is reachable from the terminal).

## What Changes

All work is scoped to the live site (`sites/astro-starlight-terminal1/`, Constitution II/III). Zero new dependencies, vanilla JS in the existing island, fully static output (Constitution I, VI). The static no-JS transcript in `index.mdx` stays byte-identical (the progressive-enhancement source of truth).

### 1. Tap-to-focus + soft-keyboard summon (verify + harden the existing click path)

The existing path: `clickSurface.addEventListener('click', onClick)` where `onClick` dismisses the idle hint, bails on link clicks and active text selections, then `input.focus()` + `caretToEnd()`. Browsers synthesize a `click` after a tap on non-interactive elements, and a synthesized click handler is a user gesture, so programmatic `focus()` of the contenteditable summons the soft keyboard on iOS Safari and Android Chrome. The change:

- **Add `touch-action: manipulation` to `.terminal-window`** in `terminal.css` — removes double-tap-to-zoom heuristics that can delay or swallow the synthesized click, and prevents accidental zoom on rapid chip taps. CSS-only, no behavior change for mouse users.
- **Verify the two `onClick` bails don't eat taps**: the link bail (`target?.closest('a')`) must keep letting transcript links navigate on tap; the selection bail (`getSelection()?.toString() !== ''`) must not swallow a tap that follows an earlier long-press selection (on tap, engines clear the stale selection before dispatching click — verify, don't assume).
- **Fallback only if verification fails**: if touch emulation / device spot-checks show the synthesized click is unreliable, add a `touchend`-based focus fallback (no `preventDefault`, gesture-qualified, deduped against the click path). Not built speculatively.

### 2. On-screen command bar (touch viewports only)

A row of tappable command chips attached to the terminal window, giving touch users one-tap access to the commands the ghost hint and `help` advertise.

**Markup** — island-injected at activation (inside `initTerminal`, after the click-surface wiring), NOT static markup in `index.mdx`: with JS off the chips could do nothing, and dead buttons violate both the progressive-enhancement boundary and Constitution accessibility. Shape:

```html
<div class="terminal-cmdbar" role="group" aria-label="quick commands">
  <button type="button" class="terminal-chip" data-cmd="ls">ls</button>
  <button type="button" class="terminal-chip" data-cmd="help">help</button>
  <button type="button" class="terminal-chip" data-cmd="version">version</button>
  <button type="button" class="terminal-chip" data-cmd="install">install</button>
</div>
```

Inserted as the last child of `.terminal-window`, directly below the `pre.shell-session` scroll viewport — it reads as a keyboard-accessory row on the terminal's bottom edge, adjacent to where the OS keyboard appears. Chips are native `<button>`s: tap, Enter, and Space all fire `click`; keyboard-navigable by default; visible `:focus-visible` ring (Constitution accessibility).

**Visibility** — hidden by default; shown only on touch-primary devices via a CSS media query in `terminal.css`:

```css
.terminal-cmdbar { display: none; }
@media (hover: none) and (pointer: coarse) {
  .terminal-cmdbar { display: flex; flex-wrap: wrap; }
}
```

`(hover: none) and (pointer: coarse)` is the touch-primary signal — the bar appears on phones/tablets regardless of width and never on desktop (including narrow desktop windows, where the full keyboard affordances already work). "Not appear on desktop" chosen over "render but redundant".

**Skin** — existing `--c-*` variables only (Constitution V): bar background `var(--c-surface)` with a `1px solid var(--c-border)` top border (matching the titlebar's chrome language); chips transparent with `1px solid var(--c-border)`, small radius, `var(--c-fg)` text in the inherited mono font; `:focus-visible` outline in `var(--c-accent)`. No animation — nothing new to gate behind `prefers-reduced-motion`.

**Behavior** — a chip tap runs the command exactly as if the user had typed it and pressed Enter:

1. `dismissIdleHint()` (a chip tap is interaction; the click handler on the window surface may already cover this — verify, don't double-fire).
2. Set the live input's text to the chip's `data-cmd`.
3. Commit through the **same path Enter uses**: echo/freeze the line (`freezeInput()`), push to history (with `ignoredups` + sessionStorage persistence), `exitResting()`, dispatch via `COMMANDS`, print output, emit exactly one fresh prompt. To share this path, extract the Enter-branch commit sequence in `onKeydown` into a `commitLine(focusNext: boolean)` helper reused by both Enter (`focusNext = true`) and the chip path (`focusNext = false`) — same extraction precedent as `freezeInput(suffix?)` in `n23o`, so commit semantics can never drift between typed and tapped commands.
4. **Do not focus the contenteditable on the chip path** (`freshPrompt(false)`): focusing would summon the soft keyboard over the output the user just asked for. A user who taps chips is in touch mode; the keyboard appears only when they tap the prompt itself.

The `install` chip dispatches the existing `install` command — a real `window.location.assign('/getting-started/install/')` navigation, identical to typing it. Chip-run commands appear in ↑/↓ history and the `history` command (same array, same commit path).

**Invariants upheld**: the chip path adds one prompt-emitting path, and it goes through the shared commit helper, so the exactly-one-trailing-prompt invariant holds by construction. The bar lives outside the `pre.shell-session`, so the resting-state top anchor, `scrollToBottom`, and the session's DOM-order invariant (live prompt = last child of the session) are untouched.

### 3. Verification approach

Touch behavior is verified via Chromium touch emulation (DevTools device mode / Playwright `hasTouch`) for: tap focuses the input, chips run commands, the bar's media-query visibility, link taps still navigate. The soft-keyboard summon itself cannot be asserted headlessly — it follows from `focus()` being gesture-qualified (verified by `document.activeElement === input` after a synthesized tap) plus a manual device spot-check on iOS Safari / Android Chrome as a best-effort acceptance pass.

## Affected Memory

- `site/homepage-terminal`: (modify) — site-local memory tree (`sites/astro-starlight-terminal1/docs/memory/`). Add a touch-input section (tap-to-focus hardening incl. `touch-action: manipulation`, the command-bar mechanism + coarse-pointer visibility, the chip no-focus decision, the `commitLine` extraction), and extend the Requirements and Changelog sections.

## Impact

- `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` — extract `commitLine(focusNext)` from the Enter branch of `onKeydown`; inject the `.terminal-cmdbar` at activation; chip click handler; possible `touchend` fallback (only if verification demands it).
- `sites/astro-starlight-terminal1/src/styles/terminal.css` — `.terminal-cmdbar` / `.terminal-chip` rules + the `(hover: none) and (pointer: coarse)` media query; `touch-action: manipulation` on `.terminal-window`.
- `sites/astro-starlight-terminal1/src/content/docs/index.mdx` — expected unchanged (static fallback stays byte-identical).

## Open Questions

- None — the backlog entry is detailed enough that all decision points resolved to Certain/Confident grades (see Assumptions).

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Scope = the two backlog items (tap-to-focus + command bar); no touch substitutes for ↑/↓/Tab beyond the bar itself | Backlog entry enumerates scope explicitly; the bar IS the stated touch analogue of those affordances | S:95 R:85 A:90 D:90 |
| 2 | Confident | Command bar chips: `ls`, `help`, `version`, **and** `install` | Backlog says "maybe install"; included — install is the site's primary CTA and the chip reuses the existing command's real navigation | S:70 R:90 A:80 D:75 |
| 3 | Confident | Bar visibility via `@media (hover: none) and (pointer: coarse)`; `display: none` on desktop | Standard touch-primary signal; backlog allows "not appear or be redundant" — not-appear chosen since desktop already has full keyboard affordances; narrow *desktop* windows deliberately excluded | S:65 R:85 A:75 D:65 |
| 4 | Confident | Bar placement: last child of `.terminal-window`, directly below the `.shell-session` viewport | Reads as a keyboard-accessory row at the terminal's bottom edge, adjacent to where the OS keyboard rises; trivially movable | S:55 R:85 A:70 D:60 |
| 5 | Certain | Chips commit through the existing Enter path via a shared `commitLine(focusNext)` extraction (echo/freeze → history → dispatch → one fresh prompt) | Determined by the exactly-one-trailing-prompt invariant + the `freezeInput` extraction precedent (`n23o`) — any parallel path would duplicate or drift | S:85 R:80 A:95 D:90 |
| 6 | Confident | Chip-run does NOT focus the input (`freshPrompt(false)`) — no soft-keyboard pop on chip taps | Focusing would summon the keyboard over the output just requested; consistent with the project's no-autofocus precedent (`9vbo`/`23xc`); one-parameter flip if wrong | S:40 R:85 A:65 D:70 |
| 7 | Confident | Tap-to-focus rides the existing synthesized-click path, hardened with `touch-action: manipulation`; a `touchend` fallback is built only if verification fails | Backlog itself frames the click path as "a starting point; verify"; synthesized click + gesture-qualified `focus()` is the platform-standard mechanism | S:80 R:80 A:70 D:75 |
| 8 | Certain | Chips are native `<button>`s, keyboard-operable, with visible `:focus-visible` states | Constitution Accessibility mandates keyboard navigation + visible focus; native buttons are the only zero-dep way to get tap/Enter/Space for free | S:90 R:90 A:95 D:90 |
| 9 | Certain | Bar is island-injected at activation; `index.mdx` static transcript stays byte-identical | Progressive-enhancement boundary (memory: no-JS source of truth) — static chips would be dead buttons without JS, violating PE + accessibility; greeting-line precedent (`23xc`) | S:80 R:80 A:95 D:90 |
| 10 | Certain | Skin via existing `--c-*` variables only; both themes; no new animation | Constitution V (dark/light parity) + backlog constraint verbatim | S:95 R:90 A:95 D:90 |
| 11 | Certain | Zero new dependencies; vanilla JS inside the existing `TerminalPrompt.astro` island; output fully static | Constitution I + VI + backlog constraint verbatim | S:95 R:90 A:95 D:95 |
| 12 | Certain | Chip tap = full interaction semantics: dismisses the idle ghost hint, calls `exitResting()`, enters history — identical to Enter | Determined by the `23xc`/`n23o` interaction invariants in memory (hint dismissal precedes everything; resting exits on prompt-emitting interactions) | S:85 R:80 A:95 D:90 |
| 13 | Confident | Verification = Chromium touch emulation (activeElement assertions) + manual iOS Safari / Android Chrome spot-check; keyboard summon itself is not headlessly assertable | No device farm in CI; emulation covers focus/dispatch/visibility, the gesture-qualified `focus()` → keyboard chain is platform behavior verified by spot-check | S:50 R:90 A:70 D:65 |

13 assumptions (7 certain, 6 confident, 0 tentative, 0 unresolved).
