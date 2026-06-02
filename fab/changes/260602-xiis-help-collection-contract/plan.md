# Plan: Help-Collection Contract for shll.ai

**Change**: 260602-xiis-help-collection-contract
**Status**: In Progress
**Intake**: `intake.md`
**Spec**: `spec.md`

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
