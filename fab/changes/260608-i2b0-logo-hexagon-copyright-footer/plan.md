# Plan: Run-kit Hexagon Logo, Site-wide Copyright Footer, and Cloudflare Web Analytics

**Change**: 260608-i2b0-logo-hexagon-copyright-footer
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

> Scope is the LIVE site ONLY: `sites/astro-starlight-terminal1/` (Constitution II —
> multi-site isolation). No other site under `sites/` is touched.

### Header Logo: Run-kit Hexagon Swap

#### R1: Header logo is the run-kit hexagon, copied verbatim
The site header logo SHALL be the run-kit hexagon mark, copied byte-for-byte from
`~/code/sahil87/run-kit/assets/logo.svg` into `src/assets/logo.svg`, with its grayscale
fills, viewBox, and geometry unaltered (its grayscale palette is a deliberate dual-theme
design — Constitution V is satisfied as-is, NOT by `currentColor` or a CSS filter). The
copied file SHALL carry ONE provenance comment as the first child of the `<svg>`. Starlight's
`logo.src` SHALL point at the new asset with `replacesTitle: false` retained.

- **GIVEN** the live site header currently renders `prompt.svg` beside the "shll" wordmark
- **WHEN** the build runs after the swap
- **THEN** the header renders the hexagon `logo.svg` beside the wordmark (title NOT replaced)
- **AND** the copied SVG's fills/viewBox/geometry match the source verbatim plus one provenance comment

#### R2: The dead `prompt.svg` asset is removed
After the swap, `src/assets/prompt.svg` SHALL be deleted, but ONLY after confirming via grep
that no source file (config, components, content) references it. A stale README mention is
documentation, not a code reference, and does not block deletion.

- **GIVEN** `logo.src` no longer points at `prompt.svg`
- **WHEN** a grep over the site source confirms no remaining code reference to `prompt.svg`
- **THEN** `src/assets/prompt.svg` is deleted

### Footer: Site-wide Copyright

#### R3: Footer override preserves pagination AND appends copyright
A `src/components/Footer.astro` override SHALL render Starlight's built-in default Footer
(preserving prev/next pagination) and THEN append a "© Sahil Ahuja 2026" line. The override
SHALL be registered inside the EXISTING `components:` block in `astro.config.mjs` (alongside
the ToC dispatchers) — never as a second `components:` key. The exact `<Default />` props/slot
shape SHALL be verified against the installed `@astrojs/starlight` version. The copyright line
SHALL be styled with existing `terminal.css` theme variables (e.g. `var(--c-fg-dim)`, small
font) — no hardcoded color — so it reads correctly in both light and dark mode (Constitution V).

- **GIVEN** Starlight's default footer (which carries prev/next pagination) is replaced by an override
- **WHEN** any page renders, including a tool page (e.g. `/tools/wt/overview`)
- **THEN** prev/next pagination still renders AND "© Sahil Ahuja 2026" renders below it
- **AND** the copyright color comes from a theme-aware CSS variable, working in both themes

### Analytics: Cloudflare Web Analytics Beacon

