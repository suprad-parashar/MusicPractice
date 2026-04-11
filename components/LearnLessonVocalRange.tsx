'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { hzToMidiFloat } from '@/lib/varisaiPitch';
import { autoCorrelate } from '@/lib/vocalPitchMonitor/autoCorrelate';
import {
  recommendPracticeKey,
  robustHighMidi,
  robustLowMidi,
  type PracticeKeyRecommendation,
} from '@/lib/vocalRangeKey';
import { midiToNoteName } from '@/lib/instrumentLoader';

const FFT_SIZE = 2048;
const RMS_MIN = 0.012;
const PITCH_MIN_HZ = 32;
const PITCH_MAX_HZ = 1600;
const CAPTURE_MS = 8000;
/** At least one octave between measured extremes (plus fifths window is easier to satisfy). */
const MIN_RANGE_SEMITONES = 12;

function linearToLogGain(linearValue: number): number {
  if (linearValue === 0) return 0;
  return Math.pow(linearValue, 3);
}

type LessonPhase = 'idle' | 'capturing' | 'results';

export default function LearnLessonVocalRange({ volume = 0.8, footer }: { volume?: number; footer?: ReactNode }) {
  const [phase, setPhase] = useState<LessonPhase>('idle');
  const [captureSegment, setCaptureSegment] = useState<'high' | 'low'>('high');
  const [remainingSec, setRemainingSec] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<PracticeKeyRecommendation | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timeDataRef = useRef<Float32Array>(new Float32Array(new ArrayBuffer(FFT_SIZE * 4)));
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const segmentEndRef = useRef(0);
  const segmentStartRef = useRef(0);
  const segmentRef = useRef<'high' | 'low'>('high');
  const highMidiSamplesRef = useRef<number[]>([]);
  const lowMidiSamplesRef = useRef<number[]>([]);
  const lastSecondShownRef = useRef(-1);
  const barFillRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = linearToLogGain(volume);
    }
  }, [volume]);

  const stopMic = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const processCapture = useCallback(() => {
    const hiS = highMidiSamplesRef.current;
    const loS = lowMidiSamplesRef.current;
    const hi = robustHighMidi(hiS);
    const lo = robustLowMidi(loS);

    if (hi === null || lo === null) {
      setProcessError('We did not get enough steady pitch in one or both passes. Find a quiet space and try again.');
      setPhase('idle');
      return;
    }
    if (hi - lo < MIN_RANGE_SEMITONES) {
      setProcessError(
        `We need at least ${MIN_RANGE_SEMITONES} semitones (one octave) between your low and high. Use a clearer tone in a quiet room, or widen your comfortable range.`
      );
      setPhase('idle');
      return;
    }

    setRecommendation(recommendPracticeKey(lo, hi));
    setProcessError(null);
    setPhase('results');
  }, []);

  const loop = useCallback(
    (ctx: AudioContext) => {
      const timeBuf = timeDataRef.current;
      const sampleRate = ctx.sampleRate;

      const tick = () => {
        if (!runningRef.current) return;
        const a = analyserRef.current;
        if (!a) return;

        const now = performance.now();
        if (now >= segmentEndRef.current) {
          if (segmentRef.current === 'high') {
            segmentRef.current = 'low';
            segmentStartRef.current = now;
            segmentEndRef.current = now + CAPTURE_MS;
            lastSecondShownRef.current = -1;
            setCaptureSegment('low');
            if (barFillRef.current) barFillRef.current.style.width = '0%';
          } else {
            stopMic();
            processCapture();
            return;
          }
        }

        const secLeft = Math.max(0, Math.ceil((segmentEndRef.current - now) / 1000));
        if (secLeft !== lastSecondShownRef.current) {
          lastSecondShownRef.current = secLeft;
          setRemainingSec(secLeft);
        }

        const bar = barFillRef.current;
        if (bar) {
          const elapsedSeg = now - segmentStartRef.current;
          const p = Math.min(100, Math.max(0, (elapsedSeg / CAPTURE_MS) * 100));
          bar.style.width = `${p}%`;
        }

        a.getFloatTimeDomainData(timeBuf as unknown as Float32Array<ArrayBuffer>);
        let rms = 0;
        for (let i = 0; i < timeBuf.length; i++) rms += timeBuf[i]! * timeBuf[i]!;
        rms = Math.sqrt(rms / timeBuf.length);

        if (rms >= RMS_MIN) {
          const ac = autoCorrelate(timeBuf, sampleRate);
          if (ac > 0 && ac >= PITCH_MIN_HZ && ac <= PITCH_MAX_HZ) {
            const m = hzToMidiFloat(ac);
            if (segmentRef.current === 'high') {
              highMidiSamplesRef.current.push(m);
            } else {
              lowMidiSamplesRef.current.push(m);
            }
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [processCapture, stopMic]
  );

  const begin = useCallback(async () => {
    setMicError(null);
    setProcessError(null);
    setRecommendation(null);
    highMidiSamplesRef.current = [];
    lowMidiSamplesRef.current = [];
    segmentRef.current = 'high';
    setCaptureSegment('high');

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      const actx = audioContextRef.current;
      if (actx.state === 'suspended') await actx.resume();

      if (!masterGainRef.current) {
        masterGainRef.current = actx.createGain();
        masterGainRef.current.connect(actx.destination);
        masterGainRef.current.gain.value = linearToLogGain(volumeRef.current);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });
      mediaStreamRef.current = stream;

      const source = actx.createMediaStreamSource(stream);
      const analyser = actx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.minDecibels = -100;
      analyser.maxDecibels = -10;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);
      analyserRef.current = analyser;

      const start = performance.now();
      segmentStartRef.current = start;
      segmentEndRef.current = start + CAPTURE_MS;
      lastSecondShownRef.current = -1;
      setRemainingSec(Math.ceil(CAPTURE_MS / 1000));
      if (barFillRef.current) barFillRef.current.style.width = '0%';

      runningRef.current = true;
      setPhase('capturing');
      loop(actx);
    } catch {
      setMicError('Microphone access was denied or unavailable.');
    }
  }, [loop]);

  const resetLesson = useCallback(() => {
    stopMic();
    setPhase('idle');
    setProcessError(null);
    setRecommendation(null);
  }, [stopMic]);

  useEffect(() => {
    return () => {
      stopMic();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      masterGainRef.current = null;
    };
  }, [stopMic]);

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 sm:p-8 shadow-2xl">
      <h2 className="text-xl sm:text-2xl font-light tracking-wide text-slate-100">Range and Key</h2>
      <p className="mt-2 text-sm text-slate-400">
        You&apos;ll sing twice into the mic: first as <strong className="text-slate-200">high as feels easy</strong> — no
        pushing or screaming — then as <strong className="text-slate-200">low as stays full</strong>, without going
        breathy. We track pitch, trim outliers, and suggest a comfortable major key and tonic for practice.
      </p>

      {micError && (
        <p className="mt-4 rounded-lg border border-rose-800/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-200" role="alert">
          {micError}
        </p>
      )}
      {processError && phase === 'idle' && (
        <p className="mt-4 rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100/90" role="status">
          {processError}
        </p>
      )}

      {phase === 'idle' && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => void begin()}
            className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-amber-500/25 transition hover:bg-amber-400"
          >
            Start measurement
          </button>
        </div>
      )}

      {phase === 'capturing' && (
        <div className="mt-8 space-y-4 rounded-2xl border border-slate-600/60 bg-slate-800/40 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {captureSegment === 'high' ? 'Pass 1 of 2 — high' : 'Pass 2 of 2 — low'}
          </p>
          <p className="text-lg font-medium text-slate-100">
            {captureSegment === 'high'
              ? 'Slide up to your highest easy note and hold it steadily.'
              : 'Slide down to your lowest full note — keep tone supported, not airy.'}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-light tabular-nums text-amber-400">{remainingSec}</span>
            <span className="text-sm text-slate-500">seconds left</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
            <div ref={barFillRef} className="h-full w-0 rounded-full bg-amber-500/90" />
          </div>
        </div>
      )}

      {phase === 'results' && recommendation && (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-5 sm:p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-400/90">Your comfortable range</h3>
            <p className="mt-3 text-2xl font-light text-slate-100">
              {recommendation.lowLabel}
              <span className="mx-2 text-slate-500">–</span>
              {recommendation.highLabel}
            </p>
            <p className="mt-2 text-sm text-slate-400">About {recommendation.rangeSemitones} semitones usable span.</p>
          </div>

          <div className="rounded-2xl border border-violet-800/40 bg-violet-950/20 p-5 sm:p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-300/90">Suggested practice key</h3>
            <p className="mt-3 text-xl font-semibold text-white">{recommendation.suggestedMajorKey}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300/95">
              Tonic placement: <strong className="text-slate-100">{recommendation.tonicLabel}</strong> (
              {recommendation.tonicHz.toFixed(1)} Hz). Range anchor ≈ {midiToNoteName(Math.round(recommendation.anchorMidi))} (favors
              room above for high phrases).
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">{recommendation.blurb}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={resetLesson}
              className="rounded-xl border border-slate-500 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
            >
              Measure again
            </button>
          </div>
        </div>
      )}

      {footer ? <div className="mt-8 border-t border-slate-600/40 pt-6">{footer}</div> : null}
    </div>
  );
}
