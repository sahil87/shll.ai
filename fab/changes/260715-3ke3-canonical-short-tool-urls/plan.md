# Plan: Canonical Short Tool URLs

**Change**: 260715-3ke3-canonical-short-tool-urls
**Intake**: `intake.md`

## Requirements

<!-- Derived from intake.md. All work is inside sites/astro-starlight-terminal1/
     (the live site) except memory updates (hydrate, out of apply scope). The URL
     model migrates the per-tool namespace from /tools/<tool>/* to /<tool>/*, with
     old paths reversed into meta-refresh redirects. /tools/ (the directory
     landing) is unchanged. -->

### Routing: Canonical short URLs via slug overrides

#### R1: Overview/readme/commands pages become canonical at the root namespace
Each tool's `overview`, `readme`, and `commands` page SHALL be canonically served at `/<tool>/`, `/<tool>/readme/`, and `/<tool>/commands/` via Starlight per-page `slug:` frontmatter overrides. Files SHALL stay physically under `src/content/docs/tools/` (no file moves). Astro's content-layer glob loader maps frontmatter `slug:` directly to the entry `id` (`node_modules/astro/dist/content/loaders/glob.js`: `if (data.slug) return data.slug`), and Starlight derives both the route param and `starlightRoute.id` from that `id`.

- **GIVEN** `src/content/docs/tools/idea/overview.mdx` with `slug: idea`
- **WHEN** the site is built
- **THEN** `dist/idea/index.html` is a full Starlight page (title, OG tags, JSON-LD) and no page is emitted at `dist/tools/idea/overview/` except a redirect stub
- **AND** `dist/idea/readme/index.html` and `dist/idea/commands/index.html` likewise render as full pages

#### R2: `/tools/` directory landing is unchanged
The tools directory landing page (`src/content/docs/tools/index.mdx`, slug `tools`, route `/tools/`) SHALL remain untouched and continue to render at `/tools/`.

- **GIVEN** `src/content/docs/tools/index.mdx` (no `slug:` override added)
- **WHEN** the site is built
- **THEN** `dist/tools/index.html` renders the directory landing (`ToolsIndex`)

### Routing: Docs-site tree moves to root

#### R3: The docs-site dynamic route mounts at the root namespace
The dynamic route SHALL move from `src/pages/tools/[slug]/[...path].astro` to `src/pages/[slug]/[...path].astro`, and its link/sidebar transforms SHALL emit `/<slug>/<path>` instead of `/tools/<slug>/<path>`. The affected emitters are: `rewriteDocsSiteLinks` and `rewriteReadmeDocsSiteLinks` (`src/lib/extract-readme.ts`), the docs-site sidebar builder (`src/lib/docs-site-sidebar.mjs`), and any `/tools/`-prefixed URL construction in `src/lib/docs-site-tree.ts` (verify — it emits only path fragments, not URLs). `getStaticPaths` emits only paths under `content/<slug>/site/`, so the root catch-all cannot shadow Starlight's own root routes (`getting-started/*`, `reference/*`, `workflows/*`) — the emitted sets are disjoint.

- **GIVEN** `content/idea/site/install.md` committed
- **WHEN** the site is built
- **THEN** `dist/idea/install/index.html` renders the docs-site page and `dist/tools/idea/install/index.html` is a redirect stub to `/idea/install/`
- **AND** the generated sidebar entry for that page links to `/idea/install`
- **AND** a relative link inside a docs-site page resolves to `/<slug>/<resolved>` (site-absolute), not `/tools/<slug>/<resolved>`

### Routing: Redirect reversal

#### R4: Old `/tools/<tool>/*` URLs redirect to the new canonical paths
`astro.config.mjs` `redirects:` SHALL remove the seven existing short-URL entries (`'/run-kit': '/tools/run-kit/overview/'` etc.) and add reverse entries so every previously-canonical/shared deep URL still lands: `/tools/<tool>` → `/<tool>/`, `/tools/<tool>/overview` → `/<tool>/`, `/tools/<tool>/readme` → `/<tool>/readme/`, `/tools/<tool>/commands` → `/<tool>/commands/`, and one entry per committed docs-site page `/tools/<tool>/<path>` → `/<tool>/<path>/`. The docs-site redirect entries SHALL be enumerated programmatically at config-eval time by reusing the collector `docs-site-sidebar.mjs` already uses (extend it with a sibling `.mjs` export returning the `{ '/tools/<slug>/<path>': '/<slug>/<path>/' }` map).

- **GIVEN** the removed short-URL redirects and the added reverse redirects
- **WHEN** the site is built
- **THEN** the build succeeds with no redirect-vs-real-route collision (a redirect key colliding with a real page fails the build)
- **AND** `dist/tools/run-kit/overview/index.html` is a meta-refresh stub pointing at `/run-kit/`
- **AND** `dist/tools/idea/install/index.html` is a meta-refresh stub pointing at `/idea/install/`

### Route-aware dispatchers: roster gate replaces the `tools/` prefix

#### R5: A single shared tool-slug roster gates every route dispatcher
The `tools/` path prefix formerly namespaced tool routes; at root, a bare `([^/]+)/readme` regex could false-positive against root-shaped routes. A single shared roster constant (`src/lib/tool-slugs.ts`, exporting the 7 slugs `idea`, `hop`, `fab-kit`, `wt`, `run-kit`, `tu`, `shll`) SHALL be introduced, and every route-id/pathname dispatcher SHALL match the new flat route ids/paths and gate on roster membership:
- `src/lib/commands-toc.ts` — route id `<tool>/commands` (was `tools/<tool>/commands`), `<tool>` ∈ roster.
- `src/lib/readme-toc.ts` — route id `<tool>/readme` (was `tools/<tool>/readme`), `<tool>` ∈ roster.
- `src/components/Head.astro` — per-tool JSON-LD gate: match `/<tool>/` (1 segment, overview) and `/<tool>/<page>/` (2 segments, `page` ∈ {readme, commands}), `<tool>` ∈ roster. BreadcrumbList keeps `Home → Tools → <tool> [→ page]`; the `Tools` crumb still resolves to `/tools/`, and the tool crumb `item` becomes `/<tool>/`.
- `src/components/TocDispatcher.astro` / `MobileTocDispatcher.astro` — no logic change if they delegate to the two helpers above (verify — they call `toolFromRouteId`/`toolFromReadmeRouteId`).

- **GIVEN** the new flat route ids and the roster gate
- **WHEN** a readme page (`starlightRoute.id === "idea/readme"`) is rendered
- **THEN** `toolFromReadmeRouteId("idea/readme")` returns `idea` and the ReadmeToc rail renders; a non-tool route (`getting-started/overview`) returns null and falls through to the default ToC
- **AND** the overview page `/idea/` and the readme/commands pages emit per-tool JSON-LD; nested docs-site pages (2+ segment) stay uncovered (parity non-goal)

#### R6: JSON-LD/breadcrumb coverage stays at parity
Per-tool JSON-LD SHALL cover exactly the overview/readme/commands pages (as today), not nested docs-site pages. The BreadcrumbList page-2 `Tools` crumb SHALL keep resolving to `/tools/`, and the page-3 tool crumb `item` SHALL become `/<tool>/overview/`-equivalent — i.e. `/<tool>/` (the overview's new canonical URL).

- **GIVEN** the `/idea/` overview page
- **WHEN** its JSON-LD is emitted
- **THEN** the BreadcrumbList has Home (`/`), Tools (`/tools/`), idea (`/idea/`), and (for 2-segment pages) the page crumb (`/idea/readme/`)

### Internal link sweep

#### R7: Every internal route reference points at the new canonical paths
All internal references to `/tools/<tool>/*` routes SHALL be updated to `/<tool>/*`, while prose/comments about the `/tools/` landing itself stay intact. Specifically:
- `astro.config.mjs` sidebar `slug:` entries for the 21 tool pages (`tools/<tool>/overview` → `<tool>`, `tools/<tool>/readme` → `<tool>/readme`, `tools/<tool>/commands` → `<tool>/commands`); the sidebar `Tools` group label and the generated docs-site group stay.
- `src/content/docs/index.mdx` — homepage chips grid (7 links), `ls -l tools/` listing (7), loop-diagram prose (7); the `all tools →` link to `/tools/` stays unchanged.
- `src/components/ToolsIndex.astro` — 7 ROSTER `route:` values (`/tools/<tool>/overview/` → `/<tool>/`).
- `src/components/TerminalPrompt.astro` — `ROUTE_OVERVIEW`/`ROUTE_README`/`ROUTE_COMMANDS` builders and any `/tools/<tool>` prose in eggs (`removing /tools/${t}`, the `docs:` nav line text).
- `src/pages/llms.txt.ts` — emitted `pathname: /tools/<tool>/overview/` → `/<tool>/`.
- `src/lib/llms.ts` — `absolutize` doc-comment examples reference `/tools/idea/...`; the function itself rewrites any root-relative URL, so it needs no logic change (the MDX/homepage content it processes will already carry `/<tool>/` links after this sweep). Verify no logic hardcodes `/tools/`.
- `src/components/CommandIndex.astro` — `commandsHref` returns `/tools/<slug>/commands/` → `/<slug>/commands/`.
- The 7 `overview.mdx` files — cross-tool links (`../../<tool>/overview/`) AND sibling links (`../readme/`, `../commands/`): under the flat slug the overview lives at `/<tool>/`, so relative resolution changes for both. Switch cross-tool links to site-absolute `/<tool>/` and sibling links to `/<tool>/readme/` and `/<tool>/commands/`. The `shll` overview's `/getting-started/install/` link is root-relative and stays.
- `src/components/VersionTable.astro` — already uses `/shll`, `/idea`, … (the short URLs); verify, no change expected.
- `src/components/ReadmeSlice.astro` — `rewriteReadmeDocsSiteLinks` call rides R3; verify no other `/tools/` route ref.
- `src/styles/terminal.css` — grep hits are comments about the `ls tools/` motif; verify, no change expected.
- Finish with `grep -rn "tools/" src/ astro.config.mjs` and reconcile every remaining hit as either updated route ref or intentional `/tools/` landing prose/comment.

- **GIVEN** the swept sources
- **WHEN** the site is built and pages inspected
- **THEN** the homepage, sidebar, ToolsIndex, terminal island, llms.txt, and command index all link to `/<tool>/…`, and no dead `/tools/<tool>/overview/` link remains except intentional `/tools/` landing references

### Root-namespace reservation

#### R8: Reserved root names are recorded (no build-time guard this change)
Tool slugs now live at the site root. The reserved root names a future tool slug must avoid (`tools`, `getting-started`, `reference`, `install`, `llms.txt`, `llms-full.txt`, `screenshots`, `diagrams`, plus future root routes) SHALL be recorded in memory at hydrate (`conventions/tool-page-rubric` — the "adding an 8th tool" note). No build-time slug-collision guard is added in this change (7 known clash-free slugs). This requirement is satisfied at hydrate, not apply — apply MUST NOT modify memory files.

- **GIVEN** the 7 current slugs
- **WHEN** the change is applied
- **THEN** no build-time guard is added and all 7 slugs are clash-free with existing root routes

### Non-Goals

- Per-tool install one-liner + screenshots on overviews — a separate queued change, explicitly out of scope.
- Widening JSON-LD coverage to nested docs-site pages — parity is preserved (R6).
- Updating `docs/specs/readme-extraction-contract.md` §9's `/tools/<slug>/…` mount-URL examples — spec edits are OUT of apply scope (contract: do not modify `docs/specs/`). Recorded in `## Notes` as a follow-up.
- Updating memory files — hydrate's job, not apply's.

### Design Decisions

1. **Slug overrides, not file moves**: keep files under `src/content/docs/tools/`, add `slug:` frontmatter — *Why*: Starlight/Astro map frontmatter `slug:` directly to the entry id and route, so this is a route migration with zero file churn — *Rejected*: physically moving files (unnecessary churn, breaks the docs collection layout).
2. **Roster gate replaces the `tools/` path prefix**: a single `src/lib/tool-slugs.ts` const gates every dispatcher — *Why*: at root a bare `([^/]+)/readme` regex is fragile against root-shaped routes; a shared const follows the repo's single-source pattern — *Rejected*: regex-only matching without membership check (false-positive risk).
3. **Programmatic docs-site redirect enumeration**: extend `docs-site-sidebar.mjs` with a sibling `.mjs` export emitting `{ '/tools/<slug>/<path>': '/<slug>/<path>/' }` — *Why*: Astro static builds cannot wildcard-redirect, and the config already imports the `.mjs` collector at config-eval time — *Rejected*: hand-listing 16 redirect entries (drift-prone, defeats the collector).
4. **Overview sibling links go site-absolute too**: not only cross-tool links but `../readme/`/`../commands/` change under the flat slug — *Why*: the overview moves from `/tools/<tool>/overview/` (3 segments) to `/<tool>/` (1 segment), so `../readme/` would resolve to `/readme/` (broken); site-absolute `/<tool>/readme/` is the simplest correct form.

## Tasks

### Phase 1: Setup

- [x] T001 Create `src/lib/tool-slugs.ts` exporting the ordered 7-slug roster (`idea`, `hop`, `fab-kit`, `wt`, `run-kit`, `tu`, `shll`) as a shared const with an `isToolSlug(x): boolean` membership helper, dependency-free, mirroring the existing lib style. <!-- R5 -->

### Phase 2: Core route migration

- [x] T002 [P] Add `slug:` frontmatter to all 21 tool content files: `slug: <tool>` on each `src/content/docs/tools/<tool>/overview.mdx`, `slug: <tool>/readme` on each `readme.mdx`, `slug: <tool>/commands` on each `commands.mdx` (7 tools × 3 files). Do NOT touch `src/content/docs/tools/index.mdx`. <!-- R1 R2 -->
- [x] T003 Move the docs-site dynamic route `src/pages/tools/[slug]/[...path].astro` → `src/pages/[slug]/[...path].astro` (`git mv`); update its relative import paths (`../../../lib/*` → `../../lib/*`) and header-comment mount examples (`/tools/<slug>/<path>` → `/<slug>/<path>`). <!-- R3 -->
- [x] T004 In `src/lib/extract-readme.ts`, change the site-absolute emit target of `rewriteDocsSiteLinks` and `rewriteReadmeDocsSiteLinks` (and the shared `toSiteAbsolute`/mount helper they use) from `/tools/<slug>/<resolved>` to `/<slug>/<resolved>`, including the `__unresolved__` marker path; update the doc-comment examples. Do NOT change the `docs/site/<p>.md` SOURCE-side prefix (`DOCS_SITE_PREFIX`) — only the emitted URL. <!-- R3 -->
- [x] T005 [P] In `src/lib/docs-site-sidebar.mjs`, change the emitted `link` from `/tools/${slug}/${routePath}` to `/${slug}/${routePath}`; update the doc-comment mount examples. <!-- R3 -->
- [x] T006 [P] Verify `src/lib/docs-site-tree.ts` emits only path fragments (not `/tools/` URLs); update its doc-comment mount examples to `/<slug>/<path>`. No logic change expected. <!-- R3 -->

### Phase 3: Redirect reversal + dispatcher roster gate

- [x] T007 Add a sibling export to `src/lib/docs-site-sidebar.mjs` (e.g. `docsSiteRedirectEntries()`) that walks the committed `content/<slug>/site/**` trees and returns the `{ '/tools/<slug>/<path>': '/<slug>/<path>/' }` reverse-redirect map for every docs-site page. Reuse the existing `findRepoRoot`/`walkMarkdown` helpers. <!-- R4 -->
- [x] T008 In `astro.config.mjs`: (a) REMOVE the 7 short-URL `redirects:` entries; (b) ADD reverse entries — for each of the 7 tools: `/tools/<tool>` → `/<tool>/`, `/tools/<tool>/overview` → `/<tool>/`, `/tools/<tool>/readme` → `/<tool>/readme/`, `/tools/<tool>/commands` → `/<tool>/commands/`; (c) spread in `docsSiteRedirectEntries()` for the per-page docs-site redirects. Import the new export at the top alongside `docsSiteSidebarItems`. <!-- R4 -->
- [x] T009 In `astro.config.mjs` sidebar, update the 21 tool `slug:` entries: `tools/<tool>/overview` → `<tool>`, `tools/<tool>/readme` → `<tool>/readme`, `tools/<tool>/commands` → `<tool>/commands`. Leave the `Tools` group label and `...docsSiteSidebarItems('<tool>')` calls unchanged. <!-- R7 -->
- [x] T010 In `src/lib/commands-toc.ts`: change `COMMANDS_ROUTE_RE` from `/^tools\/([^/]+)\/commands$/` to `/^([^/]+)\/commands$/` and gate the captured slug on `isToolSlug` (import from `tool-slugs.ts`); `toolFromRouteId` returns the slug only when it is a roster member. Update the doc-comment. <!-- R5 -->
- [x] T011 In `src/lib/readme-toc.ts`: change `README_ROUTE_RE` from `/^tools\/([^/]+)\/readme$/` to `/^([^/]+)\/readme$/` and gate the captured slug on `isToolSlug`; `toolFromReadmeRouteId` returns the slug only when it is a roster member. Update the doc-comment. <!-- R5 -->
- [x] T012 In `src/components/Head.astro`: change the per-tool JSON-LD gate from the 2-segment `^/tools/([^/]+)/([^/]+)/?$` to match BOTH the overview (`/<tool>/`, 1 segment) and the readme/commands pages (`/<tool>/<page>/`, 2 segments), gating `<tool>` on `isToolSlug` and (for 2-segment) `<page>` ∈ {readme, commands}. Update the BreadcrumbList: `Tools` crumb stays `/tools/`, the tool crumb `item` becomes `/<tool>/`, and the page crumb (2-segment only) `item` becomes `/<tool>/<page>/`. The overview page emits a 3-crumb list (Home→Tools→<tool>); readme/commands emit 4 crumbs. Update the header doc-comment. <!-- R5 R6 -->
- [x] T013 [P] Verify `src/components/TocDispatcher.astro` and `src/components/MobileTocDispatcher.astro` need no change (they delegate to the two helpers); update their route-id doc-comments (`tools/<tool>/…` → `<tool>/…`). <!-- R5 -->

### Phase 4: Internal link sweep

- [x] T014 [P] In the 7 `src/content/docs/tools/<tool>/overview.mdx` files: switch cross-tool links `../../<other>/overview/` → `/<other>/`, sibling links `../readme/` → `/<tool>/readme/` and `../commands/` → `/<tool>/commands/`. Leave `/getting-started/install/` (shll overview) unchanged. <!-- R7 -->
- [x] T015 [P] In `src/content/docs/index.mdx`: update the 7 chips-grid links, the 7 `ls -l tools/` listing links, and the 7 loop-diagram prose links from `/tools/<tool>/overview/` to `/<tool>/`. Leave the `all tools →` link (`/tools/`) and `ls tools/`/`ls -l tools/` prompt-line prose unchanged. <!-- R7 -->
- [x] T016 [P] In `src/components/ToolsIndex.astro`: update the 7 ROSTER `route:` values from `/tools/<tool>/overview/` to `/<tool>/`. Keep slug/label/order (site-authored per the `pgox` note). <!-- R7 -->
- [x] T017 [P] In `src/components/TerminalPrompt.astro`: update `ROUTE_OVERVIEW` → `/<tool>/`, `ROUTE_README` → `/<tool>/readme/`, `ROUTE_COMMANDS` → `/<tool>/commands/`; update the `docs:` nav-line link text (`/tools/${slug}/overview` → `/${slug}`) and the `removing /tools/${t}` egg text (`removing /${t}`). <!-- R7 -->
- [x] T018 [P] In `src/pages/llms.txt.ts`: change the emitted `pathname` from `/tools/${tool}/overview/` to `/${tool}/`. <!-- R7 -->
- [x] T019 [P] In `src/components/CommandIndex.astro`: change `commandsHref` return from `/tools/${slug}/commands/` to `/${slug}/commands/`. <!-- R7 -->
- [x] T020 [P] Update doc-comment `/tools/` route examples in `src/lib/llms.ts` (`absolutize`), `src/components/ReadmeSlice.astro`, and confirm `src/lib/llms.ts`/`llms.txt.ts` `entry.id.match(/^tools\/([^/]+)\/overview$/)` — this reads the content-collection `id`, which after the slug override is now `<tool>`, so update the regex to `/^([^/]+)$/` gated on `isToolSlug` (the overview id is now the bare slug). <!-- R7 -->
- [x] T021 Run `grep -rn "tools/" src/ astro.config.mjs`, reconcile every remaining hit: each is either an updated route reference or intentional `/tools/` landing prose/comment. Fix any straggler route reference; leave landing prose/comments. <!-- R7 -->

### Phase 5: Verify

- [x] T022 Run `pnpm build` in `sites/astro-starlight-terminal1/`; fix any build error (redirect-vs-route collision, broken import, dead slug) until it succeeds. <!-- R1 R2 R3 R4 R5 R6 R7 -->
- [x] T023 Verify build output: `dist/run-kit/index.html` is a full page (has `<title>`, og tags, JSON-LD), not a meta-refresh stub; `dist/tools/run-kit/overview/index.html` is a redirect stub to `/run-kit/`; a docs-site page (`dist/idea/install/index.html`) renders at root and `dist/tools/idea/install/index.html` redirects; `dist/sitemap-*.xml` carries the new URLs and not the old canonical ones; `dist/tools/index.html` still renders the landing. <!-- R1 R3 R4 R7 -->
- [x] T024 Run the site's node tests (`node --test scripts/*.test.mjs`); fix any regressions the route changes introduced (e.g. `extract-readme.test.mjs` if it pins the emitted `/tools/` mount URL). <!-- R3 R5 -->

## Execution Order

- T001 (roster) blocks T010, T011, T012, T020 (they import it).
- T003 (route move) is independent of T004/T005/T006 but all four feed the docs-site URL migration.
- T007 (redirect collector) blocks T008 (which spreads it).
- Phase 4 sweeps are mostly `[P]` (distinct files); T021 (grep reconcile) runs after them.
- Phase 5 (T022–T024) runs last, after all edits.

## Acceptance

### Functional Completeness

- [x] A-001 R1: All 21 tool pages carry the correct `slug:` override; `dist/idea/index.html`, `dist/idea/readme/index.html`, `dist/idea/commands/index.html` (and the analogous pages for the other 6 tools) render as full Starlight pages.
- [x] A-002 R2: `dist/tools/index.html` renders the directory landing; `src/content/docs/tools/index.mdx` has no `slug:` override added.
- [x] A-003 R3: The dynamic route lives at `src/pages/[slug]/[...path].astro`; `dist/idea/install/index.html` and `dist/idea/workflows/index.html` render; the sidebar entries and in-page relative links for docs-site pages resolve under `/<slug>/…`.
- [x] A-004 R4: `astro.config.mjs` has no short-URL redirect entries; the reverse redirects (bare + overview + readme + commands per tool, plus one per docs-site page) are present; `dist/tools/run-kit/overview/index.html` and `dist/tools/idea/install/index.html` are meta-refresh stubs to the new paths.
- [x] A-005 R5: `src/lib/tool-slugs.ts` exists and is imported by `commands-toc.ts`, `readme-toc.ts`, `Head.astro`, and the llms overview reader; the ToC dispatchers render the correct rail on `<tool>/readme` and `<tool>/commands` routes.
- [x] A-006 R6: Per-tool JSON-LD is emitted on `/<tool>/`, `/<tool>/readme/`, `/<tool>/commands/` with the BreadcrumbList `Tools` crumb → `/tools/` and the tool crumb → `/<tool>/`; nested docs-site pages emit none.
- [x] A-007 R7: No internal route reference points at `/tools/<tool>/overview|readme|commands` (except intentional `/tools/` landing prose); homepage, sidebar, ToolsIndex, terminal island, llms.txt, and command index all link to `/<tool>/…`.

### Behavioral Correctness

- [x] A-008 R1: The old canonical URL `/tools/run-kit/overview/` no longer serves a full page — it serves a redirect stub — and `/run-kit/` is now the full page (the divergence between shared and canonical URL is closed).
- [x] A-009 R5: `toolFromReadmeRouteId("idea/readme")` → `idea`; `toolFromReadmeRouteId("getting-started/overview")` → null (roster gate rejects a non-tool route that structurally matches the 2-segment shape).

### Scenario Coverage

- [x] A-010 R4: The build succeeds with no redirect-vs-real-route collision (a redirect whose key collides with a real route would fail the build; its absence confirms the short-URL entries were removed).
- [x] A-011 R3: A committed docs-site relative link rewrites to a site-absolute `/<slug>/<resolved>` path (not `/tools/<slug>/<resolved>`), verified via the `extract-readme` transform behavior / build output.

### Edge Cases & Error Handling

- [x] A-012 R5: A root route that structurally resembles `<x>/readme` or `<x>/commands` but whose first segment is not a roster member (e.g. a hypothetical `getting-started/commands`) is NOT treated as a tool page by any dispatcher.
- [x] A-013 R3: The root `[slug]/[...path]` catch-all emits only paths under `content/<slug>/site/`, so it does not shadow `/getting-started/*`, `/reference/*`, or `/workflows/*` (build succeeds and those pages still render).

### Code Quality

- [x] A-014 Pattern consistency: New code (`tool-slugs.ts`, the redirect collector, dispatcher edits) follows the existing lib style — dependency-free `node:fs`/`node:path`, `import.meta.url` ascent where crossing the config boundary, named constants, matching doc-comment conventions.
- [x] A-015 No unnecessary duplication: The roster is single-sourced in `tool-slugs.ts` (consumed by the dispatchers) and the docs-site redirect map reuses the existing `docs-site-sidebar.mjs` walk rather than a second walker; `VersionTable.astro`'s already-correct short-URL routes are left untouched.

### Constitution Conformance

- [x] A-016 Static-first / zero-runtime (Constitution I): all changes are build-time (slug overrides, redirect stubs, build-time collectors) — no SSR, no runtime fetch, no new client JS.
- [x] A-017 Minimal dependencies (Constitution VI): no new runtime or build dependency is added.
- [x] A-018 Dark-mode parity (Constitution V): no visual/theme changes — the migration is routing-only, so parity is untouched.

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- **Spec follow-up (out of apply scope)**: `docs/specs/readme-extraction-contract.md` §9 has ~20 hardcoded `/tools/<slug>/…` mount-URL examples that are now stale. The apply contract forbids editing `docs/specs/`; flag this for the human/hydrate to reconcile the spec's URL examples to the new `/<slug>/…` model.
- **Stale memory note observed**: `docs/memory/conventions/seo-social-meta.md` claims "no `docs/site` content trees exist in the working tree, so all 46 built pages are 2-segment." This is now false — every tool has committed `content/<slug>/site/` pages (16 docs-site pages total). This affects hydrate's memory update, not apply.

## Deletion Candidates

- `sites/astro-starlight-terminal1/src/lib/tool-slugs.ts:38` (`export type ToolSlug`) — introduced with zero call sites; every consumer (`commands-toc.ts`, `readme-toc.ts`, `Head.astro`, `llms.txt.ts`, `llms-full.txt.ts`) imports only `isToolSlug`. Type-level only (erased at compile time) — drop it, or keep it as deliberate roster API surface.

No existing code was made redundant beyond what the diff itself already removed (the 7 short-URL `redirects:` entries and `Head.astro`'s `pageLabel()` title-case fallback, both deleted in place). `llms.ts`'s `TOOLS` const is NOT redundant with the new roster — it is deliberately alphabetical (llms.txt emission order) while `TOOL_SLUGS` is display-ordered.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Frontmatter `slug:` maps directly to the content-collection entry id and the Starlight route/`starlightRoute.id`, so dispatchers keyed on the route id must match the new flat ids | Verified in installed deps: Astro glob loader `if (data.slug) return data.slug` and Starlight `route.id = entry.id`, `slugToParam(route.id)` | S:95 R:75 A:95 D:90 |
| 2 | Confident | Overview SIBLING links (`../readme/`, `../commands/`), not just cross-tool links, must be rewritten to site-absolute | Under `slug: <tool>` the overview URL drops from 3 segments to 1, so `../readme/` resolves to `/readme/` (broken); the intake named only cross-tool links but correctness requires both | S:70 R:85 A:85 D:75 |
| 3 | Confident | Docs-site pages are live (16 committed `content/<slug>/site/` pages), so the docs-site redirect enumeration and route move are load-bearing, not latent | Filesystem shows committed trees for all 7 tools; the redirect collector must enumerate them or old deep URLs 404 | S:80 R:80 A:90 D:80 |
| 4 | Confident | `llms.txt.ts` / `llms.ts` overview-id regex (`^tools/([^/]+)/overview$`) must change to match the new bare-slug id `<tool>` | The regex reads the content-collection `id`, which after the slug override is the bare `<tool>` (no `tools/` prefix, no `/overview` suffix) | S:65 R:80 A:85 D:75 |
| 5 | Confident | `VersionTable.astro` needs no change; it already links to the short URLs (`/shll`, `/idea`, …) | Its ROSTER `route:` values are already the target canonical short paths (they redirected before, resolve directly after) | S:85 R:85 A:90 D:85 |
| 6 | Confident | Spec `docs/specs/readme-extraction-contract.md` §9 URL examples are left stale (flagged in Notes), not edited | The apply-stage contract forbids modifying `docs/specs/`; the intake itself flags the spec check as a follow-up | S:75 R:70 A:90 D:80 |
| 7 | Confident | The root `[slug]/[...path]` catch-all cannot shadow Starlight root routes because `getStaticPaths` emits only committed `content/<slug>/site/` paths, disjoint from `getting-started`/`reference`/`workflows` | Intake §2 states this; verified the emitted path set (install/workflows/status-dot/notifications) is disjoint from the root route names | S:75 R:80 A:85 D:80 |

7 assumptions (1 certain, 6 confident, 0 tentative).
