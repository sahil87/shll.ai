# Plan: Terminal GNU-Utils Delight Pass

**Change**: 260610-o33t-terminal-gnu-utils-delight
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

### Terminal Island: Shared Infrastructure

#### R1: FAKE_ENV single source
The island MUST define a module-scope `FAKE_ENV: Record<string, string>` with exactly the eight intake §0a pairs (`SHELL=/bin/shll`, `USER=visitor`, `HOME=/home/visitor`, `EDITOR=spec`, `PLAN=first`, `AGENTS=7`, `PATH=/plans:/specs:/code`, `TERM=shll-256color`). `env` SHALL print these as `KEY=value`, one line each, in declaration order; `echo` SHALL expand against the same record (no second roster).

- **GIVEN** the island is active
- **WHEN** the user runs `env`
- **THEN** exactly 8 `shell-out` lines print, `SHELL=/bin/shll` first and `TERM=shll-256color` last, in declaration order

#### R2: `Line.ariaHidden` live-region noise control
The `Line` type MUST gain an optional `ariaHidden?: boolean`; `print()` and `printBeforePrompt()` MUST set `aria-hidden="true"` on the emitted element when it is true. The `shll` splash's 5 ASCII-art lines MUST be retrofitted `ariaHidden: true` (pitch + tip stay announced); `sl`'s 7 locomotive lines MUST be hidden via an `aria-hidden` container (punchline stays announced).

- **GIVEN** the cuur `aria-live="polite"` region on `pre.shell-session`
- **WHEN** `shll` runs
- **THEN** the 5 art lines carry `aria-hidden="true"` and the pitch/tip lines do not

#### R3: Line streamer (Tier C engine)
The island MUST add `initTerminal`-scope `activeStream`/`streamFollowup` ids and `startStream(lines, { intervalMs, onDone? })` / `stopStream()`. `startStream` MUST first call `stopStream()` (at most one stream), then emit lines one per tick via `printBeforePrompt()` (output above the live prompt — exactly-one-trailing-prompt by construction), running `onDone` after the last line. Under `prefers-reduced-motion: reduce` there MUST be no interval: all lines print at once and `onDone` runs immediately. `stopStream()` MUST clear both `activeStream` and `streamFollowup`. The Ctrl-C branch MUST call `stopStream()` (beside its `pendingNav` clear); `commitLine` MUST call `stopStream()` before `run()` (deliberate contrast with `pendingNav`, which commitLine does NOT clear).

- **GIVEN** a `yes` stream is ticking
- **WHEN** the user presses Ctrl-C
- **THEN** the stream halts, the `^C` echo + one fresh prompt appear, and no further frames print
- **GIVEN** a `tail -f agents.log` stream is ticking
- **WHEN** the user commits a new command
- **THEN** the stream halts before the new command's output prints

#### R4: Pure-logic lib + unit tests
A new dependency-free `sites/astro-starlight-terminal1/src/lib/terminal-eggs.ts` MUST export `expandVars(text, env)` (replaces `$NAME`/`${NAME}` with `[A-Za-z_][A-Za-z0-9_]*` names; unknown → `''`; no `$$` escaping — documented limitation), `seqLines(args): string[] | null` (GNU `seq LAST | FIRST LAST | FIRST INCR LAST`, integers only, `null` on non-integer/wrong-arity/zero-increment, empty array for empty ranges, generation bounded by an exported `SEQ_GEN_CAP` safety cap), `classifyRm(args): 'missing'|'refuse'|'guarded-root'|'deluxe'` (recursive = `/^-[a-su-z]*r/i` or `--recursive`, ordering-free; root = literal `/` or `/*`; deluxe requires `--no-preserve-root`), and `classifyTar(args): 'survivor'|'bomb'` (survivor = first arg a flag cluster, optionally `-`-prefixed, containing `f` plus one of `c`/`x`/`t`). A new `scripts/terminal-eggs.test.mjs` (`node --test`, TS type-stripping import — terminal-suggest.test.mjs pattern) MUST pin all four contracts including flag-order variants and edge cases.

- **GIVEN** the lib module
- **WHEN** `node --test scripts/terminal-eggs.test.mjs` runs
- **THEN** all tests pass, covering `$NAME`/`${NAME}`/unknown-var, seq arity/validation/empty-range/reverse, every `classifyRm` class incl. `-fr /`, and `classifyTar` survivor/bomb edges (`xf`, `-czf`, bare, missing `f`)

#### R5: HELP_DETAIL coverage; help list byte-identical
Every new `COMMANDS` key MUST get a `helpDetail(usage, detail)` entry using the exact usage lines from the intake §0e table (details are tone-matched implementer craft). The top-level `help` list output, `CHIP_COMMANDS`, greeting, and ghost hint MUST be byte-identical to before.

