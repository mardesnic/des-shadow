import { useEffect, useRef, useState } from 'react';

import { Board, STEP_MS, type Act } from './components/Board';
import { Confetti } from './components/Confetti';
import { HomeLink } from './components/HomeLink';
import { Icon } from './components/Icon';
import { Levels } from './components/Levels';
import { SettingsView } from './components/Menu';
import {
  LEVELS,
  initialStats,
  initialStore,
  isFresh,
  isSolved,
  levelById,
  moveSun,
  newRound,
  nextLevel,
  SUNS,
  tap,
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

// How long the samurai stays awake when the ninja steps into the sun.
const AWAKE_MS = 1300;
// How long the ninja stands frozen in the sun before it runs back.
const FROZEN_MS = 350;
// How long the sun takes to go over the sky, and the cloud to drift, as in
// index.css.
const SUN_MS = 500;
// How long a pushed cart takes to roll a cell, as in index.css.
const ROLL_MS = 350;

// A saved round, with its level as the game has it now; a round saved
// before the worlds came in starts again.
function load(saved: Round | undefined): Round {
  const level = saved?.level?.id ? levelById(saved.level.id) : undefined;
  if (
    !level ||
    !saved ||
    saved.things?.length !== level.things.length ||
    !SUNS.includes(saved.sun)
  )
    return newRound(level ?? LEVELS[0]);
  return { ...saved, level };
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

  const [steps, setSteps] = useState(0);
  const [squint, setSquint] = useState(0);
  const [awake, setAwake] = useState(0);
  // Where the ninja is shown while it is out in the sun, before it runs
  // back to where it was; null the rest of the time.
  const [out, setOut] = useState<number | null>(null);
  const [act, setAct] = useState<Act | null>(null);
  const [stuck, setStuck] = useState<{ x: number; at: number } | null>(null);
  // How long the cloud waits before it drifts: while the ninja walks.
  const [wait, setWait] = useState(0);
  const timers = useRef<number[]>([]);
  const later = (ms: number, fn: () => void) =>
    timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const solved = isSolved(round);
  const busy = out !== null;

  // The ninja walks out into the sun, the samurai wakes, and the ninja
  // runs back, faster, to where it was.
  const intoTheSun = (path: number[]) => {
    const there = path.length * STEP_MS;
    const back = there / 2;
    setSteps(path.length);
    setOut(path[path.length - 1]);
    path.forEach((_, i) => later(i * STEP_MS, () => plop('step')));
    later(there, () => {
      plop('no');
      setAwake(Date.now());
      setSquint(Date.now());
    });
    later(there + FROZEN_MS, () => {
      setSteps(path.length / 2);
      setOut(null);
    });
    later(there + FROZEN_MS + back, () => setSquint(0));
    later(there + AWAKE_MS, () => setAwake(0));
  };

  // Left out in the light at `from`: once the sun, the cloud or the cart
  // has moved (at `at`), the samurai wakes and the ninja runs back into the
  // dark at `to`.
  const runBack = (from: number, to: number, at: number) => {
    const cells = Math.abs(to - from);
    setOut(from);
    later(at, () => {
      plop('no');
      setAwake(Date.now());
      setSquint(Date.now());
    });
    later(at + FROZEN_MS, () => {
      setSteps(cells / 2);
      setOut(null);
    });
    later(at + FROZEN_MS + (cells / 2) * STEP_MS, () => setSquint(0));
    later(at + AWAKE_MS, () => setAwake(0));
  };

  const onCell = (x: number) => {
    if (solved || busy) return;
    const move = tap(round, x);
    if (!move) return;
    const { next } = move;
    if (move.type === 'stuck') {
      const at = Date.now();
      setAct({ type: 'push', dir: x > round.ninja ? 1 : -1, at });
      setStuck({ x, at });
      plop('no');
      return;
    }
    if (move.type !== 'walk') {
      // A push or a puff at the thing next to the ninja.
      setAct({
        type: move.type,
        dir: x > round.ninja ? 1 : -1,
        at: Date.now(),
      });
      plop(move.type === 'push' ? 'step' : 'sun');
      setWait(0);
      setStore({ round: next });
      if (next.ninja !== round.ninja) runBack(round.ninja, next.ninja, ROLL_MS);
      return;
    }
    const { path, ok } = move;
    if (!ok) return intoTheSun(path);
    const win = isSolved(next);
    // At the gate the ninja walks on through it, a step and a half more.
    const walking = win ? path.length + 1.5 : path.length;
    setSteps(walking);
    setWait(walking * STEP_MS);
    setStore({ round: next });
    path.forEach((_, i) => later(i * STEP_MS, () => plop('step')));
    // The cloud drifted off after the walk and left the ninja in the sun.
    if (next.ninja !== x) {
      setOut(x);
      later(walking * STEP_MS, () => runBack(x, next.ninja, SUN_MS));
    }
    if (win) {
      setStats({
        solved: stats.solved + 1,
        won: won.includes(round.level.id) ? won : [...won, round.level.id],
      });
      later(walking * STEP_MS, () => {
        setCelebrating(true);
        cheer();
      });
    }
  };

  const onSun = (s: Sun) => {
    if (solved || busy || s === round.sun) return;
    plop('sun');
    setWait(0);
    const next = moveSun(round, s);
    setStore({ round: next });
    // Left out in the sun: the ninja stays put while the sun goes over,
    // the samurai wakes, and the ninja runs back into the shadow.
    if (next.ninja !== round.ninja) runBack(round.ninja, next.ninja, SUN_MS);
  };

  const start = (id: string) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSteps(0);
    setOut(null);
    setAct(null);
    setStuck(null);
    setAwake(0);
    setSquint(0);
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
              round={round}
              steps={steps}
              squint={squint}
              awake={awake}
              out={out}
              act={act}
              stuck={stuck}
              wait={wait}
              onCell={onCell}
              onSun={onSun}
              t={t}
            />
          </div>

          {solved ? (
            <section
              className='card solved'
              style={{ animationDelay: `${steps * STEP_MS}ms` }}
            >
              <h2>{t.solved}</h2>
              <div className='solved__actions'>
                <button
                  className='button'
                  onClick={() => start(nextLevel(round.level.id).id)}
                >
                  {t.next}
                </button>
                <button
                  className='button button--secondary'
                  onClick={() => setView('levels')}
                >
                  {t.changeLevel}
                </button>
              </div>
            </section>
          ) : (
            <div className='bar'>
              <span className='bar__level'>
                {t.level(LEVELS.indexOf(round.level) + 1)}
              </span>
              <button
                className='tool'
                onClick={() => start(round.level.id)}
                disabled={isFresh(round) || busy}
                aria-label={t.clear}
              >
                <Icon name='clear' />
              </button>
            </div>
          )}
        </>
      )}

      {celebrating && <Confetti onDone={() => setCelebrating(false)} />}
    </main>
  );
}
