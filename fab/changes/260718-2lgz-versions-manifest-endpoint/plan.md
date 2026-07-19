# Plan: Versions Manifest Endpoint

**Change**: 260718-2lgz-versions-manifest-endpoint
**Intake**: `intake.md`

## Requirements

### Manifest: Static `versions.json` endpoint

#### R1: Build-time static JSON endpoint at `/versions.json`
The live site SHALL emit a static `application/json` file at build time, served at `https://shll.ai/versions.json`, via an Astro static file endpoint `sites/astro-starlight-terminal1/src/pages/versions.json.ts` — the same build-time, zero-runtime idiom as `src/pages/llms.txt.ts` (Constitution I: no SSR, no runtime fetch; Constitution VI: no new deps).

- **GIVEN** the live site is built with `pnpm build`
- **WHEN** the build completes
- **THEN** `dist/versions.json` exists, is valid JSON, and parses to an object with `schema`, `generated_at`, and `tools` keys
- **AND** `schema` equals the integer `1`
- **AND** `generated_at` is an ISO-8601 UTC timestamp string

#### R2: Manifest output shape and per-tool rows
Each entry under `tools` SHALL be keyed by the tool's **file slug** (`help/<slug>.json` filename, which equals the shll roster name and Homebrew formula name for all 7 tools today — NOT the envelope's `tool` binary-name field), and carry `latest`, `notify`, and `formula`.

- **GIVEN** the 7 committed `help/<slug>.json` envelopes and the repo-root `versions-policy.json`
- **WHEN** the manifest is built
- **THEN** each present, valid tool has a row `{ "latest": <normalized version>, "notify": <policy value>, "formula": <formula name> }`
- **AND** `latest` is the envelope's `version` normalized to no leading `v` (e.g. `"v3.7.4"` → `"3.7.4"`)
- **AND** `formula` defaults to the slug, overridden by the policy file's optional per-tool `formula` key when present

