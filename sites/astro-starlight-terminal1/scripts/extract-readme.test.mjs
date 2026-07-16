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
 *   - §7 divergence reporter: `findUnknownTokens` still DETECTS the `shll
 *     shell-install` fabricated-alias case against the REAL help/shll.json (a clean
 *     slice → empty list; fabricated subcommands + unknown flags → flagged). As of
 *     change `4s3e` this detector is REPORT-ONLY: it is a non-fatal reporter, not a
 *     publish gate — the README is canonical and rendered verbatim, and divergence
 *     surfaces as a `::warning::` (see extract-readme-cli.mjs). These tests pin the
 *     DETECTION logic (unchanged); the warn-not-block CONSEQUENCE lives in the CLI
 *     and the workflow, verified out-of-band (the CLI has no separate unit test).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile, rm, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  extractReadme,
  findUnknownTokens,
  rewriteDocsSiteLinks,
  rewriteReadmeDocsSiteLinks,
  findClosureViolations,
  findReadmeLinkViolations,
} from '../src/lib/extract-readme.ts';
import { parseHelp } from '../src/lib/parse-help.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
// scripts/ -> site root -> sites/ -> repo root -> help/
const helpDir = resolvePath(scriptDir, '..', '..', '..', 'help');

async function loadHelp(slug) {
  return JSON.parse(await readFile(join(helpDir, `${slug}.json`), 'utf8'));
}

