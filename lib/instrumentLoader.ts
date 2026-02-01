import { instrument, type Player, type InstrumentName } from 'soundfont-player';

export type InstrumentId = 'sine' | 'piano' | 'violin' | 'flute';

const INSTRUMENT_MAP: Record<Exclude<InstrumentId, 'sine'>, InstrumentName> = {
  piano: 'acoustic_grand_piano',
  violin: 'violin',
  flute: 'flute',
};

const cache = new Map<string, Player>();

let contextCounter = 0;
function getCacheKey(context: AudioContext, instrumentId: Exclude<InstrumentId, 'sine'>): string {
  const id = (context as any).__instrumentContextId ?? ((context as any).__instrumentContextId = ++contextCounter);
  return `${id}-${instrumentId}`;
}

export function freqToMidi(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

export function midiToNoteName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = ((midi % 12) + 12) % 12;
  return `${noteNames[noteIndex]}${octave}`;
}

export function freqToNoteName(freq: number): string {
  return midiToNoteName(freqToMidi(freq));
}

/** Note name for playback; flute is played one octave higher. */
export function freqToNoteNameForInstrument(freq: number, instrumentId: InstrumentId): string {
  if (instrumentId === 'flute') return freqToNoteName(freq * 2);
  return freqToNoteName(freq);
}

export async function getInstrument(
  context: AudioContext,
  instrumentId: Exclude<InstrumentId, 'sine'>,
  destination?: AudioNode
): Promise<Player> {
  const soundfontName = INSTRUMENT_MAP[instrumentId] ?? 'acoustic_grand_piano';
  const key = getCacheKey(context, instrumentId);
  const cached = cache.get(key);
  if (cached) {
    if (destination) cached.connect(destination);
    return cached;
  }
  const player = await instrument(context, soundfontName, {
    soundfont: 'FluidR3_GM',
    destination: destination ?? context.destination,
  });
  cache.set(key, player);
  return player;
}

export function isSineInstrument(instrumentId: InstrumentId): instrumentId is 'sine' {
  return instrumentId === 'sine';
}

export const INSTRUMENT_OPTIONS: { id: InstrumentId; label: string }[] = [
  { id: 'piano', label: 'Piano' },
  { id: 'violin', label: 'Violin' },
  { id: 'flute', label: 'Flute' },
  { id: 'sine', label: 'Sine' },
];
