# Intake: Scripted demo/tour Command

**Change**: 260612-4vkd-scripted-demo-tour-command
**Created**: 2026-06-12

## Origin

`/fab-new 4vkd` (one-shot, backlog-driven — no prior conversation context). Backlog entry verbatim:

> [4vkd] 2026-06-12: Scripted `demo`/`tour` command — the most on-mission *new* fun: a guided, auto-typed walkthrough that teaches what the shll toolkit actually IS, ending on the install CTA. In `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro`, vanilla JS, zero new deps (Constitution VI). A `demo` (alias `tour`) command that auto-types and runs a short curated sequence narrating the workflow across the seven tools — e.g. `idea` (capture) → `fab`/`fab-kit` (plan/spec) → `wt` (isolate) → `run-kit`/`rk` (watch) → `tu` (account) → `install` — with one dim `shell-comment` narration line printed before each step so a visitor reads the *story*, not just commands. Reuse the existing typing cadence + the o33t stream-cancel machinery so the tour is interruptible (Ctrl-C / any keystroke stops it cleanly, like aborting a foreground process) and the 23xc no-autofocus rule holds (types into the prompt without stealing focus/scroll). MUST honor `prefers-reduced-motion` (fill+run each step at once, narration still printed). End on a clear next-step (the `install` nav beat, or a printed link) so the tour converts. Keep the exactly-one-trailing-prompt invariant. Composes with `[tx5p]`: the tour is a natural `#play=` replay sequence, but `demo` adds the narration layer a bare replay can't. Acceptance: `demo` narrates + runs the sequence, is interruptible, reduced-motion fills instantly, ends on install. Source: terminal-fun review 2026-06-11 (idea #3).

## Why

1. **The pain point**: after nine changes (`9vbo` → `tx5p`) the homepage terminal is a 61-command destination — discoverable, touch-usable, accessible, delightful — but nothing on it *teaches what the toolkit IS*. A visitor can run `ls`, find eggs, even print per-tool cards (`37ng`), but the seven tools' *relationship* — capture → plan → isolate → watch → account — is a story no single command tells. The site's whole value is as a front door into the toolkit (`fab/project/context.md`), and the front door currently demos the shell, not the workflow.
2. **The consequence of not doing it**: the funnel stays charm-deep. Visitors leave entertained but unconverted — they never see *why* seven small CLIs compose, and the install CTA stays an unframed menu item. The backlog calls this "the most on-mission *new* fun" for a reason: every other delight item (`jf9k`, `kd5e`) is sequenced after it.
3. **Why this approach**: the machinery is already built. The `tx5p` replay engine auto-types and commits commands with full interruption, reduced-motion, and no-autofocus semantics; `37ng` tool cards give each step real, mechanically-synced content to show. `demo` is those two assets plus the one thing a bare `#play=` replay can't carry: a **narration layer** (one dim comment line before each step) that turns a command sequence into a guided story. Alternatives rejected: a static "how it works" page section (abandons the site's signature interactive surface — the terminal IS the pitch); a video/GIF (not static-first in spirit, unmaintainable, no dark-mode parity); pointing visitors at a hand-rolled `#play=` link (no narration — the exact delta the backlog names).

## What Changes

