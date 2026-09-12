---
type: memory
description: "The shll-ai-redirect-stub generator: build.mjs fetch → validate → emit (lib.mjs pure exports; --origin/--out/--floor); fetched sources (shll-ai-redirects.json, the keep pair, file-like keys); validateMap, checkFloor + committed fixtures/shll-ai-paths.txt, validateByteCopy; the emitted file set (CNAME, stubs, byte copies, 404.html, robots.txt, generated security.txt) and what is not emitted; the stub page and 404 catch-all shapes; hermetic tests; X1 contract pointer; cutover verification"
---
# Redirect Stub Generator

**Domain**: build-deploy

## Overview

`sites/shll-ai-redirect-stub/` is the whole of shll.ai: a permanent redirect host for hexokit.com. Its generator is plain ESM run by the pinned Node 22 — `build.mjs` (thin CLI: fetch → validate → emit, exit non-zero on any failure) and `lib.mjs` (every checkable pure function, pinned by `stub.test.mjs` under `node --test`). No `package.json`, no lockfile, no `node_modules`. See [deployment](/build-deploy/deployment.md) for the workflows that run it. The redirect map it consumes is the X1 deliverable: contract `docs/specs/shll-ai-redirect-map-contract.md` in `sahil87/hexokit-site`, endpoint `https://hexokit.com/shll-ai-redirects.json` (sn0a).

## Requirements

### Requirement: Fetch everything at build time, fail closed
`build.mjs` MUST fetch, in order, `/shll-ai-redirects.json`, then every `keep` path, then every file-like `redirects` key (last path segment contains a `.`) from the origin (default the named constant `HEXOKIT_ORIGIN = 'https://hexokit.com'`; `--origin` overrides for local experiments only). Each fetch carries a 20 s `AbortSignal.timeout`; non-2xx, timeout, or network error MUST stop the build. No retries, no fallback origin, no committed copy of the map. All validation runs BEFORE `dist/` is touched, so a failure leaves the previous output (and the live site) alone. Flags: `--origin <url>`, `--out <dir>` (default `dist/` beside the script), `--floor <path>` (default `fixtures/shll-ai-paths.txt`).

### Requirement: `validateMap` — the fetched map is validated before anything is emitted
Every failure is an `Error` naming the offending field, build-stop: `schema === 1`; `from === 'https://shll.ai'`; `to` is an `https:` origin with no path; `keep` deep-equals `['/install', '/versions.json']` (the D4 pair — a map that drops one would silently turn a binary endpoint into a redirect); every `redirects` key equals its own `canonicalPath`; every value is an absolute URL starting with `to`; no key is a `keep` entry; `rules` is a non-empty array of `[string, string]` pairs whose regexes compile and whose last entry is the identity catch-all `['^(/.*)$', '$1']`; and the equivalence invariant holds locally — `to + applyRules(rules, k) === redirects[k]` for every key.

### Requirement: `checkFloor` — a committed completeness floor is asserted against the fetched map
Every non-blank, non-`#` line of `fixtures/shll-ai-paths.txt`, canonicalized, MUST be a `redirects` key, a `keep` entry, or a file-like key; otherwise the build stops listing every missing path. The fixture carries shll.ai's final sitemap (75 paths, with a header recording the fetch date and command) plus the historical `/tools/<slug>/*` set — the same content as X1's fixture. The floor is a floor, not a ceiling: a page hexokit.com adds later simply gains a stub.

### Requirement: `validateByteCopy` — byte copies are validated for the failure they exist to prevent
`/install` MUST begin with `#!/bin/sh` (an HTML page there is the `curl | sh` hazard); `/versions.json` MUST parse as JSON with `schema === 1` and a non-empty `tools` object; any other file-like copy MUST be non-empty and MUST NOT start with `<` (an HTML 404 body at a text path).

