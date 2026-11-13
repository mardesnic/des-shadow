import { SUNS, type Round, type Sun, type Thing } from '../lib/game';
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

// The top of the ground, where shadows lie.
const SURFACE = 7;

// How far a shadow reaches, as a share of its full length: all the way
// away from the sun in the morning and evening, and at noon just under the
// thing. Moving the sun from one side to the other, it shrinks to nothing
// and grows out the other way, as a real shadow does.
function reach(sun: Sun) {
  if (sun === 'morning') return 1;
  if (sun === 'evening') return -1;
  // At noon only the dark patch right under the thing is left.
  return 0.001;
}

// How much narrower a shadow is across the ground than the thing is wide,
// as if the top of the ground were seen from a little above.
const FLAT = 0.6;

// A thing's shadow: the thing itself, laid flat on the ground away from the
// sun, so a tower's has its roofs and a tree's its round top. Drawn reaching
// right, then stretched or turned round for the sun. It reaches a little
// past the last dark cell, so that cell looks covered.
function Shadow({ thing, sun }: { thing: Thing; sun: Sun }) {
  const base = thing.x * CELL + CELL / 2;
  const mid = GROUND + SURFACE / 2;
  const tall = thing.height * CELL;
  const along = (tall + CELL / 2) / tall;
  // Height above the ground becomes distance along it, and side to side
  // becomes across it.
  const lay = `matrix(0 ${FLAT} ${-along} 0 ${base + GROUND * along} ${mid - base * FLAT})`;
  return (
    <g>
      {/* Right under the thing it is always dark, in its shape. */}
      {thing.kind === 'tower' ? (
        <rect
          className='shadow'
          x={thing.x * CELL + 0.5}
          y={mid - (CELL / 2) * FLAT}
          width={CELL - 1}
          height={CELL * FLAT}
          rx={0.8}
        />
      ) : (
        <ellipse
          className='shadow'
          cx={base}
          cy={mid}
          rx={CELL / 2}
          ry={(CELL / 2) * FLAT * (thing.kind === 'bush' ? 1 : 0.7)}
        />
      )}
      <g
        className='shadow__cast'
        style={{
          transformOrigin: `${base}px ${mid}px`,
          transform: `scaleX(${reach(sun)})`,
        }}
      >
        <g className='shadow__shape' transform={lay}>
          <ThingShape thing={thing} flat />
        </g>
      </g>
    </g>
  );
}

