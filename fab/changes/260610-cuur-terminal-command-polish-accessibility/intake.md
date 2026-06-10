# Intake: Terminal Command Polish & Accessible Output

**Change**: 260610-cuur-terminal-command-polish-accessibility
**Created**: 2026-06-10
**Status**: Draft

## Origin

> /fab-new cuur

One-shot invocation from the backlog. Backlog item `[cuur]` (source: terminal-UX review on 2026-06-10, findings #6, #7, #8, #9):

> Polish the terminal command experience and make its output accessible. Two related passes over `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` (the `run`/`COMMANDS` dispatch and the `print` output path). **Command UX:** (1) **Fuzzy "did you mean?"** — on an unknown command, run a small Levenshtein (or prefix) match over the `COMMANDS` keys and append `did you mean 'install'?` to the current `command not found` line (generalizes the existing `sl`→`ls` gag; ~15 lines, no deps). (2) **`help <command>`** — argument-aware help printing a per-command detail line, letting the top-level `help` list stay short. (3) **Intentional `cd` nav beat** — `cd`/`open`/`install` currently hard-`window.location.assign` immediately, which can feel like a misclick from a playful terminal; consider printing the tool's one-line synopsis + the link and letting the visitor click, or at least giving the "opening …" line a visible beat before navigation. **Accessibility (Constitution):** (4) **`aria-live` output** — command output is appended to the session silently, so a screen-reader user hears nothing after pressing Enter; mark the output region (or session) `aria-live="polite"` so results are announced. The input is already well-labeled; output is not. (5) **Reduced-motion audit** — verify the cursor blink and any animation introduced by `[23xc]`/`[n23o]` respects `prefers-reduced-motion`; this pass is the place to confirm the whole terminal is motion-safe. Constraints: vanilla JS, zero new deps; dark/light parity via `--c-*` vars. Acceptance: typo'd commands suggest the nearest match; `help <command>` works; output is announced by screen readers; reduced-motion is respected throughout.

All three predecessor changes the backlog sequenced before this one have shipped: `n23o` (history/Tab/control keys, commit `af5074d`), `23xc` (above-fold + greeting + idle ghost hint, commit `4774596`), `by18` (tap-to-focus + command bar, commit `c2b7dce`). This change is the "core polish" pass that `[o33t]` (delight, do-last) waits on.

## Why

1. **The pain point.** The terminal is now discoverable (`23xc`), reachable on touch (`by18`), and shell-like to drive (`n23o`) — but the *command experience itself* still has rough edges, and its output is invisible to assistive tech:
   - A typo (`instal`, `verison`, `hlep`) dead-ends at `command not found: instal — type 'help'`. Real shells (zsh, git, fish) suggest the nearest match; this terminal already owns the gag version of this idea (`sl`→`ls`) but not the useful one.
   - `help` is all-or-nothing: one flat list, one detail column. There is nowhere to learn what `theme` accepts or what `cd` does without trying it — and the top-level list cannot grow detail without becoming a wall.
   - `cd hop` / `open wt` / `install` fire `window.location.assign` on the same tick as Enter. From a playful exploration surface, instant navigation feels like a misclick — the visitor is yanked off the page before the `opening …` line even registers.
   - **Accessibility gap (Constitution, Additional Constraints):** the live input is well-labeled (`aria-label` on the contenteditable), but everything `print()` appends is silent for screen-reader users. Press Enter, hear nothing. The interactive showpiece of the site is effectively output-less for SR users.
   - The two CSS cursor-blink animations (`shell-blink` in the terminal, `terminal-blink` on doc-page first paragraphs) run unconditionally — `terminal.css` contains **no** `prefers-reduced-motion` block at all. The `23xc` ghost hint handled reduced motion in JS; the CSS layer never got the same care.

2. **If we don't.** The funnel work (`23xc`/`by18`) invites visitors in, then the first typo punishes them; SR users get an interactive element that responds with silence (a WCAG 4.1.3-shaped failure on the site's signature feature); and the constitution's accessibility constraint stays violated by every blinking cursor for motion-sensitive visitors. `[o33t]` (delight) is also explicitly blocked behind this pass.

