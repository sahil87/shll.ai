/**
 * Unit test for `src/lib/docs-site-tree.ts`. Run with the site's pnpm-installed
 * Node toolchain (>=22, native `.ts` type-stripping), mirroring how
 * `scripts/extract-readme.test.mjs` runs:
 *
 *   cd sites/astro-starlight-terminal1
 *   node --test scripts/docs-site-tree.test.mjs
 *
 * `docs-site-tree.ts` imports only `node:fs` / `node:path` (dependency-free), so no
 * `astro:content` alias hook is needed — a plain static import works.
 *
 * Pins the `stripFirstH1` contract (change h0q6 — render-side H1 de-duplication):
 *   - H1 on line 1 → line removed, rest byte-identical (adjacent blank collapsed).
 *   - No H1 anywhere → input returned UNCHANGED (fallback-title pages keep body).
 *   - Strip targets the SAME line `firstH1` derives the title from, incl. a first
 *     H1 not on line 1 (title/strip alignment — the load-bearing invariant).
 *   - An `## H2`-only document is unchanged (only ATX H1 is stripped).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { stripFirstH1 } from '../src/lib/docs-site-tree.ts';

// ── H1 on line 1 ─────────────────────────────────────────────────────────────

test('strips a first-line H1 and collapses the following blank line', () => {
  const md = '# Title\n\nBody paragraph.\n\n## Section\ntext\n';
  assert.equal(stripFirstH1(md), 'Body paragraph.\n\n## Section\ntext\n');
});

test('strips a first-line H1 with no following blank line', () => {
  const md = '# Title\nBody immediately after.\n';
  assert.equal(stripFirstH1(md), 'Body immediately after.\n');
});

test('collapses only ONE following blank line, preserving the rest', () => {
  const md = '# Title\n\n\nBody after two blanks.\n';
  // The H1 line + exactly one blank are dropped; the second blank survives.
  assert.equal(stripFirstH1(md), '\nBody after two blanks.\n');
});

// ── No H1 anywhere → unchanged ───────────────────────────────────────────────

test('returns input unchanged when there is no ATX H1 (fallback-title page)', () => {
  const md = 'Just prose, no heading.\n\nMore prose.\n';
  assert.equal(stripFirstH1(md), md);
});

test('does NOT strip an H2-only document', () => {
  const md = '## Section\n\nBody under an h2.\n';
  assert.equal(stripFirstH1(md), md);
});

test('does NOT treat a fenced-code `#` comment line ... only real ATX H1 matches firstH1', () => {
  // firstH1's matcher requires `# ` at line start; an h2/h3 never matches.
  const md = '### Deep heading\n\ntext\n';
  assert.equal(stripFirstH1(md), md);
});

// ── Title/strip alignment (the load-bearing invariant) ───────────────────────

test('strips the SAME line firstH1 matches when the first H1 is not on line 1', () => {
  // Leading front-matter-ish / blank lines before the first real H1.
  const md = '\n\n# The Real Title\n\nBody.\n';
  const out = stripFirstH1(md);
  // The first H1 line (and its following blank) is removed; earlier blanks stay.
  assert.equal(out, '\n\nBody.\n');
  // Alignment sanity: the removed heading text is gone from the output.
  assert.ok(!out.includes('# The Real Title'));
});

test('leaves a SECOND H1 in place (only the first is stripped)', () => {
  const md = '# First\n\nmiddle\n\n# Second\n\nend\n';
  assert.equal(stripFirstH1(md), 'middle\n\n# Second\n\nend\n');
});

test('handles an empty string without error', () => {
  assert.equal(stripFirstH1(''), '');
});
