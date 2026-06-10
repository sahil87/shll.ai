# Intake: Run-kit Hexagon Logo, Site-wide Copyright Footer, and Cloudflare Web Analytics

**Change**: 260608-i2b0-logo-hexagon-copyright-footer
**Created**: 2026-06-08
**Status**: Draft

## Origin

> Synthesized from a discussion session (one-shot dispatch via `/fab-new`). All design
> decisions were made during that discussion and are NOT to be re-litigated here.
>
> Raw intent: "Add the run-kit hexagon logo, a site-wide copyright footer, and Cloudflare Web
> Analytics to the live site." Three small, user-visible additions to the LIVE site only
> (`sites/astro-starlight-terminal1/`):
> 1. Swap the header logo from the terminal-prompt chevron (`prompt.svg`) to the run-kit
>    hexagon logo (`~/code/sahil87/run-kit/assets/logo.svg`), copied verbatim, beside the
>    "shll" wordmark (`replacesTitle: false` retained).
> 2. Add a "© Sahil Ahuja 2026" copyright line site-wide via a Starlight `Footer` component
>    override that renders the built-in default footer and APPENDS the copyright (does not
>    discard pagination).
> 3. Add the Cloudflare Web Analytics beacon site-wide via Starlight's `head:` config option
>    (a deliberate, user-approved exception to Constitution I — see the constitution
>    checkpoint below). Analytics was previously planned as a separate change; the user has
>    explicitly decided to bundle it into THIS change.

## Why

1. **Problem.** The live site's header logo is a generic terminal-prompt chevron
   (`prompt.svg`) that carries no brand identity tied to the toolkit. The site also has NO
   footer copyright line at all — Starlight ships only its default prev/next pagination
   footer. Both are small gaps in the site's polish and brand coherence.
2. **Consequence if unfixed.** The front door to shll.ai keeps a placeholder-grade glyph
   instead of the toolkit's actual hexagon mark, and the site presents no ownership/copyright
   attribution. Neither is catastrophic, but both are cheap, high-visibility wins that make
   the live site feel finished.
3. **Why this approach.**
   - **Logo:** copy the canonical run-kit asset AS-IS rather than redraw it. The run-kit
     logo's grayscale palette (`#b4b4b4 … #2a2a2a`) was a DELIBERATE design choice so it reads
     correctly in BOTH light and dark mode — it therefore satisfies Constitution V (Dark Mode
     Parity) verbatim. Rewriting its fills to `currentColor` or wrapping it would be wrong: it
     would discard the intentional 3D shading that makes the hexagonal cube read as a cube.
   - **Footer:** Starlight has no custom-footer hook other than overriding the `Footer`
     component. The override REPLACES the default footer (which includes prev/next
     pagination), so the override MUST render the built-in `<Default />` from its props and
     append the copyright line — never discard the default. This is the single safe way to add
     footer chrome without losing pagination.

## What Changes

Scope is the LIVE site ONLY: `sites/astro-starlight-terminal1/`. No other site under
`sites/` is touched (Constitution II — multi-site isolation).

### 1. Logo swap (header logo, NOT favicon)

**Copy the run-kit hexagon logo into the site verbatim.** Source asset:
`~/code/sahil87/run-kit/assets/logo.svg` — a 3D flat-top hexagonal cube drawn with
hardcoded mid-gray hex fills. Verified current contents of the source:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="7 10 50 44" width="64" height="64">
  <!-- Logo — flat-top hexagon, no transform, pre-computed coordinates -->

  <!-- Border segments — wide contrast range -->
  <polygon points="44,11.2 56,32 47.5,32 39.5,17.2" fill="#b4b4b4"/>
  <polygon points="56,32 44,52.8 39.5,46.8 47.5,32" fill="#b4b4b4"/>
  <polygon points="44,52.8 20,52.8 24.5,46.8 39.5,46.8" fill="#2a2a2a"/>
  <polygon points="20,52.8 8,32 16.5,32 24.5,46.8" fill="#2a2a2a"/>
  <polygon points="8,32 20,11.2 24.5,17.2 16.5,32" fill="#2a2a2a"/>
  <polygon points="20,11.2 44,11.2 39.5,17.2 24.5,17.2" fill="#b4b4b4"/>

  <!-- Inner cube faces — contrasts with adjacent border segments -->
  <polygon points="24.5,17.2 39.5,17.2 47.5,32 32,32" fill="#888888"/>
  <polygon points="47.5,32 39.5,46.8 24.5,46.8 32,32" fill="#737373"/>
  <polygon points="24.5,46.8 16.5,32 24.5,17.2 32,32" fill="#545454"/>
