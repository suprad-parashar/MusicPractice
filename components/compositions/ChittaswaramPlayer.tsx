'use client';

import { PlaybackButton } from '@/components/ui/Button';

import TempoControl from '@/components/ui/TempoControl';
import { Disclosure } from '@/components/ui/Disclosure';
import { RagaReferenceCard, TalaReferenceCard } from './CompositionReference';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { parseVarisaiNote } from '@/data/exercises/saraliVarisai';
import { getSwarafrequency, getRagaByIdOrName } from '@/data/ragas';
import {
  getInstrument,
  freqToNoteNameForInstrument,
  isSineInstrument,
  type InstrumentId,
} from '@/lib/audio/instrumentLoader';
import { type NotationLanguage } from '@/lib/music/swaraNotation';
import { SwaraInNoteChip } from '@/components/notation/SwaraGlyph';
import { parseSongNotes } from '@/lib/music/songNotation';
import { resolveSwaraTokenForRaga } from '@/lib/music/ragaSwara';
import { getStored, setStored } from '@/lib/storage';
import { DEFAULT_PRACTICE_BPM, PRACTICE_TEMPO_MAX_BPM } from '@/lib/music/defaultTempo';
import {
  parseTalaString,
  patternFromParsedTala,
  secondaryLabelFromParsedTala,
  oneLineSummaryFromParsedTala,
  metronomeBpmForParsedTala,
} from '@/data/talas';
import { useMetronome } from '@/hooks/useMetronome';
import type { Chittaswaram } from '@/data/chittaswarams/types';

/* ─────────── Expand notation string into slots ─────────── */

