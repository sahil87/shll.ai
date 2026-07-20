# Plan: Fix doubled H1 heading on pulled docs/site pages (render-side strip)

**Change**: 260720-h0q6-fix-doubled-h1-docs-site
**Intake**: `intake.md`

## Requirements

### docs/site render: H1 de-duplication

#### R1: Exported, single-sourced H1-strip helper
The `docs-site-tree.ts` module SHALL export a pure, dependency-free `stripFirstH1(markdown: string): string` helper that removes the first ATX H1 line — the exact line `firstH1()` matches — from a markdown string, and returns the input unchanged when no ATX H1 is present. The H1 line-matching logic MUST be single-sourced between `firstH1()` and `stripFirstH1()` so the derived title and the stripped line can never diverge.

- **GIVEN** a markdown string whose first ATX H1 (`# Title`, matched by `/^#\s+(.+?)\s*#*\s*$/`) is on line 1
- **WHEN** `stripFirstH1(markdown)` is called
- **THEN** that single H1 line is removed and the remainder of the document is byte-identical (modulo an optional collapse of a blank line immediately following the removed H1)
- **AND** `firstH1(markdown)` and `stripFirstH1(markdown)` operate on the same matched line (title/strip alignment)

#### R2: No-op when the title fell back to the path tail
`stripFirstH1()` MUST return the markdown unchanged whenever `firstH1()` would return null — i.e. when the page has no ATX H1 anywhere and its title was derived by `titleizeTail()`. An `## H2`-only (or any non-H1) document MUST NOT have any line stripped.

- **GIVEN** a markdown document with no ATX H1 anywhere (e.g. starting with `## Heading` or plain prose)
- **WHEN** `stripFirstH1(markdown)` is called
- **THEN** the input is returned unchanged (fallback-title pages keep their body intact)

#### R3: Render-side strip in the dynamic route, never at pull time
The dynamic route `src/pages/[slug]/[...path].astro` SHALL apply `stripFirstH1()` to the raw markdown **before** `processor.render()`, composed with the existing `rewriteDocsSiteLinks()` render-side transform. The strip MUST be render-side only — the committed `content/<slug>/site/**` files stay byte-verbatim (the §9 verbatim-commit contract). No pull-time mutation is added to `scripts/extract-docs-site-cli.mjs`.

- **GIVEN** a committed docs/site page whose body begins with `# Title` and whose Starlight page title was derived from that H1
- **WHEN** the page is built and rendered
- **THEN** the rendered body no longer contains the duplicated `# Title` heading, the Starlight page H1 (from `frontmatter={{ title }}`) is the sole title, and the on-disk file is unchanged
- **AND** a no-H1 fallback-title page renders its full body (the strip is inherently conditional via the R2 no-op contract — no separate flag is plumbed through `getStaticPaths`)

#### R4: Accepted side effect — headings prop loses its h1
It is an accepted, uncompensated side effect that `rendered.metadata.headings` handed to `<StarlightPage headings={...}>` loses its h1 entry after the strip. No compensation is added. Starlight's right-rail "On this page" TOC starts at h2, so this is harmless.

- **GIVEN** a stripped docs/site page
- **WHEN** `<StarlightPage headings={headings}>` renders the right-rail TOC
- **THEN** the TOC begins at h2 and no error or visual defect results

### Non-Goals

- Modifying `scripts/extract-docs-site-cli.mjs` — no pull-time H1 mutation (verbatim-commit contract holds).
- Modifying `src/lib/docs-site-sidebar.mjs` — the sidebar reads the H1 for its `{ label }` only and renders no body; it stays correct against the on-disk verbatim files and is untouched.
- Modifying the committed `content/<slug>/site/**` files — they stay byte-verbatim.
- Touching the README slice path (`extract-readme.ts` §1 head rule, `ReadmeSlice.astro`) — it already strips its H1 at extraction time (a deduced slice, not a verbatim copy) and is out of scope.

### Design Decisions

