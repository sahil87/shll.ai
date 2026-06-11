---
description: "The SEO & social-share layer on the live Starlight site: Starlight's emitted-by-default baseline (do not re-add it), the site-wide og:image/twitter:image set appended in the `Head.astro` override (absolute URL from `Astro.site`), the committed 1200×630 terminal-card `og-image.png` + its unwired one-off generator script, the homepage frontmatter `head:` overrides (keyword title, `og:type=website`), the homepage-only WebSite+SoftwareApplication JSON-LD (`JSON.stringify` + `set:html` in Head, not frontmatter), and the redirect-stub exclusion"
---
# SEO & Social-Share Meta

## Overview

How the live site (`sites/astro-starlight-terminal1`) presents in link previews (Slack, Discord, X, LinkedIn, iMessage) and search snippets. Established by change `kb1r` (2026-06-10), grounded in a live-`<head>` audit of production shll.ai.

**Division of labor — Starlight baseline + a thin site layer.** Starlight already emits ~80% of SEO hygiene by default on every page: canonical URL, `sitemap-index.xml` (referenced from `robots.txt`), per-page `<title>` + meta description, `og:title`, `og:type`, `og:url`, `og:locale`, `og:description`, `og:site_name`, and `twitter:card=summary_large_image`. The site adds only what Starlight does not: the social-share **image** meta (site-wide, via the `Head.astro` override), homepage-specific `<title>`/`og:title`/`og:type` overrides (frontmatter), and homepage JSON-LD. **Before adding any head tag, check the baseline** — the og:image set could be blindly appended after `<Default />` precisely because Starlight emits no `og:image`/`twitter:image` of its own (no dedupe concern); a tag Starlight *does* emit must instead go through a dedupe-aware mechanism (see the homepage overrides below). Everything here is build-time static markup — no client JS, no dependencies (Constitution I, VI).

## Site-wide og:image set (`Head.astro`)

