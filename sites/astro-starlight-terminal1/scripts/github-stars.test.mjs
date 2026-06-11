/**
 * Unit test for `src/lib/github-stars.ts` (change d9qb). Run with the site's
 * Node toolchain (>=22, native `.ts` type-stripping), mirroring how the other
 * lib tests run:
 *
 *   cd sites/astro-starlight-terminal1
 *   node --test scripts/github-stars.test.mjs
 *
 * Pins the fail-soft contract GithubButton relies on:
 *   - 200 + numeric stargazers_count → the number;
 *   - non-200 (404, 403 rate-limit) → null, exactly one console warning;
 *   - thrown fetch (no network) → null, never propagates;
 *   - missing/malformed stargazers_count → null;
 *   - the module-level cache: one fetch per repo, shared by concurrent calls;
 *   - Authorization: Bearer header present iff GITHUB_TOKEN is set;
 *   - formatStarCount tiers: exact < 1000, one-decimal k < 10k (trailing .0
 *     dropped), integer k from 10k up.
 *
 * The fetch path is exercised by stubbing globalThis.fetch (save/restore per
 * test) — the module's public API stays exactly as specified, no injection
 * params. NOTE: the module caches per tool slug, so every test uses a unique
 * fake slug to stay isolated from the cache.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { getStarCount, formatStarCount } from '../src/lib/github-stars.ts';

// Run `fn` with fetch + console.warn stubbed, restoring both afterwards.
// Returns { result, calls, warnings } — the resolved value, the recorded
// fetch invocations ({ url, headers }), and the captured warning lines.
async function withStubbedFetch(impl, fn) {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const calls = [];
  const warnings = [];
  globalThis.fetch = (url, init) => {
    calls.push({ url: String(url), headers: init?.headers ?? {} });
    return impl(url, init);
  };
  console.warn = (...args) => {
    warnings.push(args.join(' '));
  };
  try {
    const result = await fn();
    return { result, calls, warnings };
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }
}

const okResponse = (body) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
const errorResponse = (status) =>
  Promise.resolve({ ok: false, status, json: () => Promise.resolve({}) });

// ── getStarCount: success ────────────────────────────────────────────────────

test('200 with numeric stargazers_count resolves the number', async () => {
  const { result, calls, warnings } = await withStubbedFetch(
    () => okResponse({ stargazers_count: 142 }),
    () => getStarCount('d9qb-success'),
  );
  assert.equal(result, 142);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.github.com/repos/sahil87/d9qb-success');
  assert.equal(warnings.length, 0);
});

test('zero stars is a valid count, not a failure', async () => {
  const { result } = await withStubbedFetch(
    () => okResponse({ stargazers_count: 0 }),
    () => getStarCount('d9qb-zero'),
  );
  assert.equal(result, 0);
});

// ── getStarCount: failure classification (all → null, one warning) ──────────

test('non-200 (404) resolves null with exactly one warning naming the tool', async () => {
  const { result, warnings } = await withStubbedFetch(
    () => errorResponse(404),
    () => getStarCount('d9qb-missing'),
  );
  assert.equal(result, null);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /d9qb-missing/);
  assert.match(warnings[0], /HTTP 404/);
});

test('403 rate-limit resolves null, never throws', async () => {
  const { result, warnings } = await withStubbedFetch(
    () => errorResponse(403),
    () => getStarCount('d9qb-ratelimited'),
  );
  assert.equal(result, null);
  assert.equal(warnings.length, 1);
});

test('network error (fetch throws) resolves null, never propagates', async () => {
  const { result, warnings } = await withStubbedFetch(
    () => Promise.reject(new Error('getaddrinfo ENOTFOUND api.github.com')),
    () => getStarCount('d9qb-offline'),
  );
  assert.equal(result, null);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /ENOTFOUND/);
});

test('missing stargazers_count resolves null', async () => {
  const { result, warnings } = await withStubbedFetch(
    () => okResponse({ full_name: 'sahil87/x' }),
    () => getStarCount('d9qb-nofield'),
  );
  assert.equal(result, null);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /malformed/);
});

test('non-numeric / negative stargazers_count resolves null', async () => {
  const bad = [{ stargazers_count: '142' }, { stargazers_count: -1 }, { stargazers_count: NaN }];
  for (const [i, body] of bad.entries()) {
    const { result } = await withStubbedFetch(
      () => okResponse(body),
      () => getStarCount(`d9qb-badfield-${i}`),
    );
    assert.equal(result, null);
  }
});

// ── getStarCount: module-level cache ─────────────────────────────────────────

test('cache: concurrent + repeat calls for one tool issue exactly one fetch', async () => {
  const { result, calls } = await withStubbedFetch(
    () => okResponse({ stargazers_count: 7 }),
    async () => {
      // Concurrent (promise shared while in flight) AND sequential (resolved
      // promise reused) — both must hit the same single request.
      const [a, b] = await Promise.all([
        getStarCount('d9qb-cached'),
        getStarCount('d9qb-cached'),
      ]);
      const c = await getStarCount('d9qb-cached');
      return [a, b, c];
    },
  );
  assert.deepEqual(result, [7, 7, 7]);
  assert.equal(calls.length, 1);
});

test('cache: failures cache too — one attempt, one warning per repo', async () => {
  const { result, calls, warnings } = await withStubbedFetch(
    () => errorResponse(403),
    async () => [
      await getStarCount('d9qb-failcached'),
      await getStarCount('d9qb-failcached'),
    ],
  );
  assert.deepEqual(result, [null, null]);
  assert.equal(calls.length, 1);
  assert.equal(warnings.length, 1);
});

// ── getStarCount: auth header ────────────────────────────────────────────────

test('GITHUB_TOKEN set → Authorization: Bearer header sent', async () => {
  const original = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = 'test-token-123';
  try {
    const { calls } = await withStubbedFetch(
      () => okResponse({ stargazers_count: 1 }),
      () => getStarCount('d9qb-authed'),
    );
    assert.equal(calls[0].headers.Authorization, 'Bearer test-token-123');
  } finally {
    if (original === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = original;
  }
});

test('GITHUB_TOKEN unset → unauthenticated request (no Authorization header)', async () => {
  const original = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;
  try {
    const { calls } = await withStubbedFetch(
      () => okResponse({ stargazers_count: 1 }),
      () => getStarCount('d9qb-anon'),
    );
    assert.equal('Authorization' in calls[0].headers, false);
    assert.equal(calls[0].headers.Accept, 'application/vnd.github+json');
  } finally {
    if (original !== undefined) process.env.GITHUB_TOKEN = original;
  }
});

// ── formatStarCount ──────────────────────────────────────────────────────────

test('format: counts under 1000 print exactly', () => {
  assert.equal(formatStarCount(0), '0');
  assert.equal(formatStarCount(1), '1');
  assert.equal(formatStarCount(999), '999');
});

test('format: one-decimal k below 10k, trailing .0 dropped', () => {
  assert.equal(formatStarCount(1000), '1k');
  assert.equal(formatStarCount(1234), '1.2k'); // the intake's worked example
  assert.equal(formatStarCount(1949), '1.9k'); // just below the half boundary
  assert.equal(formatStarCount(1950), '2k'); // stable half-up via integer tenths (toFixed would give 1.9k)
  assert.equal(formatStarCount(1999), '2k');
  assert.equal(formatStarCount(9999), '10k'); // rounds across the tier edge
});

test('format: integer k from 10k up', () => {
  assert.equal(formatStarCount(10000), '10k');
  assert.equal(formatStarCount(12345), '12k');
  assert.equal(formatStarCount(999999), '999k');
});
