'use client';

import { useState, useLayoutEffect, useEffect } from 'react';
import VarisaiPlayer from '@/components/practice/VarisaiPlayer';
import WarmUpExercises from '@/components/practice/WarmUpExercises';
import VoicePatternTraining from '@/components/practice/VoicePatternTraining';
import type { InstrumentId } from '@/lib/audio/instrumentLoader';
import type { NotationLanguage } from '@/lib/music/swaraNotation';
import { getStored, setStored } from '@/lib/storage';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { LoadingState } from '@/components/ui/LoadingState';

export type PracticeSubTab = 'varisai' | 'warmup' | 'patterns';

const STORAGE_KEY = 'practiceSection';
type Stored = { subTab?: PracticeSubTab };

const VALID: PracticeSubTab[] = ['varisai', 'warmup', 'patterns'];

export default function PracticeSection({
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
  const [subTab, setSubTab] = useState<PracticeSubTab>('varisai');
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const s = getStored<Stored>(STORAGE_KEY, {});
    if (s.subTab && VALID.includes(s.subTab)) setSubTab(s.subTab);
    else {
      // Migration: legacy "Voice training → Patterns" now lives under Practice.
      const legacy = getStored<{ subTab?: string }>('voiceTrainingSection', {});
      if (legacy.subTab === 'patterns') setSubTab('patterns');
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setStored(STORAGE_KEY, { subTab });
  }, [subTab, ready]);

  if (!ready) return <LoadingState label="Opening exercises…" />;

  return (
    <div className="min-w-0">
      <SegmentedControl
        label="Exercise type"
        className="section-tabs hide-legend"
        value={subTab}
        onChange={setSubTab}
        options={[
          { value: 'varisai', label: 'Varisais' },
          { value: 'warmup', label: 'Warm-ups' },
          { value: 'patterns', label: 'Voice patterns' },
        ]}
      />

      {subTab === 'varisai' ? (
        <VarisaiPlayer
          baseFreq={baseFreq}
          instrumentId={instrumentId}
          volume={volume}
          notationLanguage={notationLanguage}
        />
      ) : subTab === 'warmup' ? (
        <WarmUpExercises
          baseFreq={baseFreq}
          instrumentId={instrumentId}
          volume={volume}
          notationLanguage={notationLanguage}
        />
      ) : (
        <VoicePatternTraining
          baseFreq={baseFreq}
          instrumentId={instrumentId}
          volume={volume}
          notationLanguage={notationLanguage}
        />
      )}
    </div>
  );
}
