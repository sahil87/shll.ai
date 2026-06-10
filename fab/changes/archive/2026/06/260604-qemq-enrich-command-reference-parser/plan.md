# Plan: Enrich Command Reference with Build-Time `-h` Parser

**Change**: 260604-qemq-enrich-command-reference-parser
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

### Parser: Build-Time `-h` Decomposition

#### R1: Pure `parseHelp` module
The site SHALL expose a pure, dependency-free TypeScript module at
`sites/astro-starlight-terminal1/src/lib/parse-help.ts` exporting `parseHelp(text: string): ParsedHelp`
and the `ParsedFlag` / `ParsedHelp` interfaces. The module MUST NOT import any runtime or build
dependency (Constitution VI) and MUST run at build time only (Constitution I).

- **GIVEN** a captured Cobra `-h` blob (a `Node.text` value)
- **WHEN** `parseHelp(text)` is called during `astro build`
- **THEN** it returns a `ParsedHelp` with `description`, `usage[]`, `examples`, `flags[]`, `globalFlags[]`
- **AND** it imports nothing beyond the TypeScript language (no npm package)

#### R2: Section anchoring and verbatim description
The parser SHALL anchor ONLY on lines matching exactly `^(Usage|Aliases|Examples|Available Commands|Flags|Global Flags):\s*$`.
Everything BEFORE the first anchor SHALL be captured verbatim as `description` and never force-parsed.

- **GIVEN** a `hop` root blob with hand-written `Getting started`, a leading prose `Usage:` block, and `Notes`
- **WHEN** parsed
- **THEN** the entire prose preamble before the first true anchor is preserved in `description`
- **AND** missing sections (e.g. no `Flags:`) yield empty arrays / empty string, never an error

#### R3: Flag-line grammar
The parser SHALL recognize a flag line via
`^\s*(?:-(?<short>[A-Za-z]),\s+)?--(?<long>[A-Za-z0-9][A-Za-z0-9-]*)(?:[ \t](?<placeholder>\S.*?))??\s{2,}(?<desc>\S.*?)\s*$`.
The `desc` begins at the first 2-or-more-space gap; the `placeholder` is whatever sits between `--long`
and that gap (and MAY contain spaces). A trailing `(default …)` SHALL be split out of `desc` into
`default`; `required` SHALL be `/\(required\)/i.test(desc)`; `argtype` SHALL be the placeholder when it
is a single simple token (e.g. `string`, `int`), else `null` (the placeholder is still retained).

- **GIVEN** `wt create` flags (6 real flags + `-h`)
- **WHEN** parsed
- **THEN** all 6 non-help flags parse with `argtype = "string"` where the placeholder is `string`
- **GIVEN** `rk riff`'s `--cmd cmd[=__rk_riff_pane_bare__]` line
- **THEN** `placeholder = "cmd[=__rk_riff_pane_bare__]"` and `argtype = null`
- **GIVEN** multi-word placeholders (`wt update` / `idea update` `--skip-brew-update brew update`,
  `hop ls --trees wt list --json`, `shll shell-setup --trust-tap brew trust --tap sahil87/tap`)
- **THEN** the full multi-word placeholder is captured and `argtype = null`
- **GIVEN** a `(default …)` suffix
- **THEN** it is moved verbatim into `default` and stripped from `desc`

#### R4: Footer discard and zero ragged lines
The parser SHALL drop a trailing `Use "<tool> [command] --help" …` footer line and MUST parse every
flag line in every committed `help/*.json` with zero ragged (unrecognized) lines under a `Flags:` /
`Global Flags:` section.

- **GIVEN** all six committed `help/*.json` files
- **WHEN** every command's `text` is parsed
- **THEN** there are zero ragged flag lines across the entire corpus

### Parser: Unit Test

#### R5: Native Node test pinning behavior
A unit test SHALL pin parser behavior using the site's existing native toolchain (`node --test` with
type-stripping, mirroring `scripts/validate-help.mjs`). It MUST assert zero ragged lines across ALL
committed `help/*.json` plus the explicit cases in R3 and the `hop` prose-only root from R2.

- **GIVEN** the test runner is invoked
- **WHEN** it parses the corpus and the named edge cases
- **THEN** every assertion passes and the run exits zero

### Render: Enriched `CommandReference.astro`

#### R6: Structured per-node render
`CommandReference.astro` SHALL import `parseHelp` and, per node, render: the command path with a
copy button, a description block, usage line(s) with copy, a flags table (name · type/required badges ·
description, each row copyable), a per-command flag filter input, and a "show raw" `<details>` toggle
with the verbatim `text`. The per-command `-h, --help` row SHALL be suppressed from the table.

- **GIVEN** a node with parsed flags
- **WHEN** rendered
- **THEN** the table lists every real flag (not `-h/--help`) with copyable token and type/required badges
- **AND** the verbatim `text` is available behind a "show raw" toggle
- **GIVEN** a prose-only node (empty `flags`) with rich raw text
- **THEN** the description/raw content is the primary content for that node

