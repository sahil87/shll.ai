# Plan: Code-Safe Docs Link Rewriter (mdast)

**Change**: 260910-mr4y-mdast-link-rewriter-code-safe
**Intake**: `intake.md`

> All paths below are relative to `sites/astro-starlight-terminal1/` unless they start with `docs/`, `content/`, or `fab/`. Node deps are installed (`pnpm install --frozen-lockfile` already ran); the baseline suite is green (92 tests). Run tests from the site dir with `node --test scripts/*.test.mjs`; build with `pnpm build`.

## Requirements

### Rendering: link rewriting on the mdast

#### R1: Link targets are rewritten on the parsed tree, never on raw text
The docs/site and README-slice link rewrites MUST be implemented as a remark plugin that visits `link`, `image`, and `definition` mdast nodes and edits their `url`. The plugin MUST NOT visit or edit `code`, `inlineCode`, `text`, or any other node type for link rewriting. The raw-string scanner `rewriteLinkTargets` and the string-transform exports `rewriteDocsSiteLinks(md, slug, mountPath)` / `rewriteReadmeDocsSiteLinks(md, slug)` SHALL be removed.

- **GIVEN** a docs/site page containing a fenced block with `arr[i](x)`, an inline code span `` `foo[bar](baz)` ``, and a real link `[s](./sibling.md)`
- **WHEN** the page renders through `createMarkdownProcessor({ remarkPlugins: [remarkDocsSiteLinks('idea', 'advanced/hooks')] })`
- **THEN** the emitted HTML contains `arr[i](x)` and `foo[bar](baz)` verbatim, AND contains `href="/idea/advanced/sibling"`

- **GIVEN** the committed page `content/run-kit/site/cron-schedule-kinds.md` (whose `<script>` block contains `cfg.actions[act](this)`)
- **WHEN** the site builds
- **THEN** `dist/run-kit/cron-schedule-kinds/index.html` contains `cfg.actions[act](this)` and does NOT contain `/run-kit/this`

#### R2: Raw-HTML href/src rewriting is preserved but bounded to `html` nodes
Relative `href`/`src` attribute values inside `html` mdast nodes MUST still be rewritten (existing R7 behaviour), using `HTML_ATTR_RE` applied to the node's `value` only. An `html` node whose trimmed value begins with `<script` or `<style` (case-insensitive) MUST be skipped entirely.

- **GIVEN** `<a href="./advanced/hooks.md">hooks</a>` on page `install`
- **WHEN** rendered with the docs/site plugin for slug `idea`
- **THEN** the output contains `href="/idea/advanced/hooks"`

- **GIVEN** a raw `<script>` block containing `fn[k](this)` and `img.src="./x.png"`
- **WHEN** rendered with either plugin
- **THEN** the block is emitted byte-verbatim

#### R3: Both render callers use the plugin; no pre-render string rewrite remains
`src/pages/[slug]/[...path].astro` MUST pass `remarkPlugins: [remarkDocsSiteLinks(slug, mountPath)]` to `createMarkdownProcessor` and render `stripFirstH1(raw)`. `src/components/ReadmeSlice.astro` MUST pass `remarkPlugins: [remarkReadmeDocsSiteLinks(tool)]` and render `raw` directly. Neither file MAY call a string link-rewrite before render. Header comments in both files MUST describe the plugin wiring.

- **GIVEN** the two caller files after the change
- **WHEN** grepped for `rewriteDocsSiteLinks(` / `rewriteReadmeDocsSiteLinks(`
- **THEN** no call sites remain, and `pnpm build` succeeds with all docs/site pages and all 7 readme pages emitted

#### R4: Path-mapping semantics are unchanged
The R5/R6 mapping rules MUST be preserved exactly: absolute targets (scheme, `//`, `/`, `#`) untouched; `#fragment` / `?query` suffix preserved; `.md` stripped; `.`/`..` resolved against the page directory (docs/site) with `__unresolved__` on escape; README targets rewritten only when they start with `docs/site/` AND end in `.md`; the site-absolute `/<slug>/<path>` emit shape via `toolMountUrl`. The helpers `isAbsoluteTarget`, `splitTargetSuffix`, `stripMdExt`, `resolvePath`, `toolMountUrl`, `UNRESOLVED_MARKER`, `DOCS_SITE_PREFIX` stay as they are.