#### R4: Cloudflare beacon is emitted site-wide with the exact attributes
The Cloudflare Web Analytics beacon SHALL be emitted site-wide in every page's `<head>`,
preferentially via Starlight's `head:` config array, carrying `defer`, `src`
(`https://static.cloudflareinsights.com/beacon.min.js`), and the literal `data-cf-beacon`
attribute `{"token": "11bda8377391420f9138b4cf3128dc6e"}`. The token is NOT a secret and SHALL
be hardcoded (no env var). No cookie-consent gate SHALL be added (Cloudflare Web Analytics is
cookieless). This is a deliberate, user-approved exception to Constitution I (recorded in the
intake's constitution checkpoint).

- **GIVEN** the site has no analytics today
- **WHEN** the build runs and rendered `dist/` HTML is inspected
- **THEN** every page's `<head>` contains the beacon `<script>` with `defer`, the exact `src`,
  and the exact un-escaped/un-dropped `data-cf-beacon` JSON token

#### R5: Beacon rendering is verified; fall back to a Head override only if `head:` is wrong
After building, the rendered `dist/` HTML SHALL be verified to contain the beacon with the
exact `data-cf-beacon` JSON, `defer`, and `src`. IF (and only if) Starlight's `head:` array
drops or HTML-escapes the attribute, the implementation SHALL fall back to a `Head.astro`
component override (render `<Default />`, then append the literal `<script>` tag), registered
in the same `components:` block. The `head:` path is preferred.

- **GIVEN** the beacon is wired via the `head:` array
- **WHEN** the built HTML is grepped for the beacon
- **THEN** if the attribute is present verbatim, the `head:` path stands; otherwise a `Head.astro`
  override is added and the build re-verified

### Design Decisions

1. **Logo copied verbatim, not re-themed**: use the run-kit grayscale SVG as-is — *Why*: its
   palette is a deliberate dual-theme design satisfying Constitution V by palette, not mechanism
   — *Rejected*: rewriting fills to `currentColor` or wrapping it (would discard the intentional
   3D shading that makes the hexagonal cube read as a cube).
2. **Footer override renders `<Default />`**: the override REPLACES Starlight's default footer,
   which carries prev/next pagination — *Why*: rendering the built-in default then appending the
   copyright is the only safe way to add footer chrome without losing pagination — *Rejected*:
   a bare copyright-only footer (would silently drop pagination site-wide).
3. **Beacon via `head:` array, Head.astro fallback**: prefer the declarative config path —
   *Why*: no new component file, matches Starlight's documented head-injection API — *Rejected*:
   always using a Head.astro override (heavier; only needed if `head:` mangles the `data-*` attr).

### Non-Goals

- Other analytics vendors (PostHog / GA / etc.) — Cloudflare Web Analytics ONLY.
- The favicon (`public/favicon.svg`, `favicon.ico`, `og-image.png`) — this is the HEADER logo only.
- Any other site under `sites/` (`astro-tailwind-terminal1`, `_playground`) — Constitution II.
- A cookie-consent banner — Cloudflare Web Analytics is cookieless.

## Tasks

### Phase 1: Setup

- [x] T001 Run install in `sites/astro-starlight-terminal1/` — a `pnpm-lock.yaml` is the active lockfile (npm would create a conflicting `package-lock.json` and ignore pinned versions), so used `pnpm install --frozen-lockfile`. Installed `@astrojs/starlight 0.39.2`; Node v24.15 satisfies `>=22.12` <!-- R3 -->

### Phase 2: Core Implementation

- [x] T002 [P] Copy `~/code/sahil87/run-kit/assets/logo.svg` verbatim to `sites/astro-starlight-terminal1/src/assets/logo.svg`, inserting ONLY the one provenance comment as the first child of `<svg>`; do not alter fills/viewBox/geometry — diff confirms byte-identical geometry/fills/viewBox <!-- R1 -->
- [x] T003 In `sites/astro-starlight-terminal1/astro.config.mjs`, change `logo.src` from `./src/assets/prompt.svg` to `./src/assets/logo.svg`, keeping `replacesTitle: false` <!-- R1 -->
- [x] T004 Verified installed `@astrojs/starlight 0.39.2` default `Footer.astro` takes NO props and renders NO `<slot />` (self-renders EditLink/LastUpdated/Pagination from virtual modules); created `src/components/Footer.astro` rendering a bare `<Default />` (version-correct — no `{...Astro.props}`/slot) then appending a `© Sahil Ahuja 2026` line styled with `var(--c-fg-dim)` + `var(--sl-text-xs)` (no hardcoded color) <!-- R3 -->
- [x] T005 Registered `Footer: './src/components/Footer.astro'` INSIDE the existing `components:` block in `astro.config.mjs` (alongside `TableOfContents` / `MobileTableOfContents`); no second `components:` key <!-- R3 -->
- [x] T006 Wired the Cloudflare beacon — initially via the `head:` array (preferred path); T009 found Astro HTML-escapes the `data-cf-beacon` JSON quotes to `&quot;` there, so the array entry was REMOVED and the beacon moved to the `Head.astro` override (see T009) to ship the literal un-escaped tag <!-- R4 -->

### Phase 3: Integration & Edge Cases

- [x] T007 Grepped the site source for `prompt.svg` — only a stale `README.md` file-tree mention remained (documentation prose, not a code reference); no config/component/content reference. Deleted `src/assets/prompt.svg` <!-- R2 -->
- [x] T008 Built the live site (`pnpm run build`) — succeeded, 43 pages, no errors (first attempt) <!-- R4 -->
- [x] T009 Verified `dist/` HTML: the `head:` array rendered the beacon site-wide but HTML-ESCAPED `data-cf-beacon` (`&quot;`). Per the explicit fallback trigger, switched to a `Head.astro` override (renders `<Default />`, appends the literal `<script>` via `<Fragment set:html>`), registered in the same `components:` block; rebuilt — beacon now literal/un-escaped, exactly once per page, 43/43 content pages, zero escaped copies <!-- R5 -->

### Phase 4: Polish

- [x] T010 Grepped built `dist/` HTML — all four facts confirmed: (1) literal beacon with exact token on 43/43 content pages, (2) `© Sahil Ahuja 2026` on all 43, (3) prev/next pagination (`rel="prev"`/`rel="next"`) still renders on `dist/tools/wt/overview/index.html` alongside the copyright, (4) header `<img>` references the processed hexagon `/_astro/logo.*.svg` (64×64); zero `prompt.svg` references remain <!-- R3 R4 -->

## Execution Order

- T001 blocks everything that needs node_modules (T004 API check, T008 build).
- T002 → T003 (asset must exist before config points at it); both [P]-independent of the footer/beacon edits.
- T004 → T005 (component must exist before registration).
- T006 is an independent edit to the same config file as T003/T005 (apply sequentially to avoid clobbering).
- T007 (delete prompt.svg) after T003 (config no longer references it).
- T008 (build) after all source edits (T002–T007).
- T009 verifies/conditionally-reworks the beacon after the build; T010 is the final verification sweep.

## Acceptance

### Functional Completeness

- [x] A-001 R1: `src/assets/logo.svg` is the run-kit hexagon copied verbatim (fills/viewBox/geometry match source) plus exactly one provenance comment as the first SVG child; `astro.config.mjs` `logo.src` points at it with `replacesTitle: false`
- [x] A-002 R2: `src/assets/prompt.svg` is deleted and no source code references it
- [x] A-003 R3: `src/components/Footer.astro` exists, renders the built-in default Footer, appends `© Sahil Ahuja 2026`, and is registered in the single existing `components:` block
- [x] A-004 R4: the Cloudflare beacon is wired via `head:` (or the Head.astro fallback) with the exact `defer`, `src`, and `data-cf-beacon` token

### Behavioral Correctness

- [x] A-005 R3: built tool page (`dist/tools/wt/overview/index.html`) still renders prev/next pagination AND the copyright line
- [x] A-006 R4: built `dist/` HTML contains the beacon `<script>` with the exact un-escaped `data-cf-beacon` JSON, `defer`, and `src` — site-wide
- [x] A-007 R5: the beacon rendering was verified in `dist/`; the `head:` path was kept (or the Head.astro fallback applied) based on the actual rendered HTML

### Scenario Coverage

- [x] A-008 R1: the header references the hexagon logo svg (the built HTML/asset pipeline emits the logo, not `prompt.svg`)
- [x] A-009 R3: the copyright color is sourced from a theme-aware CSS variable (no hardcoded hex), satisfying dark-mode parity (Constitution V)

### Edge Cases & Error Handling

- [x] A-010 R3: the override does NOT discard `<Default />` — pagination is not silently dropped on any page

### Code Quality

- [x] A-011 Pattern consistency: `Footer.astro` follows the existing override pattern (`import Default from '@astrojs/starlight/components/<Name>.astro'`) used by `TocDispatcher.astro`
- [x] A-012 No unnecessary duplication: no new npm/build dependency added (Constitution VI); the beacon is an external `<script>` only

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`

## Deletion Candidates

- `sites/astro-starlight-terminal1/src/assets/prompt.svg` — already deleted by this change (T007); the dead logo asset, now unreferenced after the `logo.src` swap. No further action.
- `sites/astro-starlight-terminal1/README.md:37` — stale file-tree prose still lists `prompt.svg` ("site logo (caret > prompt)"); the asset no longer exists. Doc-prose only, not shipped site content — update or drop the line during hydrate.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Scope is the live site only (`sites/astro-starlight-terminal1/`); no other site touched | Constitution II + explicit intake out-of-scope | S:98 R:95 A:98 D:98 |
| 2 | Certain | Copy run-kit `logo.svg` verbatim (no `currentColor`/wrap/filter); keep `replacesTitle: false` | Intake-specified; grayscale is a deliberate dual-theme design (Constitution V as-is) | S:98 R:85 A:95 D:95 |
| 3 | Certain | Footer override renders `<Default />` then appends `© Sahil Ahuja 2026`; registered in the existing `components:` block | Intake-specified as CRITICAL; `pagination: true` verified in config | S:98 R:85 A:95 D:95 |
| 4 | Certain | Cloudflare token `11bda8377391420f9138b4cf3128dc6e` is hardcoded, not env-routed; no consent banner | Factual: token ships in public HTML; Cloudflare WA is cookieless | S:95 R:90 A:95 D:95 |
| 5 | Confident | Style the copyright with `terminal.css` variables (`var(--c-fg-dim)`, small font), no hardcoded color | Follows existing styling pattern; satisfies Constitution V without new mechanism | S:80 R:88 A:88 D:82 |
| 6 | Confident | Exact `<Default />` Footer props/slot shape resolved at apply against the installed `@astrojs/starlight` (matching the `TocDispatcher` override pattern) | Documented override pattern with an obvious default; verification-time, not a human decision | S:78 R:85 A:85 D:80 |
| 7 | Confident | Beacon via `head:` array; Head.astro override fallback only if `head:` drops/escapes `data-cf-beacon`+`defer` | Obvious default with a clean, local, reversible fallback resolved against rendered HTML | S:80 R:88 A:85 D:82 |
| 8 | Confident | A stale README mention of `prompt.svg` (documentation, not a code reference) does not block deleting the asset | grep distinguishes code references from prose; the README line is a doc artifact, addressable at hydrate | S:75 R:85 A:82 D:80 |

8 assumptions (4 certain, 4 confident, 0 tentative, 0 unresolved).
