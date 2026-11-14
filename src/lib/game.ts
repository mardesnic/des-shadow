// A little town seen from above, a bit from the front. The sun stands on
// one of the four sides, and every tower and bamboo clump casts a shadow
// on the street away from it, as many cells long as the thing is tall: one
// for bamboo, two or three for a pagoda, by its floors. The little ninja
// may only stand and walk in the shadow: the child moves the sun to move
// the shadows, and walks the ninja through them, round the towers and
// bamboo, to the treasure chest.
//
// At the bottom there is the moon instead of a sun: then it is night, dark
// everywhere but round the stone lanterns, which light up.
//
// In the later towns there are guards, each with a lamp, looking one way:
// they see the two cells in front of them, day and night, but not behind
// them. The ninja sneaks up on a guard from behind or the side and puts it
// to sleep, and then it sees nothing.
//
// Last there are wooden gates, locked, and a key somewhere in the town. A
// gate is in the way and casts a shadow like bamboo; once the ninja has the
// key, it can open the gate and go through, but then the gate's shadow is
// gone too: if that leaves the ninja in the light, it is seen and runs
// back to the start.

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

export type Kind = 'tower' | 'bamboo' | 'lantern' | 'guard' | 'gate' | 'key';

// Towers, bamboo, stone lanterns, guards and locked gates are all in the
// way; a key lies on the street, to be picked up.
export const SOLID: Record<Kind, boolean> = {
  tower: true,
  bamboo: true,
  lantern: true,
  guard: true,
  gate: true,
  key: false,
};

// Which way a guard looks, and how far it sees.
export type Facing = 'up' | 'right' | 'down' | 'left';
export const LOOK: Record<Facing, [number, number]> = {
  up: [0, -1],
  right: [1, 0],
  down: [0, 1],
  left: [-1, 0],
};
export const SIGHT = 2;

export type Thing = {
  kind: Kind;
  x: number;
  y: number;
  // How tall it is, in cells: its shadow is just as long. A guard's and a
  // key's is 0: they cast none.
  height: number;
  // Which way a guard looks.
  facing?: Facing;
};

// The worlds, each shown by a picture: the night in town, with the moon and
// the lanterns; then the guards; then the gates. Last comes the castle, one
// level with all of it, where the guard is a wizard who has turned the
// ninja's four friends into gems and locked them in a gold chest.
export type World = 'night' | 'guards' | 'gates' | 'castle';
export const WORLDS: readonly World[] = ['night', 'guards', 'gates', 'castle'];

export type Level = {
  id: string;
  world: World;
  width: number;
  rows: number;
  things: Thing[];
  // Where the ninja starts, as a cell: under a little shelter, so always in
  // the shade.
  start: number;
  // The column of the last cell, in the top row, with the treasure chest
  // over it, beyond the town.
  chest: number;
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
  // The cells of the guards put to sleep, in order.
  asleep?: number[];
  // Whether the ninja has picked up the key, and opened the gate with it.
  got?: boolean;
  opened?: boolean;
};

// The town as it is in a round: without the key once it is picked up, and
// without the gate once it is open.
export const town = (r: Round): Level =>
  r.got || r.opened
    ? {
        ...r.level,
        things: r.level.things.filter(
          (t) =>
            !(t.kind === 'key' && r.got) && !(t.kind === 'gate' && r.opened)
        ),
      }
    : r.level;

