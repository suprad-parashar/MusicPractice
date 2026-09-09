import { freqToNoteNameForInstrument, getInstrument, type InstrumentId } from './instrumentLoader';

/** Own one audio graph per player. Stop notes on navigation and release closed contexts. */
export class NotePlayer {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private instrument: Awaited<ReturnType<typeof getInstrument>> | null = null;
  private instrumentId: InstrumentId = 'sine';
  private oscillators = new Set<OscillatorNode>();
  private generation = 0;

  async prepare(instrumentId: InstrumentId, volume: number) {
    const generation = ++this.generation;
    const context = this.context ?? new AudioContext();
    this.context = context;
    if (!this.gain) {
      this.gain = context.createGain();
      this.gain.connect(context.destination);
    }
    this.setVolume(volume);
    if (context.state === 'suspended') await context.resume();
    if (this.context !== context || this.generation !== generation) return;
    this.instrumentId = instrumentId;
    if (instrumentId === 'sine') {
      this.instrument = null;
      return;
    }
    const instrument = await getInstrument(context, instrumentId, this.gain!);
    if (this.context === context && this.generation === generation) this.instrument = instrument;
  }

  setVolume(volume: number) {
    if (this.gain) this.gain.gain.value = Math.max(0, Math.min(1, volume)) ** 3;
  }

  play(frequency: number, duration: number) {
    if (!this.context || !this.gain || this.context.state === 'closed') return;
    const now = this.context.currentTime;
    if (this.instrumentId !== 'sine' && this.instrument) {
      this.instrument.start(freqToNoteNameForInstrument(frequency, this.instrumentId), now, {
        duration,
        gain: 1.5,
      });
      return;
    }
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.3, now + Math.min(0.01, duration / 4));
    envelope.gain.setValueAtTime(0.3, now + Math.max(duration - 0.05, duration / 2));
    envelope.gain.linearRampToValueAtTime(0, now + duration);
    oscillator.connect(envelope);
    envelope.connect(this.gain);
    this.oscillators.add(oscillator);
    oscillator.onended = () => {
      this.oscillators.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  stop() {
    this.oscillators.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch {
        /* Already ended. */
      }
    });
    this.oscillators.clear();
    this.instrument?.stop();
  }

  dispose() {
    this.generation += 1;
    this.stop();
    this.context?.close().catch(() => {});
    this.context = null;
    this.gain = null;
    this.instrument = null;
  }
}
