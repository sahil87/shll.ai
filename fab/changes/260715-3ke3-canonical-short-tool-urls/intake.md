# Intake: Canonical Short Tool URLs

**Change**: 260715-3ke3-canonical-short-tool-urls
**Created**: 2026-07-16

## Origin

Conversational (`/fab-discuss` session → user approved the recommended approach → `/fab-new`). The user's raw ask:

> Because I am using shll.ai/&lt;tool-name&gt; as the link I share everywhere, those page needs more love — [...] 2. can the path be not be a redirect — right now shll.ai/run-kit -> shll.ai/tools/run-kit

The agent recommended **promoting the short URLs to canonical** (Starlight `slug:` frontmatter overrides + moving the docs-site dynamic route to root + reversing the old `/tools/<tool>/*` URLs into redirects), and the user replied "Go ahead" — full approval, no open design questions. A second, separate change (per-tool install one-liner + screenshots on overviews) is queued after this one; it is **not** part of this change.

## Why

1. **Pain point**: `shll.ai/run-kit` (and the other six short URLs) are the links the user shares everywhere, but they are Astro build-emitted `<meta http-equiv="refresh">` redirect stubs, not real pages. Consequences: an extra client-side hop; the address bar ends at `/tools/run-kit/overview/` (the shared short URL is never the canonical one); and — worst for link-sharing — **the stubs carry no OG/social meta** (the `kb1r` redirect-stub og:image exclusion is recorded in `docs/memory/conventions/seo-social-meta.md`), so unfurls in Slack/WhatsApp/Twitter are blank.
2. **If not fixed**: every shared link keeps under-performing on unfurl and SEO; the canonical URL diverges from the promoted URL indefinitely.
3. **Why this approach**: GitHub Pages is static-only (Constitution I/IV) — there is no server-side redirect/rewrite, so the only way a short URL returns a real 200 with full head/meta is for the page to actually live at that path. Starlight supports per-page `slug:` frontmatter overrides, making this a route migration, not a rebuild. Rejected alternatives: (a) duplicate pages at both paths — duplicate content, double maintenance; (b) keep redirects but add OG meta to stubs — does not satisfy the ask (still a redirect, canonical still `/tools/...`).

## What Changes

All work is inside `sites/astro-starlight-terminal1/` (the live site) except the memory updates at hydrate. Target URL model:

| Page | Old (canonical today) | New (canonical after) |
|------|----------------------|----------------------|
| overview | `/tools/<tool>/overview/` | `/<tool>/` |
| readme | `/tools/<tool>/readme/` | `/<tool>/readme/` |
| commands | `/tools/<tool>/commands/` | `/<tool>/commands/` |
| docs-site tree | `/tools/<tool>/<path>/` | `/<tool>/<path>/` |
| tools directory landing | `/tools/` | `/tools/` (unchanged) |

The seven tool slugs: `idea`, `hop`, `fab-kit`, `wt`, `run-kit`, `tu`, `shll`.

### 1. Starlight slug overrides (21 content files)

Each `src/content/docs/tools/<tool>/{overview,readme,commands}.mdx` gains a frontmatter `slug:` override: `slug: <tool>` (overview), `slug: <tool>/readme`, `slug: <tool>/commands`. Files stay physically under `src/content/docs/tools/` (no file moves — only route slugs change). `src/content/docs/tools/index.mdx` (slug `tools`, the directory landing) is untouched.

### 2. Docs-site dynamic route moves to root

