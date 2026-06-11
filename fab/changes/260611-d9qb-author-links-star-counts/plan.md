# Plan: Author Links & Per-Tool Star Counts

**Change**: 260611-d9qb-author-links-star-counts
**Status**: In Progress
**Intake**: `intake.md`

## Requirements

### Site Chrome: Footer author links

#### R1: Footer gains LinkedIn + noon.design links on the copyright row
The site-wide footer override (`sites/astro-starlight-terminal1/src/components/Footer.astro`) MUST extend the existing `.site-copyright` line with two outbound author links, keeping the established `·` separator style, as one single row: `© Sahil Ahuja 2026 · MIT licensed · LinkedIn · noon.design`. The `LinkedIn` anchor MUST point at exactly `https://www.linkedin.com/in/ahujasahil/` (NOT `linkedin.com/in/sahil87`) and the `noon.design` anchor at `https://noon.design`. Both MUST reuse the existing `.site-copyright a` styles (inherit color, underline, hover/focus-visible via `--c-*` tokens — Constitution V parity and keyboard focus states come for free). The header `social` array in `astro.config.mjs` SHALL NOT change.

- **GIVEN** any page on the live site
- **WHEN** the footer renders
- **THEN** the copyright line reads `© Sahil Ahuja 2026 · MIT licensed · LinkedIn · noon.design` with working anchors to `https://www.linkedin.com/in/ahujasahil/` and `https://noon.design`
- **AND** the header still carries exactly GitHub + Discord icons

### Homepage: `$ whoami` author section

#### R2: Homepage gains a `$ whoami` author section in the terminal motif
The homepage (`sites/astro-starlight-terminal1/src/content/docs/index.mdx`) MUST gain a new hand-authored section in the established terminal motif (`shell-caption` pre + `home-prose` paragraph, the `ld0j` block shape), placed **after the install section and before the Discord line**: a `$ whoami` prompt line followed by an author paragraph naming **Sahil Ahuja** with three links — GitHub (`https://github.com/sahil87`), LinkedIn (`https://www.linkedin.com/in/ahujasahil/`), and noon.design (`https://noon.design`). The copy SHALL follow the intake §2 draft (voice matches the existing `cat ABOUT.md` block). The section MUST be static HTML — no client JS (Constitution I).

- **GIVEN** the built homepage
- **WHEN** scrolled past the install block
- **THEN** a `$ whoami` shell-caption appears followed by a `home-prose` paragraph containing the three author links, before the Discord line
- **AND** the section renders correctly in both light and dark themes via the existing classes

### Terminal Island: whoami easter egg tie-in

#### R3: The `whoami` easter egg appends the real author line
The interactive terminal's `whoami` handler (`sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro`) MUST keep its existing two joke lines ("a developer who plans before they code." / "(everyone else is just typing.)") byte-identical and **append** one new output line carrying the real author identity with the same three links (GitHub, LinkedIn, noon.design), rendered as anchors via the island's existing `html: true` trusted-static-string pattern (the `man`/`ls`/`toolNavLine` precedent).

- **GIVEN** the homepage terminal island is active
- **WHEN** the visitor runs `whoami`
- **THEN** the two existing joke lines print unchanged, followed by an author line with three clickable anchors (GitHub → `https://github.com/sahil87`, LinkedIn → `https://www.linkedin.com/in/ahujasahil/`, noon.design → `https://noon.design`)

### Build-Time Data: GitHub star counts

#### R4: New `github-stars.ts` module — build-time fetch, cached, fail-soft
A new module `sites/astro-starlight-terminal1/src/lib/github-stars.ts` MUST export `getStarCount(tool: string): Promise<number | null>` which fetches `https://api.github.com/repos/sahil87/{tool}` at build time with native `fetch` (no new dependency — Constitution VI) and resolves to `stargazers_count`. It MUST send `Authorization: Bearer ${process.env.GITHUB_TOKEN}` when the env var is present and go unauthenticated otherwise (local dev). It MUST keep a **module-level per-build cache** (one fetch per repo per build, even if a page renders the button twice). **Any failure → `null`**: network error, non-200 (404, 403 rate-limit), missing/malformed `stargazers_count` — logging a single console warning per repo and never throwing. A star-fetch failure MUST NEVER fail the build.