- **GIVEN** the change is applied
- **WHEN** the user runs bare `help`
- **THEN** the printed list is byte-identical to the pre-change list (eggs never enumerated)
- **WHEN** the user runs `help yes`
- **THEN** the usage line `yes [text] — repeat until stopped` plus a dim detail line print

### Terminal Island: Tier A one-shots

#### R6: pwd / uname / id / date / uptime / env
Six new stateless handlers MUST print the intake §1a–§1f copy: `pwd` (path + planned-punchline), `uname` (bare `shllOS`; any args → the full `shllOS shll.ai 7.0-plan-first #1 SMP plan-first scheduler x86_64` line), `id` (uid/gid/groups line), `date` (real `new Date().toString()` + comment), `uptime` (current HH:MM:SS clock, real page age from `performance.now()` — `up N sec` under a minute else `up N min` — `1 visitor`, loads `0.07, 0.07, 0.07`), `env` (R1).

- **GIVEN** the page has been open 3 minutes
- **WHEN** the user runs `uptime`
- **THEN** one line prints with the live clock, `up 3 min, 1 visitor, load average: 0.07, 0.07, 0.07`

#### R7: Read-only refusals (rm / mkdir / touch / mv / cp / chmod / chown)
Seven file-op handlers MUST refuse with authentic GNU first-line error shapes + `shell-comment` punchlines per intake §1g–§1m. `rm` MUST dispatch via `classifyRm`: `missing` → operand error + brave invitation; `refuse` → `Read-only file system` on the first non-flag arg; `guarded-root` → the two authentic failsafe lines with NO joke line; `deluxe` → the R19 sequence. No fake filesystem anywhere (backlog constraint honored).

- **GIVEN** any classification input
- **WHEN** the user runs `rm -rf /` (or `-fr /`, `-r /`, `--recursive /`)
- **THEN** exactly two authentic lines print: `rm: it is dangerous to operate recursively on '/'` and `rm: use --no-preserve-root to override this failsafe`
- **WHEN** the user runs `chmod 777 site`
- **THEN** `chmod: changing permissions of 'site': absolutely not` + `(777? we plan our permissions here.)`

#### R8: diff / tar / make
`diff` MUST print usage + `(try: diff plan reality)` for <2 args, the authentic normal-diff thesis block for `plan reality` (either order), else the differ-in-every-line line. `tar` MUST dispatch via `classifyTar` (survivor congratulations / authentic two-line bomb + xkcd 1168 punchlines). `make` MUST print the no-makefile error bare, the converting gag for `plan` (reusing `SYNOPSIS['fab-kit']` + `ROUTE_OVERVIEW('fab-kit')` as an `html: true` anchor — zero copy duplication), the 418 teapot for `coffee`, and the only-plan-is-buildable line otherwise.

- **GIVEN** the terminal
- **WHEN** the user runs `diff plan reality`
- **THEN** `1c1` / `< everything you planned` / `---` / `> everything that happened` / `(that's why we plan.)` print
- **WHEN** the user runs `make plan`
- **THEN** the building line, the fab-kit synopsis, and a clickable `/tools/fab-kit/overview/` anchor print

#### R9: Editors, network deniers, pagers, kill, true/false
`vim`/`vi` MUST share one handler (exit-what-you-never-entered + `':q' works here` punchline); `emacs` and `nano` print their §1q one-liners. `curl`/`wget` MUST share one handler printing their own command name + the static-site denial + Constitution I punchline (no fake network). `less`/`more` MUST share one handler with byte-identical output `less is more. more or less.`. `kill` MUST print usage + pids-punchline when no pid arg, the `-9` variant punchline when args contain `-9`, else the planner punchline. `true`/`false` MUST print nothing at all (the payoff lives in `help true`/`help false`).

- **GIVEN** the terminal
- **WHEN** the user runs `true`
- **THEN** no output lines print — just the echoed command and one fresh prompt
- **WHEN** the user runs `wget shll.ai`
- **THEN** the first line starts `wget: no network from in here`

### Terminal Island: Tier B light logic

#### R10: echo env expansion
The existing `echo` handler MUST print `expandVars(ctx.raw, FAKE_ENV)`. `echo hello` is unchanged; `echo $SHELL` → `/bin/shll`; `echo I plan $PLAN` → `I plan first`; `echo $UNDEFINED` → empty line. `HELP_DETAIL.echo`'s detail line MUST gain a mention that variables like `$SHELL` expand.

- **GIVEN** FAKE_ENV
- **WHEN** the user runs `echo my shell is $SHELL`
- **THEN** `my shell is /bin/shll` prints

