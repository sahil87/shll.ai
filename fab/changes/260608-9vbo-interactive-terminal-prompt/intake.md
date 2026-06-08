# Intake: Interactive Terminal Prompt + Easter Eggs (Homepage)

**Change**: 260608-9vbo-interactive-terminal-prompt
**Created**: 2026-06-08
**Status**: Draft

## Origin

Initiated via `/fab-proceed` → `/fab-new` from a live conversation in which the
feature was settled interactively (not a cold one-shot). The user wants the
shll.ai homepage's existing **static fake-terminal transcript** to become an
**actually typeable** prompt — keystrokes echo, Enter runs a command, output
prints in the same styled stream — layered as a **progressive enhancement** so
nothing regresses without JS.

> Add a typed-command interactive terminal to the shll.ai homepage, layered as a
> progressive enhancement over the existing static fake-terminal transcript. The
> prompt does real, useful work (navigation) AND fun easter eggs. The headline
> ask is a `help` command that lists what you can type. Unknown commands return a
> strict `command not found`. Eggs are named after commands a dev would naturally
> try (`shll`, `sl`, `fortune`, `exit`/`:q`), for organic discovery.

The site is **LIVE at shll.ai**. The live build is `sites/astro-starlight-terminal1/`
(confirmed: `SITE_DIR: sites/astro-starlight-terminal1` in `.github/workflows/deploy.yml`).
All work is scoped to that one site (Constitution II — Multi-Site Isolation; III —
One Live Site at a Time). No repo-root churn, no playground.

**Decisions settled in the conversation** (encoded as graded assumptions below):

1. **Boundary = progressive enhancement, NOT a replacement.** No-JS renders today's
   static transcript verbatim, blinking `$ ▊` and all. JS upgrades the final prompt
   line into a focusable input.
2. **Scope = command palette + easter eggs** (chosen over "eggs only" and over a
   "full emulator").
3. **Dispatch = one static in-page command map** (no SSR, no endpoint, no runtime
   fetch — Constitution I).
4. **Strict `command not found: <foo> — type 'help'`** for unknowns (user explicitly
   chose strict over a softer nudge, combined with the `help` hint).
5. **Zero new dependencies** — hand-rolled vanilla JS, no terminal-emulator npm
   package (Constitution VI).
6. **Terminal window chrome around the transcript** (added mid-conversation from a
   screenshot): wrap the transcript block in a bordered panel with a thin title bar
   carrying three dimmed traffic-light dots. CSS-only, both themes, no-JS-safe. This
   **deliberately reverses** the `260517-pdsp-terminal-skin` decision to avoid window
   chrome — now justified because the frame is a *functional affordance* signalling
   the region is typeable, not decorative pastiche (see § 5).

## Why

**The problem.** The homepage hero is a terminal transcript that *looks*
interactive but is inert — `sites/astro-starlight-terminal1/src/content/docs/index.mdx`
hand-writes a `<pre class="shell-session">` ending in `<span class="shell-line"><span
class="shell-prompt">$</span> <span class="shell-cursor">▊</span></span>`. The cursor
blinks (CSS `@keyframes shell-blink` in `src/styles/terminal.css`), inviting a
keystroke that does nothing. For a site whose entire pitch is a *toolkit of CLIs*,
a dead prompt is a missed first impression: the medium should demonstrate the
message.

**What we don't fix if we skip this.** The hero stays a screenshot-of-a-terminal.
Visitors who instinctively type get no feedback. The page has no in-context way to
navigate to a tool or the install guide the way a CLI user actually thinks
(`cd fab-kit`, `install`, `help`).

**Why this approach over alternatives.**
- *Progressive enhancement over replacement* — the site is LIVE and SEO/crawler
  reachable; the static transcript MUST keep rendering for no-JS, crawlers, and
  slow connections. A client-only upgrade satisfies Constitution I (Static-First,
  Zero Runtime) with no SSR adapter, no endpoint, no fetch.
