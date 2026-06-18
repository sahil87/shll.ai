# Intake: Per-Page JSON-LD Structured Data

**Change**: 260618-pgox-per-page-json-ld-structured-data
**Created**: 2026-06-18

## Origin

Backlog item `[pgox]` (2026-06-18), backlog #2 of 3 from the SEO/agent-discoverability discussion. Invoked via `/fab-new pgox`. One-shot intake (no prior conversation); the backlog item itself carries the full design intent.

> Extend JSON-LD structured data beyond the homepage on the live site (sites/astro-starlight-terminal1). Today only the homepage carries a WebSite+SoftwareApplication @graph, emitted from src/components/Head.astro gated on Astro.url.pathname==='/' (see docs/memory/conventions/seo-social-meta.md § Homepage JSON-LD). Add per-page structured data for richer search results (Google rich snippets) and machine-readable entity data for agents: (1) a per-tool SoftwareApplication (or TechArticle) node on each tools/<tool>/* page, name/description single-sourced from help/<tool>.json (do NOT hand-copy — same anti-drift rule as everywhere else); (2) a BreadcrumbList reflecting the Home › Tools › <tool> › <page> hierarchy on tool subpages. Reuse the existing Head.astro set:html literal-emission pattern (already used for the homepage JSON-LD and the Cloudflare beacon), route-gated like the current homepage block — extend the dispatcher rather than adding a second authoring home. JSON-LD is inert data, not executable JS — no Constitution I conflict. Static-first, zero new deps (Constitution VI). Verify built HTML with a JSON-LD validator / JSON.parse on the extracted script body (mirror the kb1r verification). Acceptance: each tool page emits a valid SoftwareApplication + BreadcrumbList graph, descriptions single-sourced from help/<tool>.json, no new deps, homepage block unchanged. Source: SEO/agent-discoverability discussion 2026-06-18 (backlog #2 of 3; sequence after llms.txt item 354p).

**Key decision from intake (user-resolved)**: the breadcrumb hierarchy describes `Home › Tools › <tool> › <page>`, but the site has **no `/tools` index page** today (the sidebar "Tools" entry is a non-linking group label, and no `src/content/docs/tools/index.*` exists). Asked the user how to handle the URL-less "Tools" crumb. **User's answer: create a new `/tools` index page that lists the tools.** This gives the "Tools" breadcrumb level a real destination and makes the full 4-level hierarchy fully valid (every crumb resolves to an actual URL). This change therefore **also creates a `/tools` directory/landing page** — a scope addition beyond the bare JSON-LD work, deliberately chosen by the user over flattening or synthesizing the crumb.

## Why

**Problem.** Only the homepage carries structured data (`WebSite` + `SoftwareApplication`, `kb1r`). The 21 tool pages (7 tools × `overview`/`readme`/`commands`) — the highest-intent, most-linkable content on the domain — emit no machine-readable entity data. Search engines see them as undifferentiated docs pages, and coding agents crawling the site get no structured signal about *what each tool is*. This is the search-engine sibling of the llms.txt work (`354p`, the agent-facing index); together they make the toolkit discoverable to both crawlers and agents.

**Consequence of not fixing.** No Google rich-result eligibility for the tool pages (no `SoftwareApplication` cards, no breadcrumb trails in SERPs). Agents that parse JSON-LD (an increasingly common discovery path) get nothing structured per tool. The site keeps under-representing its most valuable pages.

**Why this approach.**
- **Extend `Head.astro`'s existing dispatcher, don't add a second authoring home.** `Head.astro` already owns the `set:html` literal-emission pattern (Cloudflare beacon `i2b0`, homepage JSON-LD `kb1r`) and is route-gated on `Astro.url.pathname === '/'`. The per-tool block is the same shape, gated on the tool-page route instead — one authoring home for all JSON-LD, consistent with the `kb1r` placement decision (rejected: an `index.mdx`-style frontmatter `head:` string blob — fragile YAML escaping, and it can't reach per-route help-JSON data).
- **Single-source descriptions from `help/<tool>.json`.** The anti-drift rule is binding everywhere (`vn39`, `help-collection`, Tool-Page Depth). `root.short` is the canonical one-liner the producer emits; the llms.txt sibling (`354p`) drives its tool one-liners from the same field. Hand-copying descriptions here would create a *new* drift surface — exactly what the constitution warns against. Derive, never retype.
- **`SoftwareApplication` over `TechArticle`.** A CLI tool *is* software; the homepage already models the toolkit as `SoftwareApplication`, and per-tool `SoftwareApplication` nodes compose into a coherent entity graph. `SoftwareApplication` is rich-result eligible and is the natural type for a brew-installable binary. (`TechArticle` would model the *page* as an article — wrong altitude for a tool entity.)
- **Static-first, zero deps.** JSON-LD is inert data serialized via `JSON.stringify` + `set:html` at build time. No client JS (the inert-data carve-out the homepage block already established — no Constitution I conflict), no new dependency (Constitution VI). The help-JSON read reuses the established `repoRootFromModuleUrl` + `HelpDocSchema.parse` libs.

## What Changes

### 1. New `/tools` index page (`src/content/docs/tools/index.mdx`)

A new Starlight content page at slug `tools` (route `/tools/`) that serves as the tools directory/landing page — the destination for the "Tools" breadcrumb crumb.

- **Frontmatter**: `title: Tools`, a keyword-bearing `description`.
- **Body**: a short framing sentence + a directory listing of the seven tools, each linking to `/tools/<tool>/overview/` with a one-line description. **The per-tool one-liner MUST single-source from `help/<tool>.json` `root.short`** — do NOT hand-type descriptions. This page is built at build time and must NOT become a *fourth* hand-copy of tool descriptions (the codebase already documents three-way/two-way copies — `tool-page-rubric.md`). Reuse the established read pattern (`repoRootFromModuleUrl(import.meta.url)` + `HelpDocSchema.parse`); the homepage `ls tools/` listing and `VersionTable.astro` are precedents for a build-time roster rendered from site-authored order + JSON-sourced values.
  - **Site-authored vs JSON-sourced split** (mirror `VersionTable`): the roster, display order, display labels, and route links stay site-authored (in the page or a small component); ONLY the description string comes from JSON. Use the file slug for the display label/route (`run-kit`, not the binary `rk`) — a directory/section reference per the `rk` vs `run-kit` rule.
- **Sidebar**: **leave the existing "Tools" sidebar group UNLINKED** (resolved at clarify — assumption #11). Do NOT add a `link: '/tools/'` to the group in `astro.config.mjs`; the group stays a pure expand/collapse label. The new `/tools` page is reachable via the BreadcrumbList crumb + its direct URL — that is sufficient for the crumb's destination. (Rejected: a linked group label — accepted as a lighter touch with no config change.) The page must still exist and resolve at `/tools/`.

> **Open implementation note for apply**: whether the tool one-liner roster lives inline in `index.mdx` (via an imported small component) or as a reusable `ToolsIndex.astro` component is an apply-time call — but the **build-time, JSON-single-sourced** property is non-negotiable. A new `ToolsIndex.astro` (mirroring `VersionTable.astro`'s read+validate+render shape) is the clean form.

### 2. Per-tool `SoftwareApplication` + `BreadcrumbList` JSON-LD (`src/components/Head.astro`)

Extend the existing route-gated JSON-LD block in `Head.astro`. Today:

```astro
const isHomepage = Astro.url.pathname === '/';
const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@graph': [ /* WebSite + SoftwareApplication */ ] });
...
{isHomepage && <script type="application/ld+json" set:html={jsonLd} />}
```

Becomes a **dispatcher**: the homepage branch is unchanged (byte-for-byte — an acceptance constraint), and a new tool-page branch emits a per-tool `@graph`.

- **Route detection** (resolved at clarify — #12): **parse `Astro.url.pathname`** with the regex `^/tools/([^/]+)/([^/]+)/?$` to extract `<tool>` + `<page>`, for consistency with the existing homepage gate (`pathname === '/'`) in this same file. The homepage block stays gated on `pathname === '/'`; the two branches are mutually exclusive. (Rejected: `Astro.locals.starlightRoute.id` + the `TocDispatcher` regexes — equally valid, but mixes idioms within `Head.astro`.)
- **Per-tool `SoftwareApplication` node** (emitted on every `/tools/<tool>/*` page):
  ```jsonc
  {
    "@type": "SoftwareApplication",
    "name": "<tool>",                       // file slug, e.g. "run-kit" — the product/repo identity
    "description": "<root.short from help/<tool>.json>",  // single-sourced, NEVER hand-copied
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "macOS, Linux",
    "offers": { "@type": "Offer", "price": 0, "priceCurrency": "USD" },
    "url": "https://github.com/sahil87/<tool>"   // built from a constant base; consistent with homepage node's GitHub url
  }
  ```
  - `name`: **file slug** (`run-kit`), not the binary `tool` field (`rk`) — the SoftwareApplication entity names the *software product/repo*, not the typed binary, and matches the page route + breadcrumb label + GitHub url (`rk` vs `run-kit` rule). *Resolved at clarify (#9) — user confirmed file slug.*
  - `description`: from `help/<tool>.json` `root.short` (e.g. run-kit → `"rk — tmux session manager with web UI"`). Read via `repoRootFromModuleUrl(import.meta.url)` + `HelpDocSchema.parse` (same libs `CommandReference`/`VersionTable`/`CommandIndex` use). NO hand-copy.
  - `applicationCategory`/`operatingSystem`/`offers`: mirror the homepage `SoftwareApplication` node's shape for graph consistency (all seven are free, macOS+Linux CLIs).
- **`BreadcrumbList` node** (emitted on every `/tools/<tool>/*` page), reflecting `Home › Tools › <tool> › <page>`, **all four crumbs URL'd** (the new `/tools` page makes the Tools crumb real):
  ```jsonc
  {
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home",    "item": "https://shll.ai/" },
      { "@type": "ListItem", "position": 2, "name": "Tools",   "item": "https://shll.ai/tools/" },
      { "@type": "ListItem", "position": 3, "name": "<tool>",  "item": "https://shll.ai/tools/<tool>/overview/" },
      { "@type": "ListItem", "position": 4, "name": "<Page>",  "item": "https://shll.ai/tools/<tool>/<page>/" }
    ]
  }
  ```
  - The `<Page>` label is the page's display title (`Overview` / `Readme` / `Commands`) — a small slug→label map (overview→Overview, readme→Readme, commands→Commands), site-authored (these three are the reserved slug set per `tool-page-rubric.md`).
  - All URLs **absolute**, derived from `Astro.site` (`new URL(...).href`), never hardcoded — the same absolute-URL discipline `kb1r` established for og:image. `site: 'https://shll.ai'` in `astro.config.mjs` is the single origin source.
- **Emission**: the two nodes go in one `<script type="application/ld+json">` `@graph` per tool page (one block, two entities — mirrors the homepage block's `@graph` shape), via `JSON.stringify` + `set:html`. `JSON.stringify` of these plain objects never produces `<` or raw HTML, so `set:html` is safe by construction (the `kb1r` byte-exact guarantee).
- **Homepage block UNCHANGED** (acceptance constraint): the existing `WebSite` + `SoftwareApplication` homepage `@graph`, its `isHomepage` gate, and the site-wide og:image set are untouched. Only a new, mutually-exclusive route branch is added.

### 3. Failure mode (missing / invalid `help/<tool>.json`)

Mirror `CommandReference.astro`'s split (NOT `VersionTable`'s build-stop), because the JSON-LD here is inert SEO metadata, not a correctness-critical committed artifact:

- **Missing file (ENOENT)** → **emit the `SoftwareApplication` node WITHOUT its `description` field** and continue the build (resolved at clarify — #10: omit the description only, NOT the whole node). An absent help file is an expected interim state for a not-yet-landed producer; a missing description must not stop the build. The node keeps `name`/`url`/`applicationCategory`/`operatingSystem`/`offers` (all site-authored / derivable without the help JSON), and the BreadcrumbList (which needs no help JSON) always emits. (Rejected: omitting the whole `SoftwareApplication` node — a partial entity beats no entity; also rejected: build-fail on missing — `VersionTable`'s posture is wrong for transient/interim absence of inert SEO data.)
- **Present but schema-invalid** → propagate the `HelpDocSchema.parse` error (wrapped with the filename) so `astro build` FAILS — a committed malformed help file is a defect that must not deploy (the `CommandReference` invalid-file contract). This is unchanged regardless of the missing-file policy.

### 4. Verification (mirror the `kb1r` JSON-LD verification)

`pnpm build`, then for the built tool pages in `dist/`:
- Extract each `<script type="application/ld+json">` body and confirm `JSON.parse` succeeds (byte-exact survival, the `kb1r` check).
- Confirm each tool page's graph carries a `SoftwareApplication` (with a non-empty `description` matching `help/<tool>.json` `root.short`) and a 4-item `BreadcrumbList` with all `item` URLs absolute (`https://shll.ai/...`).
- Confirm the **homepage** block is unchanged (diff its emitted JSON-LD against pre-change).
- Optionally validate against a JSON-LD / schema.org validator (Google Rich Results test or `schema-dts`-style shape check) — no new dependency required for the `JSON.parse` extraction check.
- Confirm `dist/tools/index.html` (the new `/tools` page) exists with the seven tool links + JSON-sourced one-liners.

## Affected Memory

- `conventions/seo-social-meta`: (modify) extend the **§ Homepage JSON-LD** section — it currently states JSON-LD is homepage-only. Add a § for per-page (per-tool) structured data: the `Head.astro` route dispatcher (homepage vs tool-page branches), the per-tool `SoftwareApplication` + `BreadcrumbList` graph, the `help/<tool>.json` `root.short` single-sourcing, the absolute-URL-from-`Astro.site` discipline, and the missing-vs-invalid failure split.
- `conventions/tool-page-rubric`: (modify) note the new `/tools` index page (a new reserved-at-root page, the tools directory landing), its build-time JSON-single-sourced tool one-liners (a NON-drift surface, unlike the documented hand-copy surfaces), and the per-tool JSON-LD now carried via the `Head.astro` override on every tool page. Possibly update the reserved-slug discussion (`overview`/`readme`/`commands` are per-tool; `tools` index is a new sibling root).
- `build-deploy/deployment`: (modify, *if* the per-tool help-JSON read changes the build's dependency on `help/*.json` freshness in a way worth recording — likely a light touch or none, since the read pattern already exists for `CommandReference`/`VersionTable`).

## Impact

- **Code (live site only, `sites/astro-starlight-terminal1/`)**:
  - `src/components/Head.astro` — extend the JSON-LD block into a route dispatcher (homepage branch unchanged; new tool-page branch gated on the `^/tools/([^/]+)/([^/]+)/?$` pathname regex); read `help/<tool>.json` via the established repo-root libs.
  - `src/content/docs/tools/index.mdx` (NEW) — the `/tools` directory page.
  - Possibly `src/components/ToolsIndex.astro` (NEW) — build-time tool roster with JSON-sourced one-liners (mirrors `VersionTable.astro`).
  - `astro.config.mjs` — **no change** (resolved at clarify — #11: the "Tools" sidebar group stays unlinked).
- **Reused libs (no change)**: `src/lib/repo-root.ts` (`repoRootFromModuleUrl`), `src/lib/schemas.ts` (`HelpDocSchema`). Route detection is pathname-based (#12), so `commands-toc.ts`/`readme-toc.ts` regexes are NOT needed for `Head.astro`.
- **Data**: `help/<tool>.json` (repo root) — read-only consumption of `root.short`. The cross-boundary read is already documented and intended.
- **Dependencies**: NONE added (Constitution VI). JSON-LD is inert data (no Constitution I conflict).
- **Constitution**: I (static-first — build-time, no runtime/SSR ✓), VI (zero new deps ✓), Tool-Page Depth / anti-drift (descriptions single-sourced, never hand-copied ✓). The new `/tools` page's one-liners must obey the single-source rule to avoid a new drift surface.
- **Scope boundary**: live Starlight site only; `sites/_playground/` untouched. Sequence after llms.txt item `354p` (sibling) per the backlog; not a hard dependency, but both consume `help/<tool>.json` `root.short` — landing `354p` first establishes the read-pattern precedent.

## Open Questions

All four intake-time open questions were resolved during `/fab-clarify` (Session 2026-06-18) — see `## Clarifications`. No outstanding questions remain.

- ~~Should the per-tool `SoftwareApplication` `name` be the file slug (`run-kit`) or the binary identity (`rk`)?~~ **RESOLVED: file slug** (`run-kit`) — product/repo identity, matches route + breadcrumb + GitHub url.
- ~~On a missing `help/<tool>.json`, omit just the `description` or the entire `SoftwareApplication` node?~~ **RESOLVED: omit the `description` field only** — still emit the `SoftwareApplication` node (partial entity beats no entity); BreadcrumbList always emits; invalid JSON still build-fails.
- ~~Should the `/tools` sidebar group become a linked label, or stay a pure group?~~ **RESOLVED: leave the group UNLINKED** — the `/tools` page is reachable via breadcrumb + direct URL only; no `astro.config.mjs` group `link`.
- ~~Route detection: parse `Astro.url.pathname` vs `Astro.locals.starlightRoute.id`?~~ **RESOLVED: parse `Astro.url.pathname`** (`^/tools/([^/]+)/([^/]+)/?$`) — consistency with the existing homepage gate in this same file.

## Clarifications

### Session 2026-06-18

| # | Question | Answer |
|---|----------|--------|
| 9 | `SoftwareApplication.name` — file slug (`run-kit`) or binary identity (`rk`)? | **File slug** (`run-kit`) — names the software product/repo, matches route + breadcrumb + GitHub url. |
| 10 | On a missing `help/<tool>.json`, omit just the `description` or the whole `SoftwareApplication` node (or build-fail)? | **Omit the `description` field only** — still emit the node; BreadcrumbList always emits; invalid JSON still build-fails. |
| 11 | Make the "Tools" sidebar group a clickable link to the new `/tools` page? | **Leave the group unlinked** — page reachable via breadcrumb + direct URL; no `astro.config.mjs` change. |
| 12 | Route detection in `Head.astro` — parse `Astro.url.pathname` or read `Astro.locals.starlightRoute.id`? | **Parse `Astro.url.pathname`** (`^/tools/([^/]+)/([^/]+)/?$`) — consistent with the existing homepage gate in this file. |

## Assumptions

<!-- STATE TRANSFER: continuity between intake and apply-entry agent. -->

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Read `help/<tool>.json` via `repoRootFromModuleUrl(import.meta.url)` + `HelpDocSchema.parse` (the established cross-boundary read) | Single documented pattern; `CommandReference`/`VersionTable`/`CommandIndex` all use it; config/codebase deterministically answer | S:90 R:85 A:95 D:95 |
| 2 | Certain | Single-source per-tool descriptions from `help/<tool>.json` `root.short`; never hand-copy | Binding anti-drift rule (constitution Tool-Page Depth, `vn39`, `help-collection`); `root.short` is the canonical one-liner the llms.txt sibling `354p` also uses | S:95 R:80 A:95 D:95 |
| 3 | Certain | Homepage JSON-LD block stays byte-for-byte unchanged; add a mutually-exclusive tool-page route branch only | Explicit acceptance constraint in the backlog item | S:95 R:90 A:95 D:95 |
| 4 | Confident | Use `SoftwareApplication` (not `TechArticle`) for the per-tool node | A CLI is software; homepage already models the toolkit as SoftwareApplication; rich-result eligible; backlog names it first | S:75 R:85 A:80 D:80 |
| 5 | Confident | Emit both nodes in one `<script>` `@graph` via `JSON.stringify` + `set:html`, route-gated in `Head.astro` | Mirrors the homepage `@graph` block + the `kb1r` byte-exact `set:html` guarantee; backlog mandates reuse of this exact pattern | S:85 R:85 A:90 D:85 |
| 6 | Confident | All BreadcrumbList/url values absolute, derived from `Astro.site`, never hardcoded | The `kb1r` absolute-URL discipline; `site:'https://shll.ai'` is the single origin source | S:80 R:85 A:90 D:90 |
| 7 | Confident | Create a new `/tools` index page (`tools/index.mdx`) so the "Tools" breadcrumb crumb has a real URL | User-chosen at intake over flattening/synthesizing the crumb; makes the 4-level hierarchy fully valid | S:80 R:75 A:70 D:80 |
| 8 | Confident | The new `/tools` page's per-tool one-liners also single-source from `help/<tool>.json` `root.short` (build-time) | Same anti-drift rule; must not become a fourth hand-copy; `VersionTable` is the site-authored-order + JSON-sourced-value precedent | S:80 R:80 A:90 D:85 |
| 9 | Confident | `SoftwareApplication.name` = file slug (`run-kit`), not binary identity (`rk`) | Clarified — user confirmed: entity names the software product/repo, matching route + breadcrumb label + GitHub url (`rk` vs `run-kit` rule) | S:95 R:80 A:65 D:55 |
| 10 | Confident | Missing `help/<tool>.json` emits `SoftwareApplication` WITHOUT the `description` field (BreadcrumbList always emits); invalid build-fails | Clarified — user confirmed: omit description only (partial entity beats no entity); mirrors `CommandReference` split (inert SEO data, not a build-stop artifact) | S:95 R:80 A:70 D:60 |
| 11 | Confident | Leave the "Tools" sidebar group UNLINKED; the new `/tools` page is reachable via breadcrumb + direct URL only (no `astro.config.mjs` group `link`) | Clarified — user changed to "leave group unlinked": lighter touch, no config change; the page still resolves for the breadcrumb crumb | S:95 R:85 A:70 D:60 |
| 12 | Confident | Route detection via `Astro.url.pathname` regex (`^/tools/([^/]+)/([^/]+)/?$`), not `starlightRoute.id` | Clarified — user confirmed: consistency with the existing homepage gate (`pathname === '/'`) in this same file | S:95 R:85 A:70 D:65 |

12 assumptions (3 certain, 9 confident, 0 tentative, 0 unresolved).
