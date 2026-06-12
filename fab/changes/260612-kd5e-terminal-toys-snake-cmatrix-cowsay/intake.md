# Intake: Terminal Toys — snake, cmatrix, cowsay

**Change**: 260612-kd5e-terminal-toys-snake-cmatrix-cowsay
**Created**: 2026-06-12

## Origin

> kd5e

One-shot `/fab-new kd5e` from the backlog. Backlog item (2026-06-12, source: terminal-fun review 2026-06-11, ideas #5+#6), reproduced in full:

> Terminal toys — `snake`, `cmatrix`, `cowsay`: the expected terminal playthings the toolkit doesn't have yet. In `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro`, vanilla JS, zero new deps (Constitution VI), static-first (Constitution I). Three commands, in priority order. (1) **`snake`** — a real, playable game rendered in a `<pre>` grid inside the session (arrow/WASD to steer, score, game-over → restart). A genuine *destination* people return to and share, qualitatively different from the 69 one-shot commands. It must take over input cleanly while playing and release on quit (Ctrl-C/`q`), reusing the o33t stream-cancel + key-capture discipline; pause/halt under `prefers-reduced-motion` is acceptable, or offer a static 'reduced-motion: game disabled' note. (2) **`cmatrix`** — one screen of falling glyphs as a finite, interruptible o33t-style stream (NOT infinite — honor the no-runaway constraint), `ariaHidden` frames + one announced summary line, `prefers-reduced-motion` → a single static frame. (3) **`cowsay <text>`** — ASCII cow speaking the argument; with no arg, speak a random `FORTUNE` (composes with the existing `fortune`). All three: unlisted in `help` (the discovery ethos), answered by `help <cmd>`/`man`, added to the `cheatsheet` classics group (the cdbr coverage check will flag them if not), dark/light parity via `--c-*` vars, exactly-one-trailing-prompt invariant preserved, keyboard-accessible. Scope can split if needed: `cowsay` is trivial, `cmatrix` is a stream, `snake` is the real work — ship in that ascending-effort order. Pure delight/differentiation (no direct funnel value) → sequence LAST, after `[tx5p]`/`[4vkd]`/`[jf9k]`. Do NOT pre-empt `[42my]` (pipes/VFS, drafted at intake). Acceptance: `snake` is playable + quits cleanly; `cmatrix` runs finite + interruptible; `cowsay hi` and bare `cowsay` both work; all reduced-motion-safe. Source: terminal-fun review 2026-06-11 (ideas #5+#6).

Sequencing precondition verified at intake: changes for `tx5p`, `4vkd`, and `jf9k` all exist (created 2026-06-12) and their surfaces (`share`, `demo`/`tour`, `play`) are already integrated in `TerminalPrompt.astro` on this branch; `42my` exists as a drafted change and is not pre-empted (no pipes/VFS surface is touched here).

## Why

The homepage terminal answers 69 commands — GNU-util gags (`sl`, `yes`, `fortune`, `rm -rf /`), real utilities (`grep`, `seq`, `sha256sum`), tool cards, a guided `demo`, illustrated `play <tool>` shorts, and a share/replay loop. What it does NOT answer are the three things people reflexively type into every terminal-shaped object they meet: `snake`, `cmatrix`, `cowsay`. The gap is felt *because* everything else lands — a terminal that rewards `sl` and `fortune` but returns `command not found: snake` breaks the bit exactly at the moment a delighted visitor goes looking for more.

What each brings:

1. **`snake`** is qualitatively different from the existing roster: every current command is one-shot (or a finite stream). A playable game is a *destination* — something visitors return to, screen-record, and share. It is the strongest pure-delight retention surface the terminal can add.
2. **`cmatrix`** is the most iconic "terminal as theater" visual; one finite screen of it is cheap (the o33t stream engine already exists) and highly screenshot-able.
3. **`cowsay`** is the lowest-effort, highest-recognition classic, and composing the bare form with the existing `FORTUNES` roster makes two eggs cross-advertise each other.

If we don't do this: nothing breaks — but the terminal's discovery ethos ("a curious dev might try the obvious ones") keeps writing checks the roster can't cash, and the strongest organic-share surface (snake) stays unbuilt. This is pure delight/differentiation with no direct funnel value, which is why it was deliberately sequenced last among the terminal-fun items — that precondition is now satisfied.

Why this approach: everything stays inside the existing island (`TerminalPrompt.astro`), vanilla JS, zero new dependencies (Constitution VI), fully static (Constitution I). All three reuse established machinery — the o33t stream engine and stream-cancel discipline, the `sl`-train direct-DOM precedent, the jf9k handler-level reduced-motion branch, the cheatsheet coverage guard, and the `src/lib/` + `node --test` extraction pattern — rather than inventing new mechanisms.

## What Changes

Three new `COMMANDS` keys in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro`, implemented in ascending-effort order: `cowsay` → `cmatrix` → `snake`. Pure logic is extracted to a new `src/lib/terminal-toys.ts` (the sixth use of the lib pattern) pinned by `scripts/terminal-toys.test.mjs`.

### 1. `cowsay [text...]` — static print (trivial)

- **With args**: the classic ASCII cow speaks the joined argument text in a speech bubble:

  ```
   ______
  < moo! >
   ------
          \   ^__^
           \  (oo)\_______
              (__)\       )\/\
                  ||----w |
                  ||     ||
  ```

- **Bare `cowsay`**: speaks a random entry from the existing `FORTUNES` const (the backlog-specified composition with `fortune` — one source, no drift).
- **Bubble building** is a pure function in `terminal-toys.ts`: border sized to content, long text wrapped to multiple bubble lines (`< … >` becomes `/ … \`, `| … |`, `\ … /` rows in classic cowsay style). Wrap width stays comfortably inside the session's `white-space: pre` line budget (the `CHEAT_LINE_WIDTH` 74-char precedent; classic cowsay wraps at 40 — exact value decided at apply).
- **Accessibility**: bubble border and cow art rows are `ariaHidden` (the shll-splash / o33t live-region policy); one announced line carries the readable content, e.g. `the cow says: <text>`. No motion — static print, no `prefers-reduced-motion` interaction (the `navigateWithBeat` precedent of documenting "no interaction").

### 2. `cmatrix` — finite, interruptible stream

- One screen of "falling glyphs": ~40–60 generated `Line`s of scattered matrix-style glyphs (density-varied half-width katakana / ASCII mix), streamed one per tick via the existing `startStream` engine (the Tier C o33t engine — at most one stream at a time, killed by Ctrl-C and by any newly committed command, lands above the live prompt so the exactly-one-trailing-prompt invariant holds by construction).
- **Finite by construction** (the no-runaway constraint): a fixed frame count, named constants following the `YES_TICK_MS`/`YES_CAP` convention (e.g., `CMATRIX_TICK_MS` ≈ 100–150, `CMATRIX_CAP` — exact values tuned at apply; fast cadence, the flood IS the bit, same rationale as `yes`).
- **Color**: glyph rows use the existing `shell-ok` class (theme-aware green via `--c-*` vars — dark/light parity with zero new color plumbing).
- **Accessibility**: every glyph row is `ariaHidden`; ONE announced summary/punchline line closes the run (the o33t one-announced-summary rule), tying back to the site's static-honesty bit (exact copy at apply; the `AGENT_LOG` self-identifying-static precedent).
- **Reduced motion**: handler-level `prefersReducedMotion()` branch prints a SINGLE static frame block + the announced summary — deliberately NOT `startStream`'s all-at-once fallback, which would dump the full frame list (the jf9k `play` end-frame precedent; the backlog explicitly specifies "a single static frame").
- **Frame generation** is a pure function in `terminal-toys.ts` with the RNG injected as a parameter, so tests pin shape (line width, frame count, glyph alphabet, density profile) deterministically.

### 3. `snake` — playable game (the real work)

- **Board**: a bordered grid rendered inside the session. Rendering is in-place (a game cannot be append-only): the handler appends ONE `aria-hidden` container holding a `<pre>`-style board directly to `session` — the `sl`-train direct-DOM precedent — positioned above the live prompt, and the game loop rewrites its text content each tick. Board dimensions fit the session's line-width budget (≤ ~74 cols incl. border) and stay short enough for laptop/mobile viewports (~12–16 rows — exact size at apply). Snake body, head, and food use distinct glyphs (e.g., `o`/`@`/`*`); a status line shows the live score.
- **Input takeover**: a game-mode flag checked at the top of `onKeydown`, before the history/Tab/Enter branches. While active: Arrow keys AND WASD steer (with `preventDefault` — arrows otherwise drive history recall and page scroll), `q` and Ctrl-C quit, all other keys are swallowed (no typing into the prompt mid-game). On quit the flag clears and every existing key path resumes untouched. This is the o33t stream-cancel + key-capture discipline extended from "any key kills the replay" to "the game owns the keys until it releases them."
- **Game loop**: `setInterval` tick (cadence at apply, ~120–200ms); the per-tick state transition (move, grow-on-food, wall/self collision) is a PURE function in `terminal-toys.ts` (`state → state`), unit-tested for steering, growth, scoring, and both collision modes; the island owns only the timer, the DOM writes, and the key wiring.
- **Game over → restart**: on collision the board freezes with a game-over banner + final score; `r` (or Enter) restarts in place, `q`/Ctrl-C quits. Quit tears down cleanly: timer cleared, key capture released, board container left as a static transcript artifact or removed (decided at apply — the `sl` train removes itself; a frozen final board is the better share/screenshot artifact).
- **Exactly-one-trailing-prompt invariant**: the handler is a `void` handler (the `demoHandler` shape); `commitLine` emits its single fresh prompt as always, the game renders above it, and quitting prints its summary via `printBeforePrompt` without emitting any prompt — the stream precedent, invariant preserved by construction.
- **Accessibility**: board updates are `aria-hidden` (live-region garbage); one announced line at start (controls: `arrows/wasd to steer · q to quit`) and one at game over (`game over — score: N`) — the o33t one-announced-summary rule applied at the two meaningful moments. Fully keyboard-accessible by nature; touch devices (no keyboard) cannot steer — acceptable for an unlisted egg, noted in `help snake`.
- **Reduced motion**: under `prefers-reduced-motion`, `snake` does not start; it prints an honest static note (e.g., `snake needs motion — your system prefers reduced, so the game sits this one out.`). The backlog sanctions either this or pause/halt; the static note is chosen for simplicity and honesty (see Assumptions).
- **Interaction edges** (handled at apply): committing via a by18 touch chip mid-game ends the game first (the `commitLine → stopStream` precedent extended to game teardown); a `#play=` deep-link replay never types `snake` — `'snake'` is appended to the exported `REPLAY_DENY` list in `terminal-share.ts` (verified at intake: the list's documented charter is "a URL-controlled sequence must never yank the visitor", and an input-owning game a visitor didn't ask for is exactly that; the one shared list covers BOTH the recording predicate and the hash parser, and the pinned-contents assertion at `scripts/terminal-share.test.mjs:201` is updated to match); `clear`/Ctrl-L mid-game tears the game down with the transcript. `cmatrix` and `cowsay` replay faithfully like every other egg/stream (the documented default).