/** Depth-first walk of a help Node tree (root + all subcommands). */
function* walkHelp(node) {
  yield node;
  for (const child of node.commands ?? []) yield* walkHelp(child);
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

test('tail: a longer outer fence is NOT closed by a shorter inner fence (CommonMark)', () => {
  // The outer block opens with FOUR backticks and contains a THREE-backtick line
  // (e.g. demonstrating a nested fence). Per CommonMark the inner ``` does NOT
  // close the outer ```` block, so the `## License` heading that follows is still
  // INSIDE the code block and must NOT terminate the slice.
  const md = [
    'Lede.',
    '',
    '````markdown',
    'Here is how to write a fenced block:',
    '```',
    '## License: not a real heading — it lives inside the documented code sample',
    '```',
    '````',
    '',
    '## Usage',
    'real usage',
  ].join('\n');
  const { slice } = extractReadme(md);
  assert.ok(slice.includes('## Usage'), 'slice did not terminate early on the in-fence ## License');
  assert.ok(slice.includes('real usage'));
  assert.ok(slice.includes('````markdown'), 'outer 4-backtick fence preserved');
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

test('strip: a 4-backtick mermaid block containing a 3-backtick line is FULLY stripped', () => {
  // The mermaid block opens with FOUR backticks and contains a THREE-backtick
  // line. The shorter inner ``` must NOT close the block early (CommonMark), so
  // the entire mermaid block — including the inner-fence residue — is stripped,
  // and the prose after the real 4-backtick close survives.
  const md = [
    'Intro.',
    '',
    '````mermaid',
    'graph TD;',
    '```',
    'A-->B;',
    '````',
    '',
    'After diagram.',
  ].join('\n');
  const { slice } = extractReadme(md);
  assert.ok(!slice.includes('mermaid'), 'mermaid fence removed');
  assert.ok(!slice.includes('graph TD'), 'mermaid body removed');
  assert.ok(!slice.includes('A-->B'), 'mermaid body after the shorter inner fence also removed');
  assert.ok(!slice.includes('```'), 'no fence residue leaked from the mermaid block');
  assert.ok(slice.includes('Intro.'));
  assert.ok(slice.includes('After diagram.'), 'prose after the real outer close survives');
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

// ── §7 divergence reporter (against the REAL help/shll.json) — REPORT-ONLY ───
// `findUnknownTokens` is the non-fatal reporter (change `4s3e`): these cases pin
// its DETECTION behavior (unchanged). The warn-and-still-write consequence lives
// in extract-readme-cli.mjs / the workflow, not in the detector.

test('gate: a clean shll slice (real commands/flags) passes', async () => {
  const doc = await loadHelp('shll');
  // DERIVE the clean slice from the loaded doc itself instead of pinning a
  // literal command/flag list: the live corpus is refreshed daily, and a pinned
  // list rots when the tool legitimately changes (`shll shell-setup --trust-tap`
  // was removed in shll v0.0.20 when tap trust moved into `shll install`, which
  // broke the previous hardcoded slice). Real subcommand paths come from the
  // tree; a real flag comes from the same parseHelp decomposition helpFacts
  // uses — clean by construction, for any corpus content.
  const commands = doc.root.commands.slice(0, 3).map((c) => c.path);
  assert.ok(commands.length >= 2, 'shll doc has at least two subcommands');
  let flagLine = null;
  for (const node of walkHelp(doc.root)) {
    const f = parseHelp(node.text).flags.find((fl) => fl.long !== 'help');
    if (f) {
      flagLine = `${node.path} --${f.long}`;
      break;
    }
  }
  assert.ok(flagLine, 'shll doc has at least one real non-help flag');
  const slice = [
    'Install just shll:',
    '',
    '```bash',
    'brew install sahil87/tap/shll',
    ...commands,
    flagLine,
    '```',
    '',
    `Use \`${commands[0]}\` to bootstrap.`,
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

test('gate: a longer outer fence keeps scanning past a shorter inner fence (CommonMark)', async () => {
  const doc = await loadHelp('shll');
  // The whole block is opened with FOUR backticks. A THREE-backtick line sits in
  // the middle; per CommonMark it does NOT close the outer block, so a fabricated
  // command AFTER the inner fence is still inside a code span and MUST be scanned
  // (and flagged). If fence length were ignored, codeSpans would treat the inner
  // ``` as a close and stop scanning, missing the fabricated alias.
  const slice = [
    '````bash',
    'shll install',
    '```',
    'shll shell-install',
    '````',
  ].join('\n');
  const unknown = findUnknownTokens(slice, doc);
  assert.ok(
    unknown.includes('shll shell-install'),
    `expected the post-inner-fence fabricated alias flagged, got: ${JSON.stringify(unknown)}`,
  );
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
  // `hop shell-init zsh`, `hop config init somedir`, `hop clone myrepo` — each ends
  // in a real leaf command (`hop shell-init`, `hop config init`, `hop clone`)
  // followed by an ordinary positional arg.
  assert.deepEqual(findUnknownTokens(['```bash', 'hop shell-init zsh', '```'].join('\n'), hop), [], 'hop shell-init zsh');
  assert.deepEqual(findUnknownTokens(['```bash', 'hop config init somedir', '```'].join('\n'), hop), [], 'hop config init somedir');
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
  // `hop config bogus` — `hop config` has children (init/print/scan/where) but `bogus`
  // is not one of them → fabricated nested subcommand, flagged.
  assert.ok(
    findUnknownTokens(['```bash', 'hop config bogus', '```'].join('\n'), hop).includes('hop config bogus'),
    'hop config bogus flagged',
  );
});

// ── §9 docs/site link resolution (change x0br) — SITE-ABSOLUTE model ─────────
// Reworked (x0br review): both transforms now emit a SITE-ABSOLUTE target
// `/<slug>/<resolved>` (not a relative `./<p>` / bare `.md`-strip), because
// the site serves pages as trailing-slash directories — a relative target resolves
// one segment too deep. Transforms are slug-aware; the docs/site transform also
// takes the page's mount path to resolve `.`/`..` against the page's directory.
//
// R5: a docs/site PAGE — resolve RELATIVE link/image targets against the page's
// directory within the tree, strip `.md`, emit `/<slug>/<resolved>`.

test('docs/site page: a sibling ./ link resolves site-absolute against the page dir (R5)', () => {
  // page advanced/hooks.md → ./sibling.md resolves in advanced/ → /idea/advanced/sibling
  assert.equal(
    rewriteDocsSiteLinks('See [s](./sibling.md) for details.', 'idea', 'advanced/hooks'),
    'See [s](/idea/advanced/sibling) for details.',
  );
});

test('docs/site page: a ../ link resolves up one level then site-absolute (R5)', () => {
  // page advanced/hooks.md → ../install.md pops advanced/ → /idea/install
  assert.equal(
    rewriteDocsSiteLinks('[i](../install.md)', 'idea', 'advanced/hooks'),
    '[i](/idea/install)',
  );
});

test('docs/site page: a bare-relative target from a top-level page is site-absolute (R5)', () => {
  // page install.md (top-level) → [b](advanced/hooks.md) → /idea/advanced/hooks
  assert.equal(
    rewriteDocsSiteLinks('[a](other.md) [b](advanced/hooks.md)', 'idea', 'install'),
    '[a](/idea/other) [b](/idea/advanced/hooks)',
  );
});

test('docs/site page: a #fragment / ?query suffix survives the site-absolute rewrite (R5)', () => {
  assert.equal(
    rewriteDocsSiteLinks('[x](./guide.md#section)', 'idea', 'install'),
    '[x](/idea/guide#section)',
  );
  assert.equal(
    rewriteDocsSiteLinks('[x](./guide.md?v=2)', 'idea', 'install'),
    '[x](/idea/guide?v=2)',
  );
});

// R6: the README SLICE — `docs/site/<p>.md` → `/<slug>/<p>` (site-absolute).

test('readme slice: docs/site/ link becomes a site-absolute /<slug>/ path (R6)', () => {
  assert.equal(
    rewriteReadmeDocsSiteLinks('Read the [guide](docs/site/install.md).', 'idea'),
    'Read the [guide](/idea/install).',
  );
});

test('readme slice: nested docs/site path preserves subtree shape site-absolute (R6)', () => {
  assert.equal(
    rewriteReadmeDocsSiteLinks('[hooks](docs/site/advanced/hooks.md)', 'idea'),
    '[hooks](/idea/advanced/hooks)',
  );
});

test('readme slice: an anchor on a docs/site link is preserved site-absolute (R6)', () => {
  assert.equal(
    rewriteReadmeDocsSiteLinks('[flags](docs/site/install.md#flags)', 'idea'),
    '[flags](/idea/install#flags)',
  );
});

test('readme slice: a docs/site link that ..-escapes the tree gets the unresolved marker (R3)', () => {
  // Shared resolvePath means the README side emits the same __unresolved__ marker
  // as the docs/site page side on an escape — a visibly-dead link, not a real page.
  assert.equal(
    rewriteReadmeDocsSiteLinks('[x](docs/site/../../etc/passwd.md)', 'idea'),
    '[x](/idea/__unresolved__/etc/passwd)',
  );
});

test('readme slice: a relative link NOT under docs/site/ is left as-is (R6)', () => {
  // README→external relative links self-heal via the absolute-by-author producer
  // rule (deferred consumer rewrite); this transform only touches docs/site/.
  assert.equal(
    rewriteReadmeDocsSiteLinks('[spec](docs/specs/overview.md)', 'idea'),
    '[spec](docs/specs/overview.md)',
  );
});

test('readme slice: a NON-.md docs/site target is NOT rewritten (only .md pages mount) (R6)', () => {
  // docs/site/img/logo.png is not a mounted page — rewriting it would silently
  // produce a dead /idea/img/logo URL. Leave it relative so the README link
  // lint catches it instead. (Copilot PR #43 finding.)
  assert.equal(
    rewriteReadmeDocsSiteLinks('![logo](docs/site/img/logo.png)', 'idea'),
    '![logo](docs/site/img/logo.png)',
  );
});

// R7: the rewrite guard — the correctness boundary. Absolute URLs containing the
// literal `docs/site`, prose, and code that merely mention the text are untouched;
// only relative link/image TARGETS are rewritten (markdown + raw-HTML href/src).

test('guard: an absolute URL containing docs/site is NOT rewritten (R7)', () => {
  const md = 'Blob: [src](https://github.com/sahil87/idea/blob/main/docs/site/x.md)';
  assert.equal(rewriteReadmeDocsSiteLinks(md, 'idea'), md, 'absolute URL untouched by README transform');
  assert.equal(rewriteDocsSiteLinks(md, 'idea', 'install'), md, 'absolute URL untouched by docs/site transform');
});

test('guard: prose / code mentioning docs/site is NOT rewritten (R7)', () => {
  const prose = 'Put site-only docs in docs/site/ — they end in .md, like install.md.';
  assert.equal(rewriteReadmeDocsSiteLinks(prose, 'idea'), prose);
  assert.equal(rewriteDocsSiteLinks(prose, 'idea', 'install'), prose);
  const code = '`mv notes.md docs/site/notes.md`';
  // The inline-code path is prose to the link scanner (no `[](...)` shape), so
  // its mention of docs/site/notes.md is not a link target → untouched.
  assert.equal(rewriteReadmeDocsSiteLinks(code, 'idea'), code);
});

test('guard: raw-HTML href/src relative targets ARE rewritten site-absolute; absolute ones are not (R7)', () => {
  assert.equal(
    rewriteReadmeDocsSiteLinks('<a href="docs/site/install.md">install</a>', 'idea'),
    '<a href="/idea/install">install</a>',
  );
  assert.equal(
    rewriteDocsSiteLinks('<a href="./advanced/hooks.md">hooks</a>', 'idea', 'install'),
    '<a href="/idea/advanced/hooks">hooks</a>',
  );
  const abs = '<img src="https://raw.githubusercontent.com/x/y/docs/site/a.png">';
  assert.equal(rewriteDocsSiteLinks(abs, 'idea', 'install'), abs, 'absolute src untouched');
});

test('guard: only the link target is rewritten, link TEXT mentioning .md is preserved (R7)', () => {
  assert.equal(
    rewriteDocsSiteLinks('[see install.md here](./install.md)', 'idea', 'guide'),
    '[see install.md here](/idea/install)',
    'the .md in the link TEXT survives; only the target is rewritten',
  );
});

test('transforms are total: empty input does not throw (R5/R6)', () => {
  assert.equal(rewriteDocsSiteLinks('', 'idea', 'install'), '');
  assert.equal(rewriteReadmeDocsSiteLinks('', 'idea'), '');
});

// A docs/site relative link that `..`-escapes the tree root is a closure violation
// (reported by findClosureViolations) AND is rewritten to a non-colliding
// `__unresolved__` marker (R3) — NOT clamped to a real page. The marker and the
// closure escape use the SAME predicate, so they agree on what "escape" means.
test('docs/site page: a ..-escape rewrites to a non-colliding marker, not a real page (R3/R8)', () => {
  // page install.md (top-level) → ../../secret.md climbs above the tree root.
  // The rewriter emits the reserved __unresolved__ segment (a visibly-dead link),
  // NOT `/idea/secret` (which would misroute to a plausible-but-wrong page).
  assert.equal(
    rewriteDocsSiteLinks('[x](../../secret.md)', 'idea', 'install'),
    '[x](/idea/__unresolved__/secret)',
  );
  // And the same target is independently reported as a closure escape:
  const v = findClosureViolations('install.md', '[x](../../secret.md)');
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'escape');
});

test('docs/site page: a non-escaping .. still resolves normally (R3)', () => {
  // advanced/hooks → ../install.md pops [advanced], stays intra-set → real page.
  assert.equal(
    rewriteDocsSiteLinks('[i](../install.md)', 'idea', 'advanced/hooks'),
    '[i](/idea/install)',
  );
  // ...and is NOT reported as an escape.
  assert.deepEqual(findClosureViolations('advanced/hooks.md', '[i](../install.md)'), []);
});

// ── §closure lint detector (R8) — report-only ───────────────────────────────

test('closure: a relative link escaping docs/site (.. climb) is flagged (R8)', () => {
  const v = findClosureViolations('install.md', '[secret](../../secret.md)');
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'escape');
  assert.equal(v[0].target, '../../secret.md');
});

test('closure: a .. climb from a NESTED page that escapes the root is flagged (R8)', () => {
  // advanced/hooks.md → `../../x.md` pops [advanced] then climbs above root → escape.
  const v = findClosureViolations('advanced/hooks.md', '[x](../../x.md)');
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'escape');
});

test('closure: a .. that stays INSIDE docs/site is clean (R8)', () => {
  // advanced/hooks.md → `../install.md` pops [advanced], resolves to install.md (intra-set).
  assert.deepEqual(findClosureViolations('advanced/hooks.md', '[i](../install.md)'), []);
});

test('closure: a relative IMAGE is flagged (images must be absolute, §3) (R8)', () => {
  const v = findClosureViolations('install.md', '![diagram](./diagram.png)');
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'relative-image');
});

test('closure: a raw-HTML relative <img src> is flagged as relative-image (R8)', () => {
  const v = findClosureViolations('install.md', '<img src="shot.png" alt="x">');
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'relative-image');
});

test('closure: an intra-set relative link is clean (R8)', () => {
  assert.deepEqual(findClosureViolations('install.md', '[other](./other.md)'), []);
  assert.deepEqual(findClosureViolations('install.md', '[deep](sub/page.md)'), []);
});

test('closure: an absolute link and an absolute image are clean (R8)', () => {
  const md = [
    '[gh](https://github.com/sahil87/idea)',
    '![arch](https://raw.githubusercontent.com/x/y/arch.svg)',
  ].join('\n');
  assert.deepEqual(findClosureViolations('install.md', md), []);
});

test('closure detector is total: empty input → no violations (R8)', () => {
  assert.deepEqual(findClosureViolations('install.md', ''), []);
});

test('closure: a relative <source srcset> image is flagged (R4)', () => {
  // §4 invites <picture><source srcset>; a RELATIVE srcset candidate is a §3 violation.
  const v = findClosureViolations('install.md', '<source srcset="dark.png 1x, dark2.png 2x">');
  assert.ok(v.some((x) => x.kind === 'relative-image' && x.target === 'dark.png'));
  assert.ok(v.some((x) => x.kind === 'relative-image' && x.target === 'dark2.png'));
});

test('closure: an absolute <source srcset> is clean (R4)', () => {
  assert.deepEqual(
    findClosureViolations('install.md', '<source srcset="https://x/y/dark.png 1x">'),
    [],
  );
});

// ── README-slice link lint (R1/R2) — report-only ────────────────────────────

test('readme lint: a site-escaping relative link is flagged relative-link (R1)', () => {
  // The exact live "line-85" 404 class: a README relative link to docs/specs/*.
  const v = findReadmeLinkViolations('See [overview](docs/specs/overview.md).');
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'relative-link');
  assert.equal(v[0].target, 'docs/specs/overview.md');
});

test('readme lint: a CONTRIBUTING-style relative link is flagged (R1)', () => {
  const v = findReadmeLinkViolations('[contributing](CONTRIBUTING.md)');
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'relative-link');
});

test('readme lint: a docs/site link and absolute links are clean (R1)', () => {
  const md = [
    '[guide](docs/site/install.md)', // rewritten by the consumer → clean
    '[gh](https://github.com/sahil87/idea)', // absolute → clean
    '[anchor](#section)', // pure fragment → clean
  ].join('\n');
  assert.deepEqual(findReadmeLinkViolations(md), []);
});

test('readme lint: a NON-.md docs/site link IS flagged (only .md pages mount) (R1)', () => {
  // docs/site/img/logo.png is under docs/site/ but not a mounted page; it is
  // neither rewritten nor resolvable, so it MUST be flagged, not exempted.
  // (Copilot PR #43 finding.)
  const v = findReadmeLinkViolations('[asset](docs/site/data/sample.json)');
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'relative-link');
  assert.equal(v[0].target, 'docs/site/data/sample.json');
});

