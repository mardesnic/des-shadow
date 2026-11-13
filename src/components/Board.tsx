import { useState } from 'react';

import {
  SUNS,
  dark,
  gateCell,
  xy,
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
const SIDE = 16;
const TOP = 20;
const BOTTOM = 14;

// The sun goes round the town on a circle, so it moves from side to side
// over the corners instead of cutting across.
const SUN_R = 38;
const ANGLE: Record<Sun, number> = {
  north: 0,
  east: 90,
  south: 180,
  west: 270,
};

// Where a cell is: its left, its top, and the spot low in the middle of it
// that things and the ninja stand on.
function place(round: Round, c: number) {
  const [x, y] = xy(round.level, c);
  const left = SIDE + x * CELL;
  const top = TOP + y * ROW;
  return { left, top, cx: left + CELL / 2, foot: top + ROW - 1.5 };
}

// A pagoda seen from the front and a little above: a white wall between red
// posts and a dark curved roof on every floor, one floor for each cell of
// its height, and a gold spire on top.
function Tower({ height }: { height: number }) {
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

function ThingShape({ thing }: { thing: Thing }) {
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
  const cells = Array.from({ length: level.width * level.rows }, (_, c) => c);
  const gate = place(round, gateCell(level));

  // The sun turns the short way round to its new side.
  const [angle, setAngle] = useState(ANGLE[round.sun]);
  const [was, setWas] = useState(round.sun);
  if (was !== round.sun) {
    setWas(round.sun);
    setAngle(
      (a) => a + ((((ANGLE[round.sun] - a + 540) % 360) + 360) % 360) - 180
    );
  }

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
        return (
          <rect
            key={c}
            className='stone'
            x={p.left + 0.35}
            y={p.top + 0.35}
            width={CELL - 0.7}
            height={ROW - 0.7}
            rx={1}
          />
        );
      })}

      {/* The shadows for each side the sun can be on; only the one for
          where it is shows, and they fade into each other. One see-through
          layer each, so overlapping shadows are no darker. */}
      {SUNS.map((s) => {
        const shade = dark(level, s);
        return (
          <g
            key={s}
            className={s === round.sun ? 'shadows' : 'shadows shadows--off'}
          >
            {[...shade].map((c) => {
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
      <g transform={`translate(${gate.left} ${gate.top + 0.5}) scale(0.72)`}>
        <Gate />
      </g>
      <g
        transform={`translate(${gate.left - 3.5} ${gate.top + 0.5}) scale(0.62)`}
      >
        <Samurai awake={awake > 0} />
      </g>

      {things.map((thing, i) => {
        const p = place(round, thing.y * level.width + thing.x);
        return (
          <g key={i} transform={`translate(${p.cx} ${p.foot})`}>
            <ThingShape thing={thing} />
          </g>
        );
      })}

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

      {/* The four sides the sun can be on, and the sun, turned round. */}
      {SUNS.map((s) => {
        const a = (ANGLE[s] * Math.PI) / 180;
        const sx = centre.x + SUN_R * Math.sin(a);
        const sy = centre.y - SUN_R * Math.cos(a);
        return (
          <g key={s} className='spot' onClick={() => onSun(s)}>
            <circle className='spot__hit' cx={sx} cy={sy} r={8} />
            {s !== round.sun && (
              <circle className='spot__ring' cx={sx} cy={sy} r={4.5} />
            )}
            <title>{t.suns[s]}</title>
          </g>
        );
      })}
      <g
        className='sun'
        style={{
          transformOrigin: `${centre.x}px ${centre.y}px`,
          transform: `rotate(${angle}deg)`,
        }}
      >
        <g transform={`translate(${centre.x} ${centre.y - SUN_R})`}>
          {Array.from({ length: 8 }, (_, i) => (
            <path
              key={i}
              className='sun__ray'
              d='M0 -6 L0 -7.8'
              transform={`rotate(${i * 45})`}
            />
          ))}
          <circle className='sun__disc' r={4.6} />
        </g>
      </g>
    </svg>
  );
}