- **GIVEN** a build with network access and a valid repo slug
- **WHEN** `getStarCount('wt')` is awaited
- **THEN** it resolves to the repo's `stargazers_count` number
- **GIVEN** a build with no network, a 404/403 response, or a malformed body
- **WHEN** `getStarCount` is awaited
- **THEN** it resolves to `null`, logs one warning to the build log, and the build proceeds
- **GIVEN** two awaits for the same tool within one build
- **WHEN** both resolve
- **THEN** exactly one HTTP request was issued (the cached promise is shared)

#### R5: GithubButton renders the count when available, exactly-as-today when not
`sites/astro-starlight-terminal1/src/components/GithubButton.astro` MUST await `getStarCount(tool)` in its frontmatter. When it resolves to a number, the button row MUST gain a star-count span — display format `★ {n}` with thousands abbreviation (`1234` → `1.2k`) — styled with the existing `--c-*` tokens (Constitution V) and carrying a screen-reader-friendly label. When `null`, the button MUST render exactly as today: count omitted, no placeholder. The existing loud-fail guard for a missing `tool` prop SHALL stay unchanged. No client-side JS is added (Constitution I).

- **GIVEN** `getStarCount` resolved to `142`
- **WHEN** the button renders
- **THEN** the row reads `View on GitHub   github.com/sahil87/wt   ★ 142   ↗`
- **GIVEN** `getStarCount` resolved to `null`
- **WHEN** the button renders
- **THEN** the markup is the same as before this change — no empty span, no placeholder

#### R6: Deploy workflow passes the automatic token to the build step
`.github/workflows/deploy.yml` MUST pass `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` as env on the **Build with Astro** step (unauthenticated calls from shared Actions-runner IPs rate-limit unpredictably; the automatic token raises the limit with zero secret management). The workflow's declared `permissions` SHALL NOT be widened. No new scheduling is added — freshness rides the existing daily README-refresh always-commit → deploy (counts ≤24h stale).

- **GIVEN** the deploy workflow runs on push to `main`
- **WHEN** the Build with Astro step executes
- **THEN** `GITHUB_TOKEN` is present in that step's env, sourced from the automatic `secrets.GITHUB_TOKEN`
- **AND** the workflow's `permissions` block is unchanged (`contents: read`, `pages: write`, `id-token: write`)

### Non-Goals

- No LinkedIn icon in the header `social` array — explicitly rejected by the user.
- No star counts on the homepage `ls tools/` listing — tool pages only.
- No star count / "view source" affordance for the shll.ai site repo itself.
- No GitHub iframe star buttons (buttons.github.io) — rejected against Constitution I/VI.
- No terminal-themed 404 page — dropped from this change's scope.
- No changes to the other site variant (`astro-tailwind-terminal1`) — live site only.

### Design Decisions

1. **Cache the promise, not the value**: `getStarCount` stores the in-flight `Promise` in the module-level map — *Why*: collapses concurrent calls during parallel page prerendering into one request per repo, not just sequential repeats — *Rejected*: caching the resolved value only (still allows duplicate concurrent fetches).
2. **Fail-soft, the deliberate opposite of VersionTable's build-stop**: a missing count degrades silently — *Why*: the data is third-party and transient (live GitHub API), not a committed repo artifact, so absence cannot mask a committed defect; matches the report-only/fail-soft ethos of the README pull — *Rejected*: build-fail on fetch error (would couple deploys to GitHub API availability).
3. **`formatStarCount` is a separate pure export, unit-tested under `node --test`**: — *Why*: matches the established `src/lib/` + `scripts/*.test.mjs` pattern (terminal-suggest, terminal-eggs, etc.); the fetch path is pinned by stubbing `globalThis.fetch` — *Rejected*: leaving formatting inline in the component (untestable).

