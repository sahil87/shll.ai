# Plan: Tool-Page Install One-Liner + Screenshots

**Change**: 260715-moju-tool-page-install-screenshots
**Intake**: `intake.md`

## Requirements

<!-- Derived from intake.md. All site work is in sites/astro-starlight-terminal1/.
     Canonical tool URLs are at the root per change 3ke3 (/<tool>/), overview
     files physically at src/content/docs/tools/<tool>/overview.mdx with a
     slug: frontmatter override. -->

### Install: Shared one-liner component

#### R1: Roster-validated `InstallOneLiner.astro` component
A new build-time component `src/components/InstallOneLiner.astro` SHALL take a `tool` slug prop and render a terminal-styled block carrying the per-tool one-step install one-liner. It SHALL validate the slug against the shared roster (`isToolSlug` from `src/lib/tool-slugs.ts`) and **fail the build** on a missing or unknown slug with a descriptive error, mirroring `GithubButton`'s missing-slug guard and `CommandReference`'s top-level guard. It SHALL ship **zero client JS** (Constitution I) and add **no new dependency** (Constitution VI).

- **GIVEN** a valid slug (e.g. `run-kit`) is passed to `<InstallOneLiner tool="run-kit" />`
- **WHEN** the site builds
- **THEN** the rendered block contains the exact install one-liner `curl -fsSL https://shll.ai/install | sh -s -- run-kit`
- **AND** the block ships no `<script>` and introduces no runtime data fetch

- **GIVEN** an unknown slug (e.g. `bogus`) is passed to `<InstallOneLiner tool="bogus" />`
- **WHEN** the site builds
- **THEN** the build fails with a descriptive error naming the offending slug
- **AND** no partial/broken install line is emitted

- **GIVEN** the `tool` prop is omitted
- **WHEN** the site builds
- **THEN** the build fails loudly (the prop is required), matching `GithubButton`'s behavior

#### R2: One-liner content, single source, vn39-clean
The component SHALL be the **single source** of the per-tool install one-liner — it SHALL NOT introduce 7 hand-copied install blocks, and it SHALL NOT modify the two documented hand-copy carriers (the homepage install block in `index.mdx`, `getting-started/install.md`). The rendered line SHALL read `$ curl -fsSL https://shll.ai/install | sh -s -- <tool>` plus one short site-authored sentence linking to `/getting-started/install/` for the whole-toolkit story. The one-liner names only `curl`/`sh` (exempt shell tokens) and no tool-binary subcommands or flags, so it introduces no `help/<tool>.json` (`vn39`) friction.

- **GIVEN** the seven overview pages each render `<InstallOneLiner tool="<slug>" />`
- **WHEN** the site builds
- **THEN** each `dist/<tool>/index.html` carries the one-liner with its own slug after `sh -s --`
- **AND** the homepage install block and `getting-started/install.md` are unchanged (grep confirms no new hand-copy)

#### R3: Terminal idiom, dark-mode parity, select-only-command affordance
The component SHALL reuse the homepage install block's `shell-session` idiom — the `$` prompt in a `user-select: none` span so text selection copies the command only — and SHALL reuse existing `terminal.css` `.shell-session`/`.shell-line`/`.shell-prompt`/`.shell-comment` classes and `--c-*` tokens (dark-mode parity for free, Constitution V). Component-scoped styles are added ONLY if genuinely new (nothing new is expected).

- **GIVEN** the component is rendered
- **WHEN** viewed in light and dark themes
- **THEN** all colors resolve from `--c-*` tokens (no hardcoded colors), so both themes render correctly
- **AND** selecting the command line copies the command without the leading `$ ` prompt

### Overview body shape: `## Install` section

#### R4: Each overview gains an `## Install` section (7 files)
Each `src/content/docs/tools/<tool>/overview.mdx` SHALL import `InstallOneLiner` (relative path `../../../../components/InstallOneLiner.astro`, the same 4-level ascent as `GithubButton`) and render an `## Install` section containing `<InstallOneLiner tool="<tool>" />`, placed **between the job-framed lead and `## How it fits`**. The resulting overview order SHALL be: `<GithubButton>` → lead → `## Install` → (`## Screenshots` where present) → `## How it fits` → `## Where to next`.

- **GIVEN** any tool overview page
- **WHEN** the site builds
- **THEN** the page renders an `## Install` heading with the tool's install one-liner between the lead paragraph and `## How it fits`

#### R5: run-kit Screenshots ordered after Install
`run-kit`'s existing `## Screenshots` section SHALL appear **after** `## Install` and **before** `## How it fits`. Its two existing screenshots (`/screenshots/run-kit-agent-session.webp`, `/screenshots/run-kit-console.webp`) SHALL continue to render with their existing alt text. No new screenshot captures are made in this change.

