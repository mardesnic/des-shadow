import { SUNS, shade, type Round, type Sun, type Thing } from '../lib/game';
import type { Strings } from '../lib/i18n';

// How long the ninja takes to walk one cell, in milliseconds.
export const STEP_MS = 220;

// The board in SVG units: each cell is 10 wide, the sky is above the ground.
const CELL = 10;
const GROUND = 56;
const HEIGHT = 70;

// Where the sun stands in the sky: low on the left in the morning, high in
// the middle at noon, low on the right in the evening.
function sunAt(sun: Sun, width: number) {
  const w = width * CELL;
  if (sun === 'morning') return { x: 8, y: 18 };
  if (sun === 'noon') return { x: w / 2, y: 9 };
  return { x: w - 8, y: 18 };
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
// headband. When the sun is in the way it screws its eyes shut.
function Ninja({ squint }: { squint: boolean }) {
  return (
    <g className='ninja__body'>
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

function Scroll({ x }: { x: number }) {
  const cx = x * CELL + 5;
  return (
    <g className='scroll'>
      <rect
        className='scroll__paper'
        x={cx - 3.5}
        y={GROUND - 6}
        width={7}
        height={5}
        rx={0.6}
      />
      <rect
        className='scroll__rod'
        x={cx - 4.2}
        y={GROUND - 6.8}
        width={8.4}
        height={1.4}
        rx={0.7}
      />
      <rect
        className='scroll__rod'
        x={cx - 4.2}
        y={GROUND - 1.6}
        width={8.4}
        height={1.4}
        rx={0.7}
      />
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
  // Changes each time the ninja meets the sun, to play the squint again.
  squint: number;
  sunWobble: number;
  onCell: (x: number) => void;
  onSun: (s: Sun) => void;
  t: Strings;
}) {
  const { level } = round;
  const w = level.width * CELL;
  const dark = shade(level, round.sun);
  const sun = sunAt(round.sun, level.width);

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

      <Scroll x={level.scroll} />

      <g
        className='ninja'
        style={{
          transform: `translateX(${round.ninja * CELL}px)`,
          transitionDuration: `${steps * STEP_MS}ms`,
        }}
      >
        <g
          key={squint}
          className={squint ? 'ninja__shake' : undefined}
          transform={`translate(0 ${GROUND})`}
        >
          <Ninja squint={squint > 0} />
        </g>
      </g>

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
          <title>{x === level.scroll ? t.scroll : t.ground}</title>
        </rect>
      ))}

      {/* The spots the sun can go to, and the sun itself. */}
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
        style={{ transform: `translate(${sun.x}px, ${sun.y}px)` }}
      >
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
    </svg>
  );
}
