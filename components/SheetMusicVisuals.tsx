'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  playMidiNote,
  playMidiChord,
  playMidiSequence,
  playChordSequence,
  stopPlayback,
  type SeqNote,
  type ChordSeqItem,
} from '@/lib/sheetMusicAudio';

/* ───────────────────────────── helpers ───────────────────────────── */

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

function midiLabel(midi: number): string {
  return NOTE_NAMES[((midi % 12) + 12) % 12];
}

/* ───────────────────────────── PlayBtn ────────────────────────────── */

export function PlayBtn({
  onClick,
  label,
  playing = false,
  loading = false,
  small = false,
}: {
  onClick: () => void;
  label: string;
  playing?: boolean;
  loading?: boolean;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`
        inline-flex items-center gap-1.5 rounded-lg font-semibold transition
        ${small ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-xs'}
        ${playing
          ? 'bg-red-500/90 text-white hover:bg-red-400'
          : loading
            ? 'bg-slate-600 text-slate-400 cursor-wait'
            : 'bg-amber-500/90 text-slate-900 hover:bg-amber-400'
        }
      `}
    >
      {playing ? (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      )}
      {label}
    </button>
  );
}

/* ────────────────────── NoteSequencePlayer ───────────────────────── */

type NoteItem = { midi: number; label: string };

