/**
 * lib.mjs — pure, dependency-free logic for the shll.ai redirect-stub
 * generator (change 260912-sn0a-shll-ai-redirect-stub). `build.mjs` is the
 * thin CLI; everything checkable lives here so `node --test` can pin it
 * hermetically.
 *
 * shll.ai is a permanent redirect host for hexokit.com (HexoKit rebrand,
 * rows X1/X2): every URL it ever served lands on its final hexokit.com page
 * via the fetched redirect map, and the two binary-facing endpoints
 * (`/install`, `/versions.json`) stay REAL byte copies, never redirects
 * (plan decision D4). `canonicalPath` / `applyRules` are ported verbatim
 * from the X1 machine anchor
 * (`sites/astro-starlight-terminal1/src/lib/shll-ai-redirects.ts` in
 * sahil87/hexokit-site); the cross-repo contract is
 * `docs/specs/shll-ai-redirect-map-contract.md` there.
 */

/** The map schema revision this consumer understands. */
export const MAP_SCHEMA = 1;

/** The origin every map key is a path on — the retired site being mapped FROM. */
export const SHLL_AI_ORIGIN = 'https://shll.ai';

/** Default origin the map and byte copies are fetched from (`--origin` overrides). */
export const HEXOKIT_ORIGIN = 'https://hexokit.com';

/**
 * Paths that stay REAL FILES on shll.ai (D4: they are baked into shipped
 * `shll` binaries, so they are byte copies refreshed by the daily build,
 * never redirects). The map's `keep` MUST deep-equal this list.
 */
export const KEEP_ON_SHLL_AI = ['/install', '/versions.json'];

/** The GitHub Pages custom domain, emitted as `dist/CNAME`. */
export const CNAME = 'shll.ai';

/** Per-fetch timeout — a stalled origin fails the build in seconds. */
export const FETCH_TIMEOUT_MS = 20_000;

/** `security.txt` validity window, re-stamped by every daily build. */
export const SECURITY_EXPIRY_MONTHS = 6;

/** Allow-all, and deliberately NO `Sitemap:` line — a sitemap of redirect
 *  stubs invites crawlers to index them; the meta refresh + canonical on
 *  each stub is how the domain move is discovered. */
export const ROBOTS_TXT = 'User-agent: *\nAllow: /\n';

/**
 * Canonicalize a path: collapse duplicate slashes, guarantee a leading slash,
 * then — page-like paths (last segment has no `.`) end with exactly one `/`
 * (`/tools/wt/readme` and `/tools/wt/readme/` collapse to one key; `/` stays
 * `/`), while file-like paths (`/llms.txt`, `/versions.json`) stay bare.
 * (Verbatim port of the X1 anchor.)
 */
export function canonicalPath(path) {
  let p = path.replace(/\/{2,}/g, '/');
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/+$/, '');
  if (p === '') return '/';
  const last = p.split('/').pop() ?? '';
  return last.includes('.') ? p : `${p}/`;
}

/**
 * Apply the first matching rule to `pathname` and canonicalize the result.
 * The request path is canonicalized BEFORE matching (the spec §4 consumer
 * algorithm), so a duplicate-slash or unslashed request such as
 * `/tools//wt/readme` still hits the `/tools/<name>` rules instead of falling
 * through to identity. The identity catch-all guarantees a rule always matches.
 * (Verbatim port of the X1 anchor.)
 */
export function applyRules(rules, pathname) {
  const request = canonicalPath(pathname);
  for (const [source, replacement] of rules) {
    const re = new RegExp(source);
    if (re.test(request)) return canonicalPath(request.replace(re, replacement));
  }
  return request;
}

/** A path whose last segment contains a `.` (e.g. `/llms.txt`) is served as
 *  a byte copy, never a `<key>/index.html` stub — GitHub Pages resolves it
 *  to a literal file, and an HTML payload at a `.txt` path would be served
 *  as `text/plain`, so neither refresh mechanism could execute (spec §5). */
export function isFileLike(path) {
  const last = path.split('/').pop() ?? '';
  return last.includes('.');
}

/** HTML-escape a URL for attribute and text use (`&`, `<`, `>`, `"`). */
export function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** The map's `keep` set in both spellings, so a canonicalized floor line or
 *  a slash-suffixed lookalike key still collides with a keep path. */
function keepSet() {
  return new Set(KEEP_ON_SHLL_AI.flatMap((k) => [k, canonicalPath(k)]));
}

