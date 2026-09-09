import { useState } from 'react';
import type { Settings, SetSetting } from '@/lib/settings';
import { KEYS, type KeyName } from '@/lib/music/keys';
import { DEFAULT_PRACTICE_BPM } from '@/lib/music/defaultTempo';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { ResponsiveAside } from '@/components/ui/ResponsiveAside';
import { SelectField } from '@/components/ui/Field';
import InstrumentSettings from './InstrumentSettings';
import TanpuraSidebar from './TanpuraSidebar';
import MetronomeSidebar from './MetronomeSidebar';

export function StudioTools({
  settings: s,
  setSetting,
  open,
  onClose,
}: {
  settings: Settings;
  setSetting: SetSetting;
  open: boolean;
  onClose: () => void;
}) {
  // Session tempo deliberately resets on reload; musical preferences stay persistent.
  const [tempo, setTempo] = useState(DEFAULT_PRACTICE_BPM);
  return (
    <ResponsiveAside
      id="studio-tools"
      label="Practice tools"
      className="studio-tools"
      open={open}
      onClose={onClose}
      breakpoint="(min-width: 1360px)"
    >
      <header className="tools-header">
        <p className="eyebrow">PRACTICE TOOLS</p>
        <span className="tools-ready">
          <span /> Ready when you are
        </span>
        <Button
          variant="ghost"
          className="tools-close"
          aria-label="Close practice tools"
          onClick={onClose}
        >
          <Icon name="close" />
        </Button>
      </header>
      <section className="tool-section shruti-section">
        <div className="tool-heading">
          <div>
            <h3>Your shruti</h3>
            <p>The root of your practice</p>
          </div>
          <span className="shruti-symbol">S</span>
        </div>
        <SelectField
          label="Reference key"
          value={s.selectedKey}
          onChange={(event) => setSetting('selectedKey', event.target.value as KeyName)}
        >
          {Object.entries(KEYS).map(([key, frequency]) => (
            <option key={key} value={key}>
              {key} · {frequency.toFixed(2)} Hz
            </option>
          ))}
        </SelectField>
      </section>
      <InstrumentSettings
        instrumentId={s.instrumentId}
        onInstrumentChange={(value) => setSetting('instrumentId', value)}
        volume={s.voiceVolume}
        onVolumeChange={(value) => setSetting('voiceVolume', value)}
        octave={s.voiceOctave}
        onOctaveChange={(value) => setSetting('voiceOctave', value)}
      />
      <TanpuraSidebar
        baseFreq={KEYS[s.selectedKey]}
        volume={s.tanpuraVolume}
        onVolumeChange={(value) => setSetting('tanpuraVolume', value)}
        pluckDelay={s.tanpuraPluckDelay}
        onPluckDelayChange={(value) => setSetting('tanpuraPluckDelay', value)}
        noteLength={s.tanpuraNoteLength}
        onNoteLengthChange={(value) => setSetting('tanpuraNoteLength', value)}
        octave={s.tanpuraOctave}
        onOctaveChange={(value) => setSetting('tanpuraOctave', value)}
        pattern={s.tanpuraPattern}
        onPatternChange={(value) => setSetting('tanpuraPattern', value)}
      />
      <MetronomeSidebar
        mode={s.metronomeMode}
        onModeChange={(value) => setSetting('metronomeMode', value)}
        simpleBeats={s.metronomeSimpleBeats}
        onSimpleBeatsChange={(value) => setSetting('metronomeSimpleBeats', value)}
        tala={s.metronomeTala}
        onTalaChange={(value) => setSetting('metronomeTala', value)}
        jati={s.metronomeJati}
        onJatiChange={(value) => setSetting('metronomeJati', value)}
        tempo={tempo}
        onTempoChange={setTempo}
        volume={s.metronomeVolume}
        onVolumeChange={(value) => setSetting('metronomeVolume', value)}
      />
    </ResponsiveAside>
  );
}
