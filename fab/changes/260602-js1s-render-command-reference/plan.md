# Plan: Render the CLI Command Reference on shll.ai

**Change**: 260602-js1s-render-command-reference
**Status**: In Progress
**Intake**: `intake.md`
**Spec**: `spec.md`

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