### 4. Roster integration (all three)

- **`help`**: NOT listed in the curated `help` roster (the discovery ethos — eggs stay unlisted; the existing "a curious dev might try the obvious ones" tease line is the pointer and now cashes three more checks).
- **`help <cmd>` / `man <cmd>`**: three new `HELP_DETAIL` entries (`snake`, `cmatrix`, `cowsay`) via the existing `helpDetail` factory — usage line + one-line detail each.
- **`cheatsheet`**: all three appended to the `classics` group in `CHEATSHEET_GROUPS` (`cowsay` with display decoration `cowsay <text>` — the `cd <tool>` decoration-teaches-invocation precedent). The runtime coverage recomputation (`buildCheatsheet`, change cdbr) would otherwise surface them under `uncategorized` — adding them to `classics` is what the backlog's "the cdbr coverage check will flag them if not" refers to. No changes to `scripts/terminal-cheatsheet.test.mjs` (it pins the lib mechanics against a miniature roster, not the real one).
- **Tab completion / did-you-mean**: inherited automatically — both derive from `Object.keys(COMMANDS)`. No `TOOL_ARG_COMMANDS` growth (none of the three take a tool argument).
- **Dark/light parity**: all output uses existing `shell-*` classes (themed via `--c-*` vars); any new board CSS in `terminal.css` (the `sl` `.shell-art-train` precedent) uses the same variables.

