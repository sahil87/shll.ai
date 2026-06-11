# Intake: Terminal Tool-Name Commands

**Change**: 260611-37ng-terminal-tool-name-commands
**Created**: 2026-06-11
**Status**: Draft

## Origin

> Typing a bare tool name in the homepage terminal prints that tool's card — mechanically sourced from `help/<tool>.json`. Today `ls` advertises the seven tools but typing `hop` dead-ends in command-not-found — the funnel's hottest path fails.

Successor to change `cdbr` (full-roster cheatsheet, complete + merged), which grew `COMMANDS` to 52 keys. This intake came out of a conversation with the user; **the user approved the recommended design** — every numbered decision below was made there. User decisions, verbatim intent:

1. **Tool card output** for the six non-shll tools (`idea`, `hop`, `fab-kit`, `wt`, `run-kit`, `tu`), per the approved mock (§1): first line `{tool} — {root.short}` from the help json (NOT the hand-written `SYNOPSIS` — vn39-clean), dim usage line, indented padded subcommand lines, nav line with real anchors, subcommand cap as a named constant (suggest 8) with a dim `(+N more — see commands)` tail.
2. **Data path is build-time, zero runtime fetches** (Constitution I): `TerminalPrompt.astro` gains build-time frontmatter reading repo-root `help/*.json` (the VersionTable ascend-resolution + schema approach) and emits ONE `<script type="application/json">` element in its template; the island parses it at activation (the `versionRowsHtml` DOM-capture precedent). `index.mdx` completely untouched. Graceful degrade per tool: missing/invalid json → card falls back to the existing `SYNOPSIS` line + nav line only.
3. **`shll` keeps its splash** (brand moment) and gains the same nav line appended.
4. **Aliases**: `rk` → run-kit, `fab` → fab-kit — new `COMMANDS` keys behaving identically, folded via `CHEATSHEET_ALIASES` so the sheet shows e.g. `run-kit · rk`.
5. **Args**: `hop <sub>` — if `<sub>` matches a `commands[].name` in the json, print that one subcommand line + a see-more link to the commands page; otherwise print the full card. Never pretend to execute anything.
6. **Division of labor unchanged**: bare name informs (no navigation); `cd hop` keeps navigating with the cuur beat. `cd`/`open`/`man`/`install` untouched.
7. **Cheatsheet integration**: new group `tools` placed first (before `navigate`) listing the six new keys with aliases folded; `shll` STAYS in `classics` (its behavior is the splash, distinct).
8. **`HELP_DETAIL` entries** for all new keys incl. aliases (man/Tab/suggester pickup automatic). The top-level `help` list stays byte-identical (standing rule).
9. **Pure logic extracted**: `src/lib/terminal-toolcard.ts` (`buildToolCard(doc, opts)` returning line descriptors from a parsed help doc) + `scripts/terminal-toolcard.test.mjs`.
10. **Standing invariants**: `index.mdx` byte-identical; `.shell-*` classes only; exactly-one-trailing-prompt; zero new deps; new keys appended after existing; `Object.hasOwn` for user-keyed lookups; house comments referencing this change id.
11. **Verification**: the four green existing suites + the new one + `pnpm build` from `sites/astro-starlight-terminal1/`; parse-help's 3 pre-existing failures out of scope.

## Why

1. **The pain point.** The funnel's hottest path fails. `ls` is the most-advertised command (the greeting, the ghost hint, a chip) and it prints the seven tool names as links — so the single most natural next keystroke is a tool's name itself. Today six of those seven dead-end: `hop` → `command not found: hop — type 'help'`. The one that works (`shll`) proves the expectation is right — the terminal already answers a bare brand name with a rich card. A visitor who follows the site's own invitation hits the only rude wall left in a surface five changes have polished (`n23o`/`23xc`/`by18`/`cuur`/`o33t`/`cdbr`).

2. **If we don't.** The terminal keeps converting curiosity into a not-found error at exactly the moment a visitor expresses interest in a *specific tool* — the highest-intent signal the homepage gets. `man hop` and `cd hop` exist, but nothing teaches a newcomer to type them first; the natural probe is the name. Every future visitor repeats the same dead end.

