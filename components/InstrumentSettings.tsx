'use client';

import { INSTRUMENT_OPTIONS, type InstrumentId } from '@/lib/instrumentLoader';
import type { Octave } from '@/lib/tanpuraTone';

interface InstrumentSettingsProps {
  instrumentId: InstrumentId;
  onInstrumentChange: (id: InstrumentId) => void;
  volume: number;
  onVolumeChange: (value: number) => void;
  octave: Octave;
  onOctaveChange: (value: Octave) => void;
}

export default function InstrumentSettings({ instrumentId, onInstrumentChange, volume, onVolumeChange, octave, onOctaveChange }: InstrumentSettingsProps) {
  return (
    <div className="w-full">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl border border-slate-700/50">
        <div className="text-center mb-4">
          <h2 className="text-xl font-light mb-1 tracking-wide">Voice</h2>
          <p className="text-slate-400 text-xs">Note playback instrument</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {INSTRUMENT_OPTIONS.map((opt) => {
            const isSelected = instrumentId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onInstrumentChange(opt.id)}
                className={`
                  flex items-center gap-2.5 py-2.5 px-3 rounded-xl
                  transition-all duration-200
                  text-left
                  ${
                    isSelected
                      ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30 scale-105'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-slate-100 border border-slate-600/50'
                  }
                `}
              >
                <span className="text-sm font-medium truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Octave</label>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as Octave[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onOctaveChange(opt)}
                className={`
                  flex-1 py-2 rounded-lg text-xs font-medium transition-all capitalize
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

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Volume</label>
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-slate-400 text-sm w-10 text-right shrink-0">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
