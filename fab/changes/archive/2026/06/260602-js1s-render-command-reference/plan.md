# Plan: Render the CLI Command Reference on shll.ai

**Change**: 260602-js1s-render-command-reference
**Status**: In Progress
**Intake**: `intake.md`
**Spec**: `spec.md`

## Requirements

<!-- migrated from spec.md on 2026-06-03 -->

## Non-Goals

- The 7 producers in the sibling tool repos — unchanged; already seeded as backlog items. Only `help/wt.json` (the reference sample) exists today; the other 6 arrive via producer PRs.
- Enriching cobra `Long` descriptions so `-h` carries human prose (idea backlog `e3rk`) — tool-repo work; this change renders whatever `text` the binary emits, rich or thin.
- Any change to the schema/validator/receiving-workflow shipped in PR #12.
- Generating real `help/<tool>.json` for any tool other than `wt`.

## Component: CommandReference

### Requirement: A reusable build-time component renders a tool's help tree
The live site SHALL contain a reusable Astro component at `sites/astro-starlight-terminal1/src/components/CommandReference.astro`. It SHALL accept a `tool` slug prop, locate the corresponding `help/<tool>.json`, and render that tool's command reference. All work (file read, validation, render) SHALL occur at build time — no client-side data fetching (Constitution I, static-first).

#### Scenario: Component renders wt's real data
- **GIVEN** `help/wt.json` exists and conforms to the schema
- **WHEN** a page renders `<CommandReference tool="wt" />` during `astro build`
- **THEN** the build SHALL emit static HTML containing wt's top-level help and each of its 7 subcommands (create, delete, init, list, open, shell-init, update)
- **AND** no client-side fetch of the JSON SHALL occur at runtime

#### Scenario: No runtime dependency on the JSON
- **GIVEN** the built site
- **WHEN** a command-reference page is served
- **THEN** the help content SHALL be present in the static HTML (the `help/<tool>.json` file SHALL NOT be requested by the browser)

### Requirement: Cross-boundary read via build-time fs
The component SHALL read `help/<tool>.json` from the repository root using Node `fs` at build time, with the path anchored on the component module (via `import.meta.url`), NOT via `import.meta.glob` or a runtime fetch. Rationale (verified during clarification): Vite's `import.meta.glob` is constrained to the project-root `fs.allow` and would not reliably read a file outside the site directory; a build-time `fs.readFile` anchored on the module resolves and parses. The resolution SHALL NOT depend on `process.cwd()` (which varies by invocation) — it SHALL anchor on the component file location so it holds under `astro build` in CI.

> **Implementation note (diverged from initial wording):** a *fixed* relative depth (e.g. `../../../../help`) does NOT survive `astro build` — Vite bundles the component frontmatter into a chunk at an unstable depth (e.g. `dist/.prerender/chunks/`), so the `..` count from the source file is wrong at build time. The shipped component instead **ascends from `import.meta.url`'s directory until it finds the ancestor containing a `help/` directory** (the repo root), with a bounded loop that throws a clear, build-failing error if none is found. This is still anchored on `import.meta.url` (per this requirement), and is robust in both dev and build. See `docs/memory/conventions/help-collection.md` for the full rationale. (The standalone `validate-help.mjs` validator keeps a fixed-depth resolve because it runs in plain Node where the path is stable.)

#### Scenario: Path resolves outside the site directory
- **GIVEN** the component lives at `sites/astro-starlight-terminal1/src/components/`
- **WHEN** it resolves the help file for tool `wt`
- **THEN** it SHALL resolve to `<repo-root>/help/wt.json` via an `import.meta.url`-relative path
- **AND** the read SHALL succeed during `astro build`

