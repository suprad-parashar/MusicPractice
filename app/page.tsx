'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import KeySection, { KEYS, type KeyName } from '@/components/KeySection';
import NotationSection from '@/components/NotationSection';
import TanpuraSidebar from '@/components/TanpuraSidebar';
import InstrumentSettings from '@/components/InstrumentSettings';
import RagaPlayer from '@/components/RagaPlayer';
import VarisaiPlayer from '@/components/VarisaiPlayer';
import AuditoryPractice from '@/components/AuditoryPractice';
import type { InstrumentId } from '@/lib/instrumentLoader';
import type { NotationLanguage } from '@/lib/swaraNotation';
import { getOctaveMultiplier, type Octave } from '@/lib/tanpuraTone';
import { getStored, setStored } from '@/lib/storage';

type Tab = 'raga' | 'varisai' | 'auditory';

const STORAGE_KEY = 'settings';

type StoredSettings = {
  selectedKey?: KeyName;
  activeTab?: Tab;
  instrumentId?: InstrumentId;
  voiceVolume?: number;
  notationLanguage?: NotationLanguage;
  tanpuraVolume?: number;
  tanpuraPluckDelay?: number;
  tanpuraNoteLength?: number;
  tanpuraOctave?: Octave;
  voiceOctave?: Octave;
};

const VALID_KEYS: KeyName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const VALID_TABS: Tab[] = ['raga', 'varisai', 'auditory'];
const VALID_INSTRUMENTS: InstrumentId[] = ['sine', 'piano', 'violin', 'flute', 'harmonium', 'sitar'];
const VALID_NOTATION: NotationLanguage[] = ['english', 'devanagari', 'kannada'];
const VALID_OCTAVES: Octave[] = ['low', 'medium', 'high'];

/**
 * Renders the main practice UI with a left settings sidebar and a tabbed practice area.
 *
 * The component hydrates user settings from persistent storage before rendering to avoid flashing defaults,
 * persists setting changes after initial load, and switches between Raga, Varisai, and Auditory practice views.
 *
 * @returns The rendered Home page React element containing the sidebar, tab navigation, active practice content, and footer.
 */
