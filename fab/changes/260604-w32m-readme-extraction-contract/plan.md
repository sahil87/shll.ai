# Plan: README-Extraction Contract & Daily README-Pull Pipeline

**Change**: 260604-w32m-readme-extraction-contract
**Status**: In Progress
**Intake**: `intake.md`

<!-- Co-generated from intake.md at apply entry per _generation.md Plan Generation
     Procedure. Requirements (R#) derived from the intake design; Tasks (T###) and
     Acceptance (A-###) walked from the requirements with R#→T#→A# traceability.
     Memory tasks are PLANNED here but EXECUTED at hydrate (see Non-Goals + the
     Phase-5 note), not during apply. -->

## Requirements

### Contract: README-Extraction Forward Contract

#### R1: The contract is published as a forward spec, symmetric with `help-dump-contract.md`
A new spec `docs/specs/readme-extraction-contract.md` SHALL define how tool READMEs MUST be structured and how shll.ai extracts the site slice, mirroring the structure and quality of `help-dump-contract.md`. A row SHALL be added to `docs/specs/index.md`. The contract MUST state the asymmetry that — unlike `help-dump` (emit a new artifact) — it mostly *constrains an artifact tools already have* (the README).

- **GIVEN** a tool author maintaining a README
- **WHEN** they read `docs/specs/readme-extraction-contract.md`
- **THEN** they find the head rule, tail rule (with the final denylist), Install-included rule, image rule, dark-theme producer/consumer stanzas, mermaid Option A, the `docs/site/` escape hatch, and the `vn39` validation gate — each with at least one GIVEN/WHEN/THEN
- **AND** `docs/specs/index.md` lists the new spec with a one-line description

#### R2: Head rule — skip leading chrome, begin at first prose
The contract and the extraction module SHALL define skippable head chrome as: the single leading H1, a single leading `> blockquote`, and any contiguous run of image/badge lines (`![…](…)`, `[![…](…)](…)`, `<p align=…><img …></p>`, bare `<img …>`). Deduction stops skipping at the first line that is none of these (and is non-blank); the site slice begins there.

- **GIVEN** a README beginning with `# idea`, then `> Part of @sahil87's toolkit…`, then a badge row, then a tagline paragraph
- **WHEN** the extraction module computes the head boundary
- **THEN** the H1, blockquote, and badge row are skipped and the slice begins at the tagline paragraph
- **AND** a README with no leading chrome (first line is prose) is returned unchanged from the head

#### R3: Tail rule — stop before footer chrome at the first denylisted heading
The slice SHALL end immediately before the first occurrence (after the head) of a denylisted section heading. The final denylist is `Contributing`, `Development`, `Building`, `License`, `Acknowledgements` (case-insensitive, `##`/`###`, matched on heading text independent of position). `Install`/`Installation` is INCLUDED (NOT denylisted); `Changelog`, `Roadmap`, `FAQ` are NOT denylisted.

- **GIVEN** a README whose body contains `## Usage`, then `## Install`, then `## Contributing`, then `## License`
- **WHEN** the extraction module computes the tail boundary
- **THEN** the slice includes `## Usage` and `## Install` and ends just before `## Contributing`
- **AND** `## Changelog`/`## Roadmap`/`## FAQ` headings do NOT terminate the slice
- **AND** a README with no denylisted heading yields a slice running to end-of-file

#### R4: Mermaid Option A — strip inline mermaid fences
Inline ```` ```mermaid ```` fenced blocks SHALL be stripped from the pulled slice (start fence through the closing ```` ``` ````), because Starlight does not render mermaid and adding a renderer violates Constitution I/VI. The contract MANDATES diagrams destined for shll.ai be committed as rendered images (SVG preferred).

- **GIVEN** a slice containing a ```` ```mermaid ```` block surrounded by prose
- **WHEN** the extraction module strips mermaid
- **THEN** the fenced mermaid block is removed and the surrounding prose is preserved
- **AND** a non-mermaid fenced code block (```` ```bash ````) is left intact

