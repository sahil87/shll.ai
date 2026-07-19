/**
 * versions-manifest — build-time logic for the `/versions.json` static endpoint
 * (change 2lgz). Single-sources everything the thin `src/pages/versions.json.ts`
 * page needs so the manifest logic is unit-testable with `node --test` (a page
 * cannot be imported by a plain node script) — the same lib-extraction precedent
 * as `llms.ts` / `terminal-toolcard.ts`.
 *
 * The manifest lists each toolkit tool's latest version plus a per-tool notify
 * policy, so run-kit's update checker (`internal/updatecheck`, the cross-repo
 * consumer — change `260718-d15e`) can decide whether a newer release is worth a
 * notification WITHOUT shipping thresholds compiled into its binary. Tuning
 * policy is editing `versions-policy.json` here, not shipping a consumer update.
 *
 * Data sources, both already committed at the repo root (no runtime, no fetch —
 * Constitution I; no new dep — Constitution VI):
 *   - `help/<slug>.json` — the daily-refreshed help envelopes; `version` is read
 *     and normalized to bare form. Validated with the shared `HelpDocSchema`
 *     (`schemas.ts`) — never hand-parsed.
 *   - `versions-policy.json` — the hand-edited per-tool notify policy at the repo
 *     root (sibling of `help/`, NOT inside it — the puller's staleness gate and
 *     `validate-help.mjs` glob `help/*.json`). It is the manifest's ROSTER: only
 *     tools declared here are advertised.
 *
 * Two deliberately opposite failure postures (intake §1, help-collection):
 *   - PULLED envelopes SKIP-DEGRADE: a missing or schema-invalid `help/<slug>.json`
 *     omits that tool's row and the build CONTINUES (the `/llms.txt` posture, NOT
 *     `VersionTable`'s build-stop). The consumer treats an absent row as
 *     never-matches, so omission is safe.
 *   - The SITE-AUTHORED `versions-policy.json` BUILD-STOPS on invalidity: an
 *     unknown `notify` value or a malformed entry fails `astro build` (site data
 *     is authored here, so a defect is a bug to fix up front).
 */
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'astro:content';
import { HelpDocSchema } from './schemas.ts';

/** The manifest schema revision. Additive evolution keeps this at 1. */
export const MANIFEST_SCHEMA = 1 as const;

/** Allowed per-tool notify policy values (consumer semantics in the contract spec). */
export const NOTIFY_VALUES = ['never', 'patch', 'minor'] as const;
export type Notify = (typeof NOTIFY_VALUES)[number];

/**
 * One tool's policy entry: the required notify threshold plus an optional
 * `formula` override (defaults to the slug — slug == Homebrew formula name for
 * all 7 tools today, so the override exists only for a future divergence).
 */
export const PolicyEntrySchema = z.object({
  notify: z.enum(NOTIFY_VALUES),
  formula: z.string().optional(),
});
export type PolicyEntry = z.infer<typeof PolicyEntrySchema>;

/**
 * The whole `versions-policy.json`: a map of tool slug → policy entry. `strict()`
 * on each entry (via the object schema above) rejects unknown keys inside an
 * entry; an out-of-range `notify` value fails the enum. This is the build-STOP
 * gate for site-authored data.
 */
export const VersionsPolicySchema = z.record(z.string(), PolicyEntrySchema);
export type VersionsPolicy = z.infer<typeof VersionsPolicySchema>;

/** One published tool row in the manifest. */
export interface ManifestTool {
  latest: string;
  notify: Notify;
  formula: string;
}

/** The full manifest object emitted as `versions.json`. */
export interface Manifest {
  schema: typeof MANIFEST_SCHEMA;
  generated_at: string;
  tools: Record<string, ManifestTool>;
}

/**
 * Strip a single leading `v` from a version string — the inverse of
 * `version.ts`'s display `normalizeVersion` (which PREPENDS `v`). The manifest
 * contract advertises bare versions (`"3.7.4"`), because the envelopes are
 * inconsistent — fab/tu emit `"2.15.4"`, wt/hop/idea/run-kit/shll emit
 * `"v0.1.1"`. Idempotent; a bare version is returned untouched.
 */
export function stripVersionPrefix(version: string): string {
  return version.startsWith('v') ? version.slice(1) : version;
}

/**
 * Read and strict-parse `<repoRoot>/versions-policy.json`. Throws on a missing
 * file, malformed JSON, or schema-invalid content — the site-authored-data
 * build-STOP posture (the inverse of the pulled-envelope skip-degrade). The
 * caller (the endpoint) lets the throw fail `astro build`.
 */
export function readPolicy(repoRoot: string): VersionsPolicy {
  const raw = fs.readFileSync(path.join(repoRoot, 'versions-policy.json'), 'utf8');
  return VersionsPolicySchema.parse(JSON.parse(raw));
}

/**
 * Build the versions manifest from the committed envelopes + the policy.
 *
 * The policy's keys are the ROSTER: each declared slug is looked up in
 * `<repoRoot>/help/<slug>.json`. A tool whose envelope is MISSING (ENOENT) or
 * schema-INVALID skip-degrades — it is omitted from `tools` and the build
 * continues (pulled-data posture, mirroring `/llms.txt` `toolShort`). Present,
 * valid tools get a `{ latest, notify, formula }` row.
 *
 * `now` is injectable so tests can pin `generated_at`; it defaults to the build
 * moment.
 */
export function buildManifest(
  repoRoot: string,
  policy: VersionsPolicy,
  now: Date = new Date(),
): Manifest {
  const tools: Record<string, ManifestTool> = {};

  for (const [slug, entry] of Object.entries(policy)) {
    let rawEnvelope: string;
    try {
      rawEnvelope = fs.readFileSync(path.join(repoRoot, 'help', `${slug}.json`), 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') continue; // missing → skip-degrade
      throw err;
    }

    // Present-but-invalid pulled data ALSO skip-degrades (safeParse, not parse) —
    // deliberately distinct from `versions-policy.json`, which build-stops.
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawEnvelope);
    } catch {
      continue; // malformed JSON → skip-degrade
    }
    const result = HelpDocSchema.safeParse(parsedJson);
    if (!result.success) continue; // schema-invalid → skip-degrade

    tools[slug] = {
      latest: stripVersionPrefix(result.data.version),
      notify: entry.notify,
      formula: entry.formula ?? slug,
    };
  }

  return {
    schema: MANIFEST_SCHEMA,
    generated_at: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    tools,
  };
}
