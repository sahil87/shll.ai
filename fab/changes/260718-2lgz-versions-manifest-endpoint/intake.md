# Intake: Versions Manifest Endpoint

**Change**: 260718-2lgz-versions-manifest-endpoint
**Created**: 2026-07-19

## Origin

Conversational — a `/fab-discuss` session in the run-kit repo on toolkit update notifications, then `/fab-draft` (this intake was drafted cross-repo from that session; its sibling is run-kit change `260718-d15e-toolkit-manifest-update-notifications`). The user's asks that shaped this side:

> right now there is no way to remind the user to update the whole of the shll kit.

> "shll changelog" or "gh release" will soon start hitting rate limits. Should this then be a page on shll.ai meant for this? That lists the latest version of each tool, which then goes through the above logic, to decide if it's worth it to show an update notification.

> for 3 - the mechanism that pulls the latest help json files, can be mechanism to update the manifest.

Decisions reached in discussion: shll.ai publishes a **static version manifest** (`versions.json`) listing each toolkit tool's latest version; the data source is the **already-committed `help/*.json` envelopes** (the daily `refresh-help.yml` puller brew-installs every tool and captures envelopes that carry `version`); the per-tool **notify policy rides in the manifest** so the consumer (run-kit's update checker) applies policy without shipping binaries — tuning policy is editing a data file here. The user's seed policy example: run-kit / fab-kit notify on **minor**, tu / wt / idea / hop on **patch**.

## Why

1. **Consumer need**: run-kit's daemon is the toolkit's only passive notification surface (the only tool with a daemon + UI). Its sibling change repoints `internal/updatecheck` from the GitHub Releases API to `https://shll.ai/versions.json`. Without this manifest, there is no toolkit-wide "you're stale" signal anywhere.
2. **Why shll.ai and not GitHub polling**: one static CDN fetch instead of 7 unauthenticated GitHub API calls per consumer (datacenter IPs get throttled aggressively); the roster lives here, not hardcoded in consumers; and the envelopes are captured from **brew-installed** binaries, so the manifest advertises exactly what `shll update` (brew-based) can actually deliver — a GitHub release that hasn't hit the tap yet is correctly invisible.
3. **Why policy-in-manifest**: notify thresholds compiled into a consumer binary can only be tuned by shipping an update through the very channel being tuned. A hand-edited policy file here propagates to every deployed daemon within one poll cycle (~6h).
4. **Zero new infrastructure**: the pull mechanism (daily `refresh-help.yml` capture → direct commit → `workflow_dispatch` of `deploy.yml`) and the render mechanism (Astro static endpoints reading repo-root `help/*.json` at build time — the `llms.txt.ts` / `VersionTable.astro` pattern) both already exist. This change is a thin derivation over them.

## What Changes

### 1. New static endpoint: `sites/astro-starlight-terminal1/src/pages/versions.json.ts`

An Astro static file endpoint (same idiom as the existing `src/pages/llms.txt.ts` / `llms-full.txt.ts`) emitting `application/json` at build time, served at `https://shll.ai/versions.json`. Static-first (Constitution I): built from committed data, no runtime, no server.

Output shape (the cross-repo contract — additive evolution under `"schema": 1`):

```json
{
  "schema": 1,
  "generated_at": "2026-07-19T07:20:00Z",
  "tools": {
    "shll":    { "latest": "0.1.5",  "notify": "patch", "formula": "shll" },
    "wt":      { "latest": "0.1.3",  "notify": "patch", "formula": "wt" },
    "idea":    { "latest": "0.1.1",  "notify": "patch", "formula": "idea" },
    "tu":      { "latest": "0.9.1",  "notify": "patch", "formula": "tu" },
    "run-kit": { "latest": "3.8.0",  "notify": "minor", "formula": "run-kit" },
    "hop":     { "latest": "0.2.1",  "notify": "patch", "formula": "hop" },
    "fab-kit": { "latest": "2.16.1", "notify": "minor", "formula": "fab-kit" }
  }
}
```

Derivation rules:

- **Keys are file slugs** (`help/<slug>.json` filenames) — these equal the shll roster names and the Homebrew formula names for all 7 tools. They are NOT the envelope's `tool` field, which is the *binary* name (`fab` for fab-kit — the slug/formula/binary three-name distinction documented in `refresh-help.yml`; conflating them is a known real bug class).
- **`latest`** = the envelope's `version`, normalized to no leading `v` via the existing shared `normalizeVersion` (`src/lib/version.ts` — the same helper `VersionTable.astro` uses). Envelopes store e.g. `"v3.7.4"`.
- **`notify`** = looked up from the policy file (§2). Allowed values: `"never"` | `"patch"` | `"minor"` (consumer semantics: `never` = never triggers; `patch` = any increase; `minor` = minor-or-major increase, patch suppressed).
- **`formula`** = the Homebrew formula name, defaulting to the slug; the policy file MAY override per tool if a slug/formula divergence ever appears.
- **`generated_at`** = build timestamp (ISO 8601 UTC).
- **Per-tool skip-degrade**: a missing or Zod-invalid envelope omits that tool's row (mirrors the help-collection per-tool failure isolation and the historical absent-`help/tu.json` state — NOT `VersionTable`'s build-stop posture). A tool present in the policy file but missing an envelope is skipped the same way. Consumer semantics make omission safe: run-kit treats an absent row as "never matches". Envelope parsing reuses the shared Zod contract (`src/lib/schemas.ts`) — do not hand-parse.

### 2. New repo-root policy file: `versions-policy.json`

