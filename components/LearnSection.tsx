'use client';

import { useMemo, useState } from 'react';
import LearnLessonPitchMatch from '@/components/LearnLessonPitchMatch';
import LearnLessonSPS, {
  MAYAMALAVAGOWLA_AROHANA_AVAROHANA_TOKENS,
  MAYAMALAVAGOWLA_AROHANA_STEP_COUNT,
} from '@/components/LearnLessonSPS';
import LearnLessonVocalRange from '@/components/LearnLessonVocalRange';
import {
  LearnTheoryHowToPractice,
  LearnTheoryIntroToMusic,
  LearnTheoryScalesAndRagas,
  LearnTheoryTwelveNotes,
  LearnTheoryWhatIsSwara,
} from '@/components/learnTheoryLessons';
import type { InstrumentId } from '@/lib/instrumentLoader';
import type { NotationLanguage } from '@/lib/swaraNotation';

export type LearnLessonId =
  | 'intro-music'
  | 'tritone-match'
  | 'what-is-swara'
  | 'vocal-range'
  | 'twelve-notes'
  | 'sa-pa-sa'
  | 'scales-ragas-intro'
  | 'mmg-scale'
  | 'how-to-practice';

const LESSON_NAV: { id: LearnLessonId; label: string }[] = [
  { id: 'intro-music', label: 'Introduction to Music' },
  { id: 'tritone-match', label: 'Tritone Match' },
  { id: 'what-is-swara', label: 'What is a Swara or a Musical Note?' },
  { id: 'vocal-range', label: 'Range and Key' },
  {
    id: 'twelve-notes',
    label: 'Understanding the twelve notes of music and how they are related',
  },
  { id: 'sa-pa-sa', label: 'Sa Pa Sa' },
  { id: 'scales-ragas-intro', label: 'Introduction to Scales and Ragas' },
  { id: 'mmg-scale', label: 'Mayamalavagowla Scale' },
  { id: 'how-to-practice', label: 'How to practice from here' },
];

function nextLearnLessonId(current: LearnLessonId): LearnLessonId | null {
  const i = LESSON_NAV.findIndex((e) => e.id === current);
  if (i < 0 || i >= LESSON_NAV.length - 1) return null;
  return LESSON_NAV[i + 1]!.id;
}

export default function LearnSection({
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
  const [lesson, setLesson] = useState<LearnLessonId>('intro-music');
  const nextId = nextLearnLessonId(lesson);
  const nextLabel = nextId ? LESSON_NAV.find((e) => e.id === nextId)?.label : null;

  const nextLessonFooter = useMemo(() => {
    if (!nextId || !nextLabel) return null;
    return (
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-xs text-slate-400">Continue the curriculum when you are ready.</p>
        <button
          type="button"
          onClick={() => setLesson(nextId)}
          className="inline-flex max-w-full shrink-0 flex-col items-stretch gap-0.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-left text-sm font-semibold text-[var(--page-bg)] shadow-sm ring-1 ring-[var(--accent)]/30 transition hover:opacity-90"
        >
          <span>Next lesson</span>
          <span className="max-w-[min(100%,18rem)] text-xs font-medium leading-snug opacity-90">{nextLabel}</span>
        </button>
      </div>
    );
  }, [nextId, nextLabel]);

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6 min-h-0 min-w-0 lg:flex-row lg:items-start">
      <aside className="shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 lg:w-72 xl:w-80">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Lessons</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-4 marker:text-[var(--text-muted)]">
          {LESSON_NAV.map(({ id, label }) => (
            <li key={id} className="pl-1">
              <button
                type="button"
                onClick={() => setLesson(id)}
                aria-current={lesson === id ? 'page' : undefined}
                className={`
                  w-full rounded-lg px-2 py-2 text-left text-xs font-medium leading-snug transition-colors sm:text-[13px]
                  ${lesson === id
                    ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
                    : 'text-[var(--text-primary)] hover:bg-[var(--sidebar-bg)]'
                  }
                `}
              >
                {label}
              </button>
            </li>
          ))}
        </ol>
      </aside>

      <div className="min-w-0 flex-1">
        {lesson === 'intro-music' ? (
          <LearnTheoryIntroToMusic footer={nextLessonFooter} />
        ) : lesson === 'tritone-match' ? (
          <LearnLessonPitchMatch baseFreq={baseFreq} instrumentId={instrumentId} volume={volume} footer={nextLessonFooter} />
        ) : lesson === 'what-is-swara' ? (
          <LearnTheoryWhatIsSwara footer={nextLessonFooter} />
        ) : lesson === 'vocal-range' ? (
          <LearnLessonVocalRange volume={volume} footer={nextLessonFooter} />
        ) : lesson === 'twelve-notes' ? (
          <LearnTheoryTwelveNotes footer={nextLessonFooter} />
        ) : lesson === 'sa-pa-sa' ? (
          <LearnLessonSPS
            baseFreq={baseFreq}
            instrumentId={instrumentId}
            volume={volume}
            notationLanguage={notationLanguage}
            footer={nextLessonFooter}
          />
        ) : lesson === 'scales-ragas-intro' ? (
          <LearnTheoryScalesAndRagas footer={nextLessonFooter} />
        ) : lesson === 'mmg-scale' ? (
          <LearnLessonSPS
            baseFreq={baseFreq}
            instrumentId={instrumentId}
            volume={volume}
            notationLanguage={notationLanguage}
            stepTokens={MAYAMALAVAGOWLA_AROHANA_AVAROHANA_TOKENS}
            arohanaStepCount={MAYAMALAVAGOWLA_AROHANA_STEP_COUNT}
            title="Mayamalavagowla — full scale"
            referenceDurationMs={1000}
            footer={nextLessonFooter}
            description={
              <>
                When you begin: same flow as Sa Pa Sa, but one step per swara for a full melakarta Mayamalavagowla arohaṇa and
                avarohaṇa (16 notes: the first tāra ṣaḍjam ends the ascent, the second begins the descent) in your selected key. Each
                reference tone is 1&nbsp;s. You may still sing{' '}
                <strong className="text-[var(--text-primary)]">one octave below</strong> the written pitch and pass (±50¢
                to either octave).
              </>
            }
          />
        ) : lesson === 'how-to-practice' ? (
          <LearnTheoryHowToPractice footer={nextLessonFooter} />
        ) : null}
      </div>
    </div>
  );
}