#### R5: Strip GitHub-proprietary theme-only image fragments
Image references whose URL carries the GitHub-proprietary `#gh-dark-mode-only` / `#gh-light-mode-only` URL fragment SHALL be stripped from the slice (they render wrong-theme duplicates off GitHub). The producer stanza directs authors to standard `<picture><source media=…>` instead.

- **GIVEN** a slice with `![diagram](x-dark.svg#gh-dark-mode-only)` and `![diagram](x-light.svg#gh-light-mode-only)`
- **WHEN** the extraction module strips theme-only images
- **THEN** both `#gh-*-mode-only` image references are removed
- **AND** an image with no theme fragment (`![shot](shot.png)`) is preserved

### Pipeline: Daily README-Pull Workflow (consumer)

#### R6: A scheduled pull workflow fetches, extracts, validates, and commits each tool's slice
A new `.github/workflows/scheduled-readme-refresh.yml` (sibling to `scheduled-help-refresh.yml`) SHALL, per tool: fetch the repo's `README.md` (and any `docs/site/*.md`), apply head/tail deduction + mermaid-strip + `#gh-*-mode-only`-strip, run the `vn39` validation gate, and on success commit the extracted slice to `content/<tool>/` at the repo root. It MUST run on a daily cron + `workflow_dispatch`, be off the deploy path, gate the commit on validation, use per-tool failure isolation (a failing tool keeps its last-good slice), and pin pnpm 10 + Node 22 like the help-refresh job.

- **GIVEN** the scheduled-readme-refresh workflow on its daily cron
- **WHEN** it runs for all 7 tools
- **THEN** each tool's README is fetched, the slice is deduced + stripped, the `vn39` gate runs, and only on success is `content/<slug>/README.md` committed to `main`
- **AND** a tool whose fetch/extraction/validation fails keeps its last-good committed slice and does not block the others
- **AND** the workflow does not deploy (the existing `deploy.yml` ships the change on push to `main`)

#### R7: The `vn39` validation gate runs on pulled prose before commit, and is the sole guard on install accuracy
The pull workflow SHALL run pulled prose through a command/flag cross-check against `help/<tool>.json` BEFORE commit. If a pulled slice (including its Install section) references a command path or flag absent from the tool's help tree, the gate fails the pull *for that tool* (keeping its last-good slice). This is the sole guard on pulled-install accuracy now that Install is included. The exact `vn39` failure mode (`shll shell-install`, a non-existent alias) MUST be caught.

