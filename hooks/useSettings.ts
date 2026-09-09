'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { DEFAULT_SETTINGS, normalizeSettings, type SetSetting } from '@/lib/settings';
import { getStored, setStored } from '@/lib/storage';
import { applyTheme } from '@/lib/theme';

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const raw = getStored<unknown>('settings', {});
    if (raw && typeof raw === 'object' && 'activeTab' in raw && raw.activeTab === 'voice') {
      setStored('practiceSection', { subTab: 'patterns' });
    }
    setSettings(normalizeSettings(raw));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) setStored('settings', settings);
  }, [settings, ready]);

  useLayoutEffect(() => {
    if (ready) applyTheme(settings.theme, settings.accentColor);
  }, [settings.theme, settings.accentColor, ready]);

  const setSetting = useCallback<SetSetting>((key, value) => {
    setSettings((previous) => (previous[key] === value ? previous : { ...previous, [key]: value }));
  }, []);

  return { settings, setSetting, ready };
}
