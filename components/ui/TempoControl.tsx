'use client';

import { useEffect, useId, useState } from 'react';
import { PRACTICE_TEMPO_MAX_BPM } from '@/lib/music/defaultTempo';

const MIN = 30;
const MAX = PRACTICE_TEMPO_MAX_BPM;

export default function TempoControl({
  value,
  onChange,
  disabled,
  className = '',
  label = 'Tempo',
}: {
  value: number;
  onChange: (bpm: number) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}) {
  const [input, setInput] = useState(String(value));
  const id = useId();
  useEffect(() => {
    setInput(String(value));
  }, [value]);

  const apply = (next: number) => {
    const clamped = Math.max(MIN, Math.min(MAX, Math.round(next / 5) * 5));
    onChange(clamped);
    setInput(String(clamped));
  };

  return (
    <div className={`tempo-control ${className}`}>
      <label htmlFor={id}>
        {label}
        <span>BPM</span>
      </label>
      <div className="tempo-stepper">
        <button
          type="button"
          onClick={() => apply(value / 2)}
          disabled={disabled || value <= MIN}
          aria-label={`Halve ${label.toLowerCase()}`}
        >
          ÷2
        </button>
        <button
          type="button"
          onClick={() => apply(value - 5)}
          disabled={disabled || value <= MIN}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          −
        </button>
        <input
          id={id}
          aria-label={`${label} BPM`}
          type="text"
          inputMode="numeric"
          value={input}
          disabled={disabled}
          onChange={(event) => setInput(event.target.value.replace(/\D/g, ''))}
          onBlur={() => apply(Number(input) || MIN)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
        <button
          type="button"
          onClick={() => apply(value + 5)}
          disabled={disabled || value >= MAX}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => apply(value * 2)}
          disabled={disabled || value >= MAX}
          aria-label={`Double ${label.toLowerCase()}`}
        >
          ×2
        </button>
      </div>
    </div>
  );
}
