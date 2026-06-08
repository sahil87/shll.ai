---
description: "The homepage's interactive terminal prompt (change 9vbo): the progressive-enhancement boundary (static `<pre class=\"shell-session\">` transcript is the no-JS source of truth; `TerminalPrompt.astro` client island upgrades ONLY the final `[data-terminal-prompt]` line into a focusable `contenteditable` input, no autofocus on load), the static client-side command dispatch map (help/ls/cd·open/install/version/theme/clear + eggs whoami·sudo·echo·man·shll·sl·fortune·exit·:q, strict `command not found`), the `theme` → `<starlight-theme-select>` `change`-event sync, and the `.terminal-window` CSS chrome (1px border + thin title bar + 3 dimmed dots — a deliberate reversal of `260517-pdsp-terminal-skin`'s no-chrome decision)"
---
# Homepage Interactive Terminal

## Overview

The homepage hero (`src/content/docs/index.mdx`) is a terminal transcript that **looks** interactive. Change `9vbo` makes the final prompt line **actually typeable** — keystrokes echo, Enter runs a command against a static in-page map, output prints in the same styled stream — layered as a **progressive enhancement** so nothing regresses without JS. The terminal SKIN (JetBrains Mono, phosphor-amber `--c-*` palette, `.shell-*` classes) shipped earlier in `260517-pdsp-terminal-skin`; this change adds behavior on top of that skin (reusing its classes verbatim) plus **one** deliberate visual addition — a `.terminal-window` frame around the transcript.

All work is scoped to this site only (`sites/astro-starlight-terminal1/`, the LIVE build per `SITE_DIR`). Zero new dependencies; output stays fully static (Constitution I, VI).

## The progressive-enhancement boundary (load-bearing)

The static `<pre class="shell-session">` transcript in `index.mdx` is the **no-JS source of truth** — crawlers, no-JS, and pre-hydration paint see the full hand-written transcript verbatim, including the version-block `<a>` links and the final blinking `$ ▊` line. Nothing regresses without JS.

`src/components/TerminalPrompt.astro` is a **client island** following the `Diagram.astro` precedent (frontmatter comment + a single `<script>` module island). With JS on, it:

1. Locates the final prompt line via the **`data-terminal-prompt`** attribute (a marker on the last `.shell-line` in `index.mdx`), not positional assumptions — keeping the static markup authoritative.
2. **Removes** that static `$ ▊` line and emits the first live prompt in its place: a `.shell-line` containing a `.shell-prompt` `$` and a focusable `<span class="shell-input" contenteditable="plaintext-only">` input region.
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
| `version` (+ `shll version` alias) | Re-prints the 7 version rows from an **in-script `VERSIONS` constant** (Design Decision: the script does not scrape MDX-rendered DOM; the static block in `index.mdx` stays the no-JS source). Rows use short-URL tool links (`/shll`) + `[git]` links, mirroring the static block. |
| `theme [dark\|light]` | Drives Starlight's **existing** theme mechanism (see below). |
| `clear` | `session.replaceChildren()` then a fresh prompt. |

**Easter eggs** (named after commands a dev would naturally try — for organic discovery): `whoami` (planning-themed), `sudo [anything]` (cheeky refusal), `echo <text>`, `man <tool>` (one-line synopsis from the in-script `SYNOPSIS` map + overview link; invalid tool → the valid list), `shll` (ASCII splash / manifesto), `sl` (ASCII steam-locomotive — the fat-finger-of-`ls` gag), `fortune` (random aphorism from the in-script `FORTUNES` list, re-runnable), `exit` / `:q` ("There is no escape from the shll.").

**Unknown command:** strict `command not found: <foo> — type 'help'` (`<foo>` is the entered token, original case). The `shll version` alias is rewritten to `version` before dispatch. Empty Enter just emits a fresh prompt, no error.

Egg copy/ASCII was authored at apply time in the site's voice and PR-reviewed (reversible content). Route strings, the tool list, version rows, synopses, and fortunes are named constants (no magic strings).

### `theme` syncs with Starlight (does not reinvent persistence)

`setTheme` locates the header `starlight-theme-select select`, sets `select.value` to the target, and dispatches a bubbling `change` event — so the header toggle UI, `<html data-theme>`, and `localStorage` all update through Starlight's own `onThemeChange`. It MUST NOT flip `data-theme` directly nor reinvent persistence. No-arg toggles the effective theme (read from `document.documentElement.dataset.theme`); `dark`/`light` sets it; any other arg prints `usage: theme [dark|light]`. A direct `data-theme` flip exists only as a fallback if the header select is absent.

## Terminal window chrome (`terminal.css`, deliberate `pdsp` reversal)

The transcript `<pre class="shell-session">` in `index.mdx` is wrapped in a `<div class="terminal-window">` with a `<div class="terminal-titlebar" aria-hidden="true">` carrying three dimmed dots. The CSS (scoped to the transcript, both themes via `--c-*`):

- `.terminal-window`: `1px solid var(--c-border)`, `border-radius: 6px`, `background: var(--c-bg)`, `overflow: hidden`.
- `.terminal-titlebar`: `height: 1.8em`, `background: var(--c-surface)`, bottom border `--c-border`.
- Three `.terminal-dot`s at `opacity: 0.55`: dot-1 → a muted **hardcoded `#c2553f`** red, dot-2 → `var(--c-accent)` (amber, the brand accent), dot-3 → `var(--c-accent-2)` (green).
- Inside the frame `.shell-session` drops its outer margin and gains `0.85rem 1rem` padding.