/** Validate the map's top-level fields (`schema`, `from`, `to`, `keep`). */
function validateMapHeader(map) {
  if (map === null || typeof map !== 'object' || Array.isArray(map)) {
    throw new Error('redirect map: not a JSON object');
  }
  if (map.schema !== MAP_SCHEMA) {
    throw new Error(`redirect map: schema must be ${MAP_SCHEMA}, got ${JSON.stringify(map.schema)}`);
  }
  if (map.from !== SHLL_AI_ORIGIN) {
    throw new Error(`redirect map: from must be '${SHLL_AI_ORIGIN}', got ${JSON.stringify(map.from)}`);
  }
  let toUrl;
  try {
    toUrl = new URL(map.to);
  } catch {
    throw new Error(`redirect map: to is not a valid URL: ${JSON.stringify(map.to)}`);
  }
  if (toUrl.protocol !== 'https:' || toUrl.origin !== map.to) {
    throw new Error(`redirect map: to must be an https origin with no path, got ${JSON.stringify(map.to)}`);
  }
  if (map.to !== HEXOKIT_ORIGIN) {
    throw new Error(`redirect map: to must be '${HEXOKIT_ORIGIN}' (shll.ai redirects to hexokit.com only), got ${JSON.stringify(map.to)}`);
  }
  const keep = map.keep;
  if (
    !Array.isArray(keep) ||
    keep.length !== KEEP_ON_SHLL_AI.length ||
    !KEEP_ON_SHLL_AI.every((k, i) => keep[i] === k)
  ) {
    throw new Error(
      `redirect map: keep must be exactly ${JSON.stringify(KEEP_ON_SHLL_AI)}, got ${JSON.stringify(map.keep)}`,
    );
  }
}

/** Validate the `redirects` enumeration: canonical keys, on-origin values,
 *  and no keep path among the keys. */
function validateRedirects(map) {
  const redirects = map.redirects;
  if (redirects === null || typeof redirects !== 'object' || Array.isArray(redirects)) {
    throw new Error('redirect map: redirects must be an object');
  }
  const keeps = keepSet();
  for (const [key, value] of Object.entries(redirects)) {
    const canonical = canonicalPath(key);
    if (key !== canonical) {
      throw new Error(`redirect map: redirects key '${key}' is not canonical (expected '${canonical}')`);
    }
    if (key.split('/').some((segment) => segment === '.' || segment === '..')) {
      throw new Error(`redirect map: redirects key '${key}' contains a dot segment (path traversal)`);
    }
    if (keeps.has(key)) {
      throw new Error(`redirect map: redirects key '${key}' collides with a keep path`);
    }
    if (typeof value !== 'string' || !value.startsWith(`${map.to}/`)) {
      throw new Error(`redirect map: redirects['${key}'] is not an absolute URL on ${map.to}: ${JSON.stringify(value)}`);
    }
  }
}

/** Validate `rules`: a non-empty list of `[regexSource, replacement]` string
 *  pairs whose regexes compile, ending in the identity catch-all. */
function validateRules(rules) {
  if (!Array.isArray(rules) || rules.length === 0) {
    throw new Error('redirect map: rules must be a non-empty array');
  }
  for (const rule of rules) {
    if (!Array.isArray(rule) || rule.length !== 2 || typeof rule[0] !== 'string' || typeof rule[1] !== 'string') {
      throw new Error(`redirect map: rules entries must be [string, string] pairs, got ${JSON.stringify(rule)}`);
    }
    try {
      new RegExp(rule[0]);
    } catch {
      throw new Error(`redirect map: rules regex does not compile: ${JSON.stringify(rule[0])}`);
    }
  }
  const last = rules[rules.length - 1];
  if (last[0] !== '^(/.*)$' || last[1] !== '$1') {
    throw new Error(`redirect map: rules must end with the identity catch-all ['^(/.*)$', '$1'], got ${JSON.stringify(last)}`);
  }
}

/**
 * Validate a fetched redirect map (spec §1–§4) — every failure is an Error
 * naming the offending field, build-stop. Beyond the field shapes this
 * re-asserts the producer's equivalence invariant locally: for every key k,
 * `to + applyRules(rules, k) === redirects[k]` (X1 proves it in its own CI;
 * re-checking here costs microseconds and catches a truncated download).
 */
export function validateMap(map) {
  validateMapHeader(map);
  validateRedirects(map);
  validateRules(map.rules);
  for (const [key, value] of Object.entries(map.redirects)) {
    const derived = map.to + applyRules(map.rules, key);
    if (derived !== value) {
      throw new Error(
        `redirect map: equivalence invariant broken for key '${key}': rules derive '${derived}', map says '${value}'`,
      );
    }
  }
}

/**
 * The completeness floor: canonicalize every non-blank, non-`#` line of the
 * floor fixture and return the list of paths that are neither a `redirects`
 * key, nor a `keep` entry, nor a file-like key. The build fails listing the
 * whole list when it is non-empty. The floor is a FLOOR, not a ceiling — a
 * page hexokit.com adds later simply gains a stub; a file-like floor entry
 * is covered by the byte-copy validation rather than the enumeration.
 */
export function checkFloor(map, floorText) {
  const keeps = keepSet();
  const missing = [];
  for (const line of floorText.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const path = canonicalPath(trimmed);
    if (map.redirects[path] !== undefined) continue;
    if (keeps.has(path)) continue;
    if (isFileLike(path)) continue;
    missing.push(path);
  }
  return missing;
}

