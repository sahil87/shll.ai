# Plan: Right-Panel ToC for the README page

**Change**: 260604-u4di-readme-page-toc
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

### Heading Anchors: Rendered README slice carries stable heading ids

#### R1: Rendered README headings MUST carry deterministic anchor ids
Every `<h2>`/`<h3>` in the rendered README slice (`ReadmeSlice.astro` → `content/<tool>/README.md`) MUST carry a stable, GitHub-style anchor `id` so an in-page ToC link can target it. The id MUST be produced by the same slug algorithm the ToC builder uses, so a ToC `href` equals the rendered heading `id` by construction.

- **GIVEN** a tool's README slice with `## The 6 Stages` and two `### Using Fab Kit` headings
- **WHEN** the readme page is built
- **THEN** the rendered HTML contains `<h2 id="the-6-stages">` and `<h3 id="using-fab-kit">` followed by `<h3 id="using-fab-kit-1">` (duplicate-heading dedup preserved)
- **AND** the id values are byte-identical to the slugs the ToC builder emits for the same headings

#### R2: The slug source MUST be single-sourced (no second slug code path)
There MUST be exactly one slug-producing mechanism feeding both the rendered heading ids and the ToC hrefs. A hand-rolled second slug implementation that could drift from the renderer's algorithm is prohibited.

