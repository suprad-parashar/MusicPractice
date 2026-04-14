'use client';

import { useEffect, useState } from 'react';

const MIN = 30;
const MAX = 300;

/**
 * Shared tempo control (÷2, −, BPM field, +, ×2) — same behaviour as the Raga player tempo strip.
 * Uses a fixed min-width grid so buttons never collapse when the parent flex is narrow.
 */
export default function TempoControl({
  value,
  onChange,
  disabled,
  className = '',
}: {
  value: number;
  onChange: (bpm: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [input, setInput] = useState(String(value));

  useEffect(() => {
    setInput(String(value));
  }, [value]);

  const apply = (v: number) => {
    const n = Math.min(MAX, Math.max(MIN, v));
    const rounded = Math.round(n / 5) * 5;
    const clamped = Math.min(MAX, Math.max(MIN, rounded));
    onChange(clamped);
    setInput(String(clamped));
  };

  const cellBtn =
    'min-h-[2.75rem] min-w-[2.6rem] flex items-center justify-center px-1 text-[var(--text-muted)] hover:bg-[var(--sidebar-bg)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-r border-[var(--border)]';

  return (
    <div
      className={`mx-auto flex w-full max-w-[22rem] min-w-0 flex-col items-center gap-2 ${className}`}
    >
      <span className="text-sm font-medium text-[var(--text-muted)]">Tempo</span>
      <div
        className="
          grid w-full min-w-[17.5rem] rounded-lg border overflow-hidden
          border-[var(--border)] bg-[color-mix(in_srgb,var(--input-bg)_55%,transparent)]
        "
        style={{
          gridTemplateColumns: 'minmax(2.6rem,1fr) minmax(2.6rem,1fr) minmax(4.25rem,1.4fr) minmax(2.6rem,1fr) minmax(2.6rem,1fr)',
        }}
      >
        <button
          type="button"
          onClick={() => apply(Math.max(MIN, Math.round(Math.floor(value / 2) / 5) * 5))}
          disabled={disabled || value <= MIN}
          aria-label="Halve tempo"
          className={`${cellBtn} text-xs font-medium`}
        >
          ÷2
        </button>
        <button
          type="button"
          onClick={() => apply(value - 5)}
          disabled={disabled || value <= MIN}
          aria-label="Decrease tempo"
          className={`${cellBtn} text-xl font-normal leading-none`}
        >
          −
        </button>
        <div className="flex min-w-[4rem] items-center justify-center border-x border-[var(--border)] bg-accent px-2 py-2 text-sm font-bold text-[var(--page-bg)]">
          <input
            type="text"
            inputMode="numeric"
            value={input}
            onFocus={() => setInput(String(value))}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setInput(val);
            }}
            onBlur={() => {
              let num = parseInt(input, 10);
              if (Number.isNaN(num) || num < MIN) num = MIN;
              if (num > MAX) num = MAX;
              num = Math.round(num / 5) * 5;
              num = Math.min(MAX, Math.max(MIN, num));
              onChange(num);
              setInput(String(num));
            }}
            disabled={disabled}
            className="w-full min-w-[3rem] text-center text-base font-bold tabular-nums tracking-tight bg-transparent outline-none placeholder:text-[var(--text-muted)] disabled:opacity-50"
            aria-label="Tempo BPM"
          />
        </div>
        <button
          type="button"
          onClick={() => apply(value + 5)}
          disabled={disabled || value >= MAX}
          aria-label="Increase tempo"
          className={`${cellBtn} text-xl font-normal leading-none`}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => apply(Math.min(MAX, Math.round((value * 2) / 5) * 5))}
          disabled={disabled || value >= MAX}
          aria-label="Double tempo"
          className={`${cellBtn} border-r-0 text-xs font-medium`}
        >
          ×2
        </button>
      </div>
    </div>
  );
}