// The levels, picked from towns found by scripts/find-levels.ts, and
// checked by the solver in the tests. All by night, with lanterns. Their
// ids are kept from earlier lists, in order, so saved games keep how far
// they got.
export const LEVELS: Level[] = [
  {
    id: 'pagoda-1',
    world: 'night',
    width: 4,
    rows: 5,
    things: [
      { kind: 'tower', x: 3, y: 0, height: 2 },
      { kind: 'lantern', x: 3, y: 1, height: 1 },
      { kind: 'tower', x: 0, y: 2, height: 3 },
      { kind: 'tower', x: 0, y: 4, height: 3 },
      { kind: 'tower', x: 2, y: 4, height: 2 },
    ],
    start: 19,
    chest: 1,
    sun: 'east',
  },
  {
    id: 'pagoda-3',
    world: 'night',
    width: 4,
    rows: 5,
    things: [
      { kind: 'tower', x: 0, y: 1, height: 2 },
      { kind: 'lantern', x: 3, y: 1, height: 1 },
      { kind: 'bamboo', x: 2, y: 2, height: 1 },
      { kind: 'lantern', x: 0, y: 3, height: 1 },
      { kind: 'tower', x: 3, y: 3, height: 2 },
    ],
    start: 18,
    chest: 1,
    sun: 'east',
  },
  {
    id: 'pagoda-5',
    world: 'night',
    width: 5,
    rows: 6,
    things: [
      { kind: 'tower', x: 1, y: 2, height: 2 },
      { kind: 'tower', x: 2, y: 2, height: 2 },
      { kind: 'tower', x: 3, y: 3, height: 3 },
      { kind: 'tower', x: 4, y: 3, height: 2 },
      { kind: 'lantern', x: 0, y: 4, height: 1 },
      { kind: 'tower', x: 3, y: 4, height: 2 },
      { kind: 'tower', x: 1, y: 5, height: 3 },
    ],
    start: 27,
    chest: 0,
    sun: 'north',
  },
  {
    id: 'night-1',
    world: 'night',
    width: 5,
    rows: 6,
    things: [
      { kind: 'bamboo', x: 0, y: 0, height: 1 },
      { kind: 'lantern', x: 1, y: 0, height: 1 },
      { kind: 'tower', x: 4, y: 0, height: 3 },
      { kind: 'tower', x: 0, y: 1, height: 3 },
      { kind: 'lantern', x: 4, y: 1, height: 1 },
      { kind: 'tower', x: 3, y: 4, height: 2 },
      { kind: 'tower', x: 1, y: 5, height: 2 },
    ],
    start: 29,
    chest: 2,
    sun: 'north',
  },
  {
    id: 'night-3',
    world: 'night',
    width: 5,
    rows: 7,
    things: [
      { kind: 'tower', x: 1, y: 0, height: 3 },
      { kind: 'lantern', x: 4, y: 0, height: 1 },
      { kind: 'bamboo', x: 0, y: 1, height: 1 },
      { kind: 'tower', x: 1, y: 1, height: 2 },
      { kind: 'tower', x: 2, y: 1, height: 3 },
      { kind: 'tower', x: 4, y: 2, height: 3 },
    ],
    start: 30,
    chest: 3,
    sun: 'west',
  },
  {
    id: 'town-1',
    world: 'night',
    width: 6,
    rows: 7,
    things: [
      { kind: 'bamboo', x: 0, y: 1, height: 1 },
      { kind: 'tower', x: 3, y: 2, height: 2 },
      { kind: 'lantern', x: 0, y: 3, height: 1 },
      { kind: 'tower', x: 2, y: 3, height: 2 },
      { kind: 'tower', x: 3, y: 4, height: 3 },
      { kind: 'tower', x: 1, y: 5, height: 2 },
      { kind: 'tower', x: 4, y: 5, height: 2 },
      { kind: 'bamboo', x: 5, y: 6, height: 1 },
    ],
    start: 37,
    chest: 5,
    sun: 'moon',
  },
  {
    id: 'night-6',
    world: 'night',
    width: 6,
    rows: 8,
    things: [
      { kind: 'tower', x: 3, y: 1, height: 2 },
      { kind: 'tower', x: 4, y: 1, height: 3 },
      { kind: 'tower', x: 5, y: 3, height: 2 },
      { kind: 'lantern', x: 1, y: 4, height: 1 },
      { kind: 'lantern', x: 4, y: 5, height: 1 },
      { kind: 'tower', x: 3, y: 6, height: 3 },
      { kind: 'bamboo', x: 4, y: 6, height: 1 },
    ],
    start: 44,
    chest: 1,
    sun: 'moon',
  },
  {
    id: 'night-8',
    world: 'night',
    width: 6,
    rows: 8,
    things: [
      { kind: 'tower', x: 1, y: 1, height: 3 },
      { kind: 'tower', x: 3, y: 1, height: 2 },
      { kind: 'lantern', x: 3, y: 2, height: 1 },
      { kind: 'tower', x: 4, y: 2, height: 3 },
      { kind: 'tower', x: 0, y: 3, height: 3 },
      { kind: 'tower', x: 1, y: 3, height: 2 },
      { kind: 'tower', x: 5, y: 3, height: 3 },
      { kind: 'bamboo', x: 4, y: 4, height: 1 },
    ],
    start: 47,
    chest: 4,
    sun: 'east',
  },
  {
    id: 'night-11',
    world: 'night',
    width: 6,
    rows: 8,
    things: [
      { kind: 'tower', x: 4, y: 2, height: 2 },
      { kind: 'bamboo', x: 1, y: 3, height: 1 },
      { kind: 'lantern', x: 2, y: 3, height: 1 },
      { kind: 'tower', x: 5, y: 3, height: 3 },
      { kind: 'tower', x: 1, y: 5, height: 2 },
      { kind: 'tower', x: 2, y: 5, height: 2 },
      { kind: 'lantern', x: 2, y: 6, height: 1 },
      { kind: 'tower', x: 4, y: 6, height: 2 },
    ],
    start: 46,
    chest: 5,
    sun: 'north',
  },
  {
    id: 'night-12',
    world: 'night',
    width: 6,
    rows: 8,
    things: [
      { kind: 'tower', x: 2, y: 0, height: 3 },
      { kind: 'tower', x: 5, y: 1, height: 3 },
      { kind: 'bamboo', x: 1, y: 2, height: 1 },
      { kind: 'lantern', x: 3, y: 2, height: 1 },
      { kind: 'tower', x: 1, y: 3, height: 3 },
      { kind: 'tower', x: 5, y: 3, height: 3 },
      { kind: 'lantern', x: 1, y: 4, height: 1 },
      { kind: 'tower', x: 1, y: 5, height: 2 },
      { kind: 'tower', x: 3, y: 5, height: 3 },
      { kind: 'bamboo', x: 0, y: 6, height: 1 },
    ],
    start: 46,
    chest: 3,
    sun: 'west',
  },
  // The first guard, in front of the chest, looking at it.
  {
    id: 'guard-1',
    world: 'guards',
    width: 5,
    rows: 6,
    things: [
      { kind: 'lantern', x: 2, y: 0, height: 1 },
      { kind: 'tower', x: 0, y: 1, height: 3 },
      { kind: 'tower', x: 1, y: 1, height: 2 },
      { kind: 'guard', x: 3, y: 2, height: 0, facing: 'up' },
      { kind: 'bamboo', x: 0, y: 3, height: 1 },
      { kind: 'tower', x: 1, y: 5, height: 3 },
    ],
    start: 25,
    chest: 3,
    sun: 'north',
  },
  {
    id: 'guard-2',
    world: 'guards',
    width: 5,
    rows: 6,
    things: [
      { kind: 'guard', x: 2, y: 0, height: 0, facing: 'left' },
      { kind: 'tower', x: 2, y: 1, height: 2 },
      { kind: 'bamboo', x: 1, y: 2, height: 1 },
      { kind: 'lantern', x: 1, y: 3, height: 1 },
      { kind: 'tower', x: 2, y: 3, height: 2 },
      { kind: 'tower', x: 1, y: 4, height: 2 },
      { kind: 'tower', x: 4, y: 4, height: 3 },
    ],
    start: 25,
    chest: 1,
    sun: 'moon',
  },
  {
    id: 'guard-3',
    world: 'guards',
    width: 5,
    rows: 7,
    things: [
      { kind: 'lantern', x: 1, y: 0, height: 1 },
      { kind: 'tower', x: 2, y: 0, height: 2 },
      { kind: 'tower', x: 3, y: 1, height: 2 },
      { kind: 'bamboo', x: 0, y: 2, height: 1 },
      { kind: 'tower', x: 3, y: 2, height: 3 },
      { kind: 'tower', x: 3, y: 3, height: 3 },
      { kind: 'lantern', x: 2, y: 4, height: 1 },
      { kind: 'tower', x: 0, y: 5, height: 2 },
      { kind: 'guard', x: 3, y: 5, height: 0, facing: 'down' },
    ],
    start: 31,
    chest: 4,
    sun: 'north',
  },
  {
    id: 'guard-4',
    world: 'guards',
    width: 6,
    rows: 7,
    things: [
      { kind: 'tower', x: 4, y: 1, height: 2 },
      { kind: 'guard', x: 5, y: 1, height: 0, facing: 'up' },
      { kind: 'tower', x: 0, y: 2, height: 3 },
      { kind: 'bamboo', x: 1, y: 2, height: 1 },
      { kind: 'tower', x: 2, y: 2, height: 3 },
      { kind: 'lantern', x: 5, y: 3, height: 1 },
      { kind: 'tower', x: 0, y: 4, height: 2 },
    ],
    start: 39,
    chest: 5,
    sun: 'north',
  },
  {
    id: 'guard-5',
    world: 'guards',
    width: 6,
    rows: 8,
    things: [
      { kind: 'tower', x: 1, y: 2, height: 2 },
      { kind: 'tower', x: 2, y: 2, height: 3 },
      { kind: 'tower', x: 5, y: 2, height: 3 },
      { kind: 'guard', x: 4, y: 3, height: 0, facing: 'left' },
      { kind: 'bamboo', x: 3, y: 4, height: 1 },
      { kind: 'tower', x: 0, y: 5, height: 3 },
      { kind: 'lantern', x: 1, y: 5, height: 1 },
      { kind: 'tower', x: 4, y: 6, height: 3 },
    ],
    start: 46,
    chest: 5,
    sun: 'north',
  },
  {
    id: 'guard-6',
    world: 'guards',
    width: 6,
    rows: 8,
    things: [
      { kind: 'tower', x: 4, y: 0, height: 2 },
      { kind: 'tower', x: 1, y: 2, height: 3 },
      { kind: 'guard', x: 2, y: 2, height: 0, facing: 'right' },
      { kind: 'lantern', x: 1, y: 3, height: 1 },
      { kind: 'tower', x: 4, y: 3, height: 2 },
      { kind: 'tower', x: 5, y: 4, height: 3 },
      { kind: 'tower', x: 3, y: 5, height: 3 },
      { kind: 'lantern', x: 5, y: 6, height: 1 },
      { kind: 'bamboo', x: 0, y: 7, height: 1 },
      { kind: 'bamboo', x: 1, y: 7, height: 1 },
    ],
    start: 45,
    chest: 0,
    sun: 'west',
  },
  {
    id: 'guard-7',
    world: 'guards',
    width: 6,
    rows: 8,
    things: [
      { kind: 'bamboo', x: 2, y: 1, height: 1 },
      { kind: 'lantern', x: 0, y: 2, height: 1 },
      { kind: 'tower', x: 3, y: 2, height: 2 },
      { kind: 'guard', x: 5, y: 2, height: 0, facing: 'up' },
      { kind: 'tower', x: 4, y: 3, height: 3 },
      { kind: 'tower', x: 1, y: 4, height: 2 },
      { kind: 'bamboo', x: 1, y: 5, height: 1 },
      { kind: 'tower', x: 3, y: 6, height: 2 },
      { kind: 'tower', x: 5, y: 6, height: 2 },
    ],
    start: 43,
    chest: 5,
    sun: 'west',
  },
  {
    id: 'gate-1',
    world: 'gates',
    width: 5,
    rows: 6,
    things: [
      { kind: 'tower', x: 0, y: 0, height: 2 },
      { kind: 'bamboo', x: 2, y: 0, height: 1 },
      { kind: 'lantern', x: 4, y: 0, height: 1 },
      { kind: 'tower', x: 2, y: 1, height: 2 },
      { kind: 'tower', x: 1, y: 3, height: 3 },
      { kind: 'gate', x: 2, y: 3, height: 1 },
      { kind: 'tower', x: 3, y: 3, height: 3 },
      { kind: 'guard', x: 4, y: 3, height: 0, facing: 'up' },
      { kind: 'tower', x: 0, y: 4, height: 3 },
      { kind: 'key', x: 4, y: 4, height: 0 },
    ],
    start: 27,
    chest: 3,
    sun: 'north',
  },
  {
    id: 'gate-2',
    world: 'gates',
    width: 5,
    rows: 7,
    things: [
      { kind: 'bamboo', x: 3, y: 0, height: 1 },
      { kind: 'guard', x: 0, y: 1, height: 0, facing: 'right' },
      { kind: 'key', x: 2, y: 1, height: 0 },
      { kind: 'gate', x: 3, y: 1, height: 1 },
      { kind: 'tower', x: 4, y: 2, height: 2 },
      { kind: 'bamboo', x: 2, y: 3, height: 1 },
      { kind: 'lantern', x: 0, y: 4, height: 1 },
      { kind: 'tower', x: 3, y: 4, height: 3 },
      { kind: 'tower', x: 4, y: 5, height: 3 },
    ],
    start: 33,
    chest: 4,
    sun: 'west',
  },
  {
    id: 'gate-3',
    world: 'gates',
    width: 6,
    rows: 7,
    things: [
      { kind: 'tower', x: 2, y: 0, height: 3 },
      { kind: 'key', x: 4, y: 0, height: 0 },
      { kind: 'gate', x: 1, y: 1, height: 1 },
      { kind: 'tower', x: 0, y: 2, height: 3 },
      { kind: 'lantern', x: 1, y: 3, height: 1 },
      { kind: 'tower', x: 4, y: 3, height: 2 },
      { kind: 'guard', x: 2, y: 4, height: 0, facing: 'down' },
      { kind: 'bamboo', x: 1, y: 6, height: 1 },
      { kind: 'tower', x: 3, y: 6, height: 3 },
      { kind: 'tower', x: 5, y: 6, height: 2 },
    ],
    start: 36,
    chest: 0,
    sun: 'east',
  },
  {
    id: 'gate-4',
    world: 'gates',
    width: 6,
    rows: 7,
    things: [
      { kind: 'tower', x: 0, y: 1, height: 3 },
      { kind: 'guard', x: 1, y: 1, height: 0, facing: 'down' },
      { kind: 'key', x: 2, y: 1, height: 0 },
      { kind: 'lantern', x: 4, y: 1, height: 1 },
      { kind: 'gate', x: 2, y: 2, height: 1 },
      { kind: 'bamboo', x: 5, y: 3, height: 1 },
      { kind: 'tower', x: 0, y: 6, height: 2 },
    ],
    start: 38,
    chest: 3,
    sun: 'north',
  },
  {
    id: 'gate-5',
    world: 'gates',
    width: 6,
    rows: 8,
    things: [
      { kind: 'bamboo', x: 4, y: 1, height: 1 },
      { kind: 'tower', x: 5, y: 1, height: 3 },
      { kind: 'tower', x: 0, y: 2, height: 2 },
      { kind: 'guard', x: 1, y: 2, height: 0, facing: 'right' },
      { kind: 'bamboo', x: 3, y: 2, height: 1 },
      { kind: 'gate', x: 1, y: 3, height: 1 },
      { kind: 'lantern', x: 0, y: 4, height: 1 },
      { kind: 'key', x: 1, y: 4, height: 0 },
      { kind: 'tower', x: 0, y: 5, height: 2 },
      { kind: 'tower', x: 3, y: 5, height: 3 },
      { kind: 'tower', x: 4, y: 6, height: 3 },
      { kind: 'tower', x: 1, y: 7, height: 2 },
    ],
    start: 45,
    chest: 2,
    sun: 'north',
  },
  {
    id: 'gate-7',
    world: 'gates',
    width: 6,
    rows: 8,
    things: [
      { kind: 'tower', x: 1, y: 2, height: 2 },
      { kind: 'tower', x: 2, y: 2, height: 3 },
      { kind: 'tower', x: 2, y: 3, height: 3 },
      { kind: 'bamboo', x: 4, y: 3, height: 1 },
      { kind: 'lantern', x: 2, y: 4, height: 1 },
      { kind: 'key', x: 3, y: 4, height: 0 },
      { kind: 'gate', x: 5, y: 4, height: 1 },
      { kind: 'tower', x: 0, y: 5, height: 3 },
      { kind: 'guard', x: 2, y: 5, height: 0, facing: 'right' },
      { kind: 'tower', x: 3, y: 7, height: 2 },
    ],
    start: 44,
    chest: 3,
    sun: 'west',
  },
  // The castle, the very end: the guard is a wizard, and in the gold chest
  // are the ninja's friends, turned into gems.
  {
    id: 'castle',
    world: 'castle',
    width: 6,
    rows: 8,
    things: [
      { kind: 'gate', x: 2, y: 0, height: 1 },
      { kind: 'guard', x: 3, y: 1, height: 0, facing: 'right' },
      { kind: 'tower', x: 5, y: 1, height: 3 },
      { kind: 'bamboo', x: 0, y: 2, height: 1 },
      { kind: 'lantern', x: 2, y: 2, height: 1 },
      { kind: 'tower', x: 1, y: 3, height: 3 },
      { kind: 'tower', x: 4, y: 3, height: 3 },
      { kind: 'tower', x: 1, y: 5, height: 3 },
      { kind: 'tower', x: 0, y: 6, height: 3 },
      { kind: 'key', x: 1, y: 7, height: 0 },
    ],
    start: 44,
    chest: 0,
    sun: 'west',
  },
];

