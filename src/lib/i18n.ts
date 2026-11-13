import type { Sun, World } from './game';

export const LANGS = ['en', 'hr'] as const;
export type Lang = (typeof LANGS)[number];
export type Language = 'auto' | Lang;

// Each language's name in that language, for the picker.
export const LANG_NAMES: Record<Lang, string> = {
  en: 'English',
  hr: 'Hrvatski',
};

export function detectLang(): Lang {
  const preferred = navigator.languages ?? [navigator.language];
  return preferred.some((l) => l.toLowerCase().startsWith('hr')) ? 'hr' : 'en';
}

const en = {
  title: 'Shadow',
  levels: 'Levels',
  level: (n: number) => `Level ${n}`,
  worlds: {
    town: 'Town',
  } as Record<World, string>,
  clear: 'Start over',
  settings: 'Settings',
  close: 'Close',
  suns: {
    north: 'Sun at the top',
    east: 'Sun on the right',
    south: 'Sun at the bottom',
    west: 'Sun on the left',
  } as Record<Sun, string>,
  ground: 'Go here',
  gate: 'Gate',
  solved: 'Well done!',
  finale: 'You did it all!',
  next: 'Next',
  changeLevel: 'Change level',
  language: 'Language',
  automatic: 'Automatic',
  sound: 'Sound and vibration',
  on: 'On',
  off: 'Off',
  statistics: 'Statistics',
  solvedColumn: 'Solved',
  allGames: 'All games',
  source: 'Source',
  version: 'Version',
};

export type Strings = typeof en;

const hr: Strings = {
  title: 'Sjena',
  levels: 'Razine',
  level: (n: number) => `Razina ${n}`,
  worlds: {
    town: 'Grad',
  },
  clear: 'Ispočetka',
  settings: 'Postavke',
  close: 'Zatvori',
  suns: {
    north: 'Sunce gore',
    east: 'Sunce desno',
    south: 'Sunce dolje',
    west: 'Sunce lijevo',
  },
  ground: 'Idi ovamo',
  gate: 'Vrata',
  solved: 'Bravo!',
  finale: 'Sve je riješeno!',
  next: 'Dalje',
  changeLevel: 'Promijeni razinu',
  language: 'Jezik',
  automatic: 'Automatski',
  sound: 'Zvuk i vibracija',
  on: 'Uključeno',
  off: 'Isključeno',
  statistics: 'Statistika',
  solvedColumn: 'Riješeno',
  allGames: 'Sve igre',
  source: 'Izvorni kod',
  version: 'Verzija',
};

export const STRINGS: Record<Lang, Strings> = { en, hr };
