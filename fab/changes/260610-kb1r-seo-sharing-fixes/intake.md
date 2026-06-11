# Intake: SEO & Sharing Fixes

**Change**: 260610-kb1r-seo-sharing-fixes
**Created**: 2026-06-10
**Status**: Draft

## Origin

> SEO & sharing fixes: wire up og:image/twitter:image meta tags in Head.astro (og-image.png exists but is orphaned — no meta tag references it despite twitter:card=summary_large_image being declared), regenerate og-image.png at 1200x630 in the terminal aesthetic (currently 512x512, wrong aspect for link previews), fix the homepage title "shll | shll" redundancy to carry keywords (e.g. "shll — the AI coding toolkit"), and set og:type to website on the landing page (currently article everywhere). Optionally JSON-LD WebSite/SoftwareApplication structured data (no deps). All build-time static, fix-type change.

Conversational — this intake follows a `/fab-discuss` session that audited the **live** shll.ai `<head>` (curl against production, 2026-06-10). Verified facts from that audit, recorded here because they ground every requirement:

- Starlight already emits: canonical URL, `sitemap-index.xml` (HTTP 200; `robots.txt` references it), per-page `<title>` + meta description, `og:title`, `og:type`, `og:url`, `og:locale`, `og:description`, `og:site_name`, and `twitter:card=summary_large_image`.
- `public/og-image.png` serves at 200 (17 KB) but is **512×512** and **no meta tag anywhere references it** (grep across `src/` and `astro.config.mjs` confirms).
- The live homepage `<title>` is literally `shll | shll` (page frontmatter title `shll` + Starlight site-title suffix `shll`).
- `og:type` is `article` on every page, including the landing page.
- A site-wide Head override already exists: `src/components/Head.astro` renders Starlight's `<Default />` then a literal Cloudflare-beacon `<script>` (PROD-gated). It is registered via `components.Head` in `astro.config.mjs`.

## Why

1. **Pain point**: sharing `shll.ai` on Slack, Discord, X, LinkedIn, or iMessage renders a bare text card. The site declares `twitter:card=summary_large_image` but supplies no image — the one asset that exists is orphaned and the wrong shape (512×512 vs. the ~1200×630 / 1.91:1 that link-preview scrapers want). The homepage `<title>` (`shll | shll`) carries zero keywords for search snippets and looks broken to humans.
2. **Consequence of not fixing**: every share of the site — the primary growth channel for a directory site whose whole value is being a front door — under-presents. Search results show a redundant, keyword-free title.
3. **Why this approach**: Starlight's defaults already cover ~80% of SEO hygiene (verified live, see Origin); the fix is a thin, surgical layer on top — a few meta tags in the existing `Head.astro` override, two frontmatter-level overrides on the homepage, and one regenerated static asset. No new dependencies, fully static output (Constitution I and VI hold).

## What Changes

All changes scoped to the live site, `sites/astro-starlight-terminal1/`.

### 1. Wire the OG image (site-wide)

Emit, on every page, via the existing `src/components/Head.astro` override (after `<Default />` — there is no existing `og:image`/`twitter:image` from Starlight, so appending cannot double-emit):

```html
<meta property="og:image" content="https://shll.ai/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="shll — seven small CLIs that force AI agents to plan before they code" />
<meta name="twitter:image" content="https://shll.ai/og-image.png" />
```

The URL MUST be absolute (OG scrapers do not resolve relative URLs). Derive the origin from `Astro.site` rather than hardcoding, if convenient — either is acceptable since `site: 'https://shll.ai'` is fixed in `astro.config.mjs`.

### 2. Regenerate `public/og-image.png` at 1200×630

Replace the current 512×512 asset with a 1200×630 card in the site's terminal aesthetic: dark terminal window (matching the homepage `terminal-window` chrome — titlebar dots, dark surface), a `$` prompt line, the site name `shll`, and the tagline "Seven small CLIs that force AI agents to plan before they code". Text must be legible at ~one-quarter scale (Slack/X preview sizes).

The image is a **committed static asset** in `public/`. How it is produced (one-off script, headless-browser screenshot of an HTML mock, design tool) is NOT part of the site build and MUST NOT add runtime or build dependencies (Constitution VI). If a generation script is used, it may live under `scripts/` for reproducibility but must not be wired into `package.json` build.

### 3. Homepage title

