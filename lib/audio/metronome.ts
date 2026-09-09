import * as Tone from 'tone';
import type { TalaBeat, BeatEmphasis } from '@/data/talas';
import { PRACTICE_TEMPO_MAX_BPM } from '@/lib/music/defaultTempo';

const EMPHASIS_SETTINGS: Record<
  BeatEmphasis,
  { freq: number; duration: string; velocity: number }
> = {
  sam: { freq: 880, duration: '16n', velocity: 0.8 },
  anga: { freq: 660, duration: '32n', velocity: 0.6 },
  beat: { freq: 440, duration: '48n', velocity: 0.4 },
};

function volumeToDb(volume: number): number {
  // Squared gain gives the volume slider a gentler response at its quiet end.
  return volume <= 0 ? -100 : 20 * Math.log10(Math.max(0.01, volume ** 2)) - 6;
}

/** Own one audio chain and loop so a reference tala cannot stop the studio metronome. */
export function createMetronome() {
  let volumeNode: Tone.Volume | null = null;
  let synth: Tone.Synth | null = null;
  let loop: Tone.Loop | null = null;
  let playing = false;
  let pattern: TalaBeat[] = [];
  let beatIndex = 0;
  let tempo = 90;
  let volume = 0.7;
  let onBeat: ((index: number) => void) | null = null;
  let playbackVersion = 0;

  function initAudio() {
    if (volumeNode) return;
    volumeNode = new Tone.Volume(volumeToDb(volume)).toDestination();
    synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.15 },
      volume: -10,
    }).connect(volumeNode);
  }

  function playBeat(time: number) {
    if (!playing || !synth || !pattern.length) return;
    const index = beatIndex;
    const settings = EMPHASIS_SETTINGS[pattern[index].emphasis];
    synth.triggerAttackRelease(settings.freq, settings.duration, time, settings.velocity);

    const version = playbackVersion;
    const callback = onBeat;
    // Tone schedules ahead of the audible beat. Ignore UI work from stopped loops.
    if (callback) {
      Tone.getDraw().schedule(() => {
        if (playing && version === playbackVersion) callback(index);
      }, time);
    }
    beatIndex = (beatIndex + 1) % pattern.length;
  }

  function stop() {
    playbackVersion += 1;
    playing = false;
    loop?.stop();
    loop?.dispose();
    loop = null;
    beatIndex = 0;
    const callback = onBeat;
    onBeat = null;
    callback?.(-1);
  }

  function setTempo(bpm: number) {
    tempo = Math.max(30, Math.min(PRACTICE_TEMPO_MAX_BPM, bpm));
    if (loop) loop.interval = 60 / tempo;
  }

  async function start(beats: TalaBeat[], bpm = 90, callback?: (index: number) => void) {
    if (typeof window === 'undefined') return;
    stop();
    if (!beats.length) return;
    const version = playbackVersion;
    pattern = beats;
    onBeat = callback ?? null;
    setTempo(bpm);
    await Tone.start();
    // Navigation or a second click may cancel while the audio context is resuming.
    if (version !== playbackVersion) return;

    initAudio();
    playing = true;
    loop = new Tone.Loop(playBeat, 60 / tempo);
    loop.start(0);
    if (Tone.getTransport().state !== 'started') Tone.getTransport().start();
  }

  function setVolume(value: number) {
    volume = Math.max(0, Math.min(1, value));
    if (volumeNode) volumeNode.volume.value = volumeToDb(volume);
  }

  function setPattern(beats: TalaBeat[]) {
    pattern = beats;
    beatIndex = 0;
  }

  function dispose() {
    stop();
    synth?.dispose();
    volumeNode?.dispose();
    synth = null;
    volumeNode = null;
  }

  return { start, stop, setTempo, setVolume, setPattern, dispose };
}
