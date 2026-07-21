# Intake: Full-toolkit install one-liner for fab-kit and run-kit overviews

**Change**: 260721-lsgl-full-toolkit-install-fab-run-kit
**Created**: 2026-07-22

## Origin

Created promptless (deferred questioning) from a change description synthesized out of a preceding `/fab-discuss` conversation. No questions were asked; every decision below was either made in that discussion or graded as an assumption. The user's synthesized description, condensed:

> The `## Install` sections on the fab-kit and run-kit overview pages are stale. Both render the shared single-source component `InstallOneLiner.astro` (convention established by change `moju`), which emits the per-tool subset one-liner `curl -fsSL https://shll.ai/install | sh -s -- <tool>`. But the canonical tool READMEs — the constitution's source of truth (Tool-Page Depth constraint) — have changed stance for exactly these two tools: both now document the whole-toolkit one-liner `curl -fsSL https://shll.ai/install | sh`, because each relies on its sibling tools (fab-kit on `wt` and `idea`; run-kit on `wt`), so the full-toolkit install is the supported path. Fix the component so these two tools render the whole-toolkit form plus a short note mirroring the canonical README wording. Confine the change to `InstallOneLiner.astro`; do not render the shll follow-on steps for these two tools; update the component doc-comment and the `tool-page-rubric` memory (at hydrate).

Decisions from the discussion (mined into the Assumptions table below):

- **Decided**: change confined to `InstallOneLiner.astro` — no edits to either `overview.mdx` (the single-source design means the component is the sole carrier of the per-tool one-liner).
- **Decided**: a component-internal full-toolkit map alongside the existing `shll` carve-out; tools in the map render the whole-toolkit one-liner plus a short note mirroring the canonical README wording, keeping the existing link to `/getting-started/install/`.
- **Decided**: do NOT render the shll follow-on steps (`shll shell-setup` etc.) for these two tools — the follow-on block remains shll-only; the overview install section stays light and the note links to the full guide.
- **Rejected**: a page-authored prop (`<InstallOneLiner tool="fab-kit" fullToolkit />`) — the reason (sibling-tool dependency) is a property of the tool, not the page, and the branch sits naturally next to the existing component-internal `shll` carve-out.
- **Verified during discussion** (re-verified at intake against `content/<tool>/README.md`): the other four pullable tools (idea, hop, wt, tu) still document the per-tool `sh -s -- <tool>` form — this is a two-tool divergence, not component-wide.

## Why

