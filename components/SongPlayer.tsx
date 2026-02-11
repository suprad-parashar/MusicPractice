'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { parseVarisaiNote } from '@/data/saraliVarisai';
import { MELAKARTA_RAGAS, Raga, getSwarafrequency } from '@/data/melakartaRagas';
import { JANYA_RAGAS } from '@/data/janyaRagas';
import { getInstrument, freqToNoteNameForInstrument, isSineInstrument, type InstrumentId } from '@/lib/instrumentLoader';
import { getSwaraInScript, type NotationLanguage } from '@/lib/swaraNotation';
import { parseSongNotes } from '@/lib/songNotation';
import { getStored, setStored } from '@/lib/storage';
import { parseTalaString, getTalaDisplayWithFullName, getTalaAngaBarPositions } from '@/data/talas';
import type { Song } from '@/data/songs';

const ALL_RAGAS: Raga[] = [...MELAKARTA_RAGAS, ...JANYA_RAGAS];

interface PlayableNote {
  swara: string;
  lyric: string;
  stanzaIdx: number;
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

function getRagaByName(name: string): Raga | null {
  return ALL_RAGAS.find((r) => r.name.toLowerCase() === name.toLowerCase()) ?? null;
}

/** Build 7-note scale (S,R,G,M,P,D,N) from raga, merging arohana + avarohana for janya ragas. */
function buildRagaScale(raga: Raga): Record<string, string> {
  const map: Record<string, string> = {};
  const add = (note: string) => {
    const p = parseVarisaiNote(note);
    const base = p.swara.charAt(0);
    if (!map[base]) map[base] = p.swara;
  };
  [...raga.arohana, ...raga.avarohana].forEach(add);
  const defaults: Record<string, string> = {
    S: 'S', R: 'R1', G: 'G3', M: 'M1', P: 'P', D: 'D1', N: 'N3',
  };
  return { ...defaults, ...map };
}

function convertNoteToRaga(swara: string, raga: Raga): string {
  const parsed = parseVarisaiNote(swara);
  const scale = buildRagaScale(raga);
  const baseSwara = scale[parsed.swara] || parsed.swara;
  if (parsed.octave === 'higher') return `>${baseSwara}`;
  if (parsed.octave === 'lower') return `<${baseSwara}`;
  return baseSwara;
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
  const ragaName = song.stanzas[0]?.raga ?? 'Malahari';
  const raga: Raga = getRagaByName(ragaName) ?? getRagaByName('Malahari') ?? (ALL_RAGAS.find((r) => r.name === 'Malahari') as Raga);
  const playableNotes = flattenSongToNotes(song);

  const songTempo = song.stanzas[0]?.tempo;
  const [isPlaying, setIsPlaying] = useState(false);
  const [baseBPM, setBaseBPM] = useState(90);
  const [tempoInputValue, setTempoInputValue] = useState('90');
  const [loop, setLoop] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [storageReady, setStorageReady] = useState(false);
  const [ragaPlayingStanzaIdx, setRagaPlayingStanzaIdx] = useState<number | null>(null);
  const [currentRagaNoteIndex, setCurrentRagaNoteIndex] = useState<number>(0);

  const ragaTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const SONG_STORAGE_KEY = 'songSettings';
  useLayoutEffect(() => {
    const stored = getStored<{ baseBPM?: number }>(SONG_STORAGE_KEY, {});
    const stanzaHasTempo = songTempo != null && songTempo >= 30 && songTempo <= 300;
    const storedValid = typeof stored.baseBPM === 'number' && stored.baseBPM >= 30 && stored.baseBPM <= 300;
    const bpm = stanzaHasTempo ? songTempo! : (storedValid ? stored.baseBPM! : 90);
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

  const playNote = (swara: string, durationMs: number): NotePlayer | null => {
    if (!audioContextRef.current || !masterGainRef.current) return null;
    const ragaSwara = convertNoteToRaga(swara, raga);
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
    return (stanza?.tempo != null && stanza.tempo >= 30 && stanza.tempo <= 300)
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

    if (swara === ';') {
      if (lastNotePlayerRef.current && isSineInstrument(instrumentId)) {
        extendNote(lastNotePlayerRef.current, noteDurationMs);
      }
      setCurrentNoteIndex(index);
      timeoutRef.current = setTimeout(() => playNext(index + 1), noteDurationMs);
      return;
    }

    if (!isSineInstrument(instrumentId)) {
      lastNotePlayer = playNote(swara, totalDurationMs);
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

    lastNotePlayer = playNote(swara, noteDurationMs);
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
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    playheadTimeoutsRef.current.forEach((t) => clearTimeout(t));
    playheadTimeoutsRef.current = [];
    lastNotePlayerRef.current = null;
    oscillatorsRef.current.forEach((o) => { try { o.stop(); } catch {} });
    oscillatorsRef.current = [];
    if (soundfontPlayerRef.current) try { soundfontPlayerRef.current.stop(); } catch {};

    if (!isPlayingRef.current) {
      stopRagaPlayback();
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
      const ragaSwara = convertNoteToRaga(swara, stanzaRaga);
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

  const handlePlayRaga = (si: number, stanzaRaga: Raga) => {
    if (ragaPlayingStanzaIdx === si) {
      stopRagaPlayback();
      return;
    }
    if (isPlayingRef.current) stopPlaying();
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

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-12 shadow-2xl border border-slate-700/50">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-accent mb-2 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to songs
              </button>
            )}
            <h1 className="text-3xl md:text-4xl font-light tracking-wide">{song.name}</h1>
            <p className="text-slate-400 text-sm mt-1">{song.composer} · {song.language}</p>
          </div>

          {/* Playback controls - match RagaPlayer style */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={isPlaying ? stopPlaying : startPlaying}
              className={`
                relative w-32 h-32 md:w-40 md:h-40 rounded-full border-2 border-[var(--border)]
                transition-all duration-300 ease-out flex items-center justify-center group
                ${isPlaying
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/50 scale-105 border-[var(--accent)]'
                  : 'bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700'
                }
              `}
            >
              <div className={`absolute inset-0 rounded-full pointer-events-none ${isPlaying ? 'animate-ping opacity-20' : ''} ${isPlaying ? 'bg-amber-400' : ''}`} />
              <svg className={`w-12 h-12 md:w-16 md:h-16 transition-transform duration-300 ${isPlaying ? 'scale-110' : 'scale-100 group-hover:scale-105'}`} fill="currentColor" viewBox="0 0 24 24">
                {isPlaying ? <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /> : <path d="M8 5v14l11-7z" />}
              </svg>
            </button>
            <p className="mt-4 text-slate-400 text-sm">
              {isPlaying ? `Playing at ${baseBPM} BPM` : 'Stopped'}
            </p>
            <div className="mt-4 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <label className="text-sm font-medium text-slate-300">Tempo</label>
                <div className="flex flex-row items-stretch justify-center rounded-lg border border-slate-600 bg-slate-800/30 overflow-hidden w-[280px] divide-x divide-slate-600">
                  <button
                    type="button"
                    onClick={() => { const v = Math.max(30, Math.round(Math.floor(baseBPM / 2) / 5) * 5); handleBaseBPMChange(v); setTempoInputValue(String(v)); }}
                    disabled={baseBPM <= 30}
                    aria-label="Halve tempo"
                    className="flex-1 w-0 h-10 flex items-center justify-center text-xs font-medium text-slate-300 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-slate-500 transition-colors"
                  >
                    ÷2
                  </button>
                  <button
                    type="button"
                    onClick={() => { const v = Math.max(30, baseBPM - 5); handleBaseBPMChange(v); setTempoInputValue(String(v)); }}
                    disabled={baseBPM <= 30}
                    aria-label="Decrease tempo"
                    className="flex-1 w-0 h-10 flex items-center justify-center text-lg text-slate-300 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-slate-500 transition-colors"
                  >
                    −
                  </button>
                  <div className="flex-1 w-0 h-10 px-1 flex items-center justify-center text-sm font-semibold text-slate-900 bg-amber-500">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={tempoInputValue}
                      onFocus={() => setTempoInputValue(String(baseBPM))}
                      onChange={(e) => setTempoInputValue(e.target.value.replace(/\D/g, ''))}
                      onBlur={() => {
                        let n = parseInt(tempoInputValue, 10);
                        if (isNaN(n) || n < 30) n = 30;
                        if (n > 300) n = 300;
                        n = Math.round(n / 5) * 5;
                        handleBaseBPMChange(n);
                        setTempoInputValue(String(n));
                      }}
                      className="w-full text-center text-sm font-semibold bg-transparent outline-none text-inherit"
                      aria-label="Tempo BPM"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { const v = Math.min(300, baseBPM + 5); handleBaseBPMChange(v); setTempoInputValue(String(v)); }}
                    disabled={baseBPM >= 300}
                    aria-label="Increase tempo"
                    className="flex-1 w-0 h-10 flex items-center justify-center text-lg text-slate-300 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-slate-500 transition-colors"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => { const v = Math.min(300, Math.round((baseBPM * 2) / 5) * 5); handleBaseBPMChange(v); setTempoInputValue(String(v)); }}
                    disabled={baseBPM >= 300}
                    aria-label="Double tempo"
                    className="flex-1 w-0 h-10 flex items-center justify-center text-xs font-medium text-slate-300 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-slate-500 transition-colors"
                  >
                    ×2
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Song content - stanzas with notation */}
        <div className="space-y-10">
          {song.stanzas.map((stanza, si) => {
            const stanzaRaga = getRagaByName(stanza.raga) ?? raga;
            const arohana = stanzaRaga.arohana;
            const avarohana = stanzaRaga.avarohana;
            const parsedTala = parseTalaString(stanza.tala);
            const talaDisplay = parsedTala
              ? getTalaDisplayWithFullName(parsedTala.talaName, parsedTala.jatiName)
              : stanza.tala;
            const talaBarInfo = parsedTala ? getTalaAngaBarPositions(parsedTala.talaName, parsedTala.jatiName) : null;
            const isRagaPlaying = ragaPlayingStanzaIdx === si;
            return (
            <div key={si} className="space-y-5">
              {/* Raga & Tala info - detached card, separate from notation */}
              <div className="bg-slate-400/25 dark:bg-slate-600/25 rounded-xl px-5 py-4 border border-gray-500/50 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h3 className="text-base font-semibold text-slate-600 dark:text-slate-300">{stanza.raga}</h3>
                  <button
                    type="button"
                    onClick={() => handlePlayRaga(si, stanzaRaga)}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border-2
                      ${isRagaPlaying
                        ? 'bg-amber-500 text-slate-900 border-amber-600'
                        : 'bg-slate-500/40 dark:bg-slate-600/60 text-slate-200 hover:bg-slate-500/60 border-gray-400'
                      }
                    `}
                    title="Play raga scale (arohana + avarohana)"
                  >
                    {isRagaPlaying ? (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                        Stop
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        Play Raga
                      </>
                    )}
                  </button>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500 dark:text-slate-400 mb-4">
                  <span>Tala: {talaDisplay}</span>
                  {stanza.tempo != null && (
                    <span>Tempo: {stanza.tempo} BPM</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Arohana (Ascending)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {arohana.map((note, i) => {
                        const p = parseVarisaiNote(note);
                        const base = p.swara.charAt(0);
                        const num = p.swara.slice(1);
                        const disp = getSwaraInScript(base, notationLanguage) + num;
                        const isHighlighted = isRagaPlaying && currentRagaNoteIndex === i;
                        return (
                          <span
                            key={i}
                            className={`inline-flex items-center justify-center px-2 py-1 rounded text-sm font-medium relative transition-colors border-2 ${
                              isHighlighted ? 'bg-amber-500 text-slate-900 ring-2 ring-amber-400/50 border-amber-600' : 'bg-slate-500/30 dark:bg-slate-700/50 text-slate-600 dark:text-slate-200 border-gray-400'
                            }`}
                          >
                            {disp}
                            {p.octave === 'higher' && <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[8px]">•</span>}
                            {p.octave === 'lower' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px]">•</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Avarohana (Descending)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {avarohana.map((note, i) => {
                        const p = parseVarisaiNote(note);
                        const base = p.swara.charAt(0);
                        const num = p.swara.slice(1);
                        const disp = getSwaraInScript(base, notationLanguage) + num;
                        const isHighlighted = isRagaPlaying && currentRagaNoteIndex === arohana.length + i;
                        return (
                          <span
                            key={i}
                            className={`inline-flex items-center justify-center px-2 py-1 rounded text-sm font-medium relative transition-colors border-2 ${
                              isHighlighted ? 'bg-amber-500 text-slate-900 ring-2 ring-amber-400/50 border-amber-600' : 'bg-slate-500/30 dark:bg-slate-700/50 text-slate-600 dark:text-slate-200 border-gray-400'
                            }`}
                          >
                            {disp}
                            {p.octave === 'higher' && <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[8px]">•</span>}
                            {p.octave === 'lower' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px]">•</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main content: notation + lyrics (primary focus) */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 dark:bg-slate-900/30 p-6">
                <div className="space-y-4">
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
                      className="flex flex-col gap-1.5 py-3 border-b border-slate-700/40 last:border-0"
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
                          const parsed = parseVarisaiNote(t);
                          const baseSwara = parsed.swara.charAt(0);
                          const displayNote = getSwaraInScript(baseSwara, notationLanguage);
                          return (
                            <button
                              key={ii}
                              type="button"
                              onClick={() => seekToNote(globalIdx)}
                              className={`
                                w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg text-sm sm:text-lg font-semibold relative
                                transition-all cursor-pointer hover:scale-105
                                ${isCurrent
                                  ? 'bg-amber-500 text-slate-900 scale-110 shadow-lg'
                                  : globalIdx < currentNoteIndex && isPlaying
                                    ? 'bg-slate-700/30 text-slate-500'
                                    : 'bg-slate-700/50 text-slate-200 hover:bg-slate-600'
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
            </div>
          );
          })}
        </div>
      </div>
    </div>
  );
}
