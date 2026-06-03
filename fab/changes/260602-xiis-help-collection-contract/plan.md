# Plan: Help-Collection Contract for shll.ai

**Change**: 260602-xiis-help-collection-contract
**Status**: In Progress
**Intake**: `intake.md`
**Spec**: `spec.md`

## Requirements

<!-- migrated from spec.md on 2026-06-03 -->

## Non-Goals

- The Astro content-collection loader and the expandable "Command reference" UI on tool pages — explicit follow-up change. This change defines and validates the contract; it does not render it.
- The 7 producers in the sibling tool repos — already seeded as `fab/backlog.md` items (`idea`:nnsn, `hop`:jr5f, `wt`:pc47, `run-kit`:a36m, `shll`:ep4z, `fab-kit`:xob7, `tu`:v76l); built by each repo's own pipeline.
- Any *rendering* change to the live site — no `commands` pages are populated and no `CommandReference` component is built here (follow-up). This change's only site-dir edit is adding the standalone Zod schema module at `sites/astro-starlight-terminal1/src/lib/schemas.ts` (a non-rendering contract module); otherwise it touches repo-root `help/`, `docs/`, and `.github/workflows/`.
- Capturing real help for the other 6 tools — only `wt.json` (the reference sample) is committed now; the rest arrive via producer PRs.

## Contract: help.json Schema

### Requirement: Canonical JSON shape
Each tool's help output SHALL be represented by a single JSON document conforming to an envelope of `{ tool, version, captured_at, schema_version, root }`, where `root` is a recursive `Node`. A `Node` SHALL have exactly the fields `{ name, path, short, usage, text, commands }`. `commands` SHALL be an array of `Node` (recursive), empty for a leaf command. `text` SHALL contain the raw `-h`/`--help` output for that command, byte-for-byte, with newlines preserved.

#### Scenario: Reference sample conforms
- **GIVEN** the committed `help/wt.json` reference sample
- **WHEN** it is validated against the schema
- **THEN** validation passes
- **AND** every node carries all six `Node` fields and the envelope carries all four envelope fields

#### Scenario: Leaf command
- **GIVEN** a command with no subcommands (e.g. `wt init`)
- **WHEN** its node is produced
- **THEN** `commands` SHALL be an empty array `[]`

### Requirement: Envelope field semantics
`tool` SHALL be the invoked binary name (e.g. `wt`, `rk`, `fab`) — not necessarily the repo/file slug. `version` SHALL be the version reported by the built binary and SHALL NOT be hardcoded by the producer. `captured_at` SHALL be an ISO-8601 UTC timestamp stamped at capture time. `schema_version` SHALL be the integer `1` for this contract revision.

#### Scenario: Binary name differs from file slug
- **GIVEN** run-kit, whose binary is `rk` but whose collector file is `help/run-kit.json`
- **WHEN** its document is produced
- **THEN** the `tool` field SHALL be `"rk"`
- **AND** the file SHALL be named `help/run-kit.json`

#### Scenario: Schema version present
- **GIVEN** any conforming document
- **WHEN** it is inspected
- **THEN** `schema_version` SHALL equal `1`

### Requirement: Formal Zod schema is the machine-checkable contract
The repo SHALL contain a Zod schema module that defines the recursive `Node` and the envelope, exported for reuse. The recursive `commands` field SHALL be expressed with a lazy/recursive definition (`z.lazy`). The module SHALL live inside the **live site** — `sites/astro-starlight-terminal1/src/lib/schemas.ts` (the live `SITE_DIR` per `.github/workflows/deploy.yml`) — and SHALL import `z` from `astro:content` (Starlight provides zod transitively), so this change introduces NO new dependency and NO repo-root Node toolchain (preserving Constitution II and VI). The repo root SHALL hold only the `help/*.json` data files, with no repo-root `package.json`. The module SHALL be importable by the follow-up Astro loader / `CommandReference.astro` component (which will live alongside it) and SHALL be the single definition of the contract — no second, separately-maintained shape.

#### Scenario: No new dependency or root toolchain
- **GIVEN** this change is complete
- **WHEN** the repository root and the live site's `package.json` are inspected
- **THEN** there SHALL be no repo-root `package.json`, and no new dependency SHALL be added to `sites/astro-starlight-terminal1/package.json` (zod comes via the existing `astro:content` re-export from Starlight)

