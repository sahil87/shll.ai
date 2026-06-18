# Plan: Per-Page JSON-LD Structured Data

**Change**: 260618-pgox-per-page-json-ld-structured-data
**Intake**: `intake.md`

## Requirements

<!-- All requirements scope to the live site `sites/astro-starlight-terminal1/`.
     Origin source: `site: 'https://shll.ai'` in `astro.config.mjs`; tool descriptions
     single-source from `<repo-root>/help/<tool>.json` `root.short`. -->

### Tools Index: New `/tools` directory page

#### R1: A `/tools` index page exists and resolves at `/tools/`
The site MUST host a new Starlight content page at slug `tools` (route `/tools/`) that serves as the tools directory landing — the destination for the "Tools" breadcrumb crumb. Its frontmatter MUST set `title: Tools` and a keyword-bearing `description`. Its body MUST contain a short framing sentence and a directory listing of the seven tools, each linking to `/tools/<tool>/overview/`.

- **GIVEN** the live site is built with `pnpm build`
- **WHEN** the build completes
- **THEN** `dist/tools/index.html` exists and contains seven anchors to `/tools/<tool>/overview/` (one per tool: shll, idea, hop, fab-kit, wt, run-kit, tu)
- **AND** the page H1/title is "Tools" and the page carries a keyword-bearing meta description

#### R2: The `/tools` page tool one-liners single-source from `help/<tool>.json` `root.short`
Each tool's one-line description on the `/tools` page MUST be read at build time from `<repo-root>/help/<tool>.json` `root.short` via `repoRootFromModuleUrl(import.meta.url)` + `HelpDocSchema.parse`. Descriptions MUST NOT be hand-typed (binding anti-drift rule — must not become a fourth hand-copy). The roster, display order, display labels, and route links MUST stay site-authored (mirroring `VersionTable.astro`'s split); ONLY the description string comes from JSON. Labels/routes MUST use the file slug (`run-kit`, not the binary `rk`).

- **GIVEN** `help/run-kit.json` has `root.short` = `"rk — tmux session manager with web UI"`
- **WHEN** the `/tools` page is built
- **THEN** the `run-kit` entry's description text in `dist/tools/index.html` equals that exact `root.short` string
- **AND** no tool description string is hard-coded in the page/component source

