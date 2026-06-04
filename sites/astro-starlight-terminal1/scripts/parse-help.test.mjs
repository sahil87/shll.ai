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
 * Asserts:
 *   - ZERO ragged flag lines across ALL committed `help/*.json`.
 *   - The explicit edge cases from the intake: `wt create` (6 flags, `string`
 *     types), `rk riff` (`--cmd cmd[=__rk_riff_pane_bare__]` placeholder with
 *     spaces), multi-word placeholders (`wt update`/`idea update`/`hop update`/
 *     `shll shell-setup`), and the `hop` prose-only root (no Flags section →
 *     empty flags, description preserved).
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

/** Find a node by its `path` across a doc tree. */
function findNode(doc, path) {
  for (const n of walk(doc.root)) if (n.path === path) return n;
  throw new Error(`node not found: ${path}`);
}

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

test('wt create: 6 real flags, string argtypes, -h preserved separately', () => {
  const node = findNode(docs.wt, 'wt create');
  const { flags } = parseHelp(node.text);
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

test('rk riff: --cmd placeholder with spaces, multi-line --layout desc not ragged', () => {
  // Help file slug is `run-kit` (the binary name is `rk`).
  const node = findNode(docs['run-kit'], 'rk riff');
  assert.deepEqual(raggedFlagLines(node.text), []);
  const { flags } = parseHelp(node.text);
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
  // The wrapped ASCII-art description folded in (default "auto" split out).
  assert.equal(layout.default, '"auto"');
});

test('multi-word placeholders captured whole, argtype null', () => {
  const cases = [
    { doc: 'wt', path: 'wt update', long: 'skip-brew-update', ph: 'brew update' },
    { doc: 'idea', path: 'idea update', long: 'skip-brew-update', ph: 'brew update' },
    { doc: 'hop', path: 'hop update', long: 'skip-brew-update', ph: 'brew update' },
    { doc: 'hop', path: 'hop ls', long: 'trees', ph: 'wt list --json' },
    {
      doc: 'shll',
      path: 'shll shell-setup',
      long: 'trust-tap',
      ph: 'brew trust --tap sahil87/tap',
    },
  ];
  for (const c of cases) {
    const node = findNode(docs[c.doc], c.path);
    const { flags } = parseHelp(node.text);
    const flag = flags.find((f) => f.long === c.long);
    assert.ok(flag, `${c.path} --${c.long} present`);
    assert.equal(flag.placeholder, c.ph, `${c.path} --${c.long} placeholder`);
    assert.equal(flag.argtype, null, `${c.path} --${c.long} argtype null`);
  }
});

test('hop root: no Flags section → empty flags, description preserved', () => {
  const node = findNode(docs.hop, 'hop');
  const parsed = parseHelp(node.text);
  assert.deepEqual(parsed.flags, [], 'prose-only root has no parsed flags');
  assert.deepEqual(parsed.globalFlags, [], 'no global flags either');
  // The hand-written Long preamble (lede + "Getting started") is preserved
  // verbatim in the description — everything before the FIRST anchor (the
  // prose `Usage:` header), per the strict anchor rule. The prose usage table
  // and "Notes" that follow that header are not force-parsed into structure;
  // they are simply not surfaced as flags (which is the load-bearing guarantee).
  assert.ok(parsed.description.includes('Getting started:'), 'Getting started kept');
  assert.ok(
    parsed.description.includes('locate, open, and operate on repos'),
    'lede kept',
  );
  assert.ok(parsed.description.length > 100, 'description is substantial, not empty');
});

test('idea add: Global Flags parsed under their own section', () => {
  const node = findNode(docs.idea, 'idea add');
  const parsed = parseHelp(node.text);
  const gnames = parsed.globalFlags.map((f) => f.long).sort();
  assert.deepEqual(gnames, ['file', 'main']);
  assert.equal(parsed.globalFlags.find((f) => f.long === 'file').argtype, 'string');
});

test('default suffix is split out of desc into default', () => {
  const node = findNode(docs.idea, 'idea list');
  const { flags } = parseHelp(node.text);
  const sort = flags.find((f) => f.long === 'sort');
  assert.equal(sort.default, '"date"');
  assert.ok(!/\(default/.test(sort.desc), 'default suffix stripped from desc');
});
