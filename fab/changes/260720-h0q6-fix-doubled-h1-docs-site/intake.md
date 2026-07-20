# Intake: Fix doubled H1 heading on pulled docs/site pages (render-side strip)

**Change**: 260720-h0q6-fix-doubled-h1-docs-site
**Created**: 2026-07-20

## Origin

Promptless dispatch from `/fab-proceed`, synthesized from a live conversation in which the bug was diagnosed and the fix agreed:

> **Fix doubled H1 heading on all pulled docs/site pages (render-side strip)**
>
> All 33 pulled `docs/site/` tree pages (rendered at `/<slug>/<path>`, e.g. `/fab-kit/fkf`) show their title heading twice. Root cause: `docs-site-tree.ts` derives each page's `title` from the markdown's first ATX H1 via `firstH1()`, and `[slug]/[...path].astro` passes that title to `<StarlightPage frontmatter={{ title }}>` (Starlight renders it as the page H1) AND renders the raw markdown body verbatim — which still contains its own `# Title` line. Decision made: strip the first H1 line from the raw markdown at RENDER time, before `processor.render()` — only when the page title was actually derived from that H1. Alternative rejected: stripping at pull time (the docs/site tree contract commits pages verbatim).

Interaction mode: conversational diagnosis → agreed fix → promptless intake creation (no questions asked; any residual decisions are graded in `## Assumptions`).

## Why

1. **The pain point**: every one of the 33 committed docs/site pages (verified: all 33 files under `content/<slug>/site/**` start with a line-1 ATX H1) renders its title twice — once as Starlight's page H1 (from `<StarlightPage frontmatter={{ title }}>`) and once as the markdown body's own `# Title` line. This is a visible rendering defect on every docs/site page of the live site (e.g. `/fab-kit/fkf`, `/idea/install`, `/shll/standards/principles`).

2. **The consequence if unfixed**: every tool's deep-documentation page looks broken (duplicate heading at the top), undermining the polish of the site's highest-depth content class — and every future pulled page inherits the same defect, since conforming producer pages naturally begin with an H1.

3. **Why this approach (render-side strip) over alternatives**: the docs/site tree is deliberately committed **byte-verbatim** — the on-disk copy is a verbatim copy of the canonical source (spec `readme-extraction-contract.md` §9; the extraction CLI mutates nothing). Stripping at pull time in `scripts/extract-docs-site-cli.mjs` was considered and **rejected** because it would violate that verbatim-commit contract. A render-side strip matches the existing discipline already present in the very same file: the relative-link rewrite in `[slug]/[...path].astro` is also render-side, with the comment "The slice on disk stays a verbatim copy of the canonical source; the rewrite is render-side." README slice pages do NOT have this bug only because the README **extraction** head rule (§1) strips the H1 at extraction time — but that tree is a *deduced slice*, not a verbatim copy, so the two content classes legitimately differ in where the strip lives.

## What Changes

### 1. H1-strip helper (exported, unit-testable)

Add a small exported helper that strips the first ATX H1 line from a markdown string — colocated with `firstH1()` in `sites/astro-starlight-terminal1/src/lib/docs-site-tree.ts`, which already owns title derivation for these pages. Critical alignment requirement: **the strip must remove exactly the line `firstH1()` matched** (the first line matching `/^#\s+(.+?)\s*#*\s*$/`), so the stripped heading and the derived title can never diverge — ideally by single-sourcing the line-matching logic between the two functions rather than duplicating the regex. Suggested shape:

```ts
/** Remove the first ATX H1 line (the one `firstH1` derives the title from).
 *  Returns the markdown unchanged when no H1 is present. */
export function stripFirstH1(markdown: string): string
```

Behavior:
- Input with a first ATX H1 (`# Title`, anywhere `firstH1` would find it) → that single line removed (the following blank line may also be collapsed; cosmetic — either is acceptable as long as rendering is clean).
- Input with no ATX H1 → returned **unchanged** (this is the "title fell back to the titleized path tail — strip nothing" case).
- Must be dependency-free plain string processing (Constitution VI), consistent with the file's existing `node:fs`-only discipline.

### 2. Apply the strip render-side in the dynamic route

In `sites/astro-starlight-terminal1/src/pages/[slug]/[...path].astro`, strip the first H1 from `raw` **before** `processor.render()` — composed with the existing render-side link rewrite, e.g.:

```ts
const rendered = await processor.render(
  rewriteDocsSiteLinks(stripFirstH1(raw), slug, mountPath),
);
```

- Strip **only when the page title was actually derived from that H1**. Since `stripFirstH1` is a no-op when no H1 exists (exactly the case where `collectDocsSitePages` fell back to `titleizeTail`), the conditional is inherent in the helper's contract — no separate flag needs to be plumbed through `getStaticPaths` props.
- The on-disk `content/<slug>/site/**` files stay byte-verbatim; the strip is render-side only (mirror the existing comment discipline — extend or add a comment stating this, alongside the existing link-rewrite comment).
- Known, accepted side effect: `rendered.metadata.headings` handed to `<StarlightPage headings={...}>` loses its h1 entry — harmless; Starlight's right-rail "On this page" TOC starts at h2.

### 3. Unit test

The site has a plain-node test suite at `sites/astro-starlight-terminal1/scripts/*.test.mjs` (run: `cd sites/astro-starlight-terminal1 && node --test scripts/<file>.test.mjs`, Node >= 22 native TS type-stripping — see the header of `extract-readme.test.mjs` for the established pattern). Add unit coverage for the helper — a new `scripts/docs-site-tree.test.mjs` following that pattern (or extending an existing test file if more natural at apply time). Cases to pin:

