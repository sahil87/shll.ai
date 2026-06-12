# Plan: Scripted demo/tour Command

**Change**: 260612-4vkd-scripted-demo-tour-command
**Intake**: `intake.md`

## Requirements

All work is in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` (the client island). Zero new dependencies (Constitution VI); fully static (Constitution I); `index.mdx` and `terminal.css` byte-identical; dark/light parity free via existing classes (Constitution V). The five `src/lib/terminal-*.ts` modules and their `node --test` suites are untouched and must stay green.

### Terminal: demo/tour roster keys

#### R1: Two COMMANDS keys, one handler, appended after `share`
`demo` and `tour` MUST be two `COMMANDS` keys sharing one handler (the `editorHandler`/`exitHandler` two-keys-one-body precedent), appended strictly after `share` — the current last key — growing `COMMANDS` 61 → 63 (the o33t/cdbr/37ng/tx5p append-after-existing convention, preserving the suggester's equal-distance tie-break). Both keys MUST have `HELP_DETAIL` entries (the cuur convention — `help demo`, `help tour`, and `man demo`/`man tour` via the o33t bridge all answer). Tab-completion, the did-you-mean suggester, and the cheatsheet coverage check pick both up via `Object.keys(COMMANDS)` with zero wiring.

- **GIVEN** the live terminal
- **WHEN** the visitor types `tour`
- **THEN** the same handler runs as for `demo` (one body, no drift)
- **AND** `help demo` and `man tour` print their HELP_DETAIL entries

### Terminal: narrated-step engine (tx5p generalization)

#### R2: Replay engine generalizes to steps; bare replay byte-identical
The tx5p replay engine (`replayQueue`/`replayTimer`/`replayTyper`, `startReplay`/`replayNext`/`stopReplay`) MUST be generalized from bare command strings to steps `{ narration?: string[]; command: string }`. `startReplay(commands: string[])` MUST keep its signature and map its inputs to narration-less steps so the `#play=` path stays behaviorally byte-identical: same `REPLAY_TYPE_MS = 70` typing, `REPLAY_GAP_MS = 700` gaps, `REPLAY_START_DELAY_MS = 600` start, same commits via `commitLine(false)`, same conditional mid-sequence focus capture/restore, same kill-listener install/remove.

- **GIVEN** a `#play=ls,fortune` load (no demo token)
- **WHEN** the replay runs
- **THEN** observable behavior is identical to pre-change (cadences, gaps, kill paths, focus semantics, recording)

#### R3: Narration lines print before each step's command, announced
Before typing a step's command, the engine MUST print the step's narration line(s) via `printBeforePrompt` with classes `shell-out shell-comment` (dim) and NO `ariaHidden` — the narration IS the story and MUST be announced to the live region (the `tail` announced-exception precedent).

- **GIVEN** a demo step with one narration line
- **WHEN** the step begins (after the inter-step gap)
- **THEN** the narration line lands above the live prompt (announced), then the command types character-by-character

#### R4: Demo cadence — named DEMO_GAP_MS, shared typing cadence
The demo's inter-step gap MUST be a new named constant `DEMO_GAP_MS = 1400` (a demo step prints narration plus a multi-line tool card the visitor must actually read); bare replays MUST keep `REPLAY_GAP_MS = 700`. The gap is carried per-sequence (engine entry point option). Typing MUST reuse `REPLAY_TYPE_MS = 70`; every step MUST commit via `commitLine(false)` (full commit semantics, no focus initiation). The start delay reuses `REPLAY_START_DELAY_MS = 600` for both entry paths; a typed `demo` prints its opening narration synchronously before the engine starts.

- **GIVEN** a running demo
- **WHEN** a step's commit completes
- **THEN** the next step begins after `DEMO_GAP_MS`, not `REPLAY_GAP_MS`