- `src/pages/tools/[slug]/[...path].astro` → `src/pages/[slug]/[...path].astro`. Its `getStaticPaths` only emits paths that exist under `content/<slug>/site/`, so it cannot shadow other root routes (`getting-started/*`, `reference/*`, etc. are emitted by Starlight's catch-all with disjoint path sets).
- `rewriteDocsSiteLinks(raw, slug, mountPath)` in `src/lib/extract-readme.ts` currently rewrites relative link/image targets to `/tools/<slug>/<resolved>` — must emit `/<slug>/<resolved>`. Check `src/lib/docs-site-tree.ts` for any sibling `/tools/` path emission.
- `src/lib/docs-site-sidebar.mjs` builds sidebar links as `` `/tools/${slug}/${routePath}` `` — must emit `/${slug}/${routePath}`.

### 3. Redirect reversal in `astro.config.mjs`

- **Remove** the seven existing short-URL entries (`'/run-kit': '/tools/run-kit/overview/'` etc.) — the short paths become real pages, and a redirect colliding with a real route breaks the build.
- **Add** reverse entries so every previously-indexed/shared deep URL still lands:
  - `/tools/<tool>` → `/<tool>/` (bare, previously 404 — cheap goodwill entry)
  - `/tools/<tool>/overview` → `/<tool>/`
  - `/tools/<tool>/readme` → `/<tool>/readme/`
  - `/tools/<tool>/commands` → `/<tool>/commands/`
  - One entry per committed docs-site page: `/tools/<tool>/<path>` → `/<tool>/<path>/`. Astro static builds cannot wildcard-redirect, so enumerate these programmatically in `astro.config.mjs` by reusing the same collector `docs-site-sidebar.mjs` already uses at config time (it is `.mjs` precisely because the config imports it — extend it or add a sibling `.mjs` export that returns `{ '/tools/<slug>/<path>': '/<slug>/<path>/' }` entries).

### 4. Route-aware dispatchers: tool-slug allowlist replaces the `tools/` prefix

The `tools/` path prefix was doing namespace duty; at root, a bare `([^/]+)/readme` regex would false-positive (nothing collides today, but `getting-started/…`-shaped routes make regex-only matching fragile). Introduce a single shared roster constant (e.g. `src/lib/tool-slugs.ts`, exporting the 7 slugs) and gate every dispatcher on membership:

- `src/lib/commands-toc.ts` — route id `tools/<tool>/commands` → `<tool>/commands`, `<tool>` ∈ roster.
- `src/lib/readme-toc.ts` — `README_ROUTE_RE` `tools/<tool>/readme` → `<tool>/readme`, `<tool>` ∈ roster.
- `src/components/TocDispatcher.astro` / `MobileTocDispatcher.astro` — no logic change if they delegate to the two helpers above (verify).
- `src/components/Head.astro` — the per-tool JSON-LD dispatcher currently matches `^/tools/([^/]+)/([^/]+)/?$`. New match: `/<tool>/` (overview, 1 segment) and `/<tool>/<page>/` (2 segments, `page` ∈ {readme, commands}), `<tool>` ∈ roster. BreadcrumbList keeps its `Home → Tools → <tool> [→ page]` shape with the `Tools` crumb still resolving to `/tools/` and the tool crumb item now `/<tool>/`. **Parity non-goal**: nested docs-site pages (2+ segment docs-site paths) stay outside JSON-LD coverage, exactly as today — do not widen coverage in this change.
- Keep `ToolsIndex.astro`'s ROSTER shape (site-authored labels/order) — just update its `route:` values; the new shared slug constant may back it but MUST NOT change what is site-authored (per the `pgox` maintenance note in `docs/memory/conventions/tool-page-rubric.md`).

### 5. Internal link sweep

Grep-confirmed files referencing `/tools/` routes (update every route reference; leave prose about the `/tools/` landing itself intact):

- `astro.config.mjs` — sidebar `slug:` entries for the 21 tool pages (`tools/<tool>/overview` → `<tool>` etc.; the sidebar `Tools` group label and the generated docs-site group stay).
- `src/content/docs/index.mdx` — homepage: chips grid (7 links), `ls -l tools/` listing (7), loop-diagram prose (7), `all tools →` link to `/tools/` (unchanged).
- `src/components/ToolsIndex.astro` — 7 ROSTER `route:` values.
- `src/components/VersionTable.astro` — per-tool route links.
- `src/components/TerminalPrompt.astro` — the terminal island's tool-nav links.
- `src/components/CommandIndex.astro`, `src/components/ReadmeSlice.astro` — verify/update route references.
- `src/pages/llms.txt.ts` + `src/lib/llms.ts` (and `llms-full.txt.ts` via the lib) — emitted pathnames `/tools/<tool>/overview/` → `/<tool>/`.
- The 7 `overview.mdx` cross-tool links (`../../<tool>/overview/` relative idiom) — with slug overrides, relative resolution changes; switch these to site-absolute `/<tool>/` (simplest correct form under the new flat namespace).
- `src/styles/terminal.css` — grep hit is likely a comment; verify.
- Finish with an exhaustive `grep -rn "tools/" src/ astro.config.mjs` to catch stragglers (distinguish route references from prose/comments about the `/tools/` landing).

### 6. Root-namespace reservation (record, and enforce lightly)

Tool slugs now live at the site root. Reserved root names a future tool slug must avoid: `tools`, `getting-started`, `reference`, `install` (the deploy-time script at `/install`), `llms.txt`, `llms-full.txt`, `screenshots`, `diagrams`, plus any future root route. Record this constraint at hydrate in `docs/memory/conventions/tool-page-rubric.md` (the "adding an 8th tool" maintenance note is the natural home). No build-time guard is required in this change (7 known slugs, all clash-free) — recording the constraint is sufficient.

### 7. Verification

- `pnpm build` succeeds.
- `dist/run-kit/index.html` is a full Starlight page (has `<title>`, OG tags, JSON-LD), **not** a meta-refresh stub.
- `dist/tools/run-kit/overview/index.html` is a redirect stub pointing at `/run-kit/`.
- A docs-site page (e.g. `dist/idea/<path>/index.html` for a committed `content/idea/site/` page, if any exist) renders at root and its old `/tools/` path redirects.
- Sitemap contains the new canonical URLs and not the old ones.
- `/tools/` still renders the directory landing.

## Affected Memory

- `conventions/tool-page-rubric`: (modify) reserved-slug model moves to root (`/<tool>` + `/<tool>/readme` + `/<tool>/commands`), the root-namespace reservation constraint for future tool slugs, updated "adding an 8th tool" note.
- `conventions/seo-social-meta`: (modify) per-tool JSON-LD route gate (roster-gated root paths, 1- and 2-segment), breadcrumb item URLs, redirect-stub set now the old `/tools/` deep URLs instead of the 7 short URLs.
- `conventions/docs-site-tree`: (modify) mount URL `/tools/<slug>/<path>` → `/<slug>/<path>`, dynamic route file location, link-resolution transform target, sidebar link shape, redirect enumeration for old paths.
- `conventions/readme-extraction`: (modify) readme-page slug references (`/tools/<tool>/readme` → `/<tool>/readme`) and the docs-site link-rewrite transform target in the contract prose.

## Impact

- ~35 files, all in `sites/astro-starlight-terminal1/` (21 content frontmatter edits, `astro.config.mjs`, 1 route file move, ~10 component/lib files) + 4 memory files at hydrate. `docs/specs/readme-extraction-contract.md` §9 references the mount URL — check and update the spec's URL examples if they hardcode `/tools/`.
- No new dependencies (Constitution VI). Build-time only (Constitution I). No visual/theme changes (Constitution V untouched).
- SEO: one-time re-crawl churn on ~30 indexed URLs, mitigated by meta-refresh stubs + updated sitemap/canonicals. Accepted by user.
- External links elsewhere (tool repos' READMEs pointing at `shll.ai/tools/...`, if any) keep working via the reverse redirects.

## Open Questions

*(none — the approach, URL model, redirect posture, and non-goals were all settled in the originating discussion)*

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Promote short URLs to canonical via Starlight `slug:` overrides; keep files under `src/content/docs/tools/` | Discussed — user approved this exact approach ("Go ahead") | S:95 R:70 A:90 D:90 |
| 2 | Certain | Whole tool namespace moves to root (readme, commands, docs-site tree ride along with the overview) | Discussed — proposed as part of the recommendation the user approved; mixed-depth URLs would be incoherent | S:90 R:65 A:90 D:85 |
| 3 | Certain | Old `/tools/<tool>/*` URLs become meta-refresh redirects to the new canonical paths; `/tools/` landing stays | Discussed — explicitly part of the approved plan | S:95 R:80 A:90 D:90 |
| 4 | Confident | Docs-site redirect entries are enumerated programmatically in `astro.config.mjs` via the existing `.mjs` collector path | Static builds cannot wildcard-redirect; the config already imports `docs-site-sidebar.mjs`, so the enumeration seam exists | S:70 R:75 A:85 D:75 |
| 5 | Confident | Dispatchers gate on a shared 7-slug roster constant instead of the `tools/` path prefix | Root-level regex-only matching is fragile; single shared constant follows the repo's single-source pattern | S:60 R:80 A:85 D:70 |
| 6 | Confident | JSON-LD/breadcrumb coverage stays at parity (overview/readme/commands; nested docs-site pages stay uncovered) | Scope discipline — widening coverage is a recorded separate boundary (`pgox` note); parity keeps this change mechanical | S:65 R:85 A:80 D:75 |
| 7 | Confident | Overview cross-tool links switch from relative `../../<tool>/overview/` to site-absolute `/<tool>/` | Slug overrides change relative resolution; absolute links are the simplest correct form in a flat namespace | S:60 R:90 A:85 D:70 |
| 8 | Confident | Root-namespace reservation is recorded in memory only — no build-time slug-collision guard added | 7 known slugs, all clash-free today; a guard is cheap to add later if an 8th tool appears | S:55 R:85 A:80 D:65 |

8 assumptions (3 certain, 5 confident, 0 tentative, 0 unresolved).
