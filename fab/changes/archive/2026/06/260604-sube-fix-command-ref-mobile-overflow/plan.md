# Plan: Fix command-reference horizontal overflow on mobile

**Change**: 260604-sube-fix-command-ref-mobile-overflow
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

<!-- A scoped, CSS-only containment fix in CommandReference.astro. The chosen
     remedy (intake assumption #1, user-decided) is scroll-INSIDE-the-box, not a
     stacked-card reflow. Requirements are framed around that decision. -->

### Command reference: mobile horizontal containment

#### R1: Flags table scrolls inside its own container
The flags table (`.cmd-flag-table`, `width:100%`, with `.cmd-flag-name code { white-space:nowrap }` and `nowrap` badges) MUST be wrapped in a dedicated horizontal-scroll container so a table wider than the viewport scrolls *within* the command box instead of propagating overflow up to `.cmd-node` → `.cmd-reference` → the page. The container MUST mirror the existing `.cmd-text` precedent (`overflow-x: auto`) and add `-webkit-overflow-scrolling: touch` for iOS momentum.

- **GIVEN** a tool whose command has many flags or a long flag like `--worktree-name <name>` rendered on a narrow (≈320px) viewport
- **WHEN** the command's `<details>` is expanded and the user pans horizontally over the flags table
- **THEN** the flags table scrolls horizontally inside the box while the box edge stays pinned to the viewport (the page itself does not pan)
- **AND** the existing per-command flag-filter input, copy buttons, and `data-cmd-flags`/`data-cmd-filter` hooks continue to work (the wrapper sits between `.cmd-flags` and the `<table>`, not around the head/no-match elements)

#### R2: Wide flex children cannot dictate the body's min-content width
`.cmd-body` (a `display:flex; flex-direction:column` container) MUST set `min-width: 0` so a wide flex child cannot establish a min-content width wider than the box. This is the standard flexbox-overflow guard and pairs with R1's scroll container.

- **GIVEN** the structured command body containing a wide child (flags table, usage line, examples block)
- **WHEN** the body is laid out on a narrow viewport
- **THEN** `.cmd-body` is permitted to shrink below its widest child's intrinsic width, so wide children are contained/scrolled rather than expanding the body

#### R3: Command summary path cannot expand the box on the narrowest viewports
`.cmd-summary` is a CSS grid whose lane 2 is `auto` and holds `.cmd-path` with `white-space: nowrap`. The longest real command path (`fab pane window-name replace-prefix`, 35 chars) plus the marker, gaps, and copy button can exceed a ≈320px viewport, making the grid's min-content wider than the box and contributing to page-level pan. `.cmd-summary` MUST set `min-width: 0` so the grid can shrink below its content's min-content width; the nowrap path is then clipped by `.cmd-node`'s existing `overflow: hidden` rather than widening the box. (Per intake assumption #6 this was a verify-only item; verification confirmed the longest path realistically overflows the narrowest viewport — see Assumptions row 4.)

- **GIVEN** the longest command path (`fab pane window-name replace-prefix`) on a ≈320px viewport
- **WHEN** the command row (`.cmd-summary`) is laid out
- **THEN** the grid shrinks to the available width and the nowrap path is clipped by the box's `overflow: hidden`, not allowed to push the box/page wider

### Non-Goals

- The raw `-h` `<pre>` (`.cmd-text`) — already has `overflow-x: auto`; left untouched (intake assumption #5).
- `.cmd-usage-row` — verify-only per intake #6; verification found it does NOT need a change. `.cmd-usage-text` already has `overflow-x: auto`, its `<code>` content wraps on spaces (small min-content = longest token), and the row's copy button is `flex: none`. No patch (see Assumptions row 5).
- `CommandIndex.astro` — its rows already use `flex-wrap: wrap`; out of scope.
- No stacked-card / responsive-reflow mode (explicitly rejected during discussion).
- The progressive-enhancement `<script>` (copy + filter + expand/collapse + raw toggle) — must remain untouched and functional (Constitution I).

### Design Decisions

1. **Scroll-inside-the-box, not stacked-card reflow**: wrap the flags table in `div.cmd-flag-scroll { overflow-x:auto; -webkit-overflow-scrolling:touch }`. — *Why*: matches the user's report and the existing `.cmd-text` precedent in the same component; keeps the tabular/terminal aesthetic exact. — *Rejected*: reflowing the table into label/value cards on mobile (more code, a second render mode, diverges from the terminal aesthetic).
2. **Wrapper placement is the table only**: the `<div class="cmd-flag-scroll">` wraps just `<table class="cmd-flag-table">`, leaving `.cmd-flags-head` (filter input) and `.cmd-no-match` as siblings outside it. — *Why*: only the table is the wide element; keeping the head/no-match outside preserves the filter layout and the `[data-cmd-flags]` container's direct `.cmd-flag-row` lookups in the script (rows are still found via `container.querySelectorAll('.cmd-flag-row')`, which descends through the new wrapper).
3. **`min-width:0` on `.cmd-summary` as well as `.cmd-body`**: the summary grid is a distinct, second overflow source (nowrap path) not covered by the body fix. — *Why*: data verification (longest path = 35 chars) shows it can overflow the narrowest viewport; `min-width:0` is the minimal, layout-preserving guard consistent with the existing `.cmd-short { min-width:0 }` idiom already in the file.

## Tasks

### Phase 2: Core Implementation

- [x] T001 In `sites/astro-starlight-terminal1/src/components/CommandReference.astro`, wrap the `<table class="cmd-flag-table">` (and only the table) in a new `<div class="cmd-flag-scroll">` inside the `.cmd-flags` block, leaving `.cmd-flags-head` and `.cmd-no-match` as siblings <!-- R1 -->
- [x] T002 In the same file's scoped `<style>`, add a `.cmd-flag-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }` rule (placed in the flags-table section, with an explanatory comment matching the file's comment density, mirroring the `.cmd-text` precedent) <!-- R1 -->
- [x] T003 In the same `<style>`, add `min-width: 0;` to the `.cmd-body` rule with a brief flexbox-overflow comment <!-- R2 -->
- [x] T004 In the same `<style>`, add `min-width: 0;` to the `.cmd-summary` rule with a brief comment noting it lets the grid shrink below the nowrap-path min-content <!-- R3 -->

### Phase 3: Verification

- [x] T005 Run `npm run build` in `sites/astro-starlight-terminal1` and confirm it completes; verify the edited markup (balanced tags, wrapper nests the table only) and CSS (valid rules, new selector matches the new wrapper) by re-reading <!-- R1 R2 R3 -->

## Acceptance

### Functional Completeness

- [x] A-001 R1: The flags table is wrapped in `div.cmd-flag-scroll` styled `overflow-x: auto; -webkit-overflow-scrolling: touch;`, mirroring `.cmd-text`; the filter input and no-match note remain outside the wrapper.
- [x] A-002 R2: `.cmd-body` has `min-width: 0`.
- [x] A-003 R3: `.cmd-summary` has `min-width: 0`.

### Behavioral Correctness

- [x] A-004 R1: The wrapper sits between `.cmd-flags` and `<table>`; the script's `container.querySelectorAll('.cmd-flag-row')`, `[data-cmd-filter]`, copy buttons, and `[data-cmd-no-match]` lookups still resolve (no behavior regression in filter/copy).
- [x] A-005 R1 R2 R3: A wide flags table / long command path scrolls or is clipped inside the box; overflow no longer propagates to `.cmd-node`/`.cmd-reference`/page (the chosen scroll-inside-the-box remedy).

### Scenario Coverage

- [x] A-006 R1: GIVEN a command with a long flag on a narrow viewport, panning the flags table scrolls it inside the box, not the page (verified by build success + structural inspection, since no live mobile browser is available).

### Edge Cases & Error Handling

- [x] A-007 R3: The longest real path (`fab pane window-name replace-prefix`, 35 chars) does not widen the box on a ≈320px viewport; it is clipped by `.cmd-node`'s `overflow: hidden`.

### Code Quality

- [x] A-008 Pattern consistency: New CSS/markup follows the component's existing idiom (scoped `<style>`, `--c-*` tokens only, thorough explanatory comments matching the file's density); the `.cmd-flag-scroll` rule mirrors `.cmd-text`.
- [x] A-009 No unnecessary duplication: Reuses the existing `overflow-x: auto` / `min-width: 0` patterns already present in the file (`.cmd-text`, `.cmd-short`) rather than inventing new mechanisms.
- [x] A-010 No magic values: New rules use only existing idioms; no new magic numbers or hard-coded breakpoints (no media query needed — containment is breakpoint-agnostic).