#### Scenario: Schema validates the reference sample
- **GIVEN** the Zod schema module and `help/wt.json`
- **WHEN** the sample is validated against the schema using the live site's existing pnpm-installed toolchain (a small script run from `sites/astro-starlight-terminal1/` after `pnpm install --frozen-lockfile`)
- **THEN** validation SHALL succeed

#### Scenario: Schema rejects a malformed document
- **GIVEN** the Zod schema module
- **WHEN** a document missing a required `Node` field (e.g. no `text`) is validated
- **THEN** validation SHALL fail with a descriptive error

### Requirement: Producer rules are documented in the contract
The contract documentation SHALL state the rules every producer follows: (a) discover the command tree programmatically via the CLI framework (Cobra: `rootCmd.Commands()` recursively), never by regex-parsing `-h` text; (b) filter out auto-generated `completion` and `help` subcommands and any hidden command; (c) read `version` from the built binary; (d) capture the full recursive subcommand tree; (e) `tu` is the documented exception — Node/TS, flag-based, no subcommands → flat tree with `commands: []` and a bespoke producer.

#### Scenario: Noise filtered
- **GIVEN** a Cobra tool whose `-h` lists `completion` and `help` among its commands
- **WHEN** its document is produced per the rules
- **THEN** neither `completion` nor `help` SHALL appear in any node's `commands`

#### Scenario: tu exception
- **GIVEN** `tu`, a flag-based Node CLI with no subcommands
- **WHEN** its document is produced
- **THEN** `root.commands` SHALL be `[]`
- **AND** `root.text` SHALL contain the full `tu --help` output

## Collector: help/ Directory

### Requirement: Collector location and naming
The repo SHALL contain a `help/` directory at the repository root (sibling to `sites/`, `fab/`, `docs/`), NOT inside any `sites/<name>/`. Each tool's document SHALL be stored as `help/<slug>.json` where `<slug>` is the tool's repo/site slug.

#### Scenario: Root placement
- **GIVEN** the repository
- **WHEN** the collector directory is located
- **THEN** it SHALL be `<repo-root>/help/`
- **AND** it SHALL NOT be nested under `sites/`

#### Scenario: Reference sample present
- **GIVEN** this change is complete
- **WHEN** `help/` is listed
- **THEN** `help/wt.json` SHALL exist and conform to the schema

### Requirement: Collector survives a live-site swap
Because `help/` is project-level and lives at the repo root, swapping which site under `sites/` is live (per Constitution III) SHALL NOT require moving or duplicating the collector. The contract documentation SHALL state this rationale (Constitution II — Multi-Site Isolation).

#### Scenario: Independence from the live site
- **GIVEN** the `SITE_DIR` in the deploy workflow points at one site
- **WHEN** `SITE_DIR` is changed to another site
- **THEN** the `help/` collector and its contract SHALL be unaffected

### Requirement: Cross-boundary read is acknowledged
Because the Zod module (and the follow-up `CommandReference.astro` / loader) live inside `sites/astro-starlight-terminal1/src/` while the `help/*.json` data lives at repo root, the follow-up rendering will read from outside its site directory (a relative path up to `<repo-root>/help/`). This change SHALL document that cross-boundary read as the intended design so the follow-up treats it as expected, not a violation of site isolation (the data is project-level by deliberate placement; only the *reading* site reaches into it).

#### Scenario: Documented cross-boundary read
- **GIVEN** the help-collection memory file
- **WHEN** a maintainer plans the follow-up rendering
- **THEN** it SHALL state that the component/loader reads `<repo-root>/help/*.json` from within the live site, by design

## Push & Receiving: Cross-Repo Flow

### Requirement: Producers push via PR + auto-merge
The contract documentation SHALL specify that each of the 7 tool repos' CI, after build, runs its producer, writes `help/<slug>.json`, validates the JSON parses, and opens a pull request into `sahil87/shll.ai` with auto-merge enabled — NOT a direct push to `main`. Authentication SHALL use the existing `SHLLAI_TOKEN` repo secret (already present in all 7 repos) scoped to `contents` + `pull-request` write on shll.ai.