- **GIVEN** a pulled `shll` slice whose Install section references `shll shell-install` (absent from `help/shll.json`)
- **WHEN** the validation gate cross-checks the slice against `help/shll.json`
- **THEN** the gate fails the pull for `shll`, the last-good `content/shll/README.md` is preserved, and the defect is surfaced (fix belongs in the tool's README)
- **AND** a slice whose commands all exist in `help/<tool>.json` passes the gate

### Extraction: Pure Build-Time Module + Native Test

#### R8: Extraction logic is a pure, dependency-free, build-time module pinned by a native node --test
The deduction + strip logic SHALL live in a pure, dependency-free TypeScript module `sites/astro-starlight-terminal1/src/lib/extract-readme.ts` (mirroring `parse-help.ts`), exporting a total function that takes raw markdown and returns the extracted slice. It SHALL be pinned by a native `node --test` at `sites/astro-starlight-terminal1/scripts/extract-readme.test.mjs` (type-stripping, same toolchain as `parse-help.test.mjs`) covering head, tail, denylist, Install-included, mermaid-strip, theme-image-strip, and no-chrome edge cases.

- **GIVEN** the extraction module and its test
- **WHEN** `node --test scripts/extract-readme.test.mjs` runs from the live site dir
- **THEN** all extraction cases (head/tail/denylist/Install/mermaid/theme-image/no-chrome) pass
- **AND** the module imports no npm package (Constitution VI) and never throws on arbitrary input (total, mirroring `parseHelp`)

#### R9: The slice command/flag verifier is reusable by both the test and the workflow
The `vn39` cross-check SHALL be implemented as a pure helper (in `extract-readme.ts` or a sibling) that, given a slice and a help-doc tree, returns the set of referenced command/flag tokens absent from the tree, so the same logic backs both the unit test and the workflow gate (no second drifting implementation).

- **GIVEN** a slice and a parsed `help/<tool>.json`
- **WHEN** the verifier extracts candidate command/flag tokens and cross-checks them
- **THEN** it returns the absent tokens (empty set = pass), and the same function is invoked by both the test and the workflow's gate script

### Render: Build-Time Component Injected into Overviews

#### R10: A new component reads `content/<tool>/` at build time and renders the slice with missing/invalid discipline
A new component `sites/astro-starlight-terminal1/src/components/ReadmeSlice.astro` (sibling to `CommandReference.astro`) SHALL read `content/<tool>/README.md` at build time via the ascend-to-root `import.meta.url` fs pattern (NOT `process.cwd()`, NOT `import.meta.glob`, NOT a fixed depth), render the markdown to HTML at build time using the markdown processor Astro already provides transitively (no new dependency), and apply: missing→neutral placeholder (build succeeds), present-but-invalid→build fails loudly.

- **GIVEN** `content/run-kit/README.md` exists and is valid
- **WHEN** `astro build` renders `<ReadmeSlice tool="run-kit" />`
- **THEN** the slice is read via the ascend-to-`content/` resolve, rendered to static HTML, and displayed (no client JS for primary content, Constitution I)
- **AND** a missing `content/<tool>/README.md` (ENOENT) renders a neutral placeholder and the build succeeds
- **AND** a present-but-unreadable/invalid slice fails the build (a committed defect must not deploy)

#### R11: The component is injected into all 7 existing tool overviews, preserving existing content
`<ReadmeSlice tool="<slug>" />` SHALL be injected into each of the 7 existing `src/content/docs/tools/<tool>/overview.mdx`, NOT a new page. The existing `<GithubButton>` and all existing hand-written overview prose MUST be preserved. No new sidebar entry is added; the `Reference` group (from `qemq`) and the `CommandReference`/`CommandIndex` components MUST NOT be clobbered.

- **GIVEN** the 7 tool overview pages, each with a `<GithubButton>` and hand-written prose
- **WHEN** the change injects `<ReadmeSlice>` into each
- **THEN** each overview = `<GithubButton>` + `<ReadmeSlice>` + the original prose, with the import added
- **AND** `astro.config.mjs`'s `Reference` group and the existing components are untouched

### Governance: Constitution Amendment

#### R12: The constitution is amended v2.0.0 → v2.1.0 to permit deep, mechanically-synced tool-page content
`fab/project/constitution.md` SHALL be amended to v2.1.0 with a changelog entry, revising the tool-page-depth stance to permit deep, mechanically-synced README prose + referenced screenshots + rendered diagrams on the site, while preserving the anti-drift value (content single-sourced and mechanically synced, never hand-copied). The six core principles MUST NOT be relaxed.

- **GIVEN** the constitution at v2.0.0
- **WHEN** the amendment is applied
- **THEN** the version is `2.1.0`, a changelog entry records the tool-page-depth revision, and the new stance permits synced README prose/screenshots/diagrams
- **AND** principles I–VI are unchanged verbatim

### Non-Goals

- Conforming the 7 *external* tool repos' READMEs to the contract — a forward, per-repo, gradual activity (out of scope, like the help producers). This change's pull + render wiring degrades to missing→placeholder for any non-conformant tool.
- Committing any `content/<tool>/` slice data in this change — the slices are produced by the daily workflow against live external repos; this change ships the *machinery*, and every tool renders the placeholder until its first successful pull.
- Modifying `docs/memory/` files — that happens at hydrate (a later stage), not apply. The memory tasks (T040–T043) are listed for traceability but executed by hydrate.
- Build-time image vendoring and `data-theme`-aware `<picture>` mapping — documented as deferred consumer-side escape hatches in the contract.

### Design Decisions

1. **Sibling workflow, not extend `scheduled-help-refresh.yml`** — *Why*: the README pull is a distinct data kind (markdown slices → `content/`) with a distinct gate (vn39 cross-check vs. Zod schema validation) and distinct failure semantics; a sibling keeps each workflow single-purpose, lets the help-refresh stay untouched (lower blast radius), and matches the producer/consumer symmetry the intake calls for (the help side is one workflow; the README side is its sibling). *Rejected*: extending the existing workflow — would overload one job with two unrelated data kinds and two gates, and couple their failure isolation.
2. **Render markdown via `@astrojs/markdown-remark`, declared explicitly in `package.json`** — *Why*: rendering an in-memory markdown string read by `fs` (the intake-mandated read path) needs a markdown→HTML step. `@astrojs/markdown-remark@7.1.2` is a direct, pinned dependency of `astro@6.3.3` core (and of `@astrojs/starlight`), so it is already pulled into the dependency tree. **REWORK (M1):** importing it as a bare specifier from the site WITHOUT declaring it failed `astro build` — under strict pnpm a transitive dep is not hoisted to the site's top-level `node_modules`, so Vite/Rollup could not resolve `@astrojs/markdown-remark`, breaking the whole site (the component is injected into all 7 overviews). The fix declares it explicitly in `package.json`, pinned to the exact `7.1.2` astro core uses. **Honest reconciliation with Constitution VI:** this is a *build-time* dependency already pulled transitively by astro/starlight; declaring it explicitly makes an EXISTING dep importable, not a NEW dep — no new runtime dependency, no new transitive weight, no version split. This is NOT the `astro:content`/`z` case: `astro:content` is a Vite VIRTUAL module Astro injects (needs no package.json entry), whereas an npm package import does. *Rejected*: a new `marked`/`markdown-it` dependency (would be a genuinely new dep, Constitution VI); a glob content collection / `import.meta.glob` (Option A — intake forbids it for the read path, and the `content/` data lives at the repo root OUTSIDE `src/`, so a Starlight content collection can't reach it without large churn that contradicts the locked overview-injection design); a dependency-free hand-rolled markdown→HTML renderer (Option C — too lossy for full README prose).
3. **vn39 verifier is a shared pure helper** — *Why*: the same cross-check must back both the unit test and the workflow gate; one implementation avoids drift (the very class of bug vn39 fixed). *Rejected*: a bash-only grep gate in the workflow (would diverge from the tested logic).
4. **`content/<tool>/README.md` filename** — *Why*: the directory is `content/<tool>/` (intake assumption #10); naming the slice file `README.md` keeps the provenance obvious and leaves room for `docs/site/*.md` siblings the contract permits. *Confident SRAD assumption — see Assumptions.*

## Tasks

### Phase 1: Contract & Governance (no code dependencies)

- [x] T001 [P] Create `docs/specs/readme-extraction-contract.md` — the forward contract: overview + producer/consumer asymmetry, §Head rule, §Tail rule (final denylist; Install INCLUDED), §Image rule, §Dark-theme stanzas (producer/consumer), §Mermaid Option A, §`docs/site/` escape hatch, §vn39 validation gate (sole install guard), §Pull model (sibling workflow, content/ collector, off-deploy, per-tool isolation), each with GIVEN/WHEN/THEN; mirror `help-dump-contract.md` structure/quality. <!-- R1 R2 R3 R4 R5 R7 -->
- [x] T002 [P] Add a `readme-extraction-contract` row to `docs/specs/index.md`. <!-- R1 -->
- [x] T003 [P] Amend `fab/project/constitution.md`: bump v2.0.0 → v2.1.0, add a changelog entry, revise the tool-page-depth stance to permit deep mechanically-synced README prose + referenced screenshots + rendered diagrams (preserve anti-drift value); do NOT relax principles I–VI. <!-- R12 -->

### Phase 2: Extraction Module + Test (pure, build-time)

- [x] T010 Create `sites/astro-starlight-terminal1/src/lib/extract-readme.ts` — pure dependency-free module exporting `extractReadme(markdown): { slice: string }` (head-skip + tail-stop + mermaid-strip + `#gh-*-mode-only`-strip) and a verifier helper `findUnknownTokens(slice, helpDoc): string[]` (R9); total, never throws; mirror `parse-help.ts` style/comments. <!-- R2 R3 R4 R5 R8 R9 --> <!-- rework: M2 gate false-positive — `findUnknownTokens` grew the command path through EVERY bare word after the binary, flagging a known leaf command + positional arg (`shll install mytool`) as an unknown subcommand. Fixed: `helpFacts` now carries a parent→children map; the walk descends only into known children and stops at a known leaf (rest = args), flagging a token only when the current node HAS children and the token isn't one of them. --> <!-- rework: S2 dead code — dropped the entirely-unused `blockquoteConsumed` var and both `void` statements in `headBoundary`; kept the meaningful `h1Consumed` guard (it stops a second `# …` real section from being skipped as chrome). -->
- [x] T011 Create `sites/astro-starlight-terminal1/scripts/extract-readme.test.mjs` — native `node --test` (type-stripping) covering head (chrome skip + no-chrome passthrough), tail (denylist stop, Install kept, Changelog/Roadmap/FAQ kept, no-denylist→EOF), mermaid-strip (mermaid removed, bash kept), theme-image-strip (both `#gh-*` removed, plain kept), and the verifier (unknown token detected incl. the `shll shell-install` case; clean slice passes against a real `help/*.json`). 21/21 pass. <!-- R8 R9 --> <!-- rework: S1 test gap — added M2 regression cases pinning `<known-leaf-command> <positional-arg>` as NOT flagged (`shll install mytool`, `wt create feature`, `hop shell-init zsh`, `hop config add somedir`, `hop clone myrepo`) alongside preserved true-positives (`shll shell-install`, `wt summon`, `hop config bogus` STILL flagged). 17→21 cases. -->

### Phase 3: Render Component + Overview Injection

- [x] T020 Create `sites/astro-starlight-terminal1/src/components/ReadmeSlice.astro` — `tool` prop; ascend-from-`import.meta.url` to the repo root (marker = `content/` dir) and read `content/<tool>/README.md`; render markdown→HTML at build time via `@astrojs/markdown-remark` `createMarkdownProcessor`; missing→neutral placeholder (build succeeds), present-but-unreadable→build fails; missing-slug build guard; terminal `--c-*` tokens + `:focus-visible` (dark-mode parity + a11y); mirror `CommandReference.astro`/`GithubButton.astro` conventions. Also created `content/.gitkeep` so the repo-root collector exists at build time. <!-- R10 --> <!-- rework: M1 phantom dep — `import { createMarkdownProcessor } from '@astrojs/markdown-remark'` was a TRANSITIVE dep (via astro core / starlight) NOT declared in the site package.json, so under strict pnpm it is not hoisted to the site's top-level node_modules and Vite/Rollup cannot resolve the bare import → `astro build` failed for the whole site. Fix (Option B): declared `@astrojs/markdown-remark` explicitly in package.json, pinned to `7.1.2` (the exact version `astro@6.3.3` core depends on directly), and ran `pnpm install` to hoist it + update the lockfile. The `astro:content`/`z` precedent does NOT apply (that is a Vite VIRTUAL module, not an npm package). The component header comment + Assumption #1 + A-022 were corrected to the honest reconciliation: build-time dep already pulled transitively, now made importable — no new runtime dep, no new transitive weight. `astro build` now succeeds (26 pages). -->
- [x] T021 Inject `import ReadmeSlice` + `<ReadmeSlice tool="idea" />` into `tools/idea/overview.mdx` under `<GithubButton>`, preserving existing prose. <!-- R11 -->
- [x] T022 [P] Inject `<ReadmeSlice tool="hop" />` into `tools/hop/overview.mdx`. <!-- R11 -->
- [x] T023 [P] Inject `<ReadmeSlice tool="fab-kit" />` into `tools/fab-kit/overview.mdx`. <!-- R11 -->
- [x] T024 [P] Inject `<ReadmeSlice tool="wt" />` into `tools/wt/overview.mdx`. <!-- R11 -->
- [x] T025 [P] Inject `<ReadmeSlice tool="run-kit" />` into `tools/run-kit/overview.mdx`. <!-- R11 -->
- [x] T026 [P] Inject `<ReadmeSlice tool="tu" />` into `tools/tu/overview.mdx`. <!-- R11 -->
- [x] T027 [P] Inject `<ReadmeSlice tool="shll" />` into `tools/shll/overview.mdx`. <!-- R11 -->
- [x] T028 Review `astro.config.mjs` — confirmed overview injection needs no new page/sidebar entry; the `Reference` group and `CommandReference`/`CommandIndex` are untouched (no change). <!-- R11 -->

### Phase 4: Pull Workflow + Gate

- [x] T030 Create `sites/astro-starlight-terminal1/scripts/extract-readme-cli.mjs` — a thin Node CLI the workflow calls per tool: read a raw README path, run `extractReadme`, then `findUnknownTokens` against `help/<slug>.json`; exit non-zero (printing the unknown tokens) when the gate fails, else write the slice to stdout/`content/<slug>/README.md`. Reuses the same module (R9). Smoke-tested: clean→exit 0, drift (`shll shell-install`)→exit 1, `--out` writes. <!-- R7 R9 -->
- [x] T031 Create `.github/workflows/scheduled-readme-refresh.yml` — daily cron (`41 7 * * *`, offset from help-refresh) + `workflow_dispatch`, checkout `ref: main`, `contents: write`, concurrency group, per-tool loop (slug:repo table) fetching each README (raw.githubusercontent, main→master fallback), run the extract+gate CLI into a temp file, on success overwrite `content/<slug>/README.md`; pin pnpm 10 + Node 22 (reuse help-refresh pattern); off deploy path; per-tool failure isolation; direct-commit-to-main of `content/` gated on the gate passing. YAML parses clean. <!-- R6 R7 -->

### Phase 5: Hydrate-deferred (PLANNED here, EXECUTED at hydrate — NOT during apply)

<!-- Apply touches code + specs + constitution; memory is hydrate's job (fab-continue
     Hydrate Behavior). These rows give the hydrate stage its traceable worklist. -->

