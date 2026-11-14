import { useEffect, useId, useState } from 'react';

import {
  SUNS,
  cell,
  dark,
  lit,
  open,
  quarters,
  seen,
  QUARTER_MS,
  chestCell,
  xy,
  sunsOf,
  thingAt,
  town,
  type Level,
  type Round,
  type Facing,
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
const sunR = (level: Level) =>
  Math.max(level.width * CELL, level.rows * ROW) / 2 + 6;
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

function place(round: Round, c: number) {
  const [x, y] = xy(round.level, c);
  const left = SIDE + x * CELL;
  const top = TOP + y * ROW;
  return { left, top, cx: left + CELL / 2, foot: top + ROW - 1.5 };
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

// A guard in a straw hat and a purple coat, holding up a little lamp the way
// it looks: from the front its face, from behind its back, from the side
// one eye. Asleep, it sits down, its eyes shut and its lamp out.
export function Guard({ facing, asleep }: { facing: Facing; asleep: boolean }) {
  const side = facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
  const eyes = facing === 'up' ? [] : side ? [side * 1.2] : [-0.9, 0.9];
  const lamp = asleep
    ? { x: 3.8, y: -1.4 }
    : facing === 'down'
      ? { x: 0, y: -3.4 }
      : facing === 'up'
        ? { x: 2.6, y: -6.4 }
        : { x: side * 4.2, y: -4.6 };
  return (
    <g className={asleep ? 'guard guard--asleep' : 'guard'}>
      <g className='guard__body'>
        <path
          className='guard__coat'
          d='M-3.4 0 L-2.4 -6.4 L2.4 -6.4 L3.4 0 Z'
        />
        <rect
          className='guard__belt'
          x={-2.7}
          y={-3.4}
          width={5.4}
          height={0.8}
        />
        <circle
          className={facing === 'up' ? 'guard__hair' : 'guard__face'}
          cx={0}
          cy={-8}
          r={2.3}
        />
        {eyes.map((x) =>
          asleep ? (
            <path
              key={x}
              className='guard__shut'
              d={`M${x - 0.45} -7.8 l0.9 0`}
            />
          ) : (
            <circle key={x} className='guard__eye' cx={x} cy={-7.8} r={0.38} />
          )
        )}
        <path className='guard__hat' d='M-4.6 -9 L0 -12.4 L4.6 -9 Z' />
      </g>
      {/* An old oil lamp, held by its ring: a little cap, a glass with
          the flame in it between two bars, and a foot. */}
      <g
        className='guard__lamp'
        transform={`translate(${lamp.x} ${lamp.y}) scale(1.25)`}
      >
        <path className='guard__ring' d='M-0.7 -2 A0.7 0.8 0 0 1 0.7 -2' />
        <rect
          className={asleep ? 'guard__glass guard__glass--out' : 'guard__glass'}
          x={-0.85}
          y={-1.5}
          width={1.7}
          height={2.1}
          rx={0.6}
        />
        {!asleep && (
          <path
            className='guard__flame'
            d='M0 -1.1 Q0.55 -0.3 0 0.25 Q-0.55 -0.3 0 -1.1 Z'
          />
        )}
        <path className='guard__bars' d='M-0.85 -1.3 v1.7 M0.85 -1.3 v1.7' />
        <path
          className='guard__metal'
          d='M-1.1 -1.4 L-0.55 -2.1 L0.55 -2.1 L1.1 -1.4 Z'
        />
        <rect
          className='guard__metal'
          x={-1.1}
          y={0.5}
          width={2.2}
          height={0.6}
          rx={0.2}
        />
      </g>
      {asleep && (
        <g className='guard__zz'>
          <text x={2} y={-11}>
            z
          </text>
          <text x={3.6} y={-13.4} fontSize={2.6}>
            z
          </text>
        </g>
      )}
    </g>
  );
}

// A wooden gate under a little tiled roof, its two doors shut with a gold
// lock. Open, the doors are swung back to the posts and the way through
// is clear.
export function Gate({ opened }: { opened: boolean }) {
  return (
    <g className={opened ? 'gate gate--open' : 'gate'}>
      <rect className='gate__post' x={-4.6} y={-8.6} width={1.1} height={8.6} />
      <rect className='gate__post' x={3.5} y={-8.6} width={1.1} height={8.6} />
      {opened ? (
        <>
          <rect
            className='gate__door'
            x={-3.5}
            y={-7.6}
            width={1}
            height={7.4}
          />
          <rect
            className='gate__door'
            x={2.5}
            y={-7.6}
            width={1}
            height={7.4}
          />
        </>
      ) : (
        <>
          <rect
            className='gate__door'
            x={-3.5}
            y={-7.6}
            width={7}
            height={7.4}
          />
          <path
            className='gate__plank'
            d='M-1.75 -7.6 v7.4 M0 -7.6 v7.4 M1.75 -7.6 v7.4 M-3.5 -5.4 h7 M-3.5 -2.2 h7'
          />
          <rect
            className='gate__lock'
            x={-0.8}
            y={-4.6}
            width={1.6}
            height={1.6}
            rx={0.3}
          />
          <path className='gate__keyhole' d='M0 -4.1 v0.7' />
        </>
      )}
      <path
        className='tower__roof'
        d='M-6.4 -8.2 Q-5 -8.2 -4.2 -10.2 L4.2 -10.2 Q5 -8.2 6.4 -8.2 L5.4 -7.6 L-5.4 -7.6 Z'
      />
    </g>
  );
}

// A gold key lying on the street; held up by the ninja once picked up.
export function Key() {
  return (
    <g className='key'>
      <circle className='key__bow' cx={-1.6} cy={0} r={1.2} />
      <path className='key__bit' d='M-0.5 0 h3 v1 M1.6 0 v0.8' />
    </g>
  );
}

function ThingShape({
  thing,
  night,
  asleep = false,
  opened = false,
}: {
  thing: Thing;
  night: boolean;
  asleep?: boolean;
  opened?: boolean;
}) {
  if (thing.kind === 'key')
    return (
      <g transform='translate(0 -2) scale(1.4)'>
        <Key />
      </g>
    );
  if (thing.kind === 'gate') return <Gate opened={opened} />;
  if (thing.kind === 'guard')
    return <Guard facing={thing.facing ?? 'down'} asleep={asleep} />;
  if (thing.kind === 'lantern') return <Lantern on={night} />;
  if (thing.kind === 'tower') return <Tower height={thing.height} />;
  return <Bamboo />;
}

// The little ninja: a dark suit with a band of face and two eyes. When it
// bumps into the sun it screws its eyes shut.
function Ninja({ squint, holding }: { squint: boolean; holding: boolean }) {
  return (
    <g>
      {holding && (
        <g transform='translate(9.4 -5) rotate(-60)'>
          <Key />
        </g>
      )}
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
// bands and a lock; at the end its lid flies open on the gold and gems
// inside.
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
          <circle className='chest__coin' cx={-2.6} cy={-4.6} r={1} />
          <circle className='chest__coin' cx={2.7} cy={-4.6} r={1} />
          {/* And the gems on top: red, white, blue and green. */}
          {(
            [
              ['sapphire', -1.4, -7.6],
              ['diamond', 1.4, -7.6],
              ['ruby', -2.4, -6.2],
              ['emerald', 2.4, -6.2],
            ] as const
          ).map(([gem, x, y]) => (
            <g key={gem} transform={`translate(${x} ${y}) scale(1.35)`}>
              <g className={`gem gem--${gem}`}>
                <path d='M-1.3 -0.6 L-0.7 -1.3 L0.7 -1.3 L1.3 -0.6 L0 1.1 Z' />
                <path className='gem__shine' d='M-0.6 -1 L0 -1 L-0.5 -0.5 Z' />
              </g>
            </g>
          ))}
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
}) {
  const { level } = round;
  // The town as it is now: without the key once picked up, without the
  // gate once open. Its things are still drawn from the level.
  const here = town(round);
  const w = SIDE * 2 + level.width * CELL;
  const h = TOP + BOTTOM + level.rows * ROW;
  const centre = {
    x: SIDE + (level.width * CELL) / 2,
    y: TOP + (level.rows * ROW) / 2,
  };
  const SUN_R = sunR(level);
  const cells = Array.from({ length: level.width * level.rows }, (_, c) => c);
  const chest = place(round, chestCell(level));
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

  const me = place(round, at);
  const ninjaY = me.foot;

  // Things further back are drawn first, so the ones in front stand over
  // them. A key, once picked up, is gone.
  const things = level.things
    .filter((t) => !(t.kind === 'key' && round.got))
    .sort((a, b) => a.y - b.y || a.x - b.x);
  // The things in front of the ninja, nearer the bottom, stand over it: a
  // tower in front hides all of the ninja behind it but its head.
  const row = Math.floor(at / level.width);
  const front = things.filter((thing) => thing.y > row && thing.kind !== 'key');
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
              const p = place(round, thing.y * level.width + thing.x);
              return (
                <g key={i} transform={`translate(${p.cx} ${p.foot})`}>
                  <ThingShape
                    thing={thing}
                    night={false}
                    opened={round.opened}
                  />
                </g>
              );
            })}
          </g>
        </mask>
        {/* Little cobbles, as in an old town, the same in every cell. */}
        <pattern
          id={cobbles}
          patternUnits='userSpaceOnUse'
          x={SIDE}
          y={TOP}
          width={CELL}
          height={ROW}
        >
          {COBBLES.map(([x, y, w, h], i) => (
            <rect
              key={i}
              className='cobble'
              x={x}
              y={y}
              width={w}
              height={h}
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
        x={SIDE - 0.6}
        y={TOP - 0.6}
        width={level.width * CELL + 1.2}
        height={level.rows * ROW + 1.2}
        rx={1.5}
      />
      {cells.map((c) => {
        const p = place(round, c);
        // Where a wall stands, a raised block of stone, so it is plain the
        // ninja can't go there.
        if (!open(here, c))
          return (
            <g key={c}>
              <rect
                className='block__side'
                x={p.left + 0.2}
                y={p.top + 0.2}
                width={CELL - 0.4}
                height={ROW - 0.4}
                rx={1}
              />
              <rect
                className='block__top'
                x={p.left + 0.2}
                y={p.top + 0.2}
                width={CELL - 0.4}
                height={ROW - 2}
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
              height={ROW - 0.7}
              rx={1}
            />
            <rect
              x={p.left + 0.35}
              y={p.top + 0.35}
              width={CELL - 0.7}
              height={ROW - 0.7}
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
        const shade = dark(here, s);
        return (
          <g
            key={s}
            className={s === shown ? 'shadows' : 'shadows shadows--off'}
          >
            {/* Only on the street: a wall is never somewhere to hide. */}
            {[...shade]
              .filter((c) => open(here, c))
              .map((c) => {
                const p = place(round, c);
                return (
                  <rect
                    key={c}
                    className='shadow'
                    x={p.left - 0.1}
                    y={p.top - 0.1}
                    width={CELL + 0.2}
                    height={ROW + 0.2}
                    rx={1.2}
                  />
                );
              })}
          </g>
        );
      })}

      {things.map((thing, i) => {
        const p = place(round, thing.y * level.width + thing.x);
        return (
          <g key={i} transform={`translate(${p.cx} ${p.foot})`}>
            <ThingShape
              thing={thing}
              night={night}
              asleep={round.asleep?.includes(cell(level, thing.x, thing.y))}
              opened={round.opened}
            />
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
          .filter((c) => open(here, c))
          .map((c) => {
            const p = place(round, c);
            return (
              <rect
                key={c}
                className='light'
                x={p.left + 0.4}
                y={p.top + 0.4}
                width={CELL - 0.8}
                height={ROW - 0.8}
                rx={1.2}
              />
            );
          })}
        {/* The lanterns' fires, bright over the dark. */}
        {level.things
          .filter((t) => t.kind === 'lantern')
          .map((t, i) => {
            const p = place(round, cell(level, t.x, t.y));
            return (
              <g key={i} transform={`translate(${p.cx} ${p.foot})`}>
                <circle
                  className='lantern__halo'
                  cx={0}
                  cy={-6.6}
                  r={6.5}
                  style={{ fill: `url(#${glow})` }}
                />
                <rect
                  className='lantern__fire'
                  x={-1}
                  y={-7.8}
                  width={2}
                  height={1.9}
                  rx={0.3}
                />
              </g>
            );
          })}
      </g>

      {/* Where the guards that are awake look, lit by their lamps, day and
          night: the ninja can't go there. */}
      <g className='gaze'>
        {[...seen(here, round.asleep)].map((c) => {
          const p = place(round, c);
          return (
            <rect
              key={c}
              className='gaze__cell'
              x={p.left + 0.4}
              y={p.top + 0.4}
              width={CELL - 0.8}
              height={ROW - 0.8}
              rx={1.2}
            />
          );
        })}
      </g>

      {/* The shelter over the start, always in the shade. */}
      <g
        transform={`translate(${place(round, level.start).cx} ${place(round, level.start).foot})`}
      >
        <Shelter />
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
          <g transform='scale(0.8) translate(-5 0)'>
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
              <Ninja
                squint={squint > 0}
                holding={!!round.got && !round.opened}
              />
            </g>
          </g>
        </g>
      </g>

      {/* A tap on a cell sends the ninja there. */}
      {cells.map((c) => {
        const p = place(round, c);
        return (
          <rect
            key={c}
            className='column'
            x={p.left}
            y={p.top}
            width={CELL}
            height={ROW}
            onClick={() => onCell(c)}
          >
            <title>
              {c === chestCell(level)
                ? t.chest
                : thingAt(here, c)?.kind === 'guard'
                  ? t.guard
                  : thingAt(here, c)?.kind === 'gate'
                    ? t.gate
                    : thingAt(here, c)?.kind === 'key'
                      ? t.key
                      : t.ground}
            </title>
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