- **GIVEN** run-kit's overview
- **WHEN** the site builds
- **THEN** section order is `<GithubButton>` → lead → `## Install` → `## Screenshots` → `## How it fits` → `## Where to next`
- **AND** both existing screenshots still render with alt text intact

### Constitution: bless site-owned curated screenshots

#### R6: Constitution PATCH v2.1.3 — third permitted content class
`fab/project/constitution.md` SHALL be amended (a PATCH: the six core principles and the deep-synced-content principle are unchanged; only the **Tool-Page Depth** scope note is refined — the `4s3e` v2.1.1 / `x0br` v2.1.2 precedent). The amendment SHALL add a **third permitted content class** to Tool-Page Depth: **site-owned curated screenshots** — committed static assets under the live site (`public/screenshots/<tool>-*.webp`), hand-captured and hand-placed on the overview's `## Screenshots` section. The scope note SHALL carry the rationale (screenshots are curated visual captures versioned in-repo, not command/flag prose, so the mechanical-sync anti-drift rule does not apply; staleness risk is visual-only and acceptable for marketing framing), the constraints (MUST carry meaningful alt text per the existing Accessibility constraint, SHOULD be `.webp`, and remain distinct from *synced* README imagery which keeps flowing to the readme page mechanically), and SHALL retroactively legitimize the run-kit screenshots added by PR #82. The `Version` line SHALL become `2.1.3`, `Last Amended` updated, and a dated changelog entry naming change `moju` SHALL be added following the existing changelog format.

- **GIVEN** the constitution
- **WHEN** the PATCH is applied
- **THEN** the Tool-Page Depth constraint lists three permitted content classes (pulled README slice, pulled `docs/site` tree, and site-owned curated screenshots)
- **AND** the version reads `2.1.3` with a dated `moju` changelog entry that explicitly names the run-kit / PR #82 screenshots
- **AND** the six core principles (I–VI) are textually unchanged

### Non-Goals

- No new screenshot assets for the other six tools — none exist and none can be fabricated here; they follow as assets are captured (out of scope).
- No hoisting of hop/fab-kit README images onto their overviews — those are synced content belonging to the readme page; hoisting would create a second render of upstream-controlled imagery.
- No changes to the homepage install block or `getting-started/install.md` (the two canonical hand-written install carriers stay as-is).
- No new `## Screenshots` sections on the six tools without assets.

### Design Decisions

1. **Shared component over 7 hand-copies**: `InstallOneLiner.astro` with a `tool` prop — *Why*: repo's established single-source pattern (`GithubButton`, `VersionTable`, `ToolsIndex`) and avoids adding a fourth+ hand-copy drift surface — *Rejected*: 7 inline blocks per overview (drift-prone, contradicts the single-source ethos).
2. **`.astro` component, not MDX text, carries the one-liner**: *Why*: the command contains both `--` and a bare URL, which MDX's remark/smartypants pass would mangle (em-dash + auto-link) as documented in `index.mdx`; an `.astro` component template is plain HTML, so the literal `sh -s -- <tool>` and the URL survive verbatim — *Rejected*: inline MDX `<pre>` (would require JSX-expression escaping per tool, reintroducing per-file fragility).
3. **Slug validation via `isToolSlug` (build-fail)**: *Why*: mirrors `GithubButton`/`CommandReference` guards and the roster-gate pattern from `tool-slugs.ts`; a bad slug is a page-author error that must not deploy — *Rejected*: silent fallback / render-anyway (would ship a broken install command).
4. **Constitution PATCH (not MINOR/MAJOR)**: *Why*: principles unchanged, only the Tool-Page Depth scope note is refined; matches the `4s3e`/`x0br` PATCH precedent exactly — *Rejected*: MINOR bump (no new principle is added).

## Tasks

### Phase 1: Setup

- [x] T001 <!-- rework: review must-fix — `sh -s -- shll` is a hard-erroring command (`shll` is not a valid `shll install` target per help/shll.json; the script execs `shll install "$@"`). Special-case `tool === 'shll'` in the component: render the whole-toolkit one-liner `curl -fsSL https://shll.ai/install | sh` with a matching note (e.g. "Installs `shll` and the whole toolkit via Homebrew"), leaving the other six tools unchanged. ALSO review should-fix: drop the component-scoped `.install-one-liner-note a` link-style copy and instead add `.install-one-liner-note a` to terminal.css's ONE shared terminal-link selector group (`.shell-session a, .home-prose a, .tools-listing a` — the ld0j one-source convention; class names survive Astro scoping). --> Create `sites/astro-starlight-terminal1/src/components/InstallOneLiner.astro`: a build-time component taking a `tool: string` prop; import `isToolSlug` from `../lib/tool-slugs.ts`; throw a descriptive `Error` on a missing prop (required) and on an unknown slug (name the offending slug); render a `.shell-session not-content` block with a `shell-line` containing a `user-select: none` `shell-prompt` `$` span followed by the literal `curl -fsSL https://shll.ai/install | sh -s -- <tool>`, plus one short site-authored sentence linking to `/getting-started/install/`; use only existing `terminal.css` classes and `--c-*` tokens (zero new hardcoded colors, zero client JS). <!-- R1 R2 R3 -->

