/**
 * extract-readme-cli — the thin Node CLI the scheduled readme-refresh workflow
 * calls per tool. It single-sources the deduction + gate logic from
 * `src/lib/extract-readme.ts` (the SAME module the unit test pins), so CI and
 * the tested behavior cannot drift.
 *
 * Usage:
 *   node scripts/extract-readme-cli.mjs <slug> <raw-readme-path> [--out <path>]
 *
 *   <slug>             the help/file slug (e.g. run-kit, fab-kit, shll). Names
 *                      both help/<slug>.json (the §7 gate's truth) and the output.
 *   <raw-readme-path>  path to the fetched raw README.md to extract from.
 *   --out <path>       where to write the slice on success. Omit to write the
 *                      slice to stdout (the §7 gate result still goes to stderr).
 *
 * Behavior (contract §7/§8):
 *   1. Read the raw README, run extractReadme() → the deduced + stripped slice.
 *   2. Load help/<slug>.json and run findUnknownTokens() — the vn39 gate.
 *   3. If the gate finds ANY unknown command/flag token, print them to stderr and
 *      EXIT NON-ZERO without writing — the workflow keeps the tool's last-good
 *      slice (per-tool failure isolation) and surfaces the defect.
 *   4. Else write the slice (to --out or stdout) and exit 0.
 *
 * Imports `extract-readme.ts`, which imports `parse-help.ts` (dependency-free) and
 * TYPE-ONLY from `schemas.ts` — type imports are stripped by Node's native
 * type-stripping, so this runs under plain `node` with NO `astro:content` alias
 * hook (unlike validate-help.mjs, which instantiates the Zod schema at runtime).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve as resolvePath } from 'node:path';

import { extractReadme, findUnknownTokens } from '../src/lib/extract-readme.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
// scripts/ -> site root -> sites/ -> repo root
const repoRoot = resolvePath(scriptDir, '..', '..', '..');

function usage(msg) {
  if (msg) console.error(`error: ${msg}`);
  console.error(
    'usage: node scripts/extract-readme-cli.mjs <slug> <raw-readme-path> [--out <path>]',
  );
  process.exit(2);
}

const args = process.argv.slice(2);
const slug = args[0];
const rawPath = args[1];
if (!slug || !rawPath) usage('both <slug> and <raw-readme-path> are required');

let outPath = null;
const outIdx = args.indexOf('--out');
if (outIdx !== -1) {
  outPath = args[outIdx + 1];
  if (!outPath) usage('--out requires a path');
}

const helpPath = join(repoRoot, 'help', `${slug}.json`);

// Load the tool's help document — the §7 gate's command/flag truth. A missing
// help file means we cannot verify the slice's command accuracy; refuse to
// commit unverified prose (fail closed), EXCEPT we still surface a clear message.
let helpDoc;
try {
  helpDoc = JSON.parse(await readFile(helpPath, 'utf8'));
} catch (err) {
  console.error(
    `gate: cannot verify ${slug} — help/${slug}.json is missing or unreadable (${err.message}).`,
  );
  console.error('Refusing to commit unverified README prose (vn39 gate cannot run).');
  process.exit(1);
}

const raw = await readFile(rawPath, 'utf8');
const { slice } = extractReadme(raw);

const unknown = findUnknownTokens(slice, helpDoc);
if (unknown.length > 0) {
  console.error(`gate FAILED for ${slug}: pulled prose references unknown command/flag tokens:`);
  for (const tok of unknown) console.error(`  - ${tok}`);
  console.error(
    'These are absent from help/' +
      slug +
      '.json (the vn39 rule). Fix the tool README, not the site. Keeping last-good slice.',
  );
  process.exit(1);
}

if (outPath) {
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, slice, 'utf8');
  console.error(`gate passed for ${slug}: wrote ${slice.length} bytes to ${outPath}`);
} else {
  process.stdout.write(slice);
  console.error(`gate passed for ${slug}`);
}
