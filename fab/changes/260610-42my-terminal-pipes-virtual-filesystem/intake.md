# Intake: Terminal Pipes & Sitemap-Backed Virtual Filesystem

**Change**: 260610-42my-terminal-pipes-virtual-filesystem
**Created**: 2026-06-10
**Status**: Draft

## Origin

> /fab-draft Speculative second pass: pipe infrastructure + sitemap-backed virtual filesystem for the homepage terminal (Tier D/E from discussion analysis) — queued, may never be implemented

Split out of the 2026-06-10 `/fab-discuss` session that produced `260610-o33t-terminal-gnu-utils-delight`. The per-command analysis identified two infrastructure cliffs — **pipes** (which convert `wc`/`sort`/`uniq`/`head`/`grep` from gags into real filters) and a **virtual filesystem** (which unlocks `cat`/`find`/`tree`/`ls` paths) — each ~50–100 lines of one-time infrastructure for a long tail of payoff. **User decision (verbatim intent): "Then Tier D / E → Create another fab-draft for it — like you said, we may or may not ever implement it."**

This intake is therefore written to be **fully implementable by an agent with no other context**, but it is deliberately **not cleared for autonomous execution**: assumption #1 below is graded Unresolved, which forces the confidence score to 0.0 and hard-blocks the `/fab-ff` / `/fab-fff` intake gate. That is intentional. When (if) a go decision is made, run `/fab-clarify` to resolve assumption #1 and the score recomputes from the remaining table.

**Relationship to backlog `[o33t]`'s constraints:** the backlog entry mandates "MUST NOT build a fake filesystem (`mkdir`/`cd /` etc.) — the honest flat-command model stays." This change is the conscious, explicit proposal to revisit that stance — with a reframing that preserves its underlying value (honesty): the filesystem here is **not fake**. It is the site's real route tree (`/tools/{tool}/overview`, `/tools/{tool}/readme`, `/getting-started/install`) plus two flavor files, read-only. `cd`-ing into a page navigates to it; `ls` lists real pages; `mkdir` still refuses because the site genuinely is read-only static files. Nothing lies about what exists or runs.

## Why

1. **The payoff this unlocks.** After `o33t`, roughly a third of the terminal's commands are *gags about being unable to do things* (`grep` only searches synopses; `wc`/`sort`/`head` don't exist; `cat` doesn't exist). Pipes and a sitemap VFS convert them into *real, composable utilities inside the toy*: `ls | wc -l` printing `7`, `fortune | cowsay`, `cat ~/.plan`, `find / -name 'readme'`, `ls | sort -r | head -n 3`. For the site's terminal-native audience, composition is the soul of the medium — a terminal that pipes is a terminal that *means it*. It is also the single strongest "these people get it" brand signal available.

2. **Why it might never be worth it.** This is ~250–400 lines across infra + filters + VFS for delight depth, on a surface with **no engagement telemetry** (the site deliberately has zero runtime). If visitors don't play past `ls`/`help`, the o33t roster already saturates the value. That uncertainty is exactly why the user queued this speculatively rather than approving it — and why assumption #1 is Unresolved by design.

3. **Why this design when it is built.** Both features ride entirely on existing primitives: the pipeline runner is a pure-function transform between `COMMANDS` dispatches; the VFS is a static in-memory tree derived from `TOOLS` (single source — no parallel sitemap to drift); filters and path-resolution are dependency-free pure functions in `src/lib/` with `node --test` suites (the `terminal-suggest.ts` / `terminal-eggs.ts` pattern). Zero new dependencies (Constitution VI); fully static (Constitution I); all output through existing `.shell-*` classes (Constitution V).

## What Changes

