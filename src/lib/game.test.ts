import { describe, expect, it } from 'vitest';

import {
  FIRST,
  hideFrom,
  isSolved,
  moveSun,
  newRound,
  pathTo,
  shade,
  solve,
  tryWalk,
  walk,
} from './game';

const sorted = (s: Set<number>) => [...s].sort((a, b) => a - b);

describe('shade', () => {
  it('is only under things at noon', () => {
    expect(sorted(shade(FIRST, 'noon'))).toEqual([0, 3, 5]);
  });

  it('falls right in the morning, as long as each thing is tall', () => {
    expect(sorted(shade(FIRST, 'morning'))).toEqual([0, 1, 3, 4, 5, 6, 7, 8]);
  });

  it('falls left in the evening and stops at the edge', () => {
    expect(sorted(shade(FIRST, 'evening'))).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('walking', () => {
  it('goes only through shadow', () => {
    const r = newRound();
    expect(pathTo(r, 3)).toBeNull();
    expect(walk(r, 3)).toBe(r);
    const evening = moveSun(r, 'evening');
    expect(pathTo(evening, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(walk(evening, 5).ninja).toBe(5);
  });

  it('steps into the first sunny cell when the sun is in the way', () => {
    const r = newRound();
    expect(tryWalk(r, 4)).toEqual({ path: [1], ok: false });
    expect(tryWalk(moveSun(r, 'evening'), 4)).toEqual({
      path: [1, 2, 3, 4],
      ok: true,
    });
    expect(tryWalk(r, 0)).toBeNull();
  });

  it('runs back into the shadow when the sun leaves it in the open', () => {
    const r = { ...newRound(), sun: 'morning' as const, ninja: 4 };
    expect(moveSun(r, 'noon').ninja).toBe(3);
    expect(moveSun(r, 'evening').ninja).toBe(4);
    expect(hideFrom(FIRST, 'noon', 1)).toBe(0);
    // Nothing that way: the other way, then.
    expect(hideFrom({ ...FIRST, things: [FIRST.things[2]] }, 'noon', 2)).toBe(
      5
    );
  });

  it('is solved at the gate', () => {
    let r = moveSun(newRound(), 'evening');
    r = walk(r, 5);
    r = moveSun(r, 'morning');
    r = walk(r, 8);
    expect(isSolved(r)).toBe(true);
  });
});

describe('the first level', () => {
  it('can be solved in four taps', () => {
    expect(solve(FIRST)).toBe(4);
  });
});