#### R11: seq
`seq` MUST call `seqLines`; `null` → `seq: invalid argument` + dim usage line; valid → numbers one per line (`shell-out`) capped at `SEQ_CAP = 100` with the scope-control `shell-comment` cap line when longer (an honest `+` suffix when the generation safety cap truncated the true total). Empty ranges print nothing (authentic).

- **GIVEN** the terminal
- **WHEN** the user runs `seq 3 -1 1`
- **THEN** `3`, `2`, `1` print
- **WHEN** the user runs `seq 500`
- **THEN** 100 number lines print followed by `(capped at 100 of 500 — this terminal believes in scope control.)`

#### R12: ps
`ps` MUST print the §2c table with tool rows generated from `TOOLS` (no parallel roster): header, `shll` at PID 1 (init joke), remaining tools in canonical order at PIDs 2–7 with fixed `00:00:07` times on `tty7`, and a final `pts/0` visitor row (`42 … you`) showing real elapsed session time from `performance.now()`.

- **GIVEN** the page has been open 3m14s
- **WHEN** the user runs `ps`
- **THEN** 9 lines print: the header, 7 tool rows (shll first), and `   42 pts/0    00:03:14 you`

#### R13: sha256sum
`sha256sum` MUST print missing-operand + dim usage when bare; `sha256sum: secure context required` when `crypto.subtle` is unavailable; otherwise resolve `crypto.subtle.digest('SHA-256', …ctx.raw)` async and `printBeforePrompt` the lowercase hex + `  -` (stdin-filename convention) — landing above the already-emitted live prompt by construction.

- **GIVEN** a secure context
- **WHEN** the user runs `sha256sum plan`
- **THEN** a 64-char lowercase hex line ending in `  -` prints above the live prompt

#### R14: grep (standalone site-search)
`grep` MUST print usage + dim synopses note when bare; otherwise match `ctx.raw` (multi-word patterns work) case-insensitively as a substring over the lines `{tool} — {SYNOPSIS[tool]}`, printing each match with the tool name as an overview anchor (`html: true`); no matches → dim `(no matches — try 'grep plan')`. No match highlighting; pipe mode is the 42my draft.

- **GIVEN** the seven synopses
- **WHEN** the user runs `grep plan`
- **THEN** every tool whose `{tool} — {synopsis}` line contains "plan" prints as a linked line

#### R15: man bridge
After the existing tool branch (tools keep precedence — `man shll` still prints the tool synopsis), `man` MUST answer from `HELP_DETAIL[arg]` when present (one source with `help <cmd>`, no drift), else print `No manual entry for {arg}` plus the cuur suggester tail (` — did you mean '{s}'?`) when a candidate exists — replacing the previous `unknownTool` fall-through.

- **GIVEN** `yes` is a command, not a tool
- **WHEN** the user runs `man yes`
- **THEN** the `HELP_DETAIL.yes` usage + detail lines print
- **WHEN** the user runs `man bananas`
- **THEN** `No manual entry for bananas` prints (with a did-you-mean tail only if the suggester matches)

### Terminal Island: Tier C animated

#### R16: yes
`yes [text]` MUST stream `y` (or `ctx.raw`) at `YES_TICK_MS = 150` with frame lines `ariaHidden: true`, hard-capped at `YES_CAP = 50`, ending with the announced stopped-at-50 comment. Ctrl-C mid-stream halts with no extra line (the `^C` echo is the feedback). Reduced motion: 7 hidden lines at once + the announced `(yes repeats forever. imagine it. Ctrl-C ends it.)` variant.

- **GIVEN** motion is allowed
- **WHEN** the user runs `yes` and waits
- **THEN** 50 aria-hidden `y` lines stream at 150ms, then `(yes: stopped at 50. Ctrl-C would have been faster — and more satisfying.)`

#### R17: sl animation upgrade
The `sl` art lines MUST be wrapped in an `aria-hidden` block container `.shell-art-train` with an inner `.shell-train-inner` animated by a new `@keyframes shell-train` (3s linear, `translateX(100%)` → `translateX(-105%)`, forwards) in `terminal.css`; a JS `animationend` listener removes the container (the train has left; the announced punchline remains). The train selector MUST be added to the EXISTING `@media (prefers-reduced-motion: reduce)` block with `animation: none` — art renders statically, `animationend` never fires, art stays. Motion-safety purely in CSS, no JS branch.

- **GIVEN** motion is allowed
- **WHEN** the user runs `sl`
- **THEN** the locomotive crosses right-to-left over 3s and its container is removed on animationend, leaving the punchline
- **GIVEN** `prefers-reduced-motion: reduce`
- **WHEN** the user runs `sl`
- **THEN** the art renders statically and stays

