'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { SARALI_VARISAI, Varisai, convertVarisaiNote, parseVarisaiNote } from '@/data/saraliVarisai';
import { JANTA_VARISAI } from '@/data/jantaVarisai';
import { MELASTHAYI_VARISAI } from '@/data/melasthayiVarisai';
import { MANDARASTHAYI_VARISAI } from '@/data/mandarasthayiVarisai';
import { getSwarafrequency } from '@/data/ragas';
import { MELAKARTA_RAGAS, MelakartaRaga } from '@/data/ragas';
import { getInstrument, freqToNoteNameForInstrument, isSineInstrument, type InstrumentId } from '@/lib/instrumentLoader';
import { type NotationLanguage } from '@/lib/swaraNotation';
import { SwaraGlyph, SwaraInNoteChip } from '@/components/SwaraGlyph';
import { filterAndSortRagasBySearch } from '@/lib/ragaSearch';
import { getStored, setStored } from '@/lib/storage';
import { DEFAULT_PRACTICE_BPM, PRACTICE_TEMPO_MAX_BPM } from '@/lib/defaultTempo';

type VarisaiType = 'sarali' | 'janta' | 'melasthayi' | 'mandarasthayi';

const VARISAI_TYPES: { [key in VarisaiType]: { name: string; data: Varisai[] } } = {
  sarali: { name: 'Sarali Varisai', data: SARALI_VARISAI },
  janta: { name: 'Janta Varisai', data: JANTA_VARISAI },
  melasthayi: { name: 'Melasthayi Varisai', data: MELASTHAYI_VARISAI },
  mandarasthayi: { name: 'Mandarasthayi Varisai', data: MANDARASTHAYI_VARISAI },
};

/**
 * Interactive React component for selecting, configuring, and playing Carnatic varisai exercises.
 *
 * Renders UI to choose varisai type, raga, tempo, playback modes (practice, sing-along, loop),
 * and starts/stops instrument-aware audio playback of the selected exercise while persisting user settings.
 *
 * @param baseFreq - Reference tonic frequency in Hz used to compute swara frequencies (e.g., 440).
 * @param instrumentId - Instrument identifier to use for playback; supports sine and soundfont instruments. Defaults to `'piano'`.
 * @param volume - Master linear volume in the range 0–1. Defaults to `0.5`.
 * @param notationLanguage - Script used to render swaras in the UI (e.g., `'english'`, `'devanagari'`). Defaults to `'english'`.
 * @returns A JSX element containing the full Varisai player UI and controls.
 */
