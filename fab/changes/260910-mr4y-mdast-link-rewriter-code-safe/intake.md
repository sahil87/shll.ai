# Intake: Code-Safe Docs Link Rewriter (mdast)

**Change**: 260910-mr4y-mdast-link-rewriter-code-safe
**Created**: 2026-09-10

## Origin

Backlog item `[mr4y]` (2026-09-10), one-shot `/fab-new mr4y`. No prior conversation context.

> Docs-site link rewriter (R5, `rewriteDocsSiteLinks` in `sites/astro-starlight-terminal1/src/pages/[slug]/[...path].astro`) corrupts code: it rewrites relative Markdown links with a regex over the RAW page text before rendering, so any `](` sequence inside a fenced code block, inline code, or a raw HTML/`<script>` block is treated as a link. Observed on run-kit `docs/site/cron-schedule-kinds.md`: the inline JS `cfg.actions[act](this)` was rewritten to `cfg.actions[act](/run-kit/this)` — a SyntaxError that killed the page's script (the page authored around it by removing every `](` from its code; run-kit PR #906). FIX: rewrite links on the mdast (a remark plugin over `link`/`image`/`definition` nodes) instead of the raw string, so code/html nodes are never touched; same for `stripFirstH1` if it is also string-based. ACCEPTANCE: a docs/site page containing `arr[i](x)` in a fenced block and a raw `<script>` with `fn[k](this)` renders both verbatim; existing relative-link rewrites (`./sibling.md`, `../parent.md`, images) still resolve site-absolute; add a unit test beside `scripts/llms.test.mjs`.

Intake-time verification against the repo (all confirmed):

- The committed page `content/run-kit/site/cron-schedule-kinds.md` line 295 still contains `cfg.actions[act](this)` inside its single `<script>` block — the live corruption path is reproducible from committed content today.
- `rewriteLinkTargets` (`src/lib/extract-readme.ts`) is a two-regex pass (`MD_LINK_RE`, `HTML_ATTR_RE`) over the whole raw string. Its own docstring records the over-reach as a deliberate "keep the scanner simple (no fence tracking)" trade-off, made when the only imagined victim was a Markdown code sample. Raw `<script>` was not considered.
- Both exported rewriters route through it: `rewriteDocsSiteLinks` (docs/site pages, `[slug]/[...path].astro`) AND `rewriteReadmeDocsSiteLinks` (the README slice, `src/components/ReadmeSlice.astro`). The README path has the identical defect class.
- `stripFirstH1` and `firstH1` (`src/lib/docs-site-tree.ts`) are line-based and fence-blind — `ATX_H1_LINE` matches a `# comment` line inside a fenced block. Memory records this as "consistent with the rewriter's no-fence-tracking posture". The sidebar twin `src/lib/docs-site-sidebar.mjs` duplicates `firstH1` verbatim (config-eval boundary).
- `maskCode` (change `715p`) exists but is wired to the two report-only detectors only; its docstring says "rendering frozen". It masks fences and inline spans but NOT raw HTML blocks, so it would not fix the `<script>` case even if applied to the rewriter.

## Why

**The problem.** The docs/site render route and the README slice component both run a link-target rewrite over the raw Markdown source *before* it is parsed. A regex cannot know whether `[act](this)` is a Markdown link or a JavaScript computed-member call, so the rewriter mutates code. On `cron-schedule-kinds.md` that turned a working interactive explainer into a page whose `<script>` throws a SyntaxError on load — every animated timeline on the page is dead, silently, with the build still green.