export const levelById = (id: string) => LEVELS.find((l) => l.id === id);

// The level after this one; after the last, the first.
export function nextLevel(id: string): Level {
  const at = LEVELS.findIndex((l) => l.id === id);
  return LEVELS[(at + 1) % LEVELS.length];
}

export const chestCell = (level: Level) => cell(level, level.chest, 0);

// Where the ninja's friends stand at the end of the castle, on the wall
// over the top row: the four columns nearest the chest with nothing in the
// way there, from left to right.
export function friendSpots(level: Level): number[] {
  return Array.from({ length: level.width }, (_, x) => x)
    .filter(
      (x) =>
        x !== level.chest &&
        !level.things.some((t) => t.y === 0 && t.x === x && t.height > 0)
    )
    .sort(
      (a, b) => Math.abs(a - level.chest) - Math.abs(b - level.chest) || a - b
    )
    .slice(0, 4)
    .sort((a, b) => a - b);
}

// Where the sun can be: the moon only comes out where there are lanterns,
// or the night would hide the ninja everywhere.
export const sunsOf = (level: Level): readonly Sun[] =>
  level.things.some((t) => t.kind === 'lantern')
    ? SUNS
    : SUNS.filter((s) => s !== 'moon');

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
  // Under the shelter at the start it is always shady.
  const cells = new Set([level.start]);
  if (sun === 'moon') {
    const light = lit(level);
    for (let c = 0; c < level.width * level.rows; c++)
      if (!light.has(c)) cells.add(c);
    return cells;
  }
  const [dx, dy] = FALL[sun];
  for (const t of level.things)
    for (let i = t.kind === 'key' ? 1 : 0; i <= t.height; i++) {
      const x = t.x + dx * i;
      const y = t.y + dy * i;
      if (x >= 0 && x < level.width && y >= 0 && y < level.rows)
        cells.add(cell(level, x, y));
    }
  return cells;
}