- *Command palette + eggs over eggs-only* — the user wanted the prompt to do
  **real navigation work** (`cd`/`open`/`install`), not just gags.
- *Command palette + eggs over a full emulator* — history, tab-completion, and a
  persistent cross-page prompt add real complexity and the persistent variant
  fights Starlight's per-page layout. Deferred to a possible v2 (see Non-Goals).
- *Hand-rolled vanilla JS over an npm terminal library* — Constitution VI
  (Minimal Dependencies): a single in-page script is small, auditable, and adds
  zero supply-chain surface for a decorative-leaning feature.

**Important framing: this is PRIMARILY behavioral, with one deliberate visual
addition.** The terminal SKIN (JetBrains Mono, phosphor-amber palette, the `--c-*`
CSS variables, `.shell-line` / `.shell-out` / `.shell-prompt` / `.shell-cursor`
classes) already shipped in `260517-pdsp-terminal-skin`. This change adds behavior
on top of that skin and reuses its classes/variables verbatim — so dark/light
parity (Constitution V) comes for free. The **one** visual addition is a terminal
window frame around the transcript (§ 5), which intentionally revises a `pdsp`
decision; the rationale and the affordance argument are recorded there.

## What Changes

All paths are under `sites/astro-starlight-terminal1/`.

### 1. The progressive-enhancement boundary (the load-bearing decision)

**Baseline (no JS) — unchanged.** The homepage continues to render the
hand-written transcript exactly as it does today, including the final
`<span class="shell-line"><span class="shell-prompt">$</span> <span
class="shell-cursor">▊</span></span>` line. Crawlers, no-JS, and pre-hydration
paint see precisely the current page. **Nothing regresses.**

**Enhanced (with JS).** A small vanilla script hydrates **only** the final prompt
line, converting the static `$ ▊` into a focusable text-entry control:
- Keystrokes echo at the cursor position (the script renders typed text in the
  same `.shell-line` styling; the blinking cursor sits at the caret).
- **Enter** reads the line, splits into `command [args…]`, dispatches against the
  static command table (below), prints output as **new** `.shell-line` /
  `.shell-out` spans appended to the same `<pre class="shell-session">` stream,
  then emits a fresh `$ ` prompt line ready for the next command.
- The transcript scrolls/grows in place — same stream, same styling.

**Where the script lives.** Implementer's choice between (a) a single in-page
`<script>` block appended to `index.mdx`, or (b) a small dedicated component
(e.g. `src/components/TerminalPrompt.astro`) imported into `index.mdx`, following
the existing `Diagram.astro` pattern (an Astro component whose `<script>` is a
client island — see `src/components/Diagram.astro`, which already does
theme-reactive client work via `data-*` attributes + a `<script>`). The script lives in a
dedicated **`src/components/TerminalPrompt.astro`** client-island component imported
into `index.mdx` (the `Diagram.astro` precedent) — keeps `index.mdx` readable and the
behavior isolated/testable. <!-- clarified: script placement = dedicated TerminalPrompt.astro component (not inline <script>); user confirmed -->

**The hydration target.** The script SHOULD locate the prompt line via a marker
(e.g. add `data-terminal-prompt` to the final `.shell-line`, or query the last
`.shell-line` containing `.shell-cursor`) rather than positional assumptions, so
the static markup remains the single source of truth. <!-- assumed: a data-attribute hook on the final prompt line; exact attribute name is an implementation detail -->

### 2. The command dispatch table (one static client-side map)

A single in-page object/Map: `command name → handler`. Handlers are pure
functions of `(args, ctx)` returning lines to print (and/or performing a
navigation/theme/clear side effect). **No network.** The full set:

**Navigation / utility (real work):**

