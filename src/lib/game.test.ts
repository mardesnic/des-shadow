import { describe, expect, it } from 'vitest';

import {
  LEVELS,
  cell,
  dark,
  hideFrom,
  isSolved,
  moveSun,
  newRound,
  open,
  solution,
  solve,
  tryWalk,
  walk,
  type Level,
} from './game';

// A small town for the tests:
//
//   . . G        the gate over the top right cell
//   . T .        a tower two cells tall in the middle
//   B . r        bamboo on the left, a cherry tree on the right
//   N . .        the ninja starts at the bottom left
const TOWN: Level = {
  id: 'test',
  world: 'town',
  width: 3,
  rows: 4,
  things: [
    { kind: 'tower', x: 1, y: 1, height: 2 },
    { kind: 'bamboo', x: 0, y: 2, height: 1 },
    { kind: 'tree', x: 2, y: 2, height: 2 },
  ],
  start: 9,
  gate: 2,
  sun: 'north',
};
const c = (x: number, y: number) => cell(TOWN, x, y);
const cells = (...xs: number[]) => xs.sort((a, b) => a - b);
const sorted = (s: Set<number>) => [...s].sort((a, b) => a - b);

describe('shadows', () => {
  it('fall away from the sun, as long as each thing is tall', () => {
    // Sun at the top: shadows fall down.
    expect(sorted(dark(TOWN, 'north'))).toEqual(
      cells(c(1, 1), c(1, 2), c(1, 3), c(0, 2), c(0, 3), c(2, 2), c(2, 3))
    );
    // Sun on the right: shadows fall left, and stop at the edge.
    expect(sorted(dark(TOWN, 'east'))).toEqual(
      cells(c(1, 1), c(0, 1), c(0, 2), c(2, 2), c(1, 2))
    );
  });
});

describe('walking', () => {
  it('cannot go into a tower or bamboo, but can go under a tree', () => {
    expect(open(TOWN, c(1, 1))).toBe(false);
    expect(open(TOWN, c(0, 2))).toBe(false);
    expect(open(TOWN, c(2, 2))).toBe(true);
  });

  it('goes round the walls, through the shadow', () => {
    const r = newRound(TOWN);
    // Sun at the top: the bottom row is all in shadow.
    expect(tryWalk(r, c(2, 3))).toEqual({ path: [c(1, 3), c(2, 3)], ok: true });
    expect(walk(r, c(2, 2)).ninja).toBe(c(2, 2));
  });

  it('steps into the first sunny cell when the sun is in the way', () => {
    const r = { ...newRound(TOWN), ninja: c(2, 2) };
    expect(tryWalk(r, c(2, 0))).toEqual({ path: [c(2, 1)], ok: false });
    expect(tryWalk(r, c(1, 1))).toBeNull();
  });

  it('runs into the nearest shadow when the sun leaves it in the open', () => {
    const r = { ...newRound(TOWN), ninja: c(1, 3) };
    expect(moveSun(r, 'east').ninja).toBe(c(1, 2));
    expect(hideFrom(TOWN, 'north', c(1, 3))).toBe(c(1, 3));
  });

  it('is solved at the gate', () => {
    let r = walk(newRound(TOWN), c(2, 2));
    r = moveSun(r, 'south');
    expect(isSolved(walk(r, c(2, 0)))).toBe(true);
  });
});

describe('every level', () => {
  for (const level of LEVELS)
    it(`${level.id} can be solved, and the ninja starts in shadow`, () => {
      expect(solve(level)).toBeGreaterThan(3);
      expect(dark(level, level.sun).has(level.start)).toBe(true);
    });

  it('the first needs the sun on every side', () => {
    const suns = new Set(solution(LEVELS[0])!.map((r) => r.sun));
    expect(suns.size).toBe(4);
  });
});