#### R5: Starting a demo replaces any in-flight machine sequence
Starting a demo MUST first call the shared stop (`stopReplay` — the `startStream`-stops-previous precedent), so a replayed `demo` (`#play=demo,…`) REPLACES the in-flight replay queue and surviving tokens after `demo` are dropped (documented in code). The engine MUST guard against re-entrant scheduling: when a machine-committed command starts its own sequence inside `commitLine`, the outer sequence's continuation MUST NOT schedule another step (epoch/sequence-counter guard) — on both the animated and the reduced-motion paths.

- **GIVEN** a `#play=demo,fortune` load
- **WHEN** the engine commits `demo` and the handler starts the tour
- **THEN** the `fortune` token is dropped, exactly one sequence owns the timers/listener, and no double-scheduling occurs

#### R6: Completion hook — closing block only on natural completion
After the last step's commit, the engine MUST print the demo's closing block via `printBeforePrompt` above the final prompt, then run the existing cleanup (`stopReplay`). An interrupted tour MUST NOT print the closing block (`stopReplay` clears the completion hook).

- **GIVEN** a tour that runs to its last step
- **WHEN** the last commit lands
- **THEN** the closing lines print above the single trailing prompt and the kill listener is removed
- **GIVEN** a tour interrupted mid-step
- **WHEN** any kill path fires
- **THEN** no closing block prints; already-printed narration stays; the partial line freezes like a hand-typed abort

#### R7: Interruption inherited — any keystroke stops the tour
The tour MUST inherit the tx5p kill wiring unchanged: the document-level capture-phase `keydown` listener (any keystroke regardless of focus, subsumes Ctrl-C), the input `onKeydown` first statements, chip taps, and paste all stop it; `commitLine` deliberately does NOT (the documented asymmetry).

- **GIVEN** an in-flight tour with `body` holding focus
- **WHEN** the visitor presses any key
- **THEN** the tour stops cleanly (queue emptied, timers cleared, listener removed)

#### R8: Reduced motion — synchronous per-step fill+commit, no kill listener
Under `prefers-reduced-motion: reduce` the engine MUST print each step's narration, fill the command at once, and commit — synchronously through all steps INCLUDING the closing block — with no per-character typing, no gaps, and no kill listener installed. When the sequence is started from inside `run()` (a typed or replayed `demo` — the live prompt does not exist yet at that point), the synchronous run MAY be deferred by exactly one microtask (`queueMicrotask`) so the in-flight `commitLine` emits the live prompt first; a microtask cannot interleave with user events, so nothing is ever observably in flight.

- **GIVEN** `prefers-reduced-motion: reduce` and a typed `demo`
- **WHEN** the command commits
- **THEN** opening line, all five narration+card steps, and the closing block are all present with no animation, and the transcript ends in exactly one live prompt

### Terminal: DEMO_SCRIPT content

#### R9: DEMO_SCRIPT — module-scope roster with opening, five steps, closing CTA
`DEMO_SCRIPT` MUST be a module-scope const beside the other rosters (`SYNOPSIS`/`FAKE_ENV`/`CHEATSHEET_GROUPS` precedent) carrying: an opening narration line that self-announces interruptibility ("any key bails out" flavor — the o33t honest-machinery ethos); five steps with commands `idea`, `fab`, `wt`, `rk`, `tu` (binary-alias keys where shorter; each prints its 37ng tool card), one dim narration line each; and a closing block of loop-summary narration plus a printed clickable anchor to `/getting-started/install/` (`html: true` trusted-static-string pattern, built from `ROUTE_INSTALL`) plus a `type 'install' ⏎` invitation. The tour MUST NEVER auto-navigate. Copy is authored in the site's voice (dry, terminal-culture, planning-themed — the o33t reversible-copy precedent); narration lines stay within the established ~74-char width discipline (the GREETING/CHEAT_LINE_WIDTH precedent).

- **GIVEN** a completed tour
- **WHEN** the closing block prints
- **THEN** it names the workflow loop and offers BOTH a clickable `/getting-started/install/` anchor and the typed `install` invitation, and `window.location` is never touched by the tour

