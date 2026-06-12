# Plan: Terminal Toys — snake, cmatrix, cowsay

**Change**: 260612-kd5e-terminal-toys-snake-cmatrix-cowsay
**Intake**: `intake.md`

## Requirements

### Terminal commands: cowsay

#### R1: `cowsay [text...]` static print
The island SHALL answer `cowsay <text>` with the classic ASCII cow speaking the joined argument text in a cowsay-style speech bubble, and bare `cowsay` SHALL speak a random entry from the existing `FORTUNES` const (one source, no drift). Bubble building MUST be a pure function in `src/lib/terminal-toys.ts` (border sized to content; long text word-wrapped at 40 chars into classic `/ … \` / `| … |` / `\ … /` rows; words longer than the wrap width hard-split). All bubble and cow-art rows MUST be `ariaHidden`; exactly ONE announced line carries the readable content (`(the cow says: <text>)`).

- **GIVEN** the live prompt, **WHEN** the user runs `cowsay moo!`, **THEN** a bubble (`​ ______` / `< moo! >` / `​ ------`) and the cow art print as aria-hidden rows, **AND** one announced `shell-comment` line reads `(the cow says: moo!)`.
- **GIVEN** the live prompt, **WHEN** the user runs bare `cowsay`, **THEN** the bubble carries one of the eight `FORTUNES` entries verbatim.
- **GIVEN** argument text longer than 40 chars, **WHEN** `cowsay` runs, **THEN** the bubble wraps to multiple rows, every row padded to the same inner width, total line width ≤ 44 chars (inside the 74-char budget).

### Terminal commands: cmatrix

#### R2: finite, interruptible glyph stream
`cmatrix` SHALL stream a finite screen of matrix-style falling-glyph lines via the existing `startStream` engine (at most one stream; killed by Ctrl-C, Ctrl-L, and any newly committed command; lands above the live prompt so the exactly-one-trailing-prompt invariant holds by construction). Frame generation MUST be a pure function in `terminal-toys.ts` taking an injected RNG (density-varied half-width-katakana/ASCII mix). Cadence and frame count MUST be named constants following the `YES_TICK_MS`/`YES_CAP` convention (`CMATRIX_TICK_MS = 120`, `CMATRIX_CAP = 48`, `CMATRIX_COLS = 72`). Glyph rows use the existing `shell-ok` class and are `ariaHidden`; exactly ONE announced summary line closes the run (the `yes` final-stream-line precedent), self-identifying the rain as static.

- **GIVEN** the live prompt (no reduced motion), **WHEN** the user runs `cmatrix`, **THEN** 48 aria-hidden `shell-ok` glyph lines stream one per 120 ms above the live prompt, **AND** the run closes with one announced summary line.
- **GIVEN** a running `cmatrix` stream, **WHEN** the user presses Ctrl-C (or commits any command), **THEN** the stream halts immediately and exactly one trailing prompt remains.

#### R3: cmatrix reduced-motion = one static frame
Under `prefers-reduced-motion`, the `cmatrix` handler MUST branch BEFORE `startStream` (the jf9k `play` end-frame precedent) and print ONE static frame block (`CMATRIX_REDUCE_LINES = 12` aria-hidden lines) plus the announced summary — deliberately NOT the engine's all-at-once fallback, which would dump all 48 frames.

- **GIVEN** `prefers-reduced-motion: reduce`, **WHEN** the user runs `cmatrix`, **THEN** exactly 12 static glyph lines + the one announced summary print at once, with no interval timer started.

### Terminal commands: snake

#### R4: playable board, in-place rendering
`snake` SHALL render a bordered board inside ONE `aria-hidden` container appended directly to `session` (the `sl`-train direct-DOM precedent — appended inside `run()`, so the board sits above the live prompt `commitLine` emits after), whose text content is rewritten in place each tick. The board MUST fit the width budget (`SNAKE_COLS = 46` interior + 2 border = 48 ≤ 74 chars) and the 22 rem session viewport (`SNAKE_ROWS = 10` interior + 2 border + 1 status row). The per-tick state transition (move, steer, grow-on-food, wall/self collision, food respawn) MUST be a pure `state → state` function in `terminal-toys.ts`; board-to-text rendering is likewise pure lib string math. Snake body, head, and food use distinct glyphs (`o`/`@`/`*`); a status row shows the live score.

- **GIVEN** the live prompt (no reduced motion), **WHEN** the user runs `snake`, **THEN** one aria-hidden board container appears above the live prompt with border, a 3-segment snake, one food glyph, and a status row reading `score: 0 · arrows/wasd steer · q quits`.
- **GIVEN** an active game, **WHEN** the snake's head reaches the food cell, **THEN** the snake grows by one segment, the score increments, and the food respawns on a free cell.

#### R5: input takeover via a game-mode flag in `onKeydown`
While a game is active, a game-mode branch at the TOP of `onKeydown` (after the idle-hint/replay kill statements, before the Ctrl/history/Tab/Enter branches) MUST own the keys: Arrow keys AND WASD steer (with `preventDefault` — arrows otherwise drive history recall and page scroll); `q` and plain Ctrl-C quit and release; plain Ctrl-L tears the game down and falls through to the normal clear path; all other typing/navigation keys (printable chars, Tab, Enter, Backspace, Delete, PageUp/Down, Home/End) are swallowed so nothing types into the prompt mid-game. Other modified combos (Ctrl-Shift-C copy, Cmd-R, etc.) MUST fall through to native browser handling. On quit the flag clears and every existing key path resumes untouched.

- **GIVEN** an active game, **WHEN** the user presses ArrowUp or `w`, **THEN** the snake turns up on the next tick and the page does not scroll and history recall does not fire.
- **GIVEN** an active game, **WHEN** the user presses `q` or Ctrl-C, **THEN** the timer is cleared, the key flag is released, the frozen board remains as a transcript artifact, and one announced line confirms the release.
- **GIVEN** an active game moving right, **WHEN** the user presses ArrowLeft, **THEN** the 180° reversal is ignored and the snake continues right.

#### R6: game over, restart, announcements
On wall or self collision the board MUST freeze with a centered game-over banner and final score in the status row; `r` (or Enter) restarts in place; `q`/Ctrl-C quits. Exactly TWO announced moments exist: one controls line at start (`snake — arrows/wasd steer · q quits`) and one line at game over (`game over — score: N`) — the o33t one-announced-summary rule applied at the two meaningful moments; all board updates are aria-hidden.

- **GIVEN** an active game, **WHEN** the snake hits a wall or itself, **THEN** the interval stops, the board shows the banner + final score, **AND** one announced line reads `game over — score: N`.
- **GIVEN** a game-over board, **WHEN** the user presses `r` or Enter, **THEN** a fresh game starts in the same container with score 0.

#### R7: snake reduced-motion = honest decline
Under `prefers-reduced-motion`, `snake` MUST NOT start; it prints an honest static note (`snake needs motion — your system prefers reduced, so the game sits this one out.`).

- **GIVEN** `prefers-reduced-motion: reduce`, **WHEN** the user runs `snake`, **THEN** only the static note prints — no board, no timer, no key capture.

#### R8: teardown edges & the prompt invariant
A command committed mid-game (the by18 chip path — typed commits are impossible while keys are swallowed) MUST tear the game down first: `commitLine` calls the game teardown beside its existing `stopStream()` call. Ctrl-L (and the `clear` it falls through to) tears the game down with the transcript. The snake handler is a `void` handler (the `demoHandler` shape); `commitLine` emits its single fresh prompt as always; quit/game-over summaries print via `printBeforePrompt` without emitting any prompt — the exactly-one-trailing-prompt invariant holds on every path.

- **GIVEN** an active game on a touch device, **WHEN** the user taps a command chip, **THEN** the game timer and flag clear before the chip command runs, and exactly one trailing prompt remains.
- **GIVEN** an active game, **WHEN** the user presses Ctrl-L, **THEN** the game tears down, the transcript (board included) clears, and exactly one fresh prompt is emitted.

### Roster integration

#### R9: help/cheatsheet/completion wiring
All three commands MUST stay absent from the curated bare-`help` list (the discovery ethos — bare `help` output stays byte-identical). Each MUST have a `HELP_DETAIL` entry via the `helpDetail` factory (usage + one dim detail line; `help snake` notes keyboard-only), appended after `play` per the o33t append-after-existing convention, answering `help <cmd>` and `man <cmd>` via the existing bridge. All three MUST join the `classics` group in `CHEATSHEET_GROUPS` (`cowsay` with display decoration `cowsay <text>` — the `cd <tool>` precedent), so the cdbr runtime coverage check never files them under `uncategorized`. Tab completion and the did-you-mean suggester inherit automatically via `Object.keys(COMMANDS)` — zero wiring, and the three keys append LAST in `COMMANDS` (cowsay → cmatrix → snake) so the suggester's tie-break keeps favoring established keys.

- **GIVEN** the live prompt, **WHEN** the user runs `help`, **THEN** the output is byte-identical to before this change.
- **GIVEN** the live prompt, **WHEN** the user runs `cheatsheet`, **THEN** `cowsay <text>`, `cmatrix`, and `snake` appear in the `classics` group and nothing appears under `uncategorized`.
- **GIVEN** the live prompt, **WHEN** the user runs `help cowsay` / `man cmatrix` / `help snake`, **THEN** each prints its two-line HELP_DETAIL entry.

#### R10: replay deny-list
`'snake'` MUST join the exported `REPLAY_DENY` list in `src/lib/terminal-share.ts` (one shared list covering both the recording predicate and the `#play=` hash parser — an input-owning game a visitor didn't ask for is exactly the yank the list's charter prevents), and the pinned-contents assertion in `scripts/terminal-share.test.mjs` (line ~201) MUST gain `'snake'`. `cmatrix` and `cowsay` replay faithfully (the documented default — finite, non-input-owning).

- **GIVEN** a `#play=snake,fortune` deep link, **WHEN** the page loads, **THEN** `snake` is skipped silently and only `fortune` replays.
- **GIVEN** a session where the user ran `snake`, **WHEN** they run `share`, **THEN** the generated `#play=` link omits `snake`.

### Lib & tests

#### R11: `terminal-toys.ts` + `terminal-toys.test.mjs`
A new dependency-free `src/lib/terminal-toys.ts` (the sixth use of the lib pattern) MUST carry the cowsay bubble builder, the cmatrix line generator with injected RNG, and the snake types + `snakeInit`/`snakeTurn`/`snakeStep`/`renderSnakeBoard` — plain string/array math, no imports. A new `scripts/terminal-toys.test.mjs` MUST pin all three under `node --test` (the established `scripts/terminal-*.test.mjs` pattern, Node ≥22 native type-stripping): bubble shapes and wrapping, deterministic frame generation (seeded RNG), and snake steering/growth/scoring/both collision modes/tail-vacated-cell non-collision/board rendering.

- **GIVEN** the site directory, **WHEN** `node --test scripts/terminal-toys.test.mjs` runs, **THEN** all tests pass.
- **GIVEN** the same seeded RNG, **WHEN** `cmatrixLines` runs twice, **THEN** the outputs are identical (shape pinned deterministically).

### Theming & accessibility

#### R12: dark/light parity, live-region quiet
All new output MUST ride existing `shell-*` classes only (themed via `--c-*` vars — cmatrix glyphs `shell-ok` green, board/bubble `shell-out`, announced summaries `shell-comment`/`shell-out`); no new colors, and any new CSS in `terminal.css` (none expected — the board is a plain `shell-line` block) uses `--c-*` vars only. Live-region posture: art/board/glyph rows aria-hidden; one announced line per meaningful moment.

- **GIVEN** either theme, **WHEN** any of the three commands runs, **THEN** every printed row uses an existing `shell-*` class and renders legibly in both themes.

### Non-Goals

- Touch steering for snake — no on-screen D-pad; touch devices cannot steer (acceptable for an unlisted egg, noted in `help snake`).
- Infinite cmatrix — the no-runaway constraint mandates a fixed cap; no `-f`/forever mode.
- Pause/resume for snake under reduced motion — the honest decline was chosen (intake assumption #9).
- No pipes/VFS interaction — `[42my]` is drafted and untouched; `grep`/stream composition is out of scope.
- No changes to `scripts/terminal-cheatsheet.test.mjs` (it pins lib mechanics against a miniature roster, not the real one).

### Design Decisions

1. **Board geometry 46×10 interior (48×12 incl. border + 1 status row)**: sized so board + status + announced line + live prompt fit the 22 rem (~14.5-line) session viewport without cropping the board — *Why*: the player must see the whole board with the prompt pinned below — *Rejected*: 12–16 interior rows (intake's outer range) — overflows the fixed-height viewport and `scrollToBottom` would crop the top border.
2. **Quit leaves the frozen board as a transcript artifact** (timer cleared, flag released, container kept) — *Why*: a frozen final board is the better share/screenshot artifact (intake's stated preference) — *Rejected*: `sl`-style self-removal.
3. **Game-mode branch swallows typing/navigation keys only; other modified combos fall through natively** — *Why*: "all other keys swallowed" exists to stop typing into the prompt and arrow-scrolling; blocking Cmd-R/F5/Ctrl-Shift-C would be hostile — *Rejected*: blanket `preventDefault` on every key.
4. **cmatrix summary rides as the final streamed line** (the `yes` closing-comment precedent) rather than an `onDone` hook — *Why*: identical behavior, one fewer code path; the engine's reduce fallback is bypassed at the handler level anyway (R3).
5. **Snake key capture relies on the focused input's `onKeydown`** (the intake-specified flag-at-top design), not a document-level capture listener — *Why*: intake assumption #7 names this mechanism; Enter's `commitLine(true)` focuses the fresh prompt, so keys arrive by default; clicking away pauses steering until the terminal is clicked again (acceptable for an egg) — *Rejected*: the tx5p document-capture pattern (built for replay, where nothing holds focus).
6. **`renderSnakeBoard` lives in the lib** alongside the step function — *Why*: board-to-text is pure string math and makes width/glyph/banner pins testable; the island keeps only the timer, DOM writes, and key wiring (the intake's division).

## Tasks

### Phase 1: Pure lib + tests

- [x] T001 Create `sites/astro-starlight-terminal1/src/lib/terminal-toys.ts` with `COWSAY_WRAP = 40` and `cowsayBubble(text, width?)` — classic bubble borders, word wrap, hard-split, single-row `< >` vs multi-row `/ \`,`| |`,`\ /` shapes <!-- R1 -->
- [x] T002 Add `CMATRIX_GLYPHS`, `CMATRIX_DENSITY_MIN/MAX`, and `cmatrixLines(count, cols, rng)` (injected RNG, per-line density, exact-width lines) to `terminal-toys.ts` <!-- R2 -->
- [x] T003 Add snake types (`SnakeDir`, `SnakeCell`, `SnakeState`) + `SNAKE_START_LEN`/glyph consts + `snakeInit`/`snakeTurn`/`snakeStep`/`renderSnakeBoard` (move, steer with 180° guard, grow/score on food, wall + self collision with tail-vacated-cell allowance, food respawn, bordered render with game-over banner) to `terminal-toys.ts` <!-- R4 -->
- [x] T004 Create `sites/astro-starlight-terminal1/scripts/terminal-toys.test.mjs` (`node --test`, seeded mulberry32 RNG) pinning bubble shapes/wrapping, cmatrix determinism/width/alphabet/density extremes, and snake init/steer/reversal/growth/scoring/wall/self/tail-cell/render contracts; run it green <!-- R11 -->

### Phase 2: Island — cowsay & cmatrix

- [x] T005 In `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro`: import the toys lib, add the `COW_ART` const, and the `cowsay` handler (args → joined text, bare → random `FORTUNES` entry; bubble + cow aria-hidden; one announced `(the cow says: …)` line) appended after `play` in `COMMANDS`; add its `HELP_DETAIL` entry after `play` <!-- R1, R9 -->
- [x] T006 Add `CMATRIX_TICK_MS`/`CMATRIX_CAP`/`CMATRIX_COLS`/`CMATRIX_REDUCE_LINES` constants (after `PLAY_TICK_MS`) and the `cmatrix` handler: handler-level reduced-motion branch returning 12 static lines + summary; otherwise `startStream` of 48 aria-hidden `shell-ok` lines + the announced summary as the final streamed line; add its `HELP_DETAIL` entry <!-- R2, R3, R9 -->

### Phase 3: Island — snake

- [x] T007 Add `SNAKE_TICK_MS`/`SNAKE_COLS`/`SNAKE_ROWS` constants and the snake island machinery (`snakeGame` state, `startSnake`/`drawSnake`/`snakeTick`/`restartSnake`/`quitSnake`/`teardownSnake`) — one aria-hidden `shell-line shell-out` container appended to `session`, in-place `textContent` rewrite per tick, status row, game-over freeze + announced `game over — score: N`, quit announce; the `snake` handler (reduced-motion decline note; announced controls line via `ctx.print`; void return) + `HELP_DETAIL` entry <!-- R4, R6, R7, R9 -->
- [x] T008 Wire input takeover: game-mode branch at the top of `onKeydown` (after `dismissIdleHint()`/`stopReplay()`) — arrows+WASD steer with `preventDefault`, `q`/plain-Ctrl-C quit, plain-Ctrl-L teardown + fall-through, `r`/Enter restart when over, typing/nav keys swallowed, other modified combos native; add `teardownSnake()` beside `stopStream()` in `commitLine` <!-- R5, R8 -->

### Phase 4: Roster + share integration & verification

- [x] T009 Append `{ key: 'cowsay', display: 'cowsay <text>' }`, `{ key: 'cmatrix' }`, `{ key: 'snake' }` to the `classics` group in `CHEATSHEET_GROUPS` <!-- R9 -->
- [x] T010 Add `'snake'` to `REPLAY_DENY` in `sites/astro-starlight-terminal1/src/lib/terminal-share.ts` (doc comment updated, kd5e cited); update the pinned-contents assertion (~line 201) and the miniature `CMDS` roster in `scripts/terminal-share.test.mjs`; run that suite green <!-- R10 -->
- [x] T011 Run the full terminal test suite (`node --test scripts/terminal-*.test.mjs`) and `npm run build` in `sites/astro-starlight-terminal1/` to verify the island compiles and the site builds <!-- R11, R12 -->

## Acceptance

### Functional Completeness

- [x] A-001 R1: `cowsay hi` prints the bubble + cow (aria-hidden rows) + one announced line; bare `cowsay` speaks a `FORTUNES` entry; the bubble builder is a pure lib function with classic multi-row wrapping
- [x] A-002 R2: `cmatrix` streams exactly `CMATRIX_CAP` aria-hidden `shell-ok` glyph lines at `CMATRIX_TICK_MS` via `startStream` and closes with ONE announced summary; constants are named per the `YES_*` convention
- [x] A-003 R4: `snake` renders a bordered 48-wide board in one aria-hidden container appended to `session`, rewritten in place each tick; head/body/food use `@`/`o`/`*`; the status row shows the live score; the tick transition is a pure lib function
- [x] A-004 R6: collision freezes the board with a banner + final score; `r`/Enter restarts in place; the start controls line and the `game over — score: N` line are the only announced moments
- [x] A-005 R9: bare `help` output is byte-identical; all three have `helpDetail` entries answering `help <cmd>`/`man <cmd>`; all three sit in the cheatsheet `classics` group (cowsay decorated `cowsay <text>`) with nothing uncategorized; the three keys append last in `COMMANDS`
- [x] A-006 R10: `REPLAY_DENY` is exactly `['cd','open','install','share','snake']` in lib and pinned test; cmatrix/cowsay remain replayable
- [x] A-007 R11: `terminal-toys.ts` is dependency-free and `node --test scripts/terminal-toys.test.mjs` passes

### Behavioral Correctness

- [x] A-008 R5: mid-game, arrows/WASD steer with `preventDefault` (no history recall, no page scroll), `q`/Ctrl-C quit and release the keys, typing keys never reach the prompt, and modified browser combos still work natively
- [x] A-009 R8: a chip commit mid-game tears the game down before the command runs; Ctrl-L mid-game tears down and clears; exactly one trailing prompt holds on every path (start, tick, game over, restart, quit, chip, Ctrl-L)

### Scenario Coverage

- [x] A-010 R2: Ctrl-C (and any committed command) kills a running `cmatrix` mid-stream, leaving one trailing prompt
- [x] A-011 R11: tests pin snake growth+scoring on food, wall collision, self collision, the tail-vacated-cell non-collision, and the 180° reversal guard

### Edge Cases & Error Handling

- [x] A-012 R3: under `prefers-reduced-motion`, `cmatrix` prints exactly `CMATRIX_REDUCE_LINES` static lines + the summary via a handler-level branch (never the engine's all-at-once dump)
- [x] A-013 R7: under `prefers-reduced-motion`, `snake` declines with the static note — no board, no timer, no key capture
- [x] A-014 R1: cowsay text longer than the wrap width produces a correctly padded multi-row bubble; a word longer than the wrap width hard-splits instead of overflowing

### Code Quality

- [x] A-015 Pattern consistency: new code follows the island's conventions — `Object.hasOwn` guards on user-keyed record lookups, append-after-existing COMMANDS ordering, dense WHY-comments citing kd5e, the helpDetail factory, the `yes`/`sl`/`demoHandler` precedents
- [x] A-016 No unnecessary duplication: reuses `startStream`/`stopStream`, `printBeforePrompt`, `prefersReducedMotion`, `FORTUNES`, `helpDetail`, and existing `shell-*` classes; no parallel rosters
- [x] A-017 No magic numbers: cadences, caps, board geometry, wrap width, and densities are named constants (`CMATRIX_*`, `SNAKE_*`, `COWSAY_WRAP`)
- [x] A-018 No god functions: snake island machinery decomposed (start/draw/tick/quit/restart/teardown/key-branch); lib functions stay focused and individually testable
- [x] A-019 R12: dark/light parity — all new rows ride existing `shell-*` classes on `--c-*` vars; no new color plumbing

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`

## Deletion Candidates

- None — this change adds new functionality without making existing code redundant

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Confident | Board geometry 46×10 interior (48×12 + status), `SNAKE_TICK_MS = 140` — smaller than the intake's ~12–16-row outer range | The 22 rem fixed-height viewport holds ~14.5 lines; board + status + game-over line + prompt must fit or `scrollToBottom` crops the board; intake delegated exact size to apply | S:70 R:90 A:80 D:70 |
| 2 | Confident | `CMATRIX_TICK_MS = 120`, `CMATRIX_CAP = 48`, `CMATRIX_COLS = 72`, `CMATRIX_REDUCE_LINES = 12` | Inside the intake's stated ranges (100–150 ms, 40–60 frames, ≤74 cols); "single static frame" read as one ~viewport-height block | S:80 R:90 A:85 D:80 |
| 3 | Confident | Quit leaves the frozen board in the transcript (not removed) | Intake explicitly leans this way ("a frozen final board is the better share/screenshot artifact") | S:85 R:90 A:85 D:80 |
| 4 | Confident | Game mode swallows printable/typing/nav keys but lets non-Ctrl-C/L modified combos (Cmd-R, Ctrl-Shift-C…) fall through natively | "All other keys swallowed" protects the prompt and scroll; blocking browser chrome shortcuts would be hostile and serves no game purpose | S:65 R:90 A:80 D:70 |
| 5 | Confident | Key capture rides the focused input's `onKeydown` flag (no document-level listener); clicking away pauses steering until refocus | Intake assumption #7 names the onKeydown-flag mechanism; Enter focuses the fresh prompt so capture holds by default; acceptable egg-grade degradation | S:75 R:75 A:75 D:70 |
| 6 | Confident | `renderSnakeBoard` (board → string rows incl. banner) lives in the lib beside the step function | Pure string math, makes width/glyph pins testable; island keeps timer/DOM/keys only — the intake's stated division | S:70 R:85 A:85 D:80 |
| 7 | Confident | cowsay wrap width 40 (classic cowsay default), bubble ≤44 chars | Intake names 40 as the classic value and delegates the exact pick to apply; well inside the 74 budget | S:80 R:95 A:85 D:85 |
| 8 | Confident | cmatrix announced summary is the final streamed line (the `yes` precedent), copy: `(the rain is static — this site has no runtime. Ctrl-C ends it sooner.)` | The o33t `yes` closing-comment shape is the established finite-stream pattern; copy self-identifies static per the AGENT_LOG precedent; reversible content | S:70 R:90 A:80 D:75 |
| 9 | Confident | Announced copy: start `snake — arrows/wasd steer · q quits`, game over `game over — score: N`, quit `(snake: keys released — final score N.)`, reduced-motion note per the intake's example verbatim | Intake gives the game-over format and the reduced-motion copy; start/quit lines follow the site voice; all reversible content | S:75 R:90 A:80 D:75 |
| 10 | Certain | No new CSS in `terminal.css` — the board is a `shell-line shell-out` block whose `\n` text renders under the session's existing `white-space: pre` | Existing classes cover display/color; intake marked CSS as "possible small addition" only; fewer surfaces, same parity | S:75 R:95 A:90 D:85 |

10 assumptions (1 certain, 9 confident, 0 tentative).
