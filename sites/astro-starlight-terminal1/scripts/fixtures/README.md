# Parser-behavior fixtures

Frozen `-h` text specimens (`Node.text` blobs from `help/<slug>.json`) that
`scripts/parse-help.test.mjs` pins exact parser behavior against — specific
flags, placeholders, usage lines, prose boundaries.

**Why frozen, not live.** The committed `help/*.json` corpus is refreshed daily
by `.github/workflows/refresh-help.yml`, and tool releases legitimately change
commands/flags. Expectations pinned against the *live* corpus therefore rot on
schedule (observed 2026-07: `idea` grew a `--system` global, `hop`'s root grew
a Flags section, `shll` dropped `shell-setup --trust-tap`). Corpus-wide
*invariants* (zero ragged flag lines) still run against the live corpus — only
exact-output expectations are frozen. Fixture files are **verbatim parser
input** — they cannot carry comment headers, so all provenance lives here.

**Re-freezing** is a deliberate act: run `node scripts/refresh-help-fixtures.mjs`
(regenerates every corpus-derived fixture from the current corpus and prints an
updated provenance table for this README), then re-run
`node --test scripts/parse-help.test.mjs` and re-verify each pinned expectation
against the new specimen content before committing.

## Provenance

| Fixture | Source | Tool version | Captured |
|---------|--------|--------------|----------|
| `wt-create.txt` | `help/wt.json` node `wt create` | v0.0.20 | 2026-07-05T09:46:18Z |
| `wt-update.txt` | `help/wt.json` node `wt update` | v0.0.20 | 2026-07-05T09:46:18Z |
| `idea-add.txt` | `help/idea.json` node `idea add` | v0.0.14 | 2026-07-05T09:46:18Z |
| `idea-list.txt` | `help/idea.json` node `idea list` | v0.0.14 | 2026-07-05T09:46:18Z |
| `idea-update.txt` | `help/idea.json` node `idea update` | v0.0.14 | 2026-07-05T09:46:18Z |
| `hop-root.txt` | `help/hop.json` node `hop` | v0.1.18 | 2026-06-17T08:53:53Z |
| `hop-ls.txt` | `help/hop.json` node `hop ls` | v0.1.18 | 2026-06-17T08:53:53Z |
| `hop-update.txt` | `help/hop.json` node `hop update` | v0.1.18 | 2026-06-17T08:53:53Z |
| `rk-riff.txt` | `help/run-kit.json` node `rk riff` | v2.5.3 | 2026-07-05T09:46:18Z |

## Historical specimens (not regenerated)

| Fixture | Source | Why kept |
|---------|--------|----------|
| `hop-root-prose-only.txt` | `help/hop.json` node `hop` at hop **v0.1.13** (repo commit `7c28b84`, captured 2026-06-07) | The last release whose root had a large authored `Long` (with header-looking prose: `Getting started:`, `Cheat sheet:`, `Notes:`) but **no** generated `Flags:` section. Pins the prose-only-root parser edge case (no Flags section → empty flags; description preserved verbatim), which no current tool exhibits — hop v0.1.16+ grew a root `--all` flag. `refresh-help-fixtures.mjs` deliberately leaves this file alone. |