This is a **deliberate reversal** of `260517-pdsp-terminal-skin`'s explicit "no window chrome" decision (which feared "full terminal pastiche … irritating on the second [visit]"). Justified by changed context: the transcript is now an **interactive** region and the frame is a **functional affordance** signalling "you can type here", not decorative pastiche. The restraint that addressed pdsp's fear is preserved: scoped to the transcript alone (not the hero/nav/page), 1px border + dimmed dots, no glossy macOS gradients. CSS-only and no-JS-safe — the frame renders identically with JS off.

## Accessibility

- The input is a real focusable, keyboard-navigable control: `contenteditable="plaintext-only"` with `role="textbox"`, `aria-multiline="false"`, an `aria-label`, and `spellcheck`/`autocapitalize`/`autocorrect` off. A visible `.shell-input:focus-visible` ring (`outline: 1px solid var(--c-accent)`, `caret-color: var(--c-accent)`) meets WCAG AA in both themes. (No `tabindex` is set — `contenteditable` is the deliberate native-focusable mechanism; an earlier dead `removeAttribute('tabindex')` was removed in review.)
- `cd` / `open` / `install` / `man` resolve to **real** `window.location` navigation, never a JS-only dead end. No-JS users keep the static transcript's working `<a>` links; the enhancement never removes or hides them.
- The title-bar dots are `aria-hidden` decoration.

## Requirements

- The no-JS baseline MUST render the full static transcript verbatim (links + blinking `$ ▊`); the enhancement only adds/upgrades, never deletes existing transcript content.
- JS MUST upgrade ONLY the `[data-terminal-prompt]` line; the hydration target MUST be located by that attribute, not positional assumptions.
- Dispatch MUST be a static in-page map — no network/SSR/endpoint/fetch (Constitution I).
- Unknown commands MUST print exactly `command not found: <foo> — type 'help'` with no side effect.
- `theme` MUST drive Starlight's `<starlight-theme-select>` via a dispatched `change` event — never flip `data-theme` directly nor reinvent persistence.
- Output MUST reuse only existing `.shell-*` classes + `--c-*` variables; new CSS is limited to the `.terminal-window` frame and the input focus/caret state (Constitution V parity is free).
- The `.terminal-window` frame MUST be CSS-only, no-JS-safe, transcript-scoped, both themes.
- Zero new dependencies; no `astro.config` change; output stays fully static (Constitution I, IV, VI).

## Design Decisions

- **Client island, not inline `<script>`** (`TerminalPrompt.astro`, imported into `index.mdx`) — matches the `Diagram.astro` precedent, keeps `index.mdx` readable, isolates the behavior. (Intake clarification #14.)
- **Hydration target via `data-terminal-prompt`** on the final `.shell-line` — keeps the static markup the single source of truth; avoids brittle positional "last `.shell-line`" queries.
- **`theme` drives the header `<select>` via a dispatched `change` event** — reuses Starlight's `onThemeChange` (the single sync point for `data-theme` + `localStorage` + picker UI), so the prompt and header toggle never diverge.
- **Version data duplicated as an in-script `VERSIONS` constant** — the script cannot reliably scrape MDX-rendered DOM for structured re-print; the data is tiny/stable; the static `index.mdx` block remains the no-JS source.
- **No autofocus on page load** (`freshPrompt(false)` at activation) — avoids stealing focus / scrolling the hero; focus follows command execution only.
- **Eggs are NOT listed in `help`** — named after commands a dev would naturally try, surfaced via a "curious dev might try the obvious ones" hint, for organic discovery.
- **Window chrome reverses `260517-pdsp-terminal-skin`** — see § Terminal window chrome; a within-project design decision (changed context: frame as functional affordance), not a constitutional breach.
- **Single hardcoded `#c2553f` red dot** (not a `--c-*` var) — decorative, `aria-hidden`, muted at 0.55 opacity; judged acceptable on both theme surfaces during review (Constitution V parity is mechanism-agnostic correctness).

## Key Files

- `src/components/TerminalPrompt.astro` *(new)* — the client-island script: bootstrap via `[data-terminal-prompt]`, the input lifecycle (`freshPrompt`/`caretToEnd`/`print`/`clear`/`onKeydown`/`run`), the `COMMANDS` dispatch map, and the `setTheme`/`navigateTool` helpers.
- `src/content/docs/index.mdx` — the `import`, the `.terminal-window` frame wrap (`<div class="terminal-window">` + `aria-hidden` titlebar with three dots), the `data-terminal-prompt` hook on the final `.shell-line`, and the `<TerminalPrompt />` placement.
- `src/styles/terminal.css` — the `.terminal-window` / `.terminal-titlebar` / `.terminal-dot*` chrome and the `.shell-input` focus/caret CSS.

## Changelog

| Date | Change |
|------|--------|
| 2026-06-08 | Change `9vbo`: created. The homepage terminal prompt is now interactive — `TerminalPrompt.astro` client island upgrades the `[data-terminal-prompt]` line into a focusable `contenteditable` input dispatching a static command map (navigation + eggs, strict `command not found`), `theme` syncs through Starlight's `<starlight-theme-select>`, and a CSS-only `.terminal-window` frame wraps the transcript (a deliberate reversal of `260517-pdsp-terminal-skin`'s no-chrome decision). Progressive enhancement: the static transcript stays the no-JS source of truth; zero new dependencies; output stays static. |
