// A street seen from the side. The sun stands in one of a few spots in the
// sky, and every tree and tower casts a shadow on the ground away from it,
// longer the lower the sun is. The little ninja may only stand in the
// shadow: the child moves the sun to move the shadows, and walks the ninja
// through them, past the sleeping samurai and out through the gate.
//
// Each world brings one new thing: a cart the ninja can push, a cloud that
// drifts a little with every move, and the night, when only stone lanterns
// give light and the ninja can blow them out.
//
// There is no low sun with longer shadows: more shadow never hurts, so the
// child would always pick it, and only which way the shadows fall matters.

export type Sun = 'morning' | 'noon' | 'evening';
export const SUNS: readonly Sun[] = ['morning', 'noon', 'evening'];

// Which way shadows fall, away from the sun; none at noon.
export const FALL: Record<Sun, number> = { morning: 1, noon: 0, evening: -1 };

export type Kind = 'bamboo' | 'tree' | 'tower' | 'cart' | 'lantern';

export type Thing = {
  kind: Kind;
  x: number;
  // How tall it is, in cells: its shadow is just as long.
  height: number;
  // A stone lantern that is burning.
  lit?: boolean;
};

// A cloud two cells wide, drifting one cell with every move, back and
// forth between `min` and `max`. Its shadow is right under it.
export type Cloud = { x: number; dir: 1 | -1 };

export type World = 'town' | 'cart' | 'cloud' | 'night';
export const WORLDS: readonly World[] = ['town', 'cart', 'cloud', 'night'];

export type Level = {
  id: string;
  world: World;
  width: number;
  things: Thing[];
  start: number;
  // The gate at the end, with the samurai asleep in it.
  gate: number;
  sun: Sun;
  // The spots the sun can go to; none at night.
  suns: Sun[];
  cloud?: Cloud & { min: number; max: number };
  night?: boolean;
};

export type Round = {
  level: Level;
  sun: Sun;
  ninja: number;
  // The things as they are now: carts pushed, lanterns out.
  things: Thing[];
  cloud?: Cloud;
};

const THREE = [...SUNS];

// The levels, made by hand and checked by the solver in the tests.
export const LEVELS: Level[] = [
  // In the evening the shadows fall left and join up to the tower; in the
  // morning they fall right, from the tower to the gate.
  {
    id: 'town-1',
    world: 'town',
    width: 9,
    things: [
      { kind: 'bamboo', x: 0, height: 1 },
      { kind: 'tree', x: 3, height: 2 },
      { kind: 'tower', x: 5, height: 3 },
    ],
    start: 0,
    gate: 8,
    sun: 'noon',
    suns: THREE,
  },
  // In the morning there is a gap between the cart's shadow and the
  // bamboo's: push the cart a cell on. It can't go past the bamboo, so it
  // can never be pushed too far.
  {
    id: 'cart-1',
    world: 'cart',
    width: 9,
    things: [
      { kind: 'bamboo', x: 0, height: 1 },
      { kind: 'tree', x: 3, height: 2 },
      { kind: 'cart', x: 4, height: 1 },
      { kind: 'bamboo', x: 7, height: 1 },
    ],
    start: 0,
    gate: 8,
    sun: 'noon',
    suns: THREE,
  },
  // The cloud fills the gap, but only while it is over it.
  {
    id: 'cloud-1',
    world: 'cloud',
    width: 9,
    things: [
      { kind: 'bamboo', x: 0, height: 1 },
      { kind: 'tree', x: 2, height: 2 },
      { kind: 'bamboo', x: 7, height: 1 },
    ],
    start: 0,
    gate: 8,
    sun: 'noon',
    suns: THREE,
    cloud: { x: 3, dir: 1, min: 3, max: 6 },
  },
  // At night it is dark everywhere but round the lanterns.
  {
    id: 'night-1',
    world: 'night',
    width: 9,
    things: [
      { kind: 'bamboo', x: 0, height: 1 },
      { kind: 'lantern', x: 3, height: 0, lit: true },
      { kind: 'lantern', x: 6, height: 0, lit: true },
    ],
    start: 0,
    gate: 8,
    sun: 'noon',
    suns: [],
    night: true,
  },
];

export const levelById = (id: string) => LEVELS.find((l) => l.id === id);

// The level after this one; after the last, the first.
export function nextLevel(id: string): Level {
  const at = LEVELS.findIndex((l) => l.id === id);
  return LEVELS[(at + 1) % LEVELS.length];
}

// How far a lantern's light reaches either side, and how far the ninja can
// blow one out from.
export const LIGHT = 1;
export const BLOW = 2;

