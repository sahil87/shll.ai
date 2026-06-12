/**
 * terminal-toys — pure, dependency-free logic for the homepage terminal's
 * arcade pass (change kd5e): the `cowsay` speech-bubble builder, the
 * `cmatrix` glyph-line generator (RNG injected so tests pin shape
 * deterministically), and the `snake` game core — init, steering, the
 * per-tick `state → state` transition, and the board-to-text renderer.
 *
 * Extracted to src/lib/ (rather than inlined in TerminalPrompt.astro) so it is
 * unit-testable under the existing `node --test scripts/*.test.mjs` pattern —
 * the same precedent as terminal-suggest.ts (change cuur), terminal-eggs.ts
 * (change o33t), terminal-cheatsheet.ts (change cdbr), terminal-toolcard.ts
 * (change 37ng), and terminal-share.ts (change tx5p), a SIXTH time; Vite
 * bundles it into the client island. No npm import (Constitution VI) — plain
 * string and array math. Timers, DOM writes, and key wiring stay island-side;
 * this module takes and returns plain data.
 */

// ── cowsay ──────────────────────────────────────────────────────────────────

/** Classic cowsay wraps its bubble text at 40 columns — kept verbatim (the
 * recognition IS the gag) and comfortably inside the island's ~74-char
 * `white-space: pre` line budget (bubble width = wrap + 4 ≤ 44). */
export const COWSAY_WRAP = 40;

/**
 * Build the speech-bubble rows for `cowsay`: an underscore top border, the
 * wrapped text rows, and a dash bottom border — all sized to the longest
 * wrapped row. A single row reads `< text >`; multiple rows use the classic
 * `/ first \`, `| middle |`, `\ last /` frame, every row padded to the same
 * inner width. Text wraps greedily at word boundaries; a single word longer
 * than `width` is hard-split (never overflows the budget). The cow itself is
 * island-side art (the shll-splash/sl precedent) — this builds only the
 * bubble.
 */
export function cowsayBubble(text: string, width = COWSAY_WRAP): string[] {
  // Clamp the public width param to a positive integer — a non-positive
  // width would make the hard-split below slice nothing and loop forever
  // (kd5e PR review).
  width = Math.max(1, Math.floor(width));
  const trimmed = text.trim();
  const words = trimmed === '' ? [] : trimmed.split(/\s+/);
  const rows: string[] = [];
  let cur = '';
  for (let word of words) {
    // Hard-split an unbreakable over-width word first (URL-shaped input).
    while (word.length > width) {
      if (cur !== '') {
        rows.push(cur);
        cur = '';
      }
      rows.push(word.slice(0, width));
      word = word.slice(width);
    }
    if (word === '') continue; // length was an exact multiple of width
    if (cur === '') cur = word;
    else if (cur.length + 1 + word.length <= width) cur += ` ${word}`;
    else {
      rows.push(cur);
      cur = word;
    }
  }
  if (cur !== '' || rows.length === 0) rows.push(cur);

  // Reduce, not Math.max(...spread): cowsay text is user-controlled (paste),
  // and spreading a huge row array as arguments can overflow the engine's
  // argument limit (kd5e PR review).
  const inner = rows.reduce((max, r) => Math.max(max, r.length), 0);
  const pad = (r: string) => r.padEnd(inner);
  const out: string[] = [` ${'_'.repeat(inner + 2)}`];
  if (rows.length === 1) {
    out.push(`< ${pad(rows[0])} >`);
  } else {
    out.push(`/ ${pad(rows[0])} \\`);
    for (const r of rows.slice(1, -1)) out.push(`| ${pad(r)} |`);
    out.push(`\\ ${pad(rows[rows.length - 1])} /`);
  }
  out.push(` ${'-'.repeat(inner + 2)}`);
  return out;
}

// ── cmatrix ─────────────────────────────────────────────────────────────────

/** The glyph alphabet: half-width katakana (the iconic look — single UTF-16
 * code units, so string length math stays honest) plus digits and a few
 * ASCII sparks. */
export const CMATRIX_GLYPHS =
  'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:."=*+-<>';

/** Per-line glyph density bounds: each generated line draws its own density
 * from [MIN, MAX) via the injected RNG — the variation is what reads as
 * "rain" rather than uniform noise. */
export const CMATRIX_DENSITY_MIN = 0.08;
export const CMATRIX_DENSITY_MAX = 0.3;

const GLYPHS = Array.from(CMATRIX_GLYPHS);

/**
 * Generate `count` matrix-rain lines, each exactly `cols` characters of
 * density-scattered glyphs and spaces. The RNG is INJECTED (the change-kd5e
 * testability contract): tests pass a seeded generator and pin line width,
 * count, alphabet membership, and exact output deterministically — the
 * island passes Math.random. Three rng() draws per glyph cell, one for the
 * line's density, one per-cell coin, one per-glyph pick.
 */
export function cmatrixLines(count: number, cols: number, rng: () => number): string[] {
  const lines: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const density =
      CMATRIX_DENSITY_MIN + rng() * (CMATRIX_DENSITY_MAX - CMATRIX_DENSITY_MIN);
    let line = '';
    for (let c = 0; c < cols; c += 1) {
      line += rng() < density ? GLYPHS[Math.floor(rng() * GLYPHS.length)] : ' ';
    }
    lines.push(line);
  }
  return lines;
}

// ── snake ───────────────────────────────────────────────────────────────────

