# docs/site Documentation Tree

## Overview

A tool's real documentation is "a small README plus a few referenced markdowns" — install guides, deep-dives, format contracts the README links to. shll.ai **pulls each tool's `docs/site/**/*.md` documentation TREE** (in addition to the single README slice), commits each page verbatim under `content/<slug>/site/<path>.md`, and renders **one build-time page per file** at `/tools/<slug>/<path>`. This activates the `docs/site/` mechanism the contract reserved (`readme-extraction-contract.md` §9, formerly "RESERVED / NOT YET IMPLEMENTED"; change `x0br`).

This is a **sibling extension** of [readme-extraction](./readme-extraction.md), not a replacement: the single-README slice path (`extractReadme`, `ReadmeSlice.astro`, the README curl) is unchanged. The docs/site tree is its own data kind — a *set* of nested pages with a closure lint per file and a variable, author-controlled shape — so it gets its own transforms, CLI, render route, and sidebar generation. That separation is why this is a dedicated memory file rather than a section of `readme-extraction.md`.

The **forward contract** — the producer obligations each tool repo will satisfy in its own later, per-repo change — lives in the spec [`docs/specs/readme-extraction-contract.md`](../../specs/readme-extraction-contract.md) §9 (now active). This file documents the **consumer implementation**. The **single machine-anchor** for the link-resolution + closure logic is `sites/astro-starlight-terminal1/src/lib/extract-readme.ts` (shared with the README slice); the prose contract is reconciled to the code on any discrepancy.

> **Out of scope (forward, per-repo).** Conforming the 7 external tool repos' `docs/site/` trees to this contract is a gradual, one-change-per-tool activity — NOT part of `x0br`, which publishes the contract + builds the consumer only. A tool with no `docs/site/` tree (or no successful pull yet) emits **zero** docs/site pages and the build stays green — the same degrade-cleanly discipline as a missing README slice.

## The closed-set producer contract

The design hinges on a **closed-set convention** the producer (the tool author) follows, which collapses the consumer to two context-free transforms (no link-classifier, no copied-set manifest):

1. **Closure.** `docs/site/` is a **fully self-contained set**: every *relative* link and image inside any `docs/site/**/*.md` MUST resolve to a path **inside** `docs/site/`. No `..` may escape the set.
2. **External links absolute-by-author.** A README (or docs/site page) link to anything *outside* the copied set — source files, `docs/specs/`, repo internals — MUST be written as an absolute `https://…` URL. The **author**, not the machine, owns the "does this leave the site?" decision.
3. **All images absolute, everywhere.** Every image reference in both `README.md` and `docs/site/**` MUST be an absolute URL (e.g. `raw.githubusercontent.com/…`). shll.ai **vendors zero image binaries**; a relative image is a closure violation (warned). This extends the README contract's §3 "reference, don't copy" stance to its logical conclusion.
4. **README → docs/site links written naturally.** A README link into a docs/site page is the natural repo-relative path `docs/site/<p>.md`; shll.ai rewrites it at **render** time.

*Why closed-set over a machine link-classifier* (the rejected earlier design — the bulk of the original effort estimate): the author declaring site-internal vs. external by writing externals absolute means closure guarantees every *relative* link is intra-set. The machine is left with two trivial transforms, the invariant (`docs/site/` is self-contained) is **lintable**, and there is no copied-set manifest to maintain.

## Link resolution is SITE-ABSOLUTE (the non-obvious crux)

Both consumer transforms emit a **site-absolute** path `/tools/<slug>/<resolved-path>`, NOT a relative `.md`-strip. This is the load-bearing, non-obvious design decision — capture the WHY:

**The site serves each page as a trailing-slash DIRECTORY** (`/tools/<slug>/<path>/`, i.e. `<path>/index.html`). So a *relative* target resolves one segment too deep. A README at `/tools/idea/readme/` linking `./install` resolves to `/tools/idea/readme/install` — but the mounted page is at `/tools/idea/install/`. **Broken.** A site-absolute target `/tools/idea/install` is **immune to the serving model** (trailingSlash-proof) and matches Starlight's own sibling links, which are absolute. The earlier relative-`.md`-strip forms were corrected to site-absolute in the `x0br` review rework.

The cost — both transforms are now **slug-aware** (and the docs/site transform also mount-path-aware) rather than slug-agnostic — was accepted as the only serving-model-proof option.

