// A street seen from the side. The sun stands in one of a few spots in the
// sky, and every tree and tower casts a shadow on the ground away from it,
// as long as the thing is tall. The little ninja may only stand in the
// shadow: the child moves the sun to move the shadows, and walks the ninja
// through them, past the sleeping samurai and out through the gate.

export type Sun = 'morning' | 'noon' | 'evening';
export const SUNS: readonly Sun[] = ['morning', 'noon', 'evening'];

export type Thing = {
  kind: 'bush' | 'tree' | 'tower';
  x: number;
  // How tall it is, in cells; its shadow is just as long.
  height: number;
};

export type Level = {
  width: number;
  things: Thing[];
  start: number;
  // The gate at the end, with the samurai asleep in it.
  gate: number;
  sun: Sun;
};

export type Round = {
  level: Level;
  sun: Sun;
  ninja: number;
};

// The first level, made by hand. With the sun in the evening the shadows
// fall left and join up to the tower; in the morning they fall right, from
// the tower to the gate.
export const FIRST: Level = {
  width: 9,
  things: [
    { kind: 'bush', x: 0, height: 1 },
    { kind: 'tree', x: 3, height: 2 },
    { kind: 'tower', x: 5, height: 3 },
  ],
  start: 0,
  gate: 8,
  sun: 'noon',
};

// Which way shadows fall: away from the sun. At noon only right under.
const FALL: Record<Sun, -1 | 0 | 1> = { morning: 1, noon: 0, evening: -1 };

// The cells in shadow while the sun is where it is.
export function shade(level: Level, sun: Sun): Set<number> {
  const cells = new Set<number>();
  for (const t of level.things) {
    cells.add(t.x);
    const dir = FALL[sun];
    if (!dir) continue;
    for (let i = 1; i <= t.height; i++) {
      const x = t.x + dir * i;
      if (x >= 0 && x < level.width) cells.add(x);
    }
  }
  return cells;
}

export const newRound = (level: Level = FIRST): Round => ({
  level,
  sun: level.sun,
  ninja: level.start,
});

export const isSolved = (r: Round) => r.ninja === r.level.gate;

// The ninja walks to a cell if every cell on the way is in shadow.
// Returns the cells it walks through, or null when the sun is in the way.
export function pathTo(r: Round, to: number): number[] | null {
  if (to < 0 || to >= r.level.width || to === r.ninja) return null;
  const dark = shade(r.level, r.sun);
  const step = to > r.ninja ? 1 : -1;
  const path: number[] = [];
  for (let x = r.ninja + step; x !== to + step; x += step) {
    if (!dark.has(x)) return null;
    path.push(x);
  }
  return path;
}

// Where the ninja goes when the child taps a cell: through the shadow to
// it, or, when the sun is in the way, up to the first sunny cell, where the
// samurai wakes and the ninja runs back. `path` ends at that sunny cell.
export function tryWalk(
  r: Round,
  to: number
): { path: number[]; ok: boolean } | null {
  if (to < 0 || to >= r.level.width || to === r.ninja) return null;
  const dark = shade(r.level, r.sun);
  const step = to > r.ninja ? 1 : -1;
  const path: number[] = [];
  for (let x = r.ninja + step; x !== to + step; x += step) {
    path.push(x);
    if (!dark.has(x)) return { path, ok: false };
  }
  return { path, ok: true };
}

export function walk(r: Round, to: number): Round {
  return pathTo(r, to) ? { ...r, ninja: to } : r;
}

// The sun can't move if it would leave the ninja standing in the sun.
export const canMoveSun = (r: Round, sun: Sun) =>
  sun !== r.sun && shade(r.level, sun).has(r.ninja);

export function moveSun(r: Round, sun: Sun): Round {
  return canMoveSun(r, sun) ? { ...r, sun } : r;
}

// The fewest taps (sun moves and walks) to the gate, or null if there is
// no way: every level is checked with it.
export function solve(level: Level): number | null {
  const key = (r: Round) => `${r.sun}:${r.ninja}`;
  const start = newRound(level);
  const seen = new Set([key(start)]);
  let frontier = [start];
  for (let moves = 0; frontier.length; moves++) {
    const next: Round[] = [];
    for (const r of frontier) {
      if (isSolved(r)) return moves;
      const options = [
        ...SUNS.map((s) => moveSun(r, s)),
        ...Array.from({ length: level.width }, (_, x) => walk(r, x)),
      ];
      for (const o of options) {
        if (o === r || seen.has(key(o))) continue;
        seen.add(key(o));
        next.push(o);
      }
    }
    frontier = next;
  }
  return null;
}

export type Stats = { solved: number };
export const initialStats: Stats = { solved: 0 };

export type Store = { round: Round };
export const initialStore: Store = { round: newRound() };