3. **Why this approach.** All five items are small, additive edits to one component + one stylesheet, in the same hand-rolled vanilla-JS idiom the island already uses (Constitution VI: zero new deps). The suggestion algorithm is ~20 lines of dependency-free code; extracting it to `src/lib/` makes it unit-testable under the existing `node --test scripts/*.test.mjs` pattern. Nothing here touches the static no-JS transcript, the build, or any other page.

## What Changes

All edits are in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` and `sites/astro-starlight-terminal1/src/styles/terminal.css`, plus one new lib module + test. Existing invariants that MUST survive untouched: exactly-one-trailing-prompt, the resting-state top anchor (`23xc`), progressive enhancement (static `<pre class="shell-session">` in `index.mdx` stays byte-identical), dark/light parity via `--c-*` vars only.

### 1. Fuzzy "did you mean?" on unknown commands

New dependency-free module `sites/astro-starlight-terminal1/src/lib/terminal-suggest.ts`:

```ts
export function damerauLevenshtein(a: string, b: string): number; // adjacent transposition = 1
export function suggestCommand(input: string, candidates: readonly string[]): string | null;
```

- `suggestCommand` lowercases the input, computes the distance to every candidate, and returns the closest candidate whose distance is within the threshold, else `null`.
- **Threshold**: max distance `1` when `input.length <= 3`, else `2`. (Damerau so the classic transposition typo `hlep`→`help` scores 1; the short-input clamp stops absurd matches like `vi`→`cd`.)
- **Tie-break**: lowest distance wins; on equal distance, first candidate in iteration order wins.
- Candidate set at the call site: `Object.keys(COMMANDS)` — *including* hidden easter-egg keys (`whoami`, `sudo`, `sl`, `shll`, `exit`, `:q`, `fortune` …). Suggesting a near-miss egg rewards the curiosity the `help` footer advertises; the top-level list still never reveals them.
- Wiring in `run()`'s not-found branch — suggestion replaces the `type 'help'` tail on the same line (backlog format):

```
command not found: instal — did you mean 'install'?
command not found: xyzzy — type 'help'          ← no candidate within threshold
```

- The island imports the module (`import { suggestCommand } from '../lib/terminal-suggest'`); Astro/Vite bundles it into the client island. Unit test `scripts/terminal-suggest.test.mjs` (`node --test`, native TS type-stripping — same pattern as `extract-readme.test.mjs`) pins: transposition=1, threshold clamp for short inputs, tie-break order, no-match → null, the acceptance pair `instal`→`install`.

### 2. `help <command>` — argument-aware help

- New `HELP_DETAIL: Record<string, Line[]>` constant beside `SYNOPSIS`: per-command usage + 1–2 detail lines. Every key in `COMMANDS` gets an entry — listed commands *and* hidden eggs (`help sudo` works once you've found `sudo`; the top-level list stays short and unchanged, preserving the discovery ethos). Example entries:

```
$ help theme
  theme [dark|light] — switch the color theme
  with no argument, toggles. persists via the site's theme picker.

$ help cd
  cd <tool> — open a tool's overview page (alias: open)
  prints the tool's synopsis, then navigates after a beat. Ctrl-C cancels.
