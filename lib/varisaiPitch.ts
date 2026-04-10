import { parseVarisaiNote, convertVarisaiNote } from '@/data/saraliVarisai';
import { getSwarafrequency } from '@/data/ragas';
import { VOICE_PITCH_LADDER } from '@/lib/voicePattern';

type LadderToken = (typeof VOICE_PITCH_LADDER)[number];

/**
 * Frequency in Hz for a sarali-style token (e.g. `R`, `<N`, `>S`) at the given tonic.
 */
export function varisaiTokenToFreqHz(baseFreq: number, token: string): number {
  const full = convertVarisaiNote(token);
  const parsed = parseVarisaiNote(full);
  let f = getSwarafrequency(baseFreq, parsed.swara);
  if (parsed.octave === 'higher') f *= 2;
  else if (parsed.octave === 'lower') f *= 0.5;
  return f;
}

export function centsDifference(fMeasured: number, fTarget: number): number {
  return 1200 * Math.log2(fMeasured / fTarget);
}

/** Smallest |cents| to any reference in `refHzList`, and the signed cents to that nearest ref. */
export function centsToNearestAmongRefs(
  sungHz: number,
  refHzList: readonly number[]
): { absCents: number; signedCents: number } {
  let bestAbs = Infinity;
  let bestSigned = 0;
  for (const ref of refHzList) {
    if (!(ref > 0) || !Number.isFinite(ref)) continue;
    const signed = centsDifference(sungHz, ref);
    const a = Math.abs(signed);
    if (a < bestAbs) {
      bestAbs = a;
      bestSigned = signed;
    }
  }
  return { absCents: bestAbs, signedCents: bestSigned };
}

/** Continuous MIDI (float) for plotting; not rounded to a scale degree. */
export function hzToMidiFloat(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

const PITCH_LO_HZ = 32;
const PITCH_HI_HZ = 2000;

/**
 * Picks `measuredHz · 2^k` closest to the nearest chromatic semitone (any octave).
 * Unbiased by a reference pitch — helps when the detector locks to a harmonic.
 */
export function snapHarmonicToLikelyFundamental(measuredHz: number): number {
  if (measuredHz <= 0 || !Number.isFinite(measuredHz)) return measuredHz;
  let best = measuredHz;
  let bestErr = Infinity;
  for (let k = -6; k <= 6; k++) {
    const cand = measuredHz * Math.pow(2, k);
    if (cand < PITCH_LO_HZ || cand > PITCH_HI_HZ) continue;
    const m = hzToMidiFloat(cand);
    const err = Math.abs(m - Math.round(m));
    if (err < bestErr) {
      bestErr = err;
      best = cand;
    }
  }
  return best;
}

/**
 * Like {@link snapHarmonicToLikelyFundamental}, but when several harmonics tie, prefers the
 * octave closest to the previous smoothed MIDI so the graph doesn’t jump wildly.
 */
export function snapHarmonicToLikelyFundamentalStable(
  measuredHz: number,
  prevMidiFloat: number | null
): number {
  if (measuredHz <= 0 || !Number.isFinite(measuredHz)) return measuredHz;
  let best = measuredHz;
  let bestScore = Infinity;
  for (let k = -6; k <= 6; k++) {
    const cand = measuredHz * Math.pow(2, k);
    if (cand < PITCH_LO_HZ || cand > PITCH_HI_HZ) continue;
    const m = hzToMidiFloat(cand);
    const err = Math.abs(m - Math.round(m));
    let jump = 0;
    if (prevMidiFloat !== null) {
      let d = m - prevMidiFloat;
      d -= 12 * Math.round(d / 12);
      jump = Math.abs(d);
    }
    const score = err * 120 + jump * 0.35;
    if (score < bestScore) {
      bestScore = score;
      best = cand;
    }
  }
  return best;
}

/**
 * Smallest distance in cents from sung pitch to **any** instance of the target note (12-TET, any octave).
 */
export function centsFromTargetNoteAnyOctave(sungMidiFloat: number, targetHz: number): number {
  const targetNoteMidi = Math.round(hzToMidiFloat(targetHz));
  let best = Infinity;
  for (let k = -6; k <= 6; k++) {
    const refMidi = targetNoteMidi + 12 * k;
    const c = Math.abs(sungMidiFloat - refMidi) * 100;
    if (c < best) best = c;
  }
  return best;
}

/**
 * Signed cents from sung pitch to the **nearest** 12-TET instance of the target pitch class (any octave).
 * Positive = sharper than that reference (listener should sing **lower**); negative = flatter (**higher**).
 */
export function signedCentsToNearestTargetOctave(sungMidiFloat: number, targetHz: number): number {
  const targetNoteMidi = Math.round(hzToMidiFloat(targetHz));
  let bestRef = targetNoteMidi;
  let bestDist = Infinity;
  for (let k = -6; k <= 6; k++) {
    const refMidi = targetNoteMidi + 12 * k;
    const d = Math.abs(sungMidiFloat - refMidi);
    if (d < bestDist) {
      bestDist = d;
      bestRef = refMidi;
    }
  }
  return (sungMidiFloat - bestRef) * 100;
}

/**
 * Picks `measuredHz · 2^k` (integer k) closest to `targetHz` in cents, within a singable range.
 * Reduces wrong-octave errors when the tracker locks to a harmonic or subharmonic.
 */
export function snapPitchHzNearTarget(measuredHz: number, targetHz: number): number {
  if (measuredHz <= 0 || !Number.isFinite(measuredHz) || targetHz <= 0 || !Number.isFinite(targetHz)) {
    return measuredHz;
  }
  let best = measuredHz;
  let bestAbs = Math.abs(centsDifference(measuredHz, targetHz));
  for (let k = -5; k <= 5; k++) {
    const cand = measuredHz * Math.pow(2, k);
    if (cand < 32 || cand > 2200) continue;
    const c = Math.abs(centsDifference(cand, targetHz));
    if (c < bestAbs) {
      bestAbs = c;
      best = cand;
    }
  }
  return best;
}

/**
 * Nearest swara token on the voice ladder for a measured frequency.
 */
export function nearestVarisaiToken(
  baseFreq: number,
  hz: number
): { token: string; centsFromToken: number } | null {
  if (!hz || hz <= 0 || !Number.isFinite(hz)) return null;
  let bestToken: LadderToken = VOICE_PITCH_LADDER[0]!;
  let bestAbsCents = Infinity;
  for (const t of VOICE_PITCH_LADDER) {
    const f = varisaiTokenToFreqHz(baseFreq, t);
    const c = Math.abs(centsDifference(hz, f));
    if (c < bestAbsCents) {
      bestAbsCents = c;
      bestToken = t;
    }
  }
  const fBest = varisaiTokenToFreqHz(baseFreq, bestToken);
  return { token: bestToken, centsFromToken: centsDifference(hz, fBest) };
}
