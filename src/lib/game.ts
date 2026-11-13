// A little town seen from above, a bit from the front. The sun stands on
// one of the four sides, and every tower, bamboo clump and tree casts a
// shadow on the street away from it, as many cells long as the thing is
// tall. The little ninja may only stand and walk in the shadow: the child
// moves the sun to move the shadows, and walks the ninja through them, round
// the towers and bamboo, past the sleeping samurai and out through the gate.
//
// At the bottom there is the moon instead of a sun: then it is night, dark
// everywhere but round the stone lanterns, which light up.

export type Sun = 'north' | 'east' | 'moon' | 'west';
export const SUNS: readonly Sun[] = ['north', 'east', 'moon', 'west'];

// Which way shadows fall, away from the sun, as [across, down]. There are
// none at night.
export const FALL: Record<Sun, [number, number]> = {
  north: [0, 1],
  east: [-1, 0],
  moon: [0, 0],
  west: [1, 0],
};

// How many quarters the sun goes round, always clockwise, from one side to
// another: from the right to the left it goes by the moon.
export const quarters = (from: Sun, to: Sun) =>
  (SUNS.indexOf(to) - SUNS.indexOf(from) + SUNS.length) % SUNS.length;

// How long the sun takes for each quarter.
export const QUARTER_MS = 350;

export type Kind = 'tower' | 'bamboo' | 'tree' | 'lantern';

// Towers, bamboo and stone lanterns are in the way; the ninja walks under
// a tree.
export const SOLID: Record<Kind, boolean> = {
  tower: true,
  bamboo: true,
  tree: false,
  lantern: true,
};

export type Thing = {
  kind: Kind;
  x: number;
  y: number;
  // How tall it is, in cells: its shadow is just as long.
  height: number;
};

export type World = 'town';
export const WORLDS: readonly World[] = ['town'];

export type Level = {
  id: string;
  world: World;
  width: number;
  rows: number;
  things: Thing[];
  // Where the ninja starts, as a cell: under a big parasol, so always in
  // the shade.
  start: number;
  // The column of the gate, over the top row; the ninja leaves through it
  // from the top row's cell under it.
  gate: number;
  sun: Sun;
};

// A cell is a number, row by row from the top left.
export const cell = (level: Pick<Level, 'width'>, x: number, y: number) =>
  y * level.width + x;
export const xy = (
  level: Pick<Level, 'width'>,
  c: number
): [number, number] => [c % level.width, Math.floor(c / level.width)];

export type Round = {
  level: Level;
  sun: Sun;
  ninja: number;
};

// The levels, made by hand and checked by the solver in the tests.
export const LEVELS: Level[] = [
  {
    id: 'town-1',
    world: 'town',
    width: 6,
    rows: 8,
    things: [
      { kind: 'tower', x: 3, y: 1, height: 3 },
      { kind: 'bamboo', x: 1, y: 1, height: 1 },
      { kind: 'tower', x: 1, y: 2, height: 1 },
      { kind: 'lantern', x: 1, y: 3, height: 1 },
      { kind: 'bamboo', x: 5, y: 3, height: 1 },
      { kind: 'tree', x: 0, y: 4, height: 2 },
      { kind: 'tower', x: 2, y: 4, height: 2 },
      { kind: 'lantern', x: 3, y: 4, height: 1 },
      { kind: 'tree', x: 4, y: 4, height: 2 },
      { kind: 'tower', x: 0, y: 5, height: 1 },
      { kind: 'tree', x: 2, y: 7, height: 2 },
    ],
    start: 42,
    gate: 5,
    sun: 'east',
  },
];

export const levelById = (id: string) => LEVELS.find((l) => l.id === id);

// The level after this one; after the last, the first.
export function nextLevel(id: string): Level {
  const at = LEVELS.findIndex((l) => l.id === id);
  return LEVELS[(at + 1) % LEVELS.length];
}

export const gateCell = (level: Level) => cell(level, level.gate, 0);

export const thingAt = (level: Level, c: number) =>
  level.things.find((t) => cell(level, t.x, t.y) === c);

// Whether the ninja can be on a cell at all, sun or not.
export function open(level: Level, c: number) {
  const t = thingAt(level, c);
  return !t || !SOLID[t.kind];
}

// The cells a lantern lights at night: its own and the four next to it.
export function lit(level: Level): Set<number> {
  const cells = new Set<number>();
  for (const t of level.things)
    if (t.kind === 'lantern') {
      const c = cell(level, t.x, t.y);
      cells.add(c);
      for (const n of neighbours(level, c)) cells.add(n);
    }
  return cells;
}

