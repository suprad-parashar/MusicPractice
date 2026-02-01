'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { MELAKARTA_RAGAS, MelakartaRaga, getSwarafrequency } from '@/data/melakartaRagas';
import { parseVarisaiNote } from '@/data/saraliVarisai';
import { getInstrument, freqToNoteNameForInstrument, isSineInstrument, type InstrumentId } from '@/lib/instrumentLoader';
import { getStored, setStored } from '@/lib/storage';

type SortOrder = 'number' | 'alphabetical';
type PracticeMode = 'untimed' | 'timed';
type NoteCount = 1 | 2 | 3;

/**
 * Interactive auditory note-identification practice component for Carnatic music.
 *
 * Renders a UI that lets users practice identifying swaras by ear with configurable
 * raga selection, practice mode (timed or untimed), note-count per round, instrument,
 * and volume. Handles audio playback, input normalization, scoring, timing, persistence
 * of user settings, and feedback for correct/incorrect answers.
 *
 * @param baseFreq - Reference tonic frequency in Hz used to compute swara pitches.
 * @param instrumentId - Optional instrument identifier to use for playback (default: `'piano'`).
 * @param volume - Optional master volume as a linear value between 0 and 1 (default: `0.5`).
 * @returns The rendered React component for the auditory practice UI.
 */
