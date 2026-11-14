// Looks for new towns at random and prints the ones the solver says take
// the wanted number of taps, to pick from by hand and paste into LEVELS.
//
//   node --experimental-strip-types scripts/find-levels.ts night 5 6 6 7
//   (world, width, rows, fewest taps, most taps, how many, seed, first sun)

import {
  cell,
  seen,
  solution,
  sunsOf,
  type Kind,
  type Level,
  type Sun,
  type Thing,
  type World,
} from '../src/lib/game.ts';

const [
  world = 'night',
  w = '5',
  h = '6',
  lo = '6',
  hi = '6',
  n = '5',
  s,
  from,
] = process.argv.slice(2);
const width = Number(w);
const rows = Number(h);

let seed = Number(s ?? Date.now()) >>> 0;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
const int = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));

function town(): Level | null {
  const start = cell({ width }, int(0, width - 1), rows - 1);
  const chest = int(0, width - 1);
  const taken = new Set([start, chest]);
  const things: Thing[] = [];
  const add = (kind: Kind, height: number) => {
    const x = int(0, width - 1);
    const y = int(0, rows - 1);
    const c = cell({ width }, x, y);
    if (taken.has(c)) return;
    taken.add(c);
    things.push({ kind, x, y, height });
  };
  for (let i = int(3, 6); i > 0; i--) add('tower', int(2, 3));
  for (let i = int(1, 2); i > 0; i--) add('bamboo', 1);
  for (let i = int(1, 2); i > 0; i--) add('lantern', 1);
  if (world === 'guards' || world === 'gates') {
    const before = things.length;
    add('guard', 0);
    if (things.length === before) return null;
    things[before].facing = pick(['up', 'right', 'down', 'left'] as const);
  }
  if (world === 'gates') {
    const before = things.length;
    add('gate', 1);
    add('key', 0);
    if (things.length !== before + 2) return null;
  }
  // A lantern too near the start would light up the shelter.
  const [sx, sy] = [start % width, Math.floor(start / width)];
  if (
    things.some(
      (t) => t.kind === 'lantern' && Math.abs(t.x - sx) + Math.abs(t.y - sy) < 3
    )
  )
    return null;
  // A pagoda just in front of the green cell would hide it.
  if (things.some((t) => t.kind === 'tower' && t.x === chest && t.y === 1))
    return null;
  things.sort((a, b) => a.y - b.y || a.x - b.x);
  // A guard looking at the shelter would see the ninja at the start.
  if (seen({ width, rows, things } as Level).has(start)) return null;
  // And a guard looking out of the town would see nothing.
  const sees = seen({ width, rows, things } as Level).size;
  if (things.some((t) => t.kind === 'guard') && sees < 2) return null;
  const level: Level = {
    id: '?',
    world: world as World,
    width,
    rows,
    things,
    start,
    chest,
    sun: 'north',
  };
  level.sun = pick(sunsOf(level)) as Sun;
  return level;
}

function draw(level: Level) {
  const sign: Record<Kind, string> = {
    tower: 'T',
    bamboo: 'B',
    lantern: 'L',
    guard: 'G',
    gate: 'D',
    key: 'K',
  };
  const out: string[] = [];
  for (let y = 0; y < level.rows; y++) {
    let line = '';
    for (let x = 0; x < level.width; x++) {
      const c = cell(level, x, y);
      const t = level.things.find((t) => t.x === x && t.y === y);
      line +=
        (t
          ? sign[t.kind] +
            (t.facing ? '^>v<'['urdl'.indexOf(t.facing[0])] : t.height)
          : c === level.start
            ? 'N '
            : y === 0 && x === level.chest
              ? 'C '
              : '. ') + ' ';
    }
    out.push('  ' + line);
  }
  return out.join('\n');
}

let found = 0;
for (let tries = 0; tries < 200000 && found < Number(n); tries++) {
  const level = town();
  if (!level) continue;
  const way = solution(level);
  if (!way || way.length < Number(lo) || way.length > Number(hi)) continue;
  // Where the ninja walks: by night always by the moon, and in all but the
  // shortest levels by more than one sun or moon.
  const walks = new Set(
    way
      .filter((r, i) => r.ninja !== (way[i - 1]?.ninja ?? level.start))
      .map((r) => r.sun)
  );
  if (!walks.has('moon')) continue;
  // With a guard, the way goes by putting it to sleep.
  if (world !== 'night' && !way.at(-1)!.asleep?.length) continue;
  // With a gate, the way goes through it: without the key there is none.
  if (world === 'gates') {
    if (!way.some((r) => r.opened)) continue;
    const locked = level.things.filter((t) => t.kind !== 'key');
    if (solution({ ...level, things: locked })) continue;
  }
  if (walks.size < 2 && Number(hi) > 3) continue;
  if (from && level.sun !== from) continue;
  found++;
  const { id: _, ...rest } = level;
  console.log(`#${found}, ${way.length} taps, from ${level.sun}:`);
  console.log('  ' + way.map((r) => `${r.sun[0]}${r.ninja}`).join(' ') + '\n');
  console.log(draw(level));
  console.log(JSON.stringify(rest) + '\n');
}
