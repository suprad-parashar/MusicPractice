/**
 * Tanpura drone - browser-lehra style.
 * Uses a single pluck sample + playback rate for pitch (authentic timbre).
 * 4 strings plucked: P → High S → High S → S
 *
 * See: https://github.com/svkale/browser-lehra
 */

import * as Tone from 'tone';

// Sample paths (browser-lehra tanpura-d.wav first; add tanpura-pluck.wav for alternatives)
const PLUCK_SAMPLE_PATHS = ['/sounds/tanpura-d.wav', '/sounds/tanpura-pluck.wav'];
const PLUCK_SAMPLE_BASE_FREQ = 293.66; // D4 - matches tanpura-d.wav from browser-lehra

// 4 strings: P (Pancham), High S, High S, S (Shadja - kharj)
const PLUCK_RATIOS = [1.5, 2.0, 2.0, 1.0];
const PITCH_OCTAVE_DOWN = 0.5; // One octave lower (medium)
const VOLUME_ATTENUATION_DB = -12; // Tanpura sits quieter in the mix

export type Octave = 'low' | 'medium' | 'high';

/**
 * Convert an octave label to its frequency multiplier.
 *
 * @returns The multiplier to apply to a base frequency: `0.5` for `'low'`, `1` for `'medium'`, `2` for `'high'`.
 */
export function getOctaveMultiplier(octave: Octave): number {
  switch (octave) {
    case 'low': return 0.5;
    case 'high': return 2;
    default: return 1; // medium
  }
}

const DEFAULT_PLUCK_DELAY_SEC = 1.4; // Delay between each pluck (P, High S, High S, S)
const DEFAULT_NOTE_LENGTH_SEC = 5;   // How long each pluck resonates (synth) / reverb tail (sample)

let volumeNode: Tone.Volume | null = null;
let pluckPlayers: Tone.Player[] = [];
let pluckReverb: Tone.Reverb | null = null;
let pluckLoop: Tone.Loop | null = null;
let polySynth: Tone.PolySynth | null = null;
let baseFreqRef = 261.63;
let octaveRef: Octave = 'medium';
let volumeRef = 0.5;
let pluckDelaySecRef = DEFAULT_PLUCK_DELAY_SEC;
let noteLengthSecRef = DEFAULT_NOTE_LENGTH_SEC;
let useSample = false;
let sampleBaseFreq = PLUCK_SAMPLE_BASE_FREQ;
let isStarted = false;

/**
 * Convert a linear amplitude value to decibels.
 *
 * @param linear - Linear amplitude (typically 0..1, where 1 is unity gain)
 * @returns The decibel equivalent of `linear`; returns `-100` if `linear` is less than or equal to 0
 */
function linearToDb(linear: number): number {
  if (linear <= 0) return -100;
  return 20 * Math.log10(Math.max(0.01, linear));
}

/**
 * Map a 0–1 UI slider value to a perceptually tuned linear gain.
 *
 * @param slider - Slider position from 0 (min) to 1 (max)
 * @returns Gain value between 0 and 1 adjusted for perceptual response; returns `0` when `slider` is `0` or negative
 */
function sliderToGain(slider: number): number {
  if (slider <= 0) return 0;
  return Math.pow(slider, 2); // Square curve: clearer changes in typical range
}

/**
 * Attempts to find and load a pluck sample from predefined paths and returns its URL and reference frequency.
 *
 * Tries each candidate sample URL in order (only when running in a browser) and returns the first successfully loaded sample.
 *
 * @returns An object with `url` (the loaded sample URL) and `baseFreq` (293.66 Hz if the URL contains `tanpura-d`, otherwise 261.63), or `null` if not running in a browser or no sample could be loaded.
 */