- [x] T040 (hydrate) Create `docs/memory/conventions/readme-extraction.md` — consume/pull-side memory mirroring `help-collection.md`. <!-- R6 R10 -->
- [x] T041 (hydrate) Modify `docs/memory/conventions/tool-page-rubric.md` — permit pulled README prose/screenshots/diagrams as a generated/synced source, parallel to the command-reference exception. <!-- R11 R12 -->
- [x] T042 (hydrate) Modify `docs/memory/conventions/help-collection.md` — cross-link the README pull as a sibling consumer; cite the `parseHelp` precedent the extraction follows. <!-- R6 R8 -->
- [x] T043 (hydrate) Modify `docs/memory/build-deploy/deployment.md` — note the second inbound scheduled pull path. <!-- R6 -->

## Execution Order

- T001–T003 are independent (different files) and have no code deps.
- T010 blocks T011, T020, T030 (they import/exercise the module).
- T030 blocks T031 (the workflow calls the CLI).
- T020 blocks T021–T027 (overviews import the component).
- Phase 5 (T040–T043) is NOT executed during apply — hydrate owns it.

## Acceptance

### Functional Completeness

- [ ] A-001 R1: `docs/specs/readme-extraction-contract.md` exists with head/tail/Install/image/dark-theme/mermaid/escape-hatch/vn39 sections (each with GIVEN/WHEN/THEN), and `docs/specs/index.md` has a row for it.
- [ ] A-002 R2: The extraction module skips the leading H1 + blockquote + contiguous badge/image lines and begins the slice at the first prose line; a no-chrome README passes through unchanged.
- [ ] A-003 R3: The slice stops at the first denylisted heading (`Contributing`/`Development`/`Building`/`License`/`Acknowledgements`); `Install` is kept; `Changelog`/`Roadmap`/`FAQ` do not terminate; no-denylist → EOF.
- [ ] A-004 R4: Inline ```` ```mermaid ```` blocks are stripped; non-mermaid fences are preserved.
- [ ] A-005 R5: `#gh-dark-mode-only`/`#gh-light-mode-only` image refs are stripped; plain images preserved.
- [ ] A-006 R6: `.github/workflows/scheduled-readme-refresh.yml` exists with daily cron + dispatch, per-tool loop, off-deploy, validation-gated direct-commit of `content/`, per-tool isolation, pinned pnpm 10 + Node 22.
- [ ] A-007 R7: The vn39 gate cross-checks pulled prose (incl. Install) against `help/<tool>.json`; the `shll shell-install` failure mode is caught (test); a clean slice passes.
- [ ] A-008 R8: `src/lib/extract-readme.ts` is pure/dependency-free/total, and `node --test scripts/extract-readme.test.mjs` passes.
- [ ] A-009 R9: One shared verifier helper backs both the test and the workflow CLI (no duplicate implementation).
- [ ] A-010 R10: `ReadmeSlice.astro` reads `content/<tool>/README.md` via the ascend-to-root `import.meta.url` pattern, renders at build time with no new dependency, and applies missing→placeholder / present-but-invalid→build-fail.
- [ ] A-011 R11: All 7 overviews render `<ReadmeSlice>` under `<GithubButton>` with existing prose preserved; `astro.config.mjs` `Reference` group and `CommandReference`/`CommandIndex` untouched.
- [ ] A-012 R12: `constitution.md` is v2.1.0 with a changelog entry revising the tool-page-depth stance; principles I–VI unchanged.

