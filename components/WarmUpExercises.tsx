'use client';

import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { parseVarisaiNote } from '@/data/saraliVarisai';
import { getSwarafrequency } from '@/data/ragas';
import { MELAKARTA_RAGAS, type MelakartaRaga } from '@/data/ragas';
import { getInstrument, freqToNoteNameForInstrument, isSineInstrument, type InstrumentId } from '@/lib/instrumentLoader';
import type { NotationLanguage } from '@/lib/swaraNotation';
import { SwaraGlyph } from '@/components/SwaraGlyph';
import { filterAndSortRagasBySearch } from '@/lib/ragaSearch';
import {
  staircaseLines,
  descendingStaircaseLines,
  STAIR_VARISAI_TOKENS,
} from '@/lib/staircasePattern';
import { triadMirrorLines, descendingTriadMirrorLines } from '@/lib/triadMirrorPattern';
import { buildJumpingNotesLetterNotes } from '@/lib/jumpingNotesPattern';
import { THIRDS_ASC_NOTES, THIRDS_DESC_NOTES, THIRDS_NOTES_PER_ROW } from '@/lib/thirdsPattern';
import {
  CHROMATIC_FLAT_SEMITONES,
  chromaticNoteLabelsAsc,
  chromaticNoteLabelsDesc,
} from '@/lib/chromaticPattern';
import { threesAndFoursAscLines, threesAndFoursDescLines } from '@/lib/threesAndFoursPattern';
import { fourthsAscLines, fourthsDescLines } from '@/lib/fourthsPattern';
import { fifthsAscLines, fifthsDescLines } from '@/lib/fifthsPattern';
import { getStored, setStored } from '@/lib/storage';
import { DEFAULT_PRACTICE_BPM } from '@/lib/defaultTempo';

const WARMUP_STORAGE_KEY = 'warmupSettings';
type WarmupPattern =
  | 'staircase'
  | 'triadMirror'
  | 'jumpingNotes'
  | 'thirds'
  | 'threesAndFours'
  | 'fourths'
  | 'fifths'
  | 'chromatic';
type StoredWarmup = { ragaNumber?: number; baseBPM?: number; warmupPattern?: WarmupPattern };

/** Max swara cells per visual row (staircase / triad / jumping) so rows fit without clipping. */
const WARMUP_NOTES_PER_ROW = 8;

function chunkTokens<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Staircase and threes-and-fours keep one full row per line; other patterns wrap at WARMUP_NOTES_PER_ROW (thirds uses THIRDS_NOTES_PER_ROW). */
function chunksForWarmupRow(pattern: WarmupPattern, row: string[]): string[][] {
  if (
    pattern === 'staircase' ||
    pattern === 'threesAndFours' ||
    pattern === 'fourths' ||
    pattern === 'fifths'
  ) {
    return [row];
  }
  const size = pattern === 'thirds' ? THIRDS_NOTES_PER_ROW : WARMUP_NOTES_PER_ROW;
  return chunkTokens(row, size);
}

const WARMUP_PATTERNS: { id: WarmupPattern; label: string }[] = [
  { id: 'staircase', label: 'Staircase' },
  { id: 'triadMirror', label: 'Triad mirror' },
  { id: 'jumpingNotes', label: 'Jumping notes' },
  { id: 'thirds', label: 'Thirds' },
  { id: 'threesAndFours', label: 'Threes and fours' },
  { id: 'fourths', label: 'Fourths' },
  { id: 'fifths', label: 'Fifths' },
  { id: 'chromatic', label: 'Chromatic' },
];

function convertVarisaiNoteToRaga(note: string, raga: MelakartaRaga): string {
  const parsed = parseVarisaiNote(note);
  const arohana = raga.arohana.map((n) => parseVarisaiNote(n).swara);
  const swaraMap: Record<string, string> = {
    S: arohana[0] || 'S',
    R: arohana[1] || 'R1',
    G: arohana[2] || 'G1',
    M: arohana[3] || 'M1',
    P: arohana[4] || 'P',
    D: arohana[5] || 'D1',
    N: arohana[6] || 'N1',
  };
  const baseSwara = swaraMap[parsed.swara] || parsed.swara;
  if (parsed.octave === 'higher') return `>${baseSwara}`;
  if (parsed.octave === 'lower') return `<${baseSwara}`;
  return baseSwara;
}