// The cells the guards that are awake see: up to SIGHT cells in front of
// each, as far as the first thing in the way.
export function seen(level: Level, asleep: readonly number[] = []) {
  const cells = new Set<number>();
  for (const t of level.things) {
    if (t.kind !== 'guard' || asleep.includes(cell(level, t.x, t.y))) continue;
    const [dx, dy] = LOOK[t.facing ?? 'down'];
    for (let i = 1; i <= SIGHT; i++) {
      const x = t.x + dx * i;
      const y = t.y + dy * i;
      if (x < 0 || x >= level.width || y < 0 || y >= level.rows) break;
      const c = cell(level, x, y);
      if (!open(level, c)) break;
      cells.add(c);
    }
  }
  return cells;
}

// Where the ninja is hidden in a round: in the dark, and out of the sight
// of the guards that are awake.
export function hidden(r: Round, sun: Sun = r.sun) {
  const here = town(r);
  const cells = dark(here, sun);
  for (const c of seen(here, r.asleep)) cells.delete(c);
  return cells;
}

export const isGuard = (level: Level, c: number) =>
  thingAt(level, c)?.kind === 'guard';
export const isGate = (level: Level, c: number) =>
  thingAt(level, c)?.kind === 'gate';
const keyCell = (level: Level) => {
  const k = level.things.find((t) => t.kind === 'key');
  return k ? cell(level, k.x, k.y) : -1;
};

