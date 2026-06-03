# Spec: Help-Collection Contract for shll.ai

**Change**: 260602-xiis-help-collection-contract
**Created**: 2026-06-02
**Affected memory**: `docs/memory/conventions/help-collection.md`, `docs/memory/conventions/tool-page-rubric.md`, `docs/memory/build-deploy/deployment.md`

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

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Build-time, binary-generated capture (no hand-written reference) to eliminate drift | Confirmed from intake #1; core insight reconciling the feature with the anti-drift rubric | S:95 R:80 A:90 D:95 |
| 2 | Certain | Collector is `help/<slug>.json` at repo root | Confirmed from intake #2; Constitution II + live-site-swap durability | S:95 R:75 A:90 D:90 |
| 3 | Certain | Node = {name, path, short, usage, text(raw), commands[]}; envelope {tool, version, captured_at, schema_version} | Confirmed from intake #3; validated against real wt binary | S:95 R:70 A:88 D:90 |
| 4 | Certain | Producers filter completion/help/hidden | Confirmed from intake #4; observed as Cobra noise in real wt output | S:95 R:85 A:92 D:95 |
| 5 | Certain | Full recursive subcommand tree captured | Confirmed from intake #5; matches the rk riff motivating case | S:95 R:75 A:88 D:92 |
| 6 | Certain | Push = PR + auto-merge into shll.ai via existing SHLLAI_TOKEN | Confirmed from intake #6; token already exists in all 7 repos | S:92 R:65 A:85 D:88 |
| 7 | Certain | Reference sample help/wt.json from the real binary, committed | Confirmed from intake #7; already on disk and validated | S:98 R:80 A:95 D:95 |
| 8 | Certain | Per-repo, framework-native producers; no shared library | Confirmed from intake #8; 6 Cobra + tu Node verified | S:90 R:70 A:88 D:90 |
| 9 | Certain | Scope = contract + sample + push/receiving + docs; loader/UI is follow-up | Confirmed from intake #9; producers already seeded | S:95 R:75 A:90 D:92 |
| 10 | Certain | Placement = generated reference as a dedicated `commands` page per tool on the LIVE Starlight site | Revised from intake #10 (was "expandable on tailwind page"): auto-clarify caught that SITE_DIR is now astro-starlight-terminal1 (swap fbb046f, 2026-05-31); user chose Starlight + dedicated commands page | S:90 R:65 A:85 D:88 |
| 11 | Certain | Receiving-side auto-merge workflow IS in scope; reuse existing deploy | Upgraded from intake Tentative #12 — clarified "here"; Constitution IV makes deploy reuse the obvious choice | S:90 R:60 A:80 D:88 |
| 12 | Certain | Pin a formal Zod schema (recursive Node + envelope) in this change | Upgraded from intake Tentative #13 — clarified "now"; single source for producers + future loader | S:92 R:65 A:82 D:90 |
| 13 | Certain | New conventions/help-collection memory file as the authoritative contract doc | Upgraded from intake Confident #11; the 7 repos need one canonical home | S:88 R:75 A:88 D:85 |
| 14 | Certain | Zod module lives at sites/astro-starlight-terminal1/src/lib/schemas.ts (the LIVE site), using astro:content's z re-export — NOT repo root, NOT the tailwind site | Corrected twice: (a) zod is transitive + no repo-root package.json, (b) auto-clarify caught the live site is Starlight not tailwind; src/lib/ is the idiomatic spot (site has no src/data/) | S:88 R:68 A:85 D:85 |
| 15 | Confident | Sample validation runs through the live Starlight site's pnpm toolchain (no new dependency) | Verified: starlight site uses Node 22 + pnpm + Astro (provides zod); validate reuses its node_modules, no repo-root toolchain | S:78 R:70 A:80 D:75 |
| 16 | Certain | Feature targets the LIVE Starlight site (astro-starlight-terminal1); reference renders as the per-tool `commands` page | Auto-clarify caught the SITE_DIR swap to Starlight (fbb046f); user explicitly chose Starlight + dedicated commands-page placement | S:92 R:65 A:85 D:90 |
| 17 | Confident | Reconciling the rubric's tailwind-specific body to Starlight is out of scope; this change adds the Command-ref exception + a site-mismatch note only | The rubric predates the site swap and a full rewrite is a separate concern; a flagged mismatch is the minimal correct action here | S:75 R:75 A:80 D:72 |
| 18 | Certain | Auto-merge workflow MUST apply a content guard (help/-only) + schema-validation gate, with an actor guard as defense-in-depth — a path trigger filter alone is insufficient | Rework after review FAIL: public repo + unprotected main + auto-deploy means a mixed PR (help/** plus other paths) or schema-invalid file could auto-merge and ship; outward review must-fix, verified against live repo settings | S:92 R:55 A:82 D:85 |

18 assumptions (16 certain, 2 confident, 0 tentative, 0 unresolved).

<!-- Merged into plan.md ## Requirements on 2026-06-03 — safe to delete. -->
