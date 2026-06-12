# Plan: `play <tool>` — Illustrative Per-Tool Animations

**Change**: 260612-jf9k-play-tool-animations
**Intake**: `intake.md`

## Requirements

### Homepage Terminal: the `play` command

#### R1: `play` key appended LAST in COMMANDS (63 → 64)
The island's `COMMANDS` record in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` MUST gain a `play` key appended strictly AFTER all existing keys (after `demo`/`tour` — the o33t/cdbr/37ng/tx5p/4vkd append-after-existing convention, preserving the suggester's equal-distance tie-break). Tab-completion, the did-you-mean suggester, and the cheatsheet coverage check MUST pick the key up via `Object.keys(COMMANDS)` with zero extra wiring.

- **GIVEN** the COMMANDS record with 63 keys ending `…share, demo, tour`
- **WHEN** the `play` key is added
- **THEN** it is the 64th and last key, and `Object.keys(COMMANDS)` exposes it to Tab/suggester/cheatsheet-coverage automatically

#### R2: Argument dispatch — usage line, unknownTool, known tool
The `play` handler MUST lowercase its first argument before lookup (the `navigateTool` precedent). A bare `play` MUST return the usage line `usage: play <tool>   (try: ls)` (returned `Line[]`, no stream). An argument not in `TOOLS` (checked via the existing `isTool`) MUST return the existing `unknownTool(name)` output verbatim. All seven `TOOLS` entries (including `shll`) MUST be playable.

- **GIVEN** the live prompt
- **WHEN** the user commits `play` with no argument
- **THEN** exactly the usage line prints and no stream starts
- **GIVEN** the live prompt
- **WHEN** the user commits `play zsh`
- **THEN** the `unknownTool('zsh')` lines print (`no such tool: zsh` + the dim `tools:` roster)
- **GIVEN** the live prompt
- **WHEN** the user commits `play WT`
- **THEN** the argument is lowercased and the `wt` animation runs

#### R3: Unconditional announced honesty label (CRITICAL)
Before any frame, on BOTH the animated and reduced-motion paths, the handler MUST print one dim ANNOUNCED line (`classes: 'shell-out shell-comment'`, no `ariaHidden`): `# illustration — nothing actually runs here. (Ctrl-C bails out.)` — printed immediately via `ctx.print` (the `demoHandler` precedent: under reduced motion the rest resolves synchronously inside the handler call, and a returned opening would land after it). No frame anywhere in `PLAY_SCRIPTS` may imply a live process or network: no spinners that "wait on" anything, no URLs being "fetched"; timestamps (if any) are static literals (the AGENT_LOG 13:37 precedent).

- **GIVEN** any known tool argument
- **WHEN** the handler runs (motion or reduced-motion)
- **THEN** the honesty label is the first printed line, announced to the live region

#### R4: Animation = o33t line stream at PLAY_TICK_MS, frames hidden, ≈10 s
The animated path MUST stream the tool's frames via the existing `startStream(lines, { intervalMs, onDone })` engine — one line per tick above the live prompt — at a new named constant `PLAY_TICK_MS = 350` declared beside the other o33t cadences (`YES_TICK_MS`/`TAIL_TICK_MS`/`RM_TICK_MS`). Every streamed frame MUST carry `ariaHidden: true` (rapid frames are announcement garbage — the o33t rule). Per-tool frame counts MUST tune each run to ≈10 seconds (~25–30 frames at 350 ms). Every frame line MUST respect the ~74-char width discipline (the GREETING/`CHEAT_LINE_WIDTH` precedent — longer lines clip into horizontal scroll under `white-space: pre`). Kill discipline is inherited unchanged: Ctrl-C, Ctrl-L, and any newly committed command call `stopStream()`; no document-level any-key listener (that is the replay engine's mechanism — `play` is a stream).

- **GIVEN** `play wt` committed without reduced motion
- **WHEN** the stream runs
- **THEN** frames append one per 350 ms above the live prompt, each `aria-hidden`, finishing in ≈10 s
- **GIVEN** a `play` stream in flight
- **WHEN** the user presses Ctrl-C (or Ctrl-L, or commits a new command)
- **THEN** the stream halts via the existing `stopStream` wiring and no closing block prints