export default function Home() {
  const [storageReady, setStorageReady] = useState(false);
  const [selectedKey, setSelectedKey] = useState<KeyName>('C');
  const [baseFreq, setBaseFreq] = useState(261.63); // Default C
  const [activeTab, setActiveTab] = useState<Tab>('raga');
  const [instrumentId, setInstrumentId] = useState<InstrumentId>('piano');
  const [voiceVolume, setVoiceVolume] = useState(0.8);
  const [notationLanguage, setNotationLanguage] = useState<NotationLanguage>('english');
  const [tanpuraVolume, setTanpuraVolume] = useState(0.5);
  const [tanpuraPluckDelay, setTanpuraPluckDelay] = useState(1.4);
  const [tanpuraNoteLength, setTanpuraNoteLength] = useState(5);
  const [tanpuraOctave, setTanpuraOctave] = useState<Octave>('medium');
  const [voiceOctave, setVoiceOctave] = useState<Octave>('medium');
  const hasLoadedRef = useRef(false);

  // Load persisted settings before showing UI (avoids any flash of defaults)
  useLayoutEffect(() => {
    const stored = getStored<StoredSettings>(STORAGE_KEY, {});
    if (stored.selectedKey && VALID_KEYS.includes(stored.selectedKey)) {
      setSelectedKey(stored.selectedKey);
      setBaseFreq(KEYS[stored.selectedKey]);
    }
    if (stored.activeTab && VALID_TABS.includes(stored.activeTab)) setActiveTab(stored.activeTab);
    if (stored.instrumentId && VALID_INSTRUMENTS.includes(stored.instrumentId)) setInstrumentId(stored.instrumentId);
    if (typeof stored.voiceVolume === 'number' && stored.voiceVolume >= 0 && stored.voiceVolume <= 1) setVoiceVolume(stored.voiceVolume);
    if (stored.notationLanguage && VALID_NOTATION.includes(stored.notationLanguage)) setNotationLanguage(stored.notationLanguage);
    if (typeof stored.tanpuraVolume === 'number' && stored.tanpuraVolume >= 0 && stored.tanpuraVolume <= 1) setTanpuraVolume(stored.tanpuraVolume);
    if (typeof stored.tanpuraPluckDelay === 'number' && stored.tanpuraPluckDelay >= 0.8 && stored.tanpuraPluckDelay <= 2.5) setTanpuraPluckDelay(stored.tanpuraPluckDelay);
    if (typeof stored.tanpuraNoteLength === 'number' && stored.tanpuraNoteLength >= 2 && stored.tanpuraNoteLength <= 8) setTanpuraNoteLength(stored.tanpuraNoteLength);
    if (stored.tanpuraOctave && VALID_OCTAVES.includes(stored.tanpuraOctave)) setTanpuraOctave(stored.tanpuraOctave);
    if (stored.voiceOctave && VALID_OCTAVES.includes(stored.voiceOctave)) setVoiceOctave(stored.voiceOctave);
    hasLoadedRef.current = true;
    setStorageReady(true);
  }, []);

  // Persist settings when they change (after initial load)
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    setStored(STORAGE_KEY, {
      selectedKey,
      activeTab,
      instrumentId,
      voiceVolume,
      notationLanguage,
      tanpuraVolume,
      tanpuraPluckDelay,
      tanpuraNoteLength,
      tanpuraOctave,
      voiceOctave,
    });
  }, [selectedKey, activeTab, instrumentId, voiceVolume, notationLanguage, tanpuraVolume, tanpuraPluckDelay, tanpuraNoteLength, tanpuraOctave, voiceOctave]);

  const handleKeyChange = (key: KeyName) => {
    setSelectedKey(key);
    setBaseFreq(KEYS[key]);
  };

  // Don't render persisted UI until we've read from storage (prevents jump)
  if (!storageReady) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500 text-sm" aria-label="Loading">Loading…</div>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-slate-950 flex flex-col">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar - Key → Voice → Tanpura → Notation Language */}
        <aside className="scroll-area w-80 min-h-0 shrink-0 flex flex-col overflow-y-auto overflow-x-hidden bg-slate-900 border-r border-slate-800 p-6 gap-8">
          <KeySection selectedKey={selectedKey} onKeyChange={handleKeyChange} />
          <InstrumentSettings instrumentId={instrumentId} onInstrumentChange={setInstrumentId} volume={voiceVolume} onVolumeChange={setVoiceVolume} octave={voiceOctave} onOctaveChange={setVoiceOctave} />
          <TanpuraSidebar
            baseFreq={baseFreq}
            volume={tanpuraVolume}
            onVolumeChange={setTanpuraVolume}
            pluckDelay={tanpuraPluckDelay}
            onPluckDelayChange={setTanpuraPluckDelay}
            noteLength={tanpuraNoteLength}
            onNoteLengthChange={setTanpuraNoteLength}
            octave={tanpuraOctave}
            onOctaveChange={setTanpuraOctave}
          />
          <NotationSection notationLanguage={notationLanguage} onNotationChange={setNotationLanguage} />
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Navigation */}
          <div className="bg-slate-900 border-b border-slate-800 px-6 pt-4">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('raga')}
                className={`
                  px-6 py-3 rounded-t-lg
                  transition-all duration-200
                  text-sm font-medium
                  ${
                    activeTab === 'raga'
                      ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                  }
                `}
              >
                Raga Practice
              </button>
              <button
                onClick={() => setActiveTab('varisai')}
                className={`
                  px-6 py-3 rounded-t-lg
                  transition-all duration-200
                  text-sm font-medium
                  ${
                    activeTab === 'varisai'
                      ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                  }
                `}
              >
                Varasai Practise
              </button>
              <button
                onClick={() => setActiveTab('auditory')}
                className={`
                  px-6 py-3 rounded-t-lg
                  transition-all duration-200
                  text-sm font-medium
                  ${
                    activeTab === 'auditory'
                      ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                  }
                `}
              >
                Auditory Practice
              </button>
            </div>
          </div>

          {/* Tab Content + Footer – scroll together */}
          <div className="scroll-area flex-1 min-h-0 flex flex-col overflow-y-auto">
            <div className="flex-1 flex items-start justify-center p-6">
              {activeTab === 'raga' ? (
                <RagaPlayer baseFreq={baseFreq * getOctaveMultiplier(voiceOctave)} instrumentId={instrumentId} volume={voiceVolume} notationLanguage={notationLanguage} />
              ) : activeTab === 'varisai' ? (
                <VarisaiPlayer baseFreq={baseFreq * getOctaveMultiplier(voiceOctave)} instrumentId={instrumentId} volume={voiceVolume} notationLanguage={notationLanguage} />
              ) : (
                <AuditoryPractice baseFreq={baseFreq * getOctaveMultiplier(voiceOctave)} instrumentId={instrumentId} volume={voiceVolume} />
              )}
            </div>
            <footer className="shrink-0 pt-6 px-8 pb-16 text-center border-t border-slate-800/70 bg-slate-950">
              <p className="text-slate-400 text-sm md:text-base font-light italic max-w-xl mx-auto mb-1.5">
                &ldquo;Where there is practice, there is perfection.&rdquo;
              </p>
              <p className="text-slate-500 text-xs mb-6">
                Carnatic Practice · v1.1.0
              </p>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}