import { instrument, type Player, type InstrumentName } from 'soundfont-player';

export type InstrumentId = 'sine' | 'piano' | 'violin' | 'flute' | 'harmonium' | 'sitar';

const INSTRUMENT_MAP: Record<Exclude<InstrumentId, 'sine'>, InstrumentName> = {
  piano: 'acoustic_grand_piano',
  violin: 'violin',
  flute: 'flute',
  harmonium: 'reed_organ',  // Reed organ closest to harmonium (keyboard reed instrument)
  sitar: 'sitar',
};

const cache = new Map<string, Player>();

let contextCounter = 0;
/**
 * Produce a stable cache key scoped to a specific AudioContext and instrument identifier.
 *
 * @param context - The AudioContext used to scope the key; a small numeric id is assigned to the context if absent.
 * @param instrumentId - The instrument identifier (excluding `'sine'`) to include in the key.
 * @returns A string of the form `"<contextId>-<instrumentId>"` where `contextId` is a per-Context numeric id.
 */
function getCacheKey(context: AudioContext, instrumentId: Exclude<InstrumentId, 'sine'>): string {
  const id = (context as any).__instrumentContextId ?? ((context as any).__instrumentContextId = ++contextCounter);
  return `${id}-${instrumentId}`;
}

/**
 * Converts a frequency in hertz to the nearest MIDI note number.
 *
 * @param freq - Frequency in hertz
 * @returns The nearest MIDI note number, rounded to the nearest integer
 */
export function freqToMidi(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

/**
 * Convert a MIDI note number into its note name with octave.
 *
 * @param midi - The MIDI note number (integer, where 60 is middle C)
 * @returns The note name with octave (for example, `C4`)
 */
export function midiToNoteName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = ((midi % 12) + 12) % 12;
  return `${noteNames[noteIndex]}${octave}`;
}

/**
 * Convert a frequency in hertz to the nearest musical note name with octave.
 *
 * @param freq - Frequency in hertz (Hz)
 * @returns The nearest note name including octave (for example, `C4`)
 */
export function freqToNoteName(freq: number): string {
  return midiToNoteName(freqToMidi(freq));
}

/**
 * Return the note name to use for playback for a given frequency and instrument.
 *
 * @param freq - Frequency in Hertz
 * @param instrumentId - Instrument identifier; the `flute` is treated one octave higher
 * @returns The note name (for example, `"C4"`) corresponding to the instrument's played pitch
 */
export function freqToNoteNameForInstrument(freq: number, instrumentId: InstrumentId): string {
  if (instrumentId === 'flute') return freqToNoteName(freq * 2);
  return freqToNoteName(freq);
}

/**
 * Load or retrieve a cached soundfont Player for the given instrument in the provided AudioContext.
 *
 * If a Player for the (context, instrumentId) pair is already cached, the cached Player is returned
 * (and connected to `destination` if provided). Otherwise the instrument is loaded using the
 * FluidR3_GM soundfont, connected to `destination` (or `context.destination` if omitted), cached,
 * and returned.
 *
 * @param instrumentId - The instrument identifier to load (cannot be 'sine')
 * @param destination - Optional AudioNode to connect the Player's output to; defaults to `context.destination`
 * @returns The loaded or cached `Player` for the requested instrument
 */
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

/**
 * Determines whether an instrument ID refers to the sine instrument.
 *
 * @returns `true` if `instrumentId` is `'sine'`, `false` otherwise.
 */
export function isSineInstrument(instrumentId: InstrumentId): instrumentId is 'sine' {
  return instrumentId === 'sine';
}

export const INSTRUMENT_OPTIONS: { id: InstrumentId; label: string }[] = [
  { id: 'piano', label: 'Piano' },
  { id: 'violin', label: 'Violin' },
  { id: 'flute', label: 'Flute' },
  { id: 'harmonium', label: 'Harmonium' },
  { id: 'sitar', label: 'Sitar' },
  { id: 'sine', label: 'Sine' },
];