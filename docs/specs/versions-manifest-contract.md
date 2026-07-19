# Spec: `versions.json` manifest contract

**Status**: Active
**Created**: 2026-07-19 (change `2lgz`)
**Schema anchor**: [`sites/astro-starlight-terminal1/src/lib/versions-manifest.ts`](../../sites/astro-starlight-terminal1/src/lib/versions-manifest.ts)
**Endpoint**: [`sites/astro-starlight-terminal1/src/pages/versions.json.ts`](../../sites/astro-starlight-terminal1/src/pages/versions.json.ts) → `https://shll.ai/versions.json`
**Policy source**: `versions-policy.json` (repo root)
**Consumed by**: run-kit `internal/updatecheck` (change `260718-d15e-toolkit-manifest-update-notifications`); [`docs/memory/conventions/versions-manifest.md`](../memory/conventions/versions-manifest.md)

## Overview

This is the cross-repo contract for the **versions manifest** shll.ai publishes at `https://shll.ai/versions.json` — a static JSON document listing each toolkit tool's latest version plus a per-tool notify policy. It is the version-and-policy sibling of [`help-dump-contract.md`](./help-dump-contract.md) (the command-reference contract) and [`readme-extraction-contract.md`](./readme-extraction-contract.md) (the README-prose contract).

**Why it exists**: run-kit's daemon is the toolkit's only passive notification surface. Its update checker repoints from 7 unauthenticated GitHub Releases API calls to one static CDN fetch of `versions.json` (datacenter IPs get throttled aggressively; the roster lives here, not hardcoded in consumers). The envelopes are captured from **brew-installed** binaries, so the manifest advertises exactly what `shll update` (brew-based) can actually deliver — a GitHub release that has not hit the tap yet is correctly invisible.

**Static-first (Constitution I)**: the endpoint is a build-time Astro static file endpoint (the `llms.txt.ts` idiom) — no SSR, no runtime, no server. It reads the already-committed repo-root data at build time. **Zero new deps (Constitution VI)**: Zod (via `astro:content`) and the envelope readers already exist.

**Two data sources, both at the repo root**:
- `help/<slug>.json` — the daily-refreshed help envelopes (the [help-collection](../memory/conventions/help-collection.md) pull side). The manifest reads their `version`.
- `versions-policy.json` — the hand-edited per-tool notify policy (this spec, §Policy file).

The schema is defined in exactly **two** places — this spec (prose) and `versions-manifest.ts` (code, the machine-checkable anchor). They MUST agree; on any discrepancy, `versions-manifest.ts` is authoritative for machine validation.

## §1 Output schema

The endpoint emits a single JSON object (`application/json; charset=utf-8`), pretty-printed. Additive evolution under `"schema": 1`.

```jsonc
{
  "schema": 1,
  "generated_at": "2026-07-19T07:20:00Z",
  "tools": {
    "shll":    { "latest": "0.1.2",  "notify": "patch", "formula": "shll" },
    "wt":      { "latest": "0.1.1",  "notify": "minor", "formula": "wt" },
    "idea":    { "latest": "0.1.1",  "notify": "minor", "formula": "idea" },
    "tu":      { "latest": "0.9.1",  "notify": "minor", "formula": "tu" },
    "run-kit": { "latest": "3.7.4",  "notify": "minor", "formula": "run-kit" },
    "hop":     { "latest": "0.2.1",  "notify": "minor", "formula": "hop" },
    "fab-kit": { "latest": "2.15.4", "notify": "minor", "formula": "fab-kit" }
  }
}
```

- **`schema`** — integer contract revision. Always `1` for this revision. A breaking change bumps it.
- **`generated_at`** — the build timestamp, ISO-8601 UTC (`YYYY-MM-DDTHH:MM:SSZ`).
- **`tools`** — a map of tool **slug** → row. Only present, valid tools appear (§4 skip-degrade); order is not significant.

### GIVEN/WHEN/THEN

- **Well-formed manifest** — GIVEN the committed envelopes + policy; WHEN the site builds; THEN `dist/versions.json` is valid JSON with `schema === 1`, an ISO-8601 UTC `generated_at`, and a `tools` map.

## §2 Row derivation

Each `tools[slug]` row carries three fields:

