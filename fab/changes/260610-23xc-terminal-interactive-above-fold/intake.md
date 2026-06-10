# Intake: Make the Homepage Terminal Obviously Interactive Above the Fold

**Change**: 260610-23xc-terminal-interactive-above-fold
**Created**: 2026-06-10
**Status**: Draft

## Origin

One-shot `/fab-new 23xc` from the backlog (`fab/backlog.md`, item `[23xc]`). Source: terminal-UX review on 2026-06-10 (findings #1, #2, #5). No prior conversation context — the backlog item itself is unusually detailed and is treated as the authoritative design brief. Raw backlog text:

> Make the homepage terminal *obviously interactive above the fold* — the highest-leverage UX fix. Problem (observed on a ~1280×750 laptop viewport, 2026-06-10): the hero headline + "Install everything" CTA + GitHub link consume the first screen, the `.terminal-window` starts near the bottom, and the live editable `$` prompt sits **below the fold**. A visitor sees only the static boot transcript + the top of `$ shll version`, so the terminal reads as decorative output, not "type here." Most visitors never discover it's interactive. Scope (cheapest first, expect to combine): (1) **Surface the prompt** — either tighten the hero's vertical rhythm so the live prompt's first line clears the fold on common laptop heights, AND/OR render the interactive `$` line at the **top** of the terminal viewport rather than the bottom (today `freshPrompt`/`scrollToBottom` in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` keep the live line at the bottom of a fixed-height scroll viewport — `terminal.css` `height: 22rem` / `max-height: 60vh`). Make the editable line the first thing visible inside the window. (2) **Idle / first-visit nudge** — after ~4s of no input, animate-type a dim ghost hint into the prompt (e.g. `try 'ls' ⏎`) to draw the eye and signal "this is alive"; dismiss on first keystroke or focus; MUST honor `prefers-reduced-motion` (no typing animation when set — show the hint statically). (3) **Greeting line on load** — print one dim `shell-out` line inside the terminal stating what shll is in a sentence + `type 'help' or 'ls'`, so the value prop lives where the eye lands. Constraints: vanilla JS, zero new deps (Constitution VI); dark/light parity via `--c-*` vars; preserve the progressive-enhancement static fallback (`<pre class="shell-session">` in `index.mdx`) and the "exactly one trailing prompt" invariant. Acceptance: on a 1280×750 viewport the editable prompt (or a clear "type here" affordance) is visible without scrolling; idle hint appears then clears on input; greeting renders on load; reduced-motion users get no animation. **Execute before [by18]/[cuur]/[o33t]** — those polish a surface visitors must first be able to see.

## Why

1. **The pain point**: The homepage terminal became genuinely interactive in change `9vbo` and gained real shell affordances in `n23o` (↑/↓ history, Tab-completion, Ctrl-L/Ctrl-C) — but on a common ~1280×750 laptop viewport the live editable prompt sits below the fold. The visitor's first screen shows the hero (headline, tagline, two CTA buttons) and only the *top* of the terminal window: the static boot transcript (`$ shll install` … `$ shll version`). Nothing visible signals "you can type here." The terminal — the site's signature interaction and brand moment — reads as a decorative screenshot.

2. **The consequence if unfixed**: Most visitors never discover the interactivity at all. Every investment already made (`9vbo`, `n23o`) and every queued polish item (`[by18]` touch support, `[cuur]` command UX + a11y, `[o33t]` delight) targets a surface most visitors never find. The backlog explicitly sequences this change **before** those three — they polish a surface visitors must first be able to see.

3. **Why this approach**: The backlog prescribes three cheap, combinable levers — (a) surface the prompt above the fold, (b) an idle ghost hint signalling "this is alive," (c) a greeting line carrying the value prop to where the eye lands. All three are scoped to the existing client island + CSS, need zero new dependencies, and preserve the progressive-enhancement boundary. Alternatives like restructuring the hero into a side-by-side layout or making the terminal the full hero were not requested and would be a far larger redesign with weaker reversibility.

## What Changes

All work is scoped to the LIVE site, `sites/astro-starlight-terminal1/` (Constitution II/III). Three change areas plus preserved invariants.

### 1. Surface the live prompt above the fold (two combined levers)

**Lever A — tighten the hero's vertical rhythm (CSS-only).** In `src/styles/terminal.css`, reduce the splash hero's vertical footprint so the terminal window starts higher: trim the hero section's block padding/gap, the tagline and action-row margins, and the `.terminal-window` top margin (currently `margin: 1.25rem 0 1.75rem`). Selectors stay scoped to the splash hero (`.hero`, existing `.terminal-window` rules) — doc pages are unaffected. Exact pixel/rem values are tuned at apply against the acceptance viewport (1280×750) with a real browser; the goal is the terminal window's first ~4 lines clearing the fold, not a specific number.
<!-- assumed: exact spacing values deferred to apply-time browser verification — the acceptance criterion (prompt visible at 1280×750) is the contract, not specific rem values -->

**Lever B — top-anchor the initial scroll position so the editable line is the first thing visible inside the window.** Today the session is a fixed-height scroll viewport (`terminal.css`: `height: 22rem`, `max-height: 60vh`, `overflow-y: auto`) and `freshPrompt()`/`scrollToBottom()` pin the live line to the *bottom* of that viewport. Change the **initial** (activation-time) scroll position only: after the greeting line (§3) prints and the first live prompt is emitted, set `session.scrollTop` so the greeting line is the first visible line at the top of the viewport, with the live `$` prompt directly below it. The boot transcript (`$ shll install` … version table) remains in the DOM *above*, reachable by scrolling up — exactly like a real terminal after `clear`, where history lives above the viewport.

- **DOM order is unchanged.** The live prompt stays the last child of the session; the "exactly one trailing prompt" invariant is untouched. This is a scroll-position change, not a content reorder.
- **After the first committed command** (Enter, Ctrl-L, Ctrl-C — any prompt-emitting path), the existing bottom-pinned behavior (`scrollToBottom`) resumes unchanged. Only the resting, pre-interaction state is top-anchored.
- Implementation sketch: in the activation block of `initTerminal` (after `promptLine.remove()` / greeting print / `freshPrompt(false)`), compute the greeting line's offset within the scrollable session and assign `session.scrollTop` directly (instant, no smooth-scroll animation — trivially motion-safe). Exact offset math (e.g. `greetingEl.offsetTop` relative to the session's content box, possibly after `document.fonts.ready` since JetBrains Mono loads async and shifts line metrics) is an apply-time detail.
- **No-JS state**: the static transcript renders with the browser-default `scrollTop = 0` (top of the boot transcript visible), exactly as today. No change.

