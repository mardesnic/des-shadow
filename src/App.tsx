import { useEffect, useRef, useState } from 'react';

import { Board, STEP_MS } from './components/Board';
import { Confetti } from './components/Confetti';
import { HomeLink } from './components/HomeLink';
import { Icon } from './components/Icon';
import { Levels } from './components/Levels';
import { SettingsView } from './components/Menu';
import {
  LEVELS,
  SUNS,
  initialStats,
  initialStore,
  isGate,
  isGuard,
  isSolved,
  nap,
  town,
  tryUnlock,
  unlock,
  walk,
  nextSun,
  levelById,
  moveSun,
  newRound,
  nextLevel,
  runWay,
  QUARTER_MS,
  seenAfter,
  tryNap,
  tryWalk,
  type Round,
  type Stats,
  type Store,
  type Sun,
} from './lib/game';
import { STRINGS, detectLang } from './lib/i18n';
import { popMenu, pushMenu, useBackButton } from './lib/use-back-button';
import { useCheer, usePlop } from './lib/use-cheer';
import { useLanguage, useSound } from './lib/use-shared-settings';
import { useStoredState } from './lib/use-stored-state';
import { useWakeLock } from './lib/use-wake-lock';

type View = 'play' | 'levels' | 'settings';

// How long the ninja stands frozen in the sun before it runs back.
// How long the ninja shakes its head at a way out in the sun.
const SHAKE_MS = 450;
const FROZEN_MS = 350;

// A saved round, with its level as the game has it now; a round saved by
// an older version of the game starts again.
function load(saved: Round | undefined): Round {
  const level = saved?.level?.id ? levelById(saved.level.id) : undefined;
  if (
    !level ||
    !saved ||
    saved.level.rows !== level.rows ||
    !SUNS.includes(saved.sun) ||
    !(saved.ninja >= 0 && saved.ninja < level.width * level.rows)
  )
    return newRound(level ?? LEVELS[0]);
  // Only guards there are can be asleep.
  const asleep = (saved.asleep ?? []).filter((c) => isGuard(level, c));
  // And only a key there is can be picked up, and a gate there is opened.
  const got = !!saved.got && level.things.some((t) => t.kind === 'key');
  const opened = got && !!saved.opened;
  return { ...saved, level, asleep, got, opened };
}

// The button that moves the sun on: a little sun, or the moon when night
// comes next.
// The button that moves the time on: half the sun, half the moon.
function SunIcon() {
  return (
    <svg className='icon' viewBox='-12 -12 24 24' aria-hidden='true'>
      {[180, 225, 270, 315, 360].map((a) => (
        <path
          key={a}
          className='sun-icon__ray'
          d='M0 -8.4 L0 -10.8'
          transform={`rotate(${a})`}
        />
      ))}
      <path className='sun-icon__disc' d='M0 -6 A6 6 0 0 0 0 6 Z' />
      <path className='sun-icon__moon' d='M0 -6 A6 6 0 0 1 0 6 Z' />
      <circle className='sun-icon__crater' cx={2.6} cy={-1.8} r={1.1} />
      <circle className='sun-icon__crater' cx={2.2} cy={2.4} r={0.8} />
      <path
        className='sun-icon__star'
        d='M8.6 -9.4 l0.6 1.4 1.4 0.6 -1.4 0.6 -0.6 1.4 -0.6 -1.4 -1.4 -0.6 1.4 -0.6 Z'
      />
    </svg>
  );
}

