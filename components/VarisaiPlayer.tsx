'use client';

import { useState, useEffect, useRef } from 'react';
import { SARALI_VARISAI, Varisai, convertVarisaiNote, parseVarisaiNote } from '@/data/saraliVarisai';
import { JANTA_VARISAI } from '@/data/jantaVarisai';
import { MELASTHAYI_VARISAI } from '@/data/melasthayiVarisai';
import { MANDARASTHAYI_VARISAI } from '@/data/mandarasthayiVarisai';
import { getSwarafrequency } from '@/data/melakartaRagas';
import { MELAKARTA_RAGAS, MelakartaRaga } from '@/data/melakartaRagas';
import { getInstrument, freqToNoteNameForInstrument, isSineInstrument, type InstrumentId } from '@/lib/instrumentLoader';

type SortOrder = 'number' | 'alphabetical';
type VarisaiType = 'sarali' | 'janta' | 'melasthayi' | 'mandarasthayi';

const VARISAI_TYPES: { [key in VarisaiType]: { name: string; data: Varisai[] } } = {
  sarali: { name: 'Sarali Varasai', data: SARALI_VARISAI },
  janta: { name: 'Janta Varasai', data: JANTA_VARISAI },
  melasthayi: { name: 'Melasthayi Varasai', data: MELASTHAYI_VARISAI },
  mandarasthayi: { name: 'Mandarasthayi Varasai', data: MANDARASTHAYI_VARISAI },
};