### Phase 2: Core Implementation

- [x] T002 [P] Edit `src/content/docs/tools/idea/overview.mdx`: add `import InstallOneLiner from '../../../../components/InstallOneLiner.astro';` next to the GithubButton import, and insert an `## Install` section with `<InstallOneLiner tool="idea" />` between the lead paragraph and `## How it fits`. <!-- R4 -->
- [x] T003 [P] Edit `src/content/docs/tools/hop/overview.mdx`: same import + `## Install` section with `<InstallOneLiner tool="hop" />` between lead and `## How it fits`. <!-- R4 -->
- [x] T004 [P] Edit `src/content/docs/tools/fab-kit/overview.mdx`: same import + `## Install` section with `<InstallOneLiner tool="fab-kit" />` between lead and `## How it fits`. <!-- R4 -->
- [x] T005 [P] Edit `src/content/docs/tools/wt/overview.mdx`: same import + `## Install` section with `<InstallOneLiner tool="wt" />` between lead and `## How it fits`. <!-- R4 -->
- [x] T006 [P] Edit `src/content/docs/tools/tu/overview.mdx`: same import + `## Install` section with `<InstallOneLiner tool="tu" />` between lead and `## How it fits`. <!-- R4 -->
- [x] T007 [P] Edit `src/content/docs/tools/shll/overview.mdx`: same import + `## Install` section with `<InstallOneLiner tool="shll" />` between lead and `## How it fits`. <!-- R4 -->
- [x] T008 Edit `src/content/docs/tools/run-kit/overview.mdx`: add the import + an `## Install` section with `<InstallOneLiner tool="run-kit" />` and reorder so the section order is lead → `## Install` → `## Screenshots` (existing, unchanged content) → `## How it fits` → `## Where to next`. <!-- R4 R5 -->

### Phase 3: Constitution PATCH

- [x] T009 Edit `fab/project/constitution.md`: amend the **Tool-Page Depth** constraint to add the third permitted content class (site-owned curated screenshots: `public/screenshots/<tool>-*.webp`, hand-captured/placed, meaningful alt text required, `.webp` preferred, distinct from synced imagery), carrying the visual-only-staleness rationale; bump `Version` to `2.1.3` and update `Last Amended`; add a dated `2.1.3` changelog entry naming change `moju` and explicitly citing the retroactive coverage of run-kit's PR #82 screenshots; keep the six core principles textually unchanged. <!-- R6 -->

### Phase 4: Verification

- [x] T010 <!-- rework: re-verify after the T001 fixes — additionally confirm dist/shll/index.html carries the whole-toolkit one-liner (no `sh -s -- shll`) and a non-degenerate note, and that the install-note link styling still renders identically from the shared terminal.css group. --> From `sites/astro-starlight-terminal1/`: run `pnpm build` (succeeds); confirm each `dist/<tool>/index.html` contains the install one-liner with the correct `sh -s -- <slug>`; confirm run-kit's built page orders Install before Screenshots and both screenshots still render; run `node --test scripts/*.test.mjs` (passes); and confirm a temporary unknown slug passed to `InstallOneLiner` fails the build with a descriptive error (revert the probe after). <!-- R1 R2 R4 R5 -->

## Execution Order

- T001 blocks T002–T008 (the overviews import the component).
- T002–T007 are mutually independent (`[P]`) — different files, all identical shape.
- T008 depends on T001 and also reorders run-kit's existing Screenshots section.
- T009 is independent of the component work (constitution file) and may run in parallel with Phase 2.
- T010 runs last (after T001–T009), verifying the whole change end-to-end.

## Acceptance

### Functional Completeness

- [x] A-001 R1: `src/components/InstallOneLiner.astro` exists, takes a `tool` prop, validates it against `isToolSlug`, and renders the install one-liner block at build time with zero client JS and no new dependency.
- [x] A-002 R2: The component is the single source of the one-liner; no new hand-copied install block is added to any overview, and neither the homepage install block nor `getting-started/install.md` is modified.
- [x] A-003 R3: The rendered block reuses the `shell-session` idiom (select-none `$` prompt) and existing `terminal.css` `--c-*` tokens — no hardcoded colors.
- [x] A-004 R4: All seven `overview.mdx` files render an `## Install` section with `<InstallOneLiner tool="<slug>" />` between the lead and `## How it fits`.
- [x] A-005 R6: `fab/project/constitution.md` Tool-Page Depth lists site-owned curated screenshots as a third permitted content class; version is `2.1.3` with a dated `moju` changelog entry naming the PR #82 run-kit screenshots; principles I–VI unchanged.

