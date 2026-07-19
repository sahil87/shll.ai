/**
 * Unit test for the pure/build-time helpers in `src/lib/versions-manifest.ts`
 * (change 2lgz). Run with the site's pnpm-installed Node toolchain (>=22, native
 * `.ts` type-stripping):
 *
 *   cd sites/astro-starlight-terminal1
 *   node --test scripts/versions-manifest.test.mjs
 *
 * `src/lib/versions-manifest.ts` imports `z` / `HelpDocSchema` from the
 * `astro:content` virtual module (only resolvable inside an Astro build), so —
 * exactly like `validate-help.mjs` / `llms.test.mjs` — we register the
 * `astro-content-alias.mjs` resolve hook (`astro:content` → `astro/zod`) before
 * importing the lib.
 *
 * `buildManifest`/`readPolicy` read from a repo-root layout (`help/*.json` +
 * `versions-policy.json`), so the tests build throwaway fixture roots under
 * `os.tmpdir()` rather than coupling to the live corpus (which the daily refresh
 * rots — the same reason the parse-help suite split off frozen fixtures).
 */
import { register } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Alias `astro:content` -> `astro/zod` before importing the lib. Must run first.
register('./astro-content-alias.mjs', import.meta.url);

const {
  stripVersionPrefix,
  VersionsPolicySchema,
  PolicyEntrySchema,
  readPolicy,
  buildManifest,
  MANIFEST_SCHEMA,
} = await import('../src/lib/versions-manifest.ts');

/** A minimal valid HelpDoc envelope (matches HelpDocSchema) for a given tool. */
function envelope(binary, version) {
  return {
    tool: binary,
    version,
    captured_at: '2026-07-19T07:20:00Z',
    schema_version: 1,
    root: { name: binary, path: binary, short: `${binary} short`, usage: '', text: '', commands: [] },
  };
}

/**
 * Build a throwaway repo-root under os.tmpdir() with a `help/` dir and a
 * `versions-policy.json`. `envelopes` is a map slug → (envelope object | raw
 * string | null); a null value writes no file (missing-envelope case). `policy`
 * is written verbatim as JSON.
 */
function makeRoot({ envelopes = {}, policy }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'versions-manifest-'));
  fs.mkdirSync(path.join(root, 'help'));
  for (const [slug, value] of Object.entries(envelopes)) {
    if (value === null) continue;
    const contents = typeof value === 'string' ? value : JSON.stringify(value);
    fs.writeFileSync(path.join(root, 'help', `${slug}.json`), contents);
  }
  if (policy !== undefined) {
    fs.writeFileSync(path.join(root, 'versions-policy.json'), JSON.stringify(policy));
  }
  return root;
}

// ── stripVersionPrefix (R3) ────────────────────────────────────────────────

test('stripVersionPrefix strips a single leading `v`', () => {
  assert.equal(stripVersionPrefix('v3.7.4'), '3.7.4');
});

test('stripVersionPrefix leaves a bare version untouched', () => {
  assert.equal(stripVersionPrefix('2.15.4'), '2.15.4');
});

test('stripVersionPrefix is idempotent', () => {
  const once = stripVersionPrefix('v0.1.1');
  assert.equal(stripVersionPrefix(once), once);
});

// ── VersionsPolicySchema (R6) ──────────────────────────────────────────────

test('VersionsPolicySchema accepts valid notify values and an optional formula', () => {
  const res = VersionsPolicySchema.safeParse({
    'run-kit': { notify: 'minor' },
    'fab-kit': { notify: 'minor', formula: 'fab-kit' },
    shll: { notify: 'patch' },
  });
  assert.ok(res.success, res.success ? '' : JSON.stringify(res.error.issues));
});

test('VersionsPolicySchema rejects an out-of-range notify value', () => {
  const res = VersionsPolicySchema.safeParse({ wt: { notify: 'major' } });
  assert.equal(res.success, false);
});

test('PolicyEntrySchema requires notify', () => {
  assert.equal(PolicyEntrySchema.safeParse({}).success, false);
  assert.equal(PolicyEntrySchema.safeParse({ notify: 'patch' }).success, true);
});

test('PolicyEntrySchema rejects unknown keys (build-stop on site-authored typo)', () => {
  // `.strict()` makes an unexpected key a hard failure, not a silent strip —
  // site-authored policy must build-stop on an unrecognized field.
  assert.equal(PolicyEntrySchema.safeParse({ notify: 'patch', bogus: true }).success, false);
  // Nested through the whole-file schema too, so a stray key anywhere fails.
  assert.equal(
    VersionsPolicySchema.safeParse({ wt: { notify: 'patch', typo: 'x' } }).success,
    false,
  );
});