/**
 * Validate a byte copy for the failure it exists to prevent (build-stop):
 * `/install` MUST begin with `#!/bin/sh` (an HTML page there is the
 * `curl | sh` hazard); `/versions.json` MUST parse as JSON with schema 1 and
 * a non-empty `tools` object; any other file-like copy MUST be non-empty and
 * MUST NOT start with `<` (an HTML 404 body at a text path).
 */
export function validateByteCopy(path, bytes) {
  if (path === '/install') {
    if (!bytes.startsWith('#!/bin/sh')) {
      throw new Error(`byte copy ${path}: must begin with '#!/bin/sh' (an HTML page here breaks 'curl | sh')`);
    }
    return;
  }
  if (path === '/versions.json') {
    let parsed;
    try {
      parsed = JSON.parse(bytes);
    } catch {
      throw new Error(`byte copy ${path}: not valid JSON`);
    }
    if (parsed?.schema !== MAP_SCHEMA || typeof parsed.tools !== 'object' || parsed.tools === null || Array.isArray(parsed.tools) || Object.keys(parsed.tools).length === 0) {
      throw new Error(`byte copy ${path}: must be a schema ${MAP_SCHEMA} manifest with a non-empty tools object`);
    }
    return;
  }
  if (bytes.length === 0 || bytes.startsWith('<')) {
    throw new Error(`byte copy ${path}: empty or HTML body at a text path`);
  }
}

/**
 * The per-key stub page (spec §5 consumer shape): a 0-second meta refresh +
 * canonical (what crawlers treat as a permanent move — no `noindex`, which
 * would fight the canonical), a visible focusable link for humans, and a
 * `location.replace` fallback. The target is HTML-escaped once and used in
 * all attribute/text positions; the script gets a JSON-stringified URL so a
 * quote can never break out of the string. `color-scheme: light dark` gives
 * dark-mode parity with zero CSS variables. No external requests.
 */
export function renderStub(target) {
  const escaped = escapeHtml(target);
  const jsUrl = JSON.stringify(target).replaceAll('<', '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0; url=${escaped}">
<link rel="canonical" href="${escaped}">
<title>Moved to hexokit.com</title>
<style>:root{color-scheme:light dark}body{font:16px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;margin:3rem auto;max-width:36rem;padding:0 1rem}a:focus-visible{outline:2px solid currentColor;outline-offset:2px}</style>
</head>
<body>
<p>shll.ai has moved. This page is now at <a href="${escaped}">${escaped}</a>.</p>
<script>location.replace(${jsUrl})</script>
</body>
</html>
`;
}

/**
 * The `404.html` catch-all for un-enumerated paths. GitHub Pages serves it
 * for any path with no file (status 404); the browser still runs it. It
 * embeds `to` and the ordered `rules` from the FETCHED map (never a
 * hand-typed copy) as a JSON literal, plus the inline port of
 * `canonicalPath`/`applyRules` produced by stringifying this module's own
 * functions (one definition, one behavior — the page must be self-contained,
 * no module import on a 404 page). The script computes
 * `to + applyRules(rules, location.pathname) + location.search + location.hash`,
 * points the visible link at it, then `location.replace`s. With scripting
 * disabled the page still shows a plain link to `to + '/'`.
 */
export function render404(to, rules) {
  const mapJson = JSON.stringify({ to, rules }).replaceAll('<', '\\u003c');
  const home = escapeHtml(`${to}/`);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Moved to hexokit.com</title>
<style>:root{color-scheme:light dark}body{font:16px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;margin:3rem auto;max-width:36rem;padding:0 1rem}a:focus-visible{outline:2px solid currentColor;outline-offset:2px}</style>
</head>
<body>
<p>shll.ai has moved to hexokit.com. This page is now at <a id="target" href="${home}">${home}</a>.</p>
<script>
const MAP = ${mapJson};
${canonicalPath.toString()}
${applyRules.toString()}
const target = MAP.to + applyRules(MAP.rules, location.pathname) + location.search + location.hash;
const link = document.getElementById('target');
link.href = target;
link.textContent = target;
location.replace(target);
</script>
</body>
</html>
`;
}

/**
 * The stub's own `/.well-known/security.txt` — GENERATED, not copied (RFC
 * 9116 requires `Canonical` to be the file's own URL, so hexokit.com's copy
 * would be wrong here) and not left to the 404 catch-all (which cannot serve
 * `text/plain`). `Expires` is build time + SECURITY_EXPIRY_MONTHS,
 * re-stamped by every daily build; shll.ai stays registered forever (D5) and
 * keeps a valid reporting pointer.
 */
export function renderSecurityTxt(now = new Date()) {
  const expires = new Date(now);
  expires.setUTCMonth(expires.getUTCMonth() + SECURITY_EXPIRY_MONTHS);
  return [
    'Contact: https://github.com/sahil87/.github/security/advisories/new',
    `Expires: ${expires.toISOString()}`,
    'Canonical: https://shll.ai/.well-known/security.txt',
    'Policy: https://github.com/sahil87/.github/blob/main/SECURITY.md',
    'Preferred-Languages: en',
    '',
  ].join('\n');
}