#### Scenario: Documented push mechanism
- **GIVEN** a maintainer reading the contract doc
- **WHEN** they implement a producer
- **THEN** they SHALL find the PR-not-push requirement, the `SHLLAI_TOKEN` usage, and the parse-before-push validation step

#### Scenario: Rationale recorded
- **GIVEN** the contract doc
- **WHEN** the push model is described
- **THEN** it SHALL explain the multi-repo race on `main` that PR + auto-merge avoids

### Requirement: Receiving-side workflow enables auto-merge safely
The shll.ai repo SHALL contain a GitHub Actions workflow that, on inbound pull requests touching `help/**`, enables auto-merge so producer PRs serialize and land without manual intervention — but ONLY when the PR is safe to merge unattended. Because the repo is public and `main` is unprotected and auto-deploys on merge, a path *trigger* filter alone is NOT sufficient (a PR may touch `help/**` AND other paths in the same diff). The workflow SHALL therefore apply three guards, and SHALL enable auto-merge only if all pass:

1. **Content guard (MUST):** enumerate the PR's changed files; if ANY changed file is outside `help/`, the workflow SHALL NOT enable auto-merge (it exits without enabling, leaving the PR for manual handling).
2. **Schema validation gate (MUST):** run the help validator (`scripts/validate-help.mjs`) against the PR's `help/*.json`; if any file fails schema conformance, the workflow SHALL NOT enable auto-merge.
3. **Actor guard (SHOULD, defense-in-depth):** restrict auto-merge to PRs authored by the trusted producer identity (the `SHLLAI_TOKEN` owner — `sahil87`) and/or same-repo head branches; the trusted login SHALL be parameterized (a workflow env/constant), not buried. Fork PRs already receive a read-only token and cannot self-enable auto-merge.

The workflow SHALL use `pull_request` (NOT `pull_request_target`). The existing push-to-`main` deploy workflow SHALL remain the mechanism that ships merged help (no separate deploy trigger), consistent with Constitution IV.

#### Scenario: Auto-merge enabled on a clean help-only PR
- **GIVEN** the trusted producer opens a PR that modifies ONLY `help/rk.json` and the JSON conforms to the schema
- **WHEN** the receiving workflow runs
- **THEN** all three guards pass and it SHALL enable auto-merge on that PR

#### Scenario: Mixed PR is NOT auto-merged
- **GIVEN** a PR that modifies `help/rk.json` AND any file outside `help/` (e.g. `sites/**` or `.github/workflows/**`)
- **WHEN** the receiving workflow runs
- **THEN** the content guard SHALL fail and the workflow SHALL NOT enable auto-merge
- **AND** the PR is left for manual review

#### Scenario: Schema-invalid help PR is NOT auto-merged
- **GIVEN** a PR that modifies only `help/rk.json` but the file does not conform to the schema (e.g. a missing required `Node` field)
- **WHEN** the receiving workflow runs
- **THEN** the validation gate SHALL fail and the workflow SHALL NOT enable auto-merge

#### Scenario: Unrelated PR never triggers
- **GIVEN** a PR that modifies only files under `sites/`
- **WHEN** PR workflows run
- **THEN** the help receiving workflow SHALL NOT trigger (path filter) — and even if triggered by a mixed diff, the content guard SHALL prevent auto-merge

#### Scenario: Deploy via existing pipeline
- **GIVEN** a help PR merges to `main`
- **WHEN** the merge completes
- **THEN** the existing push-to-`main` deploy workflow SHALL deploy the site
- **AND** no new deploy workflow SHALL be introduced by this change

### Requirement: Workflow does not block on absent producers
The receiving workflow SHALL be valid and inert until producers begin opening PRs — its presence SHALL NOT break the existing deploy or any current CI, and SHALL NOT require all 7 producers to exist.

#### Scenario: No producers yet
- **GIVEN** none of the 7 producers have shipped
- **WHEN** the existing push-to-`main` deploy runs
- **THEN** it SHALL succeed unchanged
- **AND** the new receiving workflow SHALL simply not have triggered

## Documentation: Memory & Rubric