#### R7: Plumbing preserved
The recursive `Astro.self` tree, the `findRepoRoot` + `import.meta.url` build-time fs read, and the
MISSING→placeholder / PRESENT-but-invalid→build-fail behavior SHALL remain unchanged. All new
interactive controls SHALL be keyboard-navigable with visible `:focus-visible` and reuse the `--c-*`
tokens (dark-mode parity, Constitution V). The universal-help note SHALL render once per page, not per
command.

- **GIVEN** a missing `help/<tool>.json`
- **WHEN** the page builds
- **THEN** the neutral placeholder renders and the build succeeds (unchanged behavior)
- **GIVEN** a present-but-invalid help file
- **THEN** the build fails loudly (unchanged behavior)

### Render: Cross-Tool Command Index

#### R8: Build-time index page + component
A new page at `sites/astro-starlight-terminal1/src/content/docs/reference/command-index.mdx` (backed by
`src/components/CommandIndex.astro`) SHALL, at build time, read all `help/*.json`, run `parseHelp`, and
emit a searchable flat list of every command path and every REAL flag across tools (including Global
Flags; EXCLUDING `-h`/`--help`/`-v`/`--version`). Prose-only roots SHALL be listed as commands. A
client-side search input SHALL filter pre-rendered static rows (progressive enhancement only). Each
entry SHALL link to the owning tool's commands page.

- **GIVEN** the six committed help files
- **WHEN** the index page builds
- **THEN** every command path and every real flag is rendered as a static row
- **AND** `-h`/`--help`/`-v`/`--version` are excluded
- **AND** a search box filters already-rendered rows without any data fetch

#### R9: Reference sidebar group + universal-help note
`astro.config.mjs` SHALL gain a new "Reference" sidebar group containing the `reference/command-index`
page. A universal-help note SHALL be rendered once (on the index page and/or each tool commands-page
header) stating that `-h`/`--help` work on every command and `-v`/`--version` at the tool root.

- **GIVEN** the sidebar
- **WHEN** the site renders
- **THEN** a "Reference" group lists "Command index"
- **AND** the universal-help note appears once, explaining the suppressed `-h`/`-v` affordances

### Design Decisions

1. **Parser is a separate module, not inline frontmatter** — *Why*: reusable by both
   `CommandReference.astro` and `CommandIndex.astro`, and unit-testable in plain Node. *Rejected*:
   inline parsing in the component (not reusable, not testable).
2. **Display-only parse; raw `text` stays the authority** — *Why*: spec §5 forbids parsing `-h` for
   tree structure (a producer obligation); tree still comes from JSON `commands[]`. *Rejected*: deriving
   any structure from parsed text.
3. **Native `node --test` with type-stripping** — *Why*: matches `scripts/validate-help.mjs`, adds no
   dependency (Constitution VI). *Rejected*: vitest/jest (new dependency).

### Non-Goals
- Enriching the schema so tools emit structured `flags[]` — deferred (requires coordinated 7-repo rollout).
- Modifying `schemas.ts`, the help-dump contract, or any tool repo — out of scope (display-only change).

## Tasks

### Phase 1: Setup

- [x] T001 Create `sites/astro-starlight-terminal1/src/lib/parse-help.ts` with `ParsedFlag` / `ParsedHelp` interfaces and the `parseHelp` skeleton (anchors + description capture). <!-- R1 R2 -->

### Phase 2: Core Implementation

- [x] T002 Implement flag-line grammar in `parse-help.ts`: short/long/placeholder/desc groups, `(default …)` split, `required`, `argtype` (simple-token-only), footer discard. <!-- R3 R4 -->
- [x] T003 [P] Add native unit test `sites/astro-starlight-terminal1/scripts/parse-help.test.mjs` (mirrors `validate-help.mjs`): zero ragged lines across all `help/*.json` + explicit edge cases (`wt create`, `rk riff`, multi-word placeholders, `hop` root). <!-- R5 -->

### Phase 3: Integration & Edge Cases

- [x] T004 Enrich `sites/astro-starlight-terminal1/src/components/CommandReference.astro`: import `parseHelp`; render path+copy, description, usage+copy, flags table with type/required badges + per-row copy, per-command filter, show-raw `<details>`; suppress per-command `-h, --help`; render universal-help note once per page; keep all plumbing + failure modes; reuse `--c-*` tokens; visible `:focus-visible`. <!-- R6 R7 R9 -->
- [x] T005 Create `sites/astro-starlight-terminal1/src/components/CommandIndex.astro`: build-time read of all `help/*.json` via the same `findRepoRoot` pattern, `parseHelp` over each, flat list of command paths + real flags (incl. Global Flags, excl. `-h`/`--help`/`-v`/`--version`), prose-only roots as commands, deep links to each tool's commands page, client-side search over static rows, `--c-*` tokens, `:focus-visible`, universal-help note. <!-- R8 R9 -->
- [x] T006 Create `sites/astro-starlight-terminal1/src/content/docs/reference/command-index.mdx` rendering `CommandIndex`. <!-- R8 -->
- [x] T007 Add "Reference" sidebar group (with `reference/command-index`) to `sites/astro-starlight-terminal1/astro.config.mjs`. <!-- R9 -->

