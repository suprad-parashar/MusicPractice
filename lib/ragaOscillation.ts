import type { Raga } from '@/data/ragas';
import { getSwarafrequency } from '@/data/ragas';
import { parseVarisaiNote, stripOscillationSuffix } from '@/data/saraliVarisai';
import {
  freqToMidi,
  freqToNoteNameForInstrument,
  isSineInstrument,
  midiToHz,
  type InstrumentId,
} from '@/lib/instrumentLoader';
import type { Player as SoundfontPlayer } from 'soundfont-player';

const LETTER_ORDER = ['S', 'R', 'G', 'M', 'P', 'D', 'N'] as const;

/** First seven arohana degrees as full swara strings (S…N), with `[...]` stripped from JSON tokens. */
export function getRagaScaleDegrees(arohana: string[]): string[] {
  const degrees: string[] = [];
  for (let i = 0; i < 7 && i < arohana.length; i++) {
    const { core } = stripOscillationSuffix(arohana[i]);
    const p = parseVarisaiNote(core);
    degrees.push(p.swara);
  }
  while (degrees.length < 7) {
    degrees.push(degrees[degrees.length - 1] ?? 'S');
  }
  return degrees;
}

/** Parse compact oscillation string: `SRSRSR`, `D>SN>SN>SN` (case-insensitive). */
export function parseOscillationPath(path: string): Array<{ letter: string; octave: 'normal' | 'higher' | 'lower' }> {
  const out: Array<{ letter: string; octave: 'normal' | 'higher' | 'lower' }> = [];
  const u = path.trim().toUpperCase();
  let i = 0;
  while (i < u.length) {
    let oct: 'normal' | 'higher' | 'lower' = 'normal';
    if (u[i] === '>') {
      oct = 'higher';
      i++;
    } else if (u[i] === '<') {
      oct = 'lower';
      i++;
    }
    const ch = u[i];
    if (!ch || !'SRGMPDN'.includes(ch)) {
      i++;
      continue;
    }
    out.push({ letter: ch, octave: oct });
    i++;
  }
  return out;
}

export function oscillationPathToFrequencies(
  path: string,
  scaleDegrees: string[],
  baseFreq: number
): number[] {
  const steps = parseOscillationPath(path);
  return steps.map(({ letter, octave }) => {
    const idx = LETTER_ORDER.indexOf(letter as (typeof LETTER_ORDER)[number]);
    const swara = idx >= 0 && idx < scaleDegrees.length ? scaleDegrees[idx] : scaleDegrees[0] ?? 'S';
    let f = getSwarafrequency(baseFreq, swara);
    if (octave === 'higher') f *= 2;
    else if (octave === 'lower') f *= 0.5;
    return f;
  });
}

/**
 * Bracket paths in raga JSON often mix **phrase sketches** (wide leaps) with **true two-note shakes**.
 * Literal letter→scale mapping turns wide sketches into absurd jumps. When the raw path looks
 * pathological, replace it with **kampita-style** motion: smooth, narrow oscillation around the
 * anchor swara (still uses the same number of waypoints so duration/feel stays similar).
 */
function refineGamakaFrequencies(rawFreqs: number[], anchorHz: number): number[] {
  if (rawFreqs.length < 2) return rawFreqs;
  const safe = (f: number) => Math.max(0.001, f);
  const anchor = safe(anchorHz);
  let minF = Infinity;
  let maxF = 0;
  let maxStepCents = 0;
  for (let i = 0; i < rawFreqs.length; i++) {
    const f = safe(rawFreqs[i]);
    minF = Math.min(minF, f);
    maxF = Math.max(maxF, f);
    if (i > 0) {
      const prev = safe(rawFreqs[i - 1]);
      maxStepCents = Math.max(maxStepCents, Math.abs(1200 * Math.log2(f / prev)));
    }
  }
  const spanCents = 1200 * Math.log2(maxF / minF);

  /** Allow S–R–S style oscillation (~200¢ steps); block multi-semitone “phrase demo” leaps. */
  const MAX_STEP_CENTS = 235;
  /** Overall span of a single-note ornament should stay modest; huge spans = notated sketch. */
  const MAX_SPAN_CENTS = 360;
  /** Very long paths with medium span are usually illustrative, not literal. */
  const LONG_PATH = 14;

  const pathological =
    maxStepCents > MAX_STEP_CENTS ||
    spanCents > MAX_SPAN_CENTS ||
    (rawFreqs.length >= LONG_PATH && spanCents > 220);

  if (!pathological) return rawFreqs;

  return buildKampitaAroundAnchor(anchor, rawFreqs.length);
}

