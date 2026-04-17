'use client';

import { Fragment, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { parseVarisaiNote } from '@/data/saraliVarisai';
import { Raga, getSwarafrequency } from '@/data/ragas';
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
  barPositionsFromParsedTala,
  primaryLabelFromParsedTala,
  secondaryLabelFromParsedTala,
  angPatternNotationFromParsedTala,
  oneLineSummaryFromParsedTala,
  formatTalaBeatsPerAngaLine,
  type TalaBeat,
} from '@/data/talas';
import * as metronome from '@/lib/metronome';
import { resolveStanzaRaga, type Song } from '@/data/songs';
import { humanizeStanzaHeading } from '@/data/compositions';

interface PlayableNote {
  swara: string;
  lyric: string;
  stanzaIdx: number;
}

/** Playback strip: larger squares (main), smaller circles (sub), vertical bars between angas. */
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

function flattenSongToNotes(song: Song): PlayableNote[] {
  const result: PlayableNote[] = [];
  song.stanzas.forEach((stanza, si) => {
    for (const line of stanza.lines) {
      const tokens = parseSongNotes(line.notes);
      for (const swara of tokens) {
        result.push({ swara, lyric: line.lyrics, stanzaIdx: si });
      }
    }
  });
  return result;
}

const RAGA_NOTES_PER_ROW = 8;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += size) rows.push(arr.slice(i, i + size));
  return rows;
}

/** 8 equal columns; chips scale with width (no horizontal scroll). */
const RAGA_SCALE_ROW_CLASS = 'grid w-full grid-cols-8 gap-0.5 sm:gap-1';

function ragaScaleChipClass(isHighlighted: boolean): string {
  return [
    'inline-flex aspect-square w-full min-w-0 flex-col items-center justify-center rounded-md border p-px sm:rounded-lg sm:p-0.5 text-[10px] font-medium transition-colors sm:text-xs',
    isHighlighted
      ? 'bg-amber-500 text-slate-900 border-amber-600 shadow-sm'
      : 'bg-slate-800/60 text-slate-200 border-slate-600/50',
  ].join(' ');
}

type SongPlayerProps = {
  song: Song;
  baseFreq: number;
  instrumentId?: InstrumentId;
  volume?: number;
  notationLanguage?: NotationLanguage;
  onBack?: () => void;
};

