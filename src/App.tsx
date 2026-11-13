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
  isSolved,
  levelById,
  moveSun,
  newRound,
  nextLevel,
  runWay,
  quarters,
  QUARTER_MS,
  seen,
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

// How long the samurai stays awake when the ninja steps into the sun.
const AWAKE_MS = 1300;
// How long the ninja stands frozen in the sun before it runs back.
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

  // Where the ninja is shown while it walks or runs, cell by cell; null
  // when it stands where the round has it.
  const [pos, setPos] = useState<number | null>(null);
  const [stepMs, setStepMs] = useState(STEP_MS);
  const [squint, setSquint] = useState(0);
  const [awake, setAwake] = useState(0);
  // How long the Well done card waits: until the ninja is through the gate.
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

  // Seen: the samurai wakes, the ninja ducks and runs back, fast, along
  // `back` to where it is safe.
  // Seen at `from`: the samurai wakes, and the ninja ducks and runs, fast,
  // all the way back to the start, under the parasol. The sun stays.
  const caught = (from: number, at: number, sun: Sun) => {
    const { level } = round;
    later(at, () => {
      plop('no');
      setAwake(Date.now());
      setSquint(Date.now());
    });
    later(at + FROZEN_MS, () =>
      setStore({ round: { ...round, sun, ninja: level.start } })
    );
    const home = along(
      from,
      runWay(level, from, level.start),
      STEP_MS / 2,
      at + FROZEN_MS
    );
    later(home, () => {
      setPos(null);
      setSquint(0);
    });
    later(Math.max(home, at + AWAKE_MS), () => setAwake(0));
  };

  const onCell = (c: number) => {
    if (solved || busy) return;
    const w = tryWalk(round, c);
    if (!w) return;
    const { path, ok } = w;
    const from = round.ninja;
    if (!ok) {
      // Out into the sun, and seen.
      caught(path[path.length - 1], along(from, path, STEP_MS), round.sun);
      return;
    }
    setPos(from);
    setStore({ round: { ...round, ninja: c } });
    const there = along(from, path, STEP_MS);
    later(there, () => setPos(null));
    if (isSolved({ ...round, ninja: c })) {
      // On through the gate, then the cheer.
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
    if (!seen(round, s)) return setStore({ round: moveSun(round, s) });
    // Left out in the light: the sun goes round, and then the samurai sees
    // the ninja.
    setStore({ round: { ...round, sun: s } });
    setStepMs(STEP_MS);
    setPos(round.ninja);
    caught(round.ninja, quarters(round.sun, s) * QUARTER_MS, s);
  };

  const start = (id: string) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setGame((g) => g + 1);
    setPos(null);
    setAwake(0);
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
              awake={awake}
              onCell={onCell}
              onSun={onSun}
              t={t}
            />
          </div>

          {solved ? (
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
          ) : (
            <div className='bar'>
              <span className='bar__level'>
                {t.level(LEVELS.indexOf(round.level) + 1)}
              </span>
              <button
                className='tool'
                onClick={() => start(round.level.id)}
                disabled={fresh || busy}
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
