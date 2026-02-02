'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { KEYS, type KeyName } from '@/components/KeySection';
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
import { version } from '@/package.json';

type Tab = 'raga' | 'varisai' | 'auditory';
type ThemeMode = 'light' | 'light-warm' | 'dark' | 'dark-slate';

const STORAGE_KEY = 'settings';

type SidebarSection = 'music';

type StoredSettings = {
  selectedKey?: KeyName;
  activeTab?: Tab;
  sidebarSection?: SidebarSection;
  instrumentId?: InstrumentId;
  voiceVolume?: number;
  notationLanguage?: NotationLanguage;
  tanpuraVolume?: number;
  tanpuraPluckDelay?: number;
  tanpuraNoteLength?: number;
  tanpuraOctave?: Octave;
  voiceOctave?: Octave;
  theme?: ThemeMode;
  accentColor?: string;
};

const VALID_KEYS: KeyName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const VALID_TABS: Tab[] = ['raga', 'varisai', 'auditory'];
const VALID_SIDEBAR_SECTIONS: SidebarSection[] = ['music'];
const VALID_INSTRUMENTS: InstrumentId[] = ['sine', 'piano', 'violin', 'flute', 'harmonium', 'sitar'];
const VALID_NOTATION: NotationLanguage[] = ['english', 'devanagari', 'kannada'];

const NOTATION_BADGES: Record<NotationLanguage, { abbr: string; symbol: string; title: string }> = {
  english: { abbr: 'EN', symbol: 'S', title: 'English' },
  devanagari: { abbr: 'DN', symbol: 'स', title: 'Devanagari' },
  kannada: { abbr: 'KA', symbol: 'ಸ', title: 'Kannada' },
};

const NOTATION_ORDER: NotationLanguage[] = ['english', 'devanagari', 'kannada'];

const THEME_BADGES: Record<ThemeMode, { abbr: string; icon: string; title: string }> = {
  light: { abbr: 'L', icon: '☀️', title: 'Light' },
  'light-warm': { abbr: 'LW', icon: '🌅', title: 'Light (Warm)' },
  dark: { abbr: 'D', icon: '🌙', title: 'Dark (Grey)' },
  'dark-slate': { abbr: 'DS', icon: '🌑', title: 'Dark (Slate)' },
};

const THEME_ORDER: ThemeMode[] = ['light', 'light-warm', 'dark', 'dark-slate'];

const ACCENT_COLOR_PRESETS: { name: string; value: string }[] = [
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Violet', value: '#8b5cf6' },
];

