import { useId, type ReactNode } from 'react';

export interface Segment<T extends string> {
  value: T;
  label: ReactNode;
}

/** Native radio inputs provide arrow-key navigation without a custom keyboard handler. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
  className = '',
}: {
  label: string;
  value: T;
  options: readonly Segment<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset className={`segmented-field ${className}`} disabled={disabled}>
      <legend>{label}</legend>
      <div className="segmented-control">
        {options.map((option) => (
          <label key={option.value} className={option.value === value ? 'is-selected' : ''}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