### Phase 4: Polish

- [x] T008 Verify: run the parser unit test (0 ragged), `node scripts/validate-help.mjs`, and `pnpm build`; mark tasks `[x]`. <!-- R4 R5 R7 -->

## Execution Order

- T001 blocks T002, T004, T005
- T002 blocks T003, T004, T005
- T003 can run alongside T004–T007 once T002 lands
- T004/T005/T006/T007 precede T008 (verification)

## Acceptance

### Functional Completeness

- [ ] A-001 R1: `src/lib/parse-help.ts` exports `parseHelp`, `ParsedFlag`, `ParsedHelp`; no npm import.
- [ ] A-002 R2: Description is everything before the first anchor, verbatim; missing sections are empty, not errors.
- [ ] A-003 R3: Flag grammar parses short/long/placeholder/desc; `(default …)` → `default`; `required` and simple-token `argtype` set correctly.
- [ ] A-004 R4: Trailing `Use "<tool> [command] --help" …` footer discarded; zero ragged flag lines across all `help/*.json`.
- [ ] A-005 R5: Native unit test exists and passes, covering the corpus + named edge cases.
- [ ] A-006 R6: `CommandReference.astro` renders structured view (path+copy, description, usage+copy, flags table w/ badges + per-row copy, per-command filter, show-raw); `-h, --help` suppressed in table.
- [ ] A-007 R7: Recursion, `findRepoRoot`/`import.meta.url` read, and missing→placeholder / invalid→build-fail behavior unchanged; controls keyboard-navigable with `:focus-visible`; `--c-*` tokens reused.
- [ ] A-008 R8: `command-index.mdx` + `CommandIndex.astro` emit static rows for all command paths + real flags (incl. Global Flags, excl. `-h`/`-v` boilerplate); prose-only roots as commands; client search filters static DOM; entries deep-link to tool commands pages.
- [ ] A-009 R9: "Reference" sidebar group present in `astro.config.mjs`; universal-help note rendered once per page.

### Behavioral Correctness

- [ ] A-010 R7: `pnpm build` succeeds and `node scripts/validate-help.mjs` still passes (contract path undisturbed).

### Scenario Coverage

- [ ] A-011 R3: `rk riff --cmd cmd[=__rk_riff_pane_bare__]` placeholder (with spaces) and multi-word placeholders (`--skip-brew-update brew update`, `--trees wt list --json`, `--trust-tap brew trust --tap sahil87/tap`) parse correctly.
- [ ] A-012 R2: `hop` root (no `Flags:` section) yields empty `flags` with description preserved.

### Edge Cases & Error Handling

- [ ] A-013 R7: Missing `help/<tool>.json` → placeholder + build succeeds; present-but-invalid → build fails.

### Code Quality

- [ ] A-014 Pattern consistency: New code follows `interface Props`, scoped `<style>`, `not-content`, `--c-*` tokens, missing-prop build guard conventions from `CommandReference.astro` / `GithubButton.astro`.
- [ ] A-015 No unnecessary duplication: `CommandIndex.astro` reuses the `findRepoRoot` ascent pattern and the shared `parseHelp` module rather than reimplementing.

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Unit test as `scripts/parse-help.test.mjs` run via `node --test` (type-stripping), mirroring `validate-help.mjs`, since the site has no test framework | Intake §1b says "if none, add a minimal Node test via `node --test`"; no test runner in package.json | S:96 R:85 A:90 D:90 |
| 2 | Certain | `findRepoRoot` ascent pattern duplicated into `CommandIndex.astro` rather than extracted to a shared lib | Keeps `CommandReference.astro` plumbing untouched per the hard constraint; extraction would touch that file's read path; small, well-commented helper | S:90 R:80 A:85 D:85 |
| 3 | Certain | `argtype` = placeholder only when it matches `^[A-Za-z][A-Za-z0-9_-]*$` as a single token (e.g. `string`, `int`); multi-word or bracketed placeholders → `argtype = null`, placeholder retained | Intake §1: "simple single-token type … else null (placeholder still retained)" | S:95 R:88 A:90 D:90 |
| 4 | Certain | Universal-help note rendered in the `CommandReference` top-level (tool) header once and on the command-index page | Intake §2/§e: render once per page; both surfaces suppress `-h`/`-v` | S:92 R:88 A:85 D:85 |

4 assumptions (4 certain, 0 confident, 0 tentative).
