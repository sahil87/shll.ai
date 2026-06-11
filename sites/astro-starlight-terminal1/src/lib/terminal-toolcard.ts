/**
 * terminal-toolcard — pure, dependency-free logic for the homepage terminal's
 * bare-tool-name cards (change 37ng): typing `hop` (or any of the seven tool
 * names / their binary aliases) prints a card mechanically sourced from that
 * tool's `help/<slug>.json` — header from `root.short`, usage line, padded
 * subcommand lines truncated to the established width budget, and a capped
 * listing with a `(+N more — see commands)` tail.
 *
 * Extracted to src/lib/ (rather than inlined in TerminalPrompt.astro) so it is
 * unit-testable under the existing `node --test scripts/*.test.mjs` pattern —
 * the same precedent as terminal-suggest.ts (cuur), terminal-eggs.ts (o33t),
 * and terminal-cheatsheet.ts (cdbr); Vite bundles it into the client island,
 * and the component frontmatter imports the normalization helpers at build
 * time. No npm import (Constitution VI) — plain string math.
 *
 * The lib takes plain parsed data (never `astro:content` types): the slim
 * payload crosses a JSON boundary between the build-time frontmatter and the
 * island, so every field here is optional and every access defensive —
 * missing `short`/`usage`/`commands` degrade to omitted lines, never a crash.
 */

/** One slim subcommand from the build-time payload. */
export type ToolHelpCommand = { name?: string; short?: string };

/** The slim per-tool payload shape: only what the card renders. */
export type ToolHelpDoc = {
  short?: string;
  usage?: string;
  commands?: ToolHelpCommand[];
};

/** One card line descriptor — text only; the island maps `kind` to classes. */
export type ToolCardLine = {
  kind: 'header' | 'usage' | 'blank' | 'sub' | 'more';
  text: string;
};

/** Options shared by buildToolCard / formatSubcommandLine. */
export type ToolCardOpts = { subCap?: number; width?: number; nameCol?: number };

/** Max subcommand lines per card before the `(+N more — see commands)` tail. */
export const TOOLCARD_SUB_CAP = 8;
/** Subcommand name column width (chars), excluding the 2-space indent. */
export const TOOLCARD_NAME_COL = 12;
/**
 * Total line budget, indent included — the CHEAT_LINE_WIDTH = 74 + 2-space
 * indent precedent (change cdbr): longer lines clip into horizontal scroll
 * under the session's `white-space: pre`. Applied to EVERY card line (header
 * included — idea's root.short alone would push its header to 80 chars).
 */
export const TOOLCARD_LINE_WIDTH = 76;

const TOOLCARD_INDENT = '  ';
const ELLIPSIS = '…';

/**
 * Strip a leading `Usage:` prefix (case-insensitive) from a usage string —
 * tu's doc carries one (`"Usage: tu [source] [period] [display]"`), and the
 * card prefixes its own `usage:`, so without this the line would read
 * `usage: Usage: tu …`. A pure transform of json data — vn39-clean.
 * Idempotent: applied at build time by the frontmatter and re-applied
 * defensively by buildToolCard.
 */
export function stripUsagePrefix(usage: string): string {
  return usage.replace(/^usage:\s*/i, '');
}

/**
 * Strip a redundant leading `{tool} — ` (the binary's own name) from a short
 * description — run-kit's root.short is `"rk — tmux session manager with web
 * UI"`, and the card prefixes the typed tool name, so without this the header
 * would read `run-kit — rk — tmux …`. Applied at BUILD TIME only (change
 * 37ng): the binary name lives in the help doc's `tool` field, which the slim
 * payload deliberately omits. Idempotent; a non-matching short is untouched.
 */
export function stripToolPrefix(short: string, tool: string): string {
  const prefix = `${tool} — `;
  return short.startsWith(prefix) ? short.slice(prefix.length) : short;
}

/** Clamp a line to `width` chars, ellipsis-terminated when truncated. */
function clampLine(text: string, width: number): string {
  if (text.length <= width) return text;
  return text.slice(0, Math.max(0, width - 1)) + ELLIPSIS;
}

