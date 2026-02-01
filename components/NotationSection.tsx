'use client';

import { NOTATION_LANGUAGES, type NotationLanguage } from '@/lib/swaraNotation';

interface NotationSectionProps {
  notationLanguage: NotationLanguage;
  onNotationChange: (language: NotationLanguage) => void;
}

export default function NotationSection({ notationLanguage, onNotationChange }: NotationSectionProps) {
  return (
    <div className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl border border-slate-700/50">
      <div className="text-center mb-4">
        <h2 className="text-xl font-light tracking-wide">Notation Language</h2>
      </div>

      <select
        value={notationLanguage}
        onChange={(e) => onNotationChange(e.target.value as NotationLanguage)}
        className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
      >
        {NOTATION_LANGUAGES.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