### Requirement: Exactly this file set is emitted, nothing else
`dist/` contains: `CNAME` (`shll.ai\n`); `<key>/index.html` for every page-like `redirects` key (the `/` key → `dist/index.html`); the fetched bytes verbatim at every `keep` path and every file-like key (`install`, `versions.json`, `llms.txt`, `llms-full.txt`); `404.html`; `robots.txt`; `.well-known/security.txt`. Deliberately NOT emitted: sitemap, favicon, OG image, analytics beacon (a browser's `/favicon.ico` probe hits `404.html`, which is harmless). The build prints a one-line summary (`N stubs, M byte copies, rules: R`).

### Requirement: Per-key stub page shape
`renderStub(target)` returns a complete HTML5 document with the target HTML-escaped once and used in all four places: `<meta http-equiv="refresh" content="0; url=<target>">`, `<link rel="canonical" href="<target>">`, a visible focusable `<a>` link (`a:focus-visible` outline), and a `<script>` calling `location.replace(JSON.stringify(target))`. `:root{color-scheme:light dark}` gives dark-mode parity with zero CSS variables. NO `noindex` (it would fight the canonical — a 0-second refresh with a canonical is what crawlers treat as a permanent move) and no external requests.

### Requirement: `404.html` catch-all applies the map's rules client-side
GitHub Pages serves `404.html` for any path with no file (status 404); the browser still runs it. `render404(to, rules)` embeds `to` and the ordered `rules` **from the fetched map** (never a hand-typed copy) as a JSON literal, plus an inline port of `canonicalPath`/`applyRules` produced by stringifying the `lib.mjs` functions (`Function.prototype.toString` — one definition, one behavior; the page must be self-contained). The script computes `to + applyRules(rules, location.pathname) + location.search + location.hash`, points the visible link at it, then `location.replace`s. With scripting disabled the page still shows a plain link to `to + '/'`. The identity catch-all guarantees a rule always matches: `/anything.png` lands on `https://hexokit.com/anything.png`; `/tools/wt/readme` lands on `https://hexokit.com/wt/readme/`.

### Requirement: Stub chrome — `robots.txt` and a regenerated `security.txt`
`robots.txt` is exactly `User-agent: *\nAllow: /\n` — no `Sitemap:` line. `.well-known/security.txt` is **generated, not copied**: RFC 9116 requires `Canonical` to be the file's own URL, so hexokit.com's copy would be wrong here, and the 404 catch-all cannot serve `text/plain`. Five lines — `Contact`/`Policy` naming the GitHub advisory flow, `Canonical: https://shll.ai/.well-known/security.txt`, `Preferred-Languages: en`, and `Expires` = build time + 6 months (re-stamped by every daily build; shll.ai stays registered forever, D5).

### Requirement: Hermetic test suite
`stub.test.mjs` (`node --test`, no network, no third-party packages) covers: `canonicalPath`/`applyRules` against the spec §4 table; `validateMap` accepting `fixtures/sample-map.json` (a small SYNTHETIC map — deliberately not a copy of the live map, so it cannot become a stale second table) and rejecting a wrong schema, missing `keep`, non-canonical key, off-origin value, broken invariant; `checkFloor` listing missing paths; `validateByteCopy` rejecting an HTML `/install`; `renderStub`/`render404` shape, with the 404 script run under `node:vm` against a fake `location`; and an integration case that serves the sample map + fake byte copies from an in-process `node:http` server, runs the build, and asserts the exact emitted file set (plus fail-closed cases: 404 map, HTML `/install`, floor regression).

## Cutover verification (operator, at ship)

Ordered; the first three are merge gates:

1. **X1 live**: `curl -fsS https://hexokit.com/shll-ai-redirects.json | jq .schema` → `1`.
2. **Final sitemap freeze**: `curl -fsSL https://shll.ai/sitemap-0.xml | grep -o '<loc>[^<]*</loc>' | sed 's#<loc>https://shll.ai##;s#</loc>##' | sort` — compare with the fixture's section 1; on drift, land a one-line fixture PR in hexokit-site first.
3. **Local dry run**: `node build.mjs` succeeds against live hexokit.com; spot-check `dist/wt/readme/index.html`, `dist/install` (`head -1` = `#!/bin/sh`), `dist/versions.json`, `dist/404.html`.
4. **Post-merge**: `curl -sI https://shll.ai/wt/readme/` shows the stub; `curl -fsSL https://shll.ai/install | head -1` = `#!/bin/sh`; `curl -fsS https://shll.ai/versions.json | jq .schema` = 1; `curl -s https://shll.ai/tools/run-kit/` follows to `https://hexokit.com/docs/`; `curl -s -o /dev/null -w '%{http_code}' https://shll.ai/never-existed/` = 404 with the catch-all body.

## Design Decisions

### Generator is a zero-dependency Node script, not the Astro site
**Decision**: Emit the stub with `build.mjs` + `lib.mjs` under `sites/shll-ai-redirect-stub/`, using only Node 22 built-ins (`fetch`, `fs`, `node:test`).
**Why**: A few hundred identical three-line stubs and a handful of byte copies need no framework; the minimal-dependencies constitution; the Astro tree had no remaining content to render.
**Rejected**: Reusing Astro's `redirects:` (a 2 MB toolchain for three-line pages; redirect targets must be in-site routes); committing generated stubs (stale the day hexokit-site adds a page).
*Introduced by*: 260912-sn0a-shll-ai-redirect-stub

### The consumer re-checks the producer's invariants
**Decision**: `validateMap` re-asserts the exact `keep` pair, canonical keys, on-origin values and the rules≡enumeration invariant; `checkFloor` asserts a committed sitemap floor; `validateByteCopy` checks the shebang/JSON shape.
**Why**: X1 proves these in its own CI, but a truncated download, a regressed map, or an HTML body at `/install` are failures only the consumer sees at fetch time.
**Rejected**: Trusting the fetched map as-is.
*Introduced by*: 260912-sn0a-shll-ai-redirect-stub

### `security.txt` regenerated, and no sitemap
**Decision**: Generate `/.well-known/security.txt` at build with `Canonical: https://shll.ai/...` and `Expires` = build + 6 months; emit an allow-all `robots.txt` with no `Sitemap:` line and no sitemap.
**Why**: RFC 9116 forbids a foreign `Canonical` (hexokit.com's copy would be wrong here) and the catch-all cannot serve `text/plain`; the domain stays registered forever (D5) and keeps a valid reporting pointer. A sitemap of redirect stubs invites crawlers to index them — letting crawlers re-crawl the old URLs and follow the meta refresh + canonical is the standard way a domain move is discovered.
**Rejected**: Byte-copying hexokit.com's `security.txt`; leaving it to the 404 catch-all; emitting a sitemap.
*Introduced by*: 260912-sn0a-shll-ai-redirect-stub