/**
 * One padded subcommand line: 2-space indent, `name` padded to the name
 * column (always at least one separating space — a name at or beyond the
 * column width never glues to its short), then `short` truncated with a
 * trailing ellipsis so the whole line fits the width budget. An empty short
 * yields just the indented name (no trailing padding).
 *
 * Exported because the island reuses the exact same shape for the
 * single-subcommand argument hit (`hop clone`).
 */
export function formatSubcommandLine(
  name: string,
  short: string,
  opts?: ToolCardOpts,
): string {
  const width = opts?.width ?? TOOLCARD_LINE_WIDTH;
  const nameCol = opts?.nameCol ?? TOOLCARD_NAME_COL;
  if (!short) return TOOLCARD_INDENT + name;
  const prefix =
    TOOLCARD_INDENT + name + ' '.repeat(Math.max(1, nameCol - name.length));
  return prefix + clampLine(short, Math.max(1, width - prefix.length));
}

/** Subcommands with a usable name, shorts defaulted — tolerant of anything. */
function usableCommands(doc: ToolHelpDoc): { name: string; short: string }[] {
  const raw = Array.isArray(doc?.commands) ? doc.commands : [];
  const out: { name: string; short: string }[] = [];
  for (const c of raw) {
    if (c && typeof c.name === 'string' && c.name.length > 0) {
      out.push({ name: c.name, short: typeof c.short === 'string' ? c.short : '' });
    }
  }
  return out;
}

/**
 * Assemble the card's line descriptors from a slim help doc (change 37ng):
 *
 *   header  `{tool} — {short}`           (omitted when short is absent)
 *   usage   `usage: {usage}`             (omitted when usage is absent)
 *   blank                                 (only when subcommands follow)
 *   sub     `  {name}{pad}{short…}`      (first `subCap` entries)
 *   more    `  (+N more — see commands)` (only when the cap truncated)
 *
 * A doc with zero usable subcommands (tu) yields header + usage only — no
 * empty block, no `(+0 more)`. A doc with nothing usable yields `[]`, the
 * island's cue to fall back to its hand-written SYNOPSIS line + nav line.
 * No HTML, no classes — the island owns presentation (the cheatsheet
 * division of labor).
 */
export function buildToolCard(
  tool: string,
  doc: ToolHelpDoc,
  opts?: ToolCardOpts,
): ToolCardLine[] {
  const width = opts?.width ?? TOOLCARD_LINE_WIDTH;
  const subCap = opts?.subCap ?? TOOLCARD_SUB_CAP;
  const out: ToolCardLine[] = [];

  const short = typeof doc?.short === 'string' ? doc.short.trim() : '';
  if (short) out.push({ kind: 'header', text: clampLine(`${tool} — ${short}`, width) });

  const rawUsage = typeof doc?.usage === 'string' ? doc.usage.trim() : '';
  const usage = stripUsagePrefix(rawUsage).trim();
  if (usage) out.push({ kind: 'usage', text: clampLine(`usage: ${usage}`, width) });

  const subs = usableCommands(doc);
  if (subs.length > 0) {
    out.push({ kind: 'blank', text: '' });
    for (const sub of subs.slice(0, subCap)) {
      out.push({ kind: 'sub', text: formatSubcommandLine(sub.name, sub.short, opts) });
    }
    if (subs.length > subCap) {
      out.push({
        kind: 'more',
        text: `${TOOLCARD_INDENT}(+${subs.length - subCap} more — see commands)`,
      });
    }
  }
  return out;
}

/**
 * Case-insensitive lookup of one subcommand by name (the `hop clone`
 * argument path). Returns the entry with its short defaulted to '', or null
 * on a miss / unusable doc — the island then prints the full card instead
 * (never an error, never a pretend execution).
 */
export function findSubcommand(
  doc: ToolHelpDoc,
  name: string,
): { name: string; short: string } | null {
  const target = name.trim().toLowerCase();
  if (!target) return null;
  for (const sub of usableCommands(doc)) {
    if (sub.name.toLowerCase() === target) return sub;
  }
  return null;
}
