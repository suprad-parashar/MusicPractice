'use client';

import { useState, useEffect, useRef } from 'react';
import { MELAKARTA_RAGAS, MelakartaRaga, getSwarafrequency } from '@/data/melakartaRagas';
import { parseVarisaiNote } from '@/data/saraliVarisai';

type SortOrder = 'number' | 'alphabetical';

export default function RagaPlayer({ baseFreq }: { baseFreq: number }) {
  const [selectedRaga, setSelectedRaga] = useState<MelakartaRaga>(
    MELAKARTA_RAGAS.find(r => r.name === 'Mayamalavagowla') || MELAKARTA_RAGAS[14]
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>('number');
  const [isPlaying, setIsPlaying] = useState(false);
  const [baseBPM, setBaseBPM] = useState(90); // Base BPM (30-120)
  const [notesPerBeat, setNotesPerBeat] = useState(1); // Number of notes per beat (1-5)
  const [loop, setLoop] = useState(false); // Loop playback
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [volume, setVolume] = useState(0.5); // Volume control (0-1)
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);
  const masterGainRef = useRef<GainNode | null>(null);

  // Calculate note duration: (60 seconds / baseBPM) / notesPerBeat
  const beatDuration = (60 / baseBPM) * 1000; // milliseconds per beat
  const noteDuration = beatDuration / notesPerBeat; // milliseconds per note

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

    // Parse octave indicator
    const parsed = parseVarisaiNote(swara);
    let freq = getSwarafrequency(baseFreq, parsed.swara);
    
    // Adjust frequency based on octave
    if (parsed.octave === 'higher') {
      freq = freq * 2; // One octave higher
    } else if (parsed.octave === 'lower') {
      freq = freq * 0.5; // One octave lower
    }
    
    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    // Envelope: quick attack, sustain, quick release
    const now = audioContextRef.current.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01); // Attack
    gain.gain.setValueAtTime(0.3, now + duration / 1000 - 0.05); // Sustain
    gain.gain.linearRampToValueAtTime(0, now + duration / 1000); // Release

    osc.connect(gain);
    gain.connect(masterGainRef.current);

    osc.start(now);
    osc.stop(now + duration / 1000);

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

      // If reached the end, either loop or stop
      if (index >= totalNotes) {
        if (loop) {
          // Loop: restart from beginning
          setCurrentNoteIndex(0);
          const swara = notes[0];
          playNote(swara, noteDuration);
          
          timeoutRef.current = setTimeout(() => {
            playNextNote(1);
          }, noteDuration);
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
      playNote(swara, noteDuration);

      timeoutRef.current = setTimeout(() => {
        playNextNote(index + 1);
      }, noteDuration);
    };

    playNextNote(0);
  };

  const startPlaying = () => {
    if (isPlayingRef.current) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      // Create master gain node if it doesn't exist
      if (!masterGainRef.current) {
        masterGainRef.current = audioContextRef.current.createGain();
        masterGainRef.current.connect(audioContextRef.current.destination);
        masterGainRef.current.gain.value = linearToLogGain(volume);
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

    // Stop all oscillators
    oscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Already stopped
      }
    });
    oscillatorsRef.current = [];
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

  const handleNotesPerBeatChange = (newNotesPerBeat: number) => {
    const wasPlaying = isPlayingRef.current;
    if (wasPlaying) {
      stopPlaying();
    }
    setNotesPerBeat(newNotesPerBeat);
    if (wasPlaying) {
      setTimeout(() => {
        startPlaying();
      }, 100);
    }
  };

  const handleBaseBPMChange = (newBaseBPM: number) => {
    const wasPlaying = isPlayingRef.current;
    if (wasPlaying) {
      stopPlaying();
    }
    setBaseBPM(newBaseBPM);
    if (wasPlaying) {
      setTimeout(() => {
        startPlaying();
      }, 100);
    }
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

  // Notes for display - include higher Sa twice (at end of arohana and start of avarohana)
  const arohana = selectedRaga.arohana;
  const avarohana = selectedRaga.avarohana;

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
          <div className="text-center">
            <p className="text-slate-400 text-sm">
              <span className="text-amber-400 font-semibold">{selectedRaga.name}</span>
              {' '}(#{selectedRaga.number})
            </p>
            <p className="text-slate-500 text-xs mt-1">
              Arohana: {selectedRaga.arohana.join(' ')} | Avarohana: {selectedRaga.avarohana.join(' ')}
            </p>
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
            {isPlaying ? `Playing at ${baseBPM} BPM (${notesPerBeat} note${notesPerBeat > 1 ? 's' : ''} per beat)` : 'Stopped'}
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
            <p className="text-slate-400 text-sm mb-4">Raga Notes</p>
            
            {/* Arohana (Ascending) */}
            <div className="mb-4">
              <p className="text-slate-500 text-xs mb-2">Arohana (Ascending)</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {arohana.map((note, index) => {
                  const globalIndex = index;
                  const parsed = parseVarisaiNote(note);
                  const displayNote = parsed.swara;
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
                  const displayNote = parsed.swara;
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
