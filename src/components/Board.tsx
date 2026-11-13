import { useEffect, useId, useState } from 'react';

import {
  SUNS,
  cell,
  dark,
  lit,
  open,
  quarters,
  QUARTER_MS,
  chestCell,
  xy,
  sunsOf,
  type Level,
  type Round,
  type Sun,
  type Thing,
} from '../lib/game';
import type { Strings } from '../lib/i18n';

// How long the ninja takes to walk one cell, in milliseconds.
export const STEP_MS = 220;

// The town seen from above, a bit from the front: each cell is 10 wide and
// 8 deep, and things stand up from it. Round the town is a garden, wide
// enough for the sun on each side.
const CELL = 10;
const ROW = 8;
const SIDE = 13;
const TOP = 13;
const BOTTOM = 12;

// The sun goes round the town on a circle, so it moves from side to side
// over the corners instead of cutting across; just outside the town.
const sunR = (level: Level, row: number) =>
  Math.max(level.width * CELL, level.rows * row) / 2 + 6;
const ANGLE: Record<Sun, number> = {
  north: 0,
  east: 90,
  moon: 180,
  west: 270,
};

// Where a cell is: its left, its top, and the spot low in the middle of it
// that things and the ninja stand on.
// The cobbles in a cell, as [left, top, width, height], in three rows that
// don't line up, like an old street.
const COBBLES: [number, number, number, number][] = [
  [1, 0.95, 2.6, 2],
  [4.1, 0.95, 2.5, 2],
  [7.1, 0.95, 1.9, 2],
  [1, 3.4, 1.4, 1.9],
  [2.9, 3.4, 2.5, 1.9],
  [5.9, 3.4, 3.1, 1.9],
  [1, 5.75, 2.9, 1.4],
  [4.4, 5.75, 2.4, 1.4],
  [7.3, 5.75, 1.7, 1.4],
];

// After how many quarters the sun, going round from one side to another,
// is at the bottom where the moon is; null if it doesn't go by it.
function byMoon(from: Sun, to: Sun): number | null {
  const q = quarters(from, to);
  for (let k = 1; k <= q; k++)
    if (SUNS[(SUNS.indexOf(from) + k) % SUNS.length] === 'moon') return k;
  return null;
}

// A pagoda seen from the front and a little above: a white wall between red
// posts and a dark curved roof on every floor, one floor for each cell of
// its height, and a gold spire on top.
export function Tower({ height }: { height: number }) {
  const FLOOR = 4.6;
  return (
    <g className='tower'>
      {/* The foot of it, as seen from above. */}
      <rect
        className='tower__base'
        x={-4.2}
        y={-3}
        width={8.4}
        height={3.6}
        rx={0.6}
      />
      {Array.from({ length: height }, (_, i) => {
        const y = -i * FLOOR;
        const w = 6 - i * 0.6;
        return (
          <g key={i}>
            <rect
              className='tower__wall'
              x={-w / 2}
              y={y - FLOOR + 0.6}
              width={w}
              height={FLOOR - 0.4}
            />
            <rect
              className='tower__post'
              x={-w / 2}
              y={y - FLOOR + 0.6}
              width={0.9}
              height={FLOOR - 0.4}
            />
            <rect
              className='tower__post'
              x={w / 2 - 0.9}
              y={y - FLOOR + 0.6}
              width={0.9}
              height={FLOOR - 0.4}
            />
            <rect
              className='tower__window'
              x={-0.9}
              y={y - FLOOR + 1.9}
              width={1.8}
              height={1.8}
              rx={0.2}
            />
            <path
              className='tower__roof'
              d={`M${-w / 2 - 2.2} ${y - FLOOR + 1.6} Q${-w / 2 - 0.4} ${y - FLOOR + 1.8} ${-w / 2 + 0.6} ${y - FLOOR - 0.6} L${w / 2 - 0.6} ${y - FLOOR - 0.6} Q${w / 2 + 0.4} ${y - FLOOR + 1.8} ${w / 2 + 2.2} ${y - FLOOR + 1.6} L${w / 2 + 1.2} ${y - FLOOR + 2.2} L${-w / 2 - 1.2} ${y - FLOOR + 2.2} Z`}
            />
          </g>
        );
      })}
      <path className='tower__spire' d={`M0 ${-height * FLOOR - 0.6} v-2.6`} />
      <circle
        className='tower__spire-ball'
        cx={0}
        cy={-height * FLOOR - 3.4}
        r={0.6}
      />
    </g>
  );
}

