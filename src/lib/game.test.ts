import { describe, expect, it } from 'vitest';

import {
  LEVELS,
  cell,
  dark,
  hidden,
  nap,
  seen,
  tryNap,
  isOpen,
  isSolved,
  moveSun,
  newRound,
  nextSun,
  open,
  SUNS,
  WORLDS,
  quarters,
  solution,
  solve,
  sunsOf,
  tryGate,
  tryWalk,
  useGate,
  walk,
  type Level,
} from './game';

// A small town for the tests:
//
//   . . C        the last cell, top right, under the treasure chest
//   . T .        a pagoda two floors tall in the middle
//   B . .        bamboo on the left
//   N . .        the ninja starts at the bottom left
const TOWN: Level = {
  id: 'test',
  world: 'night',
  width: 3,
  rows: 4,
  things: [
    { kind: 'tower', x: 1, y: 1, height: 2 },
    { kind: 'bamboo', x: 0, y: 2, height: 1 },
  ],
  start: 9,
  chest: 2,
  sun: 'north',
};
// The same town with a stone lantern in the top left, so the moon comes out.
const NIGHT: Level = {
  ...TOWN,
  things: [...TOWN.things, { kind: 'lantern', x: 0, y: 0, height: 1 }],
};
const c = (x: number, y: number) => cell(TOWN, x, y);
const cells = (...xs: number[]) => xs.sort((a, b) => a - b);
const sorted = (s: Set<number>) => [...s].sort((a, b) => a - b);

describe('shadows', () => {
  it('fall away from the sun, as long as each thing is tall', () => {
    // Sun at the top: shadows fall down.
    expect(sorted(dark(TOWN, 'north'))).toEqual(
      cells(c(1, 1), c(1, 2), c(1, 3), c(0, 2), c(0, 3))
    );
    // Sun on the right: shadows fall left, and stop at the edge; and the
    // start is always in the shade.
    expect(sorted(dark(TOWN, 'east'))).toEqual(
      cells(c(1, 1), c(0, 1), c(0, 2), c(0, 3))
    );
  });
});

describe('the sun', () => {
  it('always goes round clockwise, by the moon from right to left', () => {
    expect(quarters('north', 'east')).toBe(1);
    expect(quarters('east', 'west')).toBe(2);
    expect(quarters('east', 'north')).toBe(3);
  });
});

describe('walking', () => {
  it('cannot go into a tower or bamboo', () => {
    expect(open(TOWN, c(1, 1))).toBe(false);
    expect(open(TOWN, c(0, 2))).toBe(false);
    expect(open(TOWN, c(2, 2))).toBe(true);
  });

  it('goes round the walls, through the shadow', () => {
    const r = newRound(TOWN);
    // Sun at the top: the tower's shadow falls down to the bottom row.
    expect(tryWalk(r, c(1, 3))).toEqual({
      path: [c(1, 3)],
      ok: true,
      to: c(1, 3),
    });
    expect(walk(r, c(1, 2)).ninja).toBe(c(1, 2));
  });

  it('steps into the first sunny cell when the sun is in the way', () => {
    const r = { ...newRound(TOWN), ninja: c(2, 2) };
    expect(tryWalk(r, c(2, 0))).toEqual({
      path: [c(2, 1)],
      ok: false,
      to: c(2, 0),
    });
    expect(tryWalk(r, c(1, 1))).toBeNull();
  });

  it('goes back to the start when the sun leaves it in the open', () => {
    const r = { ...newRound(NIGHT), ninja: c(1, 3) };
    expect(moveSun(r, 'east')).toEqual({
      ...r,
      sun: 'east',
      ninja: TOWN.start,
    });
    // Where it is dark by night too, it stays hidden into the night.
    const hid = { ...r, sun: 'east' as const, ninja: c(1, 2) };
    expect(moveSun(hid, 'moon')).toEqual({ ...hid, sun: 'moon' });
  });

  it('at night is hidden everywhere but round the lanterns', () => {
    expect(sorted(dark(NIGHT, 'moon'))).toEqual(
      cells(c(2, 0), c(1, 1), c(2, 1), c(0, 2), c(1, 2), c(2, 2)).concat(
        cells(c(0, 3), c(1, 3), c(2, 3))
      )
    );
  });

  it('is solved at the chest', () => {
    const r = moveSun(moveSun(newRound(NIGHT), 'east'), 'moon');
    expect(r.sun).toBe('moon');
    expect(isSolved(walk(r, c(2, 0)))).toBe(true);
  });
});

