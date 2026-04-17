'use client';

import { Fragment, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { parseVarisaiNote } from '@/data/saraliVarisai';
import { Raga, getSwarafrequency, getRagaByIdOrName } from '@/data/ragas';
import { getInstrument, freqToNoteNameForInstrument, isSineInstrument, type InstrumentId } from '@/lib/instrumentLoader';
import { type NotationLanguage } from '@/lib/swaraNotation';
import { SwaraGlyph, SwaraInNoteChip } from '@/components/SwaraGlyph';
import { parseSongNotes } from '@/lib/songNotation';
import { resolveSwaraTokenForRaga } from '@/lib/ragaSwara';
import { getStored, setStored } from '@/lib/storage';
import { DEFAULT_PRACTICE_BPM, PRACTICE_TEMPO_MAX_BPM } from '@/lib/defaultTempo';
import {
  parseTalaString,
  patternFromParsedTala,
  beatsPerCycleFromParsedTala,
  secondaryLabelFromParsedTala,
  angPatternNotationFromParsedTala,
  oneLineSummaryFromParsedTala,
  primaryLabelFromParsedTala,
  formatTalaBeatsPerAngaLine,
  type TalaBeat,
} from '@/data/talas';
import * as metronome from '@/lib/metronome';
import type { Chittaswaram } from '@/data/chittaswarams/types';

const RAGA_NOTES_PER_ROW = 8;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += size) rows.push(arr.slice(i, i + size));
  return rows;
}

const RAGA_SCALE_ROW_CLASS = 'grid w-full grid-cols-8 gap-0.5 sm:gap-1';

function ragaScaleChipClass(isHighlighted: boolean): string {
  return [
    'inline-flex aspect-square w-full min-w-0 flex-col items-center justify-center rounded-md border p-px sm:rounded-lg sm:p-0.5 text-[10px] font-medium transition-colors sm:text-xs',
    isHighlighted
      ? 'bg-amber-500 text-slate-900 border-amber-600 shadow-sm'
      : 'bg-slate-800/60 text-slate-200 border-slate-600/50',
  ].join(' ');
}

/* ─────────── Expand notation string into slots ─────────── */

type DisplaySlot = {
  type: 'swara';
  noteIdx: number;
  swaraToken: string;
} | {
  type: 'tie';
  noteIdx: number;
};

function expandNotationToSlots(notesStr: string): DisplaySlot[] {
  const tokens = parseSongNotes(notesStr);
  const slots: DisplaySlot[] = [];
  let noteIdx = -1;
  for (const t of tokens) {
    if (t === ';') {
      slots.push({ type: 'tie', noteIdx: Math.max(0, noteIdx) });
    } else {
      noteIdx++;
      slots.push({ type: 'swara', noteIdx, swaraToken: t });
    }
  }
  return slots;
}

/* ─────────── Tala beat strip (with optional playback highlight) ─────────── */

function TalaBeatPlaybackStrip({
  beats,
  currentBeatIndex,
}: {
  beats: TalaBeat[];
  currentBeatIndex?: number | null;
}) {
  const n = beats.length;
  return (
    <div
      className="flex flex-wrap items-center gap-x-1.5 gap-y-2"
      role="img"
      aria-label={`${n} beats: squares are main (sam / anga), circles are sub-beats; vertical bars separate angas`}
    >
      {beats.map((beat, bi) => {
        const isMain = beat.emphasis === 'sam' || beat.emphasis === 'anga';
        const isCurrent = currentBeatIndex != null && currentBeatIndex === bi;
        const showBar = bi > 0 && beat.angaIndex !== beats[bi - 1]!.angaIndex;
        const idleSam = 'bg-slate-500 ring-1 ring-slate-400/40';
        const idleAnga = 'bg-slate-600/90';
        const idleBeat = 'bg-slate-700/80';
        const idleClass =
          beat.emphasis === 'sam' ? idleSam : beat.emphasis === 'anga' ? idleAnga : idleBeat;
        const sizeClass = isMain ? 'h-4 w-4 rounded-[3px]' : 'h-2.5 w-2.5 rounded-full';
        return (
          <Fragment key={bi}>
            {showBar && (
              <span
                className="inline-block h-6 w-px shrink-0 self-center bg-slate-500/90"
                aria-hidden
                title="Anga boundary"
              />
            )}
            <div
              className={`
                shrink-0 transition-all duration-100 ${sizeClass}
                ${isCurrent
                  ? beat.emphasis === 'sam'
                    ? 'bg-amber-400 ring-2 ring-amber-400/50 scale-110'
                    : beat.emphasis === 'anga'
                      ? 'bg-amber-500 scale-105'
                      : 'bg-amber-600'
                  : idleClass
                }
              `}
            />
          </Fragment>
        );
      })}
    </div>
  );
}

