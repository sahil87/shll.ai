/**
 * Unit test for `src/lib/parse-help.ts`. Run with the site's pnpm-installed
 * Node toolchain (>=22, native `.ts` type-stripping), mirroring how
 * `scripts/validate-help.mjs` runs:
 *
 *   cd sites/astro-starlight-terminal1
 *   node --test scripts/parse-help.test.mjs
 *
 * Unlike validate-help, this needs NO `astro:content` alias hook — `parse-help.ts`
 * is dependency-free pure TypeScript, so Node imports it directly.
 *
 * TWO test natures, deliberately split:
 *
 *   - LIVE-CORPUS INVARIANTS run against every committed `help/*.json`:
 *     properties that must hold for ANY corpus content (zero ragged flag lines,
 *     sanity floors). These are the canary for a scheduled refresh committing
 *     help output the parser can't decompose.
 *
 *   - BEHAVIOR SPECIMENS run against FROZEN fixtures in `scripts/fixtures/`
 *     (see its README for provenance + re-freeze procedure). These pin exact
 *     parser output — specific flags, placeholders, usage, prose boundaries —
 *     and MUST NOT read the live corpus: the daily refresh-help.yml commits new
 *     tool releases whose commands/flags legitimately change, which rotted the
 *     previous live-pinned expectations (idea grew a `--system` global, hop's
 *     root grew a Flags section, shll dropped `shell-setup --trust-tap`).
 *     Specimen edge cases: `wt create` (6 flags, `string` types), `rk riff`
 *     (`--cmd cmd[=__rk_riff_pane_bare__]` placeholder with spaces), multi-word
 *     placeholders, and the prose-only root (no Flags section → empty flags,
 *     description preserved — hop v0.1.13, a shape no current tool exhibits).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve as resolvePath } from 'node:path';

import { parseHelp, raggedFlagLines } from '../src/lib/parse-help.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
// scripts/ -> site root -> sites/ -> repo root -> help/
const helpDir = resolvePath(scriptDir, '..', '..', '..', 'help');
const fixtureDir = join(scriptDir, 'fixtures');

/** Load and JSON-parse every `help/*.json`, keyed by file slug. */
async function loadHelpDocs() {
  const entries = await readdir(helpDir);
  const files = entries.filter((f) => f.endsWith('.json')).sort();
  const docs = {};
  for (const f of files) {
    docs[f.replace(/\.json$/, '')] = JSON.parse(await readFile(join(helpDir, f), 'utf8'));
  }
  return docs;
}

/** Depth-first walk yielding every node (root + all subcommands). */
function* walk(node) {
  yield node;
  for (const child of node.commands ?? []) yield* walk(child);
}

/** Read a frozen `-h` text specimen from scripts/fixtures/. */
async function fixture(name) {
  return readFile(join(fixtureDir, name), 'utf8');
}

// ── Live-corpus invariants ───────────────────────────────────────────────────

const docs = await loadHelpDocs();
const docCount = Object.keys(docs).length;

test('corpus is non-empty', () => {
  assert.ok(docCount >= 6, `expected >= 6 help files, got ${docCount}`);
});

test('ZERO ragged flag lines across the entire committed corpus', () => {
  let nodeCount = 0;
  let flagCount = 0;
  const offenders = [];
  for (const [slug, doc] of Object.entries(docs)) {
    for (const node of walk(doc.root)) {
      nodeCount += 1;
      const ragged = raggedFlagLines(node.text);
      if (ragged.length > 0) {
        offenders.push({ slug, path: node.path, ragged });
      }
      const parsed = parseHelp(node.text);
      flagCount += parsed.flags.length + parsed.globalFlags.length;
    }
  }
  assert.equal(
    offenders.length,
    0,
    `ragged flag lines found:\n${JSON.stringify(offenders, null, 2)}`,
  );
  // Sanity floor — the prototype counted 156 flags incl. globals; we should be
  // comfortably above zero so a regression that parses nothing is caught.
  assert.ok(flagCount >= 100, `expected >= 100 parsed flags, got ${flagCount}`);
  assert.ok(nodeCount >= 100, `expected >= 100 nodes, got ${nodeCount}`);
});