#### R18: tail
`tail` MUST print missing-file-operand + dim try-line when no file arg; the authentic cannot-open error + dim try-line for any non-`agents.log` arg; and for `agents.log` (with or without `-f`) stream the fixed `AGENT_LOG` const (8 lines, static 13:37 timestamps, last line self-identifying the site as static) at `TAIL_TICK_MS = 700` with lines ANNOUNCED (not ariaHidden — slow cadence, meaningful content), closing with the announced `shell-comment` not-a-feed line. Ctrl-C cancels early; reduced motion prints all at once.

- **GIVEN** the terminal
- **WHEN** the user runs `tail -f agents.log`
- **THEN** the 8 log lines stream at 700ms followed by `(tail: agents.log is a file, not a feed. Ctrl-C next time you can't wait.)`

#### R19: rm deluxe
`classifyRm` = `deluxe` MUST: (1) stream one announced `removing /tools/{tool}` line per `TOOLS` entry (canonical order) then `removing /home/visitor` at `RM_TICK_MS = 300`; (2) on done, wipe the transcript via `session.replaceChildren(liveLine)` where `liveLine = input.closest('[data-terminal-prompt]')` — the live prompt element preserved in place (invariant, focus, listeners survive; no `freshPrompt()`); (3) after a `RM_BEAT_MS = 900` beat held in `streamFollowup` (cancelled by `stopStream`, so Ctrl-C aborts the whole sequence), print the two resolution lines; the greeting is NOT re-printed. Reduced motion: removal lines at once, wipe SKIPPED, resolution immediate with line 2 replaced by `(transcript spared. reduced motion is mercy.)`.

- **GIVEN** motion is allowed
- **WHEN** the user runs `rm -rf / --no-preserve-root` and waits
- **THEN** 8 removal lines stream, the transcript wipes to just the live prompt, and after 900ms the just-kidding + consequences lines print
- **GIVEN** the stream or beat is pending
- **WHEN** the user presses Ctrl-C
- **THEN** the whole sequence aborts cleanly (no wipe / no resolution after the cancel point)

### Invariants & Verification

#### R20: Roster/discovery side effects and standing invariants
New keys MUST be appended AFTER all existing keys in `COMMANDS` (suggester equal-distance tie-break keeps favoring established commands; Tab/suggester pick eggs up via `Object.keys(COMMANDS)` with zero wiring; empty-fragment Tab keeps listing everything). The static transcript in `index.mdx` MUST stay byte-identical (file untouched); exactly-one-trailing-prompt and the 23xc resting anchor MUST survive; all output MUST reuse existing `.shell-*` classes (dark/light parity free); zero new dependencies.

- **GIVEN** the change is applied
- **WHEN** `git diff --stat` is inspected
- **THEN** `index.mdx` and `package.json` show no changes, and the first ~18 `COMMANDS` keys are unchanged in order

#### R21: Verification gates
All `node --test` script suites (new `terminal-eggs.test.mjs`, existing `terminal-suggest.test.mjs`, `extract-readme.test.mjs`, `parse-help.test.mjs`) MUST pass, and `npm run build` in `sites/astro-starlight-terminal1/` MUST succeed.

- **GIVEN** the applied change
- **WHEN** the suites and build run
- **THEN** zero test failures and a successful static build

### Non-Goals

- Pipes, virtual filesystem, filter commands (`wc`, `sort`, `cat`, …) — split to `260610-42my-terminal-pipes-virtual-filesystem`
- `top`/`htop` (needs in-place line rewriting), shareable transcript (backlog item 3)
- Any change to `index.mdx`, `VersionTable`, chips roster, greeting, ghost hint, telemetry

### Design Decisions

1. **Streamer on `printBeforePrompt`, not freeze/re-emit** — output above the live prompt keeps the one-trailing-prompt invariant by construction (Tab-listing precedent). *Rejected*: emitting prompts per frame (new prompt-emitting paths to keep correct forever).
2. **`printBeforePrompt` gains a no-live-prompt append fallback** (gate on `input.isContentEditable`) — reduced-motion streams run synchronously during `run()`, when the previous input is frozen but still carries a stale `data-terminal-prompt` attribute; a bare `closest()` lookup would insert output ABOVE the echoed command. With no live prompt the function appends (exactly where `print()` would land). *Rejected*: a parallel reduce-only print path in every stream handler (drift risk).
3. **`seqLines` generation safety cap (`SEQ_GEN_CAP = 10000`)** — `seq 1 1000000000` would otherwise build a billion-element array and freeze the tab; the cap bounds generation, and the display cap line appends `+` to the total when truncated (honest copy). *Rejected*: unbounded generation (page freeze), returning a `{lines, total}` object (larger contract deviation from intake §0d).
4. **Shared handlers for alias keys** (`editorHandler`, `lessHandler`, `denyNetwork`) — the `exitHandler` precedent; two keys, one body, no drift.
5. **`prefersReducedMotion()` helper extracted** — three new call sites (streamer, yes, rm-deluxe) plus the existing ghost-hint check; one query string, no duplication.

