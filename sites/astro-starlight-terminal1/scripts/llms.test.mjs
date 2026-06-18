/**
 * Unit test for the pure helpers in `src/lib/llms.ts` (change 354p). Run with
 * the site's pnpm-installed Node toolchain (>=22, native `.ts` type-stripping):
 *
 *   cd sites/astro-starlight-terminal1
 *   node --test scripts/llms.test.mjs
 *
 * `src/lib/llms.ts` imports `HelpDocSchema` from `schemas.ts`, which imports `z`
 * from the `astro:content` virtual module (only resolvable inside an Astro
 * build). So — exactly like `validate-help.mjs` — we register the
 * `astro-content-alias.mjs` resolve hook to alias `astro:content` → `astro/zod`
 * before importing the lib, then exercise the dependency-free pure functions
 * (`stripToolPrefix`, `renderCommandTree`, `flattenMdx`, and `TOOLS`).
 */
import { register } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';

// Alias `astro:content` -> `astro/zod` before importing the lib (transitive
// schemas.ts import). Must run before the dynamic import below.
register('./astro-content-alias.mjs', import.meta.url);

const { TOOLS, stripToolPrefix, renderCommandTree, flattenMdx } = await import(
  '../src/lib/llms.ts'
);

test('TOOLS lists the canonical seven tools', () => {
  assert.deepEqual(
    [...TOOLS].sort(),
    ['fab-kit', 'hop', 'idea', 'run-kit', 'shll', 'tu', 'wt'],
  );
});

test('stripToolPrefix drops a leading `<bin> — ` prefix', () => {
  assert.equal(
    stripToolPrefix('rk — tmux session manager with web UI', 'rk'),
    'tmux session manager with web UI',
  );
});

test('stripToolPrefix leaves a short without the prefix untouched', () => {
  assert.equal(
    stripToolPrefix('meta-CLI for the sahil87 toolkit', 'shll'),
    'meta-CLI for the sahil87 toolkit',
  );
  // Wrong bin name → no strip.
  assert.equal(
    stripToolPrefix('rk — tmux session manager', 'wt'),
    'rk — tmux session manager',
  );
});

test('stripToolPrefix is idempotent', () => {
  const once = stripToolPrefix('rk — tmux session manager', 'rk');
  assert.equal(stripToolPrefix(once, 'rk'), once);
});

test('renderCommandTree renders the root even with zero subcommands', () => {
  const root = { name: 'tu', path: 'tu', short: 'cost tracking CLI', usage: '', text: '', commands: [] };
  assert.equal(renderCommandTree(root), 'tu — cost tracking CLI');
});

test('renderCommandTree indents nested commands by depth', () => {
  const root = {
    name: 'wt', path: 'wt', short: 'worktree mgmt', usage: '', text: '',
    commands: [
      { name: 'create', path: 'wt create', short: 'Create a worktree', usage: '', text: '', commands: [] },
      {
        name: 'list', path: 'wt list', short: '', usage: '', text: '',
        commands: [
          { name: 'all', path: 'wt list all', short: 'list all', usage: '', text: '', commands: [] },
        ],
      },
    ],
  };
  assert.equal(
    renderCommandTree(root),
    [
      'wt — worktree mgmt',
      '  wt create — Create a worktree',
      '  wt list',
      '    wt list all — list all',
    ].join('\n'),
  );
});

test('flattenMdx strips import lines', () => {
  const out = flattenMdx("import GithubButton from '../x.astro';\n\nReal prose here.");
  assert.ok(!out.includes('import'), `import line survived: ${out}`);
  assert.ok(out.includes('Real prose here.'));
});

test('flattenMdx drops self-closing and paired JSX component tags, keeps children', () => {
  const out = flattenMdx('<GithubButton tool="run-kit" />\n\n<Card>Inner text</Card>\n\nTail.');
  assert.ok(!out.includes('<GithubButton'), `self-closing tag survived: ${out}`);
  assert.ok(!out.includes('<Card>') && !out.includes('</Card>'), `paired tag survived: ${out}`);
  assert.ok(out.includes('Inner text'), 'paired-tag children dropped');
  assert.ok(out.includes('Tail.'));
});

test('flattenMdx leaves ordinary markdown and lowercase tokens alone', () => {
  const md = '## Heading\n\n- a list item with `code`\n\nUse `a < b` in prose.';
  assert.equal(flattenMdx(md), md);
});

test('flattenMdx strips a leading YAML frontmatter block', () => {
  const out = flattenMdx('---\ntitle: X\ndescription: Y\n---\n\nBody prose.');
  assert.ok(!out.includes('title: X'), `frontmatter survived: ${out}`);
  assert.equal(out, 'Body prose.');
});
