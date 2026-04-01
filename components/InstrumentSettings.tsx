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
  gamakaEnabled: boolean;
  onGamakaEnabledChange: (value: boolean) => void;
}

/**
 * Renders a UI for selecting the playback instrument, octave, and volume.
 *
 * @param instrumentId - Currently selected instrument identifier.
 * @param onInstrumentChange - Called with the new instrument id when the selection changes.
 * @param volume - Current volume value between 0 and 1.
 * @param onVolumeChange - Called with the new volume (0–1) when the slider value changes.
 * @param octave - Currently selected octave ("low", "medium", or "high").
 * @param onOctaveChange - Called with the new octave when an octave button is clicked.
 * @param gamakaEnabled - Whether bracket gamaka paths affect playback for bend-capable instruments.
 * @param onGamakaEnabledChange - Called when the gamaka toggle changes.
 * @returns The instrument settings React element.
 */
export default function InstrumentSettings({
  instrumentId,
  onInstrumentChange,
  volume,
  onVolumeChange,
  octave,
  onOctaveChange,
  gamakaEnabled,
  onGamakaEnabledChange,
}: InstrumentSettingsProps) {
  return (
    <div className="w-full">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-700/50">
        <div className="text-center mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-light mb-1 tracking-wide">Voice</h2>
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

        <div className="mt-4 sm:mt-5">
          <label className="block text-sm font-medium text-slate-300 mb-2">Octave</label>
          <div className="flex border border-slate-600 rounded-lg overflow-hidden bg-slate-800/30">
            {(['low', 'medium', 'high'] as Octave[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onOctaveChange(opt)}
                className={`
                  flex-1 py-1.5 sm:py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-medium transition-all duration-200 capitalize
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

        <div className="mt-4 sm:mt-5 pt-4 border-t border-slate-700/50">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <p id="gamaka-label" className="text-sm font-medium text-slate-200 tracking-wide">
                Gamaka
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Pitch paths in brackets when the instrument can bend them. Piano and harmonium stay fixed.
              </p>
            </div>
            <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
              <button
                type="button"
                role="switch"
                aria-checked={gamakaEnabled}
                aria-labelledby="gamaka-label"
                onClick={() => onGamakaEnabledChange(!gamakaEnabled)}
                className={`
                  relative h-8 w-[3.25rem] rounded-full
                  transition-[background-color,box-shadow] duration-300 ease-out
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
                  ${gamakaEnabled
                    ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_10px_rgba(245,158,11,0.4)]'
                    : 'bg-slate-800 ring-1 ring-inset ring-slate-600/70 shadow-inner'
                  }
                `}
              >
                <span
                  aria-hidden
                  className={`
                    absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-md
                    ring-1 ring-black/[0.06] transition-transform duration-300 ease-[cubic-bezier(0.34,1.45,0.64,1)]
                    ${gamakaEnabled ? 'translate-x-[1.25rem]' : 'translate-x-0'}
                  `}
                />
                <span className="sr-only">{gamakaEnabled ? 'On' : 'Off'}</span>
              </button>
              <span
                className={`
                  text-[10px] font-semibold uppercase tracking-[0.12em] tabular-nums
                  transition-colors duration-300
                  ${gamakaEnabled ? 'text-amber-400/95' : 'text-slate-500'}
                `}
                aria-hidden
              >
                {gamakaEnabled ? 'On' : 'Off'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}