### 5. Lib + tests

- **New** `sites/astro-starlight-terminal1/src/lib/terminal-toys.ts`: cowsay bubble builder, cmatrix frame generator (injected RNG), snake state-transition function (+ types). Dependency-free, plain string/array math (the `terminal-eggs.ts` charter).
- **New** `sites/astro-starlight-terminal1/scripts/terminal-toys.test.mjs`: `node --test` pins for all three (the established `scripts/terminal-*.test.mjs` pattern, run via Node ≥22 native type-stripping).

### Acceptance sketch (from the backlog, verbatim targets)

- `snake` is playable (steer, eat, score, die, restart) and quits cleanly (q/Ctrl-C → keys released, exactly one trailing prompt).
- `cmatrix` runs finite and is interruptible (Ctrl-C and any committed command kill it).
- `cowsay hi` and bare `cowsay` both work (bare form speaks a `FORTUNES` entry).
- All three are reduced-motion-safe (cowsay static; cmatrix single static frame; snake declines with a static note).
- All three: covered in `cheatsheet` classics, answered by `help <cmd>`/`man <cmd>`, absent from bare `help`, dark/light parity, live-region quiet (ariaHidden art + one announced line).

## Affected Memory

- `site/homepage-terminal`: (modify) — the site-level memory tree at `sites/astro-starlight-terminal1/docs/memory/site/homepage-terminal.md` (hand-maintained, outside `fab memory-index`). Append the toys pass to the change-history narrative: the three commands, the game-mode key-capture flag in `onKeydown` (the first input-owning surface beyond streams/replay), the in-place board rendering vs. the append-only stream engine, the per-toy reduced-motion postures (static print / single static frame / declined game), `terminal-toys.ts` as the sixth lib, and the cheatsheet classics placement.