## Tasks

### Phase 1: Setup

- [x] T001 [P] Create `sites/astro-starlight-terminal1/src/lib/terminal-eggs.ts` exporting `expandVars`, `seqLines` (+ `SEQ_GEN_CAP`), `classifyRm`, `classifyTar` per intake §0d contracts, dependency-free <!-- R4 --> <!-- rework: prototype-chain lookup guard (review cycle 1) — expandVars now reads env via Object.hasOwn, so $constructor/${__proto__} expand to '' per contract -->
- [x] T002 Create `sites/astro-starlight-terminal1/scripts/terminal-eggs.test.mjs` (node --test, TS type-stripping import, terminal-suggest.test.mjs structure) pinning all four contracts incl. flag-order variants and edges <!-- R4 --> <!-- rework: prototype-chain lookup guard (review cycle 1) — added the prototype-chain pin ($constructor, ${__proto__}, $toString → ''); 22/22 pass -->

### Phase 2: Island Infrastructure (`src/components/TerminalPrompt.astro`)

- [x] T003 Add module-scope `FAKE_ENV`, `AGENT_LOG`, cadence/cap constants (`YES_TICK_MS=150`, `YES_CAP=50`, `TAIL_TICK_MS=700`, `RM_TICK_MS=300`, `RM_BEAT_MS=900`, `SEQ_CAP=100`), the `prefersReducedMotion()` helper (refactor `showIdleHint` to use it), and the terminal-eggs import <!-- R1 -->
- [x] T004 Add `Line.ariaHidden`; extract shared `makeLineEl(ln)` used by `print()` and `printBeforePrompt()`; add the no-live-prompt append fallback to `printBeforePrompt`; retrofit the `shll` splash art lines `ariaHidden: true` <!-- R2 -->
- [x] T005 Add `activeStream`/`streamFollowup` + `startStream`/`stopStream`; wire `stopStream()` into the Ctrl-C branch (beside the `pendingNav` clear) and into `commitLine` before `run()` <!-- R3 -->

### Phase 3: Commands

- [x] T006 [P] Append Tier A one-shots `pwd`/`uname`/`id`/`date`/`uptime`/`env` after the existing keys with exact intake §1a–§1f copy <!-- R6 -->
- [x] T007 [P] Append read-only refusals `rm` (classifyRm missing/refuse/guarded-root branches)/`mkdir`/`touch`/`mv`/`cp`/`chmod`/`chown` with exact §1g–§1m copy <!-- R7 -->
- [x] T008 [P] Append `diff`/`tar`/`make` (make plan reuses `SYNOPSIS['fab-kit']` + `ROUTE_OVERVIEW` anchor) <!-- R8 -->
- [x] T009 [P] Append `vim`/`vi` (shared `editorHandler`), `emacs`, `nano`, `curl`/`wget` (shared `denyNetwork`), `less`/`more` (shared `lessHandler`), `kill`, silent `true`/`false` <!-- R9 -->
- [x] T010 Modify `echo` to print `expandVars(ctx.raw, FAKE_ENV)`; extend `HELP_DETAIL.echo` detail with the expansion mention <!-- R10 -->
- [x] T011 [P] Append `seq` (seqLines; invalid → error + dim usage; `SEQ_CAP` display cap + scope-control comment with honest `+` on generation-cap truncation) <!-- R11 -->
- [x] T012 [P] Append `ps` (rows generated from `TOOLS`, shll PID 1, visitor row with real elapsed time) <!-- R12 -->
- [x] T013 [P] Append `sha256sum` (missing-operand, secure-context guard, async `crypto.subtle.digest` → `printBeforePrompt` hex + `  -`) <!-- R13 -->
- [x] T014 [P] Append `grep` (usage + dim note; case-insensitive substring over `{tool} — {synopsis}`; linked matches; dim no-match line) <!-- R14 -->
- [x] T015 Modify `man`: after the tool branch, `HELP_DETAIL[arg]` bridge; else `No manual entry for {arg}` + suggester tail (replaces `unknownTool` fall-through) <!-- R15 --> <!-- rework: prototype-chain lookup guard (review cycle 1) — the bridge (and the helpFor + run() siblings) now use Object.hasOwn, so `man constructor` / `help constructor` / bare `__proto__` hit the not-found branches instead of throwing pre-freshPrompt -->
- [x] T016 Append `yes` (stream at `YES_TICK_MS`, ariaHidden frames, `YES_CAP` + stopped comment; reduced-motion 7-line variant + forever comment) <!-- R16 -->
- [x] T017 Modify `sl` (art in `aria-hidden` `.shell-art-train` > `.shell-train-inner` container, `animationend` removal, punchline returned separately) and add `.shell-art-train`/`.shell-train-inner` rules + `@keyframes shell-train` to `src/styles/terminal.css`, plus the train selector in the EXISTING `prefers-reduced-motion` block <!-- R17 -->
- [x] T018 Append `tail` (missing/cannot-open branches with dim try-lines; `AGENT_LOG` stream at `TAIL_TICK_MS`, announced lines, closing comment) <!-- R18 -->
- [x] T019 Implement `rmDeluxe()` (announced removal stream at `RM_TICK_MS`, wipe via `session.replaceChildren(liveLine)` preserving the live prompt, `RM_BEAT_MS` followup resolution via `streamFollowup`; reduced motion: no wipe, mercy line) wired from the `rm` handler <!-- R19 -->
- [x] T020 Add `HELP_DETAIL` entries for all 33 new keys using the exact intake §0e usage lines + tone-matched dim details <!-- R5 -->