/** Narrow, smooth kampita / nāda-centered motion in cents (not harsh vibrato). */
function buildKampitaAroundAnchor(anchorHz: number, waypointCount: number): number[] {
  const n = Math.max(6, Math.min(28, waypointCount));
  const out: number[] = [];
  const maxCents = 36;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const u = easeInOutCosine(t);
    const cents =
      maxCents *
      Math.sin(Math.PI * u) *
      (0.52 * Math.sin(2 * Math.PI * u) + 0.48 * Math.sin(4 * Math.PI * u + 0.85));
    out.push(anchorHz * Math.pow(2, cents / 1200));
  }
  return out;
}

const safeFreq = (f: number) => Math.max(0.001, f);

/**
 * `playbackRate` bends speed + timbre; plain notes use nominal rate. Gamaka uses **detune** (cents)
 * so the sample plays at ~constant speed — same tonal family as non-ornament notes.
 * Fallback to playbackRate only if the path needs more than ~±this many cents from one base MIDI note.
 */
const DETUNE_PATH_MAX_CENTS = 1150;

/** Per-instrument gamaka: sitar is tuned first (plucked partials mask detune grain well); others follow the same pipeline with tweaked smoothing. */
export type GamakaSoundfontProfile = {
  /** Automation samples (higher = smoother automation, less zipper). */
  curveSamples: number;
  /** How many times to run 5-tap smoothing on the detune curve (more for bright/harsh samples). */
  detuneSmoothPasses: number;
  /** Multiplier on soundfont `gain` (plain notes use 1.5; gamaka uses 1.5 * gainMul). */
  gainMul: number;
  /**
   * Scales the spline clamp band around waypoint min/max log-pitch (lower = tighter clamp, less overshoot).
   */
  splinePadScale: number;
};

const DEFAULT_GAMAKA_SF: GamakaSoundfontProfile = {
  curveSamples: 896,
  detuneSmoothPasses: 2,
  gainMul: 1,
  splinePadScale: 0.9,
};

/** Sitar: high resolution + moderate smoothing + slight presence boost; pad tuned to reduce spline wobble. */
const GAMAKA_SITAR: GamakaSoundfontProfile = {
  curveSamples: 1024,
  detuneSmoothPasses: 3,
  gainMul: 1.08,
  splinePadScale: 0.86,
};

/** Piano & harmonium: fixed-pitch instruments — bracket paths are ignored for playback (no bend). */
const GAMAKA_BY_INSTRUMENT: Partial<Record<Exclude<InstrumentId, 'sine'>, GamakaSoundfontProfile>> = {
  sitar: GAMAKA_SITAR,
  violin: {
    curveSamples: 1024,
    detuneSmoothPasses: 3,
    gainMul: 1.05,
    splinePadScale: 0.88,
  },
  flute: {
    curveSamples: 960,
    detuneSmoothPasses: 3,
    gainMul: 1.03,
    splinePadScale: 0.9,
  },
};

export function getGamakaSoundfontProfile(instrumentId: Exclude<InstrumentId, 'sine'>): GamakaSoundfontProfile {
  return GAMAKA_BY_INSTRUMENT[instrumentId] ?? DEFAULT_GAMAKA_SF;
}

/** True when bracket oscillation should affect audio (not piano/harmonium). */
export function gamakaPlaybackEnabledForInstrument(instrumentId: InstrumentId): boolean {
  return instrumentId !== 'piano' && instrumentId !== 'harmonium';
}

/** Sine gamaka: match sitar spline density; light extra smooth on Hz curve. */
const GAMAKA_SINE = {
  curveSamples: 1024,
  splinePadScale: GAMAKA_SITAR.splinePadScale,
  hzSmoothPasses: 3,
} as const;

/** Ease-in-out on [0,1]: slow pitch motion at note start/end (more legato / connected portamento). */
function easeInOutCosine(t: number): number {
  return 0.5 * (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, t))));
}