type DisplaySlot =
  | {
      type: 'swara';
      noteIdx: number;
      swaraToken: string;
    }
  | {
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

/* ─────────── Main component ─────────── */

type Props = {
  chittaswaram: Chittaswaram;
  baseFreq: number;
  instrumentId?: InstrumentId;
  volume?: number;
  notationLanguage?: NotationLanguage;
};

const STORAGE_KEY = 'chittaswaramSettings';

export default function ChittaswaramPlayer({
  chittaswaram,
  baseFreq,
  instrumentId = 'violin',
  volume = 0.8,
  notationLanguage = 'english',
}: Props) {
  const phrases = chittaswaram.phrases;
  const originalTempo = chittaswaram.tempo || 120;

  const raga = useMemo(
    () => (chittaswaram.raga_id ? (getRagaByIdOrName(chittaswaram.raga_id) ?? null) : null),
    [chittaswaram.raga_id],
  );

  const expandedPieces = useMemo(
    () => phrases.map((p) => Array.from({ length: p.repeat ?? 1 }, () => p.notes).join('')),
    [phrases],
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

  const phraseIndexForGlobalSlot = useCallback(
    (si: number) => {
      for (let i = phraseSlotBlocks.length - 1; i >= 0; i--) {
        if (si >= phraseSlotBlocks[i]!.startIdx) return i;
      }
      return 0;
    },
    [phraseSlotBlocks],
  );

  const getSlotMsForIndex = useCallback(
    (si: number) => {
      const pIdx = phraseIndexForGlobalSlot(si);
      const phrase = phrases[pIdx];
      const talaStr = (phrase?.tala?.trim() || chittaswaram.tala || '').trim();
      const parsed = talaStr ? parseTalaString(talaStr) : null;
      const quarterMs = (60 / baseBPMRef.current) * 1000;
      let slotMs = quarterMs;
      if (parsed?.kind === 'tuplet_even') {
        /** Six notes in the time of `beatsSpanned` quarter-note beats (same wall time as that many main beats). */
        slotMs = quarterMs * (parsed.beatsSpanned / parsed.tupletSlots);
      }
      const mult = phrase?.tempo_multiplier;
      if (typeof mult === 'number' && Number.isFinite(mult) && mult > 0) {
        const clamped = Math.min(100, Math.max(0.01, mult));
        slotMs /= clamped;
      }
      return slotMs;
    },
    [phraseIndexForGlobalSlot, phrases, chittaswaram.tala],
  );

  const uniqueSwaraCount = useMemo(() => slots.filter((s) => s.type === 'swara').length, [slots]);

  /* ── Tala info ── */
  const parsedTala = useMemo(
    () => (chittaswaram.tala ? parseTalaString(chittaswaram.tala) : null),
    [chittaswaram.tala],
  );
  const talaPattern = useMemo(
    () => (parsedTala ? patternFromParsedTala(parsedTala) : []),
    [parsedTala],
  );

  const metronome = useMetronome();
  const [isPlaying, setIsPlaying] = useState(false);
  const [baseBPM, setBaseBPM] = useState(originalTempo);
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
    const storedValid =
      typeof stored.baseBPM === 'number' &&
      stored.baseBPM >= 30 &&
      stored.baseBPM <= PRACTICE_TEMPO_MAX_BPM;
    const bpm = hasTempo ? originalTempo : storedValid ? stored.baseBPM! : DEFAULT_PRACTICE_BPM;
    setBaseBPM(bpm);

    baseBPMRef.current = bpm;
    setStorageReady(true);
  }, [originalTempo]);

  useEffect(() => {
    if (!storageReady) return;
    setStored(STORAGE_KEY, { baseBPM });
  }, [storageReady, baseBPM]);

  const stopTalaPlayback = () => {
    metronome.stop();
    setIsTalaPlaying(false);
    setCurrentTalaBeat(-1);
  };

  useEffect(() => {
    metronome.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (!isTalaPlaying) return;
    const metroBpm = parsedTala ? metronomeBpmForParsedTala(parsedTala, baseBPM) : baseBPM;
    metronome.setTempo(metroBpm);
  }, [baseBPM, isTalaPlaying, parsedTala]);

  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = Math.pow(volume, 3);
  }, [volume]);

  useEffect(() => {
    if (!audioContextRef.current || !masterGainRef.current) return;
    if (isSineInstrument(instrumentId)) {
      soundfontPlayerRef.current = null;
      return;
    }
    getInstrument(audioContextRef.current, instrumentId, masterGainRef.current)
      .then((p) => {
        soundfontPlayerRef.current = p;
      })
      .catch(() => {
        soundfontPlayerRef.current = null;
      });
  }, [instrumentId]);

  const linearToLogGain = (v: number) => (v === 0 ? 0 : Math.pow(v, 3));
  const handleBaseBPMChange = (v: number) => {
    baseBPMRef.current = v;
    setBaseBPM(v);
  };

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
      soundfontPlayerRef.current = await getInstrument(
        audioContextRef.current,
        instrumentId,
        masterGainRef.current,
      );
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
  const playFromSlot = useCallback(
    (si: number) => {
      if (!isPlayingRef.current || si >= slots.length) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setCurrentSlotIdx(-1);
        return;
      }

      const slot = slots[si];
      const slotMs = getSlotMsForIndex(si);

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
    },
    [slots, instrumentId, raga, getSlotMsForIndex],
  );

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
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    playheadTimeoutsRef.current.forEach(clearTimeout);
    playheadTimeoutsRef.current = [];
    if (soundfontPlayerRef.current)
      try {
        soundfontPlayerRef.current.stop();
      } catch {}
  };

  const seekToSlot = async (si: number) => {
    stopTalaPlayback();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    playheadTimeoutsRef.current.forEach(clearTimeout);
    playheadTimeoutsRef.current = [];
    if (soundfontPlayerRef.current)
      try {
        soundfontPlayerRef.current.stop();
      } catch {}

    if (!isPlayingRef.current) {
      try {
        await ensureAudioContext();
        isPlayingRef.current = true;
        setIsPlaying(true);
      } catch (e) {
        console.error('Seek error:', e);
        return;
      }
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
    } catch {
      return;
    }

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
      const metroBpm = metronomeBpmForParsedTala(parsedTala, baseBPM);
      await metronome.start(talaPattern, metroBpm, (beatIndex) => {
        setCurrentTalaBeat(beatIndex);
      });
      metronome.setVolume(volume);
    } catch (e) {
      console.error('Tala playback error:', e);
      setIsTalaPlaying(false);
      setCurrentTalaBeat(-1);
    }
  };

  useEffect(
    () => () => {
      stopPlaying();
      stopTalaPlayback();
      if (ragaTimeoutRef.current) clearTimeout(ragaTimeoutRef.current);
      audioContextRef.current?.close().catch(() => {});
    },
    [],
  );

  return (
    <div className="w-full min-w-0">
      <div className="feature-panel">
        <div className="playback-toolbar">
          <PlaybackButton
            label="chittaswaram"
            playing={isPlaying}
            onClick={isPlaying ? stopPlaying : startPlaying}
          />
          <TempoControl value={baseBPM} onChange={handleBaseBPMChange} />
        </div>
        <p className="composition-meta">
          {raga && `${raga.name} · `}
          {uniqueSwaraCount} notes · Marked tempo {originalTempo} BPM
        </p>
        {chittaswaram.song_link && (
          <a
            className="composition-source"
            href={chittaswaram.song_link}
            target="_blank"
            rel="noopener noreferrer"
          >
            Listen to the original song ↗
          </a>
        )}
        {(raga || chittaswaram.tala) && (
          <Disclosure title="Raga & tala reference" className="composition-reference">
            <div className="composition-reference-grid">
              {raga && (
                <RagaReferenceCard
                  raga={raga}
                  language={notationLanguage}
                  playing={isRagaPlaying}
                  activeIndex={currentRagaNoteIndex}
                  onToggle={handlePlayRaga}
                />
              )}
              {chittaswaram.tala && (
                <TalaReferenceCard
                  parsed={parsedTala}
                  fallback={chittaswaram.tala}
                  playing={isTalaPlaying}
                  activeIndex={currentTalaBeat}
                  tempo={originalTempo}
                  onToggle={() => void handlePlayTala()}
                />
              )}
            </div>
          </Disclosure>
        )}

        {/* Notation: Sarali-style grid per phrase, spaced like paragraphs (no cards) */}
        <div className="mt-8">
          <p className="text-center text-muted text-sm mb-6">Exercise Notes</p>
          <div className="flex max-w-2xl mx-auto flex-col gap-10 px-1 sm:px-2">
            {phraseSlotBlocks.map((block, pi) => {
              const phraseTalaRaw = phrases[pi]?.tala?.trim() ?? '';
              const phraseParsed = phraseTalaRaw ? parseTalaString(phraseTalaRaw) : null;
              const phraseTalaSub = phraseParsed
                ? secondaryLabelFromParsedTala(phraseParsed)
                : null;
              const rawMult = phrases[pi]?.tempo_multiplier;
              const hasMult =
                typeof rawMult === 'number' &&
                Number.isFinite(rawMult) &&
                rawMult > 0 &&
                rawMult !== 1;
              const isTupletEven = phraseParsed?.kind === 'tuplet_even';
              return (
                <div key={pi} className="flex flex-col gap-2">
                  {(phraseParsed || hasMult) && (
                    <p
                      className={`text-xs text-muted ${isTupletEven ? 'text-left' : 'text-center'}`}
                    >
                      {phraseParsed && (
                        <>
                          <span className="font-medium text-muted">
                            {oneLineSummaryFromParsedTala(phraseParsed)}
                          </span>
                          {phraseTalaSub && (
                            <span className="block mt-0.5 text-[11px] text-muted">
                              {phraseTalaSub}
                            </span>
                          )}
                        </>
                      )}
                      {hasMult && (
                        <span
                          className={`block mt-0.5 text-[11px] text-accent/90 ${phraseParsed ? 'pt-0.5' : ''}`}
                        >
                          Phrase tempo ×{rawMult} relative to practice BPM
                        </span>
                      )}
                    </p>
                  )}
                  <div
                    className={
                      isTupletEven
                        ? 'box-border flex w-full flex-row flex-wrap justify-between gap-y-2 px-[max(0px,calc(((100%-1.125rem)/4-2.25rem)/2))] sm:px-[max(0px,calc(((100%-1.5rem)/4-3rem)/2))] md:px-[max(0px,calc(((100%-2.5rem)/6-3rem)/2))] lg:px-[max(0px,calc(((100%-3.5rem)/8-3rem)/2))]'
                        : 'grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5 sm:gap-2 justify-items-center'
                    }
                  >
                    {block.slots.map((slot, li) => {
                      const gsi = block.startIdx + li;
                      const isCurrent = isPlaying && gsi === currentSlotIdx;
                      const isPast = isPlaying && currentSlotIdx >= 0 && gsi < currentSlotIdx;
                      const cellIdle = isPast
                        ? 'bg-subtle/30 text-muted hover:bg-line/50'
                        : 'bg-subtle/50 text-ink hover:bg-line/70';
                      const cellActive = 'bg-accent text-on-accent scale-110 shadow-lg';

                      if (slot.type === 'tie') {
                        return (
                          <button
                            key={li}
                            ref={currentSlotIdx === gsi ? activeSlotRef : undefined}
                            type="button"
                            onClick={() => seekToSlot(gsi)}
                            className={`
                          shrink-0 w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg text-sm sm:text-lg font-semibold relative
                          transition-all duration-200 cursor-pointer hover:scale-105
                          ${isCurrent ? cellActive : cellIdle}
                        `}
                          >
                            —
                          </button>
                        );
                      }

                      const disp = parseVarisaiNote(
                        resolveSwaraTokenForRaga(slot.swaraToken, raga),
                      );
                      return (
                        <button
                          key={li}
                          ref={currentSlotIdx === gsi ? activeSlotRef : undefined}
                          type="button"
                          onClick={() => seekToSlot(gsi)}
                          className={`
                        shrink-0 w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center py-px rounded-lg text-sm sm:text-lg font-semibold
                        transition-all duration-200 cursor-pointer hover:scale-105 min-w-0
                        ${isCurrent ? cellActive : cellIdle}
                      `}
                        >
                          <SwaraInNoteChip
                            swara={disp.swara}
                            language={notationLanguage}
                            octave={disp.octave}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
