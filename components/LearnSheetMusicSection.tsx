'use client';

import { useMemo, useState } from 'react';
import {
  LessonStaffClefsLedgerLines,
  LessonNoteDuration,
  LessonMeasuresAndTimeSignature,
  LessonRestDuration,
  LessonDotsAndTies,
  LessonStepsAndAccidentals,
  LessonSimpleCompoundMeter,
  LessonOddMeter,
  LessonMajorScale,
  LessonMinorScales,
  LessonScaleDegrees,
  LessonKeySignatures,
  LessonKeySignatureCalculation,
  LessonGenericIntervals,
  LessonSpecificIntervals,
  LessonWritingIntervals,
  LessonIntervalInversion,
  LessonIntroToChords,
  LessonTriadInversion,
  LessonSeventhChords,
  LessonMoreSeventhChords,
  LessonSeventhChordInversion,
  LessonDiatonicTriads,
  LessonRomanNumeralTriads,
  LessonDiatonicSeventhChords,
  LessonRomanNumeralSeventhChords,
  LessonComposingWithMinorScales,
  LessonVoicingChords,
  LessonAnalysisOCanada,
  LessonNonharmonicTones,
  LessonPhrasesAndCadences,
  LessonCircleProgressions,
  LessonCommonChordProgressions,
  LessonTriadsFirstInversion,
  LessonTriadsSecondInversion,
  LessonAnalysisAuldLangSyne,
  LessonBuildingNeapolitan,
  LessonUsingNeapolitan,
  LessonAnalysisMoonlightSonata,
} from '@/components/sheetMusicLessons';

export type SheetMusicLessonId =
  | 'staff-clefs-ledger-lines'
  | 'note-duration'
  | 'measures-time-signature'
  | 'rest-duration'
  | 'dots-and-ties'
  | 'steps-and-accidentals'
  | 'simple-compound-meter'
  | 'odd-meter'
  | 'major-scale'
  | 'minor-scales'
  | 'scale-degrees'
  | 'key-signatures'
  | 'key-signature-calculation'
  | 'generic-intervals'
  | 'specific-intervals'
  | 'writing-intervals'
  | 'interval-inversion'
  | 'intro-to-chords'
  | 'triad-inversion'
  | 'seventh-chords'
  | 'more-seventh-chords'
  | 'seventh-chord-inversion'
  | 'diatonic-triads'
  | 'roman-numeral-triads'
  | 'diatonic-seventh-chords'
  | 'roman-numeral-seventh-chords'
  | 'composing-minor-scales'
  | 'voicing-chords'
  | 'analysis-o-canada'
  | 'nonharmonic-tones'
  | 'phrases-cadences'
  | 'circle-progressions'
  | 'common-chord-progressions'
  | 'triads-first-inversion'
  | 'triads-second-inversion'
  | 'analysis-auld-lang-syne'
  | 'building-neapolitan'
  | 'using-neapolitan'
  | 'analysis-moonlight-sonata';

type LessonNavSection = {
  heading: string;
  lessons: { id: SheetMusicLessonId; label: string }[];
};