| Command | Behavior |
|---------|----------|
| `help` | Print the available-command list as shell output. **The headline ask.** Lists every command below with a one-line description. |
| `ls` | List the 7 tools: `idea  hop  fab-kit  wt  run-kit  tu  shll` (styled like `ls` output; each MAY link to its overview). |
| `cd <tool>` | Navigate to `/tools/<tool>/overview/`. Confirmed: all 7 overview routes exist (`src/content/docs/tools/<tool>/overview.md`). Real `window.location` navigation — not a JS-only trap. |
| `open <tool>` | Alias of `cd <tool>` → `/tools/<tool>/overview/`. |
| `install` | Navigate to `/getting-started/install/` (route confirmed to exist: `src/content/docs/getting-started/install.md`). |
| `version` (or `shll version`) | Re-print the version block already hand-written on the page (the 7 tool rows: name, `v…`, `[git]` link). Reuse the exact data already in `index.mdx`. |
| `theme [dark\|light]` | Toggle Starlight's existing light/dark theme from the prompt. With no arg → toggle current; with `dark`/`light` → set that theme. MUST drive the **existing** Starlight theme mechanism (Starlight sets `data-theme` on `<html>` and persists via its `StarlightThemeProvider`/theme `<select>`), not a reinvented persistence layer — so it stays in sync with the header theme toggle. `Diagram.astro` confirms the `data-theme` attribute is the live signal. <!-- assumed: theme command drives Starlight's own provider/select rather than only flipping data-theme, so persistence + header UI stay consistent; exact hook (dispatch on the select vs. provider API) is an implementation detail -->|
| `clear` | Reset the transcript to a fresh single prompt line (`$ ▊`). |

**Easter eggs (named after commands a dev would naturally try — for organic discovery):**

| Command | Behavior |
|---------|----------|
| `whoami` | A planning-themed line (e.g. evokes the "plan before you code" ethos). |
| `sudo [anything]` | Cheeky refusal (terminal-authentic "nice try" tone). |
| `echo <text>` | Echo the args back (classic). |
| `man <tool>` | One-line synopsis of `<tool>` + a link (to its overview). |
| `shll` | Signature ASCII splash / manifesto (the brand moment). |
| `sl` | ASCII steam-locomotive gag — the classic fat-finger-of-`ls` joke. |
| `fortune` | Random dev aphorism; re-runnable (different each call); ties to the "plan before they code" tagline. |
| `exit` / `:q` | "There is no escape from the shll." (the vim-escape-trap joke). |

**Unknown command:** strict, terminal-authentic
`command not found: <foo> — type 'help'`. (User explicitly chose **strict
`command not found`** over a softer nudge, *combined* with the `type 'help'`
hint.)

The exact wording of egg payloads (whoami line, sudo refusal, the ASCII art for
`shll`/`sl`, the fortune list, man synopses) is **authored by the implementer at
apply time** in good taste consistent with the site's voice, reviewed in the PR —
these are reversible content choices. <!-- clarified: egg copy/ASCII authored by implementer at apply time, reviewed in PR; user confirmed -->

### 3. Styling — reuse only, no new visual language

All printed output reuses the **existing** classes and `--c-*` variables in
`src/styles/terminal.css` (`.shell-session`, `.shell-line`, `.shell-out`,
`.shell-ok`, `.shell-dim`, `.shell-prompt`, `.shell-comment`, `.shell-cursor`).
Any *new* CSS is limited to behavioral affordances the static skin lacks — namely
a **visible focus state** for the now-focusable input region (Accessibility) and,
if needed, an input/caret style. Both themes work for free because the variables
flip with `data-theme` (Constitution V). No new fonts, no new palette.

### 4. Accessibility

- The typed-input region MUST be a **real focusable, keyboard-navigable control**
  with a **visible focus state** (Constitution — Accessibility; WCAG AA contrast
  in both themes).
- `cd` / `open` / `install` / `man` resolve to **real navigation**
  (`window.location` to an existing route), never a JS-only dead end — so keyboard
  and no-JS users are never stranded. (No-JS users simply get the static
  transcript with working `<a>` links already present.)