## Tasks

### Phase 1: Setup

- [x] T001 Add `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` env to the "Build with Astro" step in `.github/workflows/deploy.yml`, with a comment explaining the rate-limit rationale and fail-soft contract <!-- R6 -->

### Phase 2: Core Implementation

- [x] T002 Create `sites/astro-starlight-terminal1/src/lib/github-stars.ts`: `getStarCount(tool)` (native fetch, Bearer auth when `GITHUB_TOKEN` present, module-level promise cache, any-failure→`null` + one warning, never throws) and pure `formatStarCount(count)` (`1234` → `1.2k`), following the existing `src/lib/` header-comment style <!-- R4 -->
- [x] T003 [P] Create `sites/astro-starlight-terminal1/scripts/github-stars.test.mjs` (`node --test` pattern): pins `formatStarCount` tiers and `getStarCount`'s success / non-200 / throw / malformed-body / cache-dedup behavior via a stubbed `globalThis.fetch` <!-- R4 -->
- [x] T004 Update `sites/astro-starlight-terminal1/src/components/GithubButton.astro`: await `getStarCount(tool)`, render the `★ {formatted}` span (with sr-only label, `--c-*` token colors, scoped style) only when the count is a number; `null` renders today's markup unchanged <!-- R5 -->
- [x] T005 [P] Update `sites/astro-starlight-terminal1/src/components/Footer.astro`: append `· LinkedIn · noon.design` anchors to the `.site-copyright` line (exact URLs `https://www.linkedin.com/in/ahujasahil/` and `https://noon.design`), reusing the existing anchor styles <!-- R1 -->
- [x] T006 [P] Add the `$ whoami` author section to `sites/astro-starlight-terminal1/src/content/docs/index.mdx` after the install section and before the Discord line, per the intake §2 draft (shell-caption + home-prose, three author links), with a `ld0j`-style source comment <!-- R2 -->
- [x] T007 [P] Update the `whoami` handler in `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro`: keep the two joke lines byte-identical, append one `html: true` author line with the three anchors <!-- R3 -->

### Phase 3: Integration & Edge Cases

- [x] T008 Run `node --test scripts/github-stars.test.mjs` (plus the existing `scripts/*.test.mjs` suite) inside `sites/astro-starlight-terminal1/` and fix any failures <!-- R4 -->
- [x] T009 Run `pnpm install --frozen-lockfile && pnpm build` inside `sites/astro-starlight-terminal1/`; verify the build succeeds even when the star fetch fails (no token / no network — counts omitted, warnings logged), and inspect `dist/` for the footer links, the homepage whoami section, and the conditional star span <!-- R4, R5, R1, R2 -->

## Acceptance

### Functional Completeness

- [x] A-001 R1: The built footer on every page carries the single copyright row `© Sahil Ahuja 2026 · MIT licensed · LinkedIn · noon.design` with anchors to exactly `https://www.linkedin.com/in/ahujasahil/` and `https://noon.design`, and `astro.config.mjs`'s `social` array is untouched (GitHub + Discord only)
- [x] A-002 R2: The built homepage contains the `$ whoami` shell-caption + `home-prose` author paragraph with the three author links, positioned after the install block and before the Discord line
- [x] A-003 R3: The `whoami` terminal handler returns its two original joke lines byte-identical plus one appended `html: true` line whose three anchors point at the GitHub/LinkedIn/noon.design URLs
- [x] A-004 R4: `getStarCount` resolves `stargazers_count` on a 200 response, and resolves `null` (never throws, one warning) on network error, non-200, or missing/malformed `stargazers_count`
- [x] A-005 R4: The module-level cache issues at most one HTTP request per repo per build, including for concurrent callers
- [x] A-006 R5: With a numeric count the button row renders `★ {n}` (thousands-abbreviated) styled by `--c-*` tokens; with `null` the rendered markup is identical to the pre-change button (no placeholder)
- [x] A-007 R6: The deploy workflow's "Build with Astro" step has `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` in its env and the top-level `permissions` block is unchanged

