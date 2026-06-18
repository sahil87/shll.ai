# Intake: Fix favicon everywhere (hexagon logo consistency)

**Change**: 260618-mb9s-fix-favicon-everywhere
**Created**: 2026-06-18

## Origin

User reported the "Astro default favicon instead of the hexagon logo" appearing in *many places* on the live site (`sites/astro-starlight-terminal1`, the `SITE_DIR` shipped to shll.ai). A build-verified investigation (full `astro build` + inspection of the emitted `dist/` HTML and the on-disk asset bytes) established the **actual** state rather than the reported symptom:

- **Normal doc pages are correct.** All 45 Starlight-rendered pages emit
  `<link rel="shortcut icon" href="/favicon.svg" type="image/svg+xml">`, and
  `public/favicon.svg` **is** the hexagon. Any wrong icon seen on a doc page is stale
  browser/CDN cache, **not** a source defect — no fix is warranted there.
- **There is no Astro-default-logo file anywhere** in the repo or build. `src/assets/logo.svg`,
  `public/favicon.svg`, and `public/favicon.ico` all depict the run-kit hexagon.

One **root-cause defect** explains the "many places" (a clarifying screenshot of
`shll.ai/robots.txt` rendering the wrong tab icon corrected the initial ordering):

- **DEFECT (root cause — the "many places")** — `public/favicon.ico` is actually a **PNG
  (`PNG image data, 32 x 32`) with a `.ico` extension** — a wrong container format (it does depict
  the hexagon). Verified via `file public/favicon.ico` (magic bytes `89 50 4e 47`, not the ICO
  `00 00 01 00`). The tab icon for any **headless route** — one served with no HTML `<head>`:
  `robots.txt`, `sitemap-*.xml`, **and** the 7 `<meta refresh>` redirect stubs — is driven by the
  browser's root `/favicon.ico` fallback, *not* a per-page `<link>`. That fallback returns
  malformed ICO bytes today, so the browser substitutes its own generic default (the screenshot
  shows it on `shll.ai/robots.txt`). A valid `.ico` fixes all of these at once.