// A thick clump of bamboo, too thick to get through.
function Bamboo() {
  const stalks = [
    [-3, -8.5],
    [-1.2, -10],
    [0.8, -9],
    [2.8, -10.5],
    [-2, -7],
    [1.8, -7.4],
  ];
  return (
    <g className='bamboo'>
      <ellipse className='bamboo__ground' cx={0} cy={-0.4} rx={4.6} ry={2.4} />
      {stalks.map(([x, top], i) => (
        <g key={i}>
          <rect
            className='bamboo__stalk'
            x={x - 0.55}
            y={top}
            width={1.1}
            height={-top}
            rx={0.4}
          />
          {[2.6, 5.2].map((d) => (
            <rect
              key={d}
              className='bamboo__joint'
              x={x - 0.65}
              y={top + d}
              width={1.3}
              height={0.35}
            />
          ))}
          <path
            className='bamboo__leaf'
            d={`M${x} ${top + 1.2} q${i % 2 ? 2 : -2} -0.6 ${i % 2 ? 2.6 : -2.6} 0.5 q${i % 2 ? -1.4 : 1.4} 0.3 ${i % 2 ? -2.6 : 2.6} -0.5`}
          />
        </g>
      ))}
    </g>
  );
}

// A stone lantern, with a fire behind its little window at night.
export function Lantern({ on }: { on: boolean }) {
  return (
    <g className={on ? 'lantern lantern--on' : 'lantern'}>
      <rect
        className='lantern__stone'
        x={-2.4}
        y={-1.4}
        width={4.8}
        height={1.4}
        rx={0.3}
      />
      <rect
        className='lantern__stone'
        x={-0.8}
        y={-4.6}
        width={1.6}
        height={3.4}
      />
      <rect
        className='lantern__stone'
        x={-2}
        y={-5.4}
        width={4}
        height={1}
        rx={0.3}
      />
      <rect
        className='lantern__stone'
        x={-1.7}
        y={-8.4}
        width={3.4}
        height={3.1}
      />
      <rect
        className='lantern__window'
        x={-1}
        y={-7.8}
        width={2}
        height={1.9}
        rx={0.3}
      />
      <path
        className='lantern__stone'
        d='M-3.3 -8.2 Q0 -9 3.3 -8.2 L1.6 -10.4 L-1.6 -10.4 Z'
      />
      <circle className='lantern__stone' cx={0} cy={-11} r={0.7} />
    </g>
  );
}

// A little open shelter over the start, in the town's own style: two red
// posts and a dark curved roof, like a pagoda's. Under it is always shady.
function Shelter() {
  return (
    <g className='shelter'>
      <rect
        className='tower__post'
        x={-4.6}
        y={-9.4}
        width={0.9}
        height={9.4}
      />
      <rect className='tower__post' x={3.7} y={-9.4} width={0.9} height={9.4} />
      <path
        className='tower__roof'
        d='M-6.8 -9 Q-5 -8.8 -4 -11.4 L4 -11.4 Q5 -8.8 6.8 -9 L5.8 -8.3 L-5.8 -8.3 Z'
      />
      <rect
        className='shelter__ridge'
        x={-3.6}
        y={-12}
        width={7.2}
        height={0.7}
        rx={0.3}
      />
    </g>
  );
}

