import { LEVELS, WORLDS } from '../lib/game';
import type { Strings } from '../lib/i18n';

// Every level, by world. For now every level is open, to try them all.
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
            <span className='world__name'>{t.worlds[world]}</span>
            <div className='levels'>
              {levels.map((level) => {
                const n = LEVELS.indexOf(level) + 1;
                return (
                  <button
                    key={level.id}
                    className={[
                      'level',
                      won.includes(level.id) && 'level--won',
                      level.id === current && 'level--current',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => onPick(level.id)}
                    aria-label={t.level(n)}
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
