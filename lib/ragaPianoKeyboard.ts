import { getSwarafrequency } from '@/data/ragas';
import type { Raga } from '@/data/ragas';
import { parseVarisaiNote } from '@/data/saraliVarisai';
import { freqToMidi } from '@/lib/instrumentLoader';

/** Same semitone offsets as {@link getSwarafrequency} in `data/ragas.ts`. */
function swaraSemitonesFromSa(swara: string): number {
  const cleanSwara = swara.replace(/^[><]/, '');
  const table: Record<string, number> = {
    S: 0,
    R1: 1,
    R2: 2,
    R3: 3,
    G1: 2,
    G2: 3,
    G3: 4,
    M1: 5,
    M2: 6,
    P: 7,
    D1: 8,
    D2: 9,
    D3: 10,
    N1: 9,
    N2: 10,
    N3: 11,
  };
  return table[cleanSwara] ?? 0;
}

/** Fixed keyboard span — never depends on key or raga (F#₃ … G#₅). */
export const RAGA_PIANO_START_MIDI = 54;
export const RAGA_PIANO_END_MIDI = 80;

/**
 * Frequency (Hz) for a raga note string relative to madhya ṣaḍjam `baseFreq`.
 */
export function ragaNoteToFrequency(baseFreq: number, noteStr: string): number {
  const parsed = parseVarisaiNote(noteStr);
  let freq = getSwarafrequency(baseFreq, parsed.swara);
  if (parsed.octave === 'higher') freq *= 2;
  else if (parsed.octave === 'lower') freq *= 0.5;
  return freq;
}

/** Inclusive MIDI range for the raga piano strip (fixed F#₃–G#₅). */
export function getRagaPianoRangeMidis(): { startMidi: number; endMidi: number } {
  return { startMidi: RAGA_PIANO_START_MIDI, endMidi: RAGA_PIANO_END_MIDI };
}

export function isBlackKeyMidi(midi: number): boolean {
  const pc = ((midi % 12) + 12) % 12;
  return [1, 3, 6, 8, 10].includes(pc);
}

/**
 * Black key position as % of full keyboard width (`translateX(-50%)` in the component).
 * Call with {@link keyboardStartsWithBlackKey}: the white row is prefixed by a **half-width** flex
 * spacer so F# sits in the gap before G (not overlapping the first white).
 *
 * `whiteIndexBelowBlack` is the index in `whiteMidis` of the natural below this black, or **-1** when
 * that natural is off the strip (F#₃ while F₃ is not in range).
 */
export function blackKeyStylePct(
  whiteCount: number,
  whiteIndexBelowBlack: number,
  keyboardStartsWithBlackKey: boolean
): { leftPct: number; widthPct: number } {
  if (!keyboardStartsWithBlackKey || whiteCount === 0) {
    const segPct = 100 / Math.max(1, whiteCount);
    const widthPct = segPct * 0.58;
    if (whiteIndexBelowBlack < 0) {
      return { leftPct: segPct * 0.42, widthPct };
    }
    return { leftPct: (whiteIndexBelowBlack + 1) * segPct, widthPct };
  }

  const u = 100 / (whiteCount + 0.5);
  const widthPct = u * 0.58;
  if (whiteIndexBelowBlack < 0) {
    return { leftPct: 0.5 * u, widthPct };
  }
  return { leftPct: u * (whiteIndexBelowBlack + 1.5), widthPct };
}

/**
 * ET frequency for a MIDI key: madhya Ṣaḍjam is the nearest MIDI to `baseFreq`.
 */
export function midiKeyFrequency(baseFreq: number, midi: number): number {
  const saMidi = freqToMidi(baseFreq);
  return baseFreq * Math.pow(2, (midi - saMidi) / 12);
}

/**
 * Practice keys G … B (pitch classes 7–11): show raga notes on the keyboard one octave lower
 * when that still fits the fixed F#₃–G#₅ strip.
 */
export function keyboardUsesLowerOctaveDisplay(baseFreq: number): boolean {
  const pc = ((freqToMidi(baseFreq) % 12) + 12) % 12;
  return pc >= 7 && pc <= 11;
}

/**
 * MIDI slot on the fixed piano for a raga note (may be −12 vs concert rounding when
 * {@link keyboardUsesLowerOctaveDisplay} is true).
 */
export function ragaNoteToPianoKeyMidi(baseFreq: number, noteStr: string): number {
  const parsed = parseVarisaiNote(noteStr);
  let oct = 0;
  if (parsed.octave === 'higher') oct = 12;
  else if (parsed.octave === 'lower') oct = -12;
  const m = freqToMidi(baseFreq) + oct + swaraSemitonesFromSa(parsed.swara);
  if (!keyboardUsesLowerOctaveDisplay(baseFreq)) {
    return m;
  }
  const lower = m - 12;
  if (lower >= RAGA_PIANO_START_MIDI && lower <= RAGA_PIANO_END_MIDI) {
    return lower;
  }
  return m;
}

/**
 * First raga note string in arohana ∪ avarohana order that maps to each MIDI in range (for key labels).
 */
export function buildMidiToRagaNoteLabel(
  baseFreq: number,
  raga: Pick<Raga, 'arohana' | 'avarohana'>
): Map<number, string> {
  const { startMidi, endMidi } = getRagaPianoRangeMidis();
  const map = new Map<number, string>();
  const seen = new Set<string>();
  for (const noteStr of [...raga.arohana, ...raga.avarohana]) {
    if (seen.has(noteStr)) continue;
    seen.add(noteStr);
    const m = ragaNoteToPianoKeyMidi(baseFreq, noteStr);
    if (m < startMidi || m > endMidi) continue;
    if (!map.has(m)) map.set(m, noteStr);
  }
  return map;
}

export function ragaNoteStringToMidi(baseFreq: number, noteStr: string): number {
  return freqToMidi(ragaNoteToFrequency(baseFreq, noteStr));
}
