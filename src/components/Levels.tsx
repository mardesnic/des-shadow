import { ALL_OPEN, LEVELS, WORLDS, isOpen, type World } from '../lib/game';
import type { Strings } from '../lib/i18n';
import { Guard, Lantern } from './Board';

// Each world's picture: a lit stone lantern for the nights, a guard for
// the guards.
function WorldIcon({ world }: { world: World }) {
  return world === 'guards' ? (
    <svg className='world__icon' viewBox='-6 -13.5 12 14' aria-hidden>
      <Guard facing='down' asleep={false} />
    </svg>
  ) : (
    <svg className='world__icon' viewBox='-6 -13 12 14' aria-hidden>
      <Lantern on />
    </svg>
  );
}

// Every level, by world. A level opens once the one before it is won.
export function Levels({
  current,
  won,
  onPick,
  t,
}: {
  current: string;
  won: string[];
  onPick: (id: string) => void;
  t: Strings;
}) {
  return (
    <section className='card'>
      <h2>{t.levels}</h2>
      {WORLDS.map((world) => {
        const levels = LEVELS.filter((l) => l.world === world);
        if (!levels.length) return null;
        return (
          <div
            key={world}
            className='world'
            role='group'
            aria-label={t.worlds[world]}
          >
            <div className='world__name'>
              <WorldIcon world={world} />
            </div>
            <div className='levels'>
              {levels.map((level) => {
                const n = LEVELS.indexOf(level) + 1;
                const done = won.includes(level.id);
                const open = ALL_OPEN || isOpen(level.id, won, current);
                return (
                  <button
                    key={level.id}
                    className={[
                      'level',
                      done && 'level--won',
                      level.id === current && 'level--current',
                      !open && 'level--locked',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => onPick(level.id)}
                    disabled={!open}
                    aria-label={
                      done
                        ? `${t.level(n)}, ${t.won}`
                        : open
                          ? t.level(n)
                          : `${t.level(n)}, ${t.locked}`
                    }
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