- **`latest`** = the envelope's `version`, normalized to **no leading `v`** (§3). Envelopes are inconsistent — `fab`/`tu` emit `"2.15.4"`, `wt`/`hop`/`idea`/`run-kit`/`shll` emit `"v0.1.1"`.
- **`notify`** = looked up from `versions-policy.json` (§Policy file). One of `"never" | "patch" | "minor"`.
- **`formula`** = the Homebrew formula name, **defaulting to the slug**; the policy file MAY override it per tool via an optional `"formula"` key (for a future slug/formula divergence).

**Keys are file slugs** — the `help/<slug>.json` filename, which equals the shll roster name and the Homebrew formula name for all 7 tools today. They are **NOT** the envelope's `tool` field (the *binary* name — `fab` for slug `fab-kit`). The slug/formula/binary three-name distinction is documented in `refresh-help.yml`; conflating them is a known real bug class. `help/fab-kit.json` carries binary `fab`, but the manifest key stays `fab-kit`.

### GIVEN/WHEN/THEN

- **Slug keying, not binary name** — GIVEN `help/fab-kit.json` whose envelope `tool` is `"fab"`; WHEN the manifest is built; THEN the row key is `"fab-kit"` (the slug), never `"fab"`.
- **Formula default + override** — GIVEN a policy entry with no `formula`; WHEN the row is built; THEN `formula` is the slug. GIVEN a policy entry with `"formula": "x"`; THEN `formula` is `"x"`.

## §3 Version normalization

`latest` SHALL strip a single leading `v` from the envelope `version` (`"v3.7.4"` → `"3.7.4"`; `"2.15.4"` → `"2.15.4"`). The transform is idempotent. This is the inverse of the site's display helper `src/lib/version.ts` `normalizeVersion` (which *prepends* `v` for the `$ shll version` block); the manifest is a machine contract, so it advertises bare versions. A consumer also strips defensively, but normalizing at the producer keeps the contract clean.

### GIVEN/WHEN/THEN

- **v-strip** — GIVEN an envelope `version` of `"v3.7.4"`; WHEN the row is built; THEN `latest` is `"3.7.4"`. GIVEN `"2.15.4"`; THEN `latest` is `"2.15.4"` unchanged.

## §4 Failure isolation — two opposite postures

The manifest mixes **pulled** data (the envelopes) and **site-authored** data (the policy), and they degrade oppositely — the same split help-collection draws.

- **Pulled envelope → SKIP-DEGRADE.** A tool whose `help/<slug>.json` is **missing** (ENOENT), **malformed JSON**, or **schema-invalid** (`HelpDocSchema.safeParse` fails) is **omitted** from `tools`, and the build **continues**. This mirrors the `/llms.txt` posture and the help-collection per-tool isolation — NOT `VersionTable`'s build-stop. A tool declared in the policy but missing an envelope is skipped the same way. Consumer semantics make omission safe: run-kit treats an absent row as "never matches". Envelope parsing reuses the shared `HelpDocSchema` (`src/lib/schemas.ts`) — never hand-parsed.
- **Site-authored policy → BUILD-STOP.** An invalid `versions-policy.json` (unknown `notify` value, malformed entry, missing file, or bad JSON) **fails `astro build`**. Site data is authored in this repo, so a defect is a bug to fix up front, not to ship silently.

### GIVEN/WHEN/THEN

- **Missing/invalid envelope skip-degrades** — GIVEN a policy tool whose envelope is absent or fails `HelpDocSchema`; WHEN the manifest is built; THEN that tool has no row and the build succeeds with the rest.
- **Invalid policy build-stops** — GIVEN a `versions-policy.json` with a `notify` outside `{never, patch, minor}`; WHEN the site builds; THEN `astro build` fails non-zero.

## §Policy file — `versions-policy.json`

