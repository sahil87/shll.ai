# Intake: run-kit Formula Rename Reference Sweep

**Change**: 260709-co63-run-kit-formula-rename
**Created**: 2026-07-09

## Origin

One-shot `/fab-new` invocation:

> the run-kit formula/binary was renamed from rk to run-kit (homebrew-tap: formula_renames.json maps rk->run-kit, Formula/rk.rb deleted, Formula/run-kit.rb 3.0.0 with rk kept as a symlink alias; run-kit repo v3.0.0 already made this switch, e.g. its own updater now targets sahil87/tap/run-kit). Find and update any references to the old rk formula/binary name, install instructions, docs, or fixtures in this repo (shll.ai) that need to reflect the rename, then run through the full fab pipeline including opening a PR.

**Verification performed at intake** (grounding for the facts below):

- `~/code/sahil87/run-kit` main (commit `04a9228` "fix: Swap Canonical CLI Name to run-kit (#333)", tag `v3.0.0`): root cobra command is now `Use: "run-kit"`, `Short: "run-kit — tmux session manager with web UI"` (still binary-prefixed — the `stripToolPrefix` transform stays necessary, its input just changes). `help-dump` derives the envelope `tool` field from `cmd.Name()`, so the next capture emits `tool: "run-kit"`, `root.name: "run-kit"`, and node paths like `"run-kit riff"`.
- run-kit's README v3.0.0 now writes `brew install sahil87/tap/run-kit` and uses `run-kit <cmd>` throughout, stating: "The formula also installs `rk` as a fully interchangeable short alias of `run-kit`" — the exact inversion of the pre-rename phrasing.
- This repo's committed corpus is still pre-rename: `help/run-kit.json` holds `tool: "rk"`, `version: v2.5.16`, `captured_at: 2026-07-09T10:31:48Z` (this morning's pull predated the tap flip); `content/run-kit/**` likewise still shows `brew install sahil87/tap/rk`.
- The live-site consumers are already self-adjusting: `stripToolPrefix(short, doc.tool)` reads the binary name from the JSON, and the vn39 divergence reporter derives `binary: doc.root.path`. The breakage surface is exclusively **hard-coded names**: the workflow `slug:formula:binary` triple, the fixture-refresh manifest, site-authored labels/prose, and spec/comment claims that "run-kit's formula/binary is `rk`".
- The live-site loop diagrams (`public/diagrams/loop-*.svg`) contain `rk` only in invisible mermaid node IDs (`flowchart-rk-11`); visible labels already say run-kit — no diagram edits needed.

## Why

Upstream renamed run-kit's canonical CLI + Homebrew identity from `rk` to `run-kit` (v3.0.0; `rk` survives as a brew-installed symlink alias, and homebrew-tap's `formula_renames.json` maps `rk → run-kit`). shll.ai — the toolkit's front door — hard-codes the old identity in several places:

