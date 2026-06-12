/**
 * Unit test for `src/lib/terminal-toys.ts` (change kd5e). Run with the
 * site's Node toolchain (>=22, native `.ts` type-stripping), mirroring how
 * the five sibling terminal suites run:
 *
 *   cd sites/astro-starlight-terminal1
 *   node --test scripts/terminal-toys.test.mjs
 *
 * Pins the pure-logic contracts behind the arcade pass:
 *   - cowsayBubble: the classic bubble shapes (`< >` single row; `/ \`,
 *     `| |`, `\ /` multi-row), word wrapping at COWSAY_WRAP, equal-width
 *     padding, the over-width hard-split, and the width budget;
 *   - cmatrixLines: count and exact column width, alphabet membership, the
 *     density extremes under a constant RNG, and seeded determinism (the
 *     injected-RNG contract — the island passes Math.random, tests pass
 *     mulberry32);
 *   - snake: init shape, movement, steering, the 180° reversal guard,
 *     growth + scoring + food respawn on eat, wall and self collision, the
 *     tail-vacated-cell allowance, and the board renderer (borders, glyph
 *     placement, the game-over banner overlay).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cowsayBubble,
  COWSAY_WRAP,
  cmatrixLines,
  CMATRIX_GLYPHS,
  snakeInit,
  snakeTurn,
  snakeStep,
  renderSnakeBoard,
  SNAKE_START_LEN,
  SNAKE_HEAD,
  SNAKE_BODY,
  SNAKE_FOOD,
  SNAKE_BANNER,
} from '../src/lib/terminal-toys.ts';

// Deterministic RNG for the injected-rng contracts (tiny, well-known PRNG —
// the test pins SEQUENCES, so any stable generator works).
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── cowsayBubble ─────────────────────────────────────────────────────────────

test('cowsayBubble: a short text gets the classic single-row bubble', () => {
  assert.deepEqual(cowsayBubble('moo!'), [' ______', '< moo! >', ' ------']);
});

test('cowsayBubble: long text wraps into the /| \\ multi-row frame, padded to one width', () => {
  const rows = cowsayBubble('one two three', 5);
  assert.deepEqual(rows, [
    ' _______',
    '/ one   \\',
    '| two   |',
    '\\ three /',
    ' -------',
  ]);
});

test('cowsayBubble: wrapping is greedy at word boundaries', () => {
  // 'aa bb' fits a 5-wide row together; 'cc' starts the next row.
  assert.deepEqual(cowsayBubble('aa bb cc', 5), [
    ' _______',
    '/ aa bb \\',
    '\\ cc    /',
    ' -------',
  ]);
});

test('cowsayBubble: a word longer than the width hard-splits instead of overflowing', () => {
  const rows = cowsayBubble('abcdefghij', 4);
  assert.deepEqual(rows, [' ______', '/ abcd \\', '| efgh |', '\\ ij   /', ' ------']);
});

test('cowsayBubble: every row stays within the width budget at the default wrap', () => {
  const text = 'the quick brown fox jumps over the lazy dog and keeps going well past forty characters';
  const rows = cowsayBubble(text);
  assert.ok(rows.length > 4); // wrapped: borders + 3+ text rows
  for (const row of rows) assert.ok(row.length <= COWSAY_WRAP + 4, row);
  // All text rows share one width (the padded frame).
  const widths = new Set(rows.slice(1, -1).map((r) => r.length));
  assert.equal(widths.size, 1);
});

test('cowsayBubble: empty text still yields a well-formed (empty) bubble', () => {
  assert.deepEqual(cowsayBubble('   '), [' __', '<  >', ' --']);
});

// ── cmatrixLines ─────────────────────────────────────────────────────────────

test('cmatrixLines: returns `count` lines of exactly `cols` characters', () => {
  const lines = cmatrixLines(48, 72, mulberry32(7));
  assert.equal(lines.length, 48);
  for (const line of lines) assert.equal(line.length, 72);
});

test('cmatrixLines: every non-space character comes from the glyph alphabet', () => {
  const alphabet = new Set(Array.from(CMATRIX_GLYPHS));
  for (const line of cmatrixLines(20, 60, mulberry32(42))) {
    for (const ch of Array.from(line)) {
      if (ch !== ' ') assert.ok(alphabet.has(ch), `unexpected glyph: ${ch}`);
    }
  }
});

test('cmatrixLines: a constant-zero RNG fills every cell with the first glyph (density floor > 0)', () => {
  const [line] = cmatrixLines(1, 10, () => 0);
  assert.equal(line, CMATRIX_GLYPHS[0].repeat(10));
});

test('cmatrixLines: a constant-high RNG yields all spaces (coin lands above max density)', () => {
  const [line] = cmatrixLines(1, 10, () => 0.999);
  assert.equal(line, ' '.repeat(10));
});

test('cmatrixLines: the same seed reproduces the same frame — the injected-RNG pin', () => {
  assert.deepEqual(cmatrixLines(30, 72, mulberry32(1337)), cmatrixLines(30, 72, mulberry32(1337)));
});

// ── snake: init ──────────────────────────────────────────────────────────────

test('snakeInit: centered horizontal snake, head first, moving right, food on a free cell', () => {
  const s = snakeInit(20, 10, mulberry32(3));
  assert.equal(s.snake.length, SNAKE_START_LEN);
  assert.equal(s.dir, 'right');
  assert.equal(s.pendingDir, 'right');
  assert.equal(s.score, 0);
  assert.equal(s.over, false);
  assert.deepEqual(s.snake[0], { x: 10, y: 5 }); // head at center
  assert.deepEqual(s.snake[1], { x: 9, y: 5 }); // body trails left
  assert.ok(!s.snake.some((c) => c.x === s.food.x && c.y === s.food.y));
  assert.ok(s.food.x >= 0 && s.food.x < 20 && s.food.y >= 0 && s.food.y < 10);
});

// ── snake: movement & steering ───────────────────────────────────────────────

// A hand-built state used by the movement pins: 3-long snake at row 2,
// head at (5,2), moving right on a 10×5 board, food parked far away.
const base = () => ({
  cols: 10,
  rows: 5,
  snake: [
    { x: 5, y: 2 },
    { x: 4, y: 2 },
    { x: 3, y: 2 },
  ],
  dir: 'right',
  pendingDir: 'right',
  food: { x: 9, y: 4 },
  score: 0,
  over: false,
});

test('snakeStep: moves the head one cell, tail follows, length and score unchanged', () => {
  const s = snakeStep(base(), mulberry32(1));
  assert.deepEqual(s.snake, [
    { x: 6, y: 2 },
    { x: 5, y: 2 },
    { x: 4, y: 2 },
  ]);
  assert.equal(s.score, 0);
  assert.equal(s.over, false);
});

test('snakeTurn: steering takes effect on the next step', () => {
  const turned = snakeTurn(base(), 'up');
  assert.equal(turned.pendingDir, 'up');
  const s = snakeStep(turned, mulberry32(1));
  assert.deepEqual(s.snake[0], { x: 5, y: 1 });
  assert.equal(s.dir, 'up');
});

test('snakeTurn: the 180° reversal is ignored (judged against the last MOVED direction)', () => {
  const s = snakeTurn(base(), 'left');
  assert.equal(s.pendingDir, 'right'); // unchanged — reversal refused
  // Two quick 90° taps between ticks cannot fold back either: up then down
  // still reverses nothing because dir (last moved) is still 'right'... but
  // down IS allowed against 'right'; the guard pins up-then-down resolving
  // to down, while right-to-left stays refused.
  const folded = snakeTurn(snakeTurn(base(), 'up'), 'down');
  assert.equal(folded.pendingDir, 'down');
  assert.equal(snakeTurn(folded, 'left').pendingDir, 'down'); // left still reverses 'right'
});

test('snakeTurn: a game-over state refuses steering', () => {
  const over = { ...base(), over: true };
  assert.equal(snakeTurn(over, 'up').pendingDir, 'right');
});

// ── snake: food, growth, scoring ─────────────────────────────────────────────

test('snakeStep: eating grows by one, scores a point, and respawns food on a free cell', () => {
  const hungry = { ...base(), food: { x: 6, y: 2 } }; // directly ahead
  const s = snakeStep(hungry, mulberry32(9));
  assert.equal(s.snake.length, SNAKE_START_LEN + 1);
  assert.equal(s.score, 1);
  assert.deepEqual(s.snake[0], { x: 6, y: 2 });
  assert.deepEqual(s.snake[3], { x: 3, y: 2 }); // tail kept — that's the growth
  assert.ok(!s.snake.some((c) => c.x === s.food.x && c.y === s.food.y));
  assert.equal(s.over, false);
});

// ── snake: collisions ────────────────────────────────────────────────────────

test('snakeStep: hitting a wall ends the game', () => {
  const atEdge = { ...base(), snake: [{ x: 9, y: 2 }, { x: 8, y: 2 }, { x: 7, y: 2 }] };
  const s = snakeStep(atEdge, mulberry32(1));
  assert.equal(s.over, true);
  assert.deepEqual(s.snake[0], { x: 9, y: 2 }); // frozen where it crashed
});

test('snakeStep: hitting your own body ends the game', () => {
  // A 5-long snake hooking back: head (5,2) moving up into (5,1)… craft the
  // body so (5,1) is occupied by a NON-tail segment.
  const hooked = {
    ...base(),
    snake: [
      { x: 5, y: 2 },
      { x: 4, y: 2 },
      { x: 4, y: 1 },
      { x: 5, y: 1 },
      { x: 6, y: 1 },
    ],
    dir: 'right',
    pendingDir: 'up',
  };
  const s = snakeStep(hooked, mulberry32(1));
  assert.equal(s.over, true);
});

test('snakeStep: moving into the cell the tail vacates this tick is NOT a collision', () => {
  // A 2×2 loop: head (2,2) turning right into (3,2) — the TAIL cell, which
  // empties on the same tick (the classic chase-your-tail allowance).
  const loop = {
    ...base(),
    snake: [
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 3, y: 2 },
    ],
    dir: 'up',
    pendingDir: 'right',
  };
  const s = snakeStep(loop, mulberry32(1));
  assert.equal(s.over, false);
  assert.deepEqual(s.snake[0], { x: 3, y: 2 });
});

test('snakeStep: a finished game is inert (state returned unchanged)', () => {
  const over = { ...base(), over: true };
  assert.equal(snakeStep(over, mulberry32(1)), over);
});

// ── snake: board renderer ────────────────────────────────────────────────────

test('renderSnakeBoard: borders, dimensions, and glyph placement', () => {
  const rows = renderSnakeBoard(base());
  assert.equal(rows.length, 5 + 2); // interior + two borders
  assert.equal(rows[0], `+${'-'.repeat(10)}+`);
  assert.equal(rows[rows.length - 1], rows[0]);
  for (const row of rows) assert.equal(row.length, 12); // cols + walls
  const interior = rows.slice(1, -1);
  assert.equal(interior[2][1 + 5], SNAKE_HEAD); // head at x=5 (+1 for the wall)
  assert.equal(interior[2][1 + 4], SNAKE_BODY);
  assert.equal(interior[2][1 + 3], SNAKE_BODY);
  assert.equal(interior[4][1 + 9], SNAKE_FOOD);
});

test('renderSnakeBoard: the game-over banner overlays the middle row, centered', () => {
  const cols = 20;
  const rows = renderSnakeBoard({ ...base(), cols, snake: [{ x: 0, y: 0 }], over: true });
  const mid = rows[1 + 2]; // interior row floor(5/2)=2, +1 for the top border
  const start = 1 + Math.floor((cols - SNAKE_BANNER.length) / 2);
  assert.equal(mid.slice(start, start + SNAKE_BANNER.length), SNAKE_BANNER);
});
