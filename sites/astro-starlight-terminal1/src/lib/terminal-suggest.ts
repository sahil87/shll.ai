/**
 * terminal-suggest — a pure, dependency-free "did you mean?" matcher for the
 * homepage terminal's command dispatch (change cuur).
 *
 * Extracted to src/lib/ (rather than inlined in TerminalPrompt.astro) so it is
 * unit-testable under the existing `node --test scripts/*.test.mjs` pattern;
 * Vite bundles it into the client island. No npm import (Constitution VI) —
 * plain string math, ~40 lines.
 *
 * Algorithm: Damerau-Levenshtein in its optimal-string-alignment form — an
 * ADJACENT TRANSPOSITION counts as 1 edit, so the classic fat-finger typo class
 * (`hlep` → `help`, `verison` → `version`) scores 1 where plain Levenshtein
 * would score 2. That keeps the threshold tight without missing the most
 * common real-world miss.
 */

/**
 * Optimal-string-alignment Damerau-Levenshtein distance: the minimum number of
 * single-character insertions, deletions, substitutions, and ADJACENT
 * transpositions (cost 1 each) to turn `a` into `b`. Inputs here are command
 * tokens (a handful of characters), so the full (m+1)×(n+1) matrix is cheap.
 */
export function damerauLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // d[i][j] = distance between the first i chars of `a` and first j chars of `b`.
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array<number>(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost, // substitution (or match)
      );
      // Adjacent transposition (the OSA extension): "hl" ↔ "lh" is ONE edit.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

/**
 * Return the candidate closest to `input` (lowercased) within the edit-distance
 * threshold, or null when nothing qualifies.
 *
 * Threshold: max distance 1 when the input is ≤3 chars, else 2 — the short-input
 * clamp stops absurd matches like `vi` → `cd` (distance 2 on a 2-char token is
 * a different word, not a typo). Tie-break: lowest distance wins; on equal
 * distance, the EARLIER candidate in iteration order wins (the strict `<`
 * below — a later candidate can only displace a strictly closer one).
 */
export function suggestCommand(
  input: string,
  candidates: readonly string[],
): string | null {
  const needle = input.toLowerCase();
  const maxDistance = needle.length <= 3 ? 1 : 2;

  let best: string | null = null;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = damerauLevenshtein(needle, candidate);
    if (distance <= maxDistance && distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}
