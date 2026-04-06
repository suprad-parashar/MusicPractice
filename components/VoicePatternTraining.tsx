'use client';

import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { parseVarisaiNote } from '@/data/saraliVarisai';
import { getSwarafrequency, MELAKARTA_RAGAS, type MelakartaRaga } from '@/data/ragas';
import { getInstrument, freqToNoteNameForInstrument, isSineInstrument, type InstrumentId } from '@/lib/instrumentLoader';
import type { NotationLanguage } from '@/lib/swaraNotation';
import { SwaraGlyph } from '@/components/SwaraGlyph';
import { filterAndSortRagasBySearch } from '@/lib/ragaSearch';
import { getStored, setStored } from '@/lib/storage';
import { DEFAULT_PRACTICE_BPM } from '@/lib/defaultTempo';
import {
  voiceNotePool,
  generateVoicePatternTokens,
  mulberry32,
  buildVoiceRisingRows,
  buildVoiceDescendingRows,
  maxPatternLengthForPool,
  type VoiceHighNote,
  type VoiceLowNote,
} from '@/lib/voicePattern';

const STORAGE_KEY = 'voicePatternSettings';
type StoredVoicePattern = {
  ragaNumber?: number;
  baseBPM?: number;
  patternLength?: number;
  lowNote?: VoiceLowNote;
  highNote?: VoiceHighNote;
};

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

function VoicePatternNoteCell({
  swaraFull,
  notationLanguage,
  isCurrent,
  isPast,
  onSeek,
}: {
  swaraFull: string;
  notationLanguage: NotationLanguage;
  isCurrent: boolean;
  isPast: boolean;
  onSeek: () => void;
}) {
  const parsed = parseVarisaiNote(swaraFull);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSeek}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSeek();
        }
      }}
      className={`
        w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg text-sm sm:text-lg font-semibold relative
        transition-all duration-200 cursor-pointer hover:scale-105
        ${isCurrent
          ? 'bg-amber-500 text-slate-900 scale-110 shadow-lg'
          : isPast
            ? 'bg-slate-700/30 text-slate-500 hover:bg-slate-600/50'
            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/70'
        }
      `}
    >
      <SwaraGlyph swara={parsed.swara} language={notationLanguage} />
      {parsed.octave === 'higher' && (
        <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-[-6px] text-[10px] leading-none">•</span>
      )}
      {parsed.octave === 'lower' && (
        <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-[-6px] text-[10px] leading-none">•</span>
      )}
    </div>
  );
}

interface NotePlayer {
  osc?: OscillatorNode;
  gain?: GainNode;
  stopTime: number;
  extend?: (additionalDuration: number, silent: boolean) => void;
}