1. **The pain point.** The hand-authored `## Install` surface on two tool overviews now contradicts the canonical source of truth. The constitution's Tool-Page Depth constraint makes each tool's own README canonical; fab-kit's and run-kit's READMEs (verified in the pulled slices `content/fab-kit/README.md` and `content/run-kit/README.md`) now document:

   ```sh
   curl -fsSL https://shll.ai/install | sh
   ```

   > Installs the entire shll toolkit via Homebrew, handling tap trust automatically. fab-kit relies on its sibling tools (`wt` for worktrees, `idea` for the backlog), so the full-toolkit install is the supported path.

   (run-kit's variant: "run-kit relies on its sibling tools (`wt` for the riff worktree flow), so the full-toolkit install is the supported path.")

   Meanwhile `src/components/InstallOneLiner.astro` still renders the per-tool subset form `curl -fsSL https://shll.ai/install | sh -s -- <tool>` for every non-`shll` tool, including these two.

2. **The consequence of not fixing it.** The subset command is not broken — it still installs `shll` + the tool — but it is no longer the supported path. A visitor following the fab-kit or run-kit overview gets a degraded setup: fab-kit without `wt`/`idea`, run-kit without `wt`. The per-tool `readme` pages self-correct via the daily pull; the overview's `InstallOneLiner` render is the hand-authored surface that keeps contradicting the canonical source until the component changes.

3. **Why this approach.** The `moju` single-source convention makes the component the sole carrier of the per-tool one-liner — so the fix belongs in the component, exactly once, next to the existing `shll` carve-out (which already renders the whole-toolkit form for a tool-intrinsic reason). A page-authored prop was rejected because the sibling-tool dependency is a property of the tool, not of the page that renders it.

## What Changes

### 1. `InstallOneLiner.astro`: a component-internal full-toolkit map

In `sites/astro-starlight-terminal1/src/components/InstallOneLiner.astro`, add a full-toolkit map alongside the existing `isShll` carve-out, keyed by tool slug, carrying the per-tool sibling-dependency reason. Sketch (exact shape/wording finalized at apply):

```js
// Tools whose canonical README documents the WHOLE-toolkit install as the
// supported path — each relies on sibling tools, so `sh -s -- <tool>` would
// yield a degraded setup. Mirrors the canonical README wording.
const FULL_TOOLKIT = {
  'fab-kit': 'fab-kit relies on its sibling tools (wt for worktrees, idea for the backlog)',
  'run-kit': 'run-kit relies on its sibling tools (wt for the riff worktree flow)',
};
```

Behavior for a tool in the map:

- **One-liner**: render the whole-toolkit form `curl -fsSL https://shll.ai/install | sh` (same string the `shll` branch already builds — no `sh -s -- <tool>`).
- **Note**: render a short note mirroring the canonical README wording — the sibling-dependency reason plus "so the full-toolkit install is the supported path" — keeping the existing link to `/getting-started/install/`. Tool names (`wt`, `idea`) appear in the note; no CLI subcommands/flags beyond the exempt `curl`/`sh` shell tokens.
- **No follow-on block**: the `shll shell-setup` / `shll agent-setup` / `exec $SHELL` follow-on `<Code>` block stays **shll-only**. The overview install section stays light; the note's link carries the visitor to the full guide.

Existing behavior preserved:

- `shll` keeps its current branch unchanged (whole-toolkit one-liner + follow-on steps + its note). The homepage's `<InstallOneLiner tool="shll" />` render is untouched.
- The other four tools (idea, hop, wt, tu) keep the per-tool subset form `curl -fsSL https://shll.ai/install | sh -s -- ${tool}` and their existing note.
- The roster guards (`!tool` throw, `isToolSlug` gate), the Expressive Code `<Code>` rendering (copy-button parity), and the scoped layout-only `<style>` block are all unchanged.

### 2. `InstallOneLiner.astro`: doc-comment update

The component's top doc-comment describes the current world (`SINGLE SOURCE` / `SHLL IS SPECIAL` sections; the header line saying it renders the installer "scoped to a single tool"). Update it to describe the new class of full-toolkit tools: `shll` (bootstrap meta-CLI, not an install target) plus the tools whose canonical README declares the whole-toolkit install the supported path (sibling-tool dependency), with the remaining tools rendering the subset form.

### 3. No page edits

Neither `sites/astro-starlight-terminal1/src/content/docs/tools/fab-kit/overview.mdx` nor `.../run-kit/overview.mdx` changes — both already render `<InstallOneLiner tool="<slug>" />` and the single-source design keeps the fix inside the component.

### 4. Memory (at hydrate)

`docs/memory/conventions/tool-page-rubric.md` records the `moju` convention that "the other six tools each render `sh -s -- <own-slug>`" with `shll` as the sole carve-out. That sentence becomes stale: the carve-out becomes a class — `shll` plus the full-toolkit-map tools (fab-kit, run-kit) render the whole-toolkit one-liner; the remaining four render the subset form. Updated at hydrate (see Affected Memory).

## Affected Memory

- `conventions/tool-page-rubric`: (modify) Update the `moju` `## Install` section's account: the `shll` sole-carve-out statement ("the other six tools each render `sh -s -- <own-slug>`") is superseded by the full-toolkit class (shll + fab-kit + run-kit whole-toolkit; idea/hop/wt/tu subset), including the tool-intrinsic-property rationale and the README-stance trigger.

## Impact

- **Code**: one file — `sites/astro-starlight-terminal1/src/components/InstallOneLiner.astro` (logic + note markup + doc-comment). No new files, no page edits, no config changes.
- **Rendered surfaces**: `/fab-kit/` and `/run-kit/` overview `## Install` sections (and nothing else — `/shll` homepage render and the four subset tools are behavior-preserved).
- **Constitution**: V (dark-mode parity) and VI (no new deps) unaffected — the component keeps the Expressive Code `<Code>` block and existing token-driven styles (`--c-*`, `.install-one-liner-note` riding the shared terminal-link selector group). Constitution I (static-first) unaffected — build-time render as before.
- **`vn39` hard rule** (hand-written prose): satisfied — the note names tool names (`wt`, `idea`) but no CLI subcommands/flags beyond the exempt `curl`/`sh` shell tokens. If apply adds any command token, it must resolve in the relevant `help/<tool>.json`.
- **Out of scope**: the fab-kit README's `fab init` existing-project setup (repo-scoped, not machine install); the per-tool `readme` pages (self-correct via the daily pull); the other four tools' install stance.

## Open Questions

- None — the preceding discussion resolved the approach, the rejected alternative, and the scope; residual choices (exact note copy, map literal shape) are graded Confident below and are apply-time decisions.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Change confined to `InstallOneLiner.astro`; no `overview.mdx` edits | Discussed — decided; the `moju` single-source design makes the component the sole carrier of the one-liner | S:90 R:85 A:95 D:90 |
| 2 | Certain | Component-internal full-toolkit map keyed by slug, next to the existing `shll` carve-out; page-authored `fullToolkit` prop rejected | Discussed — rejected alternative recorded; sibling-tool dependency is a property of the tool, not the page | S:90 R:80 A:90 D:85 |
| 3 | Certain | Full-toolkit tools render exactly the whole-toolkit one-liner — `curl -fsSL https://shll.ai/install` piped to `sh` (no `sh -s -- <tool>` suffix) | Verbatim in both canonical READMEs and identical to the existing `shll` branch's string | S:95 R:90 A:95 D:95 |
| 4 | Certain | No shll follow-on block (`shll shell-setup` etc.) for fab-kit/run-kit — follow-on stays shll-only | Discussed — decided; overview install stays light, note links to the full guide | S:85 R:90 A:85 D:85 |
| 5 | Confident | Note copy mirrors the canonical README wording (sibling-dependency reason + "so the full-toolkit install is the supported path") and keeps the `/getting-started/install/` link; exact phrasing finalized at apply | Both README sentences quoted in the discussion and re-verified against `content/<tool>/README.md`; several valid phrasings around the same content | S:70 R:90 A:80 D:70 |
| 6 | Confident | Map literal shape: slug → per-tool reason clause (shared sentence frame in the markup), per the discussion's sketch | Description gives an example shape; exact literal vs. full-sentence values is a reversible apply-time detail | S:75 R:95 A:80 D:60 |
| 7 | Certain | Update the component doc-comment (`SINGLE SOURCE` / `SHLL IS SPECIAL` sections) to describe the full-toolkit class | Explicitly listed in the description; doc-comment currently states the superseded two-way world | S:80 R:95 A:90 D:85 |
| 8 | Certain | `conventions/tool-page-rubric` updated at hydrate — the "other six tools each render `sh -s -- <own-slug>` / shll sole carve-out" sentence is superseded | Explicitly identified in the description as the affected memory | S:80 R:90 A:90 D:85 |
| 9 | Certain | `shll` branch, homepage `<InstallOneLiner tool="shll" />`, and the four subset tools (idea/hop/wt/tu) are behavior-preserved | Re-verified at intake: only fab-kit/run-kit READMEs changed stance; two-tool divergence, not component-wide | S:85 R:90 A:95 D:90 |
| 10 | Certain | `vn39` compliance: the new note names tool names only (`wt`, `idea`) plus exempt `curl`/`sh` tokens — no `help/<tool>.json` cross-check friction | Constraint identified in the discussion; tool names and shell tokens are documented exempt categories in `tool-page-rubric` | S:85 R:90 A:90 D:90 |

10 assumptions (8 certain, 2 confident, 0 tentative, 0 unresolved).