#### R3: `latest` normalization strips the leading `v`
`latest` SHALL be the envelope `version` with any single leading `v` removed, single-sourced through a shared helper (reusing/mirroring `src/lib/version.ts`'s `normalizeVersion`, which *adds* a `v`; the manifest needs the inverse — strip to bare — so a dedicated bare-normalizer is provided).

- **GIVEN** an envelope whose `version` is `"v3.7.4"` (wt/hop/idea/run-kit/shll style) or `"2.15.4"` (fab/tu style)
- **WHEN** the row is built
- **THEN** `latest` is `"3.7.4"` / `"2.15.4"` respectively — never carrying a leading `v`

#### R4: `notify` sourced from the policy file
`notify` for each tool SHALL be read from the repo-root `versions-policy.json`. Allowed values: `"never" | "patch" | "minor"`. Consumer semantics (documented, not enforced here): `never` never triggers; `patch` = any increase; `minor` = minor-or-major increase (patch suppressed).

- **GIVEN** `versions-policy.json` maps `run-kit` → `notify: "minor"` and `wt` → `notify: "patch"`
- **WHEN** the manifest is built
- **THEN** the `run-kit` row carries `"notify": "minor"` and the `wt` row `"notify": "patch"`

### Policy: Repo-root `versions-policy.json`

#### R5: Hand-edited policy data file at the repo root
A new `versions-policy.json` SHALL live at the **repo root** (sibling of `help/`, NOT inside it — `refresh-help.yml`'s staleness gate and `validate-help.mjs` glob `help/*.json` and must not see a non-envelope file). It maps each tool slug to `{ "notify": <value> }` with an optional `"formula"` override.

- **GIVEN** the repo root
- **WHEN** the file is placed
- **THEN** `versions-policy.json` is at `<repo-root>/versions-policy.json`, not under `help/`
- **AND** it seeds `run-kit`/`fab-kit` → `minor` and `shll`/`tu`/`wt`/`idea`/`hop` → `patch`

#### R6: Policy file is strictly validated (build-stop on invalid)
The endpoint SHALL validate `versions-policy.json` against a small Zod schema. Because it is site-authored data (not pulled), invalidity is a **build-stopping** condition: an unknown `notify` value or a malformed entry fails `pnpm build` (unlike pulled envelopes, which skip-degrade — R7).

- **GIVEN** a `versions-policy.json` with a `notify` value outside `{never, patch, minor}`, or a non-object entry
- **WHEN** the site is built
- **THEN** `astro build` fails loudly and non-zero

### Manifest: Failure isolation

#### R7: Per-tool skip-degrade for envelope failures
A tool whose `help/<slug>.json` is **missing** or **Zod-invalid** SHALL be omitted from the `tools` map, and the build SHALL continue (mirroring the help-collection per-tool skip-degrade and the `/llms.txt` posture — NOT `VersionTable`'s build-stop). A tool present in the policy file but missing an envelope is skipped the same way. Envelope parsing SHALL reuse the shared `HelpDocSchema` (`src/lib/schemas.ts`) — never hand-parsed.

- **GIVEN** a tool listed in `versions-policy.json` whose `help/<slug>.json` is absent (ENOENT) or fails `HelpDocSchema`
- **WHEN** the manifest is built
- **THEN** that tool has no row in `tools`, and the build succeeds with the remaining tools present

### Contract: Cross-repo spec

#### R8: `versions-manifest-contract.md` spec + index row
A new spec `docs/specs/versions-manifest-contract.md` SHALL document the output schema, `notify` semantics, slug-keying + `formula` rule, `v`-strip normalization, skip-degrade behavior, the freshness cascade (no workflow change), the consumer contract (run-kit `internal/updatecheck`), and the **live-site-swap obligation** (a future `SITE_DIR` site must reimplement the endpoint — Constitution III). A row SHALL be added to `docs/specs/index.md`.

- **GIVEN** the repo's cross-repo contract-spec pattern (`help-dump-contract.md`, `readme-extraction-contract.md`)
- **WHEN** the spec is added
- **THEN** `docs/specs/versions-manifest-contract.md` exists documenting the above, and `docs/specs/index.md` carries a matching table row

### Non-Goals

- No changes to `refresh-help.yml` or `deploy.yml` — the existing refresh→deploy cascade already rebuilds `versions.json` from fresh envelopes (intake §3).
- No new npm/build dependencies — Zod (via `astro:content`) and the envelope readers already exist (Constitution VI).
- No runtime/SSR — the endpoint is build-time static (Constitution I).
- No consumer-side implementation — run-kit's `internal/updatecheck` is a sibling change (`260718-d15e`); this side only publishes the manifest + contract.

### Design Decisions

1. **Manifest-building logic extracted to `src/lib/versions-manifest.ts`**: approach — put the policy Zod schema and the pure `buildManifest(repoRoot, policy)` logic in a lib module the endpoint imports, so the pure logic is unit-testable with `node --test` (the `llms.ts` / `terminal-toolcard.ts` lib-extraction precedent). — *Why*: matches the established repo pattern where endpoints are thin and logic is testable in isolation; the endpoint page itself cannot be imported by a `node --test` script. — *Rejected*: inlining all logic in `versions.json.ts` (untestable without an Astro build).
2. **Dedicated bare-version normalizer, not reuse of `normalizeVersion`**: `src/lib/version.ts`'s `normalizeVersion` *prepends* `v` (for display); the manifest contract requires the *bare* form (no leading `v`). — *Why*: the two are inverse transforms; forcing one helper to do both would muddy its single-purpose display contract. A small `stripVersionPrefix` (in `versions-manifest.ts`) is clearer. — *Rejected*: overloading `normalizeVersion` with a mode flag.
3. **Roster = policy-file keys, not the `help/` directory listing or a site const**: iterate the tools declared in `versions-policy.json`. — *Why*: the policy file is the authoritative roster for the manifest (a tool with no policy has no notify semantics, so it should not appear); this also makes "which tools to advertise" a one-file edit. — *Rejected*: `readdirSync(help/)` (would advertise a tool with no policy) or a hardcoded const (a third roster to keep in sync).

## Tasks

### Phase 1: Setup (repo-root data + spec scaffolding)

- [x] T001 [P] Create repo-root `versions-policy.json` mapping all 7 slugs to `{ "notify": ... }` — `run-kit`/`fab-kit` → `minor`, `shll`/`tu`/`wt`/`idea`/`hop` → `patch` (no `formula` overrides needed today, since slug==formula for all 7). <!-- R5 -->

### Phase 2: Core Implementation (lib + endpoint)

- [x] T002 Create `sites/astro-starlight-terminal1/src/lib/versions-manifest.ts`: the policy Zod schema (`VersionsPolicySchema` — a record of slug → `{ notify: enum(never|patch|minor), formula?: string }`), a `stripVersionPrefix(v)` bare-normalizer, `readPolicy(repoRoot)` (read + strict-parse `versions-policy.json`, throw on invalid — R6), and `buildManifest(repoRoot, policy)` returning `{ schema: 1, generated_at, tools }` with per-tool skip-degrade using `HelpDocSchema` from `./schemas.ts`. <!-- R2 -->
- [x] T003 In `versions-manifest.ts` `buildManifest`, set `latest` = `stripVersionPrefix(doc.version)`, `formula` = policy entry's `formula ?? slug`, `notify` = policy entry's `notify`; iterate the policy-file keys as the roster. <!-- R3 -->
- [x] T004 In `versions-manifest.ts` `buildManifest`, implement per-tool skip-degrade: a slug whose `help/<slug>.json` is ENOENT or fails `HelpDocSchema.safeParse` is omitted from `tools`; the build continues (mirror `/llms.txt` `toolShort` / help-collection posture; do NOT throw). <!-- R7 -->
- [x] T005 Create the endpoint `sites/astro-starlight-terminal1/src/pages/versions.json.ts`: a `GET` `APIRoute` that resolves the repo root via `repoRootFromModuleUrl(import.meta.url)`, calls `readPolicy` then `buildManifest`, and returns `new Response(JSON.stringify(manifest, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } })`. <!-- R1 -->

### Phase 3: Integration & Edge Cases (tests)

- [x] T006 Create `sites/astro-starlight-terminal1/scripts/versions-manifest.test.mjs` (native `node --test`, registering `astro-content-alias.mjs` like `llms.test.mjs`): assert `stripVersionPrefix` strips a single leading `v` and is idempotent / no-op on bare versions; assert `VersionsPolicySchema` rejects an invalid `notify` and accepts a `formula` override; assert `buildManifest` over a fixture repo-root produces rows with bare `latest`, policy `notify`, slug-defaulted `formula`, and `schema: 1`; assert a missing/invalid envelope skip-degrades (row omitted, no throw). <!-- R6 R7 -->

### Phase 4: Polish (contract spec + docs index)

- [x] T007 [P] Create `docs/specs/versions-manifest-contract.md` documenting the output schema, `notify` semantics, slug-keying + `formula` rule, `v`-strip normalization, skip-degrade, the freshness cascade (no workflow change), the run-kit consumer contract, and the live-site-swap obligation (Constitution III). <!-- R8 -->
- [x] T008 [P] Add a `versions-manifest-contract` row to `docs/specs/index.md`. <!-- R8 -->

## Execution Order

- T002 → T003 → T004 → T005 (lib built up before the endpoint imports it; T003/T004 refine the `buildManifest` from T002).
- T006 depends on T002–T004 (imports the lib).
- T001, T007, T008 are independent `[P]` (data file / docs); T005 build-verification depends on T001 (the endpoint reads the policy at build time).

## Acceptance

### Functional Completeness

- [x] A-001 R1: `pnpm build` in the live site produces `dist/versions.json`; it parses to an object with `schema` (=== 1), `generated_at` (ISO-8601 UTC string), and `tools`.
- [x] A-002 R2: Every present/valid tool has a `tools[slug]` row with `latest`, `notify`, and `formula`; keys are file slugs (not envelope `tool` binary names).
- [x] A-003 R3: `latest` never carries a leading `v` (verified for both `v`-prefixed and bare-version envelopes).
- [x] A-004 R4: Each row's `notify` matches the value in `versions-policy.json` and is one of `never`/`patch`/`minor`.
- [x] A-005 R5: `versions-policy.json` exists at the repo root (not under `help/`), maps all 7 slugs, and seeds `run-kit`/`fab-kit` → `minor`, the rest → `patch`.
- [x] A-006 R8: `docs/specs/versions-manifest-contract.md` exists documenting the schema, semantics, skip-degrade, freshness cascade, consumer contract, and live-site-swap obligation; `docs/specs/index.md` carries a matching row.

### Behavioral Correctness

- [x] A-007 R6: An invalid `versions-policy.json` (bad `notify` value or malformed entry) fails the build; a valid one builds cleanly.
- [x] A-008 R7: A missing or Zod-invalid `help/<slug>.json` omits that tool's row and the build still succeeds (skip-degrade, not build-stop).

### Scenario Coverage

- [x] A-009 R7: A `node --test` case exercises the skip-degrade path over a fixture repo-root (missing/invalid envelope → row omitted, no throw).
- [x] A-010 R3: A `node --test` case exercises `stripVersionPrefix` on both `v`-prefixed and bare inputs and confirms idempotence.

### Edge Cases & Error Handling

- [x] A-011 R7: `buildManifest` uses `HelpDocSchema.safeParse` (never hand-parses the envelope) and distinguishes missing (ENOENT) from present-but-invalid — both skip-degrade for pulled envelopes.
- [x] A-012 R6: `readPolicy` re-throws on invalid policy (build-stop), the inverse posture from the pulled envelopes.

### Code Quality

- [x] A-013 Pattern consistency: The endpoint mirrors the `llms.txt.ts` idiom (thin page, `repoRootFromModuleUrl`, lib-extracted logic); the lib mirrors `llms.ts` structure and doc-comment style.
- [x] A-014 No unnecessary duplication: Envelope reads reuse `HelpDocSchema` + `repoRootFromModuleUrl`; no second envelope shape or repo-root ascent is introduced.
- [x] A-015 No magic strings: `notify` allowed values and `schema` version live as named constants / a Zod enum, not scattered literals.

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`

## Deletion Candidates

None — this change adds new functionality without making existing code redundant. (Purely additive: one new lib, one new endpoint page, one new data file, one new test, one new spec; the only touched existing file is `docs/specs/index.md`, +1 row. The GitHub-Releases-API polling this manifest replaces lives in the run-kit repo — sibling change `260718-d15e` — not here. `src/lib/version.ts`'s `normalizeVersion` remains live for its display consumers, `VersionTable`/`CommandReference`.)

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Confident | Manifest-building logic lives in a new `src/lib/versions-manifest.ts`; the endpoint page is thin | Matches the `llms.ts`/`terminal-toolcard.ts` lib-extraction precedent and makes the logic `node --test`-able (a page can't be imported by the test) | S:70 R:90 A:90 D:80 |
| 2 | Confident | A dedicated `stripVersionPrefix` (bare form) is added rather than reusing `normalizeVersion` (which prepends `v`) | The contract needs the inverse transform; overloading the display helper would muddy its single purpose | S:75 R:90 A:90 D:85 |
| 3 | Confident | The manifest roster = the keys declared in `versions-policy.json` | A tool with no policy has no notify semantics so should not appear; keeps "what to advertise" a one-file edit; avoids a third roster const | S:60 R:85 A:85 D:75 |
| 4 | Confident | `versions.json` is emitted pretty-printed (2-space) | A committed public data surface humans may inspect; size is trivial (7 rows); matches no strict minification requirement in the intake | S:55 R:95 A:80 D:75 |
| 5 | Confident | The test uses a temp-dir fixture repo-root (a `help/` dir + a `versions-policy.json`) to exercise `buildManifest`/skip-degrade deterministically | Mirrors `llms.test.mjs`'s pure-function testing; avoids coupling the unit test to the live corpus (which the daily refresh rots) | S:60 R:90 A:85 D:80 |

5 assumptions (0 certain, 5 confident, 0 tentative).