### 2. Idle / first-visit ghost hint

After **4 seconds** with no interaction, a dim ghost hint appears in the live prompt line to signal "this is alive."

- **Trigger**: a one-shot timer armed at activation. *Interaction* = any keydown on the input, focus of the input, or click on the terminal surface. Interaction before the timer fires cancels it; interaction after it fires dismisses the hint. Either way the hint is gone for the rest of the page view — no re-arm, no storage gating (it returns on the next page load until the visitor interacts).
- **Rendering**: a **visual-only** ghost — a new `aria-hidden="true"` span (class `shell-ghost`, color `var(--c-fg-faint)`, both themes for free) inserted into the live prompt line *after* the block cursor, fish-autosuggestion style: `$ ▊try 'ls' ⏎`. It is **not** inside the contenteditable input span, is never part of the textbox's accessible name/value, can never be submitted by Enter, and **never focuses the input** (the deliberate `9vbo` no-autofocus-on-load decision stands — the hint draws the eye, it does not steal focus).
- **Animation**: the hint text types in character-by-character (a small `setInterval`, ~60–80ms/char, editing the ghost span's `textContent` in place). The typing MUST NOT call `print()`/`scrollToBottom()` or otherwise move the scroll position. Under `prefers-reduced-motion: reduce` (checked via `window.matchMedia`) there is **no typing animation** — the full hint text appears statically (still dim, still dismissable).
- **Dismissal**: on first keydown / focus / terminal click — remove the ghost span and clear any pending interval/timer. Dismissal works identically in the reduced-motion (static) presentation.
- **Copy**: `try 'ls' ⏎` (given in the backlog).
- **Edge cases**: Tab as the first keystroke dismisses the ghost before completion logic runs (any-keydown dismissal precedes branch dispatch); a mid-animation dismissal clears the interval; the ghost must not interfere with `freezeInput` (it never survives to a commit, since commit requires a keystroke which dismisses it first).

### 3. Greeting line on load

At activation — printed by the client island, **before** the first live prompt is emitted — one dim line stating what shll is plus the invitation, so the value prop lives at the top of the visible viewport (where Lever B anchors the eye):

```
shll — seven small CLIs that force AI agents to plan before they code. type 'help' or 'ls'.
```

- **Classes**: `shell-out shell-dim` (the backlog's "one dim `shell-out` line"), reusing the existing skin verbatim.
- The sentence reuses the hero tagline's established voice; final wording is authored at apply (precedent: `9vbo` egg copy was authored at apply in the site's voice and PR-reviewed — reversible content). <!-- assumed: exact greeting copy finalized at apply — proposed text above is the working draft -->
- **JS-on only**: the greeting is printed by the island. The static no-JS transcript in `index.mdx` is byte-identical to today — the progressive-enhancement source of truth is untouched.

### 4. Invariants preserved (no behavioral regressions)

- **Progressive enhancement**: `<pre class="shell-session">` in `index.mdx` stays the no-JS source of truth; all new behavior lives in `TerminalPrompt.astro` (client island) + `terminal.css`. `index.mdx` is expected to need **no edits**.
- **Exactly one trailing prompt**: the greeting and ghost hint add zero prompt-emitting paths (greeting is a pre-prompt print at activation; the ghost never commits/freezes a line).
- **No autofocus on page load**: `freshPrompt(false)` at activation stands; neither the anchor scroll nor the ghost hint focuses the input.
- **Vanilla JS, zero new dependencies** (Constitution VI); **dark/light parity** via existing `--c-*` vars only (Constitution V); output stays fully static (Constitution I).
- Existing `n23o` affordances (history, Tab-completion, Ctrl-L/Ctrl-C) are untouched by the new activation-time behavior.

### Acceptance (from the backlog, verbatim)

- On a 1280×750 viewport the editable prompt (or a clear "type here" affordance) is visible without scrolling.
- Idle hint appears then clears on input.
- Greeting renders on load.
- Reduced-motion users get no animation.

## Affected Memory

- `site/homepage-terminal`: (modify) — site-local memory tree (`sites/astro-starlight-terminal1/docs/memory/`). Add the above-fold surfacing design (hero rhythm + top-anchored initial scroll, and its relationship to `scrollToBottom`), the idle ghost-hint mechanism (visual-only span, reduced-motion handling, dismissal rules), and the activation-time greeting line; extend the Requirements and Changelog sections.

## Impact

- `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` — the activation block of `initTerminal` (greeting print, anchor scroll, idle-hint timer/ghost lifecycle, dismissal wiring into existing `onKeydown`/`onFocus`/`onClick` paths).
- `sites/astro-starlight-terminal1/src/styles/terminal.css` — splash-hero vertical-rhythm overrides; new `.shell-ghost` rule; possibly a `.terminal-window` margin tweak.
- `sites/astro-starlight-terminal1/src/content/docs/index.mdx` — expected unchanged (static fallback preserved).
- No config changes, no new dependencies, no build/deploy impact.
- **Sequencing**: unblocks `[by18]` (touch), `[cuur]` (command UX + a11y), `[o33t]` (delight) — all explicitly queued behind this change.

## Open Questions

*(none — the backlog item is a detailed design brief; all decision points resolved as graded assumptions below)*

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | All three backlog sub-items (surface prompt, idle nudge, greeting) ship together in this one change | Backlog: "Scope (cheapest first, expect to combine)" — combining is explicit | S:95 R:85 A:90 D:90 |
| 2 | Confident | Surfacing uses BOTH levers: hero rhythm tightening AND top-anchored initial scroll | Backlog offers "AND/OR" but directs "Make the editable line the first thing visible inside the window"; combining is the robust path to the 1280×750 acceptance | S:85 R:80 A:80 D:70 |
| 3 | Confident | Top-anchor = initial scroll position only (greeting first visible, prompt directly below); DOM order unchanged; bottom-pinned scrolling resumes after first command | Preserves the trailing-prompt invariant trivially; matches real-terminal post-`clear` semantics; boot transcript stays reachable by scrolling up | S:75 R:85 A:85 D:70 |
| 4 | Certain | Reduced motion: no typing animation — the hint appears statically when `prefers-reduced-motion: reduce` is set | Explicit MUST in the backlog | S:95 R:90 A:95 D:95 |
| 5 | Certain | Ghost hint is visual-only: an `aria-hidden` dim span outside the contenteditable input — never submitted, never announced, never auto-focuses the input | "Dim ghost hint" semantics force this; real input content would be runnable by Enter and read by SRs; preserves the deliberate `9vbo` no-autofocus decision | S:85 R:90 A:90 D:85 |
| 6 | Confident | Idle trigger: 4s one-shot per page load; dismissed permanently on first keystroke/focus/click; no re-arm, no storage gating | Backlog gives "~4s" and "dismiss on first keystroke or focus"; one-shot-per-load is the simplest reading of "first-visit nudge" and is trivially tunable | S:80 R:95 A:85 D:70 |
| 7 | Certain | Hint copy is `try 'ls' ⏎` | Given in the backlog (as the worked example); pure content, trivially editable | S:80 R:95 A:85 D:80 |
| 8 | Confident | Greeting: one dim line (`shell-out shell-dim`), printed by the island at activation before the first prompt; static no-JS transcript unchanged | Backlog: "print one dim `shell-out` line inside the terminal"; island-printed is the only placement that preserves the progressive-enhancement boundary. `shell-dim` chosen over `shell-comment` to read as output, not comment | S:88 R:90 A:90 D:80 |
| 9 | Confident | Greeting copy reuses the hero tagline voice ("seven small CLIs that force AI agents to plan before they code") + `type 'help' or 'ls'`; final wording at apply | Established precedent: `9vbo` egg copy authored at apply in site voice, PR-reviewed; content is maximally reversible | S:70 R:95 A:85 D:75 |
| 10 | Confident | Hero tightening is CSS-only in `terminal.css` (splash-scoped `.hero` / `.terminal-window` margins); exact values tuned at apply against the acceptance viewport | Backlog frames it as "tighten the hero's vertical rhythm"; CSS-only keeps `index.mdx`/Starlight config untouched; values need real-browser verification | S:75 R:90 A:85 D:70 |
| 11 | Certain | Vanilla JS, zero new dependencies; dark/light parity via existing `--c-*` vars only | Explicit backlog constraints restating Constitution V/VI | S:95 R:90 A:95 D:95 |
| 12 | Certain | Progressive enhancement preserved: `index.mdx` static fallback untouched; all new behavior in the client island + CSS | Explicit backlog constraint; load-bearing boundary documented in `site/homepage-terminal` memory | S:90 R:85 A:90 D:90 |
| 13 | Certain | Exactly-one-trailing-prompt invariant upheld: greeting/ghost/anchor add no prompt-emitting paths | Explicit backlog constraint; the design (pre-prompt print, non-committing ghost, scroll-only anchor) makes it structurally true | S:90 R:80 A:90 D:90 |
| 14 | Certain | Acceptance is verified at the backlog's reference viewport, 1280×750 ("common laptop heights" = that benchmark) | The backlog states the observation viewport and repeats it in the acceptance line | S:90 R:85 A:85 D:85 |

14 assumptions (9 certain, 5 confident, 0 tentative, 0 unresolved).
