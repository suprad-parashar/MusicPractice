/**
 * Metronome audio engine for Carnatic music practice.
 * Supports simple beats and Carnatic Tala patterns with emphasis on sam and anga starts.
 * 
 * Uses Tone.js for audio synthesis.
 */

import * as Tone from 'tone';
import type { TalaBeat, BeatEmphasis } from '@/data/talas';

// Audio settings for different beat emphases (softer, more musical tones)
const EMPHASIS_SETTINGS: Record<BeatEmphasis, { freq: number; duration: string; velocity: number }> = {
    sam: { freq: 880, duration: '16n', velocity: 0.8 },       // A5, strong but not harsh
    anga: { freq: 660, duration: '32n', velocity: 0.6 },      // E5, medium
    beat: { freq: 440, duration: '48n', velocity: 0.4 },      // A4, soft
};

const VOLUME_ATTENUATION_DB = -6;
const DEFAULT_TEMPO = 60; // BPM

let volumeNode: Tone.Volume | null = null;
let synth: Tone.Synth | null = null;
let loop: Tone.Loop | null = null;
let isStarted = false;
let currentPattern: TalaBeat[] = [];
let currentBeatIndex = 0;
let tempo = DEFAULT_TEMPO;
let volumeLinear = 0.7;
let onBeatCallback: ((beatIndex: number) => void) | null = null;

/**
 * Convert a linear amplitude value to decibels.
 */
function linearToDb(linear: number): number {
    if (linear <= 0) return -100;
    return 20 * Math.log10(Math.max(0.01, linear));
}

/**
 * Map a 0–1 UI slider value to a perceptually tuned linear gain.
 */
function sliderToGain(slider: number): number {
    if (slider <= 0) return 0;
    return Math.pow(slider, 2);
}

/**
 * Initialize the metronome audio chain.
 */
function initAudioChain(): void {
    if (volumeNode) return; // Already initialized

    volumeNode = new Tone.Volume(linearToDb(sliderToGain(volumeLinear)) + VOLUME_ATTENUATION_DB).toDestination();

    synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: {
            attack: 0.01,      // Slightly longer attack to avoid clicks
            decay: 0.15,       // Smoother decay
            sustain: 0,
            release: 0.15,     // Smoother release
        },
        volume: -10,           // Lower base volume
    }).connect(volumeNode);
}

/**
 * Schedule playback of the current beat pattern.
 */
function playBeat(time: number): void {
    if (!synth || currentPattern.length === 0) return;

    const beatIndex = currentBeatIndex; // Capture before incrementing
    const beat = currentPattern[beatIndex];
    const settings = EMPHASIS_SETTINGS[beat.emphasis];

    synth.triggerAttackRelease(settings.freq, settings.duration, time, settings.velocity);

    // Notify UI of beat change (use captured beatIndex)
    if (onBeatCallback) {
        Tone.getDraw().schedule(() => {
            onBeatCallback!(beatIndex);
        }, time);
    }

    // Advance to next beat
    currentBeatIndex = (currentBeatIndex + 1) % currentPattern.length;
}

/**
 * Start the metronome with the given pattern.
 * 
 * @param pattern - Array of TalaBeat objects defining the rhythm pattern
 * @param bpm - Tempo in beats per minute (one "beat" = one akshara/sub-beat)
 * @param onBeat - Optional callback fired on each beat with the current beat index
 */
export async function startMetronome(
    pattern: TalaBeat[],
    bpm: number = DEFAULT_TEMPO,
    onBeat?: (beatIndex: number) => void
): Promise<void> {
    if (typeof window === 'undefined') return;

    // Stop any existing playback
    if (isStarted) {
        stopMetronome();
    }

    await Tone.start();

    currentPattern = pattern;
    currentBeatIndex = 0;
    tempo = bpm;
    onBeatCallback = onBeat ?? null;

    initAudioChain();

    // BPM refers to individual aksharas (sub-beats)
    // Each akshara takes 60/tempo seconds
    const intervalSec = 60 / tempo;

    // Create the loop with interval in seconds
    loop = new Tone.Loop(playBeat, intervalSec);
    loop.start(0);

    Tone.getTransport().start();

    isStarted = true;
}

/**
 * Stop the metronome.
 */
export function stopMetronome(): void {
    if (!isStarted) return;

    if (loop) {
        loop.stop();
        loop.dispose();
        loop = null;
    }

    Tone.getTransport().stop();
    currentBeatIndex = 0;

    // Notify UI that we've stopped (reset to beat -1)
    if (onBeatCallback) {
        onBeatCallback(-1);
    }

    isStarted = false;
}

/**
 * Update the metronome tempo.
 * 
 * @param bpm - New tempo in beats per minute (clamped to 30-300)
 */
export function setMetronomeTempo(bpm: number): void {
    tempo = Math.max(30, Math.min(300, bpm));

    if (!isStarted || !loop) return;

    // Update the loop interval
    const intervalSec = 60 / tempo;
    loop.interval = intervalSec;
}

/**
 * Update the metronome volume.
 * 
 * @param linear - Volume in the range 0-1
 */
export function setMetronomeVolume(linear: number): void {
    volumeLinear = Math.max(0, Math.min(1, linear));
    if (volumeNode) {
        volumeNode.volume.value = linearToDb(sliderToGain(volumeLinear)) + VOLUME_ATTENUATION_DB;
    }
}

/**
 * Update the pattern while playing.
 * Useful for switching talas without stopping playback.
 * 
 * @param pattern - New beat pattern
 */
export function setMetronomePattern(pattern: TalaBeat[]): void {
    currentPattern = pattern;
    // Reset to beginning of new pattern
    currentBeatIndex = 0;
}

/**
 * Check if the metronome is currently playing.
 */
export function isMetronomePlaying(): boolean {
    return isStarted;
}

/**
 * Get the current beat index.
 */
export function getCurrentBeat(): number {
    return currentBeatIndex;
}

/**
 * Dispose of all audio resources.
 */
export function disposeMetronome(): void {
    stopMetronome();

    try {
        synth?.dispose();
        volumeNode?.dispose();
    } catch (_) { }

    synth = null;
    volumeNode = null;
    onBeatCallback = null;
}
