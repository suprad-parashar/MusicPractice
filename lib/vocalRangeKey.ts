import { midiToNoteName } from '@/lib/instrumentLoader';

/** Prefer flats for key names (common for vocal charts). */
const PC_TO_KEY_NAME: readonly string[] = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

/** Bias toward headroom *above* the tonal template vs below (user: ~70% upper preference). */
const HEADROOM_WEIGHT_ABOVE = 0.7;
const HEADROOM_WEIGHT_BELOW = 0.3;

/**
 * Where to place the “anchor” along the measured span: this far **up** from the lowest MIDI
 * (so most of the range sits *above* the anchor — room for upper-octave repertoire).
 * 0.15 → anchor at 15% of span from the bottom (≈85% of span above); matches C3–G#4 → D#/Eb.
 */
const ANCHOR_FROM_LOW_FRAC = 0.15;

/**
 * Tonal window we want to fit: a central octave [root, root+12] plus a **fifth below** the octave
 * and a **fifth above** the top of that octave → [root−7, root+19] (26 semitones).
 */
const FIFTH = 7;
const OCTAVE = 12;

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function pitchClass(midi: number): number {
  return ((Math.round(midi) % 12) + 12) % 12;
}

/**
 * Pitch classes from the lowest note’s chroma up to the highest note’s chroma (inclusive),
 * e.g. C3…G#4 → C, C#, D, …, G# — any major tonic in that band is allowed.
 */
export function pitchClassesFromLowToHighNote(loMidi: number, hiMidi: number): number[] {
  const a = pitchClass(loMidi);
  const b = pitchClass(hiMidi);
  const out: number[] = [];
  if (a <= b) {
    for (let p = a; p <= b; p++) out.push(p);
  } else {
    for (let p = a; p < 12; p++) out.push(p);
    for (let p = 0; p <= b; p++) out.push(p);
  }
  return out;
}

/** Nearest MIDI integer with the given pitch class to `anchor`. */
export function nearestMidiWithPitchClass(anchor: number, pc: number): number {
  const k = Math.round((anchor - pc) / 12);
  return pc + 12 * k;
}

/**
 * Headroom (semitones) past a template that needs [root−7, root+19] inside the voice.
 * Positive = extra usable range beyond that window.
 */
export function headroomScore(rootMidi: number, lo: number, hi: number): number {
  const needLow = rootMidi - FIFTH;
  const needHigh = rootMidi + OCTAVE + FIFTH;
  const below = lo - needLow;
  const above = hi - needHigh;
  return HEADROOM_WEIGHT_ABOVE * above + HEADROOM_WEIGHT_BELOW * below;
}

export type PracticeKeyRecommendation = {
  lowMidi: number;
  highMidi: number;
  lowLabel: string;
  highLabel: string;
  /** Suggested major-key tonic (MIDI, any octave). */
  tonicMidi: number;
  tonicLabel: string;
  tonicHz: number;
  /** “Anchor” used to pick the key along the span (biased low for upper headroom). */
  anchorMidi: number;
  suggestedMajorKey: string;
  rangeSemitones: number;
  /** Pitch-class indices used as candidate tonics (low→high note). */
  candidatePitchClasses: number[];
  blurb: string;
};

/**
 * Picks a major key whose tonic pitch class lies **between** the lowest and highest measured notes
 * (chromatically), places the tonic near an **anchor** biased toward the bottom of the span
 * (so upper-octave material is favored), and breaks ties using headroom around a one-octave+fifths window.
 */
export function recommendPracticeKey(lowMidi: number, highMidi: number): PracticeKeyRecommendation {
  const L = Math.round(lowMidi);
  const H = Math.round(highMidi);
  const span = H - L;

  const anchorMidi = L + span * ANCHOR_FROM_LOW_FRAC;
  const candidates = pitchClassesFromLowToHighNote(L, H);

  let bestPc = candidates[0] ?? 0;
  let bestRoot = nearestMidiWithPitchClass(anchorMidi, bestPc);
  let bestDist = Math.abs(bestRoot - anchorMidi);
  let bestHeadroom = headroomScore(bestRoot, L, H);

  for (const pc of candidates) {
    const root = nearestMidiWithPitchClass(anchorMidi, pc);
    const dist = Math.abs(root - anchorMidi);
    const hr = headroomScore(root, L, H);
    if (dist < bestDist) {
      bestDist = dist;
      bestPc = pc;
      bestRoot = root;
      bestHeadroom = hr;
    } else if (dist === bestDist) {
      if (hr > bestHeadroom) {
        bestPc = pc;
        bestRoot = root;
        bestHeadroom = hr;
      }
    }
  }

  const tonicName = PC_TO_KEY_NAME[bestPc]!;
  const suggestedMajorKey = `${tonicName} major`;

  const blurb =
    `Your comfortable span is about ${span} semitones (${midiToNoteName(L)}–${midiToNoteName(H)}). ` +
    `Any major key whose tonic falls between those outer notes is plausible; we anchor toward the lower end of your span ` +
    `(~${Math.round(ANCHOR_FROM_LOW_FRAC * 100)}% up from your low note) so you keep more room above for high phrases and octave jumps. ` +
    `We also score how well a one-octave band plus fifths on each side fits (${midiToNoteName(bestRoot - FIFTH)}–${midiToNoteName(bestRoot + OCTAVE + FIFTH)} for ${tonicName}). ` +
    `Suggested key: ${suggestedMajorKey} with tonic near ${midiToNoteName(bestRoot)} (~${midiToHz(bestRoot).toFixed(1)} Hz).`;

  return {
    lowMidi: L,
    highMidi: H,
    lowLabel: midiToNoteName(L),
    highLabel: midiToNoteName(H),
    tonicMidi: bestRoot,
    tonicLabel: midiToNoteName(bestRoot),
    tonicHz: midiToHz(bestRoot),
    anchorMidi,
    suggestedMajorKey,
    rangeSemitones: span,
    candidatePitchClasses: [...candidates],
    blurb,
  };
}

/**
 * Robust high note: ignore top ~5% spike outliers, return max of the rest.
 */
export function robustHighMidi(samples: number[]): number | null {
  if (samples.length < 6) return null;
  const s = [...samples].sort((a, b) => a - b);
  const trim = Math.max(1, Math.floor(s.length * 0.05));
  const trimmed = s.slice(0, s.length - trim);
  return trimmed[trimmed.length - 1] ?? null;
}

/**
 * Robust low note: ignore bottom ~5% junk, return min of the rest.
 */
export function robustLowMidi(samples: number[]): number | null {
  if (samples.length < 6) return null;
  const s = [...samples].sort((a, b) => a - b);
  const trim = Math.max(1, Math.floor(s.length * 0.05));
  const trimmed = s.slice(trim);
  return trimmed[0] ?? null;
}
