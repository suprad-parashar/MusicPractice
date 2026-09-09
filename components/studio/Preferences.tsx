import { Modal } from '@/components/ui/Modal';
import { SelectField } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { ACCENTS, THEMES } from '@/lib/theme';
import type { Settings, SetSetting } from '@/lib/settings';
import type { NotationLanguage } from '@/lib/music/swaraNotation';

export function Preferences({
  open,
  onClose,
  settings,
  setSetting,
}: {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  setSetting: SetSetting;
}) {
  return (
    <Modal title="Your practice, your way." open={open} onClose={onClose}>
      <fieldset className="theme-picker">
        <legend>Appearance</legend>
        <div>
          {THEMES.map((theme) => (
            <button
              type="button"
              key={theme.id}
              aria-pressed={settings.theme === theme.id}
              onClick={() => setSetting('theme', theme.id)}
              className={settings.theme === theme.id ? 'is-selected' : ''}
            >
              <span style={{ backgroundColor: theme.color }} />
              {theme.label}
              {settings.theme === theme.id && <Icon name="check" size={15} />}
            </button>
          ))}
        </div>
      </fieldset>
      <SelectField
        label="Notation language"
        value={settings.notationLanguage}
        onChange={(event) => setSetting('notationLanguage', event.target.value as NotationLanguage)}
      >
        <option value="english">English · S R G M P D N</option>
        <option value="devanagari">Devanagari · स रे ग म प ध नि</option>
        <option value="kannada">Kannada · ಸ ರಿ ಗ ಮ ಪ ದ ನಿ</option>
      </SelectField>
      <fieldset className="accent-picker">
        <legend>Accent color</legend>
        <div>
          {ACCENTS.map((accent) => (
            <button
              type="button"
              key={accent.value}
              title={accent.name}
              aria-label={`${accent.name} accent`}
              aria-pressed={settings.accentColor === accent.value}
              style={{ backgroundColor: accent.value }}
              onClick={() => setSetting('accentColor', accent.value)}
            >
              {settings.accentColor === accent.value && <Icon name="check" size={17} />}
            </button>
          ))}
          <label className="custom-color">
            Custom
            <input
              type="color"
              aria-label="Custom accent color"
              value={settings.accentColor}
              onChange={(event) => setSetting('accentColor', event.target.value)}
            />
          </label>
        </div>
      </fieldset>
      <p className="preferences-note">Your preferences are saved on this device.</p>
    </Modal>
  );
}
