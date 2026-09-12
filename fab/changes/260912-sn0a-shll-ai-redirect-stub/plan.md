# Plan: shll.ai redirect stub (HexoKit rebrand row X2)

**Change**: 260912-sn0a-shll-ai-redirect-stub
**Intake**: `intake.md`

## Requirements

> Design authority: run-kit `fab/plans/sahil/26-09-10-hexokit-rebrand.md` row X2 + D4/D13; consumer contract: hexokit-site `docs/specs/shll-ai-redirect-map-contract.md` (branch `260912-1u4q-hexokit-site-cutover-prep`, PR #9). The intake's § What Changes carries the concrete shapes; requirements below are the checkable restatement.

### Generator: location, inputs, fail-closed fetch

#### R1: Zero-dependency Node generator selected by `SITE_DIR`
The stub generator SHALL live at `sites/shll-ai-redirect-stub/` as plain ESM (`build.mjs` CLI + pure `lib.mjs`), runnable with the pinned Node 22 and **no** `package.json`, lockfile, or `node_modules`. `build.mjs` SHALL accept `--origin <url>` (default the named constant `HEXOKIT_ORIGIN = 'https://hexokit.com'`), `--out <dir>` (default `dist/` beside the script), and `--floor <path>` (default `fixtures/shll-ai-paths.txt`), and SHALL exit non-zero with a one-line reason on any failure.

- **GIVEN** a checkout with only Node 22 installed
- **WHEN** `node sites/shll-ai-redirect-stub/build.mjs` runs
- **THEN** it needs no install step and either writes `dist/` and exits 0, or exits non-zero naming the failing check

#### R2: Everything is fetched from hexokit.com at build time; any failure is a build-stop
The build MUST fetch, in order, `/shll-ai-redirects.json`, every `keep` path, and every file-like `redirects` key (last path segment contains a `.`) from the origin, each with a 20 s timeout, no retries, and no fallback origin. A non-2xx response, a timeout, or a network error MUST fail the build. No committed copy of the map is consulted.

- **GIVEN** `https://hexokit.com/shll-ai-redirects.json` answers 404 (X1 not yet deployed)
- **WHEN** the build runs
- **THEN** it exits non-zero naming the URL and status, and writes nothing to `--out`

#### R3: The fetched map is validated before anything is emitted
`validateMap(map)` MUST throw an `Error` naming the offending field when any of the following fails: `schema === 1`; `from === 'https://shll.ai'`; `to` is an `https:` origin with no path (equals `new URL(to).origin`); `keep` deep-equals `['/install', '/versions.json']`; every `redirects` key equals `canonicalPath(key)`; every value is an absolute URL starting with `to`; no key is a `keep` entry; `rules` is a non-empty array of two-string pairs whose regexes compile and whose last entry is `['^(/.*)$', '$1']`; and for every key `k`, `to + applyRules(rules, k) === redirects[k]`.

- **GIVEN** a map whose `keep` is `['/install']`
- **WHEN** `validateMap` runs
- **THEN** it throws naming `keep`
- **GIVEN** a map with a key `/tools/wt/readme` (no trailing slash)
- **WHEN** `validateMap` runs
- **THEN** it throws naming that key as non-canonical

#### R4: A committed completeness floor is asserted against the fetched map
`checkFloor(map, floorText)` MUST canonicalize every non-blank, non-`#` line of the floor file and return the list of paths that are neither a `redirects` key, nor a `keep` entry, nor a file-like key; the build MUST fail listing every missing path when that list is non-empty. The committed floor `fixtures/shll-ai-paths.txt` SHALL contain shll.ai's final sitemap (75 paths, verified against the live `sitemap-0.xml` at apply time) plus the historical `/tools/<slug>{,/overview,/readme,/commands}` set and `/tools/<slug>/<page>` for every docs/site page — the same content as X1's fixture, with a header recording the fetch date and command.

- **GIVEN** a map missing `/fab-kit/fkf/`
- **WHEN** the build runs with the committed floor
- **THEN** it exits non-zero listing `/fab-kit/fkf/`

#### R5: Byte copies are validated for the failure they exist to prevent
`validateByteCopy(path, bytes)` MUST throw when: `/install` does not begin with `#!/bin/sh`; `/versions.json` does not parse as JSON with `schema === 1` and a non-empty `tools` object; any other file-like copy is empty or begins with `<` (an HTML body at a text path).

- **GIVEN** the origin answers `/install` with an HTML 404 page and status 200
- **WHEN** the build runs
- **THEN** it exits non-zero naming `/install` and the shebang check

### Output: the emitted site

#### R6: Exactly this file set is emitted, nothing else
`dist/` MUST contain: `CNAME` (`shll.ai\n`); `<key>index.html` for every page-like `redirects` key (the `/` key → `dist/index.html`); the fetched bytes verbatim at every `keep` path and every file-like key; `404.html`; `robots.txt`; `.well-known/security.txt`. It MUST NOT contain a sitemap, favicon, OG image, or any other file. The build SHALL print a one-line summary (`N stubs, M byte copies, R rules`).

- **GIVEN** a valid map with 3 page-like keys, 2 file-like keys, and the 2 `keep` paths
- **WHEN** the build runs
- **THEN** `dist/` holds exactly 3 stub `index.html` files, 4 byte copies, `CNAME`, `404.html`, `robots.txt`, `.well-known/security.txt`

#### R7: Per-key stub page shape
`renderStub(target)` MUST return a complete HTML5 document containing, with the target HTML-escaped: `<meta http-equiv="refresh" content="0; url=<target>">`, `<link rel="canonical" href="<target>">`, a `<title>`, `<style>` with `:root{color-scheme:light dark}` and a visible `a:focus-visible` outline, a `<p>` with a visible `<a href="<target>">` link, and a `<script>` calling `location.replace(<JSON.stringify(target)>)`. It MUST NOT include `noindex`, external requests, or any other script.

- **GIVEN** target `https://hexokit.com/wt/readme/`
- **WHEN** `renderStub` runs
- **THEN** the output contains the meta refresh, the canonical link, the visible link, and the `location.replace` call for that URL, and nothing fetches externally

#### R8: `404.html` catch-all applies the map's rules client-side
`render404(to, rules)` MUST embed `to` and `rules` as a JSON literal taken from the fetched map, and an inline port of `canonicalPath` + `applyRules` (first-match `String.replace`, canonicalize result). The page script MUST compute `to + applyRules(rules, location.pathname) + location.search + location.hash`, set the visible link's `href` and text to it, then `location.replace` it. With scripting disabled, the page MUST still show a visible link to `to + '/'`. `lib.mjs` MUST export the same two functions, ported verbatim from X1's `shll-ai-redirects.ts`.

- **GIVEN** the spec §4 rules and request path `/tools/run-kit/gui`
- **WHEN** `applyRules` runs
- **THEN** it returns `/docs/gui/`
- **GIVEN** request path `/tools/wt/readme`
- **THEN** it returns `/wt/readme/`
- **GIVEN** request path `/getting-started/install/`
- **THEN** it returns `/toolkit/install/`
- **GIVEN** request path `/foo.png`
- **THEN** it returns `/foo.png` (identity catch-all)

#### R9: Stub chrome — `robots.txt` and a regenerated `security.txt`
`robots.txt` MUST be exactly `User-agent: *\nAllow: /\n` (no `Sitemap:` line). `.well-known/security.txt` MUST be generated (not copied) with exactly: `Contact: https://github.com/sahil87/.github/security/advisories/new`, `Expires: <build time + 6 months, ISO-8601>`, `Canonical: https://shll.ai/.well-known/security.txt`, `Policy: https://github.com/sahil87/.github/blob/main/SECURITY.md`, `Preferred-Languages: en`, trailing newline.

- **GIVEN** a build at time T
- **WHEN** `renderSecurityTxt(T)` runs
- **THEN** `Canonical` names shll.ai and `Expires` is T + 6 months

### Workflows

#### R10: `deploy.yml` builds the stub daily and on push/dispatch
`.github/workflows/deploy.yml` MUST keep its name `Deploy`, the `build` → `deploy` two-job shape, the `pages` concurrency group with `cancel-in-progress: false`, and permissions exactly `contents: read`, `pages: write`, `id-token: write`. It MUST add `schedule: [{cron: '13 9 * * *'}]` to the existing `push` (main) + `workflow_dispatch` triggers, set `SITE_DIR: sites/shll-ai-redirect-stub`, and its build job MUST be: checkout → `actions/setup-node@v4` (node 22, no pnpm, no cache) → `node build.mjs` in `SITE_DIR` → `actions/upload-pages-artifact@v3` of `${{ env.SITE_DIR }}/dist`. The raw-GitHub install-script `curl` step and the `GITHUB_TOKEN` env on the build step MUST be removed.

- **GIVEN** the workflow file
- **WHEN** parsed as YAML
- **THEN** it has the three triggers, the two jobs, no `pnpm` reference, no `curl`, and `SITE_DIR` names the stub

#### R11: `ci.yml` runs the hermetic tests then the real build
`.github/workflows/ci.yml` MUST keep its name, triggers and concurrency rule, and its steps MUST be: checkout → setup Node 22 → `node --test sites/shll-ai-redirect-stub/*.test.mjs` → `node build.mjs` in the site dir (against the live origin). Every pnpm/`validate-help.mjs`/Astro step MUST be removed. The header comment SHALL state that CI is expected red until X1 is deployed (the map 404s → fail-closed).

- **GIVEN** the CI workflow
- **WHEN** X1 is not yet live
- **THEN** the unit-test step passes and the build step fails naming the map URL

#### R12: The two refresh cron workflows are deleted
`.github/workflows/refresh-help.yml` and `.github/workflows/refresh-readme.yml` MUST be deleted.

- **GIVEN** the merged tree
- **WHEN** `ls .github/workflows/`
- **THEN** only `ci.yml` and `deploy.yml` exist

### Repository contents replaced in place (D13)

#### R13: The old site trees and pull-side data are deleted
`sites/astro-starlight-terminal1/`, `sites/astro-tailwind-terminal1/`, `sites/_playground/`, `content/`, `help/`, and `versions-policy.json` MUST be deleted (`git rm -r`). `.gitignore` SHALL drop the Astro-only rules (`.astro/`, `sites/*/public/install`, `/.test-tmp/`, `/content/__*test*__/`) and keep `dist/`, `node_modules/`, `.fab-*`, and the rest. `.vscode/` entries that only reference the Astro site SHALL be pruned.

- **GIVEN** the merged tree
- **WHEN** `git ls-files | cut -d/ -f1 | sort -u`
- **THEN** no `content`, `help`, or `versions-policy.json` entry exists and `sites/` contains only `shll-ai-redirect-stub`

#### R14: Root README, fab config and context describe the redirect host
Root `README.md` MUST describe shll.ai as a permanent redirect host for hexokit.com, name the two D4 endpoints and why they are byte copies, show `node sites/shll-ai-redirect-stub/build.mjs`, point at the X1 contract, and mention the daily rebuild (keep the MIT badge). `fab/project/config.yaml` MUST set `source_paths: [sites/shll-ai-redirect-stub/]`, `true_impact_exclude: [fab/, docs/]`, and a redirect-host `project.description`. `fab/project/context.md` MUST be rewritten for the stub (single site, no experiments, no pull pipeline, downstream of hexokit-site).

- **GIVEN** the three files
- **WHEN** read
- **THEN** none mentions Astro, Starlight, `sites/_playground`, or the pull crons as present-tense facts

### Tests

#### R15: Hermetic unit + integration tests with `node --test`
`sites/shll-ai-redirect-stub/stub.test.mjs` MUST cover: `canonicalPath`/`applyRules` against the R8 cases; `validateMap` accepting `fixtures/sample-map.json` and rejecting wrong `schema`, missing `keep` entry, non-canonical key, off-origin value, broken equivalence invariant; `checkFloor` listing missing paths; `validateByteCopy` rejecting an HTML `/install`; `renderStub` containing the four R7 mechanisms with an escaped target; `render404` resolving the R8 sample paths when its inline script runs under `node:vm` with a fake `location`; and an integration case that serves `fixtures/sample-map.json` + fake `/install`, `/versions.json`, `/llms.txt`, `/llms-full.txt` from an in-process `node:http` server, runs the build (`--origin`, `--out` temp dir, `--floor` a small matching floor) and asserts the R6 file set. No network, no third-party packages.

- **GIVEN** `node --test sites/shll-ai-redirect-stub/*.test.mjs`
- **WHEN** run offline
- **THEN** every test passes

### Governing documents

#### R16: Constitution v3.0.0 and spec tombstones
`fab/project/constitution.md` MUST be amended to **v3.0.0** (2026-09-12): keep I Static-First (rephrased: the stub is generated at build time from hexokit.com endpoints; no runtime fetch, no server), replace II Multi-Site Isolation and III One Live Site with **II Redirect Host** (every URL shll.ai ever served MUST land on its final hexokit.com page via the X1 map; `/install` and `/versions.json` MUST be byte copies, never redirects; the build MUST fail closed so the site never lapses — D4/D13), keep IV Deploy via CI (daily schedule permitted), keep V Dark Mode Parity, tighten VI to zero runtime and zero npm dependencies, remove Tool-Page Depth and External Links, keep Accessibility and Test Integrity, and add a changelog entry citing this change and the plan. `docs/specs/help-dump-contract.md`, `readme-extraction-contract.md`, `versions-manifest-contract.md` MUST each be replaced by a short tombstone pointing at the same path in `sahil87/hexokit-site`, and `docs/specs/index.md` MUST mark them superseded with that pointer. Memory files are hydrate's (not apply's).

