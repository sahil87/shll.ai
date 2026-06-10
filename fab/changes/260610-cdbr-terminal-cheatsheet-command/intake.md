# Intake: Terminal Cheatsheet Command

**Change**: 260610-cdbr-terminal-cheatsheet-command
**Created**: 2026-06-10
**Status**: Draft

## Origin

> Add a `cheatsheet` command to the homepage terminal — the full-roster reveal: grouped categories, a `CHEATSHEET_GROUPS` anti-drift const, and the one sanctioned `help`-footer pointer.

Successor to change `o33t` (GNU-utils delight pass, merged as PR #55), which grew `COMMANDS` to 51 keys — all but 13 of them unlisted easter eggs. This intake came out of a conversation with the user on 2026-06-10; **everything below was decided there** (the user explicitly selected the output preview in §1). User decisions, verbatim intent:

1. **The command**: `cheatsheet` is the deliberate full-roster reveal. Today the only complete reveal is empty-prompt Tab — one undifferentiated ~51-key line, accidental and unexplained — while `help` shows only the curated 13 + the curiosity teaser.
2. **Output shape**: user-approved preview (§1), adapted to the real post-o33t roster — opening line `the full roster — you found it.`, five named groups (`navigate` / `look around` / `do things (try to)` / `classics` / `real utilities`), each a dim category header + indented ` · `-separated command lines, closing line `(each one: help <command>)`.
3. **Anti-drift mechanism**: group membership lives in one `CHEATSHEET_GROUPS` const beside `COMMANDS`; the handler computes at runtime any `COMMANDS` keys missing from all groups (and not declared alias-of) and appends them under an `uncategorized` group — a future command can never silently vanish from the sheet. Keys listed in groups but absent from `COMMANDS` are dropped at render (stale-entry tolerance).
4. **Discovery wiring**: the bare `help` footer tip is THE one sanctioned change to `help` output — keep the curiosity tease, append the pointer `— or type 'cheatsheet' for everything.` The new command gets a `HELP_DETAIL` entry (and thus `man cheatsheet` via the o33t bridge, for free).
5. **Coverage rule**: EVERY `COMMANDS` key is covered exactly once; aliases render with their primary and are not double-listed (`cd · open`, `vim · vi`, `less · more`, `curl · wget`, `exit · :q`, `true · false` can pair); the five category names are fixed. Exact group membership is implementer-final within those constraints.

## Why

1. **The pain point.** The `help` footer has teased "a few commands aren't on this list. a curious dev might try the obvious ones." since `9vbo` — and after `o33t` the tease undersells reality by an order of magnitude: 38 of 51 keys are unlisted. The only way to see everything is Tab on an empty prompt, which dumps one undifferentiated wrapped line of 51 tokens — accidental (it exists because completion candidates are `Object.keys(COMMANDS)`), unexplained (no grouping, no categories, no hint of what any key does), and undiscoverable (nothing points at it). A visitor who enjoyed two or three eggs has no sanctioned way to find out how deep the rabbit hole goes.

2. **If we don't.** The discovery ethos stays half-built: organic discovery works for the first few eggs, but the long tail (`classifyTar`'s xkcd gauntlet, `sha256sum`'s real hashing, the rm-deluxe) stays effectively invisible to anyone who doesn't brute-force the roster. The o33t investment under-converts, and every future egg makes the undifferentiated Tab dump marginally worse as the de-facto index.

3. **Why this approach.** A `cheatsheet` command is the terminal-native answer (real shells have `tldr`/`cheat`); it preserves the discovery ethos — the bare `help` list stays the curated 13 and the eggs stay unlisted there; the full roster lives behind a command you either guess or are pointed to by the footer tip. The grouped shape turns the dump into a map (what's navigation, what's an egg category). The `CHEATSHEET_GROUPS` + runtime-uncategorized design makes the sheet structurally drift-proof: forgetting to categorize a future command degrades to an honest `uncategorized` listing, never a silent omission. One handler returning `Line[]` — no stream, no nav, no new CSS, zero new dependencies (Constitution VI), dark/light parity free via existing `.shell-*` classes (Constitution V).

## What Changes

All edits live in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro`, plus one new lib module + one new test file (§3). Invariants that MUST survive untouched (the o33t set): **exactly-one-trailing-prompt** (the handler returns `Line[]` through the normal `print` path — no new prompt-emitting path), **progressive enhancement** (the static `<pre class="shell-session">` in `index.mdx` stays byte-identical — no `index.mdx` changes), **`.shell-*` classes only** (no new CSS), **zero new dependencies**, **new keys appended after all existing keys** (in both `COMMANDS` and `HELP_DETAIL`, after `tail` — the suggester tie-break convention), and the **`Object.hasOwn` own-property guard** where applicable.

### 1. The `cheatsheet` command — output shape (user-approved preview)

Adapted to the real 51-key post-o33t roster (+ `cheatsheet` itself = 52). Target output:

```
$ cheatsheet
the full roster — you found it.

navigate
  ls · cd <tool> · open · install · version · theme · clear · history · help · cheatsheet

look around
  pwd · uname · id · date · uptime · env · ps · whoami

do things (try to)
  rm · mkdir · touch · mv · cp · chmod · chown · sudo · kill · curl · wget

classics
  make plan · diff plan reality · tar · vim · emacs · nano · less · yes · sl
  tail -f agents.log · fortune · true · false · exit · shll

real utilities
  echo $VAR · seq · grep <pattern> · sha256sum <text> · man <thing>

(each one: help <command>)
```

Line classes: opening line `shell-out`; each category header `shell-out shell-dim`; command lines `shell-out`, two-space indented, entries joined with ` · `; closing line `shell-comment`. A group MAY span multiple indented lines — entries are chunked to a line-width budget so long groups (classics) don't clip into horizontal scroll under the session's `white-space: pre` (the `GREETING` length concern, same reasoning; exact budget implementer-final, ~76 chars).

**Coverage accounting** (every key exactly once):

| Group | Keys covered | Count |
|---|---|---|
| `navigate` | help, ls, cd, open, install, version, theme, history, clear, **cheatsheet** | 10 |
| `look around` | pwd, uname, id, date, uptime, env, ps, whoami | 8 |
| `do things (try to)` | rm, mkdir, touch, mv, cp, chmod, chown, sudo, kill, **curl, wget** | 11 |
| `classics` | make, diff, tar, vim (+`vi` alias), emacs, nano, less (+`more` alias), yes, sl, tail, fortune, true, false, exit (+`:q` alias), shll | 18 |
| `real utilities` | echo, seq, grep, sha256sum, man | 5 |

Total: 52. Fill-ins relative to the user's preview (which covered 47 of the then-51 keys): `curl · wget` join `do things (try to)` — they try to do network things and get refused, exactly like the file-op refusals beside them; `true · false` join `classics` as a displayed pair (the silent classic); `cheatsheet` lists itself in `navigate` after `help` (a key must be covered somewhere; `help` lists `help`, same logic). <!-- assumed: none — group placement is the implementer-final knob the user delegated; these three placements are recorded as Confident assumption #10 -->

**Alias handling**: `vi`, `more`, and `:q` do NOT display — they are declared alias-of (`vi → vim`, `more → less`, `:q → exit`) and covered by their primary's entry. `cd · open`, `curl · wget`, and `true · false` display both names adjacent (as the user's preview does for `cd <tool> · open`). Display strings may decorate beyond the bare key (`cd <tool>`, `make plan`, `diff plan reality`, `tail -f agents.log`, `echo $VAR`, `grep <pattern>`, `sha256sum <text>`, `man <thing>`) — the decoration teaches the interesting invocation, per the preview.

### 2. Anti-drift mechanism — `CHEATSHEET_GROUPS` + runtime `uncategorized`

One const beside `COMMANDS` (next to `FAKE_ENV`/`CHIP_COMMANDS`, the named-constant convention), proposed shape (exact data structure implementer-final; the contract below is not):

```ts
type CheatEntry = { key: string; display?: string };           // display defaults to key
const CHEATSHEET_GROUPS: { name: string; entries: CheatEntry[] }[] = [
  { name: 'navigate', entries: [{ key: 'ls' }, { key: 'cd', display: 'cd <tool>' }, { key: 'open' }, /* … */] },
  /* look around · do things (try to) · classics · real utilities */
];
const CHEATSHEET_ALIASES: Record<string, string> = { vi: 'vim', more: 'less', ':q': 'exit' };
```

Handler contract (the heart of the change):

1. **Coverage computation at runtime**: `covered` = all group entry keys ∪ `CHEATSHEET_ALIASES` keys. `missing` = `Object.keys(COMMANDS)` not in `covered`. If non-empty, append a final group `uncategorized` listing the missing keys (bare, declaration order) — a future `COMMANDS` key can never silently vanish from the sheet; forgetting to categorize degrades to an honest listing, never an omission.
2. **Stale-entry tolerance**: a group entry whose key is not an own key of `COMMANDS` is dropped at render (membership test via `Object.hasOwn(COMMANDS, key)` — the o33t idiom; the keys here are our own const data, not user input, but one idiom everywhere).
3. Render per §1: opening line, groups in declared order (+ `uncategorized` last when non-empty), closing line. Plain `Line[]` return — all lines announced by the cuur live region (static meaningful text, no `ariaHidden` needed; the `tail` precedent for announced content).

### 3. Pure-logic extraction — `src/lib/terminal-cheatsheet.ts`

The coverage/alias/stale-drop computation and the width-budget chunking are pure logic — extracted to a new dependency-free `sites/astro-starlight-terminal1/src/lib/terminal-cheatsheet.ts` (Vite bundles it into the island), pinned by `sites/astro-starlight-terminal1/scripts/terminal-cheatsheet.test.mjs` under `node --test` with native TS type-stripping — the exact `terminal-suggest.ts` / `terminal-eggs.ts` pattern. Proposed surface (final signatures implementer-final):

```ts
export type CheatGroup = { name: string; entries: { key: string; display?: string }[] };
export function buildCheatsheet(
  groups: CheatGroup[],
  aliases: Record<string, string>,
  commandKeys: string[],
): { name: string; displays: string[] }[];   // stale-dropped, uncategorized appended
export function chunkLine(tokens: string[], sep: string, maxWidth: number): string[];
```

Tests pin: full coverage → no `uncategorized`; an uncovered key → appears in `uncategorized`; alias-of keys not flagged missing; a stale group key dropped at render (and not crashing); `display` defaulting to `key`; chunking respects the width budget and never splits a token. The island keeps only the const data and the `Line[]` assembly.

### 4. Discovery wiring — the help footer + `HELP_DETAIL`

**The bare `help` footer tip is THE one sanctioned change to `help` output.** Current line:

```
tip: a few commands aren't on this list. a curious dev might try the obvious ones.
```

becomes (keep the tease, append the pointer — splicing at the period):

```
tip: a few commands aren't on this list. a curious dev might try the obvious ones — or type 'cheatsheet' for everything.
```

Same single `shell-comment` line. The curated 13-command list above it stays byte-identical — `cheatsheet` is NOT added to the list (it is the reveal, not a listed utility; the footer pointer is its discovery path, alongside guessing it).

**`HELP_DETAIL` entry** (appended after `tail`'s, the last entry):

```ts
cheatsheet: helpDetail(
  'cheatsheet — the full command roster, grouped',
  "everything, including what 'help' won't admit to.",
),
```

Detail-line copy is the implementer's craft (tone-match the existing entries); the usage-line shape (`name — description`) is the established convention. `man cheatsheet` works with zero wiring via the o33t `man → HELP_DETAIL` bridge (`cheatsheet` is not in `TOOLS`, so it falls through to the bridge); `help cheatsheet` resolves via `helpFor`; Tab-completion and the did-you-mean suggester pick the new key up automatically via `Object.keys(COMMANDS)` (`cheatshet` → `did you mean 'cheatsheet'?` for free).

### 5. Roster/discovery side effects (accepted, by design)

- `Object.keys(COMMANDS)` grows 51 → 52; the empty-prompt Tab dump gains one token and otherwise keeps its existing behavior — `cheatsheet` complements it as the designed reveal, it does not replace or modify it.
- `CHIP_COMMANDS`, the greeting, and the ghost hint: all unchanged.
- The `cheatsheet` key is appended after `tail` in BOTH `COMMANDS` and `HELP_DETAIL` (the o33t append-after-existing convention — the suggester's equal-distance tie-break keeps favoring established commands).

### Out of scope

- Any other change to `help` output (the footer tip splice is the entirety).
- Changing the empty-prompt Tab listing (stays as-is).
- New CSS, `index.mdx` edits, chip roster changes, per-command descriptions on the sheet (the sheet maps the territory; `help <command>` is the zoom — that's what the closing line teaches).
- Anything from the speculative pipes/VFS draft `260610-42my`.

## Affected Memory

- `site/homepage-terminal`: (modify) — site-local memory tree (`sites/astro-starlight-terminal1/docs/memory/`). Add: the `cheatsheet` command (the deliberate full-roster reveal vs. the accidental empty-Tab dump); the `CHEATSHEET_GROUPS`/`CHEATSHEET_ALIASES` anti-drift contract (runtime `uncategorized` for uncovered keys, stale-entry drop at render); the one-sanctioned-help-change footer splice; the `terminal-cheatsheet.ts` lib + test. Extend Requirements + Changelog.

## Impact

- `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` — `CHEATSHEET_GROUPS` + `CHEATSHEET_ALIASES` consts (beside the existing named-constant block); the `cheatsheet` `COMMANDS` entry appended after `tail`; the `HELP_DETAIL.cheatsheet` entry appended after `tail`'s; the one-line `help` footer tip splice; an import from `terminal-cheatsheet.ts`.
- `sites/astro-starlight-terminal1/src/lib/terminal-cheatsheet.ts` — new (coverage/alias/stale-drop + chunking pure logic).
- `sites/astro-starlight-terminal1/scripts/terminal-cheatsheet.test.mjs` — new `node --test` suite.
- No CSS, no `index.mdx`, no build/config/workflow changes; no other pages affected.
- Verification: `node --test scripts/*.test.mjs` (new + existing suites: terminal-suggest, terminal-eggs) + `pnpm build`, both from `sites/astro-starlight-terminal1/`.

## Open Questions

*(none — the command, output shape, anti-drift mechanism, discovery wiring, and invariants were all decided with the user; the remaining fill-ins scored Confident and are recorded below for `/fab-clarify` review)*

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Add a `cheatsheet` command as the deliberate full-roster reveal (today: only the accidental, undifferentiated empty-prompt Tab dump; `help` stays the curated 13) | Discussed — user approved | S:95 R:90 A:90 D:90 |
| 2 | Certain | Output shape: opening `the full roster — you found it.` (shell-out), five fixed category names (`navigate` / `look around` / `do things (try to)` / `classics` / `real utilities`) each a dim header + indented ` · `-joined command lines, closing `(each one: help <command>)` (shell-comment) | Discussed — user explicitly selected the output preview | S:95 R:90 A:90 D:90 |
| 3 | Certain | Anti-drift: membership in one `CHEATSHEET_GROUPS` const beside `COMMANDS`; handler computes uncovered keys (not declared alias-of) at runtime and appends them under `uncategorized`; group keys absent from `COMMANDS` dropped at render | Discussed — user approved the mechanism explicitly | S:95 R:85 A:90 D:90 |
| 4 | Certain | Coverage rule: every `COMMANDS` key covered exactly once; aliases render with their primary, never double-listed (cd·open, vim·vi, less·more, curl·wget, exit·:q, true·false may pair); exact membership implementer-final | Discussed — user approved, delegating final placement | S:90 R:85 A:90 D:85 |
| 5 | Certain | Discovery wiring: the bare `help` footer tip is THE one sanctioned help change — tease kept, pointer appended; `cheatsheet` gets a `HELP_DETAIL` entry (→ `man cheatsheet` via the o33t bridge, `help cheatsheet`, Tab + suggester all zero-wiring) | Discussed — user approved | S:95 R:90 A:90 D:90 |
| 6 | Certain | Invariants: `index.mdx` byte-identical; `.shell-*` classes only (no new CSS); exactly-one-trailing-prompt untouched (plain `Line[]` return, no new prompt-emitting path); zero new dependencies; new keys appended after existing keys; `Object.hasOwn` idiom where applicable | Discussed — user approved; the standing o33t invariant set restated in every terminal change | S:95 R:85 A:90 D:90 |
| 7 | Certain | Verification = existing `node --test` suites + new suite + `pnpm build` from `sites/astro-starlight-terminal1/` | Discussed — user approved; cuur/o33t precedent | S:90 R:85 A:90 D:90 |
| 8 | Certain | Sheet output is plain announced text — no `ariaHidden`, no stream, no nav; the cuur live region handles it as-is | Static meaningful listing the user explicitly asked to print; the announced-content `tail` precedent | S:85 R:90 A:90 D:85 |
| 9 | Certain | change_type = feat (new capability; nothing repaired or restructured) | Plainly additive feature work | S:90 R:90 A:90 D:90 |
| 10 | Confident | Group placement fill-ins: `curl · wget` → `do things (try to)` (refusals, like the file-ops beside them); `true · false` → `classics` (displayed pair); `cheatsheet` lists itself in `navigate` after `help` | Implementer-final per user delegation; placements follow each group's evident logic; trivially movable | S:70 R:95 A:85 D:75 |
| 11 | Confident | Alias fold set: `vi`/`more`/`:q` do not display (declared `CHEATSHEET_ALIASES` → vim/less/exit); cd·open, curl·wget, true·false display both adjacent (the preview's own cd·open treatment) | The preview omits vi/more/:q but shows open explicitly; the alias-of declaration is what the user-approved coverage computation requires | S:70 R:90 A:85 D:75 |
| 12 | Confident | Footer wording final form: one `shell-comment` line, splice at the period — `…the obvious ones — or type 'cheatsheet' for everything.` | User specified the appended fragment verbatim; the splice point is the only free choice | S:75 R:95 A:85 D:80 |
| 13 | Confident | Extraction IS warranted: coverage/alias/stale-drop + chunking go to `src/lib/terminal-cheatsheet.ts` + `scripts/terminal-cheatsheet.test.mjs` (the suggest/eggs pattern) | Implementer's call per user delegation; the anti-drift computation is exactly the pure-logic shape this codebase extracts and pins | S:70 R:90 A:85 D:75 |
| 14 | Confident | Render polish: groups chunk to a ~76-char width budget under `white-space: pre` (classics wraps to 2 lines); blank line between groups; exact `HELP_DETAIL` detail copy tone-matched at apply | Copy and spacing are fully reversible craft; width concern follows the documented GREETING precedent | S:65 R:95 A:80 D:70 |

14 assumptions (9 certain, 5 confident, 0 tentative, 0 unresolved).