// The cells lit by the lanterns at night.
export function lit(r: Round): Set<number> {
  const cells = new Set<number>();
  for (const t of r.things)
    if (t.kind === 'lantern' && t.lit)
      for (let x = t.x - LIGHT; x <= t.x + LIGHT; x++)
        if (x >= 0 && x < r.level.width) cells.add(x);
  return cells;
}

// The cells where the ninja can stand: in shadow by day, out of the
// lanterns' light at night.
export function dark(r: Round): Set<number> {
  const { width } = r.level;
  const cells = new Set<number>();
  if (r.level.night) {
    const light = lit(r);
    for (let x = 0; x < width; x++) if (!light.has(x)) cells.add(x);
    return cells;
  }
  const fall = FALL[r.sun];
  const dir = Math.sign(fall);
  for (const t of r.things) {
    if (t.kind === 'lantern') continue;
    cells.add(t.x);
    for (let i = 1; i <= Math.abs(fall) * t.height; i++) {
      const x = t.x + dir * i;
      if (x >= 0 && x < width) cells.add(x);
    }
  }
  if (r.cloud)
    for (const x of [r.cloud.x, r.cloud.x + 1])
      if (x >= 0 && x < width) cells.add(x);
  return cells;
}

export const newRound = (level: Level = LEVELS[0]): Round => ({
  level,
  sun: level.sun,
  ninja: level.start,
  things: level.things.map((t) => ({ ...t })),
  cloud: level.cloud && { x: level.cloud.x, dir: level.cloud.dir },
});

export const isSolved = (r: Round) => r.ninja === r.level.gate;

// Whether nothing has been done yet.
export const isFresh = (r: Round) =>
  JSON.stringify(r) === JSON.stringify(newRound(r.level));

// Where the ninja goes when the child taps a cell: through the dark to it,
// or, when the light is in the way, up to the first light cell, where the
// samurai wakes and the ninja runs back. `path` ends at that light cell.
export function tryWalk(
  r: Round,
  to: number
): { path: number[]; ok: boolean } | null {
  if (to < 0 || to >= r.level.width || to === r.ninja) return null;
  const free = dark(r);
  const step = to > r.ninja ? 1 : -1;
  const path: number[] = [];
  for (let x = r.ninja + step; x !== to + step; x += step) {
    path.push(x);
    if (!free.has(x)) return { path, ok: false };
  }
  return { path, ok: true };
}

// Where the ninja runs to when it is left out in the light: back the way
// it came, to the nearest dark cell towards the start, or, if there is
// none that way, to the nearest one the other way.
// It never hides on a cart, only next to one.
export function hideFrom(r: Round, from: number): number {
  const dk = dark(r);
  const free = (x: number) => dk.has(x) && !cartAt(r, x);
  if (free(from)) return from;
  const { start, gate, width } = r.level;
  const back = start < gate ? -1 : 1;
  for (const dir of [back, -back])
    for (let x = from + dir; x >= 0 && x < width; x += dir)
      if (free(x)) return x;
  return from;
}

// Whether there is a cart at `x`. The ninja walks past a cart, but never
// stops on one.
export const cartAt = (r: Round, x: number) =>
  r.things.some((t) => t.x === x && t.kind === 'cart');

// After every move the cloud drifts a cell, turning round at the ends of
// its way, and the ninja runs into the dark if it is left in the light.
// Once through the gate, nothing moves any more.
function settle(r: Round): Round {
  if (isSolved(r)) return r;
  let { cloud } = r;
  const way = r.level.cloud;
  if (cloud && way) {
    let dir = cloud.dir;
    if (cloud.x + dir < way.min || cloud.x + dir > way.max)
      dir = -dir as 1 | -1;
    cloud = { x: cloud.x + dir, dir };
  }
  const next = { ...r, cloud };
  return { ...next, ninja: hideFrom(next, next.ninja) };
}

export function walk(r: Round, to: number): Round {
  if (cartAt(r, to)) return r;
  const w = tryWalk(r, to);
  return w?.ok ? settle({ ...r, ninja: to }) : r;
}

// The sun moves, and the shadows move with it.
export function moveSun(r: Round, sun: Sun): Round {
  if (sun === r.sun || !r.level.suns.includes(sun)) return r;
  return settle({ ...r, sun });
}

// Where a cart at `x` would roll to if the ninja pushed it, or null if it
// can't be pushed: the ninja must stand right next to it, and the cell
// past it must be empty ground, not the gate.
export function pushTo(r: Round, x: number): number | null {
  const cart = r.things.find((t) => t.x === x && t.kind === 'cart');
  if (!cart || Math.abs(x - r.ninja) !== 1) return null;
  const to = x + (x - r.ninja);
  if (to < 0 || to >= r.level.width || to === r.level.gate) return null;
  if (r.things.some((t) => t.x === to)) return null;
  return to;
}

