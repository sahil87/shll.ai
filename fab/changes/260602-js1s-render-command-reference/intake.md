# Intake: Render the CLI Command Reference on shll.ai

**Change**: 260602-js1s-render-command-reference
**Created**: 2026-06-02
**Status**: Draft

## Origin

> feat: render the CLI Command reference on the live shll.ai site — the follow-up to the merged help-collection contract (PR #12). Build a CommandReference.astro component in the live Starlight site (sites/astro-starlight-terminal1) that imports the existing Zod schema (src/lib/schemas.ts), reads help/<tool>.json from the repo root (the cross-boundary read documented in docs/memory/conventions/help-collection.md), validates it, and renders the recursive command tree (root help text + each subcommand, e.g. wt create / wt list, nested where present like rk riff) as a terminal-styled, collapsible reference. Wire it into each tool's dedicated Starlight `commands` page (src/content/docs/tools/<tool>/commands.{md,mdx}) per the tool-page-rubric amendment — these pages are .mdx so they can import the component. Only wt has real data today (help/wt.json), so wt's commands page renders now and renders the others automatically as each producer's help/<tool>.json lands; the component must degrade gracefully when a tool has no help json yet. Honor Constitution: static-first (render at build, no runtime fetch), dark-mode parity, accessibility (keyboard-navigable collapsibles, focus states), minimal deps.

**Interaction mode**: This is the explicit, pre-planned **follow-up** to change `260602-xiis-help-collection-contract` (merged as PR #12). That change shipped the *contract* (schema, validator, collector, receiving workflow, memory docs) and deferred *rendering* as a non-goal. This change is the rendering half. It builds entirely on artifacts already merged to `main`: `sites/astro-starlight-terminal1/src/lib/schemas.ts` (the Zod `NodeSchema`/`HelpDocSchema`), `help/wt.json` (the one real data file today), and the `tool-page-rubric` amendment (which already declared the per-tool `commands` page as the chosen placement).

**Key decisions reached (this session + prior):**
1. **Target = live Starlight site** (`sites/astro-starlight-terminal1`, per `SITE_DIR`). Established in the contract change after the live-site swap was caught.
2. **Placement = per-tool `commands` page** (`src/content/docs/tools/<tool>/commands.mdx`), the rubric-declared decision — not an expandable block on overview, not a separate route.
3. **Generated REPLACES hand-written** — idea and fab-kit currently have curated `commands.md` prose; all 7 tools convert to `.mdx` rendering `<CommandReference>` uniformly. The curated prose is not lost but **relocated to its canonical home — the binary's own `-h`**: rather than keep hand-written site copy (which drifts), the explanation moves into each command's cobra `Long` field, so it (a) helps real terminal users and (b) flows automatically through the producer into `help/<tool>.json` → the site. That enrichment is tracked as a backlog item in the *tool* repos (idea: `e3rk`), NOT in this site change — this change just renders whatever `text` the binary emits. So from the site's side, generated replaces hand-written; the prose's survival is handled at the source.
4. **Reuse the existing schema** — the component imports `NodeSchema`/`HelpDocSchema` from `src/lib/schemas.ts` and validates at build time; no second shape, no new dependency.
5. **Graceful degradation** — only `help/wt.json` exists today; the component must render a clear "reference coming soon / not yet generated" state for tools whose `help/<tool>.json` is absent, so wiring all 7 pages now doesn't break the build.

## Why

**Problem.** PR #12 shipped the contract and the `wt` sample, but nothing renders it — `src/lib/schemas.ts` has zero importers, and no tool page shows a command reference. The feature is invisible to site visitors until the rendering layer exists.

**Why now.** The contract is merged and stable, the placement decision is made, and we have one real data file (`help/wt.json`) to build against. Everything needed to render is in place; this is the natural next step.

**Why this approach.** A single reusable Astro component (`CommandReference.astro`) that reads + validates + renders is the minimal way to light up all 7 tools from one implementation. Because Starlight `commands` pages are MDX, they can `import` the component directly (the same pattern `index.mdx` uses for `Diagram.astro`). Rendering at build time keeps the site static (Constitution I) — the JSON is read during `astro build`, frozen into HTML, no runtime fetch.

**Consequence of not doing it.** The contract sits unused; the value the whole effort was aimed at (authoritative, drift-free command docs on the site) never reaches visitors.

## What Changes

### 1. `CommandReference.astro` component

New component at `sites/astro-starlight-terminal1/src/components/CommandReference.astro`. Responsibilities:
- **Prop**: `tool` (the slug, e.g. `"wt"`) — and/or the resolved help doc; finalize the prop shape at spec.
- **Load**: read `<repo-root>/help/<tool>.json` at build time. Because the component lives in the site and the data is at repo root, this is the documented cross-boundary read (a relative path up out of the site dir, or Vite `import.meta.glob` / `fs` at build). Spec to pick the exact mechanism (a build-time `fs.readFile` on a resolved path, or `import.meta.glob('/../../help/*.json')` — must work under `astro build` + GitHub Pages, static only).
- **Validate**: parse the JSON through `HelpDocSchema` from `src/lib/schemas.ts`. On a schema failure, fail the build loudly (a malformed committed help file should not silently render nothing) — OR surface a visible error block; spec to decide build-fail vs visible-error.
- **Render**: the recursive command tree —
  - Root: the tool's top-level `-h` `text` (the full raw output, in a terminal-styled `<pre>`).
  - Each subcommand (`commands[]`), recursively: a collapsible entry showing `path` (e.g. `wt create`), `short`, and its raw `text`. Nested subcommands (e.g. `rk riff`) nest visually.
- **Degrade gracefully**: when `help/<tool>.json` does not exist, render a clear placeholder ("Command reference not generated yet — see the GitHub README") instead of erroring, so all 7 pages can be wired before all 7 producers ship.

### 2. Terminal styling, dark-mode parity, accessibility

- Style with the site's existing terminal aesthetic — reuse `src/styles/terminal.css` tokens (the `--c-*` CSS variables, `shell-session`/`not-content` patterns seen in `index.mdx`) rather than inventing a palette.
- **Dark-mode parity (Constitution V)**: render correctly in both themes. Follow the `Diagram.astro` precedent if any JS theme-awareness is needed, but prefer CSS variables that already flip with Starlight's `data-theme` so no script is required.
- **Accessibility**: collapsibles MUST be keyboard-navigable with visible focus states. Prefer native `<details>`/`<summary>` (keyboard + screen-reader support for free) over a custom JS accordion. Color contrast WCAG AA in both themes.

### 3. Wire all 7 tools' `commands` pages

Convert each tool's commands page to `.mdx` importing the component:
- `src/content/docs/tools/<tool>/commands.mdx` for all of: idea, hop, fab-kit, wt, run-kit, tu, shll.
- idea and fab-kit currently have hand-written `commands.md` — replace with the generated component (curated prose dropped, decision #3).
- The other 5 currently have no commands page — create one. NOTE: the Starlight sidebar in `astro.config.mjs` currently lists only idea & fab-kit with a `commands` slug; the other 5 list only `overview`. Adding commands pages for them requires adding the sidebar entries too (the sidebar is hardcoded in `astro.config.mjs`). Spec to confirm sidebar updates are in scope.
- Each page's frontmatter: `title: Commands`, a `description`.

### 4. Verify against real data + build

- `wt`'s page renders the real `help/wt.json` (top-level + create/delete/init/list/open/shell-init/update, all leaves).
- The 6 tools without data render the graceful placeholder.
- `astro build` succeeds (static output) and the existing deploy is unaffected.

### Out of scope

- The 7 producers (sibling repos, already seeded as backlog items) — unchanged.
- Any change to the schema/validator/workflow shipped in PR #12.
- Generating real `help/<tool>.json` for tools other than `wt` (that's the producers' job).

## Affected Memory

- `conventions/tool-page-rubric`: (modify) The amendment from PR #12 declared the `commands`-page placement; this change implements it and may refine the rubric to note the generated page now REPLACES hand-written command prose (idea/fab-kit converted), and that `commands` pages are `.mdx` importing `CommandReference`.
- `conventions/help-collection`: (modify) Note that the consume-side rendering now exists — the `CommandReference` component + the build-time read mechanism + graceful-degradation behavior — closing the loop the contract doc described as "follow-up".
- `site/` memory under `sites/astro-starlight-terminal1/docs/memory/` (if that per-site memory exists): (new/modify) document the component + the sidebar/commands-page convention. [verify whether per-site memory exists]

## Impact

- **New component** in the live site; **converted/new MDX pages** for 7 tools; likely **`astro.config.mjs` sidebar edits** (add `commands` slugs for 5 tools).
- **First real consumer** of `src/lib/schemas.ts` and the `help/` data — exercises the cross-boundary read end-to-end.
- **Content loss**: idea/fab-kit curated command prose is removed (decision #3) — flagged tradeoff.
- **Constitution**: I (static — build-time render, verify no runtime fetch sneaks in), V (dark-mode parity — explicit requirement), VI (minimal deps — prefer native `<details>` + existing CSS, no new packages), Accessibility (keyboard/focus/contrast).
- **Build risk**: the cross-boundary read must resolve under `astro build` on GitHub Pages — the main technical unknown; spec must nail the mechanism.

## Open Questions

All resolved during clarification (2026-06-02):

- **Read mechanism** — RESOLVED: build-time `fs.readFile` on a path resolved from the component (`import.meta.url`-relative), not `import.meta.glob`. Empirically verified against `help/wt.json`; Vite's glob is project-root-constrained and would fight a read outside the site dir.
- **Schema-failure behavior** — RESOLVED: distinguish the two cases. A **missing** `help/<tool>.json` degrades gracefully (placeholder, build succeeds) — producers will take time to land. A **present-but-schema-invalid** file FAILS the build — a committed defect must not ship.
- **Sidebar scope** — RESOLVED: in scope. Add the 5 missing `commands` sidebar entries in `astro.config.mjs` and create all 7 `commands.mdx` now; the 6 without data show the placeholder immediately.
- **Component prop** — Still open (minor, non-blocking): pass `tool` slug (component reads the file) vs pass the parsed doc (page reads). Leaning slug — simpler for page authors. Resolvable at spec/apply.

## Clarifications

### Session 2026-06-02

| Q | Answer |
|---|--------|
| Cross-boundary read mechanism (fs vs glob)? | Resolved autonomously — empirically verified build-time `fs.readFile` works; glob is root-constrained. → assumption #11 Certain |
| Sidebar scope — wire all 7 now, or only tools with data? | User: **wire all 7 now** (sidebar entries + 7 commands.mdx). → assumption #10 Certain |
| Schema-validation failure behavior? | User: a **missing** file must not fail the build (placeholders fine for now); so **missing → placeholder, present-but-invalid → fail build**. → assumptions #12, #13 Certain |

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Target the live Starlight site (sites/astro-starlight-terminal1) | Established in PR #12 after the live-site swap; SITE_DIR confirms | S:95 R:80 A:92 D:95 |
| 2 | Certain | Render as the per-tool `commands` page (commands.mdx importing the component) | Rubric-declared placement decision from PR #12; user reconfirmed this session | S:95 R:75 A:90 D:92 |
| 3 | Certain | Generated REPLACES hand-written command prose; all 7 tools treated uniformly | Discussed this session — user explicitly chose "generated replaces hand-written" over augment/only-where-missing | S:95 R:60 A:85 D:90 |
| 4 | Certain | Reuse src/lib/schemas.ts (NodeSchema/HelpDocSchema); no new shape, no new dependency | Merged contract already defines the schema; this is its first consumer | S:95 R:75 A:92 D:92 |
| 5 | Certain | Component must degrade gracefully when help/<tool>.json is absent (only wt exists today) | User requirement; necessary so all 7 pages can be wired before all producers ship | S:95 R:80 A:90 D:92 |
| 6 | Certain | Static-first: read + validate + render at build time, no runtime fetch (Constitution I) | Constitution + the whole feature's static premise | S:95 R:80 A:95 D:95 |
| 7 | Confident | Use native <details>/<summary> for collapsibles (keyboard + a11y for free) over a custom JS accordion | Strongest a11y default, no JS, matches minimal-deps; spec may override if styling demands | S:80 R:75 A:82 D:78 |
| 8 | Confident | Style via existing terminal.css tokens (--c-* vars) so dark-mode parity comes from Starlight's theme flip, no extra script | Matches index.mdx/Diagram precedent; CSS-var theming avoids JS | S:78 R:75 A:80 D:75 |
| 9 | Confident | idea/fab-kit curated prose is RELOCATED to the binary's cobra Long fields (tracked as idea backlog e3rk), not lost; this site change renders whatever -h text the binary emits | Discussed this session — user asked "enrich -h in idea itself?"; relocating to the source single-sources the prose and dissolves the drop-vs-keep tradeoff; the enrichment is out of scope here (tool-repo work) | S:80 R:65 A:80 D:78 |
| 10 | Certain | Wire ALL 7 tools now: add the 5 missing `commands` sidebar entries in astro.config.mjs AND create commands.mdx for all 7 | Clarified — user chose "wire all 7 now"; uniform + reachable from day one; wt renders real data, the other 6 show the placeholder. <!-- clarified: all 7 commands pages + sidebar entries in scope --> | S:92 R:65 A:85 D:90 |
| 11 | Certain | Cross-boundary read mechanism = build-time Node `fs.readFile` on a path resolved from the component file (prefer `import.meta.url`-relative over `process.cwd()`), NOT `import.meta.glob` | Clarified — empirically verified this session: `fs.readFile` of `<site>/../../help/wt.json` resolves and parses (tool=wt, schema_version 1, 7 subcommands); Vite's `import.meta.glob` is constrained to the project-root `fs.allow` and would fight a read outside the site dir. Build-time fs is unrestricted by Vite. <!-- clarified: read mechanism = fs.readFile, verified against the real sample --> | S:90 R:60 A:85 D:88 |
| 12 | Certain | MISSING help/<tool>.json → graceful placeholder (never fails build); PRESENT-but-schema-invalid → FAIL the build | Clarified — user: a missing file must not fail the build (producers take time to land); so distinguish the two cases. Missing = expected interim state = placeholder; present-but-invalid = a real committed defect that must not ship = build error. <!-- clarified: missing≠invalid — missing degrades gracefully, invalid fails the build --> | S:92 R:60 A:82 D:88 |
| 13 | Certain | Create all 7 commands.mdx NOW (placeholders render immediately for the 6 without data) | Clarified — user: "add placeholders right now"; pages exist + reachable from day one, light up automatically as each producer's help json lands | S:90 R:70 A:85 D:88 |

13 assumptions (10 certain, 3 confident, 0 tentative, 0 unresolved).
