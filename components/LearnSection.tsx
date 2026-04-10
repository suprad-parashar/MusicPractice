'use client';

import { useState } from 'react';
import LearnLessonPitchMatch from '@/components/LearnLessonPitchMatch';
import LearnLessonSPS from '@/components/LearnLessonSPS';
import LearnLessonVocalRange from '@/components/LearnLessonVocalRange';
import type { InstrumentId } from '@/lib/instrumentLoader';
import type { NotationLanguage } from '@/lib/swaraNotation';

type LessonId = 'match-three' | 'vocal-range' | 'sarali-sps';

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
  const [lesson, setLesson] = useState<LessonId>('match-three');

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6 min-h-0 min-w-0 lg:flex-row lg:items-start">
      <aside className="shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 lg:w-56">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Lessons</h2>
        <ul className="mt-3 space-y-1">
          <li>
            <button
              type="button"
              onClick={() => setLesson('match-three')}
              className={`
                w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors
                ${lesson === 'match-three'
                  ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
                  : 'text-[var(--text-primary)] hover:bg-[var(--sidebar-bg)]'
                }
              `}
            >
              Tritone match
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setLesson('vocal-range')}
              className={`
                w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors
                ${lesson === 'vocal-range'
                  ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
                  : 'text-[var(--text-primary)] hover:bg-[var(--sidebar-bg)]'
                }
              `}
            >
              Range &amp; key
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setLesson('sarali-sps')}
              aria-label="Lesson: Sa-Pa-Sa"
              className={`
                w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors
                ${lesson === 'sarali-sps'
                  ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
                  : 'text-[var(--text-primary)] hover:bg-[var(--sidebar-bg)]'
                }
              `}
            >
              Sa-Pa-Sa
            </button>
          </li>
        </ul>
      </aside>

      <div className="min-w-0 flex-1">
        {lesson === 'match-three' ? (
          <LearnLessonPitchMatch baseFreq={baseFreq} instrumentId={instrumentId} volume={volume} />
        ) : lesson === 'vocal-range' ? (
          <LearnLessonVocalRange volume={volume} />
        ) : lesson === 'sarali-sps' ? (
          <LearnLessonSPS baseFreq={baseFreq} instrumentId={instrumentId} volume={volume} notationLanguage={notationLanguage} />
        ) : null}
      </div>
    </div>
  );
}