interface NotePlayer {
  osc?: OscillatorNode;
  gain?: GainNode;
  stopTime: number;
  extend?: (additionalDuration: number, silent: boolean) => void;
}

export default function WarmUpExercises({
  baseFreq,
  instrumentId = 'violin',
  volume = 0.8,
  notationLanguage = 'english',
}: {
  baseFreq: number;
  instrumentId?: InstrumentId;
  volume?: number;
  notationLanguage?: NotationLanguage;
}) {
  const [warmupPattern, setWarmupPattern] = useState<WarmupPattern>('staircase');

  const ascLines = useMemo(() => {
    if (warmupPattern === 'jumpingNotes') {
      const flat = buildJumpingNotesLetterNotes();
      const half = flat.length / 2;
      return chunkTokens(flat.slice(0, half), WARMUP_NOTES_PER_ROW);
    }
    if (warmupPattern === 'thirds') return chunkTokens([...THIRDS_ASC_NOTES], THIRDS_NOTES_PER_ROW);
    if (warmupPattern === 'threesAndFours') return threesAndFoursAscLines();
    if (warmupPattern === 'fourths') return fourthsAscLines();
    if (warmupPattern === 'fifths') return fifthsAscLines();
    if (warmupPattern === 'chromatic') return chunkTokens(chromaticNoteLabelsAsc(baseFreq), WARMUP_NOTES_PER_ROW);
    if (warmupPattern === 'triadMirror') return triadMirrorLines();
    return staircaseLines(STAIR_VARISAI_TOKENS.length);
  }, [warmupPattern, baseFreq]);

  const descLines = useMemo(() => {
    if (warmupPattern === 'jumpingNotes') {
      const flat = buildJumpingNotesLetterNotes();
      const half = flat.length / 2;
      return chunkTokens(flat.slice(half), WARMUP_NOTES_PER_ROW);
    }
    if (warmupPattern === 'thirds') return chunkTokens(THIRDS_DESC_NOTES, THIRDS_NOTES_PER_ROW);
    if (warmupPattern === 'threesAndFours') return threesAndFoursDescLines();
    if (warmupPattern === 'fourths') return fourthsDescLines();
    if (warmupPattern === 'fifths') return fifthsDescLines();
    if (warmupPattern === 'chromatic') return chunkTokens(chromaticNoteLabelsDesc(baseFreq), WARMUP_NOTES_PER_ROW);
    if (warmupPattern === 'triadMirror') return descendingTriadMirrorLines();
    return descendingStaircaseLines(STAIR_VARISAI_TOKENS.length);
  }, [warmupPattern, baseFreq]);

  const ascLineCount = ascLines.length;

  const stairLines = useMemo(() => [...ascLines, ...descLines], [ascLines, descLines]);

  const rawFlatTokens = useMemo(() => stairLines.flat(), [stairLines]);

  const [selectedRaga, setSelectedRaga] = useState<MelakartaRaga>(
    MELAKARTA_RAGAS.find((r) => r.name === 'Mayamalavagowla') || MELAKARTA_RAGAS[14]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [baseBPM, setBaseBPM] = useState(DEFAULT_PRACTICE_BPM);
  const [tempoInputValue, setTempoInputValue] = useState(String(DEFAULT_PRACTICE_BPM));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(-1);
  const [storageReady, setStorageReady] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playheadTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isPlayingRef = useRef(false);
  const masterGainRef = useRef<GainNode | null>(null);
  const soundfontPlayerRef = useRef<Awaited<ReturnType<typeof getInstrument>> | null>(null);
  const instrumentIdRef = useRef(instrumentId);
  const baseFreqRef = useRef(baseFreq);
  const baseBPMRef = useRef(baseBPM);
  const selectedRagaRef = useRef(selectedRaga);
  const rawFlatTokensRef = useRef(rawFlatTokens);
  const warmupPatternRef = useRef(warmupPattern);
  const hasLoadedRef = useRef(false);
  const stairFitOuterRef = useRef<HTMLDivElement>(null);
  const stairFitBlockRef = useRef<HTMLDivElement>(null);
  const [stairFit, setStairFit] = useState<{ scale: number; bw: number; bh: number }>({
    scale: 1,
    bw: 0,
    bh: 0,
  });

  instrumentIdRef.current = instrumentId;
  baseFreqRef.current = baseFreq;
  baseBPMRef.current = baseBPM;
  selectedRagaRef.current = selectedRaga;
  rawFlatTokensRef.current = rawFlatTokens;
  warmupPatternRef.current = warmupPattern;

  const handleBaseBPMChange = (newBaseBPM: number) => {
    baseBPMRef.current = newBaseBPM;
    setBaseBPM(newBaseBPM);
  };

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
        .catch(() => {
          soundfontPlayerRef.current = null;
        });
    } else {
      soundfontPlayerRef.current = null;
    }
  }, [instrumentId]);

  useLayoutEffect(() => {
    const stored = getStored<StoredWarmup>(WARMUP_STORAGE_KEY, {});
    if (typeof stored.ragaNumber === 'number') {
      const raga = MELAKARTA_RAGAS.find((r) => r.number === stored.ragaNumber);
      if (raga) setSelectedRaga(raga);
    }
    if (typeof stored.baseBPM === 'number' && stored.baseBPM >= 30 && stored.baseBPM <= 300) {
      setBaseBPM(stored.baseBPM);
    }
    if (
      stored.warmupPattern === 'staircase' ||
      stored.warmupPattern === 'triadMirror' ||
      stored.warmupPattern === 'jumpingNotes' ||
      stored.warmupPattern === 'thirds' ||
      stored.warmupPattern === 'threesAndFours' ||
      stored.warmupPattern === 'fourths' ||
      stored.warmupPattern === 'fifths' ||
      stored.warmupPattern === 'chromatic'
    ) {
      setWarmupPattern(stored.warmupPattern);
    }
    hasLoadedRef.current = true;
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    setStored(WARMUP_STORAGE_KEY, { ragaNumber: selectedRaga.number, baseBPM, warmupPattern });
  }, [selectedRaga, baseBPM, warmupPattern]);

  const linearToLogGain = (linearValue: number): number => {
    if (linearValue === 0) return 0;
    return Math.pow(linearValue, 3);
  };

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = linearToLogGain(volume);
    }
  }, [volume]);

  const sortedRagas = [...MELAKARTA_RAGAS].sort((a, b) => a.name.localeCompare(b.name));
  const filteredRagas = filterAndSortRagasBySearch(sortedRagas, searchQuery);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false);
    }
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const displayTitle =
    warmupPattern === 'triadMirror'
      ? 'Triad mirror'
      : warmupPattern === 'jumpingNotes'
        ? 'Jumping notes'
        : warmupPattern === 'thirds'
          ? 'Thirds'
          : warmupPattern === 'threesAndFours'
            ? 'Threes and fours'
            : warmupPattern === 'fourths'
              ? 'Fourths'
              : warmupPattern === 'fifths'
                ? 'Fifths'
                : warmupPattern === 'chromatic'
                  ? 'Chromatic'
                  : 'Staircase';

  const playPitchHz = (freq: number, duration: number, silent: boolean): NotePlayer | null => {
    if (!audioContextRef.current || !masterGainRef.current) return null;
    const now = audioContextRef.current.currentTime;
    const stopTime = now + duration / 1000;

    if (!isSineInstrument(instrumentIdRef.current) && soundfontPlayerRef.current) {
      const noteName = freqToNoteNameForInstrument(freq, instrumentIdRef.current);
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

  const playNote = (swara: string, duration: number, silent: boolean): NotePlayer | null => {
    const parsed = parseVarisaiNote(swara);
    let freq = getSwarafrequency(baseFreqRef.current, parsed.swara);
    if (parsed.octave === 'higher') freq *= 2;
    else if (parsed.octave === 'lower') freq *= 0.5;
    return playPitchHz(freq, duration, silent);
  };

  const playChromaticSemitone = (semitonesFromRoot: number, duration: number, silent: boolean): NotePlayer | null => {
    const freq = baseFreqRef.current * Math.pow(2, semitonesFromRoot / 12);
    return playPitchHz(freq, duration, silent);
  };

  const clearPlaybackTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    playheadTimeoutsRef.current.forEach((t) => clearTimeout(t));
    playheadTimeoutsRef.current = [];
  };

  const playSequence = (startIndex: number = 0) => {
    const tokens = rawFlatTokensRef.current;
    const notes = tokens.map((t) => convertVarisaiNoteToRaga(t, selectedRagaRef.current));
    const total = notes.length;
    const isChromatic = warmupPatternRef.current === 'chromatic';

    const playNext = (index: number) => {
      if (!isPlayingRef.current) {
        setIsPlaying(false);
        return;
      }
      const beatMs = (60 / baseBPMRef.current) * 1000;

      if (index >= total) {
        setIsPlaying(false);
        isPlayingRef.current = false;
        setCurrentNoteIndex(-1);
        return;
      }

      setCurrentNoteIndex(index);
      if (isChromatic) {
        playChromaticSemitone(CHROMATIC_FLAT_SEMITONES[index], beatMs, false);
      } else {
        playNote(notes[index], beatMs, false);
      }
      timeoutRef.current = setTimeout(() => playNext(index + 1), beatMs);
    };

    playNext(startIndex);
  };

  const stopPlayback = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentNoteIndex(-1);
    clearPlaybackTimers();
    oscillatorsRef.current.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        /* noop */
      }
    });
    oscillatorsRef.current = [];
    if (soundfontPlayerRef.current) {
      try {
        soundfontPlayerRef.current.stop();
      } catch {
        /* noop */
      }
      soundfontPlayerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const ensureAudio = async (): Promise<boolean> => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
        } catch {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  };

  const startPlayback = async (startIndex: number = 0) => {
    if (isPlayingRef.current) return;
    const ok = await ensureAudio();
    if (!ok) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }
    isPlayingRef.current = true;
    setIsPlaying(true);
    playSequence(startIndex);
  };

  const seekToNote = async (noteIndex: number) => {
    if (isPlayingRef.current) {
      clearPlaybackTimers();
      oscillatorsRef.current.forEach((osc) => {
        try {
          osc.stop();
        } catch {
          /* noop */
        }
      });
      oscillatorsRef.current = [];
      if (soundfontPlayerRef.current) {
        try {
          soundfontPlayerRef.current.stop();
        } catch {
          /* noop */
        }
      }
      isPlayingRef.current = true;
      setIsPlaying(true);
      playSequence(noteIndex);
      return;
    }
    await startPlayback(noteIndex);
  };

  const handleRagaChange = (ragaName: string) => {
    const raga = MELAKARTA_RAGAS.find((r) => r.name === ragaName);
    if (raga) {
      if (isPlayingRef.current) stopPlayback();
      setSelectedRaga(raga);
      setDropdownOpen(false);
      setSearchQuery('');
    }
  };

  const handleWarmupPatternChange = (pattern: WarmupPattern) => {
    if (pattern === warmupPattern) return;
    if (isPlayingRef.current) stopPlayback();
    if (pattern === 'chromatic') setDropdownOpen(false);
    setWarmupPattern(pattern);
  };

  const flatIndexBeforeLine = (lineIdx: number) => {
    let s = 0;
    for (let i = 0; i < lineIdx; i++) s += stairLines[i].length;
    return s;
  };

  useLayoutEffect(() => {
    const outer = stairFitOuterRef.current;
    const block = stairFitBlockRef.current;
    if (!outer || !block) return;

    const measure = () => {
      const cw = outer.getBoundingClientRect().width;
      const bw = Math.max(block.scrollWidth, block.offsetWidth);
      const bh = Math.max(block.scrollHeight, block.offsetHeight);
      if (bw < 1 || bh < 1) {
        setStairFit({ scale: 1, bw: 0, bh: 0 });
        return;
      }
      const PAD = 6;
      const scale = cw > PAD ? Math.min(1, (cw - PAD) / bw) : Math.min(1, cw / bw);
      setStairFit({ scale, bw, bh });
    };

    measure();
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(() => requestAnimationFrame(measure));
    ro.observe(outer);
    ro.observe(block);
    const fontsDone =
      typeof document !== 'undefined' && document.fonts?.ready
        ? document.fonts.ready.then(() => requestAnimationFrame(measure))
        : Promise.resolve();
    fontsDone.catch(() => {});
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [stairLines, warmupPattern, selectedRaga, notationLanguage]);

  if (!storageReady) {
    return (
      <div className="w-full max-w-4xl mx-auto flex items-center justify-center min-h-[200px]">
        <span className="text-slate-500 text-sm">Loading…</span>
      </div>
    );
  }

  const compactStaircase =
    warmupPattern === 'staircase' ||
    warmupPattern === 'threesAndFours' ||
    warmupPattern === 'fourths' ||
    warmupPattern === 'fifths';

  return (
    <div className="w-full max-w-4xl mx-auto min-w-0 overflow-x-hidden">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-12 shadow-2xl border border-slate-700/50 min-w-0 overflow-x-hidden">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light mb-2 tracking-wide">{displayTitle}</h1>
          <p className="text-slate-400 text-sm md:text-base">Practice basic exercises</p>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-300 mb-3 text-center">Exercise</label>
          <div className="flex flex-wrap gap-2 justify-center">
            {WARMUP_PATTERNS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleWarmupPatternChange(id)}
                className={`
                  px-4 py-2 rounded-lg
                  transition-all duration-200
                  text-sm font-medium
                  cursor-pointer
                  ${warmupPattern === id
                    ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30 scale-105'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:scale-102'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            {warmupPattern === 'staircase'
              ? 'Ārōhaṇa: each line adds the next swara and returns to ṣaḍjam, up to tāra ṣaḍjam. Then avarōhaṇa: each line from tāra ṣaḍjam steps down and returns to madhya ṣaḍjam.'
              : warmupPattern === 'triadMirror'
                ? 'Ārōhaṇa: triad mirror lines from ṣaḍjam through tāra gāndhāra. Then avarōhaṇa: triad mirror lines from tāra gāndhāra down into the mandhra register through lower dhaivata (<Dha).'
                : warmupPattern === 'thirds'
                  ? 'Ārōhaṇa: thirds pattern S G R M G P M D P N D ·S. Avarōhaṇa: the same sequence in reverse.'
                  : warmupPattern === 'threesAndFours'
                    ? 'Ārōhaṇa: three swaras then four from the same start up to ·S. Avarōhaṇa: the same shape coming down from ·S (e.g. ·S N D ·S N D P, N D P N D P M, … to ṣaḍjam).'
                    : warmupPattern === 'fourths'
                      ? 'Ārōhaṇa: fourths as pairs (S M, R P, G D, M N, P ·S). Avarōhaṇa: that line reversed in pairs (·S P, N M, D G, P R, M S).'
                      : warmupPattern === 'fifths'
                        ? 'Ārōhaṇa: fifths as pairs (S P, R D, G N, M ·S). Avarōhaṇa: that line reversed in pairs (·S M, N G, D R, P S).'
                        : warmupPattern === 'chromatic'
                          ? 'Equal temperament: every semitone from your key up one octave and back. The first name matches your selected key.'
                          : 'Ārōhaṇa: every pair of scale degrees (lower swara first, then higher). Avarōhaṇa: the same pairs in reverse order, each pair played high then low. Eight notes per line.'}
          </p>
        </div>

        {warmupPattern !== 'chromatic' && (
          <div className="mb-8 w-full">
            <label className="block text-sm font-medium text-slate-300 mb-3 text-center">Select Raga</label>
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
        )}

        <div className="flex flex-col items-center mb-8">
          <button
            type="button"
            onClick={isPlaying ? stopPlayback : () => startPlayback(0)}
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
            <div
              className={`
              absolute inset-0 rounded-full pointer-events-none
              ${isPlaying ? 'animate-ping opacity-20' : ''}
              ${isPlaying ? 'bg-amber-400' : ''}
            `}
            />
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

          <p className="mt-4 text-slate-400 text-sm">{isPlaying ? `Playing at ${baseBPM} BPM` : 'Stopped'}</p>
        </div>

        <div className="mt-6 border-t border-slate-700/35 pt-6 pb-2">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
            <span className="text-sm font-medium text-slate-400">Tempo (BPM)</span>
            <div className="flex w-full max-w-[280px] flex-row items-stretch divide-x divide-slate-600 overflow-hidden rounded-lg border border-slate-600 bg-slate-800/30">
              <button
                type="button"
                onClick={() => {
                  const v = Math.max(30, Math.round(Math.floor(baseBPM / 2) / 5) * 5);
                  handleBaseBPMChange(v);
                  setTempoInputValue(String(v));
                }}
                disabled={baseBPM <= 30}
                aria-label="Halve tempo"
                className="flex h-10 min-w-[2.5rem] flex-1 items-center justify-center text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-slate-500"
              >
                ÷2
              </button>
              <button
                type="button"
                onClick={() => {
                  const v = Math.max(30, baseBPM - 5);
                  handleBaseBPMChange(v);
                  setTempoInputValue(String(v));
                }}
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
                    if (num > 300) num = 300;
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
                onClick={() => {
                  const v = Math.min(300, baseBPM + 5);
                  handleBaseBPMChange(v);
                  setTempoInputValue(String(v));
                }}
                disabled={baseBPM >= 300}
                aria-label="Increase tempo"
                className="flex h-10 min-w-[2.5rem] flex-1 items-center justify-center text-lg leading-none text-slate-300 transition-colors hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-slate-500"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => {
                  const v = Math.min(300, Math.round((baseBPM * 2) / 5) * 5);
                  handleBaseBPMChange(v);
                  setTempoInputValue(String(v));
                }}
                disabled={baseBPM >= 300}
                aria-label="Double tempo"
                className="flex h-10 min-w-[2.5rem] flex-1 items-center justify-center text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-slate-500"
              >
                x2
              </button>
            </div>
          </div>
        </div>

        <div className="relative z-0 mt-8 min-w-0 w-full max-w-full isolate">
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-4">Exercise notes</p>
            <div className="mx-auto w-full min-w-0 max-w-3xl px-1 sm:px-2">
              <div
                ref={stairFitOuterRef}
                className="relative z-0 box-border w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-2xl border border-slate-700/50 bg-slate-900/40"
                role="region"
                aria-label={
                  warmupPattern === 'staircase'
                    ? 'Staircase pattern'
                    : warmupPattern === 'triadMirror'
                      ? 'Triad mirror pattern'
                      : warmupPattern === 'thirds'
                        ? 'Thirds pattern'
                        : warmupPattern === 'threesAndFours'
                          ? 'Threes and fours pattern'
                          : warmupPattern === 'fourths'
                            ? 'Fourths pattern'
                            : warmupPattern === 'fifths'
                              ? 'Fifths pattern'
                              : warmupPattern === 'chromatic'
                                ? 'Chromatic pattern'
                                : 'Jumping notes pattern'
                }
              >
                {/*
                  Scaled content is position:absolute; the dimension wrapper MUST always be position:relative
                  (even before ResizeObserver runs) or the absolute layer anchors to a distant ancestor and
                  can paint over the header. Clip to measured (bw×scale)×(bh×scale).
                */}
                <div
                  className="mx-auto box-border max-w-full"
                  style={
                    stairFit.bw > 0 && stairFit.bh > 0
                      ? {
                          width: '100%',
                          maxWidth: '100%',
                          height: stairFit.bh * stairFit.scale,
                          overflow: 'hidden',
                          position: 'relative',
                        }
                      : {
                          minHeight: '10rem',
                          position: 'relative',
                          overflow: 'hidden',
                          width: '100%',
                        }
                  }
                >
                  <div
                    className="box-border"
                    style={
                      stairFit.bw > 0
                        ? {
                            position: 'absolute',
                            left: '50%',
                            top: 0,
                            width: stairFit.bw,
                            transform: `translateX(-50%) scale(${stairFit.scale})`,
                            transformOrigin: 'top center',
                            willChange: 'transform',
                          }
                        : {
                            position: 'relative',
                            width: '100%',
                          }
                    }
                  >
                    <div
                      ref={stairFitBlockRef}
                      className="inline-flex w-max max-w-none flex-col items-center divide-y divide-slate-700/45"
                    >
                      {ascLineCount > 0 && (
                        <div
                          className="flex w-full min-w-[12rem] flex-col items-center gap-1 border-b border-slate-700/45 bg-slate-800/20 py-2.5"
                          role="separator"
                          aria-label="Ārōhaṇa section"
                        >
                          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:text-xs">
                            Ārōhaṇa
                          </span>
                        </div>
                      )}
                      {ascLines.map((row, lineIdx) => {
                        const baseFlat = flatIndexBeforeLine(lineIdx);
                        const rowHasActive =
                          isPlaying &&
                          currentNoteIndex >= baseFlat &&
                          currentNoteIndex < baseFlat + row.length;
                        const chunks = chunksForWarmupRow(warmupPattern, row);
                        return (
                          <div
                            key={`asc-${lineIdx}`}
                            className={`flex w-full flex-col items-center py-1.5 sm:py-2 ${
                              compactStaircase ? 'gap-0.5 sm:gap-1' : 'gap-1 sm:gap-1.5'
                            }`}
                          >
                            {chunks.map((chunk, chunkIdx) => {
                              const chunkBase = chunks
                                .slice(0, chunkIdx)
                                .reduce((sum, c) => sum + c.length, 0);
                              return (
                                <div
                                  key={`${lineIdx}-${chunkIdx}`}
                                  className={`
                                    flex w-max max-w-none flex-nowrap justify-center transition-colors
                                    ${compactStaircase ? 'gap-1 px-1 sm:gap-1.5 sm:px-2' : 'gap-1.5 px-2 sm:gap-2 sm:px-3'}
                                    ${rowHasActive ? 'bg-amber-500/[0.06]' : ''}
                                  `}
                                >
                                  {chunk.map((token, pos) => {
                                    const flatIdx = baseFlat + chunkBase + pos;
                                    const note = convertVarisaiNoteToRaga(token, selectedRaga);
                                    const parsed = parseVarisaiNote(note);
                                    const done = isPlaying && currentNoteIndex > flatIdx;
                                    const active = isPlaying && currentNoteIndex === flatIdx;
                                    return (
                                      <div
                                        key={flatIdx}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => seekToNote(flatIdx)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            seekToNote(flatIdx);
                                          }
                                        }}
                                        className={`
                                          flex shrink-0 items-center justify-center font-semibold relative
                                          transition-colors duration-200 cursor-pointer
                                          ${compactStaircase
                                            ? 'w-[1.375rem] h-[1.375rem] min-[380px]:w-6 min-[380px]:h-6 sm:w-7 sm:h-8 rounded-md text-[9px] min-[380px]:text-[10px] sm:text-xs'
                                            : warmupPattern === 'chromatic'
                                              ? 'min-w-[2.25rem] px-1 h-9 sm:min-w-[2.75rem] sm:px-1.5 sm:h-12 rounded-lg text-xs sm:text-sm'
                                              : 'w-9 h-9 sm:w-12 sm:h-12 rounded-lg text-sm sm:text-lg'
                                          }
                                          ${active
                                            ? 'bg-amber-500 text-slate-900 shadow-lg ring-2 ring-amber-400/80 ring-inset'
                                            : done
                                              ? 'bg-slate-700/30 text-slate-500 hover:bg-slate-600/50'
                                              : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/70'
                                          }
                                        `}
                                      >
                                        {warmupPattern === 'chromatic' ? (
                                          <span className="tabular-nums tracking-tight">{token}</span>
                                        ) : (
                                          <>
                                            <SwaraGlyph swara={parsed.swara} language={notationLanguage} />
                                            {parsed.octave === 'higher' && (
                                              <span
                                                className={`absolute left-1/2 -translate-x-1/2 leading-none ${
                                                  compactStaircase
                                                    ? 'top-0 text-[6px] translate-y-[2px] sm:translate-y-[3px]'
                                                    : 'top-0 text-[10px] -translate-y-[-6px]'
                                                }`}
                                              >
                                                •
                                              </span>
                                            )}
                                            {parsed.octave === 'lower' && (
                                              <span
                                                className={`absolute left-1/2 -translate-x-1/2 leading-none ${
                                                  compactStaircase
                                                    ? 'bottom-0 text-[6px] -translate-y-[2px] sm:-translate-y-[3px]'
                                                    : 'bottom-0 text-[10px] translate-y-[-6px]'
                                                }`}
                                              >
                                                •
                                              </span>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                      {descLines.length > 0 && (
                        <div
                          className="flex w-full min-w-[12rem] flex-col items-center gap-1 border-t border-slate-600/80 bg-slate-800/30 py-2.5"
                          role="separator"
                          aria-label="Avarōhaṇa section"
                        >
                          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:text-xs">
                            Avarōhaṇa
                          </span>
                        </div>
                      )}
                      {descLines.map((row, i) => {
                        const lineIdx = ascLineCount + i;
                        const baseFlat = flatIndexBeforeLine(lineIdx);
                        const rowHasActive =
                          isPlaying &&
                          currentNoteIndex >= baseFlat &&
                          currentNoteIndex < baseFlat + row.length;
                        const chunks = chunksForWarmupRow(warmupPattern, row);
                        return (
                          <div
                            key={`desc-${i}`}
                            className={`flex w-full flex-col items-center py-1.5 sm:py-2 ${
                              compactStaircase ? 'gap-0.5 sm:gap-1' : 'gap-1 sm:gap-1.5'
                            }`}
                          >
                            {chunks.map((chunk, chunkIdx) => {
                              const chunkBase = chunks
                                .slice(0, chunkIdx)
                                .reduce((sum, c) => sum + c.length, 0);
                              return (
                                <div
                                  key={`${i}-${chunkIdx}`}
                                  className={`
                                    flex w-max max-w-none flex-nowrap justify-center transition-colors
                                    ${compactStaircase ? 'gap-1 px-1 sm:gap-1.5 sm:px-2' : 'gap-1.5 px-2 sm:gap-2 sm:px-3'}
                                    ${rowHasActive ? 'bg-amber-500/[0.06]' : ''}
                                  `}
                                >
                                  {chunk.map((token, pos) => {
                                    const flatIdx = baseFlat + chunkBase + pos;
                                    const note = convertVarisaiNoteToRaga(token, selectedRaga);
                                    const parsed = parseVarisaiNote(note);
                                    const done = isPlaying && currentNoteIndex > flatIdx;
                                    const active = isPlaying && currentNoteIndex === flatIdx;
                                    return (
                                      <div
                                        key={flatIdx}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => seekToNote(flatIdx)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            seekToNote(flatIdx);
                                          }
                                        }}
                                        className={`
                                          flex shrink-0 items-center justify-center font-semibold relative
                                          transition-colors duration-200 cursor-pointer
                                          ${compactStaircase
                                            ? 'w-[1.375rem] h-[1.375rem] min-[380px]:w-6 min-[380px]:h-6 sm:w-7 sm:h-8 rounded-md text-[9px] min-[380px]:text-[10px] sm:text-xs'
                                            : warmupPattern === 'chromatic'
                                              ? 'min-w-[2.25rem] px-1 h-9 sm:min-w-[2.75rem] sm:px-1.5 sm:h-12 rounded-lg text-xs sm:text-sm'
                                              : 'w-9 h-9 sm:w-12 sm:h-12 rounded-lg text-sm sm:text-lg'
                                          }
                                          ${active
                                            ? 'bg-amber-500 text-slate-900 shadow-lg ring-2 ring-amber-400/80 ring-inset'
                                            : done
                                              ? 'bg-slate-700/30 text-slate-500 hover:bg-slate-600/50'
                                              : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/70'
                                          }
                                        `}
                                      >
                                        {warmupPattern === 'chromatic' ? (
                                          <span className="tabular-nums tracking-tight">{token}</span>
                                        ) : (
                                          <>
                                            <SwaraGlyph swara={parsed.swara} language={notationLanguage} />
                                            {parsed.octave === 'higher' && (
                                              <span
                                                className={`absolute left-1/2 -translate-x-1/2 leading-none ${
                                                  compactStaircase
                                                    ? 'top-0 text-[6px] translate-y-[2px] sm:translate-y-[3px]'
                                                    : 'top-0 text-[10px] -translate-y-[-6px]'
                                                }`}
                                              >
                                                •
                                              </span>
                                            )}
                                            {parsed.octave === 'lower' && (
                                              <span
                                                className={`absolute left-1/2 -translate-x-1/2 leading-none ${
                                                  compactStaircase
                                                    ? 'bottom-0 text-[6px] -translate-y-[2px] sm:-translate-y-[3px]'
                                                    : 'bottom-0 text-[10px] translate-y-[-6px]'
                                                }`}
                                              >
                                                •
                                              </span>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