1. **Render-side strip over pull-time strip**: strip the first H1 in `[slug]/[...path].astro` before `processor.render()`. — *Why*: the docs/site tree is committed byte-verbatim (spec §9; the extraction CLI mutates nothing), and this mirrors the existing render-side `rewriteDocsSiteLinks` discipline already in the same file. — *Rejected*: stripping at pull time in `extract-docs-site-cli.mjs` (violates the verbatim-commit contract).
2. **Helper colocated in `docs-site-tree.ts`, single-sourcing the H1 match with `firstH1`**: — *Why*: `docs-site-tree.ts` owns title derivation for these pages, so colocating and sharing the line-matcher guarantees the stripped line and the derived title can never diverge. — *Rejected*: placing it in `extract-readme.ts` (would split title-derivation logic across two modules and risk drift).
3. **No-op-when-no-H1 encodes the "strip only when title derived from H1" rule inherently**: — *Why*: the exact case where `collectDocsSitePages` falls back to `titleizeTail` is the case where `firstH1` (and thus `stripFirstH1`) finds nothing, so no separate flag needs plumbing through `getStaticPaths` props.

## Tasks

### Phase 1: Core Implementation

- [x] T001 Add exported `stripFirstH1(markdown: string): string` to `sites/astro-starlight-terminal1/src/lib/docs-site-tree.ts`, colocated with `firstH1`. Single-source the H1 line match by extracting the shared regex/predicate so `firstH1` and `stripFirstH1` recognize the identical line; return the markdown unchanged when no ATX H1 exists (optionally collapse a single blank line immediately following the removed H1). Dependency-free plain string processing. <!-- R1 --> <!-- R2 -->

### Phase 2: Integration

- [x] T002 In `sites/astro-starlight-terminal1/src/pages/[slug]/[...path].astro`, import `stripFirstH1` from `../../lib/docs-site-tree.ts` and compose it into the existing render call so the raw markdown is stripped before `rewriteDocsSiteLinks` + `processor.render()` (e.g. `processor.render(rewriteDocsSiteLinks(stripFirstH1(raw), slug, mountPath))`). Extend the existing render-side comment to state the H1 strip is render-side only and the on-disk slice stays byte-verbatim. <!-- R3 --> <!-- R4 -->

### Phase 3: Tests

- [x] T003 Add `sites/astro-starlight-terminal1/scripts/docs-site-tree.test.mjs` following the `extract-readme.test.mjs` node-test pattern (`node --test`, native `.ts` type-stripping import of `../src/lib/docs-site-tree.ts`). Pin: (a) H1 on line 1 → line removed, rest byte-identical modulo optional adjacent blank-line collapse; (b) no H1 anywhere → input returned unchanged; (c) strip targets the same line `firstH1` matches, incl. first H1 not on line 1 (title/strip alignment); (d) `## H2`-only document → unchanged. <!-- R1 --> <!-- R2 -->

### Phase 4: Docs