- The enhancement MUST NOT remove or hide the existing real `<a>` links in the
  static transcript for no-JS users.

### 5. Terminal window chrome around the transcript (deliberate `pdsp` reversal)

Wrap the transcript block (the `<pre class="shell-session">` from `$ shll install`
through the blinking cursor line) in a **terminal window frame**: a bordered panel
with a thin title bar carrying **three dimmed traffic-light dots** (red/amber/green
muted to the palette, not glossy macOS gradients).

- **CSS-only, no-JS-safe.** A `.terminal-window` wrapper drawn purely in
  `terminal.css` using existing `--c-*` variables (border = `--c-border`, title bar
  = `--c-surface`, dots tinted from the accents). Renders identically with JS off —
  fully inside the progressive-enhancement boundary. No new markup behavior, no new
  dependency.
- **Both themes for free.** Frame + dots use `--c-*` variables, so dark and the
  "paper terminal" light variant both work (Constitution V).
- **Scoped to the transcript only** — NOT the hero, nav, or page. The frame is a
  single bordered panel around one already-terminal-shaped block.

**This intentionally REVERSES a documented decision.** `260517-pdsp-terminal-skin`
explicitly rejected window chrome, reasoning that *"full terminal pastiche (window
chrome, fake prompts as nav, typed-out copy) is striking on first visit and
irritating on the second"* and chose "terminal-skinned, not pastiche." The reversal
is justified by a **changed context**: the transcript is now an *interactive*
region, and the frame is the most natural affordance signalling "you can type here"
— a functional cue, not decoration. The restraint that addressed `pdsp`'s original
fear is preserved: only the transcript is framed (not the whole page), and the
chrome is subtle (1px border + dimmed dots), so the page does not become a TTY.
The implementer tunes the exact dot tints, border weight, and title-bar height at
apply time to match the screenshot's restraint, reviewed visually in the PR.
<!-- clarified: dots-style title bar chosen by the user (over a label bar and over no-frame); exact dot tints/border weight/bar height tuned by the implementer at apply time, PR-reviewed; user confirmed -->

### Non-Goals (explicitly deferred — possible v2)

- **Command history** (up/down arrow recall).
- **Tab-completion.**
- **A persistent cross-page prompt** (a prompt that survives navigation and sits
  on every Starlight page) — rejected now: fights Starlight's per-page layout and
  has constitutional friction.
- **Any server/SSR/runtime-fetch capability** — permanently out (Constitution I).
- **An npm terminal-emulator dependency** — permanently out (Constitution VI).
- **Changing the visual skin** — the skin shipped in `260517-pdsp-terminal-skin`;
  this change is behavioral, with the **single** exception of the transcript window
  frame (§ 5), which is the only visual addition and is scoped to the transcript
  block alone (no font/palette/layout changes elsewhere).

### Rejected alternatives

- *Easter-eggs-only* — too little utility; user wanted real navigation.
- *Full emulator (history + tab-complete + persistent prompt)* — complexity +
  layout friction; deferred to v2.
- *npm terminal-emulator library* — violates Minimal Dependencies (VI).
- *Softer unknown-command message* — user chose strict `command not found`.
- *A single generically-named `egg`/`shell` command* — rejected; eggs are named
  after commands a dev would naturally try, for organic discovery.

## Affected Memory

Project-level memory (top-level `docs/memory/`) covers cross-site concerns
(deploy strategy, help-collection, readme-extraction). This change is
**site-implementation behavior** for one site, whose memory home is
`sites/astro-starlight-terminal1/docs/memory/site/` (per `fab/project/context.md`:
"Site-implementation memory lives alongside each site"). That site memory tree
does not exist yet; hydrate MAY create it. No top-level (cross-site) memory domain
is affected.

