---
description: "The homepage's interactive terminal prompt (changes 9vbo, n23o, 23xc): the progressive-enhancement boundary (static `<pre class=\"shell-session\">` transcript is the no-JS source of truth; `TerminalPrompt.astro` client island upgrades ONLY the final `[data-terminal-prompt]` line into a focusable `contenteditable` input, no autofocus on load), the static client-side command dispatch map (help/ls/cd·open/install/version/theme/history/clear + eggs whoami·sudo·echo·man·shll·sl·fortune·exit·:q, strict `command not found`), the shell affordances on `onKeydown` (↑/↓ command history with sessionStorage persistence + `ignoredups`, bash-like Tab-completion, Ctrl-L clear / Ctrl-C cancel — all upholding the exactly-one-trailing-prompt invariant), the `theme` → `<starlight-theme-select>` `change`-event sync, the `.terminal-window` CSS chrome (1px border + thin title bar + 3 dimmed dots — a deliberate reversal of `260517-pdsp-terminal-skin`'s no-chrome decision), and the above-fold activation pass (change 23xc: `[data-has-hero]`-scoped hero rhythm tightening, the resting-state top anchor — greeting line first visible via an inline `padding-bottom` filler; bottom-pinning resumes on the first prompt-emitting interaction — the activation-time greeting line, and the one-shot 4 s idle ghost hint `$ ▊try 'ls' ⏎`, aria-hidden, visual-only, reduced-motion-safe)"
---
# Homepage Interactive Terminal

## Overview

The homepage hero (`src/content/docs/index.mdx`) is a terminal transcript that **looks** interactive. Change `9vbo` makes the final prompt line **actually typeable** — keystrokes echo, Enter runs a command against a static in-page map, output prints in the same styled stream — layered as a **progressive enhancement** so nothing regresses without JS. The terminal SKIN (JetBrains Mono, phosphor-amber `--c-*` palette, `.shell-*` classes) shipped earlier in `260517-pdsp-terminal-skin`; this change adds behavior on top of that skin (reusing its classes verbatim) plus **one** deliberate visual addition — a `.terminal-window` frame around the transcript. Change `n23o` layers real shell affordances onto input handling (§ Shell affordances); change `23xc` makes the interactivity **discoverable above the fold** (§ Above-the-fold activation pass).

All work is scoped to this site only (`sites/astro-starlight-terminal1/`, the LIVE build per `SITE_DIR`). Zero new dependencies; output stays fully static (Constitution I, VI).

## The progressive-enhancement boundary (load-bearing)

The static `<pre class="shell-session">` transcript in `index.mdx` is the **no-JS source of truth** — crawlers, no-JS, and pre-hydration paint see the full hand-written transcript verbatim, including the version-block `<a>` links and the final blinking `$ ▊` line. Nothing regresses without JS.

`src/components/TerminalPrompt.astro` is a **client island** following the `Diagram.astro` precedent (frontmatter comment + a single `<script>` module island). With JS on, it:

1. Locates the final prompt line via the **`data-terminal-prompt`** attribute (a marker on the last `.shell-line` in `index.mdx`), not positional assumptions — keeping the static markup authoritative.
2. **Removes** that static `$ ▊` line, prints the greeting line (change `23xc`, § Above-the-fold activation pass), and emits the first live prompt in its place: a `.shell-line` containing a `.shell-prompt` `$` and a focusable `<span class="shell-input" contenteditable="true">` input region — `contenteditable="true"` plus an explicit plain-text paste handler, NOT `plaintext-only` (inconsistently supported; see § Accessibility).
3. On **Enter**: trims the line, freezes the just-entered input into static echoed text (strips `contenteditable`/`role`/aria/listener/`.shell-input`), dispatches the command, appends output spans to the **same** `<pre>` stream, and emits a fresh prompt.

**No autofocus on page load (deliberate).** `freshPrompt(focus = true)` defaults to focusing, but the initial activation calls `freshPrompt(false)` — auto-focusing on load would steal focus and scroll the hero out of view (disruptive for keyboard/SR users). Focus moves to the prompt only **after** the user runs a command (Enter / `clear`). This was a Should-fix finding addressed in the review stage.

## Command dispatch map (static, client-side, no network)

A single `COMMANDS: Record<string, Handler>` of pure-ish handlers `(args, ctx) => Line[] | void` inside `TerminalPrompt.astro`. No SSR, no endpoint, no fetch (Constitution I). The full set:

**Navigation / utility (real work):**