const VALID_OCTAVES: Octave[] = ['low', 'medium', 'high'];
const VALID_THEMES: ThemeMode[] = ['light', 'light-warm', 'dark', 'dark-slate'];
const DEFAULT_ACCENT = '#f59e0b';

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
  const [instrumentId, setInstrumentId] = useState<InstrumentId>('violin');
  const [voiceVolume, setVoiceVolume] = useState(0.8);
  const [notationLanguage, setNotationLanguage] = useState<NotationLanguage>('english');



  // Theme & Accent color dropdown state
  const [themeAccentOpen, setThemeAccentOpen] = useState(false);
  const themeAccentRef = useRef<HTMLDivElement | null>(null);

  // Key picker dropdown state
  const [keyPickerOpen, setKeyPickerOpen] = useState(false);
  const keyPickerRef = useRef<HTMLDivElement | null>(null);

  // Accent color picker input
  const accentColorInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (themeAccentRef.current && !themeAccentRef.current.contains(e.target as Node)) {
        setThemeAccentOpen(false);
      }
      if (keyPickerRef.current && !keyPickerRef.current.contains(e.target as Node)) {
        setKeyPickerOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setThemeAccentOpen(false);
        setKeyPickerOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const [tanpuraVolume, setTanpuraVolume] = useState(0.5);
  const [tanpuraPluckDelay, setTanpuraPluckDelay] = useState(1.4);
  const [tanpuraNoteLength, setTanpuraNoteLength] = useState(5);
  const [tanpuraOctave, setTanpuraOctave] = useState<Octave>('medium');
  const [voiceOctave, setVoiceOctave] = useState<Octave>('medium');
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSection, setSidebarSection] = useState<SidebarSection>('music');
  const hasLoadedRef = useRef(false);

  // Load persisted settings before showing UI (avoids any flash of defaults)
  useLayoutEffect(() => {
    const stored = getStored<StoredSettings>(STORAGE_KEY, {});
    if (stored.selectedKey && VALID_KEYS.includes(stored.selectedKey)) {
      setSelectedKey(stored.selectedKey);
      setBaseFreq(KEYS[stored.selectedKey]);
    }
    if (stored.activeTab && VALID_TABS.includes(stored.activeTab)) setActiveTab(stored.activeTab);
    if (stored.sidebarSection && VALID_SIDEBAR_SECTIONS.includes(stored.sidebarSection)) setSidebarSection(stored.sidebarSection);
    if (stored.instrumentId && VALID_INSTRUMENTS.includes(stored.instrumentId)) setInstrumentId(stored.instrumentId);
    if (typeof stored.voiceVolume === 'number' && stored.voiceVolume >= 0 && stored.voiceVolume <= 1) setVoiceVolume(stored.voiceVolume);
    if (stored.notationLanguage && VALID_NOTATION.includes(stored.notationLanguage)) setNotationLanguage(stored.notationLanguage);
    if (typeof stored.tanpuraVolume === 'number' && stored.tanpuraVolume >= 0 && stored.tanpuraVolume <= 1) setTanpuraVolume(stored.tanpuraVolume);
    if (typeof stored.tanpuraPluckDelay === 'number' && stored.tanpuraPluckDelay >= 0.8 && stored.tanpuraPluckDelay <= 2.5) setTanpuraPluckDelay(stored.tanpuraPluckDelay);
    if (typeof stored.tanpuraNoteLength === 'number' && stored.tanpuraNoteLength >= 2 && stored.tanpuraNoteLength <= 8) setTanpuraNoteLength(stored.tanpuraNoteLength);
    if (stored.tanpuraOctave && VALID_OCTAVES.includes(stored.tanpuraOctave)) setTanpuraOctave(stored.tanpuraOctave);
    if (stored.voiceOctave && VALID_OCTAVES.includes(stored.voiceOctave)) setVoiceOctave(stored.voiceOctave);
    if (stored.theme && VALID_THEMES.includes(stored.theme)) setTheme(stored.theme);
    else if (String(stored.theme) === 'high-contrast') setTheme('dark');
    if (typeof stored.accentColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(stored.accentColor)) setAccentColor(stored.accentColor);
    hasLoadedRef.current = true;
    setStorageReady(true);
  }, []);

  // Apply theme and accent to document (initial + when they change)
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty('--accent', accentColor);

    // Compute complementary color (hue + 180°) and a readable foreground for it
    const hexToRgb = (hex: string) => {
      const h = hex.replace('#', '');
      return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16),
      };
    };

    const rgbToHsl = (r: number, g: number, b: number) => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h *= 60;
      }
      return { h, s, l };
    };

    const hslToRgb = (h: number, s: number, l: number) => {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      let r: number, g: number, b: number;
      if (s === 0) {
        r = g = b = l; // achromatic
      } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, (h / 360) + 1 / 3);
        g = hue2rgb(p, q, h / 360);
        b = hue2rgb(p, q, (h / 360) - 1 / 3);
      }
      return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    };

    const rgbToHex = (r: number, g: number, b: number) => {
      const toHex = (x: number) => x.toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    try {
      const { r, g, b } = hexToRgb(accentColor);
      const { h, s, l } = rgbToHsl(r, g, b);
      const compH = (h + 180) % 360;
      const { r: cr, g: cg, b: cb } = hslToRgb(compH, s, l);
      const compHex = rgbToHex(cr, cg, cb);
      document.documentElement.style.setProperty('--accent-complement', compHex);
      // Determine readable foreground for complement
      const luminance = (0.2126 * cr + 0.7152 * cg + 0.0722 * cb) / 255;
      const fg = luminance > 0.6 ? '#000000' : '#ffffff';
      document.documentElement.style.setProperty('--accent-complement-foreground', fg);
    } catch (e) {
      // If parsing fails, fall back to a default complementary colour
      document.documentElement.style.setProperty('--accent-complement', '#2563eb');
      document.documentElement.style.setProperty('--accent-complement-foreground', '#ffffff');
    }
  }, [theme, accentColor]);

  // Persist settings when they change (after initial load)
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    setStored(STORAGE_KEY, {
      selectedKey,
      activeTab,
      sidebarSection,
      instrumentId,
      voiceVolume,
      notationLanguage,
      tanpuraVolume,
      tanpuraPluckDelay,
      tanpuraNoteLength,
      tanpuraOctave,
      voiceOctave,
      theme,
      accentColor,
    });
  }, [selectedKey, activeTab, instrumentId, voiceVolume, notationLanguage, tanpuraVolume, tanpuraPluckDelay, tanpuraNoteLength, tanpuraOctave, voiceOctave, theme, accentColor]);

  const handleKeyChange = (key: KeyName) => {
    setSelectedKey(key);
    setBaseFreq(KEYS[key]);
    setKeyPickerOpen(false);
  };

  // Don't render persisted UI until we've read from storage (prevents jump)
  if (!storageReady) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--page-bg)] text-[var(--text-muted)]">
        <div className="text-sm" aria-label="Loading">Loading…</div>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden flex flex-col min-h-0 bg-[var(--page-bg)] text-[var(--text-primary)]">
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Mobile sidebar backdrop */}
        <button
          type="button"
          aria-label="Close settings"
          onClick={() => setSidebarOpen(false)}
          className={`
            lg:hidden fixed inset-0 z-40 bg-black/60 transition-opacity duration-200
            ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
          `}
        />

        {/* Sidebar - Key → Voice → Tanpura → Notation Language → Theme */}
        <aside
          className={`
            scroll-area flex flex-col overflow-y-auto overflow-x-hidden border-r gap-6
            bg-[var(--sidebar-bg)] border-[var(--border)]
            w-80 min-w-[280px] max-w-[85vw] shrink-0
            lg:relative lg:translate-x-0 lg:border-r lg:p-6 lg:gap-8
            fixed top-0 left-0 bottom-0 z-50 p-4 pt-14
            transition-transform duration-300 ease-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <button
            type="button"
            aria-label="Close settings"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>


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
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Tab bar + Settings button (mobile) */}
          <div className="bg-[var(--header-bg)] border-b border-[var(--border)] flex items-center">
            <div className="flex-1 flex items-center gap-2 px-3 sm:px-6">
              <button
                type="button"
                aria-label="Open settings"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden shrink-0 p-2.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-thin min-h-[48px] items-center pb-px">
                <button
                  onClick={() => setActiveTab('raga')}
                  className={`
                    shrink-0 px-3 sm:px-6 py-2.5 sm:py-3 rounded-t-lg
                    transition-all duration-200 text-xs sm:text-sm font-medium
                    ${activeTab === 'raga'
                      ? 'bg-[var(--card-bg)] text-accent border-b-2 border-accent'
                      : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]/50'
                    }
                  `}
                >
                  Ragas
                </button>
                <button
                  onClick={() => setActiveTab('varisai')}
                  className={`
                    shrink-0 px-3 sm:px-6 py-2.5 sm:py-3 rounded-t-lg
                    transition-all duration-200 text-xs sm:text-sm font-medium
                    ${activeTab === 'varisai'
                      ? 'bg-[var(--card-bg)] text-accent border-b-2 border-accent'
                      : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]/50'
                    }
                  `}
                >
                  Practice
                </button>
                <button
                  onClick={() => setActiveTab('auditory')}
                  className={`
                    shrink-0 px-3 sm:px-6 py-2.5 sm:py-3 rounded-t-lg
                    transition-all duration-200 text-xs sm:text-sm font-medium
                    ${activeTab === 'auditory'
                      ? 'bg-[var(--card-bg)] text-accent border-b-2 border-accent'
                      : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]/50'
                    }
                  `}
                >
                  Ear Training
                </button>
              </div>
            </div>

            {/* Key Display + Settings Button */}
            <div className="flex items-center gap-2 px-3 sm:px-6">
              {/* Key Display */}
              <div className="relative" ref={keyPickerRef}>
                <button
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={keyPickerOpen}
                  title={`Key: ${selectedKey} (${KEYS[selectedKey].toFixed(0)} Hz)`}
                  onClick={() => setKeyPickerOpen(v => !v)}
                  className="shrink-0 px-3 py-1.5 rounded-md text-[var(--text-primary)] bg-[var(--card-bg)] hover:bg-[var(--sidebar-bg)] border border-[var(--border)] transition flex items-center gap-1.5"
                >
                  <span className="text-sm font-semibold text-accent">{selectedKey}</span>
                  <span className="text-xs text-[var(--text-muted)]">{KEYS[selectedKey].toFixed(0)} Hz</span>
                  <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {keyPickerOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--card-bg)] border border-[var(--border)] rounded-md shadow-lg z-50 overflow-hidden p-3">
                    <div className="text-xs font-semibold text-[var(--text-muted)] mb-2">Select Key</div>
                    <div className="grid grid-cols-4 gap-1">
                      {(Object.keys(KEYS) as KeyName[]).map((key) => (
                        <button
                          key={key}
                          onClick={() => handleKeyChange(key)}
                          className={`
                            py-1.5 px-1 rounded
                            transition-all duration-200
                            text-xs font-medium
                            ${selectedKey === key
                              ? 'bg-accent text-[var(--page-bg)] shadow-md scale-105'
                              : 'bg-[var(--sidebar-bg)] text-[var(--text-primary)] hover:bg-[var(--border)]'
                            }
                          `}
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 text-center text-xs text-[var(--text-muted)]">
                      Reference pitch for practice
                    </div>
                  </div>
                )}
              </div>
              <div className="relative" ref={themeAccentRef}>
                <button
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={themeAccentOpen}
                  title="Settings"
                  onClick={() => setThemeAccentOpen(v => !v)}
                  className="shrink-0 p-2.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition flex items-center justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {themeAccentOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[var(--card-bg)] border border-[var(--border)] rounded-md shadow-lg z-50 overflow-hidden">
                    {/* Theme Section */}
                    <div className="border-b border-[var(--border)] p-2">
                      <div className="text-xs font-semibold text-[var(--text-muted)] px-2 py-1 mb-1">Theme</div>
                      {THEME_ORDER.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => { setTheme(t); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--sidebar-bg)] rounded ${theme === t ? 'bg-[var(--sidebar-bg)] text-accent font-semibold' : 'text-[var(--text-primary)]'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{THEME_BADGES[t].icon}</span>
                            <span>{THEME_BADGES[t].title}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Notation Section */}
                    <div className="border-b border-[var(--border)] p-2">
                      <div className="text-xs font-semibold text-[var(--text-muted)] px-2 py-1 mb-1">Notation Language</div>
                      {NOTATION_ORDER.map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => { setNotationLanguage(lang); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--sidebar-bg)] rounded ${notationLanguage === lang ? 'bg-[var(--sidebar-bg)] text-accent font-semibold' : 'text-[var(--text-primary)]'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold w-8">{NOTATION_BADGES[lang].abbr}</span>
                            <span className="text-[var(--text-muted)]">({NOTATION_BADGES[lang].symbol})</span>
                            <span className="ml-auto text-[var(--text-muted)] text-xs">{NOTATION_BADGES[lang].title}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Accent Color Section */}
                    <div className="p-3">
                      <div className="text-xs font-semibold text-[var(--text-muted)] mb-3">Accent Colour</div>
                      <div className="flex gap-2 items-center">
                        {ACCENT_COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => { setAccentColor(preset.value); }}
                            title={preset.name}
                            className="w-6 h-6 rounded-full border-2 transition hover:scale-110 flex-shrink-0"
                            style={{
                              backgroundColor: preset.value,
                              borderColor: accentColor === preset.value ? 'var(--text-primary)' : 'var(--border)',
                              borderWidth: accentColor === preset.value ? '3px' : '2px',
                            }}
                          />
                        ))}
                        <input
                          ref={accentColorInputRef}
                          type="color"
                          value={accentColor}
                          onChange={(e) => { setAccentColor(e.target.value); }}
                          className="sr-only"
                          aria-label="Custom accent colour"
                        />
                        <button
                          type="button"
                          onClick={() => accentColorInputRef.current?.click()}
                          title="Custom colour"
                          className="w-6 h-6 rounded-full border-2 transition hover:scale-110 flex-shrink-0 cursor-pointer"
                          style={{
                            background: 'conic-gradient(from 180deg at 50% 50%, #f44336, #ffeb3b, #4caf50, #2196f3, #9c27b0, #f44336)',
                            borderColor: !ACCENT_COLOR_PRESETS.some(p => p.value === accentColor) ? 'var(--text-primary)' : 'var(--border)',
                            borderWidth: !ACCENT_COLOR_PRESETS.some(p => p.value === accentColor) ? '3px' : '2px',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tab Content + Footer – scroll together */}
          <div className="scroll-area flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden">
            <div className="flex-1 flex items-start justify-center p-4 sm:p-6 min-w-0 w-full">
              {activeTab === 'raga' ? (
                <RagaPlayer baseFreq={baseFreq * getOctaveMultiplier(voiceOctave)} instrumentId={instrumentId} volume={voiceVolume} notationLanguage={notationLanguage} />
              ) : activeTab === 'varisai' ? (
                <VarisaiPlayer baseFreq={baseFreq * getOctaveMultiplier(voiceOctave)} instrumentId={instrumentId} volume={voiceVolume} notationLanguage={notationLanguage} />
              ) : (
                <AuditoryPractice baseFreq={baseFreq * getOctaveMultiplier(voiceOctave)} instrumentId={instrumentId} volume={voiceVolume} />
              )}
            </div>
            <footer className="shrink-0 pt-4 sm:pt-6 px-4 sm:px-8 pb-8 sm:pb-16 text-center border-t bg-[var(--page-bg)] border-[var(--border)]">
              <p className="text-[var(--text-muted)] text-xs sm:text-sm md:text-base font-light italic max-w-xl mx-auto mb-1.5">
                &ldquo;Where there is practice, there is perfection.&rdquo;
              </p>
              <p className="text-[var(--text-muted)] text-xs mb-4 sm:mb-6 opacity-80">
                Carnatic Practice · v{version}
              </p>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}