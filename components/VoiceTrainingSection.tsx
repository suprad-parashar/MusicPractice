'use client';

import { useState, useLayoutEffect, useEffect } from 'react';
import VoicePatternTraining from '@/components/VoicePatternTraining';
import type { InstrumentId } from '@/lib/instrumentLoader';
import type { NotationLanguage } from '@/lib/swaraNotation';
import { getStored, setStored } from '@/lib/storage';

export type VoiceTrainingSubTab = 'patterns';

const STORAGE_KEY = 'voiceTrainingSection';
type Stored = { subTab?: VoiceTrainingSubTab };

const VALID: VoiceTrainingSubTab[] = ['patterns'];

export default function VoiceTrainingSection({
  baseFreq,
  instrumentId,
  volume,
  notationLanguage,
}: {
  baseFreq: number;
  instrumentId: InstrumentId;
  volume: number;
  notationLanguage: NotationLanguage;
}) {
  const [subTab, setSubTab] = useState<VoiceTrainingSubTab>('patterns');
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const s = getStored<Stored>(STORAGE_KEY, {});
    if (s.subTab && VALID.includes(s.subTab)) setSubTab(s.subTab);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setStored(STORAGE_KEY, { subTab });
  }, [subTab, ready]);

  if (!ready) {
    return (
      <div className="w-full max-w-4xl mx-auto flex items-center justify-center min-h-[200px]">
        <span className="text-slate-500 text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto min-w-0">
      <div className="flex flex-wrap gap-2 justify-center mb-6 sm:mb-8 px-1">
        <button
          type="button"
          onClick={() => setSubTab('patterns')}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
            ${subTab === 'patterns'
              ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30 scale-105'
              : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            }
          `}
        >
          Patterns
        </button>
      </div>

      {subTab === 'patterns' ? (
        <VoicePatternTraining
          baseFreq={baseFreq}
          instrumentId={instrumentId}
          volume={volume}
          notationLanguage={notationLanguage}
        />
      ) : null}
    </div>
  );
}
