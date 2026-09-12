/**
 * stub.test.mjs — hermetic unit + integration tests for the shll.ai
 * redirect-stub generator. No network: unit tests run against the synthetic
 * `fixtures/sample-map.json` (deliberately NOT a copy of the live map, so it
 * cannot become a stale second table), and the integration case serves the
 * map and byte copies from an in-process node:http server.
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';
import {
  KEEP_ON_SHLL_AI,
  applyRules,
  canonicalPath,
  checkFloor,
  isFileLike,
  render404,
  renderSecurityTxt,
  renderStub,
  validateByteCopy,
  validateMap,
} from './lib.mjs';

const SITE_DIR = path.dirname(fileURLToPath(import.meta.url));
const BUILD = path.join(SITE_DIR, 'build.mjs');
const SAMPLE_MAP = JSON.parse(await readFile(path.join(SITE_DIR, 'fixtures', 'sample-map.json'), 'utf8'));

/** A deep copy of the sample map with `patch` applied (test-local mutation). */
function mapWith(patch) {
  return { ...structuredClone(SAMPLE_MAP), ...patch };
}

test('canonicalPath canonicalizes slashes and file-like paths', () => {
  assert.equal(canonicalPath('/'), '/');
  assert.equal(canonicalPath(''), '/');
  assert.equal(canonicalPath('/tools/wt/readme'), '/tools/wt/readme/');
  assert.equal(canonicalPath('/tools//wt/readme/'), '/tools/wt/readme/');
  assert.equal(canonicalPath('wt'), '/wt/');
  assert.equal(canonicalPath('/llms.txt'), '/llms.txt');
  assert.equal(canonicalPath('/foo.png'), '/foo.png');
});

test('applyRules resolves the spec §4 sample paths', () => {
  const rules = SAMPLE_MAP.rules;
  assert.equal(applyRules(rules, '/tools/run-kit/gui'), '/docs/gui/');
  assert.equal(applyRules(rules, '/tools/wt/readme'), '/wt/readme/');
  assert.equal(applyRules(rules, '/getting-started/install/'), '/toolkit/install/');
  assert.equal(applyRules(rules, '/foo.png'), '/foo.png');
});

test('isFileLike keys on a dot in the last segment', () => {
  assert.equal(isFileLike('/llms.txt'), true);
  assert.equal(isFileLike('/versions.json'), true);
  assert.equal(isFileLike('/wt/readme/'), false);
  assert.equal(isFileLike('/'), false);
});

test('validateMap accepts the sample map', () => {
  validateMap(SAMPLE_MAP);
});

test('validateMap rejects a wrong schema', () => {
  assert.throws(() => validateMap(mapWith({ schema: 2 })), /schema/);
});

test('validateMap rejects a missing keep entry', () => {
  assert.throws(() => validateMap(mapWith({ keep: ['/install'] })), /keep/);
});

test('validateMap rejects a non-canonical key', () => {
  const map = mapWith({});
  map.redirects = { ...map.redirects, '/tools/wt/readme': 'https://hexokit.com/wt/readme/' };
  assert.throws(() => validateMap(map), /\/tools\/wt\/readme.*not canonical/);
});