// ── Behavior specimens (frozen fixtures — never the live corpus) ─────────────

test('wt create: 6 real flags, string argtypes, -h preserved separately', async () => {
  const { flags } = parseHelp(await fixture('wt-create.txt'));
  const byLong = Object.fromEntries(flags.map((f) => [f.long, f]));

  // Includes the -h/--help row at parse time (suppression is a render concern).
  assert.ok(flags.some((f) => f.long === 'help' && f.short === 'h'));

  const real = flags.filter((f) => f.long !== 'help');
  assert.equal(real.length, 6, `expected 6 non-help flags, got ${real.length}`);

  // string-typed flags expose argtype = "string".
  for (const name of ['base', 'worktree-init', 'worktree-name', 'worktree-open']) {
    assert.equal(byLong[name].argtype, 'string', `${name} argtype`);
    assert.equal(byLong[name].placeholder, 'string', `${name} placeholder`);
  }
  // boolean switches have no placeholder/argtype.
  assert.equal(byLong['non-interactive'].placeholder, null);
  assert.equal(byLong['non-interactive'].argtype, null);
  assert.equal(byLong['reuse'].placeholder, null);
});

test('rk riff: --cmd placeholder with spaces, multi-line --layout desc not ragged', async () => {
  const text = await fixture('rk-riff.txt');
  assert.deepEqual(raggedFlagLines(text), []);
  const { flags } = parseHelp(text);
  const cmd = flags.find((f) => f.long === 'cmd');
  assert.ok(cmd, '--cmd flag present');
  assert.equal(cmd.placeholder, 'cmd[=__rk_riff_pane_bare__]');
  assert.equal(cmd.argtype, null, 'bracketed placeholder is not a simple type');

  const skill = flags.find((f) => f.long === 'skill');
  assert.equal(skill.placeholder, 'skill[=__rk_riff_pane_bare__]');

  const count = flags.find((f) => f.long === 'count');
  assert.equal(count.short, 'N');
  assert.equal(count.argtype, 'int');
  assert.equal(count.default, '1');

  const layout = flags.find((f) => f.long === 'layout');
  assert.equal(layout.argtype, 'string');
  // The trailing `(default "auto")` (which Cobra wraps onto the LAST line of the
  // desc, after the ASCII art) is split out into `default`.
  assert.equal(layout.default, '"auto"');
  // Multi-line content is now PRESERVED, not collapsed to a single space: the
  // wrapped continuation lines keep their newlines AND original indentation so
  // the ASCII layout diagram survives intact for rendering (white-space:pre-wrap).
  assert.ok(layout.desc.includes('\n'), 'layout desc retains line breaks');
  assert.ok(layout.desc.includes('┌───┬───┐'), 'ASCII diagram preserved verbatim');
  assert.ok(
    layout.desc.includes('\n                                                t, tiled'),
    'continuation indentation preserved (not trimmed to a single space)',
  );
  // The first line is untouched; the mid-sentence "(default ...)" prose stays.
  assert.equal(
    layout.desc.split('\n')[0],
    'Pane layout (default "auto"). layout name (canonical + shortform):',
  );
  // The genuine trailing default token is removed from the desc; the bare
  // continuation line that held only "(default "auto")" is dropped entirely.
  assert.ok(
    !/\(default\s+[^)]*\)\s*$/.test(layout.desc),
    'trailing default token stripped from desc',
  );
});

test('multi-word placeholders captured whole, argtype null', async () => {
  // A 5th specimen (`shll shell-setup --trust-tap`, placeholder "brew trust
  // --tap sahil87/tap") was retired when shll v0.0.20 removed the flag (tap
  // trust moved into `shll install`). These four cover the same grammar.
  const cases = [
    { file: 'wt-update.txt', long: 'skip-brew-update', ph: 'brew update' },
    { file: 'idea-update.txt', long: 'skip-brew-update', ph: 'brew update' },
    { file: 'hop-update.txt', long: 'skip-brew-update', ph: 'brew update' },
    { file: 'hop-ls.txt', long: 'trees', ph: 'wt list --json' },
  ];
  for (const c of cases) {
    const { flags } = parseHelp(await fixture(c.file));
    const flag = flags.find((f) => f.long === c.long);
    assert.ok(flag, `${c.file} --${c.long} present`);
    assert.equal(flag.placeholder, c.ph, `${c.file} --${c.long} placeholder`);
    assert.equal(flag.argtype, null, `${c.file} --${c.long} argtype null`);
  }
});