/* ─────────── Main component ─────────── */

type Props = {
  chittaswaram: Chittaswaram;
  baseFreq: number;
  instrumentId?: InstrumentId;
  volume?: number;
  notationLanguage?: NotationLanguage;
  onBack?: () => void;
};

const STORAGE_KEY = 'chittaswaramSettings';

export default function ChittaswaramPlayer({
  chittaswaram,
  baseFreq,
  instrumentId = 'violin',
  volume = 0.8,
  notationLanguage = 'english',
  onBack,
}: Props) {
  const phrases = chittaswaram.phrases;
  const originalTempo = chittaswaram.tempo || 120;

  const raga = useMemo(
    () => chittaswaram.raga_id ? getRagaByIdOrName(chittaswaram.raga_id) ?? null : null,
    [chittaswaram.raga_id]
  );

  const expandedPieces = useMemo(
    () =>
      phrases.map((p) =>
        Array.from({ length: p.repeat ?? 1 }, () => p.notes).join('')
      ),
    [phrases]
  );

  const expandedFull = useMemo(() => expandedPieces.join(''), [expandedPieces]);

  const slots = useMemo(() => expandNotationToSlots(expandedFull), [expandedFull]);

  /** One slot block per phrase (after repeat expansion), with global indices for playback/seek. */
  const phraseSlotBlocks = useMemo(() => {
    let offset = 0;
    return expandedPieces.map((piece) => {
      const phraseSlots = expandNotationToSlots(piece);
      const startIdx = offset;
      offset += phraseSlots.length;
      return { slots: phraseSlots, startIdx };
    });
  }, [expandedPieces]);

  const uniqueSwaraCount = useMemo(() => slots.filter(s => s.type === 'swara').length, [slots]);

  /* ── Tala info ── */
  const parsedTala = useMemo(
    () => chittaswaram.tala ? parseTalaString(chittaswaram.tala) : null,
    [chittaswaram.tala]
  );
  const talaLine = useMemo(() => {
    if (!parsedTala) return chittaswaram.tala ?? '';
    return oneLineSummaryFromParsedTala(parsedTala);
  }, [parsedTala, chittaswaram.tala]);
  const talaSubline = parsedTala ? secondaryLabelFromParsedTala(parsedTala) : null;
  const talaPattern = useMemo(
    () => parsedTala ? patternFromParsedTala(parsedTala) : [],
    [parsedTala]
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [baseBPM, setBaseBPM] = useState(originalTempo);
  const [tempoInputValue, setTempoInputValue] = useState(String(originalTempo));
  const [currentSlotIdx, setCurrentSlotIdx] = useState(-1);
  const [storageReady, setStorageReady] = useState(false);

  /* ── Raga scale playback state ── */
  const [isRagaPlaying, setIsRagaPlaying] = useState(false);
  const [currentRagaNoteIndex, setCurrentRagaNoteIndex] = useState(-1);
  const ragaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isTalaPlaying, setIsTalaPlaying] = useState(false);
  const [currentTalaBeat, setCurrentTalaBeat] = useState(-1);

  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const soundfontPlayerRef = useRef<Awaited<ReturnType<typeof getInstrument>> | null>(null);
  const isPlayingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playheadTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const baseBPMRef = useRef(baseBPM);
  baseBPMRef.current = baseBPM;
  const baseFreqRef = useRef(baseFreq);
  baseFreqRef.current = baseFreq;

  const activeSlotRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeSlotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentSlotIdx]);

  /* ── Persist / restore tempo ── */
  useEffect(() => {
    const stored = getStored<{ baseBPM?: number }>(STORAGE_KEY, {});
    const hasTempo = originalTempo >= 30 && originalTempo <= PRACTICE_TEMPO_MAX_BPM;
    const storedValid = typeof stored.baseBPM === 'number' && stored.baseBPM >= 30 && stored.baseBPM <= PRACTICE_TEMPO_MAX_BPM;
    const bpm = hasTempo ? originalTempo : storedValid ? stored.baseBPM! : DEFAULT_PRACTICE_BPM;
    setBaseBPM(bpm);
    setTempoInputValue(String(bpm));
    baseBPMRef.current = bpm;
    setStorageReady(true);
  }, [originalTempo]);

  useEffect(() => {
    if (!storageReady) return;
    setStored(STORAGE_KEY, { baseBPM });
  }, [storageReady, baseBPM]);

  useEffect(() => setTempoInputValue(String(baseBPM)), [baseBPM]);

  const stopTalaPlayback = () => {
    metronome.stopMetronome();
    setIsTalaPlaying(false);
    setCurrentTalaBeat(-1);
  };

  useEffect(() => {
    metronome.setMetronomeVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (!isTalaPlaying) return;
    metronome.setMetronomeTempo(baseBPM);
  }, [baseBPM, isTalaPlaying]);

  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = Math.pow(volume, 3);
  }, [volume]);

  useEffect(() => {
    if (!audioContextRef.current || !masterGainRef.current) return;
    if (isSineInstrument(instrumentId)) { soundfontPlayerRef.current = null; return; }
    getInstrument(audioContextRef.current, instrumentId, masterGainRef.current)
      .then((p) => { soundfontPlayerRef.current = p; })
      .catch(() => { soundfontPlayerRef.current = null; });
  }, [instrumentId]);

  const linearToLogGain = (v: number) => v === 0 ? 0 : Math.pow(v, 3);
  const handleBaseBPMChange = (v: number) => { baseBPMRef.current = v; setBaseBPM(v); };
  /** One notation slot = one beat at `baseBPM` (same ms-per-note as SongPlayer). */
  const getSlotMs = () => (60 / baseBPMRef.current) * 1000;

  const ensureAudioContext = async () => {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioContextRef.current) audioContextRef.current = new Ctx();
    if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
    if (!masterGainRef.current) {
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.connect(audioContextRef.current.destination);
      masterGainRef.current.gain.value = linearToLogGain(volume);
    }
    if (!isSineInstrument(instrumentId) && !soundfontPlayerRef.current) {
      soundfontPlayerRef.current = await getInstrument(audioContextRef.current, instrumentId, masterGainRef.current);
    }
  };

  /* ── Play a swara note resolved via raga ── */
  const playSwaraNote = (swaraToken: string, durationMs: number) => {
    if (!audioContextRef.current || !masterGainRef.current) return;

    const ragaSwara = resolveSwaraTokenForRaga(swaraToken, raga);
    const parsed = parseVarisaiNote(ragaSwara);
    let freq = getSwarafrequency(baseFreqRef.current, parsed.swara);
    if (parsed.octave === 'higher') freq *= 2;
    else if (parsed.octave === 'lower') freq *= 0.5;

    const now = audioContextRef.current.currentTime;
    const dur = durationMs / 1000;

    if (!isSineInstrument(instrumentId) && soundfontPlayerRef.current) {
      const noteName = freqToNoteNameForInstrument(freq, instrumentId);
      soundfontPlayerRef.current.start(noteName, now, { duration: dur, gain: 1.5 });
    } else {
      const osc = audioContextRef.current.createOscillator();
      const gain = audioContextRef.current.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gain.gain.setValueAtTime(0.3, now + Math.max(0, dur - 0.05));
      gain.gain.linearRampToValueAtTime(0, now + dur);
      osc.connect(gain);
      gain.connect(masterGainRef.current);
      osc.start(now);
      osc.stop(now + dur);
    }
  };

  /* ── Count consecutive tie slots after position si ── */
  const countTiesAhead = (si: number): number => {
    let c = 0;
    while (si + 1 + c < slots.length && slots[si + 1 + c].type === 'tie') c++;
    return c;
  };

  /* ── Main playback: advance one slot at a time ── */
  const playFromSlot = useCallback((si: number) => {
    if (!isPlayingRef.current || si >= slots.length) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setCurrentSlotIdx(-1);
      return;
    }

    const slot = slots[si];
    const slotMs = getSlotMs();

    if (slot.type === 'tie') {
      setCurrentSlotIdx(si);
      timeoutRef.current = setTimeout(() => playFromSlot(si + 1), slotMs);
      return;
    }

    const tieCount = countTiesAhead(si);
    const totalDurMs = slotMs * (1 + tieCount);

    setCurrentSlotIdx(si);
    playSwaraNote(slot.swaraToken, totalDurMs);

    playheadTimeoutsRef.current.forEach(clearTimeout);
    playheadTimeoutsRef.current = [];
    for (let t = 1; t <= tieCount; t++) {
      const tid = setTimeout(() => {
        if (isPlayingRef.current) setCurrentSlotIdx(si + t);
      }, slotMs * t);
      playheadTimeoutsRef.current.push(tid);
    }

    timeoutRef.current = setTimeout(() => playFromSlot(si + 1 + tieCount), totalDurMs);
  }, [slots, instrumentId, raga]);

  const startPlaying = async () => {
    stopTalaPlayback();
    try {
      await ensureAudioContext();
      isPlayingRef.current = true;
      setIsPlaying(true);
      playFromSlot(0);
    } catch (e) {
      console.error('Playback error:', e);
      setIsPlaying(false);
    }
  };

  const stopPlaying = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentSlotIdx(-1);
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    playheadTimeoutsRef.current.forEach(clearTimeout);
    playheadTimeoutsRef.current = [];
    if (soundfontPlayerRef.current) try { soundfontPlayerRef.current.stop(); } catch {}
  };

  const seekToSlot = async (si: number) => {
    stopTalaPlayback();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    playheadTimeoutsRef.current.forEach(clearTimeout);
    playheadTimeoutsRef.current = [];
    if (soundfontPlayerRef.current) try { soundfontPlayerRef.current.stop(); } catch {}

    if (!isPlayingRef.current) {
      try {
        await ensureAudioContext();
        isPlayingRef.current = true;
        setIsPlaying(true);
      } catch (e) { console.error('Seek error:', e); return; }
    }
    let target = si;
    while (target > 0 && slots[target].type === 'tie') target--;
    playFromSlot(target);
  };

  /* ── Raga scale playback ── */
  const handlePlayRaga = async () => {
    if (!raga) return;
    if (isRagaPlaying) {
      setIsRagaPlaying(false);
      setCurrentRagaNoteIndex(-1);
      if (ragaTimeoutRef.current) clearTimeout(ragaTimeoutRef.current);
      return;
    }
    stopTalaPlayback();
    try {
      await ensureAudioContext();
    } catch { return; }

    const allNotes = [...raga.arohana, ...raga.avarohana];
    setIsRagaPlaying(true);
    setCurrentRagaNoteIndex(0);

    const playRagaNoteAt = (idx: number) => {
      if (idx >= allNotes.length) {
        setIsRagaPlaying(false);
        setCurrentRagaNoteIndex(-1);
        return;
      }
      setCurrentRagaNoteIndex(idx);
      const note = allNotes[idx];
      const parsed = parseVarisaiNote(note);
      let freq = getSwarafrequency(baseFreqRef.current, parsed.swara);
      if (parsed.octave === 'higher') freq *= 2;
      else if (parsed.octave === 'lower') freq *= 0.5;
      const dur = 0.4;
      const now = audioContextRef.current!.currentTime;

      if (!isSineInstrument(instrumentId) && soundfontPlayerRef.current) {
        const noteName = freqToNoteNameForInstrument(freq, instrumentId);
        soundfontPlayerRef.current.start(noteName, now, { duration: dur, gain: 1.5 });
      } else {
        const osc = audioContextRef.current!.createOscillator();
        const gain = audioContextRef.current!.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
        gain.gain.setValueAtTime(0.3, now + dur - 0.05);
        gain.gain.linearRampToValueAtTime(0, now + dur);
        osc.connect(gain);
        gain.connect(masterGainRef.current!);
        osc.start(now);
        osc.stop(now + dur);
      }

      ragaTimeoutRef.current = setTimeout(() => playRagaNoteAt(idx + 1), dur * 1000);
    };

    playRagaNoteAt(0);
  };

  const handlePlayTala = async () => {
    if (isTalaPlaying) {
      stopTalaPlayback();
      return;
    }
    if (!parsedTala || talaPattern.length === 0) return;
    stopPlaying();
    if (isRagaPlaying) {
      setIsRagaPlaying(false);
      setCurrentRagaNoteIndex(-1);
      if (ragaTimeoutRef.current) {
        clearTimeout(ragaTimeoutRef.current);
        ragaTimeoutRef.current = null;
      }
    }
    stopTalaPlayback();
    setIsTalaPlaying(true);
    setCurrentTalaBeat(-1);
    try {
      await metronome.startMetronome(talaPattern, baseBPM, (beatIndex) => {
        setCurrentTalaBeat(beatIndex);
      });
      metronome.setMetronomeVolume(volume);
    } catch (e) {
      console.error('Tala playback error:', e);
      setIsTalaPlaying(false);
      setCurrentTalaBeat(-1);
    }
  };

  useEffect(() => () => {
    stopPlaying();
    stopTalaPlayback();
    if (ragaTimeoutRef.current) clearTimeout(ragaTimeoutRef.current);
    audioContextRef.current?.close().catch(() => {});
  }, []);

  const refBtn = 'inline-flex items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-colors min-h-[2.25rem] px-3 sm:text-sm';
  const refIdle = 'border-slate-600/70 bg-slate-800/40 text-slate-200 hover:bg-slate-700/50 hover:border-slate-500';
  const refActive = 'border-amber-500/80 bg-amber-500/15 text-amber-100 shadow-sm shadow-amber-900/20';

  return (
    <div className="w-full max-w-4xl mx-auto min-w-0 px-3 sm:px-4 md:px-0">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl sm:rounded-3xl px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 shadow-2xl border border-slate-700/50">

        {/* Header */}
        <header className="border-b border-slate-700/40 pb-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 lg:gap-10">
            <div className="min-w-0 flex-1 space-y-6">
              {onBack && (
                <button type="button" onClick={onBack}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-[var(--accent)] transition-colors -ml-0.5">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to compositions
                </button>
              )}
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight text-slate-50 break-words">
                  {chittaswaram.name}
                </h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  <span className="text-slate-300">{chittaswaram.source}</span>
                  <span className="text-slate-600 mx-2" aria-hidden>·</span>
                  <span>{uniqueSwaraCount} notes</span>
                  <span className="text-slate-600 mx-2" aria-hidden>·</span>
                  <span>Original {originalTempo} BPM</span>
                </p>
                {chittaswaram.song_link && (
                  <p className="text-sm">
                    <a href={chittaswaram.song_link} target="_blank" rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors">
                      Listen to the original song
                    </a>
                  </p>
                )}
              </div>

              {/* Raga / Tala info card */}
              {(raga || chittaswaram.tala) && (
                <div className="flex min-h-[5.5rem] flex-col overflow-hidden rounded-xl border border-slate-700/45 bg-slate-900/40">
                  <div className="flex flex-col" style={{ padding: '1.25rem 1.5rem', boxSizing: 'border-box' }}>
                    {raga && (
                      <div className="flex flex-col" style={{ paddingBottom: chittaswaram.tala ? '0.75rem' : '0' }}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">Raga</p>
                        <p className="text-base font-medium leading-snug text-slate-100">{raga.name}</p>
                      </div>
                    )}
                    {chittaswaram.tala && (
                      <div className={`flex flex-col ${raga ? 'border-t border-slate-700/40' : ''}`}
                        style={{ paddingTop: raga ? '0.75rem' : '0' }}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">Tala</p>
                        <p className="text-base font-medium leading-snug text-slate-100">{talaLine}</p>
                        {talaSubline && (
                          <p className="mt-1.5 text-xs leading-snug text-slate-400">{talaSubline}</p>
                        )}
                        {talaPattern.length > 0 && (
                          <p className="mt-2.5 font-mono text-xs text-slate-300 tracking-wide break-all"
                            title="Beat numbers within each anga; | separates angas">
                            {formatTalaBeatsPerAngaLine(talaPattern)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center shrink-0 lg:pt-1">
              <button type="button" onClick={isPlaying ? stopPlaying : startPlaying} aria-pressed={isPlaying}
                className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-[var(--border)]
                  transition-all duration-300 ease-out flex items-center justify-center group
                  ${isPlaying
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 border-[var(--accent)]'
                    : 'bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700'}`}>
                <svg className={`w-11 h-11 sm:w-12 sm:h-12 transition-transform duration-300 ${isPlaying ? 'scale-105' : 'scale-100 group-hover:scale-105'}`}
                  fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  {isPlaying ? <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /> : <path d="M8 5v14l11-7z" />}
                </svg>
              </button>
              <p className="mt-3 text-center text-xs text-slate-500 tabular-nums">
                {isPlaying ? `Playing · ${baseBPM} BPM` : 'Chittaswaram'}
              </p>
            </div>
          </div>
        </header>

        {/* Raga scale + Tala reference cards */}
        {(raga || (parsedTala && talaPattern.length > 0)) && (
          <section className="mb-10">
            <div className={`grid grid-cols-1 gap-6 ${raga && parsedTala ? 'md:grid-cols-2 md:gap-8 md:items-stretch' : ''}`}>
              {raga && (
                <div className="flex min-h-[12rem] flex-col rounded-xl border border-slate-700/45 bg-slate-900/35 p-5 md:min-h-0 md:h-full">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 shrink-0">
                    <div className="min-w-0 space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Raga</p>
                      <p className="text-lg font-medium text-slate-100 tracking-tight">{raga.name}</p>
                    </div>
                    <button type="button" onClick={handlePlayRaga}
                      className={`${refBtn} shrink-0 ${isRagaPlaying ? refActive : refIdle}`}
                      title="Hear arohana and avarohana">
                      {isRagaPlaying ? (
                        <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg> Stop scale</>
                      ) : (
                        <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M8 5v14l11-7z" /></svg> Scale</>
                      )}
                    </button>
                  </div>
                  <div className="mt-5 flex min-h-0 flex-1 flex-col space-y-4 border-t border-slate-700/40 pt-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2.5">Arohana</p>
                      <div className="flex flex-col gap-2">
                        {chunkArray(raga.arohana, RAGA_NOTES_PER_ROW).map((row, ri) => (
                          <div key={ri} className={RAGA_SCALE_ROW_CLASS}>
                            {row.map((note, j) => {
                              const i = ri * RAGA_NOTES_PER_ROW + j;
                              const p = parseVarisaiNote(note);
                              const isHighlighted = isRagaPlaying && currentRagaNoteIndex === i;
                              return (
                                <span key={i} className={ragaScaleChipClass(isHighlighted)}>
                                  <span className="flex h-1.5 w-full shrink-0 items-end justify-center text-[7px] leading-none sm:h-2 sm:text-[8px]">
                                    {p.octave === 'higher' ? '•' : null}
                                  </span>
                                  <SwaraGlyph swara={p.swara} language={notationLanguage} className="leading-none" />
                                  <span className="flex h-1.5 w-full shrink-0 items-start justify-center text-[7px] leading-none sm:h-2 sm:text-[8px]">
                                    {p.octave === 'lower' ? '•' : null}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2.5">Avarohana</p>
                      <div className="flex flex-col gap-2">
                        {chunkArray(raga.avarohana, RAGA_NOTES_PER_ROW).map((row, ri) => (
                          <div key={ri} className={RAGA_SCALE_ROW_CLASS}>
                            {row.map((note, j) => {
                              const i = ri * RAGA_NOTES_PER_ROW + j;
                              const p = parseVarisaiNote(note);
                              const isHighlighted =
                                isRagaPlaying && currentRagaNoteIndex === raga.arohana.length + i;
                              return (
                                <span key={raga.arohana.length + i} className={ragaScaleChipClass(isHighlighted)}>
                                  <span className="flex h-1.5 w-full shrink-0 items-end justify-center text-[7px] leading-none sm:h-2 sm:text-[8px]">
                                    {p.octave === 'higher' ? '•' : null}
                                  </span>
                                  <SwaraGlyph swara={p.swara} language={notationLanguage} className="leading-none" />
                                  <span className="flex h-1.5 w-full shrink-0 items-start justify-center text-[7px] leading-none sm:h-2 sm:text-[8px]">
                                    {p.octave === 'lower' ? '•' : null}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {parsedTala && talaPattern.length > 0 && (
                <div className="flex min-h-[12rem] flex-col rounded-xl border border-slate-700/45 bg-slate-900/35 p-5 md:min-h-0 md:h-full">
                  <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tala</p>
                      <p className="text-base text-slate-100 font-medium leading-snug">
                        {primaryLabelFromParsedTala(parsedTala)}
                      </p>
                      {talaSubline && (
                        <p className="text-xs leading-snug text-slate-400">{talaSubline}</p>
                      )}
                      <p className="text-xs font-mono text-slate-400">
                        {angPatternNotationFromParsedTala(parsedTala)}
                        <span className="text-slate-600 mx-1.5">·</span>
                        {beatsPerCycleFromParsedTala(parsedTala)} beats per cycle
                      </p>
                      <p className="text-xs text-slate-500 pt-0.5">
                        Uses practice tempo <span className="text-slate-400 tabular-nums">{baseBPM} BPM</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handlePlayTala()}
                      className={`${refBtn} shrink-0 self-start sm:self-auto ${isTalaPlaying ? refActive : refIdle}`}
                      title={
                        parsedTala.kind === 'equal_beats'
                          ? 'Hear bar beats (beat 1 accented)'
                          : 'Hear tala beats (sam / anga)'
                      }
                    >
                      {isTalaPlaying ? (
                        <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg> Stop tala</>
                      ) : (
                        <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M8 5v14l11-7z" /></svg> Tala</>
                      )}
                    </button>
                  </div>
                  <div className="mt-auto space-y-2 border-t border-slate-700/40 pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Beats in cycle</p>
                    <TalaBeatPlaybackStrip
                      beats={talaPattern}
                      currentBeatIndex={isTalaPlaying ? currentTalaBeat : null}
                    />
                    <p className="text-[10px] text-slate-500">
                      Larger square = main beat · smaller circle = sub-beat · bar = anga boundary
                    </p>
                    {isTalaPlaying && (
                      <p className="text-[10px] text-slate-500 tabular-nums">
                        Now: beat {currentTalaBeat + 1} of {talaPattern.length}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Tempo controls */}
        <section className="mb-10 rounded-xl border border-slate-700/45 bg-slate-950/35 px-5 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto flex max-w-md flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-slate-300">Practice tempo</span>
              <span className="text-xs text-slate-500">BPM</span>
            </div>
            <div className="flex w-full max-w-md mx-auto flex-row items-stretch divide-x divide-slate-600/90 overflow-hidden rounded-lg border border-slate-600/80 bg-slate-900/50">
              <button type="button" onClick={() => { const v = Math.max(30, Math.round(Math.floor(baseBPM / 2) / 5) * 5); handleBaseBPMChange(v); }} disabled={baseBPM <= 30} aria-label="Halve tempo"
                className="flex h-10 min-w-[2.5rem] flex-1 items-center justify-center text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50">÷2</button>
              <button type="button" onClick={() => { const v = Math.max(30, baseBPM - 5); handleBaseBPMChange(v); }} disabled={baseBPM <= 30} aria-label="Decrease tempo"
                className="flex h-10 min-w-[2.5rem] flex-1 items-center justify-center text-lg leading-none text-slate-300 transition-colors hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50">−</button>
              <div className="flex h-10 min-w-[3.5rem] flex-[1.15] items-center justify-center bg-amber-400 px-2">
                <input type="text" inputMode="numeric" value={tempoInputValue}
                  onFocus={() => setTempoInputValue(String(baseBPM))}
                  onChange={(e) => setTempoInputValue(e.target.value.replace(/\D/g, ''))}
                  onBlur={() => { let n = parseInt(tempoInputValue, 10); if (isNaN(n) || n < 30) n = 30; if (n > PRACTICE_TEMPO_MAX_BPM) n = PRACTICE_TEMPO_MAX_BPM; n = Math.round(n / 5) * 5; handleBaseBPMChange(n); setTempoInputValue(String(n)); }}
                  className="w-full bg-transparent text-center text-sm font-bold text-neutral-950 outline-none" aria-label="Tempo BPM" />
              </div>
              <button type="button" onClick={() => { const v = Math.min(PRACTICE_TEMPO_MAX_BPM, baseBPM + 5); handleBaseBPMChange(v); }} disabled={baseBPM >= PRACTICE_TEMPO_MAX_BPM} aria-label="Increase tempo"
                className="flex h-10 min-w-[2.5rem] flex-1 items-center justify-center text-lg leading-none text-slate-300 transition-colors hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50">+</button>
              <button type="button" onClick={() => { const v = Math.min(PRACTICE_TEMPO_MAX_BPM, Math.round((baseBPM * 2) / 5) * 5); handleBaseBPMChange(v); }} disabled={baseBPM >= PRACTICE_TEMPO_MAX_BPM} aria-label="Double tempo"
                className="flex h-10 min-w-[2.5rem] flex-1 items-center justify-center text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50">x2</button>
            </div>
          </div>
        </section>

        {/* Notation: Sarali-style grid per phrase, spaced like paragraphs (no cards) */}
        <div className="mt-8">
          <p className="text-center text-slate-400 text-sm mb-6">Exercise Notes</p>
          <div className="flex max-w-2xl mx-auto flex-col gap-10 px-1 sm:px-2">
            {phraseSlotBlocks.map((block, pi) => (
              <div
                key={pi}
                className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5 sm:gap-2 justify-items-center"
              >
                {block.slots.map((slot, li) => {
                  const gsi = block.startIdx + li;
                  const isCurrent = isPlaying && gsi === currentSlotIdx;
                  const isPast = isPlaying && currentSlotIdx >= 0 && gsi < currentSlotIdx;
                  const cellIdle = isPast
                    ? 'bg-slate-700/30 text-slate-500 hover:bg-slate-600/50'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/70';
                  const cellActive = 'bg-amber-500 text-slate-900 scale-110 shadow-lg';

                  if (slot.type === 'tie') {
                    return (
                      <button
                        key={li}
                        ref={currentSlotIdx === gsi ? activeSlotRef : undefined}
                        type="button"
                        onClick={() => seekToSlot(gsi)}
                        className={`
                          w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg text-sm sm:text-lg font-semibold relative
                          transition-all duration-200 cursor-pointer hover:scale-105
                          ${isCurrent ? cellActive : cellIdle}
                        `}
                      >
                        —
                      </button>
                    );
                  }

                  const disp = parseVarisaiNote(resolveSwaraTokenForRaga(slot.swaraToken, raga));
                  return (
                    <button
                      key={li}
                      ref={currentSlotIdx === gsi ? activeSlotRef : undefined}
                      type="button"
                      onClick={() => seekToSlot(gsi)}
                      className={`
                        w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center py-px rounded-lg text-sm sm:text-lg font-semibold
                        transition-all duration-200 cursor-pointer hover:scale-105 min-w-0
                        ${isCurrent ? cellActive : cellIdle}
                      `}
                    >
                      <SwaraInNoteChip swara={disp.swara} language={notationLanguage} octave={disp.octave} />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
