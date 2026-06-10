# Plan: Activate the `docs/site/` documentation tree

**Change**: 260607-x0br-activate-docs-site-tree
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

### Contract: `docs/site/` closed-set producer rules

#### R1: `docs/site/` closure
The `readme-extraction-contract.md` SHALL publish that `docs/site/` is a **fully self-contained set**: every *relative* link and image inside any `docs/site/**/*.md` file MUST resolve to a path **inside** `docs/site/` (no `..` segment may escape the set).

- **GIVEN** a tool author writing a `docs/site/advanced/hooks.md` page
- **WHEN** they link to another site page
- **THEN** the contract requires that link be a relative path resolving inside `docs/site/` (e.g. `../install.md`, `./detail.md`), never one that climbs above `docs/site/`.

#### R2: External links absolute-by-author
The contract SHALL require that any README or `docs/site/` link to a target *outside* the copied set (source files, `docs/specs/`, other repo internals) MUST be written as an absolute `https://…` URL by the author.

- **GIVEN** a README that wants to link a file shll.ai does not copy
- **WHEN** the author writes the link
- **THEN** the contract requires an absolute URL, so the author — not the machine — owns the "does this leave the site?" decision.

#### R3: All images absolute, everywhere
The contract's §3 image rule SHALL be refined so that **every** image reference in both `README.md` and `docs/site/**` MUST be an absolute URL; shll.ai vendors zero image binaries, and a relative image path is a closure violation (warned, R7).

- **GIVEN** a `docs/site/` page that references a diagram
- **WHEN** the author adds the image
- **THEN** the contract requires an absolute URL (e.g. `raw.githubusercontent.com/…`), and shll.ai copies no binary for it.

#### R4: README → `docs/site/` links written naturally
The contract SHALL state that a README link *into* a `docs/site/` page is written as the natural repo-relative path `docs/site/<path>.md`; shll.ai rewrites it on pull (R6).

- **GIVEN** a README linking `[guide](docs/site/install.md)`
- **WHEN** the slice is pulled
- **THEN** the contract specifies shll.ai rewrites the target (R6), so the author writes the natural path with no site-specific knowledge.

### Consumer: link resolution transforms

#### R5: docs/site intra-set link → SITE-ABSOLUTE resolution
<!-- rework: site-absolute link resolution (trailing-slash correctness) -->
`extract-readme.ts` SHALL expose a pure, exported, slug-aware transform `rewriteDocsSiteLinks(markdown, slug, mountPath)` that resolves each **relative** link/image URL target on a `docs/site/` page against the page's own DIRECTORY within the docs/site tree (`mountPath`, normalizing `.`/`..`), strips `.md`, and emits the SITE-ABSOLUTE path `/tools/<slug>/<resolved>` (+ preserved `#`/`?` suffix). Site-absolute (not a relative `.md`-strip) because the site serves pages as trailing-slash directories, so a relative target resolves one segment too deep. Closure (R1) guarantees relative targets are intra-set; a `..`-escape is reported by R8 and best-effort-clamped to the tool root here.