// The same things seen straight from above, each in the middle of its
// cell: a pagoda as its roofs one over the other, a floor each.
function TopTower({ height }: { height: number }) {
  // Each floor sits on the roof of the one under it, a step higher up the
  // picture, with its white wall showing under its roof: a taller pagoda
  // has more floors and stands up out of its cell.
  const WALL = 1.8;
  const floors = Array.from({ length: height }, (_, i) => {
    const w = 9 - i * 2.2;
    const deep = w - 2;
    const mid = -0.8 - i * WALL;
    return { w, deep, mid };
  });
  const last = floors[floors.length - 1];
  return (
    <g className='tower'>
      {floors.map(({ w, deep, mid }, i) => (
        <g key={i}>
          <rect
            className='tower__wall'
            x={-w / 2 + 0.5}
            y={mid}
            width={w - 1}
            height={deep / 2 + WALL}
          />
          <rect
            className='tower__post'
            x={-w / 2 + 0.5}
            y={mid}
            width={0.8}
            height={deep / 2 + WALL}
          />
          <rect
            className='tower__post'
            x={w / 2 - 1.3}
            y={mid}
            width={0.8}
            height={deep / 2 + WALL}
          />
          <rect
            className='tower__post'
            x={-w / 2}
            y={mid - deep / 2}
            width={w}
            height={deep}
            rx={1}
          />
          <rect
            className='tower__roof'
            x={-w / 2 + 0.45}
            y={mid - deep / 2 + 0.45}
            width={w - 0.9}
            height={deep - 0.9}
            rx={0.7}
          />
        </g>
      ))}
      <circle className='tower__spire-ball' cy={last.mid} r={0.8} />
    </g>
  );
}

function TopBamboo() {
  const stalks = [
    [-2.6, -2.4],
    [0.2, -3],
    [2.8, -1.8],
    [-3, 0.6],
    [-0.6, 0],
    [2, 1],
    [-1.8, 2.8],
    [1, 3],
  ];
  return (
    <g className='bamboo'>
      <circle className='bamboo__ground' r={4.6} />
      {stalks.map(([x, y], i) => (
        <g key={i}>
          <path
            className='bamboo__leaf'
            d={`M${x} ${y} q${i % 2 ? 2 : -2} -0.8 ${i % 2 ? 2.4 : -2.4} 0.6 q${i % 2 ? -1.2 : 1.2} 0.2 ${i % 2 ? -2.4 : 2.4} -0.6`}
          />
          <circle className='bamboo__stalk' cx={x} cy={y} r={0.95} />
          <circle className='bamboo__joint' cx={x} cy={y} r={0.4} />
        </g>
      ))}
    </g>
  );
}

function TopLantern() {
  return (
    <g className='lantern'>
      <rect
        className='lantern__stone'
        x={-3}
        y={-3}
        width={6}
        height={6}
        rx={1.2}
      />
      <rect
        className='lantern__window'
        x={-1.6}
        y={-1.6}
        width={3.2}
        height={3.2}
        rx={0.6}
      />
      <circle className='lantern__stone' r={0.9} />
    </g>
  );
}

// The shelter from above: its four red posts and the edge of its roof, so
// the ninja under it still shows.
function TopShelter() {
  return (
    <g className='shelter'>
      <rect
        className='shelter__eave'
        x={-4.3}
        y={-4.3}
        width={8.6}
        height={8.6}
        rx={1}
      />
      {[
        [-4.3, -4.3],
        [3.1, -4.3],
        [-4.3, 3.1],
        [3.1, 3.1],
      ].map(([x, y], i) => (
        <rect
          key={i}
          className='tower__post'
          x={x}
          y={y}
          width={1.2}
          height={1.2}
          rx={0.2}
        />
      ))}
    </g>
  );
}

// The ninja from above: shoulders, the round head on them, and the band of
// face with its eyes looking down the town.
function TopNinja({ squint }: { squint: boolean }) {
  return (
    <g>
      <ellipse className='ninja__suit' cx={0} cy={0.8} rx={3.9} ry={2.6} />
      <circle className='ninja__suit' cx={0} cy={-0.4} r={2.9} />
      <rect
        className='ninja__face'
        x={-2.4}
        y={0}
        width={4.8}
        height={1.7}
        rx={0.85}
      />
      {squint ? (
        <path className='ninja__shut' d='M-1.4 0.85 l1 0 M0.4 0.85 l1 0' />
      ) : (
        <>
          <circle className='ninja__eye' cx={-0.9} cy={0.85} r={0.45} />
          <circle className='ninja__eye' cx={0.9} cy={0.85} r={0.45} />
        </>
      )}
    </g>
  );
}

