/**
 * Unit test for `src/lib/terminal-share.ts` (change tx5p). Run with the
 * site's Node toolchain (>=22, native `.ts` type-stripping), mirroring how
 * the four sibling terminal suites run:
 *
 *   cd sites/astro-starlight-terminal1
 *   node --test scripts/terminal-share.test.mjs
 *
 * Pins the pure-logic contracts behind the play→share→replay loop:
 *   - parsePlayHash: the `#play=` grammar — split on raw `,`/`;` FIRST then
 *     per-token decode (encoded `%2C` survives; a malformed %-sequence drops
 *     that token only), trim/drop-empties, silent skipping of unknown and
 *     REPLAY_DENY'd commands, the prototype-chain pin, and the surviving-token
 *     REPLAY_CAP;
 *   - buildPlayHash: encoding, the first-N cap, '' on empty, and the
 *     build→parse round-trip;
 *   - firstWord / isReplayable: the shared replayable predicate with its
 *     Object.hasOwn own-property guard (the o33t idiom);
 *   - serializeTranscript: trailing trim, the bare-`$` live-prompt line,
 *     header/footer assembly, and link-footer presence/absence.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePlayHash,
  buildPlayHash,
  serializeTranscript,
  firstWord,
  isReplayable,
  REPLAY_DENY,
  REPLAY_CAP,
  SHARE_HEADER,
  SHARE_FOOTER,
} from '../src/lib/terminal-share.ts';

// A miniature mirror of the island's COMMANDS record — a plain object literal
// (so the prototype chain is live, exactly the hazard the guard pins) holding
// known keys including the deny-listed ones (they ARE commands; they are just
// not replayable).
const CMDS = {
  ls: 1,
  help: 1,
  version: 1,
  fortune: 1,
  echo: 1,
  theme: 1,
  clear: 1,
  yes: 1,
  seq: 1,
  pwd: 1,
  uname: 1,
  date: 1,
  cd: 1,
  open: 1,
  install: 1,
  share: 1,
  snake: 1,
};
const replayable = (cmd) => isReplayable(cmd, CMDS);

// ── parsePlayHash: grammar ───────────────────────────────────────────────────

test('parsePlayHash: comma-separated commands parse in order', () => {
  assert.deepEqual(parsePlayHash('#play=ls,version,fortune', replayable), [
    'ls',
    'version',
    'fortune',
  ]);
});

test('parsePlayHash: semicolons and mixed separators both split', () => {
  assert.deepEqual(parsePlayHash('#play=ls;version,fortune', replayable), [
    'ls',
    'version',
    'fortune',
  ]);
});

test('parsePlayHash: encoded spaces decode into command arguments', () => {
  assert.deepEqual(parsePlayHash('#play=echo%20hello,ls', replayable), [
    'echo hello',
    'ls',
  ]);
});

test('parsePlayHash: split happens BEFORE decode — an encoded comma survives inside an arg', () => {
  assert.deepEqual(parsePlayHash('#play=echo%20a%2Cb,ls', replayable), [
    'echo a,b',
    'ls',
  ]);
});

test('parsePlayHash: tokens are trimmed and empties dropped', () => {
  assert.deepEqual(parsePlayHash('#play=%20ls%20,,;,help', replayable), ['ls', 'help']);
});

test('parsePlayHash: a malformed %-sequence drops that token only, never the sequence', () => {
  assert.deepEqual(parsePlayHash('#play=ls,%E0%A4%A,fortune', replayable), [
    'ls',
    'fortune',
  ]);
});

test('parsePlayHash: no hash / non-play hash / bare prefix → no replay', () => {
  assert.deepEqual(parsePlayHash('', replayable), []);
  assert.deepEqual(parsePlayHash('#section', replayable), []);
  assert.deepEqual(parsePlayHash('#play=', replayable), []);
});

// ── parsePlayHash: validation ────────────────────────────────────────────────

test('parsePlayHash: unknown commands are skipped silently', () => {
  assert.deepEqual(parsePlayHash('#play=ls,nosuchcmd,fortune', replayable), [
    'ls',
    'fortune',
  ]);
});

test('parsePlayHash: REPLAY_DENY commands (nav + share) are skipped, args and all', () => {
  assert.deepEqual(
    parsePlayHash('#play=cd%20idea,open%20wt,install,share,fortune', replayable),
    ['fortune'],
  );
});

test('parsePlayHash: prototype-chain names replay nothing (the Object.hasOwn pin)', () => {
  assert.deepEqual(parsePlayHash('#play=constructor', replayable), []);
  assert.deepEqual(parsePlayHash('#play=__proto__,toString,hasOwnProperty', replayable), []);
});

test('parsePlayHash: uppercase input is replayable and kept verbatim (dispatch lowercases)', () => {
  assert.deepEqual(parsePlayHash('#play=LS', replayable), ['LS']);
});

// ── parsePlayHash: the cap ───────────────────────────────────────────────────

test('parsePlayHash: surviving tokens are capped at REPLAY_CAP', () => {
  const twelve = Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? 'ls' : 'help'));
  const out = parsePlayHash(`#play=${twelve.join(',')}`, replayable);
  assert.equal(out.length, REPLAY_CAP);
  assert.deepEqual(out, twelve.slice(0, REPLAY_CAP));
});

test('parsePlayHash: the cap counts SURVIVORS — skipped tokens do not consume slots', () => {
  // 3 unknown tokens then 11 valid ones: the result is the first 10 valid.
  const tokens = ['nope1', 'nope2', 'nope3', ...Array.from({ length: 11 }, () => 'ls')];
  const out = parsePlayHash(`#play=${tokens.join(',')}`, replayable);
  assert.equal(out.length, REPLAY_CAP);
  assert.ok(out.every((c) => c === 'ls'));
});

// ── buildPlayHash ────────────────────────────────────────────────────────────

test('buildPlayHash: comma-joins onto the #play= prefix', () => {
  assert.equal(buildPlayHash(['ls', 'fortune']), '#play=ls,fortune');
});

test('buildPlayHash: encodes spaces and commas per command', () => {
  assert.equal(buildPlayHash(['echo a,b', 'ls']), '#play=echo%20a%2Cb,ls');
});

test('buildPlayHash: caps at the FIRST REPLAY_CAP commands in commit order', () => {
  const cmds = Array.from({ length: 12 }, (_, i) => `seq ${i}`);
  const built = buildPlayHash(cmds);
  assert.equal(built.split(',').length, REPLAY_CAP);
  assert.ok(built.startsWith('#play=seq%200,'));
  assert.ok(!built.includes('10') && !built.includes('11'));
});

test('buildPlayHash: an empty list yields the empty string (no link to print)', () => {
  assert.equal(buildPlayHash([]), '');
});

test('build → parse round-trips, args and all', () => {
  const cmds = ['ls', 'echo a,b c', 'seq 1 5', 'fortune'];
  assert.deepEqual(parsePlayHash(buildPlayHash(cmds), replayable), cmds);
});

// ── firstWord / isReplayable ─────────────────────────────────────────────────

test('firstWord: first whitespace-delimited token, lowercased; empty input → ""', () => {
  assert.equal(firstWord('echo hello world'), 'echo');
  assert.equal(firstWord('  LS  '), 'ls');
  assert.equal(firstWord(''), '');
  assert.equal(firstWord('   '), '');
});

test('isReplayable: known commands pass, unknown fail, case-insensitively', () => {
  assert.equal(isReplayable('ls', CMDS), true);
  assert.equal(isReplayable('LS -la', CMDS), true);
  assert.equal(isReplayable('nosuchcmd', CMDS), false);
  assert.equal(isReplayable('', CMDS), false);
});

test('isReplayable: every REPLAY_DENY entry is refused even though it IS a command', () => {
  for (const denied of REPLAY_DENY) {
    assert.equal(isReplayable(denied, CMDS), false, `${denied} must not be replayable`);
    assert.equal(isReplayable(`${denied} arg`, CMDS), false);
  }
  // And the list is exactly the pinned five: the user-confirmed tx5p four
  // plus snake (change kd5e — an input-owning game must never start from a
  // URL the visitor didn't ask to play).
  assert.deepEqual([...REPLAY_DENY], ['cd', 'open', 'install', 'share', 'snake']);
});

test('isReplayable: prototype-chain names miss (Object.hasOwn, never a bare read)', () => {
  for (const name of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    assert.equal(isReplayable(name, CMDS), false);
    assert.equal(isReplayable(name, {}), false);
  }
});

// ── serializeTranscript ──────────────────────────────────────────────────────

test('serializeTranscript: assembles header, trimmed body, bare $, and footer', () => {
  const block = serializeTranscript(['$ ls', 'idea  hop   ', '', '$ share']);
  assert.deepEqual(block.split('\n'), [
    SHARE_HEADER,
    '$ ls',
    'idea  hop', // trailing whitespace trimmed, inner spacing preserved
    '',
    '$ share',
    '$', // the live prompt line, appended by the serializer
    SHARE_FOOTER,
  ]);
});

test('serializeTranscript: trailing trim is per line (spaces and tabs), leading kept', () => {
  const block = serializeTranscript(['  indented\t ', 'plain']);
  assert.deepEqual(block.split('\n').slice(1, 3), ['  indented', 'plain']);
});

test('serializeTranscript: the link footer rides only when a playLink is given', () => {
  const link = 'https://shll.ai/#play=ls,fortune';
  const withLink = serializeTranscript(['$ ls'], { playLink: link });
  assert.ok(withLink.endsWith(`${SHARE_FOOTER}\n# replay it: ${link}`));

  const without = serializeTranscript(['$ ls']);
  assert.ok(without.endsWith(SHARE_FOOTER));
  assert.ok(!without.includes('# replay it:'));
});

test('serializeTranscript: an empty body still yields header, bare $, and footer', () => {
  assert.deepEqual(serializeTranscript([]).split('\n'), [SHARE_HEADER, '$', SHARE_FOOTER]);
});

test('serializeTranscript: the footer is the literal brand line', () => {
  assert.equal(SHARE_FOOTER, '# replayed from https://shll.ai');
});
