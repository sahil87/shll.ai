# Plan: SEO & Sharing Fixes

**Change**: 260610-kb1r-seo-sharing-fixes
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

All requirements scope to the live site, `sites/astro-starlight-terminal1/`. Verified live-site baseline (intake Origin, 2026-06-10): Starlight already emits canonical URL, sitemap, per-page `<title>`/description, `og:title`, `og:type=article`, `og:url`, `og:locale`, `og:description`, `og:site_name`, and `twitter:card=summary_large_image` — but **no** `og:image`/`twitter:image` anywhere; `public/og-image.png` is an orphaned 512×512 asset; the homepage `<title>` is literally `shll | shll`.

### SEO: Social-share image meta (site-wide)

#### R1: Site-wide og:image / twitter:image tags
The existing site-wide `Head.astro` override (`src/components/Head.astro`, registered via `components.Head` in `astro.config.mjs`) MUST append, after `<Default />`, the following meta tags on every page:

```html
<meta property="og:image" content="https://shll.ai/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="shll — seven small CLIs that force AI agents to plan before they code" />
<meta name="twitter:image" content="https://shll.ai/og-image.png" />
```

The image URL MUST be absolute (OG scrapers do not resolve relative URLs) and SHOULD be derived from `Astro.site` (fixed at `https://shll.ai` in `astro.config.mjs`) rather than hardcoded. Appending cannot double-emit — Starlight emits no `og:image`/`twitter:image` of its own.

- **GIVEN** a production build of any page (homepage or docs page)
- **WHEN** the built HTML `<head>` is inspected
- **THEN** it contains exactly one `og:image` meta with absolute content `https://shll.ai/og-image.png`, plus `og:image:width=1200`, `og:image:height=630`, `og:image:alt`, and `twitter:image` with the same absolute URL

#### R2: og-image.png regenerated at 1200×630, terminal aesthetic
`public/og-image.png` MUST be replaced with a **1200×630** PNG in the site's terminal aesthetic: dark terminal window (titlebar dots, dark surface matching the homepage `terminal-window` chrome / `terminal.css` dark palette), a `$` prompt, the site name `shll`, and the tagline "Seven small CLIs that force AI agents to plan before they code". Text MUST be legible at ~one-quarter scale (Slack/X preview sizes). The image is a **committed static asset**; its generation method MUST NOT be wired into the `package.json` build and MUST NOT add runtime or build dependencies (Constitution VI). A generation script MAY live under `scripts/` for reproducibility. The OG card itself is theme-independent (a fixed dark card), so Constitution V parity is not implicated by the asset.

- **GIVEN** the repository after this change
- **WHEN** `file public/og-image.png` is run
- **THEN** it reports a PNG with dimensions exactly 1200 x 630
- **AND** `package.json` contains no reference to the generation script and no new dependencies

### SEO: Homepage overrides

#### R3: Homepage title carries keywords
The homepage `<title>` and `og:title` SHALL become exactly **`shll — the AI coding toolkit`** (no ` | shll` suffix), via Starlight per-page frontmatter `head:` entries in `src/content/docs/index.mdx` (a `title` tag entry + an `og:title` meta entry — Starlight head-merging gives user entries priority and dedupes the singleton `<title>` and same-`property` metas). The visible hero H1 is unaffected (the splash hero renders from the `hero:` block). All other pages keep their existing `{page} | shll` titles.

- **GIVEN** a production build
- **WHEN** `dist/index.html` is inspected
- **THEN** it contains exactly one `<title>` element whose text is `shll — the AI coding toolkit` and an `og:title` meta with the same content, and `shll | shll` appears nowhere
- **GIVEN** the same build
- **WHEN** a non-homepage page (e.g. `dist/getting-started/install/index.html`) is inspected
- **THEN** its `<title>` still carries the ` | shll` suffix

#### R4: og:type=website on the homepage only
The homepage MUST emit `og:type=website` via the same frontmatter `head:` block on `index.mdx` (Starlight dedupes by `property`). All other pages MUST keep Starlight's default `og:type=article`.

- **GIVEN** a production build
- **WHEN** `dist/index.html` is inspected
- **THEN** it contains exactly one `og:type` meta with content `website`
- **GIVEN** the same build
- **WHEN** `dist/getting-started/install/index.html` is inspected
- **THEN** its `og:type` meta content is `article`

#### R5: JSON-LD structured data (homepage only, droppable)
The homepage (and only the homepage) SHOULD carry one `<script type="application/ld+json">` block with two entities: `WebSite` (name `shll`, url `https://shll.ai`) and `SoftwareApplication` (name `shll toolkit`, `applicationCategory: DeveloperApplication`, `operatingSystem: "macOS, Linux"`, offers price `0`, url `https://github.com/sahil87`). JSON-LD is inert data, not executable JS — no Constitution I conflict, no dependencies. This is the lowest-priority item: it MAY be dropped on implementation friction (e.g. MDX escaping pain), in which case the drop is recorded in `## Assumptions` and the plan adjusted (tasks revised, not left unchecked).

