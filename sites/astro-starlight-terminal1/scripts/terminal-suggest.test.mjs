/**
 * Unit test for `src/lib/terminal-suggest.ts` (change cuur). Run with the
 * site's Node toolchain (>=22, native `.ts` type-stripping), mirroring how
 * `scripts/extract-readme.test.mjs` runs:
 *
 *   cd sites/astro-starlight-terminal1
 *   node --test scripts/terminal-suggest.test.mjs
 *
 * Pins the suggester contract the homepage terminal island relies on:
 *   - adjacent transposition costs 1 edit (OSA Damerau-Levenshtein), so the
 *     classic typo class (`hlep` → `help`) is suggested;
 *   - the short-input clamp: inputs ≤3 chars get a max distance of 1, so
 *     `vi` never "corrects" to an unrelated 2-edit command;
 *   - tie-break: lowest distance, then candidate iteration order;
 *   - no candidate within threshold → null (the caller keeps its existing
 *     `type 'help'` tail);
 *   - the acceptance pair `instal` → `install`;
 *   - hidden easter eggs are valid candidates (`forune` → `fortune`).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { damerauLevenshtein, suggestCommand } from '../src/lib/terminal-suggest.ts';

// Mirrors Object.keys(COMMANDS) in TerminalPrompt.astro — listed commands AND
// hidden eggs, in declaration order (the suggester's tie-break order).
const COMMAND_KEYS = [
  'help', 'ls', 'cd', 'open', 'install', 'version', 'theme', 'history',
  'clear', 'whoami', 'sudo', 'echo', 'man', 'shll', 'sl', 'fortune',
  'exit', ':q',
];

// ── damerauLevenshtein ───────────────────────────────────────────────────────

test('distance: adjacent transposition costs 1 (hlep → help)', () => {
  assert.equal(damerauLevenshtein('hlep', 'help'), 1);
  assert.equal(damerauLevenshtein('verison', 'version'), 1);
});

test('distance: classic Levenshtein cases', () => {
  assert.equal(damerauLevenshtein('', ''), 0);
  assert.equal(damerauLevenshtein('help', 'help'), 0);
  assert.equal(damerauLevenshtein('', 'cd'), 2); // pure insertions
  assert.equal(damerauLevenshtein('instal', 'install'), 1); // one insertion
  assert.equal(damerauLevenshtein('cat', 'cut'), 1); // one substitution
  assert.equal(damerauLevenshtein('kitten', 'sitting'), 3); // the textbook case
});

// ── suggestCommand ───────────────────────────────────────────────────────────

test('suggest: transposition typo finds the command (hlep → help)', () => {
  assert.equal(suggestCommand('hlep', COMMAND_KEYS), 'help');
});

test('suggest: acceptance pair instal → install', () => {
  assert.equal(suggestCommand('instal', COMMAND_KEYS), 'install');
});

test('suggest: hidden eggs are candidates (forune → fortune)', () => {
  assert.equal(suggestCommand('forune', COMMAND_KEYS), 'fortune');
});

test('suggest: short-input clamp — ≤3 chars allows distance 1 only', () => {
  // `vi` is 2 edits from `cd`/`ls` etc. — must NOT match at the clamped threshold.
  assert.equal(suggestCommand('vi', COMMAND_KEYS), null);
  // ...but a genuine 1-edit short typo still resolves.
  assert.equal(suggestCommand('lss', COMMAND_KEYS), 'ls');
});

test('suggest: inputs >3 chars allow distance 2', () => {
  assert.equal(suggestCommand('hellp', COMMAND_KEYS), 'help'); // distance 1
  assert.equal(suggestCommand('halpp', COMMAND_KEYS), 'help'); // distance 2
});

test('suggest: no candidate within threshold → null', () => {
  assert.equal(suggestCommand('xyzzy', COMMAND_KEYS), null);
  assert.equal(suggestCommand('banana', COMMAND_KEYS), null);
});

test('suggest: tie-break — equal distance, earlier candidate wins', () => {
  // 'aat' is distance 1 from both; declaration order decides.
  assert.equal(suggestCommand('aat', ['cat', 'bat']), 'cat');
  assert.equal(suggestCommand('aat', ['bat', 'cat']), 'bat');
});

test('suggest: lower distance beats earlier order', () => {
  // 'halt' (earlier) is 2 edits away; 'help' (later) is 1 — strictly closer wins.
  assert.equal(suggestCommand('hxlp', ['halt', 'help']), 'help');
});

test('suggest: input is lowercased before matching', () => {
  assert.equal(suggestCommand('HLEP', COMMAND_KEYS), 'help');
  assert.equal(suggestCommand('Instal', COMMAND_KEYS), 'install');
});