### Constitution

- [x] A-011 Constitution I (static-first): Change is pure CSS + static markup; no runtime, no data fetch; the progressive-enhancement `<script>` is untouched and still functional.
- [x] A-012 Constitution V (dark-mode parity): No `--c-*` token added/removed/changed; a scroll container is theme-agnostic — parity preserved.
- [x] A-013 Accessibility: The `overflow-x: auto` region is keyboard-scrollable; no focusable element (filter input, copy buttons) is hidden or removed.

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- No live mobile browser is available in this environment; behavioral acceptance is verified via a successful `npm run build` plus structural re-reading of the markup/CSS. The DOM-toggle script is unaffected by a wrapper `<div>` because it queries `.cmd-flag-row` descendants of `[data-cmd-flags]`.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Remedy is scroll-inside-the-box (wrap table in `.cmd-flag-scroll { overflow-x:auto }`), not a stacked-card reflow | User-decided in discussion (intake assumption #1); mirrors the existing `.cmd-text` precedent | S:98 R:80 A:90 D:95 |
| 2 | Certain | Wrapper wraps only the `<table>`, leaving `.cmd-flags-head` and `.cmd-no-match` as siblings | Only the table is the wide element; keeps the filter layout and `[data-cmd-flags]` script hooks intact (rows still found via descendant query) | S:90 R:80 A:90 D:90 |
| 3 | Confident | Add `min-width: 0` to `.cmd-body` (the column flex container) as the standard flexbox-overflow guard | Intake assumption #4; standard fix, harmless, pairs with the scroll container; the file already uses `min-width:0` on `.cmd-short` | S:80 R:85 A:85 D:80 |
| 4 | Confident | Patch `.cmd-summary` with `min-width: 0` (resolves intake verify-only #6 for the summary) | Verified: longest real path `fab pane window-name replace-prefix` (35 chars) + marker + gaps + copy button realistically exceeds a ≈320px viewport; the `auto` grid lane holding a `nowrap` path will otherwise widen the box. `min-width:0` lets the grid shrink and the path is clipped by the node's existing `overflow:hidden`. Minimal, layout-preserving, matches the existing `.cmd-short{min-width:0}` idiom | S:70 R:80 A:75 D:70 |
| 5 | Confident | Do NOT patch `.cmd-usage-row` / `.cmd-usage-text` (resolves intake verify-only #6 for the usage row) | Verified: `.cmd-usage-text` already has `overflow-x:auto`; its `<code>` content wraps on spaces (min-content = longest token, small), and the copy button is `flex:none`. The flex row does not establish a box-wider min-content. No change needed | S:75 R:85 A:80 D:75 |
| 6 | Confident | No media query / breakpoint — containment is breakpoint-agnostic | `overflow-x:auto` + `min-width:0` engage only when content exceeds the box at any width; adding a breakpoint would be an unnecessary magic value | S:80 R:85 A:85 D:80 |
| 7 | Certain | Verification = `npm run build` success + structural re-read (no live mobile browser) | Static-site test surface per the dispatch brief and Constitution I; no test runner for `.astro` components beyond the build | S:90 R:90 A:90 D:90 |

7 assumptions (3 certain, 4 confident, 0 tentative).

## Deletion Candidates

- None — this change adds a CSS-only containment wrapper (one `<div>` + three scoped rules) without making any existing code, file, branch, or config redundant. The `.cmd-text`/`.cmd-short` precedents it mirrors remain in active use.