**The consequence of not fixing it.** The tool-page-depth constraint (constitution §Tool-Page Depth) promises tool authors that `docs/site/**/*.md` is pulled and rendered **verbatim**. Today that promise has an undocumented exclusion: "unless your code contains `](`". run-kit already paid for it by rewriting its own source (PR #906) to dodge a consumer bug — the exact "producer contorts around the consumer" drift the mechanical-sync model exists to prevent. Any tool page with JS, a Bash array expansion (`${arr[i]}`) followed by a paren, a Rust/Go index-call, or a Markdown tutorial showing link syntax inside a fence is at risk. The fix is also needed on the README slice: a README code sample with `[x](rel.md)` is rewritten today (recorded as a "known display wart"), and a README with inline HTML `<script>` would break identically.

**Why mdast, not a smarter regex.** The correct boundary is the parser's. After `remark-parse`, code is `code`/`inlineCode` nodes and raw HTML is `html` nodes; real links are `link`, `image`, and `definition` nodes with a structured `url` field. A transform that visits only those three node types cannot touch code by construction, needs no fence tracking, and gets the two shapes the regex never handled (the outer target of a linked image, reference-style definitions) for free. `@astrojs/markdown-remark`'s `createMarkdownProcessor` — already the renderer on both paths — accepts `remarkPlugins`, so the plugin slots into the existing render call with no new runtime dependency (Constitution VI) and stays build-time (Constitution I). Making `maskCode` cover the rewriter was rejected: it does not see HTML blocks, it keeps two parsers (regex + remark) that must agree on what code is, and it perpetuates the guard-by-string-shape design that caused this.

## What Changes

### 1. Link rewriting moves onto the mdast (`src/lib/extract-readme.ts`)

Replace the string scanner `rewriteLinkTargets` with a **remark plugin factory** that visits the parsed tree. The existing pure path-mapping helpers stay exactly as they are and remain the single machine anchor for the §link-resolution contract: `isAbsoluteTarget`, `splitTargetSuffix`, `stripMdExt`, `resolvePath`, `toolMountUrl`, `UNRESOLVED_MARKER`, `DOCS_SITE_PREFIX`.

Shape (names indicative; apply may adjust):

```ts
/** Minimal structural mdast types — no `@types/mdast` dependency. */
interface MdNode { type: string; url?: string; value?: string; children?: MdNode[] }

/** Depth-first walk; `visit` may return a replacement node or nothing. */
function walk(node: MdNode, visit: (n: MdNode) => void): void {
  visit(node);
  if (node.children) for (const c of node.children) walk(c, visit);
}

/** The one place a link target is edited (the rewrite guard). */
function remarkRewriteLinkTargets(fn: (path: string) => string) {
  return () => (tree: MdNode) => {
    walk(tree, (n) => {
      if (n.type === 'link' || n.type === 'image' || n.type === 'definition') {
        if (typeof n.url === 'string') n.url = applyToTarget(n.url, fn);
      } else if (n.type === 'html' && typeof n.value === 'string') {
        n.value = rewriteHtmlAttrTargets(n.value, fn);   // see §1b
      }
    });
  };
}

export function remarkDocsSiteLinks(slug: string, mountPath: string) { /* R5 mapper */ }
export function remarkReadmeDocsSiteLinks(slug: string) { /* R6 mapper */ }
```

- `applyToTarget` keeps today's guard verbatim: absolute targets are returned unchanged; a pure `#`/`?` target is unchanged; otherwise `fn(path) + suffix`.
- The R5 mapper (`resolvePath(baseDir, stripMdExt(path))` → `toolMountUrl`, escape → `__unresolved__`) and the R6 mapper (`docs/site/<p>.md` prefix rule, non-`.md` left alone) are lifted unchanged from today's `rewriteDocsSiteLinks` / `rewriteReadmeDocsSiteLinks` bodies.
- `code`, `inlineCode`, `text`, and every other node type are never visited for editing. This is the property the change exists to guarantee.
- The tree walk is a **hand-rolled ~8-line recursion**, not `unist-util-visit`. That package is in the lockfile only as a transitive dependency; under pnpm's strict layout an undeclared import fails, and declaring it would be a new dependency for a walk this small (Constitution VI). Types are structural (`MdNode` above) so no `@types/mdast` is needed either.
- The old string-function exports `rewriteDocsSiteLinks(md, slug, mountPath)` and `rewriteReadmeDocsSiteLinks(md, slug)` are **removed** along with `rewriteLinkTargets`. `MD_LINK_RE` and `HTML_ATTR_RE` stay — the report-only detectors (§4) still use them.

### 1b. Raw HTML `href`/`src` rewriting is preserved, scoped to `html` nodes

The spec's rewrite guard says raw-HTML `href`/`src` relative targets ARE rewritten (R7 test: `<a href="./advanced/hooks.md">` → `/idea/advanced/hooks`). Keep that behaviour by applying `HTML_ATTR_RE` to the `value` of `html` nodes only — never to the whole document — with one exclusion: an `html` node whose trimmed value starts with `<script` or `<style` is skipped entirely, so a JS string like `img.src="./x.png"` inside a script block is never touched. This is the only string-regex edit that survives, and it is now bounded by the parser to genuine raw-HTML regions.

### 2. Callers wire the plugin into the existing processor

**`src/pages/[slug]/[...path].astro`** (docs/site pages):

```ts
// before
const processor = await createMarkdownProcessor({});
const rendered = await processor.render(rewriteDocsSiteLinks(stripFirstH1(raw), slug, mountPath));

// after
const processor = await createMarkdownProcessor({
  remarkPlugins: [remarkDocsSiteLinks(slug, mountPath)],
});
const rendered = await processor.render(stripFirstH1(raw));
```

**`src/components/ReadmeSlice.astro`** (README slice):

```ts
// before
const processor = await createMarkdownProcessor({});
const rendered = await processor.render(rewriteReadmeDocsSiteLinks(raw!, tool));

// after
const processor = await createMarkdownProcessor({ remarkPlugins: [remarkReadmeDocsSiteLinks(tool)] });
const rendered = await processor.render(raw!);
```

The processor is already created per render on both paths (slug/mountPath vary per page), so per-page plugin options add no new instantiation. `rendered.metadata.headings` is unaffected — `readme-toc.ts` creates its own heading-only processor and does not use links. `llms.ts` reads slices verbatim and is untouched. Header comments in both files that describe "rewrite applied to raw before render" are updated to describe the plugin.

### 3. `stripFirstH1` / `firstH1` become fence-aware (line scanner, shared)

The backlog asks for mdast here too "if string-based". It is string-based, and the same defect exists (a `# comment` line inside a leading fence would be taken as the title AND stripped from the code). But moving only the strip onto the mdast would break the load-bearing invariant memory records: **the line `stripFirstH1` removes must be exactly the line `firstH1` derived the title from**. Title derivation cannot move to the mdast cheaply — `docs-site-sidebar.mjs` runs at Astro config-eval time (dependency-free `.mjs`, no markdown processor loaded) and duplicates `firstH1`. An mdast strip paired with a line-based title would also disagree on a setext H1 (`Title\n====`) or a blockquoted `> # x`.

So the fix keeps ONE scanner and makes it fence-aware:

- In `docs-site-tree.ts`, introduce a single line-iterator that yields only lines **outside** fenced code blocks, using the same CommonMark fence discipline `extract-readme.ts` already implements (`openFence`/`isClosingFence`: backtick or tilde runs of length ≥3, closed only by the same family with run length ≥ the opener). Both `firstH1` and `stripFirstH1` consume it, so they still agree on the same line by construction.
- `docs-site-sidebar.mjs` gets the identical fence-skip in its `firstH1` twin (same regexes, same shape — the accepted, documented duplication across the config-eval boundary). No restructuring of the `.ts`/`.mjs` split in this change.
- Behaviour otherwise unchanged: strips the first out-of-fence ATX H1 plus one following blank line; no-op when none exists; all nine existing `docs-site-tree.test.mjs` cases keep passing.

Whether to import the fence helpers from `extract-readme.ts` or copy the two tiny predicates into `docs-site-tree.ts` is left to apply (importing keeps one definition; `docs-site-tree.ts` is currently import-free by design — the docstring says "dependency-free `node:fs` walk").

### 4. Report-only detectors are out of scope (unchanged)

`findClosureViolations` and `findReadmeLinkViolations` stay string-based over `maskCode`-masked text. They run in the pull-time CLIs, are report-only, and were already hardened by `715p`. `maskCode`'s docstring note "rendering frozen" is deleted/updated since rendering is no longer frozen.

### 5. Tests (`scripts/`, native `node --test`)

Per the backlog, tests live beside `scripts/llms.test.mjs`. Concretely, in **`scripts/extract-readme.test.mjs`** (the file that already owns the R5/R6/R7 link cases):

- The existing R5/R6/R7 string-equality tests migrate to **render-through-the-real-processor** assertions: build `await createMarkdownProcessor({ remarkPlugins: [remarkDocsSiteLinks('idea','advanced/hooks')] })`, render the Markdown, and assert on the emitted `href="/idea/advanced/sibling"` / `src=` in `rendered.code`. Every current expectation is preserved as an HTML assertion (sibling `./`, parent `../`, bare-relative from top-level, `#fragment`/`?query` survive, `__unresolved__` on escape, README `docs/site/<p>.md`, non-`.md` docs/site target untouched, absolute URLs untouched, raw-HTML href relative rewritten / absolute untouched).
- **New regression cases** (the backlog's acceptance, plus the shapes the fix now covers):
  - fenced block containing `arr[i](x)` → `<code>` output contains `arr[i](x)` verbatim
  - raw `<script>` block containing `fn[k](this)` → emitted verbatim, no `/idea/this`
  - inline code `` `foo[bar](baz)` `` → verbatim
  - `<style>` block with a relative `url(...)`/`src=` shape → untouched
  - a real relative link on the same page as the code above → still rewritten (the fix is not "disable rewriting")
  - reference-style definition `[id]: ./x.md` → `href="/idea/x"` (formerly Known limitation b)
  - linked image `[![alt](https://…/i.png)](./page.md)` → outer `href="/idea/page"`, inner `src` untouched (formerly Known limitation a)
- In **`scripts/docs-site-tree.test.mjs`**: `stripFirstH1` and (newly exported for test) `firstH1` with a leading fenced block containing `# not a title` followed by a real `# Title` → title is `Title`, the fence line is preserved, the real H1 is stripped. Tilde fences and a longer-outer/shorter-inner fence case included.
- `@astrojs/markdown-remark` imports fine under plain `node --test` (it is a real package, not an `astro:` virtual module). The `astro-content-alias.mjs` hook is not needed for these tests.

### 6. Documentation updated in-change

- `docs/specs/readme-extraction-contract.md` §link resolution: the transforms are described as remark plugins over `link`/`image`/`definition` (+ `html` href/src, script/style excluded); the "Known limitations (a)/(b)" block is removed since both are now handled; the GIVEN/WHEN/THEN gains the code-verbatim scenario. Small, factual edit to a human-curated spec — included in the PR for the user to approve rather than left drifting.
- Memory updates happen at hydrate (see Affected Memory).

## Affected Memory

- `conventions/docs-site-tree`: (modify) the rewrite guard section (now parser-enforced, `rewriteLinkTargets` gone, plugin names), the render section (`remarkPlugins` wiring instead of "applied to raw before render"), the H1-strip paragraph (fence-aware scanner replaces "fence-blind … consistent with the rewriter's no-fence-tracking posture"), the `715p` "rendering frozen" clause, and a new Design Decision (mdast plugin over regex; line-scanner over mdast for the H1 strip)
- `conventions/readme-extraction`: (modify) `ReadmeSlice.astro` render path now passes `remarkReadmeDocsSiteLinks(tool)` as a plugin; the "known display wart" (code-sample relative link rewrites) is gone; the CLI detectors' `maskCode` note stays

## Impact

- **Source** (`sites/astro-starlight-terminal1/`):
  - `src/lib/extract-readme.ts` — replace `rewriteLinkTargets` + two string exports with the plugin factory + two plugin exports; keep all path helpers and regex constants used by detectors
  - `src/pages/[slug]/[...path].astro` — `remarkPlugins` wiring; comment update
  - `src/components/ReadmeSlice.astro` — `remarkPlugins` wiring; comment update
  - `src/lib/docs-site-tree.ts` — fence-aware shared line scanner for `firstH1`/`stripFirstH1`; export `firstH1` for tests
  - `src/lib/docs-site-sidebar.mjs` — identical fence-skip in its `firstH1` twin
- **Tests**: `scripts/extract-readme.test.mjs` (migrate + add), `scripts/docs-site-tree.test.mjs` (add). CI runs `node --test scripts/*.test.mjs` then `astro build` (`.github/workflows/ci.yml`).
- **Docs**: `docs/specs/readme-extraction-contract.md` §link resolution (in-change); two memory files (hydrate).
- **Dependencies**: none added. `unist-util-visit` deliberately NOT declared.
- **Behaviour surface**: rendered HTML for every docs/site page and README slice. Expected diff on the live site: code blocks that previously had `](x)` mangled now render verbatim; any reference-style or linked-image relative target now resolves site-absolute (previously left raw). No URL changes for links that already worked.
- **Environment note**: `node_modules` is not installed in this worktree — apply must run `pnpm install` in `sites/astro-starlight-terminal1/` before tests/build.
- **Verification**: render `content/run-kit/site/cron-schedule-kinds.md` through the route (or `astro build`) and confirm `cfg.actions[act](this)` survives unchanged in `dist/run-kit/cron-schedule-kinds/index.html`.

## Open Questions

- None blocking. One deliberate deviation from the backlog wording is recorded as Assumption 4 (H1 strip stays a fence-aware line scanner rather than an mdast plugin); if the user prefers the mdast route for the strip as well, `/fab-clarify` can flip it — the cost is moving title derivation onto the mdast too and dealing with the config-eval `.mjs` twin.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Root-cause fix is a remark plugin over `link`/`image`/`definition` mdast nodes wired via `createMarkdownProcessor({ remarkPlugins })`; the string scanner `rewriteLinkTargets` and the two string-transform exports are removed | Backlog directs exactly this; parser boundary is the only place code vs. link is knowable; processor already in use on both paths — no new dep | S:90 R:70 A:90 D:90 |
| 2 | Certain | Both callers migrate — the docs/site route AND `ReadmeSlice.astro` (README slice) | Both route through the same defective scanner; README path has the identical failure class; leaving one would keep the bug live | S:60 R:80 A:95 D:90 |
| 3 | Confident | Raw-HTML `href`/`src` rewriting kept, applied to `html` node values only, skipping nodes starting `<script`/`<style` | Spec + R7 test require HTML href/src rewriting; scoping to `html` nodes keeps that while the script/style exclusion closes the JS-string edge | S:55 R:85 A:75 D:65 |
| 4 | Confident | `stripFirstH1`/`firstH1` fixed as ONE shared fence-aware line scanner (in `.ts` and the `.mjs` sidebar twin), not an mdast plugin — deviates from the backlog's literal "same for stripFirstH1" | Memory records the same-line title/strip invariant as load-bearing; the `.mjs` twin runs at config-eval with no processor; mdast strip + line title would diverge on setext/blockquote H1s | S:55 R:85 A:80 D:55 |
| 5 | Confident | Hand-rolled ~8-line tree walk with structural types; `unist-util-visit`/`@types/mdast` NOT declared | Transitive-only in lockfile → undeclared import fails under pnpm strict; declaring is a new dep for a trivial walk (Constitution VI) | S:50 R:95 A:85 D:65 |
| 6 | Confident | Tests: migrate existing R5/R6/R7 cases in `scripts/extract-readme.test.mjs` to render-through-processor HTML assertions; add regression cases there and in `scripts/docs-site-tree.test.mjs` | Backlog says "beside `scripts/llms.test.mjs`" = the `scripts/` dir; the file already owns the link tests; string-equality tests cannot survive an mdast API | S:65 R:90 A:80 D:70 |
| 7 | Confident | Report-only detectors (`findClosureViolations`, `findReadmeLinkViolations`) stay string-based over `maskCode`; out of scope | Already code-masked by `715p`, run at pull time not render time, report-only; not part of the defect | S:50 R:90 A:85 D:80 |
| 8 | Confident | Reference-style definitions and the outer target of a linked image are now rewritten too (spec Known limitations a/b closed) | The mdast visitor sees them natively; excluding them would need extra code to preserve a documented gap | S:60 R:85 A:85 D:80 |
| 9 | Confident | Spec §link resolution + Known limitations edited in-change (small factual update), memory at hydrate | Spec is human-curated but the user approves the PR; leaving the spec describing a removed scanner would be immediate drift | S:40 R:90 A:60 D:55 |

9 assumptions (2 certain, 7 confident, 0 tentative, 0 unresolved).
