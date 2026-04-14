'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { ALL_RAGAS, Raga, getMelakartaByNumber, getRagaById, getRagaByIdOrName, getRagaByName, getSwarafrequency } from '@/data/ragas';
import { parseVarisaiNote } from '@/data/saraliVarisai';
import { getInstrument, freqToNoteNameForInstrument, isSineInstrument, type InstrumentId } from '@/lib/instrumentLoader';
import { type NotationLanguage } from '@/lib/swaraNotation';
import { SwaraGlyph } from '@/components/SwaraGlyph';
import RagaPianoKeyboard from '@/components/RagaPianoKeyboard';
import { midiKeyFrequency } from '@/lib/ragaPianoKeyboard';
import { filterAndSortRagasBySearch } from '@/lib/ragaSearch';
import { getStored, setStored } from '@/lib/storage';
import { DEFAULT_PRACTICE_BPM } from '@/lib/defaultTempo';
import TempoControl from '@/components/TempoControl';



/**
 * Interactive Raga practice component with selectable melakarta ragas, playback controls, and notation display.
 *
 * Renders a UI to select a melakarta raga, control playback (start/stop, loop, tempo), and visualize arohana/avarohana
 * while playing audible notes using either a synth oscillator or a loaded instrument.
 *
 * @param baseFreq - Madhya ṣaḍjam (Hz) for playback; may include vocal octave shift
 * @param pianoLayoutSaFreq - Optional Sa (Hz) for piano key layout only; keeps labels fixed when octave changes
 * @param instrumentId - Instrument identifier to use for playback; sine-based instruments use an internal oscillator,
 *   other values load a soundfont-backed player
 * @param volume - Linear volume in the range [0, 1]; mapped to a perceptual gain curve for audio output
 * @param notationLanguage - Script/notation choice for rendering swara labels in the UI
 * @returns The React element rendering the raga practice interface
 */
function cleanText(s: string): string | null {
  const t = s.trim();
  if (!t || t.toLowerCase() === 'unknown') return null;
  return t;
}

/** UI field labels: title-style casing with small words lowercased (e.g. "Time of day", "Popular janya ragas"). */
const MINOR_LABEL_WORDS = new Set(['a', 'an', 'the', 'of', 'in', 'to', 'for', 'and', 'or', 'at', 'as', 'by']);