test('readme lint: a relative image is flagged relative-image; absolute image is clean (R2)', () => {
  const v = findReadmeLinkViolations('![dash](docs/img/dash.png)');
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'relative-image');
  assert.deepEqual(
    findReadmeLinkViolations('![dash](https://raw.githubusercontent.com/x/y/dash.png)'),
    [],
  );
});

test('readme lint is total: empty input → no violations (R1/R2)', () => {
  assert.deepEqual(findReadmeLinkViolations(''), []);
});

// ── §6 gh-theme strip: HTML images (R4) ──────────────────────────────────────

test('strip: a gh-theme HTML <img> is removed, a plain <img> survives (R4)', () => {
  const md = [
    '# tool',
    '> Part of the toolkit',
    '',
    'Intro paragraph.',
    '',
    '<img src="https://x/dark.svg#gh-dark-mode-only" alt="dark">',
    '<img src="https://x/plain.svg" alt="plain">',
  ].join('\n');
  const { slice } = extractReadme(md);
  assert.ok(!slice.includes('#gh-dark-mode-only'), 'gh-theme HTML img stripped');
  assert.ok(slice.includes('plain.svg'), 'plain HTML img survives');
});

test('strip: a gh-theme <picture> pair collapses with no empty wrapper residue (R4)', () => {
  const md = [
    '# tool',
    '',
    'Intro.',
    '',
    '<picture>',
    '  <source srcset="https://x/dark.svg#gh-dark-mode-only" media="(prefers-color-scheme: dark)">',
    '  <source srcset="https://x/light.svg#gh-light-mode-only" media="(prefers-color-scheme: light)">',
    '</picture>',
    '',
    'After.',
  ].join('\n');
  const { slice } = extractReadme(md);
  assert.ok(!slice.includes('#gh-'), 'both gh-theme sources stripped');
  assert.ok(!/<\/?picture/i.test(slice), 'empty <picture> wrapper removed');
  assert.ok(slice.includes('Intro.') && slice.includes('After.'), 'surrounding prose kept');
});

