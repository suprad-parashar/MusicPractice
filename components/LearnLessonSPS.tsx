'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { convertVarisaiNote, parseVarisaiNote } from '@/data/saraliVarisai';
import { getInstrument, freqToNoteNameForInstrument, isSineInstrument, type InstrumentId } from '@/lib/instrumentLoader';
import type { NotationLanguage } from '@/lib/swaraNotation';
import { centsToNearestAmongRefs, varisaiTokenToFreqHz } from '@/lib/varisaiPitch';
import { autoCorrelate } from '@/lib/vocalPitchMonitor/autoCorrelate';
import { noteRowsForRange } from '@/lib/vocalPitchMonitor/noteFrequencyTable';
import { drawVpmPitchGraph } from '@/lib/vocalPitchMonitor/drawVpmPitchGraph';
import { vpmDisplayFilterStep } from '@/lib/vocalPitchMonitor/vpmDisplayFilter';
import { SwaraGlyph } from '@/components/SwaraGlyph';

const FFT_SIZE = 2048;
const MATCH_CENTS = 50;
const PITCH_MIN_HZ = 32;
const PITCH_MAX_HZ = 1600;
const GRAPH_TIME_WINDOW_SEC = 5;
const TRACE_GAP_BREAK_SEC = 0.045;
const VPM_DISPLAY_THRESHOLD_HZ = 10;
const MATCH_CLEAR_MS = 1500;

/** Sarali-style sequence in the selected key: ṣaḍjam, pañcamam, tārasthayi ṣaḍjam. */
export const SARALI_SPS_TOKENS = ['S', 'P', '>S'] as const;

/** Playback stays at written pitch; mic may match one octave below that reference on every step. */
function spsMatchRefHzList(targetHz: number): number[] {
  const down = targetHz / 2;
  return down >= PITCH_MIN_HZ ? [targetHz, down] : [targetHz];
}

function linearToLogGain(linearValue: number): number {
  if (linearValue === 0) return 0;
  return Math.pow(linearValue, 3);
}

function fireLessonConfetti() {
  const count = 120;
  const defaults = { origin: { y: 0.72 }, zIndex: 100 };
  confetti({ ...defaults, particleCount: count, spread: 70, startVelocity: 35 });
  confetti({ ...defaults, particleCount: Math.floor(count * 0.5), spread: 90, scalar: 0.85, startVelocity: 28 });
  setTimeout(() => {
    confetti({ ...defaults, particleCount: Math.floor(count * 0.4), spread: 100, startVelocity: 22, ticks: 200 });
  }, 180);
}

type CoachVariant = 'idle' | 'listen' | 'higher' | 'lower' | 'lock' | 'near';

function pitchCoachSPS(
  signedCents: number | null,
  hasPitch: boolean,
  phase: 'idle' | 'active' | 'complete'
): { headline: string; sub: string; badge: string; variant: CoachVariant } {
  if (phase === 'complete') {
    return {
      headline: 'All three steps — complete.',
      sub: 'Nice work matching each reference in your key.',
      badge: 'Complete',
      variant: 'lock',
    };
  }
  if (phase === 'idle') {
    return {
      headline: 'Ready',
      sub: 'Listen to each reference in order — then sing the same pitch. The coach gives higher / lower hints only.',
      badge: 'Coach',
      variant: 'idle',
    };
  }
  if (!hasPitch || signedCents === null) {
    return {
      headline: "I'm listening…",
      sub: 'Sing steadily toward the mic after the reference.',
      badge: 'Listening',
      variant: 'listen',
    };
  }
  const abs = Math.abs(signedCents);
  const sharp = signedCents > 0;
  if (abs <= MATCH_CENTS) {
    if (abs <= 14) {
      return {
        headline: "You're on target — hold it",
        sub: 'Keep the steady match until the bar fills.',
        badge: 'In tune',
        variant: 'lock',
      };
    }
    return {
      headline: sharp ? 'A whisper lower' : 'A whisper higher',
      sub: sharp ? 'Ease the pitch down a sliver.' : 'Lift the pitch a sliver.',
      badge: 'Almost',
      variant: 'near',
    };
  }
  if (sharp) {
    return {
      headline: abs > 55 ? 'Sing lower' : 'Try singing lower',
      sub: 'Your pitch is above the goal — relax slightly.',
      badge: 'Adjust',
      variant: 'lower',
    };
  }
  return {
    headline: abs > 55 ? 'Sing higher' : 'Try singing higher',
    sub: 'Your pitch is below the goal — add a little lift.',
    badge: 'Adjust',
    variant: 'higher',
  };
}

