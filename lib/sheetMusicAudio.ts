import { getInstrument, midiToNoteName } from '@/lib/instrumentLoader';
import type { Player } from 'soundfont-player';

let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let player: Player | null = null;
let initPromise: Promise<void> | null = null;
let seqToken = 0;

async function ensureAudio(): Promise<{ ctx: AudioContext; player: Player }> {
  if (ctx && player) {
    if (ctx.state === 'suspended') await ctx.resume();
    return { ctx, player };
  }
  if (initPromise) {
    await initPromise;
    return { ctx: ctx!, player: player! };
  }
  initPromise = (async () => {
    ctx = new AudioContext();
    gain = ctx.createGain();
    gain.gain.value = 0.7;
    gain.connect(ctx.destination);
    player = await getInstrument(ctx, 'piano', gain);
  })();
  await initPromise;
  return { ctx: ctx!, player: player! };
}

export async function playMidiNote(midi: number, durationMs = 800): Promise<void> {
  const { ctx: c, player: p } = await ensureAudio();
  p.start(midiToNoteName(midi), c.currentTime, { duration: durationMs / 1000, gain: 1.2 });
}

export async function playMidiChord(midis: number[], durationMs = 1200): Promise<void> {
  const { ctx: c, player: p } = await ensureAudio();
  const now = c.currentTime;
  const perNoteGain = Math.min(1.2, 2.4 / midis.length);
  for (const m of midis) {
    p.start(midiToNoteName(m), now, { duration: durationMs / 1000, gain: perNoteGain });
  }
}

export type SeqNote = { midi: number; durationMs?: number };

export async function playMidiSequence(
  notes: SeqNote[],
  intervalMs: number,
  onStep?: (index: number) => void,
): Promise<void> {
  const token = ++seqToken;
  const { ctx: c, player: p } = await ensureAudio();
  for (let i = 0; i < notes.length; i++) {
    if (seqToken !== token) return;
    onStep?.(i);
    const { midi, durationMs = intervalMs } = notes[i];
    p.start(midiToNoteName(midi), c.currentTime, { duration: durationMs / 1000, gain: 1.2 });
    if (i < notes.length - 1) {
      await new Promise<void>((r) => setTimeout(r, intervalMs));
    }
  }
  if (seqToken === token) {
    await new Promise<void>((r) => setTimeout(r, intervalMs));
    onStep?.(-1);
  }
}

export type ChordSeqItem = { midis: number[]; label: string };

export async function playChordSequence(
  chords: ChordSeqItem[],
  intervalMs: number,
  onStep?: (index: number) => void,
): Promise<void> {
  const token = ++seqToken;
  const { ctx: c, player: p } = await ensureAudio();
  for (let i = 0; i < chords.length; i++) {
    if (seqToken !== token) return;
    onStep?.(i);
    const now = c.currentTime;
    const perNoteGain = Math.min(1.0, 2.0 / chords[i].midis.length);
    for (const m of chords[i].midis) {
      p.start(midiToNoteName(m), now, { duration: intervalMs / 1000, gain: perNoteGain });
    }
    if (i < chords.length - 1) {
      await new Promise<void>((r) => setTimeout(r, intervalMs));
    }
  }
  if (seqToken === token) {
    await new Promise<void>((r) => setTimeout(r, intervalMs));
    onStep?.(-1);
  }
}

export function stopPlayback(): void {
  seqToken++;
  player?.stop();
}