// ── §1 head-chrome hardening (R5) ────────────────────────────────────────────

test('head: a leading YAML frontmatter block is skipped, not leaked (R5)', () => {
  const md = [
    '---',
    'title: tool',
    'sidebar: false',
    '---',
    '# tool',
    '[![badge](b.svg)](href)',
    '',
    'First prose line.',
    '## Section',
  ].join('\n');
  const { slice } = extractReadme(md);
  assert.ok(slice.startsWith('First prose line.'), `frontmatter/H1/badge skipped; got: ${slice.slice(0, 40)}`);
  assert.ok(!slice.includes('title: tool'), 'frontmatter did not leak');
});

test('head: an HTML <h1> title + following badge row are skipped (R5)', () => {
  const md = [
    '<h1 align="center">Idea</h1>',
    '<p align="center"><img src="https://x/logo.svg"></p>',
    '',
    'Tagline paragraph.',
    '## Why',
  ].join('\n');
  const { slice } = extractReadme(md);
  assert.ok(slice.startsWith('Tagline paragraph.'), `HTML h1 + badge skipped; got: ${slice.slice(0, 40)}`);
  assert.ok(!/<h1/i.test(slice), 'HTML h1 did not leak');
});

test('head: a badge row using <br> separators stays contiguous chrome (R5)', () => {
  const md = [
    '# tool',
    '[![a](a.svg)](x)<br>',
    '[![b](b.svg)](y)',
    '',
    'Prose.',
  ].join('\n');
  const { slice } = extractReadme(md);
  assert.ok(slice.startsWith('Prose.'), `<br> badge row skipped; got: ${slice.slice(0, 40)}`);
});