Hand-edited, project-level data at the **repo root** (a sibling of `help/`, **NOT** inside it — `refresh-help.yml`'s staleness gate and `validate-help.mjs` glob `help/*.json` and must not see a non-envelope file). It maps each tool slug to a policy entry:

```json
{
  "run-kit": { "notify": "minor" },
  "fab-kit": { "notify": "minor" },
  "shll":    { "notify": "patch" },
  "tu":      { "notify": "minor" },
  "wt":      { "notify": "minor" },
  "idea":    { "notify": "minor" },
  "hop":     { "notify": "minor" }
}
```

- **The policy file is the manifest ROSTER**: only tools declared here are advertised. A tool with no policy has no notify semantics, so it does not appear.
- **`notify`** (required) — one of `"never" | "patch" | "minor"`.
- **`formula`** (optional) — overrides the slug-defaulted Homebrew formula name.

These values are deliberately **data, not design**: tuning them is a one-line commit here, picked up by deployed daemons within a poll cycle. Seed values (per the design discussion): `run-kit`/`fab-kit` → `minor`; the small tools (`shll`/`tu`/`wt`/`idea`/`hop`) → `patch`.

## §Consumer contract — `notify` semantics

The consumer (run-kit `internal/updatecheck`) fetches `versions.json`, compares each `latest` against the locally-installed version, and applies the tool's `notify` threshold to decide whether to surface an update notification:

| `notify` | Triggers a notification when… |
|----------|-------------------------------|
| `"never"` | never — the tool is muted regardless of version delta |
| `"patch"` | any version increase (patch, minor, or major) |
| `"minor"` | a minor-or-major increase; a patch-only increase is suppressed |

An **absent** row (a tool the manifest omits via §4 skip-degrade, or one not in the policy) is treated by the consumer as **never matches** — so omission is always safe. The consumer strips a leading `v` defensively but the producer already normalizes (§3).

## §Freshness cascade (no workflow changes)

The manifest rides the **existing** refresh→deploy cascade — **no change to any workflow**:

- `refresh-help.yml` (daily 07:13 UTC + `workflow_dispatch`) commits fresh envelopes and dispatches `deploy.yml` on a real commit; the deploy rebuild regenerates `versions.json` from the fresh envelopes.
- Editing `versions-policy.json` on `main` triggers `deploy.yml` via its normal `on: push`.

Worst-case consumer-visible latency: ~24h capture lag + the consumer's poll interval — acceptable for update reminders. A tool release wanting faster propagation can already `workflow_dispatch` the refresh manually. See [build-deploy/deployment](../memory/build-deploy/deployment.md) for the cascade mechanics (`xs1j` dispatch fix).

## §Live-site-swap obligation (Constitution III)

`versions.json` is part of shll.ai's **public surface** (a documented cross-repo contract with a live consumer). Under [Constitution III](../../fab/project/constitution.md) (One Live Site at a Time), swapping which site is live via `SITE_DIR` is a one-line PR — but any future site promoted to live **MUST reimplement this endpoint** (and the `/llms.txt` / `/llms-full.txt` / `CommandReference` surfaces likewise), or the consumer's fetch 404s. The repo-root data (`help/*.json`, `versions-policy.json`) survives the swap by design; the *rendering* is site-owned and must be carried forward. This spec is where the next site's author discovers the obligation.

## §Schema reference

The machine-checkable definitions live in `versions-manifest.ts`:
- `VersionsPolicySchema` / `PolicyEntrySchema` — the `versions-policy.json` shape (build-stop gate).
- `MANIFEST_SCHEMA` (=== 1), `NOTIFY_VALUES`, and the `Manifest` / `ManifestTool` types — the output shape.
- `buildManifest` / `readPolicy` / `stripVersionPrefix` — the derivation logic, unit-pinned by `scripts/versions-manifest.test.mjs`.

Envelope validation reuses `HelpDocSchema` from `src/lib/schemas.ts` (the single help-dump anchor) — this contract adds no second envelope shape.

### GIVEN/WHEN/THEN

- **Anchor agreement** — GIVEN this prose contract and `versions-manifest.ts`; WHEN they disagree on the manifest/policy shape; THEN `versions-manifest.ts` is authoritative and this prose is corrected to match.

## Changelog

- **2026-07-19 (change `2lgz`)**: Initial contract. The `versions.json` endpoint, `versions-policy.json`, slug-keying + `formula` rule, `v`-strip normalization, the pulled-skip-degrade / site-authored-build-stop split, the `notify` consumer semantics, the freshness cascade (no workflow change), and the live-site-swap obligation. Consumed by run-kit change `260718-d15e`.