async function tryLoadPluckSample(): Promise<{ url: string; baseFreq: number } | null> {
  if (typeof window === 'undefined') return null;
  for (const url of PLUCK_SAMPLE_PATHS) {
    try {
      const p = new Tone.Player({ url, loop: false }).toDestination();
      await p.load(url);
      p.dispose();
      const baseFreq = url.includes('tanpura-d') ? 293.66 : 261.63;
      return { url, baseFreq };
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Create and initialize a sample-based pluck audio chain: a volume node, reverb, and four loaded sample players.
 *
 * This sets up a Tone.Volume (connected to destination) and a Tone.Reverb (with decay based on current note length),
 * generates the reverb impulse, creates four Tone.Player instances loaded with `sampleUrl`, and stores them for use
 * by the scheduling code.
 *
 * @param volumeLinear - Slider-style linear volume in the range 0..1 used to compute the chain's output level
 * @param sampleUrl - URL of the pluck sample to load into each player
 * @param sampleBase - Base frequency in Hz that the sample represents (used to compute playbackRate for pitch)
 * @returns An object containing `volume` (the created Tone.Volume) and `players` (an array of four loaded Tone.Player instances)
 */
async function createPluckSampleChain(
  volumeLinear: number,
  sampleUrl: string,
  sampleBase: number
) {
  const volume = new Tone.Volume(linearToDb(sliderToGain(volumeLinear)) + VOLUME_ATTENUATION_DB).toDestination();
  const reverb = new Tone.Reverb({
    decay: noteLengthSecRef,
    wet: 0.42,
  }).connect(volume);
  await reverb.generate();
  pluckReverb = reverb;

  const players: Tone.Player[] = [];
  for (let i = 0; i < 4; i++) {
    const p = new Tone.Player({ url: sampleUrl, loop: false }).connect(reverb);
    await p.load(sampleUrl);
    players.push(p);
  }

  volumeNode = volume;
  pluckPlayers = players;
  sampleBaseFreq = sampleBase;
  return { volume, players };
}

/**
 * Schedules a single cycle of four sample-based plucks (one per string) to play in sequence.
 *
 * Each pluck is scheduled with a small lookahead; pitches are derived from the current base
 * frequency, octave setting, and the string-specific pitch ratios by adjusting each player's
 * playback rate before starting it.
 */
function schedulePluckCycle(_time?: number): void {
  if (pluckPlayers.length < 4) return;
  const baseTime = Tone.now() + 0.02; // AudioContext time, small lookahead
  const base = baseFreqRef * PITCH_OCTAVE_DOWN * getOctaveMultiplier(octaveRef);
  const delayPerPluck = pluckDelaySecRef;

  PLUCK_RATIOS.forEach((ratio, i) => {
    const freq = base * ratio;
    const playbackRate = freq / sampleBaseFreq;
    const pluckTime = baseTime + i * delayPerPluck;
    pluckPlayers[i].playbackRate = playbackRate;
    pluckPlayers[i].start(pluckTime);
  });
}

/**
 * Create and wire a plucked-string synth chain (PolySynth of PluckSynth) routed through reverb and a volume node.
 *
 * Sets module-level `volumeNode` and `polySynth` to the created nodes so the rest of the module can control them.
 *
 * @param _baseFreqHz - Unused placeholder kept for API symmetry; this function does not depend on the provided frequency.
 * @returns An object with `volume` (the output Volume node) and `poly` (the created PolySynth)
 */
function createSynthPluckChain(_baseFreqHz: number) {
  const volume = new Tone.Volume(0).toDestination();
  const rev = new Tone.Reverb({ decay: 6, wet: 0.45 }).connect(volume);

  // PluckSynth doesn't extend Monophonic in Tone.js types; cast to satisfy PolySynth generic
  const poly = new Tone.PolySynth(Tone.PluckSynth as any, {
    volume: -8,
    resonance: 0.98,
    release: noteLengthSecRef,
  } as any).connect(rev);

  volumeNode = volume;
  polySynth = poly;
  return { volume, poly };
}

/**
 * Schedule four plucked notes on the synth, one per tanpura string, starting at the given transport time.
 *
 * Each pluck uses the current base frequency, selected octave, and string-specific ratio; successive plucks are spaced by the configured pluck delay and use the configured note length for release.
 *
 * @param time - Transport time (in seconds) at which the first string's pluck should occur
 */
function scheduleSynthPluckCycle(time: number): void {
  if (!polySynth) return;
  const base = baseFreqRef * PITCH_OCTAVE_DOWN * getOctaveMultiplier(octaveRef);
  const delayPerPluck = pluckDelaySecRef;

  PLUCK_RATIOS.forEach((ratio, i) => {
    const freq = base * ratio;
    const pluckTime = time + i * delayPerPluck;
    polySynth!.triggerAttackRelease(freq, noteLengthSecRef, pluckTime);
  });
}

/**
 * Starts the Tanpura drone using the provided tuning and playback settings.
 *
 * Initializes audio, loads either a sample-based pluck chain or a synthesized pluck chain,
 * schedules a repeating four-string pluck loop, and starts the Tone.js Transport.
 * No-op when not running in a browser environment.
 *
 * @param baseFreqHz - Base frequency in hertz used as the reference pitch for the four-string cycle
 * @param volumeLinear - Linear volume (0.0–1.0) for the Tanpura output
 * @param pluckDelaySec - Delay in seconds between successive string plucks; will be clamped to the range 0.8–2.5
 * @param noteLengthSec - Note/reverb tail length in seconds; will be clamped to the range 2–8
 * @param octave - Octave selection ('low' | 'medium' | 'high') that adjusts the effective pitch multiplier
 */
export async function startTanpura(
  baseFreqHz: number,
  volumeLinear: number,
  pluckDelaySec: number = DEFAULT_PLUCK_DELAY_SEC,
  noteLengthSec: number = DEFAULT_NOTE_LENGTH_SEC,
  octave: Octave = 'medium'
): Promise<void> {
  if (typeof window === 'undefined') return;
  await Tone.start();

  baseFreqRef = baseFreqHz;
  octaveRef = octave;
  volumeRef = volumeLinear;
  pluckDelaySecRef = Math.max(0.8, Math.min(2.5, pluckDelaySec));
  noteLengthSecRef = Math.max(2, Math.min(8, noteLengthSec));

  const sampleInfo = await tryLoadPluckSample();
  if (sampleInfo) {
    const { volume } = await createPluckSampleChain(
      volumeLinear,
      sampleInfo.url,
      sampleInfo.baseFreq
    );
    volume.volume.value = linearToDb(sliderToGain(volumeLinear)) + VOLUME_ATTENUATION_DB;

    const periodSec = pluckDelaySecRef * 4;
    pluckLoop = new Tone.Loop((time) => schedulePluckCycle(time), periodSec).start(0);
    pluckLoop.humanize = 0.02;

    Tone.getTransport().start();
    useSample = true;
  } else {
    const { volume, poly } = createSynthPluckChain(baseFreqHz);
    volume.volume.value = linearToDb(sliderToGain(volumeLinear)) + VOLUME_ATTENUATION_DB;

    const periodSec = pluckDelaySecRef * 4;
    pluckLoop = new Tone.Loop((time) => scheduleSynthPluckCycle(time), periodSec).start(0);
    pluckLoop.humanize = 0.02;

    Tone.getTransport().start();
    useSample = false;
  }

  isStarted = true;
}

/**
 * Stops the running Tanpura: halts scheduled plucks, silences active sound sources, and stops the Transport.
 *
 * If the Tanpura is not started this function does nothing. When active, it stops and disposes the pluck loop, stops sample players or releases the synth voices, stops Tone.Transport, and updates internal state to indicate the Tanpura is no longer started.
 */
export function stopTanpura(): void {
  if (!isStarted) return;

  if (pluckLoop) {
    pluckLoop.stop();
    pluckLoop.dispose();
    pluckLoop = null;
  }

  if (useSample && pluckPlayers.length > 0) {
    pluckPlayers.forEach(p => { try { p.stop(); } catch (_) {} });
  } else if (polySynth) {
    try { polySynth.releaseAll(); } catch (_) {}
  }

  Tone.getTransport().stop();
  isStarted = false;
}

/**
 * Sets the Tanpura's output level using a UI slider value.
 *
 * Converts `volumeLinear` to a perceptual gain, maps that to decibels, applies the module's attenuation, and updates the internal output volume.
 *
 * @param volumeLinear - Slider value in the range 0..1 representing perceived loudness (0 = silent, 1 = maximum)
 */
export function setTanpuraVolume(volumeLinear: number): void {
  if (volumeNode) volumeNode.volume.value = linearToDb(sliderToGain(volumeLinear)) + VOLUME_ATTENUATION_DB;
}

/**
 * Update the Tanpura's base pitch used to compute per-string frequencies.
 *
 * @param baseFreqHz - Base frequency in hertz for the tanpura cycle
 */
export function setTanpuraFrequency(baseFreqHz: number): void {
  baseFreqRef = baseFreqHz;
}

/**
 * Set the tanpura's octave for subsequent pluck cycles.
 *
 * If the tanpura is currently running, immediately schedules a pluck cycle using the new octave so the change is audible without waiting for the next loop period.
 *
 * @param octave - The target octave: `'low'`, `'medium'`, or `'high'`
 */
export function setTanpuraOctave(octave: Octave): void {
  octaveRef = octave;
  if (!isStarted) return;
  const now = Tone.getTransport().seconds;
  if (useSample) schedulePluckCycle(now);
  else scheduleSynthPluckCycle(now);
}

/**
 * Update the delay between successive string plucks and, if running, apply it immediately.
 *
 * Clamps `seconds` to the range 0.8–2.5 and stores it as the per-string pluck delay; when the Tanpura is started,
 * recreates the transport loop with a new period equal to `pluckDelay * 4`, sets a slight humanization, and triggers
 * an immediate pluck cycle so the tempo change is audible right away. If the Tanpura is not started, only the delay
 * value is updated and no scheduling occurs.
 *
 * @param seconds - Desired per-string delay in seconds (will be clamped to 0.8–2.5)
 */
export function setTanpuraPluckDelay(seconds: number): void {
  pluckDelaySecRef = Math.max(0.8, Math.min(2.5, seconds));
  if (!isStarted) return;
  // Recreate loop with new period and fire immediately
  if (pluckLoop) {
    pluckLoop.stop();
    pluckLoop.dispose();
    pluckLoop = null;
  }
  const periodSec = pluckDelaySecRef * 4;
  const now = Tone.getTransport().seconds;
  pluckLoop = useSample
    ? new Tone.Loop((time) => schedulePluckCycle(time), periodSec).start(now)
    : new Tone.Loop((time) => scheduleSynthPluckCycle(time), periodSec).start(now);
  pluckLoop.humanize = 0.02;
  // Fire immediately so new tempo is heard right away
  if (useSample) schedulePluckCycle(now);
  else scheduleSynthPluckCycle(now);
}

/**
 * Set the Tanpura note (resonant tail) length.
 *
 * When running, updates the pluck reverb decay and the synth release immediately.
 *
 * @param seconds - Desired note length in seconds; value is clamped to the range 2–8
 */
export function setTanpuraNoteLength(seconds: number): void {
  noteLengthSecRef = Math.max(2, Math.min(8, seconds));
  if (!isStarted) return;
  if (pluckReverb) pluckReverb.decay = noteLengthSecRef;
  if (polySynth) polySynth.set({ release: noteLengthSecRef } as any);
}

/**
 * Stops playback, disposes all Tanpura audio nodes and schedules, and resets internal state.
 *
 * Stops any active pluck loop, players, and synth voices, halts the Tone.js Transport,
 * disposes volume/reverb/players/synth resources, clears internal references, and marks
 * the Tanpura as not started so it can be safely reinitialized.
 */
export function disposeTanpura(): void {
  try {
    if (pluckLoop) {
      pluckLoop.stop();
      pluckLoop.dispose();
    }
    pluckPlayers.forEach(p => { try { p.stop(); } catch (_) {} });
    if (polySynth) polySynth.releaseAll();
    Tone.getTransport().stop();
  } catch (_) {}

  try {
    volumeNode?.dispose();
    pluckReverb?.dispose();
    pluckPlayers.forEach(p => p.dispose());
    polySynth?.dispose();
  } catch (_) {}

  volumeNode = null;
  pluckReverb = null;
  pluckPlayers = [];
  polySynth = null;
  pluckLoop = null;
  useSample = false;
  isStarted = false;
}