### Terminal: tx5p composition

#### R10: demo/tour stay replayable; share self-healing documented
`demo`/`tour` MUST NOT be added to `REPLAY_DENY` (`src/lib/terminal-share.ts` is NOT modified) — `isReplayable` passes and `#play=demo` is a one-token shareable link playing the whole narrated tour. The demo's machine commits (`demo` itself plus its replayable steps) land in `sessionCommands` through `commitLine` unchanged, so a post-demo `share` link carries duplicated steps (`#play=demo,idea,…`); this MUST be accepted and documented in a code comment (self-healing: on replay, `demo` replaces the queue and the duplicated tail is dropped).

- **GIVEN** a `#play=demo` load
- **WHEN** the hash parses
- **THEN** `demo` survives the predicate and the full narrated tour plays
- **GIVEN** a session where the visitor ran `demo` then `share`
- **WHEN** the produced link replays
- **THEN** the duplicated tail after `demo` is dropped by the replacement semantics (R5)

### Terminal: roster integration

#### R11: Cheatsheet navigate entry + tour alias; help/chips/greeting/hint untouched
The cheatsheet `navigate` group MUST gain `demo`; `tour` MUST be alias-folded via `CHEATSHEET_ALIASES` (`tour: 'demo'` — the vi→vim precedent) so the runtime coverage check counts both keys covered with one entry (never `uncategorized`). Bare `help`'s curated list, `CHIP_COMMANDS`, `GREETING`, and the idle ghost hint MUST stay byte-identical (user-confirmed — no third sanctioned help change).

- **GIVEN** the new 63-key roster
- **WHEN** `cheatsheet` runs
- **THEN** `demo` appears in `navigate`, `tour` is folded, and no `uncategorized` group appears
- **AND** bare `help` output is byte-identical to pre-change

### Terminal: invariants

#### R12: Standing invariants hold; no new surface; hasOwn discipline
The exactly-one-trailing-prompt invariant and the focus preservation-not-initiation rule MUST hold (all commits via `commitLine(false)`, narration/closing via `printBeforePrompt` — both by construction). No new focusable UI, no new CSS surface (`terminal.css` untouched), no new `src/lib/` module or test file, `index.mdx` byte-identical, zero new dependencies. Any record lookup keyed by user input MUST use the `Object.hasOwn` guard (the o33t idiom) — this change adds no new user-keyed record lookups, and existing guards are not weakened.

- **GIVEN** any path through the tour (typed, replayed, interrupted, reduced-motion)
- **WHEN** it ends
- **THEN** exactly one live contenteditable prompt is the session's last line and focus was never machine-initiated

### Non-Goals

- Auto-running `install` / any machine-fired navigation at tour end — rejected (REPLAY_DENY hostility; would make `demo` non-replayable).
- A `hop` step — omitted to keep the tour tight at five steps; the closing line names the workflow, not all seven binaries.
- Narration in the `#play=` grammar or `share` serialization changes — narration lines export as ordinary `span.shell-line`s.
- New lib module or test file — the engine is DOM-bound island work with no extractable pure string logic.
- Listing `demo` in bare `help` — user-confirmed unlisted.

### Design Decisions

