# Intake: Shareable + Replayable Terminal Session

**Change**: 260612-tx5p-share-replay-terminal
**Created**: 2026-06-12

## Origin

One-shot `/fab-new tx5p` — backlog ID resolved against `fab/backlog.md`. No prior discussion in the invoking conversation; the backlog entry itself is unusually detailed (it encodes decisions from the 2026-06-11 terminal-fun review, ideas #1+#2) and serves as the requirements source:

> [tx5p] 2026-06-12: Shareable + replayable terminal session — turn the homepage terminal into a play→share→replay loop (folds in the original descoped 'share' item from `[o33t]` plus a deep-link replay idea from the 2026-06-11 review). All in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro`, vanilla JS, zero new deps (Constitution VI), static-first (Constitution I: NO server, NO POST, hash-only state). Two cohesive parts. (1) **Shareable transcript** — a `share` (or `transcript`) command that serializes the visible `pre.shell-session` lines to a clean plain-text ASCII block and copies it to the clipboard (navigator.clipboard with a guarded execCommand fallback; print a confirmation line). Make it *fun*, not just a dump: prepend a one-line header and append a `# replayed from https://shll.ai` footer so a pasted transcript is self-advertising. Keep the exactly-one-trailing-prompt invariant — the live prompt line serializes as a bare `$`. (2) **Deep-link replay** — on load, parse a URL hash like `#play=ls,version,fortune` (comma- or semicolon-separated commands, URL-decoded) and auto-type+run that sequence into the terminal with the existing typing cadence, so someone can hand a friend a pre-baked demo link. The `share` command should offer the matching `#play=…` link alongside the ASCII block (the two halves close the loop). MUST honor `prefers-reduced-motion` (no per-char typing animation — fill+run each command at once); reuse the idle-hint/o33t stream-cancel machinery so a replay is interruptible (Ctrl-C / any keystroke stops it, like a real paste-bomb); cap the number of replayed commands and ignore unknown ones safely; never auto-focus on load (the 23xc no-autofocus decision stands — replay types into the prompt without stealing focus/scroll). Dark/light parity unaffected; any UI affordance must be keyboard-accessible with a visible focus state. Acceptance: `share` copies a self-advertising transcript + a `#play=` link; opening a `#play=ls,fortune` URL replays those commands; reduced-motion fills instantly; replay is interruptible; no network calls. Highest-leverage *new* fun: it converts play into reach (paste/tweet → new visitor). Supersedes the prior speculative `share`-only scope. Source: terminal-fun review 2026-06-11 (ideas #1+#2).

## Why

1. **The pain point**: the homepage terminal (60 commands after `37ng`) is a genuinely fun destination, but the fun is a dead end — a delighted visitor has no way to *show* anyone. There is no transcript export, and no way to hand a friend a pre-baked demo. Play happens, reach doesn't.
2. **The consequence of not doing it**: the terminal's conversion value stays capped at one visitor at a time. Every "look at this" moment dies in a screenshot (which loses the links, the theme, and the interactivity invitation) or dies entirely. The backlog's own framing: this is the highest-leverage *new* fun because it converts play into reach (paste/tweet → new visitor).
3. **Why this approach**: a `share` command + `#play=` hash replay is the only shape that satisfies Constitution I (static-first — no server, no paste service, no POST; the URL hash IS the state) and Constitution VI (zero new deps — clipboard and hash parsing are platform APIs). The two halves close a loop: `share` emits the very `#play=` link that the replay engine consumes, so a shared transcript advertises a link that reproduces the session. This supersedes the older `share`-only descoped item from `[o33t]` — share without replay is a dump; share with replay is a demo.

## What Changes

All work is island-only inside `sites/astro-starlight-terminal1/` (the LIVE build). `src/content/docs/index.mdx` stays **byte-identical** — the static no-JS transcript remains the progressive-enhancement source of truth; with JS off there is no `share` command and no replay, and nothing regresses.

### 1. The `share` command

A new `share` key in `COMMANDS` (no `transcript` alias — one name, one discovery surface; `help share` answers).

- **Serialization**: walk the session's `span.shell-line` elements in DOM order, take each line's `textContent`, trim trailing whitespace per line. The **live prompt line serializes as a bare `$`** (the exactly-one-trailing-prompt invariant carries into the export; the contenteditable's draft text and the aria-hidden ghost-hint span are never exported). Visually-present art lines (e.g. the `shll` splash rows, which are `aria-hidden` for SR-noise control only) ARE included — the export mirrors what the eye sees, not what the live region announces.
- **Self-advertising frame**: prepend one dim-comment-style header line (exact copy authored at apply time in the site's voice — the o33t reversible-copy precedent), append the footer `# replayed from https://shll.ai` (backlog-literal). When this page view has recorded at least one replayable command (§3), a second footer line carries the matching deep link, e.g. `# replay it: https://shll.ai/#play=ls,fortune` — so a *pasted* transcript carries the loop-closing link, not just the printed output.
- **Clipboard**: `navigator.clipboard.writeText(block)` (share always runs from a user gesture — Enter/chip — so transient activation is present), with a guarded `document.execCommand('copy')` hidden-textarea fallback when the async API is absent/rejects; if both fail, print an honest failure line offering the block in-terminal instead (never a silent no-op, never a throw). The async confirmation line lands via `printBeforePrompt` above the already-emitted fresh prompt — the `sha256sum` placement precedent.
- **Printed output**: a confirmation line (`shell-out`) plus the `#play=` link as a **plain-text** line — deliberately NOT an `html: true` anchor, because the href would embed user-derived content (commands the visitor typed); the trusted-static-string pattern (`man`/`ls`/nav-beat anchors) does not extend to user-derived hrefs. The printed link uses `location.origin + location.pathname` (works on previews/dev), while the *footer copy* stays the literal `https://shll.ai` brand line.
- **Zero recorded commands**: `share` still copies the transcript (header + body + footer); the link line and link-footer are simply omitted.

### 2. Deep-link replay (`#play=…`)

At activation (inside `initTerminal`, after the greeting prints), parse `location.hash`:

- **Format**: `#play=` followed by comma- **or** semicolon-separated command strings. Tokens are split on raw separators FIRST, then `decodeURIComponent`-decoded per token (so an encoded `%2C` inside an arg survives; a malformed %-sequence in one token drops that token, not the whole sequence — guarded try/catch, the sessionStorage discipline). Tokens are trimmed; empties dropped.
- **Validation — ignore unknown safely**: a token is replayable only when its first word passes `Object.hasOwn(COMMANDS, word)` — the o33t own-property-guard idiom is MANDATORY here (the hash is user-controlled input keying a record lookup; a bare read would resolve `constructor`/`__proto__`). Non-replayable tokens are skipped silently — no error lines for them.
- **Navigation commands are not replayable**: `cd`, `open`, `install` are excluded by a shared `REPLAY_DENY` list — a URL-controlled sequence must not yank the visitor off the page they were just handed a link to (the nav beat would fire `window.location.assign` mid-replay). `share` itself is also denied (a gesture-less replayed `share` would only hit the clipboard permission wall). Everything else — including `clear`, `theme`, the eggs, and the animated streams — replays faithfully.
  <!-- clarified: REPLAY_DENY (cd/open/install/share) user-confirmed 2026-06-12 — a deep link never navigates the visitor away mid-replay; the permissive alternative was reviewed and rejected -->
- **Cap**: at most `REPLAY_CAP = 10` commands per link (named constant); excess tokens are dropped at parse.
- **No hash, malformed hash, or zero surviving tokens** → no replay, normal page load, byte-for-byte today's behavior. The hash is left in place (not stripped via `replaceState`) — a reload replays again; a deep link is replayable by definition.

### 3. The replay engine

- **Auto-type + run**: for each command in sequence — type it character-by-character into the live input's `textContent` at `REPLAY_TYPE_MS = 70` (the `HINT_TYPE_MS` cadence, the "existing typing cadence" the backlog references), then commit via **`commitLine(false)`** (the chip-path precedent: full commit semantics — history push, stream kill, `exitResting`, fresh prompt — with **no focus steal**), then wait `REPLAY_GAP_MS = 700` before the next. Replay starts `REPLAY_START_DELAY_MS = 600` after activation (lets the greeting/resting anchor settle). All three are named constants per the `HINT_*`/`NAV_BEAT_MS` convention.
- **No focus, no scroll steal** (23xc stands): replay never calls `focus()`/`scrollIntoView`; `commitLine(false)` is the entire commit path. The session's *internal* bottom-pinning after each commit is the normal post-interaction behavior; page scroll is untouched.
- **`prefers-reduced-motion`**: no per-char animation — each command's text is **filled at once and committed**, commands run back-to-back with no inter-command gap (reusing `prefersReducedMotion()`; the streams a replayed command starts already print all-at-once under reduce, so the whole replay resolves instantly).
- **Interruptible like a paste-bomb**: a `stopReplay()` kill switch (module pattern mirroring `stopStream()`: clears the active typing interval, the pending gap/start timers, and the remaining queue) is wired into the **first statements of `onKeydown`** (any keystroke — which subsumes Ctrl-C; the dismissIdleHint placement precedent) and the **chip-tap handler**. Replay's own machinery commits through `commitLine` without tripping the kill switch (commitLine does NOT call `stopReplay` — replay calls commitLine itself; the deliberate asymmetry is documented in-code, the `pendingNav` contrast precedent). Interrupting mid-word freezes whatever was typed — the next user action deals with the partial line exactly as if they'd typed it.
- **Idle-hint interplay**: a starting replay suppresses/dismisses the idle ghost hint (machine interaction is still interaction; the hint must not type over a replay). One-shot latch semantics unchanged.
- **Streams**: a replayed command that starts a stream (`yes`, `tail`, `sl`, rm-deluxe) runs it for the `REPLAY_GAP_MS` window; the next replayed command's `commitLine` kills it — exactly the existing commit-kills-stream contract, no special-casing.

### 4. Recording — what `share`'s link contains

A new `initTerminal`-scope `sessionCommands: string[]` records, on each `commitLine`, the committed raw line **iff** it passes the same replayable predicate used by hash parsing (known command, not in `REPLAY_DENY`). One predicate, two call sites — recording and parsing can never drift, so a generated link replays exactly what it claims. Deliberately NOT the existing `history[]` (sessionStorage-persisted across page views — it would not match the visible transcript) and NOT persisted anywhere (page-view-scoped, hash-only state). The link is built as `#play=` + `encodeURIComponent(cmd)` joined by `,`, capped at `REPLAY_CAP` (most recent? No — **first N in commit order**: the transcript reads top-down and the replay should too).

### 5. Roster & help integration (the established conventions)

- `share` appended as the **last key in both `COMMANDS` and `HELP_DETAIL`** (the o33t/cdbr/37ng append-after-existing convention — the suggester tie-break keeps favoring established keys). Tab-completion and the did-you-mean suggester pick it up via `Object.keys(COMMANDS)` with zero wiring.
- `HELP_DETAIL.share` entry (the cuur every-key convention): usage `share — copy this session as text + a replay link`, detail in the site's voice.
- **`share` joins bare `help`'s curated list** — it is a real listed utility (like `history`/`clear`), not an easter egg; its entire purpose is discovery→reach, and an unlisted share command converts nobody. This is a deliberate, sanctioned change to bare `help` output (the cdbr precedent: such changes are rare and explicit; the eggs-stay-unlisted stance is untouched — `share` is not an egg).
  <!-- clarified: share in bare help's curated list user-confirmed 2026-06-12 — a sanctioned exception to help byte-identity (the second ever, after cdbr's footer splice); the unlisted alternative was reviewed and rejected -->
- **Cheatsheet**: `share` added to the `navigate` group (beside `help`/`history`/`clear` — session utilities); the runtime anti-drift coverage check would otherwise flag it `uncategorized`.
- `CHIP_COMMANDS`, the greeting, and the ghost hint: **unchanged**.

### 6. Pure-logic lib + tests (the four-time pattern, a fifth)

Dependency-free `src/lib/terminal-share.ts` (Vite bundles it into the island; the suggest/eggs/cheatsheet/toolcard precedent) exporting the pure halves:

- `parsePlayHash(hash, isReplayable): string[]` — format/split/decode/validate/cap per §2.
- `buildPlayHash(commands): string` — encode/join/cap per §4 (round-trips with `parsePlayHash`).
- `serializeTranscript(lineTexts, opts): string` — trailing-trim, header/footer assembly, optional link-footer per §1 (the DOM walk stays island-side; the lib takes plain strings).
- `REPLAY_CAP` and a `firstWord`/replayable-predicate helper.

Pinned by a `node --test` suite `scripts/terminal-share.test.mjs` (native TS type-stripping import): mixed separators, encoded spaces/commas, unknown-command and denied-command skipping, the prototype-chain pin (`#play=constructor` → skipped), malformed %-sequence tolerance, the cap, empty/no-hash, build→parse round-trip, and the serializer contract (trailing trim, bare-`$` prompt line, header/footer/link-footer presence and absence).

### Non-goals

- No paste-service/share-target/Web Share API integration (server-shaped or scope creep; clipboard + URL is the whole mechanism).
- No replay of `cd`/`open`/`install` navigation (§2) and no `#play=` autostart UI chrome (progress bar, skip button) — the terminal itself is the UI.
- No narration layer — that is `[4vkd]`'s `demo` command, which composes with this change (a tour is a natural `#play=` sequence plus narration).
- No change to the static transcript, chips, greeting, or ghost hint.

## Affected Memory

- `site/homepage-terminal`: (modify) — the site-level memory tree at `sites/astro-starlight-terminal1/docs/memory/site/` (per `fab/project/context.md`, site-implementation memory lives beside the site). New section for the share→replay loop: the `share` serializer contract, the `#play=` hash grammar + `REPLAY_DENY`/`REPLAY_CAP`, the replay engine's commit-path reuse (`commitLine(false)`), the kill-switch wiring, the recording predicate, and the sanctioned `help`-list addition. Frontmatter `description` and the site memory `index.md` row updated to match.

## Impact

- `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` — the bulk: `share` handler, hash parse at activation, replay engine + `stopReplay` wiring (onKeydown, chip handler), `sessionCommands` recording in `commitLine`, roster/help/cheatsheet entries, new named constants.
- `sites/astro-starlight-terminal1/src/lib/terminal-share.ts` — NEW pure-logic module.
- `sites/astro-starlight-terminal1/scripts/terminal-share.test.mjs` — NEW `node --test` suite.
- `src/content/docs/index.mdx` — untouched (byte-identical, load-bearing invariant).
- `terminal.css` — expected untouched (no new visual affordance; replay reuses existing line/prompt rendering; nothing new to gate beyond the JS-side reduce branch).
- Zero new dependencies (Constitution VI); output stays fully static, no network calls (Constitution I); dark/light parity unaffected (no new styled surface); no new focusable UI (keyboard-accessibility requirement is met by construction — `share` is a command, replay is non-interactive output).
- Invariants explicitly preserved: exactly-one-trailing-prompt (replay commits via `commitLine`; the serializer renders the live line as `$`); no-autofocus (23xc); the `Object.hasOwn` guard on every user-keyed record lookup (o33t); progressive-enhancement boundary (island-only).

## Open Questions

None — the backlog entry resolves mechanism, constraints, and acceptance explicitly; the remaining judgment calls are graded below (two Tentative rows flagged for `/fab-clarify`).

## Clarifications

### Session 2026-06-12

| # | Question | Answer |
|---|----------|--------|
| 15 | Should `#play=` replay exclude the nav-beat commands (`cd`/`open`/`install`, plus `share` itself) via a shared `REPLAY_DENY` list, or allow same-site navigation as a demo-ending feature? | Exclude via `REPLAY_DENY` — confirmed |
| 16 | Should `share` join bare `help`'s curated command list (a sanctioned exception to `help` byte-identity), or stay unlisted (cheatsheet-only)? | Add to the curated list — sanctioned exception, confirmed |

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | All behavior island-only in `TerminalPrompt.astro` + a new dependency-free lib; zero new deps; no server/POST; hash-only state; `index.mdx` byte-identical | Backlog-explicit + Constitution I/VI + the load-bearing progressive-enhancement boundary | S:95 R:85 A:95 D:95 |
| 2 | Certain | Hash grammar `#play=` + comma- or semicolon-separated, URL-decoded command tokens | Backlog-literal format incl. the example `#play=ls,version,fortune` | S:95 R:80 A:90 D:90 |
| 3 | Certain | Reduced motion: fill+run each command at once, no per-char typing, no inter-command gap; reuse `prefersReducedMotion()` | Backlog MUST + the o33t streamer/23xc hint precedent | S:95 R:90 A:95 D:95 |
| 4 | Certain | Replay never focuses or scrolls the page: commits via `commitLine(false)` (the by18 chip path) | Backlog MUST ("the 23xc no-autofocus decision stands"); the chip path exists for exactly this | S:95 R:85 A:95 D:90 |
| 5 | Certain | Every hash-derived `COMMANDS` lookup goes through `Object.hasOwn` | Codebase law — the o33t review-cycle lesson ("any future record lookup keyed by user input MUST use this guard") | S:90 R:80 A:100 D:95 |
| 6 | Certain | Clipboard: async `navigator.clipboard.writeText` → guarded `execCommand('copy')` textarea fallback → honest in-terminal failure line; async confirmation via `printBeforePrompt` | Backlog names both mechanisms verbatim; sha256sum precedent fixes the async-output placement | S:90 R:85 A:90 D:90 |
| 7 | Confident | The `#play=` link is built from a NEW page-view-scoped `sessionCommands` recording filtered by the shared replayable predicate — not the cross-page-view `history[]`; first `REPLAY_CAP` commands in commit order | The link must reproduce the visible transcript; `history[]` spans page views via sessionStorage and would not match | S:70 R:85 A:85 D:75 |
| 8 | Certain | Pure logic extracted to `src/lib/terminal-share.ts` + `node --test` suite | The suggest/eggs/cheatsheet/toolcard pattern, four times established — the codebase answers this deterministically | S:80 R:85 A:95 D:90 |
| 9 | Confident | Named constants `REPLAY_TYPE_MS = 70`, `REPLAY_GAP_MS = 700`, `REPLAY_START_DELAY_MS = 600`, `REPLAY_CAP = 10` | Cadence convention (`HINT_TYPE_MS = 70` is "the existing typing cadence"); exact values trivially tunable (high R) | S:60 R:95 A:80 D:75 |
| 10 | Confident | `share` only — no `transcript` alias | Backlog offers either, lists `share` first; one name keeps the roster lean; rename/alias-add is cheap later | S:60 R:90 A:60 D:55 |
| 11 | Confident | Printed `#play=` link is plain selectable text, not an `html:true` anchor; printed link uses `location.origin+pathname`, footer copy stays literal `https://shll.ai` | Trusted-static-string pattern doesn't extend to user-derived hrefs; footer copy is backlog-literal | S:55 R:90 A:80 D:70 |
| 12 | Confident | Serializer: DOM-order `span.shell-line` `textContent`, per-line trailing trim, live prompt → bare `$`, visible aria-hidden art included; header + literal footer + conditional link-footer; header copy authored at apply | Backlog pins the footer and the bare-`$` rule; aria-hidden is SR-noise control, not visual hiding — the export mirrors the eye | S:75 R:90 A:80 D:70 |
| 13 | Certain | Roster integration: `share` appended last in `COMMANDS`+`HELP_DETAIL`; cheatsheet `navigate` group; chips/greeting/hint unchanged | The o33t/cdbr/37ng append + every-key-has-help conventions are codified in memory as binding; the cheatsheet coverage check forces a group mechanically | S:75 R:90 A:95 D:90 |
| 14 | Confident | Interrupt wiring: `stopReplay()` at the top of `onKeydown` (any keystroke ⊇ Ctrl-C) and in the chip handler; `commitLine` does NOT trip it (replay commits through it); replay start dismisses the idle hint | Backlog: "Ctrl-C / any keystroke stops it"; mirrors the stream-kill discipline + dismissIdleHint placement precedent | S:80 R:85 A:80 D:80 |
| 15 | Certain | `cd`/`open`/`install` (+ `share` itself) excluded from replay via a shared `REPLAY_DENY` list — counted under "ignore unknown ones safely" | Clarified — user confirmed | S:95 R:80 A:60 D:40 |
| 16 | Certain | `share` joins bare `help`'s curated list (a sanctioned change — second ever after cdbr's footer splice) | Clarified — user confirmed | S:95 R:85 A:50 D:40 |

16 assumptions (10 certain, 6 confident, 0 tentative, 0 unresolved).
