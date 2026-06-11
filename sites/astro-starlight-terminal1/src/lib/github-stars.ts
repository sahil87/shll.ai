/**
 * github-stars — build-time per-repo star-count fetch for GithubButton
 * (change d9qb).
 *
 * `getStarCount(tool)` GETs `https://api.github.com/repos/sahil87/<tool>` at
 * BUILD TIME with native fetch (no new dependency — Constitution VI) and
 * resolves to `stargazers_count`; the count renders statically (Constitution
 * I — no client-side fetch). Freshness rides the existing daily scheduled
 * pulls: scheduled-help-refresh.yml's per-run `captured_at` churn reliably
 * lands a commit every day (scheduled-readme-refresh.yml commits only when
 * slices changed) → push to main → deploy, so a rendered count is at most
 * ~24h stale.
 *
 * FAIL-SOFT BY CONTRACT: any failure — network error, non-200 (404, 403
 * rate-limit), missing/malformed `stargazers_count` — resolves to null with
 * ONE console warning per repo, and never throws. A missing count is
 * cosmetic; a broken deploy is not. This is the deliberate OPPOSITE of
 * VersionTable's build-stop: that reads committed repo artifacts (help/*.json)
 * where absence means a defect reached main, while this reads a live
 * third-party API where absence is transient noise.
 *
 * Auth: the deploy workflow passes the automatic GITHUB_TOKEN to the build
 * step (raises the rate limit from shared Actions-runner IPs); local dev
 * goes unauthenticated and simply omits counts when rate-limited.
 */

const GITHUB_API_REPOS = 'https://api.github.com/repos/sahil87';

// Module-level per-build cache, keyed by tool slug. The in-flight PROMISE is
// cached (not the resolved value), so concurrent calls during parallel page
// prerendering collapse into exactly one request per repo per build — even
// if a future page renders the same button twice. Failures cache too: one
// warning, one attempt, per repo.
const cache = new Map<string, Promise<number | null>>();

/**
 * Resolve the star count of `github.com/sahil87/<tool>`, or null on any
 * failure (never throws — see the fail-soft contract above).
 */
export function getStarCount(tool: string): Promise<number | null> {
  let pending = cache.get(tool);
  if (!pending) {
    pending = fetchStarCount(tool);
    cache.set(tool, pending);
  }
  return pending;
}

async function fetchStarCount(tool: string): Promise<number | null> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    // Bounded wait: a stalled connection must degrade to a missing count in
    // seconds, not hold the build for undici's ~300s default. The abort lands
    // in the catch below — same fail-soft path as any other network error.
    // The slug is path-encoded so an unexpected character from a future
    // caller ('?', '/', space) can't rewrite the request path or query.
    const res = await fetch(`${GITHUB_API_REPOS}/${encodeURIComponent(tool)}`, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      warnOmitted(tool, `HTTP ${res.status}`);
      return null;
    }
    const body = (await res.json()) as { stargazers_count?: unknown };
    const count = body?.stargazers_count;
    if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) {
      warnOmitted(tool, 'missing or malformed stargazers_count');
      return null;
    }
    return count;
  } catch (err) {
    warnOmitted(tool, err instanceof Error ? err.message : String(err));
    return null;
  }
}

// The single per-repo build-log warning the fail-soft contract promises —
// one place, so the wording (and the promise of exactly one line) can't
// drift between the failure branches.
function warnOmitted(tool: string, reason: string): void {
  console.warn(`[github-stars] ${tool}: star count omitted (${reason})`);
}

/**
 * Display formatting for the button row: counts under 1000 print exactly;
 * thousands abbreviate GitHub-style — one decimal below 10k with a trailing
 * `.0` dropped (`1234` → `1.2k`, `1000` → `1k`), integer k from 10k up
 * (`12345` → `12k`). No millions tier: these repos sit far below 1M, and an
 * unreachable branch is just dead code.
 *
 * The one-decimal tier rounds via INTEGER tenths-of-k, not `toFixed(1)`:
 * `(1950 / 1000).toFixed(1)` is "1.9" (the double sits just below 1.95)
 * while 1999 rounds up to "2k" — an inconsistent half-up. `count / 100` is
 * exact at every .5 boundary (multiples of 50 divide to representable
 * halves), so `Math.round` gives stable half-up rounding: 1950 → `2k`.
 *
 * Pure and exported so scripts/github-stars.test.mjs can pin the tiers.
 */
export function formatStarCount(count: number): string {
  if (count < 1000) return String(count);
  if (count < 10_000) {
    const tenths = Math.round(count / 100);
    const whole = Math.floor(tenths / 10);
    const frac = tenths % 10;
    return frac === 0 ? `${whole}k` : `${whole}.${frac}k`;
  }
  return `${Math.floor(count / 1000)}k`;
}