#### R3: A rostered `help/<tool>.json` that is missing or schema-invalid stops the build for the `/tools` page
Because the `/tools` page is a committed site artifact (mirroring `VersionTable.astro`'s posture, not the inert-SEO posture of the JSON-LD), a rostered tool whose `help/<tool>.json` is missing or fails `HelpDocSchema.parse` MUST stop `astro build` with an error wrapped in the offending filename.

- **GIVEN** a rostered tool's `help/<tool>.json` is absent or malformed
- **WHEN** `pnpm build` runs
- **THEN** the build fails with an error naming the offending file and tool slug

#### R4: The "Tools" sidebar group stays unlinked
The "Tools" group in `astro.config.mjs` MUST remain a pure expand/collapse label with NO `link` attribute. No `astro.config.mjs` change is made for sidebar linking; the `/tools` page is reachable via its direct URL and the BreadcrumbList crumb only.

- **GIVEN** the clarified decision #11 (leave the group unlinked)
- **WHEN** the change is applied
- **THEN** `astro.config.mjs`'s "Tools" sidebar group has no `link` key (diff is clean on that file)

### Head JSON-LD: Per-tool structured data dispatcher

#### R5: `Head.astro` becomes a route dispatcher with the homepage branch unchanged
`Head.astro` MUST extend its existing route-gated JSON-LD into a dispatcher. The homepage branch (`isHomepage = Astro.url.pathname === '/'`, the WebSite + SoftwareApplication `@graph`) MUST remain byte-for-byte unchanged (hard acceptance constraint). A new tool-page branch MUST be mutually exclusive with the homepage branch.

- **GIVEN** the pre-change homepage JSON-LD `@graph` (WebSite + SoftwareApplication)
- **WHEN** the site is rebuilt after this change
- **THEN** the JSON-LD block in `dist/index.html` is identical to the pre-change emission (same nodes, same field order, byte-exact)
- **AND** the homepage emits no tool-page JSON-LD and tool pages emit no homepage JSON-LD

#### R6: Tool-page route detection via `Astro.url.pathname` regex
The tool-page branch MUST detect tool pages by parsing `Astro.url.pathname` with the regex `^/tools/([^/]+)/([^/]+)/?$` to extract `<tool>` and `<page>` (consistent with the homepage `pathname === '/'` gate; NOT `Astro.locals.starlightRoute.id`).

- **GIVEN** the path `/tools/run-kit/overview/`
- **WHEN** `Head.astro` runs
- **THEN** the regex matches with `<tool>` = `run-kit` and `<page>` = `overview`, and the tool-page JSON-LD branch emits
- **AND** the path `/tools/` (no second segment) and `/tools/run-kit/` (one segment) do NOT match the tool-page branch

#### R7: Per-tool `SoftwareApplication` node with JSON-sourced description
On every matching `/tools/<tool>/<page>/` page, `Head.astro` MUST emit a `SoftwareApplication` node with: `name` = the FILE SLUG (`run-kit`, not the binary `rk`); `description` = `root.short` read from `help/<tool>.json` via `repoRootFromModuleUrl(import.meta.url)` + `HelpDocSchema.parse`; `applicationCategory: 'DeveloperApplication'`; `operatingSystem: 'macOS, Linux'`; `offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' }`; `url: 'https://github.com/sahil87/<tool>'`.

- **GIVEN** a built page `dist/tools/run-kit/overview/index.html`
- **WHEN** its `application/ld+json` block is extracted and `JSON.parse`d
- **THEN** the graph contains a `SoftwareApplication` with `name: "run-kit"`, `description` = run-kit's `root.short`, `applicationCategory: "DeveloperApplication"`, `operatingSystem: "macOS, Linux"`, `offers.price: 0`, and `url: "https://github.com/sahil87/run-kit"`

#### R8: Per-tool `BreadcrumbList` node, all four crumbs absolute from `Astro.site`
On every matching tool page, `Head.astro` MUST emit a `BreadcrumbList` with exactly four `ListItem`s, all with absolute `item` URLs derived from `Astro.site` (never hardcoded): position 1 Home → `https://shll.ai/`; position 2 Tools → `https://shll.ai/tools/`; position 3 `<tool>` → `https://shll.ai/tools/<tool>/overview/`; position 4 the page display label (Overview/Readme/Commands via a slug→label map) → `https://shll.ai/tools/<tool>/<page>/`.

- **GIVEN** a built page `dist/tools/run-kit/commands/index.html`
- **WHEN** its JSON-LD is extracted and parsed
- **THEN** the graph contains a `BreadcrumbList` with 4 `ListItem`s in order, names `Home`/`Tools`/`run-kit`/`Commands`, and `item` URLs `https://shll.ai/`, `https://shll.ai/tools/`, `https://shll.ai/tools/run-kit/overview/`, `https://shll.ai/tools/run-kit/commands/`
- **AND** every `item` URL is absolute (origin `https://shll.ai`), derived from `Astro.site`, none hardcoded

#### R9: Both tool-page nodes emit in one `<script>` `@graph` via `JSON.stringify` + `set:html`
The `SoftwareApplication` and `BreadcrumbList` nodes MUST be emitted together in a single `<script type="application/ld+json">` as a two-node `@graph` (mirroring the homepage `@graph` shape), serialized with `JSON.stringify` and rendered via `set:html`.

- **GIVEN** any built tool page's JSON-LD block
- **WHEN** the script body is extracted
- **THEN** `JSON.parse` succeeds (byte-exact survival) and the parsed object has `@context: "https://schema.org"` and a 2-element `@graph` (SoftwareApplication, BreadcrumbList)

#### R10: Missing/invalid `help/<tool>.json` failure split for the JSON-LD branch
For the JSON-LD branch (inert SEO metadata), a MISSING `help/<tool>.json` (ENOENT) MUST emit the `SoftwareApplication` node WITHOUT the `description` field (keeping name/url/applicationCategory/operatingSystem/offers) and continue the build; the `BreadcrumbList` always emits. A PRESENT-but-schema-invalid file MUST let `HelpDocSchema.parse` throw (wrapped with the filename) so `astro build` FAILS. This mirrors `CommandReference.astro`'s missing-vs-invalid split.

- **GIVEN** a tool page whose `help/<tool>.json` is absent (ENOENT)
- **WHEN** the site is built
- **THEN** the build succeeds and that page's `SoftwareApplication` node omits `description` but keeps name/url/category/os/offers, and its `BreadcrumbList` emits normally
- **AND GIVEN** a present-but-malformed `help/<tool>.json`, **WHEN** the site is built, **THEN** the build FAILS with an error wrapping the filename

### Verification

#### R11: Built output verified; homepage unchanged; zero new dependencies
The build MUST be verified in `dist/`: `dist/tools/index.html` with seven links + JSON-sourced one-liners; built tool pages' JSON-LD `JSON.parse`-able with the required `SoftwareApplication` (non-empty description matching `root.short`) and 4-item `BreadcrumbList` (absolute URLs); the homepage JSON-LD unchanged vs. pre-change; and no new dependencies (clean `package.json` / lockfile diff).

- **GIVEN** the implementation is complete
- **WHEN** `pnpm build` runs and `dist/` is inspected
- **THEN** all four verification checks pass (tools index, tool-page graphs, homepage-unchanged, dependency-diff-clean)

### Non-Goals

- No changes to `sites/_playground/` or any non-live site (Constitution II/III).
- No client-side JavaScript and no SSR (Constitution I — JSON-LD is inert build-time data).
- No `astro.config.mjs` sidebar `link` change (R4).
- No JSON-LD on non-tool, non-homepage pages (e.g. `getting-started/*`, `reference/*`) — out of scope for this change.
- No change to the homepage's hand-written `ls tools/` one-liners (a documented, separate hand-copy surface); only the NEW `/tools` page is JSON-single-sourced.

### Design Decisions

1. **New `ToolsIndex.astro` component** for the `/tools` page roster — *Why*: mirrors `VersionTable.astro`'s read+validate+render shape (site-authored roster + JSON-sourced value), keeps the MDX page thin, and is the clean form named in the intake's open implementation note. *Rejected*: inlining the read in `index.mdx` frontmatter — MDX frontmatter can't cleanly host the fs/zod read loop, and a component is the established precedent.
2. **`/tools` page uses `VersionTable`'s build-stop posture (R3), not `CommandReference`'s soft-miss** — *Why*: the `/tools` directory listing is a committed site artifact whose value is the complete roster; a missing rostered tool there is a defect, matching `VersionTable`. The JSON-LD branch (R10) uses the soft-miss posture because it is inert SEO metadata. *Rejected*: a single uniform policy — the two surfaces have different correctness criticality, as the intake spells out.
3. **Reuse existing `.tools-listing` / `.tool-desc` CSS** (already in `terminal.css`, used by the homepage) — *Why*: dark-mode parity via `--c-*` tokens is automatic (Constitution V), zero new styles. *Rejected*: bespoke styles for the new page — needless duplication.
4. **Slug→label map for the breadcrumb page crumb** (`overview→Overview`, `readme→Readme`, `commands→Commands`) site-authored in `Head.astro` — *Why*: these three are the reserved per-tool slug set; a small literal map is clearer than title-casing heuristics and matches the intake. Unmapped page slugs fall back to a title-cased segment so future doc-site pages still emit a valid crumb.

## Tasks

### Phase 1: Tools index page

- [x] T001 Create `src/components/ToolsIndex.astro` — mirror `VersionTable.astro`'s read+validate+render shape: a site-authored `ROSTER` (slug + label + overview route, display order shll/idea/hop/fab-kit/wt/run-kit/tu — or homepage order), read each `<repo-root>/help/<slug>.json` via `repoRootFromModuleUrl(import.meta.url)` + `HelpDocSchema.parse`, use `doc.root.short` as the only JSON-sourced value, build-stop on missing/invalid (R3 posture, wrapped with filename + slug). Render as a `<ul class="tools-listing">` with `<a href="/tools/<slug>/overview/">{label}</a><span class="tool-desc">{root.short}</span>` per row. <!-- R2 --> <!-- R3 -->
- [x] T002 Create `src/content/docs/tools/index.mdx` — frontmatter `title: Tools` + a keyword-bearing `description`; body: a short framing sentence (site-authored, naming no commands/flags per vn39) under the existing terminal `ls tools/` motif, then `<ToolsIndex />` imported from `../../../components/ToolsIndex.astro`. <!-- R1 --> <!-- R2 -->

### Phase 2: Head.astro JSON-LD dispatcher

- [x] T003 Extend `src/components/Head.astro` into a route dispatcher: keep the `isHomepage` branch and its `jsonLd` object byte-for-byte unchanged; add tool-page detection via `^/tools/([^/]+)/([^/]+)/?$` against `Astro.url.pathname`. <!-- R5 --> <!-- R6 -->
- [x] T004 In `Head.astro`, on a tool-page match: read `help/<tool>.json` via `repoRootFromModuleUrl(import.meta.url)` + `HelpDocSchema.parse`, applying the missing-vs-invalid split (ENOENT → no description, continue; invalid → throw wrapped with filename), mirroring `CommandReference.astro`. Build the `SoftwareApplication` node (name = file slug; description from `root.short` when present; category/os/offers/url per R7). <!-- R7 --> <!-- R10 -->
- [x] T005 In `Head.astro`, build the `BreadcrumbList` node: 4 `ListItem`s with absolute `item` URLs from `new URL(path, Astro.site).href` (Home `/`, Tools `/tools/`, `<tool>` `/tools/<tool>/overview/`, `<Page>` `/tools/<tool>/<page>/`); page display label via a slug→label map (overview/readme/commands) with a title-cased fallback. <!-- R8 -->
- [x] T006 In `Head.astro`, assemble the tool-page `@graph` ([SoftwareApplication, BreadcrumbList]) into one `JSON.stringify`'d string and emit a single mutually-exclusive `<script type="application/ld+json" set:html={...}>` gated on the tool-page match (homepage branch stays gated on `isHomepage`). <!-- R9 --> <!-- R5 -->

### Phase 3: Verification

- [x] T007 Run `pnpm build` in `sites/astro-starlight-terminal1/` and fix any build failures. <!-- R11 -->
- [x] T008 Verify `dist/`: `dist/tools/index.html` has seven `/tools/<tool>/overview/` links with JSON-sourced one-liners; for built tool pages (run-kit overview/commands/readme) extract each `application/ld+json` body, confirm `JSON.parse` succeeds, the `SoftwareApplication` description matches `root.short`, and the 4-item `BreadcrumbList` URLs are absolute `https://shll.ai/...`. <!-- R11 --> <!-- R7 --> <!-- R8 --> <!-- R9 -->
- [x] T009 Confirm `dist/index.html`'s JSON-LD block is unchanged vs. pre-change (WebSite + SoftwareApplication `@graph`), and `git diff` of `package.json` + lockfile is clean (zero new deps). <!-- R11 --> <!-- R5 -->

## Execution Order

- T001 blocks T002 (the MDX page imports the component).
- T003 blocks T004, T005, T006 (all extend the same dispatcher in `Head.astro`).
- T007 depends on T001–T006; T008/T009 depend on T007.

## Acceptance

### Functional Completeness

- [ ] A-001 R1: `/tools` page exists; `dist/tools/index.html` is built with `title: Tools`, a keyword-bearing description, and seven `/tools/<tool>/overview/` links.
- [ ] A-002 R2: The `/tools` page tool one-liners equal the corresponding `help/<tool>.json` `root.short`; no description string is hand-coded in `ToolsIndex.astro` / `index.mdx`.
- [ ] A-003 R4: The "Tools" sidebar group in `astro.config.mjs` has no `link` key; `astro.config.mjs` is unchanged.
- [ ] A-004 R5: `Head.astro` is a dispatcher with a homepage branch and a mutually-exclusive tool-page branch.
- [ ] A-005 R6: Tool-page route detection uses the `^/tools/([^/]+)/([^/]+)/?$` pathname regex.
- [ ] A-006 R7: Each built tool page carries a `SoftwareApplication` with file-slug name, `root.short` description, `DeveloperApplication` category, `macOS, Linux` OS, free `offers`, and the `github.com/sahil87/<tool>` url.
- [ ] A-007 R8: Each built tool page carries a 4-item `BreadcrumbList` with absolute `https://shll.ai/...` item URLs derived from `Astro.site`.
- [ ] A-008 R9: Both tool-page nodes emit in one `application/ld+json` `@graph` and survive `JSON.parse` byte-exact.

### Behavioral Correctness

- [ ] A-009 R5: The homepage JSON-LD block in `dist/index.html` is byte-for-byte identical to the pre-change emission (WebSite + SoftwareApplication `@graph`).

### Edge Cases & Error Handling

- [ ] A-010 R10: Missing `help/<tool>.json` (ENOENT) for the JSON-LD branch omits only the `description` field (node still emits; BreadcrumbList still emits; build succeeds); present-but-invalid fails the build with the filename in the error.
- [ ] A-011 R3: A missing/invalid rostered `help/<tool>.json` stops the `/tools` page build with an error naming the file and slug.

### Scenario Coverage

- [ ] A-012 R11: `pnpm build` succeeds; the four verification checks (tools index, tool-page graphs, homepage-unchanged, dependency-diff-clean) all pass.

### Code Quality

- [ ] A-013 Pattern consistency: New code follows the `VersionTable.astro` / `CommandReference.astro` / `Head.astro` patterns (read+validate via shared libs, error wording, `set:html` literal emission).
- [ ] A-014 No unnecessary duplication: Reuses `repoRootFromModuleUrl`, `HelpDocSchema`, and the existing `.tools-listing`/`.tool-desc` CSS; introduces no new dependency (Constitution VI) and no magic strings beyond named constants.

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Confident | `/tools` roster uses the homepage display order (idea, hop, fab-kit, wt, run-kit, tu, shll) for the listing; only the description is JSON-sourced | Intake leaves listing order as a site-authored detail; the homepage `ls tools/` ordering is the nearest precedent for the directory listing, keeping the two directory views consistent. Easily reordered later | S:70 R:90 A:75 D:75 |
| 2 | Confident | Page-slug→label map covers `overview`/`readme`/`commands` (the reserved set) with a title-cased fallback for any other matched second segment | Intake names exactly these three; a fallback keeps a future docs-site page (e.g. `install`) emitting a valid breadcrumb crumb rather than an empty label | S:80 R:85 A:85 D:80 |
| 3 | Confident | The `/tools` page framing sentence is site-authored prose that names no commands/flags (vn39 hard rule for hand-written site prose) | Constitution Tool-Page Depth / `vn39`: hand-written site prose must not reference commands/flags absent from `help/<tool>.json`; a framing sentence at the "what it's for" altitude is safe | S:80 R:90 A:90 D:85 |
| 4 | Confident | `ToolsIndex.astro` uses `VersionTable`'s build-stop posture on missing/invalid help JSON (not the JSON-LD soft-miss) | The directory page is a committed artifact like `VersionTable`; intake assumption #8 ties it to the `VersionTable` precedent. Distinct from the inert-SEO JSON-LD branch (R10) | S:80 R:80 A:85 D:80 |
| 5 | Confident | Breadcrumb position-3 (`<tool>`) `item` URL points at the tool's `/overview/` page (its canonical entry), not a bare `/tools/<tool>/` (which has no route) | Intake specifies `https://shll.ai/tools/<tool>/overview/` for position 3 verbatim; `/tools/<tool>/` has no index route on this site, so `/overview/` is the only valid destination | S:90 R:85 A:90 D:90 |

5 assumptions (0 certain, 5 confident, 0 tentative).