// The ninja gets to a cell along a path, and picks up the key if it goes
// by it.
const arrive = (r: Round, path: number[], at: number): Round => ({
  ...r,
  ninja: at,
  ...(!r.got && path.includes(keyCell(r.level)) ? { got: true } : {}),
});

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

// Won once the ninja is on the last cell, under the chest.
export const isSolved = (r: Round) => r.ninja === chestCell(r.level);

// Where the ninja goes when the child taps a cell: the shortest way through
// the shadow to it, or, when there is none, the shortest way round the
// towers, up to the first sunny cell, where the ninja is seen and
// runs back to the start. `path` ends at that sunny cell, and `to` is
// where it was going. Null when there is nowhere to go.
export function tryWalk(
  r: Round,
  to: number
): { path: number[]; ok: boolean; to: number } | null {
  const level = town(r);
  if (to === r.ninja || !open(level, to)) return null;
  const shade = hidden(r);
  const safe = route(level, r.ninja, to, (c) => open(level, c) && shade.has(c));
  if (safe) return { path: safe, ok: true, to };
  const any = route(level, r.ninja, to, (c) => open(level, c));
  if (!any) return null;
  const stop = any.findIndex((c) => !shade.has(c));
  return { path: any.slice(0, stop + 1), ok: false, to };
}

