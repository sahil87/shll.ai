# Intake: Terminal GNU-Utils Delight Pass

**Change**: 260610-o33t-terminal-gnu-utils-delight
**Created**: 2026-06-10
**Status**: Draft

## Origin

> /fab-draft GNU-utils easter-egg pass for the homepage terminal — Tier A one-shot commands + Tier B light logic + Tier C animated, per the discussion analysis

Backlog item `[o33t]` ("Add on-brand delight to the terminal — do last, only after the funnel and core polish land"). All predecessors have shipped: `n23o` (history/Tab/Ctrl keys), `23xc` (above-fold/greeting/ghost hint), `by18` (touch chips), and `cuur` (did-you-mean suggester, `help <command>`, nav beat, aria-live, reduced-motion gate — merged as PR #53, commit `f93689f`).

This intake came out of a `/fab-discuss` session on 2026-06-10: the user asked for the most important GNU utils, then for a per-command effort/fun analysis grounded in `TerminalPrompt.astro`. The analysis grouped candidates into tiers (A: stateless one-shots; B: light logic; C: animated; D/E: VFS- and pipe-gated). **User decisions from that conversation (verbatim intent):**

1. Tiers A + B + C all land in this one change (the user broadened the original Tier-A-only recommendation).
2. Tiers D/E (pipes + virtual filesystem) are split into a separate, speculative draft (`260610-42my-terminal-pipes-virtual-filesystem`) that "we may or may not ever implement". They are **out of scope here**.
3. "Agreed on your help list being short comment" — the top-level `help` list does not grow. Every new command is an unlisted easter egg.
4. Curation rule (from the analysis, user-approved): every command must either *teach the toolkit*, *reward terminal-culture recognition*, or *demo interactivity*. No bare error stubs without a punchline.

**Backlog-constraint deltas, decided consciously:** the `[o33t]` backlog entry says "MUST NOT imply runtime / introduce fake network or streaming gags" and "MUST NOT build a fake filesystem". The user reviewed the tier analysis (which flagged both) and chose Tier C anyway. Resolution encoded in this intake: (a) **no fake filesystem** — fully honored; every file-op command refuses with authentic read-only errors; (b) **no fake network** — honored; `curl`/`wget` explicitly *deny* network access; (c) **streaming/animation** — relaxed *with mitigations*: every Tier C stream is finite, ends by self-identifying as static (no implied runtime), respects `prefers-reduced-motion`, and controls `aria-live` announcement noise. The backlog item's "shareable transcript" idea (its item 3) is NOT included — see Out of scope.

## Why

1. **The pain point.** The terminal is now discoverable (`23xc`), reachable on touch (`by18`), shell-like to drive (`n23o`), and polished + accessible (`cuur`) — but its command surface is still thin: ~18 keys, of which only a handful reward curiosity. The site's signature interactive element invites exploration ("a few commands aren't on this list. a curious dev might try the obvious ones") and then dead-ends on almost everything an actual terminal user instinctively types: `pwd`, `uname`, `make`, `vim`, `tar`, `yes`, `rm -rf /`. Every such miss is `command not found` — an invitation revoked.

2. **If we don't.** The funnel work brought visitors to the prompt; cuur made typos survivable; but the depth isn't there to convert curiosity into the brand impression the site exists for ("these people *get* terminals — and they plan before they code"). The `[o33t]` backlog item stays open and the discovery ethos advertised by `help`'s footer over-promises.

3. **Why this approach.** Stateless additions to the existing `COMMANDS: Record<string, Handler>` map are ~5–20 lines each and inherit Tab-completion and the cuur did-you-mean suggester automatically (both candidate sets are `Object.keys(COMMANDS)`). The only new infrastructure is a small line-streamer (for `yes`/`tail`/`rm`-deluxe) built on the existing `printBeforePrompt()` primitive, plus one dependency-free lib module for the testable pure logic — the exact pattern cuur established with `terminal-suggest.ts`. Zero new dependencies (Constitution VI), no build/content changes, dark/light parity free via existing `.shell-*` classes (Constitution V).

## What Changes

All edits live in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` and `sites/astro-starlight-terminal1/src/styles/terminal.css`, plus one new lib module + one new test file. Invariants that MUST survive untouched: **exactly-one-trailing-prompt**, the **resting-state top anchor** (`23xc`), **progressive enhancement** (the static `<pre class="shell-session">` in `index.mdx` stays byte-identical), **dark/light parity** via `--c-*`-backed `.shell-*` classes only, and the **top-level `help` list byte-identical** (user decision).

### 0. Shared infrastructure

#### 0a. `FAKE_ENV` constant — single source for `env` and `echo` expansion

```ts
const FAKE_ENV: Record<string, string> = {
  SHELL: '/bin/shll',
  USER: 'visitor',
  HOME: '/home/visitor',
  EDITOR: 'spec',
  PLAN: 'first',
  AGENTS: '7',
  PATH: '/plans:/specs:/code',
  TERM: 'shll-256color',
};
```

`env` prints these as `KEY=value`, one per line, in declaration order. `echo` expands against the same record (see §2a) — one source, no drift.

#### 0b. `Line.ariaHidden` — live-region noise control

The `Line` type (`{ text; classes?; html? }`) gains an optional `ariaHidden?: boolean`. `print()` and `printBeforePrompt()` set `el.setAttribute('aria-hidden', 'true')` when it is true. Rationale: cuur made `pre.shell-session` an `aria-live="polite"` region, so every appended line is announced. ASCII art and rapid stream frames are announcement garbage; each animated/art command hides its frame/art lines and announces exactly one readable summary line instead.

**Retrofit (same mechanism, existing commands):** the 5 ASCII-art lines of the `shll` splash and the 7 locomotive lines of `sl` become `ariaHidden: true`. Their human-readable lines (the splash's pitch + tip, the train's punchline) stay announced. This corrects SR announcement noise that has existed since the live region landed.

#### 0c. Line streamer — the Tier C engine

New `initTerminal`-scope state and helpers, directly beside the cuur `pendingNav` pattern:

```ts
let activeStream: number | undefined;        // interval id
let streamFollowup: number | undefined;      // pending onDone timer (rm-deluxe beat)

function startStream(lines: Line[], opts: { intervalMs: number; onDone?: () => void }): void
function stopStream(): void
```

Behavior contract:

- `startStream` first calls `stopStream()` (at most one stream at a time), then emits `lines` one per tick via `printBeforePrompt()` — output lands above the live prompt, so the exactly-one-trailing-prompt invariant holds **by construction** (precedent: the Tab ambiguous-match listing). After the last line, `onDone` (if any) runs.
- **Reduced motion**: when `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, no interval — all lines print at once and `onDone` runs immediately (precedent: the `23xc` ghost hint's static fallback). Streams are *timing*, but their visual effect is motion; reduce gets the content without the cadence.
- **Ctrl-C kills the stream**: the existing Ctrl-C branch in `onKeydown` calls `stopStream()` alongside its `pendingNav` clear. `stopStream` clears both `activeStream` and `streamFollowup`. The frozen `^C` echo + fresh prompt + halted output read exactly like killing a foreground process.
- **A new committed command kills the stream**: `commitLine()` calls `stopStream()` before `run()`. (Deliberate contrast with `pendingNav`, which commitLine does NOT clear — the nav beat is 900ms and already announced its destination; streams are long-lived and would interleave with new output.)
- Streamed frame lines typically carry `ariaHidden: true`; the closing summary line is printed normally (announced). Exception: `tail -f` log lines are announced (slow cadence, meaningful content — see §3c).

#### 0d. Pure-logic lib module + tests

New dependency-free module `sites/astro-starlight-terminal1/src/lib/terminal-eggs.ts` (bundled into the island by Vite, same as `terminal-suggest.ts`), exporting:

```ts
export function expandVars(text: string, env: Record<string, string>): string;
// replaces $NAME and ${NAME} ([A-Za-z_][A-Za-z0-9_]*); unknown name → '' (authentic shell behavior).
// No escaping support ($$ etc.) — documented limitation.

export function seqLines(args: string[]): string[] | null;
// GNU seq semantics: seq LAST | seq FIRST LAST | seq FIRST INCR LAST. Integers only.
// null on non-integer/wrong-arity input. Empty array when the range is empty
// (e.g. seq 5 1 with positive incr) — authentic. Caller caps display at 100.

export type RmClass = 'missing' | 'refuse' | 'guarded-root' | 'deluxe';
export function classifyRm(args: string[]): RmClass;
// missing: no args. Recursive = any arg matching /^-[a-su-z]*r/i ordering-free (-r, -rf, -fr) or --recursive.
// Root target = literal '/' or '/*'. guarded-root: recursive + root, no --no-preserve-root.
// deluxe: recursive + root + --no-preserve-root. Everything else: refuse.

export function classifyTar(args: string[]): 'survivor' | 'bomb';
// survivor: first arg is a flag cluster (optionally -prefixed) containing 'f' and at least one of c/x/t
// (e.g. -xzf, xf, czvf, -tvf). bomb: everything else, including no args.
```

New unit test `sites/astro-starlight-terminal1/scripts/terminal-eggs.test.mjs` (`node --test`, native TS type-stripping — identical pattern to `terminal-suggest.test.mjs`) pinning: `$NAME`/`${NAME}`/unknown-var expansion; seq arity/validation/empty-range/reverse (`seq 3 -1 1`); every `classifyRm` class including flag-order variants (`-fr /`); `classifyTar` survivor/bomb edges (`xf`, `-czf`, `tar` bare, missing `f`).

#### 0e. `HELP_DETAIL` entries for every new key

Every new command key gets a `helpDetail(usage, detail)` entry (the cuur convention: **eggs answer `help <cmd>`, the list never enumerates them**). The top-level `help` list and `CHIP_COMMANDS` are unchanged. One-line usage summaries for all new keys:

| key | usage line |
|---|---|
| `pwd` | `pwd — print the working directory` |
| `uname` | `uname [-a] — print system information` |
| `id` | `id — print your identity` |
| `date` | `date — print the current date` |
| `uptime` | `uptime — how long this page has been up` |
| `env` | `env — print the environment` |
| `rm` | `rm <file> — remove files (you can try)` |
| `mkdir` | `mkdir <dir> — create a directory (you can try)` |
| `touch` | `touch <file> — create a file (you can try)` |
| `mv` | `mv <a> <b> — move files (you can try)` |
| `cp` | `cp <a> <b> — copy files (you can try)` |
| `chmod` | `chmod <mode> <file> — change permissions (you can try)` |
| `chown` | `chown <owner> <file> — change ownership (you can try)` |
| `diff` | `diff <a> <b> — compare two things` |
| `tar` | `tar <flags> — the flag gauntlet` |
| `make` | `make [target] — build a target. there is exactly one.` |
| `vim` / `vi` | `vim — open the editor holy war` |
| `emacs` | `emacs — open the other side of the holy war` |
| `nano` | `nano — the sensible one` |
| `curl` / `wget` | `curl <url> — fetch something over the network` |
| `less` / `more` | `less — page through output` |
| `kill` | `kill <pid> — send a signal` |
| `true` | `true — exit successfully, saying nothing` |
| `false` | `false — fail, also saying nothing` |
| `seq` | `seq [first [incr]] last — print a number sequence` |
| `ps` | `ps — list running processes` |
| `sha256sum` | `sha256sum <text> — hash your text, for real` |
| `grep` | `grep <pattern> — search the seven tools` |
| `yes` | `yes [text] — repeat until stopped` |
| `tail` | `tail [-f] agents.log — follow the agents' log` |

Detail lines (the dim second line) are the implementer's craft; tone-match the existing entries (e.g. `true`'s detail: "prints nothing. succeeds quietly. the joke is that there is no joke.").

### 1. Tier A — stateless one-shots

Each is one new `COMMANDS` entry returning `Line[]`. Classes: first line(s) `shell-out` unless noted; parenthesized punchlines `shell-comment`. Exact copy below is the spec; small wording polish during apply is fine if tone is preserved.

#### 1a. `pwd`
```
/home/visitor/plans
(you are exactly where you planned to be.)
```

#### 1b. `uname`
Bare: `shllOS`. With any args (e.g. `-a`):
```
shllOS shll.ai 7.0-plan-first #1 SMP plan-first scheduler x86_64
```

#### 1c. `id`
```
uid=1000(visitor) gid=7(planners) groups=7(planners),20(curious)
```

#### 1d. `date`
Line 1: real `new Date().toString()`. Line 2 (`shell-comment`): `(a good day to write a spec.)`

#### 1e. `uptime`
One line; page-age from `performance.now()` (`up N sec` under a minute, else `up N min`); the loads are the seven-tools wink:
```
 14:23:07 up 3 min, 1 visitor, load average: 0.07, 0.07, 0.07
```
Clock = current local time HH:MM:SS.

#### 1f. `env`
`FAKE_ENV` as `KEY=value`, one line each, declaration order (§0a).

#### 1g–1m. Read-only refusals — `rm`, `mkdir`, `touch`, `mv`, `cp`, `chmod`, `chown`
First line authentic GNU error shape, second line the punchline:

- `rm` (via `classifyRm`, §0d):
  - `missing` → `rm: missing operand` + `(try 'rm -rf /' if you're feeling brave.)` ← deliberately invites the deluxe egg
  - `refuse` → `rm: cannot remove '{first non-flag arg}': Read-only file system` + `(this site ships as static files. deletion was never on the table.)`
  - `guarded-root` → two authentic lines, **no joke line** (the authenticity is the invitation): `rm: it is dangerous to operate recursively on '/'` then `rm: use --no-preserve-root to override this failsafe`
  - `deluxe` → the Tier C sequence, §3d
- `mkdir`: missing → `mkdir: missing operand`; else `mkdir: cannot create directory '{arg}': Read-only file system` + `(want something built? write a spec. fab-kit insists.)`
- `touch`: missing → `touch: missing file operand`; else `touch: cannot touch '{arg}': Read-only file system` + `(the agents do the typing around here.)`
- `mv`: <2 args → `mv: missing file operand`; else `mv: cannot move '{a}': Read-only file system` + `(this site is immutable. like a good artifact.)`
- `cp`: <2 args → `cp: missing file operand`; else `cp: cannot create regular file '{b}': Read-only file system` + `(every site in this repo is an original.)`
- `chmod`: missing → `chmod: missing operand`; arg list contains `777` → `chmod: changing permissions of '{target}': absolutely not` + `(777? we plan our permissions here.)`; else → `chmod: changing permissions of '{last arg}': Operation not permitted` + `(ironic, isn't it.)`
- `chown`: missing → `chown: missing operand`; else `chown: changing ownership of '{last arg}': Operation not permitted` + `(visitors stay visitors. the toolkit can be yours, though — try 'install'.)` ← the conversion hook

#### 1n. `diff`
- <2 args → `usage: diff <a> <b>` + `(try: diff plan reality)`
- args are `plan reality` (either order) → authentic normal-diff format, then the thesis:
```
1c1
< everything you planned
---
> everything that happened
(that's why we plan.)
```
- any other two args → `diff: {a} and {b} differ in every line that matters.`

#### 1o. `tar` (via `classifyTar`)
- `survivor` → `congratulations: a valid tar invocation on the first try.` + `(xkcd 1168 survivors club. membership is smaller than you'd think.)`
- `bomb` → `tar: This does not look like a tar archive` then `tar: Exiting with failure status due to previous errors` + `(xkcd 1168: you had ten seconds.)`

#### 1p. `make`
- bare → `make: *** No targets specified and no makefile found.  Stop.` + `(try: make plan)`
- `make plan` → the converting gag; reuses `SYNOPSIS['fab-kit']` and `ROUTE_OVERVIEW('fab-kit')` (zero copy duplication, same `html: true` trusted-static-anchor pattern as `man`):
```
make: building 'plan'...
fab-kit — turn a rough idea into a reviewed spec before any code is written.
see: /tools/fab-kit/overview/        ← clickable anchor, shell-dim
```
- `make coffee` → `make: *** No rule to make target 'coffee'.  Stop.` + `(418: i'm a teapot.)`
- `make {other}` → `make: *** No rule to make target '{t}'.  Stop.` + `(only 'plan' is buildable here. naturally.)`

#### 1q. Editors — `vim`, `vi`, `emacs`, `nano`
- `vim` / `vi` (two keys, one handler) → `you can't exit what you never entered.` + `(':q' works here, though. we're not monsters.)`
- `emacs` → `a fine operating system. all it's missing is a good terminal website.`
- `nano` → `nano: too sensible to joke about. (try 'vim'.)`

#### 1r. `curl` / `wget` (two keys, one handler; print own name)
`{cmd}: no network from in here — this site is fully static.` + `(constitution I: static-first, zero runtime. we take it literally.)`

#### 1s. `less` / `more` (two keys, one handler, byte-identical output — that IS the gag)
`less is more. more or less.`

#### 1t. `kill`
- bare → `kill: usage: kill <pid>` + `(you don't know their pids. that's rather the point.)`
- args contain `-9` → `kill: {pid}: Operation not permitted` + `(not even with -9. the agents are protected by their planner.)`
- else → `kill: {arg}: Operation not permitted` + `(the seven agents are protected by their planner.)`

#### 1u. `true` / `false`
Handlers return **nothing**. No output at all — authentic, and the authenticity is the egg. The payoff lives in `help true` / `help false` (§0e).

### 2. Tier B — light logic

#### 2a. `echo` env expansion (modifies the existing handler)
`echo` now prints `expandVars(ctx.raw, FAKE_ENV)` (§0d). `echo hello` is unchanged. `echo $SHELL` → `/bin/shll`; `echo I plan $PLAN` → `I plan first`; `echo $UNDEFINED` → empty line (authentic). The existing `HELP_DETAIL.echo` detail line gains a mention: variables like `$SHELL` expand.

#### 2b. `seq` (via `seqLines`)
- `null` from the lib → `seq: invalid argument` + dim `usage: seq [first [incr]] last`
- Valid → numbers one per line (`shell-out`). Display cap 100: when the sequence is longer, print the first 100 then `(capped at 100 of {total} — this terminal believes in scope control.)` (`shell-comment`).

#### 2c. `ps`
Static table; tool rows generated from `TOOLS` (no parallel roster). `shll` is PID 1 (the meta-CLI that bootstraps the toolkit = init, the joke); remaining tools in canonical order get PIDs 2–7; final row is the visitor with real elapsed session time (mm:ss from `performance.now()`):
```
  PID TTY      TIME     CMD
    1 tty7     00:00:07 shll
    2 tty7     00:00:07 idea
    3 tty7     00:00:07 hop
    4 tty7     00:00:07 fab-kit
    5 tty7     00:00:07 wt
    6 tty7     00:00:07 run-kit
    7 tty7     00:00:07 tu
   42 pts/0    00:03:14 you
```

#### 2d. `sha256sum`
- bare → `sha256sum: missing operand` + dim `usage: sha256sum <text>`
- `!crypto?.subtle` (non-secure context) → `sha256sum: secure context required`
- else: the handler returns void and resolves `crypto.subtle.digest('SHA-256', new TextEncoder().encode(ctx.raw))` async; on resolve, `printBeforePrompt({ text: `${hex}  -` })` — the result lands above the (already-emitted) live prompt, correct placement by construction. Hex = lowercase, `  -` suffix is the stdin-filename convention. Real output, real hash — oddly satisfying is the point.

#### 2e. `grep` (standalone site-search; pipe mode is the 42my draft)
- bare → `usage: grep <pattern>` + dim `(searches the seven tools' synopses.)`
- with pattern (`ctx.raw`, so multi-word patterns work): case-insensitive substring match over the lines `{tool} — {SYNOPSIS[tool]}`; print each matching line with the tool name as an anchor (`html: true`, `ROUTE_OVERVIEW`, same pattern as `ls`). No matches → dim `(no matches — try 'grep plan')`.

#### 2f. `man` bridge (modifies the existing handler)
After the existing `isTool` branch (tools keep precedence — `man shll` still prints the tool synopsis), check `HELP_DETAIL[arg]`: if present, print those lines (one source with `help <cmd>`, no drift). Else: `No manual entry for {arg}` (authentic) + the cuur suggester tail when `suggestCommand` finds a candidate (` — did you mean '{s}'?`). Replaces the current fall-through to `unknownTool` for non-tool, non-command args.

### 3. Tier C — animated (all via the §0c streamer)

#### 3a. `yes [text]`
Streams `y` (or `ctx.raw` when given) at **150ms** cadence, frame lines `ariaHidden: true`, hard cap **50** lines. At the cap, stop + announced comment: `(yes: stopped at 50. Ctrl-C would have been faster — and more satisfying.)`. Ctrl-C mid-stream: stream halts; the `^C` echo is the feedback (no extra line). Reduced motion: print 7 hidden `y` lines at once + announced comment `(yes repeats forever. imagine it. Ctrl-C ends it.)`. Teaching value: makes the `n23o` Ctrl-C affordance discoverable.

#### 3b. `sl` animation upgrade (modifies the existing handler)
The 7 art lines (now `ariaHidden: true`, §0b) are wrapped in a block container span with class `shell-art-train`; the punchline `you meant 'ls'. (we all do.)` prints separately, announced, unchanged. In `terminal.css`:

```css
.shell-art-train { display: block; overflow: hidden; }
.shell-art-train > .shell-train-inner { display: inline-block; animation: shell-train 3s linear forwards; }
@keyframes shell-train {
  from { transform: translateX(100%); }
  to   { transform: translateX(-105%); }
}
```

A JS `animationend` listener removes the train container (the train has left; the punchline remains directly under the echoed command). **Reduced motion**: add `.shell-art-train > .shell-train-inner` to the existing `@media (prefers-reduced-motion: reduce)` block (`terminal.css:679–690`) with `animation: none` — the art renders statically exactly as today, `animationend` never fires, the art stays. Motion-safe purely in CSS, no JS branch.

#### 3c. `tail`
- bare → `tail: missing file operand` + dim `(try: tail -f agents.log)`
- `tail {anything-not-agents.log}` → `tail: cannot open '{arg}' for reading: No such file or directory` + dim `(try: tail -f agents.log)`
- `tail -f agents.log` (and `tail agents.log` — accept both): stream the fixed log at **700ms** cadence, lines **announced** (not ariaHidden — slow cadence, meaningful content; this is the one stream whose frames a screen-reader user should hear), then stop. The log is a const (`AGENT_LOG`); timestamps are static literals (13:37 — leet o'clock); the ending self-identifies as static, defusing any implied-runtime read (the conscious mitigation for the backlog's no-streaming-gags constraint):
```
13:37:00 [idea]    captured: "what if the homepage was a terminal"
13:37:01 [fab-kit] intake scored: 9 certain, 0 unresolved — gate passed
13:37:02 [wt]      worktree created: a clean room for the agent
13:37:03 [hop]     jumped: main → feature branch, context intact
13:37:04 [run-kit] four panes, all green
13:37:05 [tu]      tokens counted. budget respected.
13:37:06 [shll]    shipped. plan first, then code. always.
13:37:07 [shll]    log ends — nothing actually runs here. the site is static.
(tail: agents.log is a file, not a feed. Ctrl-C next time you can't wait.)
```
Final parenthetical is `shell-comment`. Ctrl-C cancels early. Reduced motion: all lines at once.

#### 3d. `rm -rf / --no-preserve-root` — the deluxe (classifyRm `deluxe`)
1. Stream at **300ms** cadence, announced (the drama is the content): one `removing /tools/{tool}` line per `TOOLS` entry (canonical order), then `removing /home/visitor`.
2. `onDone`: capture the live prompt line element (`input.closest('[data-terminal-prompt]')`) and `session.replaceChildren(liveLine)` — the transcript is wiped **but the live prompt element is preserved in place**: the exactly-one-trailing-prompt invariant holds, focus and listeners survive, no `freshPrompt()` call needed.
3. After a **900ms** beat (`streamFollowup` timer — cancelled by `stopStream`, so Ctrl-C aborts the whole sequence cleanly), `printBeforePrompt` the resolution:
```
just kidding. the site is static — nothing was harmed.
(your session transcript, though? gone. actions have consequences.)
```
Line 1 announced `shell-out`; line 2 `shell-comment`. The greeting is NOT re-printed — the lost transcript is the consequence and the joke.
4. **Reduced motion**: removal lines print at once and the wipe is **skipped** (a sudden full-screen wipe is exactly the kind of dramatic visual change reduce users opted out of); the resolution prints immediately with line 2 replaced by `(transcript spared. reduced motion is mercy.)`.

### 4. Roster/discovery side effects (accepted, by design)

- `Object.keys(COMMANDS)` grows ~18 → ~40. Both Tab-completion and the did-you-mean suggester pick the new keys up with zero wiring. Empty-fragment Tab (Tab on an empty prompt) already lists every key including eggs today — behavior retained; the listing just gets longer (one wrapped line; consistent with cuur's eggs-as-suggester-candidates stance).
- New keys are appended **after** all existing keys in the `COMMANDS` object so the suggester's equal-distance tie-break (first key in iteration order) keeps favoring the established commands.
- `help` list, `CHIP_COMMANDS`, greeting, ghost hint: all unchanged.

### Out of scope

- **Pipes, virtual filesystem, and all filter commands** (`wc`, `sort`, `uniq`, `head`, `cut`, `tr`, `cowsay`, `cat`, `find`, `tree`, `du`, `df`, `file`) — split to `260610-42my-terminal-pipes-virtual-filesystem` (speculative; may never be implemented).
- `top`/`htop` — needs in-place line rewriting the print model doesn't have; explicitly deferred in the analysis.
- Shareable transcript (backlog `[o33t]` item 3) — not in the agreed tier scope; when `[o33t]` is marked done at archive time, re-log it as its own backlog item if still wanted.
- The static no-JS transcript in `index.mdx`, `VersionTable`, chip roster, telemetry of any kind.

## Affected Memory

- `site/homepage-terminal`: (modify) — site-local memory tree (`sites/astro-starlight-terminal1/docs/memory/`). Add: the egg roster + curation rule (teach / reward recognition / demo interactivity); `FAKE_ENV` single-sourcing for env/echo; the streamer contract (printBeforePrompt-based, Ctrl-C + commitLine cancellation, reduced-motion all-at-once, one-at-a-time) and how it differs from `pendingNav`; `Line.ariaHidden` and the art-lines-hidden / summary-announced announcement policy; the `classifyRm`/`classifyTar` lib + threshold/cap constants; the rm-deluxe wipe-preserving-live-prompt mechanism; the backlog-constraint deltas (streaming relaxed with mitigations, no-VFS honored). Extend Requirements + Changelog.

## Impact

- `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` — ~30 new `COMMANDS` keys (+ `HELP_DETAIL` entries); `FAKE_ENV`, `AGENT_LOG`, cadence/cap constants (`YES_TICK_MS = 150`, `YES_CAP = 50`, `TAIL_TICK_MS = 700`, `RM_TICK_MS = 300`, `RM_BEAT_MS = 900`, `SEQ_CAP = 100`); streamer (`startStream`/`stopStream`/`activeStream`/`streamFollowup`); `Line.ariaHidden` + attribute handling in `print`/`printBeforePrompt`; Ctrl-C branch += `stopStream()`; `commitLine` += `stopStream()`; modified handlers: `echo` (expansion), `man` (HELP_DETAIL bridge + No-manual-entry + suggester), `sl` (train wrapper + animationend removal), `shll` (art lines ariaHidden); imports from `terminal-eggs.ts`.
- `sites/astro-starlight-terminal1/src/styles/terminal.css` — `.shell-art-train` + `@keyframes shell-train`; one selector added to the existing reduced-motion block (lines 679–690).
- `sites/astro-starlight-terminal1/src/lib/terminal-eggs.ts` — new (`expandVars`, `seqLines`, `classifyRm`, `classifyTar`).
- `sites/astro-starlight-terminal1/scripts/terminal-eggs.test.mjs` — new `node --test` suite.
- No build/config/workflow/content changes; no other pages affected.

## Open Questions

*(none — scope, tiering, and the backlog-constraint deltas were all decided in the originating discussion; remaining choices scored Confident and are recorded below for `/fab-clarify` review)*

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Scope = Tiers A + B + C from the 2026-06-10 analysis (~30 new keys + echo/man extensions + streamer infra); Tier D/E split to 260610-42my | Discussed — user directed the combination and the split explicitly | S:95 R:85 A:90 D:90 |
| 2 | Certain | Top-level `help` list byte-identical; every new command is an unlisted egg with `HELP_DETAIL` + `man` coverage | Discussed — user: "Agreed on your help list being short" | S:95 R:90 A:90 D:90 |
| 3 | Certain | Backlog `[o33t]` no-streaming-gags constraint consciously relaxed for Tier C; no-fake-network and no-fake-filesystem constraints fully honored (curl/wget deny network; all file-ops refuse) | Discussed — user chose Tier C from an analysis that flagged the conflict; mitigations specified in §3 | S:90 R:80 A:80 D:80 |
| 4 | Certain | Streamer = printBeforePrompt at interval; Ctrl-C and commitLine stop it; one stream at a time; reduced-motion prints all-at-once; pendingNav deliberately NOT given the commitLine treatment (asymmetry documented) | Discussed — streamer helper + Ctrl-C teaching were in the approved analysis; mechanics follow existing invariants and the 23xc reduced-motion precedent | S:85 R:80 A:85 D:80 |
| 5 | Certain | Eggs auto-join Tab completion + suggester via Object.keys(COMMANDS); empty-fragment Tab keeps listing everything; new keys appended after existing ones to preserve tie-break priority | Existing behavior + cuur's eggs-as-candidates stance; appending order is the one free knob | S:85 R:90 A:85 D:80 |
| 6 | Certain | Pure logic in src/lib/terminal-eggs.ts with scripts/terminal-eggs.test.mjs under node --test | cuur's terminal-suggest.ts pattern, verbatim | S:90 R:90 A:90 D:85 |
| 7 | Certain | Line gains optional ariaHidden; art/frame lines hidden from the cuur live region with announced summary lines; existing sl/shll art retrofitted | Discussed — the aria-live × animation interaction was explicitly flagged in the analysis as a must-resolve | S:85 R:85 A:85 D:80 |
| 8 | Certain | Verification = node --test (new + existing suites) + astro build + behavioral acceptance; no component harness exists | cuur precedent (its assumption #8, user-confirmed there) | S:90 R:80 A:90 D:85 |
| 9 | Certain | Static index.mdx transcript byte-identical; chips/greeting/hint unchanged; exactly-one-trailing-prompt + resting-anchor invariants preserved | Standing invariants from n23o/23xc/by18/cuur, restated in every terminal change | S:95 R:85 A:90 D:85 |
| 10 | Confident | Exact response copy as specified in §1–§3 (refusal punchlines, log content, FAKE_ENV values, uname/id/ps fields); minor wording polish allowed if tone holds | Copy is fully reversible; tone-matched to existing eggs; specifics are the intake author's craft, not user-confirmed line-by-line | S:70 R:95 A:80 D:70 |
| 11 | Confident | Stream/caps constants: yes 150ms/cap 50; tail 700ms; rm 300ms + 900ms beat; seq display cap 100; all named constants | Values follow existing constant conventions (HINT_TYPE_MS 70, NAV_BEAT_MS 900); trivially tunable | S:60 R:95 A:80 D:75 |
| 12 | Confident | sl animation = CSS keyframes on a wrapper, removed on animationend; reduced-motion handled purely by extending the existing CSS gate (static art, no removal) | CSS-only motion uses the cuur gate mechanism; cheapest motion-safe implementation; alternative (JS frame redraw) rejected as heavier | S:65 R:90 A:85 D:70 |
| 13 | Confident | rm-deluxe wipe = session.replaceChildren(liveLine) preserving the live prompt element; reduced motion skips the wipe entirely | Preserving the element upholds the prompt invariant without freshPrompt; wipe-skip-under-reduce is a judgment call on dramatic-change tolerance | S:65 R:85 A:80 D:65 |
| 14 | Confident | sha256sum via crypto.subtle (async printBeforePrompt; secure-context guard); grep = case-insensitive substring over `{tool} — {synopsis}` lines with linked names, no match highlighting | subtle is dependency-free and universally available in secure contexts; grep scope deliberately minimal pending the 42my pipe mode | S:65 R:90 A:85 D:70 |
| 15 | Certain | change_type = feat (new capability; nothing repaired or restructured) | Egg roster expansion is plainly additive feature work | S:90 R:90 A:90 D:90 |

15 assumptions (10 certain, 5 confident, 0 tentative, 0 unresolved).