### Phase 4: Invariants & Verification

- [x] T021 Verify invariants: bare `help` output, `CHIP_COMMANDS`, greeting, ghost hint unchanged; `index.mdx`/`package.json` untouched; new keys strictly after existing keys; every `COMMANDS` key has a `HELP_DETAIL` entry <!-- R20 -->
- [x] T022 Run `node --test scripts/terminal-eggs.test.mjs scripts/terminal-suggest.test.mjs scripts/extract-readme.test.mjs scripts/parse-help.test.mjs` from `sites/astro-starlight-terminal1/` — all pass <!-- R21 -->
- [x] T023 Run `npm run build` in `sites/astro-starlight-terminal1/` — succeeds <!-- R21 -->

## Execution Order

- T001 blocks T002 (tests import the lib) and T003 (island imports the lib)
- T003–T005 block all of Phase 3 (handlers use the constants, ariaHidden, and streamer)
- T016/T018/T019 depend on T005; T010 depends on T003; T020 can run with/after the handler tasks
- T021–T023 last

## Acceptance

### Functional Completeness

- [x] A-001 R1: `FAKE_ENV` exists with the eight exact §0a pairs; `env` prints them as `KEY=value` in declaration order; `echo` expands against the same record
- [x] A-002 R2: `Line.ariaHidden` is honored by both `print()` and `printBeforePrompt()`; `shll` art lines and the `sl` train container carry `aria-hidden="true"` while their summary lines stay announced
- [x] A-003 R3: `startStream`/`stopStream` exist with the contract (one stream at a time, printBeforePrompt ticks, reduced-motion all-at-once + immediate onDone, both ids cleared); Ctrl-C and `commitLine` (before `run`) call `stopStream()`
- [x] A-004 R4: `terminal-eggs.ts` exports the four functions per contract with zero dependencies; `terminal-eggs.test.mjs` passes under `node --test` — *met (rework cycle 1): `expandVars` now reads `env` via `Object.hasOwn(env, name) ? env[name] : ''`, so prototype-chain names are unknown → `''`; pinned by a new test (`$constructor`, `${__proto__}`, `$toString`, `a${constructor}b` → `''`/`'ab'`) — 22/22 pass under `node --test scripts/terminal-eggs.test.mjs`.*
- [x] A-005 R5: every new key answers `help <key>` with the intake §0e usage line; bare `help` output and `CHIP_COMMANDS` are byte-identical to pre-change
- [x] A-006 R6: `pwd`/`uname`/`id`/`date`/`uptime`/`env` print the §1a–§1f copy (uname arg-switch, uptime real age + 0.07 loads)
- [x] A-007 R7: all seven file-ops refuse with authentic GNU error shapes + punchlines; `rm` four-way dispatch matches `classifyRm`; guarded-root prints exactly two lines with no joke
- [x] A-008 R8: `diff`/`tar`/`make` match §1n–§1p including the `plan reality` block (either order) and `make plan`'s reuse of `SYNOPSIS`/`ROUTE_OVERVIEW`
- [x] A-009 R9: `vim`/`vi`, `curl`/`wget`, `less`/`more` each share one handler; `kill` branches per spec; `true`/`false` print nothing
- [x] A-010 R10: `echo $SHELL` → `/bin/shll`, `echo $UNDEFINED` → empty line, `echo hello` unchanged; `HELP_DETAIL.echo` mentions expansion
- [x] A-011 R11: `seq` invalid → error + dim usage; valid output capped at 100 with the scope-control comment; empty range prints nothing
- [x] A-012 R12: `ps` rows are generated from `TOOLS` (no parallel roster), shll is PID 1, visitor row shows real elapsed time in the §2c column format
- [x] A-013 R13: `sha256sum` guards bare/non-secure inputs and prints the real lowercase hex + `  -` above the live prompt
- [x] A-014 R14: `grep` matches case-insensitively over `{tool} — {synopsis}` and prints linked tool names; bare/no-match branches per spec
- [x] A-015 R15: `man <tool>` unchanged; `man <command>` answers from `HELP_DETAIL`; unknown args get `No manual entry for {arg}` + suggester tail — *met (rework cycle 1): the bridge lookup is now `Object.hasOwn(HELP_DETAIL, topic) ? HELP_DETAIL[topic] : undefined` (TerminalPrompt.astro `man` handler), so `man constructor`/`man toString`/`man __proto__` fall through to `No manual entry for {arg}` and the prompt invariant holds; the identical pre-existing hazards in `helpFor` (`help constructor`) and `run()` (bare `__proto__` → `COMMANDS` lookup) got the same own-property guard. Verified by code inspection + passing build (no DOM harness exists for the island).*