// `flat` is for its shadow: there a tower's sloping roofs would look like
// arrows, so they are drawn as plain eaves.
function ThingShape({ thing, flat }: { thing: Thing; flat?: boolean }) {
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
  // A cherry tree in bloom: a dark trunk and a cloud of pink blossom.
  if (thing.kind === 'tree')
    return (
      <g className='tree'>
        <path
          className='tree__trunk'
          d={`M${x + 4} ${GROUND} L${x + 4.4} ${top + 9} L${x + 3} ${top + 6.5} L${x + 4.9} ${top + 8} L${x + 5.6} ${top + 6} L${x + 5.7} ${top + 9} L${x + 6} ${GROUND} Z`}
        />
        <circle className='tree__crown' cx={x + 5} cy={top + 5} r={4} />
        <circle className='tree__crown' cx={x + 2} cy={top + 7} r={3} />
        <circle className='tree__crown' cx={x + 8} cy={top + 7} r={3} />
        {!flat && (
          <>
            <circle className='tree__petal' cx={x + 3.5} cy={top + 4} r={0.7} />
            <circle className='tree__petal' cx={x + 7} cy={top + 5} r={0.7} />
            <circle className='tree__petal' cx={x + 5} cy={top + 7.5} r={0.7} />
            <circle className='tree__petal' cx={x + 1.5} cy={top + 8} r={0.6} />
            <circle
              className='tree__petal'
              cx={x + 8.6}
              cy={top + 8.2}
              r={0.6}
            />
          </>
        )}
      </g>
    );
  // A narrow pagoda: white walls between red posts, and a dark roof with
  // turned-up tips on every floor, and a spire on top.
  return (
    <g className='tower'>
      <rect
        className='tower__wall'
        x={x + 2}
        y={top + 3}
        width={6}
        height={GROUND - top - 3}
      />
      {!flat && (
        <>
          <rect
            className='tower__post'
            x={x + 2}
            y={top + 3}
            width={1}
            height={GROUND - top - 3}
          />
          <rect
            className='tower__post'
            x={x + 7}
            y={top + 3}
            width={1}
            height={GROUND - top - 3}
          />
          <path
            className='tower__spire'
            d={`M${x + 5} ${top + 1.5} V${top - 3}`}
          />
          <circle
            className='tower__spire-ball'
            cx={x + 5}
            cy={top - 3.2}
            r={0.7}
          />
        </>
      )}
      {Array.from({ length: thing.height }, (_, i) => {
        const y = top + i * CELL;
        return (
          <g key={i}>
            <path
              className='tower__roof'
              d={
                flat
                  ? `M${x - 0.5} ${y + 1.5} H${x + 10.5} V${y + 4} H${x - 0.5} Z`
                  : `M${x - 1} ${y + 2.6} Q${x + 1.2} ${y + 3.6} ${x + 3} ${y + 1} L${x + 7} ${y + 1} Q${x + 8.8} ${y + 3.6} ${x + 11} ${y + 2.6} L${x + 10} ${y + 4.2} L${x} ${y + 4.2} Z`
              }
            />
            {!flat && (
              <rect
                className='tower__window'
                x={x + 3.8}
                y={y + 5.6}
                width={2.4}
                height={2.6}
                rx={0.3}
              />
            )}
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
            <text className='samurai__alert' x={-8.5} y={-13}>
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
  awake,
  out,
  onCell,
  onSun,
  t,
}: {
  round: Round;
  // How many cells the ninja is walking now, for how long it takes.
  steps: number;
  // Set while the ninja screws its eyes shut, and while the samurai is up.
  squint: number;
  awake: number;
  // Where the ninja stands out in the sun, before it runs back.
  out: number | null;
  onCell: (x: number) => void;
  onSun: (s: Sun) => void;
  t: Strings;
}) {
  const { level } = round;
  const w = level.width * CELL;
  const solved = round.ninja === level.gate;
  const centre = { x: w / 2, y: NOON_Y + ARC_R };
  // Once at the gate, the ninja slips through it and off the board.
  const ninjaX = solved ? level.width + 0.5 : (out ?? round.ninja);

  return (
    <svg
      className={`board board--${round.sun}`}
      viewBox={`0 0 ${w} ${HEIGHT}`}
      style={{ '--ratio': w / HEIGHT } as React.CSSProperties}
      role='group'
      aria-label={t.title}
    >
      <rect className='sky' x={0} y={0} width={w} height={GROUND} />

      {/* The ground, its sunny top, and the shadows lying on it. */}
      <rect
        className='ground'
        x={0}
        y={GROUND}
        width={w}
        height={HEIGHT - GROUND}
      />
      <rect className='surface' x={0} y={GROUND} width={w} height={SURFACE} />
      {/* One see-through layer, so two shadows on top of each other are
          no darker than one. */}
      <g className='shadows'>
        {level.things.map((thing) => (
          <Shadow key={thing.x} thing={thing} sun={round.sun} />
        ))}
      </g>

      {level.things.map((thing) => (
        <ThingShape key={thing.x} thing={thing} />
      ))}

      <Samurai x={level.gate} awake={awake > 0} />

      <g
        className='ninja'
        style={{
          transform: `translateX(${ninjaX * CELL}px)`,
          transitionDuration: `${steps * STEP_MS}ms`,
        }}
      >
        <g transform={`translate(0 ${GROUND})`}>
          <g className={squint ? 'ninja__pose ninja--crouch' : 'ninja__pose'}>
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
          <g>
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
