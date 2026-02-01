'use client';

import { useRef } from 'react';

export type ThemeMode = 'light' | 'light-warm' | 'dark' | 'dark-slate';

const THEME_MODES: { value: ThemeMode; label: string }[] = [
  { value: 'dark', label: 'Dark (grey)' },
  { value: 'dark-slate', label: 'Dark (slate)' },
  { value: 'light', label: 'Light' },
  { value: 'light-warm', label: 'Light (warm)' },
];

const ACCENT_PRESETS: { name: string; value: string }[] = [
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Violet', value: '#8b5cf6' },
];

interface ThemeSectionProps {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  accentColor: string;
  onAccentChange: (color: string) => void;
}

/**
 * Renders theme mode (light / dark) and accent colour controls.
 */
export default function ThemeSection({ theme, onThemeChange, accentColor, onAccentChange }: ThemeSectionProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="w-full rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border bg-[var(--card-bg)] border-[var(--border)]">
      <div className="text-center mb-3 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-light mb-1 tracking-wide text-[var(--text-primary)]">Theme</h2>
        <p className="text-[var(--text-muted)] text-xs">Mode and accent colour</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Mode</label>
        <div className="flex flex-col gap-2">
          {THEME_MODES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onThemeChange(value)}
              className={`
                w-full py-2 px-3 rounded-lg text-left text-sm font-medium transition-all duration-200
                border
                ${theme === value
                  ? 'bg-accent text-[var(--text-primary)] border-accent'
                  : 'bg-[var(--sidebar-bg)] text-[var(--text-primary)] hover:opacity-90 border-[var(--border)]'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Accent colour</label>
        <div className="flex flex-wrap gap-1 mb-2 items-center py-1 pl-1">
          {ACCENT_PRESETS.map(({ name, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => onAccentChange(value)}
              title={name}
              aria-label={`Accent ${name}`}
              className={`
                w-6 h-6 rounded-full border-2 transition-all duration-150 flex-shrink-0
                ${accentColor.toLowerCase() === value.toLowerCase()
                  ? 'border-[var(--text-primary)] scale-105 ring-1 ring-offset-1 ring-offset-[var(--card-bg)] ring-[var(--border)]'
                  : 'border-[var(--border)] hover:scale-105'
                }
              `}
              style={{ backgroundColor: value }}
            />
          ))}

          {/* Custom rainbow button at the end of the presets row */}
          <input
            ref={inputRef}
            type="color"
            value={accentColor}
            onChange={(e) => onAccentChange(e.target.value)}
            className="sr-only"
            aria-label="Custom accent colour"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            title="Custom"
            aria-label="Custom accent colour"
            className={`
              w-6 h-6 rounded-full border-2 transition-all duration-150 flex-shrink-0
              ${!ACCENT_PRESETS.some(p => p.value.toLowerCase() === accentColor.toLowerCase())
                ? 'border-[var(--text-primary)] scale-105 ring-1 ring-offset-1 ring-offset-[var(--card-bg)] ring-[var(--border)]'
                : 'border-[var(--border)] hover:scale-105'
              }
            `}
            style={{ background: 'conic-gradient(from 180deg at 50% 50%, #f44336, #ffeb3b, #4caf50, #2196f3, #9c27b0, #f44336)' }}
          />
        </div>
      </div>
    </div>
  );
}