All work in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` (the client island). Zero new dependencies (Constitution VI), fully static (Constitution I), `index.mdx` byte-identical, `terminal.css` untouched (no new styled surface — narration reuses the existing `shell-comment` class; the typing is a JS interval, not CSS animation). Dark/light parity free via existing classes (Constitution V).

### 1. Two new COMMANDS keys: `demo` + `tour` (61 → 63)

- `demo` and `tour` are **two keys sharing one handler** — the `editorHandler`/`exitHandler`/`denyNetwork` precedent: two keys, one body, no drift.
- Both appended **strictly after the established keys** (after `share`, the current last key) — the o33t/cdbr/37ng/tx5p append-after-existing convention, so the did-you-mean suggester's equal-distance tie-break keeps favoring established keys. Tab-completion and the suggester pick both up via `Object.keys(COMMANDS)` with zero wiring.
- `HELP_DETAIL` entries for **both** keys (the cuur convention — every `COMMANDS` key answers `help <cmd>`, and `man <cmd>` via the o33t bridge). Shape: usage line + dim detail line, e.g. usage `demo — a guided tour of the shll toolkit` / detail `auto-types the workflow story, one tool at a time. any key stops it.` (final copy authored at apply, the o33t reversible-copy precedent).

### 2. The narrated-step engine (generalizes the tx5p replay engine)

The existing replay engine (`replayQueue`/`replayTimer`/`replayTyper`, `startReplay`/`replayNext`/`stopReplay`, `TerminalPrompt.astro:2405-2521`) is generalized from a queue of bare command strings to a queue of **steps** `{ narration?: string; command: string }`:

- `startReplay(commands)` maps its inputs to narration-less steps — the `#play=` path is behaviorally byte-identical today's.
- The `demo` handler enqueues `DEMO_SCRIPT` steps. Before typing each step's command, the engine prints the step's narration line(s) via **`printBeforePrompt`** (the Tab-listing/streamer precedent — output lands above the live prompt, so the exactly-one-trailing-prompt invariant holds **by construction**), classes `shell-out shell-comment` (dim).
- Typing cadence reuses **`REPLAY_TYPE_MS = 70`** ("the existing typing cadence" — also `HINT_TYPE_MS`); each step commits via **`commitLine(false)`** — the by18 chip path: full commit semantics (history push, `sessionCommands` recording, stream kill, `exitResting`, fresh prompt) with **no focus steal**. Focus is preservation-not-initiation: the engine's existing conditional capture/restore of mid-sequence user-established focus applies unchanged (the rm-deluxe precedent). Page scroll never touched (the 23xc no-autofocus lineage).
- **Inter-step gap**: a new named constant `DEMO_GAP_MS` (≈ 1400 ms — proposed; tunable at apply) rather than `REPLAY_GAP_MS = 700`: a demo step prints a narration line plus a multi-line tool card the visitor must actually read; replay's gap is tuned for already-seen content. The step type (or the engine entry point) carries the gap so replay keeps 700. Start delay reuses `REPLAY_START_DELAY_MS = 600` for the `#play=demo` path; a typed `demo` begins after its opening narration prints.
- **One machine typist at a time, by construction**: starting a demo first calls the shared stop (the `startStream`-stops-previous precedent). A replayed `demo` (`#play=demo,...`) therefore *replaces* the in-flight replay queue — surviving tokens after `demo` are dropped, documented in code. Likewise `demo` while a demo runs restarts it.
- **Completion hook**: after the last step's commit, the engine prints the closing CTA lines (see § 3) via `printBeforePrompt` above the final prompt, then runs the existing cleanup (`stopReplay` — removes the document-level kill listener).

**Interruption (unchanged wiring, inherited for free)**: the document-level capture-phase `keydown` kill listener (any keystroke regardless of focus — subsumes Ctrl-C), the input `onKeydown` first statements, chip taps, and paste all stop the sequence; `commitLine` deliberately does not (the documented asymmetry). Interrupting mid-word freezes the partial line like a hand-typed abort; already-printed narration stays (the stream-frame precedent). This satisfies the backlog's "o33t stream-cancel machinery" requirement — the tx5p kill switch is that machinery's document-level evolution, already wired into all four interaction surfaces.

### 3. `DEMO_SCRIPT` — the tour content