export default function SongPlayer({
  song,
  baseFreq,
  instrumentId = 'violin',
  volume = 0.8,
  notationLanguage = 'english',
  onBack,
}: SongPlayerProps) {
  const raga: Raga = resolveStanzaRaga(song.stanzas[0]);
  const playableNotes = flattenSongToNotes(song);

  const songTempo = song.stanzas[0]?.tempo;
  const [isPlaying, setIsPlaying] = useState(false);
  const [baseBPM, setBaseBPM] = useState(DEFAULT_PRACTICE_BPM);
  const [tempoInputValue, setTempoInputValue] = useState(String(DEFAULT_PRACTICE_BPM));
  const [loop, setLoop] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [storageReady, setStorageReady] = useState(false);
  const [ragaPlayingStanzaIdx, setRagaPlayingStanzaIdx] = useState<number | null>(null);
  const [currentRagaNoteIndex, setCurrentRagaNoteIndex] = useState<number>(0);
  const [talaPlayingStanzaIdx, setTalaPlayingStanzaIdx] = useState<number | null>(null);
  const [currentTalaBeat, setCurrentTalaBeat] = useState(-1);

  const ragaTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const SONG_STORAGE_KEY = 'songSettings';
  useLayoutEffect(() => {
    const stored = getStored<{ baseBPM?: number }>(SONG_STORAGE_KEY, {});
    const stanzaHasTempo = songTempo != null && songTempo >= 30 && songTempo <= PRACTICE_TEMPO_MAX_BPM;
    const storedValid = typeof stored.baseBPM === 'number' && stored.baseBPM >= 30 && stored.baseBPM <= PRACTICE_TEMPO_MAX_BPM;
    const bpm = stanzaHasTempo ? songTempo! : (storedValid ? stored.baseBPM! : DEFAULT_PRACTICE_BPM);
    setBaseBPM(bpm);
    setTempoInputValue(String(bpm));
    baseBPMRef.current = bpm;
    setStorageReady(true);
  }, [songTempo]);
  useEffect(() => {
    if (!storageReady) return;
    setStored(SONG_STORAGE_KEY, { baseBPM });
  }, [storageReady, baseBPM]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playheadTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isPlayingRef = useRef(false);
  const masterGainRef = useRef<GainNode | null>(null);
  const soundfontPlayerRef = useRef<Awaited<ReturnType<typeof getInstrument>> | null>(null);
  const baseFreqRef = useRef(baseFreq);
  const baseBPMRef = useRef(baseBPM);
  const lastNotePlayerRef = useRef<{ osc?: OscillatorNode; gain?: GainNode; stopTime: number; extend?(d: number): void } | null>(null);
  baseFreqRef.current = baseFreq;
  baseBPMRef.current = baseBPM;

  const getTempoForStanza = (si: number) => {
    const st = song.stanzas[si];
    return st?.tempo != null && st.tempo >= 30 && st.tempo <= PRACTICE_TEMPO_MAX_BPM ? st.tempo : baseBPM;
  };

  useEffect(() => {
    metronome.setMetronomeVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (talaPlayingStanzaIdx === null) return;
    const st = song.stanzas[talaPlayingStanzaIdx];
    const t =
      st?.tempo != null && st.tempo >= 30 && st.tempo <= PRACTICE_TEMPO_MAX_BPM ? st.tempo : baseBPM;
    metronome.setMetronomeTempo(t);
  }, [baseBPM, talaPlayingStanzaIdx, song.stanzas]);

  const stopTalaPlayback = () => {
    metronome.stopMetronome();
    setTalaPlayingStanzaIdx(null);
    setCurrentTalaBeat(-1);
  };

  useEffect(() => setTempoInputValue(String(baseBPM)), [baseBPM]);
  useEffect(() => {
    if (masterGainRef.current)
      masterGainRef.current.gain.value = Math.pow(volume, 3);
  }, [volume]);

  useEffect(() => {
    if (!audioContextRef.current || !masterGainRef.current) return;
    if (isSineInstrument(instrumentId)) {
      soundfontPlayerRef.current = null;
      return;
    }
    getInstrument(audioContextRef.current, instrumentId, masterGainRef.current)
      .then((p) => { soundfontPlayerRef.current = p; })
      .catch(() => { soundfontPlayerRef.current = null; });
  }, [instrumentId]);

  const linearToLogGain = (v: number) => (v === 0 ? 0 : Math.pow(v, 3));

  const handleBaseBPMChange = (v: number) => {
    baseBPMRef.current = v;
    setBaseBPM(v);
  };

  interface NotePlayer {
    osc?: OscillatorNode;
    gain?: GainNode;
    stopTime: number;
    extend?(additionalDuration: number): void;
  }

  const playNote = (swara: string, durationMs: number, stanzaIdx?: number): NotePlayer | null => {
    if (!audioContextRef.current || !masterGainRef.current) return null;
    const ragaForNote =
      stanzaIdx !== undefined && song.stanzas[stanzaIdx] ? resolveStanzaRaga(song.stanzas[stanzaIdx]) : raga;
    const ragaSwara = resolveSwaraTokenForRaga(swara, ragaForNote);
    const parsed = parseVarisaiNote(ragaSwara);
    let freq = getSwarafrequency(baseFreqRef.current, parsed.swara);
    if (parsed.octave === 'higher') freq *= 2;
    else if (parsed.octave === 'lower') freq *= 0.5;

    const now = audioContextRef.current.currentTime;
    const dur = durationMs / 1000;
    const stopTime = now + dur;

    if (!isSineInstrument(instrumentId) && soundfontPlayerRef.current) {
      const noteName = freqToNoteNameForInstrument(freq, instrumentId);
      soundfontPlayerRef.current.start(noteName, now, { duration: dur, gain: 1.5 });
      const state = { stopTime };
      return {
        get stopTime() { return state.stopTime; },
        extend(additionalDuration: number) {
          if (!soundfontPlayerRef.current) return;
          soundfontPlayerRef.current.start(noteName, state.stopTime, { duration: additionalDuration / 1000, gain: 1.5 });
          state.stopTime += additionalDuration / 1000;
        },
      };
    }

    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gain.gain.setValueAtTime(0.3, now + dur - 0.05);
    gain.gain.linearRampToValueAtTime(0, now + dur);
    osc.connect(gain);
    gain.connect(masterGainRef.current);
    osc.start(now);
    osc.stop(stopTime);
    oscillatorsRef.current.push(osc);
    return { osc, gain, stopTime };
  };

  const extendNote = (notePlayer: NotePlayer, additionalDuration: number) => {
    if (notePlayer.extend) {
      notePlayer.extend(additionalDuration);
      return;
    }
    if (!audioContextRef.current || !notePlayer.osc || !notePlayer.gain) return;
    const now = audioContextRef.current.currentTime;
    const currentStop = Math.max(notePlayer.stopTime, now);
    const newStop = currentStop + additionalDuration / 1000;
    notePlayer.gain.gain.cancelScheduledValues(now);
    const sustainGain = 0.3;
    const currentGain = notePlayer.gain.gain.value;
    notePlayer.gain.gain.setValueAtTime(currentGain < sustainGain ? currentGain : sustainGain, now);
    notePlayer.gain.gain.linearRampToValueAtTime(sustainGain, now + 0.01);
    notePlayer.gain.gain.setValueAtTime(sustainGain, newStop - 0.05);
    notePlayer.gain.gain.linearRampToValueAtTime(0, newStop);
    try { notePlayer.osc.stop(newStop); } catch {}
    notePlayer.stopTime = newStop;
  };

  const getTempoForIndex = (idx: number) => {
    const stanza = song.stanzas[playableNotes[idx]?.stanzaIdx];
    return (stanza?.tempo != null && stanza.tempo >= 30 && stanza.tempo <= PRACTICE_TEMPO_MAX_BPM)
      ? stanza.tempo
      : baseBPMRef.current;
  };

  const playFromIndex = (index: number) => {
    if (!isPlayingRef.current || index >= playableNotes.length) return;
    const bpm = getTempoForIndex(index);
    const noteDurationMs = (60 / bpm) * 1000;
    const { swara } = playableNotes[index];
    let lastNotePlayer: NotePlayer | null = null;

    const playNext = (nextIdx: number) => {
      if (!isPlayingRef.current) return;
      if (nextIdx >= playableNotes.length) {
        if (loop) {
          timeoutRef.current = setTimeout(() => playFromIndex(0), noteDurationMs);
        } else {
          isPlayingRef.current = false;
          setIsPlaying(false);
          setCurrentNoteIndex(0);
        }
        return;
      }
      playFromIndex(nextIdx);
    };

    const countTiesAhead = () => {
      let c = 0;
      while (index + 1 + c < playableNotes.length && playableNotes[index + 1 + c].swara === ';') c++;
      return c;
    };
    const tieCount = countTiesAhead();
    const totalDurationMs = noteDurationMs * (1 + tieCount);
    const stanzaIdx = playableNotes[index].stanzaIdx;

    if (swara === ';') {
      if (lastNotePlayerRef.current && isSineInstrument(instrumentId)) {
        extendNote(lastNotePlayerRef.current, noteDurationMs);
      }
      setCurrentNoteIndex(index);
      timeoutRef.current = setTimeout(() => playNext(index + 1), noteDurationMs);
      return;
    }

    if (!isSineInstrument(instrumentId)) {
      lastNotePlayer = playNote(swara, totalDurationMs, stanzaIdx);
      lastNotePlayerRef.current = lastNotePlayer;
      setCurrentNoteIndex(index);
      playheadTimeoutsRef.current.forEach((t) => clearTimeout(t));
      playheadTimeoutsRef.current = [];
      for (let i = 1; i <= tieCount; i++) {
        const t = setTimeout(() => {
          if (isPlayingRef.current) setCurrentNoteIndex(index + i);
        }, noteDurationMs * i);
        playheadTimeoutsRef.current.push(t);
      }
      timeoutRef.current = setTimeout(() => playNext(index + 1 + tieCount), totalDurationMs);
      return;
    }

    lastNotePlayer = playNote(swara, noteDurationMs, stanzaIdx);
    lastNotePlayerRef.current = lastNotePlayer;
    setCurrentNoteIndex(index);
    if (tieCount > 0 && lastNotePlayer) {
      for (let i = 1; i <= tieCount; i++) {
        setTimeout(() => {
          if (lastNotePlayerRef.current && isPlayingRef.current) {
            extendNote(lastNotePlayerRef.current, noteDurationMs);
          }
        }, noteDurationMs * i - 60);
      }
    }
    playheadTimeoutsRef.current.forEach((t) => clearTimeout(t));
    playheadTimeoutsRef.current = [];
    for (let i = 1; i <= tieCount; i++) {
      const t = setTimeout(() => {
        if (isPlayingRef.current) setCurrentNoteIndex(index + i);
      }, noteDurationMs * i);
      playheadTimeoutsRef.current.push(t);
    }
    timeoutRef.current = setTimeout(() => playNext(index + 1 + tieCount), totalDurationMs);
  };

  const startPlaying = async () => {
    stopRagaPlayback();
    stopTalaPlayback();
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) audioContextRef.current = new Ctx();
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      if (!masterGainRef.current) {
        masterGainRef.current = audioContextRef.current.createGain();
        masterGainRef.current.connect(audioContextRef.current.destination);
        masterGainRef.current.gain.value = linearToLogGain(volume);
      }
      if (!isSineInstrument(instrumentId)) {
        soundfontPlayerRef.current = await getInstrument(
          audioContextRef.current,
          instrumentId,
          masterGainRef.current
        );
      }
      isPlayingRef.current = true;
      setIsPlaying(true);
      playFromIndex(0);
    } catch (e) {
      console.error('Song playback error:', e);
      setIsPlaying(false);
    }
  };

  const stopPlaying = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentNoteIndex(0);
    lastNotePlayerRef.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    playheadTimeoutsRef.current.forEach((t) => clearTimeout(t));
    playheadTimeoutsRef.current = [];
    oscillatorsRef.current.forEach((o) => { try { o.stop(); } catch {} });
    oscillatorsRef.current = [];
    if (soundfontPlayerRef.current) {
      try { soundfontPlayerRef.current.stop(); } catch {}
    }
  };

  const seekToNote = async (idx: number) => {
    stopTalaPlayback();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    playheadTimeoutsRef.current.forEach((t) => clearTimeout(t));
    playheadTimeoutsRef.current = [];
    lastNotePlayerRef.current = null;
    oscillatorsRef.current.forEach((o) => { try { o.stop(); } catch {} });
    oscillatorsRef.current = [];
    if (soundfontPlayerRef.current) try { soundfontPlayerRef.current.stop(); } catch {};

    if (!isPlayingRef.current) {
      stopRagaPlayback();
      stopTalaPlayback();
      try {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioContextRef.current) audioContextRef.current = new Ctx();
        if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
        if (!masterGainRef.current) {
          masterGainRef.current = audioContextRef.current.createGain();
          masterGainRef.current.connect(audioContextRef.current.destination);
          masterGainRef.current.gain.value = linearToLogGain(volume);
        }
        if (!isSineInstrument(instrumentId)) {
          soundfontPlayerRef.current = await getInstrument(
            audioContextRef.current,
            instrumentId,
            masterGainRef.current
          );
        }
        isPlayingRef.current = true;
        setIsPlaying(true);
      } catch (e) {
        console.error('Seek error:', e);
        return;
      }
    }
    playFromIndex(idx);
  };

  useEffect(() => () => {
    stopPlaying();
    stopRagaPlayback();
    stopTalaPlayback();
    audioContextRef.current?.close().catch(() => {});
  }, []);

  const playRagaScale = async (stanzaRaga: Raga) => {
    const notes = [...stanzaRaga.arohana, ...stanzaRaga.avarohana];
    const noteDurationMs = (60 / baseBPMRef.current) * 1000;

    const ensureContext = async () => {
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
          audioContextRef.current!,
          instrumentId,
          masterGainRef.current!
        );
      }
    };

    const playNoteForRaga = (swara: string) => {
      if (!audioContextRef.current || !masterGainRef.current) return;
      const ragaSwara = resolveSwaraTokenForRaga(swara, stanzaRaga);
      const parsed = parseVarisaiNote(ragaSwara);
      let freq = getSwarafrequency(baseFreqRef.current, parsed.swara);
      if (parsed.octave === 'higher') freq *= 2;
      else if (parsed.octave === 'lower') freq *= 0.5;
      const now = audioContextRef.current.currentTime;
      const dur = noteDurationMs / 1000;
      if (!isSineInstrument(instrumentId) && soundfontPlayerRef.current) {
        const noteName = freqToNoteNameForInstrument(freq, instrumentId);
        soundfontPlayerRef.current.start(noteName, now, { duration: dur, gain: 1.5 });
      } else {
        const osc = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.25, now + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, now + dur);
        osc.connect(gainNode);
        gainNode.connect(masterGainRef.current);
        osc.start(now);
        osc.stop(now + dur);
        oscillatorsRef.current.push(osc);
      }
    };

    const run = async (i: number) => {
      if (i >= notes.length) {
        setRagaPlayingStanzaIdx(null);
        setCurrentRagaNoteIndex(0);
        return;
      }
      setCurrentRagaNoteIndex(i);
      await ensureContext();
      playNoteForRaga(notes[i]);
      ragaTimeoutRef.current = setTimeout(() => run(i + 1), noteDurationMs);
    };
    run(0);
  };

  const stopRagaPlayback = () => {
    if (ragaTimeoutRef.current) {
      clearTimeout(ragaTimeoutRef.current);
      ragaTimeoutRef.current = null;
    }
    setRagaPlayingStanzaIdx(null);
    setCurrentRagaNoteIndex(0);
    oscillatorsRef.current.forEach((o) => { try { o.stop(); } catch {} });
    oscillatorsRef.current = [];
  };

  const handlePlayTala = async (si: number) => {
    if (talaPlayingStanzaIdx === si) {
      stopTalaPlayback();
      return;
    }
    const parsed = parseTalaString(song.stanzas[si]?.tala ?? '');
    if (!parsed) return;
    if (isPlayingRef.current) stopPlaying();
    stopRagaPlayback();
    stopTalaPlayback();
    setTalaPlayingStanzaIdx(si);
    setCurrentTalaBeat(-1);
    const pattern = patternFromParsedTala(parsed);
    const bpm = getTempoForStanza(si);
    try {
      await metronome.startMetronome(pattern, bpm, (beatIndex) => {
        setCurrentTalaBeat(beatIndex);
      });
      metronome.setMetronomeVolume(volume);
    } catch (e) {
      console.error('Tala playback error:', e);
      setTalaPlayingStanzaIdx(null);
      setCurrentTalaBeat(-1);
    }
  };

  const handlePlayRaga = (si: number, stanzaRaga: Raga) => {
    if (ragaPlayingStanzaIdx === si) {
      stopRagaPlayback();
      return;
    }
    if (isPlayingRef.current) stopPlaying();
    stopTalaPlayback();
    stopRagaPlayback();
    setRagaPlayingStanzaIdx(si);
    playRagaScale(stanzaRaga);
  };

  /** Insert bar-line markers at anga boundaries (e.g. Rupaka: after 2, 6, 8, 12... beats). Each token (note or tie ;) = 1 beat. */
  function tokensWithBarLines(
    tokens: string[],
    barInfo: { barAt: number[]; cycleLength: number } | null,
    startIdx: number
  ): Array<{ t: string; tokenIdx: number } | { bar: true }> {
    if (!barInfo || barInfo.barAt.length === 0)
      return tokens.map((t, i) => ({ t, tokenIdx: startIdx + i }));
    const { barAt, cycleLength } = barInfo;
    const barPositions = new Set<number>();
    for (let k = 0; k <= 100; k++) {
      for (const b of barAt) barPositions.add(b + k * cycleLength);
    }
    const result: Array<{ t: string; tokenIdx: number } | { bar: true }> = [];
    let beats = 0;
    tokens.forEach((t, i) => {
      if (barPositions.has(beats)) result.push({ bar: true });
      beats++;
      result.push({ t, tokenIdx: startIdx + i });
    });
    return result;
  }

  // Build a flat list for display with note indices per line
  const lineDisplay: { stanzaIdx: number; lineIdx: number; startIdx: number; tokens: string[] }[] = [];
  let idx = 0;
  song.stanzas.forEach((stanza, si) => {
    stanza.lines.forEach((line, li) => {
      const tokens = parseSongNotes(line.notes);
      lineDisplay.push({ stanzaIdx: si, lineIdx: li, startIdx: idx, tokens });
      idx += tokens.length;
    });
  });

  const headerFirstStanza = song.stanzas[0];
  const headerRaga = resolveStanzaRaga(headerFirstStanza);
  const ragaVariesByStanza =
    song.stanzas.length > 1 &&
    song.stanzas.some((s) => resolveStanzaRaga(s).ragaId !== headerRaga.ragaId);
  const headerParsedTala = headerFirstStanza ? parseTalaString(headerFirstStanza.tala) : null;
  const headerTalaSubline = headerParsedTala ? secondaryLabelFromParsedTala(headerParsedTala) : null;
  const headerTalaLine = headerParsedTala
    ? oneLineSummaryFromParsedTala(headerParsedTala)
    : headerFirstStanza?.tala ?? '';
  const headerTalaPattern = headerParsedTala ? patternFromParsedTala(headerParsedTala) : [];
  const talaVariesByStanza =
    song.stanzas.length > 1 && song.stanzas.some((s) => s.tala !== song.stanzas[0].tala);
  const headerMarkedTempo =
    headerFirstStanza?.tempo != null && headerFirstStanza.tempo >= 30 && headerFirstStanza.tempo <= PRACTICE_TEMPO_MAX_BPM
      ? headerFirstStanza.tempo
      : null;

  const isHeaderRagaPlaying = !ragaVariesByStanza && ragaPlayingStanzaIdx === 0;
  const isHeaderTalaPlaying = talaPlayingStanzaIdx === 0;
  const headerArohana = headerRaga.arohana;
  const headerAvarohana = headerRaga.avarohana;

  const refBtn =
    'inline-flex items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-colors min-h-[2.25rem] px-3 sm:text-sm';
  const refIdle = 'border-slate-600/70 bg-slate-800/40 text-slate-200 hover:bg-slate-700/50 hover:border-slate-500';
  const refActive = 'border-amber-500/80 bg-amber-500/15 text-amber-100 shadow-sm shadow-amber-900/20';

  return (
    <div className="w-full max-w-4xl mx-auto min-w-0 px-3 sm:px-4 md:px-0">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl sm:rounded-3xl px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 shadow-2xl border border-slate-700/50">
        {/* Hero: title + primary playback */}
        <header className="border-b border-slate-700/40 pb-8 mb-8">
          <div className="flex flex-col gap-6">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex w-fit items-center gap-2 text-sm text-slate-500 hover:text-[var(--accent)] transition-colors -ml-0.5"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to compositions
              </button>
            )}

            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0 flex-1 space-y-2">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight text-slate-50 break-words">
                  {song.name}
                </h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  <span className="text-slate-300">{song.composer}</span>
                  <span className="text-slate-600 mx-2" aria-hidden>
                    ·
                  </span>
                  <span>{song.language}</span>
                </p>
              </div>

              <div className="flex flex-col items-center shrink-0 sm:-mt-2 sm:self-start">
                <button
                  type="button"
                  onClick={isPlaying ? stopPlaying : startPlaying}
                  aria-pressed={isPlaying}
                  className={`
                  relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-[var(--border)]
                  transition-all duration-300 ease-out flex items-center justify-center group
                  ${isPlaying
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 border-[var(--accent)]'
                    : 'bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700'
                  }
                `}
                >
                  <svg
                    className={`w-11 h-11 sm:w-12 sm:h-12 transition-transform duration-300 ${isPlaying ? 'scale-105' : 'scale-100 group-hover:scale-105'}`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    {isPlaying ? <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /> : <path d="M8 5v14l11-7z" />}
                  </svg>
                </button>
                <p className="mt-3 text-center text-xs text-slate-500 tabular-nums">
                  {isPlaying ? `Playing · ${baseBPM} BPM` : 'Song'}
                </p>
              </div>
            </div>

            {/* Full width: equal halves — Raga | Tala */}
            <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 md:items-stretch">
                {/* Raga — full scale here when one raga; ragamalika uses per-stanza cards below */}
                <div
                  className="flex min-w-0 flex-col rounded-xl border border-slate-700/45 bg-slate-900/40"
                  style={{ padding: '1.25rem 1.5rem', boxSizing: 'border-box' }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
                    Raga
                  </p>
                  {ragaVariesByStanza ? (
                    <>
                      <p className="text-base font-medium leading-snug text-slate-100">{headerRaga.name}</p>
                      <p className="mt-2 text-xs leading-relaxed text-slate-500">
                        Ragamalika — each part below lists its own raga, tala, and scale.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0 space-y-1">
                          <p className="text-lg font-medium text-slate-100 tracking-tight">{headerRaga.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePlayRaga(0, headerRaga)}
                          className={`${refBtn} shrink-0 ${isHeaderRagaPlaying ? refActive : refIdle}`}
                          title="Hear arohana and avarohana"
                        >
                          {isHeaderRagaPlaying ? (
                            <>
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <rect x="6" y="4" width="4" height="16" />
                                <rect x="14" y="4" width="4" height="16" />
                              </svg>{' '}
                              Stop scale
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path d="M8 5v14l11-7z" />
                              </svg>{' '}
                              Scale
                            </>
                          )}
                        </button>
                      </div>
                      <div className="mt-5 flex flex-col space-y-4 border-t border-slate-700/40 pt-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2.5">
                            Arohana
                          </p>
                          <div className="flex flex-col gap-2">
                            {chunkArray(headerArohana, RAGA_NOTES_PER_ROW).map((row, ri) => (
                              <div key={ri} className={RAGA_SCALE_ROW_CLASS}>
                                {row.map((note, j) => {
                                  const i = ri * RAGA_NOTES_PER_ROW + j;
                                  const p = parseVarisaiNote(note);
                                  const isHighlighted = isHeaderRagaPlaying && currentRagaNoteIndex === i;
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
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2.5">
                            Avarohana
                          </p>
                          <div className="flex flex-col gap-2">
                            {chunkArray(headerAvarohana, RAGA_NOTES_PER_ROW).map((row, ri) => (
                              <div key={ri} className={RAGA_SCALE_ROW_CLASS}>
                                {row.map((note, j) => {
                                  const i = ri * RAGA_NOTES_PER_ROW + j;
                                  const p = parseVarisaiNote(note);
                                  const isHighlighted =
                                    isHeaderRagaPlaying &&
                                    currentRagaNoteIndex === headerArohana.length + i;
                                  return (
                                    <span key={headerArohana.length + i} className={ragaScaleChipClass(isHighlighted)}>
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
                    </>
                  )}
                </div>

                {/* Tala — same controls as under each part */}
                <div
                  className="flex min-h-[12rem] min-w-0 flex-col rounded-xl border border-slate-700/45 bg-slate-900/40 md:min-h-0"
                  style={{ padding: '1.25rem 1.5rem', boxSizing: 'border-box' }}
                >
                  <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 space-y-1.5 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tala</p>
                      <p className="text-base font-medium leading-snug text-slate-100">{headerTalaLine}</p>
                      {headerTalaSubline && (
                        <p className="text-xs leading-snug text-slate-400">{headerTalaSubline}</p>
                      )}
                      {headerTalaPattern.length > 0 && (
                        <p
                          className="mt-2.5 font-mono text-xs text-slate-300 tracking-wide break-all"
                          title="Beat numbers within each anga; | separates angas"
                        >
                          {formatTalaBeatsPerAngaLine(headerTalaPattern)}
                        </p>
                      )}
                      {headerParsedTala ? (
                        <p className="text-xs font-mono text-slate-400">
                          {angPatternNotationFromParsedTala(headerParsedTala)}
                          <span className="text-slate-600 mx-1.5">·</span>
                          {beatsPerCycleFromParsedTala(headerParsedTala)} beats per cycle
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500">{headerFirstStanza?.tala}</p>
                      )}
                      {talaVariesByStanza && (
                        <p className="mt-2 text-xs leading-relaxed text-slate-500">
                          {ragaVariesByStanza
                            ? "Rhythm differs by section — use Tala under each part for that section's pattern."
                            : "Rhythm differs by section — bar lines follow each part's tala; the metronome above uses the first section's tala."}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handlePlayTala(0)}
                      disabled={!headerParsedTala}
                      className={`${refBtn} shrink-0 self-start sm:self-auto ${
                        !headerParsedTala
                          ? 'opacity-40 cursor-not-allowed border-slate-700 text-slate-500'
                          : isHeaderTalaPlaying
                            ? refActive
                            : refIdle
                      }`}
                      title={
                        headerParsedTala
                          ? talaVariesByStanza
                            ? 'Play tala for the first part (see each part for other talas)'
                            : headerParsedTala.kind === 'equal_beats'
                              ? 'Hear bar beats (beat 1 accented)'
                              : 'Hear tala beats (sam / anga)'
                          : 'Unknown tala format'
                      }
                    >
                      {isHeaderTalaPlaying ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>{' '}
                          Stop tala
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path d="M8 5v14l11-7z" />
                          </svg>{' '}
                          Tala
                        </>
                      )}
                    </button>
                  </div>
                  {headerParsedTala && headerTalaPattern.length > 0 && (
                    <div className="mt-auto space-y-2 border-t border-slate-700/40 pt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Beats in cycle
                      </p>
                      <TalaBeatPlaybackStrip
                        beats={headerTalaPattern}
                        currentBeatIndex={isHeaderTalaPlaying ? currentTalaBeat : null}
                      />
                      <p className="text-[10px] text-slate-500">
                        Larger square = main beat · smaller circle = sub-beat · bar = anga boundary
                      </p>
                      {isHeaderTalaPlaying && (
                        <p className="text-[10px] text-slate-500 tabular-nums">
                          Now: beat {currentTalaBeat + 1} of {headerTalaPattern.length}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

            {headerMarkedTempo != null && (
              <p className="text-xs text-slate-500">
                Marked tempo in score:{' '}
                <span className="font-medium tabular-nums text-slate-400">{headerMarkedTempo} BPM</span>
              </p>
            )}
          </div>
        </header>

        {/* Tempo — contained control strip */}
        <section className="mb-10 rounded-xl border border-slate-700/45 bg-slate-950/35 px-5 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto flex max-w-md flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-slate-300">Practice tempo</span>
              <span className="text-xs text-slate-500">BPM</span>
            </div>
            <div className="flex w-full max-w-md mx-auto flex-row items-stretch divide-x divide-slate-600/90 overflow-hidden rounded-lg border border-slate-600/80 bg-slate-900/50">
              <button
                type="button"
                onClick={() => { const v = Math.max(30, Math.round(Math.floor(baseBPM / 2) / 5) * 5); handleBaseBPMChange(v); setTempoInputValue(String(v)); }}
                disabled={baseBPM <= 30}
                aria-label="Halve tempo"
                className="flex h-10 min-w-[2.5rem] flex-1 items-center justify-center text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-slate-500"
              >
                ÷2
              </button>
              <button
                type="button"
                onClick={() => { const v = Math.max(30, baseBPM - 5); handleBaseBPMChange(v); setTempoInputValue(String(v)); }}
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
                  onChange={(e) => setTempoInputValue(e.target.value.replace(/\D/g, ''))}
                  onBlur={() => {
                    let n = parseInt(tempoInputValue, 10);
                    if (isNaN(n) || n < 30) n = 30;
                    if (n > PRACTICE_TEMPO_MAX_BPM) n = PRACTICE_TEMPO_MAX_BPM;
                    n = Math.round(n / 5) * 5;
                    handleBaseBPMChange(n);
                    setTempoInputValue(String(n));
                  }}
                  className="w-full bg-transparent text-center text-sm font-bold text-neutral-950 outline-none placeholder:text-neutral-600"
                  aria-label="Tempo BPM"
                />
              </div>
              <button
                type="button"
                onClick={() => { const v = Math.min(PRACTICE_TEMPO_MAX_BPM, baseBPM + 5); handleBaseBPMChange(v); setTempoInputValue(String(v)); }}
                disabled={baseBPM >= PRACTICE_TEMPO_MAX_BPM}
                aria-label="Increase tempo"
                className="flex h-10 min-w-[2.5rem] flex-1 items-center justify-center text-lg leading-none text-slate-300 transition-colors hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-slate-500"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => { const v = Math.min(PRACTICE_TEMPO_MAX_BPM, Math.round((baseBPM * 2) / 5) * 5); handleBaseBPMChange(v); setTempoInputValue(String(v)); }}
                disabled={baseBPM >= PRACTICE_TEMPO_MAX_BPM}
                aria-label="Double tempo"
                className="flex h-10 min-w-[2.5rem] flex-1 items-center justify-center text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-slate-500"
              >
                x2
              </button>
            </div>
          </div>
        </section>

        {/* Stanzas */}
        <div className="space-y-12">
          {song.stanzas.map((stanza, si) => {
            const stanzaRaga = resolveStanzaRaga(stanza);
            const arohana = stanzaRaga.arohana;
            const avarohana = stanzaRaga.avarohana;
            const parsedTala = parseTalaString(stanza.tala);
            const talaDisplayShort = parsedTala ? primaryLabelFromParsedTala(parsedTala) : stanza.tala;
            const talaSubline = parsedTala ? secondaryLabelFromParsedTala(parsedTala) : null;
            const talaBarInfo = parsedTala ? barPositionsFromParsedTala(parsedTala) : null;
            const talaPattern = parsedTala ? patternFromParsedTala(parsedTala) : [];
            const isRagaPlaying = ragaPlayingStanzaIdx === si;
            const isTalaPlaying = talaPlayingStanzaIdx === si;
            const stanzaHeading =
              stanza.section_name != null && stanza.section_name !== ''
                ? humanizeStanzaHeading(stanza.section_name)
                : `Part ${si + 1}`;

            return (
            <section key={si} className="rounded-2xl border border-slate-700/50 bg-slate-950/25 overflow-hidden shadow-sm">
              {ragaVariesByStanza && (
              <div className="flex flex-col gap-6 p-6">
                {song.stanzas.length > 1 && (
                  <div className="py-5">
                    <p className="text-sm font-medium text-slate-300 tracking-tight">{stanzaHeading}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 md:items-stretch">
                  {/* Scale (raga + arohana / avarohana) */}
                  <div className="flex min-h-[12rem] flex-col rounded-xl border border-slate-700/45 bg-slate-900/35 p-5 md:min-h-0 md:h-full">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 shrink-0">
                      <div className="min-w-0 space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Raga</p>
                        <p className="text-lg font-medium text-slate-100 tracking-tight">{stanzaRaga.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePlayRaga(si, stanzaRaga)}
                        className={`${refBtn} shrink-0 ${isRagaPlaying ? refActive : refIdle}`}
                        title="Hear arohana and avarohana"
                      >
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
                          {chunkArray(arohana, RAGA_NOTES_PER_ROW).map((row, ri) => (
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
                          {chunkArray(avarohana, RAGA_NOTES_PER_ROW).map((row, ri) => (
                            <div key={ri} className={RAGA_SCALE_ROW_CLASS}>
                              {row.map((note, j) => {
                                const i = ri * RAGA_NOTES_PER_ROW + j;
                                const p = parseVarisaiNote(note);
                                const isHighlighted =
                                  isRagaPlaying && currentRagaNoteIndex === arohana.length + i;
                                return (
                                  <span key={arohana.length + i} className={ragaScaleChipClass(isHighlighted)}>
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

                  {/* Tala: copy + play + always-visible beat strip */}
                  <div className="flex min-h-[12rem] flex-col rounded-xl border border-slate-700/45 bg-slate-900/35 p-5 md:min-h-0 md:h-full">
                    <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0 space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tala</p>
                        <p className="text-base text-slate-100 font-medium leading-snug">{talaDisplayShort}</p>
                        {talaSubline && (
                          <p className="text-xs leading-snug text-slate-400">{talaSubline}</p>
                        )}
                        {parsedTala ? (
                          <p className="text-xs font-mono text-slate-400">
                            {angPatternNotationFromParsedTala(parsedTala)}
                            <span className="text-slate-600 mx-1.5">·</span>
                            {beatsPerCycleFromParsedTala(parsedTala)} beats per cycle
                          </p>
                        ) : (
                          <p className="text-xs text-slate-500">{stanza.tala}</p>
                        )}
                        {stanza.tempo != null && (
                          <p className="text-xs text-slate-500 pt-0.5">
                            Marked tempo <span className="text-slate-400 tabular-nums">{stanza.tempo} BPM</span>
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handlePlayTala(si)}
                        disabled={!parsedTala}
                        className={`${refBtn} shrink-0 self-start sm:self-auto ${!parsedTala ? 'opacity-40 cursor-not-allowed border-slate-700 text-slate-500' : isTalaPlaying ? refActive : refIdle}`}
                        title={
                          parsedTala
                            ? parsedTala.kind === 'equal_beats'
                              ? 'Hear bar beats (beat 1 accented)'
                              : 'Hear tala beats (sam / anga)'
                            : 'Unknown tala format'
                        }
                      >
                        {isTalaPlaying ? (
                          <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg> Stop tala</>
                        ) : (
                          <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M8 5v14l11-7z" /></svg> Tala</>
                        )}
                      </button>
                    </div>
                    {parsedTala && talaPattern.length > 0 && (
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
                    )}
                  </div>
                </div>
              </div>
              )}

              {!ragaVariesByStanza && song.stanzas.length > 1 && (
                <div className="px-6 py-5">
                  <p className="text-sm font-medium text-slate-300 tracking-tight">{stanzaHeading}</p>
                </div>
              )}

              {/* Notation + lyrics */}
              <div className="border-t border-slate-700/45 bg-slate-900/35 px-6 py-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-4">Notation</p>
                <div className="divide-y divide-slate-700/40">
                {stanza.lines.map((line, li) => {
                  const entry = lineDisplay.find(
                    (e) => e.stanzaIdx === si && e.lineIdx === li
                  );
                  if (!entry) return null;
                  const { startIdx, tokens } = entry;
                  const items = tokensWithBarLines(tokens, talaBarInfo, startIdx);
                  return (
                    <div
                      key={li}
                      className="flex flex-col gap-2 py-4 first:pt-0"
                    >
                      <div className="flex flex-wrap items-center gap-1">
                        {items.map((item, ii) => {
                          if ('bar' in item) {
                            return (
                              <span
                                key={`bar-${ii}`}
                                className="inline-block w-px h-10 sm:h-12 mx-1 flex-shrink-0 bg-slate-400"
                                aria-hidden
                                title="Tala bar"
                              />
                            );
                          }
                          const { t, tokenIdx: globalIdx } = item;
                          const isCurrent = isPlaying && globalIdx === currentNoteIndex;
                          if (t === ';') {
                            return (
                              <button
                                key={ii}
                                type="button"
                                onClick={() => seekToNote(globalIdx)}
                                className={`
                                  w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg text-sm sm:text-lg font-semibold
                                  transition-all cursor-pointer hover:scale-105
                                  ${isCurrent
                                    ? 'bg-amber-500 text-slate-900 scale-110 shadow-lg'
                                    : globalIdx < currentNoteIndex && isPlaying
                                      ? 'bg-slate-700/30 text-slate-500'
                                      : 'bg-slate-700/50 text-slate-200 hover:bg-slate-600'
                                  }
                                `}
                              >
                                —
                              </button>
                            );
                          }
                          const disp = parseVarisaiNote(resolveSwaraTokenForRaga(t, stanzaRaga));
                          return (
                            <button
                              key={ii}
                              type="button"
                              onClick={() => seekToNote(globalIdx)}
                              className={`
                                w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center py-px rounded-lg text-sm sm:text-lg font-semibold
                                transition-all cursor-pointer hover:scale-105 min-w-0
                                ${isCurrent
                                  ? 'bg-amber-500 text-slate-900 scale-110 shadow-lg'
                                  : globalIdx < currentNoteIndex && isPlaying
                                    ? 'bg-slate-700/30 text-slate-500'
                                    : 'bg-slate-700/50 text-slate-200 hover:bg-slate-600'
                                }
                              `}
                            >
                              <SwaraInNoteChip swara={disp.swara} language={notationLanguage} octave={disp.octave} />
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[var(--text-primary)] text-base sm:text-lg font-medium leading-relaxed">{line.lyrics}</p>
                      {line.translation && (
                        <p className="text-slate-500 dark:text-slate-400 text-sm italic pl-0.5" aria-label="Translation">
                          {line.translation}
                        </p>
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            </section>
          );
          })}
        </div>
      </div>
    </div>
  );
}