test('validateMap rejects an off-origin value', () => {
  const map = mapWith({});
  map.redirects = { ...map.redirects, '/wt/': 'https://example.com/wt/' };
  assert.throws(() => validateMap(map), /\/wt\//);
});

test('validateMap rejects a keep path used as a redirects key', () => {
  const map = mapWith({});
  map.redirects = { ...map.redirects, '/install/': 'https://hexokit.com/install' };
  assert.throws(() => validateMap(map), /keep/);
});

test('validateMap rejects rules without the identity catch-all', () => {
  const map = mapWith({ rules: SAMPLE_MAP.rules.slice(0, -1) });
  assert.throws(() => validateMap(map), /identity catch-all/);
});

test('validateMap rejects a broken equivalence invariant', () => {
  const map = mapWith({});
  map.redirects = { ...map.redirects, '/wt/': 'https://hexokit.com/elsewhere/wt/' };
  assert.throws(() => validateMap(map), /equivalence invariant.*\/wt\//);
});

test('checkFloor returns every missing path and nothing else', () => {
  const floor = '# comment\n\n/\n/run-kit/\n/fab-kit/fkf/\n/install\n/versions.json\n/tools/wt/readme/\n';
  assert.deepEqual(checkFloor(SAMPLE_MAP, floor), ['/fab-kit/fkf/']);
});

test('validateByteCopy accepts good copies and rejects the failures they exist to prevent', () => {
  validateByteCopy('/install', '#!/bin/sh\necho hi\n');
  validateByteCopy('/versions.json', JSON.stringify({ schema: 1, tools: { 'run-kit': { version: '1.0.0' } } }));
  validateByteCopy('/llms.txt', '# hexokit\n');

  assert.throws(() => validateByteCopy('/install', '<html>404</html>'), /\/install.*#!\/bin\/sh/);
  assert.throws(() => validateByteCopy('/versions.json', '<html>404</html>'), /\/versions\.json/);
  assert.throws(() => validateByteCopy('/versions.json', JSON.stringify({ schema: 1, tools: {} })), /tools/);
  assert.throws(() => validateByteCopy('/llms.txt', '<html>404</html>'), /llms\.txt/);
  assert.throws(() => validateByteCopy('/llms.txt', ''), /llms\.txt/);
});

test('renderStub carries all four redirect mechanisms with the escaped target', () => {
  const target = 'https://hexokit.com/wt/readme/';
  const html = renderStub(target);
  assert.match(html, new RegExp(`<meta http-equiv="refresh" content="0; url=${target}">`));
  assert.match(html, new RegExp(`<link rel="canonical" href="${target}">`));
  assert.match(html, new RegExp(`<a href="${target}">${target}</a>`));
  assert.match(html, new RegExp(`<script>location\\.replace\\(${JSON.stringify(target)}\\)</script>`));
  assert.match(html, /<title>Moved to hexokit\.com<\/title>/);
  assert.match(html, /:root\{color-scheme:light dark\}/);
  assert.match(html, /a:focus-visible/);
  assert.doesNotMatch(html, /noindex/);
  assert.doesNotMatch(html, /src=|@import|url\(http/);
});

test('renderStub escapes a hostile target in HTML and JSON contexts', () => {
  const target = 'https://hexokit.com/x/"<script>&/';
  const html = renderStub(target);
  assert.ok(!html.includes(`content="0; url=${target}"`), 'raw target must not appear in an attribute');
  assert.match(html, /&quot;&lt;script&gt;&amp;/);
  assert.match(html, /location\.replace\("https:\/\/hexokit\.com\/x\/\\"\\u003cscript>&\/"\)/);
});

test('render404 embeds the fetched map and its inline script resolves the sample paths', () => {
  const html = render404(SAMPLE_MAP.to, SAMPLE_MAP.rules);
  assert.match(html, /const MAP = \{/);
  assert.match(html, /function canonicalPath/);
  assert.match(html, /function applyRules/);
  // No-JS fallback: a plain link to the hexokit.com root.
  assert.match(html, new RegExp(`<a id="target" href="${SAMPLE_MAP.to}/">${SAMPLE_MAP.to}/</a>`));

  const script = html.match(/<script>\n([\s\S]*?)\n<\/script>/)[1];
  const cases = [
    ['/tools/run-kit/gui', '', '', 'https://hexokit.com/docs/gui/'],
    ['/tools/wt/readme', '', '', 'https://hexokit.com/wt/readme/'],
    ['/getting-started/install/', '', '', 'https://hexokit.com/toolkit/install/'],
    ['/foo.png', '', '', 'https://hexokit.com/foo.png'],
    ['/never-existed/', '?a=1', '#frag', 'https://hexokit.com/never-existed/?a=1#frag'],
  ];
  for (const [pathname, search, hash, expected] of cases) {
    const link = {};
    const replaced = [];
    const context = {
      location: { pathname, search, hash, replace: (url) => replaced.push(url) },
      document: { getElementById: () => link },
    };
    vm.runInNewContext(script, context);
    assert.deepEqual(replaced, [expected], `location.replace for ${pathname}`);
    assert.equal(link.href, expected);
    assert.equal(link.textContent, expected);
  }
});

test('renderSecurityTxt names shll.ai as canonical and expires 6 months out', () => {
  const now = new Date('2026-09-12T09:13:00.000Z');
  const text = renderSecurityTxt(now);
  const lines = text.split('\n');
  assert.deepEqual(lines, [
    'Contact: https://github.com/sahil87/.github/security/advisories/new',
    'Expires: 2027-03-12T09:13:00.000Z',
    'Canonical: https://shll.ai/.well-known/security.txt',
    'Policy: https://github.com/sahil87/.github/blob/main/SECURITY.md',
    'Preferred-Languages: en',
    '',
  ]);
});

const INTEGRATION_ROUTES = {
  '/shll-ai-redirects.json': JSON.stringify(SAMPLE_MAP),
  '/install': '#!/bin/sh\necho install\n',
  '/versions.json': JSON.stringify({ schema: 1, generated_at: '2026-09-12T00:00:00.000Z', tools: { 'run-kit': { version: '1.0.0' } } }),
  '/llms.txt': '# hexokit\n',
  '/llms-full.txt': '# hexokit full\n',
};

const INTEGRATION_FLOOR = '# small floor matching the sample map\n/\n/run-kit/\n/tools/wt/readme/\n/install\n/versions.json\n';

/** Serve INTEGRATION_ROUTES (404 otherwise) on an ephemeral localhost port. */
async function serveRoutes(routes) {
  const server = http.createServer((req, res) => {
    const body = routes[req.url];
    if (body === undefined) {
      res.writeHead(404).end('not found');
    } else {
      res.writeHead(200).end(body);
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function listFiles(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(dir, entry.name), rel)));
    } else {
      files.push(rel);
    }
  }
  return files.sort();
}

const execFileAsync = promisify(execFile);

/** Run the real build CLI in a child process (async — the in-process HTTP
 *  server needs the event loop free to answer). Never rejects. */
async function runBuild(args) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [BUILD, ...args], { encoding: 'utf8' });
    return { status: 0, stdout, stderr };
  } catch (err) {
    return { status: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? String(err) };
  }
}

test('integration: build emits exactly the R6 file set from a served sample map', async (t) => {
  const { server, origin } = await serveRoutes(INTEGRATION_ROUTES);
  const tmp = await mkdtemp(path.join(tmpdir(), 'shll-ai-stub-'));
  t.after(async () => {
    server.close();
    await rm(tmp, { recursive: true, force: true });
  });
  const out = path.join(tmp, 'dist');
  const floor = path.join(tmp, 'floor.txt');
  await writeFile(floor, INTEGRATION_FLOOR);

  const result = await runBuild(['--origin', origin, '--out', out, '--floor', floor]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /6 stubs, 4 byte copies, rules: 8/);

  const expected = [
    '.well-known/security.txt',
    '404.html',
    'CNAME',
    'getting-started/install/index.html',
    'index.html',
    'install',
    'llms-full.txt',
    'llms.txt',
    'robots.txt',
    'run-kit/gui/index.html',
    'run-kit/index.html',
    'tools/wt/readme/index.html',
    'versions.json',
    'wt/index.html',
  ];
  assert.deepEqual(await listFiles(out), expected);

  assert.equal(await readFile(path.join(out, 'CNAME'), 'utf8'), 'shll.ai\n');
  assert.equal(await readFile(path.join(out, 'robots.txt'), 'utf8'), 'User-agent: *\nAllow: /\n');
  assert.equal(await readFile(path.join(out, 'install'), 'utf8'), INTEGRATION_ROUTES['/install']);
  const stub = await readFile(path.join(out, 'tools', 'wt', 'readme', 'index.html'), 'utf8');
  assert.match(stub, /content="0; url=https:\/\/hexokit\.com\/wt\/readme\/"/);
  const notFound = await readFile(path.join(out, '404.html'), 'utf8');
  assert.match(notFound, /"to":"https:\/\/hexokit\.com"/);
});

test('integration: a 404 map fails closed and writes nothing', async (t) => {
  const { server, origin } = await serveRoutes({}); // every route 404s
  const tmp = await mkdtemp(path.join(tmpdir(), 'shll-ai-stub-'));
  t.after(async () => {
    server.close();
    await rm(tmp, { recursive: true, force: true });
  });
  const out = path.join(tmp, 'dist');

  const result = await runBuild(['--origin', origin, '--out', out, '--floor', path.join(tmp, 'floor.txt')]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, new RegExp(`${origin}/shll-ai-redirects\\.json.*HTTP 404`));
  assert.deepEqual(await readdir(tmp), []); // nothing written
});

test('integration: an HTML /install body fails the build naming the shebang check', async (t) => {
  const { server, origin } = await serveRoutes({ ...INTEGRATION_ROUTES, '/install': '<html>404</html>' });
  const tmp = await mkdtemp(path.join(tmpdir(), 'shll-ai-stub-'));
  t.after(async () => {
    server.close();
    await rm(tmp, { recursive: true, force: true });
  });
  const out = path.join(tmp, 'dist');
  const floor = path.join(tmp, 'floor.txt');
  await writeFile(floor, INTEGRATION_FLOOR);

  const result = await runBuild(['--origin', origin, '--out', out, '--floor', floor]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /\/install.*#!\/bin\/sh/);
  assert.deepEqual(await readdir(tmp), ['floor.txt']); // dist/ never created
});

test('integration: a floor regression fails the build listing the missing path', async (t) => {
  const { server, origin } = await serveRoutes(INTEGRATION_ROUTES);
  const tmp = await mkdtemp(path.join(tmpdir(), 'shll-ai-stub-'));
  t.after(async () => {
    server.close();
    await rm(tmp, { recursive: true, force: true });
  });
  const out = path.join(tmp, 'dist');
  const floor = path.join(tmp, 'floor.txt');
  await writeFile(floor, `${INTEGRATION_FLOOR}/fab-kit/fkf/\n`);

  const result = await runBuild(['--origin', origin, '--out', out, '--floor', floor]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /floor check failed[\s\S]*\/fab-kit\/fkf\//);
});
