/**
 * terminal-share — pure, dependency-free logic for the homepage terminal's
 * play→share→replay loop (change tx5p): the `#play=` deep-link hash grammar
 * (parse + build, round-tripping), the shared replayable predicate that keeps
 * recording and parsing from ever drifting, and the self-advertising
 * transcript serializer behind the `share` command.
 *
 * Extracted to src/lib/ (rather than inlined in TerminalPrompt.astro) so it is
 * unit-testable under the existing `node --test scripts/*.test.mjs` pattern —
 * the same precedent as terminal-suggest.ts (change cuur), terminal-eggs.ts
 * (change o33t), terminal-cheatsheet.ts (change cdbr), and terminal-toolcard.ts
 * (change 37ng), a fifth time; Vite bundles it into the client island. No npm
 * import (Constitution VI) — plain string math. The DOM walk and the clipboard
 * stay island-side; this module takes and returns plain strings.
 */

/** At most this many commands per `#play=` link — enforced both at parse
 * (surviving validated tokens) and at build (first N in commit order), so a
 * built hash always parses back to exactly what it claims. */
export const REPLAY_CAP = 10;

/**
 * Commands excluded from replay (user-confirmed, change tx5p): `cd`/`open`/
 * `install` would fire `window.location.assign` mid-replay — a URL-controlled
 * sequence must never yank the visitor off the page they were just handed a
 * link to — and a gesture-less replayed `share` would only hit the clipboard
 * permission wall. `snake` (change kd5e) is the same charter from the input
 * side: an input-owning game a URL starts uninvited is exactly the yank this
 * list exists to prevent. One shared list for BOTH the recording predicate
 * and the hash parser. Everything else (clear, theme, the eggs, the animated
 * streams — cmatrix and cowsay included) replays faithfully.
 */
export const REPLAY_DENY: readonly string[] = ['cd', 'open', 'install', 'share', 'snake'];

/**
 * The first whitespace-delimited token of a command line, LOWERCASED — the
 * island's run() lowercases the command name at dispatch, so the replayable
 * predicate must case-fold identically (`LS` dispatches to `ls` and is
 * therefore replayable). Empty/whitespace-only input yields ''.
 */
export function firstWord(command: string): string {
  return command.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
}

/**
 * The shared replayable predicate (change tx5p): a command is replayable when
 * its first word is an OWN key of the commands record and is not deny-listed.
 *
 * `Object.hasOwn` is MANDATORY here (the o33t own-property-guard idiom): the
 * `#play=` hash is user-controlled input keying a record lookup — a bare read
 * would resolve prototype-chain names (`constructor`, `__proto__`, `toString`)
 * to inherited members. One predicate, two call sites (the island's commitLine
 * recording and parsePlayHash below), so a generated link replays exactly what
 * it claims.
 */
export function isReplayable(command: string, commands: Record<string, unknown>): boolean {
  const word = firstWord(command);
  if (word === '') return false;
  if (REPLAY_DENY.includes(word)) return false;
  return Object.hasOwn(commands, word);
}

const PLAY_PREFIX = '#play=';

/**
 * Parse a `location.hash` value into the replayable command sequence.
 *
 * Grammar: `#play=` followed by comma- OR semicolon-separated command tokens.
 * Tokens are split on the RAW separators first, then decodeURIComponent-decoded
 * per token — so an encoded `%2C` inside an argument survives as a literal
 * comma, and a malformed %-sequence drops THAT token only, never the whole
 * sequence (guarded try/catch, the sessionStorage discipline). Tokens are
 * trimmed; empties dropped; non-replayable tokens (unknown commands, the
 * REPLAY_DENY list, prototype-chain names) are skipped SILENTLY; surviving
 * tokens are capped at REPLAY_CAP. No hash, a non-play hash, or zero
 * survivors → [] (no replay, normal page load).
 */
export function parsePlayHash(
  hash: string,
  replayable: (command: string) => boolean,
): string[] {
  if (!hash.startsWith(PLAY_PREFIX)) return [];
  const out: string[] = [];
  for (const rawToken of hash.slice(PLAY_PREFIX.length).split(/[,;]/)) {
    if (out.length >= REPLAY_CAP) break;
    let decoded: string;
    try {
      decoded = decodeURIComponent(rawToken);
    } catch {
      continue; // malformed %-sequence: drop this token, keep the rest
    }
    const command = decoded.trim();
    if (command === '' || !replayable(command)) continue;
    out.push(command);
  }
  return out;
}

/**
 * Build the `#play=` hash for a recorded command sequence: the FIRST
 * REPLAY_CAP commands in commit order (the transcript reads top-down and the
 * replay should too), each encodeURIComponent-encoded, comma-joined. An empty
 * list yields '' — the island omits the link line and link footer entirely.
 * Round-trips with parsePlayHash for any replayable input.
 */
export function buildPlayHash(commands: readonly string[]): string {
  if (commands.length === 0) return '';
  return (
    PLAY_PREFIX +
    commands
      .slice(0, REPLAY_CAP)
      .map((command) => encodeURIComponent(command))
      .join(',')
  );
}

/** The dim-comment-style header line of a shared transcript — the site's
 * voice, authored at apply (the o33t reversible-copy precedent). */
export const SHARE_HEADER =
  '# captured from the shll.ai terminal — yes, the homepage is a real shell.';

/** The self-advertising footer — backlog-literal brand copy. The deep link,
 * when present, rides a second `# replay it:` footer line (opts.playLink). */
export const SHARE_FOOTER = '# replayed from https://shll.ai';

/**
 * Assemble the shareable plain-text block from the transcript's line texts
 * (the island's DOM walk supplies them; the live prompt line is excluded
 * there and rendered HERE as the bare `$` — the exactly-one-trailing-prompt
 * invariant carried into the export):
 *
 *   {SHARE_HEADER}
 *   {body lines, trailing-trimmed}
 *   $
 *   {SHARE_FOOTER}
 *   # replay it: {opts.playLink}     ← only when a playLink is given
 */
export function serializeTranscript(
  lineTexts: readonly string[],
  opts: { playLink?: string } = {},
): string {
  const body = lineTexts.map((text) => text.replace(/\s+$/, ''));
  const lines = [SHARE_HEADER, ...body, '$', SHARE_FOOTER];
  if (opts.playLink) lines.push(`# replay it: ${opts.playLink}`);
  return lines.join('\n');
}