const LESSON_NAV: LessonNavSection[] = [
  {
    heading: 'The Basics',
    lessons: [
      { id: 'staff-clefs-ledger-lines', label: 'The Staff, Clefs, and Ledger Lines' },
      { id: 'note-duration', label: 'Note Duration' },
      { id: 'measures-time-signature', label: 'Measures and Time Signature' },
      { id: 'rest-duration', label: 'Rest Duration' },
      { id: 'dots-and-ties', label: 'Dots and Ties' },
      { id: 'steps-and-accidentals', label: 'Steps and Accidentals' },
    ],
  },
  {
    heading: 'Rhythm and Meter',
    lessons: [
      { id: 'simple-compound-meter', label: 'Simple and Compound Meter' },
      { id: 'odd-meter', label: 'Odd Meter' },
    ],
  },
  {
    heading: 'Scales and Key Signatures',
    lessons: [
      { id: 'major-scale', label: 'The Major Scale' },
      { id: 'minor-scales', label: 'The Minor Scales' },
      { id: 'scale-degrees', label: 'Scale Degrees' },
      { id: 'key-signatures', label: 'Key Signatures' },
      { id: 'key-signature-calculation', label: 'Key Signature Calculation' },
    ],
  },
  {
    heading: 'Intervals',
    lessons: [
      { id: 'generic-intervals', label: 'Generic Intervals' },
      { id: 'specific-intervals', label: 'Specific Intervals' },
      { id: 'writing-intervals', label: 'Writing Intervals' },
      { id: 'interval-inversion', label: 'Interval Inversion' },
    ],
  },
  {
    heading: 'Chords',
    lessons: [
      { id: 'intro-to-chords', label: 'Introduction to Chords' },
      { id: 'triad-inversion', label: 'Triad Inversion' },
      { id: 'seventh-chords', label: 'Seventh Chords' },
      { id: 'more-seventh-chords', label: 'More Seventh Chords' },
      { id: 'seventh-chord-inversion', label: 'Seventh Chord Inversion' },
    ],
  },
  {
    heading: 'Diatonic Chords',
    lessons: [
      { id: 'diatonic-triads', label: 'Diatonic Triads' },
      { id: 'roman-numeral-triads', label: 'Roman Numeral Analysis: Triads' },
      { id: 'diatonic-seventh-chords', label: 'Diatonic Seventh Chords' },
      { id: 'roman-numeral-seventh-chords', label: 'Roman Numeral Analysis: Seventh Chords' },
      { id: 'composing-minor-scales', label: 'Composing with Minor Scales' },
      { id: 'voicing-chords', label: 'Voicing Chords' },
    ],
  },
  {
    heading: 'Chord Progressions',
    lessons: [
      { id: 'nonharmonic-tones', label: 'Nonharmonic Tones' },
      { id: 'phrases-cadences', label: 'Phrases and Cadences' },
      { id: 'circle-progressions', label: 'Circle Progressions' },
      { id: 'common-chord-progressions', label: 'Common Chord Progressions' },
      { id: 'triads-first-inversion', label: 'Triads in First Inversion' },
      { id: 'triads-second-inversion', label: 'Triads in Second Inversion' },
    ],
  },
  {
    heading: 'Neapolitan Chords',
    lessons: [
      { id: 'building-neapolitan', label: 'Building Neapolitan Chords' },
      { id: 'using-neapolitan', label: 'Using Neapolitan Chords' },
    ],
  },
];

const ALL_LESSONS = LESSON_NAV.flatMap((s) => s.lessons);

function nextLessonId(current: SheetMusicLessonId): SheetMusicLessonId | null {
  const i = ALL_LESSONS.findIndex((e) => e.id === current);
  if (i < 0 || i >= ALL_LESSONS.length - 1) return null;
  return ALL_LESSONS[i + 1]!.id;
}

