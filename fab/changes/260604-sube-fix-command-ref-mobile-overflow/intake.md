# Intake: Fix command-reference horizontal overflow on mobile

**Change**: 260604-sube-fix-command-ref-mobile-overflow
**Created**: 2026-06-04
**Status**: Draft

## Origin

Surfaced in a `/fab-discuss` session, then promoted to a change. The user's raw report:

> On a mobile there is no way to scroll right to view the full content of a command section. If you tap and move the page to the left, the whole expanded command box moves to the left. The actual body is hidden by the command box. Instead — what should scroll is the content inside the collapsible box.

Interaction mode: conversational. During discussion the agent read `CommandReference.astro` and `CommandIndex.astro`, traced the root cause, and confirmed via `terminal.css` that no global rule covers it. The agent presented two remedies (scroll-inside-the-box vs. stacked-card reflow) and the user **chose scroll-inside-the-box** — it matches the report and preserves the terminal/tabular aesthetic.

## Why

1. **The pain point** — On a narrow viewport, an expanded command's body is wider than the screen. Because no wide child has its own horizontal-scroll container, the overflow propagates up to `.cmd-node` → `.cmd-reference` → the document. Panning right pans the *whole page* (and the whole box) left; the box is wider than the viewport, so the right side of the body (the flags table's later columns) stays hidden behind the layout. There is no in-box scroll, so that content is effectively unreachable on mobile.

2. **The consequence if unfixed** — The command reference is the centerpiece of every tool's `commands` page. On phones (a terminal-tool audience that does browse from mobile) the flags table's type/description/copy columns are simply unreadable, and the page-level horizontal pan degrades the whole page's feel. This erodes the site's core value: understanding a tool deeply *on the site* (Constitution, Tool-Page Depth).

3. **Why this approach over alternatives** — Scroll-inside-the-box keeps the tabular layout exact and reads as "a terminal pane you scroll within," consistent with the existing raw `<pre>` (`.cmd-text`) which *already* does this correctly via `overflow-x: auto`. The rejected alternative — reflowing the table into stacked label/value cards on mobile — is more readable in the abstract but diverges further from the terminal aesthetic, is more code, and introduces a second rendering mode to maintain. The raw-`<pre>` precedent shows scroll-inside-the-box is the established pattern in this very component.

## What Changes

All changes are in `sites/astro-starlight-terminal1/src/components/CommandReference.astro` — CSS (and a thin wrapper element) only. No data, no schema, no parse changes; the build-time render and progressive-enhancement JS are untouched.

### 1. Give the flags table its own horizontal-scroll container

The flags table (`.cmd-flag-table`, `width: 100%`) has cells that cannot shrink — `.cmd-flag-name code` is `white-space: nowrap` (and the badges are `nowrap`), so a long flag like `--worktree-name <name>` forces an intrinsic width that can exceed a phone viewport. Today the table sits directly in `.cmd-body` with nothing to absorb that width.

Wrap the `<table>` in a scroll container (e.g. a `div.cmd-flag-scroll` around the existing `<table class="cmd-flag-table">`) styled:

```css
.cmd-flag-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch; /* momentum scroll on iOS */
}
```

So the table scrolls horizontally *within* the box while the box edge stays pinned to the viewport. Mirrors the raw `<pre>`'s existing `overflow-x: auto`.

### 2. Stop `.cmd-node` / `.cmd-body` from being a page-level overflow source

`.cmd-node` is `overflow: hidden` already, but its flex child `.cmd-body` (a `display:flex; flex-direction:column`) lets a wide grid/table child dictate the column's min-content width, which can still push the node wider than its parent. Add `min-width: 0` to `.cmd-body` (the standard flexbox fix that lets a flex item shrink below its content's intrinsic width) so wide children are clipped to the available width and forced to scroll inside their own container rather than expanding the box.

If testing shows the `.cmd-summary` grid (which has a `minmax(0, 1fr)` short-text lane and a `white-space: nowrap` `.cmd-path`) can also overflow on very narrow screens with a long command path, allow the path lane to scroll or wrap there too — but the flags table is the primary culprit; treat the summary as a secondary check, not an assumed change.

### 3. Verify the usage row doesn't leak width

`.cmd-usage-text` has `overflow-x: auto` but sits in a flex row (`.cmd-usage-row`, `display:flex`). Confirm the flex row itself doesn't establish a min-content width wider than the box; if it does, the same `min-width: 0` treatment applies to the row. Verify, don't assume a change is needed.

### Out of scope

- The raw `-h` `<pre>` (`.cmd-text`) — already scrolls correctly; leave it.
- `CommandIndex.astro` — its rows already use `flex-wrap: wrap`, so they reflow rather than overflow; not part of this fix.
- No stacked-card / responsive-reflow mode (explicitly rejected in discussion).

## Affected Memory

<!-- Implementation-only CSS containment fix. It does not change the documented
     shape of the command reference (tool-page-rubric describes the enriched render,
     not its overflow mechanics), so no memory file is created or modified. -->

_None — implementation-only; no spec-level behavior change._

## Impact

- **Code**: `sites/astro-starlight-terminal1/src/components/CommandReference.astro` only (scoped `<style>` block + one wrapper element in the flags-table branch of the recursive render).
- **APIs / data / deps**: none. No new dependencies (Constitution VI).
- **Constitution**: I (static-first) — pure CSS + static markup, no runtime. V (dark-mode parity) — a scroll container is theme-agnostic; the `--c-*` tokens are untouched, parity preserved. Accessibility — an `overflow-x: auto` region is keyboard-scrollable; no focusable element is hidden.
- **Cross-site**: the fix is local to the live `astro-starlight-terminal1` site; the `astro-tailwind-terminal1` variant has its own stack and is not deployed (Constitution II).

## Open Questions

_None — root cause located, remedy chosen, scope bounded during discussion._

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Remedy is scroll-inside-the-box, not a stacked-card reflow | Discussed — user explicitly chose this option over reflow | S:98 R:80 A:90 D:95 |
| 2 | Certain | Root cause is the flags table (+ wide body children) lacking an own horizontal-scroll container, so overflow propagates to `.cmd-node`/page | Discussed — traced by reading the component; `.cmd-flag-name code` is `nowrap`, table is `width:100%`, nothing wraps it | S:95 R:75 A:90 D:90 |
| 3 | Certain | Fix is scoped to `CommandReference.astro` (scoped CSS + one wrapper element) | Component owns all its styles; `terminal.css` has no rule covering it; no other file involved | S:90 R:80 A:95 D:90 |
| 4 | Confident | Wrap the table in `div.cmd-flag-scroll { overflow-x:auto }` and add `min-width:0` to `.cmd-body` | Standard flexbox-overflow fix; mirrors the existing `.cmd-text` `overflow-x:auto` precedent in the same component | S:80 R:80 A:85 D:80 |
| 5 | Confident | Raw `<pre>` (`.cmd-text`) needs no change — already `overflow-x:auto` | Read in source; already scrolls correctly | S:90 R:90 A:90 D:90 |
| 6 | Tentative | `.cmd-summary` grid and `.cmd-usage-row` are verify-only, not assumed changes | They *may* contribute width on extreme narrow widths with long paths; treat as a manual check during apply, only patch if observed | S:55 R:75 A:60 D:55 |

6 assumptions (3 certain, 2 confident, 1 tentative, 0 unresolved).