function TopShape({ thing }: { thing: Thing }) {
  if (thing.kind === 'lantern') return <TopLantern />;
  if (thing.kind === 'tower') return <TopTower height={thing.height} />;
  return <TopBamboo />;
}

function ThingShape({ thing, night }: { thing: Thing; night: boolean }) {
  if (thing.kind === 'lantern') return <Lantern on={night} />;
  if (thing.kind === 'tower') return <Tower height={thing.height} />;
  return <Bamboo />;
}

// The little ninja: a dark suit with a band of face and two eyes. When it
// bumps into the sun it screws its eyes shut.
function Ninja({ squint }: { squint: boolean }) {
  return (
    <g>
      <rect
        className='ninja__suit'
        x={2}
        y={-5.5}
        width={6}
        height={5.5}
        rx={2}
      />
      <circle className='ninja__suit' cx={5} cy={-8} r={3.2} />
      <rect
        className='ninja__face'
        x={2.6}
        y={-8.6}
        width={4.8}
        height={1.8}
        rx={0.9}
      />
      {squint ? (
        <path className='ninja__shut' d='M3.6 -7.7 l1 0 M5.4 -7.7 l1 0' />
      ) : (
        <>
          <circle className='ninja__eye' cx={4.1} cy={-7.7} r={0.45} />
          <circle className='ninja__eye' cx={5.9} cy={-7.7} r={0.45} />
        </>
      )}
    </g>
  );
}

// The treasure chest the ninja is after: a little wooden chest with gold
// bands and a lock; at the end its lid flies open on the gold inside.
function Chest({ open }: { open: boolean }) {
  return (
    <g className={open ? 'chest chest--open' : 'chest'}>
      {open && (
        <>
          {/* The lid, thrown back, and the gold shining out. */}
          <path
            className='chest__lid'
            d='M-4.4 -4.4 L-4 -6.6 L4 -6.6 L4.4 -4.4 Z'
          />
          <ellipse className='chest__glow' cx={0} cy={-4.8} rx={4.2} ry={1.3} />
          <circle className='chest__coin' cx={-1.8} cy={-4.6} r={1} />
          <circle className='chest__coin' cx={0.3} cy={-5} r={1} />
          <circle className='chest__coin' cx={2.2} cy={-4.5} r={1} />
        </>
      )}
      <rect
        className='chest__body'
        x={-4.4}
        y={-4.6}
        width={8.8}
        height={4.6}
        rx={0.6}
      />
      <rect className='chest__band' x={-3.4} y={-4.6} width={1} height={4.6} />
      <rect className='chest__band' x={2.4} y={-4.6} width={1} height={4.6} />
      {!open && (
        <path
          className='chest__lid'
          d='M-4.4 -4.4 L-4.4 -5.6 Q0 -8.4 4.4 -5.6 L4.4 -4.4 Z'
        />
      )}
      <rect
        className='chest__lock'
        x={-1}
        y={-5.2}
        width={2}
        height={2.2}
        rx={0.4}
      />
    </g>
  );
}

