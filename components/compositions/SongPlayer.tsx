'use client';

import { PlaybackButton } from '@/components/ui/Button';

import TempoControl from '@/components/ui/TempoControl';
import { Disclosure } from '@/components/ui/Disclosure';
import { RagaReferenceCard, TalaReferenceCard } from './CompositionReference';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { parseVarisaiNote } from '@/data/exercises/saraliVarisai';
import { Raga, getSwarafrequency } from '@/data/ragas';
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
  beatsPerCycleFromParsedTala,
  barPositionsFromParsedTala,
  primaryLabelFromParsedTala,
  oneLineSummaryFromParsedTala,
  metronomeBpmForParsedTala,
  type ParsedTala,
} from '@/data/talas';
import { useMetronome } from '@/hooks/useMetronome';
import { resolveStanzaRaga, type Song } from '@/data/songs/index';
import { humanizeStanzaHeading } from '@/data/compositions/index';

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

type SongPlayerProps = {
  song: Song;
  baseFreq: number;
  instrumentId?: InstrumentId;
  volume?: number;
  notationLanguage?: NotationLanguage;
};

export default function SongPlayer({
  song,
  baseFreq,
  instrumentId = 'violin',
  volume = 0.8,
  notationLanguage = 'english',
}: SongPlayerProps) {
  const raga: Raga = resolveStanzaRaga(song.stanzas[0]);
  const playableNotes = flattenSongToNotes(song);

  const songTempo = song.stanzas[0]?.tempo;
  const metronome = useMetronome();
  const [isPlaying, setIsPlaying] = useState(false);
  const [baseBPM, setBaseBPM] = useState(DEFAULT_PRACTICE_BPM);
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
    const stanzaHasTempo =
      songTempo != null && songTempo >= 30 && songTempo <= PRACTICE_TEMPO_MAX_BPM;
    const storedValid =
      typeof stored.baseBPM === 'number' &&
      stored.baseBPM >= 30 &&
      stored.baseBPM <= PRACTICE_TEMPO_MAX_BPM;
    const bpm = stanzaHasTempo ? songTempo! : storedValid ? stored.baseBPM! : DEFAULT_PRACTICE_BPM;
    setBaseBPM(bpm);

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
  const lastNotePlayerRef = useRef<{
    osc?: OscillatorNode;
    gain?: GainNode;
    stopTime: number;
    extend?(d: number): void;
  } | null>(null);
  baseFreqRef.current = baseFreq;
  baseBPMRef.current = baseBPM;

  useEffect(() => {
    metronome.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (talaPlayingStanzaIdx === null) return;
    const st = song.stanzas[talaPlayingStanzaIdx];
    const quarterBpm = baseBPM;
    const parsed = parseTalaString(st?.tala ?? '');
    const metroBpm = parsed ? metronomeBpmForParsedTala(parsed, quarterBpm) : quarterBpm;
    metronome.setTempo(metroBpm);
  }, [baseBPM, talaPlayingStanzaIdx, song.stanzas]);

  const stopTalaPlayback = () => {
    metronome.stop();
    setTalaPlayingStanzaIdx(null);
    setCurrentTalaBeat(-1);
  };

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

  interface NotePlayer {
    osc?: OscillatorNode;
    gain?: GainNode;
    stopTime: number;
    extend?(additionalDuration: number): void;
  }

  const playNote = (swara: string, durationMs: number, stanzaIdx?: number): NotePlayer | null => {
    if (!audioContextRef.current || !masterGainRef.current) return null;
    const ragaForNote =
      stanzaIdx !== undefined && song.stanzas[stanzaIdx]
        ? resolveStanzaRaga(song.stanzas[stanzaIdx])
        : raga;
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
        get stopTime() {
          return state.stopTime;
        },
        extend(additionalDuration: number) {
          if (!soundfontPlayerRef.current) return;
          soundfontPlayerRef.current.start(noteName, state.stopTime, {
            duration: additionalDuration / 1000,
            gain: 1.5,
          });
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
    try {
      notePlayer.osc.stop(newStop);
    } catch {}
    notePlayer.stopTime = newStop;
  };

  const playFromIndex = (index: number) => {
    if (!isPlayingRef.current || index >= playableNotes.length) return;
    /** Practice tempo control always drives playback; stanza `tempo` is only the initial default & display. */
    const bpm = baseBPMRef.current;
    const noteDurationMs = (60 / bpm) * 1000;
    const { swara } = playableNotes[index];
    let lastNotePlayer: NotePlayer | null = null;

    const playNext = (nextIdx: number) => {
      if (!isPlayingRef.current) return;
      if (nextIdx >= playableNotes.length) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setCurrentNoteIndex(0);
        return;
      }
      playFromIndex(nextIdx);
    };

    const countTiesAhead = () => {
      let c = 0;
      while (index + 1 + c < playableNotes.length && playableNotes[index + 1 + c].swara === ';')
        c++;
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
        setTimeout(
          () => {
            if (lastNotePlayerRef.current && isPlayingRef.current) {
              extendNote(lastNotePlayerRef.current, noteDurationMs);
            }
          },
          noteDurationMs * i - 60,
        );
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
          masterGainRef.current,
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
    oscillatorsRef.current.forEach((o) => {
      try {
        o.stop();
      } catch {}
    });
    oscillatorsRef.current = [];
    if (soundfontPlayerRef.current) {
      try {
        soundfontPlayerRef.current.stop();
      } catch {}
    }
  };

  const seekToNote = async (idx: number) => {
    stopTalaPlayback();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    playheadTimeoutsRef.current.forEach((t) => clearTimeout(t));
    playheadTimeoutsRef.current = [];
    lastNotePlayerRef.current = null;
    oscillatorsRef.current.forEach((o) => {
      try {
        o.stop();
      } catch {}
    });
    oscillatorsRef.current = [];
    if (soundfontPlayerRef.current)
      try {
        soundfontPlayerRef.current.stop();
      } catch {}

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
            masterGainRef.current,
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

  useEffect(
    () => () => {
      stopPlaying();
      stopRagaPlayback();
      stopTalaPlayback();
      audioContextRef.current?.close().catch(() => {});
    },
    [],
  );

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
          masterGainRef.current!,
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
    oscillatorsRef.current.forEach((o) => {
      try {
        o.stop();
      } catch {}
    });
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
    const quarterBpm = baseBPMRef.current;
    const metroBpm = metronomeBpmForParsedTala(parsed, quarterBpm);
    try {
      await metronome.start(pattern, metroBpm, (beatIndex) => {
        setCurrentTalaBeat(beatIndex);
      });
      metronome.setVolume(volume);
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
    startIdx: number,
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

  /** Match one tala cycle per row on large screens (e.g. 8 columns for Adi / chatusra Triputa). */
  function songNotationContainerClass(parsedTala: ParsedTala | null): string {
    if (!parsedTala || parsedTala.kind === 'tuplet_even') {
      return 'flex flex-wrap items-center gap-1';
    }
    const cycle = beatsPerCycleFromParsedTala(parsedTala);
    if (cycle >= 8) {
      return 'grid w-full grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1 sm:gap-2 justify-items-center';
    }
    if (cycle === 6) {
      return 'grid w-full grid-cols-3 md:grid-cols-6 gap-1 sm:gap-2 justify-items-center';
    }
    return 'grid w-full grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2 justify-items-center';
  }

  // Build a flat list for display with note indices per line
  const lineDisplay: { stanzaIdx: number; lineIdx: number; startIdx: number; tokens: string[] }[] =
    [];
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
  const headerParsedTala = headerFirstStanza ? parseTalaString(headerFirstStanza.tala) : null;
  const ragaVariesByStanza = song.stanzas.some(
    (stanza) => resolveStanzaRaga(stanza).ragaId !== headerRaga.ragaId,
  );
  const referenceVariesByStanza =
    ragaVariesByStanza || song.stanzas.some((stanza) => stanza.tala !== headerFirstStanza?.tala);

  return (
    <div className="w-full min-w-0">
      <div className="feature-panel">
        <div className="playback-toolbar">
          <PlaybackButton
            label="composition"
            playing={isPlaying}
            onClick={isPlaying ? stopPlaying : startPlaying}
          />
          <TempoControl value={baseBPM} onChange={handleBaseBPMChange} />
        </div>
        <p className="composition-meta">
          {ragaVariesByStanza ? 'Ragamalika' : headerRaga.name}
          {headerParsedTala && ` · ${oneLineSummaryFromParsedTala(headerParsedTala)}`}
        </p>
        {referenceVariesByStanza ? (
          <p className="composition-meta">
            Open each section’s reference to hear its raga and tala.
          </p>
        ) : (
          <Disclosure title="Raga & tala reference" className="composition-reference">
            <div className="composition-reference-grid">
              <RagaReferenceCard
                raga={headerRaga}
                language={notationLanguage}
                playing={ragaPlayingStanzaIdx === 0}
                activeIndex={currentRagaNoteIndex}
                onToggle={() => handlePlayRaga(0, headerRaga)}
              />
              <TalaReferenceCard
                parsed={headerParsedTala}
                fallback={headerFirstStanza?.tala ?? ''}
                playing={talaPlayingStanzaIdx === 0}
                activeIndex={currentTalaBeat}
                tempo={headerFirstStanza?.tempo}
                onToggle={() => void handlePlayTala(0)}
              />
            </div>
          </Disclosure>
        )}

        {/* Stanzas */}
        <div className="space-y-12">
          {song.stanzas.map((stanza, si) => {
            const stanzaRaga = resolveStanzaRaga(stanza);
            const parsedTala = parseTalaString(stanza.tala);
            const talaDisplayShort = parsedTala
              ? primaryLabelFromParsedTala(parsedTala)
              : stanza.tala;
            const talaBarInfo = parsedTala ? barPositionsFromParsedTala(parsedTala) : null;
            const notationContainerClass = songNotationContainerClass(parsedTala);
            const useTalaNotationGrid = notationContainerClass.startsWith('grid');
            const isRagaPlaying = ragaPlayingStanzaIdx === si;
            const isTalaPlaying = talaPlayingStanzaIdx === si;
            const stanzaHeading =
              stanza.section_name != null && stanza.section_name !== ''
                ? humanizeStanzaHeading(stanza.section_name)
                : `Part ${si + 1}`;

            return (
              <section key={si} className="composition-stanza">
                {song.stanzas.length > 1 && (
                  <h3 className="composition-stanza-heading">{stanzaHeading}</h3>
                )}
                {referenceVariesByStanza && (
                  <Disclosure
                    title={`${stanzaRaga.name} · ${talaDisplayShort}`}
                    className="stanza-reference"
                  >
                    <div className="composition-reference-grid">
                      <RagaReferenceCard
                        raga={stanzaRaga}
                        language={notationLanguage}
                        playing={isRagaPlaying}
                        activeIndex={currentRagaNoteIndex}
                        onToggle={() => handlePlayRaga(si, stanzaRaga)}
                      />
                      <TalaReferenceCard
                        parsed={parsedTala}
                        fallback={stanza.tala}
                        playing={isTalaPlaying}
                        activeIndex={currentTalaBeat}
                        tempo={stanza.tempo}
                        onToggle={() => void handlePlayTala(si)}
                      />
                    </div>
                  </Disclosure>
                )}

                {/* Notation + lyrics */}
                <div className="border-t border-line/45 bg-surface/35 px-3 sm:px-6 py-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted mb-4">
                    Notation
                  </p>
                  <div className="divide-y divide-line/40">
                    {stanza.lines.map((line, li) => {
                      const entry = lineDisplay.find((e) => e.stanzaIdx === si && e.lineIdx === li);
                      if (!entry) return null;
                      const { startIdx, tokens } = entry;
                      const items = tokensWithBarLines(tokens, talaBarInfo, startIdx);
                      return (
                        <div key={li} className="flex flex-col gap-2 py-4 first:pt-0">
                          <div className={notationContainerClass}>
                            {useTalaNotationGrid
                              ? tokens.map((t, ii) => {
                                  const globalIdx = startIdx + ii;
                                  const isCurrent = isPlaying && globalIdx === currentNoteIndex;
                                  if (t === ';') {
                                    return (
                                      <button
                                        key={ii}
                                        type="button"
                                        onClick={() => seekToNote(globalIdx)}
                                        className={`
                                      shrink-0 w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg text-sm sm:text-lg font-semibold
                                      transition-all cursor-pointer hover:scale-105
                                      ${
                                        isCurrent
                                          ? 'bg-accent text-on-accent scale-110 shadow-lg'
                                          : globalIdx < currentNoteIndex && isPlaying
                                            ? 'bg-subtle/30 text-muted'
                                            : 'bg-subtle/50 text-ink hover:bg-line'
                                      }
                                    `}
                                      >
                                        —
                                      </button>
                                    );
                                  }
                                  const disp = parseVarisaiNote(
                                    resolveSwaraTokenForRaga(t, stanzaRaga),
                                  );
                                  return (
                                    <button
                                      key={ii}
                                      type="button"
                                      onClick={() => seekToNote(globalIdx)}
                                      className={`
                                    shrink-0 w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center py-px rounded-lg text-sm sm:text-lg font-semibold
                                    transition-all cursor-pointer hover:scale-105 min-w-0
                                    ${
                                      isCurrent
                                        ? 'bg-accent text-on-accent scale-110 shadow-lg'
                                        : globalIdx < currentNoteIndex && isPlaying
                                          ? 'bg-subtle/30 text-muted'
                                          : 'bg-subtle/50 text-ink hover:bg-line'
                                    }
                                  `}
                                    >
                                      <SwaraInNoteChip
                                        swara={disp.swara}
                                        language={notationLanguage}
                                        octave={disp.octave}
                                      />
                                    </button>
                                  );
                                })
                              : items.map((item, ii) => {
                                  if ('bar' in item) {
                                    return (
                                      <span
                                        key={`bar-${ii}`}
                                        className="inline-block w-px h-10 sm:h-12 mx-1 flex-shrink-0 bg-muted"
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
                                  ${
                                    isCurrent
                                      ? 'bg-accent text-on-accent scale-110 shadow-lg'
                                      : globalIdx < currentNoteIndex && isPlaying
                                        ? 'bg-subtle/30 text-muted'
                                        : 'bg-subtle/50 text-ink hover:bg-line'
                                  }
                                `}
                                      >
                                        —
                                      </button>
                                    );
                                  }
                                  const disp = parseVarisaiNote(
                                    resolveSwaraTokenForRaga(t, stanzaRaga),
                                  );
                                  return (
                                    <button
                                      key={ii}
                                      type="button"
                                      onClick={() => seekToNote(globalIdx)}
                                      className={`
                                w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center py-px rounded-lg text-sm sm:text-lg font-semibold
                                transition-all cursor-pointer hover:scale-105 min-w-0
                                ${
                                  isCurrent
                                    ? 'bg-accent text-on-accent scale-110 shadow-lg'
                                    : globalIdx < currentNoteIndex && isPlaying
                                      ? 'bg-subtle/30 text-muted'
                                      : 'bg-subtle/50 text-ink hover:bg-line'
                                }
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
                          <p className="text-[var(--text-primary)] text-base sm:text-lg font-medium leading-relaxed">
                            {line.lyrics}
                          </p>
                          {line.translation && (
                            <p
                              className="text-muted dark:text-muted text-sm italic pl-0.5"
                              aria-label="Translation"
                            >
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