3. **Why this approach.** A bare tool name should *inform, in place* — a card, not a navigation (navigation stays `cd`'s job; yanking the page on a probe repeats the misclick-feel `cuur`'s nav beat was built to fix). Sourcing the card **mechanically from `help/<tool>.json`** keeps it vn39-clean by construction: the subcommand names and shorts are the tool's own captured `-h` output (the same single source `VersionTable`, `CommandReference`, and `CommandIndex` already trust), so the card can never cite a command the tool doesn't have, and tool releases flow through on the next scheduled pull + rebuild with zero site edits. Build-time read + one embedded JSON element keeps Constitution I intact — no runtime fetch, output fully static. Six new keys + two aliases ride the existing dispatch plumbing (Tab, suggester, `help <cmd>`, `man <cmd>`, cheatsheet) with near-zero wiring, the dividend of the cuur/o33t/cdbr conventions.

## What Changes

Edits live in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` (frontmatter + template + island), plus one new lib module + one new test file (§5). Invariants that MUST survive untouched (the standing set): **exactly-one-trailing-prompt** (handlers return plain `Line[]` through the normal `print` path — no new prompt-emitting path), **progressive enhancement** (`index.mdx` stays completely untouched — the JSON element lives in the component's own template), **`.shell-*` classes only** (no new CSS; `terminal.css` untouched), **zero new dependencies**, **new keys appended after all existing keys** (after `cheatsheet`, in BOTH `COMMANDS` and `HELP_DETAIL` — the suggester tie-break convention), and the **`Object.hasOwn` own-property guard** on any record lookup keyed by user input.

### 1. The tool card — output shape (user-approved mock)

Typing a bare tool name (or its alias) prints that tool's card. The approved mock for `hop`:

```
hop — locate, open, and operate on repos from hop.yaml.
usage: hop [flags]

  add         register on-disk repos into hop.yaml
  clone       git clone the resolved repo, an ad-hoc URL, or all
  ls          list all repos as aligned name/path columns
  ...