| Command | Behavior |
|---------|----------|
| `help` | Lists the on-menu commands with one-line descriptions, then a `shell-comment` hint that "a few commands aren't on this list" — the eggs are intentionally NOT enumerated in `help` (organic discovery). |
| `ls` | Prints the 7 tools `idea hop fab-kit wt run-kit tu shll` as overview links (`html: true`). |
| `cd <tool>` / `open <tool>` | Real `window.location.assign` to `/tools/<tool>/overview/` for the 7 valid tools; invalid tool → "no such tool" + the valid list, no navigation. |
| `install` | `window.location.assign('/getting-started/install/')`. |
| `version` (+ `shll version` alias) | Re-prints the version rows **captured from the rendered `<VersionTable/>` output** at init (`versionRowsHtml`) — NOT a hardcoded list. Since `#47` the page's `$ shll version` block is self-updating (build-time, from `help/*.json`, with the `run-kit → rk` display label); the terminal mirrors it verbatim so the two never drift. Rows carry short-URL tool links (`/shll`) + `[git]` links. |
| `theme [dark\|light]` | Drives Starlight's **existing** theme mechanism (see below). |
| `history` | Prints the in-memory command history, one indexed (1-based, right-padded) `shell-out` line each — reading the **same** array the ↑/↓ recall walks, so the two can never disagree. Empty history prints `no history yet` (`shell-dim`). Added by change `n23o`; also listed in `help`. |
| `clear` | `session.replaceChildren()` then a fresh prompt. |

**Easter eggs** (named after commands a dev would naturally try — for organic discovery): `whoami` (planning-themed), `sudo [anything]` (cheeky refusal), `echo <text>`, `man <tool>` (one-line synopsis from the in-script `SYNOPSIS` map + overview link; invalid tool → the valid list), `shll` (ASCII splash / manifesto), `sl` (ASCII steam-locomotive — the fat-finger-of-`ls` gag), `fortune` (random aphorism from the in-script `FORTUNES` list, re-runnable), `exit` / `:q` ("There is no escape from the shll.").

**Unknown command:** strict `command not found: <foo> — type 'help'` (`<foo>` is the entered token, original case). The `shll version` alias is rewritten to `version` before dispatch. Empty Enter just emits a fresh prompt, no error.

Egg copy/ASCII was authored at apply time in the site's voice and PR-reviewed (reversible content). Route strings, the tool list, version rows, synopses, and fortunes are named constants (no magic strings).

### `theme` syncs with Starlight (does not reinvent persistence)

`setTheme` locates the header `starlight-theme-select select`, sets `select.value` to the target, and dispatches a bubbling `change` event — so the header toggle UI, `<html data-theme>`, and `localStorage` all update through Starlight's own `onThemeChange`. It MUST NOT flip `data-theme` directly nor reinvent persistence. No-arg toggles the effective theme (read from `document.documentElement.dataset.theme`); `dark`/`light` sets it; any other arg prints `usage: theme [dark|light]`. A direct `data-theme` flip exists only as a fallback if the header select is absent.

## Shell affordances on `onKeydown` (change `n23o`)

Change `n23o` makes the prompt behave like a real shell rather than a form field. All three features live in input handling (`onKeydown` + module-scoped state inside `initTerminal`) and reuse existing plumbing (`COMMANDS`, `TOOLS`, `freshPrompt`, `clear`, `caretToEnd`, `print`); zero new dependencies (Constitution VI), no markup/content change. The `onKeydown` branch order is: Ctrl-combos → ↑/↓ → Tab → Enter → native fall-through.

**The exactly-one-trailing-prompt invariant (load-bearing).** The most fragile part of this change. Ctrl-L and Ctrl-C are prompt-emitting paths **outside** the Enter→`run`→`freshPrompt` flow, so each must emit exactly one trailing prompt itself — never two, never zero. The Tab multiple-match listing deliberately does NOT commit/freeze the line (so it adds no prompt-emitting path at all).

### Command history (↑ / ↓ recall)

- **State at `initTerminal` scope** (one history per terminal instance, NOT inside `freshPrompt` which runs per prompt): `history: string[]` of committed, non-empty, trimmed **raw** lines + a `historyCursor` ranging `[0, history.length]`, where `length` is the "blank draft" slot past the newest entry. ↑ (`navigateHistory(-1)`) walks toward 0; ↓ (`navigateHistory(1)`) walks toward `length`, where it restores a **blank** line (drafting a new command), not the newest entry. Caret to end via `caretToEnd()`. Because the prompt is enforced single-line (paste flattened, `aria-multiline=false`), ↑/↓ drive history unconditionally rather than caret movement.
- **`ignoredups`** (bash behavior): on Enter commit a line is pushed only if it differs from the immediately previous entry; the cursor then resets to `history.length`. Ctrl-C also resets the cursor to the blank-draft slot (so the next ↑ starts from the newest entry).
- **sessionStorage persistence** under the named key `shll:terminal:history` (deliberately NOT `localStorage` — a refresh keeps recent commands, but a new browser session starts clean). Read once at init via `loadHistory()`, written on each commit via `saveHistory()`. **All** access is try/catch-guarded: private-mode / disabled-storage / quota degrades silently to in-memory-only and never throws, and a malformed / non-array payload coerces to `[]` (the parsed array is also filtered to strings).