function formatUiLabel(s: string): string {
  const words = s.trim().split(/\s+/);
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && MINOR_LABEL_WORDS.has(lower)) {
        return lower;
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Values from JSON (often all-lowercase). Short phrases: capitalize each word.
 * Long sentences: sentence case only (first character), leave rest as in source.
 */
function formatDisplayValue(s: string): string {
  const t = s.trim();
  if (!t) return t;
  if (t.length > 80 || /[.;]/.test(t)) {
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return t
    .split(/\s+/)
    .map((w) => {
      if (!w) return w;
      if (/^\d/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

/** Display raga structure / type with readable casing (e.g. audava-sampoorna → Audava sampoorna). */
function formatStructure(s: string): string {
  return s
    .replace(/-/g, ' ')
    .split(/\s+/)
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

/** Split long prose into blocks of a few sentences for readability. */
function splitProseBlocks(text: string, maxPerBlock = 3): string[] {
  const t = text.trim();
  if (!t) return [];
  if (t.includes('\n\n')) {
    return t.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  }
  const sentences = t.split(/(?<=[.!?])\s+(?=[A-Z(“"'])/).filter((s) => s.trim().length > 0);
  if (sentences.length <= 1) return [t];
  const blocks: string[] = [];
  for (let i = 0; i < sentences.length; i += maxPerBlock) {
    blocks.push(sentences.slice(i, i + maxPerBlock).join(' '));
  }
  return blocks;
}

type LearnSection = 'mood' | 'description' | 'gamaka' | 'features' | 'compositions';

export default function RagaPlayer({
  baseFreq,
  pianoLayoutSaFreq,
  instrumentId = 'piano',
  volume = 0.5,
  notationLanguage = 'english',
  openRagaRequest,
  onOpenRagaRequestConsumed,
}: {
  /** Madhya ṣaḍjam (Hz) for playback and piano key clicks — include vocal octave when used. */
  baseFreq: number;
  /**
   * Sa (Hz) used only to map swaras onto the fixed piano strip (labels + playback highlight).
   * When vocal octave shifts playback pitch, pass the unshifted key reference here so the keyboard
   * layout stays put. Defaults to `baseFreq`.
   */
  pianoLayoutSaFreq?: number;
  instrumentId?: InstrumentId;
  volume?: number;
  notationLanguage?: NotationLanguage;
  /** When `nonce` changes, select that raga (e.g. “raga of the day” navigation). */
  openRagaRequest?: { ragaId: string; nonce: number } | null;
  onOpenRagaRequestConsumed?: () => void;
}) {
  const [selectedRaga, setSelectedRaga] = useState<Raga>(
    ALL_RAGAS.find(r => r.name === 'Mayamalavagowla') || ALL_RAGAS[14]
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [baseBPM, setBaseBPM] = useState(DEFAULT_PRACTICE_BPM);
  const [loop, setLoop] = useState(false); // Loop playback
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [storageReady, setStorageReady] = useState(false);
  const hasLoadedRagaRef = useRef(false);

  // Search/dropdown state for raga selection
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const ragaInfoSectionRef = useRef<HTMLElement | null>(null);
  const prevRagaIdForScrollRef = useRef<string | null>(null);
  const [learnOpen, setLearnOpen] = useState<LearnSection | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);
  const masterGainRef = useRef<GainNode | null>(null);
  const soundfontPlayerRef = useRef<Awaited<ReturnType<typeof getInstrument>> | null>(null);
  const instrumentIdRef = useRef<InstrumentId>(instrumentId);
  const baseFreqRef = useRef(baseFreq);
  const baseBPMRef = useRef(baseBPM);
  const selectedRagaRef = useRef<Raga>(selectedRaga);
  baseFreqRef.current = baseFreq;
  const pianoKeyboardSaHz = pianoLayoutSaFreq ?? baseFreq;
  baseBPMRef.current = baseBPM;
  instrumentIdRef.current = instrumentId;
  selectedRagaRef.current = selectedRaga;

  // Sync sidebar voice volume to master gain when it changes
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = linearToLogGain(volume);
    }
  }, [volume]);

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
        .catch((err) => {
          console.error('Failed to load instrument on change:', err);
          soundfontPlayerRef.current = null;
        });
    } else {
      soundfontPlayerRef.current = null;
    }
  }, [instrumentId]);

  // Load persisted raga practice settings before first paint (avoids flash of defaults)
  const RAGA_STORAGE_KEY = 'ragaSettings';
  type StoredRagaSettings = { ragaId?: string; ragaNumber?: number; loop?: boolean };
  useLayoutEffect(() => {
    const stored = getStored<StoredRagaSettings>(RAGA_STORAGE_KEY, {});
    if (typeof stored.ragaId === 'string' && stored.ragaId) {
      const raga = ALL_RAGAS.find(r => r.ragaId === stored.ragaId);
      if (raga) setSelectedRaga(raga);
    } else if (typeof stored.ragaNumber === 'number') {
      const raga = ALL_RAGAS.find(r => r.number === stored.ragaNumber);
      if (raga) setSelectedRaga(raga);
    }
    if (typeof stored.loop === 'boolean') setLoop(stored.loop);
    hasLoadedRagaRef.current = true;
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedRagaRef.current) return;
    setStored(RAGA_STORAGE_KEY, {
      ragaId: selectedRaga?.ragaId,
      ragaNumber: selectedRaga?.number,
      loop,
    });
  }, [selectedRaga, loop]);

  useEffect(() => {
    if (!openRagaRequest) return;
    const r = getRagaById(openRagaRequest.ragaId);
    if (r) setSelectedRaga(r);
    onOpenRagaRequestConsumed?.();
  }, [openRagaRequest?.nonce, onOpenRagaRequestConsumed]);

  // Get sorted ragas (always alphabetical)
  const sortedRagas = [...ALL_RAGAS].sort((a, b) => a.name.localeCompare(b.name));

  // Filter + rank: primary name, other names, fuzzy (normalized / Levenshtein)
  const filteredRagas = filterAndSortRagasBySearch(sortedRagas, searchQuery);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Convert linear volume (0-1) to logarithmic gain
  const linearToLogGain = (linearValue: number): number => {
    if (linearValue === 0) return 0;
    // Use cubic curve for logarithmic feel: gain = volume^3
    return Math.pow(linearValue, 3);
  };

  const playFrequencyHz = (freq: number, durationMs: number) => {
    if (!audioContextRef.current || !masterGainRef.current) return;

    const now = audioContextRef.current.currentTime;
    const durationSec = durationMs / 1000;
    if (!isSineInstrument(instrumentIdRef.current) && soundfontPlayerRef.current) {
      soundfontPlayerRef.current.start(freqToNoteNameForInstrument(freq, instrumentIdRef.current), now, {
        duration: durationSec,
        gain: 1.5,
      });
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
  };

  const playNote = (swara: string, durationMs: number) => {
    const parsed = parseVarisaiNote(swara);
    let freq = getSwarafrequency(baseFreqRef.current, parsed.swara);
    if (parsed.octave === 'higher') freq = freq * 2;
    else if (parsed.octave === 'lower') freq = freq * 0.5;
    playFrequencyHz(freq, durationMs);
  };

  const playPianoKeyMidi = async (midi: number) => {
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
      if (!isSineInstrument(instrumentIdRef.current)) {
        if (!soundfontPlayerRef.current) {
          try {
            soundfontPlayerRef.current = await getInstrument(
              audioContextRef.current,
              instrumentIdRef.current,
              masterGainRef.current
            );
          } catch (err) {
            console.error('Failed to load instrument:', err);
            return;
          }
        }
      }
      const freq = midiKeyFrequency(baseFreqRef.current, midi);
      const noteDurationMs = (60 / baseBPMRef.current) * 1000;
      playFrequencyHz(freq, noteDurationMs);
    } catch (e) {
      console.error('Piano key playback:', e);
    }
  };

  const playRaga = (startIndex: number = 0) => {
    if (!isPlayingRef.current) return;

    // Play arohana (ascending), then avarohana (descending) with higher Sa played twice
    // arohana: S, R, G, M, P, D, N, S
    // avarohana: S, N, D, P, M, G, R, S
    // Combined: S, R, G, M, P, D, N, S, S, N, D, P, M, G, R, S
    const arohana = selectedRagaRef.current.arohana;
    const avarohana = selectedRagaRef.current.avarohana;
    // Include higher Sa twice (at end of arohana and start of avarohana)
    const notes = [...arohana, ...avarohana];
    const totalNotes = notes.length;

    const playNextNote = (index: number) => {
      if (!isPlayingRef.current) {
        setIsPlaying(false);
        isPlayingRef.current = false;
        return;
      }

      // Read current tempo from refs so changes apply on next note without restart
      const noteDurationMs = (60 / baseBPMRef.current) * 1000; // one note per beat

      // If reached the end, either loop or stop
      if (index >= totalNotes) {
        if (loop) {
          // Loop: restart from beginning
          setCurrentNoteIndex(0);
          const swara = notes[0];
          playNote(swara, noteDurationMs);

          timeoutRef.current = setTimeout(() => {
            playNextNote(1);
          }, noteDurationMs);
        } else {
          // Stop playback
          setIsPlaying(false);
          isPlayingRef.current = false;
          setCurrentNoteIndex(0);
        }
        return;
      }

      setCurrentNoteIndex(index);
      const swara = notes[index];
      playNote(swara, noteDurationMs);

      timeoutRef.current = setTimeout(() => {
        playNextNote(index + 1);
      }, noteDurationMs);
    };

    playNextNote(startIndex);
  };

  const startPlaying = async () => {
    if (isPlayingRef.current) return;

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

      if (!isSineInstrument(instrumentIdRef.current)) {
        try {
          soundfontPlayerRef.current = await getInstrument(
            audioContextRef.current,
            instrumentIdRef.current,
            masterGainRef.current
          );
        } catch (err) {
          console.error('Failed to load instrument:', err);
          setIsPlaying(false);
          isPlayingRef.current = false;
          return;
        }
      }

      isPlayingRef.current = true;
      setIsPlaying(true);
      playRaga(0);
    } catch (error) {
      console.error('Error starting raga playback:', error);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  };

  const stopPlaying = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentNoteIndex(0);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    oscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
      } catch (e) { }
    });
    oscillatorsRef.current = [];

    if (soundfontPlayerRef.current) {
      try {
        soundfontPlayerRef.current.stop();
      } catch (e) { }
      soundfontPlayerRef.current = null;
    }
  };

  // Seek to a specific note index and continue playback from there
  const seekToNote = async (noteIndex: number) => {
    // Clear existing playback timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Stop any currently playing notes
    oscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
      } catch (e) { }
    });
    oscillatorsRef.current = [];

    if (soundfontPlayerRef.current) {
      try {
        soundfontPlayerRef.current.stop();
      } catch (e) { }
    }

    // If not playing, start playback from this note
    if (!isPlayingRef.current) {
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

        if (!isSineInstrument(instrumentIdRef.current)) {
          try {
            soundfontPlayerRef.current = await getInstrument(
              audioContextRef.current,
              instrumentIdRef.current,
              masterGainRef.current
            );
          } catch (err) {
            console.error('Failed to load instrument:', err);
            return;
          }
        }

        isPlayingRef.current = true;
        setIsPlaying(true);
      } catch (error) {
        console.error('Error starting raga playback:', error);
        return;
      }
    }

    // Start playback from the clicked note
    playRaga(noteIndex);
  };

  const handleRagaChange = (ragaName: string) => {
    const raga = getRagaByName(ragaName) ?? ALL_RAGAS.find((r) => r.name === ragaName);
    if (raga) {
      const wasPlaying = isPlayingRef.current;
      if (wasPlaying) {
        stopPlaying();
      }
      setSelectedRaga(raga);
      if (wasPlaying) {
        setTimeout(() => {
          startPlaying();
        }, 100);
      }
    }
  };

  const handleBaseBPMChange = (newBaseBPM: number) => {
    baseBPMRef.current = newBaseBPM;
    setBaseBPM(newBaseBPM);
  };

  useEffect(() => {
    return () => {
      stopPlaying();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => { });
      }
    };
  }, []);

  useEffect(() => {
    setLearnOpen(null);
  }, [selectedRaga.ragaId]);

  useEffect(() => {
    const id = selectedRaga.ragaId;
    if (prevRagaIdForScrollRef.current === null) {
      prevRagaIdForScrollRef.current = id;
      return;
    }
    if (prevRagaIdForScrollRef.current === id) return;
    prevRagaIdForScrollRef.current = id;
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    requestAnimationFrame(() => {
      ragaInfoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [selectedRaga.ragaId]);

  // Notes for display - include higher Sa twice (at end of arohana and start of avarohana)
  const arohana = selectedRaga.arohana;
  const avarohana = selectedRaga.avarohana;
  const playbackNotes = [...arohana, ...avarohana];

  if (!storageReady) {
    return (
      <div className="w-full max-w-4xl mx-auto flex items-center justify-center min-h-[200px]">
        <span className="text-slate-500 text-sm">Loading…</span>
      </div>
    );
  }

  const m = selectedRaga.meta;
  const inventor = cleanText(m.inventor);
  const time = cleanText(m.timeOfDay);
  const hind = cleanText(m.hindustaniEquivalent);
  const west = cleanText(m.westernEquivalent);
  const moodClean = cleanText(m.mood);
  const comps = m.notableCompositions.slice(0, 10);
  const parentMelakartaRaga =
    !m.isMelakarta && m.parentMelakarta != null
      ? getMelakartaByNumber(m.parentMelakarta)
      : undefined;

  const learnToggle = (id: LearnSection) => {
    setLearnOpen((prev) => (prev === id ? null : id));
  };

  const renderRagaInfoContent = () => (
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-slate-50 tracking-tight leading-snug">{selectedRaga.name}</h2>
          {m.otherNames.length > 0 && (
            <p className="text-xs text-slate-500 mt-0.5 leading-snug">
              {formatUiLabel('Also known as')}: {m.otherNames.slice(0, 4).join(' · ')}
              {m.otherNames.length > 4 ? '…' : ''}
            </p>
          )}
          {!m.isMelakarta && m.parentMelakarta != null && parentMelakartaRaga && (
            <button
              type="button"
              onClick={() => handleRagaChange(parentMelakartaRaga.name)}
              className="mt-1 block text-left text-xs font-medium text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded-sm"
            >
              View parent
            </button>
          )}
        </div>
        {(cleanText(m.wikipediaUrl) || cleanText(m.ragasurabhiUrl) || cleanText(m.youtubeUrl)) && (
          <div className="shrink-0 flex flex-col items-end gap-1">
            {cleanText(m.wikipediaUrl) && (
              <a
                href={m.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline"
              >
                Wikipedia ↗
              </a>
            )}
            {cleanText(m.ragasurabhiUrl) && (
              <a
                href={m.ragasurabhiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline"
              >
                Raga Surabhi ↗
              </a>
            )}
            {cleanText(m.youtubeUrl) && (
              <a
                href={m.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline"
              >
                YouTube ↗
              </a>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {m.isMelakarta && m.melakartaNumber != null && (
          <span className="inline-flex rounded-md bg-amber-500 text-neutral-950 border border-amber-600 px-2 py-0.5 text-[11px] font-semibold shadow-sm">
            Melakarta #{m.melakartaNumber}
          </span>
        )}
        {!m.isMelakarta && m.parentMelakarta != null && (
          parentMelakartaRaga ? (
            <span className="inline-flex rounded-md bg-slate-700/90 text-slate-200 border border-slate-600 px-2 py-0.5 text-[11px] font-medium">
              Janya of {parentMelakartaRaga.name}
            </span>
          ) : (
            <span className="inline-flex rounded-md bg-slate-700/90 text-slate-200 border border-slate-600 px-2 py-0.5 text-[11px] font-medium">
              Janya of #{m.parentMelakarta}
            </span>
          )
        )}
        {cleanText(m.chakra) && (
          <span className="inline-flex rounded-md bg-slate-700/60 text-slate-300 border border-slate-600/80 px-2 py-0.5 text-[11px]">
            {formatDisplayValue(m.chakra)} Chakra
          </span>
        )}
        {cleanText(m.ragaType) && (
          <span className="inline-flex rounded-md bg-slate-700/60 text-slate-300 border border-slate-600/80 px-2 py-0.5 text-[11px]">
            {formatStructure(m.ragaType)}
          </span>
        )}
        {m.isVakra && (
          <span className="inline-flex rounded-md bg-slate-700/60 text-slate-300 border border-slate-600/80 px-2 py-0.5 text-[11px]">
            Vakra
          </span>
        )}
        {m.isBhashanga && (
          <span className="inline-flex rounded-md bg-slate-700/60 text-slate-300 border border-slate-600/80 px-2 py-0.5 text-[11px]">
            Bhashanga
          </span>
        )}
      </div>

      {inventor && (
        <div className="mb-3">
          <p className="text-[10px] font-medium text-slate-500 mb-1.5">{formatUiLabel('Inventor')}</p>
          <p className="text-sm text-slate-400 leading-relaxed">{formatDisplayValue(inventor)}</p>
        </div>
      )}

      {time && (
        <div className="mb-3">
          <p className="text-[10px] font-medium text-slate-500 mb-1.5">{formatUiLabel('Time of day')}</p>
          <span className="inline-flex rounded-md bg-slate-700/60 text-slate-300 border border-slate-600/80 px-2 py-0.5 text-[11px]">
            {formatDisplayValue(time)}
          </span>
        </div>
      )}

      {m.rasa.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-medium text-slate-500 mb-1.5">{formatUiLabel('Rasa')}</p>
          <div className="flex flex-wrap gap-1">
            {m.rasa.map((r) => (
              <span
                key={r}
                className="rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/60 px-2 py-0.5 text-[11px]"
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {moodClean && (
        <p className="text-sm text-slate-400 leading-relaxed">
          {moodClean}
        </p>
      )}

      {(hind || west) && (
        <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-1 text-[11px]">
          {hind && (
            <p>
              <span className="text-slate-500">{formatUiLabel('Hindustani equivalent')}: </span>
              <span className="text-slate-300">{formatDisplayValue(hind)}</span>
            </p>
          )}
          {west && (
            <p>
              <span className="text-slate-500">{formatUiLabel('Western equivalent')}: </span>
              <span className="text-slate-300">{formatDisplayValue(west)}</span>
            </p>
          )}
        </div>
      )}

      {m.popularJanyaRagas.length > 0 && m.isMelakarta && (
        <div className="mt-3 pt-3 border-t border-slate-700/60">
          <p className="text-[10px] font-medium text-slate-500 mb-2">{formatUiLabel('Popular janya ragas')}</p>
          <div className="flex flex-wrap gap-1.5">
            {m.popularJanyaRagas.slice(0, 12).map((jn) => {
              const target = getRagaByIdOrName(jn);
              const disabled = !target;
              const label = target?.name ?? jn;
              return (
                <button
                  key={jn}
                  type="button"
                  disabled={disabled}
                  title={disabled ? `${jn} — not found in list` : `Open ${label}`}
                  onClick={() => target && handleRagaChange(target.name)}
                  className={`
                    rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors border
                    ${disabled
                      ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                      : 'border-amber-600/80 bg-amber-600 text-white shadow-sm hover:bg-amber-500 hover:border-amber-400 cursor-pointer'}
                  `}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {m.anyaSwaras.length > 0 && (
        <p className="mt-3 text-[11px] text-slate-500">
          <span className="text-slate-600">{formatUiLabel('Anya swaras')}: </span>
          <span className="text-slate-400">{m.anyaSwaras.join(', ')}</span>
        </p>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto min-w-0">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-2xl sm:rounded-3xl px-4 py-5 sm:px-6 sm:py-7 md:px-8 md:py-8 shadow-2xl border border-slate-700/50 ring-1 ring-white/[0.04]">
        {/* Header */}
        <div className="text-center mb-6 md:mb-7">
          <h1 className="text-3xl md:text-4xl font-light mb-2 tracking-tight text-slate-100">
            Discover ragas
          </h1>
          <p className="text-slate-500 text-sm max-w-xl mx-auto leading-relaxed">
            Search, then use the two columns below — context and controls stay side by side on larger screens.
          </p>
        </div>

        {/* Search — full width of card */}
        <div className="w-full mb-5 md:mb-6">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2.5">
            {formatUiLabel('Find a raga')}
          </label>
          <div className="relative w-full" ref={dropdownRef}>
            {/* Single combobox shell: input + list share one border/radius (no floating gap). */}
            <div
              className={`
                rounded-xl border border-slate-600/80 bg-slate-800/80 shadow-inner overflow-hidden
                ${dropdownOpen ? 'ring-2 ring-amber-500/50 border-amber-500/35' : 'focus-within:ring-2 focus-within:ring-amber-500/60 focus-within:border-amber-500/40'}
              `}
            >
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  autoComplete="off"
                  value={dropdownOpen ? searchQuery : selectedRaga.name}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setSearchQuery('');
                    setDropdownOpen(true);
                  }}
                  placeholder="Type to search…"
                  className="w-full min-w-0 pl-10 pr-4 py-3 border-0 rounded-none bg-transparent text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-0 box-border"
                  aria-expanded={dropdownOpen}
                  aria-controls="raga-search-listbox"
                  aria-autocomplete="list"
                />
              </div>
              {dropdownOpen && (
                <div
                  id="raga-search-listbox"
                  role="listbox"
                  className="scroll-area-transparent border-t border-slate-600/60 max-h-[280px] overflow-y-auto py-1 bg-slate-950/25"
                >
                  {filteredRagas.length > 0 ? (
                    filteredRagas.map((raga) => (
                      <button
                        key={raga.ragaId}
                        type="button"
                        role="option"
                        onClick={() => {
                          handleRagaChange(raga.name);
                          setSearchQuery('');
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        {raga.name}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-sm text-slate-500 text-center">No ragas match</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Two panels: raga info (40%) | play + notes (60%) */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-5 lg:gap-6 items-start">
          <section
            ref={ragaInfoSectionRef}
            className="min-w-0 flex flex-col gap-2 lg:sticky lg:top-6 lg:self-start scroll-mt-6"
            aria-label={formatUiLabel('Raga info')}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {formatUiLabel('Raga info')}
            </p>
            <div
              className="
                rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/95 via-slate-800/75 to-slate-900/95
                shadow-lg shadow-black/25 ring-1 ring-white/[0.04] px-4 py-4 sm:px-5 sm:py-5 min-w-0 overflow-visible
              "
            >
              {renderRagaInfoContent()}
            </div>
          </section>

          <section className="min-w-0 flex flex-col gap-2" aria-label={formatUiLabel('Play and notes')}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {formatUiLabel('Play and notes')}
            </p>
            <div
              className="
                rounded-2xl border border-slate-700/45 bg-slate-900/30 px-3 py-4 sm:px-4 sm:py-4 min-w-0
                shadow-inner ring-1 ring-white/[0.03] flex flex-col gap-0
              "
            >
              {/* Playback */}
              <div className="flex flex-col items-center pb-4">
          <button
            onClick={isPlaying ? stopPlaying : startPlaying}
            className={`
              relative w-32 h-32 md:w-40 md:h-40 rounded-full
              border-2 border-[var(--border)]
              transition-all duration-300 ease-out
              text-white
              ${isPlaying
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/50 scale-105 border-[var(--accent)]'
                : 'bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-slate-100'
              }
              flex items-center justify-center
              group
            `}
          >
            <div className={`
              absolute inset-0 rounded-full pointer-events-none
              ${isPlaying ? 'animate-ping opacity-20' : ''}
              ${isPlaying ? 'bg-amber-400' : ''}
            `} />
            <svg
              className={`w-12 h-12 md:w-16 md:h-16 transition-transform duration-300 ${isPlaying ? 'scale-110' : 'scale-100 group-hover:scale-105'
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

          <p className={`mt-4 text-sm ${isPlaying ? 'text-amber-200/90' : 'text-slate-500'}`}>
            {isPlaying ? `Playing at ${baseBPM} BPM` : 'Stopped'}
          </p>

          {/* Loop Toggle */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <input
              type="checkbox"
              id="loop-toggle"
              checked={loop}
              onChange={(e) => setLoop(e.target.checked)}
              className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
            />
            <label htmlFor="loop-toggle" className="text-slate-300 text-sm cursor-pointer">
              Loop playback
            </label>
          </div>
              </div>

              {/* Tempo — pb leaves a gap above the Notes divider so the bar does not touch the line */}
              <div className="mt-4 border-t border-slate-700/35 pt-6 pb-5">
                <TempoControl value={baseBPM} onChange={handleBaseBPMChange} disabled={false} />
              </div>

              {/* Notes */}
              <div className="border-t border-slate-700/35 pt-5">
                <div className="rounded-xl bg-slate-950/40 border border-slate-700/45 px-3 py-4 sm:px-4 shadow-inner">
          <div className="text-center">
            <h2 className="text-slate-50 text-lg font-semibold mb-1 tracking-tight">Raga notes</h2>
            <p className="text-slate-500 text-xs mb-4">Tap a swara to play from that note</p>

            {/* Arohana (Ascending) */}
            <div className="mb-4">
              <p className="text-slate-400 text-xs font-medium mb-3">Arohana (ascending)</p>
              <div className="grid grid-cols-4 sm:flex sm:flex-wrap sm:justify-center gap-2">
                {arohana.map((note, index) => {
                  const globalIndex = index;
                  const parsed = parseVarisaiNote(note);
                  return (
                    <div
                      key={`arohana-${index}`}
                      onClick={() => seekToNote(globalIndex)}
                      className={`
                        px-4 py-2 rounded-lg text-lg font-semibold relative
                        cursor-pointer hover:scale-105
                        ${isPlaying && globalIndex === currentNoteIndex
                          ? 'bg-amber-500 text-neutral-950 scale-110 shadow-lg ring-1 ring-black/20'
                          : isPlaying && globalIndex < currentNoteIndex
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
                        <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-[6px] text-[10px] leading-none">•</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Avarohana (Descending) */}
            <div>
              <p className="text-slate-400 text-xs font-medium mb-3">Avarohana (descending)</p>
              <div className="grid grid-cols-4 sm:flex sm:flex-wrap sm:justify-center gap-2">
                {avarohana.map((note, index) => {
                  const globalIndex = arohana.length + index;
                  const parsed = parseVarisaiNote(note);
                  return (
                    <div
                      key={`avarohana-${index}`}
                      onClick={() => seekToNote(globalIndex)}
                      className={`
                        px-4 py-2 rounded-lg text-lg font-semibold relative
                        cursor-pointer hover:scale-105
                        ${isPlaying && globalIndex === currentNoteIndex
                          ? 'bg-amber-500 text-neutral-950 scale-110 shadow-lg ring-1 ring-black/20'
                          : isPlaying && globalIndex < currentNoteIndex
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
                        <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-[6px] text-[10px] leading-none">•</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <RagaPianoKeyboard
            baseFreq={pianoKeyboardSaHz}
            raga={selectedRaga}
            notationLanguage={notationLanguage}
            activeNoteString={isPlaying ? playbackNotes[currentNoteIndex] ?? null : null}
            onMidiClick={playPianoKeyMidi}
          />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Learn more — full width of card */}
        <div className="w-full mt-7 lg:mt-8 pt-6 border-t border-slate-700/40">
          <div className="w-full min-w-0 space-y-2 text-left">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
              {formatUiLabel('Learn more')}
            </h3>
            {cleanText(m.mood) && (
              <div className="w-full rounded-xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => learnToggle('mood')}
                  className="w-full min-w-0 flex items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-slate-800/80 transition-colors"
                  aria-expanded={learnOpen === 'mood'}
                >
                  <span>Mood</span>
                  <span className={`text-slate-500 text-xs shrink-0 transition-transform ${learnOpen === 'mood' ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {learnOpen === 'mood' && (
                  <div className="px-4 pb-4 pt-3 border-t border-slate-700/50 space-y-3">
                    {splitProseBlocks(m.mood).map((block, i) => (
                      <p key={i} className="text-sm text-slate-400 leading-relaxed">
                        {block}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {cleanText(m.description) && (
              <div className="w-full rounded-xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => learnToggle('description')}
                  className="w-full min-w-0 flex items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-slate-800/80 transition-colors"
                  aria-expanded={learnOpen === 'description'}
                >
                  <span>Description</span>
                  <span className={`text-slate-500 text-xs shrink-0 transition-transform ${learnOpen === 'description' ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {learnOpen === 'description' && (
                  <div className="px-4 pb-4 pt-3 border-t border-slate-700/50 space-y-3 max-h-[min(60vh,28rem)] overflow-y-auto scroll-area-transparent">
                    {splitProseBlocks(m.description).map((block, i) => (
                      <p key={i} className="text-sm text-slate-400 leading-relaxed">
                        {block}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {cleanText(m.gamakaUsage) && (
              <div className="w-full rounded-xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => learnToggle('gamaka')}
                  className="w-full min-w-0 flex items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-slate-800/80 transition-colors"
                  aria-expanded={learnOpen === 'gamaka'}
                >
                  <span>Gamaka &amp; phrasing</span>
                  <span className={`text-slate-500 text-xs shrink-0 transition-transform ${learnOpen === 'gamaka' ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {learnOpen === 'gamaka' && (
                  <div className="px-4 pb-4 pt-3 border-t border-slate-700/50 space-y-3 max-h-[min(50vh,24rem)] overflow-y-auto scroll-area-transparent">
                    {splitProseBlocks(m.gamakaUsage).map((block, i) => (
                      <p key={i} className="text-sm text-slate-400 leading-relaxed">
                        {block}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {cleanText(m.notableFeatures) && (
              <div className="w-full rounded-xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => learnToggle('features')}
                  className="w-full min-w-0 flex items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-slate-800/80 transition-colors"
                  aria-expanded={learnOpen === 'features'}
                >
                  <span>Notable features</span>
                  <span className={`text-slate-500 text-xs shrink-0 transition-transform ${learnOpen === 'features' ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {learnOpen === 'features' && (
                  <div className="px-4 pb-4 pt-3 border-t border-slate-700/50 space-y-3">
                    {splitProseBlocks(m.notableFeatures).map((block, i) => (
                      <p key={i} className="text-sm text-slate-500 leading-relaxed">
                        {block}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {comps.length > 0 && (
              <div className="w-full rounded-xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => learnToggle('compositions')}
                  className="w-full min-w-0 flex items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-slate-800/80 transition-colors"
                  aria-expanded={learnOpen === 'compositions'}
                >
                  <span>Notable compositions</span>
                  <span className={`text-slate-500 text-xs shrink-0 transition-transform ${learnOpen === 'compositions' ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {learnOpen === 'compositions' && (
                  <ul className="px-4 pb-4 pt-3 border-t border-slate-700/50 space-y-2.5 list-none">
                    {comps.map((c, i) => (
                      <li key={`${c.name}-${i}`} className="text-sm">
                        <span className="text-slate-300">{c.name}</span>
                        {c.composer && <span className="text-slate-500"> — {c.composer}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}