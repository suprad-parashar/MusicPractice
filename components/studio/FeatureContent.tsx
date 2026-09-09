'use client';

import dynamic from 'next/dynamic';
import type { Settings, SetSetting } from '@/lib/settings';
import { KEYS } from '@/lib/music/keys';
import { getOctaveMultiplier } from '@/lib/music/tanpura';
import { getComposition } from '@/data/compositions';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { LoadingState } from '@/components/ui/LoadingState';
import RagaPlayer from '@/components/ragas/RagaPlayer';

const loading = () => <LoadingState label="Opening your practice…" />;
// Load heavier lessons and players only when their section is opened.
const PracticeSection = dynamic(() => import('@/components/practice/PracticeSection'), { loading });
const AuditoryPractice = dynamic(() => import('@/components/ear-training/AuditoryPractice'), {
  loading,
});
const RhythmTraining = dynamic(() => import('@/components/rhythm/RhythmTraining'), { loading });
const LearnSection = dynamic(() => import('@/components/learn/LearnSection'), { loading });
const LearnSheetMusicSection = dynamic(() => import('@/components/learn/LearnSheetMusicSection'), {
  loading,
});
const CompositionsList = dynamic(() => import('@/components/compositions/CompositionsList'), {
  loading,
});
const CompositionPlayer = dynamic(() => import('@/components/compositions/CompositionPlayer'), {
  loading,
});

export function FeatureContent({
  settings: s,
  setSetting,
  compositionSlug,
  onCompositionSelect,
  ragaRequest,
  onRagaRequestConsumed,
}: {
  settings: Settings;
  setSetting: SetSetting;
  compositionSlug: string | null;
  onCompositionSelect: (slug: string | null) => void;
  ragaRequest: { ragaId: string; nonce: number } | null;
  onRagaRequestConsumed: () => void;
}) {
  const playback = {
    baseFreq: KEYS[s.selectedKey] * getOctaveMultiplier(s.voiceOctave),
    instrumentId: s.instrumentId,
    volume: s.voiceVolume,
    notationLanguage: s.notationLanguage,
  };

  switch (s.activeTab) {
    case 'raga':
      return (
        <RagaPlayer
          {...playback}
          pianoLayoutSaFreq={KEYS[s.selectedKey]}
          openRagaRequest={ragaRequest}
          onOpenRagaRequestConsumed={onRagaRequestConsumed}
        />
      );
    case 'varisai':
      return <PracticeSection {...playback} />;
    case 'auditory':
      return <AuditoryPractice {...playback} />;
    case 'rhythm':
      return <RhythmTraining />;
    case 'learn':
      return (
        <div className="learn-content">
          <SegmentedControl
            label="Learning path"
            className="section-tabs hide-legend"
            value={s.learnSubtab}
            onChange={(value) => setSetting('learnSubtab', value)}
            options={[
              { value: 'carnatic', label: 'Carnatic foundations' },
              { value: 'sheet-music', label: 'Reading sheet music' },
            ]}
          />
          {s.learnSubtab === 'carnatic' ? (
            <LearnSection {...playback} />
          ) : (
            <LearnSheetMusicSection />
          )}
        </div>
      );
    case 'compositions': {
      const composition = compositionSlug ? getComposition(compositionSlug) : null;
      return composition ? (
        <CompositionPlayer
          key={composition.slug}
          composition={composition}
          {...playback}
          onBack={() => onCompositionSelect(null)}
        />
      ) : (
        <>
          {compositionSlug && (
            <p className="inline-error" role="status">
              That composition is unavailable. Explore the library below.
            </p>
          )}
          <CompositionsList onSelect={onCompositionSelect} />
        </>
      );
    }
  }
}
