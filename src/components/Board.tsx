import {
  FALL,
  LIGHT,
  pushTo,
  canBlow,
  type Round,
  type Sun,
  type Thing,
} from '../lib/game';
import type { Strings } from '../lib/i18n';

// How long the ninja takes to walk one cell, in milliseconds.
export const STEP_MS = 220;

// The board in SVG units: each cell is 10 wide, the sky is above the ground.
const CELL = 10;
const GROUND = 56;
const HEIGHT = 70;

// The sun goes round an arc, so from dawn to dusk it rises over the top at
// noon instead of cutting straight across, and is low at dawn and dusk.
// The arc's middle is below the board; the sun is turned round it.
const ARC_R = 50;
const NOON_Y = 8;
const ANGLE: Record<Sun, number> = {
  dawn: -40,
  morning: -23,
  noon: 0,
  evening: 23,
  dusk: 40,
};

function sunAt(sun: Sun, width: number) {
  const a = (ANGLE[sun] * Math.PI) / 180;
  return {
    x: (width * CELL) / 2 + ARC_R * Math.sin(a),
    y: NOON_Y + ARC_R - ARC_R * Math.cos(a),
  };
}

// The top of the ground, where shadows lie.
const SURFACE = 7;

// How far a shadow reaches, as a share of the shape laid flat: away from
// the sun, twice as long when the sun is low, and at noon just under the
// thing. Moving the sun from one side to the other, it shrinks to nothing
// and grows out the other way, as a real shadow does. The shape reaches
// half a cell past its height; so does the long one.
function reach(sun: Sun, height: number) {
  const fall = FALL[sun];
  // At noon only the dark patch right under the thing is left.
  if (!fall) return 0.001;
  const tall = height * CELL;
  return (
    (Math.sign(fall) * (Math.abs(fall) * tall + CELL / 2)) / (tall + CELL / 2)
  );
}

// The blobs of a cherry tree's crown: where each is, from the left and from
// the top of the tree, and how big.
const CROWN = [
  [5, 4.6, 4.4],
  [2, 6.2, 3.4],
  [8, 6.2, 3.4],
  [0.2, 8.8, 2.6],
  [9.8, 8.8, 2.6],
  [3.4, 9.4, 3],
  [6.6, 9.4, 3],
  [5, 7.2, 3.6],
];