- **GIVEN** a production build
- **WHEN** `dist/index.html` is inspected
- **THEN** it contains exactly one `application/ld+json` script whose body parses as valid JSON containing both `WebSite` and `SoftwareApplication` entities
- **AND** non-homepage pages contain no `application/ld+json` script

### Non-Goals

- Homepage content/prose expansion (newcomer context, tool grid, diagram prose) — split into a separate feat-type change.
- Any change to the variant site (`sites/astro-tailwind-terminal1/`) or `sites/_playground/`.
- `twitter:site` handle — none known to exist.
- Wiring image generation into the build pipeline — the OG card is a committed asset.

### Design Decisions

1. **JSON-LD lives in `Head.astro`, homepage-gated — not in `index.mdx` frontmatter**: emit the block after `<Default />` only when `Astro.url.pathname === '/'`, serializing a JS object via `JSON.stringify` into a `set:html` fragment. — *Why*: avoids the known MDX/YAML escaping friction entirely (the exact friction R5 names as a drop trigger), reuses the established `set:html` literal-emission pattern already documented for this file (memory: tool-page-rubric, change `i2b0`), and keeps the JSON authorable as a plain object. — *Rejected*: a frontmatter `head:` entry with a JSON string `content:` in `index.mdx` — a large JSON blob inside YAML frontmatter is fragile and unreadable.
2. **OG card produced by a one-off script + locally cached headless Chromium screenshot**: `scripts/generate-og-image.mjs` writes an HTML mock styled with the `terminal.css` dark palette and screenshots it at 1200×630 with the Playwright-cached `chrome-headless-shell` binary (no ImageMagick/rsvg/PIL on this machine). — *Why*: pixel-faithful to the real site aesthetic (same palette tokens, JetBrains Mono woff2 from the already-declared `@fontsource/jetbrains-mono` dependency), zero new dependencies, not wired into the build. — *Rejected*: SVG→PNG converters (not installed); adding `sharp`/`playwright` as devDependencies (Constitution VI).
3. **Absolute OG URL derived from `Astro.site`** (`new URL('/og-image.png', Astro.site)`) rather than hardcoding. — *Why*: single source of truth for the origin; intake allows either.

## Tasks

### Phase 1: Setup

- [x] T001 Run `pnpm install` in `sites/astro-starlight-terminal1/` (node_modules absent in this worktree; needed for the build and for the `@fontsource/jetbrains-mono` woff2 files the OG card uses) <!-- R2 -->

### Phase 2: Core Implementation

- [x] T002 [P] Create one-off generation script `sites/astro-starlight-terminal1/scripts/generate-og-image.mjs` (node stdlib only; NOT referenced from `package.json`; screenshots a self-contained HTML mock with the Playwright-cached headless Chromium) and regenerate `sites/astro-starlight-terminal1/public/og-image.png` at exactly 1200×630 — dark terminal window (titlebar dots, `$` prompt, `shll`, tagline), legible at quarter scale; verify dimensions with `file` <!-- R2 -->
- [x] T003 [P] In `sites/astro-starlight-terminal1/src/components/Head.astro`, append after `<Default />`: `og:image` (absolute, from `Astro.site`), `og:image:width=1200`, `og:image:height=630`, `og:image:alt`, `twitter:image` <!-- R1 -->
- [x] T004 [P] In `sites/astro-starlight-terminal1/src/content/docs/index.mdx`, add frontmatter `head:` entries: `title` tag `shll — the AI coding toolkit`, `og:title` meta with the same content, `og:type` meta `website` <!-- R3, R4 -->
- [x] T005 In `sites/astro-starlight-terminal1/src/components/Head.astro`, emit the homepage-gated (`Astro.url.pathname === '/'`) JSON-LD `application/ld+json` script carrying `WebSite` + `SoftwareApplication` via `JSON.stringify` + `set:html` <!-- R5 -->

### Phase 3: Integration & Edge Cases

- [x] T006 Run `pnpm build` in `sites/astro-starlight-terminal1/` and verify built output: `dist/index.html` has the full og:image set (exactly one `og:image`), exactly one `<title>` equal to `shll — the AI coding toolkit`, `og:title` matching, exactly one `og:type` = `website`, and one valid-JSON `application/ld+json` block; `dist/getting-started/install/index.html` has the og:image set, `og:type=article`, a ` | shll`-suffixed title, and no JSON-LD. Do not commit `dist/` (gitignored) <!-- R1, R3, R4, R5 -->

## Acceptance

### Functional Completeness