- **GIVEN** a `docs/site/` page at mount path `advanced/hooks` containing `[i](../install.md)` and `[s](./sibling.md)`
- **WHEN** `rewriteDocsSiteLinks(md, 'idea', 'advanced/hooks')` runs
- **THEN** the targets become `/tools/idea/install` and `/tools/idea/advanced/sibling` (resolved against the page's directory), while absolute URLs, prose, and code are untouched.

#### R6: README slice `docs/site/<p>.md` → SITE-ABSOLUTE `/tools/<slug>/<p>`
<!-- rework: site-absolute link resolution (trailing-slash correctness) -->
`extract-readme.ts` SHALL expose a pure, exported, slug-aware transform `rewriteReadmeDocsSiteLinks(markdown, slug)` that, on the README slice, rewrites a relative target of the form `docs/site/<p>.md` to the SITE-ABSOLUTE mount URL `/tools/<slug>/<p>` (the `docs/site/` prefix maps to the tool root, `.md` stripped, nested `<p>` subtree preserved, `#`/`?` suffix preserved), on link/image URL targets only. Relative targets NOT under `docs/site/` are left untouched (self-heal via R2).

- **GIVEN** a README slice containing `[guide](docs/site/install.md)`
- **WHEN** `rewriteReadmeDocsSiteLinks(md, 'idea')` runs
- **THEN** the target becomes `/tools/idea/install` (the mounted page; site-absolute so it is correct under trailing-slash serving — the README page is at `/tools/idea/readme/`), while nested paths (`docs/site/advanced/hooks.md` → `/tools/idea/advanced/hooks`) preserve their subtree shape.

#### R7: Rewrite guard — relative link/image targets only
Both transforms (R5, R6) MUST operate **only** on the `(...)` target of markdown links/images and the `href`/`src` of raw HTML, and MUST match `docs/site/` **only as a path-prefix of a RELATIVE target**. They MUST NOT alter absolute URLs containing the literal substring, prose, or fenced code that mentions the text, nor strip `.md` from anything that is not a relative link/image target.

- **GIVEN** a page with an absolute URL `https://github.com/sahil87/idea/blob/main/docs/site/x.md`, prose mentioning `docs/site`, and a relative link `[x](docs/site/x.md)`
- **WHEN** the transforms run
- **THEN** only the relative link target is rewritten; the absolute URL, the prose, and any code mention stay verbatim.

### Consumer: closure lint (report-only)

#### R8: Closure lint emits `::warning::`, never withholds
`extract-readme.ts` SHALL expose a pure, exported detector that, given a `docs/site/` file's path (relative to `docs/site/`) and its markdown, returns the relative link/image targets whose **resolved** path climbs OUT of `docs/site/` (a `..` escape) or that are relative images (which must be absolute per R3). The CLI SHALL emit a CI `::warning::` naming offending file + link, and the slice SHALL STILL be committed (mirrors the §7 report-only reporter exactly).

- **GIVEN** a `docs/site/install.md` containing a relative link `[x](../../secret.md)` and a relative image `![y](./diagram.png)`
- **WHEN** the lint runs
- **THEN** both are reported as closure violations, a `::warning::` naming the file + each link is emitted, and the page is still committed (exit 0).
- **AND GIVEN** an intra-set relative link `[z](./other.md)` and an absolute link `[a](https://x/y)`; **THEN** neither is reported.

### Consumer: fetch + mount the tree

#### R9: Tarball fetch of `docs/site/` tree per tool
`scheduled-readme-refresh.yml` SHALL, per tool and alongside the existing README fetch, fetch the repo tarball via `curl` of `https://codeload.github.com/sahil87/<repo>/tar.gz/<branch>` piped to `tar -xz` filtered to `*/docs/site/*`, with branch fallback main→master, committing the extracted tree to `content/<slug>/site/**` preserving subtree shape. Per-tool fetch-failure isolation is preserved; the README behavior is unchanged.

- **GIVEN** a tool repo with a `docs/site/install.md` and `docs/site/advanced/hooks.md`
- **WHEN** the scheduled refresh runs
- **THEN** `content/<slug>/site/install.md` and `content/<slug>/site/advanced/hooks.md` are committed (the `docs/site/` prefix collapsed to `site/`), the closure lint runs over each, and a tool with no `docs/site/` tree is skipped without failing the job.

#### R10: Multi-page dynamic-route render at `/tools/<slug>/<path>`
The site SHALL render each committed `content/<slug>/site/<path>.md` as its own page at URL `/tools/<slug>/<path>` via a single Astro dynamic route (`getStaticPaths` walking the committed tree at build time), rendered through the same build-time `@astrojs/markdown-remark` `createMarkdownProcessor` path `ReadmeSlice.astro` uses, with the link-resolution transform (R5) applied, inside Starlight's page layout (prose styles + dark-mode parity inherited).

- **GIVEN** `content/idea/site/advanced/hooks.md`
- **WHEN** the site builds
- **THEN** a page exists at `/tools/idea/advanced/hooks`, rendered build-time as static HTML (no client JS for primary content), inheriting Starlight prose styles in both themes.
- **AND GIVEN** a tool with no committed `content/<slug>/site/` tree; **THEN** the build emits no `docs/site` pages for it and succeeds (degrades to nothing/placeholder — same discipline as a missing README slice).

#### R11: Sidebar population for the variable page set
The new `/tools/<slug>/<path>` pages SHALL appear in the Starlight sidebar via a build-time-generated sidebar group derived from the committed `content/<slug>/site/**` tree, appended to each tool's existing hand-authored `items:` array in `astro.config.mjs`.

- **GIVEN** committed `content/idea/site/install.md` and `content/idea/site/advanced/hooks.md`
- **WHEN** the site builds
- **THEN** the `idea` sidebar group lists those pages (links to `/tools/idea/install`, `/tools/idea/advanced/hooks`) beneath the hand-authored Overview/Readme/Commands entries, with no per-page manual maintenance; a tool with no tree gets no extra entries.

### Spec & governance updates

#### R12: Contract `readme-extraction-contract.md` updates
`docs/specs/readme-extraction-contract.md` SHALL be updated: §9 flips RESERVED → active (closed-set model); new § for the closure contract (R1–R4); new § for link resolution (R5–R7 + rewrite guard); §3 refined to all-images-absolute (R3); new §7-style closure-lint § (R8); §8 extended for the tarball tree fetch + multi-page render (R9, R10); the §Extraction reference notes the new exported functions; the Changelog gains a dated `x0br` row.

- **GIVEN** the activated contract
- **WHEN** a tool-repo author or a future consumer change reads it
- **THEN** every producer obligation and consumer transform above is documented, §9 no longer says "NOT YET IMPLEMENTED", and the Changelog records change x0br.

#### R13: Constitution Tool-Page Depth note
The constitution's *Tool-Page Depth* note (which states `docs/site/*.md` is "RESERVED and not yet implemented") SHALL be patched to mark it implemented, with a version bump + changelog row per the Governance section.

- **GIVEN** the constitution at v2.1.1
- **WHEN** this change activates `docs/site/`
- **THEN** the *Tool-Page Depth* note reads as implemented (not reserved), and a 2.1.2 PATCH changelog row records change x0br.

### Non-Goals

- Conforming the 7 external tool repos' READMEs / `docs/site/` trees to this contract (forward, per-repo, one change per tool — out of scope; R8 lints but never blocks).
- A defensive consumer-side rewrite of leftover relative README links to GitHub blob URLs for not-yet-conformed repos (deferred — producer self-heal via R2 only).
- Vendoring image binaries (R3 keeps all images absolute; shll.ai copies zero binaries).
- Committing any tool's actual `docs/site/` slices in this change (they land over time via the daily pull, like README slices and help producers).

### Design Decisions

1. **Closed-set producer contract over a machine link-classifier**: the author declares site-internal vs. external by writing external links absolute; closure guarantees every relative link is intra-set, collapsing the consumer to two context-free transforms. *Why*: fewer moving parts, no copied-set manifest, and closure is lintable. *Rejected*: an A/B link classifier with a copied-set manifest (the bulk of the original effort; closure deletes it).
2. **All images absolute everywhere over vendoring**: extends §3's "reference, don't copy". *Why*: image links can never break on the move, the lint only polices markdown links, one uniform rule. *Rejected*: build-time image vendoring (deferred — needs no repo-side change, can be added later).
3. **Repo tarball fetch over the GitHub contents-API** (intake #11): one `curl` of `codeload.github.com/.../tar.gz/<branch>` piped to `tar -xz` filtered to `*/docs/site/*`. *Why*: one request per tool, no API rate limit, no token, no N+1; branch fallback mirrors the README curl. *Rejected*: recursive contents-API listing (N+1 fetches, rate-limited, needs a token).
4. **Single Astro dynamic route over a committed MDX stub per page** (intake #12): a `src/pages/tools/[slug]/[...path].astro` with `getStaticPaths` walking `content/<slug>/site/**`. *Why*: handles a variable, author-controlled page set with zero per-page maintenance — the first dynamic route in the codebase (all static stubs today), accepted as the only approach that fits. *Rejected*: a committed MDX stub per `docs/site` file (re-introduces the per-page maintenance the dynamic route eliminates).
5. **Render inside Starlight's `<StarlightPage>` route component**: `@astrojs/starlight/components/StarlightPage.astro` wraps the rendered HTML in Starlight's full layout. *Why*: inherits sidebar, prose styles, and dark-mode parity (Constitution V) for free — the official Starlight pattern for custom routes in a content-collection site (Starlight owns routing, so a bare `src/pages` route otherwise has no chrome). *Rejected*: a bare Astro page (loses all Starlight chrome/theme); injecting docs/site pages into the `docs` content collection (the collection is filesystem-bound to `src/content/docs`, can't host repo-root `content/` files).
6. **Build-time-generated sidebar group appended per tool** (open question resolved): a helper walks `content/<slug>/site/**` at config-evaluation time and produces sidebar `items`, appended to each tool's existing hand-authored `items:` array in `astro.config.mjs`. *Why*: the page set is build-time-known but author-variable; a generated group enumerates it with no per-page maintenance while leaving the hand-authored Overview/Readme/Commands entries untouched. *Rejected*: Starlight `autogenerate` (binds to `src/content/docs` filesystem, can't see repo-root `content/`); a manually-maintained list (defeats the dynamic route's zero-maintenance goal).
7. **Constitution PATCH (not spec-only)**: the *Tool-Page Depth* note explicitly says `docs/site` is "RESERVED and not yet implemented" — leaving that stale after activation contradicts the live state, so a one-line PATCH + version bump is warranted. *Why*: the constitution names the reserved status directly; the spec update alone would leave the constitution wrong. *Rejected*: spec-only (leaves the constitution asserting a false "not yet implemented").

## Tasks

### Phase 1: Setup

- [x] T001 Read `docs/specs/index.md` and `docs/memory/index.md` to confirm the documentation landscape before editing the contract <!-- R12 -->

### Phase 2: Core Implementation — pure transforms + detector (extract-readme.ts) + tests

- [x] T002 Add exported pure functions to `sites/astro-starlight-terminal1/src/lib/extract-readme.ts`: `rewriteDocsSiteLinks(markdown, slug, mountPath)` (R5: resolve relative link/image targets against the page mount path → SITE-ABSOLUTE `/tools/<slug>/<resolved>`) and `rewriteReadmeDocsSiteLinks(markdown, slug)` (R6: `docs/site/<p>.md` → `/tools/<slug>/<p>`), both honoring the rewrite guard (R7) — operate only on markdown link/image `(...)` targets + raw-HTML `href`/`src`, relative-only, never absolute URLs / prose / code; `#`/`?` suffix preserved <!-- R5 --> <!-- rework: site-absolute link resolution (trailing-slash correctness) — done -->
- [x] T003 Add exported pure detector `findClosureViolations(relPath, markdown)` to `extract-readme.ts` (R8): return relative link/image targets whose resolved path escapes `docs/site/` (`..` climb above root) or that are relative images (must be absolute) <!-- R8 -->
- [x] T004 Pin the new transforms + detector with native `node --test` cases in `sites/astro-starlight-terminal1/scripts/extract-readme.test.mjs`: SITE-ABSOLUTE resolution of `./`/`../`/bare relative targets against the mount path (R5); README `docs/site/<p>.md` → `/tools/<slug>/<p>` + nested-path preservation + anchor (R6); rewrite guard — absolute URL with `docs/site` untouched, prose/code mention untouched, only relative targets rewritten, raw-HTML href/src handled, link-TEXT `.md` preserved (R7); closure detector — `..`-escape flagged (incl. nested), relative image flagged, intra-set link clean, absolute link clean, `..`-escape rewriter-clamp interaction (R8) <!-- R5 --> <!-- rework: site-absolute link resolution (trailing-slash correctness) — done -->

### Phase 3: Integration — CLI, dynamic route, render, sidebar, workflow

- [x] T005 Add a CLI `sites/astro-starlight-terminal1/scripts/extract-docs-site-cli.mjs` that, given a slug and an extracted `docs/site/` tree dir, copies each `*.md` into `content/<slug>/site/<path>.md`, runs `findClosureViolations` per file emitting `::warning::` on violations (never withholding — exit 0), single-sourced from `extract-readme.ts` <!-- R8 -->
- [x] T006 Create the dynamic route `sites/astro-starlight-terminal1/src/pages/tools/[slug]/[...path].astro`: `getStaticPaths` walks `content/<slug>/site/**` (repo-root cross-boundary read via `repo-root.ts`) and threads each page's `slug` + `mountPath` into props, renders each file through `createMarkdownProcessor` with `rewriteDocsSiteLinks(raw, slug, mountPath)` (R5, site-absolute) applied, wrapped in `<StarlightPage>` for Starlight layout/prose/dark-mode (R10). Tree-walk single-sourced in `src/lib/docs-site-tree.ts`. Also wire `ReadmeSlice.astro` to pass its `tool` slug to `rewriteReadmeDocsSiteLinks(raw, tool)` <!-- R10 --> <!-- rework: site-absolute link resolution (trailing-slash correctness) — re-wired both consumers to pass the slug; done -->
- [x] T007 Add a build-time sidebar helper `sites/astro-starlight-terminal1/src/lib/docs-site-sidebar.mjs` that walks `content/<slug>/site/**` and returns sorted Starlight sidebar `items` (links to `/tools/<slug>/<path>`), then wire it into `astro.config.mjs` — append each tool's generated items to its existing hand-authored `items:` array (R11) <!-- R11 -->
- [x] T008 Extend `.github/workflows/scheduled-readme-refresh.yml`: per tool, `curl` the repo tarball from `codeload.github.com/sahil87/<repo>/tar.gz/<branch>` (main→master fallback) piped to `tar -xz` filtered to `*/docs/site/*`, run `extract-docs-site-cli.mjs` (lint + copy to `content/<slug>/site/**`), `git add -A content/`, preserving README behavior and per-tool fetch-failure isolation (R9) <!-- R9 -->

### Phase 4: Spec & governance

- [x] T009 Update `docs/specs/readme-extraction-contract.md`: flip §9 RESERVED→active; new closure-contract § (R1–R4); new link-resolution § (R5–R7 + rewrite guard); refine §3 to all-images-absolute (R3); new closure-lint § (R8); extend §8 for the tarball tree fetch + multi-page render (R9, R10); update §Extraction reference with the new exported functions; add a dated `x0br` Changelog row; updated `docs/specs/index.md` description <!-- R12 -->
- [x] T010 Patch `fab/project/constitution.md` *Tool-Page Depth* note: mark `docs/site/*.md` implemented (was RESERVED); bump version 2.1.1→2.1.2 and add a PATCH changelog row referencing change x0br <!-- R13 -->

### Phase 5: Verification

- [x] T011 Run the scoped new/changed tests first (`node --test scripts/extract-readme.test.mjs` from `sites/astro-starlight-terminal1`), then `pnpm build` to confirm the dynamic route + render compile and the build stays green with no committed `content/<slug>/site/` trees (degrades cleanly). Also verified the positive path (fixture build renders nested pages + R5 rewrite + absolute-URL preservation) <!-- R10 -->

## Execution Order

- T002, T003 block T004 (tests pin the functions) and T005/T006 (consumers import them)
- T006 and T007 both depend on the committed-tree shape (`content/<slug>/site/**`) but are independent of each other
- T011 runs last (after all implementation)

## Acceptance

### Functional Completeness

- [x] A-001 R1: The contract publishes `docs/site/` closure (every relative link/image resolves inside `docs/site/`, no `..` escape). — §9.1 rule 1 (contract:386-388).
- [x] A-002 R2: The contract requires external links be absolute-by-author. — §9.1 rule 2 (contract:389-393).
- [x] A-003 R3: §3 is refined so all images everywhere are absolute; shll.ai vendors zero binaries; relative images are a closure violation. — §3 rewritten (contract:118-156) + GIVEN/WHEN/THEN.
- [x] A-004 R4: The contract states README→`docs/site/` links are written naturally and rewritten on render to a site-absolute path. — FIXED (rework): §9.1 rule 4 now reads "rewrites it on render to the site-absolute path `/tools/<slug>/<path>`", and `ReadmeSlice.astro` now calls `rewriteReadmeDocsSiteLinks(raw, tool)` before `processor.render` (the prior must-fix: it rendered raw). Build-fixture proof confirms `dist/tools/idea/readme/index.html` carries `href="/tools/idea/install"`.
- [x] A-005 R5: `rewriteDocsSiteLinks(md, slug, mountPath)` resolves relative link/image targets against the page mount path to a SITE-ABSOLUTE `/tools/<slug>/<resolved>`. — extract-readme.ts; test-pinned; verified at render (dist `href="/tools/idea/install"`, `/tools/idea/advanced/sibling"`).
- [x] A-006 R6: `rewriteReadmeDocsSiteLinks(md, slug)` rewrites `docs/site/<p>.md` → site-absolute `/tools/<slug>/<p>`, preserving nested subtree shape + anchors. — function correct + test-pinned AND wired at render (ReadmeSlice.astro passes `tool`); build-fixture proof confirms the resolved href.
- [x] A-007 R7: Both transforms touch only relative link/image targets; absolute URLs containing `docs/site`, prose, and code mentions are untouched. — guard verified incl. adversarial cases. Known limitations honestly documented in the spec §link resolution: (a) the OUTER target of a linked image `[![alt](img)](page.md)` and (b) reference-style `[id]: ./x.md` are unhandled (rare; deferred) — these are coverage gaps, not guard violations.
- [x] A-008 R8: `findClosureViolations` flags `..`-escaping relative links and relative images; the CLI emits `::warning::` and still commits the slice (exit 0). — extract-readme.ts:609-653 + CLI:103-117 (exit 0).
- [x] A-009 R9: The workflow fetches each tool's `docs/site/` tree via the repo tarball (main→master fallback), commits `content/<slug>/site/**`, preserves README behavior and per-tool fetch-failure isolation. — workflow step + `git add -A content/`.
- [x] A-010 R10: Each `content/<slug>/site/<path>.md` renders as its own build-time page at `/tools/<slug>/<path>` via the dynamic route, inside Starlight layout. — verified with throwaway fixture (pages built at /tools/idea/install, /advanced/hooks, /other).
- [x] A-011 R11: The new pages appear in the sidebar via a build-time-generated group appended per tool, with no per-page maintenance. — astro.config.mjs + docs-site-sidebar.mjs.
- [x] A-012 R12: `readme-extraction-contract.md` is updated per R12 (§9 active, new sections, §3 refined, Changelog row). — FIXED (rework): §link resolution rewritten to the SITE-ABSOLUTE model with updated GIVEN/WHEN/THEN, §9.1 rule 4 reconciled to "rewrites on render to `/tools/<slug>/<path>`", §Extraction reference updated to the slug-aware signatures, §9.2 notes the CLI reserved-slug `::warning::`, a 2026-06-07 rework Changelog row added, and Known limitations (a)/(b) recorded. Spec now matches the code (machine-anchor restored).
- [x] A-013 R13: The constitution *Tool-Page Depth* note marks `docs/site/` implemented, with a 2.1.2 PATCH changelog row. — constitution.md:32 + 2.1.2 changelog row; well-formed PATCH.

### Behavioral Correctness

- [x] A-014 R7: A relative `[x](docs/site/x.md)` is rewritten while `https://github.com/sahil87/idea/blob/main/docs/site/x.md` and prose/code mentioning `docs/site` stay verbatim (test-pinned). — test:458-472, passing.
- [x] A-015 R10: A tool with no committed `content/<slug>/site/` tree emits no docs/site pages and the build still succeeds (degrades cleanly). — verified: clean build = 33 pages, no docs/site pages.

### Scenario Coverage

- [x] A-016 R5: A `docs/site` page link resolves site-absolute against the mount path (`../install.md` from `advanced/hooks` → `/tools/idea/install`; `./sibling.md` → `/tools/idea/advanced/sibling`) (test exists). — extract-readme.test.mjs R5 cases.
- [x] A-017 R6: A README link `[guide](docs/site/install.md)` → `/tools/idea/install` (site-absolute), test exists AND wired at render. — extract-readme.test.mjs R6 cases + build-fixture proof (dist href).
- [x] A-018 R8: An intra-set relative link and an absolute link are NOT flagged; a `..`-escape and a relative image ARE flagged (test exists). — test:502-543.

### Edge Cases & Error Handling

- [x] A-019 R9: The tarball fetch isolates per-tool failure (a repo with no `docs/site/` tree, or a 404 on both branches, is skipped without failing the job or other tools). — workflow branch loop + `site_failed` accumulation, never fails the job.
- [x] A-020 R8: The closure lint never withholds a slice — a violating page is still committed with a `::warning::`. — CLI:103-117 warns then writes; exit 0.

### Code Quality

- [x] A-021 Pattern consistency: New code follows the pure/total/dependency-free discipline and naming of `extractReadme`/`findUnknownTokens`; the dynamic route reuses `repo-root.ts` + `createMarkdownProcessor` like `ReadmeSlice.astro`; the CLI single-sources from `extract-readme.ts` like `extract-readme-cli.mjs`. — consistent.
- [x] A-022 No unnecessary duplication: the repo-root ascent (`repo-root.ts`), the markdown processor, and the closure/transform logic are reused, not reimplemented. — route reuses repo-root.ts; closure/transform single-sourced. NOTE: tree-walk duplicated across docs-site-tree.ts (.ts) and docs-site-sidebar.mjs (.mjs) — justified by config-eval vs runtime boundary, but unpinned (should-fix #6).
- [x] A-023 Readability over cleverness: transforms are scoped, tested, and commented at the rewrite-guard boundary (code-quality.md Principle). — strong doc comments.
- [x] A-024 No God functions: each transform/detector stays focused and under the codebase's typical function size (code-quality.md Anti-Pattern). — all functions small/focused.
- [x] A-025 No magic strings: the `docs/site/` prefix, the slug list, and the tarball URL shape are named/derived, not scattered as bare literals (code-quality.md Anti-Pattern). — `DOCS_SITE_PREFIX` constant; URL templated. NOTE: the 7-tool `tools=(...)` slug list is duplicated between the README step and the new docs/site step in the workflow (nice-to-have).

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`

## Deletion Candidates

- None — this change adds new functionality (a sibling docs/site pull + render path) without making existing code redundant. The README slice path, `extractReadme`/`findUnknownTokens`, `ReadmeSlice.astro`, and `extract-readme-cli.mjs` all remain in use; the new functions and files are additive.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Closed-set producer contract (R1–R4) + two consumer transforms (R5–R6) + rewrite guard (R7) + report-only closure lint (R8), per intake assumptions #2–#7 | Settled in intake (Certain #2–#7); not re-litigated | S:95 R:55 A:90 D:88 |
| 2 | Certain | Repo tarball fetch (R9) and single Astro dynamic route (R10), per intake assumptions #11–#12 | Settled in `/fab-clarify` (Certain #11, #12) | S:95 R:55 A:55 D:50 |
| 3 | Certain | Defensive README rewrite for not-yet-conformed repos deferred (producer self-heal only) | Settled in `/fab-clarify` (Certain #13) | S:90 R:65 A:55 D:55 |
| 4 | Confident | Render via Starlight's `<StarlightPage>` route component (not a bare Astro page, not the docs collection) | Starlight owns routing in this content-collection site; `StarlightPage` is the documented way to give a custom `src/pages` route full Starlight chrome + prose + dark-mode parity (Constitution V). The docs collection is filesystem-bound to `src/content/docs` and cannot host repo-root `content/` files. One obvious fit; moderate reversibility (swap the wrapper) | S:80 R:65 A:80 D:78 |
| 5 | Confident | Sidebar populated by a build-time helper that walks the committed tree and appends a generated group per tool in `astro.config.mjs` (open question resolved) | The intake left this open as a genuine plan decision. The page set is build-time-known but author-variable; a generated group is the only option that enumerates it with zero per-page maintenance while preserving the hand-authored entries. Starlight `autogenerate` binds to `src/content/docs` (can't see repo-root `content/`); a manual list defeats the dynamic route. Reversible (sidebar config edit) | S:70 R:70 A:75 D:72 |
| 6 | Confident | Constitution PATCH (2.1.1→2.1.2) to mark `docs/site/` implemented, not spec-only | The intake left this a plan decision. The *Tool-Page Depth* note explicitly asserts `docs/site` is "RESERVED and not yet implemented" — leaving it stale would make the constitution assert a false live state, so a one-line PATCH per Governance is warranted | S:78 R:80 A:82 D:80 |
| 7 | Confident | CLI is a NEW sibling script (`extract-docs-site-cli.mjs`) rather than extending `extract-readme-cli.mjs` | The README CLI is single-file-per-tool (one README in, one slice out); the docs/site tree is a set with a closure lint per file — a distinct shape. A sibling keeps each CLI single-purpose (mirrors the sibling-workflow discipline). Reversible (merge later if warranted) | S:80 R:75 A:80 D:75 |
| 8 | Certain | Link resolution rewrites to a SITE-ABSOLUTE path `/tools/<slug>/<resolved>` (transforms are slug-aware; docs/site transform also mount-path-aware), NOT the earlier relative-prefix forms | User-decided in the `x0br` review rework. The relative form (`./<p>` / bare `.md`-strip) resolved one segment too deep under trailing-slash directory serving (README at `/tools/<slug>/readme/` + `./install` → `/tools/<slug>/readme/install`, but the page is at `/tools/<slug>/install/`). Site-absolute is serving-model-proof and matches Starlight's own absolute sibling links. Accepted that the transforms are no longer slug-agnostic | S:98 R:50 A:95 D:95 |
| 9 | Confident | Reserved-slug collision is a report-only `::warning::` from the docs/site CLI (kept from the prior interim fix), not a publish gate | Mirrors the §closure lint + §7 reporter posture exactly (canonical wins, never withhold); the page still commits and the drift is visible in the run log. Consistent with assumptions #7 (intake) closure-lint discipline | S:88 R:75 A:90 D:85 |
| 10 | Confident | Two link shapes documented as Known limitations (not fixed): (a) the OUTER target of a linked image `[![alt](img)](page.md)`, (b) reference-style `[id]: ./x.md` | Review flagged both; verified still unhandled after the rework. Fixing robustly needs nested-bracket parsing that risks the rewrite-guard's precision; both are rare in docs/site pages and the canonical page still commits + renders. Deferred per the rework instruction (don't expand scope unless trivial); the spec is honest about what is rewritten | S:85 R:70 A:85 D:80 |

10 assumptions (4 certain, 6 confident, 0 tentative).