- `site/homepage-terminal`: (new) The interactive homepage prompt — progressive-enhancement boundary (static transcript baseline + JS upgrade of the final prompt line), the static command dispatch table (navigation commands + easter eggs), the strict `command not found` contract, theme-command integration with Starlight's provider, the transcript window-chrome frame (§ 5, and its deliberate reversal of the `pdsp` "no window chrome" decision), and the reuse-only styling/accessibility rules. *Lives under the site's own `docs/memory/site/`, not top-level `docs/memory/`.* <!-- assumed: site-scoped memory file under sites/.../docs/memory/site/; created at hydrate. Top-level docs/memory is for cross-site concerns only per context.md -->

## Impact

**Files (all under `sites/astro-starlight-terminal1/`):**
- `src/content/docs/index.mdx` — add the hydration hook to the final prompt line;
  wrap the transcript `<pre class="shell-session">` in the `.terminal-window` frame
  (§ 5); and either an inline `<script>` or an import of a new `TerminalPrompt`
  component.
- `src/styles/terminal.css` — add (a) the behavioral CSS the static skin lacks
  (focus state for the input region; caret/input style if needed) and (b) the
  `.terminal-window` frame + title-bar + dimmed-dots chrome (§ 5). Reuse all
  existing `.shell-*` classes and `--c-*` variables.
- `src/components/TerminalPrompt.astro` *(new, optional)* — the client-island
  component if the implementer chooses the component route over inline script
  (precedent: `src/components/Diagram.astro`).

**Dependencies:** none added (Constitution VI). Hand-rolled vanilla JS only.

**Routes consumed (all confirmed to exist):** `/tools/{idea,hop,fab-kit,wt,run-kit,tu,shll}/overview/`,
`/getting-started/install/`.

**Build/deploy:** no SSR adapter, no endpoint, no `astro.config` change required;
output stays fully static (Constitution I, IV). `dist/` remains gitignored.

**Constitution check:** I (static-first) ✓ client-only, no server; the window
frame is CSS-only and no-JS-safe. II/III (isolation / one live site) ✓ scoped to
the live site only. V (dark-mode parity) ✓ both the output and the new window frame
reuse `--c-*` variables. VI (minimal deps) ✓ zero new deps. Accessibility ✓
focusable control + visible focus + real navigation. **Note — documented design
reversal:** the § 5 window chrome overturns `260517-pdsp-terminal-skin`'s explicit
"no window chrome" stance; the changed context (interactive region → frame as
affordance) and the restraint (transcript-only, subtle) are recorded in § 5. No
constitutional principle is violated by the reversal — it is a within-project
design decision, not a rule breach.

## Open Questions

- None blocking. The two genuinely-open content decisions (exact egg copy/ASCII;
  component-vs-inline-script placement) are low-blast-radius, reversible at apply
  time, and recorded as Tentative assumptions rather than gating questions.

## Clarifications

### Session 2026-06-08

| # | Action | Detail |
|---|--------|--------|
| 14 | Confirmed | Script placement = dedicated `TerminalPrompt.astro` component (not inline `<script>`) |
| 15 | Confirmed | Egg copy/ASCII authored by implementer at apply time, PR-reviewed |
| 18 | Confirmed | Dot tints / border weight / title-bar height tuned by implementer at apply time, PR-reviewed |

### Session 2026-06-08 (bulk confirm)