Both transforms live in `extract-readme.ts` as **pure, total, dependency-free, exported** functions (same discipline as `extractReadme`/`findUnknownTokens`):

- **`rewriteDocsSiteLinks(markdown, slug, mountPath)`** (R5) — a docs/site PAGE transform. Resolves each relative link/image target against the page's **own directory** within the docs/site tree (`mountPath`, e.g. `advanced/hooks` → base dir `advanced`), normalizing `.`/`..`, strips `.md`, and emits `/tools/<slug>/<resolved>`. From page `advanced/hooks`: `../install.md` → `/tools/<slug>/install`; `./sibling.md` → `/tools/<slug>/advanced/sibling`. A `..`-escape is best-effort-clamped at the tool root here (and separately reported by the closure lint — the page still commits, so the rewriter must still emit a usable path).
- **`rewriteReadmeDocsSiteLinks(markdown, slug)`** (R6) — the README SLICE transform. A relative target `docs/site/<p>.md` → `/tools/<slug>/<p>` (the `docs/site/` prefix maps to the tool root, `.md` stripped, nested subtree preserved). Relative targets NOT under `docs/site/` are left untouched (they self-heal via the absolute-by-author producer rule). Wired into `ReadmeSlice.astro`, which now passes its `tool` slug and calls this **before** `processor.render` (the `x0br`-review must-fix: it formerly rendered raw).

### The rewrite guard (the correctness boundary, single-sourced)

All link-target editing flows through **one scanner** (`rewriteLinkTargets`), so the guard lives in exactly one place. It touches **only**:

- the `(...)` target of markdown links/images (`MD_LINK_RE`), and the `href`/`src` of raw HTML (`HTML_ATTR_RE`), and
- only when the target is **RELATIVE** (`isAbsoluteTarget` excludes schemes, `//host`, root-`/path`, pure `#fragment`).

It MUST NOT touch: absolute URLs whose path *contains* the literal `docs/site` (e.g. a `github.com/sahil87/idea/blob/main/docs/site/x.md` stays verbatim), prose or fenced/inline code that merely mentions the text, the link **TEXT** (`.md` in `[text]` is preserved), or the `.md` of anything that is not a relative link/image target. A trailing `#anchor`/`?query` suffix is split off and re-appended verbatim (`splitTargetSuffix`). The `docs/site/` prefix is the named constant `DOCS_SITE_PREFIX` (no magic string).

> **Known limitations (honestly documented in the spec, deferred — rare).** The OUTER target of a linked image `[![alt](img)](page.md)` and reference-style link definitions `[id]: ./x.md` are **NOT rewritten** — fixing them robustly needs nested-bracket parsing that risks the guard's precision, and both are vanishingly rare in docs/site pages. The canonical page still commits and renders; the spec §link-resolution records exactly what is rewritten.

## The closure lint (`findClosureViolations`, report-only)

`extract-readme.ts` exports `findClosureViolations(relPath, markdown)` — a pure, total detector that, given a docs/site file's path relative to the docs/site root and its markdown, returns the relative link/image targets that violate closure:

- a relative LINK or IMAGE whose **resolved** path climbs OUT of `docs/site/` (a `..` escape — pure POSIX-segment math, no fs), or
- a relative IMAGE (images MUST be absolute everywhere, producer rule §3).

Absolute URLs and intra-set relative links are clean. This **mirrors `findUnknownTokens` exactly**: detection only, no consequence — the CLI decides what to do. The consequence is **report-only**: a CI `::warning::` naming the file + target, and the slice is **STILL committed** (canonical wins; never withhold). This is the same posture as the README slice's §7 `vn39` divergence reporter — a repo-level lint, not a publish gate. It turns "self-contained" from a hope into a checked invariant and tells the tool author precisely which link broke the rule.

The CLI adds a **second report-only lint**: a **reserved-slug `::warning::`** when a docs/site page's top mount segment ∈ `{overview, readme, commands, install, workflows}` (`RESERVED_SLUGS`). Such a page would mount at `/tools/<slug>/<reserved>` and — because the dynamic route is higher-priority than Starlight's catch-all — **silently shadow** the hand-authored static page. Same posture: warn (visible in the run log), commit anyway, fix in the tool repo (spec §9.2 makes it a producer rule).

## The CLI (`extract-docs-site-cli.mjs`)