describe('the sun', () => {
  it('goes on one step at a time, clockwise, past the bottom with no moon', () => {
    expect(nextSun(NIGHT, 'east')).toBe('moon');
    expect(nextSun(TOWN, 'east')).toBe('west');
    expect(nextSun(TOWN, 'west')).toBe('north');
    const r = newRound(TOWN);
    expect(moveSun(r, 'west')).toBe(r);
  });
});

describe('the moon', () => {
  it('only comes out where there are lanterns', () => {
    expect(sunsOf(TOWN)).toEqual(['north', 'east', 'west']);
    expect(sunsOf(NIGHT)).toEqual(SUNS);
    const r = newRound(TOWN);
    expect(moveSun(r, 'moon')).toBe(r);
  });
});

describe('levels', () => {
  it('open one by one, as each before is won', () => {
    const [a, b, d] = LEVELS.map((l) => l.id);
    expect(isOpen(a, [], a)).toBe(true);
    expect(isOpen(b, [], a)).toBe(false);
    expect(isOpen(b, [a], a)).toBe(true);
    expect(isOpen(d, [a], a)).toBe(false);
  });
});

describe('the start', () => {
  it('is in the shade wherever the sun or the moon is', () => {
    for (const level of [TOWN, ...LEVELS])
      for (const s of SUNS) expect(dark(level, s).has(level.start)).toBe(true);
  });
});

describe('every level', () => {
  for (const level of LEVELS)
    it(`${level.id} can be solved, and the ninja starts in shadow`, () => {
      expect(solve(level)).toBeGreaterThanOrEqual(2);
      expect(dark(level, level.sun).has(level.start)).toBe(true);
    });

  it('gets no easier from one to the next in each world', () => {
    for (const world of WORLDS) {
      const taps = LEVELS.filter((l) => l.world === world).map((l) =>
        solve(l)!
      );
      expect(taps).toEqual([...taps].sort((a, b) => a - b));
    }
  });

  it('needs a walk by the moon, and in longer ones by a sun too', () => {
    for (const level of LEVELS) {
      const way = solution(level)!;
      const walks = new Set(
        way
          .filter((r, i) => r.ninja !== (way[i - 1]?.ninja ?? level.start))
          .map((r) => r.sun)
      );
      expect(walks.has('moon')).toBe(true);
      if (way.length > 3) expect(walks.size).toBeGreaterThanOrEqual(2);
    }
  });
});

// A guard in the middle of a small town, looking up at the chest.
//
//   . C .
//   . . .
//   . G .        looks up: sees the two cells above it
//   . . .
//   N . L        a lantern, so the moon comes out
const GUARDED: Level = {
  id: 'guarded',
  world: 'guards',
  width: 3,
  rows: 5,
  things: [
    { kind: 'guard', x: 1, y: 2, height: 0, facing: 'up' },
    { kind: 'lantern', x: 2, y: 4, height: 1 },
  ],
  start: 12,
  chest: 1,
  sun: 'moon',
};
const g = (x: number, y: number) => cell(GUARDED, x, y);

