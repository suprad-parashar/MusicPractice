import { freqToMidi } from '@/lib/instrumentLoader';

/**
 * True chromatic (12-TET): consecutive semitones from the practice pitch up one octave and back.
 * Labels follow the key: the first pitch class matches `rootFreqHz` (your selected key / octave).
 */

const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Pitch-class names for 13 semitone steps from the root (inclusive of octave). */
export function chromaticNoteLabelsAsc(rootFreqHz: number): string[] {
  const rootPc = ((freqToMidi(rootFreqHz) % 12) + 12) % 12;
  const out: string[] = [];
  for (let i = 0; i <= 12; i++) {
    out.push(PITCH_CLASS_NAMES[(rootPc + i) % 12]);
  }
  return out;
}

export function chromaticNoteLabelsDesc(rootFreqHz: number): string[] {
  return [...chromaticNoteLabelsAsc(rootFreqHz)].reverse();
}

/** Semitones above the root (13 notes: root through the octave). */
export const CHROMATIC_ASC_SEMITONES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const CHROMATIC_DESC_SEMITONES = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0] as const;

/** One semitone per UI note (Ārōhaṇa then Avarōhaṇa); index aligns with flattened note grid. */
export const CHROMATIC_FLAT_SEMITONES = [...CHROMATIC_ASC_SEMITONES, ...CHROMATIC_DESC_SEMITONES] as const;