// The cells where the ninja is hidden. By day, the shadows: under each
// thing, and as many cells on from it, away from the sun, as it is tall. At
// night, everywhere the lanterns don't light.
export function dark(level: Level, sun: Sun): Set<number> {
  // Under the parasol at the start it is always shady.
  const cells = new Set([level.start]);
  if (sun === 'moon') {
    const light = lit(level);
    for (let c = 0; c < level.width * level.rows; c++)
      if (!light.has(c)) cells.add(c);
    return cells;
  }
  const [dx, dy] = FALL[sun];
  for (const t of level.things)
    for (let i = 0; i <= t.height; i++) {
      const x = t.x + dx * i;
      const y = t.y + dy * i;
      if (x >= 0 && x < level.width && y >= 0 && y < level.rows)
        cells.add(cell(level, x, y));
    }
  return cells;
}

function neighbours(level: Level, c: number) {
  const [x, y] = xy(level, c);
  const out: number[] = [];
  for (const [dx, dy] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ]) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < level.width && ny >= 0 && ny < level.rows)
      out.push(cell(level, nx, ny));
  }
  return out;
}

// The shortest way from one cell to another over cells that `ok` lets
// through, not counting the first; null if there is none.
function route(
  level: Level,
  from: number,
  to: number,
  ok: (c: number) => boolean
): number[] | null {
  const prev = new Map<number, number>([[from, -1]]);
  const queue = [from];
  while (queue.length) {
    const c = queue.shift()!;
    if (c === to) {
      const path: number[] = [];
      for (let p = c; p !== from; p = prev.get(p)!) path.unshift(p);
      return path;
    }
    for (const n of neighbours(level, c))
      if (!prev.has(n) && ok(n)) {
        prev.set(n, c);
        queue.push(n);
      }
  }
  return null;
}

export const newRound = (level: Level = LEVELS[0]): Round => ({
  level,
  sun: level.sun,
  ninja: level.start,
});

export const isSolved = (r: Round) => r.ninja === gateCell(r.level);

// Where the ninja goes when the child taps a cell: the shortest way through
// the shadow to it, or, when there is none, the shortest way round the
// towers, up to the first sunny cell, where the samurai wakes and the ninja
// runs back to the start. `path` ends at that sunny cell. Null when the
// cell can't be got to at all.
export function tryWalk(
  r: Round,
  to: number
): { path: number[]; ok: boolean } | null {
  const { level } = r;
  if (to === r.ninja || !open(level, to)) return null;
  const shade = dark(level, r.sun);
  const safe = route(level, r.ninja, to, (c) => open(level, c) && shade.has(c));
  if (safe) return { path: safe, ok: true };
  const any = route(level, r.ninja, to, (c) => open(level, c));
  if (!any) return null;
  const stop = any.findIndex((c) => !shade.has(c));
  return { path: any.slice(0, stop + 1), ok: false };
}

export function walk(r: Round, to: number): Round {
  return tryWalk(r, to)?.ok ? { ...r, ninja: to } : r;
}

// The way the ninja runs back to the start when it is seen, round the
// walls, sun or not.
export const runWay = (level: Level, from: number, to: number) =>
  route(level, from, to, (c) => open(level, c)) ?? [to];

// Whether the ninja would be out in the light with the sun there: then
// the samurai wakes, and the ninja runs back to the start.
export const seen = (r: Round, sun: Sun) => !dark(r.level, sun).has(r.ninja);

// The sun moves. If that leaves the ninja in the light, the samurai wakes
// and the ninja runs back to the start, under the parasol.
export function moveSun(r: Round, sun: Sun): Round {
  if (sun === r.sun) return r;
  return { ...r, sun, ninja: seen(r, sun) ? r.level.start : r.ninja };
}

// Every round one tap away.
function moves(r: Round): Round[] {
  const { level } = r;
  const all = [
    ...SUNS.map((s) => moveSun(r, s)),
    ...Array.from({ length: level.width * level.rows }, (_, c) => walk(r, c)),
  ];
  return all.filter((o) => o !== r);
}

const key = (r: Round) => `${r.sun}:${r.ninja}`;

// The fewest taps (sun moves and walks) to the gate, and which, or null if
// there is no way: every level is checked with it.
export function solution(level: Level): Round[] | null {
  const start = newRound(level);
  const prev = new Map<string, Round | null>([[key(start), null]]);
  const queue = [start];
  while (queue.length) {
    const r = queue.shift()!;
    if (isSolved(r)) {
      const out: Round[] = [];
      for (let p: Round | null = r; p; p = prev.get(key(p))!) out.unshift(p);
      return out.slice(1);
    }
    for (const o of moves(r))
      if (!prev.has(key(o))) {
        prev.set(key(o), r);
        queue.push(o);
      }
  }
  return null;
}

export const solve = (level: Level) => solution(level)?.length ?? null;

export type Stats = { solved: number; won?: string[] };
export const initialStats: Stats = { solved: 0, won: [] };

export type Store = { round: Round };
export const initialStore: Store = { round: newRound() };