- [x] T004 Add a one-line render-side H1-strip note to the docs/site render model in `docs/specs/readme-extraction-contract.md` (the `docs/site/ render side` bullet under §8, which §9's status blockquote references as "§8 render side"): the route strips the first H1 at render time (the title is promoted to the Starlight page title) while the committed page stays byte-verbatim. <!-- R3 -->

## Execution Order

- T001 blocks T002 (route imports the helper) and T003 (test imports the helper).
- T002 and T003 are independent of each other once T001 lands; T004 is independent (docs-only).

## Acceptance

### Functional Completeness

- [x] A-001 R1: `stripFirstH1` is exported from `docs-site-tree.ts`, is dependency-free, removes the first ATX H1 line, and shares its line-matching logic with `firstH1` (single-sourced — no duplicated divergent regex).
- [x] A-002 R2: `stripFirstH1` returns the input unchanged when no ATX H1 is present (fallback-title / H2-only pages keep their body intact).
- [x] A-003 R3: `[slug]/[...path].astro` applies `stripFirstH1` to `raw` before `processor.render()`, composed with `rewriteDocsSiteLinks`; the render-side comment documents the strip and the byte-verbatim on-disk invariant; no change to `extract-docs-site-cli.mjs` or the committed `content/<slug>/site/**` files.

### Behavioral Correctness

- [x] A-004 R3: A docs/site page whose body begins with `# Title` renders with the heading exactly once (Starlight's page H1), not twice — verified by `pnpm build` succeeding and the rendered output no longer duplicating the title.
- [x] A-005 R2: A no-H1 page renders its full body unchanged (the strip is a no-op there).

### Scenario Coverage

- [x] A-006 R1: The unit test pins title/strip alignment — the stripped line is the same line `firstH1` matches, including the first-H1-not-on-line-1 case.
- [x] A-007 R2: The unit test pins the no-H1 and H2-only no-op cases.

### Edge Cases & Error Handling

- [x] A-008 R4: `<StarlightPage headings={headings}>` renders without error after the h1 entry drops from the headings manifest; the right-rail TOC starts at h2 (accepted side effect, no compensation).

### Code Quality

- [x] A-009 Pattern consistency: New code follows the naming and structural patterns of surrounding code in `docs-site-tree.ts` (JSDoc, pure functions) and the route file (render-side comment discipline).
- [x] A-010 No unnecessary duplication: The H1 line-matching logic is reused/single-sourced between `firstH1` and `stripFirstH1` rather than re-implemented; the test reuses the established node-test pattern.
- [x] A-011 Minimal dependencies (Constitution VI): no new runtime or build dependency is introduced; the helper is plain string processing consistent with the file's `node:fs`-only discipline.

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`

## Deletion Candidates

None — this change adds new functionality without making existing code redundant. (The render-side strip is purely additive: `firstH1`, the link rewriter, the sidebar twin, and the pull CLI all remain live; no existing symbol, branch, or config lost its last caller.)

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Strip the first H1 at render time in `[slug]/[...path].astro`, never at pull time | Intake assumption #1 (Certain) — user agreed render-side; pull-time strip explicitly rejected (verbatim-commit contract §9); matches the file's existing render-side rewrite discipline | S:95 R:85 A:95 D:95 |
| 2 | Certain | Strip only when the title was derived from the H1 (no-H1 fallback pages untouched), encoded inherently via a no-op-when-no-H1 helper | Intake assumption #2 (Certain) — stated verbatim in the agreed fix; no separate flag through `getStaticPaths` needed | S:95 R:90 A:95 D:90 |
| 3 | Certain | Helper lives in `docs-site-tree.ts`, single-sourcing the H1 line match with `firstH1` | Intake assumption #3 (Certain) — `docs-site-tree.ts` owns title derivation; colocation guarantees title/strip alignment | S:70 R:90 A:85 D:70 |
| 4 | Certain | Unit test added as a new `scripts/docs-site-tree.test.mjs` following the `extract-readme.test.mjs` node-test pattern | Intake assumption #4 (Certain) — no docs-site-tree test file exists; suite convention is one test file per lib module | S:65 R:95 A:85 D:75 |
| 5 | Confident | Spec note placed in the `docs/site/ render side` bullet under §8 (the render-model text §9's status blockquote references as "§8 render side") | Intake assumption #5 (Confident) — content fixed by the conversation; §8's render-side bullet is where the render model is authoritatively stated, exact anchor is apply-time judgment | S:70 R:95 A:80 D:65 |
| 6 | Certain | Accepted side effect: `headings` prop loses the h1 entry; no compensation added | Intake assumption #6 (Certain) — called out and accepted ("harmless, Starlight's right-rail TOC starts at h2") | S:85 R:90 A:85 D:85 |
| 7 | Confident | Single-source the H1 match by extracting a shared line-matcher (regex/predicate) used by both `firstH1` and `stripFirstH1` | Intake §1 asks for single-sourcing "ideally"; extracting the shared matcher is the cleanest way to guarantee alignment and avoid duplicating the regex (code-quality anti-pattern) | S:75 R:90 A:85 D:70 |
| 8 | Confident | Collapse a single blank line immediately following the stripped H1 (cosmetic whitespace handling), pinned in the unit test | Intake assumption #8 (Confident) — either behavior renders identically; collapsing avoids a leading blank line in the rendered body, and the test pins the chosen behavior | S:45 R:95 A:75 D:60 |

8 assumptions (5 certain, 3 confident, 0 tentative).