export function walk(r: Round, to: number): Round {
  const w = tryWalk(r, to);
  return w?.ok ? arrive(r, w.path, w.to) : r;
}

// The shortest way through the shadow to a cell next to a thing, out of
// sight; null if there is none.
function nextTo(r: Round, thing: number) {
  const level = town(r);
  const shade = hidden(r);
  let best: { path: number[]; at: number } | null = null;
  for (const n of neighbours(level, thing)) {
    // Not the chest: that is only got to on foot. Where the ninja is
    // already, even out in the light, it needn't go.
    if (!open(level, n) || n === chestCell(level)) continue;
    if (n !== r.ninja && !shade.has(n)) continue;
    const path =
      n === r.ninja
        ? []
        : route(level, r.ninja, n, (c) => open(level, c) && shade.has(c));
    if (path && (!best || path.length < best.path.length))
      best = { path, at: n };
  }
  return best;
}

// Where the ninja goes when the child taps a guard: the shortest way
// through the shadow to a cell next to it that it doesn't see, behind or
// beside it, from where it puts it to sleep. `path` ends there. Null when
// the guard is asleep already, or there is no such way.
export function tryNap(
  r: Round,
  guard: number
): { path: number[]; at: number } | null {
  if (!isGuard(r.level, guard) || r.asleep?.includes(guard)) return null;
  return nextTo(r, guard);
}

