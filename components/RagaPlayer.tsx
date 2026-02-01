'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { MELAKARTA_RAGAS, MelakartaRaga, getSwarafrequency } from '@/data/melakartaRagas';
import { parseVarisaiNote } from '@/data/saraliVarisai';
import { getInstrument, freqToNoteNameForInstrument, isSineInstrument, type InstrumentId } from '@/lib/instrumentLoader';
import { getSwaraInScript, type NotationLanguage } from '@/lib/swaraNotation';
import { getStored, setStored } from '@/lib/storage';

type SortOrder = 'number' | 'alphabetical';

export default function RagaPlayer({ baseFreq, instrumentId = 'piano', volume = 0.5, notationLanguage = 'english' }: { baseFreq: number; instrumentId?: InstrumentId; volume?: number; notationLanguage?: NotationLanguage }) {
  const [selectedRaga, setSelectedRaga] = useState<MelakartaRaga>(
    MELAKARTA_RAGAS.find(r => r.name === 'Mayamalavagowla') || MELAKARTA_RAGAS[14]
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>('number');
  const [isPlaying, setIsPlaying] = useState(false);
  const [baseBPM, setBaseBPM] = useState(90); // Base BPM (30-120)
  const [loop, setLoop] = useState(false); // Loop playback
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [storageReady, setStorageReady] = useState(false);
  const hasLoadedRagaRef = useRef(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);
  const masterGainRef = useRef<GainNode | null>(null);
  const soundfontPlayerRef = useRef<Awaited<ReturnType<typeof getInstrument>> | null>(null);
  const instrumentIdRef = useRef<InstrumentId>(instrumentId);
  const baseFreqRef = useRef(baseFreq);
  const baseBPMRef = useRef(baseBPM);
  baseFreqRef.current = baseFreq;
  baseBPMRef.current = baseBPM;
  instrumentIdRef.current = instrumentId;

  // Sync sidebar voice volume to master gain when it changes
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = linearToLogGain(volume);
    }
  }, [volume]);

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

  // Load persisted raga practice settings before first paint (avoids flash of defaults)
  const RAGA_STORAGE_KEY = 'ragaSettings';
  type StoredRagaSettings = { ragaNumber?: number; sortOrder?: SortOrder; baseBPM?: number; loop?: boolean };
  useLayoutEffect(() => {
    const stored = getStored<StoredRagaSettings>(RAGA_STORAGE_KEY, {});
    if (typeof stored.ragaNumber === 'number') {
      const raga = MELAKARTA_RAGAS.find(r => r.number === stored.ragaNumber);
      if (raga) setSelectedRaga(raga);
    }
    if (stored.sortOrder === 'number' || stored.sortOrder === 'alphabetical') setSortOrder(stored.sortOrder);
    if (typeof stored.baseBPM === 'number' && stored.baseBPM >= 30 && stored.baseBPM <= 180) setBaseBPM(stored.baseBPM);
    if (typeof stored.loop === 'boolean') setLoop(stored.loop);
    hasLoadedRagaRef.current = true;
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedRagaRef.current) return;
    setStored(RAGA_STORAGE_KEY, {
      ragaNumber: selectedRaga?.number,
      sortOrder,
      baseBPM,
      loop,
    });
  }, [selectedRaga, sortOrder, baseBPM, loop]);

  // Get sorted ragas
  const sortedRagas = [...MELAKARTA_RAGAS].sort((a, b) => {
    if (sortOrder === 'number') {
      return a.number - b.number;
    } else {
      return a.name.localeCompare(b.name);
    }
  });

  // Convert linear volume (0-1) to logarithmic gain
  const linearToLogGain = (linearValue: number): number => {
    if (linearValue === 0) return 0;
    // Use cubic curve for logarithmic feel: gain = volume^3
    return Math.pow(linearValue, 3);
  };

  const playNote = (swara: string, duration: number) => {
    if (!audioContextRef.current || !masterGainRef.current) return;

    const parsed = parseVarisaiNote(swara);
    let freq = getSwarafrequency(baseFreqRef.current, parsed.swara);
    if (parsed.octave === 'higher') freq = freq * 2;
    else if (parsed.octave === 'lower') freq = freq * 0.5;

    const now = audioContextRef.current.currentTime;
    const durationSec = duration / 1000;
    if (!isSineInstrument(instrumentIdRef.current) && soundfontPlayerRef.current) {
      // Fixed gain 1.5; volume is controlled by masterGainRef (sidebar)
      soundfontPlayerRef.current.start(freqToNoteNameForInstrument(freq, instrumentIdRef.current), now, { duration: durationSec, gain: 1.5 });
      return;
    }

    const osc = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode.gain.setValueAtTime(0.3, now + durationSec - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, now + durationSec);
    osc.connect(gainNode);
    gainNode.connect(masterGainRef.current);
    osc.start(now);
    osc.stop(now + durationSec);
    oscillatorsRef.current.push(osc);
  };

  const playRaga = () => {
    if (!isPlayingRef.current) return;

    // Play arohana (ascending), then avarohana (descending) with higher Sa played twice
    // arohana: S, R, G, M, P, D, N, S
    // avarohana: S, N, D, P, M, G, R, S
    // Combined: S, R, G, M, P, D, N, S, S, N, D, P, M, G, R, S
    const arohana = selectedRaga.arohana;
    const avarohana = selectedRaga.avarohana;
    // Include higher Sa twice (at end of arohana and start of avarohana)
    const notes = [...arohana, ...avarohana];
    const totalNotes = notes.length;

    const playNextNote = (index: number) => {
      if (!isPlayingRef.current) {
        setIsPlaying(false);
        isPlayingRef.current = false;
        return;
      }

      // Read current tempo from refs so changes apply on next note without restart
      const noteDurationMs = (60 / baseBPMRef.current) * 1000; // one note per beat

      // If reached the end, either loop or stop
      if (index >= totalNotes) {
        if (loop) {
          // Loop: restart from beginning
          setCurrentNoteIndex(0);
          const swara = notes[0];
          playNote(swara, noteDurationMs);
          
          timeoutRef.current = setTimeout(() => {
            playNextNote(1);
          }, noteDurationMs);
        } else {
          // Stop playback
          setIsPlaying(false);
          isPlayingRef.current = false;
          setCurrentNoteIndex(0);
        }
        return;
      }

      setCurrentNoteIndex(index);
      const swara = notes[index];
      playNote(swara, noteDurationMs);

      timeoutRef.current = setTimeout(() => {
        playNextNote(index + 1);
      }, noteDurationMs);
    };

    playNextNote(0);
  };

  const startPlaying = async () => {
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
      playRaga();
    } catch (error) {
      console.error('Error starting raga playback:', error);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  };

  const stopPlaying = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentNoteIndex(0);

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
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Notes for display - include higher Sa twice (at end of arohana and start of avarohana)
  const arohana = selectedRaga.arohana;
  const avarohana = selectedRaga.avarohana;

  if (!storageReady) {
    return (
      <div className="w-full max-w-4xl mx-auto flex items-center justify-center min-h-[200px]">
        <span className="text-slate-500 text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-12 shadow-2xl border border-slate-700/50">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-light mb-2 tracking-wide">
            Raga Practice
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Play and practice melakarta ragas
          </p>
        </div>

        {/* Raga Selection */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
            <label className="text-sm font-medium text-slate-300 whitespace-nowrap">
              Select Raga:
            </label>
            <select
              value={selectedRaga.name}
              onChange={(e) => handleRagaChange(e.target.value)}
              className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              {sortedRagas.map((raga) => (
                <option key={raga.number} value={raga.name}>
                  {sortOrder === 'number' ? `${raga.number}. ` : ''}{raga.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setSortOrder('number')}
                className={`px-3 py-1 rounded text-sm ${
                  sortOrder === 'number'
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                By Number
              </button>
              <button
                onClick={() => setSortOrder('alphabetical')}
                className={`px-3 py-1 rounded text-sm ${
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

        {/* Playback Controls */}
        <div className="flex flex-col items-center mb-8">
          <button
            onClick={isPlaying ? stopPlaying : startPlaying}
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
            {isPlaying ? `Playing at ${baseBPM} BPM` : 'Stopped'}
          </p>
          
          {/* Loop Toggle */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <input
              type="checkbox"
              id="loop-toggle"
              checked={loop}
              onChange={(e) => setLoop(e.target.checked)}
              className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
            />
            <label htmlFor="loop-toggle" className="text-slate-300 text-sm cursor-pointer">
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

        {/* Notes Display */}
        <div className="mt-8">
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-4">Raga Notes</p>
            
            {/* Arohana (Ascending) */}
            <div className="mb-4">
              <p className="text-slate-500 text-xs mb-2">Arohana (Ascending)</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {arohana.map((note, index) => {
                  const globalIndex = index;
                  const parsed = parseVarisaiNote(note);
                  const baseSwara = parsed.swara.charAt(0);
                  const numberSuffix = parsed.swara.slice(1); // e.g. "1", "2", "3" for R1, G2, M1
                  const displayNote = getSwaraInScript(baseSwara, notationLanguage) + numberSuffix;
                  return (
                    <div
                      key={`arohana-${index}`}
                      className={`
                        px-4 py-2 rounded-lg text-lg font-semibold relative
                        transition-all duration-200
                        ${
                          isPlaying && globalIndex === currentNoteIndex
                            ? 'bg-amber-500 text-slate-900 scale-110 shadow-lg'
                            : isPlaying && globalIndex < currentNoteIndex
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
                        <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-[6px] text-[10px] leading-none">•</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Avarohana (Descending) */}
            <div>
              <p className="text-slate-500 text-xs mb-2">Avarohana (Descending)</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {avarohana.map((note, index) => {
                  const globalIndex = arohana.length + index;
                  const parsed = parseVarisaiNote(note);
                  const baseSwara = parsed.swara.charAt(0);
                  const numberSuffix = parsed.swara.slice(1); // e.g. "1", "2", "3" for R1, G2, M1
                  const displayNote = getSwaraInScript(baseSwara, notationLanguage) + numberSuffix;
                  return (
                    <div
                      key={`avarohana-${index}`}
                      className={`
                        px-4 py-2 rounded-lg text-lg font-semibold relative
                        transition-all duration-200
                        ${
                          isPlaying && globalIndex === currentNoteIndex
                            ? 'bg-amber-500 text-slate-900 scale-110 shadow-lg'
                            : isPlaying && globalIndex < currentNoteIndex
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
                        <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-[6px] text-[10px] leading-none">•</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