### Tab-completion (bash-like)

`completeInput()` completes the token under edit. First token → `COMMANDS` keys; second token → `TOOLS` when the first token is a tool-arg command (`cd` / `open` / `man`, the `TOOL_ARG_COMMANDS` list). Resolution over the candidates matching the typed fragment:

- **single match** → fill it (`fillToken` rejoins the line, preserving any `cd `/`open `/`man ` prefix), caret to end.
- **longest common prefix > typed** → fill the shared prefix (partial completion), no listing.
- **multiple matches, no LCP gain** → `printBeforePrompt({ text: matches.join('  '), classes: 'shell-out' })` lists the candidates ABOVE the still-live input — WITHOUT freezing the line or emitting a new prompt (input text + caret untouched). It uses `printBeforePrompt` (insert before the live prompt line), NOT `print` (append to end of `session`): `print` would drop the listing BELOW the live prompt — the prompt would no longer be the trailing line. This is the chosen path (over freeze→reseed) precisely because it adds no prompt-emitting path, keeping the one-trailing-prompt invariant trivially intact.
- **no match** → no-op (input unchanged, nothing printed).

### Control keys (Ctrl-L, Ctrl-C)

Detected only on an unmodified Ctrl combo (`e.ctrlKey && !shift && !alt && !meta`) so e.g. Ctrl-Shift-C copy is left to the browser; other Ctrl combos fall through to native handling.

- **Ctrl-L** → `preventDefault()` (Ctrl-L otherwise focuses the address bar), reuse `clear()` (which deliberately does NOT emit a prompt itself), then exactly one `freshPrompt()`.
- **Ctrl-C** → `preventDefault()`, `freezeInput('^C')` (freeze the live line with a trailing `^C` like a real shell aborting a line), discard the typed input (do **not** run it), reset `historyCursor`, then one `freshPrompt()`. Empty input still freezes `$ ^C` + one prompt.

### `freezeInput(suffix?)` helper

The Enter-branch line tear-down (live input → static echoed text: strip `contenteditable`/`role`/`aria-multiline`/listeners/`shell-input` class, drop the block cursor) was **extracted** from the inline Enter logic into a shared `freezeInput(suffix = '')` helper, reused by both Enter (commit, no suffix) and Ctrl-C (cancel, `'^C'` suffix) so the freeze semantics can never drift between them. The optional `suffix` is appended to the echoed text.

## Above-the-fold activation pass (change `23xc`)

On a common ~1280×750 laptop viewport the live prompt sat **below the fold** (baseline measurement: Starlight's splash hero `padding-block` resolved to ~91px each side; the live prompt landed at y≈876 against a 750px fold) — the terminal, the site's signature interaction, read as a decorative screenshot. Change `23xc` makes the interactivity discoverable with three combined levers, all activation-time, zero new dependencies, `index.mdx` byte-identical. It explicitly sequences **before** the queued polish items `[by18]` (touch), `[cuur]` (command UX + a11y), `[o33t]` (delight) — they polish a surface visitors must first be able to see.

### Hero rhythm tightening (CSS-only, splash-scoped)

`terminal.css` overrides scoped via **`[data-has-hero]`** — Starlight's own splash-page attribute on `<html>`, present on hero pages only — so doc pages render with unchanged spacing, and the extra attribute outranks Starlight's `:where()`-scoped component rules without `!important`. Values: `.hero` `padding-block: 3rem 1.5rem`, `.hero .stack` `gap: 1.5rem`, `.terminal-window` `margin-top: 0.75rem` (tuned by in-browser measurement at 1280×750). The base `.terminal-window`/`.shell-session` margin rules still apply on non-hero pages — they are not shadowed.

### Resting-state top anchor (scroll geometry, not content)

Until the first prompt-emitting interaction the session viewport is **top-anchored**: the greeting line is the first visible line, the live `$` prompt sits directly below it, and the boot transcript stays in the DOM above, reachable by scrolling up — exactly like a real terminal after `clear`.

- `anchorToGreeting(greetingEl)` computes the greeting's offset within the scrollable session (bounding-rect delta + `scrollTop` − the session's top padding) and assigns `session.scrollTop` directly — instant, no smooth scrolling (trivially motion-safe). A `scrollTop`-only approach is **mathematically insufficient**: the content below the greeting (~2 lines) is far shorter than the ~325px viewport, so max scroll (≈108px) cannot reach the greeting's offset (≈400px). The function therefore extends the session's **inline `padding-bottom`** by exactly the deficit — the blank rows a real terminal shows after `clear`. This is scroll geometry, not content: the live prompt remains the session's **last DOM child**, so the exactly-one-trailing-prompt invariant is untouched.
- **Re-anchored once after `document.fonts.ready`** (JetBrains Mono loads async and shifts line metrics), guarded on still-`resting` AND the user not having scrolled away from the anchored position (`|scrollTop − anchoredScrollTop| < 2`) — never yanking a user-initiated scroll.
- **`exitResting()`** — called from the three prompt-emitting branches of `onKeydown` (Enter, Ctrl-L, Ctrl-C) — flips the `resting` flag and clears the inline filler; the original bottom-pinned behavior (`scrollToBottom` after `print`/`freshPrompt`) resumes unchanged for the rest of the session.
- **No-JS**: the static transcript renders at browser-default `scrollTop = 0` exactly as before — the anchor is island-only.