export function push(r: Round, x: number): Round {
  const to = pushTo(r, x);
  if (to === null) return r;
  const things = r.things.map((t) => (t.x === x ? { ...t, x: to } : t));
  return settle({ ...r, things });
}

// Whether the ninja is close enough to blow out a burning lantern at `x`.
export function canBlow(r: Round, x: number) {
  const lamp = r.things.find((t) => t.x === x && t.kind === 'lantern');
  return !!lamp?.lit && Math.abs(x - r.ninja) <= BLOW && x !== r.ninja;
}

export function blow(r: Round, x: number): Round {
  if (!canBlow(r, x)) return r;
  const things = r.things.map((t) => (t.x === x ? { ...t, lit: false } : t));
  return settle({ ...r, things });
}

// What a tap on a cell does: pushes the cart there or blows out the
// lantern there if the ninja can, and otherwise walks the ninja to it. A
// cart right next to the ninja that can't roll only gives a little jolt.
export type Move =
  | { type: 'push'; to: number; next: Round }
  | { type: 'stuck'; next: Round }
  | { type: 'blow'; next: Round }
  | { type: 'walk'; to: number; path: number[]; ok: boolean; next: Round };

export function tap(r: Round, x: number): Move | null {
  const to = pushTo(r, x);
  if (to !== null) return { type: 'push', to, next: push(r, x) };
  if (cartAt(r, x)) {
    if (Math.abs(x - r.ninja) === 1) return { type: 'stuck', next: r };
    // A cart further off: the ninja walks up to it.
    x -= Math.sign(x - r.ninja);
  }
  if (canBlow(r, x)) return { type: 'blow', next: blow(r, x) };
  const w = tryWalk(r, x);
  if (!w) return null;
  return { type: 'walk', to: x, ...w, next: w.ok ? walk(r, x) : r };
}

const key = (r: Round) =>
  [
    r.sun,
    r.ninja,
    r.things.map((t) => `${t.x},${t.height},${t.lit ? 1 : 0}`).join(';'),
    r.cloud ? `${r.cloud.x},${r.cloud.dir}` : '',
  ].join('|');

// Every round one tap away.
function moves(r: Round): Round[] {
  const all = [
    ...r.level.suns.map((s) => moveSun(r, s)),
    ...Array.from({ length: r.level.width }, (_, x) => tap(r, x)?.next ?? r),
  ];
  return all.filter((o) => o !== r);
}

// Every round the child can get to, and where each leads.
function explore(level: Level) {
  const start = newRound(level);
  const rounds = new Map([[key(start), start]]);
  const edges = new Map<string, string[]>();
  const queue = [start];
  while (queue.length) {
    const r = queue.shift()!;
    const out: string[] = [];
    if (!isSolved(r))
      for (const o of moves(r)) {
        const k = key(o);
        out.push(k);
        if (!rounds.has(k)) {
          rounds.set(k, o);
          queue.push(o);
        }
      }
    edges.set(key(r), out);
  }
  return { start: key(start), rounds, edges };
}

// The fewest taps (sun moves, walks, pushes) to the gate, or null if there
// is no way: every level is checked with it.
export function solve(level: Level): number | null {
  const { start, edges, rounds } = explore(level);
  const depth = new Map([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const k = queue.shift()!;
    if (isSolved(rounds.get(k)!)) return depth.get(k)!;
    for (const o of edges.get(k)!)
      if (!depth.has(o)) {
        depth.set(o, depth.get(k)! + 1);
        queue.push(o);
      }
  }
  return null;
}

// How many rounds the child can get to from which the gate can no longer
// be reached. There is no losing, so for every level this must be 0.
export function deadEnds(level: Level): number {
  const { edges, rounds } = explore(level);
  const back = new Map<string, string[]>();
  for (const [k, out] of edges)
    for (const o of out) back.set(o, [...(back.get(o) ?? []), k]);
  const good = new Set(
    [...rounds].filter(([, r]) => isSolved(r)).map(([k]) => k)
  );
  const queue = [...good];
  while (queue.length)
    for (const p of back.get(queue.shift()!) ?? [])
      if (!good.has(p)) {
        good.add(p);
        queue.push(p);
      }
  return rounds.size - good.size;
}

export type Stats = { solved: number; won?: string[] };
export const initialStats: Stats = { solved: 0, won: [] };

export type Store = { round: Round };
export const initialStore: Store = { round: newRound() };