#### R5: Reduced motion = handler-level static end-frame branch
The handler MUST branch on `prefersReducedMotion()` BEFORE calling `startStream` (the `yes` handler precedent) — NOT rely on `startStream`'s built-in all-lines-at-once fallback. The reduced-motion path prints (synchronously, via `printBeforePrompt`) only the tool's designated static `endFrame` lines (the settled final state, announced — the only content a reduce/SR user gets) followed by the closing funnel block. No interval, no stream.

- **GIVEN** `prefers-reduced-motion: reduce`
- **WHEN** the user commits `play run-kit`
- **THEN** the honesty label + the `run-kit` end-frame + the closing block print at once — a single settled frame, never the full frame dump

#### R6: Closing funnel block — natural completion only, NEVER navigates
Every completed `play` MUST end (via the stream's `onDone`, or directly on the reduced-motion path) with exactly: (1) ONE announced summary line (`shell-out shell-comment`) — the per-tool punchline a screen-reader user hears in place of the hidden frames; (2) the existing `toolNavLine(slug)` (the trusted-static-string `html: true` pattern — zero copy duplication); (3) one dim typed invitation `# see it for real: type 'cd <tool>' ⏎` (`shell-out shell-comment`). The closing block MUST ride natural completion only (the `onDone` hook — an interrupted `play` prints no funnel pitch; the `replayOnDone`/`printDemoClosing` precedent); on the reduced-motion path it prints unconditionally. `play` MUST NEVER call `navigateWithBeat` and MUST NEVER auto-navigate. `play` MUST NOT be added to `REPLAY_DENY` (`terminal-share.ts` untouched) — it stays replayable via `#play=` links.

- **GIVEN** a `play idea` stream that runs to its last frame
- **WHEN** `onDone` fires
- **THEN** summary + nav line + invitation print above the live prompt, and `window.location` is never touched
- **GIVEN** a `play idea` stream interrupted mid-run
- **WHEN** the stream dies
- **THEN** no summary, no nav line, no invitation print
- **GIVEN** the hash `#play=play%20wt`
- **WHEN** the page loads
- **THEN** the replay engine types and commits `play wt` (the `isReplayable` predicate passes — `play` is an own COMMANDS key not in `REPLAY_DENY`)

#### R7: `PLAY_SCRIPTS` — one module-scope const beside the rosters
Per-tool data MUST live in ONE module-scope const `PLAY_SCRIPTS` beside `SYNOPSIS`/`FAKE_ENV`/`CHEATSHEET_GROUPS`/`DEMO_SCRIPT`, keyed by the seven `TOOLS` names, each entry carrying the three contracted roles: hidden stream frames, static end-frame, announced summary (field shape MAY be refined; the three roles are the contract). The handler's lookup MUST use the `Object.hasOwn` own-property guard (the o33t idiom for every record lookup keyed by user input) behind the `isTool` check; a key absent from the record falls back to `unknownTool` (defense in depth).

- **GIVEN** the `play` handler resolving a tool name
- **WHEN** it reads `PLAY_SCRIPTS[tool]`
- **THEN** the read is `Object.hasOwn`-guarded, and a (hypothetically) missing key degrades to `unknownTool`, never a crash

#### R8: The seven animation concepts
`PLAY_SCRIPTS` MUST implement the seven concepts from the intake table, frame copy drafted in the demo-narration voice, honest, dark/light-safe via existing `.shell-*` classes only (`shell-out`, `shell-dim`, `shell-comment`, `shell-ok` — no new colors, no new CSS): **idea** — one captured idea fans out into parallel agent lines ("one idea, N agents on it"); **hop** — a `you are here ▸` marker hopping across worktrees/branches/tools, context intact ("back where you started, nothing lost"); **fab-kit** — a rough one-liner hardening into a spec: intake → assumptions scored → gate passed → plan checkboxes ("the spec exists before any code"); **wt** — fake worktrees spinning up in parallel, each agent in a clean room ("N isolated worktrees, zero stepped-on toes"); **run-kit** — scattered panes converging green into one dashboard ("all panes green, one place to watch"); **tu** — per-agent token meters ticking up, then totals ("tokens counted, budget respected"); **shll** — the seven tools booting/assembling into one toolkit line ("the meta-CLI that ties it together").

- **GIVEN** each of the seven tools
- **WHEN** its animation runs to completion
- **THEN** the frames tell that tool's intake-table story and the end-frame/summary land its punchline direction

#### R9: Tab completion — `TOOL_ARG_COMMANDS` gains `play`
`TOOL_ARG_COMMANDS` (`['cd', 'open', 'man']`) MUST gain `'play'` — `completeInput` already completes token index 1 against `TOOLS` for listed commands; this one array element is the entire wiring.

- **GIVEN** the input `play w`
- **WHEN** the user presses Tab
- **THEN** the second token completes to `wt` (single match fills; LCP/ambiguous behavior inherited)

#### R10: `HELP_DETAIL` entry appended last; `man play` bridges
`HELP_DETAIL` MUST gain a `play` entry appended LAST (mirroring the COMMANDS position), built via the `helpDetail` factory in the two-line shape (usage line + dim detail), e.g. usage `play <tool> — a ~10s illustrated short of what a tool does` and detail `honest fake: nothing really runs. ends at the tool's pages. Ctrl-C bails.` `man play` MUST answer via the existing o33t `HELP_DETAIL` bridge — no separate entry.

- **GIVEN** the new entry
- **WHEN** the user runs `help play` or `man play`
- **THEN** both print the same two-line detail from the one record

#### R11: Cheatsheet `navigate` entry; bare `help` byte-identical
`CHEATSHEET_GROUPS`' `navigate` group MUST gain `{ key: 'play', display: 'play <tool>' }` placed beside `demo` (the session-utility/funnel shelf). Bare `help`'s curated list, `CHIP_COMMANDS`, the `GREETING`, and the idle ghost hint MUST stay byte-identical — no new sanctioned help change (only two exist: cdbr footer, tx5p `share`).

- **GIVEN** the cheatsheet handler's runtime coverage check
- **WHEN** `cheatsheet` runs after the change
- **THEN** `play <tool>` renders in the `navigate` group and NO `uncategorized` group appears
- **GIVEN** bare `help`
- **WHEN** it runs after the change
- **THEN** its output is byte-identical to before

#### R12: Scope discipline — one file, no new deps, suites stay green
The change MUST touch only `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` — no new dependencies, no new `src/lib/` module, no new files, `index.mdx`/`terminal.css`/`terminal-share.ts` untouched. The existing `node --test scripts/` suites MUST keep passing and the site MUST build (Constitution I/VI hold by construction).

- **GIVEN** the completed change
- **WHEN** `git status` / `node --test scripts/` / `npm run build` run
- **THEN** exactly one source file is modified, all existing tests pass, and the build succeeds

### Non-Goals

- No in-place frame replacement / curses-style redraw — the print model is append-only line streams (intake assumption #2).
- No any-key kill listener for `play` — the standard stream-kill set only (intake assumption #4).
- No `play` line in bare `help`, no chip, no greeting/ghost-hint change.
- No unit-test lib extraction — `play` is roster data + thin wiring over the existing engine; no pure string/width logic of the cheatsheet/toolcard kind exists to extract (intake §9).

### Design Decisions

1. **Printed link funnel, never auto-navigation**: the closing block ends on `toolNavLine(slug)` + a typed `cd` invitation — *Why*: a machine-fired navigation mid-read is the exact hostility `REPLAY_DENY` exists to prevent; never navigating is what keeps `play` replayable — *Rejected*: ending on the real `cd <tool>` nav beat (forces `play` into `REPLAY_DENY`).
2. **Handler-level reduced-motion branch**: print only the static end-frame — *Why*: `startStream`'s built-in fallback dumps ALL lines at once; the backlog requires a single settled frame — *Rejected*: the built-in fallback.
3. **`ariaHidden` applied at the one stream call site** (the handler maps frames to `ariaHidden: true` when streaming) — *Why*: the hidden-frames rule is enforced at one site by construction instead of ~200 hand-repeated object fields that could drift — *Rejected*: per-line `ariaHidden: true` literals in `PLAY_SCRIPTS`.

## Tasks

### Phase 1: Setup

- [x] T001 Add the `PLAY_TICK_MS = 350` named constant at the tail of the o33t cadence block (beside `YES_TICK_MS`/`TAIL_TICK_MS`/`RM_TICK_MS`) and a `PlayScript` type (`{ frames: Line[]; endFrame: Line[]; summary: string }`) in the Types section, both `(change jf9k)`-tagged, in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` <!-- R4, R7 -->

### Phase 2: Core Implementation

- [x] T002 Author the module-scope `PLAY_SCRIPTS` const (beside `DEMO_SCRIPT`) with all seven tool scripts — ~25–30 frames each tuned to ≈10 s at 350 ms, static announced `endFrame`, one announced `summary` line — plus the named `PLAY_OPENING` honesty-label const; frame copy in the demo-narration voice, honest (no implied live process/network), every line ≤74 chars, existing `.shell-*` classes only, in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` <!-- R3, R7, R8 -->
- [x] T003 Implement the `play` handler appended LAST in `COMMANDS` (after `tour`) — lowercase + bare-arg usage line + `isTool`/`unknownTool` dispatch + `Object.hasOwn` script lookup + immediate `ctx.print` honesty label + reduced-motion end-frame branch BEFORE `startStream` + `startStream(frames…, { intervalMs: PLAY_TICK_MS, onDone })` with frames mapped `ariaHidden: true` — and the `printPlayClosing(slug, summary)` helper (summary + `toolNavLine(slug)` + typed `cd` invitation, all via `printBeforePrompt`) beside `printDemoClosing`, in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` <!-- R1, R2, R3, R4, R5, R6 -->

### Phase 3: Integration & Edge Cases

- [x] T004 Wire the surfaces: add `'play'` to `TOOL_ARG_COMMANDS`; append the `play` `HELP_DETAIL` entry LAST via the `helpDetail` factory; add `{ key: 'play', display: 'play <tool>' }` to the cheatsheet `navigate` group beside `demo`; verify bare `help` output, `CHIP_COMMANDS`, greeting, ghost hint, and `terminal-share.ts` are untouched, in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` <!-- R9, R10, R11 -->
- [x] T005 Verify frame discipline mechanically: check every `PLAY_SCRIPTS` text line ≤74 chars and per-tool frame counts land in the 25–30 band (≈10 s at `PLAY_TICK_MS`), and that no frame copy implies a live process/network <!-- R3, R4, R8 -->

### Phase 4: Polish

- [x] T006 Run the existing test suites (`node --test scripts/` from `sites/astro-starlight-terminal1/`) and the site build (`npm run build`); confirm `git status` shows only `TerminalPrompt.astro` (plus change artifacts) modified <!-- R12 -->

## Acceptance

### Functional Completeness

- [x] A-001 R1: `play` is the 64th and last `COMMANDS` key, appended after `tour`; Tab/suggester/cheatsheet-coverage pick it up via `Object.keys(COMMANDS)` with no extra wiring
- [x] A-002 R2: bare `play` prints `usage: play <tool>   (try: ls)`; `play <unknown>` prints the existing `unknownTool` lines verbatim; the argument is lowercased; all seven tools (incl. `shll`) play
- [x] A-003 R3: the honesty label `# illustration — nothing actually runs here. (Ctrl-C bails out.)` prints first, announced (`shell-out shell-comment`, no `ariaHidden`), via `ctx.print`, on both motion paths
- [x] A-004 R4: the animated path streams via `startStream` at `PLAY_TICK_MS = 350` with every frame `ariaHidden: true`; per-tool frame counts sit in the ~25–30 band (≈10 s)
- [x] A-005 R5: the reduced-motion branch sits in the handler BEFORE `startStream` and prints only the static end-frame + closing block synchronously — never the full frame dump
- [x] A-006 R6: the closing block is exactly summary line + `toolNavLine(slug)` + `# see it for real: type 'cd <tool>' ⏎`, rides `onDone` (natural completion only; unconditional under reduced motion), never navigates, and `play` is NOT in `REPLAY_DENY` (`terminal-share.ts` untouched)
- [x] A-007 R7: `PLAY_SCRIPTS` is one module-scope const beside the other rosters with the seven `TOOLS` keys; the handler lookup is `Object.hasOwn`-guarded behind `isTool` with `unknownTool` fallback
- [x] A-008 R8: all seven animations implement their intake-table concept and punchline direction in the demo-narration voice using existing `.shell-*` classes only
- [x] A-009 R9: `TOOL_ARG_COMMANDS` is `['cd', 'open', 'man', 'play']` and second-token Tab completion works for `play`
- [x] A-010 R10: the `play` `HELP_DETAIL` entry is appended last via the `helpDetail` factory in the two-line shape; `help play` and `man play` answer from the one record
- [x] A-011 R11: the cheatsheet `navigate` group carries `play <tool>` beside `demo`; running `cheatsheet` yields no `uncategorized` group

### Behavioral Correctness

- [x] A-012 R4: Ctrl-C, Ctrl-L, and a newly committed command kill an in-flight `play` stream via the existing `stopStream` wiring; an interrupted `play` prints NO closing block
- [x] A-013 R6: `#play=play%20wt` deep-links replay the animation (the `isReplayable` predicate passes); no `navigateWithBeat`/`window.location` call exists anywhere in the `play` path

### Scenario Coverage

- [x] A-014 R3: no `PLAY_SCRIPTS` frame implies a live process or network (no fetched URLs, no waiting spinners; any timestamps are static literals)
- [x] A-015 R11: bare `help` output is byte-identical to the pre-change output (no new help line)

### Edge Cases & Error Handling

- [x] A-016 R7: a `PLAY_SCRIPTS` key missing for a valid tool degrades to `unknownTool`, never a crash; prototype-chain names (`play constructor`) hit the unknown-tool path via `isTool`
- [x] A-017 R12: the exactly-one-trailing-prompt invariant holds on every `play` path (frames/closing via `printBeforePrompt`, no new prompt-emitting path)

### Code Quality

- [x] A-018 Pattern consistency: new code follows the island's conventions — named constants (no magic strings/numbers), `(change jf9k)` comment tags, comment density/voice matching demoHandler/yes/tail neighbors
- [x] A-019 No unnecessary duplication: reuses `startStream`, `prefersReducedMotion`, `printBeforePrompt`, `toolNavLine`, `unknownTool`, `isTool`, `helpDetail` — no parallel engines or rosters
- [x] A-020 No god functions: the handler stays a thin dispatch (~30 lines) with the closing block extracted to one helper; frame data lives in the const, not the handler

### Verification

- [x] A-021 R12: all existing `node --test scripts/` suites pass unmodified (182/185; the 3 `parse-help.test.mjs` failures are pre-existing on HEAD, unrelated to this change); `npm run build` succeeds (43 pages); only `TerminalPrompt.astro` is modified among source files

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`

## Deletion Candidates

- None — this change adds new functionality without making existing code redundant

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | `PLAY_TICK_MS` declared at the tail of the o33t cadence block with a `(change jf9k)` tag | Intake mandates "beside YES_TICK_MS/TAIL_TICK_MS/RM_TICK_MS" verbatim | S:95 R:95 A:95 D:90 |
| 2 | Certain | Closing invitation copy exactly `# see it for real: type 'cd <tool>' ⏎`, classes `shell-out shell-comment` | Intake §4 gives the line and class verbatim | S:95 R:90 A:90 D:90 |
| 3 | Certain | Honesty label held in a named `PLAY_OPENING` const | The no-magic-strings convention (GREETING/HINT_TEXT precedent); copy is intake-verbatim | S:90 R:95 A:95 D:90 |
| 4 | Confident | Frames stored without per-line `ariaHidden`; the handler maps `ariaHidden: true` at the single `startStream` call site | The contract is "frames stream hidden"; one enforcement site beats ~200 repeated fields that could drift — intake's field-shape-may-be-refined clause covers it | S:80 R:90 A:85 D:75 |
| 5 | Confident | `play` handler inline in `COMMANDS` (single key, the `share()` shape) with one extracted `printPlayClosing(slug, summary)` helper beside `printDemoClosing` | One key needs no shared factory; the closing block is the only multi-call-site logic (onDone + reduce paths) | S:80 R:90 A:90 D:80 |
| 6 | Confident | Specific frame copy details (fake idea text, worktree names, token figures, pane labels) authored at apply in the demo-narration voice | Intake delegates frame copy to apply explicitly (assumption #10); reversible content, PR-reviewable | S:85 R:90 A:75 D:65 |
| 7 | Confident | Extra arguments after the tool name are ignored (`play wt foo` plays `wt`) | The navigateTool/toolCardHandler arg-handling precedent — first arg wins, extras harmless | S:70 R:95 A:85 D:80 |
| 8 | Certain | Reduced-motion end-frame + closing print via `printBeforePrompt` (append-fallback inside `run()`), sharing one closing helper with the onDone path | Intake §3 names `printBeforePrompt` for the reduce path; the o33t no-live-prompt fallback makes one helper correct on both paths by construction | S:90 R:90 A:90 D:85 |

8 assumptions (4 certain, 4 confident, 0 tentative).
