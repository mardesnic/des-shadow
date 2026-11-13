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
  pathTo,
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

// How long the ninja keeps its eyes shut when the sun is in the way.
const SQUINT_MS = 700;

export default function App() {
  // Keys are prefixed: other apps on the same GitHub Pages origin share
  // this storage.
  const [store, setStore] = useStoredState<Store>('shadow', initialStore);
  const [stats, setStats] = useStoredState<Stats>('shadow-stats', initialStats);
  const round = store.round;

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
  const [sunWobble, setSunWobble] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const solved = isSolved(round);

  const sunInTheWay = () => {
    plop('no');
    setSquint(Date.now());
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSquint(0), SQUINT_MS);
  };

  const onCell = (x: number) => {
    if (solved || x === round.ninja) return;
    const path = pathTo(round, x);
    if (!path) return sunInTheWay();
    const next = { ...round, ninja: x };
    setSteps(path.length);
    setStore({ round: next });
    path.forEach((_, i) => setTimeout(() => plop('step'), i * STEP_MS));
    if (isSolved(next)) {
      setStats({ solved: stats.solved + 1 });
      setTimeout(() => {
        setCelebrating(true);
        cheer();
      }, path.length * STEP_MS);
    }
  };

  const onSun = (s: Sun) => {
    if (solved || s === round.sun) return;
    if (!canMoveSun(round, s)) {
      setSunWobble(Date.now());
      return sunInTheWay();
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
