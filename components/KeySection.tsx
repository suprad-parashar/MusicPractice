'use client';

// Carnatic music keys (Swaras) - frequencies in Hz - shared with TanpuraSidebar usage
export const KEYS = {
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
} as const;

export type KeyName = keyof typeof KEYS;

interface KeySectionProps {
  selectedKey: KeyName;
  onKeyChange: (key: KeyName) => void;
}

export default function KeySection({ selectedKey, onKeyChange }: KeySectionProps) {
  return (
    <div className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl border border-slate-700/50">
      <div className="text-center mb-4">
        <h2 className="text-xl font-light mb-1 tracking-wide">Key</h2>
        <p className="text-slate-400 text-xs">Reference pitch for practice</p>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {(Object.keys(KEYS) as KeyName[]).map((key) => (
          <button
            key={key}
            onClick={() => onKeyChange(key)}
            className={`
              py-2 px-1 rounded
              transition-all duration-200
              text-xs font-medium
              ${
                selectedKey === key
                  ? 'bg-amber-500 text-slate-900 shadow-md scale-105'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }
            `}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="mt-2 text-center">
        <p className="text-slate-400 text-xs">
          {selectedKey} ({KEYS[selectedKey].toFixed(0)} Hz)
        </p>
      </div>
    </div>
  );
}