### Behavioral Correctness

- [x] A-006 R2: Each built `dist/<tool>/index.html` contains the install one-liner with its own slug after `sh -s --` (e.g. `dist/run-kit/index.html` has `sh -s -- run-kit`). <!-- re-review note (moju, rework cycle 1): met with the reworked deliberate exception for shll — help/shll.json states "shll itself is NOT a valid install target" and "an unknown name is a hard error", so dist/shll/index.html now carries the whole-toolkit `curl -fsSL https://shll.ai/install | sh` (no `sh -s -- shll` anywhere in dist, grep-verified) with a matching non-degenerate note; the other six built pages each carry `sh -s -- <own-slug>` -->
- [x] A-007 R5: run-kit's built overview shows `## Install` before `## Screenshots`, and both existing `.webp` screenshots render with their alt text.
- [x] A-008 R3: The block renders correctly in both light and dark themes (colors resolve from `--c-*` tokens) and selecting the command copies the command without the `$ ` prompt.

### Scenario Coverage

- [x] A-009 R1: `pnpm build` succeeds and `node --test scripts/*.test.mjs` passes (225/225).

### Edge Cases & Error Handling

- [x] A-010 R1: Passing an unknown slug to `<InstallOneLiner>` fails the build with a descriptive error naming the offending slug (verified with a temporary probe, then reverted); a missing `tool` prop also fails the build (both probes re-run at review, both failed the build as required, both reverted).

### Code Quality

- [x] A-011 Pattern consistency: `InstallOneLiner.astro` follows the surrounding component conventions (`GithubButton`/`CommandReference` guard idiom, header doc comment, `not-content` wrapper, `--c-*` tokens).
- [x] A-012 No unnecessary duplication: The component reuses `isToolSlug` (`tool-slugs.ts`) and existing `terminal.css` shell-session classes rather than reimplementing roster validation or terminal styling. <!-- re-review note (moju, rework cycle 1): met — the scoped link-style copy is gone; the component <style> now carries only layout/typography rules (no `a` selectors), and `.install-one-liner-note a` rides the ONE shared terminal.css selector group (base + hover/focus, lines 440/451-452), verified intact in the compiled CSS (`.shell-session a,.home-prose a,.tools-listing a,.install-one-liner-note a{`) with zero scoped anchor rules -->


## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`

## Deletion Candidates

None — this change adds new functionality (a new component, new `## Install` sections, a constitution scope-note extension) without making existing code redundant. The two hand-copy install carriers (homepage `index.mdx` block, `getting-started/install.md`) remain deliberately canonical per R2; nothing they carry became replaceable by the component.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Shared `InstallOneLiner.astro` (tool prop, `isToolSlug`-validated, build-fail) instead of 7 hand-copies | Intake Assumption #1 (user-approved); mirrors GithubButton/VersionTable/ToolsIndex single-source precedents and the tool-slugs roster gate | S:90 R:85 A:90 D:90 |
| 2 | Certain | Constitution PATCH v2.1.3 blessing site-owned curated screenshots as a third content class; retroactively covers run-kit's PR #82 screenshots | Intake Assumption #2 (user-approved); exact `4s3e`/`x0br` PATCH precedent (scope note refined, principles unchanged) | S:85 R:75 A:85 D:85 |
| 3 | Confident | `## Install` between lead and `## How it fits`; run-kit's `## Screenshots` follows Install | Intake Assumption #3; conventional top-of-page install placement, keeps nav sections last | S:55 R:85 A:80 D:70 |
| 4 | Confident | Render idiom: homepage shell-session markup with select-none `$` prompt, existing `terminal.css` `--c-*` tokens; component-scoped styles only if genuinely new | Intake Assumption #4; matches the repo's proven install-block treatment and selection-copy affordance | S:60 R:85 A:85 D:75 |
| 5 | Confident | The one-liner rides an `.astro` component template (plain HTML), not MDX text, to survive the documented remark `--`/URL mangling verbatim | index.mdx's own remark-hazard comment establishes the failure mode; component template avoids it cleanly (no per-file JSX-expression escaping) | S:70 R:80 A:85 D:80 |
| 6 | Confident | No unit `.mjs` test added for the component; the build is the verification (unknown-slug fails build), consistent with how GithubButton and other `.astro` components are validated | Component carries no standalone lib logic the `.mjs` tests cover; test-alongside is satisfied by the build-fail guard + build verification (T010) | S:60 R:85 A:80 D:70 |

6 assumptions (2 certain, 4 confident, 0 tentative).
