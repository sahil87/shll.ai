# Plan: Shareable + Replayable Terminal Session

**Change**: 260612-tx5p-share-replay-terminal
**Intake**: `intake.md`

## Requirements

### Share Command: Transcript Serialization

#### R1: `share` serializes the visible transcript
The `share` command MUST serialize the session's `span.shell-line` elements in DOM order, taking each line's `textContent` with per-line trailing-whitespace trim. The live prompt line MUST serialize as a bare `$` (the exactly-one-trailing-prompt invariant carries into the export); the contenteditable's draft text and the aria-hidden ghost-hint span MUST never be exported. Visually-present `aria-hidden` art lines (e.g. the `shll` splash rows) MUST be included — the export mirrors what the eye sees, not what the live region announces. The DOM walk stays island-side; the pure lib (`serializeTranscript`) takes plain strings and appends the bare-`$` live-prompt line itself.

- **GIVEN** a session where the visitor ran `ls` and `shll`
- **WHEN** they run `share`
- **THEN** the copied block contains the boot transcript, `$ ls`, the ls output, `$ shll`, the splash art rows, `$ share`, and ends its body with a bare `$` line
- **AND** no line carries trailing whitespace and no draft/ghost text appears

#### R2: Self-advertising frame
The serialized block MUST be framed: one dim-comment-style header line prepended (copy authored at apply in the site's voice), the footer `# replayed from https://shll.ai` appended (backlog-literal), and — when this page view has recorded at least one replayable command (R12) — a second footer line `# replay it: {link}` carrying the matching `#play=` deep link. With zero recorded commands the link footer MUST be omitted.

- **GIVEN** a page view where `ls` and `fortune` were committed
- **WHEN** `share` runs
- **THEN** the block is `{header}\n{body…}\n$\n# replayed from https://shll.ai\n# replay it: {origin}{pathname}#play=ls,fortune`
- **GIVEN** a page view with zero replayable commits
- **WHEN** `share` runs
- **THEN** the block ends at `# replayed from https://shll.ai` (no link footer) and the transcript still copies

#### R3: Clipboard with guarded fallback and honest failure
`share` MUST copy via `navigator.clipboard.writeText`, falling back to a guarded hidden-textarea `document.execCommand('copy')` when the async API is absent or rejects; when both fail it MUST print an honest failure line offering the block in-terminal — never a silent no-op, never a throw. The async confirmation MUST land via `printBeforePrompt` above the already-emitted fresh prompt (the `sha256sum` placement precedent): one confirmation `shell-out` line plus the `#play=` link as a **plain-text** line — deliberately NOT an `html: true` anchor (the href would embed user-derived content; the trusted-static-string pattern does not extend to user-derived hrefs). The printed link MUST use `location.origin + location.pathname` (works on previews/dev). The fallback textarea MUST NOT steal focus or scroll: `position: fixed`, and focus restored to the input only when the input held it beforehand (the rm-deluxe conditional-restore precedent). With zero recorded commands the printed link line is omitted.

- **GIVEN** a secure context with `navigator.clipboard`
- **WHEN** `share` runs from Enter or a chip tap
- **THEN** the block lands on the clipboard and a confirmation line + plain-text `replay link: …` line print above the fresh prompt
- **GIVEN** both clipboard mechanisms fail
- **WHEN** `share` runs
- **THEN** a failure line prints followed by the block's lines in-terminal, and nothing throws

### Deep-Link Replay: Hash Parsing

#### R4: `#play=` hash grammar
At activation (after the greeting prints), the island MUST parse the **raw** URL fragment — `new URL(location.href).hash`, NOT `location.hash` (some engines, longstanding Firefox behavior, return `location.hash` percent-decoded, which would break the split-before-decode contract below: an encoded `%2C`/`%3B` inside an arg would arrive as a raw separator and tokens would be double-decoded) — for the grammar `#play=` followed by comma- **or** semicolon-separated command tokens. Tokens MUST be split on raw separators FIRST, then `decodeURIComponent`-decoded per token (an encoded `%2C` inside an arg survives; a malformed %-sequence drops that token only — guarded try/catch). Tokens are trimmed; empties dropped. No hash, malformed hash, or zero surviving tokens → no replay, byte-for-byte today's load behavior. The hash MUST be left in place (no `replaceState`) — a reload replays again.

- **GIVEN** a URL ending `#play=ls;version,fortune`
- **WHEN** the island activates
- **THEN** `ls`, `version`, `fortune` replay in order
- **GIVEN** a URL ending `#play=ls,%E0%A4%A`
- **WHEN** the island activates
- **THEN** only `ls` replays (the malformed token is dropped, not the sequence)

#### R5: Replayable validation — ignore unknown safely
A token is replayable only when its first word (lowercased, matching `run()`'s dispatch case-folding) passes `Object.hasOwn(COMMANDS, word)` — the o33t own-property-guard idiom is MANDATORY (the hash is user-controlled input keying a record lookup) — AND is not in the shared `REPLAY_DENY` list `['cd', 'open', 'install', 'share']` (user-confirmed: a URL-controlled sequence must not navigate the visitor away mid-replay; a gesture-less replayed `share` would only hit the permission wall). Non-replayable tokens MUST be skipped silently — no error lines. Everything else (`clear`, `theme`, eggs, animated streams) replays faithfully.

- **GIVEN** `#play=constructor,__proto__,ls`
- **WHEN** the hash is parsed
- **THEN** only `ls` survives (prototype-chain names miss via `Object.hasOwn`)
- **GIVEN** `#play=cd%20idea,open%20wt,install,share,fortune`
- **WHEN** the hash is parsed
- **THEN** only `fortune` survives, with no error output for the denied tokens

#### R6: Replay cap
At most `REPLAY_CAP = 10` commands replay per link (named lib constant); excess surviving tokens are dropped at parse. `buildPlayHash` MUST apply the same cap (first `REPLAY_CAP` in commit order) so build→parse round-trips.

- **GIVEN** a hash with 12 valid tokens
- **WHEN** parsed
- **THEN** exactly the first 10 replay

### Replay Engine

#### R7: Auto-type + commit cadence
For each command in sequence the engine MUST type it character-by-character into the live input's `textContent` at `REPLAY_TYPE_MS = 70` (the `HINT_TYPE_MS` cadence), commit via `commitLine(false)`, then wait `REPLAY_GAP_MS = 700` before the next. Replay starts `REPLAY_START_DELAY_MS = 600` after activation. All three MUST be named constants per the `HINT_*`/`NAV_BEAT_MS` convention.

- **GIVEN** `#play=ls,fortune`
- **WHEN** replay runs
- **THEN** `ls` types at 70 ms/char starting ~600 ms after activation, commits, and `fortune` begins ~700 ms later

#### R8: No focus steal, no scroll steal
Replay MUST never call `focus()`/`scrollIntoView` to *initiate* focus; `commitLine(false)` (the by18 chip path: full commit semantics — history push, stream kill, `exitResting`, fresh prompt — with no focus) is the entire commit path. The session's internal bottom-pinning after each commit is normal post-interaction behavior; page scroll is untouched (the 23xc no-autofocus decision stands). **Focus preservation (not initiation)**: if the user clicks/Tabs into the input *mid-replay*, the next replay commit's `freezeInput()` strips `contenteditable` from the focused element (focus would silently fall to `body`) — the engine MUST capture `document.activeElement === input` before its commit and restore focus to the fresh prompt after it ONLY in that case (the rm-deluxe conditional-restore precedent — preserving user-established focus is not focus-stealing).

- **GIVEN** a page opened via a `#play=` link with focus elsewhere
- **WHEN** the replay runs to completion
- **THEN** `document.activeElement` never becomes the terminal input and the page scroll position is not programmatically changed

#### R9: Reduced motion
Under `prefers-reduced-motion: reduce` (via the existing `prefersReducedMotion()`), each command's text MUST be filled at once and committed with no per-char typing and no inter-command gap — the whole replay resolves instantly (the streams a replayed command starts already print all-at-once under reduce).

- **GIVEN** `prefers-reduced-motion: reduce` and `#play=ls,yes`
- **WHEN** the island activates
- **THEN** both commands are committed synchronously, `yes` printing its reduced all-at-once form

#### R10: Interruptible like a paste-bomb
A `stopReplay()` kill switch (clearing the active typing interval, pending start/gap timers, and the remaining queue) MUST be reachable from ANY keystroke **regardless of focus**: because replay never focuses the input (R8), the input-scoped `onKeydown` alone is unreachable in the canonical `#play=` scenario (`document.activeElement` is `body`). `startReplay()` MUST install a **document-level `keydown` listener** that calls `stopReplay()`, and `stopReplay()` MUST remove it (zero cost when idle — the listener exists only while a replay is in flight). The input-scoped `onKeydown` FIRST-statement wiring (the `dismissIdleHint` placement precedent), the chip-tap handler, and the input's `paste` handler (a mouse-driven context-menu paste is an interaction too) MUST also stop replay. `commitLine` MUST NOT call `stopReplay` (replay commits through it — the deliberate asymmetry, documented in-code per the `pendingNav` contrast precedent). Interrupting mid-word freezes whatever was typed; the next user action deals with the partial line exactly as if hand-typed.

- **GIVEN** a page opened via `#play=ls,yes,fortune` with focus on `body` (nothing focused the terminal)
- **WHEN** the user presses any key — including Ctrl-C — mid-replay
- **THEN** typing stops, pending timers clear, the queue empties, the document-level listener is removed, and the partial text stays in the live input
- **GIVEN** a replay typing its second command
- **WHEN** the user taps a chip or pastes into the input
- **THEN** the replay stops identically
- **GIVEN** a replay committing its own line
- **WHEN** `commitLine(false)` runs from the engine
- **THEN** the replay continues to the next queued command

#### R11: Idle-hint and stream interplay
A starting replay MUST dismiss/suppress the idle ghost hint (machine interaction is still interaction; one-shot latch semantics unchanged). A replayed command that starts a stream runs it for the gap window; the next replayed command's `commitLine` kills it — exactly the existing commit-kills-stream contract, no special-casing.

- **GIVEN** a fresh page with `#play=yes,ls`
- **WHEN** the replay starts
- **THEN** the ghost hint never appears this page view, `yes` streams during the gap, and `ls`'s commit kills the stream

### Recording: What the Link Contains

#### R12: Page-view-scoped `sessionCommands`
A new `initTerminal`-scope `sessionCommands: string[]` MUST record, on each `commitLine`, the committed raw line iff it passes the SAME replayable predicate used by hash parsing (one predicate, two call sites — recording and parsing can never drift). It is deliberately NOT `history[]` (sessionStorage-persisted across page views) and MUST NOT be persisted anywhere. The link is built as `#play=` + `encodeURIComponent(cmd)` joined by `,`, capped at the FIRST `REPLAY_CAP` commands in commit order (the transcript reads top-down; the replay does too).

- **GIVEN** a visitor who ran `ls`, `cd idea` (cancelled), `fortune`, `share`
- **WHEN** the link is built
- **THEN** it is `#play=ls,fortune` (`cd` and `share` are deny-listed; the predicate filtered them at record time)

### Roster & Help Integration

#### R13: Roster conventions
`share` MUST be appended as the LAST key in BOTH `COMMANDS` and `HELP_DETAIL` (the o33t/cdbr/37ng append-after-existing convention — the suggester tie-break keeps favoring established keys; Tab-completion and the did-you-mean suggester pick it up via `Object.keys(COMMANDS)` with zero wiring). `HELP_DETAIL.share` MUST exist (usage `share — copy this session as text + a replay link`, detail in the site's voice). `share` MUST join bare `help`'s curated list (user-confirmed sanctioned exception — the second ever, after cdbr's footer splice; the eggs-stay-unlisted stance untouched). The cheatsheet `navigate` group MUST gain `share` (the runtime coverage check would otherwise flag it `uncategorized`). `CHIP_COMMANDS`, the greeting, and the ghost hint MUST stay unchanged.

- **GIVEN** the updated island
- **WHEN** `help`, `help share`, `man share`, and `cheatsheet` run
- **THEN** `help` lists `share` in the curated list, `help share`/`man share` answer from `HELP_DETAIL`, and the cheatsheet shows `share` under `navigate` with no `uncategorized` group

### Pure Lib & Tests

#### R14: Dependency-free `terminal-share.ts`
A new dependency-free `src/lib/terminal-share.ts` (Vite bundles it into the island; the suggest/eggs/cheatsheet/toolcard precedent, a fifth time) MUST export the pure halves: `parsePlayHash(hash, isReplayable)`, `buildPlayHash(commands)` (round-trips with `parsePlayHash`; `''` for an empty list), `serializeTranscript(lineTexts, opts)` (trailing trim, bare-`$` prompt line, header/footer assembly, optional link footer), `firstWord`, the `isReplayable(command, commands)` predicate (with the `Object.hasOwn` guard inside the tested lib), `REPLAY_DENY`, `REPLAY_CAP`, and the header/footer copy constants. The island keeps only the DOM walk, clipboard, and `Line[]` assembly.

- **GIVEN** the lib module
- **WHEN** imported under plain `node` (no DOM, no deps)
- **THEN** every export is usable and `parsePlayHash(buildPlayHash(cmds), p)` returns `cmds` (first 10) for replayable inputs

#### R15: `node --test` suite
A new `scripts/terminal-share.test.mjs` (`node --test`, native TS type-stripping import — the four established sibling suites' pattern) MUST pin: mixed separators, encoded spaces/commas, unknown-command and denied-command skipping, the prototype-chain pin (`#play=constructor` → skipped), malformed %-sequence tolerance, the cap, empty/no-hash, build→parse round-trip, and the serializer contract (trailing trim, bare-`$` prompt line, header/footer/link-footer presence and absence).

- **GIVEN** the suite
- **WHEN** `node --test scripts/terminal-share.test.mjs` runs from the site directory
- **THEN** all tests pass; the four sibling suites also still pass

### Invariants Preserved

#### R16: Boundary, dependency, and invariant preservation
`src/content/docs/index.mdx` MUST stay byte-identical (the progressive-enhancement boundary); `terminal.css` is expected untouched; zero new dependencies (Constitution VI); no network calls, output fully static (Constitution I); the exactly-one-trailing-prompt invariant holds on every new path (replay commits via `commitLine`; the serializer renders the live line as `$`; `share` prints via `print`/`printBeforePrompt` only); every record lookup keyed by user/hash input uses `Object.hasOwn`; dark/light parity unaffected (no new styled surface); no new focusable UI.

- **GIVEN** the completed change
- **WHEN** `git status`/`git diff` is inspected and the site builds
- **THEN** only `TerminalPrompt.astro`, the new lib, and the new test file changed, and the build succeeds

### Non-Goals

- No paste-service/share-target/Web Share API integration — clipboard + URL is the whole mechanism.
- No replay of `cd`/`open`/`install` navigation; no `#play=` autostart UI chrome (progress bar, skip button) — the terminal itself is the UI.
- No narration layer (that is `[4vkd]`'s `demo` command).
- No change to the static transcript, chips, greeting, or ghost hint.
- No `transcript` alias — one name, one discovery surface.

### Design Decisions

1. **Bare-`$` appended by the lib, not passed by the island**: `serializeTranscript` appends the live-prompt `$` line itself; the island's walk excludes any live prompt line (defensively gated on `input.isContentEditable`, mirroring `printBeforePrompt`) — *Why*: puts the bare-`$` rule inside the tested pure module; when `share` runs inside `run()` the previous line is already frozen and no live prompt exists, so positionally the append is always correct — *Rejected*: island substitutes `'$'` in the array (the rule would live untested in the island).
2. **`isReplayable` takes the `COMMANDS` record and applies `Object.hasOwn` inside the lib** — *Why*: the intake mandates the hasOwn idiom verbatim for hash-derived lookups, and placing it in the lib lets the test suite pin the prototype-chain guard directly — *Rejected*: the cdbr `commandKeys: string[]` decoupling (own-property-safe too, but the guard itself would be untestable in the lib).
3. **`stopReplay()` called unconditionally at the top of `onKeydown`/chip handler (no active-flag gate)** — *Why*: idempotent, cheap, simplest wiring; matches the `dismissIdleHint` one-shot-latch placement — *Rejected*: a `replayActive` flag (state to keep correct for no behavioral gain).
4. **Recording pushes every predicate-passing commit; `buildPlayHash` caps** — *Why*: one cap site, in the tested lib; "first N in commit order" falls out of `slice(0, REPLAY_CAP)` — *Rejected*: capping at record time (a second cap site to drift).

## Tasks

### Phase 1: Pure lib + tests

- [x] T001 Create `sites/astro-starlight-terminal1/src/lib/terminal-share.ts` with `REPLAY_CAP = 10`, `REPLAY_DENY = ['cd','open','install','share']`, `firstWord` (lowercased first token), and `isReplayable(command, commands)` using `Object.hasOwn` <!-- R5 R6 R14 -->
- [x] T002 Add `parsePlayHash(hash, isReplayable)` to the lib: `#play=` prefix check, split on raw `[,;]` FIRST, per-token `decodeURIComponent` in try/catch (malformed token dropped alone), trim, drop empties, predicate filter, cap surviving tokens at `REPLAY_CAP` <!-- R4 R5 R6 -->
- [x] T003 Add `buildPlayHash(commands)` to the lib: `''` on empty, else `#play=` + first-`REPLAY_CAP` `encodeURIComponent`-encoded commands joined by `,` (round-trips with `parsePlayHash`) <!-- R6 R12 R14 -->
- [x] T004 Add `serializeTranscript(lineTexts, opts)` + `SHARE_HEADER`/`SHARE_FOOTER` constants to the lib: per-line trailing trim, header first, bare-`$` live-prompt line appended after the body, literal footer, optional `# replay it: {link}` footer <!-- R1 R2 R14 -->
- [x] T005 Create `sites/astro-starlight-terminal1/scripts/terminal-share.test.mjs` (`node --test`, native TS import) pinning: mixed separators, split-before-decode (`%2C` survives), encoded spaces, malformed %-sequence tolerance, unknown/denied skipping, the prototype-chain pin, the surviving-token cap, empty/no-hash, build encoding + cap + empty, build→parse round-trip, `firstWord`/`isReplayable` contracts, and the full serializer contract (trim, bare-`$`, header/footer/link-footer presence and absence) <!-- R15 -->

### Phase 2: Island — share command

- [x] T006 In `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro`: add the lib import and the named constants `REPLAY_TYPE_MS = 70`, `REPLAY_GAP_MS = 700`, `REPLAY_START_DELAY_MS = 600` (module scope, beside the existing cadence constants) <!-- R7 R14 -->
- [x] T007 Add `initTerminal`-scope `sessionCommands: string[]` and the recording line in `commitLine` (after the history push, before `stopStream`): push `raw` iff `isReplayable(raw, COMMANDS)` <!-- R12 -->
- [x] T008 Add the share helpers in the island: `collectTranscriptLines()` (DOM-order `span.shell-line` walk, live-prompt exclusion gated on `input.isContentEditable`), `copyShareText()` (`navigator.clipboard.writeText` → guarded `execCommand` textarea fallback whose focus capture/restore is GENERIC — capture `document.activeElement` before `ta.select()` and restore that element, not only the terminal input, so a chip-path share never strands focus on `body`; never throws), and the `share` handler appended LAST in `COMMANDS`: serialize, build the `location.origin + location.pathname` link, copy, async confirmation + plain-text link line via `printBeforePrompt`, in-terminal block on total failure, link omitted when zero recorded <!-- R1 R2 R3 R13 --> <!-- rework: execCommand fallback restored focus only to the terminal input — generic activeElement capture/restore needed (review cycle 1, outward nice-to-have 3 folded in) -->
- [x] T009 Roster integration in `TerminalPrompt.astro`: `HELP_DETAIL.share` appended last; the `share` line added to bare `help`'s curated list (sanctioned exception, comment-annotated); `{ key: 'share' }` added to the cheatsheet `navigate` group; `CHIP_COMMANDS`/greeting/hint untouched <!-- R13 -->

### Phase 3: Island — replay engine

- [x] T010 Add the replay engine to `TerminalPrompt.astro` (`initTerminal` scope, beside the streamer): `replayQueue`/`replayTimer`/`replayTyper` state, `startReplay()` (dismisses the idle hint; installs the document-level `keydown` kill listener per R10; reduced-motion synchronous fill+commit path; else start-delay timer), `replayNext()` (per-char typing at `REPLAY_TYPE_MS`, then the R8 conditional focus capture/restore around `commitLine(false)` — restore ONLY if the user had focused the input mid-replay, `REPLAY_GAP_MS` gap), `stopReplay()` (clears interval + timers + queue, removes the document-level listener), with the commitLine-asymmetry documented in-code <!-- R7 R8 R9 R10 R11 --> <!-- rework: engine must install/remove the document-level kill listener (must-fix, review cycle 1) and conditionally restore mid-replay user focus across freezeInput (should-fix 2) -->
- [x] T011 Wire the kill switch: `stopReplay()` as a first statement of `onKeydown` (after `dismissIdleHint()`), in `onChipClick`, AND in the input's `paste` handler; verify the document-level listener (installed by `startReplay`, removed by `stopReplay`) catches keystrokes when `document.activeElement` is `body` <!-- R10 --> <!-- rework: input-scoped onKeydown alone was unreachable on a #play= load — no keystroke could stop the replay (must-fix, review cycle 1); onPaste added (nice-to-have 1 folded in) -->
- [x] T012 Activation: after `armIdleHint()`, parse the RAW fragment via `parsePlayHash(new URL(location.href).hash, (cmd) => isReplayable(cmd, COMMANDS))` — NOT `location.hash`, which some engines return percent-decoded — and `startReplay` the result; hash left in place (no `replaceState`) <!-- R4 R5 --> <!-- rework: location.hash pre-decoding broke the split-before-decode contract on Firefox-like engines (should-fix 1, review cycle 1) -->

### Phase 4: Verification

- [x] T013 Run the full suite roster from `sites/astro-starlight-terminal1/`: `node --test scripts/*.test.mjs` — the new suite plus the four sibling terminal suites (and the other script suites) all green <!-- R15 R16 --> <!-- rework: re-verify after cycle-1 fixes -->
- [x] T014 Run `npm run build` in `sites/astro-starlight-terminal1/` and confirm via `git status` that only `TerminalPrompt.astro`, `terminal-share.ts`, and `terminal-share.test.mjs` changed (`index.mdx` and `terminal.css` untouched) <!-- R16 --> <!-- rework: re-verify after cycle-1 fixes -->

## Acceptance

### Functional Completeness

- [x] A-001 R1: `share` copies a transcript whose body is the DOM-order `span.shell-line` texts, trailing-trimmed, ending with a bare `$` line; draft/ghost text never exported; aria-hidden art included
- [x] A-002 R2: The block carries the header line, the literal `# replayed from https://shll.ai` footer, and a `# replay it: {link}` footer iff ≥1 replayable command was recorded
- [x] A-003 R3: Clipboard path is `writeText` → guarded `execCommand` fallback → honest in-terminal failure; confirmation + plain-text link line land via `printBeforePrompt`; the printed link uses `location.origin + location.pathname`
- [x] A-004 R4: `#play=` parsing splits on raw `,`/`;` first, decodes per token with per-token malformed tolerance, trims, drops empties; no/malformed/empty hash → byte-for-byte normal load; hash never stripped
- [x] A-005 R5: Replayability = lowercased first word passes `Object.hasOwn(COMMANDS, word)` and is not in `REPLAY_DENY` (`cd`,`open`,`install`,`share`); non-replayable tokens skipped silently
- [x] A-006 R6: `REPLAY_CAP = 10` enforced at parse (surviving tokens) and at build (first N in commit order)
- [x] A-007 R7: Replay types at `REPLAY_TYPE_MS = 70`, gaps at `REPLAY_GAP_MS = 700`, starts after `REPLAY_START_DELAY_MS = 600` — all named constants
- [x] A-008 R12: `sessionCommands` records predicate-passing commits at `initTerminal` scope, page-view-only, never persisted; the same predicate serves recording and parsing
- [x] A-009 R13: `share` is the last key in both `COMMANDS` and `HELP_DETAIL`; `help share`/`man share` answer; bare `help` lists `share` (sanctioned); cheatsheet `navigate` covers it (no `uncategorized`); chips/greeting/hint unchanged
- [x] A-010 R14: `terminal-share.ts` is dependency-free, exports the documented surface, and the island keeps only DOM walk + clipboard + `Line[]` assembly

### Behavioral Correctness

- [x] A-011 R8: Replay never *initiates* focus (`focus()`/`scrollIntoView`); commits exclusively via `commitLine(false)`; the no-autofocus (23xc) decision holds; mid-replay user-established focus survives a replay commit via the conditional capture/restore
- [x] A-012 R9: Under reduced motion the replay fills+commits each command synchronously with no typing animation and no gaps
- [x] A-013 R10: Any keystroke — **regardless of focus** (document-level listener while replay is in flight, removed when idle) — chip tap, or paste stops an in-flight replay (interval, timers, queue); `commitLine` does NOT call `stopReplay` (asymmetry documented in-code); mid-word interrupt leaves the partial line
- [x] A-014 R11: Replay start dismisses the idle hint (latch semantics unchanged); replayed streams are killed by the next replayed commit via the existing contract

### Scenario Coverage

- [x] A-015 R15: `scripts/terminal-share.test.mjs` passes under `node --test` and covers every enumerated case (separators, encoding, deny/unknown skipping, prototype pin, malformed tolerance, cap, empty/no-hash, round-trip, serializer contract)
- [x] A-016 R15: The four sibling terminal suites (suggest/eggs/cheatsheet/toolcard) still pass unchanged

### Edge Cases & Error Handling

- [x] A-017 R2: Zero recorded commands → `share` still copies header+body+footer; link line and link footer omitted
- [x] A-018 R3: Total clipboard failure prints the failure line + the block in-terminal — no silent no-op, no throw
- [x] A-019 R5: `#play=constructor` / `#play=__proto__` replay nothing (own-property guard)

### Security

- [x] A-020 R5: Every record lookup keyed by hash/user input goes through `Object.hasOwn`; the printed replay link is plain text, never an `html: true` anchor with a user-derived href

### Code Quality

- [x] A-021 Pattern consistency: new code follows the island's section-comment style, the lib/test sibling-suite pattern, and the named-constant convention (no magic numbers/strings)
- [x] A-022 No unnecessary duplication: reuses `commitLine`, `printBeforePrompt`, `prefersReducedMotion`, `dismissIdleHint`, the existing stream contract; one replayable predicate at both call sites
- [x] A-023 No god functions: the share handler and replay engine stay decomposed (walk/copy/serialize and start/next/stop split out)

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`

## Deletion Candidates

None — this change adds new functionality without making existing code redundant

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Confident | The cap applies to SURVIVING (validated) tokens at parse, not raw tokens — "at most 10 commands per link" and the build→parse round-trip both read on surviving commands | Intake says "excess tokens are dropped at parse" without pinning which set; surviving-token cap is the only reading that round-trips with `buildPlayHash`'s first-10 | S:60 R:90 A:75 D:65 |
| 2 | Confident | `serializeTranscript` appends the bare-`$` live-prompt line itself; the island walk excludes any live prompt line (gated on `input.isContentEditable`) | Puts the intake-pinned bare-`$` rule inside the tested lib; during `run()` no live prompt exists, so the append is positionally always correct | S:65 R:85 A:80 D:70 |
| 3 | Confident | Header/footer copy lives in the lib as exported constants; header authored as `# captured from the shll.ai terminal — yes, the homepage is a real shell.`; confirmation/failure copy authored in the same pass | Intake defers exact copy to apply time (the o33t reversible-copy precedent); constants in the lib make the frame testable | S:55 R:95 A:75 D:60 |
| 4 | Confident | The `# replay it:` footer carries the same `location.origin + location.pathname`-built link as the printed line; only the `# replayed from https://shll.ai` line stays literal brand copy | Intake contrasts "the printed link" with "the footer copy … the literal https://shll.ai brand line" — the brand line is the `replayed from` footer; a literal-domain replay link would be broken on previews/dev | S:60 R:90 A:70 D:65 |
| 5 | Confident | `firstWord` lowercases its token, matching `run()`'s dispatch case-folding, so `LS` records/replays consistently; the token itself stays verbatim | Replay types the verbatim token and `run()` lowercases at dispatch — the predicate must agree with dispatch or `LS` would record-miss while replaying fine | S:70 R:90 A:85 D:80 |
| 6 | Confident | Reduced-motion replay runs fully synchronously at activation — no `REPLAY_START_DELAY_MS` either | Intake: "the whole replay resolves instantly"; the start delay exists to let animation-relevant settling happen, which reduce skips by definition | S:70 R:90 A:80 D:75 |
| 7 | Confident | The `execCommand` fallback uses a `position: fixed` readonly textarea and restores focus to the input only when it held focus beforehand | The textarea `select()` steals focus; the rm-deluxe conditional-restore precedent is the codified no-autofocus-compatible recovery | S:50 R:90 A:85 D:75 |
| 8 | Confident | `isReplayable` lives in the lib taking the `COMMANDS` record and applying `Object.hasOwn` internally (vs. cdbr's `commandKeys: string[]` decoupling) | The intake mandates the hasOwn idiom verbatim for hash-derived lookups; lib placement makes the prototype-chain pin directly testable | S:70 R:85 A:80 D:70 |
| 9 | Confident | The curated-help `share` line is appended after `clear` (last position), padded to the list's 16-char column | The append-last convention governs every roster surface; the intake pins membership, not position | S:60 R:95 A:80 D:75 |
| 10 | Confident | `stopReplay()` runs unconditionally (idempotent) at the top of `onKeydown`/`onChipClick` — no `replayActive` flag; recording pushes all predicate-passing commits and `buildPlayHash` caps | Simplest wiring consistent with the dismissIdleHint placement; one cap site in the tested lib | S:60 R:95 A:85 D:75 |

10 assumptions (0 certain, 10 confident, 0 tentative).