- **(Secondary, not a separate fix)** — the 7 short-URL redirect stubs emitted by the
  `astro.config.mjs` `redirects:` block (lines 11–19) carry no `<link rel="icon">`, but as
  headless routes they are covered by the same root `/favicon.ico` fallback, so the `.ico` fix
  resolves them too. No stub-markup change is needed (originally planned as "Fix 2" — now dropped;
  see What Changes §2 and Assumptions #6).

> Fix the favicon on the live site so the hexagon logo appears consistently everywhere,
> eliminating any place where a generic/default browser icon shows instead. Two fixes, after a
> clarifying screenshot (`shll.ai/robots.txt` showing the wrong tab icon) corrected the diagnosis:
> **(1)** regenerate a real multi-resolution `favicon.ico` (true ICO container) from the hexagon
> source SVG — this is the **root-cause fix**, because the tab icon for any headless route
> (`robots.txt`, `sitemap-*.xml`, and the 7 `<meta refresh>` redirect stubs) is driven by the
> root `/favicon.ico` fallback, which is currently a mislabeled PNG; and **(2)** set `favicon`
> explicitly in `astro.config.mjs` as cheap, self-documenting insurance. The originally-planned
> redirect-page rewrite (former "Fix 2") is **dropped** — a valid `.ico` already covers the
> redirect stubs, so no `src/pages/` rewrite is needed (and the `seo-social-meta` og:image
> invariant is left untouched).

**Mode**: one-shot, promptless-defer dispatch, then clarified. The initial diagnosis was carried
in via a prior build-verified investigation; a follow-up screenshot reordered the priority (the
`.ico` is the root cause, not the redirect stubs) and dropped the redirect-page rewrite. This
intake records the reconciled state.

## Why

1. **The pain point.** The site's whole value is as a polished front door into the seven-CLI
   toolkit. A generic browser favicon on the short URLs (`shll.ai/wt`, `shll.ai/idea`, …) — the
   exact links the toolkit hands out — undercuts that first impression. The short URLs are
   *primary* surfaces (memorable, shareable), so a missing icon there is high-visibility, not a
   corner case.
2. **The consequence of not fixing.** Every share of a short URL flashes the default icon during
   the redirect, and any `/favicon.ico` request (legacy browsers, link-unfurlers, crawlers) gets
   malformed bytes. The "many places" symptom persists and re-surfaces as repeat bug reports,
   because the real cause (stub pages with no `<head>` icon) is invisible to a casual
   doc-page check.
3. **Why this approach over alternatives.**
   - *Fix 3 (the root cause)* regenerates a true ICO so the by-convention `/favicon.ico` request
     returns valid bytes. The screenshot (`shll.ai/robots.txt`) proved the tab icon for any
     headless route falls back to the root `/favicon.ico`; that file is a mislabeled PNG today, so
     the browser shows its own generic default. A real multi-resolution ICO fixes every headless
     route (the plain-text assets *and* the 7 redirect stubs) at once.
   - *Fix 1* (explicit `favicon:` config) is Starlight's documented knob — it makes intent
     explicit and is a one-line, trivially reversible change. Cheap insurance even though the
     emitted `.svg` link is already correct.
   - *Dropped: redirect-page rewrite.* Originally planned as the "many places" fix on the theory
     that the stubs needed their own `<link rel="icon">`. The screenshot showed the stubs are
     covered by the root `/favicon.ico` fallback like every other headless route, so rewriting the
     `redirects:` block into `src/pages/` pages would be redundant churn — and it would have forced
     a `seo-social-meta` og:image-invariant reconciliation for no benefit. Left out.

## What Changes

Scope is confined to `sites/astro-starlight-terminal1/` (the live site). Change type: **fix**.

### 1. Explicit favicon config (Fix 1 — Certain, low risk)

Add the documented Starlight `favicon` option to the `starlight({...})` integration block in
`sites/astro-starlight-terminal1/astro.config.mjs`:

```js
starlight({
  title: 'shll',
  // …
  favicon: '/favicon.svg',
  // …
})
```

This makes the hexagon `.svg` favicon explicit (it is already emitted by default, but the config
documents intent and is the canonical knob). No behavior change on the 45 rendered pages beyond
making the existing link self-documenting.

### 2. Favicon on the 7 short-URL redirects (Fix 2 — DROPPED from scope; see Assumptions #6)

**This fix is dropped — Fix 3 makes it redundant.** New screenshot evidence (`shll.ai/robots.txt`
rendering the wrong tab icon) clarified the actual mechanism: a browser tab icon for any *headless*
route — one served with no HTML `<head>`, i.e. `robots.txt`, `sitemap-*.xml`, **and** the 7
`<meta refresh>` redirect stubs — is driven by the **root `/favicon.ico` fallback**, not by a
per-page `<link>`. So a valid `.ico` (Fix 3) already fixes the redirect stubs *and* the plain-text
asset routes in one shot. Editing the stub markup is therefore unnecessary.

Consequence: the `redirects:` block in `astro.config.mjs` (lines 11–19) **stays as-is** — no
rewrite to `src/pages/` redirect pages, no new files. This also **sidesteps the `seo-social-meta`
`kb1r` og:image invariant entirely** (the stubs are untouched, so the no-og:image claim still
holds verbatim — no memory cascade). The redirect targets are unchanged:

| Short URL | Target (unchanged) |
|-----------|--------------------|
| `/idea`    | `/tools/idea/overview/`    |
| `/hop`     | `/tools/hop/overview/`     |
| `/fab-kit` | `/tools/fab-kit/overview/` |
| `/wt`      | `/tools/wt/overview/`      |
| `/run-kit` | `/tools/run-kit/overview/` |
| `/tu`      | `/tools/tu/overview/`      |
| `/shll`    | `/tools/shll/overview/`    |

### 3. Regenerate a real multi-resolution `favicon.ico` (Fix 3 — the root-cause fix)

Replace `sites/astro-starlight-terminal1/public/favicon.ico` (currently a mislabeled 32×32 PNG)
with a **true ICO container** holding multiple resolutions (e.g. 16×16, 32×32, 48×48) rasterized
from the hexagon source. Source SVG: `sites/astro-starlight-terminal1/public/favicon.svg` (also
mirrored at `src/assets/logo.svg`). The hexagon already uses a mid-grey palette, so it reads in
both light and dark browser chrome (Constitution V — verify parity, no new artwork needed).

**Generation approach (RESOLVED — Assumptions #7, option a).** Add a small **one-off generator
script** `sites/astro-starlight-terminal1/scripts/generate-favicon-ico.mjs` that is **NOT** wired
into the build — exactly the model of `scripts/generate-og-image.mjs` (committed static asset,
re-run manually, zero new build deps). It rasterizes the hexagon source SVG to PNG buffers at
16/32/48 via `sharp` (already a dependency) and **hand-assembles the ICO container** from those
buffers — a small, well-documented binary header (an ICO entry may carry a PNG-encoded frame
directly), so **no new dependency** is introduced (Constitution VI satisfied). The committed
`public/favicon.ico` is the script's output; the script is the reproducibility record.

Acceptance: `file public/favicon.ico` MUST report a true ICO (`MS Windows icon resource`), not
PNG, and it MUST depict the hexagon at each embedded size.

### 4. README docs line (conditional)

`sites/astro-starlight-terminal1/README.md` line 41 reads `├── favicon.{svg,ico}    # browser tab
icon`. This stays accurate after Fix 3 (the `.ico` becomes a *real* ICO but the filename and
purpose are unchanged), so **no edit is expected**. If the new `scripts/generate-favicon-ico.mjs`
warrants a mention alongside the existing `generate-og-image.mjs`, the repo-layout block (around
lines 30–45) MAY warrant a one-line note. Treat as a low-priority, conditional docs touch — see
Assumptions #5.

## Affected Memory

- `conventions/seo-social-meta` (**no change** — invariant preserved): line 21's `kb1r`-verified
  claim that the 7 redirect stubs "do not render through Starlight's Head component, so they carry
  no og:image" stays **true verbatim**. Dropping the redirect-page rewrite (former Fix 2) means the
  stubs are untouched, so this entry needs no edit. Recorded here only to document that the
  invariant was deliberately *left intact* by the scope decision (Assumptions #6).
- `conventions/tool-page-rubric` (modify, minor): the "site chrome overrides" section references
  the `Head.astro` override and the run-kit hexagon header logo; a one-line note that the favicon
  is now set explicitly (`favicon: '/favicon.svg'`) and backed by a real multi-resolution `.ico`
  may be warranted for completeness. Low priority — only if it improves accuracy.

(Implementation-only details — the exact ICO byte layout, the one-off script — do not need memory
entries; memory tracks spec-level behavior, which here is "the site favicon is set explicitly and
the `/favicon.ico` fallback now returns a valid hexagon ICO".)

## Impact

- `sites/astro-starlight-terminal1/astro.config.mjs` — add `favicon: '/favicon.svg'` to the
  `starlight({...})` block. The `redirects:` block (lines 11–19) is **left unchanged**.
- `sites/astro-starlight-terminal1/public/favicon.ico` — **regenerated** as a true multi-resolution
  ICO container (the committed output of the generator script).
- `sites/astro-starlight-terminal1/scripts/generate-favicon-ico.mjs` — **new** one-off, unwired
  generator (Assumptions #7a) — mirrors `scripts/generate-og-image.mjs`; uses the existing `sharp`
  dep, hand-assembles the ICO container, **no new dependency**.
- `sites/astro-starlight-terminal1/README.md` — conditional, low-priority docs touch (~line 41 /
  repo-layout block) if the new `scripts/` file warrants a mention.
- **No `src/pages/` redirect rewrite, no `package.json` change** (former Fix 2 dropped; Fix 3 adds
  no dependency).
- **Constitution checks**: I (Static-First) — unchanged; the existing static `<meta refresh>`
  redirects stay as-is, no SSR, no client JS. V (Dark Mode Parity) — favicon must read in both
  light/dark chrome (hexagon mid-grey already does; verify). VI (Minimal Dependencies) — satisfied:
  the unwired-script model adds no build dep.
- **No new runtime behavior, no SSR, no server endpoints.** Build output stays fully static.
- **Verification**: (a) `file public/favicon.ico` (and `file dist/favicon.ico` after a build)
  reports a true ICO (`MS Windows icon resource`), not PNG; (b) the regenerated `.ico` depicts the
  hexagon at each embedded size; (c) a fresh `astro build` still emits `dist/idea/index.html` (etc.)
  with the unchanged `<meta refresh>` to the correct target; (d) `astro.config.mjs` carries
  `favicon: '/favicon.svg'` and the 45 rendered pages still emit the `.svg` icon link.

## Open Questions

_All resolved via `/fab-clarify` (Session 2026-06-18) — see Clarifications below._

- ~~Redirect-page rendering vehicle / file shape~~ — **moot**: the redirect-page rewrite (former
  Fix 2) is dropped; the stubs are covered by the root `/favicon.ico` fallback. (Assumptions #6.)
- ~~`.ico` regeneration approach~~ — **resolved**: an unwired one-off `scripts/generate-favicon-ico.mjs`
  using the existing `sharp` dep, hand-assembling the ICO container, no new dependency.
  (Assumptions #7a.)

## Clarifications

### Session 2026-06-18

New evidence: a user screenshot of `shll.ai/robots.txt` showing the browser tab rendering the
Astro-default icon instead of the hexagon. This corrected the diagnosis (the root cause is the
invalid root `/favicon.ico`, which every headless route falls back to — not the redirect stubs
specifically) and reordered the fixes.

| Q | Resolution |
|---|------------|
| #6 — Redirect-page rendering mechanism (former Fix 2) | **Dropped from scope.** Headless routes (incl. the redirect stubs) take the icon from the root `/favicon.ico` fallback, which a valid `.ico` (Fix 3) already fixes. No `src/pages/` rewrite; `redirects:` block left intact; `seo-social-meta` og:image invariant untouched. |
| #7 — `.ico` generation approach | **Option (a)**: unwired one-off `scripts/generate-favicon-ico.mjs` rasterizing the hexagon SVG via the existing `sharp` dep and hand-assembling the ICO container — **no new dependency** (mirrors `generate-og-image.mjs`, satisfies Constitution VI). |

## Assumptions

<!-- STATE TRANSFER: this table is the continuity record between the intake-stage agent and the
     apply-entry agent. The two deferred forks (#6, #7) were resolved via /fab-clarify
     (Session 2026-06-18); no Unresolved rows remain, so the intake gate now scores normally. -->

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Fix 1: add `favicon: '/favicon.svg'` to the Starlight integration in `astro.config.mjs`. | Starlight's documented `favicon` option; one line; the `.svg` is already emitted, so this only documents intent. Trivially reversible. Config/constitution give the clear answer. | S:95 R:98 A:95 D:95 |
| 2 | Confident | Fix 2 direction: replace the config-level `redirects:` with real static redirect pages under `src/pages/` that carry `<link rel="icon">` + a `<meta refresh>`, preserving all 7 targets verbatim. | Strong signal (the description and DEFECT 1 name this); Astro's built-in redirect stubs have a non-customizable `<head>`, so this is the only way to inject the icon while staying static (Constitution I). The `[slug]/[...path].astro` dynamic-route precedent proves custom routes coexist with Starlight here. | S:88 R:62 A:80 D:78 |
| 3 | Confident | Fix 3 direction: regenerate `public/favicon.ico` as a true multi-resolution ICO (16/32/48) rasterized from `public/favicon.svg` (mirror `src/assets/logo.svg`). | `file` confirms the current `.ico` is a mislabeled 32×32 PNG; the source SVG is the hexagon. The *direction* is unambiguous (only the generation mechanism — #7 — is open). | S:90 R:70 A:80 D:72 |
| 4 | Confident | Scope is confined to `sites/astro-starlight-terminal1/` and the change type is `fix`. | The description scopes it explicitly to the live site; the defects are corrections of broken/missing behavior, not new capability — `fix` semantics. Constitution II (per-site isolation) reinforces the boundary. | S:92 R:85 A:90 D:88 |
| 5 | Tentative | README line 41 (`favicon.{svg,ico}`) needs no edit; touch the repo-layout block only if Fix 2 adds notable new `src/pages/` files. | The filename/purpose are unchanged by Fix 3, so the line stays accurate; a docs nudge for new redirect files is optional polish, not required. Cheaply revisited at apply or via `/fab-clarify`. | S:55 R:90 A:70 D:65 |
| 6 | Certain | Fix 2 (redirect-page favicon `<link>`) is **dropped from this change's scope** — demoted to optional/out-of-scope. | Clarified — user confirmed (recommendation). New screenshot evidence (`shll.ai/robots.txt` showing the wrong icon) proves the browser tab icon for *headless* routes (`robots.txt`, `sitemap-*.xml`, AND the 7 redirect stubs) is driven by the root `/favicon.ico` fallback, not a per-page `<link>`. A valid `.ico` (Fix 3) therefore already covers the redirect stubs, so editing the stub markup is unnecessary. Dropping it keeps the `redirects:` block intact (no `src/pages/` redirect rewrite) and **sidesteps the `seo-social-meta` `kb1r` og:image invariant entirely** (no memory cascade). | S:95 R:90 A:88 D:85 |
| 7 | Certain | Fix 3 ICO generation approach: **(a) an unwired one-off `scripts/generate-favicon-ico.mjs`** that hand-assembles a true multi-resolution ICO from `sharp`-produced PNG buffers — **no new dependency**. | Clarified — user confirmed (recommendation). Matches the `scripts/generate-og-image.mjs` precedent (committed static asset, re-run manually, not wired into the build). `sharp` is already a dep and produces the PNG frames; the ICO container is a small, well-documented binary header assembled by hand (an ICO may embed PNG-encoded frames), satisfying Constitution VI (no new build dep). | S:95 R:70 A:78 D:80 |

7 assumptions (3 certain, 3 confident, 1 tentative, 0 unresolved).