// ── readPolicy (R6 — build-stop on invalid) ────────────────────────────────

test('readPolicy parses a valid policy file', () => {
  const root = makeRoot({ policy: { wt: { notify: 'patch' } } });
  const policy = readPolicy(root);
  assert.deepEqual(policy, { wt: { notify: 'patch' } });
});

test('readPolicy throws on an invalid policy file (build-stop posture)', () => {
  const root = makeRoot({ policy: { wt: { notify: 'nonsense' } } });
  assert.throws(() => readPolicy(root));
});

// ── buildManifest (R2/R3/R4/R7) ────────────────────────────────────────────

test('buildManifest builds a row per present, valid tool', () => {
  const policy = {
    'run-kit': { notify: 'minor' },
    wt: { notify: 'patch' },
    'fab-kit': { notify: 'minor' },
  };
  const root = makeRoot({
    policy,
    envelopes: {
      'run-kit': envelope('run-kit', 'v3.7.4'),
      wt: envelope('wt', 'v0.1.1'),
      'fab-kit': envelope('fab', '2.15.4'), // binary name differs from slug
    },
  });
  const now = new Date('2026-07-19T07:20:00.000Z');
  const manifest = buildManifest(root, policy, now);

  assert.equal(manifest.schema, MANIFEST_SCHEMA);
  assert.equal(manifest.generated_at, '2026-07-19T07:20:00Z');

  // Keyed by SLUG (fab-kit), not the envelope binary name (fab).
  assert.deepEqual(manifest.tools['fab-kit'], { latest: '2.15.4', notify: 'minor', formula: 'fab-kit' });
  // latest is bare (no leading v) for a v-prefixed envelope.
  assert.deepEqual(manifest.tools['run-kit'], { latest: '3.7.4', notify: 'minor', formula: 'run-kit' });
  assert.deepEqual(manifest.tools.wt, { latest: '0.1.1', notify: 'patch', formula: 'wt' });
});

test('buildManifest honors a per-tool formula override', () => {
  const policy = { hop: { notify: 'patch', formula: 'hop-cli' } };
  const root = makeRoot({ policy, envelopes: { hop: envelope('hop', 'v0.2.1') } });
  const manifest = buildManifest(root, policy, new Date('2026-07-19T00:00:00Z'));
  assert.equal(manifest.tools.hop.formula, 'hop-cli');
});

test('buildManifest skip-degrades a tool with a MISSING envelope', () => {
  const policy = { wt: { notify: 'patch' }, tu: { notify: 'patch' } };
  const root = makeRoot({
    policy,
    envelopes: { wt: envelope('wt', 'v0.1.1'), tu: null }, // tu missing
  });
  const manifest = buildManifest(root, policy, new Date('2026-07-19T00:00:00Z'));
  assert.ok('wt' in manifest.tools);
  assert.ok(!('tu' in manifest.tools), 'missing-envelope tool should be omitted');
});

test('buildManifest skip-degrades a tool with a SCHEMA-INVALID envelope (no throw)', () => {
  const policy = { wt: { notify: 'patch' }, idea: { notify: 'patch' } };
  const root = makeRoot({
    policy,
    envelopes: {
      wt: envelope('wt', 'v0.1.1'),
      idea: { tool: 'idea', version: 'v0.1.1' }, // missing schema_version/root → invalid
    },
  });
  const manifest = buildManifest(root, policy, new Date('2026-07-19T00:00:00Z'));
  assert.ok('wt' in manifest.tools);
  assert.ok(!('idea' in manifest.tools), 'schema-invalid tool should be omitted');
});

test('buildManifest skip-degrades a tool with MALFORMED JSON (no throw)', () => {
  const policy = { wt: { notify: 'patch' }, shll: { notify: 'patch' } };
  const root = makeRoot({
    policy,
    envelopes: { wt: envelope('wt', 'v0.1.1'), shll: '{ not valid json ' },
  });
  const manifest = buildManifest(root, policy, new Date('2026-07-19T00:00:00Z'));
  assert.ok('wt' in manifest.tools);
  assert.ok(!('shll' in manifest.tools), 'malformed-JSON tool should be omitted');
});