// An old town's street: paving stones on top, in two staggered rows per
// cell, and big blocks of stone under them.
function Paving({ width }: { width: number }) {
  const stones: [number, number, number][] = [];
  for (let c = 0; c < width; c++) {
    stones.push([c * CELL, GROUND + 0.5, CELL]);
    stones.push([c * CELL - CELL / 2, GROUND + SURFACE / 2 + 0.2, CELL]);
  }
  stones.push([width * CELL - CELL / 2, GROUND + SURFACE / 2 + 0.2, CELL]);
  return (
    <g>
      <rect
        className='surface'
        x={0}
        y={GROUND}
        width={width * CELL}
        height={SURFACE}
      />
      {stones.map(([sx, sy, sw], i) => (
        <rect
          key={i}
          className='stone'
          x={sx + 0.35}
          y={sy}
          width={sw - 0.7}
          height={SURFACE / 2 - 0.9}
          rx={0.9}
        />
      ))}
      {Array.from({ length: Math.ceil(width / 2) + 1 }, (_, i) => (
        <rect
          key={i}
          className='block'
          x={i * CELL * 2 - CELL + 0.4}
          y={GROUND + SURFACE + 0.6}
          width={CELL * 2 - 0.8}
          height={HEIGHT - GROUND - SURFACE - 1.2}
          rx={0.8}
        />
      ))}
    </g>
  );
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
  if (thing.kind === 'lantern') return null;
  const mid = GROUND + SURFACE / 2;
  const tall = thing.height * CELL;
  const along = (tall + CELL / 2) / tall;
  // Height above the ground becomes distance along it, and side to side
  // becomes across it.
  const lay = `matrix(0 ${FLAT} ${-along} 0 ${base + GROUND * along} ${mid - base * FLAT})`;
  return (
    <g>
      {/* Right under the thing it is always dark, in its shape: from
          where it stands, at the back of the street, across to the front,
          so it touches the thing. */}
      {thing.kind === 'tower' || thing.kind === 'cart' ? (
        <rect
          className='shadow'
          x={thing.x * CELL + 0.5}
          y={GROUND}
          width={CELL - 1}
          height={SURFACE - 0.5}
          rx={1}
        />
      ) : (
        <ellipse
          className='shadow'
          cx={base}
          cy={GROUND + SURFACE / 2 - 0.3}
          rx={CELL / 2 + (thing.kind === 'tree' ? 0.6 : 0)}
          ry={SURFACE / 2 + 0.3}
        />
      )}
      <g
        className={
          sun === 'noon' ? 'shadow__cast shadow__cast--noon' : 'shadow__cast'
        }
        style={{
          transformOrigin: `${base}px ${mid}px`,
          transform: `scaleX(${reach(sun, thing.height)})`,
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
  // A clump of bamboo: green stalks with a ring at each joint, and a few
  // thin leaves. Nothing reaches above its height.
  if (thing.kind === 'bamboo') {
    const stalks = [
      [2, top + 1.5],
      [5, top],
      [8, top + 2.5],
    ];
    return (
      <g className='bamboo'>
        {/* Its shadow is the whole clump, not three thin lines. */}
        {flat && (
          <rect
            x={x + 1}
            y={top + 1}
            width={8}
            height={GROUND - top - 1}
            rx={2}
          />
        )}
        {stalks.map(([sx, sy], i) => (
          <g key={i}>
            <rect
              className='bamboo__stalk'
              x={x + sx - 0.7}
              y={sy}
              width={1.4}
              height={GROUND - sy}
              rx={0.5}
            />
            {!flat &&
              Array.from(
                { length: Math.floor((GROUND - sy - 2) / 3) },
                (_, j) => 3 * (j + 1)
              ).map((d) => (
                <rect
                  key={d}
                  className='bamboo__joint'
                  x={x + sx - 0.85}
                  y={sy + d}
                  width={1.7}
                  height={0.45}
                />
              ))}
          </g>
        ))}
        {Array.from({ length: thing.height }, (_, k) => k * CELL)
          .flatMap((y) => [
            `M${x + 2} ${top + y + 4} q-2 -0.6 -2.8 0.6 q1.6 0.4 2.8 -0.6`,
            `M${x + 5} ${top + y + 2.5} q2 -0.8 3 0.2 q-1.6 0.6 -3 -0.2`,
            `M${x + 5} ${top + y + 5.5} q-2 -0.4 -2.6 0.8 q1.4 0.2 2.6 -0.8`,
            `M${x + 8} ${top + y + 5} q2 -0.6 2.6 0.6 q-1.4 0.3 -2.6 -0.6`,
          ])
          .map((d, i) => (
            <path key={i} className='bamboo__leaf' d={d} />
          ))}
      </g>
    );
  }
  // A wooden cart piled high with hay, on two wheels, with a shaft to push
  // it by.
  if (thing.kind === 'cart')
    return (
      <g className='cart'>
        {flat ? (
          <path
            d={`M${x + 1} ${GROUND} V${top + 5} Q${x + 5} ${top - 1} ${x + 9} ${top + 5} V${GROUND} Z`}
          />
        ) : (
          <>
            <rect
              className='cart__wood'
              x={x - 1.6}
              y={GROUND - 5.6}
              width={3}
              height={0.8}
              rx={0.4}
            />
            <path
              className='cart__hay'
              d={`M${x + 1} ${GROUND - 5.5} V${top + 5} Q${x + 5} ${top - 1} ${x + 9} ${top + 5} V${GROUND - 5.5} Z`}
            />
            <path
              className='cart__straw'
              d={`M${x + 2.5} ${top + 7} q2.5 -1.2 5 0 M${x + 2} ${top + 11} q3 -1.2 6 0 M${x + 2} ${top + 14.5} q3 -1 6 0`}
            />
            <rect
              className='cart__wood'
              x={x + 0.3}
              y={GROUND - 6.2}
              width={9.4}
              height={1.8}
              rx={0.4}
            />
            {[2.8, 7.2].map((cx) => (
              <g key={cx}>
                <circle
                  className='cart__wheel'
                  cx={x + cx}
                  cy={GROUND - 2.3}
                  r={2.3}
                />
                <circle
                  className='cart__hub'
                  cx={x + cx}
                  cy={GROUND - 2.3}
                  r={0.7}
                />
              </g>
            ))}
          </>
        )}
      </g>
    );
  // A stone lantern, with a fire behind its little window while it burns.
  if (thing.kind === 'lantern') {
    const g = GROUND;
    return (
      <g className='lantern'>
        <circle
          className={
            thing.lit ? 'lantern__halo' : 'lantern__halo lantern__halo--out'
          }
          cx={x + 5}
          cy={g - 10.8}
          r={3.4}
        />
        <rect
          className='lantern__stone'
          x={x + 2.5}
          y={g - 1.6}
          width={5}
          height={1.6}
          rx={0.3}
        />
        <rect
          className='lantern__stone'
          x={x + 4}
          y={g - 8}
          width={2}
          height={6.6}
        />
        <rect
          className='lantern__stone'
          x={x + 2.8}
          y={g - 9}
          width={4.4}
          height={1.1}
          rx={0.3}
        />
        <rect
          className='lantern__stone'
          x={x + 3.2}
          y={g - 12.6}
          width={3.6}
          height={3.6}
        />
        <rect
          className={
            thing.lit ? 'lantern__fire' : 'lantern__fire lantern__fire--out'
          }
          x={x + 3.9}
          y={g - 11.9}
          width={2.2}
          height={2.2}
          rx={0.3}
        />
        <path
          className='lantern__stone'
          d={`M${x + 1.4} ${g - 12.3} Q${x + 5} ${g - 13.2} ${x + 8.6} ${g - 12.3} L${x + 6.6} ${g - 15} L${x + 3.4} ${g - 15} Z`}
        />
        <circle className='lantern__stone' cx={x + 5} cy={g - 15.6} r={0.8} />
        {!thing.lit && (
          <path
            className='lantern__smoke'
            d={`M${x + 5} ${g - 16.5} q-1.2 -1.5 0 -3 q1.2 -1.5 0 -3`}
          />
        )}
      </g>
    );
  }
  // A cherry tree in bloom: a dark trunk and a cloud of pink blossom.
  if (thing.kind === 'tree')
    return (
      <g className='tree'>
        {/* The shadow's trunk is wider, as it would look from the sun. */}
        {flat ? (
          <rect
            x={x + 2}
            y={top + 6}
            width={6}
            height={GROUND - top - 6}
            rx={1}
          />
        ) : (
          <path
            className='tree__trunk'
            d={`M${x + 2.8} ${GROUND} Q${x + 3.6} ${GROUND - 2} ${x + 3.5} ${top + 9} L${x + 2} ${top + 6.5} L${x + 4.6} ${top + 7.6} L${x + 5.2} ${top + 6} L${x + 6.2} ${top + 7.8} L${x + 6.5} ${top + 9} Q${x + 6.4} ${GROUND - 2} ${x + 7.2} ${GROUND} Z`}
          />
        )}
        {/* A full crown, from blobs that overlap; none above the top of
            the tree, so its shadow is as long as the tree is tall. First a
            slightly bigger blob in the edge colour under each, so only the
            outline of the whole crown shows, not every blob. */}
        {(['edge', 'crown'] as const).map((part) =>
          CROWN.map(([cx, cy, r], i) => (
            <circle
              key={`${part}${i}`}
              className={`tree__${part}`}
              cx={x + cx}
              cy={top + cy}
              r={part === 'edge' ? r + 0.5 : r}
            />
          ))
        )}
        {!flat &&
          [
            [3.4, 3.4],
            [6.6, 2.6],
            [5, 5.4],
            [1.4, 6.4],
            [8.6, 5.8],
            [2.8, 8.6],
            [7.4, 8],
            [0.4, 9.4],
            [9.8, 9.8],
            [5.2, 10.4],
            [4, 7.4],
            [6.4, 7],
          ].map(([cx, cy], i) => (
            <circle
              key={i}
              className='tree__petal'
              cx={x + cx}
              cy={top + cy}
              r={i % 3 ? 0.55 : 0.75}
            />
          ))}
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

// The little ninja: a dark suit with a band of face and two eyes. When it
// bumps into the sun it screws its eyes shut.
function Ninja({ squint, act }: { squint: boolean; act: Act | null }) {
  return (
    <g>
      {act?.type === 'blow' && (
        <g
          key={act.at}
          className='ninja__puff'
          transform={`translate(5 0) scale(${act.dir} 1)`}
        >
          <path d='M3.6 -8.4 h2.4 M3.8 -7.2 h3.2 M3.6 -6 h2.4' />
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

// The grand gate at the end of the street, which the ninja slips through:
// red posts with gold bands, a dark curved roof with a gold ridge and a
// little gold dragon at each end, and a gold plaque with a dragon on it.
function Gate({ x, part }: { x: number; part: 'back' | 'front' }) {
  const l = x * CELL;
  const g = GROUND;
  // A curled gold dragon tail at one end of the roof; `dir` turns it.
  const dragon = (cx: number, dir: 1 | -1) =>
    `M${cx} ${g - 24.1} q${-0.6 * dir} -1.4 ${0.5 * dir} -2.2 q${1.1 * dir} -0.4 ${0.9 * dir} 0.7 q${-0.4 * dir} 0.4 ${-0.7 * dir} -0.1`;
  // Each post: the left one stands behind the samurai, the right one in
  // front of him, so he sits in the gateway.
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
  if (part === 'front') return <g className='gate'>{post(l + 7.2)}</g>;
  return (
    <g className='gate'>
      {post(l + 0.6)}
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
function Samurai({ x, awake }: { x: number; awake: boolean }) {
  const cx = x * CELL + 4.4;
  return (
    // The shake goes on an inner group: a CSS animation would replace the
    // outer one's place on the board.
    <g transform={`translate(${cx} ${GROUND})`}>
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

// What the ninja is doing to a thing next to it, for its little push or
// puff; `at` tells one push from the next.
export type Act = { type: 'push' | 'blow'; dir: 1 | -1; at: number };

// The cloud, two cells wide, in the sky and its shadow on the ground. It
// moves after the ninja has walked, so it waits that long.
function CloudShape({ x, delay }: { x: number; delay: number }) {
  return (
    <g
      className='cloud'
      style={{
        transform: `translateX(${x * CELL}px)`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {[
        [5, 23, 3.2],
        [9.5, 20.5, 4.4],
        [14.5, 22, 3.6],
        [17.5, 24, 2.6],
      ].map(([cx, cy, r]) => (
        <circle key={cx} className='cloud__puff' cx={cx} cy={cy} r={r} />
      ))}
      <rect
        className='cloud__puff'
        x={2}
        y={22.5}
        width={17}
        height={4}
        rx={2}
      />
    </g>
  );
}

// The moon and a few stars, at night.
function NightSky({ width }: { width: number }) {
  const w = width * CELL;
  return (
    <g className='night-sky'>
      {[
        [8, 8],
        [20, 15],
        [31, 6],
        [44, 12],
        [55, 5],
        [63, 17],
        [14, 26],
        [38, 22],
      ].map(([sx, sy]) => (
        <circle key={`${sx}`} className='star' cx={sx} cy={sy} r={0.5} />
      ))}
      <circle className='moon' cx={w - 14} cy={12} r={5} />
      <circle className='moon__cut' cx={w - 11.8} cy={10.4} r={4.4} />
    </g>
  );
}

export function Board({
  round,
  steps,
  squint,
  awake,
  out,
  act,
  wait,
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
  act: Act | null;
  // How long the cloud waits before it drifts.
  wait: number;
  onCell: (x: number) => void;
  onSun: (s: Sun) => void;
  t: Strings;
}) {
  const { level } = round;
  const night = !!level.night;
  const w = level.width * CELL;
  const solved = round.ninja === level.gate;
  const centre = { x: w / 2, y: NOON_Y + ARC_R };
  // Once at the gate, the ninja slips through it and off the board.
  const ninjaX = solved ? level.width + 0.5 : (out ?? round.ninja);

  return (
    <svg
      className={`board board--${night ? 'night' : round.sun}`}
      viewBox={`0 0 ${w} ${HEIGHT}`}
      style={{ '--ratio': w / HEIGHT } as React.CSSProperties}
      role='group'
      aria-label={t.title}
    >
      <rect className='sky' x={0} y={0} width={w} height={GROUND} />
      {night && <NightSky width={level.width} />}

      {/* The stone ground, and the shadows lying on it. At night it is all
          dim, but for the light round the lanterns. */}
      <g className='dim'>
        <rect
          className='ground'
          x={0}
          y={GROUND}
          width={w}
          height={HEIGHT - GROUND}
        />
        <Paving width={level.width} />
      </g>
      {night &&
        round.things.map(
          (thing, i) =>
            thing.kind === 'lantern' && (
              <rect
                key={i}
                className={thing.lit ? 'light' : 'light light--out'}
                x={(thing.x - LIGHT) * CELL + 0.5}
                y={GROUND + 0.4}
                width={(LIGHT * 2 + 1) * CELL - 1}
                height={SURFACE - 0.8}
                rx={2.5}
              />
            )
        )}
      {/* One see-through layer, so two shadows on top of each other are
          no darker than one. Each thing is drawn where it starts and moved
          to where it is, so a pushed cart rolls. */}
      {!night && (
        <g className='shadows'>
          {round.things.map((thing, i) => (
            <g
              key={i}
              className='thing'
              style={{ transform: `translateX(${thing.x * CELL}px)` }}
            >
              <Shadow thing={{ ...thing, x: 0 }} sun={round.sun} />
            </g>
          ))}
          {round.cloud && (
            <g
              className='cloud'
              style={{
                transform: `translateX(${round.cloud.x * CELL}px)`,
                transitionDelay: `${wait}ms`,
              }}
            >
              <rect
                className='shadow'
                x={0.5}
                y={GROUND + SURFACE / 2 - (CELL / 2) * FLAT}
                width={CELL * 2 - 1}
                height={CELL * FLAT}
                rx={3}
              />
            </g>
          )}
        </g>
      )}

      {round.things.map((thing, i) => (
        <g
          key={i}
          className={thing.kind === 'lantern' ? 'thing' : 'thing dim'}
          style={{ transform: `translateX(${thing.x * CELL}px)` }}
        >
          {/* Bamboo that has grown is drawn anew, and springs up. */}
          <g key={thing.height} className={thing.grow ? 'grown' : undefined}>
            <ThingShape thing={{ ...thing, x: 0 }} />
          </g>
        </g>
      ))}

      <g className='dim'>
        <Gate x={level.gate} part='back' />
        <Samurai x={level.gate} awake={awake > 0} />
      </g>

      <g
        className='ninja'
        style={{
          transform: `translateX(${ninjaX * CELL}px)`,
          transitionDuration: `${steps * STEP_MS}ms`,
        }}
      >
        {/* It stands in the middle of the street, where the shadows lie,
            not on its back edge. */}
        <g transform={`translate(0 ${GROUND + SURFACE / 2 + 0.6})`}>
          <g className={squint ? 'ninja__pose ninja--crouch' : 'ninja__pose'}>
            <g
              key={act?.at}
              className={
                act?.type === 'push'
                  ? `ninja__act ninja__act--push${act.dir > 0 ? '' : '-left'}`
                  : 'ninja__act'
              }
            >
              <Ninja squint={squint > 0} act={act} />
            </g>
          </g>
        </g>
      </g>

      {/* The gate goes in front, so the ninja walks through it. */}
      <g className='dim'>
        <Gate x={level.gate} part='front' />
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
          <title>
            {x === level.gate
              ? t.gate
              : pushTo(round, x) !== null
                ? t.push
                : canBlow(round, x)
                  ? t.blow
                  : t.ground}
          </title>
        </rect>
      ))}

      {/* The spots the sun can go to, and the sun, turned round the arc. */}
      {level.suns.map((s) => {
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
      {!night && (
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
      )}
      {/* The cloud goes over the sun. */}
      {round.cloud && <CloudShape x={round.cloud.x} delay={wait} />}
    </svg>
  );
}
