# Intake: shll.ai redirect stub (HexoKit rebrand row X2)

**Change**: 260912-sn0a-shll-ai-redirect-stub
**Created**: 2026-09-12

## Origin

One-shot `/fab-new` invocation, no prior discussion in this session. The design authority is the cross-repo HexoKit rebrand plan (run-kit repo, `fab/plans/sahil/26-09-10-hexokit-rebrand.md`) — its Decision log (D4, D5, D7, D10, D11, D13 read in full), § Site shape, the Phase 2 table (rows X1/X2/X4), the cutover order, and the Pickup protocol — plus the X1 deliverable this change consumes: hexokit-site PR [#9](https://github.com/sahil87/hexokit-site/pull/9) (fab change `1u4q`, at review-pr, **not yet merged**), whose spec `docs/specs/shll-ai-redirect-map-contract.md`, memory `docs/memory/conventions/redirect-map.md`, lib `src/lib/shll-ai-redirects.ts` (`canonicalPath` / `applyRules`), and fixture `scripts/fixtures/shll-ai-paths.txt` were read from the PR branch. This repo's own state was inspected directly (`deploy.yml`, `ci.yml`, both refresh workflows, `astro.config.mjs`, the `versions.json.ts` / `security.txt.ts` endpoints, `public/`, the root inventory) and live facts were probed with `curl` on 2026-09-12 (see § Why → "Verified").

> shll-ai-redirect-stub — build-time endpoint at shll.ai (or the mapping data) consumed by hexokit.com's shll-ai-redirects.json per the hexokit-rebrand plan's X2 row. This is X2 in the plan, depends on X1 (hexokit-site cutover prep, PR #9, done at review-pr) which supplies the redirect map endpoint at https://hexokit.com/shll-ai-redirects.json -- read that context and the hexokit-rebrand plan for X2's exact scope (redirect stub/catch-all at shll.ai consuming the map, plus keep rules for /install and /versions.json) before writing the intake.

**The X2 row, verbatim** (plan § Phase 2): *"Replace the repo's contents in place (D13): CNAME `shll.ai`, redirect pages → hexokit.com, **byte copies** of `/install` and `/versions.json`. They MUST be real files, not redirects: GitHub Pages redirects are meta-refresh HTML, and `curl -fsSL … | sh` would feed that HTML to `sh` (curl's `-L` only helps against real 301s, which Pages cannot emit). Refreshed by the same CI copy step. Remove the cron workflows. Never lapses (D4)."* Depends on: **X1 live**. Size S.

**Decisions inherited from the plan (Confirmed — not re-opened)**: D4 (`shll` stays; `shll.ai/install` and `shll.ai/versions.json` are baked into shipped binaries and must never lapse), D13 (the `shll.ai` repo is never renamed; its *contents* are replaced in place with the stub; no new repo), D11 (historical text — `fab/changes`, `docs/memory` narrative, git history — is not rewritten). D5/D7/D10 are the plan's proposals and are followed as written (one website; the URL scheme the map encodes; the product-first install default).

## Why

**The problem.** hexokit.com is the one website for the toolkit (D5); shll.ai has been the toolkit's only public URL for months and is linked from seven READMEs, the sahil87 profile, search results, and every shipped `shll` binary's two network endpoints. Phase 2 makes shll.ai a **permanent redirect host**: every URL it ever served must land on its final hexokit.com page, and the two binary-facing endpoints must keep serving real bytes forever. X1 produced the machine-readable answer to "where does each old URL go" — `https://hexokit.com/shll-ai-redirects.json` (schema 1; `redirects` enumeration with canonical keys and chain-collapsed final values; `keep: ["/install", "/versions.json"]`; ordered regex `rules` proven equivalent to the enumeration; a 149-path fixture floor checked in hexokit-site CI). X2 is the consumer: the stub that turns that map into a deployable GitHub Pages site under the `shll.ai` CNAME.

**What happens if we don't.** Two live sites keep advertising two brands (the exact mistake the rebrand corrects); the announce cannot happen (plan order: X1 → X2 → X4 → announce); and the daily crons here keep pulling READMEs/help and redeploying a site nobody should be pointed at. Doing it *badly* is worse than not doing it: a hand-written stub misses URLs (404s on the toolkit's only historical domain), or serves `/install` as a meta-refresh page and `curl -fsSL shll.ai/install | sh` feeds HTML to `sh` on every machine still running an old one-liner.

**Why this shape.**

- *A zero-dependency Node build script, not the Astro site.* The output is ~200 identical three-line HTML stubs, one `404.html`, a CNAME, and a handful of byte copies. Astro (and its lockfile, `sharp`, Starlight) exists to render content this repo no longer has; keeping it to emit stubs violates Constitution VI in spirit and keeps a 2 MB tree alive for nothing. Node 22 (already the pinned toolchain) has `fetch`, `fs`, and `node --test` built in — the generator needs nothing else.
- *Fetch the map at build time, fail closed.* Constitution I forbids runtime fetches, not build-time ones — `deploy.yml` already `curl -f`s the install script at deploy time with the explicit rationale "fail the deploy rather than ship a site whose documented one-liner 404s". The stub does the same for five hexokit.com files: any fetch or validation failure **stops the build**, so the last-good deployment stays live (never lapses, D4). A committed copy of the map was rejected: it is a second table that goes stale the day hexokit-site adds a docs page.
- *A daily deploy cron replaces the two refresh crons.* The byte copies of `/versions.json` and `/install` are only as fresh as the last build, and with the refresh crons gone nothing else commits to `main` daily. hexokit.com's own `versions.json` refreshes via its help cron at 07:13 UTC + deploy; scheduling shll.ai's rebuild two hours later keeps the fallback manifest ≤ 1 day behind the primary (shll ≥ v0.1.31 already prefers hexokit.com and falls back to shll.ai — change `ttoa`). A cross-repo `repository_dispatch` from hexokit-site was rejected: it needs a PAT secret in two repos for a freshness gain nobody needs.
- *Delete the old trees in the same change.* D13 says "contents replaced in place". Keeping `sites/astro-starlight-terminal1/` beside the stub leaves 198 files of dead code whose crons, CI steps and memory all describe a site that no longer deploys — the reader cannot tell what is live. Git history and the `sahil87/hexokit-site` mirror (a `--mirror` clone, S1) hold every byte, so the deletion is recoverable.

**Verified (2026-09-12, `curl`/`gh`)**: `https://hexokit.com/shll-ai-redirects.json` → **404** (X1 not merged — X2's deploy must wait; see § Impact → Ordering); `hexokit.com/install` → 200 `application/octet-stream`, script starts `#!/bin/sh`; `hexokit.com/versions.json` → 200 (schema 1, carries the `run-kit` row); `hexokit.com/llms.txt`, `/llms-full.txt`, `/.well-known/security.txt` → 200; `shll.ai/sitemap-0.xml` → 75 `<loc>` entries (identical count to X1's fixture section 1); `shll.ai/wt` → 301 → `/wt/` (Pages adds the slash when `wt/index.html` exists, so one stub per canonical key covers both spellings); `www.shll.ai` → 301 → `shll.ai` (DNS untouched by X2); `shll.ai/nonexistent` → 404 (Starlight's `404.mdx`). The current branch `x2-shll-ai-redirect-stub` is a local-only worktree placeholder belonging to no change.

## What Changes

Seven areas. Everything not listed is out of scope (§ Non-goals).

### 1. The stub generator — `sites/shll-ai-redirect-stub/`

A new site directory, the only one left under `sites/` after this change, selected by `deploy.yml`'s `SITE_DIR` (Constitution III — the one-line swap). **No `package.json`, no lockfile, no `node_modules`** — plain ESM run with the pinned Node 22:

```
sites/shll-ai-redirect-stub/
├── README.md                 # what the stub is, how to build/verify locally, the contract pointer
├── build.mjs                 # CLI: fetch → validate → emit dist/  (exit non-zero on any failure)
├── lib.mjs                   # pure functions, unit-tested: canonicalPath, applyRules, renderStub,
│                             #   render404, validateMap, checkFloor, validateByteCopy
├── stub.test.mjs             # node --test, hermetic (synthetic sample map, no network)
└── fixtures/
    ├── shll-ai-paths.txt     # the FINAL shll.ai sitemap (75 paths) + the historical /tools/<slug>/* set —
    │                         #   the completeness floor the build asserts against the fetched map
    └── sample-map.json       # small SYNTHETIC map (schema 1) for the unit tests — deliberately not a
                              #   copy of the live map, so it cannot become a stale second table
```

**`build.mjs` procedure** (run from the site dir; `dist/` is the output, gitignored as today):

1. **Fetch** from `HEXOKIT_ORIGIN = 'https://hexokit.com'` (a named constant; overridable by `--origin` for local experiments only): `/shll-ai-redirects.json`, then every `keep` path, then every **file-like** `redirects` key (last segment contains a `.` — today `/llms.txt`, `/llms-full.txt`), then `/.well-known/security.txt` is **not** fetched (see area 3). Each fetch: `fetch()` with a 20 s `AbortSignal.timeout`, non-2xx → throw. No retries, no fallback origin.
2. **Validate the map** (`validateMap`) — every failure is an `Error` naming the field, build-stop: `schema === 1`; `from === 'https://shll.ai'`; `to` is an `https:` origin with no path; `keep` deep-equals `['/install', '/versions.json']` (the D4 pair — a map that drops one would silently turn a binary endpoint into a redirect); every `redirects` key equals its own `canonicalPath`; every value is an absolute URL starting with `to`; no key is in `keep`; `rules` is a non-empty array of `[string, string]` pairs whose regexes compile and whose last entry is the identity catch-all `['^(/.*)$', '$1']`; and the **equivalence invariant** holds locally — `to + applyRules(rules, k) === redirects[k]` for every key (X1 proves it in its CI; re-checking here costs microseconds and catches a truncated download).
3. **Check the floor** (`checkFloor`): every non-comment line of `fixtures/shll-ai-paths.txt`, canonicalized, MUST be a `redirects` key, a `keep` entry, or a file-like key. Otherwise build-stop listing every missing path. This is X2's own answer to "did hexokit.com's map regress"; the fixture is a floor, not a ceiling (a page hexokit.com adds later simply gains a stub).
4. **Validate the byte copies** (`validateByteCopy`): `/install` MUST begin with `#!/bin/sh` (the whole point — an HTML page at that path is the `curl | sh` hazard the X2 row names); `/versions.json` MUST parse as JSON with `schema === 1` and a non-empty `tools` object; `/llms.txt` and `/llms-full.txt` MUST be non-empty and MUST NOT start with `<` (an HTML 404 body). Build-stop otherwise.
5. **Emit `dist/`**:
   - `CNAME` → `shll.ai\n`.
   - For every **page-like** key `k` (ends in `/`): `dist{k}index.html` = `renderStub(value)` (area 2). `/` → `dist/index.html`.
   - For every **file-like** key and every `keep` path: the fetched bytes, written verbatim at that path (`dist/install`, `dist/versions.json`, `dist/llms.txt`, `dist/llms-full.txt`).
   - `404.html` = `render404(to, rules)` (area 2).
   - `robots.txt`, `.well-known/security.txt` (area 3).
6. **Report**: print counts (`N stubs, M byte copies, rules: R`) and exit 0. Print nothing to `dist/` that is not listed above — no sitemap, no favicon, no OG image.

`lib.mjs` ports `canonicalPath` and `applyRules` **exactly** from the X1 anchor (`shll-ai-redirects.ts`, the spec's machine authority):

```js
export function canonicalPath(path) {
  let p = path.replace(/\/{2,}/g, '/');
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/+$/, '');
  if (p === '') return '/';
  const last = p.split('/').pop() ?? '';
  return last.includes('.') ? p : `${p}/`;
}
export function applyRules(rules, pathname) {
  const request = canonicalPath(pathname);
  for (const [source, replacement] of rules) {
    const re = new RegExp(source);
    if (re.test(request)) return canonicalPath(request.replace(re, replacement));
  }
  return request;
}
```

### 2. The two page shapes

**Per-key stub** (`renderStub(target)`) — the spec §5 consumer shape plus the minimum a human landing on it needs. The target is HTML-escaped once and used in all four places; the page is complete and valid HTML with no external requests:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0; url=https://hexokit.com/wt/readme/">
<link rel="canonical" href="https://hexokit.com/wt/readme/">
<title>Moved to hexokit.com</title>
<style>:root{color-scheme:light dark}body{font:16px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;margin:3rem auto;max-width:36rem;padding:0 1rem}a:focus-visible{outline:2px solid currentColor;outline-offset:2px}</style>
</head>
<body>
<p>shll.ai has moved. This page is now at <a href="https://hexokit.com/wt/readme/">https://hexokit.com/wt/readme/</a>.</p>
<script>location.replace("https://hexokit.com/wt/readme/")</script>
</body>
</html>
```

No `noindex` (it would fight the canonical; a `0`-second meta refresh with a canonical is what crawlers treat as a permanent move). `color-scheme: light dark` gives Constitution V parity with zero CSS variables; the visible link has a focus state (Accessibility constraint). The `<script>` uses a JSON-stringified URL so a quote in a path can never break out of the string.

**`404.html`** (`render404(to, rules)`) — the catch-all for un-enumerated paths. GitHub Pages serves it for any path with no file, with HTTP status 404; the browser still runs it. It embeds `to` and the ordered `rules` **from the fetched map** (never a hand-typed copy) as a JSON literal, ports the same `canonicalPath`/`applyRules` inline (the page must be self-contained — no module import on a 404 page), computes `to + applyRules(rules, location.pathname) + location.search + location.hash`, sets the visible link's `href` and text to it, then `location.replace`s. With JavaScript disabled the page shows "shll.ai has moved to hexokit.com" with a plain link to `to + '/'`. The identity catch-all guarantees a rule always matches, so a request for `/anything.png` lands on `https://hexokit.com/anything.png` and a request for `/tools/wt/readme` lands on `https://hexokit.com/wt/readme/` — the spec §4 table's examples become unit-test cases.

### 3. The stub's own chrome (X2-authored; spec §6 "out of scope" of the map)

- **`robots.txt`**: `User-agent: *\nAllow: /\n` — no `Sitemap:` line, and **no sitemap is emitted**. A sitemap of redirect stubs invites crawlers to index the stubs; letting them re-crawl the old URLs and follow the meta refresh + canonical is the standard way a domain move is discovered.
- **`/.well-known/security.txt`**: generated at build, not copied — RFC 9116 requires `Canonical` to be the file's own URL, so hexokit.com's copy (`Canonical: https://hexokit.com/...`) would be wrong here, and the 404 catch-all cannot serve `text/plain`. Same five lines as today's endpoint, `Canonical: https://shll.ai/.well-known/security.txt`, `Expires` = build time + 6 months (re-stamped by every daily build, exactly the freshness argument `security.txt.ts` makes today; contact/policy URLs stay the GitHub advisory flow). shll.ai stays registered forever (D5) and should keep a valid reporting pointer.
- **Not emitted**: favicons, `og-image.png`, `/screenshots/*`, `sitemap*.xml`. A browser's `/favicon.ico` probe hits `404.html`, which is harmless.

### 4. Workflows — `deploy.yml` rewritten, `ci.yml` rewritten, both refresh crons deleted

**`.github/workflows/deploy.yml`** keeps its name (`Deploy`), its two-job `build` → `deploy` shape, the `pages` concurrency group with `cancel-in-progress: false`, and its minimal permissions (`contents: read`, `pages: write`, `id-token: write`). Changes:

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
  schedule:
    - cron: '13 9 * * *'   # daily, 2h after hexokit-site's 07:13 UTC help refresh + deploy, so the
                           # byte copies of /versions.json and /install pick up that day's values
env:
  SITE_DIR: sites/shll-ai-redirect-stub
```

The build job becomes: checkout → `actions/setup-node@v4` (node 22, **no pnpm, no cache**) → `node build.mjs` in `SITE_DIR` → `actions/upload-pages-artifact@v3` with `${{ env.SITE_DIR }}/dist`. The "Fetch install script" `curl` step is **removed** — the generator fetches `/install` from hexokit.com itself (D13: byte copy of hexokit.com's composed, product-first script, not the raw shll script; see § Impact → behavior change). `GITHUB_TOKEN` is no longer passed to the build (no GitHub API calls remain).

**`.github/workflows/ci.yml`** keeps its name, triggers (`pull_request` + `push` to `main`) and concurrency rule; its steps become: setup Node 22 → `node --test sites/shll-ai-redirect-stub/*.test.mjs` (hermetic) → `node build.mjs` in the site dir (the real build against live hexokit.com — the same thing the deploy does, so a PR that would fail the deploy fails here). The `validate-help.mjs` and pnpm steps are removed with the site they validated. **Expected**: this CI is red on the X2 PR until X1 is merged and deployed (the map 404s → build-stop) — that is the correct "do not merge yet" signal, not a bug to work around.

**Deleted**: `.github/workflows/refresh-help.yml`, `.github/workflows/refresh-readme.yml` (the X2 row: "Remove the cron workflows"; spec §6: X2 "removes shll.ai's crons so the served set freezes"). Both must also be **disabled in the GitHub UI/`gh workflow disable`** before merge? No — deleting the file from `main` removes the schedule; no operator step needed.

### 5. Repo contents replaced in place (D13)

**Deleted** (git history + the `sahil87/hexokit-site` mirror retain everything):

- `sites/astro-starlight-terminal1/` (the current live site, 2.1 MB), `sites/astro-tailwind-terminal1/` (the earlier variant), `sites/_playground/` (scratch) — three directories, ~198 tracked files.
- `content/` (52 pulled README/docs-site slices), `help/` (7 pulled help envelopes), `versions-policy.json` — the pull-side data the deleted crons maintained.
- `.vscode/` entries and `.gitignore` lines that only referenced the Astro site (`.astro/`, `sites/*/public/install`, the `.test-tmp`/`content/__*test*__` scratch rules) — pruned, not wholesale removed; `dist/` and `node_modules/` stay ignored.

**Rewritten**:

- Root `README.md`: what shll.ai is now (a permanent redirect host for hexokit.com), the two endpoints it keeps serving and why (D4), how the stub is built (`node sites/shll-ai-redirect-stub/build.mjs`), where the map comes from (the contract in hexokit-site), and the daily rebuild. Keep the MIT badge/LICENSE.
- `fab/project/config.yaml`: `project.description` → the redirect-host framing; `source_paths` → `[sites/shll-ai-redirect-stub/]`; `true_impact_exclude` → `[fab/, docs/]` (drop `sites/_playground/`).
- `fab/project/context.md`: rewritten for the stub (single site, no experiments, no pull pipeline; the repo is now downstream of hexokit-site).

**Kept**: `fab/` (pipeline state and archives — D11), `docs/` (rewritten at hydrate, area 6), `.agents/`, `.claude/`, `.opencode/`, `.envrc`, `LICENSE`.

### 6. Constitution, memory, and specs (hydrate-stage work, scoped here so plan generation sees it)

- **Constitution → v3.0.0 (MAJOR)**: the six principles were written for a multi-site design exploration that no longer exists. Proposed text — keep **I Static-First** (now: "the stub is generated at build time from hexokit.com endpoints; no runtime fetch, no server"), **IV Deploy via CI** (add the daily schedule as a permitted trigger), **V Dark Mode Parity** (satisfied by `color-scheme`), **VI Minimal Dependencies** (tightened to "zero runtime and zero npm dependencies — Node built-ins only"); **replace II Multi-Site Isolation and III One Live Site** with a single **II Redirect Host** principle (every URL shll.ai ever served MUST land on its final hexokit.com page via the X1 map; `/install` and `/versions.json` MUST be byte copies, never redirects; the build MUST fail closed so the site never lapses — D4/D13); **remove** Tool-Page Depth and External Links (no pages, no links to keep) and keep Accessibility (the stub link) and Test Integrity. Changelog entry cites this change and the plan.
- **Memory**: `build-deploy/deployment` (modify — rewrite: cron-driven daily deploy, Node-only toolchain, fetch-fail-closed, no inbound pulls, no analytics beacon); `build-deploy/redirect-stub` (new — generator procedure, the two page shapes, chrome, floor check, byte-copy validation, the X1 contract pointer); **remove** the six `conventions/` files (`docs-site-tree`, `help-collection`, `readme-extraction`, `seo-social-meta`, `tool-page-rubric`, `versions-manifest`) — every one describes the deleted Astro site; memory is present-truth, and the producer-side truth now lives in hexokit-site's memory. Regenerate indexes with `fab docs-index`.
- **Specs**: `help-dump-contract.md`, `readme-extraction-contract.md`, `versions-manifest-contract.md` are cross-repo contracts whose *producer* is now hexokit-site (they were mirrored there at S1 and are maintained there). Replace each body with a short **tombstone** ("Moved — maintained in `sahil87/hexokit-site` at the same path; this repo no longer produces or consumes it") and mark them superseded in `docs/specs/index.md`, rather than deleting (external links to these files exist in the shll repo's standards; a tombstone keeps them non-404 in the GitHub UI). <!-- assumed: tombstone rather than delete — keeps inbound GitHub links to the spec paths resolvable; reversible either way -->

### 7. Cutover procedure (operator steps, recorded in the plan under `## Notes` — not code)

Ordered; the first three are **merge gates**:

1. **X1 live**: `curl -fsS https://hexokit.com/shll-ai-redirects.json | jq .schema` → `1`. Until then the X2 PR stays open (its CI is red by design).
2. **Final sitemap freeze** (spec §6): `curl -fsSL https://shll.ai/sitemap-0.xml | grep -o '<loc>[^<]*</loc>' | sed 's#<loc>https://shll.ai##;s#</loc>##' | sort` — compare with hexokit-site's `scripts/fixtures/shll-ai-paths.txt` section 1. If it drifted (a docs page landed after 2026-09-12), land a one-line fixture PR in hexokit-site first and re-run its checker. Copy the same final list into this repo's `fixtures/shll-ai-paths.txt` (with the historical `/tools/<slug>/*` section, generated the way X1 did).
3. **Local dry run**: `node build.mjs` succeeds against live hexokit.com; spot-check `dist/wt/readme/index.html`, `dist/install` (`head -1` = `#!/bin/sh`), `dist/versions.json`, `dist/404.html`.
4. **Merge** → `deploy.yml` runs on push → verify: `curl -sI https://shll.ai/wt/readme/` shows the stub; `curl -fsSL https://shll.ai/install | head -1` = `#!/bin/sh`; `curl -fsS https://shll.ai/versions.json | jq .schema` = 1; `curl -s https://shll.ai/tools/run-kit/` follows to `https://hexokit.com/docs/`; `curl -s -o /dev/null -w '%{http_code}' https://shll.ai/never-existed/` = 404 with the catch-all body.
5. **Plan doc** (Pickup protocol #4): fill X2's PR/Status cells and the Status line in run-kit's `fab/plans/sahil/26-09-10-hexokit-rebrand.md` (separate commit in the run-kit repo at ship, the X1 precedent). X4 (shll standards sweep) is unblocked.

### Non-goals

- **No DNS or GitHub Pages settings change**: `shll.ai` apex/`www` records, the Pages custom-domain binding, HTTPS enforcement stay as they are; `www.shll.ai` keeps 301-ing to the apex.
- **No repo rename, no new repo** (D13). **No edits in hexokit-site** beyond the possible fixture-freeze PR in step 2 (that is X1's checker, X1's file). **No shll standards edits** (X4). **No roster/formula/binary changes** (R1/R2).
- **No real HTTP 301s** — GitHub Pages cannot emit them; meta refresh + canonical + `location.replace` is the ceiling, as the plan states.
- **No sitemap, favicon, OG image, or analytics beacon** on the stub.
- **No historical rewrite** of `fab/changes/**` or archived memory prose (D11).

## Affected Memory

- `build-deploy/deployment`: (modify) rewrite for the stub — daily cron + push + dispatch triggers, Node-22-only toolchain (no pnpm), `node build.mjs` fetch-fail-closed build, no inbound scheduled pulls, no `GITHUB_TOKEN` in the build, no analytics; the never-lapses posture
- `build-deploy/redirect-stub`: (new) the generator — sources fetched from hexokit.com, map validation + local equivalence check, the fixture-floor check, byte-copy validation (`#!/bin/sh` / schema 1 / non-HTML), the per-key stub and `404.html` shapes, the X2-authored chrome (`robots.txt`, generated `security.txt`), the X1 contract pointer, the cutover verification commands
- `conventions/docs-site-tree`: (remove) describes the deleted Astro docs-site pull side
- `conventions/help-collection`: (remove) describes the deleted help pull side and its consumers
- `conventions/readme-extraction`: (remove) describes the deleted README pull side
- `conventions/seo-social-meta`: (remove) describes the deleted site's SEO/JSON-LD/llms layer
- `conventions/tool-page-rubric`: (remove) describes the deleted tool pages
- `conventions/versions-manifest`: (remove) the manifest is now produced by hexokit-site; shll.ai serves a byte copy (covered in `redirect-stub`)

Also touched at hydrate (not memory files): `fab/project/constitution.md` → v3.0.0 (area 6); `docs/specs/{help-dump,readme-extraction,versions-manifest}-contract.md` → tombstones + `docs/specs/index.md` superseded rows.

## Impact

- **Code**: new `sites/shll-ai-redirect-stub/` (~5 files, a few hundred lines incl. tests); `deploy.yml` + `ci.yml` rewritten; two workflows deleted; ~260 tracked files deleted (`sites/**`, `content/`, `help/`, `versions-policy.json`); root `README.md`, `fab/project/config.yaml`, `fab/project/context.md`, `.gitignore` edited.
- **Tests**: `node --test sites/shll-ai-redirect-stub/*.test.mjs` — `canonicalPath`/`applyRules` pinned against the spec §4 table (`/tools/wt/readme` → `/wt/readme/`, `/tools/run-kit/gui` → `/docs/gui/`, `/getting-started/install/` → `/toolkit/install/`, `/foo.png` identity); `validateMap` rejects a wrong `schema`, a missing `keep` entry, a non-canonical key, a value off-origin, a broken invariant; `checkFloor` lists every missing path; `validateByteCopy` rejects an HTML `/install`; `renderStub` output contains exactly the meta refresh, canonical, link and script with the escaped target; `render404` embeds the rules and resolves the sample paths in a `node:vm` run of its inline script. All hermetic (sample map fixture, no network). The real build runs in CI and deploy against live hexokit.com.
- **Ordering**: **blocked on X1 live** (hexokit-site PR #9 merged + deployed). Implementation and tests proceed now; the build (and so CI and the merge) succeed only once the endpoint answers. The fail-closed fetch makes an early merge harmless (the deploy fails; the current site stays live) but the intent is to merge only after gate 1.
- **Behavior change for users (accepted, per plan D10/D13)**: `curl -fsSL shll.ai/install | sh` now runs hexokit.com's composed script whose *default* is product-first (`shll` + the dashboard, roster name `run-kit` until R1) rather than the whole toolkit; `shll.ai/install | sh -s -- <tools>` keeps installing the named subset. `shll.ai/versions.json` becomes a ≤ 24 h-stale byte copy of hexokit.com's manifest (shll ≥ v0.1.31 prefers hexokit.com first).
- **SEO**: every old URL answers 200 with `refresh 0` + `rel=canonical` to its final page; un-enumerated paths answer 404 + a JS redirect. No sitemap on shll.ai.
- **Downstream rows**: unblocks X4 (standards sweep) and the announce; R0/C4/R1/R2 wait for "X2 live" and are unaffected in content.
- **Risk**: hexokit.com's map regresses (drops a key) → the floor check fails the daily build → last-good stub stays live and the red run is the alert (mirrors the refresh-help staleness-gate posture). hexokit.com is down at 09:13 UTC → same: build-stop, nothing lapses.

## Open Questions

- None blocking. Two judgment calls are recorded as assumptions rather than asked: the `security.txt` regeneration (area 3) and the spec tombstone-vs-delete choice (area 6).

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Scope is the X2 row exactly: replace the repo's contents with the stub (CNAME, one stub per map key, `404.html` catch-all, byte copies of `/install` + `/versions.json`), delete the cron workflows; no DNS/Pages-settings change, no repo rename, no X4/R1/R2 work | The X2 row, D4, D13 and the user's scope text say exactly this | S:90 R:80 A:95 D:95 |
| 2 | Certain | The generator is a zero-dependency Node 22 script under `sites/shll-ai-redirect-stub/` (`build.mjs` + unit-tested `lib.mjs`), selected by `SITE_DIR`; the Astro site is not reused to emit stubs | ~200 identical stubs need no framework; Constitution VI + the existing Node 22 toolchain; Constitution III's one-line `SITE_DIR` swap is the repo's own mechanism for "what is live" | S:75 R:80 A:90 D:85 |
| 3 | Certain | The map, the two `keep` files and the file-like keys are fetched from hexokit.com at build time and any fetch/validation failure is a build-stop (last-good site stays live); no committed copy of the map, no fallback origin | Constitution I permits build-time data; `deploy.yml` already `curl -f`s `/install` with the "fail the deploy rather than ship a 404ing one-liner" rationale; a committed copy is a second table (X1 assumption 4) | S:80 R:85 A:90 D:85 |
| 4 | Confident | The old trees are deleted in this change — `sites/astro-starlight-terminal1/`, `sites/astro-tailwind-terminal1/`, `sites/_playground/`, `content/`, `help/`, `versions-policy.json` — not left beside the stub | D13 "contents replaced in place"; dead trees plus dead crons make "what is live" ambiguous; git history and the hexokit-site `--mirror` retain every byte, so it is recoverable | S:70 R:75 A:75 D:65 |
| 5 | Confident | Freshness is a daily `schedule` on `deploy.yml` (`13 9 * * *`, 2 h after hexokit-site's 07:13 UTC help refresh) plus the existing push/dispatch triggers; no cross-repo dispatch from hexokit-site | The X2 row: "refreshed by the same CI copy step"; with the refresh crons gone nothing else commits daily; a `repository_dispatch` needs a PAT in two repos for no user-visible gain; ≤ 24 h staleness is fine because shll ≥ v0.1.31 prefers hexokit.com | S:60 R:90 A:80 D:70 |
| 6 | Certain | Stub page = spec §5 shape (`meta refresh 0`, `rel=canonical`, `location.replace`) plus a visible focusable link, `<title>`, `color-scheme: light dark`; no `noindex`, no sitemap | The spec fixes the three mechanisms; the additions satisfy the constitution's Accessibility and V (dark parity); `noindex` would fight the canonical | S:80 R:95 A:90 D:85 |
| 7 | Certain | `404.html` embeds `to` + `rules` from the fetched map and an inline port of `canonicalPath`/`applyRules` (first-match `String.replace`, canonicalize, prefix `to`, preserve query/hash) | Spec §4 consumer algorithm and the X1 anchor code, ported verbatim; the identity catch-all guarantees a match | S:85 R:90 A:90 D:90 |
| 8 | Certain | File-like map keys (`/llms.txt`, `/llms-full.txt`) are byte copies from hexokit.com, validated non-HTML, not stub pages | Spec §5 says so explicitly (Pages serves `.txt` as `text/plain`; a meta refresh cannot execute) — resolving X1 assumption 7 | S:85 R:90 A:95 D:90 |
| 9 | Certain | `/install` is a byte copy of `https://hexokit.com/install` (the S5 composed, product-first script), validated to start with `#!/bin/sh`; the raw-GitHub `curl` step in `deploy.yml` is removed | D13 "byte copies of `/install` + `/versions.json`" and spec §5 "the same copy step that fetches this map, `/install`, and `/versions.json` from hexokit.com"; D10 makes the default change deliberate | S:80 R:80 A:90 D:80 |
| 10 | Confident | The build asserts a completeness floor: every path in a committed `fixtures/shll-ai-paths.txt` (the final 75-URL sitemap + the historical `/tools/<slug>/*` set) is a key, a `keep`, or a file-like key — else build-stop; plus map validation (`schema` 1, `from`/`to`, exact `keep`, canonical keys, on-origin values, local equivalence check) | X1 checks the same floor in its CI, but a regressed or truncated map at fetch time is X2's failure to catch; the D4 pair must be checked on the consumer side too | S:55 R:90 A:85 D:75 |
| 11 | Confident | `/.well-known/security.txt` is regenerated at build with `Canonical: https://shll.ai/...` and `Expires` = build + 6 months (not byte-copied, not left to the 404 catch-all); `robots.txt` = allow-all with no `Sitemap:`; nothing else (no favicon/OG/sitemap) | Spec §6 leaves the chrome to X2; RFC 9116 forbids a foreign `Canonical`; the domain stays registered forever (D5); a sitemap of stubs is counterproductive | S:30 R:90 A:65 D:55 |
| 12 | Confident | The three cross-repo specs become tombstones pointing at hexokit-site (superseded in the index) rather than being deleted; the six `conventions/` memory files are removed; the constitution is amended to v3.0.0 (Redirect Host principle replaces II/III, Tool-Page Depth + External Links removed) | Memory is present-truth (FKF); the specs' producers live in hexokit-site since S1; inbound links to the spec paths exist in the shll standards; the repo's precedent is changes amending the constitution at hydrate | S:40 R:85 A:60 D:50 |
| 13 | Certain | Merge gates: X1's endpoint answers 200 (`schema` 1); shll.ai's final sitemap is compared with hexokit-site's fixture and frozen; a local `node build.mjs` succeeds; the PR's CI is expected red until gate 1 | Spec §6 "X2 re-fetches shll.ai's final sitemap at cutover"; the endpoint 404s today (verified); fail-closed fetch makes the red CI the correct signal | S:80 R:90 A:90 D:85 |
| 14 | Certain | The plan doc row/Status update lands as a separate commit in the run-kit repo at ship (Pickup protocol #4), the X1 precedent | The plan lives in run-kit and says so | S:85 R:95 A:95 D:95 |

14 assumptions (9 certain, 5 confident, 0 tentative, 0 unresolved).
