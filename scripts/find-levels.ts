// Looks for new towns at random and prints the ones the solver says take
// the wanted number of taps, to pick from by hand and paste into LEVELS.
//
//   node --experimental-strip-types scripts/find-levels.ts night 5 6 6 7
//   (world, width, rows, fewest taps, most taps, how many, seed, first sun)

import {
  cell,
  solution,
  sunsOf,
  type Kind,
  type Level,
  type Sun,
  type Thing,
  type World,
} from '../src/lib/game.ts';

const [
  world = 'pagoda',
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
  for (let i = int(1, 2); i > 0; i--) add('tree', int(1, 2));
  if (world === 'night') {
    for (let i = int(0, 2); i > 0; i--) add('bamboo', 1);
    for (let i = int(1, 2); i > 0; i--) add('lantern', 1);
  }
  // A lantern too near the start would light up the shelter.
  const [sx, sy] = [start % width, Math.floor(start / width)];
  if (
    things.some(
      (t) => t.kind === 'lantern' && Math.abs(t.x - sx) + Math.abs(t.y - sy) < 3
    )
  )
    return null;
  things.sort((a, b) => a.y - b.y || a.x - b.x);
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
    tree: 'r',
    lantern: 'L',
  };
  const out: string[] = [];
  for (let y = 0; y < level.rows; y++) {
    let line = '';
    for (let x = 0; x < level.width; x++) {
      const c = cell(level, x, y);
      const t = level.things.find((t) => t.x === x && t.y === y);
      line +=
        (t
          ? sign[t.kind] + t.height
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
  // Where the ninja walks: by night both by the moon and by the sun, and
  // by day by at least two suns.
  const walks = new Set(
    way
      .filter((r, i) => r.ninja !== (way[i - 1]?.ninja ?? level.start))
      .map((r) => r.sun)
  );
  if (world === 'night' && !(walks.has('moon') && walks.size >= 2)) continue;
  if (world === 'pagoda' && walks.size < 2) continue;
  if (from && level.sun !== from) continue;
  found++;
  const { id: _, ...rest } = level;
  console.log(`#${found}, ${way.length} taps, from ${level.sun}:`);
  console.log('  ' + way.map((r) => `${r.sun[0]}${r.ninja}`).join(' ') + '\n');
  console.log(draw(level));
  console.log(JSON.stringify(rest) + '\n');
}
