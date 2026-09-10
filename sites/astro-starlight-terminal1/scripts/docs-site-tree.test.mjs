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
 *   - FENCE-AWARE (change mr4y): both `firstH1` and `stripFirstH1` skip lines
 *     inside fenced code blocks via one shared scanner — a `# comment` inside a
 *     fence is neither the derived title nor stripped (tilde fences and a
 *     longer-outer/shorter-inner fence included).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { firstH1, stripFirstH1 } from '../src/lib/docs-site-tree.ts';

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

test('does NOT strip a non-H1 heading (an H3 is left untouched)', () => {
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

// ── Fence-awareness (change mr4y) ────────────────────────────────────────────
// A `# comment` line inside a fenced code block is code, not a heading: it is
// neither the derived title nor stripped. Both functions share one fence-aware
// scanner, so title and strip stay aligned by construction.

test('a leading fenced block containing `# not a title` is skipped by BOTH title and strip', () => {
  const md = '```bash\n# not a title\necho hi\n```\n\n# Real Title\n\nBody.\n';
  assert.equal(firstH1(md), 'Real Title');
  const out = stripFirstH1(md);
  // The fence and its `# not a title` line are preserved; only the real H1
  // (plus one following blank) is removed.
  assert.equal(out, '```bash\n# not a title\necho hi\n```\n\nBody.\n');
});

test('a TILDE fence also hides a `# x` line from title and strip', () => {
  const md = '~~~js\n# x\n~~~\n\n# After Tilde\n\ntext\n';
  assert.equal(firstH1(md), 'After Tilde');
  assert.equal(stripFirstH1(md), '~~~js\n# x\n~~~\n\ntext\n');
});

test('a 4-backtick fence is NOT closed by an inner 3-backtick line (CommonMark)', () => {
  const md = '````\n```\n# x\n````\n\n# Real Title\n\nbody\n';
  assert.equal(firstH1(md), 'Real Title', 'the inner ``` does not close the outer fence');
  assert.equal(stripFirstH1(md), '````\n```\n# x\n````\n\nbody\n');
});

test('a page whose ONLY `# ...` line is inside a fence: title null, strip no-op', () => {
  const md = '```bash\n# only a comment\n```\n\nNo heading here.\n';
  assert.equal(firstH1(md), null);
  assert.equal(stripFirstH1(md), md);
});