1. **Engine entry split — `startReplay(commands)` kept, internal `startSequence(steps, opts)` added**: `startReplay` maps tokens to narration-less steps and delegates; the demo handler calls `startSequence` with `DEMO_SCRIPT.steps`, `{ gapMs: DEMO_GAP_MS, onDone }`. — *Why*: keeps the activation call site and `#play=` behavior byte-identical while the options object follows the `startStream(lines, { intervalMs, onDone? })` precedent. — *Rejected*: changing `startReplay`'s public shape (touches the activation site for no gain).
2. **Re-entrancy guard via a sequence epoch counter**: `startSequence` increments `replayEpoch`; the typer continuation and the reduce loop compare before/after `commitLine` and yield when a committed command started its own sequence. — *Why*: a replayed `demo` calls `startSequence` synchronously inside the outer sequence's `commitLine`; without the guard the outer continuation would double-schedule against the new sequence's timers. Explicit and cheap. — *Rejected*: inferring from `replayTimer !== undefined` (implicit, fragile); deferring the demo start by `setTimeout(0)` (timing-dependent ordering, a real interleaving window).
3. **Opening line printed by the handler via `print`, not returned**: the handler prints `DEMO_SCRIPT.opening` immediately, then starts the sequence. — *Why*: returned `Line[]`s print after the handler returns — under reduced motion `startSequence` runs the whole tour synchronously inside the handler call, so a returned opening would print after the entire tour. — *Rejected*: opening as step 1's narration (delays the interruptibility announcement until after the start delay).
4. **Reduced-motion in-run start defers by one microtask**: inside `run()` the previous input is frozen and the live prompt doesn't exist yet; filling the frozen element would corrupt the just-echoed `$ demo` line. `queueMicrotask` runs after the in-flight `commitLine` completes (live prompt exists) but before any user event can be processed. — *Why*: preserves "commits via commitLine" and the one-trailing-prompt invariant with zero user-observable in-flight state. — *Rejected*: `setTimeout(0)` (user events can interleave); a parallel synthetic-echo print path (forks `commitLine`'s single-path semantics).
5. **Closing block as an `onDone` completion hook cleared by `stopReplay`**: — *Why*: the closing CTA must print only on natural completion (an aborted tour earns no pitch), and `stopReplay` is already the single cleanup path. Mirrors the streamer's `onDone`. — *Rejected*: a trailing command-less pseudo-step (makes the typer conditional); printing the closing from the handler (cannot know completion).

## Tasks

### Phase 1: Setup

- [x] T001 Add module-scope demo definitions to `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro`: `ReplayStep` type (`{ narration?: string[]; command: string }`) in the Types section; `DEMO_GAP_MS = 1400` beside the tx5p replay cadences; `DEMO_SCRIPT` const (opening Line self-announcing interruptibility, five steps idea/fab/wt/rk/tu each with one `#`-prefixed narration line, closing Line[] with loop summary + `html: true` install anchor from `ROUTE_INSTALL` + typed invitation) beside the other rosters — final copy authored in the site's voice, every line ≤ ~74 chars <!-- R9, R4 -->

### Phase 2: Core Implementation

- [x] T002 Generalize the replay engine in `TerminalPrompt.astro` (~lines 2405–2521): retype `replayQueue` to `ReplayStep[]`; add `replayGapMs`, `replayOnDone`, `replayEpoch` state; extract `startSequence(steps, { gapMs?, onDone? })` (stops the previous sequence first, increments the epoch, dismisses the hint, installs the kill listener, schedules at `REPLAY_START_DELAY_MS`); keep `startReplay(commands)` as the byte-identical narration-less mapping; `replayNext` prints narration via `printBeforePrompt` (`shell-out shell-comment`, announced) before typing, uses `replayGapMs` for gaps, guards its post-commit continuation on the epoch, and invokes the captured `replayOnDone` after `stopReplay` on natural completion; `stopReplay` clears `replayOnDone` <!-- R2, R3, R4, R5, R6, R7 -->
- [x] T003 Implement the reduced-motion path in `startSequence`: per-step narration + fill + `commitLine(false)` synchronously with the epoch guard between steps, `onDone` (closing block) gated on the epoch, no kill listener; run immediately when the input is live (activation path) and via `queueMicrotask` when started inside `run()` (`input.isContentEditable` gate — the printBeforePrompt precedent), with comments explaining both <!-- R8, R5 -->
- [x] T004 Add the shared `demoHandler` + `printDemoClosing` beside the other shared handlers in `TerminalPrompt.astro`: handler prints `DEMO_SCRIPT.opening` via `print` then calls `startSequence(DEMO_SCRIPT.steps, { gapMs: DEMO_GAP_MS, onDone: printDemoClosing })`; append `demo: demoHandler, tour: demoHandler` strictly after `share` in `COMMANDS` (61 → 63) with the convention comment; document the never-navigates ending and the post-demo share-link self-healing duplication in code comments <!-- R1, R5, R9, R10 -->