test('prose-only root: no Flags section → empty flags', async () => {
  const parsed = parseHelp(await fixture('hop-root-prose-only.txt'));
  assert.deepEqual(parsed.flags, [], 'prose-only root has no parsed flags');
  assert.deepEqual(parsed.globalFlags, [], 'no global flags either');
});

test('prose-only root: ALL hand-written Long prose is preserved verbatim in the description', async () => {
  // hop's Long is large and contains header-LOOKING prose ("Getting started:",
  // "Cheat sheet:", "Notes:"). The boundary is the START of Cobra's GENERATED
  // tail (the last contiguous run of known anchors), NOT the first anchor — so
  // ALL of that authored prose, including its bodies, stays in `description`
  // verbatim rather than being dropped or mis-parsed into sections.
  const d = parseHelp(await fixture('hop-root-prose-only.txt')).description;
  assert.ok(d.includes('locate, open, and operate on repos'), 'lede kept');
  assert.ok(d.includes('Getting started:'), 'Getting started header kept');
  assert.ok(d.includes('Cheat sheet:'), 'Cheat sheet header kept');
  assert.ok(d.includes('cd into the repo'), 'Cheat sheet body kept');
  assert.ok(d.includes('Notes:'), 'Notes header kept');
  assert.ok(d.includes('auto-resolve'), 'Notes body kept');
  assert.ok(d.length > 1000, 'description is the full Long, not truncated');
});

test("prose-only root: usage is Cobra's generated block only, not the prose Cheat sheet", async () => {
  // Only the real generated `Usage:` (after the prose) is structured. The Cheat
  // sheet's invocation list must NOT become copyable usage rows.
  const parsed = parseHelp(await fixture('hop-root-prose-only.txt'));
  assert.deepEqual(parsed.usage, ['hop', 'hop [command]'], 'short Cobra usage only');
  assert.ok(
    !parsed.usage.some((l) => /cd into the repo|Notes:|Cheat sheet:/i.test(l)),
    'no authored prose leaked into usage',
  );
});

test('root with flags AFTER authored prose: flags parsed, prose still preserved', async () => {
  // hop v0.1.16+ grew a root Flags section (`--all`) — the shape that obsoleted
  // the live-corpus pin above. Both shapes are now pinned: prose-only (fixture
  // hop-root-prose-only.txt) and prose-then-generated-Flags (this one).
  const parsed = parseHelp(await fixture('hop-root.txt'));
  assert.ok(
    parsed.flags.some((f) => f.long === 'all'),
    '--all parsed from the generated Flags section',
  );
  assert.deepEqual(parsed.usage, ['hop [flags]', 'hop [command]']);
  assert.ok(parsed.description.includes('Cheat sheet:'), 'authored prose still in description');
  assert.ok(
    !parsed.usage.some((l) => /cd into the repo|Notes:|Cheat sheet:/i.test(l)),
    'no authored prose leaked into usage',
  );
});

test('idea add: Global Flags parsed under their own section', async () => {
  const parsed = parseHelp(await fixture('idea-add.txt'));
  const gnames = parsed.globalFlags.map((f) => f.long).sort();
  // idea v0.0.14 added the --system global (three globals; earlier releases had two).
  assert.deepEqual(gnames, ['file', 'main', 'system']);
  assert.equal(parsed.globalFlags.find((f) => f.long === 'file').argtype, 'string');
});

test('default suffix is split out of desc into default', async () => {
  const { flags } = parseHelp(await fixture('idea-list.txt'));
  const sort = flags.find((f) => f.long === 'sort');
  assert.equal(sort.default, '"date"');
  assert.ok(!/\(default/.test(sort.desc), 'default suffix stripped from desc');
});
