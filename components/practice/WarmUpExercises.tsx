'use client';

import { RagaSearch } from '@/components/ragas/RagaSearch';

import { PlaybackButton } from '@/components/ui/Button';

import TempoControl from '@/components/ui/TempoControl';

import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { parseVarisaiNote } from '@/data/exercises/saraliVarisai';
import { getSwarafrequency } from '@/data/ragas';
import { MELAKARTA_RAGAS, type MelakartaRaga } from '@/data/ragas';
import {
  getInstrument,
  freqToNoteNameForInstrument,
  isSineInstrument,
  type InstrumentId,
} from '@/lib/audio/instrumentLoader';
import type { NotationLanguage } from '@/lib/music/swaraNotation';
import { SwaraGlyph } from '@/components/notation/SwaraGlyph';
import {
  staircaseLines,
  descendingStaircaseLines,
  STAIR_VARISAI_TOKENS,
} from '@/lib/patterns/staircasePattern';
import { triadMirrorLines, descendingTriadMirrorLines } from '@/lib/patterns/triadMirrorPattern';
import { buildJumpingNotesLetterNotes } from '@/lib/patterns/jumpingNotesPattern';
import {
  THIRDS_ASC_NOTES,
  THIRDS_DESC_NOTES,
  THIRDS_NOTES_PER_ROW,
} from '@/lib/patterns/thirdsPattern';
import {
  CHROMATIC_FLAT_SEMITONES,
  chromaticNoteLabelsAsc,
  chromaticNoteLabelsDesc,
} from '@/lib/patterns/chromaticPattern';
import {
  threesAndFoursAscLines,
  threesAndFoursDescLines,
} from '@/lib/patterns/threesAndFoursPattern';
import { fourthsAscLines, fourthsDescLines } from '@/lib/patterns/fourthsPattern';
import { fifthsAscLines, fifthsDescLines } from '@/lib/patterns/fifthsPattern';
import { getStored, setStored } from '@/lib/storage';
import { DEFAULT_PRACTICE_BPM, PRACTICE_TEMPO_MAX_BPM } from '@/lib/music/defaultTempo';

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
    if (warmupPattern === 'chromatic')
      return chunkTokens(chromaticNoteLabelsAsc(baseFreq), WARMUP_NOTES_PER_ROW);
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
    if (warmupPattern === 'chromatic')
      return chunkTokens(chromaticNoteLabelsDesc(baseFreq), WARMUP_NOTES_PER_ROW);
    if (warmupPattern === 'triadMirror') return descendingTriadMirrorLines();
    return descendingStaircaseLines(STAIR_VARISAI_TOKENS.length);
  }, [warmupPattern, baseFreq]);

  const ascLineCount = ascLines.length;

  const stairLines = useMemo(() => [...ascLines, ...descLines], [ascLines, descLines]);

  const rawFlatTokens = useMemo(() => stairLines.flat(), [stairLines]);

  const [selectedRaga, setSelectedRaga] = useState<MelakartaRaga>(
    MELAKARTA_RAGAS.find((r) => r.name === 'Mayamalavagowla') || MELAKARTA_RAGAS[14],
  );
  const [baseBPM, setBaseBPM] = useState(DEFAULT_PRACTICE_BPM);
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
    if (
      typeof stored.baseBPM === 'number' &&
      stored.baseBPM >= 30 &&
      stored.baseBPM <= PRACTICE_TEMPO_MAX_BPM
    ) {
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
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    setStored(WARMUP_STORAGE_KEY, { ragaNumber: selectedRaga.number, baseBPM, warmupPattern });
  }, [storageReady, selectedRaga, baseBPM, warmupPattern]);

  const linearToLogGain = (linearValue: number): number => {
    if (linearValue === 0) return 0;
    return Math.pow(linearValue, 3);
  };

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = linearToLogGain(volume);
    }
  }, [volume]);

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

  const playNote = (swara: string, duration: number, silent: boolean): NotePlayer | null => {
    const parsed = parseVarisaiNote(swara);
    let freq = getSwarafrequency(baseFreqRef.current, parsed.swara);
    if (parsed.octave === 'higher') freq *= 2;
    else if (parsed.octave === 'lower') freq *= 0.5;
    return playPitchHz(freq, duration, silent);
  };

  const playChromaticSemitone = (
    semitonesFromRoot: number,
    duration: number,
    silent: boolean,
  ): NotePlayer | null => {
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
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    }
  };

  const handleWarmupPatternChange = (pattern: WarmupPattern) => {
    if (pattern === warmupPattern) return;
    if (isPlayingRef.current) stopPlayback();
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
        <span className="text-muted text-sm">Loading…</span>
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
      <div className="feature-panel">
        <div className="feature-heading">
          <h2>{displayTitle}</h2>
          <p className="text-muted text-sm md:text-base">Practice basic exercises</p>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-ink mb-3 text-center">Exercise</label>
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
                  ${
                    warmupPattern === id
                      ? 'bg-accent text-on-accent shadow-lg  scale-105'
                      : 'bg-subtle/50 text-ink hover:bg-subtle hover:scale-102'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-xs sm:text-sm text-muted max-w-lg mx-auto">
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
            <label className="block text-sm font-medium text-ink mb-3 text-center">
              Select Raga
            </label>
            <RagaSearch
              selected={selectedRaga}
              ragas={MELAKARTA_RAGAS}
              onSelect={(raga) => handleRagaChange(raga.name)}
              showSelection
              className="raga-search--wide"
            />
          </div>
        )}

        <div className="flex flex-col items-center mb-8">
          <PlaybackButton
            label="warm-up"
            playing={isPlaying}
            onClick={isPlaying ? stopPlayback : () => startPlayback(0)}
          />

          <p className="mt-4 text-muted text-sm">
            {isPlaying ? `Playing at ${baseBPM} BPM` : 'Stopped'}
          </p>
        </div>

        <div className="player-tempo">
          <TempoControl value={baseBPM} onChange={handleBaseBPMChange} />
        </div>

        <div className="relative z-0 mt-8 min-w-0 w-full max-w-full isolate">
          <div className="text-center">
            <p className="text-muted text-sm mb-4">Exercise notes</p>
            <div className="mx-auto w-full min-w-0 max-w-3xl px-1 sm:px-2">
              <div
                ref={stairFitOuterRef}
                className="relative z-0 box-border w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-2xl border border-line/50 bg-surface/40"
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
                      className="inline-flex w-max max-w-none flex-col items-center divide-y divide-line/45"
                    >
                      {ascLineCount > 0 && (
                        <div
                          className="flex w-full min-w-[12rem] flex-col items-center gap-1 border-b border-line/45 bg-surface/20 py-2.5"
                          role="separator"
                          aria-label="Ārōhaṇa section"
                        >
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted sm:text-xs">
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
                                    ${rowHasActive ? 'bg-accent/[0.06]' : ''}
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
                                          ${
                                            compactStaircase
                                              ? 'w-[1.375rem] h-[1.375rem] min-[380px]:w-6 min-[380px]:h-6 sm:w-7 sm:h-8 rounded-md text-[9px] min-[380px]:text-[10px] sm:text-xs'
                                              : warmupPattern === 'chromatic'
                                                ? 'min-w-[2.25rem] px-1 h-9 sm:min-w-[2.75rem] sm:px-1.5 sm:h-12 rounded-lg text-xs sm:text-sm'
                                                : 'w-9 h-9 sm:w-12 sm:h-12 rounded-lg text-sm sm:text-lg'
                                          }
                                          ${
                                            active
                                              ? 'bg-accent text-on-accent shadow-lg ring-2 ring-accent/80 ring-inset'
                                              : done
                                                ? 'bg-subtle/30 text-muted hover:bg-line/50'
                                                : 'bg-subtle/50 text-ink hover:bg-line/70'
                                          }
                                        `}
                                      >
                                        {warmupPattern === 'chromatic' ? (
                                          <span className="tabular-nums tracking-tight">
                                            {token}
                                          </span>
                                        ) : (
                                          <>
                                            <SwaraGlyph
                                              swara={parsed.swara}
                                              language={notationLanguage}
                                            />
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
                          className="flex w-full min-w-[12rem] flex-col items-center gap-1 border-t border-line/80 bg-surface/30 py-2.5"
                          role="separator"
                          aria-label="Avarōhaṇa section"
                        >
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted sm:text-xs">
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
                                    ${rowHasActive ? 'bg-accent/[0.06]' : ''}
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
                                          ${
                                            compactStaircase
                                              ? 'w-[1.375rem] h-[1.375rem] min-[380px]:w-6 min-[380px]:h-6 sm:w-7 sm:h-8 rounded-md text-[9px] min-[380px]:text-[10px] sm:text-xs'
                                              : warmupPattern === 'chromatic'
                                                ? 'min-w-[2.25rem] px-1 h-9 sm:min-w-[2.75rem] sm:px-1.5 sm:h-12 rounded-lg text-xs sm:text-sm'
                                                : 'w-9 h-9 sm:w-12 sm:h-12 rounded-lg text-sm sm:text-lg'
                                          }
                                          ${
                                            active
                                              ? 'bg-accent text-on-accent shadow-lg ring-2 ring-accent/80 ring-inset'
                                              : done
                                                ? 'bg-subtle/30 text-muted hover:bg-line/50'
                                                : 'bg-subtle/50 text-ink hover:bg-line/70'
                                          }
                                        `}
                                      >
                                        {warmupPattern === 'chromatic' ? (
                                          <span className="tabular-nums tracking-tight">
                                            {token}
                                          </span>
                                        ) : (
                                          <>
                                            <SwaraGlyph
                                              swara={parsed.swara}
                                              language={notationLanguage}
                                            />
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
