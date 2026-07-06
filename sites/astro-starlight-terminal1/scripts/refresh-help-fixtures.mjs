/**
 * Re-freeze the parser-behavior fixtures under `scripts/fixtures/` from the
 * CURRENT committed `help/*.json` corpus.
 *
 *   cd sites/astro-starlight-terminal1
 *   node scripts/refresh-help-fixtures.mjs
 *
 * The fixtures are DELIBERATELY frozen specimens: `parse-help.test.mjs` pins
 * parser behavior against them so the daily scheduled corpus refresh
 * (refresh-help.yml) cannot rot the tests when a tool legitimately changes its
 * commands/flags. Re-running this script is therefore a DELIBERATE act — after
 * regenerating, run the tests and re-verify every pinned expectation against
 * the new specimen content before committing (a changed fixture that breaks an
 * expectation means the tool's help output changed shape, not that the parser
 * broke).
 *
 * `hop-root-prose-only.txt` is NOT in the manifest: it is a historical specimen
 * (hop v0.1.13, the last release whose root had authored prose but NO Flags
 * section) kept to pin that parser edge case, which no current tool exhibits.
 * See scripts/fixtures/README.md.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve as resolvePath } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
// scripts/ -> site root -> sites/ -> repo root -> help/
const helpDir = resolvePath(scriptDir, '..', '..', '..', 'help');
const fixtureDir = join(scriptDir, 'fixtures');

/** fixture file → source doc slug + node path (the node's `text` is frozen). */
const FIXTURES = [
  { file: 'wt-create.txt', doc: 'wt', path: 'wt create' },
  { file: 'wt-update.txt', doc: 'wt', path: 'wt update' },
  { file: 'idea-add.txt', doc: 'idea', path: 'idea add' },
  { file: 'idea-list.txt', doc: 'idea', path: 'idea list' },
  { file: 'idea-update.txt', doc: 'idea', path: 'idea update' },
  { file: 'hop-root.txt', doc: 'hop', path: 'hop' },
  { file: 'hop-ls.txt', doc: 'hop', path: 'hop ls' },
  { file: 'hop-update.txt', doc: 'hop', path: 'hop update' },
  { file: 'rk-riff.txt', doc: 'run-kit', path: 'rk riff' },
];

function* walk(node) {
  yield node;
  for (const child of node.commands ?? []) yield* walk(child);
}

function findNode(doc, path) {
  for (const n of walk(doc.root)) if (n.path === path) return n;
  throw new Error(`node not found: ${path}`);
}

await mkdir(fixtureDir, { recursive: true });

const docs = {};
console.log('| Fixture | Source | Tool version | Captured |');
console.log('|---------|--------|--------------|----------|');
for (const { file, doc: slug, path } of FIXTURES) {
  docs[slug] ??= JSON.parse(await readFile(join(helpDir, `${slug}.json`), 'utf8'));
  const doc = docs[slug];
  const node = findNode(doc, path);
  await writeFile(join(fixtureDir, file), node.text);
  console.log(
    `| \`${file}\` | \`help/${slug}.json\` node \`${path}\` | ${doc.version} | ${doc.captured_at} |`,
  );
}
console.log('\nFrozen. Now run: node --test scripts/parse-help.test.mjs');
console.log('(and update scripts/fixtures/README.md provenance from the table above)');
