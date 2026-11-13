import { useEffect, useRef, useState } from 'react';

import { Board, STEP_MS } from './components/Board';
import { Confetti } from './components/Confetti';
import { HomeLink } from './components/HomeLink';
import { Icon } from './components/Icon';
import { SettingsView } from './components/Menu';
import {
  canMoveSun,
  initialStats,
  initialStore,
  isSolved,
  moveSun,
  newRound,
  tryWalk,
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

type View = 'play' | 'settings';

// How long the samurai stays awake when the ninja steps into the sun.
const AWAKE_MS = 1300;
// How long the ninja stands frozen in the sun before it runs back.
const FROZEN_MS = 350;

export default function App() {
  // Keys are prefixed: other apps on the same GitHub Pages origin share
  // this storage.
  const [store, setStore] = useStoredState<Store>('shadow', initialStore);
  const [stats, setStats] = useStoredState<Stats>('shadow-stats', initialStats);
  // A game saved before the gate came in has no gate: start it again.
  const round = store.round.level.gate === undefined ? newRound() : store.round;

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
  const [sunWobble, setSunWobble] = useState(0);
  // Where the ninja is shown while it is out in the sun, before it runs
  // back to where it was; null the rest of the time.
  const [out, setOut] = useState<number | null>(null);
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

  const onCell = (x: number) => {
    if (solved || busy) return;
    const walk = tryWalk(round, x);
    if (!walk) return;
    const { path, ok } = walk;
    if (!ok) return intoTheSun(path);
    const next = { ...round, ninja: x };
    const won = isSolved(next);
    // At the gate the ninja walks on through it, a step and a half more.
    const walking = won ? path.length + 1.5 : path.length;
    setSteps(walking);
    setStore({ round: next });
    path.forEach((_, i) => later(i * STEP_MS, () => plop('step')));
    if (won) {
      setStats({ solved: stats.solved + 1 });
      later(walking * STEP_MS, () => {
        setCelebrating(true);
        cheer();
      });
    }
  };

  const onSun = (s: Sun) => {
    if (solved || busy || s === round.sun) return;
    // The sun won't go where it would leave the ninja out in the open.
    if (!canMoveSun(round, s)) {
      plop('no');
      setSunWobble(Date.now());
      setSquint(Date.now());
      later(700, () => setSquint(0));
      return;
    }
    plop('sun');
    setStore({ round: moveSun(round, s) });
  };

  const again = () => {
    setSteps(0);
    setStore({ round: newRound(round.level) });
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
              <button className='button button--small' onClick={again}>
                {t.newGame}
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
              sunWobble={sunWobble}
              onCell={onCell}
              onSun={onSun}
              t={t}
            />
          </div>

          {solved && (
            <section
              className='card solved'
              style={{ animationDelay: `${steps * STEP_MS}ms` }}
            >
              <h2>{t.solved}</h2>
              <div className='solved__actions'>
                <button className='button' onClick={again}>
                  {t.next}
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
