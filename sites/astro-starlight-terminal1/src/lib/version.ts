/**
 * version — shared display normalization for the `version` string read from
 * `help/<slug>.json`. The producers are inconsistent about the `v` prefix
 * (fab emits "2.3.1", wt emits "v0.0.20"), so every display site normalizes
 * to a single `vX.Y.Z` form through this one helper. Used by VersionTable
 * (the homepage `$ shll version` block) and CommandReference (the per-tool
 * commands page's provenance line).
 */

/** Prepend `v` if the version string doesn't already start with one. */
export function normalizeVersion(version: string): string {
  return version.startsWith('v') ? version : `v${version}`;
}