### Behavioral Correctness

- [x] A-016 R16: `yes` streams at 150ms, ariaHidden frames, caps at 50 with the stopped comment; reduced-motion variant prints 7 hidden lines + the forever comment
- [x] A-017 R17: `sl` art animates via `.shell-art-train`/`@keyframes shell-train` and is removed on `animationend`; under reduced motion the art renders statically and stays (selector added to the existing gate block)
- [x] A-018 R18: `tail -f agents.log` (and `tail agents.log`) streams the exact 8-line `AGENT_LOG` at 700ms, announced, with the closing comment; wrong/missing args hit the two error branches
- [x] A-019 R19: rm-deluxe streams the 8 removal lines, wipes via `replaceChildren(liveLine)` preserving the live prompt element, prints the resolution after 900ms; Ctrl-C aborts at any stage; reduced motion skips the wipe with the mercy line *(review caveat resolved in rework cycle 1: `rmDeluxe` captures `document.activeElement === input` before the wipe and restores `input.focus()` + `caretToEnd()` after it ONLY when the input held focus — keyboard users keep their focus across the wipe while the no-autofocus principle stands for chip-tap deluxes)*

### Scenario Coverage

- [x] A-020 R3: Ctrl-C during a `yes` stream halts frames with `^C` + exactly one fresh prompt; committing a new command mid-`tail` halts the stream before the new output
- [x] A-021 R4: unit tests cover `$NAME`/`${NAME}`/unknown vars, seq arity/empty-range/reverse/zero-incr, all four rm classes incl. `-fr /` ordering, tar survivor/bomb edges

### Edge Cases & Error Handling

- [x] A-022 R7/R9/R18: flags-only invocations with no target (`rm -f`, `kill -9`, `tail -f`) fall back to their missing-operand/usage branches rather than printing a flag as a filename
- [x] A-023 R11: pathological ranges (`seq 1 1000000000`) cannot freeze the page (generation bounded by `SEQ_GEN_CAP`) and the cap comment stays honest (`+` suffix)
- [x] A-024 R13: non-secure contexts print `sha256sum: secure context required` instead of throwing

### Invariants (R20)

- [x] A-025 R20: `index.mdx` and `package.json` are byte-identical (zero new dependencies); only `TerminalPrompt.astro`, `terminal.css`, and the two new files changed
- [x] A-026 R20: new `COMMANDS` keys appear strictly after all pre-existing keys; bare `help` list, greeting, and ghost hint byte-identical
- [x] A-027 R21: all four `node --test` suites pass and `npm run build` succeeds *(rework cycle 1 re-run: terminal-eggs 22/22 — +1 prototype-chain pin — terminal-suggest 11/11, build OK; extract-readme 64/64 from the original run; parse-help 7/10 — the 3 failures are pre-existing on the clean tree and out of scope, per Notes)*

### Code Quality