export default function VarisaiPlayer({ baseFreq, instrumentId = 'piano' }: { baseFreq: number; instrumentId?: InstrumentId }) {
  const [varisaiType, setVarisaiType] = useState<VarisaiType>('sarali');
  const currentVarisaiData = VARISAI_TYPES[varisaiType].data;
  const [selectedVarisai, setSelectedVarisai] = useState<Varisai>(currentVarisaiData[0]);
  const [selectedRaga, setSelectedRaga] = useState<MelakartaRaga>(
    MELAKARTA_RAGAS.find(r => r.name === 'Mayamalavagowla') || MELAKARTA_RAGAS[14]
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>('number');
  const [isPlaying, setIsPlaying] = useState(false);
  const [baseBPM, setBaseBPM] = useState(90);
  const [notesPerBeat, setNotesPerBeat] = useState(1);
  const [loop, setLoop] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [practiceMode, setPracticeMode] = useState(false);
  const [singAlongMode, setSingAlongMode] = useState(false);
  const [startFromCurrentExercise, setStartFromCurrentExercise] = useState(false);
  const [startFromCurrentIndex, setStartFromCurrentIndex] = useState(0); // which exercise to start from when "start from current" is on
  const [currentPracticeExercise, setCurrentPracticeExercise] = useState(0);
  const [practicePlayCount, setPracticePlayCount] = useState(0); // 0 = first play (with sound), 1 = second play (silent)
  const [volume, setVolume] = useState(0.5); // Volume control (0-1)
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
  const notesPerBeatRef = useRef(notesPerBeat);
  baseFreqRef.current = baseFreq;
  baseBPMRef.current = baseBPM;
  notesPerBeatRef.current = notesPerBeat;
  instrumentIdRef.current = instrumentId;

  useEffect(() => {
    instrumentIdRef.current = instrumentId;
    if (isSineInstrument(instrumentId)) {
      soundfontPlayerRef.current = null;
      return;
    }
    if (isPlayingRef.current && audioContextRef.current && masterGainRef.current) {
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

  const beatDuration = (60 / baseBPM) * 1000;
  const noteDuration = beatDuration / notesPerBeat;

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
      // Use fixed gain 0.6 for soundfont; volume is controlled by masterGainRef (no double-apply)
      const gain = silent ? 0 : 0.6;
      soundfontPlayerRef.current.start(noteName, now, { duration: duration / 1000, gain });
      const state = { stopTime };
      return {
        get stopTime() {
          return state.stopTime;
        },
        extend(additionalDuration: number, extSilent: boolean) {
          if (!soundfontPlayerRef.current) return;
          const extGain = extSilent ? 0 : 0.6;
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
    } catch (e) {}
  };

  const playVarisai = (silent: boolean = false, varisaiOverride?: Varisai) => {
    if (!isPlayingRef.current) return;

    // Use override if provided, otherwise use selectedVarisai
    const varisaiToPlay = varisaiOverride || selectedVarisai;
    const notes = varisaiToPlay.notes.map(note => convertVarisaiNoteToRaga(note, selectedRaga));
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
      const noteDuration = beatDurationMs / notesPerBeatRef.current;

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
        } else if (loop) {
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
      if (index + 1 < totalNotes && notes[index + 1] === ";" && lastNotePlayer?.osc) {
        setTimeout(() => {
          if (lastNotePlayer && isPlayingRef.current) {
            extendNote(lastNotePlayer, noteDuration, silent);
          }
        }, noteDuration - 60);
      }
      timeoutRef.current = setTimeout(() => playNextNote(index + 1), noteDuration);
    };

    playNextNote(0);
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

  const handleBaseBPMChange = (newBaseBPM: number) => {
    baseBPMRef.current = newBaseBPM;
    setBaseBPM(newBaseBPM);
  };

  const handleNotesPerBeatChange = (newNotesPerBeat: number) => {
    notesPerBeatRef.current = newNotesPerBeat;
    setNotesPerBeat(newNotesPerBeat);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = linearToLogGain(newVolume);
    }
  };

  useEffect(() => {
    return () => {
      stopPlaying();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
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

  return (
    <div className="w-full max-w-4xl mx-auto overflow-visible">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-12 shadow-2xl border border-slate-700/50 overflow-visible">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-light mb-2 tracking-wide">
            {VARISAI_TYPES[varisaiType].name}
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Practice basic exercises
          </p>
        </div>

        {/* Varasai Type Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-300 mb-3 text-center">
            Select Varasai Type
          </label>
          <div className="flex flex-wrap gap-2 justify-center">
            {(Object.keys(VARISAI_TYPES) as VarisaiType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleVarisaiTypeChange(type)}
                disabled={isPlaying}
                className={`
                  px-4 py-2 rounded-lg
                  transition-all duration-200
                  text-sm font-medium
                  ${isPlaying ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${
                    varisaiType === type
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
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
            <select
              value={selectedRaga.name}
              onChange={(e) => {
                const raga = MELAKARTA_RAGAS.find(r => r.name === e.target.value);
                if (raga) setSelectedRaga(raga);
              }}
              className="flex-1 min-w-0 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
            >
              {[...MELAKARTA_RAGAS].sort((a, b) => {
                if (sortOrder === 'number') return a.number - b.number;
                return a.name.localeCompare(b.name);
              }).map((raga) => (
                <option key={raga.number} value={raga.name}>
                  {sortOrder === 'number' ? `${raga.number}. ` : ''}{raga.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2 flex-shrink-0 justify-center sm:justify-start">
              <button
                onClick={() => setSortOrder('number')}
                className={`px-3 py-2 rounded text-sm whitespace-nowrap transition-all ${
                  sortOrder === 'number'
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                By Number
              </button>
              <button
                onClick={() => setSortOrder('alphabetical')}
                className={`px-3 py-2 rounded text-sm whitespace-nowrap transition-all ${
                  sortOrder === 'alphabetical'
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                A-Z
              </button>
            </div>
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
                  style={isStartFromExercise && !isStartFromFirst ? { backgroundColor: '#2563eb', color: '#fff' } : undefined}
                  className={`
                    py-3 px-4 rounded-lg
                    transition-all duration-200
                    text-sm font-medium
                    w-full max-w-[60px]
                    ${inPracticeOrSingAlong && !canChangeStartFrom ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${
                      isStartFromFirst
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
          <div className="mt-4 text-center">
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
              transition-all duration-300 ease-out
              ${isPlaying 
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/50 scale-105' 
                : 'bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700'
              }
              flex items-center justify-center
              group
            `}
          >
            <div className={`
              absolute inset-0 rounded-full
              ${isPlaying ? 'animate-ping opacity-20' : ''}
              ${isPlaying ? 'bg-amber-400' : ''}
            `} />
            <svg
              className={`w-12 h-12 md:w-16 md:h-16 transition-transform duration-300 ${
                isPlaying ? 'scale-110' : 'scale-100 group-hover:scale-105'
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
            {isPlaying ? `Playing at ${baseBPM} BPM (${notesPerBeat} note${notesPerBeat > 1 ? 's' : ''} per beat)` : 'Stopped'}
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

        {/* Base BPM Control */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3 text-center">
            Base Speed: {baseBPM} BPM
          </label>
          <div className="flex items-center gap-4 px-4">
            <span className="text-slate-400 text-sm w-12">30</span>
            <input
              type="range"
              min="30"
              max="120"
              step="5"
              value={baseBPM}
              onChange={(e) => handleBaseBPMChange(parseInt(e.target.value))}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-slate-400 text-sm w-12 text-right">120</span>
          </div>
        </div>

        {/* Notes Per Beat Controls */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3 text-center">
            Notes Per Beat: {notesPerBeat}
          </label>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => handleNotesPerBeatChange(n)}
                className={`
                  px-4 py-2 rounded-lg
                  transition-all duration-200
                  text-sm font-medium
                  ${
                    notesPerBeat === n
                      ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30 scale-105'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:scale-102'
                  }
                `}
              >
                {n} note{n > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Volume Control */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3 text-center">
            Volume
          </label>
          <div className="flex items-center gap-4 px-4">
            <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-slate-400 text-sm w-12 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>

        {/* Notes Display */}
        <div className="mt-8">
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-4">Exercise Notes</p>
            <div className="grid grid-cols-8 gap-2 justify-items-center max-w-2xl mx-auto">
              {notes.map((note, index) => {
                // Handle ";" as continuation marker
                if (note === ";") {
                  return (
                    <div
                      key={index}
                      className={`
                        w-12 h-12 flex items-center justify-center rounded-lg text-lg font-semibold relative
                        transition-all duration-200
                        ${
                          isPlaying && index === currentNoteIndex
                            ? 'bg-amber-500 text-slate-900 scale-110 shadow-lg'
                            : isPlaying && index < currentNoteIndex
                            ? 'bg-slate-700/30 text-slate-500'
                            : 'bg-slate-700/50 text-slate-300'
                        }
                      `}
                    >
                      —
                    </div>
                  );
                }
                
                const parsed = parseVarisaiNote(note);
                // Display the full notation (e.g., "R2", "G3", "S", etc.)
                const displayNote = parsed.swara;
                return (
                  <div
                    key={index}
                    className={`
                      w-12 h-12 flex items-center justify-center rounded-lg text-lg font-semibold relative
                      transition-all duration-200
                      ${
                        isPlaying && index === currentNoteIndex
                          ? 'bg-amber-500 text-slate-900 scale-110 shadow-lg'
                          : isPlaying && index < currentNoteIndex
                          ? 'bg-slate-700/30 text-slate-500'
                          : 'bg-slate-700/50 text-slate-300'
                      }
                    `}
                  >
                    {displayNote}
                    {parsed.octave === 'higher' && (
                      <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-[-6px] text-[10px] leading-none">•</span>
                    )}
                    {parsed.octave === 'lower' && (
                      <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-[-6px] text-[10px] leading-none">•</span>
                    )}
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
