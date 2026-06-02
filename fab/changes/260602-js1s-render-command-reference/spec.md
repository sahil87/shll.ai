# Spec: Render the CLI Command Reference on shll.ai

**Change**: 260602-js1s-render-command-reference
**Created**: 2026-06-02
**Affected memory**: `docs/memory/conventions/tool-page-rubric.md`, `docs/memory/conventions/help-collection.md`

This change is the rendering follow-up to the merged help-collection contract (`260602-xiis-help-collection-contract`, PR #12). It builds the live-site consumer of `help/<tool>.json`. The contract artifacts it depends on (`sites/astro-starlight-terminal1/src/lib/schemas.ts`, `help/wt.json`) are already on `main`.

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

## Clarifications

### Session 2026-06-02 (auto)

| Item | Resolution |
|------|------------|
| Data shape in "Recursive rendering" | Tightened: the tree starts at `doc.root` (a Node), children at `root.commands[]` — there is no top-level `doc.commands[]`. Verified against `src/lib/schemas.ts` and `help/wt.json`. |
| Render fields | Noted `usage` is a required Node field and MAY be surfaced (optional). |
| Assumption #11 (prop shape) | Resolved to Certain — `tool` slug; the component reads+validates. The spec body already committed to this. |
| Assumption #12 (idea/fab-kit .md) | Resolved to Certain — the `.md` MUST be removed (slug collision with `.mdx`). |

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Target the live Starlight site (sites/astro-starlight-terminal1) | Confirmed from intake; SITE_DIR | S:95 R:80 A:92 D:95 |
| 2 | Certain | Render as per-tool commands.mdx importing CommandReference | Confirmed from intake #2; rubric-declared | S:95 R:75 A:90 D:92 |
| 3 | Certain | Generated replaces hand-written; prose relocates to cobra Long (idea e3rk, out of scope) | Confirmed from intake #3/#9; user-chosen | S:90 R:65 A:82 D:88 |
| 4 | Certain | Reuse HelpDocSchema from src/lib/schemas.ts; no new dependency | Confirmed from intake #4; first consumer of the contract | S:95 R:75 A:92 D:92 |
| 5 | Certain | Read mechanism = build-time fs.readFile anchored on import.meta.url | Confirmed from intake #11; empirically verified this session | S:90 R:60 A:85 D:88 |
| 6 | Certain | Missing → placeholder (build succeeds); present-but-invalid → fail the build | Confirmed from intake #12; user clarified the missing≠invalid distinction | S:92 R:60 A:82 D:88 |
| 7 | Certain | Wire all 7 commands pages + 5 new sidebar entries in this change | Confirmed from intake #10/#13; user chose "wire all 7 now" | S:92 R:65 A:85 D:90 |
| 8 | Certain | Native <details>/<summary> for collapsibles | Confirmed from intake #7; best a11y default, no JS | S:85 R:72 A:84 D:82 |
| 9 | Certain | Static-first build-time render, no runtime fetch | Confirmed from intake #6; Constitution I | S:95 R:80 A:95 D:95 |
| 10 | Certain | Style via existing terminal.css --c-* tokens; dark-mode parity from theme flip, no script | Confirmed from intake #8; matches index.mdx/Diagram precedent | S:82 R:72 A:82 D:80 |
| 11 | Certain | Component prop = `tool` slug; the component does the read + validate (page does NOT pass a parsed doc) | Clarified — the "Cross-boundary read via build-time fs" requirement already commits to the component reading the file, so the slug-prop shape is the only one consistent with the rest of the spec body. <!-- clarified: prop = tool slug; spec body already commits the component to reading+validating --> | S:95 R:70 A:78 D:72 |
| 12 | Certain | idea/fab-kit hand-written commands.md is removed/replaced (not left as a second .md alongside .mdx) | Clarified — Starlight resolves `tools/<tool>/commands` to a single slug; a `.md` and `.mdx` with the same slug would collide/duplicate, so the `.md` MUST be removed. <!-- clarified: .md removed, not left alongside .mdx (slug collision) --> | S:95 R:72 A:80 D:78 |

12 assumptions (12 certain, 0 confident, 0 tentative, 0 unresolved).
