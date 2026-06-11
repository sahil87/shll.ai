#!/usr/bin/env node
/**
 * generate-og-image.mjs — ONE-OFF generator for public/og-image.png (1200×630).
 *
 * NOT part of the site build (deliberately absent from package.json — the OG
 * card is a committed static asset, Constitution VI: no new dependencies).
 * Re-run manually only when the card design needs to change:
 *
 *   node scripts/generate-og-image.mjs
 *
 * How it works: writes a self-contained HTML mock of the card (styled with the
 * terminal.css DARK palette — the card is theme-independent, a fixed dark
 * terminal window) and screenshots it at exactly 1200×630 with a headless
 * Chromium. Zero npm dependencies: uses node stdlib + a Chromium binary found
 * on the machine (Playwright's cached chrome-headless-shell, or $CHROME_BIN).
 *
 * Fonts: uses JetBrains Mono woff2 from the site's already-declared
 * @fontsource/jetbrains-mono dependency (run `pnpm install` first). Falls back
 * to system monospace if the files are missing.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(siteRoot, 'public', 'og-image.png');

// ── Locate a headless Chromium ──────────────────────────────────────────────
function findChromium() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  const pwCache = join(homedir(), '.cache', 'ms-playwright');
  if (existsSync(pwCache)) {
    const dirs = readdirSync(pwCache)
      .filter((d) => d.startsWith('chromium_headless_shell-') || d.startsWith('chromium-'))
      .sort()
      .reverse(); // newest revision first
    for (const d of dirs) {
      for (const rel of [
        'chrome-headless-shell-linux64/chrome-headless-shell',
        'chrome-linux/headless_shell',
        'chrome-linux/chrome',
      ]) {
        const p = join(pwCache, d, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  for (const name of ['chromium', 'chromium-browser', 'google-chrome', 'chrome']) {
    try {
      const p = execFileSync('which', [name], { encoding: 'utf8' }).trim();
      if (p) return p;
    } catch {
      /* keep looking */
    }
  }
  throw new Error('No Chromium binary found. Set $CHROME_BIN to a Chrome/Chromium executable.');
}

// ── Fonts (from the site's @fontsource dependency; optional) ────────────────
function fontFace(weight, file) {
  const p = join(siteRoot, 'node_modules', '@fontsource', 'jetbrains-mono', 'files', file);
  if (!existsSync(p)) return '';
  return `@font-face { font-family: 'JetBrains Mono'; font-style: normal; font-weight: ${weight}; src: url('${pathToFileURL(p)}') format('woff2'); }`;
}

// ── The card (terminal.css dark palette tokens, hardcoded by design — the OG
//    card is a fixed dark image, it does not theme-switch) ───────────────────
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  ${fontFace(700, 'jetbrains-mono-latin-700-normal.woff2')}
  ${fontFace(600, 'jetbrains-mono-latin-600-normal.woff2')}
  ${fontFace(400, 'jetbrains-mono-latin-400-normal.woff2')}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    background: #0b0d10; /* --c-bg */
    font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
    display: flex; align-items: center; justify-content: center;
  }
  .terminal-window {
    width: 1088px; height: 518px;
    background: #0b0d10;
    border: 2px solid #232932; /* --c-border */
    border-radius: 14px;
    overflow: hidden;
    display: flex; flex-direction: column;
  }
  .titlebar {
    height: 54px; flex: none;
    background: #12161b; /* --c-surface */
    border-bottom: 2px solid #232932;
    display: flex; align-items: center; gap: 14px; padding: 0 24px;
  }
  .dot { width: 18px; height: 18px; border-radius: 50%; opacity: 0.55; }
  .dot-1 { background: #c2553f; } /* muted red */
  .dot-2 { background: #d4a73a; } /* --c-accent amber */
  .dot-3 { background: #7cb342; } /* --c-accent-2 green */
  .session {
    flex: 1; padding: 40px 72px;
    display: flex; flex-direction: column; justify-content: center;
  }
  .promptline { display: flex; align-items: baseline; gap: 28px; line-height: 1.05; }
  .prompt { color: #7cb342; font-size: 60px; font-weight: 600; } /* shell-prompt green */
  .wordmark { color: #d8dce4; font-size: 118px; font-weight: 700; letter-spacing: -2px; } /* --c-fg */
  .cursor {
    display: inline-block; width: 54px; height: 96px;
    background: #d4a73a; /* --c-accent */
    margin-left: 18px; align-self: center;
  }
  .tagline {
    margin-top: 36px;
    color: #7c8593; /* --c-fg-dim */
    font-size: 42px; font-weight: 400; line-height: 1.3;
    max-width: 900px;
  }
  .site { margin-top: 34px; color: #4a525e; font-size: 28px; } /* --c-fg-faint */
</style>
</head>
<body>
  <div class="terminal-window">
    <div class="titlebar"><span class="dot dot-1"></span><span class="dot dot-2"></span><span class="dot dot-3"></span></div>
    <div class="session">
      <div class="promptline"><span class="prompt">$</span><span class="wordmark">shll</span><span class="cursor"></span></div>
      <div class="tagline">Seven small CLIs that force AI agents to plan before they code.</div>
      <div class="site">shll.ai</div>
    </div>
  </div>
</body>
</html>`;

// ── Render ──────────────────────────────────────────────────────────────────
const chromium = findChromium();
const tmp = mkdtempSync(join(tmpdir(), 'og-card-'));
try {
  const htmlPath = join(tmp, 'card.html');
  writeFileSync(htmlPath, html);
  execFileSync(
    chromium,
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--force-device-scale-factor=1',
      '--hide-scrollbars',
      `--window-size=1200,630`,
      `--screenshot=${outPath}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: 'pipe' },
  );
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(`wrote ${outPath}`);