Top-level domains (`conventions/`, `build-deploy/`) are untouched — island-internal behavior with no build/pull/contract surface.

## Impact

- `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` — three `COMMANDS` handlers; three `HELP_DETAIL` entries; `classics` group additions in `CHEATSHEET_GROUPS`; new named constants (tick rates, caps, board size); game-mode branch at the top of `onKeydown`; snake board container + loop; cmatrix stream invocation. The dominant edit surface.
- `sites/astro-starlight-terminal1/src/lib/terminal-toys.ts` — new (pure logic).
- `sites/astro-starlight-terminal1/scripts/terminal-toys.test.mjs` — new (pins the lib).
- `sites/astro-starlight-terminal1/src/styles/terminal.css` — possible small addition for board styling (the `.shell-art-train` precedent); `--c-*` vars only.
- `sites/astro-starlight-terminal1/src/lib/terminal-share.ts` — one-line addition: `'snake'` joins `REPLAY_DENY` (covers both the recording predicate and the hash parser). `scripts/terminal-share.test.mjs` — the deny-list pinned-contents assertion (line 201) gains `'snake'`.
- No build pipeline, content collections, contracts, or other sites touched. No new dependencies.

## Open Questions

- None — all decision points resolved as graded assumptions below (no Unresolved).

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | All three commands live in the `TerminalPrompt.astro` island: vanilla JS, zero new deps, fully static | Backlog states it verbatim; Constitution I (static-first) and VI (minimal deps) mandate it | S:95 R:90 A:95 D:95 |
| 2 | Certain | Single change covering all three toys, implemented in ascending-effort order (cowsay → cmatrix → snake); split only if apply hits trouble | Backlog explicit: "scope can split if needed … ship in that ascending-effort order" — one backlog item, one change is the default; splitting later is cheap | S:90 R:85 A:85 D:85 |
| 3 | Certain | Bare `cowsay` speaks a random entry from the existing `FORTUNES` const | Backlog explicit ("composes with the existing fortune"); single-source-no-drift is the established FAKE_ENV/FORTUNES convention | S:95 R:90 A:90 D:90 |
| 4 | Certain | `cmatrix` = finite append-only line stream via the existing `startStream` engine (~40–60 frames, fast `yes`-like tick), named `CMATRIX_*` constants | Backlog names the mechanism verbatim ("finite, interruptible o33t-style stream"); the engine gives Ctrl-C kill, new-command kill, and the prompt invariant for free — only tick/cap parameters remain, tuned at apply | S:90 R:80 A:90 D:85 |
| 5 | Certain | cmatrix reduced-motion = handler-level branch printing ONE static frame + the announced summary, not `startStream`'s all-at-once fallback | Backlog verbatim ("prefers-reduced-motion → a single static frame"); jf9k `play` set the handler-level end-frame precedent for exactly this reason | S:95 R:85 A:90 D:90 |
| 6 | Confident | Snake board renders via ONE in-place-updated `aria-hidden` container appended directly to `session` (the `sl`-train direct-DOM precedent), above the live prompt; the stream engine is not used for the board | A game needs in-place updates; the append-only stream engine cannot redraw — `sl` is the established direct-DOM door; backlog says "rendered in a `<pre>` grid" | S:80 R:60 A:80 D:75 |
| 7 | Confident | Input takeover = game-mode flag at the top of `onKeydown`: arrows+WASD steer (preventDefault), q/Ctrl-C quit and release, all other keys swallowed; chip commits / clear tear the game down first | Backlog: "take over input cleanly … release on quit (Ctrl-C/q), reusing the o33t stream-cancel + key-capture discipline"; onKeydown is the single key entrypoint | S:85 R:65 A:80 D:75 |
| 8 | Confident | Snake game-over freezes the board with a banner + final score; `r`/Enter restarts in place, q/Ctrl-C quits; score visible live during play, announced once at game over | Backlog: "score, game-over → restart"; the o33t one-announced-summary rule fixes the aria posture | S:85 R:75 A:80 D:70 |
| 9 | Confident | Snake under `prefers-reduced-motion` declines to start with an honest static note (no auto-running game), rather than pause/halt mid-game | Backlog sanctions both options; the static note is simpler, honest (the AGENT_LOG self-identifying precedent), and avoids shipping motion to users who opted out | S:75 R:85 A:70 D:60 |
| 10 | Confident | Pure logic (bubble builder, frame generator with injected RNG, snake step function) extracted to new `src/lib/terminal-toys.ts` + pinned by `scripts/terminal-toys.test.mjs` | The lib pattern's sixth use — suggest/eggs/cheatsheet/share/toolcard all follow it; code-quality.md says follow existing patterns; games and generators are exactly the testable core | S:70 R:70 A:90 D:80 |
| 11 | Confident | `'snake'` joins `REPLAY_DENY` in `terminal-share.ts` (one shared list, both call sites); the pinned-contents test assertion updated; `cmatrix`/`cowsay` replay faithfully | Resolved at intake by reading the lib: the deny-list's documented charter ("a URL-controlled sequence must never yank the visitor") squarely covers an unrequested input-owning game; one-line, trivially reversible | S:75 R:90 A:90 D:80 |
| 12 | Certain | Dark/light parity via existing `shell-*` classes and `--c-*` vars (cmatrix glyphs = `shell-ok` green); any board CSS added to `terminal.css` uses the same vars | Backlog verbatim ("dark/light parity via `--c-*` vars"); zero new color plumbing matches every prior terminal change | S:90 R:90 A:90 D:90 |

12 assumptions (6 certain, 6 confident, 0 tentative, 0 unresolved).