export default function AuditoryPractice({ baseFreq, instrumentId = 'piano', volume = 0.5 }: { baseFreq: number; instrumentId?: InstrumentId; volume?: number }) {
  const [selectedRaga, setSelectedRaga] = useState<MelakartaRaga>(
    MELAKARTA_RAGAS.find(r => r.name === 'Mayamalavagowla') || MELAKARTA_RAGAS[14]
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>('number');
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('untimed');
  const [noteCount, setNoteCount] = useState<NoteCount>(1);
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [isGameActive, setIsGameActive] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [currentNotes, setCurrentNotes] = useState<string[]>([]);
  
  // Timer/Stopwatch states
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [finalMessage, setFinalMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'correct' | 'wrong'; message: string } | null>(null);
  const [displayScore, setDisplayScore] = useState(0); // Score to display (accounts for timing)
  const [displayRound, setDisplayRound] = useState(0); // Round to display (accounts for timing)
  const [storageReady, setStorageReady] = useState(false);
  const hasLoadedAuditoryRef = useRef(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);
  const soundfontPlayerRef = useRef<Awaited<ReturnType<typeof getInstrument>> | null>(null);
  const instrumentIdRef = useRef<InstrumentId>(instrumentId);
  const loadedInstrumentIdRef = useRef<InstrumentId | null>(null);
  const baseFreqRef = useRef(baseFreq);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stopwatchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scoreRef = useRef(0);
  const roundRef = useRef(0);
  baseFreqRef.current = baseFreq;
  instrumentIdRef.current = instrumentId;

  useEffect(() => {
    instrumentIdRef.current = instrumentId;
    if (isSineInstrument(instrumentId)) {
      soundfontPlayerRef.current = null;
      loadedInstrumentIdRef.current = null;
      return;
    }
    if (audioContextRef.current && masterGainRef.current) {
      getInstrument(audioContextRef.current, instrumentId, masterGainRef.current)
        .then((player) => {
          soundfontPlayerRef.current = player;
          loadedInstrumentIdRef.current = instrumentId;
        })
        .catch((err) => {
          console.error('Failed to load instrument on change:', err);
          soundfontPlayerRef.current = null;
          loadedInstrumentIdRef.current = null;
        });
    } else {
      soundfontPlayerRef.current = null;
      loadedInstrumentIdRef.current = null;
    }
  }, [instrumentId]);

  // Load persisted auditory practice settings before first paint (avoids flash of defaults)
  const AUDITORY_STORAGE_KEY = 'auditorySettings';
  type StoredAuditorySettings = { ragaNumber?: number; sortOrder?: SortOrder; practiceMode?: PracticeMode; noteCount?: NoteCount; timerMinutes?: number };
  useLayoutEffect(() => {
    const stored = getStored<StoredAuditorySettings>(AUDITORY_STORAGE_KEY, {});
    if (typeof stored.ragaNumber === 'number') {
      const raga = MELAKARTA_RAGAS.find(r => r.number === stored.ragaNumber);
      if (raga) setSelectedRaga(raga);
    }
    if (stored.sortOrder === 'number' || stored.sortOrder === 'alphabetical') setSortOrder(stored.sortOrder);
    if (stored.practiceMode === 'untimed' || stored.practiceMode === 'timed') setPracticeMode(stored.practiceMode);
    if (stored.noteCount === 1 || stored.noteCount === 2 || stored.noteCount === 3) setNoteCount(stored.noteCount);
    if (typeof stored.timerMinutes === 'number' && stored.timerMinutes >= 1 && stored.timerMinutes <= 60) setTimerMinutes(stored.timerMinutes);
    hasLoadedAuditoryRef.current = true;
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedAuditoryRef.current) return;
    setStored(AUDITORY_STORAGE_KEY, {
      ragaNumber: selectedRaga?.number,
      sortOrder,
      practiceMode,
      noteCount,
      timerMinutes,
    });
  }, [selectedRaga, sortOrder, practiceMode, noteCount, timerMinutes]);

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
    return Math.pow(linearValue, 3);
  };

  // Initialize audio context - don't create it here, let it be created on first use

  // Update master gain when volume changes
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = linearToLogGain(volume);
    }
  }, [volume]);

  const endGame = useCallback(() => {
    setIsGameActive(false);
    setGameEnded(true);
    
    // Calculate performance message using refs for current values
    // Exclude the current incomplete round from calculations
    const currentScore = scoreRef.current;
    const currentRound = roundRef.current;
    const completedRounds = Math.max(0, currentRound - 1);
    const accuracy = completedRounds > 0 ? (currentScore / completedRounds) * 100 : 0;
    let message = '';
    
    if (accuracy >= 90) {
      message = 'Excellent! You have a great ear for Carnatic music!';
    } else if (accuracy >= 75) {
      message = 'Great job! You\'re doing very well!';
    } else if (accuracy >= 60) {
      message = 'Good effort! Keep practicing!';
    } else if (accuracy >= 40) {
      message = 'Not bad! Practice makes perfect!';
    } else {
      message = 'Keep practicing! You\'ll improve with time!';
    }
    
    setFinalMessage(message);
  }, []);

  // Timer/Stopwatch logic
  useEffect(() => {
    if (isGameActive && !gameEnded) {
      if (practiceMode === 'untimed') {
        // Stopwatch
        stopwatchIntervalRef.current = setInterval(() => {
          setElapsedSeconds(prev => prev + 1);
        }, 1000);
      } else {
        // Timer
        setRemainingSeconds(timerMinutes * 60);
        timerIntervalRef.current = setInterval(() => {
          setRemainingSeconds(prev => {
            if (prev <= 1) {
              endGame();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } else {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
        stopwatchIntervalRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isGameActive, practiceMode, timerMinutes, gameEnded, endGame]);

  const stopAllSounds = () => {
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
    }
  };

  const ensureInstrumentLoaded = useCallback(async (): Promise<boolean> => {
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
      if (!isSineInstrument(instrumentId) && (!soundfontPlayerRef.current || loadedInstrumentIdRef.current !== instrumentId)) {
        soundfontPlayerRef.current = await getInstrument(
          audioContextRef.current,
          instrumentId,
          masterGainRef.current
        );
        loadedInstrumentIdRef.current = instrumentId;
      }
      return true;
    } catch (err) {
      console.error('Failed to load instrument:', err);
      return false;
    }
  }, [instrumentId, volume]);

  const playNote = (swara: string, duration: number = 500) => {
    try {
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
    } catch (error) {
      console.error('Error playing note:', error);
    }
  };

  const playRootNote = async () => {
    await ensureInstrumentLoaded();
    stopAllSounds();
    playNote('S', 800);
  };

  const generateRandomNotes = (count: number): string[] => {
    const arohana = selectedRaga.arohana;
    const notes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * arohana.length);
      notes.push(arohana[randomIndex]);
    }
    
    return notes;
  };

  const playNotes = async (notes: string[]) => {
    const ready = await ensureInstrumentLoaded();
    if (!ready) return;
    stopAllSounds();
    notes.forEach((note, index) => {
      setTimeout(() => {
        playNote(note, 500);
      }, index * 600);
    });
  };

  const startGame = () => {
    setIsGameActive(true);
    setGameEnded(false);
    setScore(0);
    setRound(1); // Start at round 1 (first round)
    setDisplayScore(0);
    setDisplayRound(1);
    scoreRef.current = 0;
    roundRef.current = 1;
    setUserInput('');
    setElapsedSeconds(0);
    setRemainingSeconds(timerMinutes * 60);
    // Don't call startNewRound here - the first round is already started
    // Just generate notes for the first round
    const notes = generateRandomNotes(noteCount);
    setCurrentNotes(notes);
    setUserInput('');
    // Auto-play notes after a short delay
    setTimeout(() => {
      playNotes(notes);
    }, 300);
  };

  const startNewRound = () => {
    const notes = generateRandomNotes(noteCount);
    setCurrentNotes(notes);
    setUserInput('');
    setRound(prev => {
      const newRound = prev + 1;
      roundRef.current = newRound;
      setDisplayRound(newRound);
      return newRound;
    });
    // Update display score to match current score
    setDisplayScore(score);
    
    // Auto-play notes after a short delay
    setTimeout(() => {
      playNotes(notes);
    }, 300);
  };

  // Normalize user input to handle various formats
  const normalizeInput = (input: string): string[] => {
    // Remove extra whitespace and convert to lowercase
    let normalized = input.trim().toLowerCase();
    
    // Handle various separators: ->, -, space, comma
    normalized = normalized.replace(/->/g, ' ');
    normalized = normalized.replace(/[-,\s]+/g, ' ');
    
    // If there are no spaces after normalization, try to split by swara patterns
    // Pattern: [SRGMPDN] followed by optional [0-9]
    if (!normalized.includes(' ')) {
      // Split by swara pattern: match letter (S/R/G/M/P/D/N) + optional number
      // This handles cases like "DS" -> ["D", "S"], "D1S" -> ["D1", "S"], "SRG" -> ["S", "R", "G"]
      const swaraPattern = /([srgmpdn][0-9]?)/gi;
      const matches = normalized.match(swaraPattern);
      if (matches && matches.length > 0) {
        normalized = matches.join(' ');
      } else {
        // Fallback: split by individual swara characters
        // This handles cases like "ds" -> ["d", "s"]
        const chars = normalized.split('');
        const swaraChars: string[] = [];
        let currentSwara = '';
        for (let i = 0; i < chars.length; i++) {
          const char = chars[i];
          if (/[srgmpdn]/i.test(char)) {
            if (currentSwara) {
              swaraChars.push(currentSwara);
            }
            currentSwara = char;
          } else if (/[0-9]/.test(char)) {
            currentSwara += char;
          } else if (char === '>' || char === '<') {
            if (currentSwara) {
              swaraChars.push(currentSwara + char);
              currentSwara = '';
            }
          } else {
            if (currentSwara) {
              swaraChars.push(currentSwara);
              currentSwara = '';
            }
          }
        }
        if (currentSwara) {
          swaraChars.push(currentSwara);
        }
        if (swaraChars.length > 0) {
          normalized = swaraChars.join(' ');
        }
      }
    }
    
    // Split by spaces
    const parts = normalized.split(/\s+/).filter(p => p.length > 0);
    
    // Map common variations to standard swara notation
    const swaraMap: { [key: string]: string } = {
      'sa': 'S', 's': 'S',
      'ri': 'R', 'r': 'R', 're': 'R',
      'ga': 'G', 'g': 'G',
      'ma': 'M', 'm': 'M',
      'pa': 'P', 'p': 'P',
      'da': 'D', 'd': 'D',
      'ni': 'N', 'n': 'N',
    };
    
    // Handle numbered swaras (R1, R2, etc.) and octave indicators
    return parts.map(part => {
      // Check for octave indicators first
      if (part.startsWith('>')) {
        const base = part.substring(1);
        // Check if base is already in standard format
        if (/^[SRGMPDN][0-9]?$/i.test(base)) {
          return `>${base.toUpperCase()}`;
        }
        const mapped = swaraMap[base.toLowerCase()];
        return mapped ? `>${mapped}` : `>${base.toUpperCase()}`;
      }
      if (part.startsWith('<')) {
        const base = part.substring(1);
        // Check if base is already in standard format
        if (/^[SRGMPDN][0-9]?$/i.test(base)) {
          return `<${base.toUpperCase()}`;
        }
        const mapped = swaraMap[base.toLowerCase()];
        return mapped ? `<${mapped}` : `<${base.toUpperCase()}`;
      }
      
      // Check if it's already in standard format (S, R1, R2, etc.)
      if (/^[SRGMPDN][0-9]?$/i.test(part)) {
        return part.toUpperCase();
      }
      
      // Try to extract swara from patterns like "R1", "R2", "r1", "re1", etc.
      const match = part.match(/^([srgmpdn]+)(\d*)$/i);
      if (match) {
        const swaraBase = match[1].toLowerCase();
        const num = match[2];
        const mapped = swaraMap[swaraBase];
        if (mapped) {
          return num ? `${mapped}${num}` : mapped;
        }
        // If no mapping found, use first letter
        const firstLetter = swaraBase[0].toUpperCase();
        return num ? `${firstLetter}${num}` : firstLetter;
      }
      
      // Map common names (without numbers)
      const mapped = swaraMap[part.toLowerCase()];
      if (mapped) {
        return mapped;
      }
      
      return part.toUpperCase();
    });
  };

  // Extract base swara (letter only, without number)
  const getBaseSwara = (swara: string): string => {
    // Remove octave indicators first
    const base = swara.replace(/^[><]/, '');
    // Extract just the letter (S, R, G, M, P, D, N)
    const match = base.match(/^([SRGMPDN])/i);
    return match ? match[1].toUpperCase() : base.toUpperCase();
  };

  const checkAnswer = () => {
    if (!isGameActive || gameEnded) return;
    
    if (!userInput.trim()) {
      return; // Don't check empty input
    }
    
    const userNotes = normalizeInput(userInput);
    const correctNotes = currentNotes.map(note => {
      const parsed = parseVarisaiNote(note);
      return parsed.swara;
    });
    
    // Compare base swaras (letter only, ignoring the number variant)
    // This allows "G" to match "G3", "R" to match "R2", etc.
    const userBaseSwaras = userNotes.map(getBaseSwara);
    const correctBaseSwaras = correctNotes.map(getBaseSwara);
    
    // Check if arrays match by base swara
    if (userBaseSwaras.length === correctBaseSwaras.length && 
        userBaseSwaras.every((swara, index) => swara === correctBaseSwaras[index])) {
      // Correct answer!
      setFeedbackMessage({ type: 'correct', message: 'Correct! ✓' });
      // Update display values before incrementing to keep accuracy correct during feedback
      setDisplayScore(score);
      setDisplayRound(round);
      setScore(prev => {
        const newScore = prev + 1;
        scoreRef.current = newScore;
        return newScore;
      });
      // Auto-advance to next round
      setTimeout(() => {
        setFeedbackMessage(null);
        startNewRound();
      }, 1500);
    } else {
      // Wrong answer - show feedback with correct answer
      const correctAnswer = correctNotes.join(' ');
      setFeedbackMessage({ 
        type: 'wrong', 
        message: `Incorrect. The correct answer is: ${correctAnswer}` 
      });
      // Update display values to keep accuracy correct during feedback
      setDisplayScore(score);
      setDisplayRound(round);
      // Auto-advance to next round after showing feedback (don't increment score)
      setTimeout(() => {
        setFeedbackMessage(null);
        startNewRound();
      }, 2000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      checkAnswer();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
            Auditory Practice
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Test your ability to identify notes by ear
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
              onChange={(e) => {
                const raga = MELAKARTA_RAGAS.find(r => r.name === e.target.value);
                if (raga) setSelectedRaga(raga);
              }}
              disabled={isGameActive}
              className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
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
                disabled={isGameActive}
                className={`px-3 py-1 rounded text-sm ${
                  sortOrder === 'number'
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                } disabled:opacity-50`}
              >
                By Number
              </button>
              <button
                onClick={() => setSortOrder('alphabetical')}
                disabled={isGameActive}
                className={`px-3 py-1 rounded text-sm ${
                  sortOrder === 'alphabetical'
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                } disabled:opacity-50`}
              >
                A-Z
              </button>
            </div>
          </div>
        </div>

        {/* Practice Mode Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3 text-center">
            Practice Mode
          </label>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setPracticeMode('untimed')}
              disabled={isGameActive}
              className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                practiceMode === 'untimed'
                  ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30 scale-105'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              } disabled:opacity-50`}
            >
              Untimed
            </button>
            <button
              onClick={() => setPracticeMode('timed')}
              disabled={isGameActive}
              className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                practiceMode === 'timed'
                  ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30 scale-105'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              } disabled:opacity-50`}
            >
              Timed
            </button>
          </div>
        </div>

        {/* Timer Settings (for timed mode) */}
        {practiceMode === 'timed' && !isGameActive && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3 text-center">
              Timer: {timerMinutes} minute{timerMinutes !== 1 ? 's' : ''}
            </label>
            <div className="flex items-center gap-4 px-4">
              <span className="text-slate-400 text-sm w-12">1</span>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={timerMinutes}
                onChange={(e) => setTimerMinutes(parseInt(e.target.value))}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <span className="text-slate-400 text-sm w-12 text-right">30</span>
            </div>
          </div>
        )}

        {/* Timer/Stopwatch Display */}
        {isGameActive && !gameEnded && (
          <div className="mb-6 text-center">
            <div className="text-3xl font-bold text-amber-400">
              {practiceMode === 'untimed' 
                ? formatTime(elapsedSeconds)
                : formatTime(remainingSeconds)}
            </div>
            <p className="text-slate-400 text-sm mt-1">
              {practiceMode === 'untimed' ? 'Elapsed Time' : 'Time Remaining'}
            </p>
          </div>
        )}

        {/* Note Count Selection */}
        {!isGameActive && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3 text-center">
              Number of Notes
            </label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setNoteCount(n as NoteCount)}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                    noteCount === n
                      ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30 scale-105'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {n} note{n > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Game Stats */}
        {isGameActive && !gameEnded && (
          <div className="mb-6 flex justify-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">{score}</div>
              <div className="text-slate-400 text-xs">Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-300">{round}</div>
              <div className="text-slate-400 text-xs">Round</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-300">
                {(() => {
                  // Use display values if feedback is showing (to avoid timing issues)
                  // Otherwise use current values
                  const currentScore = feedbackMessage ? displayScore : score;
                  const currentRound = feedbackMessage ? displayRound : round;
                  const completedRounds = Math.max(0, currentRound - 1);
                  if (completedRounds === 0) return 0;
                  // Cap accuracy at 100% to prevent going over
                  const accuracy = Math.min(100, Math.round((currentScore / completedRounds) * 100));
                  return accuracy;
                })()}%
              </div>
              <div className="text-slate-400 text-xs">Accuracy</div>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="mb-6 flex flex-col items-center gap-4">
          {isGameActive && (
            <div className="flex gap-4">
              <button
                onClick={playRootNote}
                disabled={!audioContextRef.current}
                className="px-6 py-3 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-all duration-200 text-sm font-medium disabled:opacity-50"
              >
                Root Note
              </button>
              <button
                onClick={() => {
                  if (currentNotes.length > 0) {
                    playNotes(currentNotes);
                  } else {
                    const notes = generateRandomNotes(noteCount);
                    setCurrentNotes(notes);
                    playNotes(notes);
                  }
                }}
                disabled={!audioContextRef.current}
                className="px-6 py-3 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-all duration-200 text-sm font-medium disabled:opacity-50"
              >
                Play Note{noteCount > 1 ? 's' : ''}
              </button>
            </div>
          )}
          
          {!isGameActive ? (
            <button
              onClick={startGame}
              className="px-8 py-3 rounded-lg bg-amber-500 text-slate-900 hover:bg-amber-600 transition-all duration-200 text-sm font-medium shadow-lg shadow-amber-500/30"
            >
              Start Game
            </button>
          ) : (
            <button
              onClick={endGame}
              className="px-8 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all duration-200 text-sm font-medium"
            >
              End Game
            </button>
          )}
        </div>

        {/* Input Section */}
        {isGameActive && !gameEnded && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3 text-center">
              Enter your answer
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => {
                  setUserInput(e.target.value);
                  // Clear feedback when user starts typing again
                  if (feedbackMessage) {
                    setFeedbackMessage(null);
                  }
                }}
                onKeyPress={handleKeyPress}
                placeholder={`Enter ${noteCount} note${noteCount > 1 ? 's' : ''} (e.g., ${noteCount === 1 ? 'S' : noteCount === 2 ? 'SR or Sa Re' : 'SRG or Sa Re Ga'})`}
                className={`flex-1 px-4 py-3 bg-slate-700/50 border rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-center text-lg transition-all duration-200 ${
                  feedbackMessage?.type === 'correct' 
                    ? 'border-green-500 bg-green-500/20' 
                    : feedbackMessage?.type === 'wrong'
                    ? 'border-red-500 bg-red-500/20'
                    : 'border-slate-600'
                }`}
                autoFocus
              />
              <button
                onClick={checkAnswer}
                className="px-6 py-3 rounded-lg bg-amber-500 text-slate-900 hover:bg-amber-600 transition-all duration-200 text-sm font-medium"
              >
                Check
              </button>
            </div>
            {feedbackMessage && (
              <div className={`mt-3 text-center p-3 rounded-lg transition-all duration-200 ${
                feedbackMessage.type === 'correct'
                  ? 'bg-green-500/20 border border-green-500 text-green-400'
                  : 'bg-red-500/20 border border-red-500 text-red-400'
              }`}>
                <p className="text-sm font-medium">{feedbackMessage.message}</p>
              </div>
            )}
            {!feedbackMessage && (
              <p className="text-slate-500 text-xs mt-2 text-center">
                Format: S, SR, SRG, Sa Re Ga, Sa {'->'} Re {'->'} Ga, etc.
              </p>
            )}
          </div>
        )}

        {/* Game End Screen */}
        {gameEnded && (
          <div className="mb-6 text-center">
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-amber-400 mb-4">Game Over!</h2>
              <div className="text-4xl font-bold text-slate-200 mb-2">{score}</div>
              <div className="text-slate-400 text-sm mb-4">
                {(() => {
                  const completedRounds = Math.max(0, round - 1);
                  const accuracyPercent = completedRounds > 0 ? Math.round((score / completedRounds) * 100) : 0;
                  return `Correct out of ${completedRounds} round${completedRounds !== 1 ? 's' : ''} (${accuracyPercent}% accuracy)`;
                })()}
              </div>
              <div className="text-slate-300 text-base mb-4">{finalMessage}</div>
              <button
                onClick={() => {
                  setGameEnded(false);
                  setIsGameActive(false);
                  setScore(0);
                  setRound(0);
                  setUserInput('');
                  setCurrentNotes([]);
                }}
                className="px-6 py-2 rounded-lg bg-amber-500 text-slate-900 hover:bg-amber-600 transition-all duration-200 text-sm font-medium"
              >
                Play Again
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}