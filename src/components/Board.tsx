import { SUNS, shade, type Round, type Sun, type Thing } from '../lib/game';
import type { Strings } from '../lib/i18n';

// How long the ninja takes to walk one cell, in milliseconds.
export const STEP_MS = 220;

// The board in SVG units: each cell is 10 wide, the sky is above the ground.
const CELL = 10;
const GROUND = 56;
const HEIGHT = 70;

// The sun goes round an arc, so from morning to evening it rises over the
// top at noon instead of cutting straight across. The arc's middle is far
// below the board; the sun is turned round it.
const ARC_R = 80;
const NOON_Y = 9;
const ANGLE: Record<Sun, number> = { morning: -27.5, noon: 0, evening: 27.5 };

function sunAt(sun: Sun, width: number) {
  const a = (ANGLE[sun] * Math.PI) / 180;
  return {
    x: (width * CELL) / 2 + ARC_R * Math.sin(a),
    y: NOON_Y + ARC_R - ARC_R * Math.cos(a),
  };
}

function ThingShape({ thing }: { thing: Thing }) {
  const x = thing.x * CELL;
  const top = GROUND - thing.height * CELL;
  if (thing.kind === 'bush')
    return (
      <g className='bush'>
        <circle cx={x + 3} cy={GROUND - 3} r={3.5} />
        <circle cx={x + 7} cy={GROUND - 3} r={3.5} />
        <circle cx={x + 5} cy={GROUND - 6} r={3.8} />
      </g>
    );
  if (thing.kind === 'tree')
    return (
      <g className='tree'>
        <rect
          className='tree__trunk'
          x={x + 4}
          y={top + 9}
          width={2}
          height={GROUND - top - 9}
        />
        <circle className='tree__crown' cx={x + 5} cy={top + 6} r={5.5} />
      </g>
    );
  // A narrow tower with a little roof on every floor.
  return (
    <g className='tower'>
      <rect
        className='tower__wall'
        x={x + 1.5}
        y={top + 3}
        width={7}
        height={GROUND - top - 3}
      />
      {Array.from({ length: thing.height }, (_, i) => {
        const y = top + i * CELL;
        return (
          <g key={i}>
            <path
              className='tower__roof'
              d={`M${x - 0.5} ${y + 4} L${x + 5} ${y} L${x + 10.5} ${y + 4} Z`}
            />
            <rect
              className='tower__window'
              x={x + 4}
              y={y + 5.5}
              width={2}
              height={2.5}
              rx={1}
            />
          </g>
        );
      })}
    </g>
  );
}

