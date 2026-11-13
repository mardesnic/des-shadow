import { useEffect, useId, useState } from 'react';

import {
  SUNS,
  cell,
  dark,
  lit,
  open,
  quarters,
  QUARTER_MS,
  gateCell,
  xy,
  nextSun,
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
// enough for the sun on each side and the gate at the top.
const CELL = 10;
const ROW = 8;
const SIDE = 18;
const TOP = 23;
const BOTTOM = 18;

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

// A little arrow round the far side of the sun, the way it goes when
// tapped: clockwise. Drawn with the sun at the top, it turns with it.
const HINT = (() => {
  const r = 10.5;
  const at = (deg: number, rr = r) => {
    const a = (deg * Math.PI) / 180;
    return `${(rr * Math.sin(a)).toFixed(2)} ${(-rr * Math.cos(a)).toFixed(2)}`;
  };
  return [
    `M${at(-55)}`,
    `A${r} ${r} 0 0 1 ${at(55)}`,
    `M${at(40, r + 2.2)}`,
    `L${at(55)}`,
    `L${at(40, r - 2.2)}`,
  ].join(' ');
})();

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

// A cherry tree in bloom, which the ninja can walk under.
const CROWN = [
  [0, -10, 3.6],
  [-3, -8.4, 2.8],
  [3, -8.4, 2.8],
  [-1.8, -6.4, 2.6],
  [1.8, -6.4, 2.6],
  [0, -12.4, 2.4],
];

function Tree() {
  return (
    <g className='tree'>
      <path
        className='tree__trunk'
        d='M-1.1 0 Q-0.6 -2 -0.8 -5 L0.8 -5 Q0.6 -2 1.1 0 Z'
      />
      {(['edge', 'crown'] as const).map((part) =>
        CROWN.map(([cx, cy, r], i) => (
          <circle
            key={`${part}${i}`}
            className={`tree__${part}`}
            cx={cx}
            cy={cy}
            r={part === 'edge' ? r + 0.45 : r}
          />
        ))
      )}
      {[
        [-1.6, -11],
        [1.4, -12.6],
        [2.6, -8.6],
        [-3, -8],
        [0.4, -7.2],
        [-0.8, -9.4],
        [1.6, -10],
      ].map(([cx, cy], i) => (
        <circle
          key={i}
          className='tree__petal'
          cx={cx}
          cy={cy}
          r={i % 3 ? 0.45 : 0.6}
        />
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

function ThingShape({ thing, night }: { thing: Thing; night: boolean }) {
  if (thing.kind === 'lantern') return <Lantern on={night} />;
  if (thing.kind === 'tower') return <Tower height={thing.height} />;
  if (thing.kind === 'bamboo') return <Bamboo />;
  return <Tree />;
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

// The grand gate at the end of the street, which the ninja slips through:
// red posts with gold bands, a dark curved roof with a gold ridge and a
// little gold dragon at each end, and a gold plaque with a dragon on it.
function Gate() {
  const l = 0;
  const g = 0;
  // A curled gold dragon tail at one end of the roof; `dir` turns it.
  const dragon = (cx: number, dir: 1 | -1) =>
    `M${cx} ${g - 24.1} q${-0.6 * dir} -1.4 ${0.5 * dir} -2.2 q${1.1 * dir} -0.4 ${0.9 * dir} 0.7 q${-0.4 * dir} 0.4 ${-0.7 * dir} -0.1`;
  const post = (px: number) => (
    <g key={px}>
      <rect className='gate__post' x={px} y={g - 21} width={2.2} height={21} />
      <rect
        className='gate__gold'
        x={px - 0.3}
        y={g - 1.6}
        width={2.8}
        height={1.6}
        rx={0.3}
      />
      <rect
        className='gate__gold'
        x={px - 0.1}
        y={g - 13}
        width={2.4}
        height={0.7}
      />
    </g>
  );
  return (
    <g className='gate'>
      {post(l + 0.6)}
      {post(l + 7.2)}
      {/* The lower beam, and the plaque hanging above it. */}
      <rect
        className='gate__post'
        x={l - 0.8}
        y={g - 16.5}
        width={11.6}
        height={1.4}
      />
      <rect
        className='gate__gold'
        x={l + 3.1}
        y={g - 20.9}
        width={3.8}
        height={4.6}
        rx={0.4}
      />
      <rect
        className='gate__plaque'
        x={l + 3.6}
        y={g - 20.4}
        width={2.8}
        height={3.6}
        rx={0.2}
      />
      <path
        className='gate__dragon'
        d={`M${l + 4.1} ${g - 17.4} q0.4 -1.2 1 -0.6 q0.6 0.6 0.9 -0.6 q0.2 -0.9 -0.4 -1 q-0.5 0 -0.4 0.5`}
      />
      <circle className='gate__eye' cx={l + 5.5} cy={g - 19.4} r={0.25} />
      {/* The top beam and the roof over it. */}
      <rect
        className='gate__post'
        x={l - 0.8}
        y={g - 21.6}
        width={11.6}
        height={1.5}
      />
      <path
        className='gate__roof'
        d={`M${l - 2.2} ${g - 22.6} Q${l + 0.4} ${g - 21.9} ${l + 1.6} ${g - 24.1} L${l + 8.4} ${g - 24.1} Q${l + 9.6} ${g - 21.9} ${l + 12.2} ${g - 22.6} L${l + 11} ${g - 21.4} L${l - 1} ${g - 21.4} Z`}
      />
      <rect
        className='gate__gold'
        x={l + 1.6}
        y={g - 24.5}
        width={6.8}
        height={0.6}
        rx={0.3}
      />
      {[l + 1.5, l + 3.5, l + 5, l + 6.5, l + 8.5].map((cx) => (
        <circle
          key={cx}
          className='gate__gold'
          cx={cx}
          cy={g - 20.85}
          r={0.3}
        />
      ))}
      <path className='gate__tail' d={dragon(l + 1.8, -1)} />
      <path className='gate__tail' d={dragon(l + 8.2, 1)} />
    </g>
  );
}

// The samurai dozing in the gate. The ninja has to sneak past without
// waking him. When it bumps into the sun he wakes for a moment, looks
// round, and nods off again.
function Samurai({ awake }: { awake: boolean }) {
  return (
    // The shake goes on an inner group: a CSS animation would replace the
    // outer one's place on the board.
    <g>
      <g className={awake ? 'samurai--awake' : undefined}>
        {/* The same body as the ninja's, in a blue robe, with a helmet
            and a big moustache. */}
        <rect
          className='samurai__robe'
          x={-3}
          y={-5.5}
          width={6}
          height={5.5}
          rx={2}
        />
        <circle className='samurai__face' cx={0} cy={-7.8} r={2.8} />
        <path className='samurai__helmet' d='M-3.6 -8.8 Q0 -14.4 3.6 -8.8 Z' />
        {/* The helmet's wide brim, wider than the head. */}
        <rect
          className='samurai__helmet'
          x={-4.6}
          y={-9.4}
          width={9.2}
          height={1}
          rx={0.5}
        />
        <path
          className='samurai__moustache'
          d='M0 -6.3 q-0.9 -0.6 -1.8 0 q-0.6 0.5 -1.3 -0.1 q0.6 1.1 1.6 0.7 q0.9 -0.3 1.5 -0.6 q0.6 0.3 1.5 0.6 q1 0.4 1.6 -0.7 q-0.7 0.6 -1.3 0.1 q-0.9 -0.6 -1.8 0 Z'
        />
        {awake ? (
          <>
            <circle className='samurai__eye' cx={-1} cy={-7.5} r={0.45} />
            <circle className='samurai__eye' cx={1} cy={-7.5} r={0.45} />
            <text className='samurai__alert' x={-9.5} y={-13}>
              !
            </text>
          </>
        ) : (
          <>
            <path
              className='samurai__shut'
              d='M-1.6 -7.6 q0.6 0.5 1.2 0 M0.4 -7.6 q0.6 0.5 1.2 0'
            />
            <g className='zzz'>
              <text x={-7.5} y={-13}>
                z
              </text>
              <text x={-9.5} y={-16}>
                z
              </text>
              <text x={-12} y={-19.5}>
                Z
              </text>
            </g>
          </>
        )}
      </g>
    </g>
  );
}

export function Board({
  round,
  at,
  stepMs,
  gone,
  squint,
  awake,
  onCell,
  onSun,
  t,
}: {
  round: Round;
  // The cell the ninja is shown on, as it walks.
  at: number;
  // How long each step it takes now.
  stepMs: number;
  // Through the gate and gone.
  gone: boolean;
  // Set while the ninja screws its eyes shut, and while the samurai is up.
  squint: number;
  awake: number;
  onCell: (c: number) => void;
  onSun: (s: Sun) => void;
  t: Strings;
}) {
  const { level } = round;
  const w = SIDE * 2 + level.width * CELL;
  const h = TOP + BOTTOM + level.rows * ROW;
  const centre = {
    x: SIDE + (level.width * CELL) / 2,
    y: TOP + (level.rows * ROW) / 2,
  };
  const SUN_R = sunR(level);
  const cells = Array.from({ length: level.width * level.rows }, (_, c) => c);
  const gate = place(round, gateCell(level));
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
  if (was !== round.sun) {
    const q = quarters(was, round.sun);
    setWas(round.sun);
    setFrom(was);
    setTurn(q);
    setAngle((a) => a + q * 90);
    if (!moonOut || byMoon(was, round.sun) === null) setShown(round.sun);
  }
  useEffect(() => {
    const k = byMoon(from, round.sun);
    if (!moonOut || k === null) return;
    const q = quarters(from, round.sun);
    const ids =
      k === q
        ? [setTimeout(() => setShown('moon'), q * QUARTER_MS)]
        : [
            setTimeout(() => setShown('moon'), (k - 0.75) * QUARTER_MS),
            setTimeout(() => setShown(round.sun), (k + 0.75) * QUARTER_MS),
          ];
    return () => ids.forEach(clearTimeout);
  }, [from, moonOut, round.sun, turn]);
  const night = shown === 'moon';

  const me = place(round, at);
  const ninjaY = gone ? gate.top - 12 : me.foot;

  // Things further back are drawn first, so the ones in front stand over
  // them.
  const things = [...level.things].sort((a, b) => a.y - b.y || a.x - b.x);

  return (
    <svg
      className='board'
      viewBox={`0 0 ${w} ${h}`}
      style={{ '--ratio': w / h } as React.CSSProperties}
      role='group'
      aria-label={t.title}
    >
      <defs>
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
        // ninja can't go there; the cell under the gate is red, the goal.
        if (!open(level, c))
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
        const goal = c === gateCell(level);
        return (
          <g key={c}>
            <rect
              className={goal ? 'stone stone--goal' : 'stone'}
              x={p.left + 0.35}
              y={p.top + 0.35}
              width={CELL - 0.7}
              height={ROW - 0.7}
              rx={1}
            />
            {!goal && (
              <rect
                x={p.left + 0.35}
                y={p.top + 0.35}
                width={CELL - 0.7}
                height={ROW - 0.7}
                rx={1}
                fill={`url(#${cobbles})`}
              />
            )}
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

      {/* The gate over the top of the street, with the samurai dozing
          beside it. */}
      {/* As wide as the cell, its posts on the cell's edges; a bit
          squat, to fit over the town. */}
      <g transform={`translate(${gate.left} ${gate.top + 0.6}) scale(1 0.78)`}>
        <Gate />
      </g>
      {/* The samurai dozes beside the gate, on the side away from the
          middle, out of the way of the sun at the top. */}
      <g
        transform={`translate(${level.gate > (level.width - 1) / 2 ? gate.left + CELL + 0.6 : gate.left - 5} ${gate.top + 0.5}) scale(0.62)`}
      >
        <Samurai awake={awake > 0} />
      </g>

      {things.map((thing, i) => {
        const p = place(round, thing.y * level.width + thing.x);
        return (
          <g key={i} transform={`translate(${p.cx} ${p.foot})`}>
            <ThingShape thing={thing} night={night} />
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

      {/* The shelter over the start, always in the shade. */}
      <g
        transform={`translate(${place(round, level.start).cx} ${place(round, level.start).foot})`}
      >
        <Shelter />
      </g>

      {/* The ninja, always on top, so it is never lost behind a tower. */}
      <g
        className={gone ? 'ninja ninja--gone' : 'ninja'}
        style={{
          transform: `translate(${me.cx}px, ${ninjaY}px)`,
          transitionDuration: `${gone ? stepMs * 2 : stepMs}ms`,
        }}
      >
        <g transform='scale(0.8) translate(-5 0)'>
          <g className={squint ? 'ninja__pose ninja--crouch' : 'ninja__pose'}>
            <Ninja squint={squint > 0} />
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
            <title>{c === gateCell(level) ? t.gate : t.ground}</title>
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
        <g
          transform={`translate(${centre.x} ${centre.y - SUN_R})`}
          className='sun__tap'
          onClick={() => onSun(nextSun(level, round.sun))}
        >
          <circle className='sun__hit' r={11} />
          <path className='hint' d={HINT} />
          <title>{t.suns[nextSun(level, round.sun)]}</title>
          {Array.from({ length: 8 }, (_, i) => (
            <path
              key={i}
              className={night ? 'sun__ray sun--off' : 'sun__ray'}
              d='M0 -6 L0 -7.8'
              transform={`rotate(${i * 45})`}
            />
          ))}
          <circle
            className={night ? 'sun__disc sun--off' : 'sun__disc'}
            r={4.6}
          />
          {/* At the bottom the sun turns into the moon. */}
          <g className={night ? 'moon' : 'moon moon--off'}>
            <path
              className='moon__disc'
              d='M0 -4.6 A4.6 4.6 0 1 0 0 4.6 A6 6 0 0 1 0 -4.6 Z'
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