</svg>
```

Steps:
1. Copy the source SVG verbatim to `sites/astro-starlight-terminal1/src/assets/logo.svg`.
   Do NOT modify the fills, the viewBox, or the geometry.
2. Add ONE provenance comment line to the copied SVG noting it is mirrored from
   `run-kit/assets/logo.svg` — there is NO asset-sync pipeline, so this guards against silent
   drift confusion later. Suggested form (insert as the first child comment, before the
   existing `<!-- Logo — flat-top hexagon … -->` comment):
   `<!-- Mirrored verbatim from sahil87/run-kit assets/logo.svg — no auto-sync pipeline; update by hand if the source changes. -->`
3. Point Starlight's logo at the new asset in
   `sites/astro-starlight-terminal1/astro.config.mjs`. The current line (verified, ~line 60):
   ```js
   logo: { src: './src/assets/prompt.svg', replacesTitle: false },
   ```
   changes to:
   ```js
   logo: { src: './src/assets/logo.svg', replacesTitle: false },
   ```
   KEEP `replacesTitle: false` — the hexagon sits BESIDE the "shll" wordmark; it does not
   replace the title text.
4. The old `src/assets/prompt.svg` is no longer referenced after the swap. Remove it (it is
   dead once `logo.src` no longer points at it) — confirm via grep that nothing else in the
   site references `prompt.svg` before deleting.

**Design note resolving the obvious objection.** The run-kit logo's grayscale palette is a
DELIBERATE dual-theme design. Do NOT rewrite its fills to `currentColor`, do NOT wrap it,
do NOT add a CSS `filter`/theme toggle. Use it verbatim. This is the intended satisfaction of
Constitution V — parity by palette, not by mechanism.

### 2. Site-wide copyright footer

Starlight has NO custom footer today. Add a "© Sahil Ahuja 2026" copyright line site-wide via
a Starlight `Footer` component override.

1. Create `sites/astro-starlight-terminal1/src/components/Footer.astro`. It MUST render
   Starlight's built-in default footer and THEN append the copyright line. Starlight exposes
   the default component to overrides via the `Default` named export of the route's component
   props. Canonical pattern:
   ```astro
   ---
   import Default from '@astrojs/starlight/components/Footer.astro';
   ---
   <Default><slot /></Default>
   <div class="copyright">© Sahil Ahuja 2026</div>
   ```
   <!-- assumed: exact import path/props shape for the default Footer — Starlight's documented
        component-override pattern is `import Default from '@astrojs/starlight/components/<Name>.astro'`;
        apply-stage agent SHALL verify against the installed @astrojs/starlight version and
        adjust if the API differs (e.g. props-based `<Default {...Astro.props} />`). -->
   - CRITICAL: the override REPLACES the default footer, which includes prev/next pagination.
     Rendering `<Default />` preserves pagination; appending the copyright adds the new line.
     Do NOT discard `<Default />`.
   - Style the copyright line to match the site's terminal theme using the existing CSS
     variables from `src/styles/terminal.css` (e.g. muted foreground `var(--c-fg-dim)`, small
     font). It MUST render correctly in both light and dark mode (Constitution V) — using the
     theme-aware CSS variables satisfies this for free; do not hardcode a color.
2. Register the override in `sites/astro-starlight-terminal1/astro.config.mjs`. There is
   already a `components:` block (currently `TableOfContents` and `MobileTableOfContents`
   route-dispatching overrides). ADD `Footer` to that existing block — do not create a second
   `components:` key:
   ```js
   components: {
     TableOfContents: './src/components/TocDispatcher.astro',
     MobileTableOfContents: './src/components/MobileTocDispatcher.astro',
     Footer: './src/components/Footer.astro',
   },
   ```
3. Verify (build + visual): the copyright renders site-wide AND prev/next pagination still
   renders on tool pages (e.g. `/tools/wt/overview`). Pagination is enabled site-wide
   (`pagination: true` in the config).

### 3. Cloudflare Web Analytics beacon (site-wide)

Add the Cloudflare Web Analytics beacon to the LIVE site only
(`sites/astro-starlight-terminal1/`), site-wide. This is a **deliberate, user-approved
exception to Constitution I** (Static-First, Zero Runtime) — see the constitution checkpoint
in the Impact / Risk section below. The site remains fully static; the beacon is purely
additive, `defer`red, and affects analytics only — never primary-content rendering.

The EXACT snippet to reproduce (copy verbatim):

```html
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "11bda8377391420f9138b4cf3128dc6e"}'></script>
```

Mechanism — apply-stage decision (obvious default, reversible):

1. **Prefer Starlight's `head:` config option** in
   `sites/astro-starlight-terminal1/astro.config.mjs` — a `head: [{ tag: 'script', attrs: {
   ... }, ... }]` entry that emits the beacon site-wide. The `attrs` map must carry the
   arbitrary `data-cf-beacon` attribute, the `defer` boolean, and the `src`. Use this path IF
   `head:` can express the arbitrary `data-*` attribute and `defer` cleanly.
   ```js
   head: [
     {
       tag: 'script',
       attrs: {
         defer: true,
         src: 'https://static.cloudflareinsights.com/beacon.min.js',
         'data-cf-beacon': '{"token": "11bda8377391420f9138b4cf3128dc6e"}',
       },
     },
   ],
   ```
   <!-- assumed: Starlight's `head:` array forwards arbitrary `data-*` attrs and `defer`
        verbatim into the rendered <head>. This is the documented Starlight head-injection
        API; apply-stage agent SHALL verify the rendered HTML contains the beacon with the
        exact `data-cf-beacon` JSON and `defer`, and fall back to the Head override (below)
        if attrs are dropped or escaped. -->
2. **Else, fall back to a `Head.astro` component override** at
   `sites/astro-starlight-terminal1/src/components/Head.astro` (registered in the existing
   `components:` block, same pattern as the `Footer` override) that renders Starlight's
   `<Default />` head and then appends the literal `<script>` tag above. Use this path ONLY if
   the `head:` array cannot emit the `data-cf-beacon` attribute and `defer` cleanly. The
   apply agent SHALL prefer the `head:` array and only reach for the Head override if needed.
3. **Token is NOT a secret.** `11bda8377391420f9138b4cf3128dc6e` is a Cloudflare Web Analytics
   site token that ships in the public HTML of every page — it is not a credential. Hardcode
   it directly in the config; do NOT route it through an env var, `import.meta.env`, or a
   GitHub Actions secret. There is no secret to protect.
4. **Cookieless — no consent gate.** Cloudflare Web Analytics is cookieless and stores no
   personal data client-side, so NO cookie-consent banner / consent gate is required. Do not
   add one.
5. Verify (build + rendered HTML): `npm run build` succeeds and the built pages' `<head>`
   contains the beacon `<script>` with the exact `src`, `defer`, and `data-cf-beacon` JSON
   token, site-wide.

### Out of scope (explicit)

- **Only Cloudflare Web Analytics.** PostHog / GA / any other analytics or product-telemetry
  vendor remain out of scope — this change ships the Cloudflare Web Analytics beacon ONLY.
- **Do NOT touch the favicon** — `public/favicon.svg`, `favicon.ico`, `og-image.png` are
  untouched. This is the HEADER logo only, not the browser-tab icon.
- **Do NOT touch any other site** under `sites/` (`astro-tailwind-terminal1`, `_playground`).
  Constitution II — multi-site isolation.

## Affected Memory

This is primarily a static-asset + Starlight-config change. No memory file is strictly
required to change. The one candidate documents site chrome / component-override patterns and
may warrant a light touch during hydrate — it is the home for the single-override-slot
dispatcher pattern and tool-page chrome:

- `conventions/tool-page-rubric`: (modify) OPTIONAL light touch — this file documents site
  chrome and the Starlight component-override pattern (currently the ToC dispatcher slots).
  The new `Footer` override and the header `logo.src` swap are sibling chrome facts; a 1–2
  line note may be warranted during hydrate. Not strictly required — the change is
  config + static asset, with no spec-level behavior change to the documented tool-page shape.

Build-deploy (`build-deploy/deployment`) is UNAFFECTED — no change to the static-output
contract, the deploy workflow, or `SITE_DIR`.

## Impact

- **Files added:** `sites/astro-starlight-terminal1/src/assets/logo.svg` (copied verbatim +
  1 provenance comment); `sites/astro-starlight-terminal1/src/components/Footer.astro` (new
  override); IF the Head-override fallback path is taken,
  `sites/astro-starlight-terminal1/src/components/Head.astro` (else the beacon lives in the
  `head:` config array and no new file is added).
- **Files modified:** `sites/astro-starlight-terminal1/astro.config.mjs` (logo.src swap;
  `Footer` added to existing `components:` block; Cloudflare beacon added via `head:` array,
  or `Head` added to the `components:` block on the fallback path).
- **Files removed:** `sites/astro-starlight-terminal1/src/assets/prompt.svg` (dead after the
  logo swap; remove only after confirming no other references).
- **Dependencies:** none added (Constitution VI satisfied). The `Footer` override imports the
  already-installed `@astrojs/starlight` default Footer component. The Cloudflare beacon is an
  **external `<script>` tag only** — it adds NO npm/build dependency, no lockfile change, no
  bundled code; Constitution VI is respected.
- **Runtime:** the logo and footer changes are build-time/static (Constitution I). The
  Cloudflare beacon is **client-side runtime JS** and is a DELIBERATE, user-approved exception
  to Constitution I — see the constitution checkpoint below.
- **Multi-site:** isolated to the live site (Constitution II).
- **Verification surface:** `npm run build` succeeds in the live site; header shows the
  hexagon beside the "shll" wordmark; copyright renders site-wide; prev/next pagination still
  renders on tool pages; both render correctly in light AND dark mode; the built `<head>`
  contains the Cloudflare beacon `<script>` (exact `src`, `defer`, `data-cf-beacon` token)
  site-wide.

### Constitution checkpoint — Constitution I exception (Cloudflare beacon)

This is called out explicitly because it is the whole reason the user is comfortable bundling
analytics into this change: the exception rationale is visible in the change record.

- **(a) It is client-side runtime JS.** The Cloudflare Web Analytics beacon
  (`beacon.min.js`) executes in the visitor's browser. That is, on its face, exactly what
  Constitution I (Static-First, Zero Runtime — "no client-side data fetching for primary
  content / no runtime JS for primary content") restricts.
- **(b) It is a deliberate, user-approved exception.** Web analytics inherently requires a
  client beacon — there is no static/build-time way to measure real-visitor traffic. The
  user has explicitly approved this exception and explicitly chose to bundle it into this
  change (reversing the earlier "separate change" plan) precisely so the rationale is on the
  record.
- **(c) It is scoped to analytics only and does not affect primary content.** The site
  remains fully static; the beacon is purely additive and `defer`red, so it never blocks or
  alters primary-content rendering. No primary content is fetched at runtime — Constitution
  I's core intent (the site works as static output on GitHub Pages) is preserved.
- **(d) Constitution VI (Minimal Dependencies) is respected.** This adds NO npm/build
  dependency — just an external `<script>` tag. There is no new package, lockfile entry, or
  bundled code.

## Open Questions

<!-- None blocking. Inputs were clear and well-specified (SRAD autonomy). The minor
     verification-time items — (1) exact Starlight default-Footer override API for the
     installed version, and (2) whether Starlight's `head:` array forwards the arbitrary
     `data-cf-beacon` attr + `defer` cleanly (else the Head-override fallback) — are
     Confident/Certain assumptions with obvious defaults, resolved by the apply-stage agent
     against the installed package and the rendered HTML, not human decisions. The
     Constitution I exception for the beacon is a user-approved decision, not an open
     question. -->

(none — all decisions were made in the originating discussion)

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Scope is the live site only (`sites/astro-starlight-terminal1/`); no other site touched | Constitution II (multi-site isolation) + explicit out-of-scope in the discussion | S:98 R:95 A:98 D:98 |
| 2 | Certain | Copy run-kit `logo.svg` verbatim; do NOT rewrite fills to currentColor or wrap it | Discussed — grayscale palette is a deliberate dual-theme design (Constitution V satisfied as-is); source verified | S:98 R:80 A:95 D:95 |
| 3 | Certain | Keep `replacesTitle: false` — hexagon sits beside the "shll" wordmark | Explicitly specified; current config verified (line ~60) | S:98 R:95 A:98 D:98 |
| 4 | Certain | Copy target is `src/assets/logo.svg`; swap `logo.src` to it in `astro.config.mjs` | Explicitly specified; current `logo.src` verified as `./src/assets/prompt.svg` | S:95 R:90 A:95 D:90 |
| 5 | Certain | Footer override MUST render Starlight's `<Default />` and APPEND copyright (preserve pagination) | Explicitly specified as CRITICAL; `pagination: true` verified in config | S:98 R:85 A:95 D:95 |
| 6 | Certain | Copyright text is exactly "© Sahil Ahuja 2026" | Verbatim from the discussion | S:98 R:98 A:95 D:98 |
| 7 | Certain | Register Footer in the EXISTING `components:` block (alongside the ToC dispatchers) | Existing `components:` block verified in config; avoids a duplicate key | S:95 R:90 A:95 D:90 |
| 8 | Certain | Add a one-line provenance comment to the copied SVG (no auto-sync pipeline) | Explicitly specified to guard against silent drift | S:95 R:98 A:95 D:90 |
| 9 | Certain | Ship Cloudflare Web Analytics ONLY (no PostHog/GA/other vendor); NO favicon change | User explicitly bundled Cloudflare analytics into this change; other vendors and the favicon remain out of scope | S:98 R:90 A:98 D:98 |
| 10 | Confident | Remove the now-dead `src/assets/prompt.svg` after the swap (post grep-confirm) | Asset is unreferenced once `logo.src` moves; small, reversible cleanup. Verify no other references first | S:80 R:85 A:85 D:80 |
| 11 | Confident | Style the copyright with existing terminal.css theme variables (e.g. `--c-fg-dim`); no hardcoded color | Follows existing project styling pattern; satisfies Constitution V (dark-mode parity) without new mechanism | S:75 R:85 A:85 D:80 |
| 12 | Confident | `tool-page-rubric` memory gets an optional light touch during hydrate; no memory file strictly required | Change is config + static asset with no spec-level behavior change; rubric is the chrome/override home | S:70 R:90 A:80 D:75 |
| 13 | Confident | Exact default-Footer override API resolved at apply against the installed `@astrojs/starlight` | Starlight's documented override pattern has an obvious default (`import Default from '@astrojs/starlight/components/Footer.astro'`); verification-time, not a human decision | S:70 R:85 A:80 D:75 |
| 14 | Confident | Inject the beacon via Starlight's `head:` config array; fall back to a `Head.astro` override only if `head:` can't carry the `data-cf-beacon` attr + `defer` | Obvious default with a clean fallback; both are local, reversible config/component edits resolved at apply against the rendered HTML | S:78 R:88 A:82 D:80 |
| 15 | Certain | Cloudflare site token `11bda8377391420f9138b4cf3128dc6e` is NOT a secret — hardcode it in config, no env var / GitHub secret | Factual: the token ships in public page HTML by design; there is no credential to protect | S:95 R:90 A:95 D:95 |
| 16 | Confident | The beacon is a deliberate, user-approved exception to Constitution I (client-side runtime JS), scoped to analytics only; Constitution VI respected (no new dep) | User explicitly approved bundling analytics and the exception; analytics inherently needs a client beacon; site stays static, beacon is additive + `defer`red, external script only (no npm dep) | S:85 R:85 A:88 D:85 |
| 17 | Certain | Cloudflare Web Analytics is cookieless — no consent banner / cookie-consent gate required | Factual property of Cloudflare Web Analytics; no personal data stored client-side | S:95 R:92 A:95 D:95 |

17 assumptions (11 certain, 6 confident, 0 tentative, 0 unresolved).
