/**
 * /versions.json — the toolkit version manifest (change 2lgz), emitted as a
 * build-time static `application/json` endpoint (Constitution I — no SSR, no
 * runtime fetch; Constitution VI — zero new deps). The same idiom as the
 * `/llms.txt` / `/llms-full.txt` endpoints: a thin page that resolves the repo
 * root and delegates all logic to a lib module (`src/lib/versions-manifest.ts`).
 *
 * Served at `https://shll.ai/versions.json`, it lists each toolkit tool's latest
 * version plus a per-tool notify policy, so run-kit's update checker
 * (`internal/updatecheck`, the cross-repo consumer — change `260718-d15e`) can
 * fetch ONE static CDN file instead of 7 unauthenticated GitHub API calls, and
 * apply notify policy that is tuned by editing `versions-policy.json` here rather
 * than by shipping a consumer binary update. The cross-repo contract (output
 * schema, `notify` semantics, freshness cascade, live-site-swap obligation) is
 * `docs/specs/versions-manifest-contract.md`.
 *
 * Failure postures (see `versions-manifest.ts`): the site-authored
 * `versions-policy.json` build-STOPS on invalidity (via `readPolicy`), while a
 * missing/invalid PULLED `help/<slug>.json` skip-degrades (row omitted, build
 * continues) inside `buildManifest`.
 */
import type { APIRoute } from 'astro';
import { repoRootFromModuleUrl } from '../lib/repo-root.ts';
import { buildManifest, readPolicy } from '../lib/versions-manifest.ts';

export const GET: APIRoute = async () => {
  const repoRoot = repoRootFromModuleUrl(import.meta.url);
  const policy = readPolicy(repoRoot); // build-stops on an invalid policy file
  const manifest = buildManifest(repoRoot, policy);

  return new Response(`${JSON.stringify(manifest, null, 2)}\n`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