All edits in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro`, two new lib modules, two new test files. **Hard dependency: `260610-o33t-terminal-gnu-utils-delight` must have shipped** — this change reuses its streamer, `Line.ariaHidden`, refusal handlers, and the standalone `grep`/`tail` behaviors it defines. Standing invariants preserved: exactly-one-trailing-prompt, resting-state anchor, byte-identical static transcript in `index.mdx`, unchanged top-level `help` list (all new commands remain unlisted eggs with `HELP_DETAIL` entries), dark/light parity via `--c-*` classes.

### 1. Pipe infrastructure

#### 1a. Pipeline runner (in `run()`)

- `run(raw)` splits the committed line on `|` into segments (trimmed). **No quoting support** — a `|` is always a pipe; documented limitation (`echo "a | b"` pipes; acceptable for a toy).
- One segment → exactly today's dispatch (zero behavior change for non-piped commands).
- Multiple segments: execute left-to-right. `Ctx` gains two fields:
  ```ts
  interface Ctx {
    print; clear; raw: string;
    stdin: string[] | null;   // lines from the previous segment; null for the first/standalone
    piped: boolean;           // true when this segment's output feeds another segment
  }
  ```
- Between segments, the runner converts the producing handler's returned `Line[]` to plain-text lines: `html: true` lines are detagged via a scratch element's `textContent`; `ariaHidden` frame lines are dropped. The resulting `string[]` becomes the next segment's `ctx.stdin`.
- The **final** segment's `Line[]` prints normally (announced per the o33t aria policy).
- **Errors abort the pipeline**: an unknown command prints its `command not found` line (with the cuur suggester) and the remaining segments do not run. A known-but-not-pipeable command (below) prints `{cmd}: not pipeable here` and aborts.
- **Not pipeable** (reject in a pipeline, whether as producer or consumer): `yes`, `tail -f` (streams); `cd`, `open`, `install` (navigation); `clear`, `theme` (side effects); `sha256sum` (async). Everything else participates.

#### 1b. Producers — piped plain-text mode

When `ctx.piped` is true, producers emit machine-shaped plain text (mirroring how real `ls` drops columns/colors when piped):

| producer | piped output |
|---|---|
| `ls` | bare entry names, **one per line**, no anchors — `ls \| wc -l` → `7` |
| `fortune` | the aphorism line |
| `env` | `KEY=value` lines |
| `seq` | the numbers |
| `history` | the raw command lines (no index column) |
| `ps` | the table rows (header included) |
| `echo` | its expanded text |
| `grep` / `find` / `cat` | their natural text lines |
| `version` | the row text content (tags stripped by the runner) |
| `help` | the list text lines |

#### 1c. Filters (each ~10–20 lines once the runner exists)

New `COMMANDS` keys; all read `ctx.stdin` (empty/`null` stdin standalone → each prints its usage line). Implementations live as pure functions in `src/lib/terminal-filters.ts` (see §4):

- `wc [-l|-w|-c]` — default `  {lines}  {words}  {chars}`; with a flag, just the number.
- `sort [-r]` — lexicographic line sort; `-r` reverses.
- `uniq [-c]` — adjacent dedupe; `-c` prefixes `  {count} `.
- `head [-n N]` / `tail [-n N]` — first/last N lines, default 10. (`tail` keeps its o33t standalone `-f agents.log` behavior when not piped; piped `tail` is the filter.)
- `cut -d{ch} -f{n}` — single-char delimiter, single 1-based field; rows lacking the field → empty line.
- `tr {a} {b}` — char-for-char translate; supports single chars and the two classic ranges `a-z`/`A-Z` only; anything else → `tr: unsupported set (single chars or a-z A-Z only)`.
- `grep {pattern}` — with stdin: case-insensitive substring filter. Without stdin: the o33t standalone site-search (unchanged).
- `cowsay` — deliberately included though non-GNU; `fortune | cowsay` is the marquee combo. Takes stdin (lines joined with spaces) or args; wraps the bubble at 36 columns; cow art lines `ariaHidden: true`, bubble text lines announced. Exact cow (classic):
  ```
   __________________________________
  < Weeks of coding can save you     >
  < hours of planning.               >
   ----------------------------------
          \   ^__^
           \  (oo)\_______
              (__)\       )\/\
                  ||----w |
                  ||     ||
  ```

### 2. Sitemap-backed virtual filesystem

#### 2a. The tree (new module `src/lib/terminal-vfs.ts`)

```ts
export type VfsNode =
  | { kind: 'dir'; route?: string; children: Record<string, VfsNode> } // route = default landing (tool dirs)
  | { kind: 'doc'; route: string }    // a real site page — cd/open navigates to it
  | { kind: 'file'; lines: string[] } // cat-able flavor content
