/**
 * terminal-eggs — pure, dependency-free logic for the homepage terminal's
 * GNU-utils easter eggs (change o33t): `echo`'s $VAR expansion, `seq`'s
 * sequence generation, and the `rm`/`tar` argument classifiers.
 *
 * Extracted to src/lib/ (rather than inlined in TerminalPrompt.astro) so it is
 * unit-testable under the existing `node --test scripts/*.test.mjs` pattern —
 * the same precedent as terminal-suggest.ts (change cuur); Vite bundles it
 * into the client island. No npm import (Constitution VI) — plain string and
 * integer math.
 */

/**
 * Expand shell-style variable references against `env`: both `$NAME` and
 * `${NAME}` forms, where NAME is `[A-Za-z_][A-Za-z0-9_]*`. An unknown name
 * expands to '' — authentic shell behavior (`echo $UNDEFINED` prints an empty
 * line) — and "unknown" is judged by OWN properties only: prototype-chain
 * names (`$constructor`, `${__proto__}`, `$toString`) are unknown variables,
 * not inherited members (change o33t review rework — a bare `env[name]` read
 * made `echo $constructor` print Object's source). No escaping support
 * ($$ etc.) — a documented limitation; the caller is a one-line easter-egg
 * prompt, not a shell parser.
 */
export function expandVars(text: string, env: Record<string, string>): string {
  return text.replace(
    /\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,
    (_match, braced: string | undefined, bare: string | undefined) => {
      const name = (braced ?? bare)!;
      // Own-property guard (change o33t): `env` is a plain object literal, so
      // an unguarded read walks the prototype chain and an inherited member
      // would expand instead of the contract's ''.
      return Object.hasOwn(env, name) ? env[name] : '';
    },
  );
}

/**
 * Generation safety bound for seqLines: `seq 1 1000000000` is a valid GNU
 * invocation but materializing a billion-element array would freeze the tab.
 * The island only ever DISPLAYS the first 100 lines (its SEQ_CAP), so
 * generation stops here; the caller detects truncation by `length ===
 * SEQ_GEN_CAP` and keeps its "capped at N of {total}" copy honest with a `+`.
 */
export const SEQ_GEN_CAP = 10000;

/**
 * GNU seq semantics: `seq LAST` | `seq FIRST LAST` | `seq FIRST INCR LAST`.
 * Integers only. Returns null on non-integer input, wrong arity, or a zero
 * increment (GNU seq rejects "Zero increment" too). Returns an EMPTY array
 * when the range is empty (e.g. `seq 5 1` with the default positive
 * increment) — authentic: real seq prints nothing and exits 0. Generation is
 * bounded by SEQ_GEN_CAP (see above); display capping is the caller's job.
 */
export function seqLines(args: string[]): string[] | null {
  if (args.length < 1 || args.length > 3) return null;
  if (!args.every((a) => /^-?\d+$/.test(a))) return null;
  const nums = args.map((a) => parseInt(a, 10));

  let first = 1;
  let incr = 1;
  let last: number;
  if (nums.length === 1) {
    [last] = nums;
  } else if (nums.length === 2) {
    [first, last] = nums;
  } else {
    [first, incr, last] = nums;
  }
  if (incr === 0) return null;

  const lines: string[] = [];
  if (incr > 0) {
    for (let n = first; n <= last && lines.length < SEQ_GEN_CAP; n += incr) {
      lines.push(String(n));
    }
  } else {
    for (let n = first; n >= last && lines.length < SEQ_GEN_CAP; n += incr) {
      lines.push(String(n));
    }
  }
  return lines;
}

/**
 * The four `rm` outcomes the island dispatches on:
 *   - missing:      no args at all → "rm: missing operand" (+ the invitation)
 *   - refuse:       anything mundane → read-only-filesystem refusal
 *   - guarded-root: recursive + root WITHOUT --no-preserve-root → the two
 *                   authentic failsafe lines (no joke — the authenticity IS
 *                   the invitation)
 *   - deluxe:       recursive + root + --no-preserve-root → the Tier C show
 */
export type RmClass = 'missing' | 'refuse' | 'guarded-root' | 'deluxe';

/**
 * Classify an `rm` invocation. Recursive is detected ordering-free within a
 * short-flag cluster — `-r`, `-rf`, `-fr` all count (the cluster chars before
 * `r` are any flag letters; `t` is excluded so a stray long-ish token can't
 * false-positive) — or as the literal `--recursive`. A root target is the
 * literal `/` or `/*`.
 */
export function classifyRm(args: string[]): RmClass {
  if (args.length === 0) return 'missing';
  const recursive = args.some(
    (a) => /^-[a-su-z]*r/i.test(a) || a === '--recursive',
  );
  const root = args.some((a) => a === '/' || a === '/*');
  if (recursive && root) {
    return args.includes('--no-preserve-root') ? 'deluxe' : 'guarded-root';
  }
  return 'refuse';
}

/**
 * The xkcd-1168 gauntlet: a `survivor` typed a valid-looking tar invocation
 * on the first try — the first argument is a flag cluster (optionally
 * `-`-prefixed, letters only) containing `f` plus at least one operation
 * letter `c`/`x`/`t` (e.g. `-xzf`, `xf`, `czvf`, `-tvf`). Everything else —
 * including no args at all — is the `bomb`. Flag letters are matched
 * case-sensitively: GNU tar's `f`/`c`/`x`/`t` are lowercase flags.
 */
export function classifyTar(args: string[]): 'survivor' | 'bomb' {
  const first = args[0];
  if (!first) return 'bomb';
  const cluster = first.startsWith('-') ? first.slice(1) : first;
  if (!/^[A-Za-z]+$/.test(cluster)) return 'bomb';
  const survivor = cluster.includes('f') && /[cxt]/.test(cluster);
  return survivor ? 'survivor' : 'bomb';
}