- [x] A-028 Pattern consistency: new code follows the island's conventions (named constants, dense change-annotated comments referencing `o33t`, helper extraction à la `exitHandler`/`helpDetail`, `.shell-*` classes only)
- [x] A-029 No unnecessary duplication: alias keys share handlers; `FAKE_ENV`/`SYNOPSIS`/`TOOLS`/`HELP_DETAIL` are single-sourced; line-element creation shared via `makeLineEl`
- [x] A-030 No god functions: no new handler/helper exceeds ~50 lines without clear reason; no magic numbers (all cadences/caps are named constants) *(rework cycle 1: the `yes` reduced-motion `7` is now `YES_REDUCE_COUNT = 7` beside `YES_CAP`; `kill`'s duplicated refusal line and rm-deluxe's duplicated resolution line were also collapsed)*

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`
- The intake's exact CSS for the train (`translateX(100%)` → `translateX(-105%)`) is reproduced verbatim; on very wide viewports the train is partially visible at t=0 (percentages are relative to the inner element's own width). Accepted as specified.
- **Pre-existing, out-of-scope test failures**: `scripts/parse-help.test.mjs` fails 3/10 on the CLEAN tree (verified via `git stash`) — `multi-word placeholders captured whole`, `hop root: no Flags section → empty flags`, `hop root: usage is Cobra's generated block only`. These live in the help-parsing domain (hop help-dump data vs. parser expectations), untouched by this change; a fix needs help-dump-contract decisions outside this change's scope — surfaced for triage as its own follow-up. The suites this change governs (`terminal-eggs` 22/22 after the rework-cycle-1 prototype-chain pin, `terminal-suggest` 11/11) and the neighboring `extract-readme` (64/64) all pass; `pnpm build` passes. (The intake's R21/A-027 "all suites pass" is met for every suite except this pre-existing failure, which predates the change.)

## Deletion Candidates

None — this change adds new functionality without making existing code redundant. (The two consolidation opportunities it created — the inline line-element creation previously duplicated in `print()`/`printBeforePrompt()`, and the inline `matchMedia` reduced-motion check in `showIdleHint` — were already absorbed within this change by `makeLineEl` and `prefersReducedMotion()`. `unknownTool` lost its `man` call site but retains a live one in `navigateTool` (TerminalPrompt.astro:1749), so it is not orphaned.)

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Confident | `seqLines` generation bounded by an exported `SEQ_GEN_CAP = 10000`; the seq cap comment appends `+` to the total when truncated | Intake §0d implies unbounded generation, but `seq 1 1000000000` would freeze the tab — a real edge the spec didn't address; minimal contract extension keeps `string[] \| null` | S:70 R:90 A:85 D:75 |
| 2 | Confident | `printBeforePrompt` inserts before the live prompt only while one is live (`input.isContentEditable`), else appends | Frozen lines retain a stale `data-terminal-prompt` attribute (documented since by18), so synchronous reduced-motion streams would otherwise print ABOVE the echoed command; append matches `print()` placement during `run()` | S:65 R:90 A:85 D:80 |
| 3 | Confident | Flags-only invocations with no operand (`rm -f`, `kill -9`, `tail -f`) fall back to the missing-operand/usage branch | Intake branches assume a target exists; printing a flag string as a filename would break the authentic-GNU-shape rule the intake sets | S:60 R:95 A:85 D:80 |
| 4 | Confident | `seqLines` returns `null` for a zero increment | GNU seq rejects zero increments ("invalid Zero increment value"); an accepted zero would loop forever | S:70 R:95 A:90 D:85 |
| 5 | Confident | `make`/`diff` compare args lowercased (echo typed form back); `classifyTar` flag letters matched case-sensitively (`f`,`c`,`x`,`t` lowercase), cluster validated as letters-only | make/diff friendliness matches the island's lowercasing convention (`run`, `man`); tar flags are case-sensitive in GNU tar and the intake's examples are all lowercase | S:60 R:95 A:80 D:70 |
| 6 | Confident | HELP_DETAIL dim detail lines + alias-row split (vim/vi, curl/wget, less/more each get own entries, exit/:q precedent) authored at apply | Intake §0e delegates detail lines as "the implementer's craft; tone-match" | S:75 R:95 A:85 D:80 |
| 7 | Confident | `prefersReducedMotion()` helper extracted and `showIdleHint` refactored to use it | Four call sites of the same media query; code-quality duplication rule; zero behavior change | S:70 R:95 A:90 D:85 |
| 8 | Confident | `ps` column widths: PID `padStart(5)`, TTY `padEnd(9)`; visitor time renders hh:mm:ss so sessions >1h don't show a 60+ minutes field | Derived from the intake's fixed-width sample block | S:70 R:95 A:85 D:80 |
| 9 | Confident | (rework cycle 1) rm-deluxe focus restore also calls `caretToEnd()` after `input.focus()` — not focus alone | The review prescribed conditional refocus; the caret call is the judgment add: a user can type a draft mid-stream, and a bare `focus()` can land the caret at the start of that draft — `caretToEnd()` matches every other refocus site in the island | S:70 R:95 A:90 D:85 |
| 10 | Confident | (rework cycle 1) `Object.hasOwn` (ES2022) chosen as the own-property guard form at all four sites (expandVars, man bridge, helpFor, run) — no `hasOwnProperty.call` fallback | Review prescribed `Object.hasOwn`; baseline support (Chrome 93+/Firefox 92+/Safari 15.4+, Node ≥16.9) comfortably covers the island's audience and the Node 22 test toolchain; one idiom at all four sites, no drift | S:80 R:95 A:90 D:85 |

10 assumptions (0 certain, 10 confident, 0 tentative).
