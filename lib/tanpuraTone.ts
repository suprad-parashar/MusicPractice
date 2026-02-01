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
const PITCH_OCTAVE_DOWN = 0.5; // One octave lower

const DEFAULT_PLUCK_DELAY_SEC = 1.4; // Delay between each pluck (P, High S, High S, S)
const DEFAULT_NOTE_LENGTH_SEC = 5;   // How long each pluck resonates (synth) / reverb tail (sample)

type TanpuraOctave = 'low' | 'medium' | 'high';

let volumeNode: Tone.Volume | null = null;
let pluckPlayers: Tone.Player[] = [];
let pluckReverb: Tone.Reverb | null = null;
let pluckLoop: Tone.Loop | null = null;
let polySynth: Tone.PolySynth<Tone.PluckSynth> | null = null;
let baseFreqRef = 261.63;
let octaveRef: TanpuraOctave = 'medium';
let volumeRef = 0.5;
let pluckDelaySecRef = DEFAULT_PLUCK_DELAY_SEC;
let noteLengthSecRef = DEFAULT_NOTE_LENGTH_SEC;
let useSample = false;
let sampleBaseFreq = PLUCK_SAMPLE_BASE_FREQ;
let isStarted = false;

function linearToDb(linear: number): number {
  if (linear <= 0) return -100;
  return 20 * Math.log10(Math.max(0.01, linear));
}

function octaveMultiplier(octave: TanpuraOctave): number {
  switch (octave) {
    case 'low': return 0.63;
    case 'high': return 1.26;
    default: return 0.84;
  }
}

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

async function createPluckSampleChain(
  volumeLinear: number,
  sampleUrl: string,
  sampleBase: number
) {
  const volume = new Tone.Volume(linearToDb(volumeLinear)).toDestination();
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

function schedulePluckCycle(time: number): void {
  if (pluckPlayers.length < 4) return;
  const base = baseFreqRef * octaveMultiplier(octaveRef) * PITCH_OCTAVE_DOWN;
  const delayPerPluck = pluckDelaySecRef;

  PLUCK_RATIOS.forEach((ratio, i) => {
    const freq = base * ratio;
    const playbackRate = freq / sampleBaseFreq;
    const pluckTime = time + i * delayPerPluck;
    pluckPlayers[i].playbackRate = playbackRate;
    pluckPlayers[i].start(pluckTime);
  });
}

function createSynthPluckChain(baseFreqHz: number) {
  const mult = octaveMultiplier(octaveRef);
  const droneFreq = baseFreqHz * mult;

  const volume = new Tone.Volume(0).toDestination();
  const rev = new Tone.Reverb({ decay: 6, wet: 0.45 }).connect(volume);

  const poly = new Tone.PolySynth(Tone.PluckSynth, {
    volume: -8,
    resonance: 0.98,
    release: noteLengthSecRef,
  }).connect(rev);

  volumeNode = volume;
  polySynth = poly;
  return { volume, poly };
}

function scheduleSynthPluckCycle(time: number): void {
  if (!polySynth) return;
  const base = baseFreqRef * octaveMultiplier(octaveRef) * PITCH_OCTAVE_DOWN;
  const delayPerPluck = pluckDelaySecRef;

  PLUCK_RATIOS.forEach((ratio, i) => {
    const freq = base * ratio;
    const pluckTime = time + i * delayPerPluck;
    polySynth!.triggerAttackRelease(freq, noteLengthSecRef, pluckTime);
  });
}

export async function startTanpura(
  baseFreqHz: number,
  volumeLinear: number,
  pluckDelaySec: number = DEFAULT_PLUCK_DELAY_SEC,
  noteLengthSec: number = DEFAULT_NOTE_LENGTH_SEC
): Promise<void> {
  if (typeof window === 'undefined') return;
  await Tone.start();

  baseFreqRef = baseFreqHz;
  octaveRef = 'medium';
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
    volume.volume.value = linearToDb(volumeLinear);

    const periodSec = pluckDelaySecRef * 4;
    pluckLoop = new Tone.Loop((time) => schedulePluckCycle(time), periodSec).start(0);
    pluckLoop.humanize = 0.02;

    Tone.getTransport().start();
    useSample = true;
  } else {
    const { volume, poly } = createSynthPluckChain(baseFreqHz);
    volume.volume.value = linearToDb(volumeLinear);

    const periodSec = pluckDelaySecRef * 4;
    pluckLoop = new Tone.Loop((time) => scheduleSynthPluckCycle(time), periodSec).start(0);
    pluckLoop.humanize = 0.02;

    Tone.getTransport().start();
    useSample = false;
  }

  isStarted = true;
}

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

export function setTanpuraVolume(volumeLinear: number): void {
  if (volumeNode) volumeNode.volume.value = linearToDb(volumeLinear);
}

export function setTanpuraFrequency(baseFreqHz: number): void {
  baseFreqRef = baseFreqHz;
}

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

export function setTanpuraNoteLength(seconds: number): void {
  noteLengthSecRef = Math.max(2, Math.min(8, seconds));
  if (!isStarted) return;
  if (pluckReverb) pluckReverb.decay = noteLengthSecRef;
  if (polySynth) polySynth.set({ release: noteLengthSecRef });
}

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
