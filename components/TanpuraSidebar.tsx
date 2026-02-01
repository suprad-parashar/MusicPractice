'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { getStored, setStored } from '@/lib/storage';

interface TanpuraString {
  noiseSource: AudioBufferSourceNode | null;
  oscillators: OscillatorNode[];
  gainNodes: GainNode[];
  filters: BiquadFilterNode[];
  formantFilters: BiquadFilterNode[];
  lfo?: OscillatorNode;
  lfoGain?: GainNode;
}

interface TanpuraSidebarProps {
  baseFreq: number;
}

const TANPURA_VOLUME_KEY = 'tanpuraVolume';

export default function TanpuraSidebar({ baseFreq }: TanpuraSidebarProps) {
  const [storageReady, setStorageReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const hasLoadedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const stringsRef = useRef<TanpuraString[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // Initialize cleanup
  useEffect(() => {
    return () => {
      stopTanpura();
    };
  }, []);

  // Load persisted tanpura volume before showing UI (avoids flash of default)
  useLayoutEffect(() => {
    const stored = getStored<number>(TANPURA_VOLUME_KEY, 0.5);
    if (typeof stored === 'number' && stored >= 0 && stored <= 1) setVolume(stored);
    hasLoadedRef.current = true;
    setStorageReady(true);
  }, []);

  // Persist tanpura volume when it changes
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    setStored(TANPURA_VOLUME_KEY, volume);
  }, [volume]);

  // Restart tanpura when baseFreq changes (e.g. key changed in sidebar)
  useEffect(() => {
    if (!isPlayingRef.current) return;
    stopTanpura();
    const t = setTimeout(() => startTanpura(), 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseFreq]);

  // Create a tanpura string with proper jawari timbre
  const createTanpuraString = (
    audioContext: AudioContext,
    baseFreq: number,
    volume: number,
    stringIndex: number
  ): TanpuraString => {
    const stringGain = audioContext.createGain();
    stringGain.gain.value = volume;
    stringGain.connect(masterGainRef.current!);

    const oscillators: OscillatorNode[] = [];
    const gainNodes: GainNode[] = [];
    const filters: BiquadFilterNode[] = [];
    const formantFilters: BiquadFilterNode[] = [];

    // Create fundamental and strong harmonics (1st, 2nd, 3rd, 4th, 5th, 8th)
    const harmonicWeights = [
      { harmonic: 1, weight: 1.0 },
      { harmonic: 2, weight: 0.6 },
      { harmonic: 3, weight: 0.4 },
      { harmonic: 4, weight: 0.25 },
      { harmonic: 5, weight: 0.15 },
      { harmonic: 8, weight: 0.1 },
    ];

    harmonicWeights.forEach(({ harmonic, weight }, index) => {
      const osc = audioContext.createOscillator();
      const oscGain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      const formantFilter = audioContext.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.value = baseFreq * harmonic;
      
      const detune = (Math.random() - 0.5) * 2;
      osc.detune.value = detune;

      filter.type = 'lowpass';
      filter.frequency.value = baseFreq * 12;
      filter.Q.value = 0.7;

      formantFilter.type = 'bandpass';
      const formantFreq = baseFreq * harmonic * (1.2 + Math.random() * 0.3);
      formantFilter.frequency.value = formantFreq;
      formantFilter.Q.value = 8 + Math.random() * 4;

      oscGain.gain.value = weight * (index === 0 ? 1 : 0.5);

      osc.connect(filter);
      filter.connect(formantFilter);
      formantFilter.connect(oscGain);
      oscGain.connect(stringGain);

      osc.start();
      oscillators.push(osc);
      gainNodes.push(oscGain);
      filters.push(filter);
      formantFilters.push(formantFilter);
    });

    // Add noise for jawari effect
    let noiseSource: AudioBufferSourceNode | null = null;
    try {
      const bufferSize = audioContext.sampleRate * 2;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      noiseSource = audioContext.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;
      
      const noiseGain = audioContext.createGain();
      const noiseFilter = audioContext.createBiquadFilter();
      
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = baseFreq * 2;
      noiseFilter.Q.value = 2;
      noiseGain.gain.value = 0.08;
      
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(stringGain);
      
      noiseSource.start();
    } catch (error) {
      console.warn('Could not create noise source:', error);
    }

    // Add subtle LFO for natural vibrato
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1 + Math.random() * 0.1;
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(stringGain.gain);
    lfo.start();

    return { noiseSource, oscillators, gainNodes, filters, formantFilters, lfo, lfoGain };
  };

  // Convert linear volume (0-1) to logarithmic gain
  const linearToLogGain = (linearValue: number): number => {
    if (linearValue === 0) return 0;
    // Use cubic curve for logarithmic feel: gain = volume^3
    return Math.pow(linearValue, 3);
  };

  const startTanpura = () => {
    if (isPlayingRef.current && audioContextRef.current) {
      stopTanpura();
      setTimeout(() => {
        startTanpura();
      }, 100);
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const masterGain = audioContext.createGain();
      masterGain.gain.value = linearToLogGain(volume);
      masterGain.connect(audioContext.destination);
      masterGainRef.current = masterGain;

      const stringConfigs = [
        { freq: baseFreq * 0.75, volume: 0.45 },
        { freq: baseFreq * 1.0, volume: 0.55 },
        { freq: baseFreq * 1.0, volume: 0.50 },
        { freq: baseFreq * 0.5, volume: 0.40 },
      ];

      const strings: TanpuraString[] = [];

      stringConfigs.forEach((config, index) => {
        const string = createTanpuraString(
          audioContext,
          config.freq,
          config.volume,
          index
        );
        strings.push(string);
      });

      stringsRef.current = strings;
      isPlayingRef.current = true;
      setIsPlaying(true);
    } catch (error) {
      console.error('Error starting tanpura:', error);
      isPlayingRef.current = false;
      setIsPlaying(false);
    }
  };

  const stopTanpura = () => {
    stringsRef.current.forEach((string) => {
      if (string.noiseSource) {
        try {
          string.noiseSource.stop();
        } catch (e) {}
      }
      
      string.oscillators.forEach(osc => {
        try {
          osc.stop();
        } catch (e) {}
      });
      
      if (string.lfo) {
        try {
          string.lfo.stop();
        } catch (e) {}
      }
    });

    stringsRef.current = [];

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    masterGainRef.current = null;
    isPlayingRef.current = false;
    setIsPlaying(false);
  };

  const toggleTanpura = () => {
    if (isPlaying) {
      stopTanpura();
    } else {
      startTanpura();
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = linearToLogGain(newVolume);
    }
  };

  if (!storageReady) {
    return (
      <div className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl border border-slate-700/50 animate-pulse">
        <div className="text-center mb-4">
          <div className="h-6 bg-slate-700 rounded w-24 mx-auto mb-1" />
          <div className="h-3 bg-slate-700/70 rounded w-20 mx-auto" />
        </div>
        <div className="flex flex-col items-center mb-4">
          <div className="w-20 h-20 rounded-full bg-slate-700" />
          <div className="h-3 w-12 bg-slate-700/70 rounded mt-2" />
        </div>
        <div className="h-8 bg-slate-700/50 rounded" />
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl border border-slate-700/50">
        <div className="text-center mb-4">
          <h2 className="text-xl font-light mb-1 tracking-wide">Tanpura</h2>
          <p className="text-slate-400 text-xs">Drone Control</p>
        </div>

        <div className="flex flex-col items-center mb-4">
          <button
            onClick={toggleTanpura}
            className={`
              relative w-20 h-20 rounded-full
              transition-all duration-300 ease-out
              ${isPlaying 
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/50 scale-105' 
                : 'bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700'
              }
              flex items-center justify-center
            `}
          >
            <svg
              className={`w-8 h-8 transition-transform duration-300`}
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
          <p className="mt-2 text-slate-400 text-xs">
            {isPlaying ? 'Playing' : 'Stopped'}
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2 text-center">
            Volume
          </label>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-slate-400 text-xs w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
    </div>
  );
}
