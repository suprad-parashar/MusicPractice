'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';
import TempoControl from '@/components/TempoControl';
import RhythmGlyph from '@/components/RhythmGlyph';
import {
  type RhythmLevel,
  type RhythmRow,
  type RhythmSegment,
  generateDrill,
  rowOnsets,
  onsetsInSegment,
  durationSecondsForRow,
  sixteenthSeconds,
  LEVEL_DESCRIPTIONS,
  SIXTEENTHS_PER_ROW,
} from '@/lib/rhythmTraining';
import { getStored, setStored } from '@/lib/storage';
import { RHYTHM_DEFAULT_BPM, PRACTICE_TEMPO_MAX_BPM } from '@/lib/defaultTempo';

const STORAGE_KEY = 'rhythmTraining';
type Stored = {
  level?: RhythmLevel;
  bpm?: number;
  seed?: number;
  shakerEnabled?: boolean;
  /** @deprecated migrated to shakerEnabled */
  shakerVolume?: number;
};

/** Linear bus gain when the shaker toggle is on (5%). */
const SHAKER_ON_GAIN = 0.05;

const LEVELS: RhythmLevel[] = [1, 2, 3, 4, 5];
const COUNT_IN_BEATS = 4;

function nextSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}

function RhythmRowGrid({ row, activeSegIndex }: { row: RhythmRow; activeSegIndex?: number }) {
  return (
    <div
      className="grid w-full gap-px sm:gap-1 min-h-[4.25rem] sm:min-h-[4.5rem]"
      style={{ gridTemplateColumns: `repeat(${SIXTEENTHS_PER_ROW}, minmax(0, 1fr))` }}
    >
      {row.map((seg: RhythmSegment, i: number) => {
        const active = activeSegIndex === i;
        return (
          <div
            key={`${seg.kind}-${i}`}
            className={`
              rounded-lg flex items-center justify-center px-1 py-2 sm:px-2 transition-colors duration-75
              border shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--text-primary)_7%,transparent)]
              ${active
                ? 'bg-amber-500/20 border-amber-400/60'
                : 'bg-gradient-to-b from-[color-mix(in_srgb,var(--input-bg)_92%,var(--text-muted)_6%)] to-[var(--input-bg)] border-[color-mix(in_srgb,var(--border)_72%,transparent)]'
              }
            `}
            style={{ gridColumn: `span ${seg.span16}` }}
          >
            <div className={`flex w-full min-w-0 items-center justify-center [&_svg]:h-12 [&_svg]:max-h-[min(3.35rem,100%)] [&_svg]:w-auto [&_svg]:max-w-full sm:[&_svg]:h-14 ${active ? 'text-amber-300' : 'text-[var(--text-primary)]'}`}>
              <RhythmGlyph kind={seg.kind} className="h-12 w-auto max-w-full sm:h-14" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const RhythmRowStaff = RhythmRowGrid;

export default function RhythmTraining() {
  const [ready, setReady] = useState(false);
  const [level, setLevel] = useState<RhythmLevel>(1);
  const [bpm, setBpm] = useState(RHYTHM_DEFAULT_BPM);
  const [seed, setSeed] = useState(nextSeed);
  const [shakerEnabled, setShakerEnabled] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [beatDot, setBeatDot] = useState(0);
  /** [rowIndex, segmentIndex] of the segment currently sounding — null when idle. */
  const [activeSeg, setActiveSeg] = useState<[number, number] | null>(null);
  const kickRef = useRef<Tone.MembraneSynth | null>(null);
  const snareRef = useRef<Tone.NoiseSynth | null>(null);
  const shakerRef = useRef<Tone.NoiseSynth | null>(null);
  const masterGainRef = useRef<Tone.Gain | null>(null);
  const busRef = useRef<Tone.Gain | null>(null);
  const snareFilterRef = useRef<Tone.Filter | null>(null);
  const snareOutRef = useRef<Tone.Gain | null>(null);
  const shakerFilterRef = useRef<Tone.Filter | null>(null);
  const shakerOutRef = useRef<Tone.Gain | null>(null);
  const rafRef = useRef<number | null>(null);
  const playGenRef = useRef(0);

  useLayoutEffect(() => {
    const s = getStored<Stored>(STORAGE_KEY, {});
    if (s.level && LEVELS.includes(s.level)) setLevel(s.level);
    if (typeof s.bpm === 'number' && s.bpm >= 30 && s.bpm <= PRACTICE_TEMPO_MAX_BPM) setBpm(s.bpm);
    if (typeof s.seed === 'number') setSeed(s.seed);
    if (typeof s.shakerEnabled === 'boolean') {
      setShakerEnabled(s.shakerEnabled);
    } else if (
      typeof s.shakerVolume === 'number' &&
      s.shakerVolume >= 0 &&
      s.shakerVolume <= 1
    ) {
      setShakerEnabled(s.shakerVolume > 0);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setStored(STORAGE_KEY, { level, bpm, seed, shakerEnabled });
  }, [level, bpm, seed, shakerEnabled, ready]);

  const shakerGain = shakerEnabled ? SHAKER_ON_GAIN : 0;

  useEffect(() => {
    const g = shakerOutRef.current?.gain;
    if (!g) return;
    const t = Tone.now();
    g.cancelScheduledValues(t);
    g.setValueAtTime(shakerGain, t);
  }, [shakerGain]);

  const drill = useMemo(() => generateDrill(level, seed), [level, seed]);

  /** Create fresh NoiseSynth instances (snare + shaker), disposing old ones. */
  const rebuildNoiseSynths = useCallback(() => {
    const bus = busRef.current;
    if (!bus) return;

    snareRef.current?.dispose();
    snareFilterRef.current?.dispose();
    snareOutRef.current?.dispose();
    shakerRef.current?.dispose();
    shakerFilterRef.current?.dispose();
    shakerOutRef.current?.dispose();

    const snareFilter = new Tone.Filter({ type: 'bandpass', frequency: 3200, Q: 0.6 });
    const snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.13, sustain: 0, release: 0.06 },
      volume: Tone.gainToDb(0.85),
    });
    snare.connect(snareFilter);
    const snareOut = new Tone.Gain(1);
    snareFilter.connect(snareOut);
    snareOut.connect(bus);

    const shakerFilter = new Tone.Filter({ type: 'highpass', frequency: 4500, Q: 0.4 });
    const shaker = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.04 },
      volume: Tone.gainToDb(1),
    });
    shaker.connect(shakerFilter);
    const shakerOut = new Tone.Gain(shakerEnabled ? SHAKER_ON_GAIN : 0);
    shakerFilter.connect(shakerOut);
    shakerOut.connect(bus);

    snareRef.current = snare;
    snareFilterRef.current = snareFilter;
    snareOutRef.current = snareOut;
    shakerRef.current = shaker;
    shakerFilterRef.current = shakerFilter;
    shakerOutRef.current = shakerOut;
  }, [shakerEnabled]);

  useEffect(() => {
    const master = new Tone.Gain(0).toDestination();
    const bus = new Tone.Gain(1);
    const soften = new Tone.Filter(10500, 'lowpass', -12);
    bus.connect(soften);
    soften.connect(master);

    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.016,
      octaves: 5,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.32, sustain: 0, release: 0.1 },
      volume: Tone.gainToDb(0.82),
    }).connect(bus);

    kickRef.current = kick;
    masterGainRef.current = master;
    busRef.current = bus;

    return () => {
      kick.dispose();
      snareRef.current?.dispose();
      shakerRef.current?.dispose();
      snareFilterRef.current?.dispose();
      snareOutRef.current?.dispose();
      shakerFilterRef.current?.dispose();
      shakerOutRef.current?.dispose();
      bus.dispose();
      soften.dispose();
      master.dispose();
      kickRef.current = null;
      snareRef.current = null;
      shakerRef.current = null;
      masterGainRef.current = null;
      busRef.current = null;
    };
  }, []);

  const stopPlayback = useCallback(() => {
    playGenRef.current += 1;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const g = masterGainRef.current?.gain;
    if (g) {
      const t = Tone.now();
      g.cancelScheduledValues(t);
      g.setValueAtTime(0, t);
    }
    kickRef.current?.envelope.cancel(0);
    rebuildNoiseSynths();
    setPlaying(false);
    setBeatDot(0);
    setActiveSeg(null);
  }, [rebuildNoiseSynths]);

  /**
   * Build a map from sixteenth index → [rowIndex, segIndex] so we can
   * highlight the correct tile during playback.
   */
  const segMap = useMemo(() => {
    const map: Array<[number, number]> = [];
    for (let r = 0; r < drill.rows.length; r++) {
      const row = drill.rows[r];
      for (let s = 0; s < row.length; s++) {
        for (let k = 0; k < row[s].span16; k++) map.push([r, s]);
      }
    }
    return map;
  }, [drill]);

  const playDrill = useCallback(async () => {
    const gen = ++playGenRef.current;
    await Tone.start();

    const mg = masterGainRef.current?.gain;
    if (mg) {
      const t = Tone.now();
      mg.cancelScheduledValues(t);
      mg.setValueAtTime(1, t);
    }

    const rows = drill.rows;
    const sec16 = sixteenthSeconds(bpm);
    const rowDur = durationSecondsForRow(bpm);
    const beatDur = 60 / bpm;
    const countInSec = COUNT_IN_BEATS * beatDur;

    const kick = kickRef.current;
    if (!kick || !busRef.current) return;

    kick.envelope.cancel(0);
    rebuildNoiseSynths();
    const snare = snareRef.current;
    const shaker = shakerRef.current;
    if (!snare || !shaker) return;

    const ctx = Tone.getContext().rawContext as AudioContext;
    const t0 = Math.max(ctx.currentTime + 0.08, Tone.now() + 0.03);

    const totalBeats = COUNT_IN_BEATS + rows.length * 4;
    for (let b = 0; b < totalBeats; b++) {
      const when = t0 + b * beatDur;
      shaker.triggerAttackRelease(0.07, when, 0.85);
    }

    for (let i = 0; i < COUNT_IN_BEATS; i++) {
      const when = t0 + i * beatDur;
      kick.triggerAttackRelease('C2', '16n', when, 0.82);
    }

    const rhythmStart = t0 + countInSec;
    const allHits: { when: number; onBeat: boolean }[] = [];
    let acc = 0;
    for (let r = 0; r < rows.length; r++) {
      const onsets = rowOnsets(rows[r]);
      for (const o of onsets) {
        const when = rhythmStart + acc + o * sec16;
        allHits.push({ when, onBeat: Math.abs(o - Math.round(o)) < 0.01 && Math.round(o) % 4 === 0 });
      }
      acc += rowDur;
    }
    allHits.sort((a, b) => a.when - b.when);
    for (const h of allHits) {
      snare.triggerAttackRelease(h.onBeat ? 0.1 : 0.065, h.when, h.onBeat ? 0.72 : 0.58);
    }

    setPlaying(true);
    setActiveSeg(null);
    const startWall = performance.now();
    const totalSec = countInSec + rows.length * rowDur;

    const tick = () => {
      if (gen !== playGenRef.current) return;
      const elapsed = (performance.now() - startWall) / 1000;
      if (elapsed >= totalSec - 0.02) {
        setBeatDot(0);
        setPlaying(false);
        setActiveSeg(null);
        if (masterGainRef.current?.gain) {
          const tt = Tone.now();
          masterGainRef.current.gain.cancelScheduledValues(tt);
          masterGainRef.current.gain.setValueAtTime(0, tt);
        }
        rafRef.current = null;
        return;
      }

      if (elapsed < countInSec) {
        const b = Math.min(COUNT_IN_BEATS - 1, Math.floor(elapsed / beatDur));
        setBeatDot(b);
        setActiveSeg(null);
      } else {
        const e2 = elapsed - countInSec;
        const rowIndex = Math.min(Math.floor(e2 / rowDur), rows.length - 1);
        const inRow = e2 - rowIndex * rowDur;
        const sixteenth = Math.min(SIXTEENTHS_PER_ROW - 1, Math.floor(inRow / sec16));
        const beat = Math.min(3, Math.floor(sixteenth / 4));
        setBeatDot(beat);

        const globalSixteenth = rowIndex * SIXTEENTHS_PER_ROW + sixteenth;
        if (globalSixteenth < segMap.length) {
          setActiveSeg(segMap[globalSixteenth]);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [bpm, drill.rows, segMap, rebuildNoiseSynths]);

  const newDrill = () => {
    stopPlayback();
    setSeed(nextSeed());
  };

  if (!ready) {
    return (
      <div className="w-full max-w-lg mx-auto flex items-center justify-center min-h-[200px]">
        <span className="text-slate-500 text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto min-w-0 px-1">
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {LEVELS.map((lv) => (
          <button
            key={lv}
            type="button"
            onClick={() => {
              stopPlayback();
              setLevel(lv);
            }}
            className={`
              px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200
              ${level === lv
                ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30 scale-105'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }
            `}
          >
            Level {lv}
          </button>
        ))}
      </div>

      <p className="text-center text-xs sm:text-sm text-[var(--text-muted)] mb-5 max-w-md mx-auto">{LEVEL_DESCRIPTIONS[level]}</p>

      <div className="mb-6 flex w-full justify-center px-1">
        <TempoControl value={bpm} onChange={setBpm} disabled={playing} />
      </div>

      <div className="mb-6 flex justify-center px-1">
        <button
          type="button"
          role="switch"
          aria-checked={shakerEnabled}
          aria-label="Shaker accompaniment"
          onClick={() => setShakerEnabled((v) => !v)}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
            ${shakerEnabled
              ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30'
              : 'bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--border)]/40'
            }
          `}
        >
          Shaker: {shakerEnabled ? 'On' : 'Off'}
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 sm:p-5 shadow-[0_1px_0_0_color-mix(in_srgb,var(--text-primary)_5%,transparent),0_12px_40px_-12px_rgba(0,0,0,0.35)]">
        <p className="text-center text-[11px] text-[var(--text-muted)] mb-4">Kick count-in (4 beats), then snare on each note</p>

        <div className="flex justify-center gap-3 sm:gap-3.5 mb-5" aria-label="Beats in the measure">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`
                w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 transition-all duration-100
                border-[color-mix(in_srgb,var(--accent)_65%,var(--border))]
                ${playing && beatDot === i
                  ? 'bg-accent shadow-[0_0_14px_color-mix(in_srgb,var(--accent)_50%,transparent)] scale-110'
                  : 'bg-[var(--card-bg)]'
                }
              `}
            />
          ))}
        </div>

        <div
          className="space-y-1.5 mb-6 p-2.5 sm:p-3 rounded-xl bg-[var(--page-bg)]/40 border border-[color-mix(in_srgb,var(--border)_55%,transparent)]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent 0, transparent calc(25% - 0.5px), color-mix(in srgb, var(--border) 40%, transparent) calc(25% - 0.5px), color-mix(in srgb, var(--border) 40%, transparent) 25%)',
          }}
        >
          {drill.rows.map((row, idx) => (
            <RhythmRowStaff
              key={`${drill.id}-r${idx}`}
              row={row}
              activeSegIndex={activeSeg && activeSeg[0] === idx ? activeSeg[1] : undefined}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <button
            type="button"
            onClick={newDrill}
            disabled={playing}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--border)]/40 disabled:opacity-50"
          >
            New drill
          </button>
          {!playing ? (
            <button
              type="button"
              onClick={playDrill}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/25 hover:brightness-110"
            >
              Play
            </button>
          ) : (
            <button
              type="button"
              onClick={stopPlayback}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border)]"
            >
              Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