| # | Action | Detail |
|---|--------|--------|
| 11 | Confirmed | — |
| 12 | Confirmed | — |
| 13 | Confirmed | — |
| 17 | Confirmed | — |

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Scope to the live site only: `sites/astro-starlight-terminal1/` (no repo-root, no playground) | Constitution II/III + `SITE_DIR` in deploy.yml deterministically identifies the live build; verified | S:95 R:80 A:95 D:95 |
| 2 | Certain | Progressive enhancement, NOT a replacement: no-JS renders today's static transcript verbatim; JS upgrades the final prompt line | Explicitly settled with the user; also forced by Constitution I (static-first) for a LIVE, crawler-reachable page | S:95 R:75 A:90 D:95 |
| 3 | Certain | No SSR adapter / no server endpoint / no runtime fetch — dispatch resolves against a static in-page command map | Constitution I is a MUST; user confirmed; the chosen design needs no server | S:95 R:60 A:95 D:95 |
| 4 | Certain | Zero new dependencies — hand-rolled vanilla JS, no npm terminal-emulator library | Constitution VI + explicit user choice; rejected the library alternative | S:95 R:70 A:95 D:95 |
| 5 | Certain | Scope = command palette + easter eggs (not eggs-only, not full emulator) | User explicitly chose this over both alternatives in the conversation | S:95 R:65 A:85 D:90 |
| 6 | Certain | Unknown command → strict `command not found: <foo> — type 'help'` | User explicitly chose strict over a softer nudge, with the `help` hint appended | S:95 R:90 A:80 D:95 |
| 7 | Certain | Command set: help, ls, cd/open, install, version, theme, clear + eggs whoami, sudo, echo, man, shll, sl, fortune, exit/:q | Enumerated and agreed in the conversation, command-by-command | S:95 R:75 A:80 D:90 |
| 8 | Certain | `cd`/`open <tool>` → `/tools/<tool>/overview/`; `install` → `/getting-started/install/` | All 8 routes verified present on disk; matches the existing in-page links | S:90 R:85 A:95 D:95 |
| 9 | Certain | All output reuses existing `.shell-*` classes + `--c-*` variables; dark/light parity is free | Skin shipped in `260517-pdsp-terminal-skin`; this change is behavioral only; Constitution V | S:90 R:80 A:95 D:90 |
| 10 | Certain | Input region is a real focusable, keyboard-navigable control with a visible focus state; `cd`/`open`/`install` use real navigation (no JS-only trap) | Constitution Accessibility constraint is a MUST; user confirmed | S:85 R:80 A:90 D:90 |
| 11 | Certain | `theme [dark\|light]` drives Starlight's existing theme provider/select (so persistence + header toggle stay in sync), not a reinvented data-theme flip | Clarified — user confirmed | S:95 R:70 A:80 D:80 |
| 12 | Certain | `version` re-prints the existing hand-written version block verbatim (same 7 rows already in index.mdx) | Clarified — user confirmed | S:95 R:80 A:85 D:85 |
| 13 | Certain | Site-implementation memory home is `sites/astro-starlight-terminal1/docs/memory/site/` (created at hydrate), not top-level `docs/memory/` | Clarified — user confirmed | S:95 R:75 A:90 D:75 |
| 14 | Certain | Script placement: a dedicated `TerminalPrompt.astro` component (NOT inline `<script>`), imported into index.mdx per the `Diagram.astro` precedent | Clarified — user confirmed | S:95 R:75 A:65 D:55 |
| 15 | Certain | Exact egg payload copy/ASCII (whoami line, sudo refusal, shll/sl art, fortune list, man synopses) authored by the implementer at apply time in the site's voice, PR-reviewed | Clarified — user confirmed | S:95 R:85 A:55 D:50 |
| 16 | Certain | Add a terminal window frame (bordered panel + thin title bar with 3 dimmed traffic-light dots) around the transcript only; CSS-only, no-JS-safe, both themes via `--c-*` | User picked "dots title bar" directly from a 3-option choice (frame-with-dots / frame-with-label / no-frame); scope (transcript-only) and subtlety are the guardrails | S:95 R:75 A:80 D:90 |
| 17 | Certain | The § 5 frame deliberately reverses `260517-pdsp-terminal-skin`'s "no window chrome" decision, justified by the changed context (interactive region → frame as affordance) | Clarified — user confirmed | S:95 R:70 A:75 D:80 |
| 18 | Certain | Exact dot tinting + title-bar dimensions (which accents map to which dot, border weight, bar height) tuned by the implementer at apply time, PR-reviewed | Clarified — user confirmed | S:95 R:85 A:60 D:55 |

18 assumptions (18 certain, 0 confident, 0 tentative, 0 unresolved). Run /fab-clarify to review.