The homepage `<title>` and `og:title` SHALL become **`shll — the AI coding toolkit`** (no ` | shll` suffix). Mechanism: Starlight per-page frontmatter `head:` entries in `src/content/docs/index.mdx` — Starlight's head-merging gives user entries priority and dedupes singleton tags (`<title>`) and same-`property` metas, so a frontmatter `title` tag + `og:title` meta override the defaults cleanly. The hero/visible H1 is unaffected (the splash hero renders from the `hero:` block, not the title).

### 4. `og:type` on the landing page

Homepage emits `og:type=website` (override via the same frontmatter `head:` block on `index.mdx`; Starlight dedupes by `property`). All other pages keep Starlight's default `article` — correct for docs content.

### 5. JSON-LD structured data (homepage only)

Add one `<script type="application/ld+json">` block on the homepage carrying two entities: `WebSite` (name `shll`, url `https://shll.ai`) and `SoftwareApplication` (name `shll toolkit`, `applicationCategory: DeveloperApplication`, `operatingSystem: macOS, Linux`, free, link to GitHub). JSON-LD is inert data, not executable JS — no Constitution I conflict, no dependencies. If implementation friction appears (e.g., MDX escaping of the script body), this item MAY be dropped — it is the lowest-priority item in scope.

### Out of scope

- Homepage content/prose expansion (newcomer context, tool grid, diagram prose) — deliberately split into a separate feat-type change drafted alongside this one.
- Any change to the variant site (`sites/astro-tailwind-terminal1/`) or playground.
- `twitter:site` handle (none known to exist).

## Affected Memory

- `conventions/tool-page-rubric`: (modify) extend the "site chrome overrides" note — the Head override now also emits social-share meta (og:image set, twitter:image) site-wide; homepage carries frontmatter head overrides (title, og:type) and JSON-LD.

## Impact

- `sites/astro-starlight-terminal1/src/components/Head.astro` — append social-meta tags (and possibly homepage-gated JSON-LD).
- `sites/astro-starlight-terminal1/src/content/docs/index.mdx` — frontmatter `head:` overrides (title tag, `og:title`, `og:type`); possibly the JSON-LD block.
- `sites/astro-starlight-terminal1/public/og-image.png` — replaced (1200×630).
- Possibly `sites/astro-starlight-terminal1/scripts/` — optional one-off card-generation script (not wired into build).
- No dependency changes. No deploy-workflow changes. Output remains fully static.

## Open Questions

- None.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Site-wide `og:image` + `twitter:image` (+ width/height/alt) pointing at absolute `https://shll.ai/og-image.png` | Discussed — user confirmed; asset exists, `twitter:card=summary_large_image` already declared live | S:90 R:90 A:90 D:90 |
| 2 | Certain | Regenerate `og-image.png` at 1200×630 | User explicitly specified dimensions and aesthetic in the request | S:95 R:85 A:85 D:90 |
| 3 | Confident | Card composition: dark terminal window, `$` prompt, `shll` + tagline, legible at quarter scale | "Terminal aesthetic" given; exact composition is the agent's choice, trivially regenerable | S:65 R:85 A:75 D:70 |
| 4 | Confident | Homepage title exact value: `shll — the AI coding toolkit` (title tag and og:title, suffix dropped) | User gave it as "e.g." — wording is the agent's pick, one-line change to revise | S:60 R:90 A:80 D:65 |
| 5 | Certain | `og:type=website` on homepage only; docs pages keep `article` | User explicit; `article` is correct for docs content | S:90 R:95 A:90 D:90 |
| 6 | Confident | JSON-LD in scope: `WebSite` + `SoftwareApplication` on homepage, droppable on friction | User said "optionally" — included as zero-dep, fully reversible, lowest priority | S:55 R:90 A:80 D:70 |
| 7 | Confident | Mechanism: extend existing `Head.astro` override for site-wide tags; per-page frontmatter `head:` for homepage-specific overrides | Codebase signal — Head override already exists and is registered; Starlight head-merging dedupes singletons/properties | S:70 R:85 A:85 D:75 |
| 8 | Certain | OG card is a committed static asset; generation method stays out of the build, no new deps | Constitution VI (minimal dependencies); Constitution IV (dist not committed) unaffected | S:80 R:90 A:95 D:85 |

8 assumptions (4 certain, 4 confident, 0 tentative, 0 unresolved).