export function nap(r: Round, guard: number): Round {
  const n = tryNap(r, guard);
  return n
    ? {
        ...arrive(r, n.path, n.at),
        asleep: [...(r.asleep ?? []), guard].sort((a, b) => a - b),
      }
    : r;
}

// Whether a tap on the gate opens it: while it is shut. Once open, the
// ninja just walks in.
export const usesGate = (r: Round, c: number) =>
  isGate(r.level, c) && !r.opened;

// Where the ninja goes when the child taps the gate: with the key, the
// shortest way through the shadow to a cell next to it, from where it
// opens it. Null without the key, once it is open, or with no such way.
export function tryGate(
  r: Round,
  gate: number
): { path: number[]; at: number } | null {
  if (!usesGate(r, gate) || !r.got) return null;
  return nextTo(r, gate);
}

// Opening the gate takes its shadow away, and may let a guard see past it:
// left out in the light, the ninja is seen and runs back to the start.
export function openGate(r: Round, gate: number): Round {
  const n = tryGate(r, gate);
  if (!n) return r;
  const next = { ...arrive(r, n.path, n.at), opened: true };
  return hidden(next).has(next.ninja)
    ? next
    : { ...next, ninja: r.level.start };
}

// The way the ninja runs back to the start when it is seen, round the
// walls, sun or not.
export const runWay = (level: Level, from: number, to: number) =>
  route(level, from, to, (c) => open(level, c)) ?? [to];