### Requirement: Validate against the shared schema
The component SHALL validate the loaded JSON against `HelpDocSchema` imported from `sites/astro-starlight-terminal1/src/lib/schemas.ts` (the contract schema shipped in PR #12). It SHALL NOT define a second copy of the shape. No new npm dependency SHALL be added (zod is available transitively via `astro:content`, as the schema module already uses).

#### Scenario: Reuses the contract schema
- **GIVEN** the component and `src/lib/schemas.ts`
- **WHEN** the component validates a help document
- **THEN** it SHALL use the exported `HelpDocSchema`
- **AND** the site `package.json` SHALL gain no new dependency

### Requirement: Missing data degrades gracefully; invalid data fails the build
If `help/<tool>.json` is **absent**, the component SHALL render a neutral placeholder (e.g. "Command reference not generated yet — see the GitHub README") and the build SHALL succeed. If `help/<tool>.json` is **present but fails schema validation**, the build SHALL fail with a clear error naming the file and the validation failure. The two cases SHALL be distinguished: missing is an expected interim state (producers land over time); present-but-invalid is a committed defect that MUST NOT deploy.

#### Scenario: Missing file → placeholder, build succeeds
- **GIVEN** `help/hop.json` does not exist
- **WHEN** a page renders `<CommandReference tool="hop" />` during `astro build`
- **THEN** the build SHALL succeed
- **AND** the page SHALL show the neutral "not generated yet" placeholder

#### Scenario: Present-but-invalid file → build fails
- **GIVEN** a `help/<tool>.json` exists but is missing a required `Node` field (e.g. a node has no `text`)
- **WHEN** `astro build` renders that tool's page
- **THEN** the build SHALL fail with an error identifying the file and the schema violation

#### Scenario: Missing ≠ invalid
- **GIVEN** the two failure modes
- **WHEN** each occurs
- **THEN** an absent file SHALL NOT fail the build, and an invalid file SHALL NOT be silently treated as missing

### Requirement: Recursive rendering of the command tree
The component SHALL render the full recursive tree from the help document. The document is the `HelpDocSchema` envelope (`tool`, `version`, `captured_at`, `schema_version`, `root`); the tree starts at `doc.root` (a Node), and children live at each node's `commands[]` array. <!-- clarified: data shape per src/lib/schemas.ts — top-level is the envelope; the recursive tree begins at doc.root, NOT a top-level doc.commands[] --> The component SHALL render the root node's raw `text`, then each entry in `root.commands[]`, recursively, including nested subcommands (e.g. a future `rk riff`). Each command node SHALL display its `path` (full invocation, e.g. `wt create`), its `short` description, and its raw `text` (the `-h` output, preserved verbatim in a monospace/preformatted block). The node's `usage` field MAY also be surfaced (it is a required schema field and available for headers per the help-collection memory); displaying it is optional. <!-- clarified: usage is a required Node field; surfacing it is optional, not blocking --> A leaf (`commands: []`) renders without children.

#### Scenario: Subcommands rendered
- **GIVEN** wt's document with 7 leaf subcommands
- **WHEN** rendered
- **THEN** each subcommand SHALL show its `path`, `short`, and raw `text`

#### Scenario: Nested subcommands nest visually
- **GIVEN** a (future) document where a subcommand has its own `commands[]` (e.g. `rk riff <sub>`)
- **WHEN** rendered
- **THEN** the nested children SHALL render under their parent, preserving the tree depth

#### Scenario: Raw text preserved
- **GIVEN** a node's `text` containing newlines and alignment from `-h`
- **WHEN** rendered
- **THEN** the text SHALL appear verbatim in a preformatted block (whitespace/newlines preserved)

## Presentation: Terminal Style, Theme, Accessibility

### Requirement: Collapsible, keyboard-accessible entries
Subcommand entries SHALL be collapsible using native `<details>`/`<summary>` elements (no custom JavaScript accordion). This provides keyboard navigability and screen-reader semantics natively. Interactive summaries SHALL have a visible focus state. (Constitution Accessibility.)

#### Scenario: Keyboard navigation
- **GIVEN** a rendered command-reference page
- **WHEN** a user tabs to a subcommand summary and presses Enter/Space
- **THEN** the entry SHALL expand/collapse
- **AND** the focused summary SHALL show a visible focus indicator

### Requirement: Dark-mode parity via existing theme tokens
The component SHALL render correctly in both light and dark themes (Constitution V). It SHALL style using the site's existing terminal CSS variables (the `--c-*` tokens in `src/styles/terminal.css`) so theming follows Starlight's `data-theme` switch automatically, with no per-component theme script. Color contrast SHALL meet WCAG AA in both themes.

#### Scenario: Both themes render correctly
- **GIVEN** the command-reference page
- **WHEN** the site theme is toggled between light and dark
- **THEN** the reference SHALL remain legible with WCAG AA contrast in both
- **AND** no theme-specific JavaScript SHALL be required for the component's colors

### Requirement: Minimal dependencies
No new runtime or build dependency SHALL be introduced (Constitution VI). The component SHALL rely only on Astro/Starlight, the existing zod-via-`astro:content`, native `<details>`, and existing CSS.

#### Scenario: No new dependency
- **GIVEN** this change is complete
- **WHEN** `sites/astro-starlight-terminal1/package.json` is compared to its pre-change state
- **THEN** there SHALL be no added dependency

## Pages & Navigation

### Requirement: Every tool has a commands page rendering the component
Each of the 7 tools (idea, hop, fab-kit, wt, run-kit, tu, shll) SHALL have a `commands` page at `sites/astro-starlight-terminal1/src/content/docs/tools/<tool>/commands.mdx` that imports and renders `<CommandReference tool="<tool>" />`. Pages SHALL be `.mdx` (Starlight MDX is enabled) so they can import the component. Each page SHALL carry frontmatter `title: Commands` and a `description`. For idea and fab-kit, the existing hand-written `commands.md` SHALL be replaced by the generated `commands.mdx` (the curated prose's canonical home becomes the binary's cobra `Long`, tracked separately as idea backlog `e3rk`; out of scope here).

#### Scenario: All 7 pages exist and render the component
- **GIVEN** this change is complete
- **WHEN** the `tools/<tool>/` directories are listed
- **THEN** each of the 7 SHALL contain a `commands.mdx` importing and rendering `<CommandReference>`

#### Scenario: idea/fab-kit converted
- **GIVEN** idea and fab-kit previously had hand-written `commands.md`
- **WHEN** this change is complete
- **THEN** those SHALL be `commands.mdx` rendering the component (the prior `.md` removed or replaced — no duplicate page)

#### Scenario: wt renders now, others placeholder
- **GIVEN** only `help/wt.json` exists
- **WHEN** the site builds
- **THEN** wt's commands page SHALL show the real reference
- **AND** the other 6 SHALL show the graceful placeholder

### Requirement: Sidebar lists every tool's commands page
The Starlight sidebar in `sites/astro-starlight-terminal1/astro.config.mjs` SHALL list a `commands` entry for every tool, so each command-reference page is reachable from navigation. The 5 tools currently missing it (hop, wt, run-kit, tu, shll) SHALL gain a `commands` slug entry; idea and fab-kit already have one.

#### Scenario: All 7 reachable from sidebar
- **GIVEN** the amended sidebar
- **WHEN** the site is built
- **THEN** each tool's `Tools > <tool>` group SHALL include a `Commands` item linking to `tools/<tool>/commands`

### Requirement: Build succeeds and deploy is unaffected
`astro build` SHALL succeed with all 7 commands pages present (wt rendering real data, 6 placeholders). The existing GitHub Pages deploy SHALL continue to work unchanged.

#### Scenario: Clean build
- **GIVEN** the completed change
- **WHEN** `pnpm build` runs in `sites/astro-starlight-terminal1`
- **THEN** it SHALL complete successfully and emit static pages for all 7 `tools/<tool>/commands` routes

## Documentation

### Requirement: Memory reflects that rendering now exists
`docs/memory/conventions/help-collection.md` SHALL be updated to note the consume-side rendering now exists — the `CommandReference` component, the build-time `fs` read mechanism, the missing-vs-invalid behavior — closing the loop the contract doc flagged as "follow-up". `docs/memory/conventions/tool-page-rubric.md` SHALL be updated to record that the generated `commands.mdx` page (rendering `CommandReference`) is the realized form of the command-reference exception, and that it replaces hand-written command prose.

#### Scenario: help-collection memory closes the loop
- **GIVEN** the help-collection memory file after this change
- **WHEN** it is read
- **THEN** it SHALL describe the rendering component and read mechanism as implemented (not "follow-up")

#### Scenario: rubric records the realized placement
- **GIVEN** the rubric after this change
- **WHEN** it is read
- **THEN** it SHALL state that command reference renders via `commands.mdx` + `CommandReference`, replacing hand-written command prose

## Design Decisions

1. **Build-time `fs.readFile` (anchored on `import.meta.url`), not `import.meta.glob` or fetch.**
   - *Why*: Empirically verified the fs read of `<site>/../../help/wt.json` works; keeps render static (Constitution I). Anchoring on the component module (not `process.cwd()`) makes it robust to invocation directory in CI.
   - *Rejected*: `import.meta.glob` (Vite project-root `fs.allow` blocks files outside the site); runtime `fetch` (violates static-first; the JSON isn't a served asset).

2. **Native `<details>`/`<summary>` for collapsibles.**
   - *Why*: Keyboard + screen-reader support for free, zero JS, satisfies minimal-deps and accessibility at once.
   - *Rejected*: custom JS accordion (more code, must re-implement a11y, a new failure surface).

3. **Missing → placeholder; present-but-invalid → fail the build.**
   - *Why*: Producers land over weeks, so a missing file is an expected interim state and must not block the build. A committed-but-malformed file is a real defect that must not deploy — failing the build surfaces it loudly. Conflating the two would either block early rollout or silently ship broken data.
   - *Rejected*: always-fail (blocks the site until all 7 producers ship); always-placeholder (a malformed file looks identical to "not produced", hiding a real defect).

4. **Generated replaces hand-written; prose relocates to the binary.**
   - *Why*: Uniform treatment, zero site-side drift. The curated idea/fab-kit prose isn't lost — it moves to cobra `Long` (idea backlog `e3rk`), its canonical home, and flows back through the producer automatically.
   - *Rejected*: keep hand-written site copy (drifts); augment (mixed page shapes per tool).

5. **Style via existing terminal.css `--c-*` tokens; no theme script.**
   - *Why*: Dark-mode parity comes free from Starlight's `data-theme` flip when colors are CSS variables; matches the `index.mdx`/`Diagram.astro` precedent.
   - *Rejected*: a per-component theme-swap script (unnecessary JS; `Diagram.astro` needed it only because it swaps raster SVG `src`, not applicable to CSS-themed text).

## Tasks

### Phase 1: Setup

- [x] T001 Confirm relative-path depths empirically: from `sites/astro-starlight-terminal1/src/components/CommandReference.astro` the repo-root help file is `../../../../help/<tool>.json` (4× `..`); from `sites/astro-starlight-terminal1/src/content/docs/tools/<tool>/commands.mdx` the component import is `../../../../components/CommandReference.astro` (4× `..`). Use `fileURLToPath(import.meta.url)` + `path.resolve`; verify the resolved help path equals `<repo-root>/help/<tool>.json`. (Already verified during plan generation.)

### Phase 2: Core Implementation

- [x] T002 Create `sites/astro-starlight-terminal1/src/components/CommandReference.astro`. Frontmatter (runs at build): accept prop `tool` (slug string); resolve the help path via `path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../help/' + tool + '.json')`; read with Node `fs` synchronously at build time (NOT `process.cwd()`, NOT `import.meta.glob`, NOT fetch); on `ENOENT` set a `missing` flag (render placeholder); on read+parse, validate with `HelpDocSchema.parse()` imported from `../lib/schemas.ts`. Let `ZodError` propagate (wrapped with the filename for a clear build-fail message) so present-but-invalid fails `astro build`; catch ENOENT specifically.
- [x] T003 In `CommandReference.astro`, implement the recursive render. Missing → neutral placeholder ("Command reference not generated yet — see the GitHub README", linking to `https://github.com/sahil87/<tool>`). Present → render `doc.root.text` verbatim in a `<pre>`, then each `root.commands[]` recursively. Per node show `path`, `short`, and raw `text` (in `<pre>`, whitespace preserved). Nested `commands[]` nest visually; leaf (`commands: []`) renders no children. Use native `<details>`/`<summary>` for collapsible subcommand entries (no custom JS accordion). Recursive node markup expressed via a self-import of the component or an inline recursive fragment (Astro supports a component importing itself).
- [x] T004 Add a scoped `<style>` block to `CommandReference.astro` styling with the existing terminal aesthetic: reuse `--c-*` tokens from `src/styles/terminal.css`, mark the rendered container `not-content` to opt out of Starlight prose styling, give `<summary>` a visible `:focus-visible` state, ensure WCAG AA contrast in both themes (colors come from CSS variables that flip with Starlight's `data-theme` — NO per-component theme script). No new dependency.

### Phase 3: Integration & Edge Cases

- [x] T005 Replace hand-written `commands.md` with `commands.mdx` for idea and fab-kit: remove `src/content/docs/tools/idea/commands.md` and `src/content/docs/tools/fab-kit/commands.md`; create `commands.mdx` in each with frontmatter `title: Commands` + a `description`, body importing the component (`../../../../components/CommandReference.astro`) and rendering `<CommandReference tool="idea" />` / `<CommandReference tool="fab-kit" />`. (Avoid `.md`+`.mdx` slug collision.)
- [x] T006 Create `commands.mdx` for the 5 tools with no commands page (hop, wt, run-kit, tu, shll) at `src/content/docs/tools/<tool>/commands.mdx`: frontmatter `title: Commands` + `description`, importing and rendering `<CommandReference tool="<tool>" />`.
- [x] T007 Amend the sidebar in `sites/astro-starlight-terminal1/astro.config.mjs`: add `{ label: 'Commands', slug: 'tools/<tool>/commands' }` to the `items` array for the 5 tools currently missing it (hop, wt, run-kit, tu, shll). idea & fab-kit already list Commands — leave them. Match the existing label casing.

### Phase 4: Verification & Docs

- [x] T008 Run `cd sites/astro-starlight-terminal1 && pnpm install --frozen-lockfile` (if needed) then `pnpm build`. Build MUST succeed. Confirm `dist/tools/wt/commands/index.html` contains "wt create" and raw help text (real data); confirm a placeholder tool (e.g. hop) built its page with placeholder text (not an error, not real data). Confirm `git diff sites/astro-starlight-terminal1/package.json` is empty (no new dependency).
- [x] T009 Verify the present-but-invalid → build-fail path without leaving artifacts: confirm `HelpDocSchema.parse()` throws on a help doc missing a required `Node` field (e.g. a node with no `text`) — via a throwaway temp file or an inline node script using the schema; do NOT commit any test file.
- [x] T010 Update memory docs: `docs/memory/conventions/help-collection.md` (note the rendering consumer now EXISTS — the CommandReference component, the `import.meta.url`-relative fs read, the missing→placeholder / invalid→build-fail behavior — closing the "follow-up" loop) and `docs/memory/conventions/tool-page-rubric.md` (record that command reference renders via `commands.mdx` + `CommandReference`, replacing hand-written command prose). Add changelog entries matching the existing house style.

## Execution Order

- T002 → T003 → T004 build up the single component file sequentially.
- T005, T006, T007 depend on the component existing (T002-T004) but are independent of each other.
- T008 depends on T002-T007. T009 is independent of the build. T010 is documentation, last.

## Acceptance

### Functional Completeness

- [x] A-001 Reusable build-time component: `src/components/CommandReference.astro` exists, accepts a `tool` slug prop, and reads + validates + renders entirely at build time (no client-side fetch).
- [x] A-002 Cross-boundary read via build-time fs: the component reads `help/<tool>.json` from the repo root using Node `fs`, with the path resolved relative to the module via `import.meta.url` (not `process.cwd()`, not `import.meta.glob`, not fetch); resolves to `<repo-root>/help/<tool>.json` and the read succeeds during `astro build`.
- [x] A-003 Schema reuse: the component validates via `HelpDocSchema` imported from `src/lib/schemas.ts`; no second copy of the shape; no new npm dependency (`git diff sites/astro-starlight-terminal1/package.json` empty).
- [x] A-004 Recursive rendering: rendering starts at `doc.root` (root `text` in a `<pre>`), then each `root.commands[]` recursively; each node shows `path`, `short`, and raw `text` verbatim; nested `commands[]` nest visually; a leaf renders no children.
- [x] A-005 Every tool has a commands page: all 7 tools (idea, hop, fab-kit, wt, run-kit, tu, shll) have `src/content/docs/tools/<tool>/commands.mdx` with `title: Commands` + a `description` importing and rendering `<CommandReference tool="<tool>" />`.
- [x] A-006 Sidebar lists every tool's commands page: `astro.config.mjs` includes a `{ label: 'Commands', slug: 'tools/<tool>/commands' }` entry for all 7 tools (5 newly added, idea/fab-kit pre-existing).
- [x] A-007 Memory updated: `help-collection.md` describes the rendering component + read mechanism + missing-vs-invalid behavior as implemented (not "follow-up"); `tool-page-rubric.md` states the command reference renders via `commands.mdx` + `CommandReference`, replacing hand-written command prose; both carry changelog entries in house style.

### Behavioral Correctness

- [x] A-008 Missing → placeholder, build succeeds: a tool with no `help/<tool>.json` (e.g. hop) renders the neutral "not generated yet" placeholder and does NOT fail the build.
- [x] A-009 Present-but-invalid → build fails: a present-but-schema-invalid `help/<tool>.json` causes `astro build` to fail with an error naming the file and the validation failure (verified without committing a test file).
- [x] A-010 Missing ≠ invalid: ENOENT is caught specifically for the placeholder; a ZodError propagates (is NOT silently treated as missing).
- [x] A-011 wt renders real data, others placeholder: built `dist/tools/wt/commands/index.html` contains "wt create" and raw help text; the other 6 pages render the placeholder.

### Removal Verification

- [x] A-012 Hand-written `commands.md` removed: `src/content/docs/tools/idea/commands.md` and `src/content/docs/tools/fab-kit/commands.md` no longer exist (no `.md`+`.mdx` slug collision); replaced by `.mdx` rendering the component.

### Scenario Coverage

- [x] A-013 Clean build: `pnpm build` in `sites/astro-starlight-terminal1` completes successfully and emits static pages for all 7 `tools/<tool>/commands` routes.
- [x] A-014 No runtime fetch: the help content is present in the static HTML; the browser does not request `help/<tool>.json`.
- [x] A-015 Keyboard-accessible collapsibles: subcommand entries use native `<details>`/`<summary>`; summaries have a visible focus state.

### Edge Cases & Error Handling

- [x] A-016 ENOENT distinguished from other read/parse errors: only a missing file yields the placeholder; malformed JSON / schema failure surfaces loudly.

### Code Quality

- [x] A-017 Pattern consistency: the component follows existing conventions (Diagram.astro frontmatter/style structure, index.mdx `not-content` + mdx-import pattern, terminal.css token usage).
- [x] A-018 No unnecessary duplication: reuses `HelpDocSchema`/`Node` from `src/lib/schemas.ts` and existing `--c-*` tokens; does not reimplement the shape or invent a palette.
- [x] A-019 No magic strings: GitHub URL / placeholder text are clearly expressed; recursion handles depth without a god function.

### Dark-mode Parity & Accessibility

- [x] A-020 Both themes render correctly: colors come from `--c-*` CSS variables that flip with Starlight's `data-theme`; no per-component theme script; WCAG AA contrast in both light and dark.

## Notes

- Check items as you review: `- [x]`
- `help/wt.json`, `src/lib/schemas.ts`, the receiving workflow, and the 7 sibling repos MUST NOT be modified.
- `dist/` and `node_modules/` are gitignored — do not commit them.

## Deletion Candidates

- `src/content/docs/tools/idea/commands.md`, `src/content/docs/tools/fab-kit/commands.md` — already removed in this change (A-012); replaced by generated `.mdx`. No further hand-written command prose remains. No other code (functions, branches, config) was made redundant — this change adds a new consumer of the existing `help/*.json` contract.