export function Board({
  round,
  at,
  stepMs,
  gone,
  squint,
  onCell,
  t,
  top = false,
}: {
  round: Round;
  // The cell the ninja is shown on, as it walks.
  at: number;
  // How long each step it takes now.
  stepMs: number;
  // At the chest, the round won.
  gone: boolean;
  // Set while the ninja screws its eyes shut.
  squint: number;
  onCell: (c: number) => void;
  t: Strings;
  // Seen straight from above, every cell square, instead of a bit from the
  // front.
  top?: boolean;
}) {
  const { level } = round;
  const row = top ? CELL : ROW;
  // From above the town is deeper, so the sun goes round wider: the garden
  // on each side grows to keep it in sight.
  const side = Math.max(SIDE, sunR(level, row) - (level.width * CELL) / 2 + 7);
  // Where a cell is: its left, its top, its middle, and the spot low in it
  // that things and the ninja stand on (from above, its middle).
  const place = (c: number) => {
    const [x, y] = xy(level, c);
    const left = side + x * CELL;
    const top_ = TOP + y * row;
    const cy = top_ + row / 2;
    return {
      left,
      top: top_,
      cx: left + CELL / 2,
      cy,
      foot: top ? cy : top_ + ROW - 1.5,
    };
  };
  const w = side * 2 + level.width * CELL;
  const h = TOP + BOTTOM + level.rows * row;
  const centre = {
    x: side + (level.width * CELL) / 2,
    y: TOP + (level.rows * row) / 2,
  };
  const SUN_R = sunR(level, row);
  const cells = Array.from({ length: level.width * level.rows }, (_, c) => c);
  const chest = place(chestCell(level));
  const cobbles = useId();
  const glow = useId();

  // The sun always goes round clockwise to its new side, a quarter at a
  // time.
  const [angle, setAngle] = useState(ANGLE[round.sun]);
  const [was, setWas] = useState(round.sun);
  const [turn, setTurn] = useState(1);
  // What the sky shows: the sun's side, whose shadows are drawn, or the
  // moon, by night. Where the sun goes by the bottom it turns into the moon
  // on the way: for a moment if it goes on, or once it gets there if it
  // stops. Until then the shadows of the side it left stay.
  // Where there are no lanterns there is no moon: the sun just goes by.
  const moonOut = sunsOf(level).includes('moon');
  const [from, setFrom] = useState(round.sun);
  const [shown, setShown] = useState(round.sun);
  // The moon itself shows only once the sun gets to the bottom, and the
  // sun again as soon as it leaves; the town goes dark or light on the way.
  const [moonUp, setMoonUp] = useState(round.sun === 'moon');
  if (was !== round.sun) {
    const q = quarters(was, round.sun);
    const k = moonOut ? byMoon(was, round.sun) : null;
    setWas(round.sun);
    setFrom(was);
    setTurn(q);
    setAngle((a) => a + q * 90);
    if (k === null || k === q) setShown(round.sun);
    if (round.sun !== 'moon') setMoonUp(false);
  }
  useEffect(() => {
    const k = byMoon(from, round.sun);
    if (!moonOut || k === null) return;
    const q = quarters(from, round.sun);
    const ids =
      k === q
        ? [setTimeout(() => setMoonUp(true), q * QUARTER_MS)]
        : [
            setTimeout(
              () => {
                setShown('moon');
                setMoonUp(true);
              },
              (k - 0.75) * QUARTER_MS
            ),
            setTimeout(
              () => {
                setShown(round.sun);
                setMoonUp(false);
              },
              (k + 0.75) * QUARTER_MS
            ),
          ];
    return () => ids.forEach(clearTimeout);
  }, [from, moonOut, round.sun, turn]);
  const night = shown === 'moon';

  const me = place(at);
  const ninjaY = me.foot;

  // Things further back are drawn first, so the ones in front stand over
  // them.
  const things = [...level.things].sort((a, b) => a.y - b.y || a.x - b.x);
  // The things in front of the ninja, nearer the bottom, stand over it: a
  // tower in front hides all of the ninja behind it but its head.
  const ninjaRow = Math.floor(at / level.width);
  const front = top ? [] : things.filter((thing) => thing.y > ninjaRow);
  const hide = useId();

  return (
    <svg
      className='board'
      viewBox={`0 0 ${w} ${h}`}
      style={{ '--ratio': w / h } as React.CSSProperties}
      role='group'
      aria-label={t.title}
    >
      <defs>
        <mask
          id={hide}
          maskUnits='userSpaceOnUse'
          x={0}
          y={0}
          width={w}
          height={h}
        >
          <rect x={0} y={0} width={w} height={h} fill='#fff' />
          <g className='cut'>
            {front.map((thing, i) => {
              const p = place(thing.y * level.width + thing.x);
              return (
                <g key={i} transform={`translate(${p.cx} ${p.foot})`}>
                  <ThingShape thing={thing} night={false} />
                </g>
              );
            })}
          </g>
        </mask>
        {/* Little cobbles, as in an old town, the same in every cell. */}
        <pattern
          id={cobbles}
          patternUnits='userSpaceOnUse'
          x={side}
          y={TOP}
          width={CELL}
          height={row}
        >
          {COBBLES.map(([x, y, w, h], i) => (
            <rect
              key={i}
              className='cobble'
              x={x}
              y={(y * row) / ROW}
              width={w}
              height={(h * row) / ROW}
              rx={0.8}
            />
          ))}
        </pattern>
        {/* A lantern's glow, bright in the middle and soft at the edge. */}
        <radialGradient id={glow}>
          <stop offset='0' className='glow__in' />
          <stop offset='0.45' className='glow__mid' />
          <stop offset='1' className='glow__out' />
        </radialGradient>
      </defs>
      <rect className='garden' x={0} y={0} width={w} height={h} />
      {/* The street, a stone for each cell. */}
      <rect
        className='surface'
        x={side - 0.6}
        y={TOP - 0.6}
        width={level.width * CELL + 1.2}
        height={level.rows * row + 1.2}
        rx={1.5}
      />
      {cells.map((c) => {
        const p = place(c);
        // Where a wall stands, a raised block of stone, so it is plain the
        // ninja can't go there.
        if (!open(level, c))
          return (
            <g key={c}>
              <rect
                className='block__side'
                x={p.left + 0.2}
                y={p.top + 0.2}
                width={CELL - 0.4}
                height={row - 0.4}
                rx={1}
              />
              <rect
                className='block__top'
                x={p.left + 0.2}
                y={p.top + 0.2}
                width={CELL - 0.4}
                height={row - 2}
                rx={1}
              />
            </g>
          );
        return (
          <g key={c}>
            <rect
              className={c === chestCell(level) ? 'stone stone--goal' : 'stone'}
              x={p.left + 0.35}
              y={p.top + 0.35}
              width={CELL - 0.7}
              height={row - 0.7}
              rx={1}
            />
            <rect
              x={p.left + 0.35}
              y={p.top + 0.35}
              width={CELL - 0.7}
              height={row - 0.7}
              rx={1}
              fill={`url(#${cobbles})`}
            />
          </g>
        );
      })}

      {/* The shadows for each side the sun can be on; only the one for
          where it is shows, and they fade into each other. One see-through
          layer each, so overlapping shadows are no darker. */}
      {SUNS.filter((s) => s !== 'moon').map((s) => {
        const shade = dark(level, s);
        return (
          <g
            key={s}
            className={s === shown ? 'shadows' : 'shadows shadows--off'}
          >
            {/* Only on the street: a wall is never somewhere to hide. */}
            {[...shade]
              .filter((c) => open(level, c))
              .map((c) => {
                const p = place(c);
                return (
                  <rect
                    key={c}
                    className='shadow'
                    x={p.left - 0.1}
                    y={p.top - 0.1}
                    width={CELL + 0.2}
                    height={row + 0.2}
                    rx={1.2}
                  />
                );
              })}
          </g>
        );
      })}

      {things.map((thing, i) => {
        const p = place(thing.y * level.width + thing.x);
        return (
          <g key={i} transform={`translate(${p.cx} ${p.foot})`}>
            {top ? (
              <TopShape thing={thing} />
            ) : (
              <ThingShape thing={thing} night={night} />
            )}
          </g>
        );
      })}

      {/* At night all the town is dark, but round the lanterns. */}
      <rect
        className={night ? 'night' : 'night night--off'}
        x={0}
        y={0}
        width={w}
        height={h}
      />
      <g className={night ? 'lights' : 'lights lights--off'}>
        {[...lit(level)]
          .filter((c) => open(level, c))
          .map((c) => {
            const p = place(c);
            return (
              <rect
                key={c}
                className='light'
                x={p.left + 0.4}
                y={p.top + 0.4}
                width={CELL - 0.8}
                height={row - 0.8}
                rx={1.2}
              />
            );
          })}
        {/* The lanterns' fires, bright over the dark. */}
        {level.things
          .filter((t) => t.kind === 'lantern')
          .map((t, i) => {
            const p = place(cell(level, t.x, t.y));
            return (
              <g key={i} transform={`translate(${p.cx} ${p.foot})`}>
                <circle
                  className='lantern__halo'
                  cx={0}
                  cy={top ? 0 : -6.6}
                  r={6.5}
                  style={{ fill: `url(#${glow})` }}
                />
                <rect
                  className='lantern__fire'
                  x={top ? -1.6 : -1}
                  y={top ? -1.6 : -7.8}
                  width={top ? 3.2 : 2}
                  height={top ? 3.2 : 1.9}
                  rx={0.3}
                />
              </g>
            );
          })}
      </g>

      {/* The shelter over the start, always in the shade. */}
      <g
        transform={`translate(${place(level.start).cx} ${place(level.start).foot})`}
      >
        {top ? <TopShelter /> : <Shelter />}
      </g>

      {/* The chest, just beyond the town, over the last cell. */}
      <g transform={`translate(${chest.cx} ${chest.top - 0.4})`}>
        <Chest open={gone} />
      </g>

      {/* The ninja, over everything but the things in front of it. */}
      <g mask={`url(#${hide})`}>
        <g
          className='ninja'
          style={{
            transform: `translate(${me.cx}px, ${ninjaY}px)`,
            transitionDuration: `${gone ? stepMs * 2 : stepMs}ms`,
          }}
        >
          <g transform={top ? 'translate(0 0)' : 'scale(0.8) translate(-5 0)'}>
            <g
              className={
                gone
                  ? 'ninja__pose ninja--hop'
                  : squint
                    ? 'ninja__pose ninja--crouch'
                    : 'ninja__pose'
              }
              style={gone ? { animationDelay: `${stepMs * 2}ms` } : undefined}
            >
              {top ? (
                <TopNinja squint={squint > 0} />
              ) : (
                <Ninja squint={squint > 0} />
              )}
            </g>
          </g>
        </g>
      </g>

      {/* A tap on a cell sends the ninja there. */}
      {cells.map((c) => {
        const p = place(c);
        return (
          <rect
            key={c}
            className='column'
            x={p.left}
            y={p.top}
            width={CELL}
            height={row}
            onClick={() => onCell(c)}
          >
            <title>{c === chestCell(level) ? t.chest : t.ground}</title>
          </rect>
        );
      })}

      <g
        className='sun'
        style={{
          transformOrigin: `${centre.x}px ${centre.y}px`,
          transform: `rotate(${angle}deg)`,
          transitionDuration: `${turn * QUARTER_MS}ms`,
        }}
      >
        <g transform={`translate(${centre.x} ${centre.y - SUN_R})`}>
          {/* Small, to keep out of the way. */}
          <g transform='scale(0.55)'>
            {Array.from({ length: 8 }, (_, i) => (
              <path
                key={i}
                className={moonUp ? 'sun__ray sun--off' : 'sun__ray'}
                d='M0 -6 L0 -7.8'
                transform={`rotate(${i * 45})`}
              />
            ))}
            <circle
              className={moonUp ? 'sun__disc sun--off' : 'sun__disc'}
              r={4.6}
            />
            {/* At the bottom the sun turns into the moon. */}
            <g className={moonUp ? 'moon' : 'moon moon--off'}>
              <path
                className='moon__disc'
                d='M0 -4.6 A4.6 4.6 0 1 0 0 4.6 A6 6 0 0 1 0 -4.6 Z'
              />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