const COACH_SURFACE: Record<CoachVariant, string> = {
  idle: 'border-slate-600/50 from-slate-900/90 via-slate-900/70 to-slate-950 ring-slate-500/20',
  listen: 'border-indigo-500/30 from-indigo-950/50 via-slate-900/80 to-slate-950 ring-indigo-400/20',
  higher: 'border-amber-500/35 from-amber-950/35 via-slate-900/85 to-slate-950 ring-amber-400/25',
  lower: 'border-sky-500/35 from-sky-950/35 via-slate-900/85 to-slate-950 ring-sky-400/25',
  lock: 'border-emerald-500/40 from-emerald-950/40 via-slate-900/80 to-slate-950 ring-emerald-400/30',
  near: 'border-teal-500/35 from-teal-950/35 via-slate-900/85 to-slate-950 ring-teal-400/25',
};

function SwaraStepVisual({ token, notationLanguage }: { token: string; notationLanguage: NotationLanguage }) {
  const noteFull = convertVarisaiNote(token);
  const parsed = parseVarisaiNote(noteFull);
  return (
    <span className="relative inline-flex h-9 w-9 items-center justify-center sm:h-10 sm:w-10">
      {parsed.octave === 'higher' ? (
        <span
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 translate-y-[2px] text-[11px] leading-none"
          aria-hidden
        >
          •
        </span>
      ) : null}
      <SwaraGlyph swara={parsed.swara} language={notationLanguage} />
      {parsed.octave === 'lower' ? (
        <span
          className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 -translate-y-[2px] text-[11px] leading-none"
          aria-hidden
        >
          •
        </span>
      ) : null}
    </span>
  );
}

