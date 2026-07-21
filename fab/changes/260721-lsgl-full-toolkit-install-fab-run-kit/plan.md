# Plan: Full-toolkit install one-liner for fab-kit and run-kit overviews

**Change**: 260721-lsgl-full-toolkit-install-fab-run-kit
**Intake**: `intake.md`

## Requirements

### Site Components: InstallOneLiner full-toolkit class

#### R1: Component-internal full-toolkit map
`sites/astro-starlight-terminal1/src/components/InstallOneLiner.astro` MUST carry a component-internal map (keyed by tool slug) of tools whose canonical README documents the whole-toolkit install as the supported path, carrying each tool's sibling-dependency reason. The map MUST contain exactly `fab-kit` (relies on `wt` for worktrees, `idea` for the backlog) and `run-kit` (relies on `wt` for the riff worktree flow). The component's public interface MUST NOT change — no new prop (the page-authored `fullToolkit` prop was rejected at intake: the sibling-tool dependency is a property of the tool, not the page).

- **GIVEN** a page renders `<InstallOneLiner tool="fab-kit" />` or `<InstallOneLiner tool="run-kit" />`
- **WHEN** the component evaluates its render branch
- **THEN** the tool resolves in the full-toolkit map and takes the whole-toolkit branch
- **AND** no `overview.mdx` needed any edit to opt in

#### R2: Whole-toolkit one-liner for map tools
For a tool in the full-toolkit map, the rendered `<Code>` one-liner MUST be exactly `curl -fsSL https://shll.ai/install | sh` — the same string the `shll` branch renders, with no `sh -s -- <tool>` suffix.

- **GIVEN** `tool` is `fab-kit` or `run-kit`
- **WHEN** the one-liner string is built
- **THEN** it is `curl -fsSL https://shll.ai/install | sh` verbatim (verifiable in the built page HTML)

#### R3: Note mirrors the canonical README wording
For a tool in the full-toolkit map, the component MUST render a short note mirroring the canonical README wording: the per-tool sibling-dependency reason plus "so the full-toolkit install is the supported path", keeping a link to `/getting-started/install/`. The note MUST name only tool names (`wt`, `idea`) and exempt shell tokens (`curl`/`sh`) — no CLI subcommands or flags (the `vn39` hard rule for hand-written prose stays trivially satisfied).

- **GIVEN** the fab-kit overview's `## Install` section
- **WHEN** it renders
- **THEN** the note states fab-kit relies on its sibling tools (`wt` for worktrees, `idea` for the backlog), so the full-toolkit install is the supported path, and links to `/getting-started/install/`
- **GIVEN** the run-kit overview's `## Install` section
- **WHEN** it renders
- **THEN** the note states run-kit relies on its sibling tools (`wt` for the riff worktree flow), same frame, same link

#### R4: No follow-on block for map tools
The `shll shell-setup` / `shll agent-setup` / `exec $SHELL` follow-on `<Code>` block MUST remain `shll`-only. Full-toolkit map tools MUST NOT render it — the overview install section stays light and the note's link carries the visitor to the full guide.

- **GIVEN** `tool` is `fab-kit` or `run-kit`
- **WHEN** the component renders
- **THEN** exactly one `<Code>` block appears (the one-liner) and no follow-on block

#### R5: Existing behavior preserved
The `shll` branch (whole-toolkit one-liner + follow-on steps + its note, including the homepage `<InstallOneLiner tool="shll" />` render), the four subset tools (`idea`, `hop`, `wt`, `tu` — per-tool `sh -s -- ${tool}` form + existing note), the roster guards (`!tool` throw, `isToolSlug` gate), the Expressive Code `<Code>` rendering (copy-button parity), and the scoped layout-only `<style>` block MUST all be behavior-preserved.

- **GIVEN** any of the five non-map renders (`shll` on its overview and the homepage; `idea`/`hop`/`wt`/`tu` overviews)
- **WHEN** the site builds
- **THEN** their rendered install sections are unchanged from before this change
- **GIVEN** a missing or unknown `tool` slug
- **WHEN** the component runs at build time
- **THEN** the build still fails loudly with the existing errors

#### R6: Doc-comment describes the full-toolkit class
The component's top doc-comment MUST be updated to describe the new three-way world: `shll` (bootstrap meta-CLI, not an install target) plus the full-toolkit-map tools (canonical README declares the whole-toolkit install the supported path — sibling-tool dependency) render the whole-toolkit form; the remaining tools render the per-tool subset form. The superseded "scoped to a single tool" header framing and the `SHLL IS SPECIAL`-only carve-out account MUST be revised accordingly.

- **GIVEN** a future maintainer reading the component
- **WHEN** they read the doc-comment
- **THEN** it accurately explains which tools render which form and why

### Non-Goals

- No `overview.mdx` edits — the `moju` single-source design keeps the fix inside the component.
- No change to the other four tools' install stance (their READMEs still document the subset form).
- No change to the installer script, `getting-started/install.md`, or the per-tool `readme` pages (those self-correct via the daily pull).
- The `conventions/tool-page-rubric` memory update is hydrate-owned (see intake Affected Memory), not an apply task.

### Design Decisions

