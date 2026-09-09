'use client';

import { INSTRUMENT_OPTIONS, type InstrumentId } from '@/lib/music/instruments';
import type { Octave } from '@/lib/music/tanpura';
import { RangeField, SelectField } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Icon } from '@/components/ui/Icon';

export const OCTAVE_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Middle' },
  { value: 'high', label: 'High' },
] as const;

export default function InstrumentSettings({
  instrumentId,
  onInstrumentChange,
  volume,
  onVolumeChange,
  octave,
  onOctaveChange,
}: {
  instrumentId: InstrumentId;
  onInstrumentChange: (id: InstrumentId) => void;
  volume: number;
  onVolumeChange: (value: number) => void;
  octave: Octave;
  onOctaveChange: (value: Octave) => void;
}) {
  return (
    <section className="tool-section" aria-labelledby="instrument-heading">
      <div className="tool-heading">
        <span className="tool-icon">
          <Icon name="music" size={18} />
        </span>
        <div>
          <h3 id="instrument-heading">Your sound</h3>
          <p>Make the practice your own</p>
        </div>
      </div>
      <SelectField
        label="Instrument"
        value={instrumentId}
        onChange={(event) => onInstrumentChange(event.target.value as InstrumentId)}
      >
        {INSTRUMENT_OPTIONS.map(({ id, label }) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </SelectField>
      <SegmentedControl
        label="Instrument octave"
        value={octave}
        options={OCTAVE_OPTIONS}
        onChange={onOctaveChange}
      />
      <RangeField label="Instrument volume" value={volume} onChange={onVolumeChange} />
    </section>
  );
}
