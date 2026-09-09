'use client';

import { RagaSearch } from '@/components/ragas/RagaSearch';

import { PlaybackButton } from '@/components/ui/Button';

import TempoControl from '@/components/ui/TempoControl';
import { SelectField } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { SARALI_VARISAI, Varisai, parseVarisaiNote } from '@/data/exercises/saraliVarisai';
import { JANTA_VARISAI } from '@/data/exercises/jantaVarisai';
import { MELASTHAYI_VARISAI } from '@/data/exercises/melasthayiVarisai';
import { MANDARASTHAYI_VARISAI } from '@/data/exercises/mandarasthayiVarisai';
import { getSwarafrequency } from '@/data/ragas';
import { MELAKARTA_RAGAS, MelakartaRaga } from '@/data/ragas';
import {
  getInstrument,
  freqToNoteNameForInstrument,
  isSineInstrument,
  type InstrumentId,
} from '@/lib/audio/instrumentLoader';
import { type NotationLanguage } from '@/lib/music/swaraNotation';
import { SwaraInNoteChip } from '@/components/notation/SwaraGlyph';
import { getStored, setStored } from '@/lib/storage';
import { DEFAULT_PRACTICE_BPM } from '@/lib/music/defaultTempo';

type VarisaiType = 'sarali' | 'janta' | 'melasthayi' | 'mandarasthayi';

const VARISAI_TYPES: { [key in VarisaiType]: { name: string; data: Varisai[] } } = {
  sarali: { name: 'Sarali Varisai', data: SARALI_VARISAI },
  janta: { name: 'Janta Varisai', data: JANTA_VARISAI },
  melasthayi: { name: 'Melasthayi Varisai', data: MELASTHAYI_VARISAI },
  mandarasthayi: { name: 'Mandarasthayi Varisai', data: MANDARASTHAYI_VARISAI },
};