export default function App() {
  // Keys are prefixed: other apps on the same GitHub Pages origin share
  // this storage.
  const [store, setStore] = useStoredState<Store>('shadow', initialStore);
  const [stats, setStats] = useStoredState<Stats>('shadow-stats', initialStats);
  const round = load(store.round);
  const won = stats.won ?? [];

  const [language, setLanguage] = useLanguage();
  const lang = language === 'auto' ? detectLang() : language;
  const t = STRINGS[lang];
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.title;
  }, [lang, t]);

  const [view, setViewState] = useState<View>('play');
  // Settings opens over the game, so the phone's Back button closes it.
  const setView = (next: View) => {
    if (next === 'play') popMenu();
    else pushMenu();
    setViewState(next);
  };
  useBackButton(() => setViewState('play'));
  useWakeLock();
  const [sound, setSound] = useSound();
  const cheer = useCheer(sound);
  const plop = usePlop(sound);
  const [celebrating, setCelebrating] = useState(false);

  // Where the ninja is shown while it walks or runs, cell by cell; null
  // when it stands where the round has it.
  const [pos, setPos] = useState<number | null>(null);
  const [stepMs, setStepMs] = useState(STEP_MS);
  const [squint, setSquint] = useState(0);
  // How long the Well done card waits: until the ninja is at the chest.
  const [cardWait, setCardWait] = useState(0);
  // Counts the rounds started, so each starts on a fresh board.
  const [game, setGame] = useState(0);
  const timers = useRef<number[]>([]);
  const later = (ms: number, fn: () => void) =>
    timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const solved = isSolved(round);
  const last = LEVELS.indexOf(round.level) === LEVELS.length - 1;
  const busy = pos !== null;
  const fresh =
    round.sun === round.level.sun && round.ninja === round.level.start;

  // Shows the ninja going along `path` from `from`, a cell every `ms`,
  // starting at `at`; returns when it gets there.
  const along = (from: number, path: number[], ms: number, at = 0) => {
    later(at, () => {
      setStepMs(ms);
      setPos(from);
    });
    path.forEach((c, i) =>
      later(at + i * ms, () => {
        setPos(c);
        if (ms === STEP_MS) plop('step');
      })
    );
    return at + path.length * ms;
  };

  // Seen at `from`, out in the light: the ninja ducks and runs, fast,
  // all the way back to the start, under the shelter. The sun stays.
  const caught = (from: number, at: number, sun: Sun) => {
    const { level } = round;
    later(at, () => {
      plop('no');
      setSquint(Date.now());
    });
    later(at + FROZEN_MS, () =>
      setStore({ round: { ...round, sun, ninja: level.start } })
    );
    const home = along(
      from,
      runWay(town(round), from, level.start),
      STEP_MS / 2,
      at + FROZEN_MS
    );
    later(home, () => {
      setPos(null);
      setSquint(0);
    });
  };

  // A tap on a guard: the ninja sneaks up on it, through the shadow, and
  // puts it to sleep; or, with no way there, shakes its head.
  const onGuard = (c: number) => {
    if (round.asleep?.includes(c)) return;
    const n = tryNap(round, c);
    if (!n) {
      plop('no');
      setSquint(Date.now());
      later(SHAKE_MS, () => setSquint(0));
      return;
    }
    const from = round.ninja;
    setPos(from);
    const there = along(from, n.path, STEP_MS);
    later(there, () => {
      setStore({ round: nap(round, c) });
      setPos(null);
      plop('sleep');
    });
  };

  // A tap on the gate: with the key, the ninja goes up to it and opens it;
  // without, or with no way there, it shakes its head.
  const onGate = (c: number) => {
    const n = tryUnlock(round, c);
    if (!n) {
      if (round.opened) return;
      plop('no');
      setSquint(Date.now());
      later(SHAKE_MS, () => setSquint(0));
      return;
    }
    const from = round.ninja;
    setPos(from);
    const there = along(from, n.path, STEP_MS);
    later(there, () => {
      setStore({ round: unlock(round, c) });
      setPos(null);
      plop('unlock');
    });
  };

  const onCell = (c: number) => {
    if (solved || busy) return;
    if (isGuard(round.level, c)) return onGuard(c);
    if (isGate(round.level, c)) return onGate(c);
    const w = tryWalk(round, c);
    if (!w) return;
    const { path, ok, to } = w;
    const from = round.ninja;
    if (!ok) {
      // No way there through the shade: the ninja won't go out into the
      // sun, and only shakes its head.
      plop('no');
      setSquint(Date.now());
      later(SHAKE_MS, () => setSquint(0));
      return;
    }
    setPos(from);
    setStore({ round: { ...round, ninja: to } });
    const there = along(from, path, STEP_MS);
    // On the way it picks up the key, if it goes by it.
    const next = walk(round, c);
    later(there, () => {
      setPos(null);
      if (next.got && !round.got) {
        setStore({ round: next });
        plop('key');
      }
    });
    if (isSolved({ ...round, ninja: to })) {
      // Up to the chest, which opens, then the cheer.
      const through = there + 2 * STEP_MS;
      setCardWait(through);
      setStats({
        solved: stats.solved + 1,
        won: won.includes(round.level.id) ? won : [...won, round.level.id],
      });
      later(through, () => {
        setCelebrating(true);
        cheer();
      });
    }
  };

  const onSun = (s: Sun) => {
    if (solved || busy || s === round.sun) return;
    plop('sun');
    const k = seenAfter(round, s);
    if (k === null) return setStore({ round: moveSun(round, s) });
    // Left out in the light: the sun goes round, and where it first lights
    // the ninja, it is seen.
    setStore({ round: { ...round, sun: s } });
    setStepMs(STEP_MS);
    setPos(round.ninja);
    caught(round.ninja, k * QUARTER_MS, s);
  };

  const start = (id: string) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setGame((g) => g + 1);
    setPos(null);
    setSquint(0);
    setCardWait(0);
    setCelebrating(false);
    setStore({ round: newRound(levelById(id) ?? LEVELS[0]) });
    if (view !== 'play') setView('play');
  };

  return (
    <main className={view === 'play' ? 'app app--play' : 'app'}>
      <header className='header'>
        <div className='header__title'>
          <HomeLink label={t.allGames} />
          <h1>{t.title}</h1>
        </div>
        <div className='header__actions'>
          {view === 'play' ? (
            <>
              <button
                className='button button--small'
                onClick={() => setView('levels')}
              >
                {t.levels}
              </button>
              <button
                className='button button--small button--icon'
                onClick={() => setView('settings')}
                aria-label={t.settings}
              >
                <Icon name='settings' />
              </button>
            </>
          ) : (
            <button
              className='button button--small button--icon'
              onClick={() => setView('play')}
              aria-label={t.close}
            >
              <Icon name='close' />
            </button>
          )}
        </div>
      </header>

      {view === 'levels' && (
        <Levels current={round.level.id} won={won} onPick={start} t={t} />
      )}

      {view === 'settings' && (
        <>
          <SettingsView
            language={language}
            setLanguage={setLanguage}
            sound={sound}
            setSound={setSound}
            stats={stats}
            t={t}
          />
          <footer className='footer'>
            <a href='/des-kids-games/'>{t.allGames}</a>
            <a href='https://github.com/mardesnic/des-shadow'>{t.source}</a>
            <span className='footer__version'>
              {t.version} {__VERSION__}
            </span>
          </footer>
        </>
      )}

      {view === 'play' && (
        <>
          <div className='stage'>
            <Board
              key={`${round.level.id}-${game}`}
              round={round}
              at={pos ?? round.ninja}
              stepMs={stepMs}
              gone={solved && pos === null}
              squint={squint}
              onCell={onCell}
              t={t}
            />
          </div>

          {/* The bar stays, so nothing moves when the card comes up over
              the game. */}
          <div className='bar'>
            <span className='bar__level'>
              {t.level(LEVELS.indexOf(round.level) + 1)}
            </span>
            <button
              className='tool tool--sun'
              onClick={() => onSun(nextSun(round.level, round.sun))}
              disabled={busy || solved}
              aria-label={t.moveSun}
            >
              <SunIcon />
            </button>
            <button
              className='tool'
              onClick={() => start(round.level.id)}
              disabled={fresh || busy || solved}
              aria-label={t.clear}
            >
              <Icon name='clear' />
            </button>
          </div>

          {solved && (
            <section
              className='card solved'
              style={{ animationDelay: `${cardWait}ms` }}
            >
              <h2>{last ? t.finale : t.solved}</h2>
              <div className='solved__actions'>
                {!last && (
                  <button
                    className='button'
                    onClick={() => start(nextLevel(round.level.id).id)}
                  >
                    {t.next}
                  </button>
                )}
                <button
                  className='button button--secondary'
                  onClick={() => setView('levels')}
                >
                  {t.changeLevel}
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {celebrating && <Confetti onDone={() => setCelebrating(false)} />}
    </main>
  );
}