export default function VoicePatternTraining({
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
  const [selectedRaga, setSelectedRaga] = useState<MelakartaRaga>(
    MELAKARTA_RAGAS.find((r) => r.name === 'Mayamalavagowla') || MELAKARTA_RAGAS[14]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [patternLength, setPatternLength] = useState(4);
  const [nInputValue, setNInputValue] = useState('4');
  const [lowNote, setLowNote] = useState<VoiceLowNote>('S');
  const [highNote, setHighNote] = useState<VoiceHighNote>('M');
  const [patternTokens, setPatternTokens] = useState<string[] | null>(null);
  const [genMessage, setGenMessage] = useState<string | null>(null);

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
  const playbackTokensRef = useRef<string[]>([]);
  const hasLoadedRef = useRef(false);

  instrumentIdRef.current = instrumentId;
  baseFreqRef.current = baseFreq;
  baseBPMRef.current = baseBPM;
  selectedRagaRef.current = selectedRaga;

  const risingRows = useMemo(() => {
    if (!patternTokens || patternTokens.length === 0) return [];
    return buildVoiceRisingRows(patternTokens);
  }, [patternTokens]);

  const descendingRows = useMemo(() => {
    if (!patternTokens?.length) return [];
    return buildVoiceDescendingRows(patternTokens);
  }, [patternTokens]);

  const displayRows = useMemo(
    () => [...risingRows, ...descendingRows],
    [risingRows, descendingRows]
  );

  const flatPlaybackTokens = useMemo(() => {
    if (!patternTokens?.length) return [];
    return [...risingRows.flat(), ...descendingRows.flat()];
  }, [patternTokens, risingRows, descendingRows]);

  useEffect(() => {
    playbackTokensRef.current = flatPlaybackTokens;
  }, [flatPlaybackTokens]);

  const handleBaseBPMChange = useCallback((newBaseBPM: number) => {
    baseBPMRef.current = newBaseBPM;
    setBaseBPM(newBaseBPM);
  }, []);

  useEffect(() => {
    setTempoInputValue(String(baseBPM));
  }, [baseBPM]);

  useEffect(() => {
    setNInputValue(String(patternLength));
  }, [patternLength]);

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = linearToLogGain(volume);
    }
  }, [volume]);

  useLayoutEffect(() => {
    const s = getStored<StoredVoicePattern>(STORAGE_KEY, {});
    if (typeof s.ragaNumber === 'number') {
      const raga = MELAKARTA_RAGAS.find((r) => r.number === s.ragaNumber);
      if (raga) setSelectedRaga(raga);
    }
    if (typeof s.baseBPM === 'number' && s.baseBPM >= 30 && s.baseBPM <= 300) {
      setBaseBPM(s.baseBPM);
      baseBPMRef.current = s.baseBPM;
    }
    if (typeof s.patternLength === 'number' && s.patternLength >= 3 && s.patternLength <= 16) {
      setPatternLength(s.patternLength);
    }
    if (s.lowNote === '<D' || s.lowNote === '<N' || s.lowNote === 'S') setLowNote(s.lowNote);
    if (s.highNote === 'G' || s.highNote === 'M' || s.highNote === 'P') setHighNote(s.highNote);
    hasLoadedRef.current = true;
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    setStored(STORAGE_KEY, {
      ragaNumber: selectedRaga.number,
      baseBPM,
      patternLength,
      lowNote,
      highNote,
    });
  }, [selectedRaga, baseBPM, patternLength, lowNote, highNote]);

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

  const linearToLogGain = (linearValue: number): number => {
    if (linearValue === 0) return 0;
    return Math.pow(linearValue, 3);
  };

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

  const clearPlaybackTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    playheadTimeoutsRef.current.forEach((t) => clearTimeout(t));
    playheadTimeoutsRef.current = [];
  };

  const stopPlayback = useCallback(() => {
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
  }, []);

  const playSequence = useCallback((startIndex: number = 0) => {
    const tokens = playbackTokensRef.current;
    const notes = tokens.map((t) => convertVarisaiNoteToRaga(t, selectedRagaRef.current));
    const total = notes.length;

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
      playNote(notes[index], beatMs, false);
      timeoutRef.current = setTimeout(() => playNext(index + 1), beatMs);
    };

    playNext(startIndex);
  }, []);

  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stopPlayback]);

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
    if (!patternTokens?.length || flatPlaybackTokens.length === 0) return;
    if (isPlayingRef.current) return;
    const ok = await ensureAudio();
    if (!ok) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }
    playbackTokensRef.current = flatPlaybackTokens;
    isPlayingRef.current = true;
    setIsPlaying(true);
    playSequence(startIndex);
  };

  const clampPatternLength = (n: number) => Math.min(16, Math.max(3, n));

  const handlePatternLengthStep = (delta: number) => {
    stopPlayback();
    setPatternLength((prev) => clampPatternLength(prev + delta));
  };

  const seekToNote = async (noteIndex: number) => {
    if (!patternTokens?.length || flatPlaybackTokens.length === 0) return;
    playbackTokensRef.current = flatPlaybackTokens;
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

  const handleGenerate = () => {
    stopPlayback();
    setGenMessage(null);
    const p = voiceNotePool(lowNote, highNote);
    if (p.length === 0) {
      setGenMessage('Invalid note range.');
      setPatternTokens(null);
      return;
    }
    const poolForLimits = p.includes('S') ? p : [...p, 'S'];
    if (patternLength > maxPatternLengthForPool(poolForLimits)) {
      setGenMessage(
        `With this range you can have at most ${maxPatternLengthForPool(poolForLimits)} notes (each swara at most five times). Lower N or widen the range.`
      );
      setPatternTokens(null);
      return;
    }
    const seed = Date.now() ^ (Math.floor(performance.now() * 1e6) >>> 0);
    const rng = mulberry32(seed);
    const tokens = generateVoicePatternTokens(p, patternLength, rng);
    if (!tokens) {
      setGenMessage('Could not generate a pattern with these rules. Try again or adjust settings.');
      setPatternTokens(null);
      return;
    }
    setPatternTokens(tokens);
  };

  const displayToken = (t: string) => convertVarisaiNoteToRaga(t, selectedRaga);

  const flatIndexFor = (rowIdx: number, posInRow: number): number => {
    let k = 0;
    for (let r = 0; r < rowIdx; r++) k += displayRows[r]?.length ?? 0;
    return k + posInRow;
  };

  const risingRowCount = risingRows.length;

  if (!storageReady) {
    return (
      <div className="w-full max-w-4xl mx-auto flex items-center justify-center min-h-[200px]">
        <span className="text-slate-500 text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto min-w-0 overflow-x-hidden">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-12 shadow-2xl border border-slate-700/50 min-w-0 overflow-x-hidden">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light mb-2 tracking-wide">Patterns</h1>
          <p className="text-slate-400 text-sm md:text-base">Random swara patterns for voice practice</p>
        </div>

        <div className="mb-8 w-full">
          <label className="block text-sm font-medium text-slate-300 mb-3 text-center">Select raga</label>
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
                      onClick={() => handleRagaChange(raga.name)}
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

        <div className="mb-6 w-full overflow-x-auto overflow-y-visible pb-1 [scrollbar-gutter:stable]">
          <div className="flex min-w-min flex-nowrap items-end justify-center gap-5 sm:gap-8 md:gap-10 px-1 mx-auto">
            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <span className="text-xs font-medium text-slate-400 whitespace-nowrap text-center">Number of notes</span>
              <div className="flex h-10 w-[7.5rem] shrink-0 flex-row items-stretch divide-x divide-slate-600 overflow-hidden rounded-lg border border-slate-600 bg-slate-800/30">
                <button
                  type="button"
                  onClick={() => handlePatternLengthStep(-1)}
                  disabled={patternLength <= 3}
                  aria-label="Decrease number of notes"
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-lg leading-none text-slate-300 transition-colors hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-slate-500"
                >
                  −
                </button>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-amber-400 px-0.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={nInputValue}
                    onFocus={() => setNInputValue(String(patternLength))}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setNInputValue(val);
                    }}
                    onBlur={() => {
                      let num = parseInt(nInputValue, 10);
                      if (Number.isNaN(num)) num = patternLength;
                      stopPlayback();
                      setPatternLength(clampPatternLength(num));
                      setNInputValue(String(clampPatternLength(num)));
                    }}
                    className="w-full max-w-[2.25rem] bg-transparent text-center text-sm font-bold text-neutral-950 outline-none placeholder:text-neutral-600"
                    aria-label="Number of notes"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handlePatternLengthStep(1)}
                  disabled={patternLength >= 16}
                  aria-label="Increase number of notes"
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-lg leading-none text-slate-300 transition-colors hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-slate-500"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <span className="text-xs font-medium text-slate-400 whitespace-nowrap">High</span>
              <div className="flex h-10 flex-nowrap gap-1.5">
                {(['G', 'M', 'P'] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      stopPlayback();
                      setHighNote(h);
                    }}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-medium transition-all ${
                      highNote === h
                        ? 'bg-amber-500 text-slate-900'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <SwaraGlyph swara={h} language={notationLanguage} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Low</span>
              <div className="flex h-10 flex-nowrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    stopPlayback();
                    setLowNote('<D');
                  }}
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-medium transition-all ${
                    lowNote === '<D'
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                  title="Mandra dhaivata"
                >
                  <SwaraGlyph swara="D" language={notationLanguage} />
                  <span
                    className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[-6px] text-[10px] leading-none"
                    aria-hidden
                  >
                    •
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopPlayback();
                    setLowNote('<N');
                  }}
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-medium transition-all ${
                    lowNote === '<N'
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                  title="Mandra niṣāda"
                >
                  <SwaraGlyph swara="N" language={notationLanguage} />
                  <span
                    className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[-6px] text-[10px] leading-none"
                    aria-hidden
                  >
                    •
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopPlayback();
                    setLowNote('S');
                  }}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-medium transition-all ${
                    lowNote === 'S'
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <SwaraGlyph swara="S" language={notationLanguage} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            className="px-6 py-3 rounded-xl bg-amber-500/90 text-slate-900 font-semibold text-sm sm:text-base shadow-lg shadow-amber-500/25 hover:bg-amber-400 transition-colors"
          >
            Generate pattern
          </button>
          {genMessage ? <p className="text-center text-sm text-amber-200/90 max-w-lg">{genMessage}</p> : null}
        </div>

        {patternTokens && patternTokens.length > 0 ? (
          <div className="mb-6 flex w-full flex-col items-center gap-2 px-2">
            <p className="text-center text-xs font-medium uppercase tracking-wide text-slate-500">Pattern</p>
            <div
              className="flex max-w-2xl flex-wrap items-end justify-center gap-x-2 gap-y-2 text-base sm:text-lg font-medium leading-relaxed text-slate-100"
              aria-label={patternTokens.map((t) => displayToken(t)).join(' ')}
            >
              {patternTokens.map((tok, i) => {
                const noteFull = displayToken(tok);
                const parsed = parseVarisaiNote(noteFull);
                return (
                  <span
                    key={`preview-${i}`}
                    className="relative inline-flex h-9 min-w-[1.75rem] items-center justify-center px-0.5 sm:h-10 sm:min-w-[2rem]"
                  >
                    {parsed.octave === 'higher' && (
                      <span
                        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[-6px] text-[10px] leading-none"
                        aria-hidden
                      >
                        •
                      </span>
                    )}
                    <SwaraGlyph swara={parsed.swara} language={notationLanguage} />
                    {parsed.octave === 'lower' && (
                      <span
                        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[-6px] text-[10px] leading-none"
                        aria-hidden
                      >
                        •
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col items-center mb-8">
          <button
            type="button"
            onClick={isPlaying ? stopPlayback : () => startPlayback(0)}
            disabled={!patternTokens?.length}
            className={`
              relative w-32 h-32 md:w-40 md:h-40 rounded-full
              border-2 border-[var(--border)]
              transition-all duration-300 ease-out
              ${!patternTokens?.length ? 'opacity-40 cursor-not-allowed' : ''}
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
                    if (Number.isNaN(num) || num < 30) num = 30;
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

        {patternTokens && patternTokens.length > 0 ? (
          <div className="mt-10 flex w-full flex-col items-center gap-8">
            {displayRows.map((row, rowIdx) => (
              <div
                key={rowIdx}
                className={`flex w-full max-w-2xl justify-center px-1 sm:px-2 ${
                  rowIdx === risingRowCount && rowIdx > 0 ? 'mt-4 border-t border-slate-700/50 pt-10' : ''
                }`}
              >
                <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                  {row.map((tok, i) => {
                    const globalI = flatIndexFor(rowIdx, i);
                    const noteFull = displayToken(tok);
                    return (
                      <VoicePatternNoteCell
                        key={`${rowIdx}-${i}`}
                        swaraFull={noteFull}
                        notationLanguage={notationLanguage}
                        isCurrent={isPlaying && currentNoteIndex === globalI}
                        isPast={isPlaying && currentNoteIndex > globalI}
                        onSeek={() => {
                          void seekToNote(globalI);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-10 text-center text-sm text-slate-500">
            Set N and note range, then generate a pattern to see it here and use play.
          </p>
        )}
      </div>
    </div>
  );
}
