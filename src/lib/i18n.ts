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
  won: 'done',
  locked: 'locked',
  level: (n: number) => `Level ${n}`,
  worlds: {
    pagoda: 'Pagodas',
    night: 'Night',
  } as Record<World, string>,
  clear: 'Start over',
  moveSun: 'Move the sun',
  settings: 'Settings',
  close: 'Close',
  suns: {
    north: 'Sun at the top',
    east: 'Sun on the right',
    moon: 'Moon',
    west: 'Sun on the left',
  } as Record<Sun, string>,
  ground: 'Go here',
  chest: 'Treasure chest',
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
  won: 'riješeno',
  locked: 'zaključano',
  level: (n: number) => `Razina ${n}`,
  worlds: {
    pagoda: 'Pagode',
    night: 'Noć',
  },
  clear: 'Ispočetka',
  moveSun: 'Pomakni sunce',
  settings: 'Postavke',
  close: 'Zatvori',
  suns: {
    north: 'Sunce gore',
    east: 'Sunce desno',
    moon: 'Mjesec',
    west: 'Sunce lijevo',
  },
  ground: 'Idi ovamo',
  chest: 'Škrinja s blagom',
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
