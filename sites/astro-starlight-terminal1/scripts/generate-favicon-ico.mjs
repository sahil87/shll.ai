#!/usr/bin/env node
/**
 * generate-favicon-ico.mjs — ONE-OFF generator for public/favicon.ico
 * (a true multi-resolution ICO: 16×16, 32×32, 48×48 hexagon frames).
 *
 * NOT part of the site build (deliberately absent from package.json — the
 * favicon is a committed static asset, Constitution VI: no new dependencies).
 * Re-run manually only when the hexagon source SVG changes:
 *
 *   node scripts/generate-favicon-ico.mjs
 *
 * Why this exists: the browser tab icon for any HEADLESS route (one served with
 * no HTML <head> — robots.txt, sitemap-*.xml, and the 7 <meta refresh> redirect
 * stubs) is driven by the by-convention root /favicon.ico fallback, NOT a
 * per-page <link>. That file used to be a 32×32 PNG mislabeled `.ico`, so
 * browsers rejected it and substituted their own generic default. This writes a
 * real ICO so every headless route renders the hexagon.
 *
 * How it works: rasterizes public/favicon.svg to PNG buffers at 16/32/48 with
 * `sharp` (already a dependency — run `pnpm install` first), then hand-assembles
 * the ICO container from those buffers. The ICO format permits a directory entry
 * to carry a PNG-encoded image directly, so no ICO-encoder dependency is needed:
 *   6-byte ICONDIR header
 *   one 16-byte ICONDIRENTRY per image (size, bit depth, byte length, offset)
 *   the concatenated PNG payloads at the offsets named by the entries
 * Zero new npm dependencies: uses node stdlib + the existing `sharp` dep.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcPath = join(siteRoot, 'public', 'favicon.svg');
const outPath = join(siteRoot, 'public', 'favicon.ico');

// Embedded resolutions. 16/32/48 are the standard favicon set and all fit the
// PNG-in-ICO encoding (a size of 256 would need the 0-means-256 sentinel — not
// needed here).
const SIZES = [16, 32, 48];

// ── ICO binary layout constants ──────────────────────────────────────────────
const ICONDIR_SIZE = 6; // reserved(2) + type(2) + count(2)
const ICONDIRENTRY_SIZE = 16; // width(1) height(1) colors(1) reserved(1) planes(2) bpp(2) bytes(4) offset(4)

// ── Rasterize the hexagon SVG to PNG buffers via sharp ───────────────────────
async function rasterize(size) {
  return sharp(srcPath, { density: 384 }) // high density so the vector renders crisp before downscaling
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

// ── Assemble a true multi-resolution ICO from PNG frame buffers ──────────────
function assembleIco(frames) {
  const header = Buffer.alloc(ICONDIR_SIZE);
  header.writeUInt16LE(0, 0); // reserved, always 0
  header.writeUInt16LE(1, 2); // image type: 1 = icon (.ico)
  header.writeUInt16LE(frames.length, 4); // number of images

  const directory = Buffer.alloc(ICONDIRENTRY_SIZE * frames.length);
  // PNG payloads begin after the header and the full directory.
  let offset = ICONDIR_SIZE + ICONDIRENTRY_SIZE * frames.length;

  frames.forEach(({ size, buffer }, i) => {
    const entry = directory.subarray(i * ICONDIRENTRY_SIZE, (i + 1) * ICONDIRENTRY_SIZE);
    // Width/height are a single byte each; 0 is the sentinel for 256. Our sizes
    // (16/32/48) are all < 256, so they fit directly.
    entry.writeUInt8(size === 256 ? 0 : size, 0); // width
    entry.writeUInt8(size === 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette color count (0 = no palette / truecolor)
    entry.writeUInt8(0, 3); // reserved, always 0
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel (RGBA PNG)
    entry.writeUInt32LE(buffer.length, 8); // size of the image data in bytes
    entry.writeUInt32LE(offset, 12); // byte offset of the image data from file start
    offset += buffer.length;
  });

  return Buffer.concat([header, directory, ...frames.map((f) => f.buffer)]);
}

// ── Generate ─────────────────────────────────────────────────────────────────
const frames = await Promise.all(
  SIZES.map(async (size) => ({ size, buffer: await rasterize(size) })),
);
writeFileSync(outPath, assembleIco(frames));
console.log(`wrote ${outPath} (${frames.map((f) => `${f.size}×${f.size}`).join(', ')})`);
