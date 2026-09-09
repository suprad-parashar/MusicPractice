'use client';

import { RagaSearch } from '@/components/ragas/RagaSearch';

import { PlaybackButton } from '@/components/ui/Button';

import TempoControl from '@/components/ui/TempoControl';

import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { parseVarisaiNote } from '@/data/exercises/saraliVarisai';
import { getSwarafrequency, MELAKARTA_RAGAS, type MelakartaRaga } from '@/data/ragas';
import {
  getInstrument,
  freqToNoteNameForInstrument,
  isSineInstrument,
  type InstrumentId,
} from '@/lib/audio/instrumentLoader';
import type { NotationLanguage } from '@/lib/music/swaraNotation';
import { SwaraGlyph } from '@/components/notation/SwaraGlyph';
import { getStored, setStored } from '@/lib/storage';
import { DEFAULT_PRACTICE_BPM, PRACTICE_TEMPO_MAX_BPM } from '@/lib/music/defaultTempo';
import {
  voiceNotePool,
  generateVoicePatternTokens,
  mulberry32,
  buildVoiceRisingRows,
  buildVoiceDescendingRows,
  maxPatternLengthForPool,
  type VoiceHighNote,
  type VoiceLowNote,
} from '@/lib/music/voicePattern';

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
        ${
          isCurrent
            ? 'bg-accent text-on-accent scale-110 shadow-lg'
            : isPast
              ? 'bg-subtle/30 text-muted hover:bg-line/50'
              : 'bg-subtle/50 text-ink hover:bg-line/70'
        }
      `}
    >
      <SwaraGlyph swara={parsed.swara} language={notationLanguage} />
      {parsed.octave === 'higher' && (
        <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-[-6px] text-[10px] leading-none">
          •
        </span>
      )}
      {parsed.octave === 'lower' && (
        <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-[-6px] text-[10px] leading-none">
          •
        </span>
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
    MELAKARTA_RAGAS.find((r) => r.name === 'Mayamalavagowla') || MELAKARTA_RAGAS[14],
  );

  const [patternLength, setPatternLength] = useState(4);
  const [nInputValue, setNInputValue] = useState('4');
  const [lowNote, setLowNote] = useState<VoiceLowNote>('S');
  const [highNote, setHighNote] = useState<VoiceHighNote>('M');
  const [patternTokens, setPatternTokens] = useState<string[] | null>(null);
  const [genMessage, setGenMessage] = useState<string | null>(null);

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
  const playbackTokensRef = useRef<string[]>([]);

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
    [risingRows, descendingRows],
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
    if (typeof s.baseBPM === 'number' && s.baseBPM >= 30 && s.baseBPM <= PRACTICE_TEMPO_MAX_BPM) {
      setBaseBPM(s.baseBPM);
      baseBPMRef.current = s.baseBPM;
    }
    if (typeof s.patternLength === 'number' && s.patternLength >= 3 && s.patternLength <= 16) {
      setPatternLength(s.patternLength);
    }
    if (s.lowNote === '<D' || s.lowNote === '<N' || s.lowNote === 'S') setLowNote(s.lowNote);
    if (s.highNote === 'G' || s.highNote === 'M' || s.highNote === 'P') setHighNote(s.highNote);
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    setStored(STORAGE_KEY, {
      ragaNumber: selectedRaga.number,
      baseBPM,
      patternLength,
      lowNote,
      highNote,
    });
  }, [storageReady, selectedRaga, baseBPM, patternLength, lowNote, highNote]);

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
        `With this range you can have at most ${maxPatternLengthForPool(poolForLimits)} notes (each swara at most five times). Lower N or widen the range.`,
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
        <span className="text-muted text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto min-w-0 overflow-x-hidden">
      <div className="feature-panel">
        <div className="feature-heading">
          <h2>Patterns</h2>
          <p className="text-muted text-sm md:text-base">
            Random swara patterns for voice practice
          </p>
        </div>

        <div className="mb-8 w-full">
          <label className="block text-sm font-medium text-ink mb-3 text-center">Select raga</label>
          <RagaSearch
            selected={selectedRaga}
            ragas={MELAKARTA_RAGAS}
            onSelect={(raga) => handleRagaChange(raga.name)}
            showSelection
            className="raga-search--wide"
          />
        </div>

        <div className="mb-6 w-full overflow-x-auto overflow-y-visible pb-1 [scrollbar-gutter:stable]">
          <div className="flex min-w-min flex-nowrap items-end justify-center gap-5 sm:gap-8 md:gap-10 px-1 mx-auto">
            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <span className="text-xs font-medium text-muted whitespace-nowrap text-center">
                Number of notes
              </span>
              <div className="flex h-10 w-[7.5rem] shrink-0 flex-row items-stretch divide-x divide-line overflow-hidden rounded-lg border border-line bg-surface/30">
                <button
                  type="button"
                  onClick={() => handlePatternLengthStep(-1)}
                  disabled={patternLength <= 3}
                  aria-label="Decrease number of notes"
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-lg leading-none text-ink transition-colors hover:bg-subtle/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-muted"
                >
                  −
                </button>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-accent px-0.5">
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
                    className="w-full max-w-[2.25rem] bg-transparent text-center text-sm font-bold text-on-accent outline-none placeholder:text-neutral-600"
                    aria-label="Number of notes"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handlePatternLengthStep(1)}
                  disabled={patternLength >= 16}
                  aria-label="Increase number of notes"
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-lg leading-none text-ink transition-colors hover:bg-subtle/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-muted"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <span className="text-xs font-medium text-muted whitespace-nowrap">High</span>
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
                        ? 'bg-accent text-on-accent'
                        : 'bg-subtle/50 text-ink hover:bg-subtle'
                    }`}
                  >
                    <SwaraGlyph swara={h} language={notationLanguage} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <span className="text-xs font-medium text-muted whitespace-nowrap">Low</span>
              <div className="flex h-10 flex-nowrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    stopPlayback();
                    setLowNote('<D');
                  }}
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-medium transition-all ${
                    lowNote === '<D'
                      ? 'bg-accent text-on-accent'
                      : 'bg-subtle/50 text-ink hover:bg-subtle'
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
                      ? 'bg-accent text-on-accent'
                      : 'bg-subtle/50 text-ink hover:bg-subtle'
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
                      ? 'bg-accent text-on-accent'
                      : 'bg-subtle/50 text-ink hover:bg-subtle'
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
            className="px-6 py-3 rounded-xl bg-accent/90 text-on-accent font-semibold text-sm sm:text-base shadow-lg  hover:bg-accent transition-colors"
          >
            Generate pattern
          </button>
          {genMessage ? (
            <p className="text-center text-sm text-accent/90 max-w-lg">{genMessage}</p>
          ) : null}
        </div>

        {patternTokens && patternTokens.length > 0 ? (
          <div className="mb-6 flex w-full flex-col items-center gap-2 px-2">
            <p className="text-center text-xs font-medium uppercase tracking-wide text-muted">
              Pattern
            </p>
            <div
              className="flex max-w-2xl flex-wrap items-end justify-center gap-x-2 gap-y-2 text-base sm:text-lg font-medium leading-relaxed text-ink"
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
          <PlaybackButton
            label="pattern"
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

        {patternTokens && patternTokens.length > 0 ? (
          <div className="mt-10 flex w-full flex-col items-center gap-8">
            {displayRows.map((row, rowIdx) => (
              <div
                key={rowIdx}
                className={`flex w-full max-w-2xl justify-center px-1 sm:px-2 ${
                  rowIdx === risingRowCount && rowIdx > 0
                    ? 'mt-4 border-t border-line/50 pt-10'
                    : ''
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
          <p className="mt-10 text-center text-sm text-muted">
            Set N and note range, then generate a pattern to see it here and use play.
          </p>
        )}
      </div>
    </div>
  );
}
