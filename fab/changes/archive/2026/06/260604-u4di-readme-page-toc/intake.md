# Intake: Right-Panel ToC for the README page

**Change**: 260604-u4di-readme-page-toc
**Created**: 2026-06-04
**Status**: Draft

## Origin

This change originated from a `/fab-discuss` session that turned into a `/fab-new`.
The user observed: *"Just like there's a custom Right Panel ToC generator for the
commands page, we might need one for the README page that's linked to the captured
content/*.md files. Check this."*

The discussion confirmed the gap is real, then resolved three design questions
interactively (mode: conversational):

- **Integration approach** → user chose **separate `ReadmeToc` / `ReadmeMobileToc`
  components** with a route-dispatching override (NOT extending the existing
  `CommandsToc` / `CommandsMobileToc`).
- **Heading depth** → user chose **H2 + H3 nested** (matching the site's
  `tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 }` config), over H2-only.
- **Scope of this step** → user chose **plan-only via a tracked fab change** (this
  intake), no code yet.

The investigation read: `astro.config.mjs` (override wiring), `commands-toc.ts`,
`CommandsToc.astro`, `CommandsMobileToc.astro`, `ReadmeSlice.astro`, the seven
`content/<tool>/README.md` slices, `terminal.css` (ToC styling hooks), and a sample
`readme.mdx` page.

## Why

**The problem.** The per-tool README page (`/tools/<tool>/readme`) renders a tool's
canonical README slice via `ReadmeSlice.astro`, which reads `content/<tool>/README.md`
and injects it with `set:html`. Starlight builds its native right-rail "On this page"
ToC from the **`.mdx` file's own heading AST at compile time** — but `readme.mdx`
contains only `<ReadmeSlice tool="..."/>`, so the AST has zero headings. The actual
`##`/`###` headings live inside a runtime `set:html` string the AST never sees. Result:
the README page — often the **deepest** page on the site — has an empty/useless ToC.

This is the exact same invisibility class the commands page already solved: there, the
content is `<details>/<summary>` (not headings), so the native ToC also can't see it,
and `CommandsToc` / `CommandsMobileToc` were built to fill the rail from
`help/<tool>.json`. The README page has the identical need against a different source
of truth (`content/<tool>/README.md`).

**The consequence if unfixed.** The README slices are substantial — `fab-kit` alone has
~13 H2 sections plus many nested H3; `hop`, `shll`, `run-kit` each have 8–12. Long,
single-column prose with no navigation aid is hard to scan and orient in. The page that
most needs an "On this page" rail is the one page that has nothing — a direct usability
regression relative to every other page on the site.

**Why this approach.** Mirroring the proven commands-page pattern keeps the codebase
consistent and stays fully build-time (Constitution I). A secondary, blocking sub-problem
must be solved first: the injected README HTML currently has **no heading anchor IDs**,
because `ReadmeSlice` calls `createMarkdownProcessor({})` with empty config (no
`rehype-slug`). Without anchors there is nothing for a ToC to link to — so anchor/slug
generation is a prerequisite, not an optional nicety.

## What Changes

### 1. Heading anchors in the rendered README slice (prerequisite)

`ReadmeSlice.astro` currently renders with an empty processor config:

```ts
const processor = await createMarkdownProcessor({});
const rendered = await processor.render(raw!);
html = rendered.code;
```

The injected `<h2>`/`<h3>` elements therefore have **no `id` attributes**. This change
adds heading-slug generation so every H2/H3 in the rendered slice carries a stable,
deterministic anchor `id` (the standard GitHub-style slugger Astro/Starlight already use
for native headings, so README anchors match the visual heading text and behave like
ordinary in-page anchors).

**Decided (clarification 2026-06-04): a `github-slugger`-based SHARED slug helper.**
Derive the slug centrally with `github-slugger` in ONE shared helper (e.g. a
`headingSlug` export) that BOTH the renderer and the ToC builder consume — the single
source of truth for the slug, mirroring how `commandSlug` is shared between
`CommandReference` and `CommandsToc`. The ToC slug MUST equal the rendered heading `id`
exactly or links break; sharing the function guarantees that by construction. The
renderer applies the slug to each `<h2>`/`<h3>`'s `id` (e.g. a small rehype step or
post-render pass that calls the shared helper), and `lib/readme-toc.ts` produces each
`href` from the same helper. Dependency note (Constitution VI): if `github-slugger` is
not already transitively importable, declare it explicitly and pin it — exactly as
`@astrojs/markdown-remark@7.1.2` was declared for this component. (The `rehype-slug`
plugin was rejected: it would force the ToC builder to independently reproduce GitHub's
slug algorithm, creating two code paths to keep in sync.)

### 2. README ToC builder helper (`lib/readme-toc.ts`)

A new build-time helper, the README sibling of `lib/commands-toc.ts`:

- Detects the README route: a `tools/<tool>/readme` route id (vs. the commands helper's
  `tools/<tool>/commands` regex).
- Reads the SAME `content/<tool>/README.md` slice `ReadmeSlice` renders, ascending to the
  repo root via the `help/`-marker `findRepoRoot` pattern already established in
  `ReadmeSlice` (NOT `content/`, which collides with Starlight's `src/content/`).
- Parses the markdown headings into a **nested H2 → H3 tree** (depth bounded to H2/H3 to
  match site config), each node carrying `{ text, slug, depth, children }` where `slug` is
  produced by the shared slug function (item 1) so it equals the rendered heading `id`.
- Returns `[]` when the slice is missing (ENOENT) so the page degrades to the default ToC,
  and re-throws genuine parse errors — mirroring `firstLevelCommands`' failure contract.

### 3. New ToC components: `ReadmeToc.astro` + `ReadmeMobileToc.astro`

Separate components (user decision — NOT extending the commands components):

- **`ReadmeToc.astro`** — desktop right-rail content. Emits a `<starlight-readme-toc>`
  custom element wrapping a labelled `<nav>` + "On this page" `<h2>` + a **nested** list
  (H2 with H3 children) of `<a href="#{slug}">`. (Route gating lives in the dispatcher —
  item 4 — not here; `ReadmeToc` is only rendered on README routes.) Progressive-enhancement
  scroll-spy highlights the in-view heading via `IntersectionObserver`, tracking **both** H2
  and H3 levels (per clarification) — it highlights the specific H3 currently in view and
  its parent H2. Targets are real headings, so this is simpler than the `<details>`-based
  commands spy (no expand-on-click, no `<details>.open` handling), but it observes two
  heading levels rather than the commands page's flat first-level list.
- **`ReadmeMobileToc.astro`** — mobile dropdown counterpart, mirroring
  `CommandsMobileToc`'s `<details>` dropdown frame, emitting a `<readme-mobile-toc>`
  element with the same nested heading list.

Both are build-time only (Constitution I); the static nested list is fully usable with JS
disabled, JS only adds scroll-spy + (mobile) open/close.

### 4. Route-dispatching ToC override

The Starlight override slots are global and singular — there is exactly one
`TableOfContents` and one `MobileTableOfContents` component. Today they point straight at
the commands components:

```js
// astro.config.mjs (current)
components: {
  TableOfContents: './src/components/CommandsToc.astro',
  MobileTableOfContents: './src/components/CommandsMobileToc.astro',
},
```

This change introduces a **dispatcher** so a single override slot can serve commands
pages, README pages, and everything else.

**Decided (clarification 2026-06-04): an explicit dispatcher.** Add a thin
`TocDispatcher.astro` and `MobileTocDispatcher.astro`, registered as the
`components.TableOfContents` / `MobileTableOfContents` override slots. Each inspects
`Astro.locals.starlightRoute.id` and renders `CommandsToc` for `tools/*/commands`,
`ReadmeToc` for `tools/*/readme`, else Starlight's `<Default />`. The dispatcher MUST
preserve the existing commands-page behavior byte-for-byte (no regression) and add the
README handling. (Fall-through chaining among the custom components was rejected: routing
would be implicit and spread across components, harder to trace.)

### 5. Terminal styling for the new element (`terminal.css`)

The terminal ToC look (`# ` heading prefix, `> ` active marker, mono links, accent
colors) is single-sourced in `terminal.css` by **custom-element selector**, currently
targeting `starlight-toc` and `starlight-commands-toc` together (≈ lines 271–299). This
change adds `starlight-readme-toc` to those same selector groups so the new element
inherits the identical terminal styling, plus nesting indentation for the H3 child level.
Dark-mode parity (Constitution V) follows automatically from the shared CSS-variable
theming the existing ToCs already use.

## Affected Memory

- `conventions/tool-page-rubric`: (modify) The tool-page shape currently documents the
  commands-page ToC override and the readme page as a thinned sibling. Add the README
  page's right-rail ToC (nested H2/H3, sourced from `content/<tool>/README.md`, separate
  components, route-dispatching override) as part of the rubric.
- `conventions/readme-extraction`: (modify) The README consume/pull side documents
  `ReadmeSlice` rendering via `createMarkdownProcessor`. Record that the renderer now emits
  heading anchor IDs (shared slug function) and that a sibling `readme-toc` builder reads
  the same slice to populate the rail.

## Impact

- **Code (live site only — `sites/astro-starlight-terminal1`)**:
  - `src/components/ReadmeSlice.astro` — add heading-anchor generation.
  - `src/lib/readme-toc.ts` — NEW (README sibling of `commands-toc.ts`).
  - `src/components/ReadmeToc.astro` — NEW (desktop rail).
  - `src/components/ReadmeMobileToc.astro` — NEW (mobile dropdown).
  - `src/components/TocDispatcher.astro` + `MobileTocDispatcher.astro` — NEW (route
    dispatch), OR the chosen dispatch shape.
  - `astro.config.mjs` — repoint the two `components.*Toc` overrides to the dispatcher(s).
  - `src/styles/terminal.css` — add `starlight-readme-toc` to the ToC selector groups +
    H3 nesting indent.
- **Dependencies**: possibly one declared+pinned slug dep (`rehype-slug` or
  `github-slugger`) if not already importable — justified per Constitution VI by the
  page-visible need (anchors + ToC links).
- **Constitution**: I (static/build-time) — satisfied, all work is build-time. V
  (dark-mode parity) — satisfied via shared CSS-variable theming. No SSR, no runtime fetch.
- **No change** to `content/*.md` capture, the scheduled refresh, the `vn39` reporter, or
  the commands-page behavior (must be preserved).
- **Other sites** under `sites/` are untouched (Multi-Site Isolation).

## Open Questions

_All resolved in the 2026-06-04 clarification session — see `## Clarifications`._

- ~~Shared-slug mechanism~~ → **RESOLVED: a `github-slugger`-based SHARED slug helper**,
  consumed by both `ReadmeSlice` (rendered heading `id`s) and `lib/readme-toc.ts` (ToC
  `href`s), so the two are equal by construction. Declared+pinned per Constitution VI if
  not already importable.
- ~~Dispatcher shape~~ → **RESOLVED: explicit `TocDispatcher.astro` +
  `MobileTocDispatcher.astro`** registered as the override slots; each inspects
  `Astro.locals.starlightRoute.id` → `CommandsToc` for `tools/*/commands`, `ReadmeToc` for
  `tools/*/readme`, else `<Default/>`. Commands behavior must be preserved unchanged.
- ~~Scroll-spy depth~~ → **RESOLVED: spy on BOTH H2 and H3** — the `IntersectionObserver`
  tracks both heading levels and highlights the specific H3 in view (and its parent H2).

## Clarifications

### Session 2026-06-04

| # | Question | Answer |
|---|----------|--------|
| 9 | Slug mechanism — shared helper vs. rehype-slug plugin? | **Shared `github-slugger` helper** consumed by both the renderer and the ToC builder (one source of truth; rendered `id` == ToC `href` by construction) |
| 10 | Dispatch shape — explicit dispatcher vs. fall-through chaining? | **Explicit `TocDispatcher` + `MobileTocDispatcher`** registered as the override; each inspects the route id → CommandsToc / ReadmeToc / `<Default/>` |
| — | Scroll-spy depth — H2 only vs. H2 + H3? | **Both H2 and H3** — the observer tracks both levels; the rail highlights the specific H3 (and its parent H2) currently in view |

### Session 2026-06-04 (bulk confirm)

| # | Action | Detail |
|---|--------|--------|
| 4 | Confirmed | — |
| 5 | Confirmed | — |
| 6 | Confirmed | — |
| 7 | Confirmed | — |
| 8 | Confirmed | — |

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Use SEPARATE `ReadmeToc` + `ReadmeMobileToc` components, not an extension of the commands components | Discussed — user explicitly chose "Separate ReadmeToc components" over "Extend existing overrides" | S:98 R:70 A:90 D:95 |
| 2 | Certain | ToC depth is H2 + H3, nested | Discussed — user explicitly chose "H2 + H3 nested" over "H2 only"; also matches `tableOfContents` minHeadingLevel:2/maxHeadingLevel:3 | S:98 R:85 A:95 D:95 |
| 3 | Certain | Scope is the live site `sites/astro-starlight-terminal1` only | Constitution II/III (multi-site isolation, one live site); the README page + commands ToC both live there | S:95 R:80 A:98 D:95 |
| 4 | Certain | Heading anchor IDs are missing today and must be added before a ToC can link | Clarified — user confirmed; verified in `ReadmeSlice.astro:124` — `createMarkdownProcessor({})` has empty config, no rehype-slug; injected headings carry no `id` | S:95 R:55 A:90 D:80 |
| 5 | Certain | Source of truth is `content/<tool>/README.md`, read via the `help/`-marker repo-root ascent | Clarified — user confirmed; `ReadmeSlice` reads exactly this path with `findRepoRoot`; ToC must read the same file to stay in sync | S:95 R:75 A:92 D:90 |
| 6 | Certain | Wire via a route-dispatching override on the single `components.TableOfContents`/`MobileTableOfContents` slot | Clarified — user confirmed; `astro.config.mjs:71-74` has one slot each; dispatch serves 3 cases without regressing commands | S:95 R:65 A:88 D:82 |
| 7 | Certain | New `starlight-readme-toc` element added to the existing `terminal.css` ToC selector groups for terminal look + dark-mode parity | Clarified — user confirmed; `terminal.css:271-299` styles ToCs by custom-element selector; a parallel group gives parity for free (Constitution V) | S:95 R:80 A:90 D:88 |
| 8 | Certain | All work is build-time; PE-only client JS for scroll-spy/mobile toggle | Clarified — user confirmed; Constitution I; mirrors the existing commands ToC which is build-time list + PE scroll-spy | S:95 R:75 A:95 D:90 |
| 9 | Certain | Use a `github-slugger`-based SHARED slug helper consumed by both renderer and ToC builder | Clarified — user chose shared helper over the `rehype-slug` plugin; guarantees the ToC slug equals the rendered heading `id` (single source) | S:95 R:55 A:65 D:55 |
| 10 | Certain | Use an explicit `TocDispatcher` + `MobileTocDispatcher` (route id → CommandsToc / ReadmeToc / Default) | Clarified — user chose explicit dispatcher over fall-through chaining; central, traceable routing | S:95 R:65 A:70 D:55 |
| 11 | Certain | Scroll-spy highlights BOTH the active H2 and the active H3 child | Clarified — user chose "Both H2 and H3" over H2-only; observer tracks both levels for precise in-view feedback on deep slices | S:95 R:60 A:75 D:60 |

11 assumptions (11 certain, 0 confident, 0 tentative, 0 unresolved).