/** Catmull–Rom in log₂(Hz): C¹ smooth through waypoints (no kinks from linear segments). */
function catmullRomScalar(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/**
 * Smooth pitch path: spline in log-frequency, clamped to stay near the waypoint range (limits
 * Catmull overshoot that can sound unstable).
 */
function buildLogInterpolatedFreqCurve(
  freqs: number[],
  sampleCount: number,
  splinePadScale: number
): Float32Array {
  const n = freqs.length;
  const k = Math.max(2, sampleCount);
  const curve = new Float32Array(k);
  if (n === 0) {
    curve.fill(440);
    return curve;
  }
  if (n === 1) {
    const f = safeFreq(freqs[0]);
    curve.fill(f);
    return curve;
  }
  const y = freqs.map((f) => Math.log2(safeFreq(f)));
  const minL = Math.min(...y);
  const maxL = Math.max(...y);
  const pad = Math.max(0.02, (maxL - minL) * 0.08 * splinePadScale);
  const lo = minL - pad;
  const hi = maxL + pad;
  const pPre = 2 * y[0] - y[1];
  const pPost = 2 * y[n - 1] - y[n - 2];

  for (let i = 0; i < k; i++) {
    const rawU = i / (k - 1);
    const u = easeInOutCosine(rawU);
    const segFloat = u * (n - 1);
    const j = Math.min(Math.floor(segFloat), n - 2);
    const t = segFloat - j;
    const y0 = j === 0 ? pPre : y[j - 1];
    const y1 = y[j];
    const y2 = y[j + 1];
    const y3 = j + 2 >= n ? pPost : y[j + 2];
    let lf = catmullRomScalar(y0, y1, y2, y3, t);
    if (lf < lo) lf = lo;
    if (lf > hi) lf = hi;
    curve[i] = Math.pow(2, lf);
  }
  return curve;
}

/** Binomial 5-tap smoothing (detune cents or Hz automation — reduces zipper / grain). */
function smoothAutomationCurve5Tap(curve: Float32Array): Float32Array {
  const n = curve.length;
  if (n < 5) {
    if (n < 3) return curve;
    const out = new Float32Array(n);
    out[0] = curve[0];
    out[n - 1] = curve[n - 1];
    for (let i = 1; i < n - 1; i++) {
      out[i] = (curve[i - 1] + curve[i] + curve[i + 1]) / 3;
    }
    return out;
  }
  const out = new Float32Array(n);
  out[0] = curve[0];
  out[1] = (curve[0] + curve[1] + curve[2]) / 3;
  out[n - 2] = (curve[n - 3] + curve[n - 2] + curve[n - 1]) / 3;
  out[n - 1] = curve[n - 1];
  for (let i = 2; i < n - 2; i++) {
    out[i] = (curve[i - 2] + 4 * curve[i - 1] + 6 * curve[i] + 4 * curve[i + 1] + curve[i + 2]) / 16;
  }
  return out;
}

function applyAutomationSmoothPasses(curve: Float32Array, passes: number): Float32Array {
  let c = curve;
  for (let p = 0; p < passes; p++) {
    c = smoothAutomationCurve5Tap(c);
  }
  return c;
}

function maxDetuneCentsVsBase(fCurve: Float32Array, f0: number): number {
  let max = 0;
  for (let i = 0; i < fCurve.length; i++) {
    const c = Math.abs(1200 * Math.log2(safeFreq(fCurve[i]) / f0));
    max = Math.max(max, c);
  }
  return max;
}

/** Pick tempered MIDI whose center frequency minimizes peak |detune| needed for the glide. */
function chooseBestMidiForGamaka(freqs: number[], fCurve: Float32Array): { midi: number; f0: number; maxCents: number } {
  let lo = Infinity;
  let hi = -Infinity;
  for (const f of freqs) {
    const x = safeFreq(f);
    lo = Math.min(lo, x);
    hi = Math.max(hi, x);
  }
  const mLow = freqToMidi(lo) - 4;
  const mHigh = freqToMidi(hi) + 4;
  let bestM = freqToMidi((lo + hi) / 2);
  let bestMax = Infinity;
  for (let m = mLow; m <= mHigh; m++) {
    const f0 = midiToHz(m);
    const maxC = maxDetuneCentsVsBase(fCurve, f0);
    if (maxC < bestMax) {
      bestMax = maxC;
      bestM = m;
    }
  }
  return { midi: bestM, f0: midiToHz(bestM), maxCents: bestMax };
}

function buildDetuneCurveFromFreqCurve(fCurve: Float32Array, f0: number): Float32Array {
  const out = new Float32Array(fCurve.length);
  for (let i = 0; i < fCurve.length; i++) {
    out[i] = 1200 * Math.log2(safeFreq(fCurve[i]) / f0);
  }
  return out;
}

function scheduleFrequencySmoothGlide(
  freqParam: AudioParam,
  t0: number,
  durationSec: number,
  freqs: number[],
  sampleCount: number,
  splinePadScale: number,
  hzSmoothPasses: number
): void {
  const n = freqs.length;
  if (n === 0) return;
  if (n === 1) {
    freqParam.setValueAtTime(safeFreq(freqs[0]), t0);
    return;
  }
  let curve = buildLogInterpolatedFreqCurve(freqs, sampleCount, splinePadScale);
  if (hzSmoothPasses > 0) {
    curve = applyAutomationSmoothPasses(curve, hzSmoothPasses);
  }
  try {
    freqParam.setValueCurveAtTime(curve, t0, durationSec);
  } catch {
    freqParam.setValueAtTime(safeFreq(freqs[0]), t0);
    const segDur = durationSec / (n - 1);
    for (let j = 0; j < n - 1; j++) {
      const tStart = t0 + j * segDur;
      const tEnd = t0 + (j + 1) * segDur;
      const f0 = safeFreq(freqs[j]);
      const f1 = safeFreq(freqs[j + 1]);
      if (Math.abs(f1 - f0) < 1e-5) {
        freqParam.setValueAtTime(f1, tEnd);
      } else {
        freqParam.setValueAtTime(f0, tStart);
        freqParam.exponentialRampToValueAtTime(f1, tEnd);
      }
    }
  }
}

function schedulePlaybackRateSmoothGlide(
  rateParam: AudioParam,
  t0: number,
  durationSec: number,
  freqs: number[],
  nominalFreq: number,
  sampleCount: number,
  splinePadScale: number
): void {
  const n = freqs.length;
  if (n === 0) return;
  const nf = Math.max(0.001, nominalFreq);
  if (n === 1) {
    rateParam.setValueAtTime(safeFreq(freqs[0]) / nf, t0);
    return;
  }
  const fCurve = buildLogInterpolatedFreqCurve(freqs, sampleCount, splinePadScale);
  const rateCurve = new Float32Array(fCurve.length);
  for (let i = 0; i < fCurve.length; i++) {
    rateCurve[i] = Math.max(0.001, fCurve[i]) / nf;
  }
  try {
    rateParam.setValueCurveAtTime(rateCurve, t0, durationSec);
  } catch {
    rateParam.setValueAtTime(safeFreq(freqs[0]) / nf, t0);
    const segDur = durationSec / (n - 1);
    for (let j = 0; j < n - 1; j++) {
      const tStart = t0 + j * segDur;
      const tEnd = t0 + (j + 1) * segDur;
      const r0 = safeFreq(freqs[j]) / nf;
      const r1 = safeFreq(freqs[j + 1]) / nf;
      if (Math.abs(r1 - r0) < 1e-6) {
        rateParam.setValueAtTime(r1, tEnd);
      } else {
        rateParam.setValueAtTime(r0, tStart);
        rateParam.exponentialRampToValueAtTime(r1, tEnd);
      }
    }
  }
}

/** Same sine timbre and envelope as a plain note; pitch follows a smooth contour. */
function connectSineSmoothGlide(
  ctx: AudioContext,
  masterGain: GainNode,
  when: number,
  durationSec: number,
  freqs: number[],
  peakGain: number,
  oscillatorTracking: OscillatorNode[],
  sampleCount: number,
  splinePadScale: number,
  hzSmoothPasses: number
): void {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  scheduleFrequencySmoothGlide(
    osc.frequency,
    when,
    durationSec,
    freqs,
    sampleCount,
    splinePadScale,
    hzSmoothPasses
  );
  const gainNode = ctx.createGain();
  let attack = Math.min(0.06, Math.max(0.015, durationSec * 0.16));
  let release = Math.min(0.14, Math.max(0.04, durationSec * 0.22));
  if (attack + release > durationSec * 0.88) {
    const s = (durationSec * 0.88) / (attack + release);
    attack *= s;
    release *= s;
  }
  gainNode.gain.setValueAtTime(0, when);
  gainNode.gain.linearRampToValueAtTime(peakGain, when + attack);
  gainNode.gain.setValueAtTime(peakGain, when + durationSec - release);
  gainNode.gain.linearRampToValueAtTime(0, when + durationSec);
  osc.connect(gainNode);
  gainNode.connect(masterGain);
  osc.start(when);
  osc.stop(when + durationSec);
  oscillatorTracking.push(osc);
}

export function playRagaNoteWithOptionalGlissando(opts: {
  audioContext: AudioContext;
  masterGain: GainNode;
  instrumentId: InstrumentId;
  soundfontPlayer: SoundfontPlayer | null;
  baseFreq: number;
  raga: Raga;
  fullToken: string;
  durationMs: number;
  oscillatorTracking: OscillatorNode[];
  sineGain?: number;
  /** When false, bracket oscillation paths are ignored (core swara only). Default true. */
  gamakaEnabled?: boolean;
}): void {
  const {
    audioContext: ctx,
    masterGain,
    instrumentId,
    soundfontPlayer,
    baseFreq,
    raga,
    fullToken,
    durationMs,
    oscillatorTracking,
    sineGain = 0.3,
    gamakaEnabled = true,
  } = opts;

  const parsed = parseVarisaiNote(fullToken);
  const path = parsed.oscillationPath;
  const scaleDegrees = getRagaScaleDegrees(raga.arohana);
  let freqs: number[] | null =
    gamakaEnabled &&
    gamakaPlaybackEnabledForInstrument(instrumentId) &&
    path &&
    parseOscillationPath(path).length >= 2
      ? oscillationPathToFrequencies(path, scaleDegrees, baseFreq)
      : null;

  if (freqs && freqs.length >= 2) {
    let anchorFreq = getSwarafrequency(baseFreq, parsed.swara);
    if (parsed.octave === 'higher') anchorFreq *= 2;
    else if (parsed.octave === 'lower') anchorFreq *= 0.5;
    freqs = refineGamakaFrequencies(freqs, anchorFreq);
  }

  const now = ctx.currentTime;
  const durationSec = durationMs / 1000;

  if (freqs && freqs.length >= 2) {
    if (!isSineInstrument(instrumentId) && soundfontPlayer) {
      const gp = getGamakaSoundfontProfile(instrumentId);
      const fCurve = buildLogInterpolatedFreqCurve(freqs, gp.curveSamples, gp.splinePadScale);
      const { f0, maxCents } = chooseBestMidiForGamaka(freqs, fCurve);
      const noteName = freqToNoteNameForInstrument(f0, instrumentId);
      const gamakaGain = 1.5 * gp.gainMul;
      const node = soundfontPlayer.start(noteName, now, { duration: durationSec, gain: gamakaGain }) as {
        source?: AudioBufferSourceNode;
      } | null;
      const src = node?.source;
      if (!src) return;
      if (src.playbackRate) {
        src.playbackRate.cancelScheduledValues(now);
        src.playbackRate.setValueAtTime(1, now);
      }
      const useDetune = src.detune != null && maxCents <= DETUNE_PATH_MAX_CENTS;
      if (useDetune) {
        try {
          let detuneCurve = buildDetuneCurveFromFreqCurve(fCurve, f0);
          detuneCurve = applyAutomationSmoothPasses(detuneCurve, gp.detuneSmoothPasses);
          src.detune.cancelScheduledValues(now);
          src.detune.setValueCurveAtTime(detuneCurve, now, durationSec);
        } catch {
          if (src.playbackRate) {
            schedulePlaybackRateSmoothGlide(
              src.playbackRate,
              now,
              durationSec,
              freqs,
              f0,
              gp.curveSamples,
              gp.splinePadScale
            );
          }
        }
      } else if (src.playbackRate) {
        schedulePlaybackRateSmoothGlide(
          src.playbackRate,
          now,
          durationSec,
          freqs,
          f0,
          gp.curveSamples,
          gp.splinePadScale
        );
      }
      return;
    }

    connectSineSmoothGlide(
      ctx,
      masterGain,
      now,
      durationSec,
      freqs,
      sineGain,
      oscillatorTracking,
      GAMAKA_SINE.curveSamples,
      GAMAKA_SINE.splinePadScale,
      GAMAKA_SINE.hzSmoothPasses
    );
    return;
  }

  let freq = getSwarafrequency(baseFreq, parsed.swara);
  if (parsed.octave === 'higher') freq *= 2;
  else if (parsed.octave === 'lower') freq *= 0.5;

  if (!isSineInstrument(instrumentId) && soundfontPlayer) {
    soundfontPlayer.start(freqToNoteNameForInstrument(freq, instrumentId), now, { duration: durationSec, gain: 1.5 });
    return;
  }

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(sineGain, now + 0.01);
  gainNode.gain.setValueAtTime(sineGain, now + durationSec - 0.05);
  gainNode.gain.linearRampToValueAtTime(0, now + durationSec);
  osc.connect(gainNode);
  gainNode.connect(masterGain);
  osc.start(now);
  osc.stop(now + durationSec);
  oscillatorTracking.push(osc);
}
