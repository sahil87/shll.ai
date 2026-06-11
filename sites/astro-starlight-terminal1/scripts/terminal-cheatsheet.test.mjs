/**
 * Unit test for `src/lib/terminal-cheatsheet.ts` (change cdbr). Run with the
 * site's Node toolchain (>=22, native `.ts` type-stripping), mirroring how
 * `scripts/terminal-suggest.test.mjs` / `scripts/terminal-eggs.test.mjs` run:
 *
 *   cd sites/astro-starlight-terminal1
 *   node --test scripts/terminal-cheatsheet.test.mjs
 *
 * Pins the two pure-logic contracts the `cheatsheet` command relies on:
 *   - buildCheatsheet: the anti-drift coverage computation — full coverage
 *     yields no `uncategorized` group; an uncovered COMMANDS key lands in
 *     `uncategorized` (declaration order, never a silent omission); alias-of
 *     keys count as covered; stale group entries (keys no longer in COMMANDS)
 *     are dropped at render without crashing; `display` defaults to `key`;
 *   - chunkLine: greedy width-budget packing that never splits a token.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCheatsheet,
  chunkLine,
  UNCATEGORIZED,
} from '../src/lib/terminal-cheatsheet.ts';

// A miniature mirror of the island's shape: two groups, decorated displays,
// and alias-of declarations (the contract under test is the coverage/render
// mechanics, not the real roster).
const GROUPS = [
  {
    name: 'navigate',
    entries: [{ key: 'ls' }, { key: 'cd', display: 'cd <tool>' }, { key: 'open' }],
  },
  {
    name: 'classics',
    entries: [{ key: 'vim' }, { key: 'exit' }],
  },
];
const ALIASES = { vi: 'vim', ':q': 'exit' };
const FULL_ROSTER = ['ls', 'cd', 'open', 'vim', 'vi', 'exit', ':q'];

// ── buildCheatsheet: coverage ────────────────────────────────────────────────

test('full coverage → no uncategorized group', () => {
  const out = buildCheatsheet(GROUPS, ALIASES, FULL_ROSTER);
  assert.deepEqual(
    out.map((g) => g.name),
    ['navigate', 'classics'],
  );
});

test('an uncovered COMMANDS key lands in uncategorized — never a silent omission', () => {
  const out = buildCheatsheet(GROUPS, ALIASES, [...FULL_ROSTER, 'newcmd']);
  const last = out[out.length - 1];
  assert.equal(last.name, UNCATEGORIZED);
  assert.deepEqual(last.displays, ['newcmd']);
});

test('uncategorized lists bare keys in COMMANDS declaration order', () => {
  const out = buildCheatsheet(GROUPS, ALIASES, ['zeta', ...FULL_ROSTER, 'alpha']);
  const last = out[out.length - 1];
  assert.equal(last.name, UNCATEGORIZED);
  assert.deepEqual(last.displays, ['zeta', 'alpha']); // declaration order, not sorted
});

test('alias-of keys are covered by their primary — never flagged missing', () => {
  // vi and :q appear in no group entry; only the alias declaration covers them.
  const out = buildCheatsheet(GROUPS, ALIASES, FULL_ROSTER);
  assert.ok(!out.some((g) => g.name === UNCATEGORIZED));
  // And they never display on their own either.
  const allDisplays = out.flatMap((g) => g.displays);
  assert.ok(!allDisplays.includes('vi'));
  assert.ok(!allDisplays.includes(':q'));
});

test('without the alias declarations, alias keys WOULD surface in uncategorized', () => {
  // The inverse pin: the alias map is what keeps vi/:q out of the catch-all.
  const out = buildCheatsheet(GROUPS, {}, FULL_ROSTER);
  const last = out[out.length - 1];
  assert.equal(last.name, UNCATEGORIZED);
  assert.deepEqual(last.displays, ['vi', ':q']);
});

// ── buildCheatsheet: stale-entry tolerance ───────────────────────────────────

test('a stale group entry (key no longer in COMMANDS) is dropped at render', () => {
  const roster = FULL_ROSTER.filter((k) => k !== 'open'); // `open` removed
  const out = buildCheatsheet(GROUPS, ALIASES, roster);
  const navigate = out.find((g) => g.name === 'navigate');
  assert.ok(navigate);
  assert.deepEqual(navigate.displays, ['ls', 'cd <tool>']); // no crash, no ghost
});

test('a group whose entries are all stale is omitted entirely (no orphan header)', () => {
  const out = buildCheatsheet(GROUPS, ALIASES, ['ls', 'cd', 'open']);
  assert.deepEqual(
    out.map((g) => g.name),
    ['navigate'], // classics (vim, exit) fully stale → gone
  );
});

// ── buildCheatsheet: display strings ─────────────────────────────────────────

test('display defaults to the key, and decorates when given', () => {
  const out = buildCheatsheet(GROUPS, ALIASES, FULL_ROSTER);
  const navigate = out.find((g) => g.name === 'navigate');
  assert.deepEqual(navigate.displays, ['ls', 'cd <tool>', 'open']);
});

// ── chunkLine ────────────────────────────────────────────────────────────────

test('chunkLine: tokens within the budget join on one line', () => {
  assert.deepEqual(chunkLine(['aa', 'bb', 'cc'], ' · ', 20), ['aa · bb · cc']);
});

test('chunkLine: a join landing exactly on the budget stays on the line', () => {
  // 'aa · bb' is 7 chars — at maxWidth 7 it fits, at 6 it wraps.
  assert.deepEqual(chunkLine(['aa', 'bb'], ' · ', 7), ['aa · bb']);
  assert.deepEqual(chunkLine(['aa', 'bb'], ' · ', 6), ['aa', 'bb']);
});

test('chunkLine: wraps greedily at the width budget', () => {
  assert.deepEqual(chunkLine(['aaa', 'bbb', 'ccc', 'ddd'], ' · ', 10), [
    'aaa · bbb', // 9 ≤ 10; adding ' · ccc' would hit 15
    'ccc · ddd',
  ]);
});

test('chunkLine: never splits a token — an over-budget token gets its own line', () => {
  assert.deepEqual(chunkLine(['short', 'extraordinarily-long-token', 'tail'], ' · ', 10), [
    'short',
    'extraordinarily-long-token',
    'tail',
  ]);
});

test('chunkLine: empty input yields no lines', () => {
  assert.deepEqual(chunkLine([], ' · ', 74), []);
});

test('chunkLine: reproduces the approved preview chunking at the island budget (74)', () => {
  // The classics group's displayed entries — the intake preview's first line
  // ends at `sl` (74 joined chars exactly) and the rest wraps. Pins the budget
  // the user saw and approved.
  const classics = [
    'make plan', 'diff plan reality', 'tar', 'vim', 'emacs', 'nano', 'less',
    'yes', 'sl', 'tail -f agents.log', 'fortune', 'true', 'false', 'exit', 'shll',
  ];
  assert.deepEqual(chunkLine(classics, ' · ', 74), [
    'make plan · diff plan reality · tar · vim · emacs · nano · less · yes · sl',
    'tail -f agents.log · fortune · true · false · exit · shll',
  ]);
});
