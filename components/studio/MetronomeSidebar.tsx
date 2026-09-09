'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMetronome } from '@/hooks/useMetronome';
import {
  TALAS,
  JATIS,
  TALA_ORDER,
  JATI_ORDER,
  generateSimplePattern,
  generateTalaPattern,
  getTalaDisplayName,
  type TalaName,
  type JatiName,
} from '@/data/talas';
import type { MetronomeMode } from '@/lib/settings';
import { PlaybackButton } from '@/components/ui/Button';
import { RangeField, SelectField } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import TempoControl from '@/components/ui/TempoControl';
import { Icon } from '@/components/ui/Icon';

export type { MetronomeMode } from '@/lib/settings';

interface Props {
  mode: MetronomeMode;
  onModeChange: (value: MetronomeMode) => void;
  simpleBeats: number;
  onSimpleBeatsChange: (value: number) => void;
  tala: TalaName;
  onTalaChange: (value: TalaName) => void;
  jati: JatiName;
  onJatiChange: (value: JatiName) => void;
  tempo: number;
  onTempoChange: (value: number) => void;
  volume: number;
  onVolumeChange: (value: number) => void;
}

export default function MetronomeSidebar(props: Props) {
  const metronome = useMetronome();
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [beat, setBeat] = useState(-1);
  const request = useRef(0);
  const starting = useRef(false);
  const pattern = useMemo(
    () =>
      props.mode === 'simple'
        ? generateSimplePattern(props.simpleBeats)
        : generateTalaPattern(props.tala, props.jati),
    [props.mode, props.simpleBeats, props.tala, props.jati],
  );

  useEffect(
    () => () => {
      request.current += 1;
    },
    [],
  );
  useEffect(() => {
    metronome.setVolume(props.volume);
  }, [props.volume]);
  useEffect(() => {
    metronome.setTempo(props.tempo);
  }, [props.tempo]);
  useEffect(() => {
    if (playing) metronome.setPattern(pattern);
  }, [pattern, playing]);

  const toggle = async () => {
    if (starting.current) return;
    if (playing) {
      metronome.stop();
      setPlaying(false);
      setBeat(-1);
      return;
    }
    const id = ++request.current;
    starting.current = true;
    setLoading(true);
    setError('');
    try {
      await metronome.start(pattern, props.tempo, setBeat);
      if (id !== request.current) {
        metronome.dispose();
        return;
      }
      setPlaying(true);
    } catch {
      if (id === request.current) setError('Could not start the metronome. Please try again.');
    } finally {
      starting.current = false;
      if (id === request.current) setLoading(false);
    }
  };

  return (
    <section className="tool-section" aria-labelledby="metronome-heading">
      <div className="tool-heading">
        <span className="tool-icon">
          <Icon name="rhythm" size={18} />
        </span>
        <div>
          <h3 id="metronome-heading">Metronome</h3>
          <p className={playing ? 'status-playing' : ''}>
            {playing ? 'Keeping the beat' : 'Find your natural rhythm'}
          </p>
        </div>
        <PlaybackButton
          compact
          label="metronome"
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
      <SegmentedControl
        label="Metronome mode"
        className="hide-legend"
        value={props.mode}
        onChange={props.onModeChange}
        options={[
          { value: 'simple', label: 'Simple' },
          { value: 'tala', label: 'Tala' },
        ]}
      />
      {props.mode === 'simple' ? (
        <SelectField
          label="Beats per cycle"
          value={props.simpleBeats}
          onChange={(event) => props.onSimpleBeatsChange(Number(event.target.value))}
        >
          {Array.from({ length: 9 }, (_, i) => i + 1).map((count) => (
            <option key={count} value={count}>
              {count} {count === 1 ? 'beat' : 'beats'}
            </option>
          ))}
        </SelectField>
      ) : (
        <>
          <SelectField
            label="Tala"
            value={props.tala}
            onChange={(event) => props.onTalaChange(event.target.value as TalaName)}
          >
            {TALA_ORDER.map((tala) => (
              <option key={tala} value={tala}>
                {TALAS[tala].displayName}
              </option>
            ))}
          </SelectField>
          {TALAS[props.tala].pattern.includes('laghu') && (
            <SelectField
              label="Jati"
              value={props.jati}
              onChange={(event) => props.onJatiChange(event.target.value as JatiName)}
            >
              {JATI_ORDER.map((jati) => (
                <option key={jati} value={jati}>
                  {JATIS[jati].displayName} · {JATIS[jati].laghuBeats}
                </option>
              ))}
            </SelectField>
          )}
          <p className="tool-caption">
            {getTalaDisplayName(props.tala, props.jati)} · {pattern.length} beats
          </p>
        </>
      )}
      <div className="beat-indicators" aria-label={`${pattern.length} beats per cycle`}>
        {pattern.map((item, index) => (
          <span
            key={index}
            className={`${beat === index ? 'is-active' : ''} ${item.emphasis === 'sam' ? 'is-downbeat' : ''}`}
          />
        ))}
      </div>
      <TempoControl label="Metronome tempo" value={props.tempo} onChange={props.onTempoChange} />
      <RangeField
        label="Metronome volume"
        value={props.volume}
        onChange={props.onVolumeChange}
        step={0.02}
      />
    </section>
  );
}