/** Supports single exercises, guided listen-and-repeat, and continuous sing-along. */
export default function VarisaiPlayer({
  baseFreq,
  instrumentId = 'piano',
  volume = 0.5,
  notationLanguage = 'english',
}: {
  baseFreq: number;
  instrumentId?: InstrumentId;
  volume?: number;
  notationLanguage?: NotationLanguage;
}) {
  const [varisaiType, setVarisaiType] = useState<VarisaiType>('sarali');
  const currentVarisaiData = VARISAI_TYPES[varisaiType].data;
  const [selectedVarisai, setSelectedVarisai] = useState<Varisai>(currentVarisaiData[0]);
  const [selectedRaga, setSelectedRaga] = useState<MelakartaRaga>(
    MELAKARTA_RAGAS.find((r) => r.name === 'Mayamalavagowla') || MELAKARTA_RAGAS[14],
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [baseBPM, setBaseBPM] = useState(DEFAULT_PRACTICE_BPM);
  const [loop, setLoop] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [practiceMode, setPracticeMode] = useState(false);
  const [singAlongMode, setSingAlongMode] = useState(false);
  const [startFromCurrentExercise, setStartFromCurrentExercise] = useState(false);
  const [startFromCurrentIndex, setStartFromCurrentIndex] = useState(0); // which exercise to start from when "start from current" is on
  const [currentPracticeExercise, setCurrentPracticeExercise] = useState(0);
  const [practicePlayCount, setPracticePlayCount] = useState(0); // 0 = first play (with sound), 1 = second play (silent)
  const [storageReady, setStorageReady] = useState(false);
  const practicePlayCountRef = useRef(0); // Ref to track practice play count for closures
  const currentPracticeExerciseRef = useRef(0); // Ref to track current exercise for closures

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playheadTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isPlayingRef = useRef(false);
  const masterGainRef = useRef<GainNode | null>(null);
  const soundfontPlayerRef = useRef<Awaited<ReturnType<typeof getInstrument>> | null>(null);
  const instrumentIdRef = useRef<InstrumentId>(instrumentId);
  const baseFreqRef = useRef(baseFreq);
  const baseBPMRef = useRef(baseBPM);
  const selectedVarisaiRef = useRef<Varisai>(selectedVarisai);
  const selectedRagaRef = useRef<MelakartaRaga>(selectedRaga);
  const loopRef = useRef(loop);
  baseFreqRef.current = baseFreq;
  baseBPMRef.current = baseBPM;
  instrumentIdRef.current = instrumentId;
  selectedVarisaiRef.current = selectedVarisai;
  selectedRagaRef.current = selectedRaga;
  loopRef.current = loop;

  useEffect(() => {
    instrumentIdRef.current = instrumentId;
    if (isSineInstrument(instrumentId)) {
      soundfontPlayerRef.current = null;
      return;
    }
    if (audioContextRef.current && masterGainRef.current) {
      getInstrument(audioContextRef.current, instrumentId, masterGainRef.current)
        .then((player) => {
          soundfontPlayerRef.current = player;
        })
        .catch((err) => {
          console.error('Failed to load instrument on change:', err);
          soundfontPlayerRef.current = null;
        });
    } else {
      soundfontPlayerRef.current = null;
    }
  }, [instrumentId]);

  // Load persisted varisai settings before first paint (avoids flash of defaults)
  const VARISAI_STORAGE_KEY = 'varisaiSettings';
  type StoredVarisaiSettings = {
    varisaiType?: VarisaiType;
    selectedVarisaiNumber?: number;
    ragaNumber?: number;
    loop?: boolean;
    practiceMode?: boolean;
    singAlongMode?: boolean;
    startFromCurrentExercise?: boolean;
    startFromCurrentIndex?: number;
  };
  useLayoutEffect(() => {
    const stored = getStored<StoredVarisaiSettings>(VARISAI_STORAGE_KEY, {});
    const validTypes: VarisaiType[] = ['sarali', 'janta', 'melasthayi', 'mandarasthayi'];
    const type =
      stored.varisaiType && validTypes.includes(stored.varisaiType) ? stored.varisaiType : 'sarali';
    setVarisaiType(type);
    const data = VARISAI_TYPES[type].data;
    const varisaiNum =
      typeof stored.selectedVarisaiNumber === 'number' && stored.selectedVarisaiNumber >= 1
        ? Math.min(stored.selectedVarisaiNumber, data.length)
        : 1;
    setSelectedVarisai(data.find((v) => v.number === varisaiNum) || data[0]);
    if (typeof stored.ragaNumber === 'number') {
      const raga = MELAKARTA_RAGAS.find((r) => r.number === stored.ragaNumber);
      if (raga) setSelectedRaga(raga);
    }
    if (typeof stored.loop === 'boolean') setLoop(stored.loop);
    setPracticeMode(stored.practiceMode === true);
    setSingAlongMode(stored.practiceMode !== true && stored.singAlongMode === true);
    if (typeof stored.startFromCurrentExercise === 'boolean')
      setStartFromCurrentExercise(stored.startFromCurrentExercise);
    if (Number.isInteger(stored.startFromCurrentIndex) && stored.startFromCurrentIndex! >= 0)
      setStartFromCurrentIndex(Math.min(stored.startFromCurrentIndex!, data.length - 1));
    setStorageReady(true);
  }, []);

  // Persist varisai settings when they change
  useEffect(() => {
    // Gate on rendered state: a ref set in the layout effect lets the first render
    // overwrite saved choices with defaults before React applies the restored state.
    if (!storageReady) return;
    setStored(VARISAI_STORAGE_KEY, {
      varisaiType,
      selectedVarisaiNumber: selectedVarisai?.number,
      ragaNumber: selectedRaga?.number,
      loop,
      practiceMode,
      singAlongMode,
      startFromCurrentExercise,
      startFromCurrentIndex,
    });
  }, [
    storageReady,
    varisaiType,
    selectedVarisai,
    selectedRaga,
    loop,
    practiceMode,
    singAlongMode,
    startFromCurrentExercise,
    startFromCurrentIndex,
  ]);

  // Sync sidebar voice volume to master gain when it changes
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = linearToLogGain(volume);
    }
  }, [volume]);

  // Convert varisai notes to raga-specific swaras
  const convertVarisaiNoteToRaga = (note: string, raga: MelakartaRaga): string => {
    // Preserve ";" as continuation marker
    if (note === ';') {
      return ';';
    }

    const parsed = parseVarisaiNote(note);

    // Extract the swara variants from the raga's arohana (remove octave indicators)
    const arohana = raga.arohana.map((n) => {
      const p = parseVarisaiNote(n);
      return p.swara; // Get base swara without octave
    });

    const swaraMap: { [key: string]: string } = {
      S: arohana[0] || 'S', // First note is always S
      R: arohana[1] || 'R1', // Second note is R variant
      G: arohana[2] || 'G1', // Third note is G variant
      M: arohana[3] || 'M1', // Fourth note is M variant
      P: arohana[4] || 'P', // Fifth note is P
      D: arohana[5] || 'D1', // Sixth note is D variant
      N: arohana[6] || 'N1', // Seventh note is N variant
    };

    const baseSwara = swaraMap[parsed.swara] || parsed.swara;

    // Preserve octave indicator from the original note
    if (parsed.octave === 'higher') {
      return `>${baseSwara}`;
    } else if (parsed.octave === 'lower') {
      return `<${baseSwara}`;
    }
    return baseSwara;
  };

  interface NotePlayer {
    osc?: OscillatorNode;
    gain?: GainNode;
    stopTime: number;
    extend?: (additionalDuration: number, silent: boolean) => void;
  }

  // Convert linear volume (0-1) to logarithmic gain
  const linearToLogGain = (linearValue: number): number => {
    if (linearValue === 0) return 0;
    // Use cubic curve for logarithmic feel: gain = volume^3
    return Math.pow(linearValue, 3);
  };

  const playNote = (
    swara: string,
    duration: number,
    silent: boolean = false,
  ): NotePlayer | null => {
    if (!audioContextRef.current || !masterGainRef.current) return null;

    const parsed = parseVarisaiNote(swara);
    let freq = getSwarafrequency(baseFreqRef.current, parsed.swara);
    if (parsed.octave === 'higher') freq = freq * 2;
    else if (parsed.octave === 'lower') freq = freq * 0.5;

    const now = audioContextRef.current.currentTime;
    const stopTime = now + duration / 1000;

    if (!isSineInstrument(instrumentIdRef.current) && soundfontPlayerRef.current) {
      const noteName = freqToNoteNameForInstrument(freq, instrumentIdRef.current);
      // Use fixed gain 1.5 for soundfont; volume is controlled by masterGainRef (no double-apply)
      const gain = silent ? 0 : 1.5;
      soundfontPlayerRef.current.start(noteName, now, { duration: duration / 1000, gain });
      const state = { stopTime };
      return {
        get stopTime() {
          return state.stopTime;
        },
        extend(additionalDuration: number, extSilent: boolean) {
          if (!soundfontPlayerRef.current) return;
          const extGain = extSilent ? 0 : 1.5;
          soundfontPlayerRef.current!.start(noteName, state.stopTime, {
            duration: additionalDuration / 1000,
            gain: extGain,
          });
          state.stopTime += additionalDuration / 1000;
        },
      };
    }

    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    if (silent) {
      gain.gain.setValueAtTime(0, now);
    } else {
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gain.gain.setValueAtTime(0.3, stopTime - 0.05);
      gain.gain.linearRampToValueAtTime(0, stopTime);
    }
    osc.connect(gain);
    gain.connect(masterGainRef.current);
    osc.start(now);
    osc.stop(stopTime);
    oscillatorsRef.current.push(osc);
    return { osc, gain, stopTime };
  };

  const extendNote = (
    notePlayer: NotePlayer,
    additionalDuration: number,
    silent: boolean = false,
  ) => {
    if (notePlayer.extend) {
      notePlayer.extend(additionalDuration, silent);
      return;
    }
    if (!audioContextRef.current || !notePlayer.osc || !notePlayer.gain) return;
    const now = audioContextRef.current.currentTime;
    const currentStopTime = Math.max(notePlayer.stopTime, now);
    const newStopTime = currentStopTime + additionalDuration / 1000;
    notePlayer.gain.gain.cancelScheduledValues(now);
    if (silent) {
      notePlayer.gain.gain.setValueAtTime(0, now);
      notePlayer.gain.gain.setValueAtTime(0, newStopTime);
    } else {
      const sustainGain = 0.3;
      const currentGain = notePlayer.gain.gain.value;
      if (currentGain < sustainGain) {
        notePlayer.gain.gain.setValueAtTime(currentGain, now);
        notePlayer.gain.gain.linearRampToValueAtTime(sustainGain, now + 0.01);
      } else {
        notePlayer.gain.gain.setValueAtTime(sustainGain, now);
      }
      notePlayer.gain.gain.setValueAtTime(sustainGain, newStopTime - 0.05);
      notePlayer.gain.gain.linearRampToValueAtTime(0, newStopTime);
    }
    try {
      notePlayer.osc!.stop(newStopTime);
      notePlayer.stopTime = newStopTime;
    } catch (e) {}
  };

  const playVarisai = (
    silent: boolean = false,
    varisaiOverride?: Varisai,
    startIndex: number = 0,
  ) => {
    if (!isPlayingRef.current) return;

    // Use override if provided, otherwise use ref for latest value
    const varisaiToPlay = varisaiOverride || selectedVarisaiRef.current;
    const notes = varisaiToPlay.notes.map((note) =>
      convertVarisaiNoteToRaga(note, selectedRagaRef.current),
    );
    const totalNotes = notes.length;
    let lastNotePlayer: NotePlayer | null = null;

    const playNextNote = (index: number) => {
      if (!isPlayingRef.current) {
        setIsPlaying(false);
        isPlayingRef.current = false;
        return;
      }

      // Read current tempo from refs so changes apply on next note without restart
      const beatDurationMs = (60 / baseBPMRef.current) * 1000;
      const noteDuration = beatDurationMs;

      if (index >= totalNotes) {
        // Exercise finished
        if (singAlongMode) {
          // Sing along mode: no silent rounds, just go to next exercise
          setCurrentNoteIndex(0);
          const currentExercise = currentPracticeExerciseRef.current;

          if (currentExercise < currentVarisaiData.length - 1) {
            const nextExercise = currentExercise + 1;
            const nextVarisai = currentVarisaiData[nextExercise];
            currentPracticeExerciseRef.current = nextExercise;
            setCurrentPracticeExercise(nextExercise);
            setSelectedVarisai(nextVarisai);

            if (isPlayingRef.current) {
              playVarisai(false, nextVarisai);
            }
          } else {
            setIsPlaying(false);
            isPlayingRef.current = false;
            setSingAlongMode(false);
            setCurrentPracticeExercise(0);
            currentPracticeExerciseRef.current = 0;
            setCurrentNoteIndex(0);
            setSelectedVarisai(currentVarisaiData[0]);
          }
        } else if (practiceMode) {
          // In practice mode, check if we need to play again (silent) or move to next exercise
          if (!silent && practicePlayCountRef.current === 0) {
            // First play (with sound) finished, now play silently
            practicePlayCountRef.current = 1;
            setPracticePlayCount(1);
            setCurrentNoteIndex(0);
            // Use the current varisai from the closure
            const currentVarisai = varisaiToPlay;
            if (isPlayingRef.current) {
              playVarisai(true, currentVarisai); // Play silently
            }
          } else if (silent && practicePlayCountRef.current === 1) {
            // Second play (silent) finished, move to next exercise
            practicePlayCountRef.current = 0;
            setPracticePlayCount(0);
            setCurrentNoteIndex(0);

            // Get current exercise index from ref to avoid stale closure
            const currentExercise = currentPracticeExerciseRef.current;

            if (currentExercise < currentVarisaiData.length - 1) {
              // Move to next exercise
              const nextExercise = currentExercise + 1;
              const nextVarisai = currentVarisaiData[nextExercise];
              currentPracticeExerciseRef.current = nextExercise;
              setCurrentPracticeExercise(nextExercise);
              setSelectedVarisai(nextVarisai);

              if (isPlayingRef.current) {
                playVarisai(false, nextVarisai); // Play with sound
              }
            } else {
              // All exercises finished
              setIsPlaying(false);
              isPlayingRef.current = false;
              setPracticeMode(false);
              setCurrentPracticeExercise(0);
              currentPracticeExerciseRef.current = 0;
              setPracticePlayCount(0);
              practicePlayCountRef.current = 0;
              setCurrentNoteIndex(0);
              setSelectedVarisai(currentVarisaiData[0]);
            }
          }
        } else if (loopRef.current) {
          setCurrentNoteIndex(0);
          const swara = notes[0];
          if (swara !== ';') {
            if (!isSineInstrument(instrumentIdRef.current)) {
              const holdCount = (() => {
                let c = 0;
                while (1 + c < notes.length && notes[1 + c] === ';') c++;
                return c;
              })();
              const totalDurationMs = noteDuration * (1 + holdCount);
              lastNotePlayer = playNote(swara, totalDurationMs, silent);
              playheadTimeoutsRef.current.forEach((t) => clearTimeout(t));
              playheadTimeoutsRef.current = [];
              for (let i = 1; i <= holdCount; i++) {
                const t = setTimeout(() => {
                  if (isPlayingRef.current) setCurrentNoteIndex(i);
                }, noteDuration * i);
                playheadTimeoutsRef.current.push(t);
              }
              const nextTimeout = setTimeout(() => playNextNote(1 + holdCount), totalDurationMs);
              playheadTimeoutsRef.current.push(nextTimeout);
              timeoutRef.current = nextTimeout;
            } else {
              lastNotePlayer = playNote(swara, noteDuration, silent);
              if (notes.length > 1 && notes[1] === ';') {
                setTimeout(() => {
                  if (lastNotePlayer && isPlayingRef.current) {
                    extendNote(lastNotePlayer, noteDuration, silent);
                  }
                }, noteDuration - 60);
              }
              timeoutRef.current = setTimeout(() => playNextNote(1), noteDuration);
            }
          } else {
            timeoutRef.current = setTimeout(() => playNextNote(1), noteDuration);
          }
        } else {
          setIsPlaying(false);
          isPlayingRef.current = false;
          setCurrentNoteIndex(0);
        }
        return;
      }

      setCurrentNoteIndex(index);
      const swara = notes[index];

      // Count consecutive ";" after this index (for soundfont: play one long note instead of re-triggering)
      const countSemicolonsAhead = (from: number): number => {
        let c = 0;
        while (from + 1 + c < totalNotes && notes[from + 1 + c] === ';') c++;
        return c;
      };

      if (swara === ';') {
        // Sine only: extend the previous note (soundfont skips ";" by playing one long note)
        if (lastNotePlayer) {
          extendNote(lastNotePlayer, noteDuration, silent);
        }
        timeoutRef.current = setTimeout(() => playNextNote(index + 1), noteDuration);
        return;
      }

      // Stop the previous note if still playing (oscillator only)
      if (lastNotePlayer?.osc && lastNotePlayer?.gain && audioContextRef.current) {
        const now = audioContextRef.current.currentTime;
        if (now < lastNotePlayer.stopTime) {
          lastNotePlayer.gain.gain.cancelScheduledValues(now);
          const currentGain = lastNotePlayer.gain.gain.value;
          lastNotePlayer.gain.gain.setValueAtTime(currentGain, now);
          lastNotePlayer.gain.gain.linearRampToValueAtTime(0, now + 0.02);
          try {
            lastNotePlayer.osc.stop(now + 0.02);
          } catch (e) {}
        }
      }

      if (!isSineInstrument(instrumentIdRef.current)) {
        // Soundfont: play one note for full hold (note + all following ";") so it sustains, no re-trigger
        const holdCount = countSemicolonsAhead(index);
        const totalDurationMs = noteDuration * (1 + holdCount);
        lastNotePlayer = playNote(swara, totalDurationMs, silent);
        // Advance playhead through each dash (tie) so the orange highlight moves through note — — —
        playheadTimeoutsRef.current.forEach((t) => clearTimeout(t));
        playheadTimeoutsRef.current = [];
        for (let i = 1; i <= holdCount; i++) {
          const t = setTimeout(() => {
            if (isPlayingRef.current) setCurrentNoteIndex(index + i);
          }, noteDuration * i);
          playheadTimeoutsRef.current.push(t);
        }
        const nextTimeout = setTimeout(() => playNextNote(index + 1 + holdCount), totalDurationMs);
        playheadTimeoutsRef.current.push(nextTimeout);
        timeoutRef.current = nextTimeout;
        return;
      }

      // Sine: play one segment, extend proactively for ";"
      lastNotePlayer = playNote(swara, noteDuration, silent);
      if (index + 1 < totalNotes && notes[index + 1] === ';' && lastNotePlayer?.osc) {
        setTimeout(() => {
          if (lastNotePlayer && isPlayingRef.current) {
            extendNote(lastNotePlayer, noteDuration, silent);
          }
        }, noteDuration - 60);
      }
      timeoutRef.current = setTimeout(() => playNextNote(index + 1), noteDuration);
    };

    playNextNote(startIndex);
  };

  const startPlaying = async (varisaiOverride?: Varisai) => {
    if (isPlayingRef.current) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      if (!masterGainRef.current) {
        masterGainRef.current = audioContextRef.current.createGain();
        masterGainRef.current.connect(audioContextRef.current.destination);
        masterGainRef.current.gain.value = linearToLogGain(volume);
      }

      if (!isSineInstrument(instrumentIdRef.current)) {
        try {
          soundfontPlayerRef.current = await getInstrument(
            audioContextRef.current,
            instrumentIdRef.current,
            masterGainRef.current,
          );
        } catch (err) {
          console.error('Failed to load instrument:', err);
          setIsPlaying(false);
          isPlayingRef.current = false;
          return;
        }
      }

      isPlayingRef.current = true;
      setIsPlaying(true);

      if (practiceMode || singAlongMode) {
        const startIndex = startFromCurrentExercise
          ? Math.min(startFromCurrentIndex, currentVarisaiData.length - 1)
          : 0;
        const startVarisai = currentVarisaiData[startIndex];
        setCurrentPracticeExercise(startIndex);
        currentPracticeExerciseRef.current = startIndex;
        setPracticePlayCount(0);
        practicePlayCountRef.current = 0;
        setSelectedVarisai(startVarisai);
        setTimeout(() => {
          playVarisai(false, startVarisai);
        }, 100);
      } else {
        const varisaiToPlay = varisaiOverride ?? selectedVarisai;
        if (varisaiOverride) {
          setSelectedVarisai(varisaiOverride);
        }
        playVarisai(false, varisaiToPlay);
      }
    } catch (error) {
      console.error('Error starting varisai playback:', error);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  };

  const stopPlaying = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentNoteIndex(0);

    playheadTimeoutsRef.current.forEach((t) => clearTimeout(t));
    playheadTimeoutsRef.current = [];

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    oscillatorsRef.current.forEach((osc) => {
      try {
        osc.stop();
      } catch (e) {}
    });
    oscillatorsRef.current = [];

    if (soundfontPlayerRef.current) {
      try {
        soundfontPlayerRef.current.stop();
      } catch (e) {}
      soundfontPlayerRef.current = null;
    }

    // Reset practice/sing along mode state
    if (practiceMode || singAlongMode) {
      setPracticeMode(false);
      setSingAlongMode(false);
      setStartFromCurrentExercise(false);
      setCurrentPracticeExercise(0);
      currentPracticeExerciseRef.current = 0;
      setPracticePlayCount(0);
      practicePlayCountRef.current = 0;
      setSelectedVarisai(currentVarisaiData[0]);
    }
  };

  // Seek to a specific note index and continue playback from there
  // Only works in regular playback mode (not practice/sing-along)
  const seekToNote = async (noteIndex: number) => {
    // Disable seeking during practice/sing-along modes
    if (practiceMode || singAlongMode) return;

    // Clear existing playback timeout and playhead timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    playheadTimeoutsRef.current.forEach((t) => clearTimeout(t));
    playheadTimeoutsRef.current = [];

    // Stop any currently playing notes
    oscillatorsRef.current.forEach((osc) => {
      try {
        osc.stop();
      } catch (e) {}
    });
    oscillatorsRef.current = [];

    if (soundfontPlayerRef.current) {
      try {
        soundfontPlayerRef.current.stop();
      } catch (e) {}
    }

    // If not playing, start playback from this note
    if (!isPlayingRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContextClass();
        }
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        if (!masterGainRef.current) {
          masterGainRef.current = audioContextRef.current.createGain();
          masterGainRef.current.connect(audioContextRef.current.destination);
          masterGainRef.current.gain.value = linearToLogGain(volume);
        }

        if (!isSineInstrument(instrumentIdRef.current)) {
          try {
            soundfontPlayerRef.current = await getInstrument(
              audioContextRef.current,
              instrumentIdRef.current,
              masterGainRef.current,
            );
          } catch (err) {
            console.error('Failed to load instrument:', err);
            return;
          }
        }

        isPlayingRef.current = true;
        setIsPlaying(true);
      } catch (error) {
        console.error('Error starting varisai playback:', error);
        return;
      }
    }

    // Start playback from the clicked note
    playVarisai(false, selectedVarisai, noteIndex);
  };

  const handleVarisaiChange = (varisaiNumber: number) => {
    const varisai = currentVarisaiData.find((v) => v.number === varisaiNumber);
    if (varisai) {
      const wasPlaying = isPlayingRef.current;
      if (wasPlaying) {
        stopPlaying();
      }
      setSelectedVarisai(varisai);
      if (wasPlaying) {
        setTimeout(() => {
          startPlaying(varisai); // Pass explicitly to avoid stale state
        }, 100);
      }
    }
  };

  const handleVarisaiTypeChange = (type: VarisaiType) => {
    if (isPlaying) {
      stopPlaying();
    }
    setVarisaiType(type);
    const newData = VARISAI_TYPES[type].data;
    setSelectedVarisai(newData[0]);
    setCurrentPracticeExercise(0);
    currentPracticeExerciseRef.current = 0;
    setPracticePlayCount(0);
    practicePlayCountRef.current = 0;
  };

  const handleRagaChange = (ragaName: string) => {
    const raga = MELAKARTA_RAGAS.find((r) => r.name === ragaName);
    if (raga) {
      const wasPlaying = isPlayingRef.current;
      if (wasPlaying) {
        stopPlaying();
      }
      setSelectedRaga(raga);
      if (wasPlaying) {
        setTimeout(() => {
          startPlaying();
        }, 100);
      }
    }
  };

  const handleBaseBPMChange = (newBaseBPM: number) => {
    baseBPMRef.current = newBaseBPM;
    setBaseBPM(newBaseBPM);
  };

  useEffect(() => {
    return () => {
      stopPlaying();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Convert notes for display and playback using selected raga
  const notes = selectedVarisai.notes.map((note) => convertVarisaiNoteToRaga(note, selectedRaga));

  const handleModeChange = (mode: 'single' | 'practice' | 'sing-along') => {
    setPracticeMode(mode === 'practice');
    setSingAlongMode(mode === 'sing-along');
    if (mode === 'single') {
      setStartFromCurrentExercise(false);
    } else {
      setStartFromCurrentIndex(
        Math.max(
          0,
          currentVarisaiData.findIndex((v) => v.number === selectedVarisai.number),
        ),
      );
      setSelectedVarisai(currentVarisaiData[0]);
    }
    setCurrentPracticeExercise(0);
    currentPracticeExerciseRef.current = 0;
    setPracticePlayCount(0);
    practicePlayCountRef.current = 0;
  };

  if (!storageReady) {
    return (
      <div className="w-full max-w-4xl mx-auto flex items-center justify-center min-h-[200px]">
        <span className="text-muted text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto overflow-visible min-w-0">
      <div className="feature-panel">
        {/* Header */}
        <div className="feature-heading">
          <h2>{VARISAI_TYPES[varisaiType].name}</h2>
          <p className="text-muted text-sm md:text-base">Practice basic exercises</p>
        </div>

        <div className="varisai-config">
          <SelectField
            label="Varisai type"
            value={varisaiType}
            onChange={(event) => handleVarisaiTypeChange(event.target.value as VarisaiType)}
          >
            {(Object.keys(VARISAI_TYPES) as VarisaiType[]).map((type) => (
              <option key={type} value={type}>
                {VARISAI_TYPES[type].name}
              </option>
            ))}
          </SelectField>
          <div className="field">
            <span className="field-caption" aria-hidden="true">
              Raga
            </span>
            <RagaSearch
              selected={selectedRaga}
              ragas={MELAKARTA_RAGAS}
              onSelect={(raga) => handleRagaChange(raga.name)}
              showSelection
              className="raga-search--wide"
            />
          </div>
        </div>

        {/* Varisai Selection */}
        <fieldset className="exercise-picker">
          <legend>Exercise</legend>
          <div className="exercise-numbers">
            {currentVarisaiData.map((varisai) => {
              const inPracticeOrSingAlong = practiceMode || singAlongMode;
              const canChangeStartFrom =
                inPracticeOrSingAlong && !isPlaying && startFromCurrentExercise;
              const isStartFromExercise =
                (practiceMode || singAlongMode) &&
                !isPlaying &&
                startFromCurrentExercise &&
                currentVarisaiData.findIndex((v) => v.number === varisai.number) ===
                  startFromCurrentIndex;
              const isStartFromFirst = isStartFromExercise && startFromCurrentIndex === 0;
              return (
                <button
                  key={varisai.number}
                  type="button"
                  aria-label={`Exercise ${varisai.number}`}
                  aria-pressed={
                    startFromCurrentExercise
                      ? isStartFromExercise
                      : selectedVarisai.number === varisai.number
                  }
                  onClick={() => {
                    if (canChangeStartFrom) {
                      const idx = currentVarisaiData.findIndex((v) => v.number === varisai.number);
                      if (idx >= 0) setStartFromCurrentIndex(idx);
                    } else if (!inPracticeOrSingAlong) {
                      handleVarisaiChange(varisai.number);
                    }
                  }}
                  disabled={inPracticeOrSingAlong && !canChangeStartFrom}
                  style={
                    isStartFromExercise && !isStartFromFirst
                      ? {
                          backgroundColor: 'var(--accent-complement)',
                          color: 'var(--accent-complement-foreground)',
                        }
                      : undefined
                  }
                  className={
                    isStartFromFirst ||
                    (!isStartFromExercise && selectedVarisai.number === varisai.number)
                      ? 'is-selected'
                      : ''
                  }
                >
                  {varisai.number}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="exercise-mode">
          <SegmentedControl
            label="Practice mode"
            value={practiceMode ? 'practice' : singAlongMode ? 'sing-along' : 'single'}
            onChange={handleModeChange}
            disabled={isPlaying}
            options={[
              { value: 'single', label: 'Single exercise' },
              { value: 'practice', label: 'Listen & repeat' },
              { value: 'sing-along', label: 'Sing along' },
            ]}
          />
          {(practiceMode || singAlongMode) && (
            <div className="exercise-guidance">
              <label>
                <input
                  type="checkbox"
                  checked={startFromCurrentExercise}
                  onChange={(event) => setStartFromCurrentExercise(event.target.checked)}
                  disabled={isPlaying}
                />
                Start from current exercise
                {startFromCurrentExercise && ` (${startFromCurrentIndex + 1})`}
              </label>
              <p>
                {isPlaying
                  ? `Exercise ${currentPracticeExercise + 1} of ${currentVarisaiData.length}${practiceMode ? (practicePlayCount === 0 ? ' · Listen' : ' · Your turn') : ''}`
                  : practiceMode
                    ? 'Hear each exercise, then repeat it in silence.'
                    : 'Sing through every exercise with accompaniment.'}
              </p>
            </div>
          )}
        </div>

        <div className="playback-toolbar">
          <div className="exercise-playback">
            <PlaybackButton
              label="exercise"
              playing={isPlaying}
              onClick={isPlaying ? stopPlaying : () => startPlaying()}
            />
            <label className="loop-option">
              <input
                type="checkbox"
                checked={loop}
                onChange={(event) => setLoop(event.target.checked)}
                disabled={practiceMode || singAlongMode}
              />
              Loop playback
            </label>
          </div>
          <TempoControl value={baseBPM} onChange={handleBaseBPMChange} />
        </div>

        {/* Notes Display */}
        <div className="mt-8">
          <div className="text-center">
            <h3 className="exercise-notes-heading">{selectedVarisai.name}</h3>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5 sm:gap-2 justify-items-center max-w-2xl mx-auto px-1 sm:px-2">
              {notes.map((note, index) => {
                const parsed = note === ';' ? null : parseVarisaiNote(note);
                const active = isPlaying && index === currentNoteIndex;
                return (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Play from ${note === ';' ? 'held note' : note}, note ${index + 1}`}
                    aria-current={active ? 'step' : undefined}
                    disabled={practiceMode || singAlongMode}
                    onClick={() => seekToNote(index)}
                    className={`exercise-note ${active ? 'is-active' : ''} ${isPlaying && index < currentNoteIndex ? 'is-past' : ''}`}
                  >
                    {parsed ? (
                      <SwaraInNoteChip
                        swara={parsed.swara}
                        language={notationLanguage}
                        octave={parsed.octave}
                      />
                    ) : (
                      '—'
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
