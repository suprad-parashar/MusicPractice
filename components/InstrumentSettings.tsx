'use client';

import { INSTRUMENT_OPTIONS, type InstrumentId } from '@/lib/instrumentLoader';

interface InstrumentSettingsProps {
  instrumentId: InstrumentId;
  onInstrumentChange: (id: InstrumentId) => void;
}

export default function InstrumentSettings({ instrumentId, onInstrumentChange }: InstrumentSettingsProps) {
  return (
    <div className="w-full mt-6">
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
      </div>
    </div>
  );
}