### Requirement: New help-collection memory file
A new memory file `docs/memory/conventions/help-collection.md` SHALL document: the `help.json` schema (envelope + recursive `Node`), the Zod module location, the `help/` collector convention and rationale, the producer rules (tree-walk, noise filter, version-from-binary, full recursion, tu exception), and the push + receiving model (PR + auto-merge, `SHLLAI_TOKEN`). It SHALL be registered in `docs/memory/index.md` under the `conventions` domain.

#### Scenario: Authoritative single reference
- **GIVEN** a maintainer of any of the 7 tool repos
- **WHEN** they need to build a producer
- **THEN** `docs/memory/conventions/help-collection.md` SHALL contain everything needed to conform to the contract

#### Scenario: Index updated
- **GIVEN** `docs/memory/index.md`
- **WHEN** it is read after this change
- **THEN** the `conventions` row SHALL list `help-collection` among its memory files

### Requirement: Tool-page-rubric permits a generated Command reference
`docs/memory/conventions/tool-page-rubric.md` SHALL be amended to permit a generated CLI command reference, rendered on the **live Starlight site** as each tool's dedicated `commands` page (`sites/astro-starlight-terminal1/src/content/docs/tools/<tool>/commands.{md,mdx}`), sourced from `help/<slug>.json`. The amendment SHALL preserve the rubric's anti-drift intent by stating this content is generated (single-sourced from the binary), and is the sole permitted exception to the existing "SHALL NOT contain long-form command reference" rule. The amendment SHALL record the placement decision (a dedicated `commands` page per tool, filling Starlight's existing "commands … coming soon" slot, chosen over an expandable block on the overview page). The amendment SHALL also note that the rubric's existing body describes the **non-live** tailwind site (`src/content/tools/<tool>.md`, `src/data/tools.ts` sidebar coupling); it SHALL flag that those specifics are tailwind-only and that the live site is Starlight (multi-page docs, hardcoded sidebar in `astro.config.mjs`, no `src/data/`). Fully reconciling the rubric's body to Starlight is out of scope here (the rubric predates the site swap) — this change adds the Command-reference exception and the site-mismatch note; a broader rubric rewrite is a separate concern.

#### Scenario: Exception stated, not a blanket reversal
- **GIVEN** the amended rubric
- **WHEN** it is read
- **THEN** the "SHALL NOT contain long-form command reference" rule SHALL remain, with the generated Command-reference content called out as the explicit, justified exception

#### Scenario: Placement recorded
- **GIVEN** the amended rubric's changelog or design section
- **WHEN** it is read
- **THEN** it SHALL record that the reference renders as a dedicated `commands` page per tool on the live Starlight site

#### Scenario: Live-site mismatch flagged
- **GIVEN** the amended rubric
- **WHEN** a maintainer reads it
- **THEN** it SHALL warn that the rubric's existing path conventions describe the non-live tailwind site and that the live site is Starlight

### Requirement: Deployment memory notes the inbound path
`docs/memory/build-deploy/deployment.md` SHALL be updated to note the new inbound flow (tool repos PR `help/<slug>.json` into shll.ai) and the receiving-side auto-merge workflow, and that the existing push-to-`main` deploy ships the result.

#### Scenario: Inbound path documented
- **GIVEN** the deployment memory file after this change
- **WHEN** it is read
- **THEN** it SHALL describe the inbound help-PR path and the auto-merge receiving workflow

## Design Decisions

1. **Raw text + structured fields per node (not text-only).**
   - *Why*: Cobra hands `name`/`short`/`usage`/`path` for free; carrying them lets the follow-up site render a collapsible tree and headers without re-parsing the `text` blob. `text` stays the authoritative raw output for terminal-faithful rendering.
   - *Rejected*: text-only — would force the site to parse the first line for labels; brittle and loses the structure the framework already provides.

2. **Producers push into shll.ai via PR + auto-merge (not direct push, not site-pulls).**
   - *Why*: Direct push from 7 repos races on `main`; site-pulls-at-build would couple the site build to fetching 7 external files and need a Go/Node toolchain in shll.ai CI. PR + auto-merge serializes merges, keeps a reviewable diff, and uses the already-created `SHLLAI_TOKEN`.
   - *Rejected*: direct push (race, no review); fetch-at-build (couples deploy to remote availability + toolchains).

3. **Per-repo, framework-native producers — no shared library.**
   - *Why*: A Cobra tree-walk is ~40 frozen lines; copy-paste across 6 Go repos is cheaper than a versioned shared module (which would need `go get` coordination across repos split on Cobra 1.8.1 vs 1.10.2). `tu` is Node and would not share Go code anyway.
   - *Rejected*: shared Go library — version-coordination cost exceeds the duplication it removes; a new repo to own for trivial, stable logic.

4. **`help/` at repo root, not under `sites/`.**
   - *Why*: Constitution II (Multi-Site Isolation) — help data is project-level and must survive a live-site swap (Constitution III). The user proposed the root collector explicitly.
   - *Rejected*: per-site `src/content/help/` — would tie the contract to one site variant and break on swap.

5. **Pin the Zod schema now, inside the live Starlight site; render later.**
   - *Why*: One machine-checkable definition that producers validate against AND the follow-up `CommandReference` component imports — prevents prose-vs-code drift. Placed at `sites/astro-starlight-terminal1/src/lib/schemas.ts` (the live site per `SITE_DIR`) because Astro/Starlight already provides `z` via `astro:content` — so no new dependency and no repo-root Node toolchain (Constitution II, VI). The repo root holds only the `help/*.json` data.
   - *Rejected*: (a) prose-only contract now, Zod with the loader — risks the loader's schema diverging from what producers were told; (b) Zod module + validate script at repo root — would require the first repo-root `package.json` and a zod dependency, contradicting Multi-Site Isolation and Minimal Dependencies; (c) the non-live tailwind site — the feature must target what's deployed.

6. **Receiving workflow enables auto-merge only; reuse existing deploy.**
   - *Why*: Constitution IV already deploys on push to `main`; merging a help PR triggers it. Adding a separate deploy trigger would duplicate that path.
   - *Rejected*: a dedicated deploy-on-merge workflow — redundant with the existing push-to-`main` deploy.

7. **Target the live Starlight site; render as the per-tool `commands` page.**
   - *Why*: `SITE_DIR` points at `astro-starlight-terminal1` (swap `fbb046f`, 2026-05-31). Starlight's tool docs are multi-page (overview/install/commands/workflows); the generated reference is the natural content of the existing-but-empty `commands` page, filling the "commands … coming soon" gap idiomatically. (Render itself is the follow-up.)
   - *Rejected*: the non-live tailwind site (wouldn't deploy); an expandable `<details>` block on `overview` (less idiomatic than Starlight's per-page model).

## Tasks

### Phase 1: Setup

- [x] T001 Create the live-site lib directory `sites/astro-starlight-terminal1/src/lib/` (new folder for the contract-only Zod module).

### Phase 2: Core Implementation

- [x] T002 Add the Zod schema module at `sites/astro-starlight-terminal1/src/lib/schemas.ts` — import `z` from `astro:content` (NO new dependency), define the recursive `Node` via `z.lazy` (`{name, path, short, usage, text, commands: Node[]}`), define the envelope (`{tool, version, captured_at, schema_version, root}`), and export both. Add NO new dependency to the site `package.json` and create NO repo-root `package.json`.
- [x] T003 [P] Add the validation script at `sites/astro-starlight-terminal1/scripts/validate-help.mjs` — load every `help/*.json` at repo root (relative path up out of the site dir), validate each against the Zod schema, print a per-file pass/fail line, and exit non-zero on any failure. It must run under the site's pnpm-installed Node toolchain.
- [x] T004 [P] Verify `help/wt.json` (already on disk — do NOT regenerate/overwrite) conforms to the schema by running the validation script via the site toolchain; confirm it passes.

### Phase 3: Integration & Edge Cases

- [x] T005 Add the receiving-side workflow `.github/workflows/help-automerge.yml` — on `pull_request` events with a `paths: ['help/**']` filter, enable auto-merge (via `gh pr merge --auto` or the auto-merge API). Scope to `help/**` so unrelated PRs are untouched. Add NO new deploy workflow. Must be valid YAML and inert until producers open PRs.

### Phase 4: Documentation

- [x] T006 Create `docs/memory/conventions/help-collection.md` — the authoritative contract doc: schema (envelope + recursive Node), the Zod module location, the `help/` collector convention + rationale (Constitution II), producer rules (Cobra tree-walk via `rootCmd.Commands()`, filter completion/help/hidden, version-from-binary, full recursion, tu Node exception), the PR + auto-merge push model via existing `SHLLAI_TOKEN`, and the documented cross-boundary read (live site reads `<repo-root>/help/*.json` by design). Match existing memory-file style (Overview / Requirements / Design Decisions / Changelog).
- [x] T007 [P] Modify `docs/memory/conventions/tool-page-rubric.md` — add the generated "Command reference" exception (renders as the per-tool `commands` page on the live Starlight site, single-sourced from the binary), preserve the existing "SHALL NOT contain long-form command reference" rule as still-standing-with-this-exception, add a NOTE that the rubric body describes the NON-LIVE tailwind site (`src/content/tools/`, `src/data/tools.ts`) while the live site is Starlight (multi-page docs, hardcoded sidebar in `astro.config.mjs`, no `src/data/`), and add a changelog entry.
- [x] T008 [P] Modify `docs/memory/build-deploy/deployment.md` — note the inbound help-PR path (tool repos PR `help/<slug>.json` into shll.ai), the auto-merge receiving workflow, and that the existing push-to-`main` deploy ships the result. Add a changelog entry.
- [x] T009 [P] Modify `docs/memory/index.md` — register `help-collection` under the `conventions` domain row. Also update `docs/memory/conventions/index.md` to add the `help-collection` file row.

## Execution Order

- T001 blocks T002 (module lives in the new dir).
- T002 blocks T003 and T004 (script imports the schema; verification runs the script).
- T003 blocks T004 (verification runs the script).
- T005–T009 are independent of the code tasks and of each other ([P]).

## Acceptance

### Functional Completeness

- [x] A-001 Canonical JSON shape: A Zod schema models the envelope `{tool, version, captured_at, schema_version, root}` and a recursive `Node` `{name, path, short, usage, text, commands: Node[]}` with `commands` an array (empty for leaves) and `text` a string holding raw `-h` output. (schemas.ts:32-74; `NodeSchema` has all six fields, `HelpDocSchema` has all five envelope fields incl. `root`.)
- [x] A-002 Envelope field semantics: schema enforces `tool` string, `version` string, `captured_at` string, `schema_version` integer equal to `1`. (schemas.ts:63-74; `schema_version: z.literal(1)` at :71 — verified rejects 2 with `expected 1`.)
- [x] A-003 Formal Zod schema is the machine-checkable contract: module at `sites/astro-starlight-terminal1/src/lib/schemas.ts`, imports `z` from `astro:content`, uses `z.lazy` for `commands`, exports the schemas; no repo-root `package.json`; no new dependency in the site `package.json`. (schemas.ts:18 import, :32 z.lazy, :45 commands; `git diff package.json` + `pnpm-lock.yaml` empty; no root package.json on disk.)
- [x] A-004 Producer rules documented: `docs/memory/conventions/help-collection.md` states tree-walk via `rootCmd.Commands()` (not regex), filter completion/help/hidden, version-from-binary, full recursion, and the `tu` Node exception (flat `commands: []`). (help-collection.md:78-88.)
- [x] A-005 Collector location and naming: `help/` is at the repo root (sibling to `sites/`, `fab/`, `docs/`), not under `sites/`; files named `help/<slug>.json`; `help/wt.json` present. (help/wt.json on disk at repo root.)
- [x] A-006 Collector survives a live-site swap: the help-collection doc states the root placement + Constitution II rationale so `SITE_DIR` swaps do not move the collector. (help-collection.md:68-72.)
- [x] A-007 Cross-boundary read acknowledged: the help-collection doc states the follow-up component/loader reads `<repo-root>/help/*.json` from within the live site, by design. (help-collection.md:74-76.)
- [x] A-008 Producers push via PR + auto-merge: the help-collection doc specifies PR-not-push, `SHLLAI_TOKEN`, parse-before-push validation, and the multi-repo-race rationale. (help-collection.md:92-97.)
- [x] A-009 Receiving-side workflow enables auto-merge safely: `.github/workflows/help-automerge.yml` triggers on `pull_request` (NOT `pull_request_target`) with a `help/**` path filter and enables auto-merge only when all three guards pass — actor guard (`TRUSTED_AUTHOR: sahil87`), content guard (every changed file under `help/`), and validation gate (`validate-help.mjs`); adds no new deploy workflow. (help-automerge.yml:27-31 trigger; 43 TRUSTED_AUTHOR; 57-72 actor guard; 80-101 content guard; 139-142 validation gate; 147-152 enable; no edit to deploy.yml.)
- [x] A-010 Workflow inert until producers exist: the workflow is valid YAML, does not break the existing deploy, and does not require all 7 producers to exist. (YAML validated with PyYAML; trigger is pull_request scoped to help/**, no coupling to deploy.yml.)
- [x] A-011 New help-collection memory file registered: `docs/memory/conventions/help-collection.md` exists and is registered in `docs/memory/index.md` under `conventions` (and the conventions sub-index). (index.md:9; conventions/index.md:8.)
- [x] A-012 Tool-page-rubric permits a generated Command reference: rubric amended with the generated `commands`-page exception, anti-drift justification, placement decision, and the live-site (Starlight vs tailwind) mismatch note. (tool-page-rubric.md:3,23,28-36.)
- [x] A-013 Deployment memory notes the inbound path: `docs/memory/build-deploy/deployment.md` describes the inbound help-PR path and the auto-merge receiving workflow. (deployment.md:39-47.)

### Behavioral Correctness

- [x] A-014 Reference sample conforms: `help/wt.json` validates against the Zod schema (run via the site's pnpm-installed toolchain), every node carries all six `Node` fields, envelope carries all four envelope fields. (Ran `node scripts/validate-help.mjs` → `PASS wt.json`, exit 0.)
- [x] A-015 Schema rejects a malformed document: a document missing a required `Node` field (e.g. `text`) fails validation with a descriptive error. (Verified: removing `root.commands[0].text` yields `root.commands.0.text: expected string, received undefined`.)

### Scenario Coverage

- [x] A-016 Leaf command: a command with no subcommands has `commands: []` and still validates (exercised by `wt init` in the sample). (help/wt.json:35 `wt init` has `"commands": []`; sample passes validation.)
- [x] A-017 Binary-name-vs-slug + schema-version: doc/schema make clear `tool` is the binary name (e.g. `rk`) while the file uses the slug (`help/run-kit.json`), and `schema_version === 1`. (help-collection.md:41,46; schema_version literal verified.)

### Edge Cases & Error Handling

- [x] A-018 Noise filtered + tu exception documented: the doc states completion/help/hidden are filtered and that `tu` produces `root.commands: []` with full `tu --help` in `text`. (help-collection.md:83,86.)
- [x] A-019 Unrelated PR untouched / no-producers-yet: the workflow's `help/**` path filter means PRs touching only `sites/` do not trigger it; a mixed diff that does trigger is stopped by the content guard; and the existing deploy succeeds unchanged when no producers have shipped. (help-automerge.yml:30-31 path filter; 80-101 content guard backstop; no edit to deploy.yml.)

### Code Quality

- [x] A-020 Pattern consistency: new memory files follow the existing memory-file structure (Overview / Requirements / Design Decisions / Changelog); the workflow matches the style of `deploy.yml`. (help-collection.md has Overview/Design Decisions/Changelog; workflow uses the same `name:`/`on:`/`permissions:`/`jobs:` + comment-header style as deploy.yml.)
- [x] A-021 No unnecessary duplication: the Zod schema is the single contract definition (no second shape); the validator imports it rather than re-declaring fields. (validate-help.mjs:24 imports `HelpDocSchema` from the same module the site uses; no duplicate shape.)
- [x] A-022 Readability over cleverness: the schema module and validator are small and direct; no god functions; no magic strings (schema_version literal `1` is the documented contract value). (schemas.ts 73 lines all-declarative; validate-help.mjs ~68 lines, single linear loop; literal `1` is the documented contract value.)
- [x] A-023 Follow existing project patterns: no new dependency added (Constitution VI), no repo-root `package.json`, `help/` kept at root (Constitution II), no new deploy workflow (Constitution IV). (Verified all four.)

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)

## Deletion Candidates

- None — this change adds new functionality (a contract schema, validator, receiving workflow, and docs) without making existing code redundant. The tool-page-rubric's "SHALL NOT contain long-form command reference" rule was amended (carved an exception), not removed; no existing file, function, or branch became dead.