- [x] A-001 R1: Every built page emits `og:image` with absolute content `https://shll.ai/og-image.png`, plus `og:image:width=1200`, `og:image:height=630`, `og:image:alt`, and `twitter:image` — verified in `dist/` for the homepage and at least one docs page
- [x] A-002 R2: `public/og-image.png` is a PNG of exactly 1200×630 in the dark terminal-window aesthetic (`$` prompt, `shll`, tagline), legible at quarter scale
- [x] A-003 R3: `dist/index.html` contains exactly one `<title>`, with text exactly `shll — the AI coding toolkit`, and an `og:title` meta with identical content
- [x] A-004 R4: `dist/index.html` contains exactly one `og:type` meta and its content is `website`
- [x] A-005 R5: `dist/index.html` contains exactly one `application/ld+json` script whose body is valid JSON with both `WebSite` and `SoftwareApplication` entities (or, if dropped on friction, the drop is recorded in `## Assumptions` and R5 tasks revised accordingly)

### Behavioral Correctness

- [x] A-006 R3: Non-homepage titles keep the ` | shll` suffix (e.g. `dist/getting-started/install/index.html`) — no site-wide title regression
- [x] A-007 R4: Non-homepage pages keep `og:type=article`
- [x] A-008 R5: Non-homepage pages carry no `application/ld+json` script
- [x] A-009 R1: No double-emission — exactly one `og:image` meta per page (Starlight emits none of its own)

### Scenario Coverage

- [x] A-010 R2: `file public/og-image.png` reports `1200 x 630`; the generation script lives under `scripts/`, is absent from `package.json`, and `package.json`/lockfile carry no new dependencies (Constitution VI)

### Edge Cases & Error Handling

- [x] A-011 R5: The JSON-LD body survives Astro emission intact (parses with `JSON.parse` from the built HTML — no entity-escaping corruption)

### Code Quality

- [x] A-012 Pattern consistency: `Head.astro` additions follow the established override pattern (render `<Default />` first, then append; `set:html` for literal emission; doc comment explaining why)
- [x] A-013 No unnecessary duplication: og:image URL derived from `Astro.site`, not hardcoded in multiple places; no second copy of title/tagline strings beyond meta values that must be literal
- [x] A-014 Constitution: output fully static (I — JSON-LD is inert data; no new client JS), no new dependencies (VI), `dist/` not committed (IV)

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`
- This site has no test suite; the build + dist greps in T006 are the verification (do not invent a test framework — Constitution VI)

## Deletion Candidates

- None — this change adds new functionality without making existing code redundant. (The only replacement is in-place: the 512×512 `public/og-image.png` binary was overwritten by the 1200×630 card at the same path; no code, config, or asset became unused.)

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Confident | JSON-LD emitted from `Head.astro`, gated on `Astro.url.pathname === '/'`, via `JSON.stringify` + `set:html` — not via `index.mdx` frontmatter | Intake names both homes as possible; this one sidesteps the exact MDX/YAML escaping friction R5 flags as a drop trigger, and reuses the file's documented `set:html` pattern | S:70 R:90 A:85 D:70 |
| 2 | Confident | OG card generated by a one-off node script (`scripts/generate-og-image.mjs`, stdlib only) screenshotting an HTML mock with the Playwright-cached `chrome-headless-shell` — no ImageMagick/rsvg/PIL exist on this machine and no deps may be added | Intake explicitly allows checking machine tooling and a one-off approach; script is unwired and reproducible | S:65 R:90 A:85 D:75 |
| 3 | Confident | Card composition specifics: `terminal.css` dark palette (`#0b0d10` bg, `#12161b` titlebar, `#232932` border, `#d8dce4` fg, `#7cb342` prompt, `#d4a73a` accent, muted titlebar dots), JetBrains Mono from the fontsource package, large `shll` wordmark + tagline + `shll.ai` footer line | Intake grades composition as agent's choice (assumption 3, Confident), trivially regenerable | S:65 R:90 A:80 D:70 |
| 4 | Certain | og:image absolute URL derived from `Astro.site` rather than hardcoded | Intake allows either explicitly; `site` is fixed in `astro.config.mjs` | S:85 R:95 A:90 D:90 |
| 5 | Certain | R1's "every page" excludes the 7 Astro `redirects:` meta-refresh stubs (`/shll/`, `/wt/`, etc.) — they are `noindex` instant-redirect shells that do not render through Starlight's Head component; scrapers follow them to the canonical tool page, which carries the full og:image set | Observed in the built dist (42/42 rendered pages carry og:image; the 7 og:image-less files are all redirect stubs); not a defect, mechanically determined | S:85 R:95 A:90 D:90 |
| 6 | Certain | The `shll \| shll` title on `tools/shll/overview/` (the shll tool's own page: page title `shll` + site suffix) is out of scope — the intake's redundancy fix targets only the homepage | Intake What-Changes §3 scopes the title fix to the homepage via `index.mdx` frontmatter; the tool page's title is Starlight's correct default for a page named after the site | S:85 R:90 A:90 D:85 |

6 assumptions (3 certain, 3 confident, 0 tentative).