### Activation-time greeting line

Printed by the island at activation — after `promptLine.remove()`, before `freshPrompt(false)` — one dim line (classes `shell-out shell-dim`, named `GREETING` constant):

```
seven small CLIs that force agents to plan first. type 'help' or 'ls'.
```

The copy deliberately omits the literal "shll" / the verbatim hero tagline — the tagline renders directly above the terminal in the tightened hero, and the shorter copy keeps the tail invitation (`type 'help' or 'ls'.`) visible under the session's `white-space: pre` on narrower laptops. Island-printed only: the static no-JS transcript stays byte-identical (the progressive-enhancement source of truth).

### Idle ghost hint (one-shot, visual-only)

A one-shot timer (`HINT_DELAY_MS = 4000`) armed at activation. After 4 s without interaction, `showIdleHint()` appends a **visual-only** `aria-hidden="true"` span (class `shell-ghost`, copy `HINT_TEXT`) to the live prompt line **after** the block cursor, fish-autosuggestion style: `$ ▊try 'ls' ⏎`.

- It is never inside the contenteditable input — never part of the textbox's accessible name/value, can never be submitted by Enter, and **never focuses the input** (the deliberate `9vbo` no-autofocus decision stands — the hint draws the eye, it does not steal focus).
- Types in character-by-character via `setInterval` (`HINT_TYPE_MS = 70`) editing the span's `textContent` in place — deliberately NOT `print()`/`scrollToBottom()`, so the typing never moves the scroll position. Under `prefers-reduced-motion: reduce` (checked via `window.matchMedia`) the full text appears statically — no typing interval, still dim, still dismissable.
- `dismissIdleHint()` is a one-shot latch (`hintSpent`): interaction **before** the timer fires cancels it; **after**, it removes the span and clears a mid-animation interval; either way the hint never returns this page view (no re-arm, no storage — it returns on the next page load until the visitor interacts). Wired as the **first statement of `onKeydown`** (before branch dispatch, so Tab as the very first keystroke dismisses the ghost before completion logic runs), into `onFocus`, and at the top of the terminal-surface `onClick` before its link/selection early-returns (a link click or in-progress text selection still counts as interaction).
- Skin: `.shell-ghost` is `color: var(--c-fg-faint)` + `user-select: none` — both themes for free via the shared variable.

### Pre-existing autofocus bug fixed

Baseline measurement found `document.activeElement` was the live input **on page load**: `freshPrompt`'s unconditional `caretToEnd()` placed a selection range inside the contenteditable, which gives it focus in Chromium — silently violating the documented `9vbo` no-autofocus decision. `caretToEnd()` is now **gated to the focusing path** (`focus = true`); the click-to-focus and Tab paths re-place the caret themselves. The implementation now matches the documented invariant (typing before clicking/tabbing no longer reaches the input — the documented intended behavior).

## Terminal window chrome (`terminal.css`, deliberate `pdsp` reversal)

The transcript `<pre class="shell-session">` in `index.mdx` is wrapped in a `<div class="terminal-window">` with a `<div class="terminal-titlebar" aria-hidden="true">` carrying three dimmed dots. The CSS (scoped to the transcript, both themes via `--c-*`):

- `.terminal-window`: `1px solid var(--c-border)`, `border-radius: 6px`, `background: var(--c-bg)`, `overflow: hidden`.
- `.terminal-titlebar`: `height: 1.8em`, `background: var(--c-surface)`, bottom border `--c-border`.
- Three `.terminal-dot`s at `opacity: 0.55`: dot-1 → a muted **hardcoded `#c2553f`** red, dot-2 → `var(--c-accent)` (amber, the brand accent), dot-3 → `var(--c-accent-2)` (green).
- Inside the frame `.shell-session` drops its outer margin and gains `0.85rem 1rem` padding.

