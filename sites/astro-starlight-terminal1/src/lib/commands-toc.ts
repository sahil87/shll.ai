/**
 * Shared logic for the Commands ToC overrides (desktop + mobile). Resolves the
 * tool from a Starlight route id and reads its FIRST-LEVEL commands from the
 * repo-root `help/<tool>.json` at build time. Display-only (the tree comes from
 * the JSON `commands[]`); the slug matches the `id`s CommandReference emits.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HelpDocSchema, type Node } from './schemas.ts';
import { commandSlug } from './parse-help.ts';

/** Per-tool commands pages have route id `tools/<tool>/commands`. */
const COMMANDS_ROUTE_RE = /^tools\/([^/]+)\/commands$/;

export interface TocCommand {
  /** Full command path, e.g. "hop clone". */
  path: string;
  /** Anchor slug matching the `<details.cmd-node>` id, e.g. "cmd-hop-clone". */
  slug: string;
}

/** Tool slug if `id` is a per-tool commands route, else null. */
export function toolFromRouteId(id: string): string | null {
  const m = id.match(COMMANDS_ROUTE_RE);
  return m ? m[1] : null;
}

// Ascend from a starting dir to the repo root (the dir containing `help/`). A
// fixed relative depth does not survive `astro build` (Vite relocates the
// bundled chunk), so we ascend to the `help/` marker — robust in dev and build.
const MAX_ASCENT = 12;
function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < MAX_ASCENT; i += 1) {
    const candidate = path.join(dir, 'help');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `commands-toc: could not locate a repo-root 'help/' directory by ascending from ${startDir}`,
  );
}

/**
 * First-level commands for `tool`, read from `<repo-root>/help/<tool>.json`.
 * `moduleUrl` is the caller's `import.meta.url` (the anchor for the ascent).
 * Returns [] when the help file is missing (the page itself degrades to the
 * CommandReference placeholder, and the override falls back to the default ToC).
 * Re-throws genuine parse/validation errors so a committed defect is not masked.
 */
export function firstLevelCommands(tool: string, moduleUrl: string): TocCommand[] {
  try {
    const repoRoot = findRepoRoot(path.dirname(fileURLToPath(moduleUrl)));
    const raw = fs.readFileSync(path.join(repoRoot, 'help', `${tool}.json`), 'utf8');
    const doc = HelpDocSchema.parse(JSON.parse(raw));
    return doc.root.commands.map((c: Node) => ({ path: c.path, slug: commandSlug(c.path) }));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}