describe('a guard', () => {
  it('sees the two cells in front of it, day and night', () => {
    expect(sorted(seen(GUARDED))).toEqual(cells(g(1, 1), g(1, 0)));
    const r = newRound(GUARDED);
    expect(hidden(r).has(g(1, 0))).toBe(false);
    expect(hidden(r).has(g(0, 0))).toBe(true);
  });

  it('keeps the ninja out of where it sees', () => {
    expect(walk(newRound(GUARDED), g(1, 0)).ninja).toBe(GUARDED.start);
  });

  it('is put to sleep from behind or the side, and then sees nothing', () => {
    const r = newRound(GUARDED);
    // The nearest cell it doesn't see: right behind it.
    expect(tryNap(r, g(1, 2))).toEqual({
      path: [g(0, 3), g(1, 3)],
      at: g(1, 3),
    });
    const slept = nap(r, g(1, 2));
    expect(slept.asleep).toEqual([g(1, 2)]);
    expect(seen(GUARDED, slept.asleep).size).toBe(0);
    expect(walk(slept, g(1, 0)).ninja).toBe(g(1, 0));
    // Asleep, there is nothing more to do to it.
    expect(tryNap(slept, g(1, 2))).toBeNull();
  });

  it('is never crept up on from the front', () => {
    const front = { ...newRound(GUARDED), ninja: g(0, 1) };
    // From the side: fine, without a step.
    expect(tryNap(front, g(1, 2))?.at).not.toBe(g(1, 1));
  });

  it('in every level with guards has to be put to sleep', () => {
    for (const level of LEVELS.filter((l) => l.world === 'guards'))
      expect(solution(level)!.at(-1)!.asleep?.length).toBeGreaterThan(0);
  });
});

// A gate in a wall of pagodas, and the key to it.
//
//   . C .
//   T D T        a gate between two pagodas
//   . . K        the key on the right
//   N . .
const GATED: Level = {
  id: 'gated',
  world: 'gates',
  width: 3,
  rows: 4,
  things: [
    { kind: 'tower', x: 0, y: 1, height: 2 },
    { kind: 'gate', x: 1, y: 1, height: 1 },
    { kind: 'tower', x: 2, y: 1, height: 2 },
    { kind: 'key', x: 2, y: 2, height: 0 },
  ],
  start: 9,
  chest: 1,
  sun: 'north',
};
const d = (x: number, y: number) => cell(GATED, x, y);

describe('a gate', () => {
  it('is in the way, and casts a shadow like bamboo; the key casts none', () => {
    expect(open(GATED, d(1, 1))).toBe(false);
    expect(open(GATED, d(2, 2))).toBe(true);
    expect(dark(GATED, 'north').has(d(1, 2))).toBe(true);
    expect(dark(GATED, 'east').has(d(1, 2))).toBe(false);
  });

  it('opens only with the key, picked up on the way', () => {
    const r = newRound(GATED);
    expect(tryGate(r, d(1, 1))).toBeNull();
    const got = walk(r, d(2, 2));
    expect(got.got).toBe(true);
    // Going by the key picks it up too.
    expect(walk({ ...r, ninja: d(1, 2) }, d(2, 2)).got).toBe(true);
    expect(walk(r, d(1, 2)).got).toBeUndefined();
    expect(tryGate(got, d(1, 1))).toEqual({ path: [d(1, 2)], at: d(1, 2) });
  });

  it('once open, can be gone through, and casts no more shadow', () => {
    const r = useGate(walk(newRound(GATED), d(2, 2)), d(1, 1));
    expect(r.opened).toBe(true);
    expect(r.ninja).toBe(d(1, 2));
    expect(hidden(r).has(d(1, 2))).toBe(false);
    expect(tryWalk({ ...r, sun: 'east' }, d(1, 1))?.path).toEqual([d(1, 1)]);
  });

  it('can be shut again with the key, and casts its shadow again', () => {
    const r = useGate(walk(newRound(GATED), d(2, 2)), d(1, 1));
    const shut = useGate(r, d(1, 1));
    expect(shut.opened).toBe(false);
    expect(shut.got).toBe(true);
    expect(hidden(shut).has(d(1, 2))).toBe(true);
    expect(open(GATED, d(1, 1))).toBe(false);
  });

  it('in every level with gates has to be opened, and a guard put to sleep', () => {
    for (const level of LEVELS.filter((l) => l.world === 'gates')) {
      const way = solution(level)!;
      const last = way.at(-1)!;
      expect(way.some((r) => r.opened)).toBe(true);
      expect(last.asleep?.length).toBeGreaterThan(0);
      const locked = level.things.filter((t) => t.kind !== 'key');
      expect(solution({ ...level, things: locked })).toBeNull();
    }
  });
});