### Behavioral Correctness

- [ ] A-013 R7: Install-section command verification is a first-class gate case (not an afterthought) — its failure keeps the tool's last-good slice and surfaces the defect.
- [ ] A-014 R6: A failing tool keeps its last-good committed `content/<slug>/README.md` and does not block other tools (per-tool isolation), and the workflow does not deploy.

### Scenario Coverage

- [ ] A-015 R8: `node --test scripts/extract-readme.test.mjs` exercises head/tail/denylist/Install/mermaid/theme-image/no-chrome/verifier and passes.
- [ ] A-016 R10: A missing-file case degrades to the placeholder (build succeeds) and is distinct from the invalid case (build fails).

### Edge Cases & Error Handling

- [ ] A-017 R2: A README whose first line is already prose (no chrome) yields the head unchanged.
- [ ] A-018 R3: A README with no denylisted heading yields a slice through end-of-file.
- [ ] A-019 R10: A missing `tool` slug prop fails the build loudly (mirrors `GithubButton`/`CommandReference` guard).

### Code Quality

- [ ] A-020 Pattern consistency: New code follows the conventions of `parse-help.ts`, `CommandReference.astro`, `GithubButton.astro`, and `scheduled-help-refresh.yml` (naming, error handling, comments, frontmatter `interface Props`).
- [ ] A-021 No unnecessary duplication: The extraction/verifier logic is single-sourced (one module) and reused by the test, the component path is reused conceptually from `CommandReference` (read+validate+render); no second drifting copy.
- [ ] A-022 No NEW runtime dependency and no new transitive weight added (Constitution VI); extraction is plain TS. The one `package.json` addition — `@astrojs/markdown-remark@7.1.2`, pinned to the exact version `astro@6.3.3` core already depends on directly — is a build-time dep ALREADY in the tree transitively; declaring it explicitly only makes the existing dep importable under strict pnpm (required for `astro build` to resolve the bare import). NOT a new dependency, NOT new transitive weight, NOT the `z`-from-`astro:content` virtual-module case.
- [ ] A-023 Static-first: render is build-time only, no client JS for primary content (Constitution I); dark-mode parity via `--c-*` tokens (Constitution V); keyboard focus states (Accessibility).
- [ ] A-024 No magic strings: the denylist, mermaid/theme-image markers, and head-chrome patterns are named constants.

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`
- The extraction unit test + `validate-help.mjs` + `parse-help.test.mjs` are the fast gating checks. **REWORK (M1):** a full `astro build` is now ALSO a gating check — it is the only thing that catches the phantom-dependency class of bug (a bare import of an undeclared-but-transitive package resolves in `node --test` but fails Vite/Rollup at build). Build verified green post-fix: 26 pages, all 7 overviews render the ReadmeSlice (placeholder while `content/` is empty; a temp slice confirmed the markdown→HTML render path).

## Assumptions

<!-- Apply-time SRAD decisions made while co-generating ## Requirements. The 14
     intake decisions (13 certain, 1 confident) are honored, not re-litigated; the
     rows below are NEW apply-time choices the intake left to implementation. -->

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Confident | Render the pulled markdown via `@astrojs/markdown-remark` (`createMarkdownProcessor`), DECLARED explicitly in `package.json` pinned to `7.1.2` (the version astro core uses) | **REVISED at rework (M1).** `@astrojs/markdown-remark@7.1.2` is a direct dep of `astro@6.3.3` core + `@astrojs/starlight`, so it is already in the tree — but under strict pnpm a transitive dep is NOT hoisted to the site's top-level `node_modules`, so a bare import does not resolve and `astro build` FAILED. Declaring it explicitly (pinned to the exact transitive version) makes the existing build-time dep importable: no new runtime dep, no new transitive weight, no version split (Constitution VI honored honestly). This is NOT the `z`-from-`astro:content` case (that is a Vite virtual module, not an npm package — needs no package.json entry; an npm import does). The intake mandates the `fs` read path (not a content collection), so a string→HTML render step is required. | S:80 R:70 A:80 D:75 |
| 2 | Confident | Add a NEW sibling workflow `scheduled-readme-refresh.yml` rather than extend `scheduled-help-refresh.yml` | Intake explicitly allows "extend OR sibling"; distinct data kind (markdown→`content/`), distinct gate (vn39 cross-check vs Zod), distinct isolation — a sibling keeps each single-purpose and leaves help-refresh untouched (lower blast radius) | S:80 R:70 A:80 D:70 |
| 3 | Confident | The vn39 cross-check is a shared pure helper in `extract-readme.ts`, exercised by both the test and a thin workflow CLI (`extract-readme-cli.mjs`) | Single-sourcing the gate logic avoids the drift class vn39 itself fixed; matches the project's anti-drift ethos and the `parseHelp` precedent (one tested module, multiple consumers) | S:80 R:65 A:80 D:75 |
| 4 | Confident | The pulled slice file is named `content/<slug>/README.md` | Intake fixes the directory `content/<tool>/` (assumption #10) but not the filename; `README.md` keeps provenance obvious and leaves room for the contract's `docs/site/*.md` siblings | S:75 R:75 A:75 D:70 |
| 5 | Confident | The vn39 token extraction scans fenced code blocks + inline code for `<binary> <subcommand>` paths and `--flag`/`-x` tokens, cross-checked against the tool's help tree (paths + parsed flags via `parseHelp`) | Mirrors vn39's "grep-zero + per-command cross-check"; reuses `parseHelp` for flag truth; conservative (only flags tokens that look like commands/flags) to avoid false positives on prose | S:75 R:60 A:75 D:65 |

5 assumptions (0 certain, 5 confident, 0 tentative, 0 unresolved).
