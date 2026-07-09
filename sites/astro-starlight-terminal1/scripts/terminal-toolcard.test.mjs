/**
 * Unit test for `src/lib/terminal-toolcard.ts` (change 37ng). Run with the
 * site's Node toolchain (>=22, native `.ts` type-stripping), mirroring how
 * `scripts/terminal-cheatsheet.test.mjs` runs:
 *
 *   cd sites/astro-starlight-terminal1
 *   node --test scripts/terminal-toolcard.test.mjs
 *
 * Pins the pure-logic contracts the bare-tool-name cards rely on:
 *   - buildToolCard: the full card shape from a fixture doc (header, dim
 *     usage, blank, padded subs); name-column padding incl. the ≥col-width
 *     single-space case; short truncation with a trailing ellipsis at the
 *     76-char line budget (header clamped too); the subcommand cap with the
 *     `(+N more — see commands)` tail; zero-subcommand (tu) and
 *     missing-fields tolerance (empty doc → [] — the island's fallback cue);
 *   - the §2 normalizations: stripUsagePrefix (tu's `Usage:` carry-over) and
 *     stripToolPrefix (run-kit's `run-kit — ` doubling), both idempotent;
 *   - findSubcommand: hit / miss / case-insensitive lookup over commands[].
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildToolCard,
  findSubcommand,
  formatSubcommandLine,
  stripToolPrefix,
  stripUsagePrefix,
  TOOLCARD_LINE_WIDTH,
  TOOLCARD_NAME_COL,
  TOOLCARD_SUB_CAP,
} from '../src/lib/terminal-toolcard.ts';

// A miniature mirror of the slim payload's hop entry (real field shapes,
// trimmed roster — the contract under test is assembly mechanics).
const HOP_DOC = {
  short: 'locate, open, and operate on repos from hop.yaml.',
  usage: 'hop [flags]',
  commands: [
    { name: 'add', short: 'register on-disk repos into hop.yaml' },
    { name: 'clone', short: 'git clone the resolved repo, an ad-hoc URL, or all' },
    { name: 'ls', short: 'list all repos as aligned name/path columns' },
  ],
};

// ── buildToolCard: the full card shape ───────────────────────────────────────

test('full card shape: header, usage, blank, padded subs — from a fixture doc', () => {
  assert.deepEqual(buildToolCard('hop', HOP_DOC), [
    { kind: 'header', text: 'hop — locate, open, and operate on repos from hop.yaml.' },
    { kind: 'usage', text: 'usage: hop [flags]' },
    { kind: 'blank', text: '' },
    { kind: 'sub', text: '  add         register on-disk repos into hop.yaml' },
    { kind: 'sub', text: '  clone       git clone the resolved repo, an ad-hoc URL, or all' },
    { kind: 'sub', text: '  ls          list all repos as aligned name/path columns' },
  ]);
});

test('zero subcommands (tu): header + usage only — no blank, no (+0 more)', () => {
  const out = buildToolCard('tu', {
    short: 'AI coding assistant cost tracking CLI',
    usage: 'tu [source] [period] [display]',
    commands: [],
  });
  assert.deepEqual(out, [
    { kind: 'header', text: 'tu — AI coding assistant cost tracking CLI' },
    { kind: 'usage', text: 'usage: tu [source] [period] [display]' },
  ]);
});

// ── buildToolCard: padding ───────────────────────────────────────────────────

test('subcommand names pad to the name column (12) after the 2-space indent', () => {
  const [line] = chunk(buildToolCard('x', { commands: [{ name: 'add', short: 's' }] }));
  // 2-space indent + 'add' + 9 pad = the short starts at column 14.
  assert.equal(line, '  add' + ' '.repeat(TOOLCARD_NAME_COL - 3) + 's');
});

test('a name at/beyond the column width keeps a single separating space', () => {
  const out = buildToolCard('fab-kit', {
    commands: [
      { name: 'memory-index', short: 'twelve chars exactly' },
      { name: 'spawn-command', short: 'thirteen chars' },
    ],
  });
  assert.deepEqual(chunk(out), [
    '  memory-index twelve chars exactly',
    '  spawn-command thirteen chars',
  ]);
});

test('a subcommand with no short is just the indented name (no trailing pad)', () => {
  const out = buildToolCard('x', { commands: [{ name: 'lonely' }] });
  assert.deepEqual(chunk(out), ['  lonely']);
});

// ── buildToolCard: truncation at the width budget ────────────────────────────

test('an over-budget short truncates with a trailing ellipsis at 76 total chars', () => {
  const out = buildToolCard('x', {
    commands: [{ name: 'add', short: 'x'.repeat(100) }],
  });
  const [line] = chunk(out);
  assert.equal(line.length, TOOLCARD_LINE_WIDTH);
  assert.ok(line.endsWith('…'));
  assert.ok(line.startsWith('  add'));
});

test('the header is clamped to the same budget (idea-length shorts)', () => {
  const out = buildToolCard('idea', { short: 'y'.repeat(100) });
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'header');
  assert.equal(out[0].text.length, TOOLCARD_LINE_WIDTH);
  assert.ok(out[0].text.endsWith('…'));
  assert.ok(out[0].text.startsWith('idea — '));
});

test('lines within the budget are never touched', () => {
  const out = buildToolCard('hop', HOP_DOC);
  for (const ln of out) {
    assert.ok(ln.text.length <= TOOLCARD_LINE_WIDTH);
    assert.ok(!ln.text.endsWith('…'));
  }
});

// ── buildToolCard: the subcommand cap ────────────────────────────────────────

test('the cap truncates the listing and appends the (+N more) tail', () => {
  const commands = Array.from({ length: TOOLCARD_SUB_CAP + 9 }, (_, i) => ({
    name: `c${i + 1}`,
    short: `does thing ${i + 1}`,
  }));
  const out = buildToolCard('fab-kit', { short: 's', usage: 'fab', commands });
  const subs = out.filter((ln) => ln.kind === 'sub');
  assert.equal(subs.length, TOOLCARD_SUB_CAP);
  assert.deepEqual(out[out.length - 1], {
    kind: 'more',
    text: '  (+9 more — see commands)',
  });
});

test('exactly at the cap: no more-tail', () => {
  const commands = Array.from({ length: TOOLCARD_SUB_CAP }, (_, i) => ({
    name: `c${i + 1}`,
    short: 's',
  }));
  const out = buildToolCard('x', { commands });
  assert.ok(!out.some((ln) => ln.kind === 'more'));
  assert.equal(out.filter((ln) => ln.kind === 'sub').length, TOOLCARD_SUB_CAP);
});

test('subCap is overridable via opts', () => {
  const commands = [
    { name: 'a', short: 's' },
    { name: 'b', short: 's' },
    { name: 'c', short: 's' },
  ];
  const out = buildToolCard('x', { commands }, { subCap: 2 });
  assert.equal(out.filter((ln) => ln.kind === 'sub').length, 2);
  assert.equal(out[out.length - 1].text, '  (+1 more — see commands)');
});

// ── buildToolCard: missing-fields tolerance (the JSON boundary) ──────────────

test('an empty doc yields [] — the island falls back to SYNOPSIS + nav', () => {
  assert.deepEqual(buildToolCard('wt', {}), []);
});

test('short-only doc yields just the header', () => {
  assert.deepEqual(buildToolCard('wt', { short: 'worktrees' }), [
    { kind: 'header', text: 'wt — worktrees' },
  ]);
});

test('entries without a usable name are skipped, never a crash', () => {
  const out = buildToolCard('x', {
    commands: [{ short: 'nameless' }, null, { name: 'ok', short: 'fine' }, 42],
  });
  assert.deepEqual(chunk(out), ['  ok          fine']);
});

test('non-string short/usage fields degrade to omitted lines', () => {
  assert.deepEqual(buildToolCard('x', { short: 7, usage: ['no'] }), []);
});

// ── normalizations (§2 — pure transforms of json data, vn39-clean) ──────────

test("stripUsagePrefix removes tu's leading `Usage:` (case-insensitive, idempotent)", () => {
  assert.equal(
    stripUsagePrefix('Usage: tu [source] [period] [display]'),
    'tu [source] [period] [display]',
  );
  assert.equal(stripUsagePrefix('USAGE:   x'), 'x');
  assert.equal(stripUsagePrefix('tu [source]'), 'tu [source]'); // idempotent re-apply
});

test('buildToolCard re-applies the usage strip — no `usage: Usage:` doubling', () => {
  const out = buildToolCard('tu', { usage: 'Usage: tu [source] [period] [display]' });
  assert.deepEqual(out, [
    { kind: 'usage', text: 'usage: tu [source] [period] [display]' },
  ]);
});

test("stripToolPrefix removes run-kit's redundant `run-kit — ` (exact prefix only)", () => {
  assert.equal(
    stripToolPrefix('run-kit — tmux session manager with web UI', 'run-kit'),
    'tmux session manager with web UI',
  );
  // Idempotent re-apply / non-matching shorts untouched.
  assert.equal(stripToolPrefix('tmux session manager with web UI', 'run-kit'), 'tmux session manager with web UI');
  assert.equal(stripToolPrefix('locate, open, and operate on repos', 'hop'), 'locate, open, and operate on repos');
  // A short merely STARTING with the letters is not a prefix match.
  assert.equal(stripToolPrefix('rkward stuff', 'rk'), 'rkward stuff');
});

// ── findSubcommand (the `hop clone` argument path) ───────────────────────────

test('findSubcommand: hit returns the entry with its short', () => {
  assert.deepEqual(findSubcommand(HOP_DOC, 'clone'), {
    name: 'clone',
    short: 'git clone the resolved repo, an ad-hoc URL, or all',
  });
});

test('findSubcommand: case-insensitive', () => {
  assert.deepEqual(findSubcommand(HOP_DOC, 'CLONE'), {
    name: 'clone',
    short: 'git clone the resolved repo, an ad-hoc URL, or all',
  });
});

test('findSubcommand: miss / empty arg / no commands → null', () => {
  assert.equal(findSubcommand(HOP_DOC, 'teleport'), null);
  assert.equal(findSubcommand(HOP_DOC, '   '), null);
  assert.equal(findSubcommand({}, 'clone'), null);
});

test('findSubcommand: a missing short defaults to the empty string', () => {
  assert.deepEqual(findSubcommand({ commands: [{ name: 'bare' }] }, 'bare'), {
    name: 'bare',
    short: '',
  });
});

// ── formatSubcommandLine (reused by the island's single-sub arg hit) ─────────

test('formatSubcommandLine matches the card sub-line shape exactly', () => {
  const [viaCard] = chunk(buildToolCard('hop', { commands: [HOP_DOC.commands[0]] }));
  assert.equal(formatSubcommandLine('add', 'register on-disk repos into hop.yaml'), viaCard);
});

/** The sub/more line texts of a card, in order (test helper). */
function chunk(card) {
  return card.filter((ln) => ln.kind === 'sub' || ln.kind === 'more').map((ln) => ln.text);
}