### Phase 3: Integration & Edge Cases

- [x] T005 Append `HELP_DETAIL` entries for `demo` and `tour` after `share`'s entry in `TerminalPrompt.astro` (usage + dim detail, the alias-pair phrasing of cd/open; detail self-announces "any key stops it") <!-- R1 -->
- [x] T006 Cheatsheet wiring in `TerminalPrompt.astro`: add `{ key: 'demo' }` to the `navigate` group entries and `tour: 'demo'` to `CHEATSHEET_ALIASES` <!-- R11 -->

### Phase 4: Polish

- [x] T007 Verify: run `node --test scripts/terminal-*.test.mjs` in `sites/astro-starlight-terminal1/` (all five lib suites stay green — no lib touched) and `npm run build` (island compiles; static output); audit-diff that bare `help` output, `CHIP_COMMANDS`, `GREETING`, the idle hint, `terminal.css`, `index.mdx`, and all `src/lib/` files are byte-identical <!-- R2, R10, R11, R12 -->

## Execution Order

- T001 blocks T002 (engine references `ReplayStep`/`DEMO_GAP_MS`); T002 blocks T003/T004 (both build on `startSequence`); T005/T006 are independent of each other after T004; T007 last.

## Acceptance

### Functional Completeness

- [x] A-001 R1: `demo` and `tour` are own `COMMANDS` keys sharing one handler, appended strictly after `share` (63 keys total), each with a `HELP_DETAIL` entry answering `help <cmd>` and `man <cmd>`
- [x] A-002 R9: `DEMO_SCRIPT` is a module-scope const with the opening interruptibility line, exactly five steps (`idea`, `fab`, `wt`, `rk`, `tu`) each carrying one dim narration line, and the closing loop-summary + clickable `ROUTE_INSTALL` anchor + `type 'install' ⏎` invitation
- [x] A-003 R6: the closing block prints via `printBeforePrompt` above the final prompt only on natural completion; `stopReplay` clears the hook so an interrupted tour prints no CTA

### Behavioral Correctness

- [x] A-004 R2: `startReplay(commands)` keeps its signature and maps to narration-less steps — a bare `#play=` replay is behaviorally byte-identical (REPLAY_TYPE_MS/REPLAY_GAP_MS/REPLAY_START_DELAY_MS, commitLine(false), focus capture/restore, kill listener lifecycle)
- [x] A-005 R3: narration lines print via `printBeforePrompt` with classes `shell-out shell-comment` and no `ariaHidden` (announced), before the step's command types
- [x] A-006 R4: `DEMO_GAP_MS = 1400` is a named constant used as the demo's inter-step gap; replays keep `REPLAY_GAP_MS = 700`; the demo types at `REPLAY_TYPE_MS` and commits via `commitLine(false)`
- [x] A-007 R10: `demo`/`tour` are not in `REPLAY_DENY`; `src/lib/terminal-share.ts` (and all five libs) are unmodified; the post-demo share-link duplication is documented as self-healing in a code comment

### Scenario Coverage

- [x] A-008 R5: a replayed `demo` (`#play=demo,…`) replaces the in-flight queue (surviving tokens dropped, documented); the epoch guard prevents double-scheduling on both the animated and reduced-motion paths
- [x] A-009 R7: all four kill paths (document capture-phase listener, onKeydown first statements, chip tap, paste) stop the tour; `commitLine` does not; interrupting mid-word freezes the partial line and keeps printed narration

### Edge Cases & Error Handling

