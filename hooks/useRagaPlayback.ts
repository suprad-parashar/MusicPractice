'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSwarafrequency, type Raga } from '@/data/ragas';
import { parseVarisaiNote } from '@/data/exercises/saraliVarisai';
import { NotePlayer } from '@/lib/audio/notePlayer';
import { midiKeyFrequency } from '@/lib/music/ragaPianoKeyboard';
import type { InstrumentId } from '@/lib/music/instruments';

interface Options {
  raga: Raga;
  baseFreq: number;
  instrumentId: InstrumentId;
  volume: number;
  bpm: number;
  loop: boolean;
}

export function useRagaPlayback(options: Options) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState('');
  const current = useRef(options);
  const player = useRef<NotePlayer | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  current.current = options;

  const cancel = useCallback(() => {
    generation.current += 1;
    busy.current = false;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    player.current?.stop();
  }, []);

  const stop = useCallback(() => {
    cancel();
    setPlaying(false);
    setLoading(false);
    setActiveIndex(-1);
  }, [cancel]);

  useEffect(() => {
    player.current?.setVolume(options.volume);
  }, [options.volume]);
  useEffect(() => {
    stop();
  }, [options.raga.ragaId, options.instrumentId, stop]);
  useEffect(
    () => () => {
      cancel();
      player.current?.dispose();
      player.current = null;
    },
    [cancel],
  );

  const start = async (index = 0, midi?: number) => {
    if (busy.current) return;
    stop();
    const token = generation.current;
    busy.current = true;
    setLoading(true);
    setError('');
    try {
      const audio = player.current ?? new NotePlayer();
      player.current = audio;
      await audio.prepare(current.current.instrumentId, current.current.volume);
      // A late soundfont response must never restart playback after leaving this screen.
      if (generation.current !== token) return;
      setLoading(false);
      busy.current = false;
      if (midi !== undefined) {
        audio.play(midiKeyFrequency(current.current.baseFreq, midi), 60 / current.current.bpm);
        return;
      }
      setPlaying(true);

      const next = (noteIndex: number) => {
        if (generation.current !== token) return;
        const { raga, bpm, loop, baseFreq } = current.current;
        // Tonic repeats at the junction: the ascent ends where the descent begins.
        const notes = [...raga.arohana, ...raga.avarohana];
        if (noteIndex >= notes.length) {
          if (!loop) {
            stop();
            return;
          }
          noteIndex = 0;
        }
        const note = parseVarisaiNote(notes[noteIndex]);
        const octave = note.octave === 'higher' ? 2 : note.octave === 'lower' ? 0.5 : 1;
        audio.play(getSwarafrequency(baseFreq, note.swara) * octave, 60 / bpm);
        setActiveIndex(noteIndex);
        timer.current = setTimeout(() => next(noteIndex + 1), 60_000 / bpm);
      };
      next(index);
    } catch {
      if (generation.current === token) {
        stop();
        setError('This instrument could not load. Try again, or choose Sine in practice tools.');
      }
    }
  };

  return {
    playing,
    loading,
    activeIndex,
    error,
    start,
    stop,
    playMidi: (midi: number) => start(0, midi),
  };
}