- H1 on line 1 → line removed, rest byte-identical (modulo the optional adjacent blank-line collapse).
- No H1 anywhere → input returned unchanged (fallback-title pages keep their body intact).
- Strip targets the same line `firstH1` matches (title/strip alignment) — e.g. first H1 not on line 1.
- H2-only document → unchanged (an `## Heading` line must not be stripped).

### 4. Spec note (one line)

`docs/specs/readme-extraction-contract.md` is currently **silent on H1 handling for docs/site pages**. Add a one-line note documenting the render-side H1 strip to the spec's docs/site render-model text — the conversation placed it in **§9** ("The `docs/site/` documentation tree"); note the render-side render model is described in the "`docs/site/` render side" bullet under §8's render section (§9's status blockquote points at it as "§8 render side"), so the note lands wherever the render model is stated — exact placement is an apply-time judgment, content is fixed: the route strips the first H1 at render time (the title is promoted to the Starlight page title) while the committed page stays verbatim.

### 5. Memory hydrate

Update `docs/memory/conventions/docs-site-tree.md` (the domain file covering the docs/site consume/pull side, the dynamic route, and the render-side transforms — confirmed via `docs/memory/conventions/index.md`) to record the render-side H1 strip alongside the existing render-side link-resolution facts. Regenerate indexes per the normal hydrate flow (`fab memory-index`).

### Explicitly NOT changed

- `scripts/extract-docs-site-cli.mjs` — no pull-time mutation (rejected alternative; verbatim-commit contract holds).
- `src/lib/docs-site-sidebar.mjs` — sidebar labels read the H1 for `{ label }` only; it renders no body, so it is unaffected (and must keep working from the on-disk verbatim files).
- Committed `content/<slug>/site/**` files — stay byte-verbatim.
- README slice path (`extract-readme.ts` §1 head rule, `ReadmeSlice.astro`) — already strips its H1 at extraction time; untouched.

## Affected Memory

- `conventions/docs-site-tree`: (modify) add the render-side H1 strip to the recorded render-side transform set (link resolution + now H1 strip); note the title/strip single-sourcing in `docs-site-tree.ts`

## Impact

- **Code**: `sites/astro-starlight-terminal1/src/lib/docs-site-tree.ts` (new exported helper, ~10 lines), `sites/astro-starlight-terminal1/src/pages/[slug]/[...path].astro` (one-call composition + comment). No new dependencies (Constitution VI). Static build-time only (Constitution I). Dark-mode parity untouched (Constitution V — no styling change).
- **Tests**: new `sites/astro-starlight-terminal1/scripts/docs-site-tree.test.mjs` (plain `node --test`, existing pattern).
- **Docs**: one-line spec note in `docs/specs/readme-extraction-contract.md`; memory update in `docs/memory/conventions/docs-site-tree.md`.
- **Blast radius**: all 33 currently-committed docs/site pages change rendered output (duplicate H1 disappears); URLs, sidebar, TOC anchors, and on-disk content unchanged. Verify with `pnpm build` in the site dir plus the unit test.

## Open Questions

- (none — the fix, its placement, and the rejected alternative were all decided in the originating conversation; residual micro-decisions are graded below)

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Strip the first H1 at render time in `[slug]/[...path].astro`, never at pull time | Discussed — user agreed render-side fix; pull-time strip explicitly rejected (verbatim-commit contract, §9); matches the file's existing render-side rewrite discipline | S:95 R:85 A:95 D:95 |
| 2 | Certain | Strip only when the title was derived from the H1 (no-H1 fallback pages are left untouched) | Discussed — stated verbatim in the agreed fix; a no-op-when-no-H1 helper encodes it inherently | S:95 R:90 A:95 D:90 |
| 3 | Certain | Helper lives in `docs-site-tree.ts` (colocated with `firstH1`, single-sourcing the H1 line match) rather than `extract-readme.ts` | Conversation offered either file; `docs-site-tree.ts` owns title derivation, and colocating guarantees title/strip alignment — clear front-runner, trivially movable | S:70 R:90 A:85 D:70 |
| 4 | Certain | Unit test added as a new `scripts/docs-site-tree.test.mjs` following the `extract-readme.test.mjs` node-test pattern | Conversation asked for unit tests per existing patterns; no docs-site-tree test file exists yet, and the suite convention is one test file per lib module | S:65 R:95 A:85 D:75 |
| 5 | Confident | Spec note placement: in the docs/site render-model text of `readme-extraction-contract.md` — conversation said §9; the render-side bullet itself sits under §8's render section — exact anchor is an apply-time judgment | One-line documentation note; content fixed by the conversation, placement is cosmetic and easily moved | S:70 R:95 A:80 D:65 |
| 6 | Certain | Accepted side effect: `headings` prop loses the h1 entry; no compensation added | Discussed — called out and accepted in conversation ("harmless, Starlight's right-rail TOC starts at h2") | S:85 R:90 A:85 D:85 |
| 7 | Certain | Memory target is `conventions/docs-site-tree.md` (modify), no other memory file | Conversation said "likely conventions — check the index"; index check confirms docs-site-tree.md owns the dynamic route + render-side transforms | S:70 R:95 A:90 D:85 |
| 8 | Confident | Blank line immediately following the stripped H1 may also be collapsed (cosmetic whitespace handling) | Not discussed; either behavior renders identically — pin whichever the implementation chooses in the unit test | S:40 R:95 A:75 D:55 |

8 assumptions (6 certain, 2 confident, 0 tentative, 0 unresolved).