A module-scope const beside the other rosters (`SYNOPSIS`/`FAKE_ENV`/`CHEATSHEET_GROUPS` precedent). Five steps — the bare tool names whose `37ng` cards print real, mechanically-synced content — each preceded by one dim narration line, framed by an opening line and a closing CTA block. Illustrative draft (copy authored at apply, in the site's voice — the o33t reversible-copy precedent):

```
$ demo
# the shll toolkit in ~60 seconds — any key bails out.
# 1/5 — it starts with an idea. capture it before it evaporates:
$ idea
  ‹idea's tool card prints›
# 2/5 — plan first, code second. fab turns ideas into specs:
$ fab
# 3/5 — every agent gets its own worktree. no stepped-on toes:
$ wt
# 4/5 — watch all of them converge from one dashboard:
$ rk
# 5/5 — tu keeps the agent accounts straight:
$ tu
# that's the loop: capture → plan → isolate → watch → account.
# get it: type 'install' ⏎ — or click /getting-started/install/
```

- Steps use the **binary-alias keys `fab` and `rk`** where they exist (the backlog's own framing: "`fab`/`fab-kit` … `run-kit`/`rk`") — shorter to watch being typed; both print the same card as their primaries. `hop` is omitted to keep the tour ≈ 60 s at five steps; the closing loop-summary line names the *workflow*, not all seven binaries. (Step roster is apply-tunable; the count, not the members, is the load-bearing property.)
- The opening narration line **self-announces interruptibility** ("any key bails out") — the honest-machinery ethos (o33t's self-identifying streams).
- The closing CTA is a **printed clickable anchor** to `/getting-started/install/` (the `navigateWithBeat`/`toolNavLine` trusted-static-string pattern — `html: true` on a static route constant) plus the `type 'install' ⏎` invitation. The tour does **NOT** auto-run `install`: a machine-fired `window.location.assign` would yank the visitor off the page mid-read — the exact hostility `REPLAY_DENY` exists to prevent — and would make `demo` itself non-replayable (see § 4). The backlog offers both endings ("the `install` nav beat, or a printed link"); the printed link is the one compatible with tx5p composition. <!-- clarified: user confirmed — tour ends on printed install link + invitation, never an auto-fired navigation -->

### 4. tx5p composition — `demo` is replayable

- `demo`/`tour` are own `COMMANDS` keys and are **NOT added to `REPLAY_DENY`** — `isReplayable` passes, so **`#play=demo` is a one-token shareable link that plays the whole narrated tour**. This is the backlog's composition clause realized, and it is only safe because the tour never navigates (§ 3).
- Recording: `demo` commits through `commitLine`, so it lands in `sessionCommands`, and so do its replayable steps (`idea`, `fab`, …) — a `share` after a demo produces a link like `#play=demo,idea,fab,…` (capped at `REPLAY_CAP = 10`). Replaying that link is self-healing: `demo` replaces the queue (§ 2), the duplicated tail is dropped. Accepted and documented in code — suppressing machine-commit recording would fork `commitLine`'s single-path semantics for a harmless cosmetic.

### 5. Roster integration — bare `help` stays untouched

- **Cheatsheet**: `demo` joins the **`navigate`** group (beside `help`/`history`/`clear`/`share` — the session-utility/funnel shelf; the classics group is terminal-culture gags, which `demo` is not), display `demo · tour` is NOT used — instead `tour` is **alias-folded via `CHEATSHEET_ALIASES` (`tour: 'demo'`)**, the vi→vim precedent, so the runtime coverage check counts both keys covered with one entry. Without this the cdbr coverage check would append both under `uncategorized` — never a silent omission.
- **Bare `help`'s curated list: unchanged.** Both prior changes to `help` output (cdbr's footer tip, tx5p's `share` line) were individually user-confirmed "sanctioned" changes; this change does not make a third — **user-confirmed** (clarify session 2026-06-12): `demo` remains unlisted in bare `help`, discoverable via `help demo` / `man demo` / `cheatsheet` / the tour itself. <!-- clarified: user confirmed — bare help list stays unchanged; no third sanctioned help change -->
- `CHIP_COMMANDS` (the four touch chips), the `GREETING` line, and the idle ghost hint: **byte-identical** — the every-change-since-23xc convention.

### 6. Accessibility & reduced motion

- **Narration lines are announced** (no `ariaHidden`): the narration IS the story — hiding it would gut the feature for screen-reader users. The `tail` precedent: slow, meaningful lines are the deliberate announced exception to frame-hiding. Step command output announces per each command's existing policy (cards announce; any art a step printed would carry its own hiding).
- **`prefers-reduced-motion: reduce`** (backlog MUST): mirror `startReplay`'s reduce path, extended per-step — print narration, fill the command at once, commit, synchronously through all steps including the closing CTA block. No per-character typing, no gaps, no kill listener (nothing is ever in flight). Streams a step starts already print all-at-once under reduce.
- No new focusable UI, no new styled surface: `demo` is a command; the tour is non-interactive output (the tx5p stance).

## Affected Memory

- `site/homepage-terminal`: (modify) — site-local tree (`sites/astro-starlight-terminal1/docs/memory/site/homepage-terminal.md`): new § for the scripted demo/tour pass (the narrated-step engine generalization, the DEMO_SCRIPT roster, the replayable-demo composition contract, roster integration), description-frontmatter and Requirements/Design-Decisions/Changelog updates per the established per-change pattern.

## Impact

- **Code**: `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` only — new `demo`/`tour` keys + handler, `HELP_DETAIL` entries, `DEMO_SCRIPT` const, replay-engine step generalization, `DEMO_GAP_MS` constant, cheatsheet `navigate` entry + `tour` alias. No `terminal.css` change, no `index.mdx` change, no new lib (no extractable pure string logic — the engine is DOM-bound island work; the five existing `src/lib/terminal-*.ts` modules and their `node --test` suites are untouched and must stay green).
- **Behavioral surface**: COMMANDS 61 → 63; `#play=` grammar unchanged (demo simply becomes a valid token); `share` serialization unchanged (narration lines are ordinary `span.shell-line`s and export like any output).
- **Constitution**: I (static — no network, no runtime fetch), V (existing `--c-*` classes only), VI (zero new deps) all trivially held. Accessibility constraint: no new focusable elements; announced narration; reduced-motion honored.
- **Risk concentration**: the replay-engine generalization is the one structural edit to existing machinery — replay's current behavior (`#play=ls,fortune` etc.) must stay byte-identical; everything else is additive.

## Open Questions

None — the backlog entry is unusually specific; every gap is closed as a graded assumption below. The bare-`help` listing question was resolved in the 2026-06-12 clarify session (list stays unchanged, user-confirmed).

## Clarifications

### Session 2026-06-12 (bulk confirm)

| # | Action | Detail |
|---|--------|--------|
| 5 | Confirmed | Bare `help` list stays unchanged — no third sanctioned help change; `demo` unlisted in bare `help`, discoverable via `help demo` / `man` / `cheatsheet` / the tour itself |
| 2 | Confirmed | — |
| 3 | Confirmed | — |
| 4 | Confirmed | — |
| 6 | Confirmed | — |
| 7 | Confirmed | — |
| 10 | Confirmed | — |
| 11 | Confirmed | — |
| 12 | Confirmed | — |

All eight Confident assumptions bulk-confirmed as final implementation decisions; the one Tentative assumption (#5) confirmed as-is.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | `tour` is a second COMMANDS key sharing the `demo` handler; both appended after `share` (COMMANDS 61 → 63) | Backlog mandates the alias; the two-keys-one-handler + append-last conventions are established (editorHandler, o33t→tx5p ordering) | S:90 R:85 A:95 D:90 |
| 2 | Certain | The tour rides a generalized tx5p replay engine (steps `{narration?, command}`) rather than a parallel typer | Clarified — user confirmed | S:95 R:65 A:85 D:75 |
| 3 | Certain | Tour ends on a printed clickable install anchor + `type 'install' ⏎` invitation — never an auto-fired `install` navigation | Clarified — user confirmed | S:95 R:75 A:80 D:60 |
| 4 | Certain | `demo`/`tour` stay replayable (NOT in REPLAY_DENY); starting a demo replaces any in-flight machine sequence; post-demo `share` links carry harmless duplicated steps (self-healing on replay) | Clarified — user confirmed | S:95 R:70 A:75 D:65 |
| 5 | Certain | Bare `help`'s curated list is NOT changed — `demo` discovered via cheatsheet/suggester/`help demo`/`man`/the tour itself; no third sanctioned help change | Clarified — user confirmed | S:95 R:90 A:60 D:45 |
| 6 | Certain | Cheatsheet: `demo` in the `navigate` group; `tour` alias-folded via `CHEATSHEET_ALIASES` (`tour: 'demo'`) | Clarified — user confirmed | S:95 R:85 A:70 D:55 |
| 7 | Certain | Five tool-card steps `idea`, `fab`, `wt`, `rk`, `tu` (binary-alias keys where shorter), one narration line each, opening interruptibility line, closing loop-summary + CTA; exact copy authored at apply | Clarified — user confirmed | S:95 R:85 A:70 D:65 |
| 8 | Certain | Reduced motion: narration + fill + commit synchronously per step, closing block included; no kill listener installed | Backlog MUST ("fill+run each step at once, narration still printed"); exactly the existing `startReplay` reduce path, extended | S:90 R:80 A:90 D:85 |
| 9 | Certain | No-autofocus and one-trailing-prompt hold by construction: all commits via `commitLine(false)`, narration via `printBeforePrompt`, focus preservation-not-initiation | Backlog mandates both; the mechanisms are the existing chip/replay/streamer paths, not new code | S:90 R:80 A:95 D:90 |
| 10 | Certain | Narration lines are announced to screen readers (no `ariaHidden`) | Clarified — user confirmed | S:95 R:80 A:80 D:75 |
| 11 | Certain | No new `src/lib/` module or test file; `DEMO_SCRIPT` is a module-scope island const beside the other rosters | Clarified — user confirmed | S:95 R:80 A:75 D:70 |
| 12 | Certain | New named `DEMO_GAP_MS` ≈ 1400 ms inter-step gap (replay keeps `REPLAY_GAP_MS = 700`); typing reuses `REPLAY_TYPE_MS = 70`; exact value tuned at apply | Clarified — user confirmed | S:95 R:90 A:70 D:65 |

12 assumptions (12 certain, 0 confident, 0 tentative, 0 unresolved).
