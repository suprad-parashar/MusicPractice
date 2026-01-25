'use client';

import { useState, useEffect, useRef } from 'react';

// Carnatic music keys (Swaras) - frequencies in Hz
const KEYS = {
  'C': 261.63,
  'C#': 277.18,
  'D': 293.66,
  'D#': 311.13,
  'E': 329.63,
  'F': 349.23,
  'F#': 369.99,
  'G': 392.00,
  'G#': 415.30,
  'A': 440.00,
  'A#': 466.16,
  'B': 493.88,
};

type KeyName = keyof typeof KEYS;

interface TanpuraString {
  noiseSource: AudioBufferSourceNode | null;
  oscillators: OscillatorNode[];
  gainNodes: GainNode[];
  filters: BiquadFilterNode[];
  formantFilters: BiquadFilterNode[];
  lfo?: OscillatorNode;
  lfoGain?: GainNode;
}

export default function Tanpura() {
  const [selectedKey, setSelectedKey] = useState<KeyName>('C');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
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
      { harmonic: 1, weight: 1.0 },    // Fundamental - strongest
      { harmonic: 2, weight: 0.6 },    // Octave
      { harmonic: 3, weight: 0.4 },     // Fifth above octave
      { harmonic: 4, weight: 0.25 },   // Two octaves
      { harmonic: 5, weight: 0.15 },   // Major third
      { harmonic: 8, weight: 0.1 },     // Three octaves
    ];

    harmonicWeights.forEach(({ harmonic, weight }, index) => {
      const osc = audioContext.createOscillator();
      const oscGain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      const formantFilter = audioContext.createBiquadFilter();

      // Use triangle wave for softer, more natural sound
      osc.type = 'triangle';
      osc.frequency.value = baseFreq * harmonic;
      
      // Very slight detuning for natural variation
      const detune = (Math.random() - 0.5) * 2;
      osc.detune.value = detune;

      // Low-pass filter to remove harsh high frequencies
      filter.type = 'lowpass';
      filter.frequency.value = baseFreq * 12; // Cut off very high harmonics
      filter.Q.value = 0.7;

      // Formant filter for jawari effect (creates the characteristic "buzz")
      formantFilter.type = 'bandpass';
      // Formant frequency varies by string and harmonic
      const formantFreq = baseFreq * harmonic * (1.2 + Math.random() * 0.3);
      formantFilter.frequency.value = formantFreq;
      formantFilter.Q.value = 8 + Math.random() * 4; // High Q for resonance

      // Set harmonic volume
      oscGain.gain.value = weight * (index === 0 ? 1 : 0.5);

      // Routing: osc -> filter -> formant -> gain -> stringGain
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

    // Add noise for jawari "buzz" effect
    let noiseSource: AudioBufferSourceNode | null = null;
    try {
      // Create noise buffer in the same audio context
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
      
      // Filter noise to match string frequency range
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = baseFreq * 2;
      noiseFilter.Q.value = 2;
      noiseGain.gain.value = 0.08; // Very subtle noise for texture
      
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(stringGain);
      
      noiseSource.start();
    } catch (error) {
      // If noise creation fails, continue without it
      console.warn('Could not create noise source:', error);
    }

    // Add subtle LFO for natural vibrato (modulate string gain)
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1 + Math.random() * 0.1; // Very slow, subtle vibrato
    lfoGain.gain.value = 0.03; // Very subtle gain modulation (3%)
    lfo.connect(lfoGain);
    lfoGain.connect(stringGain.gain);
    lfo.start();

    return { 
      noiseSource, 
      oscillators, 
      gainNodes, 
      filters, 
      formantFilters, 
      lfo, 
      lfoGain
    };
  };

  const startTanpura = () => {
    // If already playing, stop first and return (caller should restart)
    if (isPlayingRef.current && audioContextRef.current) {
      stopTanpura();
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      // Master gain
      const masterGain = audioContext.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(audioContext.destination);
      masterGainRef.current = masterGain;

      const baseFreq = KEYS[selectedKey];
      
      // Traditional tanpura tuning: Pa - SA - SA - Sa (all one octave lower)
      // String 1: Pa (fifth) - 0.75x (1.5x / 2)
      // String 2: SA (middle octave) - 1x (2x / 2)
      // String 3: SA (middle octave) - 1x (2x / 2) (slightly different timbre)
      // String 4: Sa (lower octave) - 0.5x (1x / 2)
      const stringConfigs = [
        { freq: baseFreq * 0.75, volume: 0.45 },  // Pa (fifth) - one octave lower
        { freq: baseFreq * 1.0, volume: 0.55 },   // SA (middle) - one octave lower
        { freq: baseFreq * 1.0, volume: 0.50 },   // SA (middle) - second string - one octave lower
        { freq: baseFreq * 0.5, volume: 0.40 },   // Sa (lower) - one octave lower
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
      // Stop noise source
      if (string.noiseSource) {
        try {
          string.noiseSource.stop();
        } catch (e) {
          // Already stopped
        }
      }
      
      // Stop all oscillators
      string.oscillators.forEach(osc => {
        try {
          osc.stop();
        } catch (e) {
          // Already stopped
        }
      });
      
      // Stop LFOs
      if (string.lfo) {
        try {
          string.lfo.stop();
        } catch (e) {
          // Already stopped
        }
      }
    });

    stringsRef.current = [];

    if (audioContextRef.current) {
      // Close the audio context and wait for it to close
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

  const handleKeyChange = (key: KeyName) => {
    const wasPlaying = isPlayingRef.current;
    setSelectedKey(key);
    
    if (wasPlaying) {
      // Stop and restart with new key
      stopTanpura();
      // Wait for cleanup, then restart
      setTimeout(() => {
        startTanpura();
      }, 100);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = newVolume;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-12 shadow-2xl border border-slate-700/50">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-light mb-2 tracking-wide">
            Tanpura
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Digital drone for Carnatic practice
          </p>
        </div>

        {/* Main Control */}
        <div className="flex flex-col items-center mb-8">
          <button
            onClick={toggleTanpura}
            className={`
              relative w-32 h-32 md:w-40 md:h-40 rounded-full
              transition-all duration-300 ease-out
              ${isPlaying 
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/50 scale-105' 
                : 'bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700'
              }
              flex items-center justify-center
              group
            `}
          >
            <div className={`
              absolute inset-0 rounded-full
              ${isPlaying ? 'animate-ping opacity-20' : ''}
              ${isPlaying ? 'bg-amber-400' : ''}
            `} />
            <svg
              className={`w-12 h-12 md:w-16 md:h-16 transition-transform duration-300 ${
                isPlaying ? 'scale-110' : 'scale-100 group-hover:scale-105'
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
          
          <p className="mt-4 text-slate-400 text-sm">
            {isPlaying ? 'Playing' : 'Stopped'}
          </p>
        </div>

        {/* Key Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-300 mb-4 text-center">
            Select Key
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {(Object.keys(KEYS) as KeyName[]).map((key) => (
              <button
                key={key}
                onClick={() => handleKeyChange(key)}
                className={`
                  py-3 px-2 rounded-lg
                  transition-all duration-200
                  text-sm font-medium
                  ${
                    selectedKey === key
                      ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30 scale-105'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:scale-102'
                  }
                `}
              >
                {key}
              </button>
            ))}
          </div>
          <div className="mt-4 text-center">
            <p className="text-slate-400 text-sm">
              Current: <span className="text-amber-400 font-semibold">{selectedKey}</span>
              {' '}({KEYS[selectedKey].toFixed(2)} Hz)
            </p>
          </div>
        </div>

        {/* Volume Control */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3 text-center">
            Volume
          </label>
          <div className="flex items-center gap-4">
            <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-slate-400 text-sm w-12 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>

        {/* Visual Feedback - 4 strings */}
        {isPlaying && (
          <div className="mt-8 flex justify-center gap-3">
            {['Pa', 'SA', 'SA', 'Sa'].map((note, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div
                  className="w-3 h-20 bg-gradient-to-t from-amber-500 to-orange-600 rounded-full"
                  style={{
                    animation: `pulse 1.5s ease-in-out infinite`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
                <span className="text-xs text-slate-500 font-medium">
                  {i === 0 ? 'Pa' : i === 1 || i === 2 ? 'SA' : 'Sa'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.4;
            transform: scaleY(0.6);
          }
          50% {
            opacity: 1;
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
}