export default function LearnLessonSPS({
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
  const targetHzSteps = useMemo(
    () => [...SARALI_SPS_TOKENS].map((t) => varisaiTokenToFreqHz(baseFreq, t)),
    [baseFreq]
  );

  const [phase, setPhase] = useState<'idle' | 'active' | 'complete'>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [signedCentsLive, setSignedCentsLive] = useState<number | null>(null);
  const [matchHeldMs, setMatchHeldMs] = useState(0);
  const micRunningRef = useRef(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const soundfontPlayerRef = useRef<Awaited<ReturnType<typeof getInstrument>> | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const instrumentIdRef = useRef(instrumentId);
  const volumeRef = useRef(volume);
  instrumentIdRef.current = instrumentId;
  volumeRef.current = volume;

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timeDataRef = useRef<Float32Array>(new Float32Array(new ArrayBuffer(FFT_SIZE * 4)));
  const pitchRafRef = useRef<number | null>(null);
  const lastLiveUiEmitRef = useRef(0);
  const vpmComparisonHzRef = useRef(Number.NaN);
  const lastRafMsRef = useRef(0);
  const matchAccumMsRef = useRef(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const graphWrapRef = useRef<HTMLDivElement | null>(null);
  const pitchHistoryRef = useRef<{ t: number; hz: number }[]>([]);

  const phaseRef = useRef(phase);
  const stepIndexRef = useRef(stepIndex);
  const targetHzStepsRef = useRef(targetHzSteps);
  phaseRef.current = phase;
  stepIndexRef.current = stepIndex;
  targetHzStepsRef.current = targetHzSteps;

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = linearToLogGain(volume);
    }
  }, [volume]);

  useEffect(() => {
    if (phase === 'active') return;
    const cv = canvasRef.current;
    const wrap = graphWrapRef.current;
    if (!cv || !wrap) return;
    const wCss = Math.max(260, Math.floor(wrap.getBoundingClientRect().width));
    const hCss = 268;
    cv.width = wCss;
    cv.height = hCss;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const noteRows = noteRowsForRange('low');
    drawVpmPitchGraph(ctx, wCss, hCss, [], {
      noteRows,
      nowSec: performance.now() / 1000,
      timeWindowSec: GRAPH_TIME_WINDOW_SEC,
      traceGapBreakSec: TRACE_GAP_BREAK_SEC,
      accidentals: 'sharp',
      targetFundamentalHz: null,
      matchCents: MATCH_CENTS,
    });
  }, [phase]);

  const playPitchHz = useCallback((freq: number, durationMs: number) => {
    if (!audioContextRef.current || !masterGainRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    const stopTime = now + durationMs / 1000;

    if (!isSineInstrument(instrumentIdRef.current) && soundfontPlayerRef.current) {
      const noteName = freqToNoteNameForInstrument(freq, instrumentIdRef.current);
      soundfontPlayerRef.current.start(noteName, now, { duration: durationMs / 1000, gain: 1.5 });
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gain.gain.setValueAtTime(0.3, stopTime - 0.05);
    gain.gain.linearRampToValueAtTime(0, stopTime);
    osc.connect(gain);
    gain.connect(masterGainRef.current);
    osc.start(now);
    osc.stop(stopTime);
    oscillatorsRef.current.push(osc);
  }, []);

  const playTargetAtIndex = useCallback(
    (index: number) => {
      const hz = targetHzStepsRef.current[index];
      if (hz === undefined || hz <= 0) return;
      playPitchHz(hz, 850);
    },
    [playPitchHz]
  );

  const ensurePlaybackAudio = useCallback(async (): Promise<boolean> => {
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
        masterGainRef.current.gain.value = linearToLogGain(volumeRef.current);
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
  }, []);

  const stopMicAndLoop = useCallback(() => {
    micRunningRef.current = false;
    if (pitchRafRef.current !== null) {
      cancelAnimationFrame(pitchRafRef.current);
      pitchRafRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    analyserRef.current = null;
    pitchHistoryRef.current = [];
    vpmComparisonHzRef.current = Number.NaN;
    lastRafMsRef.current = 0;
    matchAccumMsRef.current = 0;
  }, []);

  const startMicAnalysis = useCallback(
    (ctx: AudioContext) => {
      const stream = mediaStreamRef.current;
      if (!stream) return;
      micRunningRef.current = true;
      pitchHistoryRef.current = [];
      lastRafMsRef.current = 0;
      matchAccumMsRef.current = 0;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.minDecibels = -100;
      analyser.maxDecibels = -10;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);
      analyserRef.current = analyser;

      const timeBuf = timeDataRef.current;
      const sampleRate = ctx.sampleRate;
      const noteRows = noteRowsForRange('low');

      const samplePitch = () => {
        if (!micRunningRef.current) return;
        const a = analyserRef.current;
        if (!a) return;
        a.getFloatTimeDomainData(timeBuf as unknown as Float32Array<ArrayBuffer>);

        const nowMs = performance.now();
        const deltaMs = lastRafMsRef.current > 0 ? Math.min(80, nowMs - lastRafMsRef.current) : 16;
        lastRafMsRef.current = nowMs;

        const ac = autoCorrelate(timeBuf, sampleRate);
        let rawHz: number | null = null;
        if (ac > 0 && ac >= PITCH_MIN_HZ && ac <= PITCH_MAX_HZ) {
          rawHz = ac;
        }

        const canvas = canvasRef.current;
        const wrap = graphWrapRef.current;
        const wCss = Math.max(260, Math.floor(wrap?.getBoundingClientRect().width ?? 600));
        const hCss = 268;
        if (canvas && (canvas.width !== wCss || canvas.height !== hCss)) {
          canvas.width = wCss;
          canvas.height = hCss;
        }

        const nowSec = nowMs / 1000;
        const targets = targetHzStepsRef.current;
        const idx = stepIndexRef.current;
        const targetHz = phaseRef.current === 'active' ? targets[idx] ?? null : null;

        let displayHz: number | null = null;

        if (rawHz === null) {
          vpmComparisonHzRef.current = Number.NaN;
        } else {
          const step = vpmDisplayFilterStep(rawHz, vpmComparisonHzRef.current, VPM_DISPLAY_THRESHOLD_HZ);
          vpmComparisonHzRef.current = step.nextComparisonHz;
          displayHz = step.displayHz;
        }

        const emitLiveUi = displayHz === null || nowMs - lastLiveUiEmitRef.current >= 45;
        if (emitLiveUi) {
          lastLiveUiEmitRef.current = nowMs;
          if (displayHz !== null && targetHz !== null) {
            const { signedCents } = centsToNearestAmongRefs(displayHz, spsMatchRefHzList(targetHz));
            setSignedCentsLive(signedCents);
          } else {
            setSignedCentsLive(null);
          }
        }

        if (phaseRef.current === 'active' && targetHz !== null && displayHz !== null) {
          const { absCents } = centsToNearestAmongRefs(displayHz, spsMatchRefHzList(targetHz));
          const ok = absCents <= MATCH_CENTS;
          if (ok) {
            matchAccumMsRef.current += deltaMs;
            const held = matchAccumMsRef.current;
            setMatchHeldMs(held);
            if (held >= MATCH_CLEAR_MS) {
              matchAccumMsRef.current = 0;
              setMatchHeldMs(0);
              if (idx >= targets.length - 1) {
                setPhase('complete');
                stopMicAndLoop();
                fireLessonConfetti();
              } else {
                const next = idx + 1;
                setStepIndex(next);
                setTimeout(() => playTargetAtIndex(next), 320);
              }
            }
          } else {
            matchAccumMsRef.current = 0;
            setMatchHeldMs(0);
          }
        }

        if (phaseRef.current === 'active' && displayHz !== null) {
          pitchHistoryRef.current.push({ t: nowSec, hz: displayHz });
          const cutoff = nowSec - GRAPH_TIME_WINDOW_SEC;
          while (pitchHistoryRef.current.length > 0 && pitchHistoryRef.current[0]!.t < cutoff) {
            pitchHistoryRef.current.shift();
          }
        }

        if (canvas && phaseRef.current === 'active' && targetHz !== null) {
          const c2d = canvas.getContext('2d');
          if (c2d) {
            drawVpmPitchGraph(c2d, wCss, hCss, pitchHistoryRef.current, {
              noteRows,
              nowSec,
              timeWindowSec: GRAPH_TIME_WINDOW_SEC,
              traceGapBreakSec: TRACE_GAP_BREAK_SEC,
              accidentals: 'sharp',
              targetFundamentalHz: null,
              matchCents: MATCH_CENTS,
              matchCenterFrequenciesHz: spsMatchRefHzList(targetHz),
            });
          }
        }

        pitchRafRef.current = requestAnimationFrame(samplePitch);
      };

      pitchRafRef.current = requestAnimationFrame(samplePitch);
    },
    [playTargetAtIndex, stopMicAndLoop]
  );

  const beginLesson = useCallback(async () => {
    setMicError(null);
    setSignedCentsLive(null);
    matchAccumMsRef.current = 0;
    setMatchHeldMs(0);
    setStepIndex(0);
    pitchHistoryRef.current = [];
    lastLiveUiEmitRef.current = 0;
    vpmComparisonHzRef.current = Number.NaN;

    const okPlay = await ensurePlaybackAudio();
    if (!okPlay) {
      setMicError('Could not start audio playback.');
      return;
    }

    let ctx = audioContextRef.current!;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      mediaStreamRef.current = stream;
      if (ctx.state === 'suspended') await ctx.resume();
      startMicAnalysis(ctx);
    } catch {
      setMicError('Microphone access was denied or unavailable.');
      return;
    }

    setPhase('active');
    setTimeout(() => playTargetAtIndex(0), 200);
  }, [ensurePlaybackAudio, playTargetAtIndex, startMicAnalysis]);

  const resetAfterComplete = useCallback(() => {
    setPhase('idle');
    setStepIndex(0);
    matchAccumMsRef.current = 0;
    setMatchHeldMs(0);
    setSignedCentsLive(null);
    pitchHistoryRef.current = [];
    lastLiveUiEmitRef.current = 0;
    vpmComparisonHzRef.current = Number.NaN;
  }, []);

  const playCurrentReference = useCallback(async () => {
    const ctx = audioContextRef.current;
    if (ctx?.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    playTargetAtIndex(stepIndex);
  }, [playTargetAtIndex, stepIndex]);

  useEffect(() => {
    return () => {
      stopMicAndLoop();
      oscillatorsRef.current.forEach((o) => {
        try {
          o.stop();
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
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [stopMicAndLoop]);

  const coach = pitchCoachSPS(signedCentsLive, signedCentsLive !== null, phase);

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 sm:p-8 shadow-2xl">
      <h2 className="text-xl font-light tracking-wide text-slate-100 sm:text-2xl">Sa-Pa-Sa</h2>
      <p className="mt-2 text-sm text-slate-400">
        Sarali-style: match the three notes below in whatever key you have selected (sidebar). Same flow as the tritone lesson:
        listen, sing, coach feedback, pitch graph. On each step the reference may sound high; you may sing the same
        swara <strong className="text-slate-200">one octave lower</strong> and still pass (±{MATCH_CENTS}¢ to either the
        reference tone or that octave).
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-end gap-3">
          {SARALI_SPS_TOKENS.map((tok, i) => {
            const isCurrent = phase === 'active' && i === stepIndex;
            const isDone = phase === 'complete' || (phase === 'active' && i < stepIndex);
            return (
              <div
                key={tok + String(i)}
                className={`
                  flex flex-col items-center justify-center rounded-xl border px-3 py-2 transition-all
                  ${isCurrent ? 'scale-105 border-amber-400/60 bg-amber-500/10 shadow-md ring-2 ring-amber-300/40' : ''}
                  ${isDone && !isCurrent ? 'border-emerald-800/50 bg-emerald-950/30' : ''}
                  ${!isCurrent && !isDone ? 'border-slate-700/80 bg-slate-800/50' : ''}
                `}
              >
                <div className={`text-lg sm:text-xl ${isCurrent ? 'text-amber-100' : isDone ? 'text-emerald-200' : 'text-slate-300'}`}>
                  <SwaraStepVisual token={tok} notationLanguage={notationLanguage} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {micError && (
        <p className="mt-4 rounded-lg border border-rose-800/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-200" role="alert">
          {micError}
        </p>
      )}

      <div className="mt-6 space-y-4">
        <div ref={graphWrapRef}>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">Pitch</p>
          <canvas
            ref={canvasRef}
            width={600}
            height={268}
            className="h-[min(268px,55vh)] w-full max-w-full rounded-xl border border-slate-600/50 bg-white shadow-sm"
          />
        </div>

        <div
          className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-xl ring-1 ring-inset ring-white/5 sm:p-6 ${COACH_SURFACE[coach.variant]}`}
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" aria-hidden />
          <div className="flex gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-lg font-semibold text-white shadow-lg shadow-violet-500/20"
              aria-hidden
            >
              AI
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/90">{coach.badge}</p>
              <p className="mt-2 text-lg font-semibold leading-snug text-white sm:text-xl">{coach.headline}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300/95">{coach.sub}</p>
              {phase === 'active' && (
                <p className="mt-4 border-t border-white/10 pt-3 text-xs text-slate-400/95">
                  Steady hold {Math.round(matchHeldMs)} / {MATCH_CLEAR_MS} ms
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {phase === 'idle' && (
          <button
            type="button"
            onClick={beginLesson}
            className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-amber-500/25 transition hover:bg-amber-400"
          >
            Begin lesson
          </button>
        )}
        {phase === 'active' && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void playCurrentReference()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-500/80 bg-slate-800/90 px-4 py-2.5 text-sm font-medium text-slate-100 shadow-sm transition hover:border-amber-500/40 hover:bg-slate-700/90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-amber-400" aria-hidden>
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
              Play reference
            </button>
            <p className="text-sm text-slate-400">Follow the highlighted note until the hold completes.</p>
          </div>
        )}
        {phase === 'complete' && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-lg font-medium text-emerald-400">Lesson complete — great work.</p>
            <button
              type="button"
              onClick={resetAfterComplete}
              className="rounded-xl border border-slate-500 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
            >
              Back
            </button>
            <button type="button" onClick={resetAfterComplete} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400">
              Practice again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
