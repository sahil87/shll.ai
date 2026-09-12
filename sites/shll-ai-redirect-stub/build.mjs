#!/usr/bin/env node
/**
 * build.mjs — the shll.ai redirect-stub generator (change
 * 260912-sn0a-shll-ai-redirect-stub). Fetches the redirect map and the byte
 * copies from hexokit.com at build time, validates everything, and emits the
 * static site into `dist/`. ANY fetch or validation failure exits non-zero
 * BEFORE output is written, so a broken upstream never deploys — the
 * last-good site stays live (the never-lapses posture, plan decision D4).
 *
 * Zero-dependency: Node 22 built-ins only. No package.json, no install step.
 *
 * Usage:
 *   node build.mjs [--origin <url>] [--out <dir>] [--floor <path>]
 *
 *   --origin  map/byte-copy source (default https://hexokit.com; override is
 *             for local experiments and the hermetic integration test only)
 *   --out     output directory    (default dist/ beside this script)
 *   --floor   completeness floor  (default fixtures/shll-ai-paths.txt)
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CNAME,
  FETCH_TIMEOUT_MS,
  HEXOKIT_ORIGIN,
  ROBOTS_TXT,
  checkFloor,
  isFileLike,
  render404,
  renderSecurityTxt,
  renderStub,
  validateByteCopy,
  validateMap,
} from './lib.mjs';

const SITE_DIR = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {
    origin: HEXOKIT_ORIGIN,
    out: path.join(SITE_DIR, 'dist'),
    floor: path.join(SITE_DIR, 'fixtures', 'shll-ai-paths.txt'),
  };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (!['--origin', '--out', '--floor'].includes(flag) || value === undefined) {
      throw new Error(`usage: node build.mjs [--origin <url>] [--out <dir>] [--floor <path>] — bad argument '${flag}'`);
    }
    args[flag.slice(2)] = value;
  }
  args.origin = args.origin.replace(/\/+$/, '');
  return args;
}

/** GET `url` as raw bytes with a bounded timeout; any non-2xx is a
 *  build-stop. Redirects are NOT followed (`redirect: 'manual'`) — a 3xx
 *  means the origin moved the endpoint, and following it would silently
 *  fetch from a fallback location R2 forbids. */
async function fetchBytes(url) {
  const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`fetch ${url} → HTTP ${res.status}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

/** GET `url` decoded as UTF-8 text (used for the map; byte copies stay raw). */
async function fetchText(url) {
  return new TextDecoder().decode(await fetchBytes(url));
}

async function fetchMap(origin) {
  const url = `${origin}/shll-ai-redirects.json`;
  const text = await fetchText(url);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`fetch ${url} → not valid JSON`);
  }
}

/** Emit the validated site into `out` (cleared first). Returns the summary counts. */
async function emitSite(map, copies, out) {
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  let stubs = 0;
  await writeFile(path.join(out, 'CNAME'), `${CNAME}\n`);
  for (const [key, target] of Object.entries(map.redirects)) {
    if (isFileLike(key)) continue;
    const dest = key === '/' ? path.join(out, 'index.html') : path.join(out, key.slice(1), 'index.html');
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, renderStub(target));
    stubs += 1;
  }
  for (const [copyPath, bytes] of copies) {
    const dest = path.join(out, copyPath.slice(1));
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, bytes);
  }
  await writeFile(path.join(out, '404.html'), render404(map.to, map.rules));
  await writeFile(path.join(out, 'robots.txt'), ROBOTS_TXT);
  await mkdir(path.join(out, '.well-known'), { recursive: true });
  await writeFile(path.join(out, '.well-known', 'security.txt'), renderSecurityTxt());
  return { stubs, copies: copies.size, rules: map.rules.length };
}

async function main() {
  const { origin, out, floor } = parseArgs(process.argv.slice(2));

  // 1. Fetch: the map, then every keep path and every file-like key. Copies
  // stay raw bytes so dist/ is byte-for-byte (D4); they are decoded only for
  // validation below.
  const map = await fetchMap(origin);
  validateMap(map);
  const copyPaths = [...map.keep, ...Object.keys(map.redirects).filter(isFileLike)];
  const copies = new Map();
  for (const copyPath of copyPaths) {
    copies.set(copyPath, await fetchBytes(origin + copyPath));
  }

  // 2. Validate: the completeness floor, then the byte copies. Everything is
  // checked BEFORE `out` is touched, so a failure leaves any previous dist/
  // (and the live site) alone.
  const floorText = await readFile(floor, 'utf8');
  const missing = checkFloor(map, floorText);
  if (missing.length > 0) {
    throw new Error(`floor check failed — ${missing.length} path(s) missing from the fetched map:\n${missing.map((p) => `  ${p}`).join('\n')}`);
  }
  const decoder = new TextDecoder();
  for (const [copyPath, bytes] of copies) {
    validateByteCopy(copyPath, decoder.decode(bytes));
  }

  // 3. Emit and report.
  const { stubs, copies: copyCount, rules } = await emitSite(map, copies, out);
  console.log(`${stubs} stubs, ${copyCount} byte copies, rules: ${rules}`);
}

main().catch((err) => {
  console.error(`build failed: ${err.message}`);
  process.exit(1);
});
