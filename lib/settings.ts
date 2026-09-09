import { JATI_ORDER, TALA_ORDER, type JatiName, type TalaName } from '@/data/talas';
import { KEYS, type KeyName } from '@/lib/music/keys';
import { INSTRUMENT_OPTIONS, type InstrumentId } from '@/lib/music/instruments';
import { TANPURA_PATTERN_ORDER, type Octave, type TanpuraPatternId } from '@/lib/music/tanpura';
import type { NotationLanguage } from '@/lib/music/swaraNotation';
import { DEFAULT_ACCENT, DEFAULT_THEME, isAccent, isTheme, type ThemeMode } from '@/lib/theme';

export const TABS = ['raga', 'varisai', 'auditory', 'rhythm', 'compositions', 'learn'] as const;
export type Tab = (typeof TABS)[number];
export type LearnSubtab = 'carnatic' | 'sheet-music';
export type MetronomeMode = 'simple' | 'tala';

export interface Settings {
  selectedKey: KeyName;
  activeTab: Tab;
  learnSubtab: LearnSubtab;
  instrumentId: InstrumentId;
  voiceVolume: number;
  voiceOctave: Octave;
  notationLanguage: NotationLanguage;
  tanpuraVolume: number;
  tanpuraPluckDelay: number;
  tanpuraNoteLength: number;
  tanpuraOctave: Octave;
  tanpuraPattern: TanpuraPatternId;
  theme: ThemeMode;
  accentColor: string;
  metronomeMode: MetronomeMode;
  metronomeSimpleBeats: number;
  metronomeTala: TalaName;
  metronomeJati: JatiName;
  metronomeVolume: number;
}

export const DEFAULT_SETTINGS: Settings = {
  selectedKey: 'C',
  activeTab: 'raga',
  learnSubtab: 'carnatic',
  instrumentId: 'violin',
  voiceVolume: 0.8,
  voiceOctave: 'medium',
  notationLanguage: 'english',
  tanpuraVolume: 0.5,
  tanpuraPluckDelay: 1.4,
  tanpuraNoteLength: 5,
  tanpuraOctave: 'medium',
  tanpuraPattern: 'p-hs-hs-s',
  theme: DEFAULT_THEME,
  accentColor: DEFAULT_ACCENT,
  metronomeMode: 'simple',
  metronomeSimpleBeats: 4,
  metronomeTala: 'triputa',
  metronomeJati: 'chatusra',
  metronomeVolume: 0.7,
};

const oneOf = (values: readonly unknown[]) => (value: unknown) => values.includes(value);
const numberIn = (min: number, max: number) => (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

const validators: Record<keyof Settings, (value: unknown) => boolean> = {
  selectedKey: oneOf(Object.keys(KEYS)),
  activeTab: oneOf(TABS),
  learnSubtab: oneOf(['carnatic', 'sheet-music']),
  instrumentId: oneOf(INSTRUMENT_OPTIONS.map(({ id }) => id)),
  voiceVolume: numberIn(0, 1),
  voiceOctave: oneOf(['low', 'medium', 'high']),
  notationLanguage: oneOf(['english', 'devanagari', 'kannada']),
  tanpuraVolume: numberIn(0, 1),
  tanpuraPluckDelay: numberIn(0.8, 2.5),
  tanpuraNoteLength: numberIn(2, 8),
  tanpuraOctave: oneOf(['low', 'medium', 'high']),
  tanpuraPattern: oneOf(TANPURA_PATTERN_ORDER),
  theme: isTheme,
  accentColor: isAccent,
  metronomeMode: oneOf(['simple', 'tala']),
  metronomeSimpleBeats: (value) => numberIn(1, 9)(value) && Number.isInteger(value),
  metronomeTala: oneOf(TALA_ORDER),
  metronomeJati: oneOf(JATI_ORDER),
  metronomeVolume: numberIn(0, 1),
};

/** Validate at the storage boundary and retain links/settings from previous app versions. */
export function normalizeSettings(raw: unknown): Settings {
  const source =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? ({ ...raw } as Record<string, unknown>)
      : {};
  if (source.activeTab === 'sheet-music') {
    source.activeTab = 'learn';
    source.learnSubtab = 'sheet-music';
  }
  if (source.activeTab === 'voice') source.activeTab = 'varisai';
  if (source.activeTab === 'songs' || source.activeTab === 'chittaswarams')
    source.activeTab = 'compositions';
  if (source.tanpuraPattern === 'mpps') source.tanpuraPattern = 'm-hs-hs-s';
  if (source.theme === 'high-contrast') source.theme = 'dark';

  const settings = { ...DEFAULT_SETTINGS };
  for (const name of Object.keys(validators) as (keyof Settings)[]) {
    if (validators[name](source[name])) Object.assign(settings, { [name]: source[name] });
  }
  return settings;
}

export type SetSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => void;