- **GIVEN** the constitution
- **WHEN** read
- **THEN** its version is 3.0.0, it has no Multi-Site/One-Live-Site/Tool-Page-Depth principle, and it has a Redirect Host principle naming the two byte-copy endpoints

### Non-Goals

- DNS, `www.shll.ai`, or GitHub Pages custom-domain settings — untouched.
- Any edit in hexokit-site beyond a possible one-line fixture-freeze PR if the live sitemap drifted (recorded in `## Notes`, not done here).
- Real HTTP 301s (Pages cannot emit them), a sitemap, favicon, OG image, analytics.
- shll standards sweep (X4), roster/formula/binary renames (R1/R2), historical text rewrite (D11).
- Merging before X1 is live — the merge gates in intake area 7 are operator steps at ship time.

### Design Decisions

#### Generator is a zero-dependency Node script, not the Astro site
**Decision**: Emit the stub with `build.mjs` + `lib.mjs` under `sites/shll-ai-redirect-stub/`, using only Node 22 built-ins (`fetch`, `fs`, `node:test`).
**Why**: ~200 identical stubs and a handful of byte copies need no framework; Constitution VI; the deleted Astro tree had no remaining content to render.
**Rejected**: Reusing Astro's `redirects:` (a 2 MB toolchain for three-line pages; redirect targets must be in-site routes); committing generated stubs (stale the day hexokit-site adds a page).
*Introduced by*: 260912-sn0a-shll-ai-redirect-stub

