import { useId, type CSSProperties, type ReactNode, type SelectHTMLAttributes } from 'react';

export function SelectField({
  label,
  children,
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}</label>
      <select id={id} {...props}>
        {children}
      </select>
    </div>
  );
}

export function RangeField({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
  display,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  display?: string;
}) {
  const id = useId();
  return (
    <div className="field range-field">
      <div className="field-label">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{display ?? `${Math.round(value * 100)}%`}</output>
      </div>
      <input
        id={id}
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ '--range-progress': `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
      />
    </div>
  );
}