```

- Dispatch: `help` with no args prints the existing list (unchanged except the `cd` row gains the nav-beat mention if wording needs it); `help <arg>` looks up `HELP_DETAIL[arg.toLowerCase()]`.
- Unknown arg: `help: no help for 'xyz'` + reuse the suggester (`— did you mean 'man'?`); when the arg is a tool name (`help hop`), point sideways: `try: man hop`.

### 3. Intentional navigation beat for `cd` / `open` / `install`

Today `navigateTool()` and `install` call `window.location.assign(route)` synchronously and print `opening {route} …`. New behavior (one shared helper, e.g. `navigateWithBeat(route, lines)`):

1. Print context first — for `cd`/`open`: the tool's `SYNOPSIS` line, then `opening <a href>{route}</a> … (Ctrl-C to cancel)` as a real clickable anchor (`html: true`, same trusted-static-string pattern as `man`). For `install`: keep its one line, now with the anchor + cancel hint.
2. Schedule `window.location.assign(route)` via `window.setTimeout` with `NAV_BEAT_MS = 900` (a named constant beside `HINT_DELAY_MS`).
3. **Ctrl-C cancels**: the existing Ctrl-C branch in `onKeydown` additionally clears any pending nav timer (`pendingNav` id at `initTerminal` scope) — the printed `^C` line plus fresh prompt then read exactly like aborting a command in a real shell. This is what makes the beat *intentional* rather than laggy, and directly answers the "felt like a misclick" complaint: you see where you're headed, and you can stay.
4. The clickable anchor means an impatient visitor clicks through immediately; the beat is a pure `setTimeout` (timing, not animation), so no `prefers-reduced-motion` interaction.
5. Chip taps (`install` chip from `by18`) flow through the same path and inherit the beat + printed feedback; touch users have no Ctrl-C but gain the same clickable link.

### 4. `aria-live` output announcements

- At activation (island only — the no-JS static transcript is inert and needs nothing), set on `pre.shell-session`: `aria-live="polite"` and `aria-atomic="false"`. Everything appended by `print()` / `printBeforePrompt()` is thereafter announced after the user's keystroke settles.
- **Noise control**: in `freshPrompt()`, mark the new prompt's `$` span (`.shell-prompt`) `aria-hidden="true"` — otherwise every command would end with a stray "$" announcement when the next prompt line is appended. The input's existing `aria-label` ("Terminal command input…") already carries the prompt semantics; the block cursor span is aria-hidden today.
- What stays silent, by construction: the idle ghost hint (`aria-hidden`, additions of hidden content aren't announced), `clear`/Ctrl-L (`replaceChildren` removals aren't announced), the frozen echo line (attribute/class mutation only — the Ctrl-C `^C` text suffix *is* a text addition and announcing "^C" is correct feedback).
- The activation-time greeting is appended after the attribute is set, so it announces once on load — acceptable and arguably the right introduction for SR users.

### 5. Reduced-motion audit → CSS gate

Audit result (this intake *is* the audit; the implementation is the fix):

| Motion source | Where | Reduced-motion safe today? |
|---|---|---|
| `shell-blink` cursor blink (static skin + live `.shell-input-cursor.is-active`) | `terminal.css:445` | **No** — unconditional |
| `terminal-blink` doc-page first-paragraph cursor | `terminal.css:636` | **No** — unconditional |
| Idle ghost hint typing (`23xc`) | `TerminalPrompt.astro` JS | Yes — static text under `reduce` |
| Resting-state anchor / `scrollToBottom` | JS | Yes — instant assignment, no smooth scrolling |
| Hover/focus/`:active` color changes; nav beat | CSS / `setTimeout` | Yes — not motion |

Fix: one `@media (prefers-reduced-motion: reduce)` block in `terminal.css` setting `animation: none` for `.shell-cursor`, `.shell-input-cursor.is-active`, and `.sl-markdown-content > p:first-of-type::after`, with the cursor held steady at full opacity when focused (`.is-active`) and the existing dim 0.35 idle opacity otherwise — the cursor stays *visible* (it signals typeability), it just stops pulsing. Doc-page `::after` cursor likewise steady. Pure `--c-*`/opacity — both themes for free.

### Out of scope

- No `COMMANDS` roster changes, no new commands (`history` shipped with `n23o`; further eggs are `[o33t]`).
- No edits to the static transcript in `index.mdx`, the chip roster, or `VersionTable`.
- The `[rk7t]` divergence-reporter tuning (unrelated backlog item).

## Affected Memory

- `site/homepage-terminal`: (modify) — site-local memory tree (`sites/astro-starlight-terminal1/docs/memory/`). Add the command-polish pass (suggester module + threshold rules, `HELP_DETAIL` and the eggs-answer-but-don't-list stance, the nav-beat mechanism + Ctrl-C cancel + pendingNav interaction with the control-keys section) and an accessibility section (session live-region + prompt-`$` aria-hidden rationale, the reduced-motion CSS gate and the motion-source audit table); extend Requirements + Changelog.

## Impact

- `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` — `run()` not-found branch (suggester); `COMMANDS.help` (arg dispatch) + new `HELP_DETAIL` constant; `navigateTool`/`install` → shared `navigateWithBeat` + `NAV_BEAT_MS` + `pendingNav` cancellation in the Ctrl-C branch; activation block (live-region attributes); `freshPrompt` (`aria-hidden` on `$`).
- `sites/astro-starlight-terminal1/src/styles/terminal.css` — new `prefers-reduced-motion: reduce` block (only stylesheet change).
- `sites/astro-starlight-terminal1/src/lib/terminal-suggest.ts` — new, dependency-free (bundled into the island by Vite).
- `sites/astro-starlight-terminal1/scripts/terminal-suggest.test.mjs` — new `node --test` unit test.
- No build/config/workflow/content changes; no other pages affected (the doc-page cursor gate is CSS-only).

## Open Questions

*(none — the backlog entry is unusually specific; the one genuinely open design choice, the nav-beat shape, scored Confident under SRAD and is recorded as assumption #5 for `/fab-clarify` review)*

## Clarifications

### Session 2026-06-10 (bulk confirm)

All 7 Confident assumptions presented with concrete examples (terminal transcripts, markup, command lines); user confirmed each.

| # | Action | Detail |
|---|--------|--------|
| 2 | Confirmed | — |
| 3 | Confirmed | — |
| 4 | Confirmed | — |
| 5 | Confirmed | — |
| 6 | Confirmed | — |
| 8 | Confirmed | — |
| 9 | Confirmed | — |

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Did-you-mean = edit-distance match over `Object.keys(COMMANDS)`, appended to the existing `command not found` line | Mechanism, candidate set, and output format stated verbatim in the backlog entry | S:90 R:90 A:85 D:85 |
| 2 | Certain | Suggester specifics: Damerau-Levenshtein (transposition=1); max distance 1 for inputs ≤3 chars else 2; tie → lowest distance then key order; eggs included as candidates; extracted to `src/lib/terminal-suggest.ts` | Clarified — user confirmed | S:95 R:90 A:80 D:60 |
| 3 | Certain | `help <command>` prints per-command usage + detail from a new `HELP_DATA`-style record; top-level `help` list stays as-is | Clarified — user confirmed | S:95 R:85 A:80 D:80 |
| 4 | Certain | Hidden eggs answer `help <egg>` but are never listed; unknown `help` arg gets the suggester + a `man <tool>` sideways hint for tool names | Clarified — user confirmed | S:95 R:90 A:75 D:65 |
| 5 | Certain | Nav beat = keep auto-navigation; print synopsis + clickable link + `(Ctrl-C to cancel)`, navigate after `NAV_BEAT_MS = 900`; Ctrl-C clears the pending timer; chips inherit the beat | Clarified — user confirmed | S:95 R:85 A:55 D:45 |
| 6 | Certain | Live region = `aria-live="polite"` + `aria-atomic="false"` on `pre.shell-session`, set by the island at activation; new prompts' `$` span `aria-hidden` to cut per-command noise. Rejected: a parallel visually-hidden mirror region (duplicate DOM, drift risk) | Clarified — user confirmed | S:95 R:85 A:70 D:70 |
| 7 | Certain | Reduced-motion fix = one `@media (prefers-reduced-motion: reduce)` block gating `shell-blink` + `terminal-blink` (cursor steady-visible, not removed); JS motion (`23xc` hint, instant scrolls) verified already safe | Backlog mandates the audit; Constitution accessibility constraint; audit of `terminal.css` + island found exactly these two unconditional animations; one obvious implementation | S:80 R:95 A:90 D:85 |
| 8 | Certain | Verification = `node --test scripts/terminal-suggest.test.mjs` for the suggester + `astro build` + behavioral acceptance for island/CSS behavior (no component test harness exists; siblings shipped the same way) | Clarified — user confirmed | S:95 R:80 A:85 D:70 |
| 9 | Certain | Scope boundary: static `index.mdx` transcript byte-identical; no roster changes; exactly-one-trailing-prompt + resting-anchor invariants preserved; `[o33t]` delight items excluded | Clarified — user confirmed | S:95 R:75 A:85 D:80 |

9 assumptions (9 certain, 0 confident, 0 tentative, 0 unresolved).