- **GIVEN** page `advanced/hooks` with `[i](../install.md)`, `[x](./guide.md#section)`, `[e](../../secret.md)`
- **WHEN** rendered with the docs/site plugin for `idea`
- **THEN** hrefs are `/idea/install`, `/idea/guide#section`, `/idea/__unresolved__/secret`

- **GIVEN** a README slice with `[g](docs/site/install.md)`, `![l](docs/site/img/logo.png)`, `[s](docs/specs/o.md)`, `[b](https://github.com/x/blob/main/docs/site/x.md)`
- **WHEN** rendered with the README plugin for `idea`
- **THEN** only the first becomes `/idea/install`; the other three targets are unchanged

#### R5: Reference definitions and linked-image outer targets are rewritten
Because the visitor sees `definition` nodes and the outer `link` of a linked image natively, both SHALL be rewritten by the same mapper (closing the spec's former Known limitations (a) and (b)).

- **GIVEN** `[id]: ./x.md` plus `[ref][id]`, and `[![alt](https://h/i.png)](./p.md)` on page `install`
- **WHEN** rendered with the docs/site plugin for `idea`
- **THEN** output has `href="/idea/x"` and `href="/idea/p"`, and the inner `src="https://h/i.png"` is untouched

#### R6: No new dependency
The tree walk MUST be a small hand-rolled recursion with a local structural node type. `unist-util-visit`, `@types/mdast`, and any other package MUST NOT be added to `package.json`.

- **GIVEN** the diff
- **WHEN** `package.json` / `pnpm-lock.yaml` are inspected
- **THEN** they are unchanged

### Rendering: fence-aware H1 title/strip

#### R7: `firstH1` and `stripFirstH1` skip fenced code and share one scanner
In `src/lib/docs-site-tree.ts`, both functions MUST derive their candidate lines from a single fence-aware line scanner that skips lines inside fenced code blocks (backtick or tilde runs ≥3; a close must be the same family with run length ≥ the opener and no info string — the same CommonMark rule `extract-readme.ts` implements in `openFence`/`isClosingFence`). `firstH1` SHALL be exported. The `.mjs` sidebar twin `src/lib/docs-site-sidebar.mjs` MUST apply the identical fence skip in its `firstH1`. Existing behaviour is otherwise unchanged (strip first out-of-fence H1 + one following blank; no-op when none).

- **GIVEN** a page starting with a fenced `bash` block containing `# not a title`, followed by `# Real Title` and body
- **WHEN** `firstH1` and `stripFirstH1` run
- **THEN** the title is `Real Title`, the fence and its `# not a title` line are preserved, and only the `# Real Title` line (plus one blank) is removed

- **GIVEN** a ```` ```` ```` (4-backtick) block containing a ```` ``` ```` line and a `# x` line before the real H1
- **WHEN** scanned
- **THEN** the inner 3-backtick line does not close the outer fence and `# x` is not treated as the title

### Verification and documentation

#### R8: Tests exercise the real processor path
`scripts/extract-readme.test.mjs` MUST replace the removed string-API tests with assertions on `rendered.code` from `createMarkdownProcessor({ remarkPlugins: [...] })`, preserving every existing R5/R6/R7 expectation as an HTML assertion, and MUST add the regression cases in R1, R2, R4, R5 (fenced `arr[i](x)`, raw `<script>` with `fn[k](this)`, inline code, `<style>`, definition, linked image, absolute URL untouched, link TEXT `.md` preserved, empty input). `scripts/docs-site-tree.test.mjs` MUST add the R7 fence cases for both `firstH1` and `stripFirstH1`. The full `node --test scripts/*.test.mjs` suite MUST pass and `pnpm build` MUST succeed.

- **GIVEN** the updated test files
- **WHEN** `node --test scripts/*.test.mjs` runs from the site dir
- **THEN** all tests pass with zero failures

#### R9: Spec and in-code notes reflect the new mechanism
`docs/specs/readme-extraction-contract.md` §link resolution MUST describe the two transforms as remark plugins over `link`/`image`/`definition` (+ `html` href/src with script/style excluded), remove the "Known limitations" block (both shapes now handled), and add a code-verbatim GIVEN/WHEN/THEN. The `maskCode` docstring in `extract-readme.ts` and the spec's §closure-lint sentence claiming the rewriter "keeps its documented no-fence-tracking over-reach" MUST be updated to state that the rewriter is now parser-scoped.

- **GIVEN** the spec after the change
- **WHEN** grepped for `rewriteLinkTargets`, `Known limitations`, `no-fence-tracking over-reach`
- **THEN** none describe current behaviour

### Non-Goals
- The report-only detectors `findClosureViolations` / `findReadmeLinkViolations` stay string-based over `maskCode` (pull-time CLIs; already code-masked by `715p`).
- No restructuring of the `.ts`/`.mjs` sidebar split — the `firstH1` fence skip is duplicated into the `.mjs` twin deliberately.
- Memory (`docs/memory/`) is updated at hydrate, not here.

### Design Decisions

#### Parser-scoped rewrite via remark plugin
**Decision**: Implement link rewriting as a remark plugin factory (`remarkDocsSiteLinks(slug, mountPath)`, `remarkReadmeDocsSiteLinks(slug)`) visiting `link`/`image`/`definition` nodes, wired through `createMarkdownProcessor({ remarkPlugins })`.
**Why**: Only the parser can tell a Markdown link from `fn[k](this)` inside code or a `<script>` block; the processor is already the renderer on both paths, so no new dependency and no second parser.
**Rejected**: Extending `maskCode` to the rewriter (does not see HTML blocks; keeps two parsers that must agree on where code is); a smarter regex (the guard-by-string-shape design is the root cause).
*Introduced by*: 260910-mr4y-mdast-link-rewriter-code-safe

#### Fence-aware line scanner for the H1 strip, not an mdast plugin
**Decision**: Keep `firstH1`/`stripFirstH1` line-based but fence-aware, consuming one shared scanner; mirror the skip in the `.mjs` twin.
**Why**: The same-line title/strip invariant is load-bearing; the sidebar twin runs at Astro config-eval with no processor; an mdast strip paired with a line-based title would diverge on setext or blockquoted H1s.
**Rejected**: A remark plugin removing the first depth-1 heading (breaks the invariant unless title derivation also moves to mdast in both twins).
*Introduced by*: 260910-mr4y-mdast-link-rewriter-code-safe

## Tasks

### Phase 2: Core Implementation

- [x] T001 In `src/lib/extract-readme.ts`: add a local structural `MdNode` type and an ~8-line depth-first `walk`; add `applyToTarget(target, fn)` (the existing guard logic lifted out of `rewriteLinkTargets`); add `rewriteHtmlAttrTargets(value, fn)` that applies `HTML_ATTR_RE` to one `html` node value and returns it unchanged when the trimmed value starts with `<script` or `<style` (case-insensitive); add a plugin factory `remarkRewriteLinkTargets(fn)` returning a `() => (tree) => void` remark plugin that edits `url` on `link`/`image`/`definition` nodes and `value` on `html` nodes via the two helpers; export `remarkDocsSiteLinks(slug, mountPath)` and `remarkReadmeDocsSiteLinks(slug)` built on the existing R5/R6 mapper bodies; delete `rewriteLinkTargets`, `rewriteDocsSiteLinks`, `rewriteReadmeDocsSiteLinks`; keep `MD_LINK_RE`/`HTML_ATTR_RE`/`HTML_SRCSET_RE` and all path helpers; update the §9 header comment block and the `maskCode` docstring ("rendering frozen" is no longer true — the rewriter is parser-scoped) <!-- R1, R2, R4, R5, R6, R9 -->
- [x] T002 [P] In `src/lib/docs-site-tree.ts`: add `FENCE_RE`-style open/close predicates (import from or mirror `extract-readme.ts`'s `openFence`/`isClosingFence` — importing is preferred if it keeps `docs-site-tree.ts` free of npm imports; otherwise copy the two small predicates with a comment naming the source), add a shared fence-aware line iterator (yields `[index, line]` for lines outside fences), make `firstH1` and `stripFirstH1` both consume it, export `firstH1`; update both docstrings and the `ATX_H1_LINE` comment (no longer "fence-blind") <!-- R7 -->
- [x] T003 [P] In `src/lib/docs-site-sidebar.mjs`: apply the identical fence skip inside its `firstH1` twin (same fence regex/close rule), with a comment that it mirrors `docs-site-tree.ts` across the config-eval boundary <!-- R7 -->
- [x] T004 Wire callers: in `src/pages/[slug]/[...path].astro` import `remarkDocsSiteLinks`, create the processor with `remarkPlugins: [remarkDocsSiteLinks(slug, mountPath)]`, render `stripFirstH1(raw)`; in `src/components/ReadmeSlice.astro` import `remarkReadmeDocsSiteLinks`, create the processor with `remarkPlugins: [remarkReadmeDocsSiteLinks(tool)]`, render `raw!`; update the header/inline comments in both files to describe the plugin (remove "applied to raw before render" wording) <!-- R3 -->

### Phase 3: Integration & Edge Cases

- [x] T005 In `scripts/extract-readme.test.mjs`: import `createMarkdownProcessor` from `@astrojs/markdown-remark` and the two plugin exports; add a small `renderWith(plugin, md)` helper returning `rendered.code`; rewrite every R5/R6/R7/R3 string-equality link test as an HTML assertion (`assert.match(html, /href="\/idea\/advanced\/sibling"/)` etc.); add regression tests: fenced `arr[i](x)` verbatim, raw `<script>` with `fn[k](this)` and `img.src="./x.png"` verbatim, inline code `` `foo[bar](baz)` `` verbatim, `<style>` block untouched, a real relative link on the same document still rewritten, `[id]: ./x.md` definition rewritten, linked image outer target rewritten with inner absolute src untouched, empty input renders without throwing; update the file header comment <!-- R1, R2, R4, R5, R8 -->
- [x] T006 [P] In `scripts/docs-site-tree.test.mjs`: import `firstH1`; add cases — leading bash fence with `# not a title` then `# Real Title` (title and strip both pick the real one, fence preserved); tilde fence; 4-backtick outer fence containing a 3-backtick line and `# x`; H1 inside a fence with NO real H1 (title null, strip no-op); update header comment <!-- R7, R8 -->
- [x] T007 From the site dir run `node --test scripts/*.test.mjs` (all pass) then `pnpm build`; verify `dist/run-kit/cron-schedule-kinds/index.html` contains `cfg.actions[act](this)` and not `/run-kit/this`; verify one docs/site page with a relative link still emits a site-absolute href (e.g. grep `dist/fab-kit/` or `dist/idea/` output for `href="/idea/` or `href="/fab-kit/`); confirm `git diff --stat -- package.json pnpm-lock.yaml` is empty <!-- R1, R3, R6, R8 -->

### Phase 4: Polish

- [x] T008 Edit `docs/specs/readme-extraction-contract.md` §link resolution: replace "pure, exported, tested functions" wording with the remark-plugin description (visits `link`/`image`/`definition`; `html` node `href`/`src` via attribute regex, `<script`/`<style` skipped; code/inlineCode never touched); delete the `### Known limitations` block; add a GIVEN/WHEN/THEN for code-verbatim rendering; in §closure lint replace the sentence saying the rewriter keeps its no-fence-tracking over-reach with one stating the rewriter is parser-scoped since this change <!-- R9 -->

## Execution Order

- T001 blocks T004 and T005 (they import the new exports)
- T002 blocks T006
- T002 and T003 are independent of T001
- T007 runs after T004, T005, T006
- T008 is independent and may run any time after T001

## Acceptance

### Functional Completeness

- [x] A-001 R1: A remark plugin factory exists in `extract-readme.ts`; `rewriteLinkTargets`, `rewriteDocsSiteLinks`, and `rewriteReadmeDocsSiteLinks` no longer exist; `remarkDocsSiteLinks` and `remarkReadmeDocsSiteLinks` are exported
- [x] A-002 R2: `html` node values have relative `href`/`src` rewritten; nodes starting with `<script`/`<style` are returned unchanged
- [x] A-003 R3: Both `[slug]/[...path].astro` and `ReadmeSlice.astro` pass the plugin via `remarkPlugins` and no longer call a string rewrite before render
- [x] A-004 R7: `firstH1` and `stripFirstH1` share one fence-aware scanner in `docs-site-tree.ts`; `firstH1` is exported; `docs-site-sidebar.mjs` has the identical fence skip
- [x] A-005 R9: Spec §link resolution describes the plugin, the Known-limitations block is gone, §closure-lint no longer claims the rewriter over-reaches; `maskCode` docstring updated

### Behavioral Correctness

- [x] A-006 R1: Fenced `arr[i](x)`, inline `` `foo[bar](baz)` ``, and a raw `<script>` containing `fn[k](this)` render byte-verbatim while a sibling relative link on the same page is rewritten
- [x] A-007 R4: Site-absolute mapping, `#`/`?` suffix preservation, `__unresolved__` on escape, README `docs/site/*.md`-only rule, absolute-URL and link-text guards all hold through the rendered HTML
- [x] A-008 R5: A `[id]: ./x.md` definition and the outer target of `[![alt](abs)](./p.md)` are rewritten; the inner absolute image is untouched
- [x] A-009 R7: A `# comment` inside a leading fence is neither the derived title nor stripped; the real H1 is; a 4-backtick block is not closed by an inner 3-backtick line

### Removal Verification

- [x] A-010 R1: No remaining references to `rewriteLinkTargets`, `rewriteDocsSiteLinks(`, or `rewriteReadmeDocsSiteLinks(` anywhere under `src/`, `scripts/`, or `docs/specs/` (memory files are hydrate's job)

### Scenario Coverage

- [x] A-011 R1: `pnpm build` output `dist/run-kit/cron-schedule-kinds/index.html` contains `cfg.actions[act](this)` and not `/run-kit/this`
- [x] A-012 R8: `node --test scripts/*.test.mjs` passes with the migrated and new cases; `pnpm build` succeeds

### Edge Cases & Error Handling

- [x] A-013 R4: Empty input and a page with no links render without throwing under both plugins
- [x] A-014 R7: A page whose only `# ...` line is inside a fence yields `firstH1 === null` and `stripFirstH1` is a no-op

### Code Quality

- [x] A-015 Pattern consistency: new code follows the module's existing style (named constants, JSDoc on exports, no magic strings, structural types instead of new type packages)
- [x] A-016 No unnecessary duplication: path helpers reused, not re-implemented; fence predicates imported or mirrored with a source comment, not a third divergent implementation
- [x] A-017 Readability over cleverness: the walk and plugin factory are short and obviously correct; no god function (>50 lines) introduced
- [x] A-018 R6: `package.json` and `pnpm-lock.yaml` unchanged

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before hydrate
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`

## Deletion Candidates

- None — this change already removed the code it made redundant (`rewriteLinkTargets`, `rewriteDocsSiteLinks`, `rewriteReadmeDocsSiteLinks` deleted in T001; verified zero remaining references under `src/`, `scripts/`, `docs/specs/`). Everything else touched (`MD_LINK_RE`/`HTML_ATTR_RE`/`HTML_SRCSET_RE`, `maskCode`, the path helpers) is still consumed by the report-only detectors or the new plugin.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | `remarkPlugins` on `createMarkdownProcessor` is the wiring seam | Verified in `@astrojs/markdown-remark/dist/types.d.ts` line 40 after install; probe render confirmed node types `link`/`image`/`definition`/`code`/`inlineCode`/`html` | S:90 R:90 A:100 D:95 |
| 2 | Confident | `html` nodes starting `<script`/`<style` are skipped wholesale; other `html` nodes get `HTML_ATTR_RE` on their value | Preserves the R7 href/src contract while closing the JS-string edge; cheapest bound | S:60 R:90 A:80 D:70 |
| 3 | Confident | `docs-site-tree.ts` may import the fence predicates from `extract-readme.ts` (both are local `.ts`, no npm import); apply may instead mirror them if the import drags `parse-help.ts` into the route's config-eval path | Either satisfies R7; the `.mjs` twin must copy regardless | S:55 R:90 A:75 D:60 |
| 4 | Confident | Tests assert on rendered HTML via regex/`includes`, not exact full-document equality | Astro's default processor adds shiki markup to code blocks, so exact HTML equality would be brittle | S:65 R:95 A:85 D:80 |
| 5 | Confident | The build-output verification uses the committed run-kit page as-is (no new fixture file) | The page still contains the trigger string today; a synthetic unit fixture covers the case if the puller changes it later | S:60 R:90 A:80 D:75 |

5 assumptions (1 certain, 4 confident, 0 tentative).