docs: /tools/hop/overview · readme · commands     get it: install
```

Line by line, all mechanically sourced from the tool's help doc:

- **Header** (`shell-out`): `{tool} — {root.short}` — `root.short` from the json, NOT the hand-written `SYNOPSIS` map (vn39-clean: the json IS the captured `-h` output; `SYNOPSIS` remains `man`/`cd`'s voice, untouched).
- **Usage** (`shell-out shell-dim`): `usage: {root.usage}`.
- **Blank line**, then **one line per subcommand** (`shell-out`): two-space indent, `commands[].name` padded to a named column width, then that entry's `short`, truncated with a trailing ellipsis to respect the established ~76-char width budget (the `CHEAT_LINE_WIDTH = 74` + 2-space-indent precedent — long lines clip into horizontal scroll under the session's `white-space: pre`). All widths/caps are named constants.
- **Subcommand cap**: a named constant (`TOOLCARD_SUB_CAP`, suggest 8); when `commands[]` exceeds it, the listing stops at the cap and a dim `(+N more — see commands)` tail line follows. Real counts today: idea 9, hop 7, fab-kit 17, wt 5, run-kit 10, tu 0, shll 7 — the producers already filter Cobra's `completion`/`help` boilerplate out of `commands[]`, so no site-side filtering is needed. `tu` (zero subcommands) renders header + usage + nav line only — no empty block, no `(+0 more)`.
- **Blank line**, then the **nav line** (`shell-out shell-dim`, `html: true` — the trusted-static-string pattern of `man`/`ls`): `docs: <a>/tools/{tool}/overview</a> · <a>readme</a> · <a>commands</a>     get it: <a>install</a>` — real anchors to `ROUTE_OVERVIEW(tool)`, `/tools/{tool}/readme/`, `/tools/{tool}/commands/`, and `ROUTE_INSTALL`. All three per-tool pages exist for all seven tools (verified).

All card lines are announced — static meaningful text through the normal `print` path, no `ariaHidden` (the cheatsheet/`tail` precedent for announced content).

### 2. Build-time data path — zero runtime fetches (Constitution I)

`TerminalPrompt.astro`'s frontmatter (today comment-only) gains a build-time read:

- Resolve the repo root by ascending from `import.meta.url` via the shared `repoRootFromModuleUrl` (`src/lib/repo-root.ts` — the VersionTable/CommandReference precedent; a fixed `../..` depth breaks under Vite bundling).
- For each of the six tools, read `help/<slug>.json` and validate against `HelpDocSchema` (`src/lib/schemas.ts`, `z` from `astro:content` — fine in frontmatter, NOT importable by the dependency-free lib or its node test).
- **Slim the payload**: embed only what the card needs per tool — `{ short, usage, commands: [{ name, short }] }`, keyed by tool slug. The `text` fields are KBs each (hop's alone is ~4KB); embedding full docs would bloat every homepage load for data the card never renders.
- Emit ONE `<script type="application/json" data-terminal-help>` element in the component template (the component renders inside `index.mdx` already — its own template growing a data element leaves `index.mdx` byte-identical). The island locates it by the data attribute and `JSON.parse`s at activation — the `versionRowsHtml` capture-at-init precedent: build-time truth, island snapshot, no drift.
- **Graceful degrade per tool** (user decision): a missing or schema-invalid `help/<slug>.json` is skipped — omitted from the payload — and that tool's card falls back to the existing `SYNOPSIS` line + nav line only. Deliberate contrast with `VersionTable`'s build-stop: VersionTable already build-stops on any missing/invalid rostered doc, so it remains the build's defect gate and the terminal's per-tool degrade can never mask a committed defect; the island additionally guards the parse (absent element / malformed JSON → empty record, the try/catch-degrade discipline of the sessionStorage history). This is a **third rendering consumer** of `help/*.json` (after CommandReference/CommandIndex and VersionTable) — recorded in `conventions/help-collection` memory.

Mechanical normalization (pure transforms of json data — still vn39-clean, no hand-written prose):

- `tu`'s `root.usage` is `"Usage: tu [source] [period] [display]"` — strip a leading `Usage:` prefix (case-insensitive) before prefixing our own `usage:`, avoiding `usage: Usage: tu …`.
- `run-kit`'s `root.short` is `"rk — tmux session manager with web UI"` — strip a redundant leading `{doc.tool} — ` (the binary's own name) so the header doesn't read `run-kit — rk — tmux …`.

### 3. New `COMMANDS` keys — six tools + two aliases (52 → 60)

Appended after `cheatsheet` (the last existing key), in canonical `TOOLS` order then aliases: `idea`, `hop`, `fab-kit`, `wt`, `run-kit`, `tu`, then `rk`, `fab`. One shared handler factory (the `editorHandler`/`denyNetwork` precedent — eight keys, one body, no drift); `rk`/`fab` dispatch identically to their primary and print the primary's card (no per-alias variant). `shll` is NOT one of them: its existing splash handler stays (brand moment) and gains the same nav line appended after the tip line (decision 3) — the one edit to an existing handler.

**Subcommand argument** (`hop <sub>`): the handler lowercases the first arg and matches it against the doc's `commands[].name`. On a match: print that ONE subcommand line (same padded shape) + a dim see-more link to `/tools/{tool}/commands/`. No match, or no args: the full card. Never pretend to execute anything — the card informs; nothing navigates, no timer, no nav beat (decision 6: bare name informs; `cd hop` keeps the cuur beat; `cd`/`open`/`man`/`install` and `TOOL_ARG_COMMANDS` all untouched — `man hop` still prints the hand-written `SYNOPSIS`, tools keep precedence there).

Zero-wiring pickups, automatic via `Object.keys(COMMANDS)`: Tab-completion (first token), the did-you-mean suggester (`hpo` → `did you mean 'hop'?`), and the cheatsheet's runtime coverage check. `man rk` / `man fab` answer from `HELP_DETAIL` via the o33t bridge (not in `TOOLS`, falls through). The empty-prompt Tab dump grows by eight tokens and otherwise stays as-is.

### 4. Cheatsheet + `HELP_DETAIL` integration

- **New cheatsheet group `tools`, placed FIRST** (before `navigate`) in `CHEATSHEET_GROUPS`: entries `idea`, `hop`, `fab-kit` (display `fab-kit · fab`), `wt`, `run-kit` (display `run-kit · rk`), `tu`. `CHEATSHEET_ALIASES` gains `rk: 'run-kit'` and `fab: 'fab-kit'` — the aliases are covered, never listed on their own, and the decorated display teaches both names (the cdbr `cd · open` adjacency, alias-folded). `shll` STAYS in `classics` — its behavior is the splash, distinct from the cards. The cdbr anti-drift contract is exactly why this grouping must ship in the same change: forgetting it would surface all eight keys under `uncategorized` at runtime — honest, but sloppy.
- **`HELP_DETAIL` entries for all eight new keys** (appended after `cheatsheet`'s, the last entry), the established `helpDetail(usage, detail)` shape — so `help hop`, `man rk`, Tab, and the suggester all work with zero extra wiring. Alias entries point at their primary (`rk — run-kit's card, by its binary name` shape; exact copy tone-matched at apply).
- **The bare `help` output changes NOT AT ALL this time** — not the curated 13-command list, not the cdbr footer tip. The new keys are unlisted, organically discovered (the standing eggs-stay-unlisted ethos; the cheatsheet's `tools` group is their sanctioned reveal). `CHIP_COMMANDS`, the greeting, and the ghost hint: all unchanged.

### 5. Pure-logic extraction — `src/lib/terminal-toolcard.ts`

The suggest/eggs/cheatsheet pattern a fourth time: dependency-free pure logic in `src/lib/` (Vite bundles it into the island; no `astro:content` import — the lib takes plain parsed data), pinned by `sites/astro-starlight-terminal1/scripts/terminal-toolcard.test.mjs` under `node --test` with native TS type-stripping. Proposed surface (final signatures implementer-final):

```ts
export type ToolHelpDoc = { short?: string; usage?: string; commands?: { name?: string; short?: string }[] };
export function buildToolCard(tool: string, doc: ToolHelpDoc, opts?: { subCap?: number; width?: number; nameCol?: number }):
  { kind: 'header' | 'usage' | 'blank' | 'sub' | 'more'; text: string }[];   // line descriptors, no HTML/classes
export function findSubcommand(doc: ToolHelpDoc, name: string): { name: string; short: string } | null;
```

The lib owns: header/usage assembly incl. the §2 normalizations, name padding, short truncation with ellipsis, the subcommand cap + `+N` more-count, and **missing-fields tolerance** (absent `short`/`usage`/`commands` degrade to omitted lines, never a crash — the slim payload crosses a JSON boundary, so the lib trusts nothing). The island keeps the const data, the route anchors, the nav/see-more lines (`html: true` assembly stays where the routes live — the cheatsheet division of labor), and the `Line[]` class mapping. Tests pin: the full card shape from a fixture doc, short truncation at the budget, cap + more-tail arithmetic, zero-subcommand and missing-fields tolerance (`tu`'s empty `commands`, absent shorts), the `Usage:`/`{tool} — ` normalizations, and the subcommand-arg lookup (hit, miss, case).

### Out of scope

- Any change to `help` output (none this time — the cdbr footer splice stays the one sanctioned change, untouched).
- `cd`/`open`/`man`/`install`, `TOOL_ARG_COMMANDS`, the nav beat: all untouched; no second-token Tab completion for the new keys.
- Flags rendering, recursive subcommand trees (`commands[].commands` not rendered), any `parse-help.ts` structured parsing — the card uses only `short`/`usage`/`commands[].{name,short}`.
- Sourcing `shll`'s splash from json (it keeps the hand-written splash; only the nav line is appended).
- The pipes/VFS draft `260610-42my`; parse-help's 3 pre-existing test failures.

## Affected Memory

- `site/homepage-terminal`: (modify) — site-local memory tree (`sites/astro-starlight-terminal1/docs/memory/`). Add: the bare-tool-name card (mechanically sourced, the funnel fix), the build-time frontmatter → embedded-JSON → island-parse data path, the per-tool graceful degrade, the `rk`/`fab` aliases, the `tools` cheatsheet group, the `terminal-toolcard.ts` lib + test. Extend Requirements + Changelog.
- `conventions/help-collection`: (modify) — record the third rendering consumer (TerminalPrompt.astro build-time frontmatter: slim embedded payload, per-tool graceful degrade vs. VersionTable's build-stop) in the consumers section + Changelog.

## Impact

- `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` — frontmatter build-time read (repo-root ascent, `HelpDocSchema`, slim payload); the `<script type="application/json" data-terminal-help>` template element; island: payload parse at activation, eight new `COMMANDS` keys + shared handler factory, eight `HELP_DETAIL` entries, the `tools` cheatsheet group + alias declarations, the `shll` nav-line append, named constants (`TOOLCARD_SUB_CAP` etc.).
- `sites/astro-starlight-terminal1/src/lib/terminal-toolcard.ts` — new (card assembly, truncation, cap, normalization, tolerance, sub-lookup pure logic).
- `sites/astro-starlight-terminal1/scripts/terminal-toolcard.test.mjs` — new `node --test` suite.
- No CSS, no `index.mdx`, no build/config/workflow changes; no other pages affected.
- Verification: `node --test` on the four green suites (terminal-suggest, terminal-eggs, terminal-cheatsheet, extract-readme) + the new suite, and `pnpm build`, all from `sites/astro-starlight-terminal1/` (the build also exercises the new frontmatter against the real `help/*.json`). parse-help's 3 pre-existing failures are out of scope.

## Open Questions

*(none — the card shape, data path, aliases, arg behavior, division of labor, cheatsheet/help integration, extraction, invariants, and verification were all decided with the user; the remaining fill-ins scored Confident and are recorded below for `/fab-clarify` review)*

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Bare tool name prints that tool's card for the six non-shll tools, mechanically sourced from `help/<tool>.json`; header is `{tool} — {root.short}`, NOT the hand-written `SYNOPSIS` (vn39-clean) | Discussed — user approved | S:95 R:85 A:90 D:90 |
| 2 | Certain | Card shape per the approved mock: header, dim `usage:` line, indented padded subcommand lines (`name` + `short`, ellipsis-truncated to the ~76-char budget), named-constant cap (suggest 8) with dim `(+N more — see commands)` tail, nav line with real overview/readme/commands/install anchors | Discussed — user approved the mock | S:95 R:90 A:90 D:90 |
| 3 | Certain | Build-time data path: frontmatter reads repo-root `help/*.json` (ascend + schema, the VersionTable approach), ONE `application/json` template element, island parses at activation (`versionRowsHtml` precedent); `index.mdx` completely untouched; per-tool graceful degrade → `SYNOPSIS` line + nav line only | Discussed — user approved (Constitution I) | S:95 R:85 A:90 D:90 |
| 4 | Certain | `shll` keeps its splash (brand moment) and gains the same nav line appended | Discussed — user approved | S:95 R:95 A:90 D:90 |
| 5 | Certain | Aliases `rk` → run-kit and `fab` → fab-kit as new `COMMANDS` keys behaving identically (primary's card), folded via `CHEATSHEET_ALIASES` so the sheet shows `run-kit · rk` / `fab-kit · fab` | Discussed — user approved | S:95 R:90 A:90 D:90 |
| 6 | Certain | `hop <sub>`: arg matching a `commands[].name` prints that one subcommand line + a see-more link to the commands page; otherwise the full card; never pretends to execute | Discussed — user approved | S:90 R:90 A:90 D:90 |
| 7 | Certain | Division of labor unchanged: bare name informs in place (no navigation, no timer); `cd hop` keeps the cuur beat; `cd`/`open`/`man`/`install` and `TOOL_ARG_COMMANDS` untouched | Discussed — user approved | S:95 R:90 A:90 D:90 |
| 8 | Certain | Cheatsheet: new `tools` group placed FIRST (before `navigate`) with the six keys, aliases folded; `shll` stays in `classics`; the cdbr anti-drift contract makes proper grouping mandatory (else `uncategorized`) | Discussed — user approved | S:95 R:90 A:90 D:90 |
| 9 | Certain | `HELP_DETAIL` entries for all eight new keys incl. aliases (help/man/Tab/suggester pickup automatic); bare `help` output byte-identical — zero help changes this time | Discussed — user approved; the standing eggs-stay-unlisted ethos | S:95 R:90 A:90 D:90 |
| 10 | Certain | Pure logic extracted to `src/lib/terminal-toolcard.ts` + `scripts/terminal-toolcard.test.mjs` (node --test) pinning card shape, truncation, cap + more-tail, missing-fields tolerance, subcommand-arg lookup | Discussed — user approved; the suggest/eggs/cheatsheet pattern | S:90 R:90 A:90 D:90 |
| 11 | Certain | Standing invariants: `index.mdx` byte-identical (whole file untouched); `.shell-*` classes only (no new CSS); exactly-one-trailing-prompt (plain `Line[]`, no new prompt-emitting path); zero new deps; new keys appended after `cheatsheet` in both records; `Object.hasOwn` on user-keyed lookups; house comments referencing change `37ng` | Discussed — user approved; the standing set restated in every terminal change | S:95 R:85 A:90 D:90 |
| 12 | Certain | Verification: the four green `node --test` suites + the new one + `pnpm build` from `sites/astro-starlight-terminal1/`; parse-help's 3 pre-existing failures out of scope | Discussed — user approved; cuur/o33t/cdbr precedent | S:90 R:85 A:90 D:90 |
| 13 | Certain | change_type = feat (new capability; nothing repaired or restructured) | Explicitly set; plainly additive feature work | S:90 R:90 A:90 D:90 |
| 14 | Confident | Named-constant fill-ins: `TOOLCARD_SUB_CAP = 8` (user's suggestion adopted), subcommand name column 12, line budget 76 total (the `CHEAT_LINE_WIDTH` + indent precedent); exact nav-line/see-more/`HELP_DETAIL` copy tone-matched at apply | Implementer-final per user delegation; all trivially tunable data | S:70 R:95 A:85 D:75 |
| 15 | Confident | Slim build-time payload: only `{ short, usage, commands[].{name,short} }` per tool, keyed by slug — never the full `HelpDoc` (the `text` fields are KBs each; the card renders none of it) | One obvious interpretation of the build-time decision; page-weight | S:70 R:90 A:90 D:80 |
| 16 | Confident | Mechanical normalization in the lib: strip a leading `Usage:` from `root.usage` (tu's doc carries one) and a redundant leading `{doc.tool} — ` from `root.short` (run-kit's `"rk — …"`) — pure transforms of json data, vn39-clean | Grounded in the real committed docs; without it two of six cards render visibly broken | S:70 R:90 A:85 D:75 |
| 17 | Confident | Degrade mechanics: frontmatter skips a tool on missing/invalid json (per-tool, non-fatal — VersionTable stays the build's defect gate for all seven docs, so the degrade can't mask a committed defect); island guards the element parse (absent/malformed → empty record, the sessionStorage try/catch discipline) | Follows decision 2's graceful-degrade intent; the mechanism is the only sensible split | S:70 R:90 A:85 D:75 |
| 18 | Confident | Key order + handler shape: six tools in canonical `TOOLS` order then `rk`, `fab`; one shared handler factory (the `editorHandler`/`denyNetwork` precedent); roster grows 52 → 60 | Append-after-existing convention + the established alias-handler precedent | S:70 R:90 A:90 D:80 |

18 assumptions (13 certain, 5 confident, 0 tentative, 0 unresolved).