#### Component-internal map, not a page prop
**Decision**: A component-internal full-toolkit map keyed by tool slug, sitting next to the existing `shll` carve-out.
**Why**: The sibling-tool dependency is a property of the tool, not of the page that renders it; the component is already the single source of the per-tool one-liner (`moju`), and the `shll` branch is precedent for a tool-intrinsic carve-out living inside the component.
**Rejected**: A page-authored prop (`<InstallOneLiner tool="fab-kit" fullToolkit />`) — it would scatter a tool-intrinsic fact across pages and reopen the hand-authored drift surface the single-source design closed.
*Introduced by*: 260721-lsgl-full-toolkit-install-fab-run-kit

## Tasks

### Phase 2: Core Implementation

- [x] T001 Add the `FULL_TOOLKIT` map (slug → sibling-dependency reason clause) to `sites/astro-starlight-terminal1/src/components/InstallOneLiner.astro`'s frontmatter script, next to the `isShll` carve-out, and branch the one-liner so map tools build the whole-toolkit string (single shared base string; no `sh -s --` suffix) <!-- R1, R2 -->
- [x] T002 Add the full-toolkit note branch to the component markup: three-way render (shll / full-toolkit / subset) where map tools get the README-mirroring note (sibling reason + "so the full-toolkit install is the supported path") with the `/getting-started/install/` link, and no follow-on block <!-- R3, R4 -->
- [x] T003 Update the component's top doc-comment (header line, `SHLL IS SPECIAL` section, `SINGLE SOURCE` section) to describe the full-toolkit class alongside the shll carve-out and the subset default <!-- R6 -->

### Phase 3: Integration & Edge Cases

- [x] T004 Build the live site (`pnpm install && pnpm build` in `sites/astro-starlight-terminal1`) and verify the built HTML: fab-kit + run-kit install sections carry the whole-toolkit one-liner + new note and no follow-on block; shll (overview + homepage) and idea/hop/wt/tu install sections are unchanged; no `sh -s -- fab-kit` / `sh -s -- run-kit` remains in `dist/` <!-- R5 -->

## Acceptance

### Functional Completeness

- [x] A-001 R1: `InstallOneLiner.astro` carries a component-internal full-toolkit map keyed by slug with exactly `fab-kit` and `run-kit` entries (each with its sibling-dependency reason); the component's props interface is unchanged
- [x] A-002 R2: The built fab-kit and run-kit overview pages render the one-liner `curl -fsSL https://shll.ai/install | sh` with no `sh -s -- <tool>` suffix
- [x] A-003 R3: Both pages render a note mirroring the canonical README wording (per-tool sibling reason + "so the full-toolkit install is the supported path") with a working `/getting-started/install/` link
- [x] A-004 R6: The component doc-comment accurately describes the three render classes (shll bootstrap / full-toolkit map / subset default)

### Behavioral Correctness

- [x] A-005 R4: The follow-on steps block (`shll shell-setup` etc.) renders only for `tool === 'shll'` — absent from the fab-kit and run-kit renders
- [x] A-006 R5: The shll branch (overview + homepage render) and the four subset tools (idea/hop/wt/tu) render byte-identical install sections to the pre-change build; roster guards, `<Code>` usage, and the scoped `<style>` block are unchanged

### Scenario Coverage

- [x] A-007 R5: The site builds cleanly (`pnpm build`), and a `dist/` grep confirms no `sh -s -- fab-kit` or `sh -s -- run-kit` remains anywhere

### Edge Cases & Error Handling

- [x] A-008 R5: A missing `tool` prop or a non-roster slug still fails the build with the existing descriptive errors

### Code Quality

- [x] A-009 Pattern consistency: New code follows the component's existing style (const maps in frontmatter, doc-comment conventions, `not-content` markup, note class reuse)
- [x] A-010 No unnecessary duplication: The whole-toolkit command string is single-sourced within the component (no second literal drifting from the `shll` branch); no new styles or link rules duplicated

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`

## Deletion Candidates

- None — this change adds a new full-toolkit render branch inside `InstallOneLiner.astro` without making existing code redundant. The `isShll` branch, the subset branch, the roster guards, and the follow-on block are all still reached; the whole-toolkit literal was refactored into `WHOLE_TOOLKIT_ONE_LINER` (a single source both the shll and full-toolkit branches reuse), which removes duplication rather than leaving a dead symbol.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Confident | Note frame: "Installs the entire `shll` toolkit via Homebrew — `<tool>` relies on its sibling tools ({reason}), so the full-toolkit install is the supported path. See the full install guide." — sibling names rendered as plain text inside the parenthetical (no per-name `<code>` chips) | Intake #5/#6 left exact phrasing/literal shape to apply; plain-string map values avoid markup-in-data or `set:html`; the frame mirrors both READMEs verbatim where they agree and the link lands on `/getting-started/install/` as required | S:70 R:95 A:85 D:70 |
| 2 | Confident | Refactor the one-liner literal into one shared base string (`curl -fsSL https://shll.ai/install \| sh`) with the subset form appending `-s -- ${tool}` | Keeps the whole-toolkit string single-sourced across the shll and full-toolkit branches (code-quality: no magic-string duplication); behavior-identical output | S:75 R:95 A:90 D:75 |
| 3 | Certain | Verification is the site build plus a `dist/` HTML grep — no component test harness exists for `.astro` files in this site (no test script in `package.json`) | Observed: `package.json` has only dev/build/preview/astro scripts; build-time throw guards + rendered-output inspection are the established verification for this component class | S:85 R:90 A:95 D:90 |

3 assumptions (1 certain, 2 confident, 0 tentative).