export function NoteSequencePlayer({
  notes,
  title,
  intervalMs = 400,
}: {
  notes: NoteItem[];
  title: string;
  intervalMs?: number;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => () => stopPlayback(), []);

  const handlePlay = useCallback(async () => {
    if (state === 'playing') { stopPlayback(); setState('idle'); setActiveIdx(-1); return; }
    setState('loading');
    await playMidiSequence(
      notes.map((n) => ({ midi: n.midi })),
      intervalMs,
      (i) => { setState('playing'); setActiveIdx(i); },
    );
    setState('idle');
    setActiveIdx(-1);
  }, [notes, intervalMs, state]);

  return (
    <div className="my-6 rounded-xl bg-slate-800/50 border border-slate-600/30 p-4">
      <div className="flex items-center gap-3 mb-3">
        <PlayBtn onClick={handlePlay} label={state === 'loading' ? 'Loading…' : state === 'playing' ? 'Stop' : 'Play'} playing={state === 'playing'} loading={state === 'loading'} />
        <span className="text-sm text-slate-300 font-medium">{title}</span>
      </div>
      <div className="flex gap-1 flex-wrap">
        {notes.map((n, i) => (
          <button
            key={i}
            type="button"
            onClick={() => playMidiNote(n.midi, 600)}
            className={`
              px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer
              ${i === activeIdx
                ? 'bg-amber-500 text-slate-900 scale-110 shadow-lg shadow-amber-500/30'
                : 'bg-slate-700/80 text-slate-200 hover:bg-slate-600'
              }
            `}
          >
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────── ChordBank ─────────────────────────────────── */

export function ChordBank({
  chords,
  title,
}: {
  chords: { label: string; midis: number[]; desc?: string }[];
  title: string;
}) {
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  return (
    <div className="my-6 rounded-xl bg-slate-800/50 border border-slate-600/30 p-4">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">{title}</p>
      <div className="flex flex-wrap gap-2">
        {chords.map((ch) => (
          <button
            key={ch.label}
            type="button"
            onClick={async () => {
              setActiveLabel(ch.label);
              await playMidiChord(ch.midis, 1500);
              setTimeout(() => setActiveLabel(null), 1500);
            }}
            className={`
              flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition
              ${activeLabel === ch.label
                ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30'
                : 'bg-slate-700/80 text-slate-200 hover:bg-slate-600'
              }
            `}
          >
            <span className="text-xs font-bold">{ch.label}</span>
            {ch.desc && <span className="text-[10px] opacity-75">{ch.desc}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────── IntervalGrid ────────────────────────────────── */

export function IntervalGrid({ rootMidi = 60 }: { rootMidi?: number }) {
  const [activeIdx, setActiveIdx] = useState(-1);

  const intervals = [
    { name: 'min 2nd', semi: 1 }, { name: 'Maj 2nd', semi: 2 },
    { name: 'min 3rd', semi: 3 }, { name: 'Maj 3rd', semi: 4 },
    { name: 'Perf 4th', semi: 5 }, { name: 'Tritone', semi: 6 },
    { name: 'Perf 5th', semi: 7 }, { name: 'min 6th', semi: 8 },
    { name: 'Maj 6th', semi: 9 }, { name: 'min 7th', semi: 10 },
    { name: 'Maj 7th', semi: 11 }, { name: 'Octave', semi: 12 },
  ];

  return (
    <div className="my-6 rounded-xl bg-slate-800/50 border border-slate-600/30 p-4">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">
        Play intervals from {midiLabel(rootMidi)}
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {intervals.map((iv, i) => (
          <button
            key={iv.semi}
            type="button"
            onClick={async () => {
              setActiveIdx(i);
              await playMidiNote(rootMidi, 500);
              await new Promise((r) => setTimeout(r, 500));
              await playMidiNote(rootMidi + iv.semi, 800);
              setTimeout(() => setActiveIdx(-1), 800);
            }}
            className={`
              flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 transition
              ${i === activeIdx
                ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30'
                : 'bg-slate-700/80 text-slate-200 hover:bg-slate-600'
              }
            `}
          >
            <span className="text-[11px] font-bold">{iv.name}</span>
            <span className="text-[9px] opacity-70">{iv.semi} half steps</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ──────────────── ProgressionPlayer ──────────────────────────────── */

export function ProgressionPlayer({
  progressions,
  title = 'Play chord progressions',
}: {
  progressions: { label: string; chords: ChordSeqItem[] }[];
  title?: string;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [activeProgIdx, setActiveProgIdx] = useState(-1);
  const [activeChordIdx, setActiveChordIdx] = useState(-1);

  useEffect(() => () => stopPlayback(), []);

  const handlePlay = useCallback(async (progIdx: number) => {
    if (state === 'playing') { stopPlayback(); setState('idle'); setActiveProgIdx(-1); setActiveChordIdx(-1); return; }
    setState('loading');
    setActiveProgIdx(progIdx);
    await playChordSequence(
      progressions[progIdx].chords,
      900,
      (i) => { setState('playing'); setActiveChordIdx(i); },
    );
    setState('idle');
    setActiveProgIdx(-1);
    setActiveChordIdx(-1);
  }, [progressions, state]);

  return (
    <div className="my-6 rounded-xl bg-slate-800/50 border border-slate-600/30 p-4">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-3">
        {progressions.map((prog, pi) => (
          <div key={prog.label} className="flex items-center gap-3">
            <PlayBtn
              onClick={() => handlePlay(pi)}
              label={state === 'loading' && activeProgIdx === pi ? 'Loading…' : state === 'playing' && activeProgIdx === pi ? 'Stop' : prog.label}
              playing={state === 'playing' && activeProgIdx === pi}
              loading={state === 'loading' && activeProgIdx === pi}
              small
            />
            <div className="flex gap-1 flex-wrap">
              {prog.chords.map((ch, ci) => (
                <span
                  key={ci}
                  className={`
                    px-2 py-1 rounded text-[11px] font-bold transition-all
                    ${activeProgIdx === pi && ci === activeChordIdx
                      ? 'bg-amber-500 text-slate-900 scale-105 shadow-md shadow-amber-500/25'
                      : 'bg-slate-700/60 text-slate-300'
                    }
                  `}
                >
                  {ch.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────── StaffDiagram ─────────────────────────────────── */

type StaffNoteSpec = {
  position: number;
  label: string;
  color?: string;
  midi?: number;
};

export function StaffDiagram({
  clef,
  notes = [],
  caption,
  width: svgW,
}: {
  clef: 'treble' | 'bass';
  notes?: StaffNoteSpec[];
  caption?: string;
  width?: number;
}) {
  const hasAudio = notes.some((n) => n.midi != null);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [seqState, setSeqState] = useState<'idle' | 'loading' | 'playing'>('idle');

  useEffect(() => () => { if (hasAudio) stopPlayback(); }, [hasAudio]);

  const handlePlayAll = useCallback(async () => {
    if (seqState === 'playing') { stopPlayback(); setSeqState('idle'); setActiveIdx(-1); return; }
    const playable = notes.filter((n) => n.midi != null);
    if (!playable.length) return;
    setSeqState('loading');
    await playMidiSequence(
      playable.map((n) => ({ midi: n.midi! })),
      450,
      (i) => {
        setSeqState('playing');
        const originalIdx = i >= 0 ? notes.indexOf(playable[i]) : -1;
        setActiveIdx(originalIdx);
      },
    );
    setSeqState('idle');
    setActiveIdx(-1);
  }, [notes, seqState]);

  const LINE_SP = 10;
  const STAFF_BOTTOM = 60;
  const lineY = (line: number) => STAFF_BOTTOM - line * LINE_SP;
  const posY = (pos: number) => STAFF_BOTTOM - pos * (LINE_SP / 2);

  const noteStartX = 54;
  const noteSpacing = Math.max(34, Math.min(46, 380 / Math.max(notes.length, 1)));
  const W = svgW ?? Math.max(200, noteStartX + notes.length * noteSpacing + 20);

  const clefCode = clef === 'treble' ? 0xe050 : 0xe062;
  const clefY = clef === 'treble' ? lineY(1) + 8 : lineY(3) + 5;
  const clefSize = clef === 'treble' ? 38 : 30;

  return (
    <div className="my-4">
      {hasAudio && (
        <div className="mb-2">
          <PlayBtn
            onClick={handlePlayAll}
            label={seqState === 'loading' ? 'Loading…' : seqState === 'playing' ? 'Stop' : 'Play'}
            playing={seqState === 'playing'}
            loading={seqState === 'loading'}
            small
          />
        </div>
      )}
      <svg viewBox={`0 -20 ${W} 120`} className="w-full" role="img" aria-label={caption ?? 'Staff diagram'}>
        {[0, 1, 2, 3, 4].map((l) => (
          <line key={l} x1="0" y1={lineY(l)} x2={W} y2={lineY(l)} stroke="#64748b" strokeWidth="1" />
        ))}
        <text
          x="12"
          y={clefY}
          style={{ fontFamily: '"Bravura", "Bravura Text", serif' }}
          fontSize={clefSize}
          fill="#94a3b8"
        >
          {String.fromCodePoint(clefCode)}
        </text>

        {notes.map((n, i) => {
          const x = noteStartX + i * noteSpacing;
          const y = posY(n.position);
          const ledgerLines: number[] = [];
          if (n.position < 0) for (let p = -2; p >= n.position; p -= 2) ledgerLines.push(posY(p));
          if (n.position > 8) for (let p = 10; p <= n.position; p += 2) ledgerLines.push(posY(p));
          const isActive = i === activeIdx;
          const baseColor = n.color ?? '#f59e0b';
          const fillColor = isActive ? '#ffffff' : baseColor;
          const clickable = n.midi != null;
          const stemUp = n.position < 4;
          const stemX = stemUp ? x + 5.5 : x - 5.5;
          const stemY1 = y;
          const stemY2 = stemUp ? y - 28 : y + 28;
          const hasSharp = n.label.includes('♯') || n.label.includes('#');
          const hasFlat = n.label.includes('♭');
          const accCode = hasSharp ? 0xe262 : hasFlat ? 0xe260 : 0;
          return (
            <g
              key={i}
              className={clickable ? 'cursor-pointer' : undefined}
              onClick={clickable ? () => { playMidiNote(n.midi!, 600); } : undefined}
            >
              {ledgerLines.map((ly) => (
                <line key={ly} x1={x - 11} y1={ly} x2={x + 11} y2={ly} stroke="#64748b" strokeWidth="1" />
              ))}
              {isActive && (
                <circle cx={x} cy={y} r={12} fill={baseColor} opacity={0.25} />
              )}
              {accCode > 0 && (
                <text
                  x={x - 12}
                  y={y + (hasSharp ? 5.5 : 3)}
                  style={{ fontFamily: '"Bravura", "Bravura Text", serif' }}
                  fontSize={hasSharp ? 16 : 18}
                  fill={fillColor}
                  textAnchor="middle"
                >
                  {String.fromCodePoint(accCode)}
                </text>
              )}
              <ellipse
                cx={x}
                cy={y}
                rx={5.5}
                ry={4}
                fill={fillColor}
                transform={`rotate(-18 ${x} ${y})`}
              />
              <line x1={stemX} y1={stemY1} x2={stemX} y2={stemY2} stroke={fillColor} strokeWidth="1" strokeLinecap="round" />
              <text x={x} y={y + (stemUp ? 16 : -10)} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
      {caption && <p className="text-[11px] text-slate-500 mt-1 text-center italic">{caption}</p>}
    </div>
  );
}

/* ──────────────── AccidentalsOnStaff ─────────────────────────── */

const SMUFL_SHARP = 0xe262;
const SMUFL_FLAT = 0xe260;
const SMUFL_NATURAL = 0xe261;
const SMUFL_DOUBLE_SHARP = 0xe263;
const SMUFL_DOUBLE_FLAT = 0xe264;

export function AccidentalsOnStaff() {
  const LINE_SP = 10;
  const STAFF_BOTTOM = 60;
  const lineY = (line: number) => STAFF_BOTTOM - line * LINE_SP;
  const posY = (pos: number) => STAFF_BOTTOM - pos * (LINE_SP / 2);
  const W = 380;

  const bravuraStyle = { fontFamily: '"Bravura", "Bravura Text", serif' } as const;

  const examples: {
    noteX: number;
    pos: number;
    accidentalCode: number;
    accidentalLabel: string;
    noteLabel: string;
    accSize: number;
    accDx: number;
    accDy: number;
  }[] = [
    { noteX: 62, pos: 0, accidentalCode: SMUFL_SHARP, accidentalLabel: 'Sharp', noteLabel: 'F♯', accSize: 18, accDx: -18, accDy: 6 },
    { noteX: 120, pos: 4, accidentalCode: SMUFL_FLAT, accidentalLabel: 'Flat', noteLabel: 'B♭', accSize: 20, accDx: -17, accDy: 3 },
    { noteX: 178, pos: 0, accidentalCode: SMUFL_NATURAL, accidentalLabel: 'Natural', noteLabel: 'F♮', accSize: 18, accDx: -17, accDy: 6 },
    { noteX: 240, pos: 0, accidentalCode: SMUFL_DOUBLE_SHARP, accidentalLabel: 'Double sharp', noteLabel: 'F𝄪', accSize: 14, accDx: -16, accDy: 5 },
    { noteX: 310, pos: 4, accidentalCode: SMUFL_DOUBLE_FLAT, accidentalLabel: 'Double flat', noteLabel: 'B𝄫', accSize: 20, accDx: -20, accDy: 3 },
  ];

  return (
    <div className="my-5 rounded-xl bg-slate-800/50 border border-slate-600/30 p-4">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Accidentals on the staff</p>
      <svg viewBox={`0 0 ${W} 90`} className="w-full" role="img" aria-label="Accidentals on a treble staff">
        {[0, 1, 2, 3, 4].map((l) => (
          <line key={l} x1="0" y1={lineY(l)} x2={W} y2={lineY(l)} stroke="#475569" strokeWidth="0.7" />
        ))}
        {/* Treble clef */}
        <text x="8" y={lineY(1) + 8} style={bravuraStyle} fontSize={38} fill="#94a3b8">
          {String.fromCodePoint(0xe050)}
        </text>

        {examples.map((e, i) => {
          const y = posY(e.pos);
          return (
            <g key={i}>
              {/* Accidental symbol */}
              <text
                x={e.noteX + e.accDx}
                y={y + e.accDy}
                style={bravuraStyle}
                fontSize={e.accSize}
                fill="#e2e8f0"
              >
                {String.fromCodePoint(e.accidentalCode)}
              </text>
              {/* Notehead */}
              <ellipse cx={e.noteX} cy={y} rx={6.5} ry={4.5} fill="#f59e0b" transform={`rotate(-18 ${e.noteX} ${y})`} />
              <line x1={e.noteX + 6.5} y1={y} x2={e.noteX + 6.5} y2={y - 30} stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
              {/* Label below */}
              <text x={e.noteX} y={82} textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="600">
                {e.noteLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ──────────────── EnharmonicDemo ─────────────────────────────── */

export function EnharmonicDemo() {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const pairs = [
    { label: 'C♯ = D♭', midiA: 61, nameA: 'C♯', nameB: 'D♭', tag: 'cd' },
    { label: 'F♯ = G♭', midiA: 66, nameA: 'F♯', nameB: 'G♭', tag: 'fg' },
    { label: 'G♯ = A♭', midiA: 68, nameA: 'G♯', nameB: 'A♭', tag: 'ga' },
  ];

  return (
    <div className="my-5 rounded-xl bg-slate-800/50 border border-slate-600/30 p-4">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">
        Enharmonic equivalents — same sound, different spelling
      </p>
      <div className="flex flex-wrap gap-2">
        {pairs.map((p) => (
          <button
            key={p.tag}
            type="button"
            onClick={async () => {
              setActiveTag(p.tag);
              await playMidiNote(p.midiA, 1200);
              setTimeout(() => setActiveTag(null), 1200);
            }}
            className={`
              flex items-center gap-2 rounded-lg px-3 py-2.5 transition text-left
              ${activeTag === p.tag
                ? 'bg-amber-500 text-slate-900'
                : 'bg-slate-700/80 text-slate-200 hover:bg-slate-600'
              }
            `}
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            <span className="text-xs font-bold">{p.nameA}</span>
            <span className="text-[10px] opacity-70">=</span>
            <span className="text-xs font-bold">{p.nameB}</span>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-slate-500 mt-2 italic">
        Click each pair — they produce the same pitch despite different names
      </p>
    </div>
  );
}

/* ──────────────── IntervalStaffExamples ──────────────────────── */

const GENERIC_INTERVALS: {
  name: string;
  short: string;
  pos1: number;
  pos2: number;
  label1: string;
  label2: string;
  midi1: number;
  midi2: number;
}[] = [
  { name: 'Unison', short: '1st', pos1: -2, pos2: -2, label1: 'C', label2: 'C', midi1: 60, midi2: 60 },
  { name: '2nd', short: '2nd', pos1: -2, pos2: -1, label1: 'C', label2: 'D', midi1: 60, midi2: 62 },
  { name: '3rd', short: '3rd', pos1: -2, pos2: 0, label1: 'C', label2: 'E', midi1: 60, midi2: 64 },
  { name: '4th', short: '4th', pos1: -2, pos2: 1, label1: 'C', label2: 'F', midi1: 60, midi2: 65 },
  { name: '5th', short: '5th', pos1: -2, pos2: 2, label1: 'C', label2: 'G', midi1: 60, midi2: 67 },
  { name: '6th', short: '6th', pos1: -2, pos2: 3, label1: 'C', label2: 'A', midi1: 60, midi2: 69 },
  { name: '7th', short: '7th', pos1: -2, pos2: 4, label1: 'C', label2: 'B', midi1: 60, midi2: 71 },
  { name: 'Octave', short: '8ve', pos1: -2, pos2: 5, label1: 'C', label2: 'C', midi1: 60, midi2: 72 },
];

function IntervalMiniStaff({ interval }: { interval: typeof GENERIC_INTERVALS[number] }) {
  const [active, setActive] = useState(false);
  const LINE_SP = 10;
  const STAFF_BOTTOM = 60;
  const lineY = (line: number) => STAFF_BOTTOM - line * LINE_SP;
  const posY = (pos: number) => STAFF_BOTTOM - pos * (LINE_SP / 2);
  const W = 100;

  const notes = [
    { pos: interval.pos1, label: interval.label1, midi: interval.midi1, x: 38 },
    { pos: interval.pos2, label: interval.label2, midi: interval.midi2, x: 68 },
  ];

  const clefCode = 0xe050;
  const clefY = lineY(1) + 8;

  const handlePlay = async () => {
    setActive(true);
    await playMidiNote(interval.midi1, 500);
    await new Promise<void>((r) => setTimeout(r, 500));
    await playMidiNote(interval.midi2, 600);
    setTimeout(() => setActive(false), 600);
  };

  return (
    <button
      type="button"
      onClick={handlePlay}
      className={`flex flex-col items-center rounded-xl border p-2 transition-all ${
        active
          ? 'bg-amber-500/20 border-amber-500/60 scale-105'
          : 'bg-slate-800/50 border-slate-600/30 hover:border-slate-500/50 hover:bg-slate-700/40'
      }`}
    >
      <svg viewBox={`0 -20 ${W} 110`} className="w-full" role="img" aria-label={`${interval.name} interval`}>
        {[0, 1, 2, 3, 4].map((l) => (
          <line key={l} x1="0" y1={lineY(l)} x2={W} y2={lineY(l)} stroke="#64748b" strokeWidth="0.8" />
        ))}
        <text x="6" y={clefY} style={{ fontFamily: '"Bravura", "Bravura Text", serif' }} fontSize={30} fill="#94a3b8">
          {String.fromCodePoint(clefCode)}
        </text>
        {notes.map((n, i) => {
          const y = posY(n.pos);
          const ledgerLines: number[] = [];
          if (n.pos < 0) for (let p = -2; p >= n.pos; p -= 2) ledgerLines.push(posY(p));
          if (n.pos > 8) for (let p = 10; p <= n.pos; p += 2) ledgerLines.push(posY(p));
          const stemUp = n.pos < 4;
          const stemX = stemUp ? n.x + 4.5 : n.x - 4.5;
          const stemY2 = stemUp ? y - 22 : y + 22;
          const color = active ? '#ffffff' : '#f59e0b';
          const hasSharp = n.label.includes('♯') || n.label.includes('#');
          const hasFlat = n.label.includes('♭');
          const accCode = hasSharp ? 0xe262 : hasFlat ? 0xe260 : 0;
          return (
            <g key={i}>
              {ledgerLines.map((ly) => (
                <line key={ly} x1={n.x - 9} y1={ly} x2={n.x + 9} y2={ly} stroke="#64748b" strokeWidth="0.8" />
              ))}
              {accCode > 0 && (
                <text
                  x={n.x - 9}
                  y={y + (hasSharp ? 4.5 : 2.5)}
                  style={{ fontFamily: '"Bravura", "Bravura Text", serif' }}
                  fontSize={hasSharp ? 13 : 14}
                  fill={color}
                  textAnchor="middle"
                >
                  {String.fromCodePoint(accCode)}
                </text>
              )}
              <ellipse cx={n.x} cy={y} rx={4.5} ry={3.2} fill={color} transform={`rotate(-18 ${n.x} ${y})`} />
              <line x1={stemX} y1={y} x2={stemX} y2={stemY2} stroke={color} strokeWidth="0.9" strokeLinecap="round" />
              <text x={n.x} y={y + (stemUp ? 14 : -8)} textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600">
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
      <span className="text-[11px] font-bold text-slate-200">{interval.name}</span>
      <span className="text-[9px] text-slate-500">▶ Click to hear</span>
    </button>
  );
}

export function IntervalStaffExamples() {
  return (
    <div className="my-6 rounded-xl bg-slate-800/50 border border-slate-600/30 p-4">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Generic intervals from C on the staff</p>
      <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2">
        {GENERIC_INTERVALS.map((interval) => (
          <IntervalMiniStaff key={interval.name} interval={interval} />
        ))}
      </div>
    </div>
  );
}

const SPECIFIC_INTERVALS: typeof GENERIC_INTERVALS = [
  { name: 'min 2nd', short: 'm2', pos1: -2, pos2: -1, label1: 'C', label2: 'D♭', midi1: 60, midi2: 61 },
  { name: 'Maj 2nd', short: 'M2', pos1: -2, pos2: -1, label1: 'C', label2: 'D', midi1: 60, midi2: 62 },
  { name: 'min 3rd', short: 'm3', pos1: -2, pos2: 0, label1: 'C', label2: 'E♭', midi1: 60, midi2: 63 },
  { name: 'Maj 3rd', short: 'M3', pos1: -2, pos2: 0, label1: 'C', label2: 'E', midi1: 60, midi2: 64 },
  { name: 'Perf 4th', short: 'P4', pos1: -2, pos2: 1, label1: 'C', label2: 'F', midi1: 60, midi2: 65 },
  { name: 'Tritone', short: 'A4', pos1: -2, pos2: 1, label1: 'C', label2: 'F♯', midi1: 60, midi2: 66 },
  { name: 'Perf 5th', short: 'P5', pos1: -2, pos2: 2, label1: 'C', label2: 'G', midi1: 60, midi2: 67 },
  { name: 'min 6th', short: 'm6', pos1: -2, pos2: 3, label1: 'C', label2: 'A♭', midi1: 60, midi2: 68 },
  { name: 'Maj 6th', short: 'M6', pos1: -2, pos2: 3, label1: 'C', label2: 'A', midi1: 60, midi2: 69 },
  { name: 'min 7th', short: 'm7', pos1: -2, pos2: 4, label1: 'C', label2: 'B♭', midi1: 60, midi2: 70 },
  { name: 'Maj 7th', short: 'M7', pos1: -2, pos2: 4, label1: 'C', label2: 'B', midi1: 60, midi2: 71 },
  { name: 'Octave', short: 'P8', pos1: -2, pos2: 5, label1: 'C', label2: 'C', midi1: 60, midi2: 72 },
];

export function SpecificIntervalStaffExamples() {
  return (
    <div className="my-6 rounded-xl bg-slate-800/50 border border-slate-600/30 p-4">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Specific intervals from C on the staff</p>
      <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {SPECIFIC_INTERVALS.map((interval) => (
          <IntervalMiniStaff key={interval.name} interval={interval} />
        ))}
      </div>
    </div>
  );
}

/* ──────────────── KeySignatureStaff ──────────────────────────── */

const SHARP_POSITIONS_TREBLE = [8, 5, 9, 6, 3, 7, 4];
/* ──────────────── InversionStaffExamples ─────────────────────── */

const INVERSION_PAIRS: {
  original: { name: string; pos1: number; pos2: number; label1: string; label2: string; midi1: number; midi2: number };
  inversion: { name: string; pos1: number; pos2: number; label1: string; label2: string; midi1: number; midi2: number };
}[] = [
  {
    original:  { name: 'Maj 3rd', pos1: -2, pos2: 0, label1: 'C', label2: 'E', midi1: 60, midi2: 64 },
    inversion: { name: 'min 6th', pos1: 0, pos2: 5, label1: 'E', label2: 'C', midi1: 64, midi2: 72 },
  },
  {
    original:  { name: 'min 3rd', pos1: -2, pos2: 0, label1: 'C', label2: 'E♭', midi1: 60, midi2: 63 },
    inversion: { name: 'Maj 6th', pos1: 0, pos2: 5, label1: 'E♭', label2: 'C', midi1: 63, midi2: 72 },
  },
  {
    original:  { name: 'Perf 4th', pos1: -2, pos2: 1, label1: 'C', label2: 'F', midi1: 60, midi2: 65 },
    inversion: { name: 'Perf 5th', pos1: 1, pos2: 5, label1: 'F', label2: 'C', midi1: 65, midi2: 72 },
  },
  {
    original:  { name: 'Aug 4th', pos1: -2, pos2: 1, label1: 'C', label2: 'F♯', midi1: 60, midi2: 66 },
    inversion: { name: 'dim 5th', pos1: 1, pos2: 5, label1: 'F♯', label2: 'C', midi1: 66, midi2: 72 },
  },
  {
    original:  { name: 'Maj 2nd', pos1: -2, pos2: -1, label1: 'C', label2: 'D', midi1: 60, midi2: 62 },
    inversion: { name: 'min 7th', pos1: -1, pos2: 5, label1: 'D', label2: 'C', midi1: 62, midi2: 72 },
  },
  {
    original:  { name: 'min 2nd', pos1: -2, pos2: -1, label1: 'C', label2: 'D♭', midi1: 60, midi2: 61 },
    inversion: { name: 'Maj 7th', pos1: -1, pos2: 5, label1: 'D♭', label2: 'C', midi1: 61, midi2: 72 },
  },
];

function InversionPairStaff({ pair }: { pair: typeof INVERSION_PAIRS[number] }) {
  const [activeSide, setActiveSide] = useState<'none' | 'orig' | 'inv'>('none');
  const LINE_SP = 10;
  const STAFF_BOTTOM = 60;
  const lineY = (line: number) => STAFF_BOTTOM - line * LINE_SP;
  const posY = (pos: number) => STAFF_BOTTOM - pos * (LINE_SP / 2);
  const W = 170;
  const clefCode = 0xe050;
  const clefY = lineY(1) + 8;

  const renderNote = (x: number, pos: number, label: string, color: string) => {
    const y = posY(pos);
    const ledgerLines: number[] = [];
    if (pos < 0) for (let p = -2; p >= pos; p -= 2) ledgerLines.push(posY(p));
    if (pos > 8) for (let p = 10; p <= pos; p += 2) ledgerLines.push(posY(p));
    const stemUp = pos < 4;
    const stemX = stemUp ? x + 4.5 : x - 4.5;
    const stemY2 = stemUp ? y - 22 : y + 22;
    const hasSharp = label.includes('♯') || label.includes('#');
    const hasFlat = label.includes('♭');
    const accCode = hasSharp ? 0xe262 : hasFlat ? 0xe260 : 0;
    return (
      <g>
        {ledgerLines.map((ly) => (
          <line key={ly} x1={x - 9} y1={ly} x2={x + 9} y2={ly} stroke="#64748b" strokeWidth="0.8" />
        ))}
        {accCode > 0 && (
          <text
            x={x - 9}
            y={y + (hasSharp ? 4.5 : 2.5)}
            style={{ fontFamily: '"Bravura", "Bravura Text", serif' }}
            fontSize={hasSharp ? 13 : 14}
            fill={color}
            textAnchor="middle"
          >
            {String.fromCodePoint(accCode)}
          </text>
        )}
        <ellipse cx={x} cy={y} rx={4.5} ry={3.2} fill={color} transform={`rotate(-18 ${x} ${y})`} />
        <line x1={stemX} y1={y} x2={stemX} y2={stemY2} stroke={color} strokeWidth="0.9" strokeLinecap="round" />
        <text x={x} y={y + (stemUp ? 14 : -8)} textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600">
          {label}
        </text>
      </g>
    );
  };

  const play = async (side: 'orig' | 'inv') => {
    const s = side === 'orig' ? pair.original : pair.inversion;
    setActiveSide(side);
    await playMidiNote(s.midi1, 500);
    await new Promise<void>((r) => setTimeout(r, 500));
    await playMidiNote(s.midi2, 600);
    setTimeout(() => setActiveSide('none'), 600);
  };

  const origColor = activeSide === 'orig' ? '#ffffff' : '#f59e0b';
  const invColor = activeSide === 'inv' ? '#ffffff' : '#3b82f6';

  return (
    <div className={`flex flex-col items-center rounded-xl border p-3 transition-all bg-slate-800/50 border-slate-600/30`}>
      <svg viewBox={`0 -20 ${W} 120`} className="w-full" role="img" aria-label={`${pair.original.name} inverts to ${pair.inversion.name}`}>
        {[0, 1, 2, 3, 4].map((l) => (
          <line key={l} x1="0" y1={lineY(l)} x2={W} y2={lineY(l)} stroke="#64748b" strokeWidth="0.8" />
        ))}
        <text x="4" y={clefY} style={{ fontFamily: '"Bravura", "Bravura Text", serif' }} fontSize={28} fill="#94a3b8">
          {String.fromCodePoint(clefCode)}
        </text>
        {renderNote(42, pair.original.pos1, pair.original.label1, origColor)}
        {renderNote(62, pair.original.pos2, pair.original.label2, origColor)}
        <text x={85} y={posY(3)} textAnchor="middle" fontSize="12" fill="#64748b">→</text>
        {renderNote(108, pair.inversion.pos1, pair.inversion.label1, invColor)}
        {renderNote(128, pair.inversion.pos2, pair.inversion.label2, invColor)}
      </svg>
      <div className="flex items-center gap-2 mt-1">
        <button
          type="button"
          onClick={() => play('orig')}
          className={`text-[10px] font-bold px-2 py-1 rounded transition ${activeSide === 'orig' ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-amber-400 hover:bg-slate-600'}`}
        >
          ▶ {pair.original.name}
        </button>
        <span className="text-[10px] text-slate-500">↔</span>
        <button
          type="button"
          onClick={() => play('inv')}
          className={`text-[10px] font-bold px-2 py-1 rounded transition ${activeSide === 'inv' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-blue-400 hover:bg-slate-600'}`}
        >
          ▶ {pair.inversion.name}
        </button>
      </div>
    </div>
  );
}

export function InversionStaffExamples() {
  return (
    <div className="my-6 rounded-xl bg-slate-800/50 border border-slate-600/30 p-4">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Interval inversions on the staff — click to hear each side</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {INVERSION_PAIRS.map((pair) => (
          <InversionPairStaff key={pair.original.name} pair={pair} />
        ))}
      </div>
    </div>
  );
}

const FLAT_POSITIONS_TREBLE = [4, 7, 3, 6, 2, 5, 1];

export function KeySignatureStaff({
  sharps = 0,
  flats = 0,
  label,
}: {
  sharps?: number;
  flats?: number;
  label: string;
}) {
  const LINE_SP = 10;
  const STAFF_BOTTOM = 60;
  const lineY = (line: number) => STAFF_BOTTOM - line * LINE_SP;
  const posY = (pos: number) => STAFF_BOTTOM - pos * (LINE_SP / 2);

  const accCount = sharps || flats;
  const accCode = sharps > 0 ? SMUFL_SHARP : SMUFL_FLAT;
  const positions = sharps > 0 ? SHARP_POSITIONS_TREBLE : FLAT_POSITIONS_TREBLE;
  const accSize = sharps > 0 ? 16 : 18;
  const accDy = sharps > 0 ? 5.5 : 3;
  const accSpacing = 14;
  const accStartX = 44;

  const clefCode = 0xe050;
  const clefY = lineY(1) + 8;
  const W = 180;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${W} 90`} className="w-full max-w-[180px]" role="img" aria-label={label}>
        {[0, 1, 2, 3, 4].map((l) => (
          <line key={l} x1="0" y1={lineY(l)} x2={W} y2={lineY(l)} stroke="#64748b" strokeWidth="1" />
        ))}
        <text
          x="8"
          y={clefY}
          style={{ fontFamily: '"Bravura", "Bravura Text", serif' }}
          fontSize={38}
          fill="#94a3b8"
        >
          {String.fromCodePoint(clefCode)}
        </text>
        {Array.from({ length: accCount }).map((_, i) => {
          const x = accStartX + i * accSpacing;
          const y = posY(positions[i]);
          return (
            <text
              key={i}
              x={x}
              y={y + accDy}
              style={{ fontFamily: '"Bravura", "Bravura Text", serif' }}
              fontSize={accSize}
              fill="#f59e0b"
              textAnchor="middle"
            >
              {String.fromCodePoint(accCode)}
            </text>
          );
        })}
      </svg>
      <p className="text-[11px] text-slate-400 font-semibold mt-1">{label}</p>
    </div>
  );
}

export function KeySignatureExamples() {
  const sharpKeys: { sharps: number; label: string }[] = [
    { sharps: 0, label: 'C major / A minor' },
    { sharps: 1, label: 'G major / E minor' },
    { sharps: 2, label: 'D major / B minor' },
    { sharps: 3, label: 'A major / F♯ minor' },
    { sharps: 4, label: 'E major / C♯ minor' },
    { sharps: 5, label: 'B major / G♯ minor' },
    { sharps: 6, label: 'F♯ major / D♯ minor' },
    { sharps: 7, label: 'C♯ major / A♯ minor' },
  ];

  const flatKeys: { flats: number; label: string }[] = [
    { flats: 1, label: 'F major / D minor' },
    { flats: 2, label: 'B♭ major / G minor' },
    { flats: 3, label: 'E♭ major / C minor' },
    { flats: 4, label: 'A♭ major / F minor' },
    { flats: 5, label: 'D♭ major / B♭ minor' },
    { flats: 6, label: 'G♭ major / E♭ minor' },
    { flats: 7, label: 'C♭ major / A♭ minor' },
  ];

  return (
    <div className="my-6 rounded-xl bg-slate-800/50 border border-slate-600/30 p-4 space-y-5">
      <div>
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Sharp key signatures</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {sharpKeys.map((e) => (
            <KeySignatureStaff key={e.label} sharps={e.sharps} label={e.label} />
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Flat key signatures</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {flatKeys.map((e) => (
            <KeySignatureStaff key={e.label} flats={e.flats} label={e.label} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────── ChordOnStaff ───────────────────────────────── */

type ChordOnStaffNote = { position: number; label?: string };

type ChordOnStaffItem = {
  notes: ChordOnStaffNote[];
  label: string;
  midis: number[];
};

export function ChordOnStaff({
  chords,
  title,
  clef = 'treble',
}: {
  chords: ChordOnStaffItem[];
  title?: string;
  clef?: 'treble' | 'bass';
}) {
  const [activeIdx, setActiveIdx] = useState(-1);
  const LINE_SP = 10;
  const STAFF_BOTTOM = 60;
  const lineY = (line: number) => STAFF_BOTTOM - line * LINE_SP;
  const posY = (pos: number) => STAFF_BOTTOM - pos * (LINE_SP / 2);

  const chordSpacing = Math.max(50, Math.min(70, 420 / Math.max(chords.length, 1)));
  const startX = 52;
  const W = Math.max(200, startX + chords.length * chordSpacing + 16);

  const clefCode = clef === 'treble' ? 0xe050 : 0xe062;
  const clefY = clef === 'treble' ? lineY(1) + 8 : lineY(3) + 5;
  const clefSize = clef === 'treble' ? 38 : 30;

  return (
    <div className="my-5 rounded-xl bg-slate-800/50 border border-slate-600/30 p-4">
      {title && <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">{title}</p>}
      <svg viewBox={`0 -25 ${W} 130`} className="w-full" role="img" aria-label={title ?? 'Chords on staff'}>
        {[0, 1, 2, 3, 4].map((l) => (
          <line key={l} x1="0" y1={lineY(l)} x2={W} y2={lineY(l)} stroke="#64748b" strokeWidth="1" />
        ))}
        <text
          x="8"
          y={clefY}
          style={{ fontFamily: '"Bravura", "Bravura Text", serif' }}
          fontSize={clefSize}
          fill="#94a3b8"
        >
          {String.fromCodePoint(clefCode)}
        </text>

        {chords.map((ch, ci) => {
          const cx = startX + ci * chordSpacing;
          const isActive = ci === activeIdx;
          const color = isActive ? '#ffffff' : '#f59e0b';
          const sorted = [...ch.notes].sort((a, b) => a.position - b.position);
          const lowestPos = sorted[0].position;
          const highestPos = sorted[sorted.length - 1].position;
          const midPos = (lowestPos + highestPos) / 2;
          const stemUp = midPos < 4;
          const stemBasePos = stemUp ? lowestPos : highestPos;
          const stemX = stemUp ? cx + 5.5 : cx - 5.5;
          const stemY1 = posY(stemBasePos);
          const stemY2 = stemUp ? Math.min(posY(highestPos) - 22, posY(8) - 5) : Math.max(posY(lowestPos) + 22, posY(0) + 5);

          return (
            <g
              key={ci}
              className="cursor-pointer"
              onClick={async () => {
                setActiveIdx(ci);
                await playMidiChord(ch.midis, 1200);
                setTimeout(() => setActiveIdx(-1), 1200);
              }}
            >
              {isActive && (
                <rect
                  x={cx - 14}
                  y={posY(highestPos) - 8}
                  width={28}
                  height={posY(lowestPos) - posY(highestPos) + 16}
                  rx={6}
                  fill="#f59e0b"
                  opacity={0.15}
                />
              )}
              {sorted.map((n, ni) => {
                const y = posY(n.position);
                const ledgerLines: number[] = [];
                if (n.position < 0) for (let p = -2; p >= n.position; p -= 2) ledgerLines.push(posY(p));
                if (n.position > 8) for (let p = 10; p <= n.position; p += 2) ledgerLines.push(posY(p));
                const lbl = n.label ?? '';
                const hasSharp = lbl.includes('♯') || lbl.includes('#');
                const hasFlat = lbl.includes('♭');
                const accCode = hasSharp ? 0xe262 : hasFlat ? 0xe260 : 0;
                return (
                  <g key={ni}>
                    {ledgerLines.map((ly) => (
                      <line key={ly} x1={cx - 11} y1={ly} x2={cx + 11} y2={ly} stroke="#64748b" strokeWidth="1" />
                    ))}
                    {accCode > 0 && (
                      <text
                        x={cx - 12}
                        y={y + (hasSharp ? 5.5 : 3)}
                        style={{ fontFamily: '"Bravura", "Bravura Text", serif' }}
                        fontSize={hasSharp ? 15 : 17}
                        fill={color}
                        textAnchor="middle"
                      >
                        {String.fromCodePoint(accCode)}
                      </text>
                    )}
                    <ellipse cx={cx} cy={y} rx={5.5} ry={4} fill={color} transform={`rotate(-18 ${cx} ${y})`} />
                  </g>
                );
              })}
              <line x1={stemX} y1={stemY1} x2={stemX} y2={stemY2} stroke={color} strokeWidth="1" strokeLinecap="round" />
              <text
                x={cx}
                y={stemUp ? posY(lowestPos) + 16 : posY(highestPos) - 12}
                textAnchor="middle"
                fontSize="8"
                fill="#94a3b8"
                fontWeight="600"
              >
                {ch.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-[10px] text-slate-500 mt-1 text-center italic">Click any chord to hear it</p>
    </div>
  );
}

/* ──────────────── DottedNoteExamples ─────────────────────────── */

export function DottedNoteExamples() {
  const LINE_SP = 10;
  const STAFF_BOTTOM = 60;
  const lineY = (line: number) => STAFF_BOTTOM - line * LINE_SP;
  const W = 360;
  const ny = lineY(1);

  return (
    <div className="my-5 rounded-xl bg-slate-800/50 border border-slate-600/30 p-4">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Dotted notes</p>
      <div className="space-y-4">
        {/* Dotted half note */}
        <div>
          <svg viewBox={`0 0 ${W} 90`} className="w-full" role="img" aria-label="Dotted half note example">
            {[0, 1, 2, 3, 4].map((l) => (
              <line key={l} x1="0" y1={lineY(l)} x2={W} y2={lineY(l)} stroke="#475569" strokeWidth="0.7" />
            ))}
            {/* Half note */}
            <ellipse cx={60} cy={ny} rx={6.5} ry={4.5} fill="none" stroke="#f59e0b" strokeWidth={1.3} transform={`rotate(-18 60 ${ny})`} />
            <line x1={66.5} y1={ny} x2={66.5} y2={ny - 30} stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
            {/* Dot */}
            <circle cx={75} cy={ny} r={2} fill="#f59e0b" />
            {/* = sign */}
            <text x={100} y={ny + 1} fontSize="16" fill="#94a3b8" dominantBaseline="central">=</text>
            {/* Half note value */}
            <ellipse cx={130} cy={ny} rx={5.5} ry={3.8} fill="none" stroke="#94a3b8" strokeWidth={1.1} transform={`rotate(-18 130 ${ny})`} />
            <line x1={135.5} y1={ny} x2={135.5} y2={ny - 26} stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
            <text x={146} y={ny + 1} fontSize="11" fill="#94a3b8" dominantBaseline="central">2 beats</text>
            {/* + */}
            <text x={196} y={ny + 1} fontSize="14" fill="#94a3b8" dominantBaseline="central">+</text>
            {/* Quarter note value */}
            <ellipse cx={220} cy={ny} rx={5.5} ry={3.8} fill="#94a3b8" transform={`rotate(-18 220 ${ny})`} />
            <line x1={225.5} y1={ny} x2={225.5} y2={ny - 26} stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
            <text x={236} y={ny + 1} fontSize="11" fill="#94a3b8" dominantBaseline="central">1 beat</text>
            {/* = 3 beats */}
            <text x={286} y={ny + 1} fontSize="13" fill="#94a3b8" dominantBaseline="central">=</text>
            <text x={304} y={ny + 1} fontSize="13" fontWeight="700" fill="#e2e8f0" dominantBaseline="central">3 beats</text>
          </svg>
        </div>

        {/* Dotted quarter note */}
        <div>
          <svg viewBox={`0 0 ${W} 90`} className="w-full" role="img" aria-label="Dotted quarter note example">
            {[0, 1, 2, 3, 4].map((l) => (
              <line key={l} x1="0" y1={lineY(l)} x2={W} y2={lineY(l)} stroke="#475569" strokeWidth="0.7" />
            ))}
            {/* Quarter note */}
            <ellipse cx={60} cy={ny} rx={6.5} ry={4.5} fill="#f59e0b" transform={`rotate(-18 60 ${ny})`} />
            <line x1={66.5} y1={ny} x2={66.5} y2={ny - 30} stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
            {/* Dot */}
            <circle cx={75} cy={ny} r={2} fill="#f59e0b" />
            {/* = sign */}
            <text x={100} y={ny + 1} fontSize="16" fill="#94a3b8" dominantBaseline="central">=</text>
            {/* Quarter note value */}
            <ellipse cx={130} cy={ny} rx={5.5} ry={3.8} fill="#94a3b8" transform={`rotate(-18 130 ${ny})`} />
            <line x1={135.5} y1={ny} x2={135.5} y2={ny - 26} stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
            <text x={146} y={ny + 1} fontSize="11" fill="#94a3b8" dominantBaseline="central">1 beat</text>
            {/* + */}
            <text x={196} y={ny + 1} fontSize="14" fill="#94a3b8" dominantBaseline="central">+</text>
            {/* Eighth note value */}
            <ellipse cx={220} cy={ny} rx={5.5} ry={3.8} fill="#94a3b8" transform={`rotate(-18 220 ${ny})`} />
            <line x1={225.5} y1={ny} x2={225.5} y2={ny - 26} stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
            <path d="M225.7 24.2 C230.5 25.2 231 31 226.5 36" fill="none" stroke="#94a3b8" strokeWidth={2} strokeLinecap="round" />
            <text x={236} y={ny + 1} fontSize="11" fill="#94a3b8" dominantBaseline="central">½ beat</text>
            {/* = 1½ beats */}
            <text x={286} y={ny + 1} fontSize="13" fill="#94a3b8" dominantBaseline="central">=</text>
            <text x={304} y={ny + 1} fontSize="13" fontWeight="700" fill="#e2e8f0" dominantBaseline="central">1½ beats</text>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ──────────────── TiedNoteExamples ──────────────────────────────── */

export function TiedNoteExamples() {
  const LINE_SP = 10;
  const STAFF_BOTTOM = 60;
  const lineY = (line: number) => STAFF_BOTTOM - line * LINE_SP;
  const W = 360;
  const ny = lineY(1);

  return (
    <div className="my-5 rounded-xl bg-slate-800/50 border border-slate-600/30 p-4">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Tied notes</p>
      <div className="space-y-4">
        {/* Half tied to quarter */}
        <div>
          <svg viewBox={`0 0 ${W} 95`} className="w-full" role="img" aria-label="Tied notes: half + quarter = 3 beats">
            {[0, 1, 2, 3, 4].map((l) => (
              <line key={l} x1="0" y1={lineY(l)} x2={W} y2={lineY(l)} stroke="#475569" strokeWidth="0.7" />
            ))}
            {/* Barline between the two notes */}
            <line x1={120} y1={lineY(0)} x2={120} y2={lineY(4)} stroke="#64748b" strokeWidth="1" />

            {/* Half note (left of barline) */}
            <ellipse cx={70} cy={ny} rx={6.5} ry={4.5} fill="none" stroke="#f59e0b" strokeWidth={1.3} transform={`rotate(-18 70 ${ny})`} />
            <line x1={76.5} y1={ny} x2={76.5} y2={ny - 30} stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />

            {/* Quarter note (right of barline) */}
            <ellipse cx={160} cy={ny} rx={6.5} ry={4.5} fill="#f59e0b" transform={`rotate(-18 160 ${ny})`} />
            <line x1={166.5} y1={ny} x2={166.5} y2={ny - 30} stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />

            {/* Tie curve below the notes */}
            <path
              d={`M 74 ${ny + 6} Q 115 ${ny + 20} 156 ${ny + 6}`}
              fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"
            />

            {/* = 3 beats label */}
            <text x={210} y={ny + 1} fontSize="13" fill="#94a3b8" dominantBaseline="central">=</text>
            <text x={230} y={ny - 7} fontSize="11" fill="#94a3b8" dominantBaseline="central">2 + 1</text>
            <text x={230} y={ny + 7} fontSize="13" fontWeight="700" fill="#e2e8f0" dominantBaseline="central">= 3 beats</text>
          </svg>
          <p className="text-[10px] text-slate-500 text-center mt-0.5 italic">
            A half note tied to a quarter note across a barline — held for 3 beats total without re-attacking
          </p>
        </div>

        {/* Quarter tied to quarter */}
        <div>
          <svg viewBox={`0 0 ${W} 95`} className="w-full" role="img" aria-label="Tied notes: quarter + quarter = 2 beats">
            {[0, 1, 2, 3, 4].map((l) => (
              <line key={l} x1="0" y1={lineY(l)} x2={W} y2={lineY(l)} stroke="#475569" strokeWidth="0.7" />
            ))}
            {/* Barline between the two notes */}
            <line x1={120} y1={lineY(0)} x2={120} y2={lineY(4)} stroke="#64748b" strokeWidth="1" />

            {/* Quarter note (left) */}
            <ellipse cx={70} cy={ny} rx={6.5} ry={4.5} fill="#f59e0b" transform={`rotate(-18 70 ${ny})`} />
            <line x1={76.5} y1={ny} x2={76.5} y2={ny - 30} stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />

            {/* Quarter note (right) */}
            <ellipse cx={160} cy={ny} rx={6.5} ry={4.5} fill="#f59e0b" transform={`rotate(-18 160 ${ny})`} />
            <line x1={166.5} y1={ny} x2={166.5} y2={ny - 30} stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />

            {/* Tie curve below */}
            <path
              d={`M 74 ${ny + 6} Q 115 ${ny + 20} 156 ${ny + 6}`}
              fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"
            />

            {/* = 2 beats label */}
            <text x={210} y={ny + 1} fontSize="13" fill="#94a3b8" dominantBaseline="central">=</text>
            <text x={230} y={ny - 7} fontSize="11" fill="#94a3b8" dominantBaseline="central">1 + 1</text>
            <text x={230} y={ny + 7} fontSize="13" fontWeight="700" fill="#e2e8f0" dominantBaseline="central">= 2 beats</text>
          </svg>
          <p className="text-[10px] text-slate-500 text-center mt-0.5 italic">
            Two quarter notes tied across a barline — same as a half note, but lets the duration cross the bar
          </p>
        </div>
      </div>
    </div>
  );
}

/* ──────────────── TimeSignatureStaff ──────────────────────────── */

export function TimeSignatureStaff({
  top,
  bottom,
  caption,
  noteCount,
}: {
  top: number;
  bottom: number;
  caption?: string;
  noteCount?: number;
}) {
  const LINE_SP = 10;
  const STAFF_BOTTOM = 60;
  const lineY = (line: number) => STAFF_BOTTOM - line * LINE_SP;
  const midY = (lineY(0) + lineY(4)) / 2;
  const W = 320;

  const clefCode = 0xe050;
  const clefY = lineY(1) + 8;

  const timeSigX = 48;
  const barStartX = 72;
  const barEndX = W - 12;
  const count = noteCount ?? top;

  return (
    <div className="my-4">
      <svg viewBox={`0 0 ${W} 90`} className="w-full" role="img" aria-label={caption ?? `${top}/${bottom} time signature`}>
        {[0, 1, 2, 3, 4].map((l) => (
          <line key={l} x1="0" y1={lineY(l)} x2={W} y2={lineY(l)} stroke="#64748b" strokeWidth="1" />
        ))}

        {/* Clef */}
        <text x="8" y={clefY} style={{ fontFamily: '"Bravura", "Bravura Text", serif' }} fontSize={38} fill="#94a3b8">
          {String.fromCodePoint(clefCode)}
        </text>

        {/* Time signature numbers — centered in upper and lower halves of the staff */}
        <text x={timeSigX} y={(lineY(2) + lineY(4)) / 2} textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="800" fill="#e2e8f0" fontFamily="serif">
          {top}
        </text>
        <text x={timeSigX} y={(lineY(0) + lineY(2)) / 2} textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="800" fill="#e2e8f0" fontFamily="serif">
          {bottom}
        </text>

        {/* Barline at start of measure */}
        <line x1={barStartX} y1={lineY(0)} x2={barStartX} y2={lineY(4)} stroke="#64748b" strokeWidth="1" />

        {/* Sample notes matching the beat unit indicated by the bottom number */}
        {Array.from({ length: count }).map((_, i) => {
          const spacing = (barEndX - barStartX - 20) / count;
          const nx = barStartX + 14 + i * spacing;
          const ny = lineY(1);
          const stemTop = ny - 28;
          const isHalf = bottom === 2;
          return (
            <g key={i}>
              {isHalf ? (
                <ellipse cx={nx} cy={ny} rx={5.5} ry={4} fill="none" stroke="#f59e0b" strokeWidth={1.2} transform={`rotate(-18 ${nx} ${ny})`} />
              ) : (
                <ellipse cx={nx} cy={ny} rx={5.5} ry={4} fill="#f59e0b" transform={`rotate(-18 ${nx} ${ny})`} />
              )}
              <line x1={nx + 5.5} y1={ny} x2={nx + 5.5} y2={stemTop} stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
              {bottom >= 8 && (
                <path d={`M${nx + 5.7} ${stemTop + 0.3} C${nx + 12} ${stemTop + 1.5} ${nx + 13} ${stemTop + 9} ${nx + 7} ${stemTop + 16}`} fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" />
              )}
              {bottom >= 16 && (
                <path d={`M${nx + 5.7} ${stemTop + 6} C${nx + 12} ${stemTop + 7.2} ${nx + 13} ${stemTop + 14.5} ${nx + 7} ${stemTop + 21.5}`} fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" />
              )}
            </g>
          );
        })}

        {/* Barline at end of measure */}
        <line x1={barEndX} y1={lineY(0)} x2={barEndX} y2={lineY(4)} stroke="#64748b" strokeWidth="1" />
      </svg>
      {caption && <p className="text-[11px] text-slate-500 mt-1 text-center italic">{caption}</p>}
    </div>
  );
}

/* ──────────────── Note glyph SVGs ─────────────────────────────── */

const STEM_W = 1.12;

function NoteGlyphWhole() {
  return (
    <svg viewBox="4 28 24 18" className="h-7 w-auto" fill="none" aria-hidden>
      <ellipse cx={16} cy={37} rx={8} ry={5.8} fill="none" stroke="currentColor" strokeWidth={2} transform="rotate(-18 16 37)" />
      <ellipse cx={16} cy={37} rx={3} ry={5.2} fill="currentColor" transform="rotate(-32 16 37)" />
    </svg>
  );
}

function NoteGlyphHalf() {
  return (
    <svg viewBox="6 2 20 50" className="h-9 w-auto" fill="none" aria-hidden>
      <ellipse cx={16} cy={38} rx={7.15} ry={5.45} fill="none" stroke="currentColor" strokeWidth={1.28} transform="rotate(-22 16 38)" />
      <line x1="23.2" y1="38" x2="23.2" y2="7" stroke="currentColor" strokeWidth={STEM_W} strokeLinecap="round" />
    </svg>
  );
}

function NoteGlyphQuarter() {
  return (
    <svg viewBox="6 2 20 50" className="h-9 w-auto" fill="none" aria-hidden>
      <ellipse cx={16} cy={38} rx={7.15} ry={5.45} fill="currentColor" transform="rotate(-22 16 38)" />
      <line x1="23.2" y1="38" x2="23.2" y2="7" stroke="currentColor" strokeWidth={STEM_W} strokeLinecap="round" />
    </svg>
  );
}

function NoteGlyphEighth() {
  return (
    <svg viewBox="6 2 26 50" className="h-9 w-auto" fill="none" aria-hidden>
      <ellipse cx={16} cy={38} rx={7.15} ry={5.45} fill="currentColor" transform="rotate(-22 16 38)" />
      <line x1="23.2" y1="38" x2="23.2" y2="7.5" stroke="currentColor" strokeWidth={STEM_W} strokeLinecap="round" />
      <path d="M23.4 7.8 C30.5 9.2 31.5 18.5 24.8 27.2" fill="none" stroke="currentColor" strokeWidth={2.65} strokeLinecap="round" />
    </svg>
  );
}

function NoteGlyphSixteenth() {
  return (
    <svg viewBox="6 2 26 50" className="h-9 w-auto" fill="none" aria-hidden>
      <ellipse cx={16} cy={38} rx={7.15} ry={5.45} fill="currentColor" transform="rotate(-22 16 38)" />
      <line x1="23.2" y1="38" x2="23.2" y2="7.5" stroke="currentColor" strokeWidth={STEM_W} strokeLinecap="round" />
      <path d="M23.4 7.8 C30.5 9.2 31.5 16 24.8 22.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M23.4 14.5 C30.5 15.9 31.5 22.5 24.8 29" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  );
}

const NOTE_GLYPHS = [NoteGlyphWhole, NoteGlyphHalf, NoteGlyphQuarter, NoteGlyphEighth, NoteGlyphSixteenth];

/* ──────────────── NoteCards ───────────────────────────────────── */

const NOTE_CARD_DATA: {
  name: string;
  altName: string;
  beats: string;
  midi: number;
  durationMs: number;
  Glyph: () => React.JSX.Element;
  desc: string;
}[] = [
  { name: 'Whole note', altName: 'Semibreve', beats: '4 beats', midi: 60, durationMs: 2000, Glyph: NoteGlyphWhole, desc: 'Open oval, no stem. Fills an entire 4/4 measure.' },
  { name: 'Half note', altName: 'Minim', beats: '2 beats', midi: 60, durationMs: 1000, Glyph: NoteGlyphHalf, desc: 'Open oval with a stem. Two halves = one whole.' },
  { name: 'Quarter note', altName: 'Crotchet', beats: '1 beat', midi: 60, durationMs: 500, Glyph: NoteGlyphQuarter, desc: 'Filled oval with a stem. The basic "pulse" in 4/4.' },
  { name: 'Eighth note', altName: 'Quaver', beats: '½ beat', midi: 60, durationMs: 250, Glyph: NoteGlyphEighth, desc: 'Filled oval, stem, one flag. Two per beat.' },
  { name: 'Sixteenth note', altName: 'Semiquaver', beats: '¼ beat', midi: 60, durationMs: 125, Glyph: NoteGlyphSixteenth, desc: 'Filled oval, stem, two flags. Four per beat.' },
];

export function NoteCards() {
  const [activeIdx, setActiveIdx] = useState(-1);

  return (
    <div className="my-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {NOTE_CARD_DATA.map((card, i) => {
        const isActive = i === activeIdx;
        return (
          <button
            key={card.name}
            type="button"
            onClick={async () => {
              setActiveIdx(i);
              await playMidiNote(card.midi, card.durationMs);
              setTimeout(() => setActiveIdx(-1), card.durationMs);
            }}
            className={`flex flex-col items-center text-center rounded-xl border p-3 transition-all ${
              isActive
                ? 'bg-amber-500/20 border-amber-500/60 scale-105'
                : 'bg-slate-800/50 border-slate-600/30 hover:border-slate-500/50 hover:bg-slate-700/40'
            }`}
          >
            <div className={`text-slate-200 mb-1 transition-transform ${isActive ? 'scale-125' : ''}`}>
              <card.Glyph />
            </div>
            <span className="text-xs font-bold text-slate-200 leading-tight">{card.name}</span>
            <span className="text-[10px] text-slate-400 italic">{card.altName}</span>
            <span className={`text-[11px] font-semibold mt-1 ${isActive ? 'text-amber-400' : 'text-amber-500/80'}`}>
              {card.beats}
            </span>
            <span className="text-[10px] text-slate-500 mt-1 leading-snug">{card.desc}</span>
            <span className="text-[10px] text-slate-500 mt-1.5">▶ Click to hear</span>
          </button>
        );
      })}
    </div>
  );
}

/* ──────────────── DurationBars ─────────────────────────────────── */

export function DurationBars() {
  const rows: { name: string; beats: number; midi: number; durationMs: number }[] = [
    { name: 'Whole', beats: 4, midi: 60, durationMs: 2000 },
    { name: 'Half', beats: 2, midi: 62, durationMs: 1000 },
    { name: 'Quarter', beats: 1, midi: 64, durationMs: 500 },
    { name: 'Eighth', beats: 0.5, midi: 65, durationMs: 250 },
    { name: 'Sixteenth', beats: 0.25, midi: 67, durationMs: 125 },
  ];

  const [activeIdx, setActiveIdx] = useState(-1);

  return (
    <div className="my-6 rounded-xl bg-slate-800/50 border border-slate-600/30 p-4">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">
        Note durations — click to hear
      </p>
      <div className="space-y-2.5">
        {rows.map((r, i) => {
          const Glyph = NOTE_GLYPHS[i];
          return (
            <button
              key={r.name}
              type="button"
              onClick={async () => {
                setActiveIdx(i);
                await playMidiNote(r.midi, r.durationMs);
                setTimeout(() => setActiveIdx(-1), r.durationMs);
              }}
              className="flex items-center gap-3 w-full group text-left"
            >
              <div className="w-7 shrink-0 flex items-center justify-center text-slate-300">
                <Glyph />
              </div>
              <span className="w-[4.5rem] text-[11px] font-semibold text-slate-300 shrink-0">{r.name}</span>
              <div className="flex-1 h-6 rounded bg-slate-700/40 overflow-hidden relative">
                <div
                  className={`h-full rounded transition-all duration-300 ${
                    i === activeIdx ? 'bg-amber-500 animate-pulse' : 'bg-amber-500/60 group-hover:bg-amber-500/80'
                  }`}
                  style={{ width: `${(r.beats / 4) * 100}%` }}
                />
              </div>
              <span className="w-10 text-right text-[10px] text-slate-500 shrink-0">
                {r.beats >= 1 ? `${r.beats} beat${r.beats > 1 ? 's' : ''}` : `${r.beats * 2 === 1 ? '½' : '¼'} beat`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────── BeatPattern ─────────────────────────────────── */

export function BeatPattern({
  groups,
  label,
  bpm = 120,
}: {
  groups: number[];
  label: string;
  bpm?: number;
}) {
  const [activeBeat, setActiveBeat] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => () => { cancelRef.current = true; }, []);

  const total = groups.reduce((a, b) => a + b, 0);
  const intervalMs = 60_000 / bpm;

  const handlePlay = useCallback(async () => {
    if (playing) { cancelRef.current = true; setPlaying(false); setActiveBeat(-1); return; }
    cancelRef.current = false;
    setPlaying(true);
    let beat = 0;
    for (let rep = 0; rep < 2 && !cancelRef.current; rep++) {
      let groupStart = 0;
      for (let g = 0; g < groups.length && !cancelRef.current; g++) {
        for (let b = 0; b < groups[g] && !cancelRef.current; b++) {
          setActiveBeat(groupStart + b);
          const accent = b === 0;
          await playMidiNote(accent ? 76 : 72, intervalMs * 0.8);
          await new Promise<void>((r) => setTimeout(r, intervalMs));
          beat++;
        }
        groupStart += groups[g];
      }
    }
    setPlaying(false);
    setActiveBeat(-1);
  }, [playing, groups, intervalMs]);

  let beatIdx = 0;
  return (
    <div className="my-4 rounded-xl bg-slate-800/50 border border-slate-600/30 p-4">
      <div className="flex items-center gap-3 mb-3">
        <PlayBtn onClick={handlePlay} label={playing ? 'Stop' : 'Listen'} playing={playing} small />
        <span className="text-sm text-slate-300 font-medium">{label}</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {groups.map((count, g) => {
          const dots = [];
          for (let b = 0; b < count; b++) {
            const idx = beatIdx++;
            dots.push(
              <div
                key={idx}
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
                  ${idx === activeBeat
                    ? 'bg-amber-500 text-slate-900 scale-125 shadow-lg shadow-amber-500/40'
                    : b === 0
                      ? 'bg-slate-600 text-slate-200'
                      : 'bg-slate-700 text-slate-400'
                  }
                `}
              >
                {idx + 1}
              </div>,
            );
          }
          return (
            <div key={g} className="flex gap-1 items-center">
              {dots}
              {g < groups.length - 1 && <div className="w-px h-5 bg-slate-600 mx-1" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────── CircleOfFifths ──────────────────────────────── */

export function CircleOfFifths() {
  const keys = [
    { name: 'C', acc: '0' }, { name: 'G', acc: '1♯' }, { name: 'D', acc: '2♯' },
    { name: 'A', acc: '3♯' }, { name: 'E', acc: '4♯' }, { name: 'B', acc: '5♯' },
    { name: 'F♯/G♭', acc: '6♯/6♭' }, { name: 'D♭', acc: '5♭' }, { name: 'A♭', acc: '4♭' },
    { name: 'E♭', acc: '3♭' }, { name: 'B♭', acc: '2♭' }, { name: 'F', acc: '1♭' },
  ];

  const R = 105;
  const cx = 130;
  const cy = 130;

  return (
    <div className="my-6 flex justify-center">
      <svg viewBox="0 0 260 260" className="w-full max-w-[260px]" role="img" aria-label="Circle of fifths">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="4 3" />
        {keys.map((k, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x = cx + R * Math.cos(angle);
          const y = cy + R * Math.sin(angle);
          return (
            <g key={k.name}>
              <circle cx={x} cy={y} r="18" fill="#334155" stroke="#64748b" strokeWidth="1" />
              <text x={x} y={y - 3} textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="700" fill="#e2e8f0">
                {k.name}
              </text>
              <text x={x} y={y + 9} textAnchor="middle" dominantBaseline="central" fontSize="6.5" fill="#94a3b8">
                {k.acc}
              </text>
            </g>
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="9" fontWeight="600" fill="#64748b">Circle</text>
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="9" fontWeight="600" fill="#64748b">of Fifths</text>
      </svg>
    </div>
  );
}

/* ──────────────── HalfWholeStepDemo ──────────────────────────────── */

export function HalfWholeStepDemo() {
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const demos = [
    { label: 'Half step (E → F)', midis: [64, 65], tag: 'half1' },
    { label: 'Half step (B → C)', midis: [71, 72], tag: 'half2' },
    { label: 'Whole step (C → D)', midis: [60, 62], tag: 'whole1' },
    { label: 'Whole step (D → E)', midis: [62, 64], tag: 'whole2' },
  ];

  return (
    <div className="my-6 rounded-xl bg-slate-800/50 border border-slate-600/30 p-4">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">
        Hear the difference
      </p>
      <div className="grid grid-cols-2 gap-2">
        {demos.map((d) => (
          <button
            key={d.tag}
            type="button"
            onClick={async () => {
              setActiveGroup(d.tag);
              await playMidiNote(d.midis[0], 500);
              await new Promise((r) => setTimeout(r, 500));
              await playMidiNote(d.midis[1], 800);
              setTimeout(() => setActiveGroup(null), 800);
            }}
            className={`
              flex items-center gap-2 rounded-lg px-3 py-2.5 transition text-left
              ${activeGroup === d.tag
                ? 'bg-amber-500 text-slate-900'
                : 'bg-slate-700/80 text-slate-200 hover:bg-slate-600'
              }
            `}
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            <span className="text-[11px] font-semibold">{d.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ──────────────── RestSymbols ──────────────────────────────────── */

const SMUFL_WHOLE_REST = 0xe4e3;
const SMUFL_HALF_REST = 0xe4e4;
const SMUFL_QUARTER_REST = 0xe4e5;
const SMUFL_EIGHTH_REST = 0xe4e6;
const SMUFL_SIXTEENTH_REST = 0xe4e7;

function SmuflChar({ code }: { code: number }) {
  return (
    <span
      style={{ fontFamily: '"Bravura", "Bravura Text", serif', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}
      className="leading-none select-none"
      aria-hidden
    >
      {String.fromCodePoint(code)}
    </span>
  );
}

export function RestSymbols() {
  const rests = [
    { name: 'Whole', code: SMUFL_WHOLE_REST, beats: '4 beats' },
    { name: 'Half', code: SMUFL_HALF_REST, beats: '2 beats' },
    { name: 'Quarter', code: SMUFL_QUARTER_REST, beats: '1 beat' },
    { name: 'Eighth', code: SMUFL_EIGHTH_REST, beats: '½ beat' },
    { name: 'Sixteenth', code: SMUFL_SIXTEENTH_REST, beats: '¼ beat' },
  ];

  return (
    <div className="my-6 rounded-xl bg-slate-800/50 border border-slate-600/30 p-4">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Rest symbols</p>
      <div className="flex gap-4 flex-wrap justify-center">
        {rests.map((r) => (
          <div key={r.name} className="flex flex-col items-center gap-1.5 min-w-[56px]">
            <div className="h-12 flex items-center justify-center text-slate-200">
              <SmuflChar code={r.code} />
            </div>
            <span className="text-[11px] font-semibold text-slate-300">{r.name}</span>
            <span className="text-[9px] text-slate-500">{r.beats}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