This is a **deliberate reversal** of `260517-pdsp-terminal-skin`'s explicit "no window chrome" decision (which feared "full terminal pastiche … irritating on the second [visit]"). Justified by changed context: the transcript is now an **interactive** region and the frame is a **functional affordance** signalling "you can type here", not decorative pastiche. The restraint that addressed pdsp's fear is preserved: scoped to the transcript alone (not the hero/nav/page), 1px border + dimmed dots, no glossy macOS gradients. CSS-only and no-JS-safe — the frame renders identically with JS off.

## Accessibility

- The input is a real focusable, keyboard-navigable control: `contenteditable="true"` with `role="textbox"`, `aria-multiline="false"`, an `aria-label`, and `spellcheck`/`autocapitalize`/`autocorrect` off, plus an explicit `paste` handler that forces `text/plain` and flattens newlines (so a multiline/formatted clipboard payload can't distort the single prompt line — robust regardless of `plaintext-only` browser support, a PR-review fix). (No `tabindex` is set — `contenteditable` is the deliberate native-focusable mechanism.)
- **Block cursor, not the OS caret.** The native text-caret is hidden (`caret-color: transparent`) and a trailing `.shell-input-cursor` block (`▊`, reusing the static skin's `.shell-cursor` glyph + `shell-blink`) stands in, so the prompt reads like a TTY rather than a form field. The block blinks only while focused (`.is-active`, toggled on `focus`/`blur`); idle it is dimmed and steady. There is **no** focus-ring box outline (it read as a form field — removed).
- **Click anywhere in the terminal focuses the prompt** (caret to end), matching how a real terminal grabs the cursor. The handler skips clicks on links (let them navigate) and skips when text is selected (don't steal a copy-selection); the surface gets `cursor: text` to hint it's typeable.
- `cd` / `open` / `install` / `man` resolve to **real** `window.location` navigation, never a JS-only dead end. No-JS users keep the static transcript's working `<a>` links; the enhancement never removes or hides them.
- The title-bar dots are `aria-hidden` decoration.

## Requirements

- The no-JS baseline MUST render the full static transcript verbatim (links + blinking `$ ▊`); the enhancement only adds/upgrades, never deletes existing transcript content.
- JS MUST upgrade ONLY the `[data-terminal-prompt]` line; the hydration target MUST be located by that attribute, not positional assumptions.
- Dispatch MUST be a static in-page map — no network/SSR/endpoint/fetch (Constitution I).
- Unknown commands MUST print exactly `command not found: <foo> — type 'help'` with no side effect.
- `theme` MUST drive Starlight's `<starlight-theme-select>` via a dispatched `change` event — never flip `data-theme` directly nor reinvent persistence.
- Output MUST reuse only existing `.shell-*` classes + `--c-*` variables; new CSS is limited to the `.terminal-window` frame, the fixed-height scroll viewport, and the block-cursor/input state (Constitution V parity is free).
- The `.terminal-window` frame MUST be CSS-only, no-JS-safe, transcript-scoped, both themes.
- Inside the frame the `.shell-session` is a **fixed-height scroll viewport** (`height: 22rem`, `max-height: 60vh`, `overflow-y: auto`): output scrolls up as it grows rather than the panel expanding. JS pins the newest line to the bottom (`scrollToBottom()` after `print`/`freshPrompt`) — **except in the resting (pre-interaction) state**, which is top-anchored to the greeting line until the first prompt-emitting interaction (change `23xc`, § Above-the-fold activation pass); bottom-pinning resumes from `exitResting()` on. The no-JS static transcript is short enough to sit within the fixed height.
- The shell affordances (change `n23o`) MUST uphold the **exactly-one-trailing-prompt invariant** on every prompt-emitting path: Ctrl-L (`clear()` + one `freshPrompt()`) and Ctrl-C (`freezeInput('^C')` + one `freshPrompt()`) each emit exactly one; Tab listing emits none (no freeze/commit).
- ↑/↓ history recall and the `history` command MUST read the **same** `initTerminal`-scoped array; persistence MUST use `sessionStorage` (NOT `localStorage`) under a named key with **all** access try/catch-guarded (silent degrade to in-memory; malformed payload → `[]`).
- Tab-completion MUST complete the first token against `COMMANDS` keys and the second against `TOOLS` only for the tool-arg commands `cd`/`open`/`man`; resolution is single-fill / LCP-fill / multi-list / no-op, and the multi-match listing MUST NOT freeze the line.
- The Enter and Ctrl-C freeze logic MUST share one `freezeInput(suffix?)` helper (no copy-paste drift).
- The hero rhythm overrides (change `23xc`) MUST stay scoped via `[data-has-hero]` (Starlight's splash-page attribute on `<html>`) so non-hero/doc pages render with unchanged spacing.
- The resting-state anchor (change `23xc`) MUST be scroll geometry only: an inline `padding-bottom` filler + direct instant `scrollTop` writes (no smooth scrolling); the live prompt stays the session's last DOM child; the filler MUST be cleared by `exitResting()` on the first prompt-emitting interaction (Enter / Ctrl-L / Ctrl-C).
- The greeting (change `23xc`) MUST be island-printed only — one `shell-out shell-dim` line before the first prompt; the static no-JS transcript in `index.mdx` stays byte-identical.
- The idle ghost hint (change `23xc`) MUST be visual-only (`aria-hidden`, outside the contenteditable, never submittable, never focuses the input), MUST honor `prefers-reduced-motion: reduce` (static text, no typing interval), MUST never move the scroll position, and its dismissal MUST run before any `onKeydown` branch dispatch. One-shot per page view — no re-arm, no storage gating.
- Zero new dependencies; no `astro.config` change; output stays fully static (Constitution I, IV, VI).

## Design Decisions

- **Client island, not inline `<script>`** (`TerminalPrompt.astro`, imported into `index.mdx`) — matches the `Diagram.astro` precedent, keeps `index.mdx` readable, isolates the behavior. (Intake clarification #14.)
- **Hydration target via `data-terminal-prompt`** on the final `.shell-line` — keeps the static markup the single source of truth; avoids brittle positional "last `.shell-line`" queries.
- **`theme` drives the header `<select>` via a dispatched `change` event** — reuses Starlight's `onThemeChange` (the single sync point for `data-theme` + `localStorage` + picker UI), so the prompt and header toggle never diverge.
- **`version` is sourced from the rendered DOM, NOT a hardcoded constant** — since `#47` the homepage `$ shll version` block is rendered by `<VersionTable/>` (build-time, self-updating from `help/*.json`, incl. the `run-kit → rk` display label). At init the terminal snapshots those already-rendered version rows (`.shell-line`s carrying a `[git]` link → `versionRowsHtml`) and `version` re-prints them verbatim. The terminal and the page can never drift; version bumps / roster-label changes flow through automatically. (Supersedes the original in-script `VERSIONS` constant, removed when `#47` made the block self-updating.)
- **No autofocus on page load** (`freshPrompt(false)` at activation) — avoids stealing focus / scrolling the hero; focus follows command execution only.
- **Block cursor instead of the OS caret** — `caret-color: transparent` + a trailing `.shell-input-cursor ▊` (reusing the static skin's glyph/blink), blinking only when focused. The native I-beam-in-a-box read as a form field; a block reads as a TTY and matches the no-JS `$ ▊`.
- **Click-anywhere-to-focus** — a click handler on the `.terminal-window` (fallback: the session) focuses the live prompt and moves the caret to end, but bails on link clicks and active text selections so it never fights the user.
- **Fixed-height scroll viewport** — the in-frame `.shell-session` has a fixed height and scrolls; the panel doesn't grow with output. Earlier it expanded unbounded, which broke the "terminal window" feel.
- **Eggs are NOT listed in `help`** — named after commands a dev would naturally try, surfaced via a "curious dev might try the obvious ones" hint, for organic discovery.
- **Window chrome reverses `260517-pdsp-terminal-skin`** — see § Terminal window chrome; a within-project design decision (changed context: frame as functional affordance), not a constitutional breach.
- **Single hardcoded `#c2553f` red dot** (not a `--c-*` var) — decorative, `aria-hidden`, muted at 0.55 opacity; judged acceptable on both theme surfaces during review (Constitution V parity is mechanism-agnostic correctness).
- **Tab multiple-match listing uses print-without-freezing** (change `n23o`) — `printBeforePrompt()` a `shell-out` listing line above the still-live input; do NOT freeze or re-emit a prompt. *Why*: cleanest path for the one-trailing-prompt invariant (no commit/re-emit happens) and the caret/input stay put. Uses `printBeforePrompt` (insert before the live prompt line), not `print` (append to end) — the latter would drop the listing below the prompt, breaking the trailing-prompt invariant. *Rejected*: freeze→print→`freshPrompt()`-with-reseed (more code, an extra prompt-emitting path to keep correct).
- **`freezeInput(suffix?)` shared by Enter and Ctrl-C** (change `n23o`) — the Enter-branch line tear-down was extracted into one helper so commit (no suffix) and cancel (`'^C'`) can never drift. *Rejected*: copy-pasting the ~12-line tear-down into the Ctrl-C path (drift risk; god-branch).
- **History persisted in `sessionStorage`, not `localStorage`** (change `n23o`) — session-scoped recall survives a refresh but a new browser session starts clean; single namespaced JSON key (`shll:terminal:history`), all access try/catch-guarded with malformed→`[]` coercion so storage failures degrade silently. *Rejected*: `localStorage` (would persist across unrelated sessions).
- **History recall and the `history` command read one shared array** (change `n23o`) — the ↑/↓ cursor walk and the `history` command both read the `initTerminal`-scoped `history[]`, so the listing and the recall can never disagree (no duplicate source of truth).
- **↑/↓ drive history unconditionally** (change `n23o`) — no caret-boundary gate, because the prompt is enforced single-line (paste flattened, `aria-multiline=false`), so there is no multi-line navigation to preserve.
- **Resting-state filler via inline `padding-bottom`, not a spacer element** (change `23xc`) — the content below the greeting (~2 lines) is far shorter than the viewport, so `scrollTop` alone cannot reach the greeting's offset (max scroll ≈108px vs ≈400px needed at default metrics); extending the session's inline `padding-bottom` by the deficit creates the scroll range while the live prompt stays the last DOM child, visually identical to a real terminal's blank rows after `clear`. *Rejected*: a spacer `<div>` after the prompt (violates the last-child/DOM-order decision; `print()` would append after it), and shrinking the session height (changes the window's size and the no-JS layout).
- **`exitResting()` called explicitly from the three prompt-emitting branches** (change `23xc`) — Enter, Ctrl-L, Ctrl-C in `onKeydown`, the exact paths where bottom-pinning resumes; explicit call sites are clearer than implicit coupling. *Rejected*: piggybacking on `freshPrompt`'s `focus` parameter (implicit, fragile coupling).
- **Ghost dismissal precedes branch dispatch in `onKeydown`** (change `23xc`) — `dismissIdleHint()` is the handler's first statement, so Tab as the very first keystroke dismisses the ghost before completion logic runs.
- **`document.fonts.ready` re-anchor guarded on the user not having scrolled** (change `23xc`) — JetBrains Mono loads async and shifts line metrics, so the anchor is recomputed once after fonts load, but only while still resting and within 2px of the anchored `scrollTop` — never yanking a user-initiated scroll.
- **Greeting copy omits the literal "shll" / verbatim hero tagline** (change `23xc`) — the tagline renders directly above the terminal in the tightened above-fold layout, so `seven small CLIs that force agents to plan first. type 'help' or 'ls'.` avoids verbatim duplication and is short enough that the tail invitation survives `white-space: pre` on narrower laptops. *Rejected*: the intake's longer ~92-char draft (would clip the invitation into horizontal scroll below ~1040px-wide viewports).
- **`caretToEnd()` gated to `freshPrompt`'s focusing path** (change `23xc`, pre-existing bug fix) — placing a selection range inside a contenteditable focuses it in Chromium, so the previous unconditional call silently auto-focused the input on page load, violating the documented no-autofocus decision above; the gate makes the implementation match the documented invariant (the click-to-focus and Tab paths re-place the caret themselves).

## Key Files

- `src/components/TerminalPrompt.astro` — the client-island script: bootstrap via `[data-terminal-prompt]`, the input lifecycle (`freshPrompt`/`caretToEnd`/`print`/`clear`/`onKeydown`/`onPaste`/`onFocus`/`onBlur`/`run`), the block-cursor element + `is-active` blink toggle, `onClick` click-to-focus, `scrollToBottom`, the `COMMANDS` dispatch map, and the `setTheme`/`navigateTool` helpers. Change `n23o` adds the shell affordances: `initTerminal`-scoped `history[]` + `historyCursor` + `loadHistory`/`saveHistory` (sessionStorage, key `shll:terminal:history`), the `freezeInput(suffix?)` helper (extracted from the Enter branch, reused by Ctrl-C), `navigateHistory(dir)`, `completeInput`/`fillToken`/`longestCommonPrefix` (Tab) + the `TOOL_ARG_COMMANDS` list, the `history` `COMMANDS` entry + its `help` line, and the Ctrl-L/Ctrl-C/↑/↓/Tab branches in `onKeydown`. Change `23xc` adds the activation pass: the `GREETING`/`HINT_TEXT`/`HINT_DELAY_MS`/`HINT_TYPE_MS` constants, the `resting` flag + `anchorToGreeting`/`exitResting` (top anchor + inline padding filler), the `armIdleHint`/`showIdleHint`/`dismissIdleHint` ghost-hint lifecycle, the `document.fonts.ready` re-anchor, the dismissal wiring (first statement of `onKeydown`, `onFocus`, top of `onClick`), and the `caretToEnd` focus-path gate in `freshPrompt`.
- `src/content/docs/index.mdx` — the `import`, the `.terminal-window` frame wrap (`<div class="terminal-window">` + `aria-hidden` titlebar with three dots), the `data-terminal-prompt` hook on the final `.shell-line`, and the `<TerminalPrompt />` placement.
- `src/styles/terminal.css` — the `.terminal-window` / `.terminal-titlebar` / `.terminal-dot*` chrome and the `.shell-input` focus/caret CSS. Change `23xc` adds the `[data-has-hero]`-scoped splash-hero rhythm overrides and the `.shell-ghost` hint style.

## Changelog

| Date | Change |
|------|--------|
| 2026-06-08 | Change `9vbo`: created. The homepage terminal prompt is now interactive — `TerminalPrompt.astro` client island upgrades the `[data-terminal-prompt]` line into a focusable `contenteditable` input dispatching a static command map (navigation + eggs, strict `command not found`), `theme` syncs through Starlight's `<starlight-theme-select>`, and a CSS-only `.terminal-window` frame wraps the transcript (a deliberate reversal of `260517-pdsp-terminal-skin`'s no-chrome decision). Progressive enhancement: the static transcript stays the no-JS source of truth; zero new dependencies; output stays static. |
| 2026-06-08 | Change `9vbo` (PR #46 polish): replaced the OS text-caret with a TTY-style **block cursor** (`▊`, blinks only when focused) and removed the form-field focus-ring box; made the in-frame session a **fixed-height scroll viewport** (output scrolls up, panel no longer grows); added **click-anywhere-to-focus** (skips links + text selections). Also a PR-review fix: `contenteditable="true"` + explicit plain-text paste handler (replacing `plaintext-only`), and dropped a redundant `shell-line` class on version rows. Verified in a real browser (block cursor renders, click focuses + activates blink, content scrolls pinned-to-bottom). |
| 2026-06-10 | Change `n23o`: shell affordances on `onKeydown`. **Command history** — `initTerminal`-scoped `history[]` + `historyCursor`, ↑/↓ recall (past-newest = blank draft), bash `ignoredups`, `sessionStorage` persistence (key `shll:terminal:history`, try/catch-guarded, malformed→`[]`), and a new `history` command (+ `help` line) reading the same array. **Tab-completion** — bash-like over `COMMANDS` keys (first token) / `TOOLS` (second token for `cd`/`open`/`man`): single-fill / LCP-fill / multi-list (print-without-freezing) / no-op. **Control keys** — Ctrl-L (`clear()` + one prompt), Ctrl-C (`freezeInput('^C')` + one prompt, no run); unmodified-Ctrl only. The Enter-branch freeze tear-down was extracted into a shared `freezeInput(suffix?)` helper reused by Ctrl-C. Upholds the exactly-one-trailing-prompt invariant; zero new dependencies; no markup/content change (`index.mdx` and the no-JS fallback untouched). |
| 2026-06-10 | Change `23xc`: above-the-fold activation pass. **Hero rhythm** — `[data-has-hero]`-scoped CSS overrides (`.hero` `padding-block: 3rem 1.5rem`, `.hero .stack` `gap: 1.5rem`, `.terminal-window` `margin-top: 0.75rem`) so the terminal's greeting + live prompt clear a 1280×750 fold; doc pages untouched. **Resting-state top anchor** — at activation the greeting line is the first visible line in the session viewport (live `$` prompt directly below; boot transcript above, reachable by scrolling up) via a direct instant `scrollTop` write + an inline `padding-bottom` filler (`scrollTop` alone can't reach the offset — max scroll ≈108px vs ≈400px needed); re-anchored once after `document.fonts.ready` (guarded against user scroll); cleared by `exitResting()` on the first prompt-emitting interaction (Enter/Ctrl-L/Ctrl-C), after which bottom-pinned `scrollToBottom` resumes; DOM order unchanged (live prompt stays last child). **Greeting line** — one island-printed `shell-out shell-dim` line before the first prompt: `seven small CLIs that force agents to plan first. type 'help' or 'ls'.` **Idle ghost hint** — one-shot 4 s timer; visual-only `aria-hidden` `.shell-ghost` (`--c-fg-faint`) typed char-by-char after the block cursor (`$ ▊try 'ls' ⏎`), static full text under `prefers-reduced-motion: reduce`; dismissed permanently on first keydown/focus/click, never focuses the input, never moves the scroll. Also fixed a pre-existing bug: `caretToEnd()` in `freshPrompt` gated to the focusing path (the unconditional call auto-focused the input on load in Chromium, against the documented `9vbo` no-autofocus decision). Zero new dependencies; `index.mdx` byte-identical. |
