/**
 * extract-readme-cli — the thin Node CLI the scheduled readme-refresh workflow
 * calls per tool. It single-sources the deduction + divergence-reporter logic
 * from `src/lib/extract-readme.ts` (the SAME module the unit test pins), so CI
 * and the tested behavior cannot drift.
 *
 * Usage:
 *   node scripts/extract-readme-cli.mjs <slug> <raw-readme-path> [--out <path>]
 *
 *   <slug>             the help/file slug (e.g. run-kit, fab-kit, shll). Names
 *                      both help/<slug>.json (the §7 reporter's truth) and the output.
 *   <raw-readme-path>  path to the fetched raw README.md to extract from.
 *   --out <path>       where to write the slice on success. Omit to write the
 *                      slice to stdout (the §7 divergence report still goes to stderr).
 *
 * Behavior (contract §7/§8 — REPORT-ONLY, change `4s3e`):
 *   The tool repo's README is CANONICAL and is rendered verbatim. `findUnknownTokens`
 *   is a non-fatal REPORTER, not a publish gate: divergence is surfaced as a
 *   `::warning::` but never withholds the slice. The slice is ALWAYS produced when
 *   there is something to render.
 *   1. Read the raw README, run extractReadme() → the deduced + stripped slice.
 *      A missing/unreadable INPUT README is still an ERROR (exit non-zero) — there
 *      is nothing to render, so report-only does not apply.
 *   2. Load help/<slug>.json and run findUnknownTokens() — the divergence reporter.
 *      A missing/unreadable help file means we cannot VERIFY: emit an "unverified"
 *      `::warning::`, then still write the slice (canonical wins) and exit 0.
 *   3. If the reporter finds unknown command/flag tokens, print them as a
 *      `::warning::` (stderr), still WRITE the slice, and EXIT 0. The fix belongs
 *      in the tool's README, never a silent exclusion on the shll.ai side.
 *   4. Write the slice (to --out or stdout) and exit 0.
 *
 * Imports `extract-readme.ts`, which imports `parse-help.ts` (dependency-free) and
 * TYPE-ONLY from `schemas.ts` — type imports are stripped by Node's native
 * type-stripping, so this runs under plain `node` with NO `astro:content` alias
 * hook (unlike validate-help.mjs, which instantiates the Zod schema at runtime).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve as resolvePath } from 'node:path';

import {
  extractReadme,
  findUnknownTokens,
  findReadmeLinkViolations,
} from '../src/lib/extract-readme.ts';

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

// Read the raw INPUT README first — this is the canonical content. A
// missing/unreadable input is the ONE hard error here: there is nothing to
// render, so report-only does not apply (exit non-zero, write nothing).
let raw;
try {
  raw = await readFile(rawPath, 'utf8');
} catch (err) {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(`error: cannot read input README for ${slug} at ${rawPath} (${detail}).`);
  console.error('Nothing to render — refusing to write a slice (this is a real fetch failure).');
  process.exit(1);
}

const { slice } = extractReadme(raw);

// Load the tool's help document — the divergence reporter's command/flag truth.
// A missing/unreadable help file means we cannot VERIFY the slice. Under the
// report-only model the README is canonical, so we still write the slice and
// exit 0 — only emit an "unverified" warning (do NOT fail closed).
let helpDoc = null;
try {
  helpDoc = JSON.parse(await readFile(helpPath, 'utf8'));
} catch (err) {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(
    `::warning::cannot verify ${slug} — help/${slug}.json is missing or unreadable (${detail}); committing the canonical README unverified.`,
  );
}

// Divergence reporter (vn39 cross-check) — NON-FATAL. When help is present and
// the slice references command/flag tokens absent from it, surface a warning but
// STILL write the slice (canonical wins). The fix belongs in the tool README.
if (helpDoc) {
  const unknown = findUnknownTokens(slice, helpDoc);
  if (unknown.length > 0) {
    console.error(
      `::warning::${slug} README diverges from help/${slug}.json — references unknown command/flag tokens: ${unknown.join(', ')}. Rendering the canonical README anyway; fix the tool README, not the site.`,
    );
  }
}

// README-slice link lint (R1/R2) — NON-FATAL. A relative link that is not a
// `docs/site/` link, or any relative image, will 404 on the site (the consumer
// rewrites only `docs/site/` relative links; images must be absolute, §3). Warn
// but STILL write the slice — the fix is to make the link absolute in the tool
// README (the absolute-by-author rule, §9.1.2), not to censor the canonical slice.
const linkViolations = findReadmeLinkViolations(slice);
if (linkViolations.length > 0) {
  const detail = linkViolations
    .map((v) =>
      v.kind === 'relative-image'
        ? `${v.target} (relative image — images must be absolute, §3)`
        : `${v.target} (relative link not under docs/site/ — will 404; make it an absolute URL, §9.1.2)`,
    )
    .join(', ');
  console.error(
    `::warning::${slug} README slice has link/image targets that will not resolve on the site: ${detail}. Rendering the canonical README anyway; fix the tool README, not the site.`,
  );
}

if (outPath) {
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, slice, 'utf8');
  console.error(`wrote ${slice.length} bytes to ${outPath} for ${slug}`);
} else {
  process.stdout.write(slice);
  console.error(`wrote slice for ${slug}`);
}
