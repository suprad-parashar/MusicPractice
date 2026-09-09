import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SETTINGS, normalizeSettings } from '../lib/settings';
import { accentForeground } from '../lib/theme';

test('missing or malformed settings cannot break the practice screen', () => {
  for (const raw of [null, undefined, false, 14, 'settings', [], { voiceVolume: NaN }]) {
    assert.deepEqual(normalizeSettings(raw), DEFAULT_SETTINGS);
  }
});

test('valid preferences survive while invalid and retired fields are discarded', () => {
  const settings = normalizeSettings({
    selectedKey: 'F#',
    instrumentId: 'flute',
    voiceVolume: 0.35,
    tanpuraPattern: 's-p-hs',
    theme: 'dark-slate',
    accentColor: '#abcDEF',
    metronomeSimpleBeats: 2.5,
    tanpuraNoteLength: Infinity,
    tanpuraVolume: -1,
    notationLanguage: 'missing',
    sidebarSection: 'music',
    metronomeTempo: 200,
  });
  assert.equal(settings.selectedKey, 'F#');
  assert.equal(settings.instrumentId, 'flute');
  assert.equal(settings.voiceVolume, 0.35);
  assert.equal(settings.theme, 'dark-slate');
  assert.equal(settings.accentColor, '#abcDEF');
  assert.equal(settings.tanpuraPattern, 's-p-hs');
  assert.equal(settings.metronomeSimpleBeats, 4);
  assert.equal(settings.tanpuraNoteLength, 5);
  assert.equal(settings.tanpuraVolume, 0.5);
  assert.equal(settings.notationLanguage, 'english');
  assert.ok(!('sidebarSection' in settings));
  assert.ok(!('metronomeTempo' in settings));
});

test('legacy sections, drone patterns, and themes migrate without mutating saved data', () => {
  const raw = { activeTab: 'sheet-music', tanpuraPattern: 'mpps', theme: 'high-contrast' };
  const migrated = normalizeSettings(raw);
  assert.equal(migrated.activeTab, 'learn');
  assert.equal(migrated.learnSubtab, 'sheet-music');
  assert.equal(migrated.tanpuraPattern, 'm-hs-hs-s');
  assert.equal(migrated.theme, 'dark');
  assert.equal(raw.activeTab, 'sheet-music');
  assert.equal(normalizeSettings({ activeTab: 'voice' }).activeTab, 'varisai');
  for (const activeTab of ['songs', 'chittaswarams']) {
    assert.equal(normalizeSettings({ activeTab }).activeTab, 'compositions');
  }
});

test('accent text remains readable at both ends of the color picker', () => {
  assert.equal(accentForeground('#000000'), '#ffffff');
  assert.equal(accentForeground('#ffffff'), '#171a16');
  assert.equal(accentForeground('#a34e35'), '#ffffff');
  assert.equal(accentForeground('#f59e0b'), '#171a16');
});