### Behavioral Correctness

- [x] A-008 R4: A full `pnpm build` with no `GITHUB_TOKEN` and/or no network completes successfully — star-fetch failure never fails the build (counts simply omitted)
- [x] A-009 R1: The LinkedIn URL is `https://www.linkedin.com/in/ahujasahil/` (not `linkedin.com/in/sahil87`) in **all three** new surfaces: footer, homepage whoami section, and terminal egg

### Scenario Coverage

- [x] A-010 R4: `scripts/github-stars.test.mjs` passes under `node --test`, pinning the success, failure-classification, and cache-dedup scenarios via a stubbed `globalThis.fetch`
- [x] A-011 R5: No client-side JS is added by the star count or author sections (Constitution I) — the count is rendered statically into the HTML at build time

### Edge Cases & Error Handling

- [x] A-012 R4: A 403 rate-limit or 404 response logs exactly one warning naming the tool and omits the count — verified by test and by build-log inspection

### Code Quality

- [x] A-013 Pattern consistency: new code follows the surrounding heavily-commented `.astro`/`src/lib/` style (header comments with change ID, named constants — no magic strings, `--c-*` tokens, `not-content` class usage)
- [x] A-014 No unnecessary duplication: `formatStarCount` and `getStarCount` live in one module consumed by the component; the footer/whoami/egg reuse existing styles and the `html: true` line pattern rather than inventing new mechanisms
- [x] A-015 No god functions: each new function stays small and focused (fetch, classify, format are separable concerns)

### Security

- [x] A-016 R4/R6: The token is read only from `process.env.GITHUB_TOKEN`, sent only to `api.github.com` as a Bearer header, never logged and never rendered into output; workflow permissions are not widened

## Notes

- Check items as you review: `- [x]`
- All acceptance items must pass before `/fab-continue` (hydrate)
- If an item is not applicable, mark checked and prefix with **N/A**: `- [x] A-NNN **N/A**: {reason}`

## Deletion Candidates

None — this change adds new functionality without making existing code redundant

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Confident | Star span sits between the repo slug and the `↗` arrow inside the existing button row, with an aria-hidden `★` glyph plus a Starlight `.sr-only` "GitHub stars" label | Intake's mock shows `slug ★ 142 ↗` ordering; sr-only label satisfies the constitution's accessibility bar for a glyph-led value; trivially adjustable | S:70 R:90 A:80 D:80 |
| 2 | Confident | `formatStarCount` tiers: `<1000` exact, `1.0k–9.9k` one decimal (trailing `.0` dropped), `≥10k` integer k; no millions tier | Intake fixes only `1234 → 1.2k`; these repos sit far below 1M so a `m` tier is dead code; matches common GitHub-style abbreviation | S:55 R:90 A:80 D:75 |
| 3 | Confident | Tests stub `globalThis.fetch` (per-test save/restore) rather than adding fetch injection params to `getStarCount` | Keeps the public API exactly as the intake specifies; the `node --test` stub pattern needs no new dependency (Constitution VI) | S:50 R:90 A:85 D:75 |
| 4 | Certain | `GITHUB_TOKEN` env is scoped to the Build step only, not job-wide | Least exposure for a credential with a single consumer; intake's YAML snippet shows step-level `env:` | S:80 R:90 A:90 D:90 |
| 5 | Confident | Terminal egg author line styled `shell-out shell-dim` with lowercase labels (`github · linkedin · noon.design`) in the island's voice | Matches the egg's lowercase voice and the `toolNavLine` dim-anchor precedent; cosmetic and trivially editable | S:50 R:95 A:80 D:75 |
| 6 | Confident | Fetch sends `Accept: application/vnd.github+json` and no API-version pin | GitHub's documented default media type; `stargazers_count` is stable across versions; omitting the pin avoids a magic constant that could stale | S:45 R:90 A:80 D:75 |

6 assumptions (1 certain, 5 confident, 0 tentative).
