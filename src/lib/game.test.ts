import { describe, expect, it } from 'vitest';

import {
  LEVELS,
  blow,
  dark,
  deadEnds,
  hideFrom,
  isSolved,
  levelById,
  moveSun,
  newRound,
  push,
  pushTo,
  solve,
  tap,
  tryWalk,
  walk,
  type Round,
} from './game';

const sorted = (s: Set<number>) => [...s].sort((a, b) => a - b);
const round = (id: string) => newRound(levelById(id)!);
const at = (r: Round, sun: Round['sun']) => ({ ...r, sun });

describe('shadows', () => {
  const r = round('town-1');

  it('are only under things at noon', () => {
    expect(sorted(dark(r))).toEqual([0, 3, 5]);
  });

  it('fall right in the morning, as long as each thing is tall', () => {
    expect(sorted(dark(at(r, 'morning')))).toEqual([0, 1, 3, 4, 5, 6, 7, 8]);
  });

  it('fall left in the evening and stop at the edge', () => {
    expect(sorted(dark(at(r, 'evening')))).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('walking', () => {
  it('goes only through shadow', () => {
    const r = round('town-1');
    expect(walk(r, 3)).toBe(r);
    expect(walk(moveSun(r, 'evening'), 5).ninja).toBe(5);
  });

  it('steps into the first sunny cell when the sun is in the way', () => {
    const r = round('town-1');
    expect(tryWalk(r, 4)).toEqual({ path: [1], ok: false });
    expect(tryWalk(moveSun(r, 'evening'), 4)).toEqual({
      path: [1, 2, 3, 4],
      ok: true,
    });
    expect(tryWalk(r, 0)).toBeNull();
  });

  it('runs back into the shadow when the sun leaves it in the open', () => {
    const r = { ...round('town-1'), sun: 'morning' as const, ninja: 4 };
    expect(moveSun(r, 'noon').ninja).toBe(3);
    expect(moveSun(r, 'evening').ninja).toBe(4);
    expect(hideFrom({ ...r, sun: 'noon' }, 1)).toBe(0);
  });

  it('is solved at the gate', () => {
    let r = moveSun(round('town-1'), 'evening');
    r = walk(r, 5);
    r = moveSun(r, 'morning');
    r = walk(r, 8);
    expect(isSolved(r)).toBe(true);
  });
});

describe('the new things', () => {
  it('a cart rolls a cell away from the ninja', () => {
    let r = { ...round('cart-1'), ninja: 3 };
    expect(pushTo(r, 4)).toBe(5);
    expect(pushTo({ ...r, ninja: 2 }, 4)).toBeNull();
    r = push(r, 4);
    expect(r.things[2].x).toBe(5);
    // Not into the bamboo: it only gives a jolt.
    r = push({ ...r, ninja: 4 }, 5);
    expect(r.things[2].x).toBe(6);
    expect(tap({ ...r, ninja: 5 }, 6)?.type).toBe('stuck');
    // Not into the gate either.
    expect(
      pushTo({ ...r, ninja: 6, things: [{ ...r.things[2], x: 7 }] }, 7)
    ).toBeNull();
  });

  it('the ninja walks up to a cart, never onto it', () => {
    const r = moveSun(round('cart-1'), 'evening');
    const move = tap(r, 4);
    expect(move?.type === 'walk' && move.to).toBe(3);
    expect(move?.next.ninja).toBe(3);
  });

  it('the cloud drifts a cell with every move and turns at the end', () => {
    let r = round('cloud-1');
    const xs = [];
    for (let i = 0; i < 5; i++) {
      r = moveSun(r, r.sun === 'morning' ? 'evening' : 'morning');
      xs.push(r.cloud!.x);
    }
    expect(xs).toEqual([4, 5, 6, 5, 4]);
  });

  it('the cloud stays put once the ninja is through the gate', () => {
    let r = moveSun(round('cloud-1'), 'morning');
    r = walk(r, 5);
    const x = r.cloud!.x;
    r = walk(r, 8);
    expect(isSolved(r)).toBe(true);
    expect(r.cloud!.x).toBe(x);
    expect(dark(r).has(4) && dark(r).has(5)).toBe(true);
  });

  it('at night only the lanterns light the street, and blow out', () => {
    let r = round('night-1');
    expect(sorted(dark(r))).toEqual([0, 1, 8]);
    expect(tap(r, 3)?.type).toBe('walk');
    r = walk(r, 1);
    expect(tap(r, 3)?.type).toBe('blow');
    r = blow(r, 3);
    expect(sorted(dark(r))).toEqual([0, 1, 2, 3, 4, 8]);
  });
});

describe('every level', () => {
  for (const level of LEVELS)
    it(`${level.id} can be solved, and never gets stuck`, () => {
      expect(solve(level)).toBeGreaterThan(1);
      expect(deadEnds(level)).toBe(0);
    });

  it('the first takes four taps', () => {
    expect(solve(LEVELS[0])).toBe(4);
  });
});