- **GIVEN** the renderer and the ToC builder both need a slug for the heading text "Why Fab Kit's \"Quirks\" & stuff!"
- **WHEN** each computes its slug
- **THEN** both obtain `why-fab-kits-quirks--stuff` from the same underlying slug pipeline (Astro's `@astrojs/markdown-remark`, which owns `github-slugger`), not from two independent reimplementations

### README ToC Builder: `lib/readme-toc.ts`

#### R3: A build-time helper MUST resolve the tool from a README route id
`lib/readme-toc.ts` MUST detect a `tools/<tool>/readme` route id and return the tool slug, mirroring `commands-toc.ts`'s `toolFromRouteId`. Non-readme route ids MUST yield `null`.

- **GIVEN** route id `tools/fab-kit/readme`
- **WHEN** the helper inspects it
- **THEN** it returns `"fab-kit"`
- **AND** **GIVEN** route id `tools/fab-kit/commands` or `getting-started/overview`, it returns `null`

#### R4: The helper MUST read the SAME slice via the `help/`-marker repo-root ascent
`lib/readme-toc.ts` MUST read `<repo-root>/content/<tool>/README.md` — the exact file `ReadmeSlice` renders — locating the repo root via the shared `repo-root.ts` `help/`-marker ascent (NOT a `content/`-anchored ascent, which collides with Starlight's `src/content/`).

- **GIVEN** the helper runs at build time inside the site dir
- **WHEN** it resolves the slice path
- **THEN** it ascends to the directory containing `help/` and reads `content/<tool>/README.md` beneath it (reusing `repoRootFromModuleUrl` from `lib/repo-root.ts`)

#### R5: The helper MUST parse headings into a nested H2 → H3 tree
`lib/readme-toc.ts` MUST produce a nested tree of `{ text, slug, depth, children }` nodes bounded to H2 (top level) and H3 (children of the preceding H2), matching the site's `tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 }`. Headings outside H2/H3 (e.g. H4) MUST be ignored. Each node's `slug` MUST equal the rendered heading `id` (R1/R2).

- **GIVEN** a slice with `## A`, `### A1`, `### A2`, `## B`, `#### deep`, `### B1`
- **WHEN** the helper parses it
- **THEN** it returns `[{text:"A", depth:2, children:[A1, A2]}, {text:"B", depth:2, children:[B1]}]` with the H4 omitted
- **AND** an H3 appearing before any H2 attaches at the top level rather than crashing

#### R6: The helper MUST degrade on a missing slice and re-throw genuine errors
`lib/readme-toc.ts` MUST return `[]` when the slice file is missing (ENOENT), so the readme page falls back to Starlight's default ToC — mirroring `firstLevelCommands`' failure contract. It MUST re-throw any non-ENOENT error (a present-but-unrenderable slice is a committed defect that must fail the build).

- **GIVEN** `content/<tool>/README.md` does not exist
- **WHEN** the helper runs
- **THEN** it returns `[]` (no throw)
- **AND** **GIVEN** the slice exists but throws a non-ENOENT error during read/render, the error propagates

### ToC Components: `ReadmeToc.astro` + `ReadmeMobileToc.astro`

#### R7: A desktop `ReadmeToc` MUST emit a nested static H2/H3 link list
`ReadmeToc.astro` (NEW, separate from `CommandsToc`) MUST emit a `<starlight-readme-toc>` custom element wrapping a labelled `<nav>`, the "On this page" `<h2>`, and a nested `<ul>` of `<a href="#{slug}">` (H2 items with nested H3 children). The static list MUST be fully usable with JS disabled (Constitution I).

- **GIVEN** a readme page whose builder returns a non-empty nested tree
- **WHEN** the page renders
- **THEN** the right rail contains a `<starlight-readme-toc>` with a nested list of anchor links whose `href`s are `#<slug>`
- **AND** **GIVEN** an empty tree (missing slice), `ReadmeToc` renders Starlight's `<Default />`

#### R8: A mobile `ReadmeMobileToc` MUST mirror the mobile dropdown frame
`ReadmeMobileToc.astro` (NEW) MUST emit a `<readme-mobile-toc>` element mirroring `CommandsMobileToc`'s `<details>` dropdown frame (fixed bar + dropdown), with the same nested heading list. Empty tree → `<Default />`.

- **GIVEN** a readme page on a mobile viewport
- **WHEN** the page renders
- **THEN** a `<readme-mobile-toc>` dropdown lists the nested headings and falls through to `<Default />` when the tree is empty

#### R9: Scroll-spy MUST be progressive-enhancement only and track BOTH H2 and H3
The desktop element's scroll-spy MUST be client JS that only enhances the static list (Constitution I). It MUST use `IntersectionObserver` against the rendered headings, highlighting the in-view H3 **and** its parent H2 (both levels). With JS disabled, the static nested list MUST still render and navigate.

- **GIVEN** the user scrolls so an H3 enters the active band
- **WHEN** the observer fires
- **THEN** that H3's ToC link and its parent H2's ToC link both receive `aria-current="true"`
- **AND** **GIVEN** JS is disabled, the links still navigate via native anchor jumps

### ToC Dispatch: `TocDispatcher.astro` + `MobileTocDispatcher.astro`

#### R10: A dispatcher MUST route the single override slot by route id
`TocDispatcher.astro` and `MobileTocDispatcher.astro` (NEW) MUST be registered as `components.TableOfContents` / `components.MobileTableOfContents`. Each MUST inspect `Astro.locals.starlightRoute.id` and render `CommandsToc`/`CommandsMobileToc` for `tools/*/commands`, `ReadmeToc`/`ReadmeMobileToc` for `tools/*/readme`, and Starlight's `<Default />` otherwise.

- **GIVEN** route id `tools/hop/commands`
- **WHEN** the dispatcher renders
- **THEN** it delegates to `CommandsToc` (commands behavior unchanged)
- **AND** **GIVEN** `tools/hop/readme` → `ReadmeToc`; **GIVEN** `getting-started/overview` → `<Default />`

#### R11: The dispatcher MUST preserve existing commands-page behavior
Repointing the override slots to the dispatcher MUST NOT change the commands page output. `CommandsToc`/`CommandsMobileToc` MUST continue to receive control on `tools/*/commands` and produce identical markup/behavior as before this change.

- **GIVEN** the commands pages before and after this change
- **WHEN** built
- **THEN** the commands-page ToC markup and scroll-spy behavior are unchanged (the dispatcher is a transparent pass-through for commands routes)

### Styling: `terminal.css`

#### R12: The new element MUST inherit the terminal ToC look + dark-mode parity, with H3 indentation
`starlight-readme-toc` MUST be added to the existing terminal ToC selector groups (the `# ` heading prefix, `> ` active marker, link colors at ~lines 271–302) so it inherits the identical terminal styling and dark-mode parity (Constitution V) the other ToCs use. Nested H3 children MUST be visually indented relative to their H2 parent.

- **GIVEN** the readme page in dark mode and light mode
- **WHEN** the ToC renders
- **THEN** the heading shows the `# ` prefix, active links show the `> ` accent marker, and colors track the theme — identical to `starlight-toc`/`starlight-commands-toc`
- **AND** H3 child links are indented under their H2 parent

### Non-Goals

- Modifying the README capture pipeline, the scheduled refresh, or the `vn39` reporter (Constitution II/III — out of scope).
- Touching any site other than `sites/astro-starlight-terminal1` (Multi-Site Isolation).
- Adding H4+ depth to the ToC (bounded to H2/H3 by site config).
- Extending `CommandsToc`/`CommandsMobileToc` (the intake mandates separate components).

### Design Decisions

1. **Slug single-sourcing via Astro's markdown processor, not a hand-rolled `github-slugger` helper**: Both the rendered heading ids and the ToC slugs come from `@astrojs/markdown-remark`'s `createMarkdownProcessor().render()`. — *Why*: Empirical verification (see Assumptions #1) shows the renderer ALREADY emits correct heading ids via the processor's built-in `rehypeHeadingIds` (which uses `github-slugger@2.0.0` internally), AND `rendered.metadata.headings` exposes the exact `{depth, slug, text}` the renderer used — dedup suffixes included. Reusing that one pipeline in both `ReadmeSlice` (ids) and `readme-toc.ts` (hrefs, via a second build-time render of the same file) makes `href === id` true by construction, more robustly than a separate `github-slugger` helper that would have to reproduce Astro's exact normalization. — *Rejected*: (a) a standalone `headingSlug` `github-slugger` helper + declaring `github-slugger` in package.json — unnecessary once the processor is the shared source, and would add a direct dependency declaration with no concrete need beyond what `@astrojs/markdown-remark` (already declared+pinned) provides (Constitution VI); (b) `rehype-slug` — the renderer already slugs, so adding it is redundant; (c) regex-parsing markdown headings by hand in `readme-toc.ts` — a second slug code path, the exact drift the intake forbids.
2. **`readme-toc.ts` re-renders the slice rather than sharing `ReadmeSlice`'s render result**: The ToC dispatcher and `ReadmeSlice` are separate component instances with no shared frontmatter, so the builder runs its own `createMarkdownProcessor().render()` and reads `metadata.headings`. — *Why*: Mirrors how the commands page reads `help/<tool>.json` independently in both the page (`CommandReference`) and the ToC (`commands-toc.ts`); a second build-time render of a small markdown file is cheap and keeps the read paths independent. — *Rejected*: threading the render result through `Astro.locals` — fragile cross-component coupling for no benefit.
3. **`ReadmeSlice.astro` requires no slug change**: Since the default processor already emits ids, `ReadmeSlice` is left as-is functionally. A clarifying comment is added noting the ids are emitted by the processor's built-in heading-id pass and that `readme-toc.ts` re-derives the same slugs from the same pipeline. — *Why*: The intake's "prerequisite" premise (empty config → no ids) was based on reading the config string, not running it; the running behavior makes the prerequisite a no-op. Recorded as Assumption #1.

## Tasks

### Phase 1: Setup

- [x] T001 Add a clarifying comment to `src/components/ReadmeSlice.astro` documenting that the default `createMarkdownProcessor({})` already emits GitHub-style heading `id`s (via its built-in `rehypeHeadingIds`/`github-slugger`), that `rendered.metadata.headings` carries the same slugs, and that `src/lib/readme-toc.ts` re-derives identical slugs from the same pipeline — so a ToC `href` equals a rendered heading `id` by construction. No functional change to the render. <!-- R1 R2 -->

### Phase 2: Core Implementation

- [x] T002 Create `src/lib/readme-toc.ts` (README sibling of `commands-toc.ts`): export `TocHeading` interface `{ text: string; slug: string; depth: number; children: TocHeading[] }`, `READMEROUTE_RE = /^tools\/([^/]+)\/readme$/`, `toolFromReadmeRouteId(id): string | null`, and an async `readmeToc(tool, moduleUrl): Promise<TocHeading[]>` that resolves the repo root via `repoRootFromModuleUrl` (from `./repo-root.ts`), reads `content/<tool>/README.md`, renders it with `createMarkdownProcessor({})`, and folds `rendered.metadata.headings` into a nested H2→H3 tree (ignore depth > 3; an H3 with no preceding H2 attaches at top level). Return `[]` on ENOENT; re-throw other errors (mirror `firstLevelCommands`). <!-- R3 R4 R5 R6 -->
- [x] T003 Create `src/components/ReadmeToc.astro` (NEW, separate from CommandsToc): await `readmeToc(toolFromReadmeRouteId(Astro.locals.starlightRoute.id), import.meta.url)`; when non-empty, emit `<starlight-readme-toc>` with a labelled `<nav>`, the `tableOfContents.onThisPage` `<h2 id="starlight__on-this-page">`, and a nested `<ul>` (H2 `<li>` each containing `<a href="#{slug}" data-readme-toc-link={slug}>` and, when present, a nested `<ul>` of its H3 children). Else render `<Default />`. Structural CSS only (terminal look lives in terminal.css). <!-- R7 -->
- [x] T004 Add the progressive-enhancement scroll-spy script to `src/components/ReadmeToc.astro`: a `StarlightReadmeToc extends HTMLElement` that observes the rendered headings (`document.getElementById(slug)` for every link) with `IntersectionObserver` (rootMargin band near the top, mirroring CommandsToc), maintains the intersecting set, and sets `aria-current="true"` on BOTH the active H2 link and the active H3 link (an H3's parent H2 link is highlighted alongside it); guard with `customElements.get` before `define`. Static list works without JS. <!-- R9 -->
- [x] T005 Create `src/components/ReadmeMobileToc.astro` (NEW): mirror `CommandsMobileToc`'s `<details>` dropdown frame (fixed bar + dropdown styles), emit `<readme-mobile-toc>` wrapping the same nested H2/H3 link list; PE script opens/closes the dropdown, updates `.display-current`, closes on outside-click/Escape. Empty tree → `<Default />`. <!-- R8 -->

### Phase 3: Integration & Edge Cases

- [x] T006 Create `src/components/TocDispatcher.astro`: import `Default` (Starlight TableOfContents), `CommandsToc`, `ReadmeToc`; read `Astro.locals.starlightRoute.id`; render `CommandsToc` for `tools/*/commands`, `ReadmeToc` for `tools/*/readme`, else `<Default />`. Reuse `toolFromRouteId` and `toolFromReadmeRouteId` for the route checks. <!-- R10 R11 -->
- [x] T007 Create `src/components/MobileTocDispatcher.astro`: the mobile counterpart — import `Default` (Starlight MobileTableOfContents), `CommandsMobileToc`, `ReadmeMobileToc`; same route dispatch. <!-- R10 R11 -->
- [x] T008 Update `astro.config.mjs`: repoint `components.TableOfContents` → `./src/components/TocDispatcher.astro` and `components.MobileTableOfContents` → `./src/components/MobileTocDispatcher.astro`; update the adjacent comment to describe the 3-way dispatch (commands / readme / default). <!-- R10 R11 -->

### Phase 4: Polish

- [x] T009 Update `src/styles/terminal.css`: add `starlight-readme-toc` to each of the existing ToC selector groups (heading color, `# ` `::before`, link color, `a[aria-current='true']`, active `> ` `::before` — ~lines 271–302) and add a rule indenting the nested H3 child `<ul>`/links under their H2 parent. Dark-mode parity follows the shared CSS variables. <!-- R12 -->

## Execution Order

- T002 (lib) blocks T003 (desktop ToC), T005 (mobile ToC), and the dispatchers (T006/T007).
- T003 blocks T004 (the spy script lives in the same file).
- T003 + T005 block T006 + T007 (dispatchers import the components).
- T006 + T007 block T008 (config repoint references the dispatcher files).
- T009 (CSS) is independent of the components but depends conceptually on the `starlight-readme-toc` element name fixed in T003; run after T003.

## Acceptance

### Functional Completeness

- [x] A-001 R1: Built readme pages render `<h2>`/`<h3>` with GitHub-style `id`s including correct dedup suffixes (verified by inspecting built HTML / the processor output). — Verified: `dist/tools/*/readme/index.html` carry h2/h3 `id`s; processor test produced `using-fab-kit` / `using-fab-kit-1` dedup and `why-fab-kits-quirks--stuff`.
- [x] A-002 R2: Only one slug pipeline exists — both the rendered ids and the ToC hrefs derive from `@astrojs/markdown-remark`; no hand-rolled slug function and no `github-slugger` direct import were added. — Verified: `github-slugger` NOT in package.json; no hand-rolled slugger; both consumers call `createMarkdownProcessor({})`.
- [x] A-003 R3: `toolFromReadmeRouteId` returns the tool for `tools/<tool>/readme` and `null` for commands/other routes. — Verified at runtime: `tools/fab-kit/readme`→`fab-kit`, commands/overview→`null`.
- [x] A-004 R4: `readme-toc.ts` reads `content/<tool>/README.md` via `repoRootFromModuleUrl` (the `help/`-marker ascent), not a `content/`-anchored ascent. — Verified: `readme-toc.ts:27,87` reuses `repoRootFromModuleUrl` from `repo-root.ts` which ascends to the `help/` marker.
- [x] A-005 R5: The builder returns a nested H2→H3 tree with H4+ omitted and each node's `slug` equal to the rendered heading `id`. — Verified: depth filter `2..3` omits H4 (`deep`); folded tree nests H3 under H2; slugs == rendered ids (bijection on built HTML).
- [x] A-006 R6: A missing slice yields `[]` (page falls back to default ToC); a non-ENOENT error propagates and fails the build. — Verified by code (`readme-toc.ts:91-96`: ENOENT→`[]`, else re-throw) — mirrors `firstLevelCommands`.
- [x] A-007 R7: The desktop readme page emits `<starlight-readme-toc>` with a nested anchor list; an empty tree renders `<Default />`. — Verified: `<starlight-readme-toc>` present on all built readme pages with nested `<ul>`; empty path renders `<Default />` (`ReadmeToc.astro:58-60`).
- [x] A-008 R8: The mobile readme page emits `<readme-mobile-toc>` mirroring the commands mobile dropdown frame; empty tree renders `<Default />`. — Verified: `<readme-mobile-toc>` present; `<details>` frame mirrors `CommandsMobileToc`; empty→`<Default />`.
- [x] A-009 R10: `TocDispatcher`/`MobileTocDispatcher` route by `starlightRoute.id` to commands / readme / default and are registered as the override slots in `astro.config.mjs`. — Verified: `astro.config.mjs:74-75` points both slots at the dispatchers; built output confirms 3-way dispatch.

### Behavioral Correctness

- [x] A-010 R9: Scroll-spy is PE-only and highlights both the in-view H3 and its parent H2 (`aria-current="true"` on both links); the static list navigates with JS disabled. — Verified by code (`ReadmeToc.astro:76-185`): `IntersectionObserver` in a `<script>`; `parentOf` maps H3→H2 so `setActive` flags both; static `<a href="#slug">` list works JS-off.
- [x] A-011 R11: Commands pages still delegate to `CommandsToc`/`CommandsMobileToc` with unchanged markup/behavior (no regression from the dispatcher). — Verified: `dist/tools/wt/commands/index.html` still emits `starlight-commands-toc`/`commands-mobile-toc` and NO `starlight-readme-toc`; CommandsToc/CommandsMobileToc files unchanged in the diff.
- [x] A-012 R12: The readme ToC shows the terminal look (`# ` prefix, `> ` active marker, accent colors), renders correctly in both light and dark modes, and indents H3 children under their H2. — Verified: `terminal.css:273-315` adds `starlight-readme-toc` to all selector groups (Constitution V dark-mode parity via shared `--c-*` vars that flip with `data-theme`, no per-component theme branch) + `.readme-toc-sublist` indent.

### Scenario Coverage

- [x] A-013 R1: The duplicate-heading scenario (two identical H3 texts) produces distinct ids/hrefs (`-1` suffix) that match between render and ToC. — Verified at runtime: two `### A1` → `a1` + `a1-1`, both in the tree; manifest slug == rendered id.
- [x] A-014 R5: An H3-before-any-H2 slice does not crash the builder (attaches at top level). — Verified at runtime: leading `### Orphan First` folds to a top-level node (`nestHeadings` orphan branch, `readme-toc.ts:71-73`).

### Edge Cases & Error Handling

- [x] A-015 R6: A tool with no synced slice (ENOENT) builds successfully and shows the default ToC on its readme page (no error). — Verified by code path (ENOENT→`[]`→`<Default />`). All 7 tools currently HAVE slices, so the live build exercises the populated path; the ENOENT branch is the same proven `firstLevelCommands` contract. **Note**: not exercised live (no missing-slice tool exists today), but the branch is identical to the shipped commands path.

### Code Quality

- [x] A-016 Pattern consistency: New code follows the surrounding idiom — `readme-toc.ts` mirrors `commands-toc.ts` structure/comments; the components mirror `CommandsToc`/`CommandsMobileToc` framing; naming matches existing conventions. — Verified by side-by-side read.
- [x] A-017 No unnecessary duplication: `repoRootFromModuleUrl` (repo-root.ts) is reused rather than re-implementing the ascent; no second slug implementation is introduced. — Verified: `readme-toc.ts` imports `repoRootFromModuleUrl`; no slugger added.
- [x] A-018 Readability over cleverness: ToC tree-folding and scroll-spy are straightforward and commented where non-obvious (code-quality.md Principles). — Verified.
- [x] A-019 No god functions / magic strings: route regexes and element names are named; functions stay focused (code-quality.md Anti-Patterns). — Verified: `README_ROUTE_RE`, `MIN_DEPTH`/`MAX_DEPTH` named; functions small.

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- Build (`pnpm build`) is the primary correctness gate; there is no Astro-component unit-test harness in this repo (no `*.test.*` under `src/`), so tests are not added (code-quality.md `test-alongside` defers to the existing harness, which is build-only here).

## Deletion Candidates

None — this change adds new functionality (a README-page ToC) without making existing code redundant.

- The intake's planned slug helper (a hand-rolled `github-slugger` `headingSlug` export) and a `github-slugger` package.json declaration were **never written** (divergence #1 supersedes intake #9), so there is nothing to delete there — they are un-created, not orphaned.
- `ReadmeSlice.astro`'s `createMarkdownProcessor({})` render is **not** made redundant: the divergence relies on it continuing to emit heading ids; `readme-toc.ts` runs a parallel render for the manifest only.
- `CommandsToc`/`CommandsMobileToc` and `commands-toc.ts` are unchanged and still reached via the new dispatchers (no dead override slot — the old direct wiring was replaced, not left dangling).
- The two dispatchers and the two readme components are by-design parallel structure (intake explicitly chose SEPARATE components), not duplication to collapse.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Confident | Single-source the slug via Astro's `@astrojs/markdown-remark` processor (rendered ids + `metadata.headings`) instead of a hand-rolled `github-slugger` helper, and do NOT declare `github-slugger` as a direct dep | Intake assumption #9 mandated a `github-slugger` shared helper on the premise that `createMarkdownProcessor({})` emits no ids. Empirically verified the opposite: the default processor's built-in `rehypeHeadingIds` already emits correct ids (using `github-slugger@2.0.0` internally) AND exposes `metadata.headings` with the same `{depth,slug,text}`. Reusing that one pipeline in both consumers satisfies the intake's INTENT (href===id by construction, single source, build-time) more robustly; declaring `github-slugger` directly would be a dependency with no concrete need beyond the already-declared `@astrojs/markdown-remark` (Constitution VI). Verifiable + reversible (swap to a helper later if needed). | S:90 R:70 A:85 D:80 |
| 2 | Certain | `readme-toc.ts` runs its own build-time render of the slice (not sharing `ReadmeSlice`'s result) | The dispatcher and `ReadmeSlice` are separate component instances with no shared frontmatter; mirrors the commands page reading `help/*.json` independently in page + ToC. Cheap at build time. | S:92 R:80 A:90 D:88 |
| 3 | Certain | README route id pattern is `^tools/([^/]+)/readme$` | Direct parallel to `commands-toc.ts`'s `^tools/([^/]+)/commands$`; confirmed `readme.mdx` exists for all 7 tools at `tools/<tool>/readme`. | S:95 R:85 A:95 D:95 |
| 4 | Certain | No automated tests are added; `pnpm build` is the gate | code-quality.md is `test-alongside`, but there is no component test harness in this repo (no `*.test.*` under `src/`); the existing correctness gate is `astro build`, consistent with how the commands ToC was shipped. | S:90 R:80 A:90 D:85 |

4 assumptions (3 certain, 1 confident, 0 tentative, 0 unresolved).
