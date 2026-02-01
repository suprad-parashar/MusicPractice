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

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Instrument</label>
          <select
            value={instrumentId}
            onChange={(e) => onInstrumentChange(e.target.value as InstrumentId)}
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
          >
            {INSTRUMENT_OPTIONS.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium text-slate-300 mb-2">Octave</label>
          <div className="flex border border-slate-600 rounded-lg overflow-hidden bg-slate-800/30">
            {(['low', 'medium', 'high'] as Octave[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onOctaveChange(opt)}
                className={`
                  flex-1 py-2 px-3 text-xs font-medium transition-all duration-200 capitalize
                  border-r border-slate-600 last:border-r-0
                  focus:outline-none focus:ring-0
                  ${octave === opt
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-transparent text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
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
