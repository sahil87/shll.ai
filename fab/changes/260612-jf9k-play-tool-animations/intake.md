# Intake: `play <tool>` — Illustrative Per-Tool Animations

**Change**: 260612-jf9k-play-tool-animations
**Created**: 2026-06-12

## Origin

One-shot `/fab-new jf9k` — backlog item `[jf9k]` (2026-06-12, source: terminal-fun review 2026-06-11, idea #4):

> `play <tool>` — a short, honest, *illustrative* animation of what each of the seven tools does, funneling straight to that tool's page. In `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro`, vanilla JS, zero new deps (Constitution VI), static-first (Constitution I). `play <tool>` (tab-completes the second token against TOOLS, like `cd`/`man`) runs a ~10-second canned visual for that tool — e.g. `play wt` shows fake worktrees spinning up in parallel, `play run-kit` shows panes converging green, `play idea` shows one idea fanning into agents. CRITICAL honesty guardrail (the o33t precedent): each animation MUST be clearly labelled illustrative and self-identify as not-real (a dim `# illustration — nothing actually runs here` line), and MUST NOT imply a live network/process (Constitution I; the same constraint o33t's finite, self-identifying streams honored). End every `play` on the real `cd <tool>` nav beat or a printed overview link, so delight funnels to the tool page. Reuse the o33t stream framework: finite frames, `ariaHidden` on rapid frames with ONE announced summary line, interruptible via Ctrl-C/keystroke, and `prefers-reduced-motion` → a single static end-frame (no animation). Per-tool frame data lives in a const beside the other rosters (SYNOPSIS/FAKE_ENV precedent); a missing/unknown tool falls back to the `unknownTool` path. Keep the exactly-one-trailing-prompt invariant; dark/light parity via `--c-*` vars. Heavier than `[4vkd]`/`[tx5p]` (seven bespoke animations) — sequence it AFTER them. Acceptance: `play wt` animates + labels itself illustrative + ends on the wt link; reduced-motion shows a static frame; interruptible; no network. Source: terminal-fun review 2026-06-11 (idea #4).

Sequencing prerequisite satisfied: both `[tx5p]` (share→replay, the replay engine) and `[4vkd]` (scripted `demo`/`tour`) are implemented on this branch (commits `114a18a` "feat: Scripted demo/tour Command" and the tx5p work before it; see the site memory `homepage-terminal.md`).

## Why

1. **The pain point**: the homepage terminal teaches what each tool *is* (the 37ng tool cards print real usage + subcommands), but nothing shows what a tool *feels like in motion*. The toolkit's whole pitch is dynamic — parallel agents, converging panes, fanning ideas — and a static card can't carry that. The one guided path (`demo`) covers the five-step workflow in one sitting; there is no per-tool "show me just this one" moment.
2. **The consequence of not doing it**: a visitor curious about exactly one tool (say `wt`) either reads a static card or commits to the full 60-second tour. The delight→funnel loop the terminal exists for (every fun command ends at a docs page or the install CTA) has no per-tool expression, and the most visual tools (`run-kit`, `wt`) are the ones a static card undersells most.
3. **Why this approach**: the o33t stream framework already solved every hard part — finite line streams above a live prompt (`startStream`/`stopStream` via `printBeforePrompt`, exactly-one-trailing-prompt by construction), Ctrl-C/new-command kill discipline, `ariaHidden` live-region noise control, reduced-motion handling, and the honesty ethos (self-identifying fake content: `AGENT_LOG`'s "log ends — nothing actually runs here" line, `yes`'s capped flood). `play` is seven data rosters plus one thin handler over that engine — no new dependency, no new mechanism, fully static (Constitution I and VI hold by construction).

## What Changes

All changes land in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` (the client-island script). No new files, no new libs, no new dependencies.

### 1. New command: `play <tool>`

A new `play` key in `COMMANDS`, appended **last** — strictly after `demo`/`tour` (the o33t/cdbr/37ng/tx5p/4vkd append-after-existing convention; the suggester's equal-distance tie-break keeps favoring established keys). `COMMANDS` grows 63 → 64 keys. Tab-completion, the did-you-mean suggester, and the cheatsheet coverage check all pick the key up via `Object.keys(COMMANDS)` — zero extra wiring.

Handler behavior (one handler, the thin-wiring shape of `demoHandler`):

- **No argument** → usage line, the `navigateTool` precedent: `usage: play <tool>   (try: ls)` (returned `Line[]`, no stream).
- **Unknown tool** (arg not in `TOOLS`, checked via the existing `isTool`) → the existing `unknownTool(name)` path verbatim (`no such tool: {name}` + the dim `tools:` roster line).
- **Known tool** → print the opening honesty label **immediately via `ctx.print`** (the `demoHandler` precedent — under reduced motion the rest resolves synchronously inside the call, and returned lines would land after it), then run the animation (§3) followed by the closing funnel block (§4).
- Argument is lowercased before lookup (the `navigateTool` precedent); all seven `TOOLS` entries are playable, including `shll`.

### 2. Honesty guardrail — the opening label (CRITICAL)

First printed line, before any frame, dim and **announced** (no `ariaHidden`):

```
# illustration — nothing actually runs here. (Ctrl-C bails out.)
```

`classes: 'shell-out shell-comment'`. This is the o33t self-identifying-stream ethos plus the 4vkd opening-line precedent (`DEMO_SCRIPT.opening` self-announces interruptibility). The label is per-invocation and unconditional — it prints in both the animated and reduced-motion paths. No frame may imply a live process or network: no spinners that "wait on" anything, no URLs being "fetched", timestamps (if any) are static literals (the `AGENT_LOG` 13:37 precedent).

### 3. The animation engine — reuse `startStream`, with a reduced-motion branch *before* it

The frames stream via the existing `startStream(lines, { intervalMs, onDone })` — one line per tick above the live prompt. Kill discipline is inherited: Ctrl-C (the `^C` echo + fresh prompt), Ctrl-L, and any newly committed command all call `stopStream()`. No document-level any-key listener — that is the replay engine's mechanism (`startSequence`); `play` is a stream, and the o33t stream discipline is the contract being reused.
<!-- clarified: standard o33t stream-kill set (no any-key listener) — user confirmed, bulk confirm 2026-06-12 -->

**Reduced motion is a handler-level branch, NOT `startStream`'s built-in fallback.** `startStream`'s own `prefersReducedMotion()` path prints *all* lines at once — but the backlog requires "a single static end-frame (no animation)". So the handler branches first (the `yes` handler precedent, which swaps `YES_CAP` for `YES_REDUCE_COUNT` before calling the stream):

- **Animated path**: `startStream(frames, { intervalMs: PLAY_TICK_MS, onDone: closing })` where `frames` are the per-tool roster lines, each `ariaHidden: true` (rapid frames are announcement garbage — the o33t rule).
- **Reduced-motion path**: no stream at all. Print (via `printBeforePrompt`, synchronously) only the tool's designated **static end-frame** (the settled final state, a handful of lines, announced — they are the only content a screen-reader/reduce user gets), then the closing block (§4).

New cadence constant beside `YES_TICK_MS`/`TAIL_TICK_MS`/`RM_TICK_MS` (the named-constants convention):

```js
const PLAY_TICK_MS = 350; // readable but kinetic — between rm's 300 and tail's 700
```

Per-tool frame counts are tuned so each animation runs ≈10 seconds (~25–30 frames at 350 ms). Exact frame copy is drafted at apply within the ~74-char width discipline (the GREETING/`CHEAT_LINE_WIDTH` precedent — longer lines clip into horizontal scroll under `white-space: pre`).
<!-- clarified: PLAY_TICK_MS = 350ms shared cadence, per-tool frame counts tune to ≈10s — user confirmed, bulk confirm 2026-06-12 -->

### 4. The closing funnel block — printed link, NEVER auto-navigation

Every completed `play` ends (via the stream's `onDone`, or directly on the reduced-motion path) with:

1. **ONE announced summary line** (`shell-comment`) — the per-tool punchline that a screen-reader user hears in place of the hidden frames (the o33t one-announced-summary rule). It doubles as the animation's resolution.
2. **The real nav line**: the existing `toolNavLine(slug)` — clickable overview/readme/commands/install anchors (the trusted-static-string `html: true` pattern). Zero copy duplication with the cards.
3. A dim typed invitation: `# see it for real: type 'cd {tool}' ⏎` (`shell-comment`) — the 4vkd closing-invitation shape.

`play` **never** calls `navigateWithBeat` and never auto-navigates. The backlog offers "the real `cd <tool>` nav beat **or** a printed overview link"; the printed link wins on the 4vkd precedent ("a machine-fired navigation mid-read is the exact hostility `REPLAY_DENY` exists to prevent — never navigating is what keeps `demo` replayable"). Consequences, all deliberate:

- `play` is **NOT added to `REPLAY_DENY`** (`terminal-share.ts` untouched) — `#play=play%20wt` deep-links and post-play `share` links replay the animation safely (finite, non-navigating).
- The closing block rides natural completion only (the `onDone` hook; an interrupted `play` prints no funnel pitch — the `replayOnDone`/`printDemoClosing` precedent). On the reduced-motion path it prints unconditionally (nothing to interrupt).

### 5. Per-tool frame data — `PLAY_SCRIPTS`, one const beside the rosters

A module-scope const beside `SYNOPSIS`/`FAKE_ENV`/`CHEATSHEET_GROUPS`/`DEMO_SCRIPT` (the backlog's explicit placement), shaped roughly:

```js
// Per-tool play scripts (change jf9k): frames stream ariaHidden at
// PLAY_TICK_MS; endFrame is what prefers-reduced-motion shows INSTEAD of
// the stream; summary is the ONE announced line (the o33t rule).
const PLAY_SCRIPTS: Record<string, { frames: Line[]; endFrame: Line[]; summary: string }> = { … };
```

(Exact field names/shape may be refined at apply; the three roles — hidden frames, static end-frame, announced summary — are the contract.) Keys are the seven `TOOLS` names; a key absent from the record falls back to `unknownTool` (defense in depth behind the `isTool` check, with the `Object.hasOwn` own-property guard — the o33t idiom for every record lookup keyed by user input).

The seven animation concepts (frame copy drafted at apply; the first three are the backlog's own examples):

| Tool | ~10s illustration | End-frame / punchline direction |
|------|-------------------|-------------------------------|
| `idea` | one captured idea line fans out into parallel agent lines picking it up | the fan settled: one idea, N agents on it |
| `hop` | a `you are here ▸` marker hopping across worktrees/branches/tools, context intact each landing | back where you started, nothing lost |
| `fab-kit` | a rough one-liner hardening into a spec: intake → assumptions scored → gate passed → plan checkboxes | the spec exists before any code |
| `wt` | fake worktrees spinning up in parallel, each agent in its own clean room | N isolated worktrees, zero stepped-on toes |
| `run-kit` | scattered panes converging green, one by one, into a single dashboard | all panes green, one place to watch |
| `tu` | per-agent token meters ticking up, then a totals line | tokens counted, budget respected |
| `shll` | the seven tools booting/assembling in sequence into one toolkit line | the meta-CLI that ties it together |

<!-- clarified: the seven concepts in the table above are final direction (frame copy drafted at apply) — user confirmed, bulk confirm 2026-06-12 -->

### 6. Tab-completion — second token completes against `TOOLS`

`TOOL_ARG_COMMANDS` (currently `['cd', 'open', 'man']`) gains `'play'`. That is the entire wiring — `completeInput` already completes token index 1 against `TOOLS` for listed commands (single match fills, LCP partial-fills, ambiguous lists above the live input).

### 7. `HELP_DETAIL` entry (the every-key rule)

Appended last in `HELP_DETAIL` (mirroring the `COMMANDS` position), via the `helpDetail` factory:

```js
play: helpDetail(
  "play <tool> — a ~10s illustrated short of what a tool does",
  "honest fake: nothing really runs. ends at the tool's pages. Ctrl-C bails.",
),
```

(Copy refined at apply within the two-line shape.) `man play` answers via the existing o33t `HELP_DETAIL` bridge — no separate entry.

### 8. Cheatsheet — `navigate` group

`CHEATSHEET_GROUPS` `navigate` entries gain `{ key: 'play', display: 'play <tool>' }`, placed beside `demo` (the session-utility/funnel shelf, the 4vkd placement rationale — `play` is a funnel device, not a terminal-culture gag, so not `classics`). The `cd <tool>` display-decoration precedent teaches the interesting invocation. Without this the cdbr runtime coverage check would append `play` under `uncategorized` — never a silent omission, but the curated shelf is the right home.
<!-- clarified: navigate group beside demo, display 'play <tool>' — user confirmed, bulk confirm 2026-06-12 -->

### 9. What does NOT change (byte-identical surfaces)

- **Bare `help`'s curated list** — `play` stays unlisted (discoverable via `cheatsheet`, `help play`, tab completion). Only two sanctioned help-list changes exist (cdbr footer, tx5p `share`), both user-confirmed; `demo` itself is not listed. No third… fourth sanctioned change here.
- Greeting, idle ghost hint, touch chips (`.terminal-cmdbar`), `REPLAY_DENY`, `terminal-share.ts`, `terminal-eggs.ts`, all other libs and their tests.
- No new `src/lib/` module: `play` is roster data + thin wiring over the existing engine; there is no pure string/width logic of the cheatsheet/toolcard kind to extract. If apply finds frame-building logic worth unit-testing, the lib-extraction pattern (`node --test` under `scripts/`) is the established escape hatch.

### 10. Accessibility & theming summary

- Rapid frames `ariaHidden: true`; exactly ONE announced summary line + the announced opening label + announced closing nav/invitation lines (the `yes`/`cheatsheet`/`tail` announced-content precedents).
- Reduced motion: no interval, no stream — opening label + static end-frame + closing block print at once (a *single* settled frame, not the full frame dump).
- Interruptible: Ctrl-C (frozen `^C` echo + fresh prompt + halted output), Ctrl-L, any committed command — all inherited from `stopStream` wiring.
- Exactly-one-trailing-prompt invariant holds by construction (`printBeforePrompt` streams above the live prompt).
- Dark/light parity: frames are text lines styled by the existing `.shell-*` classes riding the `--c-*` vars — no new colors, no new CSS. If a frame uses emphasis, it uses the existing classes (`shell-ok`, `shell-dim`, `shell-comment`).

## Affected Memory

- `site/homepage-terminal`: (modify) — the site-level memory tree at `sites/astro-starlight-terminal1/docs/memory/site/homepage-terminal.md` (hand-maintained, outside `fab memory-index`). Append the `play` pass to the change-history narrative: the command, the PLAY_SCRIPTS roster + PLAY_TICK_MS, the handler-level reduced-motion end-frame branch (deliberately NOT startStream's all-at-once fallback), the never-navigates/replayable stance, TOOL_ARG_COMMANDS growth, cheatsheet placement, and the help-list-unchanged stance.

Top-level domains (`conventions/`, `build-deploy/`) are untouched — this is island-internal behavior with no build/pull/contract surface.

## Impact

- **Code**: one file — `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` (new `PLAY_SCRIPTS` + `PLAY_TICK_MS` consts, one `play` handler + closing helper, one `TOOL_ARG_COMMANDS` element, one `HELP_DETAIL` entry, one cheatsheet entry). Roughly +150–250 lines, dominated by frame data.
- **Build/deploy**: none — static island content, no new deps (Constitution I & VI hold).
- **Tests**: no existing test files touched; no new lib planned (see §9). The five existing `scripts/*.test.mjs` suites must keep passing.
- **Risk surface**: the COMMANDS-key conventions (append-last, own-property guards, cheatsheet coverage) are mechanical and self-checking; the main review surface is frame copy quality (honesty + width discipline) and the reduced-motion branch being handler-level.

## Open Questions

None — the backlog entry specifies mechanism, guardrails, precedents, and acceptance; remaining choices were graded Confident or better (see Assumptions).

## Clarifications

### Session 2026-06-12 (bulk confirm)

User instruction: bulk-confirm all nine Confident assumptions as-is — accepted as final implementation decisions (the tx5p/4vkd pattern).

| # | Action | Detail |
|---|--------|--------|
| 1 | Confirmed | — |
| 2 | Confirmed | — |
| 3 | Confirmed | — |
| 4 | Confirmed | — |
| 6 | Confirmed | — |
| 8 | Confirmed | — |
| 9 | Confirmed | — |
| 10 | Confirmed | — |
| 11 | Confirmed | — |

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | End on a **printed** overview link + typed `cd` invitation — never auto-navigate; `play` stays out of `REPLAY_DENY` and is replayable | Clarified — user confirmed | S:95 R:75 A:85 D:65 |
| 2 | Certain | Animations are o33t **line streams** (`startStream`, frames appended one per tick), not in-place frame replacement | Clarified — user confirmed | S:95 R:70 A:90 D:80 |
| 3 | Certain | Reduced motion = **handler-level branch** printing only the static end-frame — bypassing `startStream`'s all-lines-at-once fallback | Clarified — user confirmed | S:95 R:80 A:85 D:80 |
| 4 | Certain | "Interruptible via Ctrl-C/keystroke" = the standard stream-kill set (Ctrl-C / Ctrl-L / committed command); no any-key kill listener | Clarified — user confirmed | S:95 R:80 A:80 D:60 |
| 5 | Certain | `play` added to `TOOL_ARG_COMMANDS` for second-token Tab completion against `TOOLS` | Backlog explicit ("tab-completes the second token against TOOLS, like cd/man"); the mechanism exists, one array element | S:95 R:90 A:95 D:95 |
| 6 | Certain | Bare `play` → usage line (`usage: play <tool>`); unknown tool → `unknownTool(name)` | Clarified — user confirmed | S:95 R:90 A:80 D:75 |
| 7 | Certain | `play` appended LAST in COMMANDS (63 → 64) and HELP_DETAIL; suggester/cheatsheet-coverage/Tab pick it up via `Object.keys` | The o33t/cdbr/37ng/tx5p/4vkd append-after-existing convention — five consecutive precedents | S:85 R:90 A:95 D:90 |
| 8 | Certain | Frame data in one island const `PLAY_SCRIPTS` (frames / endFrame / summary per tool); no new `src/lib/` module | Clarified — user confirmed | S:95 R:75 A:90 D:85 |
| 9 | Certain | `PLAY_TICK_MS = 350` shared cadence; per-tool frame counts tune each run to ≈10 s | Clarified — user confirmed | S:95 R:95 A:70 D:55 |
| 10 | Certain | The four unsketched animation concepts (hop, fab-kit, tu, shll) per the table in §5; exact frame copy drafted at apply | Clarified — user confirmed | S:95 R:85 A:72 D:50 |
| 11 | Certain | Cheatsheet placement: `navigate` group beside `demo`, display `play <tool>`; bare `help` list stays byte-identical | Clarified — user confirmed | S:95 R:90 A:85 D:72 |
| 12 | Certain | Opening honesty label printed unconditionally, announced, dim: `# illustration — nothing actually runs here. (Ctrl-C bails out.)`; no frame implies live process/network | Backlog CRITICAL guardrail verbatim + the 4vkd opening self-announce and AGENT_LOG self-identifying precedents | S:88 R:88 A:90 D:85 |

12 assumptions (12 certain, 0 confident, 0 tentative, 0 unresolved).
