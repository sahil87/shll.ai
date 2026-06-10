# Intake: Activate the `docs/site/` documentation tree

**Change**: 260607-x0br-activate-docs-site-tree
**Created**: 2026-06-07
**Status**: Draft

## Origin

> Activate the `docs/site/` escape hatch (`readme-extraction-contract.md` §9, currently **RESERVED / NOT YET IMPLEMENTED**) — make shll.ai pull, link-resolve, and render each tool's `docs/site/*.md` multi-file documentation tree, in addition to the existing single `README.md` slice. This change delivers (a) the forward **CONTRACT** the 7 external tool repos will follow, and (b) shll.ai's **CONSUMER** implementation.

**Interaction mode**: conversational. This `/fab-new` was preceded by a `/fab-discuss` session that designed the link-resolution model from first principles. The key decisions were reached as follows:

1. **Verified the premise** — the fab-kit repo's `docs/site/README.md` exists and self-describes as "§9 pull path is RESERVED / NOT YET IMPLEMENTED"; a repo-wide grep confirmed shll.ai has **zero** `docs/site` references. The §9 RESERVED claim is accurate.
2. **Surfaced the real problem** — relative links. `extract-readme.ts` does **no URL rewriting** (its only `.replace()` calls are mermaid/theme-image strips + whitespace). So a README relative link like `content/idea/README.md:85` `[overview.md](docs/specs/overview.md)` is copied verbatim and resolves to a 404 at `/tools/idea/docs/specs/overview.md` on the live site **today**. Importing a multi-file tree makes this central, not incidental.
3. **Explored "no rewrite"** and proved it a dead end: links to *non-copied* files can't be saved by any filesystem arrangement (target isn't on shll.ai); links between *copied* files could only be saved by mirroring GitHub's `docs/site/...` path into the URL space — which sacrifices clean separate-page URLs and still leaves the first class broken.
4. **Found the closed-set insight** — if we own the producer convention, closure (`docs/site/` is self-contained) + "external links absolute-by-author" moves the hard decision (does this link leave the site?) from the machine at copy-time to the **author at write-time**, collapsing the consumer to two trivial, context-free transforms. This is strictly simpler and more robust than an A/B link classifier with a copied-set manifest.
5. **Agreed the exact rules** (user's words): "doc/site being fully self-contained is a good rule"; README image links "always be absolute"; README→`docs/site` links rewritten by "replace `docs/site` with `.`". Plus the agreed refinement: **all** images absolute everywhere (README + `docs/site/`), so shll.ai vendors zero binaries.
6. **Scoped the boundary** (user's words): "what you are creating right now using /fab-new is the contract for the other repos to follow … in one change for every tool each." → Conforming the 7 external repos is **out of scope**; this change publishes the contract + builds the consumer only.

## Why

**The problem.** The constitution's *Tool-Page Depth* principle (v2.1.0/2.1.1) commits shll.ai to hosting deep, *mechanically-synced* per-tool documentation. Today that sync handles exactly one file per tool: the `README.md` slice. But a tool's real documentation is "a small README plus a few referenced markdowns" (user's framing) — install guides, deep-dives, format contracts — that the README links to. shll.ai cannot currently absorb those linked pages; §9 of the contract reserved a `docs/site/` mechanism for them but explicitly left it unimplemented. The tool repos literally cannot publish their depth to the site.

**The consequence if we don't.** Tool pages stay shallow (README slice only), and the documents a README points at remain GitHub-only — defeating the *Tool-Page Depth* value ("a visitor to `shll.ai/<tool>` SHOULD understand the tool deeply on the site without clicking out"). Worse, relative links in pulled prose are **already silently broken** (the line-85 404 class); importing more linked content without solving link-resolution would multiply broken links.

**Why this approach over alternatives.**

- **Closed-set producer convention vs. machine link-classifier.** An earlier design classified every link at copy time (A → rewrite to a GitHub `blob` URL; B → rewrite to a site slug) using a copied-set manifest. The closed-set rule eliminates the classifier entirely: the author declares site-internal vs. external by writing external links as absolute URLs, and closure guarantees every *relative* link is intra-set. The machine is left with two context-free transforms. Fewer moving parts, no manifest, and the invariant (`docs/site/` is self-contained) is **lintable** — we can mechanically verify producer conformance and warn on violation. The earlier classifier was the bulk of the original effort estimate; closure deletes it.
- **All-images-absolute vs. vendoring.** Making every image (README + `docs/site/`) an absolute URL means shll.ai copies **zero binaries**, image links can never break on the move, and the closure lint only has to police markdown links. Uniform, one rule for images regardless of source. This extends §3's existing "reference, don't copy" stance to its logical conclusion.
- **Separate pages vs. one concatenated page** (user decision #2). Each `docs/site/<path>.md` becomes its own page at `/tools/<slug>/<path>`, preserving the subtree shape — so if the tool author judged a concept worth its own page, shll.ai mirrors that page-breaking intent with native URLs.

## What Changes

This change has two deliverables: **(A)** spec/contract updates to `docs/specs/readme-extraction-contract.md` (the forward contract the 7 repos will follow), and **(B)** shll.ai's consumer implementation (extraction lib, CLI, pull workflow, render component, pages). Each is a *sibling extension* of the existing single-README pull path; nothing about the README slice's data kind is removed.

### A1. Producer contract — the `docs/site/` closed-set rules

The contract `docs/specs/readme-extraction-contract.md` is updated to publish these producer obligations (the rules each tool repo will satisfy in its own later, per-repo change):

1. **Closure.** `docs/site/` is a **fully self-contained set**: every *relative* link and image inside any `docs/site/**/*.md` file MUST resolve to another path **inside** `docs/site/`. No `..` segment may escape `docs/site/`.
2. **External links absolute-by-author.** A README (or `docs/site/` page) link to anything *outside* the copied set — source files, `docs/specs/`, the tool's other internals — MUST be written as an absolute `https://…` URL by the author. The author makes the "does this link leave the site?" decision explicitly, by hand.
3. **All images absolute, everywhere.** Every image reference in both `README.md` and `docs/site/**` MUST be an absolute URL (`https://…`, e.g. `raw.githubusercontent.com/…`). shll.ai copies no image binaries; relative image paths are a closure violation (warned, §A4).
4. **README → `docs/site/` links written naturally.** A README link *into* a `docs/site/` page is written as the natural repo-relative path `docs/site/<path>.md`; shll.ai rewrites it on pull (§A3).

### A2. Consumer — fetch + mount the `docs/site/` tree

`scheduled-readme-refresh.yml` (the existing daily pull) gains a sibling step per tool: in addition to fetching `README.md`, fetch the tool's `docs/site/` **tree** (expected shape: a handful of markdown files, possibly nested). The fetched tree is extracted and committed under the repo-root collector, e.g. `content/<slug>/site/<path>.md`, preserving the subtree shape. Render-side, each `docs/site/<path>.md` is mounted at the URL `/tools/<slug>/<path>` (the `docs/site/` prefix stripped, internal structure preserved):

```
docs/site/install.md          → /tools/<slug>/install
docs/site/advanced/hooks.md   → /tools/<slug>/advanced/hooks
```

Each file becomes its **own page** (separate pages — decision #2), a sibling of the existing `overview` / `readme` / `commands` pages. Rendering reuses the build-time `@astrojs/markdown-remark` path proven by `ReadmeSlice.astro` (Constitution I: build-time, no client JS; Constitution VI: no new dependency).

### A3. Consumer — link resolution (the entire rewrite surface, deliberately tiny)

Two context-free transforms, applied to **link/image URL targets only** — never to prose or code that merely mentions the literal text, and never to absolute URLs:

- **`docs/site/` pages (intra-set links).** Strip the trailing `.md` from relative link targets. Closure (§A1.1) guarantees every relative link is intra-set, so this is unconditional. Example: a page links `[hooks](./advanced/hooks.md)` → `[hooks](./advanced/hooks)`, which resolves against the page's base correctly.
- **README slice (links into `docs/site/`).** Rewrite the relative-target **prefix** `docs/site/` → `./` **and** strip the trailing `.md`. Example: `[guide](docs/site/install.md)` → `[guide](./install)`, which resolves against the README page base `/tools/<slug>/` to `/tools/<slug>/install` — matching the mounted page.

**Rewrite guard (critical correctness boundary).** Both transforms operate **only** on link/image URL targets — the `(...)` of markdown `[text](target)` and `![alt](target)`, and `href`/`src` in raw HTML — and match `docs/site/` **only as a path-prefix of a RELATIVE target**. They MUST NOT touch:
- absolute URLs containing the literal substring (e.g. `https://github.com/sahil87/idea/blob/main/docs/site/x.md` stays verbatim),
- prose or fenced code that mentions the text `docs/site`,
- the `.md` of anything that is not a relative link target.

This is "rewrite the relative-link prefix," **not** a blind string replace. It lives in `extract-readme.ts` as a pure, tested function (same single-machine-anchor discipline as `extractReadme`/`findUnknownTokens`).

### A4. Consumer — closure lint (report-only)

The puller lints each `docs/site/` tree for closure: any relative link/image whose resolved path climbs **out** of `docs/site/` (a `..` escape, or a relative image that should be absolute per §A1.3) emits a CI `::warning::` naming the offending file + link — and the slice is **still committed** (canonical wins; never withhold). This mirrors the existing §7 `vn39` divergence-reporter pattern exactly: a report-only repo-level lint, not a publish gate. It turns "self-contained" from a hope into a checked invariant and tells the tool author precisely which link broke the rule.

### A5. Spec updates (the contract IS this change's primary artifact)

`docs/specs/readme-extraction-contract.md`:
- **§9** flips from RESERVED / NOT YET IMPLEMENTED → **active**, documenting the closed-set model.
- **New §** — `docs/site/` closure contract (producer rules A1.1–A1.4).
- **New §** — link resolution (the two consumer transforms + the relative-prefix-only rewrite guard).
- **§3 image rule** refined: all images absolute everywhere (README + `docs/site/`); shll.ai vendors zero binaries.
- **New §7-style closure lint** (report-only `::warning::` on escape; never withhold).
- **§8 pull model** extended: fetch the `docs/site/` tree (multi-file), multi-page render at `/tools/<slug>/<path>`, separate pages preserving subtree shape, sibling of the README slice.
- Constitution **may** need a one-line note under *Tool-Page Depth* that `docs/site/` is now implemented (was "RESERVED and not yet implemented"). To be decided in the plan — this could be a constitution PATCH or simply left to the spec.

### A6. Out of scope (explicit boundary)

Conforming the 7 external tool repos' READMEs and `docs/site/` trees to this contract is a **forward, per-repo, gradual activity — one change per tool, later — NOT part of this change**. This mirrors the boundary the spec already sets for README/help conformance. shll.ai degrades to a **neutral placeholder** for any tool with no `docs/site/` tree (or whose first pull has not succeeded), exactly as the README slice does today. No external repo is touched here.

### A7. Known side benefit (noted, not the goal)

The same `.md`-strip + relative-prefix discipline retroactively explains the existing broken README relative links (e.g. `content/idea/README.md:85`). Under the new contract, README→external links become absolute-by-author (producer rule A1.2), so they **self-heal** when each repo conforms. Whether to *also* add a defensive consumer-side rewrite for not-yet-conformed READMEs (so today's 404s are masked before the repos conform) is a **design question deferred to the plan** — not assumed here.

## Affected Memory

- `conventions/readme-extraction`: (modify) The existing README-extraction convention memory gains the `docs/site/` tree pull, the closed-set producer rules, the two link-resolution transforms + rewrite guard, the closure lint, and the multi-page mount. Created/updated at hydrate.
- `conventions/docs-site-tree`: (new) — *possible* dedicated memory file for the `docs/site/` mount + link-resolution model if the README-extraction memory grows too large to hold both cleanly. Decision deferred to hydrate; may instead be a section within `readme-extraction`.

## Impact

**shll.ai code (the live site, `sites/astro-starlight-terminal1/`):**
- `src/lib/extract-readme.ts` — add the link-resolution transforms (the `.md`-strip for `docs/site/` pages; the `docs/site/`→`./` + `.md`-strip for the README) and the closure-lint detector, as pure tested functions. The existing `extractReadme`/`findUnknownTokens` are the pattern.
- `scripts/extract-readme-cli.mjs` (or a sibling CLI) — handle a *set* of `docs/site/` inputs in addition to the single README; emit the closure-lint `::warning::`.
- `src/components/ReadmeSlice.astro` (or a sibling component) — render a `docs/site/` page; reuse the cross-boundary `help/`-anchored `import.meta.url` ascent + build-time markdown processor.
- New per-tool page generation for `/tools/<slug>/<path>` (mirroring the existing `readme.mdx` page wiring) — exact mechanism (static MDX stubs vs. dynamic route) is a plan decision.
- `scripts/extract-readme.test.mjs` — pin the new transforms + closure detector (Test Integrity: tests conform to the contract).

**Repo-level:**
- `.github/workflows/scheduled-readme-refresh.yml` — add the `docs/site/` tree fetch (a directory listing, not a single fixed path — likely the GitHub contents API or a tarball fetch; mechanism is a plan decision), extending per-tool fetch-failure isolation to the tree.
- `content/<slug>/site/**` — new repo-root collector subtree for committed `docs/site/` slices.
- `docs/specs/readme-extraction-contract.md` — the contract updates (A5).
- Possibly `fab/project/constitution.md` — a one-line *Tool-Page Depth* note (plan decision).

**Dependencies:** none new. `@astrojs/markdown-remark` is already declared and used by `ReadmeSlice.astro` (Constitution VI).

**Constitution touchpoints:** I (Static-First/Zero-Runtime — all render stays build-time, no client JS for primary content); V (Dark Mode Parity — rendered pages inherit Starlight prose styles like the README slice); VI (Minimal Dependencies — reuse existing dep, add none); *Tool-Page Depth* (this IS the deep-synced-content mechanism, mechanically synced from canonical source, never hand-copied); II/III (collector survives a live-site swap).

## Open Questions

**Resolved in `/fab-clarify` (2026-06-07) — recorded here for traceability:**

- ~~**Tree-fetch mechanism.**~~ **RESOLVED → repo tarball.** One `curl` of `codeload.github.com/sahil87/<repo>/tar.gz/<branch>` piped to `tar -xz` filtered to `*/docs/site/*`; branch fallback main→master mirrors the existing README `curl`. No contents-API, no rate limit, no token, no N+1 fetches. (Assumption #11.)
- ~~**Page generation mechanism.**~~ **RESOLVED → Astro dynamic route.** A single `getStaticPaths` route walks the committed `content/<slug>/site/**` tree at build time and renders one page per file via the same `@astrojs/markdown-remark` path `ReadmeSlice` uses. Introduces the first dynamic-routing pattern in the codebase (all pages are static MDX stubs today) — accepted, as it's the only approach that handles a variable, author-controlled page set without a stub-per-page. (Assumption #12.)
- ~~**Defensive README rewrite for non-conformed repos** (A7).~~ **RESOLVED → defer.** Rely on producer self-heal (rule A1.2). README→external relative links 404 on tool readme pages until each repo conforms; accepted to keep the contract the single source of truth with no machine re-guessing of "external." (Assumption #13.)

**Still open — plan decisions:**

- **Sidebar/navigation.** The Starlight sidebar is **hand-authored per tool** today (explicit `items` arrays in `astro.config.mjs`, not autogenerated). The dynamic route (resolved above) creates pages whose set is author-controlled and variable, so static per-tool sidebar entries won't enumerate them automatically. How do the new `/tools/<slug>/<path>` pages appear in the sidebar — a build-time-generated sidebar section from the committed tree, Starlight `autogenerate` for the tools subtree, or an explicit-but-manually-maintained list? → Plan decision (this is the main remaining wiring question the dynamic-route choice surfaces).
- **Constitution note.** Does *Tool-Page Depth* need a PATCH to mark `docs/site/` implemented (it currently says "RESERVED and not yet implemented"), or is the spec update sufficient? → Plan decision.

## Clarifications

### Session 2026-06-07

| # | Question | Answer |
|---|----------|--------|
| 11 | Tree-fetch mechanism: repo tarball vs. recursive contents-API? | Repo tarball — one `curl` of `codeload.github.com/.../tar.gz`, filter to `docs/site/`. No API rate limit, no token, no N+1 fetches. |
| 12 | Page generation: Astro dynamic route over the tree vs. committed MDX stub per page? | Dynamic route — single `getStaticPaths` walking `content/<slug>/site/**`, one page per file. Handles a variable author-controlled page set with no per-page maintenance; first dynamic-route pattern in the codebase (accepted). |
| 13 | Add a defensive consumer-side README rewrite for not-yet-conformed repos, or defer? | Defer — rely on producer self-heal (rule A1.2). Keeps the contract the single source of truth; README→external relative links 404 until each repo conforms (accepted). |

> Surfaced one downstream wiring question (now in Open Questions): the sidebar is hand-authored per tool today, so the dynamic route needs a sidebar-population strategy — a plan decision.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | `docs/site/` §9 is genuinely unimplemented; this change activates it | Verified — fab-kit's `docs/site/README.md` self-describes as RESERVED, and a shll.ai repo-wide grep found zero `docs/site` references | S:98 R:80 A:95 D:95 |
| 2 | Certain | `docs/site/` is a fully self-contained (closed) set; relative links/images MUST resolve inside it | Discussed — user: "doc/site being fully self-contained is a good rule" | S:95 R:60 A:90 D:90 |
| 3 | Certain | All images everywhere (README + `docs/site/`) MUST be absolute URLs; shll.ai vendors zero binaries | Discussed — user agreed images "always be absolute"; uniform rule extends §3 | S:92 R:65 A:88 D:88 |
| 4 | Certain | README→`docs/site/` links rewritten by `docs/site/`→`./` prefix + `.md`-strip; `docs/site/` intra-set links by `.md`-strip only | Discussed — user: "replace docs/site with ."; the `.md`-strip + URL-math were verified against the live page layout (`/tools/<slug>/<path>`) | S:95 R:55 A:90 D:88 |
| 5 | Certain | Each `docs/site/<path>.md` → its own page at `/tools/<slug>/<path>`, preserving subtree shape (separate pages) | Discussed — user decision #2: separate pages mirroring the tool's page-breaking intent | S:90 R:60 A:88 D:85 |
| 6 | Certain | Rewrite transforms target link/image URL targets only, relative-prefix only — never absolute URLs, prose, or code | Discussed — the rewrite guard is a correctness boundary; established from first principles, the only safe way to scope a prefix rewrite | S:90 R:45 A:90 D:85 |
| 7 | Certain | Closure violations → report-only `::warning::`, slice still committed (never withhold) | Discussed — mirrors the existing §7 `vn39` reporter pattern exactly (canonical wins) | S:88 R:70 A:92 D:88 |
| 8 | Certain | Conforming the 7 external repos is out of scope — one change per tool, later; site degrades to placeholder | Discussed — user: "the contract for the other repos to follow … in one change for every tool each"; matches the spec's existing conformance boundary | S:95 R:75 A:92 D:92 |
| 9 | Confident | Implement as a sibling extension of the existing README pull path (extract-readme.ts / CLI / ReadmeSlice / scheduled-readme-refresh.yml / content collector) | Strong codebase signal — the README slice is the established, proven pattern; the contract already frames `docs/site/` as a sibling | S:85 R:70 A:85 D:80 |
| 10 | Confident | Spec `readme-extraction-contract.md` is the primary artifact — §9 active + closure § + link-resolution § + §3 refinement + closure-lint § + §8 extension | Strong signal — the contract IS what's being published; sections enumerated in discussion | S:88 R:75 A:88 D:85 |
| 11 | Certain | Fetch the `docs/site/` tree via repo tarball (one `curl` of `codeload.github.com/sahil87/<repo>/tar.gz/<branch>`, then `tar -xz` filtered to `*/docs/site/*`), not a recursive contents-API listing | Clarified — user chose tarball: one request per tool, no GitHub API rate limit, no `GITHUB_TOKEN`, no N+1 per-file fetches; branch fallback (main→master) mirrors the existing README `curl` | S:95 R:60 A:55 D:50 |
| 12 | Certain | Generate pages via a single Astro dynamic route (`getStaticPaths` over the committed `content/<slug>/site/**` tree) rendering one page per file at build time, not a committed MDX stub per page | Clarified — user chose dynamic route: handles a variable, author-controlled page set with zero per-page maintenance. Accepts introducing a dynamic-routing pattern the codebase hasn't used yet (all static stubs today); renders via the same build-time `@astrojs/markdown-remark` path as `ReadmeSlice` | S:95 R:55 A:55 D:50 |
| 13 | Certain | Defer the defensive consumer-side README rewrite for not-yet-conformed repos; rely on producer self-heal (rule A1.2 — external links become absolute-by-author) | Clarified — user chose defer: keeps the contract the single source of truth, no machine re-guessing which links are "external". Accepted cost: README→external relative links 404 on tool readme pages until each repo conforms (one PR per repo) | S:90 R:65 A:55 D:55 |

13 assumptions (11 certain, 2 confident, 0 tentative, 0 unresolved).