// ── docs/site mount mirrors upstream (clear-before-write, change e52v) ────────
//
// extract-docs-site-cli.mjs writes to the REAL repo-root content/<slug>/site/
// (its repo-root is a fixed ascent from scriptDir). We exercise the real CLI as a
// subprocess against a THROWAWAY slug so the output dir (content/<throwaway>/site/)
// is isolated from real tool content, and clean it up after. This pins the
// filesystem mirror behavior (a stale page is pruned; a zero-page pull empties the
// mount) — the bug fab-kit/site/README.md exposed (the mount was purely additive).

const repoRoot = resolvePath(scriptDir, '..', '..', '..');
const docsSiteCli = join(scriptDir, 'extract-docs-site-cli.mjs');
const MIRROR_SLUG = '__e52v_mirror_test__';
const mirrorOut = join(repoRoot, 'content', MIRROR_SLUG, 'site');

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

test('docs/site mount MIRRORS upstream: a stale page is pruned, fresh page kept (e52v)', async (t) => {
  t.after(async () => {
    await rm(join(repoRoot, 'content', MIRROR_SLUG), { recursive: true, force: true });
    await rm(join(repoRoot, '.test-tmp'), { recursive: true, force: true });
  });

  // Pre-seed the mount with a stale page (as if pulled last run) + a current one.
  await mkdir(mirrorOut, { recursive: true });
  await writeFile(join(mirrorOut, 'README.md'), '# stale ghost\n', 'utf8');
  await writeFile(join(mirrorOut, 'install.md'), '# old install\n', 'utf8');

  // A fresh upstream docs/site dir that contains ONLY install.md (README.md removed upstream).
  const src = join(repoRoot, '.test-tmp', 'e52v-src', 'docs', 'site');
  await mkdir(src, { recursive: true });
  await writeFile(join(src, 'install.md'), '# new install\n', 'utf8');

  // process.execPath = the exact Node binary running the test (immune to PATH/alias drift in CI).
  execFileSync(process.execPath, [docsSiteCli, MIRROR_SLUG, src], { stdio: 'pipe' });

  assert.equal(await exists(join(mirrorOut, 'README.md')), false, 'stale README.md pruned');
  assert.equal(await exists(join(mirrorOut, 'install.md')), true, 'fresh install.md present');
  assert.equal(
    await readFile(join(mirrorOut, 'install.md'), 'utf8'),
    '# new install\n',
    'install.md overwritten with the fresh upstream copy',
  );
});

test('docs/site mount MIRRORS upstream: a zero-page pull empties the mount (e52v)', async (t) => {
  t.after(async () => {
    await rm(join(repoRoot, 'content', MIRROR_SLUG), { recursive: true, force: true });
    await rm(join(repoRoot, '.test-tmp'), { recursive: true, force: true });
  });

  // Pre-seed a mount, then pull from a docs/site dir with NO markdown (repo dropped its tree).
  await mkdir(mirrorOut, { recursive: true });
  await writeFile(join(mirrorOut, 'install.md'), '# old\n', 'utf8');
  const emptySrc = join(repoRoot, '.test-tmp', 'e52v-src-empty', 'docs', 'site');
  await mkdir(emptySrc, { recursive: true });

  execFileSync(process.execPath, [docsSiteCli, MIRROR_SLUG, emptySrc], { stdio: 'pipe' });

  assert.equal(await exists(join(mirrorOut, 'install.md')), false, 'prior page removed on a zero-page pull');
});