// The only side the sun can go to next: one step on, clockwise, past the
// bottom where there is no moon.
export function nextSun(level: Level, sun: Sun): Sun {
  const suns = sunsOf(level);
  return suns[(suns.indexOf(sun) + 1) % suns.length];
}

// Whether the ninja is seen, out in the light, as the sun goes round to a new side:
// after how many quarters, or null if never. Every side the sun goes by on
// the way counts, not only the one it stops at; only where there is no
// moon, the sun going by the bottom lights nothing.
export function seenAfter(r: Round, to: Sun): number | null {
  const suns = sunsOf(r.level);
  const q = quarters(r.sun, to);
  for (let k = 1; k <= q; k++) {
    const s = SUNS[(SUNS.indexOf(r.sun) + k) % SUNS.length];
    if (suns.includes(s) && !hidden(r, s).has(r.ninja)) return k;
  }
  return null;
}

// The sun moves. If on the way it leaves the ninja in the light, the
// ninja is seen and runs back to the start, under the shelter.
export function moveSun(r: Round, sun: Sun): Round {
  if (sun !== nextSun(r.level, r.sun)) return r;
  return {
    ...r,
    sun,
    ninja: seenAfter(r, sun) === null ? r.ninja : r.level.start,
  };
}

// Every round one tap away.
function moves(r: Round): Round[] {
  const { level } = r;
  const all = [
    moveSun(r, nextSun(level, r.sun)),
    ...Array.from({ length: level.width * level.rows }, (_, c) =>
      isGuard(level, c)
        ? nap(r, c)
        : usesGate(r, c)
          ? openGate(r, c)
          : walk(r, c)
    ),
  ];
  return all.filter((o) => o !== r);
}

const key = (r: Round) =>
  `${r.sun}:${r.ninja}:${(r.asleep ?? []).join(',')}:${r.got ? 1 : 0}${r.opened ? 1 : 0}`;

// The fewest taps (sun moves and walks) to the chest, and which, or null if
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

// The rounds a child can get to in a level from which there is no way left
// to the chest, whatever it taps: there must be none, or the child would
// have to start over.
export function deadEnds(level: Level): Round[] {
  const start = newRound(level);
  const seenRounds = new Map<string, Round>([[key(start), start]]);
  const next = new Map<string, string[]>();
  const queue = [start];
  while (queue.length) {
    const r = queue.shift()!;
    if (isSolved(r)) continue;
    const out = moves(r);
    next.set(key(r), out.map(key));
    for (const o of out)
      if (!seenRounds.has(key(o))) {
        seenRounds.set(key(o), o);
        queue.push(o);
      }
  }
  // Back from the won rounds: every round with a way to one.
  const back = new Map<string, string[]>();
  for (const [k, outs] of next)
    for (const o of outs) back.set(o, [...(back.get(o) ?? []), k]);
  const good = new Set([...seenRounds.values()].filter(isSolved).map(key));
  const todo = [...good];
  while (todo.length)
    for (const p of back.get(todo.pop()!) ?? [])
      if (!good.has(p)) {
        good.add(p);
        todo.push(p);
      }
  return [...seenRounds.entries()]
    .filter(([k]) => !good.has(k))
    .map(([, r]) => r);
}

// For now, while the levels are being tried out, every level is open.
export const ALL_OPEN = true;

// Whether a level can be played: the first one, one already won, the one
// being played, and the one right after a level that's won.
export function isOpen(id: string, won: string[], current: string) {
  const at = LEVELS.findIndex((l) => l.id === id);
  return (
    at === 0 ||
    id === current ||
    won.includes(id) ||
    (at > 0 && won.includes(LEVELS[at - 1].id))
  );
}

export type Stats = { solved: number; won?: string[] };
export const initialStats: Stats = { solved: 0, won: [] };

export type Store = { round: Round };
export const initialStore: Store = { round: newRound() };
