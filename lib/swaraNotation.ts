// Swara notation mappings for different scripts
// Dots and dashes (octave indicators, continuation) remain the same across languages

export type NotationLanguage = 'english' | 'devanagari' | 'kannada';

// Base swaras: S, R, G, M, P, D, N (first char of any variant like R1, G2, etc.)
const SWARA_TO_SCRIPT: Record<NotationLanguage, Record<string, string>> = {
  english: {
    S: 'S',
    R: 'R',
    G: 'G',
    M: 'M',
    P: 'P',
    D: 'D',
    N: 'N',
  },
  devanagari: {
    S: 'स',
    R: 'रि',
    G: 'ग',
    M: 'म',
    P: 'प',
    D: 'ध',
    N: 'नि',
  },
  kannada: {
    S: 'ಸ',
    R: 'ರಿ',
    G: 'ಗ',
    M: 'ಮ',
    P: 'ಪ',
    D: 'ಧ',
    N: 'ನಿ',
  },
};

export const NOTATION_LANGUAGES: { value: NotationLanguage; label: string }[] = [
  { value: 'english', label: 'English' },
  { value: 'devanagari', label: 'Devanagari' },
  { value: 'kannada', label: 'Kannada' },
];

export function getSwaraInScript(baseSwara: string, language: NotationLanguage): string {
  const upper = baseSwara.toUpperCase();
  const map = SWARA_TO_SCRIPT[language];
  return map[upper] ?? upper;
}
