/**
 * Unit test for `src/lib/extract-readme.ts`. Run with the site's pnpm-installed
 * Node toolchain (>=22, native `.ts` type-stripping), mirroring how
 * `scripts/parse-help.test.mjs` runs:
 *
 *   cd sites/astro-starlight-terminal1
 *   node --test scripts/extract-readme.test.mjs
 *
 * `extract-readme.ts` imports `parse-help.ts` (dependency-free) and the TYPES
 * from `schemas.ts`. Type-only imports are stripped by Node's type-stripping, so
 * no `astro:content` alias hook is needed here (unlike validate-help.mjs).
 *
 * Pins the contract behavior:
 *   - §1 head rule: skip H1 + toolkit blockquote + contiguous badge/image lines;
 *     a no-chrome README passes through unchanged.
 *   - §2 tail rule: stop at the first denylisted heading; Install KEPT;
 *     Changelog/Roadmap/FAQ KEPT; no-denylist → slice to EOF.
 *   - §5/§6 strips: inline ```mermaid removed (non-mermaid fences survive);
 *     `#gh-*-mode-only` images removed (plain images survive).
 *   - §7 gate: the `shll shell-install` fabricated-alias failure mode is caught
 *     against the REAL help/shll.json; a clean slice passes; unknown flags caught.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve as resolvePath } from 'node:path';

import { extractReadme, findUnknownTokens } from '../src/lib/extract-readme.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
// scripts/ -> site root -> sites/ -> repo root -> help/
const helpDir = resolvePath(scriptDir, '..', '..', '..', 'help');

async function loadHelp(slug) {
  return JSON.parse(await readFile(join(helpDir, `${slug}.json`), 'utf8'));
}

// ── §1 head rule ────────────────────────────────────────────────────────────

test('head: skips H1 + toolkit blockquote + badge row, begins at first prose', () => {
  const md = [
    '# idea',
    "> Part of @sahil87's toolkit — a set of small composable CLIs.",
    '',
    '[![release](https://img.shields.io/x)](https://example.com/r) ![downloads](https://img.shields.io/d)',
    '',
    'Capture and manage ideas from the CLI.',
    '',
    '## Why idea?',
    '',
    'Because backlogs rot in SaaS tools.',
    '',
  ].join('\n');
  const { slice } = extractReadme(md);
  assert.ok(slice.startsWith('Capture and manage ideas from the CLI.'), `got: ${JSON.stringify(slice.slice(0, 40))}`);
  assert.ok(slice.includes('## Why idea?'));
  assert.ok(!slice.includes('# idea\n'), 'H1 skipped');
  assert.ok(!slice.includes("Part of @sahil87"), 'blockquote skipped');
  assert.ok(!slice.includes('img.shields.io'), 'badge row skipped');
});

test('head: HTML <p align><img> wrapper is treated as chrome', () => {
  const md = [
    '# tool',
    '<p align="center"><img src="logo.svg" alt="logo"></p>',
    '',
    'Real prose starts here.',
  ].join('\n');
  const { slice } = extractReadme(md);
  assert.equal(slice.trim(), 'Real prose starts here.');
});

test('head: a no-chrome README passes through unchanged (edge case)', () => {
  const md = ['Just prose, no chrome.', '', '## Section', 'body'].join('\n');
  const { slice } = extractReadme(md);
  assert.ok(slice.startsWith('Just prose, no chrome.'));
  assert.ok(slice.includes('## Section'));
});

test('head: a prose line containing an inline image is NOT chrome', () => {
  // Leading image-only line is chrome; the following prose line that happens to
  // contain an image mid-sentence must NOT be skipped.
  const md = [
    '# t',
    '![badge](b.svg)',
    'See the ![inline](i.png) screenshot above.',
    'more prose',
  ].join('\n');
  const { slice } = extractReadme(md);
  assert.ok(slice.startsWith('See the ![inline](i.png) screenshot above.'));
});

// ── §2 tail rule ────────────────────────────────────────────────────────────

test('tail: stops at first denylisted heading; Install kept', () => {
  const md = [
    'Lede.',
    '',
    '## Usage',
    'use it',
    '',
    '## Install',
    'brew install x',
    '',
    '## Contributing',
    'PRs welcome',
    '',
    '## License',
    'MIT',
  ].join('\n');
  const { slice } = extractReadme(md);
  assert.ok(slice.includes('## Usage'));
  assert.ok(slice.includes('## Install'), 'Install is INCLUDED');
  assert.ok(slice.includes('brew install x'));
  assert.ok(!slice.includes('## Contributing'), 'stops before Contributing');
  assert.ok(!slice.includes('## License'));
  assert.ok(!slice.includes('PRs welcome'));
});

test('tail: Changelog / Roadmap / FAQ are NOT denylisted', () => {
  const md = [
    'Lede.',
    '',
    '## Changelog',
    '- v1',
    '',
    '## Roadmap',
    '- soon',
    '',
    '## FAQ',
    'Q&A',
  ].join('\n');
  const { slice } = extractReadme(md);
  assert.ok(slice.includes('## Changelog'));
  assert.ok(slice.includes('## Roadmap'));
  assert.ok(slice.includes('## FAQ'));
});

test('tail: denylist match is case-insensitive and works at ### depth', () => {
  const md = ['Lede.', '', '### LICENSE', 'MIT'].join('\n');
  const { slice } = extractReadme(md);
  assert.equal(slice.trim(), 'Lede.');
});

test('tail: no denylisted heading → slice runs to EOF (edge case)', () => {
  const md = ['Lede.', '', '## Usage', 'all the way down'].join('\n');
  const { slice } = extractReadme(md);
  assert.ok(slice.includes('all the way down'));
});

test('tail: a denylisted word inside a code fence does not terminate', () => {
  const md = [
    'Lede.',
    '',
    '```bash',
    '## License: this is a comment inside code',
    '```',
    '',
    '## Usage',
    'real',
  ].join('\n');
  const { slice } = extractReadme(md);
  assert.ok(slice.includes('## Usage'), 'code-fenced pseudo-heading did not cut the slice');
  assert.ok(slice.includes('real'));
});

// ── §5/§6 strips ─────────────────────────────────────────────────────────────

test('strip: inline mermaid fence removed, surrounding prose + bash fence kept', () => {
  const md = [
    'Intro.',
    '',
    '```mermaid',
    'graph TD; A-->B;',
    '```',
    '',
    'After diagram.',
    '',
    '```bash',
    'echo hi',
    '```',
  ].join('\n');
  const { slice } = extractReadme(md);
  assert.ok(!slice.includes('mermaid'), 'mermaid fence line removed');
  assert.ok(!slice.includes('graph TD'), 'mermaid body removed');
  assert.ok(slice.includes('Intro.'));
  assert.ok(slice.includes('After diagram.'));
  assert.ok(slice.includes('```bash'), 'non-mermaid fence preserved');
  assert.ok(slice.includes('echo hi'));
});

test('strip: #gh-*-mode-only images removed, plain image survives', () => {
  const md = [
    'Diagrams:',
    '',
    '![arch](arch-dark.svg#gh-dark-mode-only)',
    '![arch](arch-light.svg#gh-light-mode-only)',
    '![shot](shot.png)',
  ].join('\n');
  const { slice } = extractReadme(md);
  assert.ok(!slice.includes('#gh-dark-mode-only'));
  assert.ok(!slice.includes('#gh-light-mode-only'));
  assert.ok(!slice.includes('arch-dark.svg'));
  assert.ok(!slice.includes('arch-light.svg'));
  assert.ok(slice.includes('![shot](shot.png)'), 'plain image preserved');
});

test('extractReadme is total: empty + whitespace inputs do not throw', () => {
  assert.equal(extractReadme('').slice, '');
  assert.equal(extractReadme('\n\n  \n').slice, '');
  // A README that is ONLY chrome yields an empty slice.
  assert.equal(extractReadme('# tool\n> blurb\n![b](b.svg)\n').slice, '');
});

// ── §7 validation gate (against the REAL help/shll.json) ─────────────────────

test('gate: a clean shll slice (real commands/flags) passes', async () => {
  const doc = await loadHelp('shll');
  const slice = [
    'Install just shll:',
    '',
    '```bash',
    'brew install sahil87/tap/shll',
    'shll install',
    'shll shell-setup --trust-tap',
    'shll update',
    'shll version',
    '```',
    '',
    'Use `shll install` to bootstrap.',
  ].join('\n');
  assert.deepEqual(findUnknownTokens(slice, doc), [], 'clean slice has no unknown tokens');
});

test('gate: the vn39 `shll shell-install` fabricated alias is caught', async () => {
  const doc = await loadHelp('shll');
  // `shll shell-install` is a Cobra ALIAS of `shll shell-setup`, NOT a first-class
  // command path in help/shll.json — vn39 removed it from the site in favor of the
  // canonical `shll shell-setup`. The gate must flag it (the exact failure mode
  // the contract §7 names).
  const slice = ['```bash', 'shll shell-install', '```'].join('\n');
  const unknown = findUnknownTokens(slice, doc);
  assert.ok(
    unknown.includes('shll shell-install'),
    `expected shll shell-install flagged, got: ${JSON.stringify(unknown)}`,
  );
});

test('gate: an unknown flag on a real command is caught', async () => {
  const doc = await loadHelp('shll');
  const slice = ['```bash', 'shll install --totally-made-up', '```'].join('\n');
  const unknown = findUnknownTokens(slice, doc);
  assert.ok(unknown.includes('--totally-made-up'), `got: ${JSON.stringify(unknown)}`);
});

test('gate: commands for OTHER tools (not this binary) are ignored', async () => {
  const doc = await loadHelp('shll');
  // A slice mentioning `git status` or `brew install` is not THIS tool's command;
  // the gate only checks statements whose first token is the tool's binary.
  const slice = ['```bash', 'git status', 'brew install sahil87/tap/shll', 'cd ~/code', '```'].join('\n');
  assert.deepEqual(findUnknownTokens(slice, doc), []);
});

test('gate: real subcommand + real flag from wt passes; fabricated subcommand caught', async () => {
  const wt = await loadHelp('wt');
  // `wt create` exists; `wt summon` does not.
  const good = ['`wt create`', '`wt list`'].join('\n');
  assert.deepEqual(findUnknownTokens(good, wt), []);
  const bad = ['```bash', 'wt summon lively-otter', '```'].join('\n');
  assert.ok(findUnknownTokens(bad, wt).includes('wt summon'), 'fabricated subcommand caught');
});

// ── §7 gate: M2 regression — a known TERMINAL command followed by a positional
// argument MUST NOT be flagged. The previous logic grew the command path through
// EVERY bare word after the binary, so an ordinary arg after a real leaf command
// was wrongly flagged as an unknown subcommand. The walk must stop at a known
// leaf and treat the rest as args. The fabricated-subcommand cases below MUST
// still be flagged (the true positives the gate exists for).

test('gate (M2): `shll install <arg>` — positional arg after a real leaf is NOT flagged', async () => {
  const doc = await loadHelp('shll');
  // `shll install` is a real, childless command; `mytool` is a positional arg.
  assert.deepEqual(findUnknownTokens(['```bash', 'shll install mytool', '```'].join('\n'), doc), []);
});

test('gate (M2): `wt create <branch>` — positional arg after a real leaf is NOT flagged', async () => {
  const wt = await loadHelp('wt');
  // `wt create [branch]` — `feature` is the branch arg, not a subcommand.
  assert.deepEqual(findUnknownTokens(['```bash', 'wt create feature', '```'].join('\n'), wt), []);
});

test('gate (M2): hop leaf commands with positional args are NOT flagged', async () => {
  const hop = await loadHelp('hop');
  // `hop shell-init zsh`, `hop config add somedir`, `hop clone myrepo` — each ends
  // in a real leaf command (`hop shell-init`, `hop config add`, `hop clone`)
  // followed by an ordinary positional arg.
  assert.deepEqual(findUnknownTokens(['```bash', 'hop shell-init zsh', '```'].join('\n'), hop), [], 'hop shell-init zsh');
  assert.deepEqual(findUnknownTokens(['```bash', 'hop config add somedir', '```'].join('\n'), hop), [], 'hop config add somedir');
  assert.deepEqual(findUnknownTokens(['```bash', 'hop clone myrepo', '```'].join('\n'), hop), [], 'hop clone myrepo');
});

test('gate (M2): fabricated subcommands are STILL flagged (true positives preserved)', async () => {
  const shll = await loadHelp('shll');
  const wt = await loadHelp('wt');
  const hop = await loadHelp('hop');
  // `shll shell-install` — fabricated alias, not in the tree (vn39's exact case).
  assert.ok(
    findUnknownTokens(['```bash', 'shll shell-install', '```'].join('\n'), shll).includes('shll shell-install'),
    'shll shell-install flagged',
  );
  // `wt summon` — fabricated subcommand under a node that HAS children.
  assert.ok(
    findUnknownTokens(['```bash', 'wt summon feature', '```'].join('\n'), wt).includes('wt summon'),
    'wt summon flagged',
  );
  // `hop config bogus` — `hop config` has children (add/init/print/…) but `bogus`
  // is not one of them → fabricated nested subcommand, flagged.
  assert.ok(
    findUnknownTokens(['```bash', 'hop config bogus', '```'].join('\n'), hop).includes('hop config bogus'),
    'hop config bogus flagged',
  );
});
