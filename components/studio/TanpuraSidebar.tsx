'use client';

import { useEffect, useRef, useState } from 'react';
import * as tanpura from '@/lib/audio/tanpuraTone';
import { TANPURA_PATTERNS, type Octave, type TanpuraPatternId } from '@/lib/music/tanpura';
import { RangeField, SelectField } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { PlaybackButton } from '@/components/ui/Button';
import { Disclosure } from '@/components/ui/Disclosure';
import { Icon } from '@/components/ui/Icon';
import { OCTAVE_OPTIONS } from './InstrumentSettings';

interface Props {
  baseFreq: number;
  volume: number;
  onVolumeChange: (value: number) => void;
  pluckDelay: number;
  onPluckDelayChange: (value: number) => void;
  noteLength: number;
  onNoteLengthChange: (value: number) => void;
  octave: Octave;
  onOctaveChange: (value: Octave) => void;
  pattern: TanpuraPatternId;
  onPatternChange: (value: TanpuraPatternId) => void;
}

export default function TanpuraSidebar(props: Props) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const starting = useRef(false);

  useEffect(
    () => () => {
      request.current += 1;
      tanpura.disposeTanpura();
    },
    [],
  );
  useEffect(() => {
    if (playing) tanpura.setTanpuraFrequency(props.baseFreq);
  }, [props.baseFreq, playing]);
  useEffect(() => {
    tanpura.setTanpuraVolume(props.volume);
  }, [props.volume]);
  useEffect(() => {
    tanpura.setTanpuraPattern(props.pattern);
  }, [props.pattern]);
  useEffect(() => {
    tanpura.setTanpuraOctave(props.octave);
  }, [props.octave]);
  useEffect(() => {
    tanpura.setTanpuraPluckDelay(props.pluckDelay);
  }, [props.pluckDelay]);
  useEffect(() => {
    tanpura.setTanpuraNoteLength(props.noteLength);
  }, [props.noteLength]);

  const toggle = async () => {
    if (starting.current) return;
    if (playing) {
      tanpura.stopTanpura();
      setPlaying(false);
      return;
    }
    const id = ++request.current;
    starting.current = true;
    setLoading(true);
    setError('');
    try {
      tanpura.setTanpuraPattern(props.pattern);
      await tanpura.startTanpura(
        props.baseFreq,
        props.volume,
        props.pluckDelay,
        props.noteLength,
        props.octave,
      );
      if (id !== request.current) {
        tanpura.disposeTanpura();
        return;
      }
      setPlaying(true);
    } catch {
      if (id === request.current) setError('Could not start the tanpura. Please try again.');
    } finally {
      starting.current = false;
      if (id === request.current) setLoading(false);
    }
  };

  return (
    <section className="tool-section" aria-labelledby="tanpura-heading">
      <div className="tool-heading">
        <span className="tool-icon">
          <Icon name="ragas" size={18} />
        </span>
        <div>
          <h3 id="tanpura-heading">Tanpura</h3>
          <p className={playing ? 'status-playing' : ''}>
            {playing ? 'Drone is playing' : 'A steady place to return to'}
          </p>
        </div>
        <PlaybackButton
          compact
          label="tanpura"
          playing={playing}
          loading={loading}
          onClick={toggle}
        />
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <SelectField
        label="Drone pattern"
        value={props.pattern}
        onChange={(event) => props.onPatternChange(event.target.value as TanpuraPatternId)}
      >
        {TANPURA_PATTERNS.map(({ id, label }) => (
          <option value={id} key={id}>
            {label}
          </option>
        ))}
      </SelectField>
      <RangeField
        label="Tanpura volume"
        value={props.volume}
        onChange={props.onVolumeChange}
        step={0.02}
      />
      <Disclosure title="Fine-tune the drone">
        <SegmentedControl
          label="Tanpura octave"
          value={props.octave}
          options={OCTAVE_OPTIONS}
          onChange={props.onOctaveChange}
        />
        <RangeField
          label="Pluck delay"
          value={props.pluckDelay}
          onChange={props.onPluckDelayChange}
          min={0.8}
          max={2.5}
          step={0.1}
          display={`${props.pluckDelay.toFixed(1)} s`}
        />
        <RangeField
          label="Note length"
          value={props.noteLength}
          onChange={props.onNoteLengthChange}
          min={2}
          max={8}
          step={0.5}
          display={`${props.noteLength.toFixed(1)} s`}
        />
      </Disclosure>
    </section>
  );
}
