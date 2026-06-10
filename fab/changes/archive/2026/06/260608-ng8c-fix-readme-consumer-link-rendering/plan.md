# Plan: Fix consumer-side README/docs-site content-rendering gaps

**Change**: 260608-ng8c-fix-readme-consumer-link-rendering
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

All work is in `sites/astro-starlight-terminal1/`. Every new/changed detector stays **pure, total
(never throws), dependency-free, build-time** (Constitution I/VI) and is single-sourced in
`src/lib/extract-readme.ts`, pinned by `scripts/extract-readme.test.mjs` (run: `node --test
scripts/extract-readme.test.mjs`). Every new lint is **report-only** (warn + write + exit 0) — never a
publish gate (preserves `4s3e`'s canonical-source posture).

### Extraction: README-slice link lint (gap 1)

#### R1: The README slice is link-linted (report-only) for site-escaping relative links and relative images
A new pure exported detector `findReadmeLinkViolations(slice)` SHALL return the relative link/image
targets in a deduced README slice that would not resolve on the site: a **relative link** target that is
NOT a `docs/site/<p>.md` link (those are render-rewritten by `rewriteReadmeDocsSiteLinks`), and any
**relative image** target (images MUST be absolute, §3). It MUST reuse the existing `rewriteLinkTargets`
scanner + `isAbsoluteTarget` guard so detection and the rewrite guard cannot drift. `extract-readme-cli.mjs`
SHALL consume a non-empty result as a `::warning::` naming the file + each target, then STILL write the
slice and exit 0. Scope is "relative AND not a `docs/site/<p>.md` link" (intake Q/assumption #9) — a
relative link to a non-`.md` docs/site asset is NOT special-cased.

- **GIVEN** a pulled `idea` slice containing `[overview](docs/specs/overview.md)`
- **WHEN** the README link lint runs in `extract-readme-cli.mjs`
- **THEN** a `::warning::` names the file + `docs/specs/overview.md`, the slice is STILL written to `content/idea/README.md`, and the CLI exits 0
- **AND** a slice whose every link is absolute or a `docs/site/<p>.md` link emits no warning

#### R2: A relative image in the README slice is flagged
`findReadmeLinkViolations` SHALL flag a relative image target (e.g. `![dash](docs/img/dash.png)`) with a
distinct `kind` (`relative-image`), mirroring the docs/site closure lint's image rule.

- **GIVEN** a slice with `![dash](docs/img/dash.png)`
- **WHEN** the lint runs
- **THEN** the target is returned with `kind: 'relative-image'`, and a plain absolute `![x](https://…)` is not flagged

### Extraction: escape/clamp reconciliation (gap 2)

#### R3: A `..`-escape in a docs/site page rewrites to a non-colliding unresolved marker, consistent with the closure detector
`rewriteDocsSiteLinks` SHALL NOT clamp a closure-escaping (`..`-climbing) relative target to a real page.
When a relative target escapes the docs/site root, it SHALL be rewritten to a deliberately non-resolving
marker URL under the tool root that cannot collide with any emitted route or reserved slug
(`/tools/<slug>/__unresolved__/<…>`; the `__unresolved__` segment is reserved-by-construction — it is not
a reserved static slug and no `docs/site/` page can mount there because the lint+marker pair owns it). The
escape predicate SHALL be single-sourced (the same `..`-climb math used by `findClosureViolations`), so
the rewriter and the detector agree on what "escape" means. Non-escaping `.`/`..` targets that stay inside
the tree SHALL continue to resolve normally to `/tools/<slug>/<resolved>`.

- **GIVEN** a docs/site page `advanced/hooks` with `[i](../../install.md)` (escapes the root)
- **WHEN** `rewriteDocsSiteLinks(md, 'idea', 'advanced/hooks')` runs
- **THEN** the target resolves to a non-colliding `/tools/idea/__unresolved__/…` marker (NOT `/tools/idea/install`)
- **AND** `findClosureViolations('advanced/hooks.md', md)` reports the same target with `kind: 'escape'`
- **AND** a non-escaping `[j](../install.md)` from `advanced/hooks` still resolves to `/tools/idea/install`

### Extraction: gh-theme HTML-image strip (gap 3)

#### R4: The §6 gh-theme-only strip removes HTML images, not just markdown images
The strip applied by `extractReadme` SHALL remove HTML images whose `src`/`srcset` carries
`#gh-dark-mode-only` or `#gh-light-mode-only` — a bare `<img src="…#gh-…">` and a `<source srcset="…#gh-…">`
inside `<picture>` — in addition to the existing markdown `![](…#gh-…)` strip. It SHALL remain a pure
whole-line/region text transform (no DOM dependency) and SHALL drop a `<picture>` wrapper left with no
remaining `<source>`/`<img>` (mirroring the markdown strip's empty-line cleanup). `findClosureViolations`
SHALL also scan `<source srcset>` so a relative `<source srcset>` image is seen as a `relative-image`
violation (it currently inspects only `href`/`src`).

- **GIVEN** a slice with `<img src="https://x/dark.svg#gh-dark-mode-only">` and a `<picture>` whose only `<source srcset>` carries `#gh-light-mode-only`
- **WHEN** the §6 strips run
- **THEN** both are removed, no empty `<picture>` residue remains, and a plain `<img>` with no theme fragment survives

### Extraction: head-chrome hardening (gap 4)

#### R5: Head-chrome recognition skips YAML frontmatter, HTML headings, and `<br>`/`<hr>`/`<span>`/comment lines
`headBoundary` SHALL treat the following as skippable leading chrome (so they do NOT leak into the slice):
a single leading YAML frontmatter block when the first non-blank line is `---` (consumed through the
closing `---`); a single leading HTML heading (`<h1…>…</h1>`, possibly multi-line) as equivalent to the
markdown H1 (still "first leading heading only" — a later one is a real section); and badge/image lines
ending in or containing `<br>`/`<hr>`/`<span>` plus a leading HTML comment `<!-- … -->`. The existing
markdown `#` H1, blockquote, and HTML-wrapper recognition SHALL be preserved.

- **GIVEN** a README beginning with a YAML frontmatter block, then `# tool`, then badges, then prose
- **WHEN** the head boundary is computed
- **THEN** the frontmatter, H1, and badges are all skipped and the slice begins at the prose
- **AND** a README whose title is `<h1 align="center">Idea</h1>` followed by a badge row skips both (neither leaks)

### Site config: reserved-slug set cleanup (gap 6 / section 6)

#### R6: The docs/site CLI reserved-slug set is `{overview, readme, commands}`
`scripts/extract-docs-site-cli.mjs` `RESERVED_SLUGS` SHALL be exactly `{overview, readme, commands}`
(dropping `install`, `workflows`), matching the merged contract (PRs #41/#42). A tool's
`docs/site/install.md` SHALL therefore NOT trigger a reserved-slug `::warning::` and SHALL mount at
`/tools/<slug>/install`.

- **GIVEN** the 3-item reserved set
- **WHEN** the CLI lints a tool's `docs/site/install.md`
- **THEN** no reserved-slug warning is emitted for `install`/`workflows`, while a `docs/site/readme.md` still warns

#### R7: The hallucinated static install/workflows pages are removed and leave no dangling references
The four hand-authored static pages (`src/content/docs/tools/{idea,fab-kit}/{install,workflows}.md`) SHALL
be deleted; their `astro.config.mjs` sidebar entries SHALL be removed; and the `[Install]`/`[Workflows]`
nav bullets in `src/content/docs/tools/{idea,fab-kit}/overview.mdx` SHALL be removed. The site build SHALL
succeed with no broken-link/`[WARN]` regression attributable to the removed pages, and no page SHALL
render at `/tools/idea/install` etc. (until a tool publishes its own `docs/site/` version). No replacement
`docs/site/` content is authored here (tool-repo's job).

- **GIVEN** the four static pages deleted and their sidebar/nav references removed
- **WHEN** the site builds (`astro build`)
- **THEN** the build succeeds, no dangling link to the deleted slugs remains, and the old routes emit no page

### Docs: contract prose reconciliation (gap 5)

#### R8: The contract prose is reconciled to the new code behavior
`docs/specs/readme-extraction-contract.md` SHALL be updated so prose matches code (the contract's own
rule): §6 covers HTML images (R4); §1 enumerates the broadened head chrome (R5); §link-resolution states
the escape-emits-marker behavior (R3, superseding the "best-effort clamp" note); and a note (§closure-lint
or §8) records that the README slice is now link-linted report-only (R1/R2). The §Producer conformance
directive SHALL note that a relative README link now *warns*. GIVEN/WHEN/THEN SHALL be added/updated per
changed section. (The reserved-slug set is already correct in the contract from PR #42 — no change needed
for R6/R7 beyond verifying consistency.)

- **GIVEN** the code fixes R1–R5 landed
- **WHEN** the contract is read against the code
- **THEN** §1/§6/§link-resolution/§closure-lint and the directive agree with `extract-readme.ts`, with no stale "clamp"/"markdown-only strip"/"5-item reserved set" claims

### Non-Goals

- Not changing any report-only check to a blocking gate.
- Not adding a defensive consumer rewrite of non-`docs/site/` relative README links (only the warning).
- Not adding HTML sanitization of slices.
- Not authoring replacement `docs/site/` install/workflows content (tool-repo's job).
- Not handling the two admitted §link-resolution shapes (linked-image outer target; reference-style defs).

### Design Decisions

1. **Escape → marker URL, not clamp or throw** (R3): *Why*: makes the break visible and consistent with the report-only lint, without violating purity/total. *Rejected*: keep the clamp + only warn (still renders a confidently-wrong real page); throw (violates total).
2. **Single-source the escape predicate** (R3): *Why*: `rewriteDocsSiteLinks` and `findClosureViolations` must agree on "escape" or the marker/warning can diverge. *Rejected*: two copies of the `..`-climb math (the exact drift this change fixes elsewhere).
3. **README lint reuses `rewriteLinkTargets`/`isAbsoluteTarget`** (R1/R2): *Why*: detection and the rewrite guard share one scanner — no second link parser to drift.

### Deprecated Requirements

#### Old reserved-slug set `{overview, readme, commands, install, workflows}`
**Reason**: PRs #41/#42 released `install`/`workflows` to tool-repo `docs/site/` control.
**Migration**: 3-item set in the CLI (R6); static install/workflows pages removed (R7).

#### Old escape behavior: clamp to tool root
**Reason**: silently rewrote a broken link into a confidently-wrong real page (R3).
**Migration**: non-colliding `__unresolved__` marker. The existing test pinning the clamp (`extract-readme.test.mjs:536`, "a ..-escape is best-effort clamped to the tool root") is updated to assert the marker (test conforms to the new spec, per constitution Test Integrity).

## Tasks

### Phase 1: Extraction-lib core (single file, `src/lib/extract-readme.ts`)

- [x] T001 Add `findReadmeLinkViolations(slice)` + a `ReadmeLinkViolation` type to `src/lib/extract-readme.ts`, reusing `rewriteLinkTargets`/`isAbsoluteTarget`; flag relative links not under `docs/site/` and relative images <!-- R1 R2 -->
- [x] T002 Extract the `..`-escape predicate into one shared helper and have BOTH `findClosureViolations` and `rewriteDocsSiteLinks` use it; change `rewriteDocsSiteLinks` to emit `/tools/<slug>/__unresolved__/<…>` on escape instead of clamping in `resolveSegments` <!-- R3 -->
- [x] T003 [P] Extend the §6 gh-theme strip in `extractReadme` to remove HTML `<img src=…#gh-…>` and `<source srcset=…#gh-…>` and drop emptied `<picture>` wrappers <!-- R4 -->
- [x] T004 [P] Extend `findClosureViolations` to scan `<source srcset>` as an image target (relative-image rule) <!-- R4 -->
- [x] T005 Harden `headBoundary`/`BADGE_LINE_RE` to skip leading YAML frontmatter, a leading HTML `<h1>` heading, and `<br>`/`<hr>`/`<span>`/leading-`<!-- -->` lines <!-- R5 -->

### Phase 2: CLI + config wiring

- [x] T006 Wire `findReadmeLinkViolations` into `scripts/extract-readme-cli.mjs`: import it, run on the slice, emit a `::warning::` per violation, STILL write + exit 0 <!-- R1 R2 -->
- [x] T007 Update `RESERVED_SLUGS` in `scripts/extract-docs-site-cli.mjs` to `{overview, readme, commands}` <!-- R6 -->
- [x] T008 [P] Delete the 4 static pages `src/content/docs/tools/{idea,fab-kit}/{install,workflows}.md` <!-- R7 -->
- [x] T009 Remove the `idea`/`fab-kit` Install/Workflows sidebar entries in `astro.config.mjs` (verify the top-level guides `Workflows` group is left intact) <!-- R7 -->
- [x] T010 [P] Remove the `[Install]`/`[Workflows]` nav bullets from `src/content/docs/tools/{idea,fab-kit}/overview.mdx` <!-- R7 -->

### Phase 3: Tests (alongside)

- [x] T011 Add regression tests to `scripts/extract-readme.test.mjs`: README lint flags a site-escaping relative link + a relative image, and is silent on absolute / `docs/site/` links <!-- R1 R2 -->
- [x] T012 Update the escape test at `extract-readme.test.mjs:536` to assert the `__unresolved__` marker (not the clamp) AND that `findClosureViolations` reports the same target; add a non-escaping-`..`-still-resolves test <!-- R3 -->
- [x] T013 [P] Add tests: HTML `<img>`/`<source srcset>` gh-theme strip + emptied `<picture>` cleanup; plain HTML image survives <!-- R4 -->
- [x] T014 [P] Add tests: frontmatter / HTML `<h1>` / `<br>`-badge head-chrome are skipped, not leaked <!-- R5 -->
- [x] T015 Run `node --test scripts/extract-readme.test.mjs` — all pass (fix regressions) <!-- R1 R2 R3 R4 R5 -->

### Phase 4: Build verify + contract reconciliation

- [x] T016 Reconcile `docs/specs/readme-extraction-contract.md` prose to the new code: §6 (HTML images), §1 (head chrome), §link-resolution (escape→marker, supersede clamp note), README-lint note (§closure-lint/§8), directive note; add/adjust GIVEN/WHEN/THEN <!-- R8 -->
- [x] T017 Build the site (`cd sites/astro-starlight-terminal1 && pnpm install --frozen-lockfile && npx astro build`); confirm success, no dangling-link/[WARN] regression from removed pages, no page at old install/workflows routes <!-- R7 -->

## Execution Order

- T001–T005 (lib) precede T006/T011–T015 (the CLI + tests that consume them).
- T002 (escape predicate) must precede T012 (its test) and is independent of T003/T004 (different code regions, marked [P]).
- T007–T010 (config/page removal) are independent of the lib work; T017 (build) must run after T008–T010.
- T015 (unit tests) after Phase 1–2 lib/CLI; T016/T017 last.

## Acceptance

### Functional Completeness

- [x] A-001 R1: `findReadmeLinkViolations` exists, is pure/total, reuses the shared scanner, and `extract-readme-cli.mjs` warns (report-only) on a site-escaping relative README link while still writing the slice
- [x] A-002 R2: a relative image in the slice is flagged `relative-image`; absolute images are not
- [x] A-003 R3: a docs/site `..`-escape rewrites to a non-colliding `__unresolved__` marker (not a real page), via a predicate shared with `findClosureViolations`
- [x] A-004 R4: HTML `<img>`/`<source srcset>` gh-theme-only images are stripped; emptied `<picture>` removed; plain HTML images survive; `findClosureViolations` sees relative `<source srcset>`
- [x] A-005 R5: leading YAML frontmatter, HTML `<h1>` title, and `<br>`/`<hr>`/`<span>`/comment chrome lines are skipped (not leaked into the slice)
- [x] A-006 R6: `RESERVED_SLUGS` is `{overview, readme, commands}`; `docs/site/install.md` no longer warns
- [x] A-007 R7: the 4 static pages are gone, sidebar + overview nav refs removed, and the site builds with no dangling links / no page at the old routes

### Behavioral Correctness

- [x] A-008 R3: a non-escaping `..` target inside docs/site still resolves normally to `/tools/<slug>/<resolved>` (the marker is only for true escapes)
- [x] A-009 R3: the escape test at `extract-readme.test.mjs:536` now asserts the marker behavior (updated to match the new spec, not the old clamp)

### Removal Verification

- [x] A-010 R6/R7: no remaining reference to `install`/`workflows` as a reserved slug in the CLI, and no remaining reference to the deleted static pages in `astro.config.mjs` or any `overview.mdx`

### Scenario Coverage

- [x] A-011 R1–R5: `node --test scripts/extract-readme.test.mjs` passes, including the new regression tests for each gap
- [x] A-012 R7: `astro build` succeeds (the live-build verification)

### Edge Cases & Error Handling

- [x] A-013 R1: a missing/unreadable INPUT README is still a hard error (the README lint does not change that); the new lint only adds warnings, never a non-zero exit
- [x] A-014 R4: all extended detectors remain total — empty/whitespace/garbage input does not throw

### Code Quality

- [x] A-015 Pattern consistency: new detectors follow the existing pure/total/exported shape and JSDoc style of `extract-readme.ts`; CLIs follow the existing `::warning::` + write + exit-0 idiom
- [x] A-016 No unnecessary duplication: the `..`-escape math and the link-target scanner are single-sourced (no second copy); README lint reuses `rewriteLinkTargets`/`isAbsoluteTarget`
- [x] A-017 No magic strings: the `__unresolved__` marker segment is a named constant
- [x] A-018 Test integrity: changed test (T012) conforms to the new spec/contract, not the reverse (constitution Test Integrity)

## Notes

- Run unit tests with `node --test scripts/extract-readme.test.mjs` (native node test runner; no npm `test` script).
- The build (T017) may require `pnpm install` in the site dir first; it is the only step needing the full toolchain.

## Deletion Candidates

- `resolveSegments` (formerly `src/lib/extract-readme.ts`) — confirmed already removed/replaced by the shared `resolvePath`; left no dead export. (Verified by both review sub-agents.)
- `GH_THEME_FRAGMENT_RE` (`src/lib/extract-readme.ts`) — unused constant introduced then removed during review (zero call-sites). Already deleted.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | `__unresolved__` is the marker path segment for escaped docs/site links | Cannot collide: it is not a reserved static slug and no real `docs/site/` page mounts there; reads as broken-on-purpose; named constant per A-017 | S:80 R:70 A:85 D:80 |
| 2 | Confident | The README lint scopes to "relative AND not a `docs/site/<p>.md` link"; non-`.md` docs/site assets are not special-cased | Resolves intake Q/assumption #9 the simple way; covers the live 404 class; the docs/site closure lint already covers the tree side | S:70 R:68 A:72 D:65 |
| 3 | Confident | HTML head-chrome (`<h1>`, frontmatter) is skipped by broadening recognition, not by a full HTML parser | Pure string/line matching keeps the detector dependency-free + total (Constitution VI); a real parser is overkill and risks the guard's precision | S:75 R:70 A:80 D:72 |
| 4 | Certain | The existing clamp test (`:536`) is rewritten to assert the marker | Test Integrity: tests conform to the spec; the contract now mandates escape→marker, so the old clamp assertion is stale | S:88 R:75 A:90 D:88 |

4 assumptions (2 certain, 2 confident, 0 tentative).