#### Build-time fetch, fail closed, no fallback origin
**Decision**: Fetch the map and byte copies from hexokit.com at build time; any fetch or validation failure stops the build so the last-good deployment stays live.
**Why**: Constitution I permits build-time data; `deploy.yml`'s existing `curl -f` rationale ("fail the deploy rather than ship a 404ing one-liner"); D4 never-lapses.
**Rejected**: A committed map copy (second table); retry/fallback origins (mask the exact regression the floor check exists to surface).
*Introduced by*: 260912-sn0a-shll-ai-redirect-stub

#### Freshness is a daily deploy cron, not a cross-repo dispatch
**Decision**: `deploy.yml` gains `schedule: '13 9 * * *'` (2 h after hexokit-site's 07:13 UTC help refresh).
**Why**: The refresh crons are gone, so nothing else rebuilds daily; ≤ 24 h staleness of the fallback manifest is acceptable because shll ≥ v0.1.31 prefers hexokit.com.
**Rejected**: `repository_dispatch` from hexokit-site (a PAT secret in two repos for no user-visible gain).
*Introduced by*: 260912-sn0a-shll-ai-redirect-stub

#### The consumer re-checks the producer's invariants
**Decision**: `validateMap` re-asserts the exact `keep` pair, canonical keys, on-origin values and the rules≡enumeration invariant; `checkFloor` asserts a committed sitemap floor; `validateByteCopy` checks the shebang/JSON shape.
**Why**: X1 proves these in its own CI, but a truncated download, a regressed map, or an HTML body at `/install` are failures only the consumer sees at fetch time.
**Rejected**: Trusting the fetched map as-is.
*Introduced by*: 260912-sn0a-shll-ai-redirect-stub

### Deprecated Requirements

#### Multi-site exploration under `sites/`, one live site chosen among variants
**Reason**: shll.ai is a redirect host; there is nothing to explore.
**Migration**: Constitution v3.0.0 II Redirect Host; a single `sites/shll-ai-redirect-stub/`.

#### Inbound scheduled pulls (help refresh, README refresh) and their build-time consumers
**Reason**: The producer side moved to hexokit-site (S1/S3); this repo renders nothing.
**Migration**: Byte copies of hexokit.com's `/versions.json`, `/llms.txt`, `/llms-full.txt` refreshed by the daily deploy.

#### Deploy-time fetch of the raw shll install script
**Reason**: D13 — `/install` is a byte copy of hexokit.com's composed script.
**Migration**: `build.mjs` fetches `/install` from hexokit.com and validates the shebang.

## Tasks

### Phase 1: Setup

- [x] T001 Create `sites/shll-ai-redirect-stub/lib.mjs` with the named constants (`HEXOKIT_ORIGIN`, `SHLL_AI_ORIGIN`, `KEEP_ON_SHLL_AI`, `CNAME`, `FETCH_TIMEOUT_MS`, `SECURITY_EXPIRY_MONTHS`) and `canonicalPath` / `applyRules` / `isFileLike` ported verbatim from X1's `src/lib/shll-ai-redirects.ts` (read it with `git -C ~/code/sahil87/hexokit-site show origin/260912-1u4q-hexokit-site-cutover-prep:sites/astro-starlight-terminal1/src/lib/shll-ai-redirects.ts`) <!-- R1, R8 -->
- [x] T002 [P] Create `sites/shll-ai-redirect-stub/fixtures/shll-ai-paths.txt` from X1's fixture (`git -C ~/code/sahil87/hexokit-site show origin/260912-1u4q-hexokit-site-cutover-prep:sites/astro-starlight-terminal1/scripts/fixtures/shll-ai-paths.txt`), re-verify section 1 against `curl -fsSL https://shll.ai/sitemap-0.xml` (record any drift under `## Notes`), and create `fixtures/sample-map.json` — a small synthetic schema-1 map (≈6 page-like keys incl. `/`, `/llms.txt` + `/llms-full.txt` file-like, `keep`, spec §4-shaped `rules` with the identity catch-all) that satisfies `validateMap` <!-- R4, R15 -->

### Phase 2: Core Implementation

- [x] T003 Implement `validateMap`, `checkFloor`, `validateByteCopy` in `sites/shll-ai-redirect-stub/lib.mjs` per R3/R4/R5, each throwing an `Error` that names the failing field/path <!-- R3, R4, R5 -->
- [x] T004 Implement `renderStub`, `render404`, `renderSecurityTxt`, and the `ROBOTS_TXT` constant in `sites/shll-ai-redirect-stub/lib.mjs` per R7/R8/R9 (HTML-escape targets; `render404` embeds `to`+`rules` as JSON and an inline `canonicalPath`/`applyRules` port; preserve `location.search`/`hash`) <!-- R7, R8, R9 -->
- [x] T005 Implement `sites/shll-ai-redirect-stub/build.mjs`: parse `--origin/--out/--floor`, fetch with 20 s timeout (non-2xx → throw), validate map → floor → byte copies, emit exactly the R6 file set into `--out` (clearing it first), print the summary line, exit non-zero on any thrown error <!-- R1, R2, R6 -->
- [x] T006 Write `sites/shll-ai-redirect-stub/stub.test.mjs` per R15, including the in-process `node:http` integration case; run `node --test sites/shll-ai-redirect-stub/*.test.mjs` until green <!-- R15 -->

### Phase 3: Integration & Edge Cases

- [x] T007 Rewrite `.github/workflows/deploy.yml` per R10 (add `schedule`, `SITE_DIR` → stub, Node-only build, remove pnpm/curl/`GITHUB_TOKEN`, keep jobs/permissions/concurrency) <!-- R10 -->
- [x] T008 [P] Rewrite `.github/workflows/ci.yml` per R11 (tests + live build; header comment on expected-red-until-X1) <!-- R11 -->
- [x] T009 [P] `git rm .github/workflows/refresh-help.yml .github/workflows/refresh-readme.yml` <!-- R12 -->
- [x] T010 `git rm -r sites/astro-starlight-terminal1 sites/astro-tailwind-terminal1 sites/_playground content help versions-policy.json`; prune the Astro-only `.gitignore` rules and any `.vscode/` entries that reference the deleted site <!-- R13 -->
- [x] T011 Rewrite root `README.md`, `fab/project/config.yaml` (`source_paths`, `true_impact_exclude`, `project.description`), and `fab/project/context.md` per R14 <!-- R14 -->

### Phase 4: Polish

- [x] T012 Amend `fab/project/constitution.md` to v3.0.0 per R16; replace the three `docs/specs/*-contract.md` bodies with tombstones pointing at `sahil87/hexokit-site` and mark them superseded in `docs/specs/index.md` <!-- R16 -->
- [x] T013 Final verification: `node --test sites/shll-ai-redirect-stub/*.test.mjs` green; `node sites/shll-ai-redirect-stub/build.mjs` against live hexokit.com — record the outcome under `## Notes` (expected: fail-closed on the map 404 while X1 is unmerged, or a full `dist/` if X1 has deployed); `git status` shows only the intended deletions/additions; `ls .github/workflows` = `ci.yml deploy.yml` <!-- R2, R12, R13 -->

## Execution Order

- T001 blocks T003, T004, T005; T002 is independent.
- T006 depends on T003–T005 and must be green before T010 deletes the old trees (nothing in the new site imports the old one, but keep the failing-test signal clean).
- T007–T011 may run in any order after T006; T012–T013 last.

## Acceptance

### Functional Completeness

- [x] A-001 R1: `sites/shll-ai-redirect-stub/` contains `build.mjs`, `lib.mjs`, `stub.test.mjs`, `fixtures/`, `README.md` and no `package.json`/lockfile; `build.mjs` honours `--origin`, `--out`, `--floor`
- [x] A-002 R2: the build fetches the map, both `keep` paths and every file-like key from the origin with a timeout and no retry/fallback, and exits non-zero on any non-2xx/timeout/network error before writing output
- [x] A-003 R3: `validateMap` enforces every listed rule and names the offending field
- [x] A-004 R4: `checkFloor` returns the missing paths and the build fails listing them; the committed floor carries the 75 sitemap paths + the historical set with a dated header
- [x] A-005 R5: `validateByteCopy` enforces the shebang, JSON-schema and non-HTML checks
- [x] A-006 R6: `dist/` contains exactly CNAME, one stub per page-like key, the byte copies, `404.html`, `robots.txt`, `.well-known/security.txt` — and nothing else
- [x] A-007 R7: the stub page has the meta refresh, canonical, visible focusable link, `color-scheme: light dark`, and `location.replace(JSON-string)`; no `noindex`, no external requests
- [x] A-008 R8: `404.html` embeds the fetched `to` + `rules`, ports `canonicalPath`/`applyRules` inline, preserves search/hash, and shows a no-JS link to `to + '/'`
- [x] A-009 R9: `robots.txt` and the generated `security.txt` match the exact specified content
- [x] A-010 R10: `deploy.yml` matches R10 (triggers, `SITE_DIR`, Node-only steps, permissions, concurrency, no pnpm/curl/token)
- [x] A-011 R11: `ci.yml` runs tests then the live build, with no pnpm/Astro/help steps
- [x] A-012 R12: both refresh workflows are gone
- [x] A-013 R13: the listed trees and files are deleted; `.gitignore`/`.vscode` pruned as specified
- [x] A-014 R14: README, `config.yaml`, `context.md` describe the redirect host with no present-tense Astro/pull-pipeline claims
- [x] A-015 R15: `node --test sites/shll-ai-redirect-stub/*.test.mjs` passes offline and covers every listed case
- [x] A-016 R16: constitution is v3.0.0 with the Redirect Host principle and changelog entry; the three specs are tombstones and the index marks them superseded

### Behavioral Correctness

- [x] A-017 R8: `applyRules` returns `/docs/gui/` for `/tools/run-kit/gui`, `/wt/readme/` for `/tools/wt/readme`, `/toolkit/install/` for `/getting-started/install/`, and `/foo.png` for `/foo.png` under the spec §4 rules
- [x] A-018 R6: the `/` key produces `dist/index.html`; a file-like key produces a bare file, never a `<key>/index.html`

### Removal Verification

- [x] A-019 R13: no reference to `astro-starlight-terminal1`, `refresh-help.yml`, `refresh-readme.yml`, `help/`, `content/`, or `versions-policy.json` remains outside `fab/changes/**` and `docs/memory/**` (memory is hydrate's) — **review triage** (the sweep the plan Notes delegated to review): two deliberate exceptions. (1) `sites/shll-ai-redirect-stub/lib.mjs:13` cites `sites/astro-starlight-terminal1/src/lib/shll-ai-redirects.ts` — a provenance pointer to a LIVE path in sahil87/hexokit-site, not a reference to this repo's deleted tree. (2) `fab/backlog.md` holds eight open ideas ([tx5p], [4vkd], [jf9k], [kd5e], [354p], [pgox], [bees], [mr4y]) written against the deleted Astro site — dated idea records, not present-tense claims about the live repo; surfaced under `## Deletion Candidates` for the human to prune.

### Scenario Coverage

- [x] A-020 R2: with the map URL answering 404, the build fails naming the URL and status (the integration test or a recorded live run under `## Notes`)
- [x] A-021 R15: the in-process HTTP integration test builds a full `dist/` from `sample-map.json` and asserts the R6 file set

### Edge Cases & Error Handling

- [x] A-022 R7: a target containing `"`, `<`, or `&` is HTML-escaped in attributes/text and JSON-escaped in the script
- [x] A-023 R5: an HTML body served with status 200 at `/install` fails the build

### Code Quality

- [x] A-024 Pattern consistency: new code follows the repo's ESM/`node --test` conventions (the deleted `scripts/*.test.mjs` style), named constants instead of magic strings, functions under ~50 lines
- [x] A-025 No unnecessary duplication: `canonicalPath`/`applyRules` exist once in `lib.mjs` and are stringified into `404.html` rather than hand-copied a second time
- [x] A-026 Readability over cleverness: `build.mjs` reads as the fetch → validate → emit sequence the intake describes

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`
- Merge gates (operator, at ship — intake area 7): X1 endpoint 200; live sitemap == fixture section 1; local build green. The plan-doc row update is a separate run-kit commit.
- **Apply run (2026-09-12)**: all 13 tasks complete; `node --test sites/shll-ai-redirect-stub/*.test.mjs` green (21/21, hermetic). Final sitemap freeze check (merge gate 2): the live `https://shll.ai/sitemap-0.xml` (75 paths) is **identical to the committed fixture's section 1** — no drift, no hexokit-site fixture PR needed. T013 live build: `node sites/shll-ai-redirect-stub/build.mjs` against live hexokit.com **fails closed as expected while X1 is unmerged** — `build failed: fetch https://hexokit.com/shll-ai-redirects.json → HTTP 404`, exit 1, nothing written to `dist/` (R2; recorded, not "fixed"). The build (and so CI and the merge) go green once X1 deploys. `ls .github/workflows/` = `ci.yml deploy.yml`; `git ls-files` top level = `.envrc .github .gitignore LICENSE README.md docs fab sites` with `sites/` containing only `shll-ai-redirect-stub`. Remaining references to the deleted trees live only in `fab/changes/**` (history, D11), `docs/memory/**` (hydrate's), `fab/backlog.md` (stale ideas for the old site — left for review to triage), and a deliberate provenance citation in `lib.mjs` naming the X1 anchor path in sahil87/hexokit-site.

## Deletion Candidates

- `fab/backlog.md` item [tx5p] (shareable/replayable terminal session) — targets `TerminalPrompt.astro` in the deleted Astro site; unactionable
- `fab/backlog.md` item [4vkd] (scripted `demo`/`tour` command) — same deleted component; unactionable
- `fab/backlog.md` item [jf9k] (`play <tool>` animations) — same deleted component; unactionable
- `fab/backlog.md` item [kd5e] (terminal toys `snake`/`cmatrix`/`cowsay`) — same deleted component; unactionable
- `fab/backlog.md` item [354p] (generate `/llms.txt`/`/llms-full.txt` as static files) — moot: the stub serves both as byte copies of hexokit.com's (R5/R6); any producer-side work belongs to hexokit-site
- `fab/backlog.md` item [pgox] (per-page JSON-LD) — targets the deleted site; hexokit-site owns SEO now
- `fab/backlog.md` item [bees] (content/keyword depth pass) — targets the deleted site; hexokit-site owns content now
- `fab/backlog.md` item [mr4y] (mdast link-rewriter fix for `[slug]/[...path].astro`) — the file is deleted here; if the same regex-rewrite defect exists in hexokit-site's docs-site pipeline, re-file it there
- ( hydrate-stage, not apply: the six `docs/memory/conventions/*` files describing the deleted Astro site — intake area 6 already schedules their removal at hydrate; listed for completeness, no action here )

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Confident | The constitution amendment and the spec tombstones are apply tasks (T012), leaving hydrate to memory only | They are concrete file edits with content fixed in the intake; the repo's prior amendments (2.1.x) landed with the change, and hydrate's contract is `docs/memory/` | S:60 R:90 A:80 D:70 |
| 2 | Confident | `build.mjs` clears `--out` before emitting and takes `--floor` so the integration test can run against a small matching floor | Keeps the real floor strict while letting the hermetic test exercise the full pipeline | S:50 R:95 A:85 D:75 |
| 3 | Confident | The `404.html` inline port is produced by stringifying the `lib.mjs` functions (`Function.prototype.toString`) rather than a second hand-written copy | One definition, one behavior; the anti-duplication principle | S:45 R:90 A:80 D:70 |
| 4 | Certain | T013's live build is expected to fail closed on the map 404 while X1 is unmerged; that outcome is recorded, not "fixed" | Verified 404 at intake; fail-closed is R2 | S:85 R:95 A:95 D:90 |

4 assumptions (1 certain, 3 confident, 0 tentative).