export default function VarisaiPlayer({ baseFreq, instrumentId = 'piano', volume = 0.5, notationLanguage = 'english' }: { baseFreq: number; instrumentId?: InstrumentId; volume?: number; notationLanguage?: NotationLanguage }) {
  const [varisaiType, setVarisaiType] = useState<VarisaiType>('sarali');
  const currentVarisaiData = VARISAI_TYPES[varisaiType].data;
  const [selectedVarisai, setSelectedVarisai] = useState<Varisai>(currentVarisaiData[0]);
  const [selectedRaga, setSelectedRaga] = useState<MelakartaRaga>(
    MELAKARTA_RAGAS.find(r => r.name === 'Mayamalavagowla') || MELAKARTA_RAGAS[14]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [baseBPM, setBaseBPM] = useState(DEFAULT_PRACTICE_BPM);
  const [tempoInputValue, setTempoInputValue] = useState(String(DEFAULT_PRACTICE_BPM));
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
  const hasLoadedVarisaiRef = useRef(false);

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

  // Sync tempo input when baseBPM changes
  useEffect(() => {
    setTempoInputValue(String(baseBPM));
  }, [baseBPM]);

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
    const type = stored.varisaiType && validTypes.includes(stored.varisaiType) ? stored.varisaiType : 'sarali';
    setVarisaiType(type);
    const data = VARISAI_TYPES[type].data;
    const varisaiNum = typeof stored.selectedVarisaiNumber === 'number' && stored.selectedVarisaiNumber >= 1
      ? Math.min(stored.selectedVarisaiNumber, data.length)
      : 1;
    setSelectedVarisai(data.find(v => v.number === varisaiNum) || data[0]);
    if (typeof stored.ragaNumber === 'number') {
      const raga = MELAKARTA_RAGAS.find(r => r.number === stored.ragaNumber);
      if (raga) setSelectedRaga(raga);
    }
    if (typeof stored.loop === 'boolean') setLoop(stored.loop);
    if (typeof stored.practiceMode === 'boolean') setPracticeMode(stored.practiceMode);
    if (typeof stored.singAlongMode === 'boolean') setSingAlongMode(stored.singAlongMode);
    if (typeof stored.startFromCurrentExercise === 'boolean') setStartFromCurrentExercise(stored.startFromCurrentExercise);
    if (typeof stored.startFromCurrentIndex === 'number' && stored.startFromCurrentIndex >= 0) setStartFromCurrentIndex(stored.startFromCurrentIndex);
    hasLoadedVarisaiRef.current = true;
    setStorageReady(true);
  }, []);

  // Persist varisai settings when they change
  useEffect(() => {
    if (!hasLoadedVarisaiRef.current) return;
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
  }, [varisaiType, selectedVarisai, selectedRaga, loop, practiceMode, singAlongMode, startFromCurrentExercise, startFromCurrentIndex]);

  const sortedRagas = [...MELAKARTA_RAGAS].sort((a, b) => a.name.localeCompare(b.name));

  const filteredRagas = filterAndSortRagasBySearch(sortedRagas, searchQuery);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Sync sidebar voice volume to master gain when it changes
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = linearToLogGain(volume);
    }
  }, [volume]);

  const beatDuration = (60 / baseBPM) * 1000;
  const noteDuration = beatDuration;

  // Convert varisai notes to raga-specific swaras
  const convertVarisaiNoteToRaga = (note: string, raga: MelakartaRaga): string => {
    // Preserve ";" as continuation marker
    if (note === ";") {
      return ";";
    }

    const parsed = parseVarisaiNote(note);

    // Extract the swara variants from the raga's arohana (remove octave indicators)
    const arohana = raga.arohana.map(n => {
      const p = parseVarisaiNote(n);
      return p.swara; // Get base swara without octave
    });

    const swaraMap: { [key: string]: string } = {
      "S": arohana[0] || "S",           // First note is always S
      "R": arohana[1] || "R1",          // Second note is R variant
      "G": arohana[2] || "G1",          // Third note is G variant
      "M": arohana[3] || "M1",          // Fourth note is M variant
      "P": arohana[4] || "P",           // Fifth note is P
      "D": arohana[5] || "D1",          // Sixth note is D variant
      "N": arohana[6] || "N1",          // Seventh note is N variant
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

  const playNote = (swara: string, duration: number, silent: boolean = false): NotePlayer | null => {
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
          soundfontPlayerRef.current!.start(noteName, state.stopTime, { duration: additionalDuration / 1000, gain: extGain });
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

  const stopNote = (notePlayer: NotePlayer) => {
    if (!audioContextRef.current || !notePlayer.osc || !notePlayer.gain) return;
    const now = audioContextRef.current.currentTime;
    notePlayer.gain.gain.cancelScheduledValues(now);

    // Fade out quickly
    const currentGain = notePlayer.gain.gain.value;
    notePlayer.gain.gain.setValueAtTime(currentGain, now);
    notePlayer.gain.gain.linearRampToValueAtTime(0, now + 0.05); // Quick fade out

    // Stop the oscillator
    try {
      notePlayer.osc.stop(now + 0.05);
      notePlayer.stopTime = now + 0.05;
    } catch (e) {
      // Oscillator might have already stopped, that's okay
    }
  };

  const extendNote = (notePlayer: NotePlayer, additionalDuration: number, silent: boolean = false) => {
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
    } catch (e) { }
  };

  const playVarisai = (silent: boolean = false, varisaiOverride?: Varisai, startIndex: number = 0) => {
    if (!isPlayingRef.current) return;

    // Use override if provided, otherwise use ref for latest value
    const varisaiToPlay = varisaiOverride || selectedVarisaiRef.current;
    const notes = varisaiToPlay.notes.map(note => convertVarisaiNoteToRaga(note, selectedRagaRef.current));
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
          if (swara !== ";") {
            if (!isSineInstrument(instrumentIdRef.current)) {
              const holdCount = (() => { let c = 0; while (1 + c < notes.length && notes[1 + c] === ";") c++; return c; })();
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
              if (notes.length > 1 && notes[1] === ";") {
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
        while (from + 1 + c < totalNotes && notes[from + 1 + c] === ";") c++;
        return c;
      };

      if (swara === ";") {
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
          } catch (e) { }
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
      if (index + 1 < totalNotes && notes[index + 1] === ";" && lastNotePlayer?.osc) {
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
            masterGainRef.current
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
        const startIndex = startFromCurrentExercise ? Math.min(startFromCurrentIndex, currentVarisaiData.length - 1) : 0;
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

    oscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
      } catch (e) { }
    });
    oscillatorsRef.current = [];

    if (soundfontPlayerRef.current) {
      try {
        soundfontPlayerRef.current.stop();
      } catch (e) { }
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
    oscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
      } catch (e) { }
    });
    oscillatorsRef.current = [];

    if (soundfontPlayerRef.current) {
      try {
        soundfontPlayerRef.current.stop();
      } catch (e) { }
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
              masterGainRef.current
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
    const varisai = currentVarisaiData.find(v => v.number === varisaiNumber);
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
    const raga = MELAKARTA_RAGAS.find(r => r.name === ragaName);
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
        audioContextRef.current.close().catch(() => { });
      }
    };
  }, []);

  // Update selected varisai when type changes (e.g. sarali -> janta)
  // Don't reset when isPlaying changes - that would override user's exercise selection when switching mid-playback
  useEffect(() => {
    const newData = VARISAI_TYPES[varisaiType].data;
    setSelectedVarisai(newData[0]);
  }, [varisaiType]);

  // Convert notes for display and playback using selected raga
  const notes = selectedVarisai.notes.map(note => convertVarisaiNoteToRaga(note, selectedRaga));

  // Calculate optimal number of columns for even distribution
  const calculateOptimalColumns = (itemCount: number): number => {
    if (itemCount <= 7) return itemCount;
    if (itemCount <= 12) return 6; // 12 items = 2 rows of 6
    if (itemCount <= 14) return 7; // 14 items = 2 rows of 7
    if (itemCount <= 16) return 8; // 16 items = 2 rows of 8
    if (itemCount <= 18) return 6; // 18 items = 3 rows of 6
    if (itemCount <= 20) return 5; // 20 items = 4 rows of 5
    // For larger counts, use a reasonable default
    return 7;
  };

  const optimalColumns = calculateOptimalColumns(currentVarisaiData.length);

  if (!storageReady) {
    return (
      <div className="w-full max-w-4xl mx-auto flex items-center justify-center min-h-[200px]">
        <span className="text-slate-500 text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto overflow-visible min-w-0">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-12 shadow-2xl border border-slate-700/50 overflow-visible">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light mb-2 tracking-wide">
            {VARISAI_TYPES[varisaiType].name}
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Practice basic exercises
          </p>
        </div>

        {/* Varisai Type Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-300 mb-3 text-center">
            Select Varisai Type
          </label>
          <div className="flex flex-wrap gap-2 justify-center">
            {(Object.keys(VARISAI_TYPES) as VarisaiType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleVarisaiTypeChange(type)}
                className={`
                  px-4 py-2 rounded-lg
                  transition-all duration-200
                  text-sm font-medium
                  cursor-pointer
                  ${varisaiType === type
                    ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30 scale-105'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:scale-102'
                  }
                `}
              >
                {VARISAI_TYPES[type].name}
              </button>
            ))}
          </div>
        </div>

        {/* Raga Selection */}
        <div className="mb-8 w-full">
          <label className="block text-sm font-medium text-slate-300 mb-3 text-center">
            Select Raga
          </label>
          <div className="relative w-full" ref={dropdownRef}>
            <input
              type="text"
              value={dropdownOpen ? searchQuery : selectedRaga.name}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => {
                setSearchQuery('');
                setDropdownOpen(true);
              }}
              placeholder={selectedRaga.name}
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm cursor-pointer"
            />
            {dropdownOpen && (
              <div
                className="scroll-area-transparent absolute z-50 w-full mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl py-2"
                style={{ maxHeight: '280px', overflowY: 'auto' }}
              >
                {filteredRagas.length > 0 ? (
                  filteredRagas.map((raga) => (
                    <button
                      key={raga.number}
                      type="button"
                      onClick={() => {
                        handleRagaChange(raga.name);
                        setSearchQuery('');
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left pl-4 pr-4 py-3 text-sm cursor-pointer text-slate-200"
                      style={{ transition: 'background-color 0.15s ease' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--accent, #f59e0b)';
                        e.currentTarget.style.color = '#0f172a';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#e2e8f0';
                      }}
                    >
                      {raga.name}
                    </button>
                  ))
                ) : (
                  <div className="pl-4 pr-4 py-3 text-sm text-slate-400 text-center">No ragas found</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Practice Mode & Sing Along Mode Toggles */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={practiceMode}
              onChange={(e) => {
                if (isPlaying) stopPlaying();
                const checked = e.target.checked;
                setPracticeMode(checked);
                if (checked) {
                  setSingAlongMode(false);
                  setStartFromCurrentIndex(Math.max(0, currentVarisaiData.findIndex((v) => v.number === selectedVarisai.number)));
                } else {
                  setStartFromCurrentExercise(false);
                }
                setCurrentPracticeExercise(0);
                currentPracticeExerciseRef.current = 0;
                setPracticePlayCount(0);
                practicePlayCountRef.current = 0;
                if (checked) setSelectedVarisai(currentVarisaiData[0]);
              }}
              className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
              disabled={isPlaying}
            />
            <span className="text-sm font-medium text-slate-300">Practice Mode</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={singAlongMode}
              onChange={(e) => {
                if (isPlaying) stopPlaying();
                const checked = e.target.checked;
                setSingAlongMode(checked);
                if (checked) {
                  setPracticeMode(false);
                  setStartFromCurrentIndex(Math.max(0, currentVarisaiData.findIndex((v) => v.number === selectedVarisai.number)));
                } else {
                  setStartFromCurrentExercise(false);
                }
                setCurrentPracticeExercise(0);
                currentPracticeExerciseRef.current = 0;
                setPracticePlayCount(0);
                practicePlayCountRef.current = 0;
                if (checked) setSelectedVarisai(currentVarisaiData[0]);
              }}
              className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
              disabled={isPlaying}
            />
            <span className="text-sm font-medium text-slate-300">Sing Along Mode</span>
          </label>
          {(practiceMode || singAlongMode) && (
            <>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={startFromCurrentExercise}
                  onChange={(e) => {
                    if (isPlaying) return;
                    setStartFromCurrentExercise(e.target.checked);
                  }}
                  className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
                  disabled={isPlaying}
                />
                <span className="text-sm font-medium text-slate-300">
                  Start from current exercise {startFromCurrentExercise && `(exercise ${startFromCurrentIndex + 1})`}
                </span>
              </label>
              <div className="text-sm text-slate-400 w-full text-center">
                {isPlaying ? (
                  <span>
                    Exercise {currentPracticeExercise + 1}/{currentVarisaiData.length}
                    {practiceMode && ` - ${practicePlayCount === 0 ? 'With Sound' : 'Silent'}`}
                  </span>
                ) : (
                  <span>
                    {startFromCurrentExercise
                      ? `Play will start from exercise ${startFromCurrentIndex + 1} to end`
                      : practiceMode
                        ? 'Ready to start from first exercise — will play all (with sound, then silent each)'
                        : 'Ready to start from first exercise — will play all with sound'}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Varisai Selection */}
        <div className="mb-8 flex flex-col justify-center items-center w-full">
          <label className="block text-sm font-medium text-slate-300 mb-4 text-center">
            Select Exercise
          </label>
          <div className={`grid gap-2 w-full px-2 justify-items-center`} style={{ gridTemplateColumns: `repeat(${optimalColumns}, minmax(0, 1fr))` }}>
            {currentVarisaiData.map((varisai) => {
              const inPracticeOrSingAlong = practiceMode || singAlongMode;
              const canChangeStartFrom = inPracticeOrSingAlong && !isPlaying && startFromCurrentExercise;
              const isStartFromExercise = (practiceMode || singAlongMode) && !isPlaying && startFromCurrentExercise && currentVarisaiData.findIndex((v) => v.number === varisai.number) === startFromCurrentIndex;
              const isStartFromFirst = isStartFromExercise && startFromCurrentIndex === 0;
              return (
                <button
                  key={varisai.number}
                  onClick={() => {
                    if (canChangeStartFrom) {
                      const idx = currentVarisaiData.findIndex((v) => v.number === varisai.number);
                      if (idx >= 0) setStartFromCurrentIndex(idx);
                    } else if (!inPracticeOrSingAlong) {
                      handleVarisaiChange(varisai.number);
                    }
                  }}
                  disabled={inPracticeOrSingAlong && !canChangeStartFrom}
                  style={isStartFromExercise && !isStartFromFirst ? { backgroundColor: 'var(--accent-complement)', color: 'var(--accent-complement-foreground)' } : undefined}
                  className={`
                    flex items-center justify-center
                    py-3 px-4 rounded-lg
                    transition-all duration-200
                    text-sm font-medium
                    w-full max-w-[60px]
                    ${inPracticeOrSingAlong && !canChangeStartFrom ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${isStartFromFirst
                      ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30 scale-105'
                      : isStartFromExercise
                        ? 'shadow-lg'
                        : selectedVarisai.number === varisai.number
                          ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30 scale-105'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:scale-102'
                    }
                  `}
                >
                  {varisai.number}
                </button>
              );
            })}
          </div>
          <div className="mt-4 w-full text-center">
            <p className="text-slate-400 text-sm">
              <span className="text-amber-400 font-semibold">{selectedVarisai.name}</span>
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex flex-col items-center mb-8">
          <button
            onClick={isPlaying ? stopPlaying : () => startPlaying()}
            className={`
              relative w-32 h-32 md:w-40 md:h-40 rounded-full
              border-2 border-[var(--border)]
              transition-all duration-300 ease-out
              ${isPlaying
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/50 scale-105 border-[var(--accent)]'
                : 'bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700'
              }
              flex items-center justify-center
              group
            `}
          >
            <div className={`
              absolute inset-0 rounded-full pointer-events-none
              ${isPlaying ? 'animate-ping opacity-20' : ''}
              ${isPlaying ? 'bg-amber-400' : ''}
            `} />
            <svg
              className={`w-12 h-12 md:w-16 md:h-16 transition-transform duration-300 ${isPlaying ? 'scale-110' : 'scale-100 group-hover:scale-105'
                }`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              {isPlaying ? (
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              ) : (
                <path d="M8 5v14l11-7z" />
              )}
            </svg>
          </button>

          <p className="mt-4 text-slate-400 text-sm">
            {isPlaying ? `Playing at ${baseBPM} BPM` : 'Stopped'}
          </p>

          {/* Loop Toggle */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <input
              type="checkbox"
              id="varisai-loop-toggle"
              checked={loop}
              onChange={(e) => setLoop(e.target.checked)}
              disabled={practiceMode || singAlongMode}
              className={`w-4 h-4 rounded accent-amber-500 ${practiceMode || singAlongMode ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            />
            <label htmlFor="varisai-loop-toggle" className={`text-slate-300 text-sm ${practiceMode || singAlongMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
              Loop playback
            </label>
          </div>
        </div>

        {/* Tempo — match Raga tab */}
        <div className="mt-6 border-t border-slate-700/35 pt-6 pb-2">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
              <span className="text-sm font-medium text-slate-400">Tempo (BPM)</span>
              <div className="flex w-full max-w-[280px] flex-row items-stretch divide-x divide-slate-600 overflow-hidden rounded-lg border border-slate-600 bg-slate-800/30">
                <button
                  type="button"
                  onClick={() => { const v = Math.max(30, Math.round(Math.floor(baseBPM / 2) / 5) * 5); handleBaseBPMChange(v); setTempoInputValue(String(v)); }}
                  disabled={baseBPM <= 30}
                  aria-label="Halve tempo"
                  className="flex h-10 min-w-[2.5rem] flex-1 items-center justify-center text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-slate-500"
                >
                  ÷2
                </button>
                <button
                  type="button"
                  onClick={() => { const v = Math.max(30, baseBPM - 5); handleBaseBPMChange(v); setTempoInputValue(String(v)); }}
                  disabled={baseBPM <= 30}
                  aria-label="Decrease tempo"
                  className="flex h-10 min-w-[2.5rem] flex-1 items-center justify-center text-lg leading-none text-slate-300 transition-colors hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-slate-500"
                >
                  −
                </button>
                <div className="flex h-10 min-w-[3.5rem] flex-[1.15] items-center justify-center bg-amber-400 px-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={tempoInputValue}
                    onFocus={() => setTempoInputValue(String(baseBPM))}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setTempoInputValue(val);
                    }}
                    onBlur={() => {
                      let num = parseInt(tempoInputValue, 10);
                      if (isNaN(num) || num < 30) num = 30;
                      if (num > PRACTICE_TEMPO_MAX_BPM) num = PRACTICE_TEMPO_MAX_BPM;
                      num = Math.round(num / 5) * 5;
                      handleBaseBPMChange(num);
                      setTempoInputValue(String(num));
                    }}
                    className="w-full bg-transparent text-center text-sm font-bold text-neutral-950 outline-none placeholder:text-neutral-600"
                    aria-label="Tempo BPM"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { const v = Math.min(PRACTICE_TEMPO_MAX_BPM, baseBPM + 5); handleBaseBPMChange(v); setTempoInputValue(String(v)); }}
                  disabled={baseBPM >= PRACTICE_TEMPO_MAX_BPM}
                  aria-label="Increase tempo"
                  className="flex h-10 min-w-[2.5rem] flex-1 items-center justify-center text-lg leading-none text-slate-300 transition-colors hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-slate-500"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => { const v = Math.min(PRACTICE_TEMPO_MAX_BPM, Math.round((baseBPM * 2) / 5) * 5); handleBaseBPMChange(v); setTempoInputValue(String(v)); }}
                  disabled={baseBPM >= PRACTICE_TEMPO_MAX_BPM}
                  aria-label="Double tempo"
                  className="flex h-10 min-w-[2.5rem] flex-1 items-center justify-center text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-slate-500"
                >
                  x2
                </button>
              </div>
          </div>
        </div>

        {/* Notes Display */}
        <div className="mt-8">
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-4">Exercise Notes</p>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5 sm:gap-2 justify-items-center max-w-2xl mx-auto px-1 sm:px-2">
              {notes.map((note, index) => {
                // Handle ";" as continuation marker
                if (note === ";") {
                  return (
                    <div
                      key={index}
                      onClick={() => seekToNote(index)}
                      className={`
                        w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg text-sm sm:text-lg font-semibold relative
                        transition-all duration-200 ${!practiceMode && !singAlongMode ? 'cursor-pointer hover:scale-105' : ''}
                        ${isPlaying && index === currentNoteIndex
                          ? 'bg-amber-500 text-slate-900 scale-110 shadow-lg'
                          : isPlaying && index < currentNoteIndex
                            ? `bg-slate-700/30 text-slate-500 ${!practiceMode && !singAlongMode ? 'hover:bg-slate-600/50' : ''}`
                            : `bg-slate-700/50 text-slate-300 ${!practiceMode && !singAlongMode ? 'hover:bg-slate-600/70' : ''}`
                        }
                      `}
                    >
                      —
                    </div>
                  );
                }

                const parsed = parseVarisaiNote(note);
                return (
                  <div
                    key={index}
                    onClick={() => seekToNote(index)}
                    className={`
                      w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center py-px rounded-lg text-sm sm:text-lg font-semibold
                      transition-all duration-200 min-w-0 ${!practiceMode && !singAlongMode ? 'cursor-pointer hover:scale-105' : ''}
                      ${isPlaying && index === currentNoteIndex
                        ? 'bg-amber-500 text-slate-900 scale-110 shadow-lg'
                        : isPlaying && index < currentNoteIndex
                          ? `bg-slate-700/30 text-slate-500 ${!practiceMode && !singAlongMode ? 'hover:bg-slate-600/50' : ''}`
                          : `bg-slate-700/50 text-slate-300 ${!practiceMode && !singAlongMode ? 'hover:bg-slate-600/70' : ''}`
                      }
                    `}
                  >
                    <SwaraInNoteChip swara={parsed.swara} language={notationLanguage} octave={parsed.octave} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}