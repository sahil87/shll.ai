/**
 * terminal-cheatsheet — pure, dependency-free logic for the homepage
 * terminal's `cheatsheet` command (change cdbr): the coverage/alias/stale-drop
 * computation that keeps the grouped full-roster sheet structurally drift-proof,
 * plus the width-budget line chunking that keeps long groups from clipping into
 * horizontal scroll under the session's `white-space: pre`.
 *
 * Extracted to src/lib/ (rather than inlined in TerminalPrompt.astro) so it is
 * unit-testable under the existing `node --test scripts/*.test.mjs` pattern —
 * the same precedent as terminal-suggest.ts (change cuur) and terminal-eggs.ts
 * (change o33t); Vite bundles it into the client island. No npm import
 * (Constitution VI) — plain string math and set membership.
 */

/** One sheet entry: the COMMANDS key it covers, and an optional decorated
 * display string (`cd <tool>`, `make plan`, …) teaching the interesting
 * invocation. `display` defaults to the bare key. */
export type CheatEntry = { key: string; display?: string };

/** One named category of the sheet, entries in display order. */
export type CheatGroup = { name: string; entries: CheatEntry[] };

/**
 * The runtime catch-all group name: COMMANDS keys covered by no group and no
 * alias declaration land here, so forgetting to categorize a future command
 * degrades to an honest listing — never a silent omission.
 */
export const UNCATEGORIZED = 'uncategorized';

/**
 * Resolve the declared groups against the live command roster (change cdbr).
 *
 * The anti-drift contract:
 *   - covered  = every group entry key ∪ every alias key (an alias-of key —
 *     e.g. `vi` aliasing `vim` — renders with its primary and is never listed
 *     on its own, but still counts as covered);
 *   - stale-entry tolerance: a group entry whose key is not in `commandKeys`
 *     is dropped at render (a group left with zero live entries is omitted
 *     entirely — no orphan header);
 *   - missing  = `commandKeys` not in covered → appended as a final
 *     UNCATEGORIZED group, bare keys in declaration order.
 *
 * `commandKeys` is expected to be `Object.keys(COMMANDS)` — Object.keys
 * returns OWN properties only, so the o33t own-property-guard guarantee holds
 * here by construction (no prototype-chain key can reach the membership set).
 */
export function buildCheatsheet(
  groups: readonly CheatGroup[],
  aliases: Record<string, string>,
  commandKeys: readonly string[],
): { name: string; displays: string[] }[] {
  const covered = new Set<string>(Object.keys(aliases));
  for (const group of groups) {
    for (const entry of group.entries) covered.add(entry.key);
  }

  const live = new Set(commandKeys);
  const out: { name: string; displays: string[] }[] = [];
  for (const group of groups) {
    const displays = group.entries
      .filter((entry) => live.has(entry.key)) // stale-entry drop
      .map((entry) => entry.display ?? entry.key);
    if (displays.length > 0) out.push({ name: group.name, displays });
  }

  const missing = commandKeys.filter((key) => !covered.has(key));
  if (missing.length > 0) out.push({ name: UNCATEGORIZED, displays: missing });
  return out;
}

/**
 * Greedily pack `tokens` into `sep`-joined lines of at most `maxWidth` chars
 * (the joined text only — the caller owns any indent). A token is NEVER split:
 * a single token longer than the budget gets a line of its own. Empty input
 * yields no lines.
 */
export function chunkLine(
  tokens: readonly string[],
  sep: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let current = '';
  for (const token of tokens) {
    if (current === '') {
      current = token;
    } else if (current.length + sep.length + token.length <= maxWidth) {
      current += sep + token;
    } else {
      lines.push(current);
      current = token;
    }
  }
  if (current !== '') lines.push(current);
  return lines;
}