// The little ninja: a dark suit with a band of face, two eyes and a red
// headband. When it bumps into the sun it screws its eyes shut.
function Ninja({ squint }: { squint: boolean }) {
  return (
    <g>
      <path className='ninja__band' d='M6.4 -8.2 L9 -9.5 M6.4 -8.2 L8.6 -7' />
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

// The gate at the end of the street, which the ninja slips through.
function Gate({ x }: { x: number }) {
  const left = x * CELL;
  return (
    <g className='gate'>
      <rect
        className='gate__post'
        x={left + 1}
        y={GROUND - 16}
        width={1.6}
        height={16}
      />
      <rect
        className='gate__post'
        x={left + 7.4}
        y={GROUND - 16}
        width={1.6}
        height={16}
      />
      <rect
        className='gate__beam'
        x={left - 0.5}
        y={GROUND - 17.5}
        width={11}
        height={2}
        rx={0.6}
      />
      <rect
        className='gate__beam'
        x={left + 0.5}
        y={GROUND - 13.5}
        width={9}
        height={1.2}
      />
    </g>
  );
}

// The samurai dozing in the gate. The ninja has to sneak past without
// waking him. When it bumps into the sun he wakes for a moment, looks
// round, and nods off again.
function Samurai({ x, awake }: { x: number; awake: boolean }) {
  const cx = x * CELL + 5;
  return (
    // The shake goes on an inner group: a CSS animation would replace the
    // outer one's place on the board.
    <g transform={`translate(${cx} ${GROUND})`}>
      <g className={awake ? 'samurai--awake' : undefined}>
        {/* Legs crossed on the ground, the body, the head and the helmet. */}
        <ellipse className='samurai__robe' cx={0} cy={-1.3} rx={4.6} ry={1.6} />
        <path
          className='samurai__robe'
          d='M-3 -1.5 L-2.2 -7 L2.2 -7 L3 -1.5 Z'
        />
        <circle className='samurai__face' cx={0} cy={-9.2} r={2.4} />
        <path className='samurai__helmet' d='M-3 -9.6 Q0 -14 3 -9.6 Z' />
        <path
          className='samurai__horns'
          d='M-1.6 -12.2 L-3.2 -14.6 M1.6 -12.2 L3.2 -14.6'
        />
        {awake ? (
          <>
            <circle className='samurai__eye' cx={-0.9} cy={-9} r={0.45} />
            <circle className='samurai__eye' cx={0.9} cy={-9} r={0.45} />
            <text className='samurai__alert' x={-6} y={-12}>
              !
            </text>
          </>
        ) : (
          <>
            <path
              className='samurai__shut'
              d='M-1.5 -9 q0.6 0.5 1.2 0 M0.3 -9 q0.6 0.5 1.2 0'
            />
            <g className='zzz'>
              <text x={-5.5} y={-13}>
                z
              </text>
              <text x={-7.5} y={-16}>
                z
              </text>
              <text x={-10} y={-19.5}>
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
  steps,
  squint,
  sunWobble,
  onCell,
  onSun,
  t,
}: {
  round: Round;
  // How many cells the ninja is walking now, for how long it takes.
  steps: number;
  // Set while the ninja has just bumped into the sun.
  squint: number;
  sunWobble: number;
  onCell: (x: number) => void;
  onSun: (s: Sun) => void;
  t: Strings;
}) {
  const { level } = round;
  const w = level.width * CELL;
  const dark = shade(level, round.sun);
  const solved = round.ninja === level.gate;
  const centre = { x: w / 2, y: NOON_Y + ARC_R };
  // Once at the gate, the ninja slips through it and off the board.
  const ninjaX = solved ? level.width + 0.5 : round.ninja;

  return (
    <svg
      className={`board board--${round.sun}`}
      viewBox={`0 0 ${w} ${HEIGHT}`}
      style={{ '--ratio': w / HEIGHT } as React.CSSProperties}
      role='group'
      aria-label={t.title}
    >
      <rect className='sky' x={0} y={0} width={w} height={GROUND} />

      {/* The ground: each cell bright in the sun or dark in the shadow. */}
      <rect
        className='ground'
        x={0}
        y={GROUND}
        width={w}
        height={HEIGHT - GROUND}
      />
      {Array.from({ length: level.width }, (_, x) => (
        <rect
          key={x}
          className={dark.has(x) ? 'cell cell--dark' : 'cell'}
          x={x * CELL + 0.4}
          y={GROUND + 0.6}
          width={CELL - 0.8}
          height={4}
          rx={1}
        />
      ))}

      {level.things.map((thing) => (
        <ThingShape key={thing.x} thing={thing} />
      ))}

      <Samurai x={level.gate} awake={squint > 0} />

      <g
        className='ninja'
        style={{
          transform: `translateX(${ninjaX * CELL}px)`,
          transitionDuration: `${steps * STEP_MS}ms`,
        }}
      >
        <g transform={`translate(0 ${GROUND})`}>
          <g key={squint} className={squint ? 'ninja__shake' : undefined}>
            <Ninja squint={squint > 0} />
          </g>
        </g>
      </g>

      {/* The gate goes in front, so the ninja walks through it. */}
      <Gate x={level.gate} />

      {/* A tap anywhere on a cell, from the ground up, sends the ninja. */}
      {Array.from({ length: level.width }, (_, x) => (
        <rect
          key={x}
          className='column'
          x={x * CELL}
          y={26}
          width={CELL}
          height={HEIGHT - 26}
          onClick={() => onCell(x)}
        >
          <title>{x === level.gate ? t.gate : t.ground}</title>
        </rect>
      ))}

      {/* The spots the sun can go to, and the sun, turned round the arc. */}
      {SUNS.map((s) => {
        const at = sunAt(s, level.width);
        return (
          <g key={s} className='spot' onClick={() => onSun(s)}>
            <circle className='spot__hit' cx={at.x} cy={at.y} r={8} />
            {s !== round.sun && (
              <circle className='spot__ring' cx={at.x} cy={at.y} r={4.5} />
            )}
            <title>{t.suns[s]}</title>
          </g>
        );
      })}
      <g
        className='sun'
        style={{
          transformOrigin: `${centre.x}px ${centre.y}px`,
          transform: `rotate(${ANGLE[round.sun]}deg)`,
        }}
      >
        <g transform={`translate(${centre.x} ${NOON_Y})`}>
          <g key={sunWobble} className={sunWobble ? 'sun__shake' : undefined}>
            {Array.from({ length: 8 }, (_, i) => (
              <path
                key={i}
                className='sun__ray'
                d='M0 -6.5 L0 -8.5'
                transform={`rotate(${i * 45})`}
              />
            ))}
            <circle className='sun__disc' r={5} />
          </g>
        </g>
      </g>
    </svg>
  );
}