- [x] A-010 R8: under `prefers-reduced-motion: reduce` the whole tour (narration, fills, commits, closing block) resolves synchronously with no kill listener; the in-run start defers by exactly one microtask so the live prompt exists, with no user-observable in-flight state
- [x] A-011 R12: every path (typed, replayed, interrupted, reduced-motion) ends with exactly one live trailing prompt; focus is preserved-not-initiated; the tour never touches `window.location` or page scroll

### Code Quality

- [x] A-012 Pattern consistency: new code follows the island's conventions — named constants (`DEMO_GAP_MS`), module-scope rosters, shared-handler precedent, comment style, append-after-existing key ordering
- [x] A-013 No unnecessary duplication: the demo reuses the replay engine, `commitLine`, `printBeforePrompt`, `print`, and existing constants — no parallel typer, no forked commit path
- [x] A-014 No magic strings/numbers: gap, copy, and routes live in named constants (`DEMO_GAP_MS`, `DEMO_SCRIPT`, `ROUTE_INSTALL`); no inline literals in the engine
- [x] A-015 Readability over cleverness: the epoch re-entrancy guard and the microtask deferral carry explanatory comments; `startSequence`/`replayNext` stay focused (no god function — `startSequence` is 39 code lines)

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`
- Pre-existing test failures (3) in `scripts/parse-help.test.mjs` (hop-doc parsing) predate this change — the working tree was clean at apply entry; the five `terminal-*.test.mjs` suites were 97/97 green at baseline and must remain so.

## Deletion Candidates

None — this change adds new functionality without making existing code redundant

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Confident | Engine split: keep `startReplay(commands)` public shape, add internal `startSequence(steps, { gapMs?, onDone? })` | Intake says "startReplay maps its inputs to narration-less steps" and "the step type (or the engine entry point) carries the gap"; the options object mirrors `startStream`'s established shape | S:80 R:85 A:85 D:75 |
| 2 | Confident | Re-entrant sequence replacement guarded by an epoch counter (`replayEpoch`) checked after each machine commit | The intake mandates replacement semantics but not the mechanism; without a guard the outer continuation double-schedules — epoch is the explicit, testable-by-reading choice | S:70 R:85 A:80 D:70 |
| 3 | Confident | Reduced-motion demo started inside `run()` defers via `queueMicrotask` (not `setTimeout 0`, not a synthetic echo path) | The live prompt does not exist inside `run()`; a microtask runs after the in-flight commit but cannot interleave with user events, preserving both "commits via commitLine" and "nothing ever in flight" | S:70 R:80 A:80 D:70 |
| 4 | Confident | Closing block modeled as an `onDone` completion hook cleared by `stopReplay`; an interrupted tour prints no CTA | Intake: "after the last step's commit, the engine prints the closing CTA lines … then runs the existing cleanup"; clearing on interrupt is the only reading consistent with the abort-like-a-process framing | S:80 R:85 A:80 D:75 |
| 5 | Confident | Both entry paths start at `REPLAY_START_DELAY_MS = 600` (typed demo: after its opening line prints synchronously) | Intake fixes 600 for `#play=demo` and for typed demo only fixes the ordering ("begins after its opening narration prints"); one uniform start keeps the engine simple | S:75 R:90 A:80 D:75 |
| 6 | Confident | Narration steps typed as `narration?: string[]` (one line per step in DEMO_SCRIPT); opening/closing live beside steps in one `DEMO_SCRIPT` const | Orchestrated intake names a single DEMO_SCRIPT const carrying opening + steps + closing; `string[]` is the stated step shape ("or equivalent") | S:80 R:90 A:85 D:80 |
| 7 | Certain | Demo copy authored at apply in the site's voice, staying close to the intake's user-seen illustrative draft; all lines ≤ ~74 chars | Intake assumption #7 user-confirmed with the draft as reference; reversible copy (o33t precedent); width per the GREETING/CHEAT_LINE_WIDTH discipline | S:90 R:90 A:85 D:85 |

7 assumptions (1 certain, 6 confident, 0 tentative).
