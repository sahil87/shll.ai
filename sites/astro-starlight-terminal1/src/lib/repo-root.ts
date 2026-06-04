/**
 * Shared build-time repo-root resolver. Used by every component/module that
 * reads the repo-root `help/*.json` from inside the site dir (CommandReference,
 * CommandIndex, commands-toc). Single source so MAX_ASCENT / marker logic /
 * error wording can't drift across call sites.
 *
 * Why ascend to a marker instead of a fixed `../../..` depth: a fixed relative
 * depth does NOT survive `astro build` — Vite bundles component frontmatter into
 * a chunk at an unstable depth (e.g. `dist/.prerender/chunks/`), so the `..`
 * count measured from the source file is wrong at build time. Ascending from the
 * module URL until a `help/` directory is found is correct in both `astro dev`
 * (source location) and `astro build` (bundled location), and is resilient to
 * changes in Astro's output layout — while still anchoring on the module URL,
 * not `process.cwd()` (which varies by invocation).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Real ascent is ~5 hops (from dist/.prerender/chunks/); 12 is generous headroom.
const MAX_ASCENT = 12;

/**
 * Ascend from `startDir` until a directory containing `help/` is found; return
 * that directory (the repo root). Throws if none is found within MAX_ASCENT —
 * a broken cross-boundary contract is a build-stopping condition.
 */
export function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < MAX_ASCENT; i += 1) {
    const candidate = path.join(dir, 'help');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  throw new Error(
    `findRepoRoot: could not locate a repo-root 'help/' directory by ascending from ${startDir}`,
  );
}

/** Convenience: resolve the repo root from a module's `import.meta.url`. */
export function repoRootFromModuleUrl(moduleUrl: string): string {
  return findRepoRoot(path.dirname(fileURLToPath(moduleUrl)));
}