1. **The daily help puller** (`refresh-help.yml`) installs `sahil87/tap/rk` and invokes `rk help-dump` via its `"run-kit:rk:rk"` triple. It currently keeps working only through brew's rename map and the compat symlink — the canonical formula file `Formula/rk.rb` no longer exists.
2. **The fixture re-freeze manifest** pins node path `rk riff`, which will not exist in the post-rename corpus (`run-kit riff`) — the next deliberate re-freeze would throw `node not found`.
3. **Hand-written site prose, the homepage install transcript, and the VersionTable label** teach visitors the now-non-canonical name, and will diverge from the pulled README/commands pages the moment the daily pullers refresh (run-kit's repo already uses `run-kit <cmd>` everywhere).
4. **Specs and code comments** assert "run-kit's formula is `rk`, NOT `run-kit`" as a load-bearing example of slug/formula/binary divergence — now factually wrong and actively misleading for future maintainers.

If we don't update: the site drifts against its own mechanically-synced content (the exact failure mode the vn39/anti-drift rules exist to prevent), and the first person to re-freeze fixtures or debug the puller inherits a stale-map surprise.

## What Changes

Reference updates only — **zero runtime behavior changes** (one display label, prose, comments, a manifest, a fixture rename, and workflow mapping strings). Canonical rule applied throughout: `run-kit` everywhere, except (a) the homepage terminal's deliberate alias affordances (the `rk` command key exists precisely to catch alias-typers — it stays, reframed as "short alias"), and (b) frozen fixture content (deliberately frozen specimens).

### 1. Puller workflows (`.github/workflows/`)

**`refresh-help.yml`**:
- The `slug:formula:binary` triple `"run-kit:rk:rk"` → `"run-kit:run-kit:run-kit"`.
- The comment block explaining the three-name distinction: the mapping table row `run-kit -> rk -> rk (formula is `rk`, NOT `run-kit`)` becomes `run-kit -> run-kit -> run-kit`, and the "conflating them is a real bug (run-kit's formula is `rk`, not `run-kit`)" parenthetical switches its divergence example to fab-kit (slug `fab-kit`, binary `fab` — still a real divergence). Optionally note run-kit's v3.0.0 rename (rk kept as symlink alias) so the history is discoverable.

**`refresh-readme.yml`**:
- The comment "(… run-kit's repo is `run-kit` even though its binary/formula is `rk`.)" is now stale — reword (e.g., drop the run-kit example or note that since v3.0.0 all three run-kit names align; fab-kit remains the slug≠binary example).

### 2. Live-site content pages (`sites/astro-starlight-terminal1/src/content/docs/`)

- **`getting-started/install.md`**: code block line `rk agent-setup` → `run-kit agent-setup`; prose paragraph "The `rk agent-setup` line above …", "`rk agent-setup --uninstall` removes exactly the rk-owned entries" → run-kit forms.
- **`workflows/daily-flow.md`**: `rk riff --skill /fab-fff` and `rk riff --skill /git-pr-review` → `run-kit riff …`; "You watch in `rk`'s browser dashboard" → `run-kit`'s; "`rk riff` agents in each" → `run-kit riff`.
- **`workflows/new-change.md`**: both `rk riff --skill /fab-fff` occurrences → `run-kit riff …`; heading `## Without \`rk\` (no dashboard)` → `## Without \`run-kit\` (no dashboard)`; "`rk` is convenience, not contract" → `run-kit`.
- **`tools/run-kit/overview.mdx`**: "`rk riff` spawns each parallel workspace …; `rk serve` opens the dashboard" → `run-kit riff` / `run-kit serve`.
- **`index.mdx`** (homepage static transcript): `==> [4/6] rk` → `==> [4/6] run-kit` (the transcript mimics `shll install` output, which prints formula names).

Note the vn39 cross-check window: the committed `help/run-kit.json` still says `rk` until the puller refreshes, so `run-kit riff` won't resolve against the *committed* corpus for up to a day. This is transient and mechanically un-gated for site prose (the CI reporter runs only on pulled READMEs); see §7 for the corpus-refresh step that closes the window.

### 3. Live-site components (`sites/astro-starlight-terminal1/src/components/`)

- **`VersionTable.astro`**: ROSTER entry `{ slug: 'run-kit', label: 'rk', … }` → `label: 'run-kit'` (`LABEL_COL = 9` accommodates the 7-char label — verify rendered alignment). Rewrite the doc comment ("its CLI + brew identity is `rk`, so the displayed label is `rk`") to reflect that CLI/brew/slug identities now all read `run-kit`, with `rk` as the typed short alias.
- **`ToolsIndex.astro`**: comments citing the "`rk` vs `run-kit` rule" ("use the FILE SLUG … not the binary `rk`") simplify — slug and binary now coincide; no code change.
- **`TerminalPrompt.astro`** (interactive island — alias affordances **stay**, descriptions flip):
  - Keep: the `rk` COMMANDS key, `rk: toolCardHandler('run-kit')` dispatch, `rk: 'run-kit'` alias-fold in the cheatsheet, `{ key: 'run-kit', display: 'run-kit · rk' }`, Tab-completion entries. The brew formula still installs the `rk` symlink, so alias-typers remain a real audience.
  - Update descriptive text only: the HELP_DETAIL entry `"rk — run-kit's card, by its binary name (alias of run-kit)"` → "…by its short alias"; its detail line "the same card — rk is what you actually type" → reframe (rk is the short alias; run-kit is canonical). Comments claiming "binary aliases (rk/fab)" → "short alias `rk` / binary `fab`" (fab genuinely remains fab-kit's binary; rk is now an alias). Comment "help/run-kit.json holds binary `rk`" → "held binary `rk` pre-v3.0.0; holds `run-kit` after the corpus refresh".
  - Demo/`play` script lines that *type* `rk …` may stay (legitimate alias usage), but any narration or simulated-output line presenting `rk` as the tool's name (e.g. "rk dashboard — 5 panes attached:") should use `run-kit`; sweep lines ~1041/1065 and the DEMO_SCRIPT narration for such claims during apply.
- **`astro.config.mjs`**: comment "Allow rk-proxy + Tailscale hostnames" → reword to run-kit's proxy (comment-only; verify the surrounding meaning at apply).

### 4. Scripts, fixtures, tests (`sites/astro-starlight-terminal1/scripts/`)

- **`refresh-help-fixtures.mjs`**: manifest entry `{ file: 'rk-riff.txt', doc: 'run-kit', path: 'rk riff' }` → `{ file: 'run-kit-riff.txt', doc: 'run-kit', path: 'run-kit riff' }`.
- **`git mv scripts/fixtures/rk-riff.txt scripts/fixtures/run-kit-riff.txt`** — content stays byte-identical (fixtures are *deliberately frozen* specimens; this one was captured at v2.5.3 and its text legitimately shows `rk riff`). The next deliberate re-freeze — only meaningful after the corpus refresh — picks up the run-kit-named node.
- **`parse-help.test.mjs`**: `fixture('rk-riff.txt')` → `fixture('run-kit-riff.txt')`; test title and header comment updated to name the new file (content expectations unchanged — they pin the frozen specimen).
- **`scripts/fixtures/README.md`**: provenance row updated to the new file name + node path, with a note that the frozen content predates the v3.0.0 rename (so its text shows `rk`) and will switch on the next deliberate re-freeze.
- **`llms.test.mjs` / `terminal-toolcard.test.mjs`**: `stripToolPrefix` is generic — keep coverage, but update the cases/comments that mirror run-kit's *real* `root.short` from `'rk — tmux session manager with web UI'` to `'run-kit — tmux session manager with web UI'` (v3.0.0 still binary-prefixes its short, so the transform remains live). Generic-input cases (e.g. the `'rkward stuff'` no-strip guard) stay as-is.

### 5. Code comments (no behavior change)

- **`src/lib/schemas.ts`** (`tool` field doc): example `("wt", "rk", "fab")` → `("wt", "run-kit", "fab")`.
- **`src/lib/llms.ts`** + **`src/lib/terminal-toolcard.ts`**: doc comments quoting run-kit's `root.short` as `"rk — tmux …"` → `"run-kit — tmux …"` (and the doubling example `[run-kit]: rk — tmux …` → `[run-kit]: run-kit — tmux …`).
- **`src/lib/parse-help.ts`** (4 comments) + **`src/components/CommandIndex.astro`** + **`src/components/CommandReference.astro`**: `rk riff` / `rk riff --layout` examples → `run-kit riff …`.

### 6. Specs (`docs/specs/`)

- **`help-dump-contract.md`**: envelope example comment `(wt, rk, fab)` → update; `"wt create" / "rk riff"` path examples and the two `rk riff` nested-subcommand scenario mentions → `run-kit riff`; the §"three names" paragraph (line ~166) rewritten — run-kit no longer diverges (note the v3.0.0 rename, `rk` kept as a brew-installed symlink alias); fab-kit (slug `fab-kit`, formula `fab-kit`, binary `fab`) becomes the divergence example; the teardown-block example binary list updated.
- **`readme-extraction-contract.md`**: §9 table row `| run-kit | rk | …` binary column → `run-kit`.

### 7. Puller-owned data — explicitly NOT hand-edited

`help/run-kit.json`, `help/shll.json`, `content/run-kit/**`, `content/shll/**` are owned by the daily pullers (direct-commit to main; constitution Tool-Page Depth: mechanically synced, never hand-copied). run-kit's repo + tap are already renamed, so the next scheduled runs (07:13 / 07:41 UTC) — or an on-demand dispatch — flip them. **Ship-stage step**: after the PR merges (the triple fix should land first so the help puller uses the canonical formula), dispatch both pullers: `gh workflow run refresh-help.yml --ref main` and `gh workflow run refresh-readme.yml --ref main`. shll's own `rk` mentions (its README/help roster output) live in the shll repo — out of scope here; they'll flow in via the same pullers when that repo updates.

### Non-goals

- `sites/astro-tailwind-terminal1/` and `sites/_playground/` — not deployed (constitution: one live site; playground never deploys). Their `rk` references stay; they're already stale in other respects and would be re-audited if ever promoted.
- `public/diagrams/loop-*.svg` — `rk` appears only in invisible mermaid node IDs; visible labels already read run-kit.
- `.claude/skills/**` — deployed via `fab sync` from fab-kit (fab-kit owns the "Run-Kit (rk) Reference" preamble section); not this repo's content.
- The shll tool's own roster output naming (`shll version` row text) — shll repo's concern.

## Affected Memory

- `conventions/tool-page-rubric`: (modify) — the jf3q "`rk` vs `run-kit`" naming rule inverts: binary + brew identity is now `run-kit` (with `rk` a typed short alias), so the rule collapses to "slug = binary = `run-kit` everywhere; the terminal's `rk` alias affordances are the deliberate exception". VersionTable label note updates.
- `conventions/help-collection`: (modify) — "`help/run-kit.json` (binary `rk`)" notes → binary `run-kit`; the producer-quirk note (binary-prefixed `root.short`) survives with the new prefix `"run-kit — "`; the per-tool pipeline note's slug/binary example updates; the refresh-help triple description updates.
- `conventions/seo-social-meta`: (modify) — verbatim `root.short` examples `"rk — tmux …"` → `"run-kit — tmux …"`; the SoftwareApplication `name` note simplifies (slug and binary now coincide).
- Site-scoped memory `sites/astro-starlight-terminal1/docs/memory/site/homepage-terminal.md` (outside `docs/memory/`, maintained alongside): the 37ng "binary aliases rk·fab" phrasing — reframe `rk` as short alias at hydrate if touched.

## Impact

- **Files hand-edited (~17)**: 2 GitHub workflows, 5 content pages, 3 components + `astro.config.mjs`, 4 lib/comment surfaces, 3 script/test files + 1 fixture rename + fixtures README, 2 specs.
- **Runtime surface**: one display-label change (`VersionTable` run-kit row) and terminal help-text strings; everything else is comments, prose, workflow mapping strings, and a test-fixture rename. No schema, parser, or component logic changes.
- **Tests**: `node --test` suites under `sites/astro-starlight-terminal1/scripts/` (parse-help, llms, terminal-toolcard, and the untouched suites) must stay green; parse-help's expectations are content-pinned to the frozen fixture, so the rename must not alter fixture bytes.
- **Build**: `pnpm build` in the live site consumes the *committed* (still pre-rename) corpus — unaffected by these edits.
- **Sequencing risk (accepted)**: between this PR merging and the next puller run, site prose says `run-kit <cmd>` while the committed corpus/readme pages still say `rk` — closed within a day by the scheduled pulls or immediately by the ship-stage dispatch.

## Open Questions

- None.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Canonical identity is now `run-kit` (formula + binary + root command), `rk` a brew-installed symlink alias; next help capture emits `tool: "run-kit"` and `run-kit …` node paths | User-stated and verified directly in run-kit v3.0.0 source (root.go, help_dump.go) and README | S:95 R:90 A:100 D:95 |
| 2 | Certain | Leave puller-owned data (`help/*.json`, `content/run-kit/**`, `content/shll/**`) untouched; rely on scheduled/dispatched pulls | Constitution Tool-Page Depth: mechanically synced, never hand-copied; pullers direct-commit to main, so hand-edits here would conflict and be overwritten | S:70 R:85 A:90 D:80 |
| 3 | Confident | Flip hand-written site prose + homepage transcript to canonical `run-kit` commands now, accepting the ≤1-day window against the pre-rename committed corpus | Mirrors upstream README's own convention; vn39 reporter only gates pulled READMEs, and the ship-stage dispatch closes the window | S:75 R:80 A:85 D:70 |
| 4 | Confident | `VersionTable` run-kit display label `'rk'` → `'run-kit'` | Label documented as "CLI + brew identity", which is now `run-kit`; 7 chars fits `LABEL_COL = 9` | S:65 R:90 A:85 D:70 |
| 5 | Confident | Homepage terminal keeps all `rk` alias affordances (command key, dispatch, cheatsheet fold, Tab completion); only text claiming `rk` is "the binary name" is reframed as "short alias" | The formula still ships the `rk` symlink, so alias-typers are a real audience; upstream's own framing ("fully interchangeable short alias") | S:50 R:85 A:70 D:60 |
| 6 | Confident | Fixture strategy: rename `rk-riff.txt` → `run-kit-riff.txt` + manifest path → `run-kit riff`, keeping frozen content byte-identical; re-freeze deferred until after the corpus refresh | Fixtures are deliberately frozen specimens (their header says so); re-freezing now is impossible (corpus still pre-rename) and unnecessary (tests pin content, not names) | S:50 R:90 A:70 D:50 |
| 7 | Confident | Non-live variants (`astro-tailwind-terminal1`, `_playground`) stay untouched | Constitution: one live site, isolated experiments; "references that *need* to reflect the rename" excludes undeployed variants | S:55 R:95 A:75 D:55 |
| 8 | Certain | Specs updated with fab-kit (slug `fab-kit` / binary `fab`) replacing run-kit as the slug≠binary divergence example | Specs must reflect reality; fab-kit's divergence is verified in the workflow mapping and `help/fab-kit.json` | S:70 R:85 A:85 D:75 |
| 9 | Certain | `refresh-help.yml` triple becomes `run-kit:run-kit:run-kit` (not the still-working alias forms) | `Formula/rk.rb` is deleted; brew's rename map + symlink are compat shims, and canonical naming is the change's whole point | S:85 R:80 A:90 D:85 |
| 10 | Confident | Ship stage dispatches `refresh-help.yml` + `refresh-readme.yml` on main after merge to refresh the corpus immediately | Both workflows document on-demand `workflow_dispatch` as the intended post-release trigger | S:60 R:85 A:80 D:70 |
| 11 | Certain | Change type is `chore` (reference/comment/label sweep following an upstream rename; no feature, no behavior fix) | Matches the change-type taxonomy; content edits here are maintenance, not new capability | S:70 R:95 A:85 D:80 |

11 assumptions (5 certain, 6 confident, 0 tentative, 0 unresolved).