const LESSON_COMPONENT: Record<SheetMusicLessonId, React.ComponentType<{ footer?: React.ReactNode }>> = {
  'staff-clefs-ledger-lines': LessonStaffClefsLedgerLines,
  'note-duration': LessonNoteDuration,
  'measures-time-signature': LessonMeasuresAndTimeSignature,
  'rest-duration': LessonRestDuration,
  'dots-and-ties': LessonDotsAndTies,
  'steps-and-accidentals': LessonStepsAndAccidentals,
  'simple-compound-meter': LessonSimpleCompoundMeter,
  'odd-meter': LessonOddMeter,
  'major-scale': LessonMajorScale,
  'minor-scales': LessonMinorScales,
  'scale-degrees': LessonScaleDegrees,
  'key-signatures': LessonKeySignatures,
  'key-signature-calculation': LessonKeySignatureCalculation,
  'generic-intervals': LessonGenericIntervals,
  'specific-intervals': LessonSpecificIntervals,
  'writing-intervals': LessonWritingIntervals,
  'interval-inversion': LessonIntervalInversion,
  'intro-to-chords': LessonIntroToChords,
  'triad-inversion': LessonTriadInversion,
  'seventh-chords': LessonSeventhChords,
  'more-seventh-chords': LessonMoreSeventhChords,
  'seventh-chord-inversion': LessonSeventhChordInversion,
  'diatonic-triads': LessonDiatonicTriads,
  'roman-numeral-triads': LessonRomanNumeralTriads,
  'diatonic-seventh-chords': LessonDiatonicSeventhChords,
  'roman-numeral-seventh-chords': LessonRomanNumeralSeventhChords,
  'composing-minor-scales': LessonComposingWithMinorScales,
  'voicing-chords': LessonVoicingChords,
  'analysis-o-canada': LessonAnalysisOCanada,
  'nonharmonic-tones': LessonNonharmonicTones,
  'phrases-cadences': LessonPhrasesAndCadences,
  'circle-progressions': LessonCircleProgressions,
  'common-chord-progressions': LessonCommonChordProgressions,
  'triads-first-inversion': LessonTriadsFirstInversion,
  'triads-second-inversion': LessonTriadsSecondInversion,
  'analysis-auld-lang-syne': LessonAnalysisAuldLangSyne,
  'building-neapolitan': LessonBuildingNeapolitan,
  'using-neapolitan': LessonUsingNeapolitan,
  'analysis-moonlight-sonata': LessonAnalysisMoonlightSonata,
};

export default function LearnSheetMusicSection() {
  const [lesson, setLesson] = useState<SheetMusicLessonId>('staff-clefs-ledger-lines');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const nextId = nextLessonId(lesson);
  const nextLabel = nextId ? ALL_LESSONS.find((e) => e.id === nextId)?.label : null;

  const nextLessonFooter = useMemo(() => {
    if (!nextId || !nextLabel) return null;
    return (
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-xs text-slate-400">Continue when you are ready.</p>
        <button
          type="button"
          onClick={() => {
            setLesson(nextId);
            setSidebarOpen(false);
          }}
          className="inline-flex max-w-full shrink-0 flex-col items-stretch gap-0.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-left text-sm font-semibold text-[var(--page-bg)] shadow-sm ring-1 ring-[var(--accent)]/30 transition hover:opacity-90"
        >
          <span>Next lesson</span>
          <span className="max-w-[min(100%,18rem)] text-xs font-medium leading-snug opacity-90">{nextLabel}</span>
        </button>
      </div>
    );
  }, [nextId, nextLabel]);

  const LessonComponent = LESSON_COMPONENT[lesson];

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6 min-h-0 min-w-0 lg:flex-row lg:items-start">
      {/* Mobile sidebar toggle */}
      <button
        type="button"
        onClick={() => setSidebarOpen((v) => !v)}
        className="lg:hidden shrink-0 self-start rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
      >
        {sidebarOpen ? 'Hide lessons' : 'Show lessons'}
      </button>

      <aside
        className={`shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 lg:w-72 xl:w-80 ${
          sidebarOpen ? '' : 'hidden lg:block'
        }`}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Sheet Music Lessons
        </h2>
        <nav className="mt-3 space-y-4">
          {LESSON_NAV.map((section) => (
            <div key={section.heading}>
              <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-accent/70">
                {section.heading}
              </h3>
              <ol className="list-decimal space-y-0.5 pl-4 marker:text-[var(--text-muted)]">
                {section.lessons.map(({ id, label }) => (
                  <li key={id} className="pl-1">
                    <button
                      type="button"
                      onClick={() => {
                        setLesson(id);
                        setSidebarOpen(false);
                      }}
                      aria-current={lesson === id ? 'page' : undefined}
                      className={`
                        w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium leading-snug transition-colors
                        ${
                          lesson === id
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
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <LessonComponent footer={nextLessonFooter} />
      </div>
    </div>
  );
}
