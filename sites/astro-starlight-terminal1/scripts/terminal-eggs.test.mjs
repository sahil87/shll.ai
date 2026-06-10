/**
 * Unit test for `src/lib/terminal-eggs.ts` (change o33t). Run with the
 * site's Node toolchain (>=22, native `.ts` type-stripping), mirroring how
 * `scripts/terminal-suggest.test.mjs` runs:
 *
 *   cd sites/astro-starlight-terminal1
 *   node --test scripts/terminal-eggs.test.mjs
 *
 * Pins the four pure-logic contracts the homepage terminal island relies on:
 *   - expandVars: `$NAME` and `${NAME}` expand against the given env record;
 *     unknown names expand to '' (authentic shell behavior);
 *   - seqLines: GNU `seq LAST | FIRST LAST | FIRST INCR LAST` semantics —
 *     integers only, null on bad input, EMPTY array for empty ranges,
 *     generation bounded by SEQ_GEN_CAP;
 *   - classifyRm: missing / refuse / guarded-root / deluxe, with the
 *     recursive flag detected ordering-free (-r, -rf, -fr, --recursive);
 *   - classifyTar: the xkcd-1168 survivor/bomb split on the first arg's
 *     flag cluster (`f` + one of c/x/t).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  expandVars,
  seqLines,
  classifyRm,
  classifyTar,
  SEQ_GEN_CAP,
} from '../src/lib/terminal-eggs.ts';

// Mirrors the island's FAKE_ENV shape (values don't need to match — the
// contract under test is the expansion mechanics, not the roster).
const ENV = {
  SHELL: '/bin/shll',
  USER: 'visitor',
  PLAN: 'first',
};

// ── expandVars ───────────────────────────────────────────────────────────────

test('expandVars: $NAME expands', () => {
  assert.equal(expandVars('$SHELL', ENV), '/bin/shll');
  assert.equal(expandVars('I plan $PLAN', ENV), 'I plan first');
});

test('expandVars: ${NAME} expands', () => {
  assert.equal(expandVars('${USER} here', ENV), 'visitor here');
  // Braces delimit the name, so adjacent word chars survive.
  assert.equal(expandVars('${USER}x', ENV), 'visitorx');
});

test('expandVars: unknown name expands to empty string', () => {
  assert.equal(expandVars('$UNDEFINED', ENV), '');
  // Bare-$ names are greedy: $USERx reads as the (unknown) name USERx.
  assert.equal(expandVars('$USERx', ENV), '');
});

test('expandVars: prototype-chain names are unknown, not inherited members', () => {
  // ENV is a plain object literal, so `constructor`/`toString`/`__proto__`
  // exist on its prototype chain. They are NOT defined variables and must
  // expand to '' like any unknown name (change o33t review rework: an
  // unguarded `env[name]` read made `echo $constructor` print Object's
  // source — the Object.hasOwn guard keeps the contract honest).
  assert.equal(expandVars('$constructor', ENV), '');
  assert.equal(expandVars('${__proto__}', ENV), '');
  assert.equal(expandVars('$toString', ENV), '');
  assert.equal(expandVars('a${constructor}b', ENV), 'ab');
});

test('expandVars: name charset — letters/digits/underscore, no leading digit', () => {
  // Punctuation ends a bare name.
  assert.equal(expandVars('$USER.', ENV), 'visitor.');
  // `$1` is not a valid NAME — left untouched.
  assert.equal(expandVars('costs $1', ENV), 'costs $1');
});

test('expandVars: text without variables is unchanged', () => {
  assert.equal(expandVars('hello world', ENV), 'hello world');
  assert.equal(expandVars('', ENV), '');
});

test('expandVars: multiple references in one line', () => {
  assert.equal(expandVars('$USER plans $PLAN in $SHELL', ENV), 'visitor plans first in /bin/shll');
});

// ── seqLines ─────────────────────────────────────────────────────────────────

test('seq: single arg is LAST (from 1)', () => {
  assert.deepEqual(seqLines(['3']), ['1', '2', '3']);
  assert.deepEqual(seqLines(['1']), ['1']);
});

test('seq: two args are FIRST LAST', () => {
  assert.deepEqual(seqLines(['2', '4']), ['2', '3', '4']);
  assert.deepEqual(seqLines(['-2', '0']), ['-2', '-1', '0']);
});

test('seq: three args are FIRST INCR LAST', () => {
  assert.deepEqual(seqLines(['1', '2', '7']), ['1', '3', '5', '7']);
});

test('seq: negative increment counts down', () => {
  assert.deepEqual(seqLines(['3', '-1', '1']), ['3', '2', '1']);
});

test('seq: empty range returns an empty array (authentic)', () => {
  assert.deepEqual(seqLines(['5', '1']), []); // positive incr, first > last
  assert.deepEqual(seqLines(['1', '-1', '5']), []); // negative incr, first < last
  assert.deepEqual(seqLines(['0']), []); // 1..0 is empty
});

test('seq: null on wrong arity', () => {
  assert.equal(seqLines([]), null);
  assert.equal(seqLines(['1', '2', '3', '4']), null);
});

test('seq: null on non-integer input', () => {
  assert.equal(seqLines(['x']), null);
  assert.equal(seqLines(['1.5']), null);
  assert.equal(seqLines(['1', 'two']), null);
});

test('seq: null on zero increment (GNU seq rejects it too)', () => {
  assert.equal(seqLines(['1', '0', '5']), null);
});

test('seq: generation is bounded by SEQ_GEN_CAP (no tab freeze)', () => {
  const lines = seqLines(['1', String(SEQ_GEN_CAP * 100)]);
  assert.ok(lines !== null);
  assert.equal(lines.length, SEQ_GEN_CAP);
  assert.equal(lines[0], '1');
  assert.equal(lines[SEQ_GEN_CAP - 1], String(SEQ_GEN_CAP));
});

// ── classifyRm ───────────────────────────────────────────────────────────────

test('rm: no args is missing', () => {
  assert.equal(classifyRm([]), 'missing');
});

test('rm: mundane targets refuse', () => {
  assert.equal(classifyRm(['file.txt']), 'refuse');
  assert.equal(classifyRm(['-rf', 'node_modules']), 'refuse'); // recursive, not root
  assert.equal(classifyRm(['-f', '/']), 'refuse'); // root, not recursive
  assert.equal(classifyRm(['/', '--no-preserve-root']), 'refuse'); // override without -r
});

test('rm: recursive + root without override is guarded-root (flag-order-free)', () => {
  assert.equal(classifyRm(['-rf', '/']), 'guarded-root');
  assert.equal(classifyRm(['-fr', '/']), 'guarded-root');
  assert.equal(classifyRm(['-r', '/']), 'guarded-root');
  assert.equal(classifyRm(['--recursive', '/']), 'guarded-root');
  assert.equal(classifyRm(['-rf', '/*']), 'guarded-root');
  assert.equal(classifyRm(['-RF', '/']), 'guarded-root'); // case-insensitive cluster
});

test('rm: recursive + root + --no-preserve-root is the deluxe', () => {
  assert.equal(classifyRm(['-rf', '/', '--no-preserve-root']), 'deluxe');
  assert.equal(classifyRm(['--no-preserve-root', '-fr', '/']), 'deluxe'); // arg-order-free
  assert.equal(classifyRm(['--recursive', '--no-preserve-root', '/']), 'deluxe');
});

// ── classifyTar ──────────────────────────────────────────────────────────────

test('tar: valid flag clusters survive (with or without the dash)', () => {
  assert.equal(classifyTar(['-xzf', 'a.tgz']), 'survivor');
  assert.equal(classifyTar(['xf', 'a.tar']), 'survivor');
  assert.equal(classifyTar(['czvf', 'out.tgz']), 'survivor');
  assert.equal(classifyTar(['-tvf', 'a.tar']), 'survivor');
  assert.equal(classifyTar(['-czf', 'out.tgz']), 'survivor');
});

test('tar: everything else is the bomb', () => {
  assert.equal(classifyTar([]), 'bomb'); // bare `tar`
  assert.equal(classifyTar(['-xz']), 'bomb'); // missing f
  assert.equal(classifyTar(['-f', 'a.tar']), 'bomb'); // no operation (c/x/t)
  assert.equal(classifyTar(['--extract']), 'bomb'); // long opts aren't a cluster
  assert.equal(classifyTar(['archive.tar']), 'bomb'); // a filename, not flags
});