`scripts/extract-docs-site-cli.mjs` — `node scripts/extract-docs-site-cli.mjs <slug> <docs-site-dir>` — is the multi-file **sibling** of `extract-readme-cli.mjs` (one README in → one slice out). It:

1. Walks `<docs-site-dir>` recursively for `*.md` files.
2. Per file, runs the reserved-slug lint + `findClosureViolations` (single-sourced from `extract-readme.ts` — the **same** module the unit test pins), emitting a `::warning::` per violation. Never withholds.
3. Copies each file **VERBATIM** to `content/<slug>/site/<path>.md`. **Link rewriting is RENDER-side, not copy-side** — the committed slice stays a faithful canonical copy (the same discipline as the README slice, whose rewrite is also render-side). This keeps the collector a pristine mirror of the source.
4. An empty/missing tree dir is not an error (expected interim state) — exit 0, nothing written. Exit 0 always except a genuine I/O error copying a real file (propagates non-zero so the workflow's per-tool isolation keeps the last-good tree).

Imports `extract-readme.ts` (dependency-free; runs under plain `node` via native type-stripping, no `astro:content` hook) — the same single-machine-anchor discipline as `extract-readme-cli.mjs`.

## The pull (sibling step in `scheduled-readme-refresh.yml`)

The docs/site tree is fetched by a **sibling step** in the existing daily `.github/workflows/scheduled-readme-refresh.yml` (the README behavior is unchanged; per-tool fetch-failure isolation preserved). Because `docs/site/` is a directory of unknown shape (not a single fixed path like the README), the README's `raw.githubusercontent.com` per-file curl does not fit. Instead, per tool:

- `curl` the repo **TARBALL** once from `https://codeload.github.com/sahil87/<repo>/tar.gz/<branch>` (main→master fallback, mirroring the README curl), piped to `tar -xz` filtered with `--strip-components=1 --wildcards '*/docs/site/*'` — untarring **only** the `docs/site/` subtree.
- Run `extract-docs-site-cli.mjs` (closure + reserved-slug lint, report-only; copies to `content/<slug>/site/**`).
- `git add -A content/` (the `-A` so an upstream-DELETED page is removed from the mount too), then a single commit covering both the README slice and the docs/site tree for every fetchable tool.

*Why tarball over the GitHub contents-API* (intake #11): one request per tool, no API rate limit, no `GITHUB_TOKEN`, no N+1 per-file fetches. A repo with no `docs/site/` is a clean no-op (the tar extracts nothing — not a failure). A genuine fetch/IO failure keeps the last-good committed tree and does not block other tools (`site_failed` accumulation, never fails the job).

## The render (the first dynamic route in the codebase)

`src/pages/tools/[slug]/[...path].astro` is the **FIRST dynamic route** in the codebase — every other page is a static MDX stub. It exists because the docs/site page **set is author-variable** (a tool ships any number of nested pages), so a static-stub-per-page would need per-page maintenance the dynamic route eliminates.

- **`getStaticPaths`** walks the committed `content/<slug>/site/**` tree at **build time** (cross-boundary repo-root read via `repo-root.ts`'s `import.meta.url` ascent — NOT `process.cwd`, NOT `import.meta.glob`, NOT a fixed depth, which does not survive `astro build` bundling; the **same** ascent strategy `ReadmeSlice`/`CommandReference` use). It emits one page per file at `/tools/<slug>/<path>` and threads each page's `slug` + `mountPath` into props. A tool with no tree contributes no pages → build succeeds emitting nothing.
- **Render** reuses the exact path `ReadmeSlice.astro` proved: `@astrojs/markdown-remark`'s `createMarkdownProcessor` (a build-time dep already pulled by astro core + declared in `package.json`; Constitution VI — no new dep), with `rewriteDocsSiteLinks(raw, slug, mountPath)` applied **before** render. No client JS for primary content (Constitution I).
- **Wrapped in Starlight's `<StarlightPage>`** (`@astrojs/starlight/components/StarlightPage.astro`) so it inherits the sidebar, prose styles, and **dark-mode parity** (Constitution V) — the documented Starlight pattern for a custom route in a content-collection site. (A bare `src/pages` route loses all Starlight chrome; the `docs` content collection is filesystem-bound to `src/content/docs` and cannot host repo-root `content/` files.)
- **Route precedence**: Astro routes the more-specific `tools/[slug]/[...path]` ahead of Starlight's `[...slug]` catch-all, so the static per-tool pages (overview/readme/commands) keep being served by Starlight while docs/site pages are served here. (This is the shadowing risk the reserved-slug lint guards.)
- **Present-but-unrenderable → build fails** (mirrors `ReadmeSlice`): a committed defect must not deploy. ENOENT cannot occur (getStaticPaths only emits files it found).

## Tree-walk single-sourcing + the `.ts`/`.mjs` split

The mount math (`content/<slug>/site/<path>.md` → `/tools/<slug>/<path>`) and the page set are single-sourced in **`src/lib/docs-site-tree.ts`** (`collectDocsSitePages(repoRoot)` → `{slug, path, absPath, title}` per page; title = first H1, fallback titleized path tail; stable sorted order for determinism). The dynamic route consumes it.

The **sidebar** is generated by a **parallel walk** in `src/lib/docs-site-sidebar.mjs` (`docsSiteSidebarItems(slug)` → `{label, link}` per page), appended per-tool in `astro.config.mjs` to each tool's existing **hand-authored** `items:` array (the Starlight sidebar is hand-authored per tool, NOT `autogenerate`; the hand-authored Overview/Readme/Commands entries are untouched).

**Why the `.ts`/`.mjs` split** (and the duplicated walk): `astro.config.mjs` is evaluated at config-load time, a boundary that loads `.mjs` cleanly but not the `.ts` route module. So the sidebar walk is a `.mjs` twin of the `.ts` route walk. The two are **verified to agree** on the mount math (same `walkMarkdown` + `firstH1` + `titleizeTail` shape, same `/tools/<slug>/<path>` URL). This is a deliberate, justified duplication across the Astro config-eval boundary — the only known unpinned drift risk between route and sidebar (review should-fix, accepted). *Why a generated sidebar group over `autogenerate` or a manual list*: `autogenerate` binds to `src/content/docs` and can't see repo-root `content/`; a manual list defeats the dynamic route's zero-maintenance goal.

## Sibling of the README slice (shared patterns)

The docs/site tree is the **third consumer** of the pull architecture (`help-collection` proved it, `readme-extraction` was the second). It reuses:

| Shared pattern | README slice | docs/site tree |
|----------------|--------------|----------------|
| Daily scheduled pull, off deploy path | `scheduled-readme-refresh.yml` (README step) | the **sibling step** in the same workflow |
| Repo-root data surviving a live-site swap | `content/<slug>/README.md` | `content/<slug>/site/**` |
| Pure, dependency-free, native-test-pinned build-time logic | `extractReadme`/`findUnknownTokens` | `rewriteDocsSiteLinks`/`rewriteReadmeDocsSiteLinks`/`findClosureViolations` (same module) |
| Ascend-to-root `import.meta.url` build-time read | `ReadmeSlice` → `content/` | dynamic route → `content/` (via `repo-root.ts`) |
| `@astrojs/markdown-remark` build-time render, no new dep | `ReadmeSlice.astro` | the dynamic route |
| Report-only lint, never withholds (canonical wins) | `vn39` `findUnknownTokens` reporter | `findClosureViolations` + reserved-slug reporter |
| Committed slice is a verbatim canonical copy; rewrites are render-side | README slice | docs/site slice |
| missing-tree → degrade cleanly (no page / placeholder), build green | `ReadmeSlice` missing → placeholder | dynamic route emits no pages |

What is **new** here (not in the README path): the closed-set producer contract, **site-absolute** link resolution (slug-aware transforms), the closure + reserved-slug lints, the repo-tarball fetch, the **first dynamic route**, build-time sidebar generation, and the `.ts`/`.mjs` config-eval split.

## Design Decisions

- **Closed-set producer contract over a machine link-classifier** (`x0br`): the author declares site-internal vs. external by writing externals absolute; closure makes every relative link intra-set, collapsing the consumer to two context-free transforms. *Why*: fewer moving parts, no copied-set manifest, closure is lintable. *Rejected*: an A/B link classifier with a copied-set manifest (the bulk of the original effort estimate; closure deletes it).
- **Site-absolute link resolution over a relative `.md`-strip** (`x0br` review rework): the site serves pages as trailing-slash directories, so a relative target resolves one segment too deep (`/tools/<slug>/readme/install` vs. the page at `/tools/<slug>/install/`). Site-absolute `/tools/<slug>/<resolved>` is serving-model-proof and matches Starlight's own absolute sibling links. *Accepted cost*: the transforms are slug-aware (no longer slug-agnostic). *Rejected*: relative `./<p>` / bare `.md`-strip (broken under trailing-slash serving).
- **All images absolute everywhere over vendoring** (`x0br`): extends §3's "reference, don't copy". *Why*: image links can never break on the move, the lint only polices markdown links, one uniform rule. *Rejected*: build-time image vendoring (deferred — needs no repo-side change, can be added later).
- **Repo tarball fetch over the GitHub contents-API** (intake #11): one `curl` of `codeload.github.com/.../tar.gz/<branch>` filtered to `*/docs/site/*`. *Why*: one request per tool, no rate limit, no token, no N+1. *Rejected*: recursive contents-API listing (N+1, rate-limited, needs a token).
- **Single Astro dynamic route over a committed MDX stub per page** (intake #12): `src/pages/tools/[slug]/[...path].astro` with `getStaticPaths` over `content/<slug>/site/**`. *Why*: handles a variable, author-controlled page set with zero per-page maintenance — the first dynamic route in the codebase, accepted as the only fit. *Rejected*: a committed MDX stub per page (re-introduces per-page maintenance).
- **Render inside Starlight's `<StarlightPage>`**: inherits sidebar, prose styles, dark-mode parity (Constitution V) — the documented Starlight pattern for a custom route. *Rejected*: a bare Astro page (loses all Starlight chrome); injecting into the `docs` content collection (filesystem-bound to `src/content/docs`, can't host repo-root `content/`).
- **Build-time-generated sidebar group appended per tool, via a `.mjs` twin of the `.ts` tree-walk**: the page set is build-time-known but author-variable; a generated group enumerates it with no per-page maintenance while leaving the hand-authored entries untouched. The `.mjs` duplication is forced by the Astro config-eval boundary. *Rejected*: Starlight `autogenerate` (binds to `src/content/docs`); a manual list (defeats the dynamic route).
- **Render-side link rewriting, copy-side verbatim**: the CLI commits each page byte-for-byte; the rewrite happens in the render route. *Why*: the committed slice stays a faithful canonical copy (same discipline as the README slice), so the collector is a pristine mirror and the rewrite is re-derivable at any build.
- **Constitution PATCH (not spec-only)** (`x0br`): the *Tool-Page Depth* note explicitly said `docs/site` is "RESERVED and not yet implemented"; leaving that stale after activation would make the constitution assert a false live state, so a one-line PATCH (2.1.1 → 2.1.2) was warranted. *Rejected*: spec-only.

## Changelog

| Date | Change |
|------|--------|
| 2026-06-07 | Created (change `x0br`): activated the `docs/site/` documentation-tree pull + render — the §9 closed-set escape hatch (was RESERVED). Documents the **closed-set producer contract** (closure, externals-absolute-by-author, all-images-absolute, README→docs/site natural links); the **SITE-ABSOLUTE** link resolution (`rewriteDocsSiteLinks`/`rewriteReadmeDocsSiteLinks` in `extract-readme.ts`, slug-aware, trailing-slash-directory-proof) and the single-scanner rewrite guard; the report-only **closure lint** (`findClosureViolations`) + reserved-slug reporter in `extract-docs-site-cli.mjs` (never withhold); the **repo-tarball pull** sibling step in `scheduled-readme-refresh.yml` (codeload.github.com/.../tar.gz, main→master); the **first dynamic route** `src/pages/tools/[slug]/[...path].astro` (build-time `getStaticPaths` over `content/<slug>/site/**`, `@astrojs/markdown-remark` render inside `<StarlightPage>`, degrades cleanly on a missing tree); the tree-walk single-source `docs-site-tree.ts` + its `.mjs` sidebar twin (`docs-site-sidebar.mjs`, the config-eval split, verified to agree); and the known-limitation gaps (linked-image outer target, reference-style link defs). Constitution PATCHed 2.1.1 → 2.1.2 (Tool-Page Depth: docs/site now implemented); spec `readme-extraction-contract.md` §9 active + new §link-resolution/§closure-lint, §3 all-images-absolute, §8 extended. Sibling of [readme-extraction](./readme-extraction.md). |