export type SnakeDir = 'up' | 'down' | 'left' | 'right';
export interface SnakeCell {
  x: number;
  y: number;
}
/**
 * The whole game in one value. `snake` is head-first; `dir` is the direction
 * of the LAST move actually taken while `pendingDir` is what the next tick
 * will use — the split is the classic anti-180° guard: steering only stores
 * a pending direction, and reversal is judged against the direction the
 * snake last MOVED (two quick 90° taps between ticks can't fold the head
 * back through its own neck).
 */
export interface SnakeState {
  cols: number;
  rows: number;
  snake: SnakeCell[];
  dir: SnakeDir;
  pendingDir: SnakeDir;
  food: SnakeCell;
  score: number;
  over: boolean;
}

export const SNAKE_START_LEN = 3;
export const SNAKE_HEAD = '@';
export const SNAKE_BODY = 'o';
export const SNAKE_FOOD = '*';
/** Overlaid centered on the board's middle row when the game ends. */
export const SNAKE_BANNER = ' game over ';

const DELTAS: Record<SnakeDir, SnakeCell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<SnakeDir, SnakeDir> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

/** Drop the food on a uniformly-random FREE cell (never on the snake). A
 * full board returns null — the caller treats it as victory/over. */
function placeFood(
  cols: number,
  rows: number,
  occupied: readonly SnakeCell[],
  rng: () => number,
): SnakeCell | null {
  const taken = new Set(occupied.map((c) => `${c.x},${c.y}`));
  const free: SnakeCell[] = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(rng() * free.length)];
}

/**
 * A fresh game on a `cols`×`rows` interior: a SNAKE_START_LEN snake lying
 * horizontally at the center, moving right, food placed via the injected
 * RNG, score 0.
 */
export function snakeInit(cols: number, rows: number, rng: () => number): SnakeState {
  const cy = Math.floor(rows / 2);
  const cx = Math.floor(cols / 2);
  const snake = Array.from({ length: SNAKE_START_LEN }, (_, i) => ({
    x: cx - i,
    y: cy,
  }));
  const food = placeFood(cols, rows, snake, rng);
  return {
    cols,
    rows,
    snake,
    dir: 'right',
    pendingDir: 'right',
    food: food ?? { x: -1, y: -1 },
    score: 0,
    over: food === null,
  };
}

/**
 * Steer: store `dir` as the next tick's direction unless it reverses the
 * direction last moved (the 180° guard) or the game is over. Pure — returns
 * a new state (or the same one when the input is a no-op).
 */
export function snakeTurn(state: SnakeState, dir: SnakeDir): SnakeState {
  if (state.over || dir === OPPOSITE[state.dir] || dir === state.pendingDir) return state;
  return { ...state, pendingDir: dir };
}

/**
 * One tick, pure `state → state`: move the head one cell along pendingDir;
 * hitting a wall or the body ends the game (the cell the TAIL is vacating
 * this same tick is legal — the classic chase-your-tail allowance); landing
 * on food grows the snake, scores a point, and respawns food via the
 * injected RNG (no free cell left = a win, also `over`).
 */
export function snakeStep(state: SnakeState, rng: () => number): SnakeState {
  if (state.over) return state;
  const dir = state.pendingDir;
  const head = state.snake[0];
  const next = { x: head.x + DELTAS[dir].x, y: head.y + DELTAS[dir].y };

  if (next.x < 0 || next.x >= state.cols || next.y < 0 || next.y >= state.rows) {
    return { ...state, dir, over: true };
  }
  const eats = next.x === state.food.x && next.y === state.food.y;
  // When not eating, the tail vacates its cell this tick — exclude it from
  // the collision body so chasing your own tail stays survivable.
  const body = eats ? state.snake : state.snake.slice(0, -1);
  if (body.some((c) => c.x === next.x && c.y === next.y)) {
    return { ...state, dir, over: true };
  }
  const snake = eats ? [next, ...state.snake] : [next, ...state.snake.slice(0, -1)];
  if (!eats) {
    return { ...state, dir, pendingDir: dir, snake };
  }
  const food = placeFood(state.cols, state.rows, snake, rng);
  return {
    ...state,
    dir,
    pendingDir: dir,
    snake,
    score: state.score + 1,
    food: food ?? { x: -1, y: -1 },
    over: food === null,
  };
}

/**
 * Render the board as text rows: `+--…--+` top/bottom borders, `|`-walled
 * interior rows, head/body/food glyphs on a space grid. When the game is
 * over, SNAKE_BANNER is overlaid centered on the middle interior row (the
 * island's status line below the board carries the score). Pure string
 * math — the island joins the rows with newlines into the aria-hidden
 * container's textContent.
 */
export function renderSnakeBoard(state: SnakeState): string[] {
  const grid: string[][] = Array.from({ length: state.rows }, () =>
    Array.from({ length: state.cols }, () => ' '),
  );
  if (state.food.x >= 0) grid[state.food.y][state.food.x] = SNAKE_FOOD;
  for (let i = state.snake.length - 1; i >= 0; i -= 1) {
    const c = state.snake[i];
    grid[c.y][c.x] = i === 0 ? SNAKE_HEAD : SNAKE_BODY;
  }
  if (state.over) {
    const y = Math.floor(state.rows / 2);
    const banner = SNAKE_BANNER.slice(0, state.cols);
    const start = Math.max(0, Math.floor((state.cols - banner.length) / 2));
    for (let i = 0; i < banner.length; i += 1) grid[y][start + i] = banner[i];
  }
  const border = `+${'-'.repeat(state.cols)}+`;
  return [border, ...grid.map((row) => `|${row.join('')}|`), border];
}