`src/components/Head.astro` (the registered `components.Head` override — pattern + escaping gotcha documented in [tool-page-rubric → site chrome overrides](./tool-page-rubric.md#site-chrome-overrides-header-logo-footer-head-change-i2b0)) appends after `<Default />`, on every rendered page:

- `og:image` — **absolute** URL (`https://shll.ai/og-image.png`). OG scrapers do not resolve relative URLs, so absoluteness is load-bearing. The URL derives from `Astro.site` (`new URL('/og-image.png', Astro.site)`), never hardcoded — `site: 'https://shll.ai'` in `astro.config.mjs` is the single origin source.
- `og:image:width` 1200 / `og:image:height` 630 / `og:image:alt` (the tagline).
- `twitter:image` — same absolute URL; this is what makes the already-declared `twitter:card=summary_large_image` actually render an image instead of a bare text card (pre-`kb1r`, the asset existed but no meta referenced it).

**Redirect stubs are excluded — deliberately, not a defect.** The 7 Astro `redirects:` meta-refresh stubs (`/shll/`, `/wt/`, etc.) are `noindex` instant-redirect shells that do not render through Starlight's Head component, so they carry no og:image. Scrapers follow them to the canonical tool page, which carries the full set. Verified at `kb1r`: 42/42 rendered pages carry the set; the only og:image-less files are the 7 stubs.

## The OG card asset (`public/og-image.png` + `scripts/generate-og-image.mjs`)

The shared image is a **committed static asset**, exactly **1200×630** (the ~1.91:1 shape link-preview scrapers want — the prior 512×512 square rendered wrong). Composition: a dark terminal-window card in the site's own aesthetic — `terminal.css` dark palette, titlebar dots, a `$` prompt line, the `shll` wordmark, the tagline, a `shll.ai` footer line — set in JetBrains Mono from the already-declared `@fontsource/jetbrains-mono` dependency, legible at ~quarter scale (Slack/X preview sizes). The card is a fixed dark design regardless of site theme, so Constitution V (dark-mode parity) is not implicated by the asset.

**Generation is OUT of the build (Constitution VI).** `sites/astro-starlight-terminal1/scripts/generate-og-image.mjs` is a **one-off, unwired** generator: node stdlib only, it writes a self-contained HTML mock and screenshots it at 1200×630 with the Playwright-cached `chrome-headless-shell` binary already on the machine. It is NOT referenced from `package.json`, adds zero runtime or build dependencies, and exists purely for reproducibility — re-run it manually to regenerate the card, then verify with `file public/og-image.png` (must report `1200 x 630`). *Rejected*: SVG→PNG converters (none installed); adding `sharp`/`playwright` as devDependencies (Constitution VI).

## Homepage `<head>` overrides (`index.mdx` frontmatter)

`src/content/docs/index.mdx` carries frontmatter `head:` entries that override Starlight's defaults **on the homepage only**:

- `title` tag → **`shll — the AI coding toolkit`** (no ` | shll` suffix) — fixes the keyword-free `shll | shll` redundancy (page title `shll` + site-title suffix `shll`).
- `og:title` meta → same string.
- `og:type` meta → `website` (correct for a landing page; every other page keeps Starlight's default `article`, correct for docs content).

**Mechanism**: Starlight's head-merging gives frontmatter `head:` entries priority over its defaults and **dedupes** the singleton `<title>` and same-`property` metas — so the built homepage carries exactly one of each. This is the dedupe-aware path for overriding tags Starlight already emits (contrast the og:image set above, which is append-only because Starlight emits none). The visible hero H1 is unaffected — the splash hero renders from the `hero:` block, not the page title.

**Scope notes (settled at `kb1r`, don't re-litigate):** all non-homepage titles keep the `{page} | shll` suffix. The `shll | shll` title on `tools/shll/overview/` (the shll *tool's* page — a page legitimately named after the site) is Starlight's correct default, not the homepage bug, and was deliberately left alone.

## Homepage JSON-LD (in `Head.astro`, NOT frontmatter)

One `<script type="application/ld+json">` block on the homepage only, carrying a `@graph` of two entities: `WebSite` (name `shll`, url from `Astro.site` origin) and `SoftwareApplication` (name `shll toolkit`, `applicationCategory: DeveloperApplication`, `operatingSystem: macOS, Linux`, a free `Offer`, GitHub url). JSON-LD is **inert data, not executable JS** — no Constitution I conflict.

**Placement decision**: emitted from `Head.astro`, gated on `Astro.url.pathname === '/'`, serializing a plain JS object via `JSON.stringify` into `set:html`. This keeps the JSON authorable as a real object, and is safe by construction — `JSON.stringify` of this object never produces `<` or raw HTML, so the body survives emission byte-exact (verified at `kb1r`: `JSON.parse` succeeds on the script body extracted from built HTML). *Rejected*: an `index.mdx` frontmatter `head:` entry with the JSON as a string `content:` — a large JSON blob inside YAML frontmatter is fragile and unreadable, and is exactly the MDX/YAML escaping friction the intake flagged as a drop trigger.

## Design Decisions

- **A thin layer over Starlight's baseline, not a meta framework.** The audit showed Starlight covers most SEO hygiene already; the fix is a few appended tags in the existing Head override + two frontmatter overrides + one regenerated asset. *Rejected*: any SEO integration/plugin — no page-visible need beyond these tags (Constitution VI).
- **Append vs. override, chosen per tag.** Tags Starlight does not emit (the og:image set) are appended after `<Default />` in the Head override; tags it does emit (`title`, `og:title`, `og:type`) are overridden through frontmatter `head:` where Starlight's merge dedupes. Using the right mechanism per tag is what keeps every built page at exactly one instance of each.
- **JSON-LD lives beside the other literal-emission head injections.** `Head.astro` already owned the `set:html` literal-emission pattern (the Cloudflare beacon, change `i2b0`); the JSON-LD reuses it rather than introducing a second authoring home in frontmatter.
- **The OG card is an artifact, its generator is a tool — only the artifact ships.** Committing the PNG keeps the build dependency-free; committing the unwired script keeps the card reproducible. Neither couples to `package.json`.

## Changelog

| Date | Change |
|------|--------|
| 2026-06-11 | Created (change `kb1r`): site-wide og:image/twitter:image set appended in `Head.astro` (absolute from `Astro.site`, width/height/alt; redirect stubs excluded by design), `public/og-image.png` regenerated 512×512 → 1200×630 dark terminal card via the new unwired `scripts/generate-og-image.mjs` (stdlib + Playwright-cached Chromium, zero deps), homepage frontmatter `head:` overrides (`shll — the AI coding toolkit` title + matching `og:title`, `og:type=website`; docs pages keep `article`), and homepage-only WebSite+SoftwareApplication JSON-LD emitted from `Head.astro` (`pathname === '/'`, `JSON.stringify` + `set:html`) rather than frontmatter. Recorded Starlight's emitted-by-default baseline and the append-vs-override mechanism choice. |
