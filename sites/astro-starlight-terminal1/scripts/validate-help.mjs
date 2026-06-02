/**
 * Validate every `help/<tool>.json` at the repo root against the contract
 * Zod schema (`src/lib/schemas.ts`). Exits non-zero on any failure.
 *
 * Run from the live site directory using its pnpm-installed toolchain:
 *
 *   cd sites/astro-starlight-terminal1
 *   node scripts/validate-help.mjs
 *
 * The contract schema imports `z` from the `astro:content` virtual module,
 * which only resolves inside an Astro build. This script registers a resolve
 * hook (`astro-content-alias.mjs`) that aliases `astro:content` to `astro/zod`
 * — the same `z` Astro re-exports — so the SAME schema module validates the
 * data with no duplicated shape. Node strips the `.ts` types natively.
 */
import { register } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve as resolvePath } from 'node:path';

// Alias `astro:content` -> `astro/zod` before importing the schema module.
register('./astro-content-alias.mjs', import.meta.url);

const { HelpDocSchema } = await import('../src/lib/schemas.ts');

const scriptDir = dirname(fileURLToPath(import.meta.url));
// scripts/ -> site root -> sites/ -> repo root -> help/
const helpDir = resolvePath(scriptDir, '..', '..', '..', 'help');

const entries = await readdir(helpDir);
const jsonFiles = entries.filter((f) => f.endsWith('.json')).sort();

if (jsonFiles.length === 0) {
  console.error(`No help/*.json files found in ${helpDir}`);
  process.exit(1);
}

let failures = 0;
for (const file of jsonFiles) {
  const path = join(helpDir, file);
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    console.error(`FAIL ${file}: invalid JSON — ${err.message}`);
    failures += 1;
    continue;
  }

  const result = HelpDocSchema.safeParse(parsed);
  if (result.success) {
    console.log(`PASS ${file}`);
  } else {
    console.error(`FAIL ${file}:`);
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`\n${failures} of ${jsonFiles.length} help file(s) failed validation.`);
  process.exit(1);
}

console.log(`\nAll ${jsonFiles.length} help file(s) conform to the schema.`);
