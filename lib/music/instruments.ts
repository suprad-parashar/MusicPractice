export type InstrumentId = 'sine' | 'piano' | 'violin' | 'flute' | 'harmonium' | 'sitar';

export const INSTRUMENT_OPTIONS: { id: InstrumentId; label: string }[] = [
  { id: 'piano', label: 'Piano' },
  { id: 'violin', label: 'Violin' },
  { id: 'flute', label: 'Flute' },
  { id: 'harmonium', label: 'Harmonium' },
  { id: 'sitar', label: 'Sitar' },
  { id: 'sine', label: 'Sine' },
];
