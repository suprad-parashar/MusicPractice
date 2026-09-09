'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSettings } from '@/hooks/useSettings';
import { useRagaOfTheDay } from '@/hooks/useRagaOfTheDay';
import { KEYS, type KeyName } from '@/lib/music/keys';
import type { Tab } from '@/lib/settings';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { LoadingState } from '@/components/ui/LoadingState';
import { StudioNavigation } from './StudioNavigation';
import { StudioTools } from './StudioTools';
import { Preferences } from './Preferences';
import { DailyRaga } from './DailyRaga';
import { FeatureContent } from './FeatureContent';
import { NAVIGATION } from './navigation';

export default function PracticeApp() {
  const { settings, setSetting, ready } = useSettings();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [compositionSlug, setCompositionSlug] = useState<string | null>(null);
  const [ragaRequest, setRagaRequest] = useState<{ ragaId: string; nonce: number } | null>(null);
  const main = useRef<HTMLElement>(null);
  const dailyRaga = useRagaOfTheDay();
  const searchParams = useSearchParams();
  const closeNavigation = useCallback(() => setNavigationOpen(false), []);
  const closeTools = useCallback(() => setToolsOpen(false), []);
  const closePreferences = useCallback(() => setPreferencesOpen(false), []);
  const clearRagaRequest = useCallback(() => setRagaRequest(null), []);

  useEffect(() => {
    if (!ready) return;
    // Shared and legacy links take precedence over the last saved section.
    const slug =
      searchParams.get('composition') ?? searchParams.get('song') ?? searchParams.get('chitta');
    if (slug) {
      setSetting('activeTab', 'compositions');
      setCompositionSlug(slug);
    }
  }, [searchParams, ready, setSetting]);

  const navigate = (tab: Tab) => {
    setSetting('activeTab', tab);
    setNavigationOpen(false);
    main.current?.scrollTo({ top: 0 });
  };
  const selectComposition = (slug: string | null) => {
    setCompositionSlug(slug);
    if (!slug) {
      const url = new URL(window.location.href);
      ['composition', 'song', 'chitta'].forEach((key) => url.searchParams.delete(key));
      window.history.replaceState(null, '', url);
    }
    main.current?.scrollTo({ top: 0 });
  };

  if (!ready) return <LoadingState />;
  const section = NAVIGATION.find(({ id }) => id === settings.activeTab)!;

  return (
    <div className="studio-shell">
      <a className="skip-link" href="#practice-content">
        Skip to practice
      </a>
      <StudioNavigation
        activeTab={settings.activeTab}
        onNavigate={navigate}
        onPreferences={() => {
          setNavigationOpen(false);
          setPreferencesOpen(true);
        }}
        open={navigationOpen}
        onClose={closeNavigation}
      />
      <div className="studio-workspace">
        <header className="studio-header">
          <Button
            variant="ghost"
            className="menu-toggle"
            aria-label="Open navigation"
            aria-expanded={navigationOpen}
            aria-controls="studio-navigation"
            onClick={() => setNavigationOpen(true)}
          >
            <Icon name="menu" />
          </Button>
          <div className="breadcrumb">
            <span>Your studio</span>
            <Icon name="chevron" size={13} />
            <strong>{section.label}</strong>
          </div>
          <div className="header-actions">
            <label className="key-select">
              <span>Sa</span>
              <select
                aria-label="Practice key"
                value={settings.selectedKey}
                onChange={(event) => setSetting('selectedKey', event.target.value as KeyName)}
              >
                {Object.keys(KEYS).map((key) => (
                  <option key={key}>{key}</option>
                ))}
              </select>
              <span className="key-frequency">{KEYS[settings.selectedKey].toFixed(0)} Hz</span>
            </label>
            <Button
              className="tools-toggle"
              aria-label="Practice tools"
              aria-controls="studio-tools"
              aria-expanded={toolsOpen}
              onClick={() => setToolsOpen(true)}
            >
              <Icon name="settings" size={17} />
              <span>Practice tools</span>
            </Button>
            <Button
              variant="ghost"
              className="header-preferences"
              aria-label="Open preferences"
              onClick={() => setPreferencesOpen(true)}
            >
              <Icon name="sun" size={19} />
            </Button>
          </div>
        </header>
        <div className="studio-body">
          <main id="practice-content" ref={main} className="studio-main" tabIndex={-1}>
            <div className="page-content">
              <header className="page-heading">
                <p className="eyebrow">
                  {section.group === 'Practice'
                    ? 'THE JOY IS IN THE PRACTICE'
                    : 'STAY CURIOUS. KEEP GROWING.'}
                </p>
                <h1>{section.label}</h1>
                <p>{section.description}</p>
              </header>
              {settings.activeTab === 'raga' && (
                <DailyRaga
                  raga={dailyRaga}
                  onExplore={() => setRagaRequest({ ragaId: dailyRaga.ragaId, nonce: Date.now() })}
                />
              )}
              <div className={`feature-content feature-content--${settings.activeTab}`}>
                <FeatureContent
                  settings={settings}
                  setSetting={setSetting}
                  compositionSlug={compositionSlug}
                  onCompositionSelect={selectComposition}
                  ragaRequest={ragaRequest}
                  onRagaRequestConsumed={clearRagaRequest}
                />
              </div>
              <footer className="studio-footer">
                <span>Made for the love of music.</span>
                <span>Listen. Practice. Repeat.</span>
              </footer>
            </div>
          </main>
          <StudioTools
            settings={settings}
            setSetting={setSetting}
            open={toolsOpen}
            onClose={closeTools}
          />
        </div>
      </div>
      <Preferences
        open={preferencesOpen}
        onClose={closePreferences}
        settings={settings}
        setSetting={setSetting}
      />
    </div>
  );
}