Hand-edited, project-level data at the repo root (a sibling of `help/`, NOT inside it — `refresh-help.yml`'s staleness gate and the validator glob `help/*.json` and must not see a non-envelope file):

```json
{
  "run-kit": { "notify": "minor" },
  "fab-kit": { "notify": "minor" },
  "shll":    { "notify": "patch" },
  "tu":      { "notify": "patch" },
  "wt":      { "notify": "patch" },
  "idea":    { "notify": "patch" },
  "hop":     { "notify": "patch" }
}
```

Seed values per the user's example (run-kit/fab-kit minor; the small tools patch; shll defaulted to patch — small-tool class). These are deliberately **data, not design**: tuning them is a one-line commit here, picked up by deployed daemons within a poll cycle. An optional per-tool `"formula"` key overrides the slug-defaulted formula. The endpoint validates the file with a small Zod schema (unknown tool keys and invalid `notify` values fail the build — this file is site-authored data, so build-stop is the correct posture for it, unlike pulled envelopes).

### 3. Freshness cascade (no workflow changes needed)

`refresh-help.yml` (daily 07:13 UTC + on-demand) commits fresh envelopes and dispatches `deploy.yml` on a real commit; the deploy rebuild regenerates `versions.json` from the fresh envelopes. Editing `versions-policy.json` on main triggers `deploy.yml` via its normal `on: push`. Worst-case consumer-visible latency: ~24h capture lag + consumer's 6h poll — acceptable for update reminders; a tool release wanting faster propagation can already `workflow_dispatch` the refresh manually. **No change to either workflow.**

### 4. New spec: `docs/specs/versions-manifest-contract.md`

The cross-repo contract document (sibling of `help-dump-contract.md` / `readme-extraction-contract.md`): the output schema above, the `notify` semantics, the slug-keying + `formula` rule, normalization (no leading `v`), skip-degrade behavior, the freshness cascade, and the consumer contract (run-kit's `internal/updatecheck` — how it matches and what it does with the result). Also records the **live-site-swap obligation**: `versions.json` is part of shll.ai's public surface, so any future site promoted via `SITE_DIR` (Constitution III) must implement the endpoint — the spec is where the next site's author discovers that.

### 5. Verification

- `pnpm build` in the live site, then assert `dist/versions.json` exists, parses, carries all 7 tools with non-empty normalized `latest` and valid `notify`, and `generated_at` is present.
- A unit-style check (or build assertion) for skip-degrade: an envelope removed from a fixture set yields a manifest without that row, build still green.

## Affected Memory

- `conventions/versions-manifest`: (new) — the manifest derivation (slug keying, policy merge, skip-degrade), the contract pointer, consumer notes
- `build-deploy/deployment`: (modify) — `versions.json` joins the build outputs; freshness rides the existing refresh→deploy cascade
- `conventions/help-collection`: (modify) — note the manifest as a second downstream consumer of the captured envelopes

## Impact

- **New files**: `sites/astro-starlight-terminal1/src/pages/versions.json.ts`, `versions-policy.json` (repo root), `docs/specs/versions-manifest-contract.md`, plus a small policy Zod schema (likely in `src/lib/`).
- **Touched**: `docs/specs/index.md` (new spec row). No workflow edits, no new dependencies (Constitution VI — Zod and the envelope readers already exist), no runtime (Constitution I).
- **Cross-repo**: consumed by run-kit change `260718-d15e-toolkit-manifest-update-notifications`. Merge order is free: this change shipping first simply activates the consumer; shipping second means the consumer's fetch 404s and its chip stays hidden (its stale-while-revalidate handles it).

## Open Questions

- None blocking.

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Manifest lives on shll.ai and derives from the committed `help/*.json` envelopes via the existing puller cascade | Discussed — user proposed both the page and the puller piggyback | S:95 R:85 A:90 D:90 |
| 2 | Certain | Per-tool notify policy rides in the manifest; values owned by this repo's hand-edited policy file | Discussed — the user's reversibility requirement drove it | S:85 R:90 A:85 D:85 |
| 3 | Certain | Implementation = Astro static file endpoint in the live site (the `llms.txt.ts` idiom), zero new deps, zero workflow changes | Constitution I/VI + the established endpoint pattern; backlog 354p documents the idiom as the blessed shape | S:80 R:90 A:95 D:90 |
| 4 | Confident | Seed policy: run-kit/fab-kit `minor`; tu/wt/idea/hop `patch`; shll `patch` | User gave the first six as "one example"; shll inferred into the small-tool class; data-only to tune | S:70 R:95 A:80 D:75 |
| 5 | Confident | Policy file at repo root as `versions-policy.json` (NOT inside `help/` — the staleness gate and validator glob `help/*.json`) | Placement mirrors `help/` as project-level data; the glob hazard is verified in `refresh-help.yml` | S:55 R:90 A:85 D:80 |
| 6 | Confident | Manifest keys = file slugs (== roster == formula names today); `formula` field explicit with optional policy override; envelope `tool` (binary name) never used as a key | The three-name distinction is documented in `refresh-help.yml` as a real bug class; slug keying matches what `shll update` argv needs | S:60 R:85 A:90 D:85 |
| 7 | Confident | Pulled-envelope failures skip-degrade (omit the row); policy-file invalidity build-stops | Mirrors help-collection per-tool isolation for pulled data vs. site-authored-data strictness; consumer treats absent rows as never-match | S:55 R:85 A:85 D:80 |
| 8 | Confident | `latest` normalized to no leading `v` via the shared `normalizeVersion` | Envelopes store `v`-prefixed versions; consumer also strips defensively — normalizing at the producer keeps the contract clean | S:60 R:90 A:90 D:85 |
| 9 | Confident | New `versions-manifest-contract.md` spec records the contract + the live-site-swap obligation | Matches the repo's existing cross-repo contract-spec pattern (help-dump, readme-extraction) | S:65 R:90 A:90 D:85 |

9 assumptions (3 certain, 6 confident, 0 tentative, 0 unresolved).
