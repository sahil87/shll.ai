/**
 * /.well-known/security.txt — an RFC 9116 security policy, emitted as a
 * build-time static `text/plain` endpoint (Constitution I — no SSR, no runtime
 * fetch; Constitution VI — zero new deps). Sibling of the /llms.txt endpoint.
 *
 * The file points security researchers at the canonical reporting flow — GitHub's
 * private vulnerability reporting on the toolkit repos (and the @sahil87/.github
 * org-default SECURITY.md) — NOT at a parallel channel like Discord, so the domain
 * front-door and the per-repo policies reinforce a single reporting path.
 *
 * Anti-drift / staleness:
 *   - `Expires` is the one field RFC 9116 says renders the file stale. A hardcoded
 *     timestamp in a static asset silently expires, so it is COMPUTED at build time
 *     as now + EXPIRY_MONTHS and re-stamped on every deploy — there is no scheduled
 *     refresh path for this file, so build-time generation is what keeps it fresh.
 *     This is also why it lives as an endpoint rather than a static file under
 *     public/.well-known/ (public/ assets are copied verbatim and cannot template).
 *   - Every URL is ABSOLUTE, built from the endpoint context `site` (`Astro.site`
 *     === `https://shll.ai`) — never hardcoded — mirroring the og:image / llms.txt
 *     absolute-URL discipline in docs/memory/conventions/seo-social-meta.md. The
 *     `Canonical` field per RFC 9116 must be the file's own absolute URL.
 */
import type { APIRoute } from 'astro';

/** How far out to stamp `Expires`. RFC 9116 recommends < 1 year; re-stamped each deploy. */
const EXPIRY_MONTHS = 6;

/** Canonical reporting entry points (absolute, GitHub advisory flow). */
const SECURITY_POLICY_URL = 'https://github.com/sahil87/.github/blob/main/SECURITY.md';
const ADVISORY_URL = 'https://github.com/sahil87/.github/security/advisories/new';

export const GET: APIRoute = ({ site }) => {
  // `site` is guaranteed present — astro.config.mjs sets `site: 'https://shll.ai'`.
  const origin = site!;
  const canonical = new URL('/.well-known/security.txt', origin).href;

  // Build-time `Expires`: now + EXPIRY_MONTHS, as an RFC 3339 / ISO 8601 timestamp.
  const expires = new Date();
  expires.setMonth(expires.getMonth() + EXPIRY_MONTHS);

  const body = [
    `Contact: ${ADVISORY_URL}`,
    `Expires: ${expires.toISOString()}`,
    `Canonical: ${canonical}`,
    `Policy: ${SECURITY_POLICY_URL}`,
    `Preferred-Languages: en`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
