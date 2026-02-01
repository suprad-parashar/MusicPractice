'use client';

import { useState, useEffect, useRef } from 'react';
import * as tanpuraTone from '@/lib/tanpuraTone';
import type { Octave } from '@/lib/tanpuraTone';

interface TanpuraSidebarProps {
  baseFreq: number;
  volume: number;
  onVolumeChange: (v: number) => void;
  pluckDelay: number;
  onPluckDelayChange: (v: number) => void;
  noteLength: number;
  onNoteLengthChange: (v: number) => void;
  octave: Octave;
  onOctaveChange: (v: Octave) => void;
}

const PLUCK_DELAY_MIN = 0.8;
const PLUCK_DELAY_MAX = 2.5;
const NOTE_LENGTH_MIN = 2;
const NOTE_LENGTH_MAX = 8;

export default function TanpuraSidebar({
  baseFreq,
  volume,
  onVolumeChange,
  pluckDelay,
  onPluckDelayChange,
  noteLength,
  onNoteLengthChange,
  octave,
  onOctaveChange,
}: TanpuraSidebarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef<boolean>(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      tanpuraTone.disposeTanpura();
      isPlayingRef.current = false;
    };
  }, []);

  // When baseFreq or octave changes while playing, update the drone
  useEffect(() => {
    if (!isPlayingRef.current) return;
    tanpuraTone.setTanpuraFrequency(baseFreq);
  }, [baseFreq]);

  const startTanpura = async () => {
    if (isPlayingRef.current) return;
    try {
      await tanpuraTone.startTanpura(baseFreq, volume, pluckDelay, noteLength, octave);
      isPlayingRef.current = true;
      setIsPlaying(true);
    } catch (error) {
      console.error('Error starting tanpura:', error);
      isPlayingRef.current = false;
      setIsPlaying(false);
    }
  };

  const stopTanpura = () => {
    tanpuraTone.stopTanpura();
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
    onVolumeChange(newVolume);
    tanpuraTone.setTanpuraVolume(newVolume);
  };

  const handlePluckDelayChange = (val: number) => {
    const clamped = Math.max(PLUCK_DELAY_MIN, Math.min(PLUCK_DELAY_MAX, val));
    onPluckDelayChange(clamped);
    tanpuraTone.setTanpuraPluckDelay(clamped);
  };

  const handleNoteLengthChange = (val: number) => {
    const clamped = Math.max(NOTE_LENGTH_MIN, Math.min(NOTE_LENGTH_MAX, val));
    onNoteLengthChange(clamped);
    tanpuraTone.setTanpuraNoteLength(clamped);
  };

  const handleOctaveChange = (newOctave: Octave) => {
    onOctaveChange(newOctave);
    tanpuraTone.setTanpuraOctave(newOctave); // Immediate response
  };

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

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-300 mb-2 text-center">
            Octave
          </label>
          <div className="flex gap-1">
            {(['low', 'medium', 'high'] as Octave[]).map((opt) => (
              <button
                key={opt}
                onClick={() => handleOctaveChange(opt)}
                className={`
                  flex-1 py-1.5 rounded text-xs font-medium transition-all capitalize
                  ${octave === opt
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                  }
                `}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-300 mb-2 text-center">
            Pluck delay (s)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={PLUCK_DELAY_MIN}
              max={PLUCK_DELAY_MAX}
              step="0.1"
              value={pluckDelay}
              onInput={(e) => handlePluckDelayChange(parseFloat((e.target as HTMLInputElement).value))}
              onChange={(e) => handlePluckDelayChange(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-slate-400 text-xs w-8 text-right">
              {pluckDelay.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-300 mb-2 text-center">
            Note length (s)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={NOTE_LENGTH_MIN}
              max={NOTE_LENGTH_MAX}
              step="0.5"
              value={noteLength}
              onInput={(e) => handleNoteLengthChange(parseFloat((e.target as HTMLInputElement).value))}
              onChange={(e) => handleNoteLengthChange(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-slate-400 text-xs w-8 text-right">
              {noteLength.toFixed(1)}
            </span>
          </div>
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
              step="0.02"
              value={volume}
              onInput={(e) => handleVolumeChange(parseFloat((e.target as HTMLInputElement).value))}
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