export function buildVfs(tools: readonly string[], motd: string): VfsNode; // root
export function resolvePath(root: VfsNode, cwd: string[], arg: string):
  { node: VfsNode; path: string[] } | null;  // handles /, ~, ., .., relative segments
export function globMatch(name: string, pattern: string): boolean; // '*' wildcard only
```

Tree shape (built from `TOOLS` — single source, no drift; `motd` = the island's `GREETING` constant, single-sourced):

```
/
├── tools/                      dir
│   └── {tool}/                 dir, route → /tools/{tool}/overview/
│       ├── overview            doc → /tools/{tool}/overview/
│       └── readme              doc → /tools/{tool}/readme/
├── getting-started/            dir
│   └── install                 doc → /getting-started/install/
├── home/                       dir
│   └── visitor/                dir
│       └── .plan               file (the manifesto, below)
└── etc/                        dir
    └── motd                    file (= GREETING text)
```

`.plan` content (the old-school finger-file; the killer `cat` target):

```
1. plan first.
2. then code.
3. ship small, ship reviewed.
4. the agent types; you decide.
— the shll way
```

#### 2b. `cwd` state and `cd` semantics

- New `initTerminal`-scope state: `let cwd: string[] = ['tools']` — **default cwd is `/tools`**, so bare `ls` listing the seven tools becomes filesystem-honest rather than special-cased.
- `cd` dispatch rules, in order:
  1. Bare `cd` → `cwd = ['home', 'visitor']` (`~`, authentic). Discovery chain: `ls` there is empty until `ls -a` reveals `.plan` → `cat .plan`.
  2. Arg is **exactly a tool name** (no `/`, no `.`) → the existing cuur nav-beat page navigation, **unchanged** (funnel wins; `cd hop` keeps doing what every predecessor change built).
  3. Path-shaped arg (starts with `/`, `~`, `.`, or contains `/`) → VFS resolution: dir → update `cwd`; **doc → nav-beat navigation to its route** (the filesystem IS navigation: `cd tools/idea/overview` opens the page, Ctrl-C cancels); file → `cd: {arg}: Not a directory`; unresolved → `cd: no such file or directory: {arg}`.

#### 2c. Upgraded / superseded commands (deltas vs o33t — list is exhaustive)

- `pwd` — prints the real `/`-joined cwd (default `/tools`); keeps its `(you are exactly where you planned to be.)` comment line. **Supersedes** o33t's static `/home/visitor/plans` gag.
- `ls [path] [-a] [-l]` — lists the cwd or the resolved path. Entries: dirs get a trailing `/`; entries with a `route` render as anchors (`html: true`) — at the default cwd this reproduces today's seven linked tool names exactly. `-a` reveals dotfiles. `-l` long format, perms structurally read-only (the joke persists in the metadata): `-r--r--r--  1 visitor planners  7.0K  Jun 10  {name}` (all sizes `7.0K`; directories `dr-xr-xr-x`).
- `cat <path>` — file → its lines; doc → `cat: {name}: is a page — try 'cd {name}'`; dir → `cat: {name}: Is a directory`; missing → `cat: {arg}: No such file or directory`. Pipeable producer.
- `find [path] [-name <pattern>]` — walks the resolved subtree (default cwd), prints matching `/`-joined paths one per line (`globMatch`, `*` only; no `-name` → everything). Pipeable: `find / -name '*e*' | wc -l`.
- `tree [path]` — box-drawing (`├──`, `└──`, `│`) walk, dirs first then files, includes dotfiles; announced (meaningful text, not art).
- `du [path]` — one row per entry, whimsical sizes: every entry `7.0K` except `shll` → `49K` + comment `(49K — it contains the other six.)`; closing comment `(measured in plans, not bytes.)`.
- `df` — single fake table + comment:
  ```
  Filesystem      Size  Used  Avail  Use%  Mounted on
  shll.ai         7.0T   87%  plenty  87%  /
  (87% plans, 13% code. the correct ratio.)
  ```
- `file <path>` — file → `{name}: ASCII text (planned)`; doc → `{name}: HTML document (static, naturally)`; dir → `{name}: directory`.
- File-op refusals (`rm`/`mkdir`/`touch`/`mv`/`cp`/`chmod`/`chown` from o33t) — gain path validation for authenticity, same jokes: a resolvable target → the o33t read-only refusal; an unresolvable path → `{cmd}: cannot ...'{arg}': No such file or directory`. (`rm -rf /` classification unchanged.)
- Tab-completion — second-token **VFS path completion** for `cd`, `cat`, `ls`, `find`, `tree`, `du`, `file`: complete the final path segment against the resolved parent dir's children (reusing the existing single-match / longest-common-prefix / list-candidates resolution in `completeInput`). Tool-name completion for `cd`/`open`/`man` is unchanged and checked first.

### 3. New `HELP_DETAIL` entries

Every new key (`wc`, `sort`, `uniq`, `head`, `cut`, `tr`, `cowsay`, `cat`, `find`, `tree`, `du`, `df`, `file`) gets a `helpDetail(usage, detail)` entry per the cuur eggs-answer-but-don't-list convention. The top-level `help` list is unchanged. `help cd` / `help ls` / `help pwd` / `help grep` / `help tail` details are updated for their new semantics.

### 4. Pure-logic modules + tests

- `src/lib/terminal-vfs.ts` (§2a) — tested by `scripts/terminal-vfs.test.mjs`: tree shape from `TOOLS`; `resolvePath` for `/`, `~`, `.`, `..`, chained relatives, escaping-above-root clamps to root; `globMatch` star/literal/edge cases.
- `src/lib/terminal-filters.ts` — `splitPipeline(raw): string[]`, plus pure implementations `wcOf(lines, flag)`, `sortLines(lines, reverse)`, `uniqLines(lines, count)`, `headLines`/`tailLines(lines, n)`, `cutLines(lines, delim, field)`, `trLines(lines, a, b)`, `wrapBubble(text, width)` (cowsay). Tested by `scripts/terminal-filters.test.mjs`: each filter's happy path + flag variants + empty-stdin behavior; `ls | wc -l → 7` is pinned end-to-end-ish by feeding 7 names through `wcOf`.

### Out of scope

- Quoting/escaping in the pipeline parser; redirection (`>`, `<`, `>>`); globbing outside `find -name`; `xargs`/`tee`/`sed`/`awk`.
- Any VFS write operations — the tree is immutable; all write commands keep refusing.
- `top`/`htop` (in-place line rewriting), shareable transcript, telemetry.
- Touching the static `index.mdx` transcript, chips, greeting, or the `help` list.

## Affected Memory

- `site/homepage-terminal`: (modify) — site-local memory tree (`sites/astro-starlight-terminal1/docs/memory/`). Add: the pipeline contract (split rule, stdin/piped Ctx fields, detag-between-segments, not-pipeable set, abort-on-error); the VFS model (sitemap-backed reframing of the no-VFS stance, tree shape, single-sourcing from TOOLS/GREETING, default cwd `/tools`); cd dispatch precedence (tool name → page nav beats path → VFS); the o33t supersession list (§2c); filter + path-completion behaviors. Extend Requirements + Changelog.

## Impact

- `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` — `run()` pipeline runner; `Ctx.stdin`/`Ctx.piped`; piped modes on ~10 producers; ~13 new `COMMANDS` keys + `HELP_DETAIL` entries; `cwd` state; upgraded `cd`/`pwd`/`ls`/`cat`/`find`/`tree`/`du`/`df`/`file` + path-validated refusals; VFS path Tab-completion.
- `sites/astro-starlight-terminal1/src/lib/terminal-vfs.ts` — new.
- `sites/astro-starlight-terminal1/src/lib/terminal-filters.ts` — new.
- `sites/astro-starlight-terminal1/scripts/terminal-vfs.test.mjs`, `scripts/terminal-filters.test.mjs` — new `node --test` suites.
- Estimated +150–250 island lines, ~120–180 lib lines. No build/config/content changes; no other pages affected.

## Open Questions

- **Should this be built at all?** Deferred by design — the user queued it as "may or may not ever implement". Inputs to a future go/no-go: does anyone play with the o33t roster (no telemetry exists, and adding any is its own constitution-shaped decision); does the `[o33t]` backlog stance ("honest flat-command model stays") get formally amended by the sitemap reframing in this intake. Encoded as Unresolved assumption #1, which deliberately holds the confidence score at 0.0 so autonomous pipelines cannot pick this change up before a human decides.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Unresolved | Whether this change should ever be implemented | Deferred — user queued it speculatively ("we may or may not ever implement it"); go/no-go awaits evidence of terminal engagement post-o33t and a conscious amendment of the backlog's no-VFS stance. The forced 0.0 score is the intended gate-block; resolve via /fab-clarify on a go decision | S:20 R:30 A:15 D:25 |
| 2 | Certain | Split from o33t per user direction; hard dependency on o33t having shipped (streamer, ariaHidden, refusal handlers, standalone grep/tail) | Discussed — user directed the two-draft split explicitly | S:95 R:85 A:90 D:90 |
| 3 | Certain | The VFS is sitemap-backed and read-only — real routes + two flavor files; write ops keep refusing; this is the explicit, conscious proposal to amend the backlog's no-fake-filesystem stance, preserving its honesty value | Discussed — the reframing was presented in the analysis; making the stance-change explicit is the point of this draft | S:85 R:75 A:80 D:80 |
| 4 | Confident | Default cwd `/tools` (bare `ls` stays the seven linked tools, now filesystem-honest); bare `cd` → `~`; tool-name `cd` keeps page-nav precedence; `cd` into a doc node navigates via the cuur nav beat | Keeps every funnel behavior the predecessor changes built while making the model coherent; precedence order is the one genuinely designable choice | S:65 R:85 A:80 D:65 |
| 5 | Confident | Pipe model: split on `\|` with no quoting; Ctx.stdin/piped; detag + drop-ariaHidden between segments; abort-on-error; declared not-pipeable set (streams, nav, side-effects, async) | Standard minimal-pipeline semantics; every exclusion has a stated mechanical reason | S:65 R:85 A:85 D:70 |
| 6 | Confident | VFS tree shape + content as specified (.plan manifesto, /etc/motd = GREETING single-source, tool dirs carrying overview/readme docs with a default route) | Derived entirely from existing site routes and constants; content copy is reversible craft | S:65 R:90 A:85 D:70 |
| 7 | Confident | cowsay included despite being non-GNU; bubble wrap 36 cols; cow art ariaHidden with announced bubble | fortune \| cowsay is the canonical pipe-delight payoff named in the discussion; aria policy follows o33t | S:70 R:95 A:85 D:75 |
| 8 | Certain | Pure logic in src/lib/terminal-vfs.ts + terminal-filters.ts with node --test suites | The established terminal-suggest/terminal-eggs pattern | S:90 R:90 A:90 D:85 |
| 9 | Confident | Whimsy copy for ls -l/du/df (7.0K sizes, 49K shll, 87% plans) and authentic error strings as specified | Copy is fully reversible; tone-matched to the o33t roster | S:65 R:95 A:80 D:70 |
| 10 | Certain | change_type = feat | Purely additive capability | S:90 R:90 A:90 D:90 |

10 assumptions (4 certain, 5 confident, 0 tentative, 1 unresolved).
