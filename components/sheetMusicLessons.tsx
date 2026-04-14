'use client';

import type { ReactNode } from 'react';
import { LearnTheoryArticle } from '@/components/LearnTheoryArticle';
import {
  NoteSequencePlayer,
  ChordBank,
  IntervalGrid,
  ProgressionPlayer,
  StaffDiagram,
  TimeSignatureStaff,
  DottedNoteExamples,
  TiedNoteExamples,
  AccidentalsOnStaff,
  EnharmonicDemo,
  DurationBars,
  NoteCards,
  BeatPattern,
  CircleOfFifths,
  HalfWholeStepDemo,
  RestSymbols,
  KeySignatureExamples,
  IntervalStaffExamples,
  SpecificIntervalStaffExamples,
  InversionStaffExamples,
  ChordOnStaff,
} from '@/components/SheetMusicVisuals';

type FooterProps = { footer?: ReactNode };

/* ═══════════════════════════════════════════════════════════
   THE BASICS
   ═══════════════════════════════════════════════════════════ */

export function LessonStaffClefsLedgerLines({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="The Staff, Clefs, and Ledger Lines" footer={footer}>
      <p>
        Written music lives on a <strong>staff</strong> (or stave): five horizontal lines with four spaces between them.
        Each line and space represents a different pitch. Notes placed higher on the staff sound higher; notes placed
        lower sound lower.
      </p>
      <h3>Clefs</h3>
      <p>
        A <strong>clef</strong> is the symbol at the beginning of every staff that tells you which pitches the lines and
        spaces represent. The two most common clefs are:
      </p>
      <ul>
        <li>
          <strong>Treble clef (G clef)</strong> — its curl wraps around the second line, fixing that line as G4 (the G
          above middle C). The lines from bottom to top spell <strong>E G B D F</strong> and the spaces spell{' '}
          <strong>F A C E</strong>.
        </li>
        <li>
          <strong>Bass clef (F clef)</strong> — its two dots straddle the fourth line, fixing it as F3 (the F below
          middle C). The lines from bottom to top spell <strong>G B D F A</strong> and the spaces spell{' '}
          <strong>A C E G</strong>.
        </li>
      </ul>

      <StaffDiagram
        clef="treble"
        notes={[
          { position: 0, label: 'E', midi: 64 },
          { position: 2, label: 'G', midi: 67 },
          { position: 4, label: 'B', midi: 71 },
          { position: 6, label: 'D', midi: 74 },
          { position: 8, label: 'F', midi: 77 },
        ]}
        caption="Treble clef lines: E – G – B – D – F"
      />
      <StaffDiagram
        clef="treble"
        notes={[
          { position: 1, label: 'F', color: '#3b82f6', midi: 65 },
          { position: 3, label: 'A', color: '#3b82f6', midi: 69 },
          { position: 5, label: 'C', color: '#3b82f6', midi: 72 },
          { position: 7, label: 'E', color: '#3b82f6', midi: 76 },
        ]}
        caption="Treble clef spaces: F – A – C – E"
      />
      <StaffDiagram
        clef="bass"
        notes={[
          { position: 0, label: 'G', midi: 43 },
          { position: 2, label: 'B', midi: 47 },
          { position: 4, label: 'D', midi: 50 },
          { position: 6, label: 'F', midi: 53 },
          { position: 8, label: 'A', midi: 57 },
        ]}
        caption="Bass clef lines: G – B – D – F – A"
      />
      <StaffDiagram
        clef="bass"
        notes={[
          { position: 1, label: 'A', color: '#3b82f6', midi: 45 },
          { position: 3, label: 'C', color: '#3b82f6', midi: 48 },
          { position: 5, label: 'E', color: '#3b82f6', midi: 52 },
          { position: 7, label: 'G', color: '#3b82f6', midi: 55 },
        ]}
        caption="Bass clef spaces: A – C – E – G"
      />

      <p>
        Other clefs (alto, tenor) exist for instruments whose range sits between treble and bass, but the treble and
        bass clefs cover the vast majority of written music.
      </p>
      <h3>Ledger lines</h3>
      <p>
        When a note is too high or too low to fit on the five-line staff, short <strong>ledger lines</strong> are drawn
        above or below the staff to extend it. Middle C, for example, sits on one ledger line below the treble staff or
        one ledger line above the bass staff. Ledger lines follow the same spacing as the staff itself, so the
        line-space pattern continues seamlessly.
      </p>

      <StaffDiagram
        clef="treble"
        notes={[{ position: -2, label: 'Middle C', color: '#10b981', midi: 60 }]}
        caption="Middle C on a ledger line below the treble staff"
      />
      <StaffDiagram
        clef="bass"
        notes={[{ position: 10, label: 'Middle C', color: '#10b981', midi: 60 }]}
        caption="Middle C on a ledger line above the bass staff"
      />
    </LearnTheoryArticle>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANALYSIS (placeholders)
   ═══════════════════════════════════════════════════════════ */

export function LessonAnalysisOCanada({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Analysis: O Canada" footer={footer}>
      <p>
        This lesson is coming soon.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonAnalysisAuldLangSyne({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Analysis: Auld Lang Syne" footer={footer}>
      <p>
        This lesson is coming soon.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonAnalysisMoonlightSonata({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Analysis: Moonlight Sonata" footer={footer}>
      <p>
        This lesson is coming soon.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonNoteDuration({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Note Duration" footer={footer}>
      <p>
        The <strong>shape</strong> of a note tells you how long to hold it relative to other notes. Five standard note
        values form a halving chain—each is half the duration of the previous one:
      </p>
      <ul>
        <li>
          <strong>Whole note (semibreve)</strong> — an open oval with no stem. It fills an entire measure in 4/4 time.
        </li>
        <li>
          <strong>Half note (minim)</strong> — an open oval with a stem. Two half notes equal one whole note.
        </li>
        <li>
          <strong>Quarter note (crotchet)</strong> — a filled oval with a stem. Four quarter notes equal one whole note.
        </li>
        <li>
          <strong>Eighth note (quaver)</strong> — a filled oval with a stem and one flag (or beam). Eight of these equal
          one whole note.
        </li>
        <li>
          <strong>Sixteenth note (semiquaver)</strong> — a filled oval with a stem and two flags. Sixteen of these equal
          one whole note.
        </li>
      </ul>

      <NoteCards />

      <DurationBars />

      <h3>Flags and beams</h3>
      <p>
        Each added <strong>flag</strong> halves the duration again. When several flagged notes appear in sequence, flags
        are replaced by <strong>beams</strong> (horizontal bars connecting the stems), which makes rhythmic groupings
        easier to read at a glance.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonMeasuresAndTimeSignature({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Measures and Time Signature" footer={footer}>
      <p>
        Music is divided into <strong>measures</strong> (also called bars) by vertical lines called{' '}
        <strong>barlines</strong>. Each measure holds a fixed total duration determined by the{' '}
        <strong>time signature</strong>—the two numbers stacked at the beginning of a piece.
      </p>
      <h3>Reading a time signature</h3>
      <ul>
        <li>
          The <strong>top number</strong> tells you how many beats are in each measure.
        </li>
        <li>
          The <strong>bottom number</strong> tells you which note value gets one beat (4 = quarter note, 8 = eighth
          note, 2 = half note).
        </li>
      </ul>
      <p>
        In <strong>4/4 time</strong> (the most common signature, sometimes shown as a large "C" for "common time"), each
        measure holds four quarter-note beats. In <strong>3/4 time</strong>, each measure holds three quarter-note beats
        — this is the waltz meter.
      </p>

      <TimeSignatureStaff top={4} bottom={4} caption="4/4 — four quarter-note beats per measure" />
      <TimeSignatureStaff top={3} bottom={8} noteCount={3} caption="3/8 — three eighth-note beats per measure" />

      <BeatPattern groups={[4]} label="4/4 time — four beats per measure" bpm={100} />
      <BeatPattern groups={[3]} label="3/8 time — three eighth-note beats" bpm={140} />

      <h3>Why measures matter</h3>
      <p>
        Measures group beats into regular, repeating units so your eye and ear can find the strong beats (typically beat
        1) quickly. They also make it much easier to rehearse: a conductor can say "start at measure 32" and everyone
        knows exactly where to look.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonRestDuration({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Rest Duration" footer={footer}>
      <p>
        Silence is as important as sound. A <strong>rest</strong> is a symbol that tells the performer to be silent for a
        specific duration. Every note value has a matching rest:
      </p>
      <ul>
        <li>
          <strong>Whole rest</strong> — a filled rectangle hanging from the fourth line. In 4/4 time it fills the whole
          measure. A whole rest also serves as a "full-measure rest" in any time signature.
        </li>
        <li>
          <strong>Half rest</strong> — a filled rectangle sitting on the third line. It lasts two beats in 4/4.
        </li>
        <li>
          <strong>Quarter rest</strong> — a zigzag symbol. One beat in 4/4.
        </li>
        <li>
          <strong>Eighth rest</strong> — looks like a small "7" with a dot. Half a beat in 4/4.
        </li>
        <li>
          <strong>Sixteenth rest</strong> — similar to the eighth rest but with two flags. A quarter of a beat in 4/4.
        </li>
      </ul>

      <RestSymbols />

      <p>
        Rests follow the same halving chain as notes: each rest is half the duration of the one above it. In every
        measure the total duration of notes plus rests must add up to the value specified by the time signature.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonDotsAndTies({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Dots and Ties" footer={footer}>
      <p>
        Standard note values only give you powers of two (whole, half, quarter…). <strong>Dots</strong> and{' '}
        <strong>ties</strong> let you create any other duration.
      </p>
      <h3>Dotted notes</h3>
      <p>
        A small dot placed to the right of a note head increases its duration by <strong>half its original value</strong>
        . A dotted half note, for example, lasts three beats instead of two (2 + 1). A dotted quarter note lasts one and
        a half beats (1 + ½).
      </p>

      <DottedNoteExamples />

      <p>
        A <strong>double dot</strong> adds half plus a quarter of the original: a double-dotted half note lasts 3½ beats
        (2 + 1 + ½). Double dots are rarer but appear in slower music.
      </p>
      <h3>Ties</h3>
      <p>
        A <strong>tie</strong> is a curved line connecting two notes of the <strong>same pitch</strong>. You play or sing
        the first note and hold it for the combined duration of both notes without re-attacking. Ties let durations cross
        barlines—something a single note cannot do—and they can create any duration that dots alone cannot.
      </p>

      <TiedNoteExamples />
      <p>
        Dots modify a single note; ties join two. Together they give composers total flexibility over rhythm.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonStepsAndAccidentals({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Steps and Accidentals" footer={footer}>
      <p>
        A <strong>half step</strong> (semitone) is the smallest interval in standard Western music—the distance from one
        piano key to the very next key, black or white. A <strong>whole step</strong> (whole tone) equals two half steps.
      </p>

      <HalfWholeStepDemo />

      <h3>Accidentals</h3>
      <p>
        <strong>Accidentals</strong> are symbols placed before a note to raise or lower its pitch:
      </p>
      <ul>
        <li>
          <strong>Sharp (♯)</strong> — raises the note by one half step.
        </li>
        <li>
          <strong>Flat (♭)</strong> — lowers the note by one half step.
        </li>
        <li>
          <strong>Natural (♮)</strong> — cancels any sharp or flat previously in effect.
        </li>
        <li>
          <strong>Double sharp (𝄪)</strong> — raises the note by two half steps (one whole step).
        </li>
        <li>
          <strong>Double flat (𝄫)</strong> — lowers the note by two half steps.
        </li>
      </ul>

      <AccidentalsOnStaff />

      <p>
        An accidental applies to every repetition of that note <strong>for the rest of the measure</strong> (unless
        canceled by another accidental). In the next measure the note reverts to whatever the key signature dictates.
      </p>
      <h3>Enharmonic equivalents</h3>
      <p>
        C♯ and D♭ sound identical on a piano—they are <strong>enharmonic equivalents</strong>. Which spelling a composer
        chooses depends on the musical context: key signature, scale, and voice-leading conventions.
      </p>

      <EnharmonicDemo />
    </LearnTheoryArticle>
  );
}

/* ═══════════════════════════════════════════════════════════
   RHYTHM AND METER
   ═══════════════════════════════════════════════════════════ */

export function LessonSimpleCompoundMeter({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Simple and Compound Meter" footer={footer}>
      <p>
        Time signatures fall into two broad families based on how each beat naturally subdivides.
      </p>
      <h3>Simple meter</h3>
      <p>
        In a <strong>simple meter</strong> each beat divides into <strong>two</strong> equal parts. The most common
        simple meters are <strong>2/4</strong> (two beats per measure), <strong>3/4</strong> (three beats), and{' '}
        <strong>4/4</strong> (four beats), all with the quarter note as the beat unit.
      </p>

      <BeatPattern groups={[2]} label="2/4 — simple duple (march)" bpm={108} />
      <BeatPattern groups={[4]} label="4/4 — simple quadruple" bpm={100} />

      <h3>Compound meter</h3>
      <p>
        In a <strong>compound meter</strong> each beat divides into <strong>three</strong> equal parts, giving a
        "triplet" feel. The top number of a compound signature is divisible by 3 (but is not 3 itself):{' '}
        <strong>6/8</strong> has two dotted-quarter beats, <strong>9/8</strong> has three, and <strong>12/8</strong> has
        four.
      </p>

      <BeatPattern groups={[3, 3]} label="6/8 — compound duple (jig)" bpm={160} />

      <h3>Telling them apart</h3>
      <p>
        Look at the top number: if it is 2, 3, or 4 the meter is simple. If it is 6, 9, or 12 the meter is compound.
        The feel is different: simple meters have a straight pulse, while compound meters have a lilting, swinging
        quality — think of a march (simple) versus a jig (compound).
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonOddMeter({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Odd Meter" footer={footer}>
      <p>
        Not all music fits neatly into groups of two or three beats. <strong>Odd meters</strong> (also called asymmetric
        or irregular meters) have top numbers like 5, 7, or 11 that cannot be evenly divided into equal groups of 2 or
        3.
      </p>
      <h3>How odd meters work</h3>
      <p>
        Performers break an odd meter into a mix of twos and threes. For example:
      </p>
      <ul>
        <li>
          <strong>5/4</strong> is typically felt as <strong>3 + 2</strong> or <strong>2 + 3</strong>.
        </li>
        <li>
          <strong>7/8</strong> is often grouped as <strong>2 + 2 + 3</strong>, <strong>3 + 2 + 2</strong>, or{' '}
          <strong>2 + 3 + 2</strong>.
        </li>
      </ul>

      <BeatPattern groups={[3, 2]} label="5/4 as 3+2" bpm={140} />
      <BeatPattern groups={[2, 2, 3]} label="7/8 as 2+2+3" bpm={180} />

      <h3>Where you hear odd meter</h3>
      <p>
        Odd meters appear in Balkan folk music, progressive rock, film scores, and 20th-century classical music. Dave
        Brubeck's "Take Five" is in 5/4, and many Pink Floyd and Tool songs use 7/8 or other irregular groupings.
        Indian classical music has its own rich system of tālas that includes cycles of 5, 7, and other lengths.
      </p>
    </LearnTheoryArticle>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCALES AND KEY SIGNATURES
   ═══════════════════════════════════════════════════════════ */

export function LessonMajorScale({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="The Major Scale" footer={footer}>
      <p>
        The <strong>major scale</strong> is the most fundamental scale in Western music. It consists of seven distinct
        pitches arranged in a specific pattern of whole steps (W) and half steps (H):
      </p>
      <p>
        <strong>W – W – H – W – W – W – H</strong>
      </p>
      <p>
        Starting from C and following this pattern on a piano's white keys gives you{' '}
        <strong>C – D – E – F – G – A – B – C</strong> — the C major scale, the only major scale that uses no sharps or
        flats.
      </p>

      <NoteSequencePlayer
        title="C Major Scale"
        notes={[
          { midi: 60, label: 'C' }, { midi: 62, label: 'D' }, { midi: 64, label: 'E' },
          { midi: 65, label: 'F' }, { midi: 67, label: 'G' }, { midi: 69, label: 'A' },
          { midi: 71, label: 'B' }, { midi: 72, label: 'C' },
        ]}
      />

      <StaffDiagram
        clef="treble"
        notes={[
          { position: -2, label: 'C', midi: 60 },
          { position: -1, label: 'D', midi: 62 },
          { position: 0, label: 'E', midi: 64 },
          { position: 1, label: 'F', midi: 65 },
          { position: 2, label: 'G', midi: 67 },
          { position: 3, label: 'A', midi: 69 },
          { position: 4, label: 'B', midi: 71 },
          { position: 5, label: 'C', midi: 72 },
        ]}
        caption="C Major scale on the staff — W W H W W W H"
      />

      <h3>Building major scales on any note</h3>
      <p>
        You can build a major scale starting on any pitch by strictly following the W-W-H-W-W-W-H pattern. Starting on G
        requires one sharp (F♯); starting on D requires two sharps (F♯, C♯); starting on F requires one flat (B♭). The
        resulting sharps or flats become the <strong>key signature</strong> for that key.
      </p>

      <NoteSequencePlayer
        title="G Major Scale"
        notes={[
          { midi: 55, label: 'G' }, { midi: 57, label: 'A' }, { midi: 59, label: 'B' },
          { midi: 60, label: 'C' }, { midi: 62, label: 'D' }, { midi: 64, label: 'E' },
          { midi: 66, label: 'F♯' }, { midi: 67, label: 'G' },
        ]}
      />

      <StaffDiagram
        clef="treble"
        notes={[
          { position: 2, label: 'G', midi: 67 },
          { position: 3, label: 'A', midi: 69 },
          { position: 4, label: 'B', midi: 71 },
          { position: 5, label: 'C', midi: 72 },
          { position: 6, label: 'D', midi: 74 },
          { position: 7, label: 'E', midi: 76 },
          { position: 8, label: 'F♯', midi: 78 },
          { position: 9, label: 'G', midi: 79 },
        ]}
        caption="G Major scale on the staff — note the F♯"
      />

      <h3>Why the major scale matters</h3>
      <p>
        Chords, harmony, and most of Western tonality are built from the relationships within the major scale. When you
        learn to hear and sing the major scale, you gain a framework for understanding virtually everything else in tonal
        music.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonMinorScales({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="The Minor Scales" footer={footer}>
      <p>
        Minor scales have a darker, more somber quality than major. There are three commonly used forms:
      </p>
      <h3>Natural minor</h3>
      <p>
        The <strong>natural minor scale</strong> follows the pattern{' '}
        <strong>W – H – W – W – H – W – W</strong>. Starting from A:{' '}
        <strong>A – B – C – D – E – F – G – A</strong> (all white keys). It is also called the Aeolian mode.
      </p>

      <NoteSequencePlayer
        title="A Natural Minor"
        notes={[
          { midi: 57, label: 'A' }, { midi: 59, label: 'B' }, { midi: 60, label: 'C' },
          { midi: 62, label: 'D' }, { midi: 64, label: 'E' }, { midi: 65, label: 'F' },
          { midi: 67, label: 'G' }, { midi: 69, label: 'A' },
        ]}
      />

      <StaffDiagram
        clef="treble"
        notes={[
          { position: 3, label: 'A', midi: 69 },
          { position: 4, label: 'B', midi: 71 },
          { position: 5, label: 'C', midi: 72 },
          { position: 6, label: 'D', midi: 74 },
          { position: 7, label: 'E', midi: 76 },
          { position: 8, label: 'F', midi: 77 },
          { position: 9, label: 'G', midi: 79 },
          { position: 10, label: 'A', midi: 81 },
        ]}
        caption="A Natural Minor — W H W W H W W"
      />

      <h3>Harmonic minor</h3>
      <p>
        The <strong>harmonic minor scale</strong> raises the 7th degree of the natural minor by a half step, creating a
        leading tone that pulls strongly toward the tonic. This gives the pattern{' '}
        <strong>W – H – W – W – H – W+H – H</strong>. The raised 7th creates an exotic-sounding augmented second between
        the 6th and 7th degrees.
      </p>

      <NoteSequencePlayer
        title="A Harmonic Minor"
        notes={[
          { midi: 57, label: 'A' }, { midi: 59, label: 'B' }, { midi: 60, label: 'C' },
          { midi: 62, label: 'D' }, { midi: 64, label: 'E' }, { midi: 65, label: 'F' },
          { midi: 68, label: 'G♯' }, { midi: 69, label: 'A' },
        ]}
      />

      <StaffDiagram
        clef="treble"
        notes={[
          { position: 3, label: 'A', midi: 69 },
          { position: 4, label: 'B', midi: 71 },
          { position: 5, label: 'C', midi: 72 },
          { position: 6, label: 'D', midi: 74 },
          { position: 7, label: 'E', midi: 76 },
          { position: 8, label: 'F', midi: 77 },
          { position: 9, label: 'G♯', color: '#ef4444', midi: 80 },
          { position: 10, label: 'A', midi: 81 },
        ]}
        caption="A Harmonic Minor — raised 7th (G♯) highlighted"
      />

      <h3>Melodic minor</h3>
      <p>
        The <strong>melodic minor scale</strong> raises both the 6th and 7th degrees when ascending (smoothing out the
        augmented second from harmonic minor), and reverts to natural minor when descending. This dual nature makes it
        unique among common scales.
      </p>

      <NoteSequencePlayer
        title="A Melodic Minor (ascending)"
        notes={[
          { midi: 57, label: 'A' }, { midi: 59, label: 'B' }, { midi: 60, label: 'C' },
          { midi: 62, label: 'D' }, { midi: 64, label: 'E' }, { midi: 66, label: 'F♯' },
          { midi: 68, label: 'G♯' }, { midi: 69, label: 'A' },
        ]}
      />

      <StaffDiagram
        clef="treble"
        notes={[
          { position: 3, label: 'A', midi: 69 },
          { position: 4, label: 'B', midi: 71 },
          { position: 5, label: 'C', midi: 72 },
          { position: 6, label: 'D', midi: 74 },
          { position: 7, label: 'E', midi: 76 },
          { position: 8, label: 'F♯', color: '#ef4444', midi: 78 },
          { position: 9, label: 'G♯', color: '#ef4444', midi: 80 },
          { position: 10, label: 'A', midi: 81 },
        ]}
        caption="A Melodic Minor (ascending) — raised 6th and 7th highlighted"
      />

      <p>
        Each minor form serves a different harmonic and melodic purpose, and composers often mix them freely within a
        single piece.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonScaleDegrees({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Scale Degrees" footer={footer}>
      <p>
        Every note in a scale has a numbered position called its <strong>scale degree</strong>, and each degree has a
        special name that describes its function:
      </p>
      <ul>
        <li><strong>1st — Tonic</strong>: the home note, the key center.</li>
        <li><strong>2nd — Supertonic</strong>: one step above the tonic.</li>
        <li><strong>3rd — Mediant</strong>: midway between tonic and dominant.</li>
        <li><strong>4th — Subdominant</strong>: the same distance below the tonic as the dominant is above.</li>
        <li><strong>5th — Dominant</strong>: the strongest pull toward (or away from) the tonic after the tonic itself.</li>
        <li><strong>6th — Submediant</strong>: midway between the tonic (above) and the subdominant.</li>
        <li><strong>7th — Leading tone / Subtonic</strong>: when it is a half step below the tonic it is a <em>leading tone</em>; when a whole step below, a <em>subtonic</em>.</li>
      </ul>

      <NoteSequencePlayer
        title="Scale degrees in C major"
        intervalMs={500}
        notes={[
          { midi: 60, label: '1 Tonic' }, { midi: 62, label: '2 Super.' },
          { midi: 64, label: '3 Med.' }, { midi: 65, label: '4 Sub-dom.' },
          { midi: 67, label: '5 Dom.' }, { midi: 69, label: '6 Sub-med.' },
          { midi: 71, label: '7 Leading' }, { midi: 72, label: '8 Tonic' },
        ]}
      />

      <StaffDiagram
        clef="treble"
        notes={[
          { position: -2, label: '1̂ C', midi: 60 },
          { position: -1, label: '2̂ D', midi: 62 },
          { position: 0, label: '3̂ E', midi: 64 },
          { position: 1, label: '4̂ F', midi: 65 },
          { position: 2, label: '5̂ G', midi: 67 },
          { position: 3, label: '6̂ A', midi: 69 },
          { position: 4, label: '7̂ B', midi: 71 },
          { position: 5, label: '8̂ C', midi: 72 },
        ]}
        caption="Scale degrees on the staff (C major)"
      />

      <h3>Why names matter</h3>
      <p>
        Scale-degree names let musicians talk about music <strong>independently of key</strong>. "The dominant resolves
        to the tonic" is true whether you are in C major, F♯ major, or any other key. These functional names are the
        foundation of harmonic analysis.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonKeySignatures({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Key Signatures" footer={footer}>
      <p>
        Rather than writing accidentals on every affected note, a <strong>key signature</strong> groups all the sharps or
        flats at the beginning of each staff, right after the clef. Every note on those lines or spaces is automatically
        sharped or flatted throughout the piece unless overridden by an accidental.
      </p>
      <h3>Order of sharps and flats</h3>
      <p>
        Sharps always appear in the order <strong>F – C – G – D – A – E – B</strong>.
        Flats appear in the reverse order: <strong>B – E – A – D – G – C – F</strong>.
        These orderings are fixed — a key signature with three sharps is always F♯, C♯, G♯ (never any other combination).
      </p>
      <h3>Identifying the key</h3>
      <ul>
        <li>
          <strong>Sharps</strong>: the last sharp is the 7th degree (leading tone). Go up a half step from it to find the
          major key. Three sharps (F♯ C♯ G♯) → last sharp is G♯ → key is A major.
        </li>
        <li>
          <strong>Flats</strong>: the second-to-last flat <em>is</em> the major key (for two or more flats). Three flats
          (B♭ E♭ A♭) → second-to-last is E♭ → key is E♭ major. One flat (B♭) is always F major.
        </li>
      </ul>
      <p>
        Every major key signature also implies a <strong>relative minor</strong> a minor third (3 half steps) below. A
        major (3 sharps) and F♯ minor share the same key signature.
      </p>

      <KeySignatureExamples />
    </LearnTheoryArticle>
  );
}

export function LessonKeySignatureCalculation({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Key Signature Calculation" footer={footer}>
      <p>
        There is a systematic method for finding the key signature of any major or minor key without memorizing a table.
      </p>
      <h3>The circle of fifths shortcut</h3>
      <p>
        Starting from C (no sharps or flats), each step <strong>up a perfect fifth</strong> adds one sharp, and each step{' '}
        <strong>down a perfect fifth</strong> (or up a perfect fourth) adds one flat:
      </p>
      <ul>
        <li>C → G (1♯) → D (2♯) → A (3♯) → E (4♯) → B (5♯) → F♯ (6♯) → C♯ (7♯)</li>
        <li>C → F (1♭) → B♭ (2♭) → E♭ (3♭) → A♭ (4♭) → D♭ (5♭) → G♭ (6♭) → C♭ (7♭)</li>
      </ul>

      <CircleOfFifths />

      <h3>Calculating for minor keys</h3>
      <p>
        Every minor key shares the signature of its <strong>relative major</strong>, which is a minor third (3 half
        steps) above. To find the signature for D minor: D + 3 half steps = F major = 1 flat (B♭). So D minor has one
        flat.
      </p>
      <h3>Quick mental math</h3>
      <p>
        Count how many fifths separate your target key from C. That count is the number of accidentals. If you went up
        (clockwise on the circle), they are sharps; if you went down (counter-clockwise), they are flats.
      </p>
    </LearnTheoryArticle>
  );
}

/* ═══════════════════════════════════════════════════════════
   INTERVALS
   ═══════════════════════════════════════════════════════════ */

export function LessonGenericIntervals({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Generic Intervals" footer={footer}>
      <p>
        An <strong>interval</strong> is the distance between two pitches. The simplest way to measure one is to count the
        number of letter names it spans, including both the starting and ending notes. This count gives you the{' '}
        <strong>generic interval</strong> (also called the ordinal or diatonic number):
      </p>
      <ul>
        <li><strong>Unison (1st)</strong> — same note to itself: C to C.</li>
        <li><strong>2nd</strong> — C to D (two letter names).</li>
        <li><strong>3rd</strong> — C to E (three letter names).</li>
        <li><strong>4th</strong> — C to F.</li>
        <li><strong>5th</strong> — C to G.</li>
        <li><strong>6th</strong> — C to A.</li>
        <li><strong>7th</strong> — C to B.</li>
        <li><strong>Octave (8th)</strong> — C to the next C.</li>
      </ul>
      <IntervalStaffExamples />

      <h3>Why "generic"?</h3>
      <p>
        The generic interval only tells you how many staff positions apart the notes are. It does <em>not</em> tell you
        the exact number of half steps. C to E and C to E♭ are both a "third" generically, even though they sound
        different. To distinguish them, you need the <strong>specific quality</strong> — covered in the next lesson.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonSpecificIntervals({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Specific Intervals" footer={footer}>
      <p>
        A <strong>specific interval</strong> combines the generic number with a <strong>quality</strong> that tells you
        the exact number of half steps. The five qualities are:
      </p>
      <ul>
        <li><strong>Perfect (P)</strong> — unisons, 4ths, 5ths, and octaves in their natural major-scale form.</li>
        <li><strong>Major (M)</strong> — 2nds, 3rds, 6ths, and 7ths in their natural major-scale form.</li>
        <li><strong>Minor (m)</strong> — one half step smaller than major.</li>
        <li><strong>Augmented (A)</strong> — one half step larger than perfect or major.</li>
        <li><strong>Diminished (d)</strong> — one half step smaller than perfect or minor.</li>
      </ul>

      <IntervalGrid rootMidi={60} />

      <SpecificIntervalStaffExamples />

      <p>
        Learning to hear these intervals by ear is one of the most valuable skills in musicianship — it lets you
        transcribe melodies, tune chords, and sight-sing accurately.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonWritingIntervals({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Writing Intervals" footer={footer}>
      <p>
        To correctly spell (write) an interval above or below a given note, use this three-step process:
      </p>
      <h3>Step 1 — Find the generic letter</h3>
      <p>
        Count letter names from the starting note to reach the desired generic number. To write a 6th above D: D (1) –
        E (2) – F (3) – G (4) – A (5) – B (6). The target letter is <strong>B</strong>.
      </p>
      <h3>Step 2 — Determine the natural interval quality</h3>
      <p>
        Check how many half steps lie between the starting note and the natural (unmodified) target. D to B = 9 half
        steps = a major 6th. If the quality already matches what you want, you are done.
      </p>
      <h3>Step 3 — Adjust with accidentals</h3>
      <p>
        If you need a minor 6th (8 half steps) instead of major (9), lower B by one half step to B♭. If you needed an
        augmented 6th (10), raise B to B♯.
      </p>
      <p>
        This method works for any interval in any direction. Always start with the letter name, then adjust — never
        guess the accidental first.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonIntervalInversion({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Interval Inversion" footer={footer}>
      <p>
        <strong>Inverting</strong> an interval means moving the lower note up an octave (or the upper note down an
        octave) so the two notes swap their relative positions. The result is the <strong>complement</strong> of the
        original interval.
      </p>
      <h3>The rule of nine</h3>
      <p>
        The generic numbers of an interval and its inversion always add up to <strong>9</strong>:
      </p>
      <ul>
        <li>Unison (1) ↔ Octave (8)</li>
        <li>2nd ↔ 7th</li>
        <li>3rd ↔ 6th</li>
        <li>4th ↔ 5th</li>
      </ul>
      <h3>Quality flips</h3>
      <ul>
        <li>Major ↔ minor</li>
        <li>Augmented ↔ diminished</li>
        <li>Perfect stays perfect</li>
      </ul>
      <p>
        So a major 3rd inverts to a minor 6th; an augmented 4th inverts to a diminished 5th; a perfect 5th inverts to a
        perfect 4th. Inversion is a powerful thinking tool: if you know one interval well, you automatically know its
        complement.
      </p>

      <InversionStaffExamples />
    </LearnTheoryArticle>
  );
}

/* ═══════════════════════════════════════════════════════════
   CHORDS
   ═══════════════════════════════════════════════════════════ */

export function LessonIntroToChords({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Introduction to Chords" footer={footer}>
      <p>
        A <strong>chord</strong> is three or more notes sounding together. The simplest chords are{' '}
        <strong>triads</strong> — three notes stacked in thirds (every other letter name). The bottom note is the{' '}
        <strong>root</strong>, the middle note is the <strong>third</strong>, and the top note is the{' '}
        <strong>fifth</strong>.
      </p>
      <h3>Four types of triads</h3>
      <ul>
        <li>
          <strong>Major</strong> — major 3rd + minor 3rd (e.g., C–E–G). Sounds bright and stable.
        </li>
        <li>
          <strong>Minor</strong> — minor 3rd + major 3rd (e.g., C–E♭–G). Sounds darker, more somber.
        </li>
        <li>
          <strong>Diminished</strong> — minor 3rd + minor 3rd (e.g., C–E♭–G♭). Sounds tense and unstable.
        </li>
        <li>
          <strong>Augmented</strong> — major 3rd + major 3rd (e.g., C–E–G♯). Sounds unresolved and shimmering.
        </li>
      </ul>

      <ChordBank
        title="Hear the four triad types"
        chords={[
          { label: 'Major', midis: [60, 64, 67], desc: 'C–E–G' },
          { label: 'Minor', midis: [60, 63, 67], desc: 'C–E♭–G' },
          { label: 'Diminished', midis: [60, 63, 66], desc: 'C–E♭–G♭' },
          { label: 'Augmented', midis: [60, 64, 68], desc: 'C–E–G♯' },
        ]}
      />

      <ChordOnStaff
        title="Four triad types on the staff"
        chords={[
          { label: 'C Maj', midis: [60, 64, 67], notes: [{ position: -2 }, { position: 0 }, { position: 2 }] },
          { label: 'C min', midis: [60, 63, 67], notes: [{ position: -2 }, { position: 0, label: 'E♭' }, { position: 2 }] },
          { label: 'C dim', midis: [60, 63, 66], notes: [{ position: -2 }, { position: 0, label: 'E♭' }, { position: 2, label: 'G♭' }] },
          { label: 'C aug', midis: [60, 64, 68], notes: [{ position: -2 }, { position: 0 }, { position: 2, label: 'G♯' }] },
        ]}
      />

      <h3>Root position</h3>
      <p>
        When the root is the lowest-sounding note, the triad is in <strong>root position</strong>. This is the most basic
        and recognizable arrangement. Rearranging which note is on the bottom gives you <strong>inversions</strong>,
        covered in the next lesson.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonTriadInversion({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Triad Inversion" footer={footer}>
      <p>
        <strong>Inverting</strong> a triad means changing which note is in the bass (lowest position) while keeping the
        same three pitch classes. This changes the chord's "color" without changing its identity.
      </p>
      <h3>Three positions</h3>
      <ul>
        <li>
          <strong>Root position</strong> — the root is in the bass. A C major triad in root position: C–E–G.
        </li>
        <li>
          <strong>First inversion</strong> — the third is in the bass. C major first inversion: E–G–C.
        </li>
        <li>
          <strong>Second inversion</strong> — the fifth is in the bass. C major second inversion: G–C–E.
        </li>
      </ul>

      <ChordBank
        title="C major inversions"
        chords={[
          { label: 'Root', midis: [60, 64, 67], desc: 'C–E–G' },
          { label: '1st inv', midis: [64, 67, 72], desc: 'E–G–C' },
          { label: '2nd inv', midis: [55, 60, 64], desc: 'G–C–E' },
        ]}
      />

      <ChordOnStaff
        title="C major triad inversions on the staff"
        chords={[
          { label: 'Root (5/3)', midis: [60, 64, 67], notes: [{ position: -2 }, { position: 0 }, { position: 2 }] },
          { label: '1st inv (6)', midis: [64, 67, 72], notes: [{ position: 0 }, { position: 2 }, { position: 5 }] },
          { label: '2nd inv (6/4)', midis: [67, 72, 76], notes: [{ position: 2 }, { position: 5 }, { position: 7 }] },
        ]}
      />

      <h3>Figured bass notation</h3>
      <p>
        Inversions are labeled using numbers that describe the intervals above the bass note:
      </p>
      <ul>
        <li>Root position: <strong>5/3</strong> (often just left blank).</li>
        <li>First inversion: <strong>6/3</strong> (abbreviated to <strong>6</strong>).</li>
        <li>Second inversion: <strong>6/4</strong>.</li>
      </ul>
      <p>
        First inversion triads sound smoother and are excellent for creating stepwise bass lines. Second inversion triads
        are less stable and are typically used in specific contexts like cadential, pedal, or passing patterns.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonSeventhChords({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Seventh Chords" footer={footer}>
      <p>
        A <strong>seventh chord</strong> is a triad with an additional note stacked a third above the fifth, spanning a
        seventh from root to top. This extra note adds richness and tension. Five types are most common:
      </p>
      <ul>
        <li>
          <strong>Major seventh (Maj7)</strong> — major triad + major 7th. Warm, jazzy, dreamy (e.g., Cmaj7: C–E–G–B).
        </li>
        <li>
          <strong>Dominant seventh (7)</strong> — major triad + minor 7th. Tense, wants to resolve (e.g., G7: G–B–D–F).
        </li>
        <li>
          <strong>Minor seventh (m7)</strong> — minor triad + minor 7th. Mellow, smooth (e.g., Dm7: D–F–A–C).
        </li>
        <li>
          <strong>Half-diminished seventh (ø7)</strong> — diminished triad + minor 7th. Bittersweet, used in jazz
          ii-V-I progressions (e.g., Bø7: B–D–F–A).
        </li>
        <li>
          <strong>Fully diminished seventh (°7)</strong> — diminished triad + diminished 7th. Highly tense, symmetrical
          (e.g., B°7: B–D–F–A♭).
        </li>
      </ul>

      <ChordBank
        title="Hear the five seventh chord types"
        chords={[
          { label: 'Maj7', midis: [60, 64, 67, 71], desc: 'C–E–G–B' },
          { label: 'Dom7', midis: [60, 64, 67, 70], desc: 'C–E–G–B♭' },
          { label: 'Min7', midis: [60, 63, 67, 70], desc: 'C–E♭–G–B♭' },
          { label: 'Half-dim', midis: [60, 63, 66, 70], desc: 'C–E♭–G♭–B♭' },
          { label: 'Full-dim', midis: [60, 63, 66, 69], desc: 'C–E♭–G♭–A' },
        ]}
      />

      <ChordOnStaff
        title="Five seventh chord types on the staff"
        chords={[
          { label: 'Cmaj7', midis: [60, 64, 67, 71], notes: [{ position: -2 }, { position: 0 }, { position: 2 }, { position: 4 }] },
          { label: 'C7', midis: [60, 64, 67, 70], notes: [{ position: -2 }, { position: 0 }, { position: 2 }, { position: 4, label: 'B♭' }] },
          { label: 'Cm7', midis: [60, 63, 67, 70], notes: [{ position: -2 }, { position: 0, label: 'E♭' }, { position: 2 }, { position: 4, label: 'B♭' }] },
          { label: 'Cø7', midis: [60, 63, 66, 70], notes: [{ position: -2 }, { position: 0, label: 'E♭' }, { position: 2, label: 'G♭' }, { position: 4, label: 'B♭' }] },
          { label: 'C°7', midis: [60, 63, 66, 69], notes: [{ position: -2 }, { position: 0, label: 'E♭' }, { position: 2, label: 'G♭' }, { position: 3 }] },
        ]}
      />

      <p>
        The dominant seventh chord is the most important in tonal music—it almost always resolves to the tonic chord, and
        its tension-release pattern is the engine of Western harmony.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonMoreSeventhChords({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="More Seventh Chords" footer={footer}>
      <p>
        Beyond the five classical seventh chord types, three additional varieties are widely used in popular music and
        jazz:
      </p>
      <ul>
        <li>
          <strong>Minor-major seventh (mMaj7)</strong> — minor triad + major 7th (e.g., CmMaj7: C–E♭–G–B). Heard in
          James Bond-style suspense, or as a passing chord in minor-key progressions where the 7th degree rises
          chromatically.
        </li>
        <li>
          <strong>Augmented major seventh (augMaj7)</strong> — augmented triad + major 7th (e.g., Caug(Maj7): C–E–G♯–B).
          Rare and ethereal, used for color in jazz and film scoring.
        </li>
        <li>
          <strong>Dominant seventh with a suspended fourth (7sus4)</strong> — replaces the third of a dominant 7th with a
          perfect 4th (e.g., G7sus4: G–C–D–F). Creates anticipation by withholding the third; often resolves to a
          standard dominant 7th.
        </li>
      </ul>

      <ChordBank
        title="Hear these additional seventh chords"
        chords={[
          { label: 'mMaj7', midis: [60, 63, 67, 71], desc: 'C–E♭–G–B' },
          { label: 'augMaj7', midis: [60, 64, 68, 71], desc: 'C–E–G♯–B' },
          { label: '7sus4', midis: [55, 60, 62, 65], desc: 'G–C–D–F' },
        ]}
      />

      <ChordOnStaff
        title="Additional seventh chords on the staff"
        chords={[
          { label: 'CmMaj7', midis: [60, 63, 67, 71], notes: [{ position: -2 }, { position: 0, label: 'E♭' }, { position: 2 }, { position: 4 }] },
          { label: 'Caug(M7)', midis: [60, 64, 68, 71], notes: [{ position: -2 }, { position: 0 }, { position: 2, label: 'G♯' }, { position: 4 }] },
          { label: 'G7sus4', midis: [67, 72, 74, 77], notes: [{ position: 2 }, { position: 5 }, { position: 6 }, { position: 8 }] },
        ]}
      />

      <p>
        These chords expand the harmonic palette and are especially common in styles that prize smooth voice leading and
        colorful sonorities — jazz, bossa nova, R&B, and contemporary pop.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonSeventhChordInversion({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Seventh Chord Inversion" footer={footer}>
      <p>
        Like triads, seventh chords can be <strong>inverted</strong> by placing a note other than the root in the bass.
        Since a seventh chord has four notes, there are four possible positions:
      </p>
      <ul>
        <li>
          <strong>Root position (7)</strong> — root in the bass. Figured bass: <strong>7</strong> (or 7/5/3).
        </li>
        <li>
          <strong>First inversion (6/5)</strong> — the third in the bass.
        </li>
        <li>
          <strong>Second inversion (4/3)</strong> — the fifth in the bass.
        </li>
        <li>
          <strong>Third inversion (4/2 or just "2")</strong> — the seventh in the bass.
        </li>
      </ul>

      <ChordBank
        title="G7 inversions"
        chords={[
          { label: 'Root', midis: [55, 59, 62, 65], desc: 'G–B–D–F' },
          { label: '1st inv', midis: [59, 62, 65, 67], desc: 'B–D–F–G' },
          { label: '2nd inv', midis: [50, 53, 55, 59], desc: 'D–F–G–B' },
          { label: '3rd inv', midis: [53, 55, 59, 62], desc: 'F–G–B–D' },
        ]}
      />

      <ChordOnStaff
        title="G7 inversions on the staff"
        chords={[
          { label: 'Root (7)', midis: [67, 71, 74, 77], notes: [{ position: 2 }, { position: 4 }, { position: 6 }, { position: 8 }] },
          { label: '1st (6/5)', midis: [71, 74, 77, 79], notes: [{ position: 4 }, { position: 6 }, { position: 8 }, { position: 9 }] },
          { label: '2nd (4/3)', midis: [62, 65, 67, 71], notes: [{ position: -1 }, { position: 1 }, { position: 2 }, { position: 4 }] },
          { label: '3rd (4/2)', midis: [65, 67, 71, 74], notes: [{ position: 1 }, { position: 2 }, { position: 4 }, { position: 6 }] },
        ]}
      />

      <h3>Why seventh-chord inversions matter</h3>
      <p>
        Inversions allow <strong>smooth bass lines</strong>. Instead of the bass leaping from root to root, a composer
        can use inversions so the bass moves stepwise or by small intervals. The third inversion (with the 7th in the
        bass) is particularly useful because it naturally resolves downward by step into the next chord.
      </p>
    </LearnTheoryArticle>
  );
}

/* ═══════════════════════════════════════════════════════════
   DIATONIC CHORDS
   ═══════════════════════════════════════════════════════════ */

export function LessonDiatonicTriads({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Diatonic Triads" footer={footer}>
      <p>
        <strong>Diatonic triads</strong> are chords built using only the notes of a given scale — no accidentals beyond
        the key signature. Stack every other note of the scale (root-third-fifth) starting from each degree, and you get
        seven triads:
      </p>
      <h3>In a major key</h3>
      <ul>
        <li>I — Major</li>
        <li>ii — minor</li>
        <li>iii — minor</li>
        <li>IV — Major</li>
        <li>V — Major</li>
        <li>vi — minor</li>
        <li>vii° — diminished</li>
      </ul>

      <ChordBank
        title="Diatonic triads in C major"
        chords={[
          { label: 'I  (C)', midis: [60, 64, 67] },
          { label: 'ii (Dm)', midis: [62, 65, 69] },
          { label: 'iii (Em)', midis: [64, 67, 71] },
          { label: 'IV (F)', midis: [65, 69, 72] },
          { label: 'V  (G)', midis: [67, 71, 74] },
          { label: 'vi (Am)', midis: [69, 72, 76] },
          { label: 'vii° (B°)', midis: [71, 74, 77] },
        ]}
      />

      <ChordOnStaff
        title="Diatonic triads in C major on the staff"
        chords={[
          { label: 'I', midis: [60, 64, 67], notes: [{ position: -2 }, { position: 0 }, { position: 2 }] },
          { label: 'ii', midis: [62, 65, 69], notes: [{ position: -1 }, { position: 1 }, { position: 3 }] },
          { label: 'iii', midis: [64, 67, 71], notes: [{ position: 0 }, { position: 2 }, { position: 4 }] },
          { label: 'IV', midis: [65, 69, 72], notes: [{ position: 1 }, { position: 3 }, { position: 5 }] },
          { label: 'V', midis: [67, 71, 74], notes: [{ position: 2 }, { position: 4 }, { position: 6 }] },
          { label: 'vi', midis: [69, 72, 76], notes: [{ position: 3 }, { position: 5 }, { position: 7 }] },
          { label: 'vii°', midis: [71, 74, 77], notes: [{ position: 4 }, { position: 6 }, { position: 8 }] },
        ]}
      />

      <h3>In a natural minor key</h3>
      <ul>
        <li>i — minor</li>
        <li>ii° — diminished</li>
        <li>III — Major</li>
        <li>iv — minor</li>
        <li>v — minor</li>
        <li>VI — Major</li>
        <li>VII — Major</li>
      </ul>
      <p>
        The pattern of major, minor, and diminished triads is <em>always the same</em> for any major or minor key. This
        consistency is what makes transposition and analysis so systematic.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonRomanNumeralTriads({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Roman Numeral Analysis: Triads" footer={footer}>
      <p>
        <strong>Roman numeral analysis</strong> labels each diatonic chord by its scale degree and quality, making it
        easy to describe harmony in any key:
      </p>
      <ul>
        <li><strong>Uppercase</strong> Roman numerals (I, IV, V) indicate major triads.</li>
        <li><strong>Lowercase</strong> Roman numerals (ii, iii, vi) indicate minor triads.</li>
        <li>A <strong>°</strong> symbol after a lowercase numeral (vii°) indicates a diminished triad.</li>
        <li>A <strong>+</strong> after an uppercase numeral (III+) would indicate an augmented triad.</li>
      </ul>
      <h3>Why use Roman numerals?</h3>
      <p>
        Roman numerals abstract away the specific key so that patterns become portable. When someone says "I – IV – V –
        I", you know that pattern works in C major (C–F–G–C), in G major (G–C–D–G), or in any key at all. It is the
        universal language of chord progressions.
      </p>
      <h3>Relating to ear training</h3>
      <p>
        Trained musicians can <em>hear</em> Roman numerals. The IV chord "sounds like IV" regardless of key because its
        intervallic relationship to the tonic is always the same. This is why Roman numeral thinking and ear training
        reinforce each other.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonDiatonicSeventhChords({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Diatonic Seventh Chords" footer={footer}>
      <p>
        Extend each diatonic triad by adding one more third on top, and you get the <strong>diatonic seventh chords</strong>.
        In a major key the seven are:
      </p>
      <ul>
        <li>Imaj7 — Major seventh</li>
        <li>ii7 — Minor seventh</li>
        <li>iii7 — Minor seventh</li>
        <li>IVmaj7 — Major seventh</li>
        <li>V7 — Dominant seventh</li>
        <li>vi7 — Minor seventh</li>
        <li>viiø7 — Half-diminished seventh</li>
      </ul>

      <ChordBank
        title="Diatonic 7th chords in C major"
        chords={[
          { label: 'Imaj7', midis: [60, 64, 67, 71], desc: 'C' },
          { label: 'ii7', midis: [62, 65, 69, 72], desc: 'Dm' },
          { label: 'iii7', midis: [64, 67, 71, 74], desc: 'Em' },
          { label: 'IVmaj7', midis: [65, 69, 72, 76], desc: 'F' },
          { label: 'V7', midis: [55, 59, 62, 65], desc: 'G' },
          { label: 'vi7', midis: [57, 60, 64, 67], desc: 'Am' },
          { label: 'viiø7', midis: [59, 62, 65, 69], desc: 'B' },
        ]}
      />

      <ChordOnStaff
        title="Diatonic 7th chords in C major on the staff"
        chords={[
          { label: 'Imaj7', midis: [60, 64, 67, 71], notes: [{ position: -2 }, { position: 0 }, { position: 2 }, { position: 4 }] },
          { label: 'ii7', midis: [62, 65, 69, 72], notes: [{ position: -1 }, { position: 1 }, { position: 3 }, { position: 5 }] },
          { label: 'iii7', midis: [64, 67, 71, 74], notes: [{ position: 0 }, { position: 2 }, { position: 4 }, { position: 6 }] },
          { label: 'IVmaj7', midis: [65, 69, 72, 76], notes: [{ position: 1 }, { position: 3 }, { position: 5 }, { position: 7 }] },
          { label: 'V7', midis: [67, 71, 74, 77], notes: [{ position: 2 }, { position: 4 }, { position: 6 }, { position: 8 }] },
          { label: 'vi7', midis: [69, 72, 76, 79], notes: [{ position: 3 }, { position: 5 }, { position: 7 }, { position: 9 }] },
          { label: 'viiø7', midis: [71, 74, 77, 81], notes: [{ position: 4 }, { position: 6 }, { position: 8 }, { position: 10 }] },
        ]}
      />

      <h3>In a natural minor key</h3>
      <ul>
        <li>i7 — Minor seventh</li>
        <li>iiø7 — Half-diminished seventh</li>
        <li>IIImaj7 — Major seventh</li>
        <li>iv7 — Minor seventh</li>
        <li>v7 — Minor seventh</li>
        <li>VImaj7 — Major seventh</li>
        <li>VII7 — Dominant seventh</li>
      </ul>
      <p>
        Notice that only <strong>one</strong> chord in a major key is a dominant seventh (V7), which is why V7 has such a
        powerful pull toward I. Seventh chords add depth and voice-leading possibilities beyond what triads alone can
        provide.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonRomanNumeralSeventhChords({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Roman Numeral Analysis: Seventh Chords" footer={footer}>
      <p>
        Roman numeral labels for seventh chords extend the triad system with a <strong>7</strong> and a quality
        indicator:
      </p>
      <ul>
        <li><strong>Imaj7</strong> — uppercase numeral with "maj7" for a major seventh chord.</li>
        <li><strong>ii7</strong> — lowercase numeral with "7" for a minor seventh chord.</li>
        <li><strong>V7</strong> — uppercase numeral with "7" for a dominant seventh chord.</li>
        <li><strong>viiø7</strong> — lowercase with "ø7" for a half-diminished seventh.</li>
        <li><strong>vii°7</strong> — lowercase with "°7" for a fully diminished seventh (seen in minor keys using the raised 7th).</li>
      </ul>
      <h3>Inversions in Roman numeral analysis</h3>
      <p>
        Figured bass numbers are added after the Roman numeral to show inversion:{' '}
        <strong>V<sup>6</sup><sub>5</sub></strong> means V7 in first inversion,{' '}
        <strong>V<sup>4</sup><sub>3</sub></strong> means second inversion, and{' '}
        <strong>V<sup>4</sup><sub>2</sub></strong> means third inversion.
      </p>
      <p>
        This compact notation lets an analyst describe any chord in any key and any inversion in just a few characters —
        a remarkable feat of musical shorthand.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonComposingWithMinorScales({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Composing with Minor Scales" footer={footer}>
      <p>
        In practice, composers rarely stick to just one form of the minor scale. Instead, they freely combine the{' '}
        <strong>natural</strong> and <strong>harmonic</strong> minor to get the best of both:
      </p>
      <h3>Natural minor advantages</h3>
      <p>
        The natural minor (with a lowered 7th degree) gives smooth, conjunct melodies and avoids the awkward augmented
        second between scale degrees 6 and 7. The minor v chord (v, not V) and the VII chord are diatonic to natural
        minor.
      </p>
      <h3>Harmonic minor advantages</h3>
      <p>
        Raising the 7th degree creates a <strong>leading tone</strong> that resolves powerfully up to the tonic. This
        gives you the crucial <strong>V (major)</strong> and <strong>vii° (diminished)</strong> chords that natural minor
        lacks. Almost all cadences in minor keys use the raised 7th.
      </p>

      <ChordBank
        title="Chords unique to each minor form"
        chords={[
          { label: 'v (nat.)', midis: [64, 67, 71], desc: 'Em — natural minor' },
          { label: 'V (harm.)', midis: [64, 68, 71], desc: 'E — harmonic minor' },
          { label: 'VII (nat.)', midis: [67, 71, 74], desc: 'G — natural minor' },
          { label: 'vii° (harm.)', midis: [68, 71, 74], desc: 'G♯° — harmonic minor' },
        ]}
      />

      <h3>Mixing the two</h3>
      <p>
        A typical minor-key passage uses natural minor for stepwise melodic motion and harmonic minor for dominant-tonic
        cadences. The resulting chord vocabulary includes both v and V, both VII and vii° — more harmonic colors than
        either scale alone provides.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonVoicingChords({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Voicing Chords" footer={footer}>
      <p>
        A chord's <strong>voicing</strong> is the specific arrangement of its notes across registers and instruments.
        The same C major triad (C, E, G) can be voiced dozens of ways depending on octave placement, doublings, and
        spacing.
      </p>
      <h3>Close vs. open position</h3>
      <ul>
        <li>
          <strong>Close position</strong> — all notes within one octave, packed as tightly as possible. Compact and
          uniform sounding.
        </li>
        <li>
          <strong>Open position</strong> — notes spread across more than an octave. Richer, more spacious sound.
        </li>
      </ul>

      <ChordBank
        title="Close vs. open voicing"
        chords={[
          { label: 'Close', midis: [60, 64, 67], desc: 'C4–E4–G4' },
          { label: 'Open', midis: [48, 64, 67], desc: 'C3–E4–G4' },
          { label: 'Wide open', midis: [48, 55, 64, 72], desc: 'C3–G3–E4–C5' },
        ]}
      />

      <ChordOnStaff
        title="Close vs. open voicing on the staff"
        chords={[
          { label: 'Close', midis: [60, 64, 67], notes: [{ position: -2 }, { position: 0 }, { position: 2 }] },
          { label: 'Open', midis: [60, 67, 76], notes: [{ position: -2 }, { position: 2 }, { position: 7 }] },
          { label: 'Wide open', midis: [60, 76, 79], notes: [{ position: -2 }, { position: 7 }, { position: 9 }] },
        ]}
      />

      <h3>Doubling</h3>
      <p>
        In four-part writing (soprano, alto, tenor, bass), a triad has three notes but four voices, so one note must be{' '}
        <strong>doubled</strong>. The root is the most common doubling; doubling the leading tone is generally avoided
        because it is an active tone that wants to resolve.
      </p>
      <h3>Voice leading</h3>
      <p>
        Good voicing follows <strong>voice-leading</strong> principles: each voice moves to the nearest available note in
        the next chord, avoiding parallel fifths and octaves. Smooth voice leading makes chord progressions sound
        connected and natural rather than blocky.
      </p>
    </LearnTheoryArticle>
  );
}


/* ═══════════════════════════════════════════════════════════
   CHORD PROGRESSIONS
   ═══════════════════════════════════════════════════════════ */

export function LessonNonharmonicTones({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Nonharmonic Tones" footer={footer}>
      <p>
        <strong>Nonharmonic tones</strong> (also called non-chord tones) are notes that do not belong to the current
        chord but add melodic interest and motion. They are classified by how they are approached and left:
      </p>

      <h3>Passing tone</h3>
      <p>
        Approached and left by step in the same direction. Fills in the gap between two chord tones.
      </p>
      <StaffDiagram
        clef="treble"
        notes={[
          { position: -2, label: 'C', midi: 60 },
          { position: -1, label: 'D', color: '#ef4444', midi: 62 },
          { position: 0, label: 'E', midi: 64 },
        ]}
        caption="Passing tone — D fills the step between C and E"
      />

      <h3>Neighbor tone</h3>
      <p>
        Steps away from a chord tone and steps back to the same note. Creates a brief decoration.
      </p>
      <StaffDiagram
        clef="treble"
        notes={[
          { position: 0, label: 'E', midi: 64 },
          { position: 1, label: 'F', color: '#ef4444', midi: 65 },
          { position: 0, label: 'E', midi: 64 },
        ]}
        caption="Neighbor tone — F decorates E and returns"
      />

      <h3>Suspension</h3>
      <p>
        Held over from the previous chord, then resolves <strong>downward</strong> by step to a chord tone. Creates a
        characteristic dissonance-resolution effect.
      </p>
      <StaffDiagram
        clef="treble"
        notes={[
          { position: 0, label: 'E', midi: 64 },
          { position: 1, label: 'F', color: '#ef4444', midi: 65 },
          { position: 0, label: 'E', midi: 64 },
        ]}
        caption="Suspension — F is held from the previous chord, resolves down to E"
      />

      <h3>Retardation</h3>
      <p>
        Like a suspension but resolves <strong>upward</strong> by step.
      </p>
      <StaffDiagram
        clef="treble"
        notes={[
          { position: 2, label: 'G', midi: 67 },
          { position: 4, label: 'B', color: '#ef4444', midi: 71 },
          { position: 5, label: 'C', midi: 72 },
        ]}
        caption="Retardation — B is held over, resolves up to C"
      />

      <h3>Appoggiatura</h3>
      <p>
        Approached by <strong>leap</strong>, resolved by <strong>step</strong>. An accented dissonance on a strong beat.
      </p>
      <StaffDiagram
        clef="treble"
        notes={[
          { position: -2, label: 'C', midi: 60 },
          { position: 0, label: 'E', color: '#ef4444', midi: 64 },
          { position: -1, label: 'D', midi: 62 },
        ]}
        caption="Appoggiatura — E is approached by leap from C, resolves by step to D"
      />

      <h3>Escape tone</h3>
      <p>
        Approached by <strong>step</strong>, left by <strong>leap</strong> in the opposite direction.
      </p>
      <StaffDiagram
        clef="treble"
        notes={[
          { position: -1, label: 'D', midi: 62 },
          { position: 0, label: 'E', color: '#ef4444', midi: 64 },
          { position: -2, label: 'C', midi: 60 },
        ]}
        caption="Escape tone — E is approached by step from D, leaves by leap down to C"
      />

      <h3>Anticipation</h3>
      <p>
        A note that arrives <strong>early</strong>, belonging to the next chord rather than the current one.
      </p>
      <StaffDiagram
        clef="treble"
        notes={[
          { position: -1, label: 'D', midi: 62 },
          { position: -2, label: 'C', color: '#ef4444', midi: 60 },
          { position: -2, label: 'C', midi: 60 },
        ]}
        caption="Anticipation — C arrives early before the chord changes"
      />

      <h3>Pedal tone</h3>
      <p>
        A sustained or repeated note (usually in the bass) held through changing harmonies above.
      </p>
      <StaffDiagram
        clef="treble"
        notes={[
          { position: -2, label: 'C', midi: 60 },
          { position: -2, label: 'C', color: '#3b82f6', midi: 60 },
          { position: -2, label: 'C', color: '#3b82f6', midi: 60 },
          { position: -2, label: 'C', midi: 60 },
        ]}
        caption="Pedal tone — C stays constant while harmonies change above"
      />

      <p>
        Recognizing nonharmonic tones is essential for analysis — they explain the notes that "don't fit" a chord and
        reveal the composer's melodic craft.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonPhrasesAndCadences({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Phrases and Cadences" footer={footer}>
      <p>
        A <strong>phrase</strong> is a musical "sentence" — a coherent group of measures that leads to a momentary point
        of rest called a <strong>cadence</strong>. Phrases typically span 4 or 8 measures in common-practice music,
        though lengths vary.
      </p>
      <h3>Types of cadences</h3>
      <ul>
        <li>
          <strong>Authentic cadence (V → I)</strong> — the strongest sense of finality. When both chords are in root
          position and the melody ends on the tonic, it is a <strong>perfect authentic cadence (PAC)</strong>.
        </li>
        <li>
          <strong>Half cadence (→ V)</strong> — ends on the dominant, creating an open, unfinished feeling. Think of it
          as a musical comma rather than a period.
        </li>
        <li>
          <strong>Plagal cadence (IV → I)</strong> — the "Amen" cadence. Softer and less final than authentic.
        </li>
        <li>
          <strong>Deceptive cadence (V → vi)</strong> — the ear expects I but gets vi instead. A beautiful surprise that
          extends the music.
        </li>
      </ul>

      <ProgressionPlayer
        title="Hear each cadence type in C major"
        progressions={[
          { label: 'Authentic (V→I)', chords: [{ midis: [55, 59, 62], label: 'V' }, { midis: [60, 64, 67], label: 'I' }] },
          { label: 'Plagal (IV→I)', chords: [{ midis: [53, 57, 60], label: 'IV' }, { midis: [48, 52, 55], label: 'I' }] },
          { label: 'Deceptive (V→vi)', chords: [{ midis: [55, 59, 62], label: 'V' }, { midis: [57, 60, 64], label: 'vi' }] },
        ]}
      />

      <ChordOnStaff
        title="Cadence types on the staff (C major)"
        chords={[
          { label: 'V', midis: [67, 71, 74], notes: [{ position: 2 }, { position: 4 }, { position: 6 }] },
          { label: 'I', midis: [60, 64, 67], notes: [{ position: -2 }, { position: 0 }, { position: 2 }] },
          { label: 'IV', midis: [65, 69, 72], notes: [{ position: 1 }, { position: 3 }, { position: 5 }] },
          { label: 'I', midis: [60, 64, 67], notes: [{ position: -2 }, { position: 0 }, { position: 2 }] },
          { label: 'V', midis: [67, 71, 74], notes: [{ position: 2 }, { position: 4 }, { position: 6 }] },
          { label: 'vi', midis: [69, 72, 76], notes: [{ position: 3 }, { position: 5 }, { position: 7 }] },
        ]}
      />

      <p>
        Cadences are the punctuation of music. Learning to hear them lets you feel where phrases begin and end, which is
        crucial for phrasing, memorization, and expressive performance.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonCircleProgressions({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Circle Progressions" footer={footer}>
      <p>
        A <strong>circle progression</strong> is a chord sequence where each root moves down by a fifth (or equivalently,
        up by a fourth) to the next. This creates the strongest possible harmonic motion in tonal music.
      </p>
      <h3>The full diatonic circle</h3>
      <p>
        Starting from any degree in a major key and moving down by fifth through only diatonic chords gives a cycle that
        eventually passes through all seven chords:
      </p>
      <p>
        <strong>I – IV – vii° – iii – vi – ii – V – I</strong>
      </p>

      <ProgressionPlayer
        title="Circle segments in C major"
        progressions={[
          { label: 'vi–ii–V–I', chords: [
            { midis: [57, 60, 64], label: 'vi' }, { midis: [50, 53, 57], label: 'ii' },
            { midis: [55, 59, 62], label: 'V' }, { midis: [48, 52, 55], label: 'I' },
          ]},
          { label: 'ii–V–I', chords: [
            { midis: [50, 53, 57], label: 'ii' }, { midis: [55, 59, 62], label: 'V' },
            { midis: [48, 52, 55], label: 'I' },
          ]},
        ]}
      />

      <ChordOnStaff
        title="vi – ii – V – I circle progression on the staff"
        chords={[
          { label: 'vi', midis: [69, 72, 76], notes: [{ position: 3 }, { position: 5 }, { position: 7 }] },
          { label: 'ii', midis: [62, 65, 69], notes: [{ position: -1 }, { position: 1 }, { position: 3 }] },
          { label: 'V', midis: [67, 71, 74], notes: [{ position: 2 }, { position: 4 }, { position: 6 }] },
          { label: 'I', midis: [60, 64, 67], notes: [{ position: -2 }, { position: 0 }, { position: 2 }] },
        ]}
      />

      <h3>Why falling fifths are so strong</h3>
      <p>
        Root motion by fifth is the strongest harmonic connection because the two chords share one common tone (the root
        of the second chord is the fifth of the first). The descending-fifth motion also mirrors the overtone series,
        giving it a natural, gravitational quality that the ear finds deeply satisfying.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonCommonChordProgressions({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Common Chord Progressions" footer={footer}>
      <p>
        While there are countless possible chord progressions, certain patterns appear so frequently in Western music
        that they form a shared vocabulary:
      </p>
      <h3>The "functional flow"</h3>
      <p>
        Chords tend to follow a common pattern based on their harmonic function:
      </p>
      <p>
        <strong>Tonic (I, vi, iii) → Pre-dominant (IV, ii) → Dominant (V, vii°) → Tonic (I)</strong>
      </p>

      <ProgressionPlayer
        title="Famous chord progressions in C major"
        progressions={[
          { label: 'I–IV–V–I', chords: [
            { midis: [48, 52, 55], label: 'I' }, { midis: [53, 57, 60], label: 'IV' },
            { midis: [55, 59, 62], label: 'V' }, { midis: [48, 52, 55], label: 'I' },
          ]},
          { label: 'I–V–vi–IV (Pop)', chords: [
            { midis: [48, 52, 55], label: 'I' }, { midis: [55, 59, 62], label: 'V' },
            { midis: [57, 60, 64], label: 'vi' }, { midis: [53, 57, 60], label: 'IV' },
          ]},
          { label: 'ii–V–I (Jazz)', chords: [
            { midis: [50, 53, 57, 60], label: 'ii7' }, { midis: [55, 59, 62, 65], label: 'V7' },
            { midis: [48, 52, 55, 59], label: 'Imaj7' },
          ]},
          { label: 'I–vi–IV–V (50s)', chords: [
            { midis: [48, 52, 55], label: 'I' }, { midis: [57, 60, 64], label: 'vi' },
            { midis: [53, 57, 60], label: 'IV' }, { midis: [55, 59, 62], label: 'V' },
          ]},
        ]}
      />

      <ChordOnStaff
        title="I – V – vi – IV (the pop progression) on the staff"
        chords={[
          { label: 'I', midis: [60, 64, 67], notes: [{ position: -2 }, { position: 0 }, { position: 2 }] },
          { label: 'V', midis: [67, 71, 74], notes: [{ position: 2 }, { position: 4 }, { position: 6 }] },
          { label: 'vi', midis: [69, 72, 76], notes: [{ position: 3 }, { position: 5 }, { position: 7 }] },
          { label: 'IV', midis: [65, 69, 72], notes: [{ position: 1 }, { position: 3 }, { position: 5 }] },
        ]}
      />

      <ChordOnStaff
        title="ii7 – V7 – Imaj7 (jazz) on the staff"
        chords={[
          { label: 'ii7', midis: [62, 65, 69, 72], notes: [{ position: -1 }, { position: 1 }, { position: 3 }, { position: 5 }] },
          { label: 'V7', midis: [67, 71, 74, 77], notes: [{ position: 2 }, { position: 4 }, { position: 6 }, { position: 8 }] },
          { label: 'Imaj7', midis: [60, 64, 67, 71], notes: [{ position: -2 }, { position: 0 }, { position: 2 }, { position: 4 }] },
        ]}
      />

      <p>
        Recognizing these patterns by ear is one of the fastest ways to transcribe and understand the music you hear
        every day.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonTriadsFirstInversion({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Triads in First Inversion" footer={footer}>
      <p>
        <strong>First inversion triads</strong> (with the third in the bass) are the most commonly used inversions in
        tonal music. They serve several important roles in chord progressions:
      </p>
      <h3>Creating stepwise bass lines</h3>
      <p>
        Root-position chords often produce leaping bass lines. Substituting a first inversion allows the bass to move by
        step instead. For example, in C major: C (I) – D (ii<sup>6</sup>) – E (I<sup>6</sup>) creates a smooth ascending
        bass line that root-position chords alone cannot achieve.
      </p>
      <h3>Common uses</h3>
      <ul>
        <li>
          <strong>Passing chords</strong> — a first inversion chord placed between two root-position chords to fill a
          bass gap (e.g., I – V<sup>6</sup> – I<sup>6</sup>).
        </li>
        <li>
          <strong>Substitution for root position</strong> — any diatonic triad can appear in first inversion without
          changing its harmonic function. I<sup>6</sup> still functions as tonic.
        </li>
        <li>
          <strong>Bass arpeggiation</strong> — alternating between root position and first inversion within the same
          chord to create melodic bass movement.
        </li>
      </ul>
      <ChordOnStaff
        title="Stepwise bass with first inversions in C major"
        chords={[
          { label: 'I', midis: [60, 64, 67], notes: [{ position: -2 }, { position: 0 }, { position: 2 }] },
          { label: 'ii⁶', midis: [65, 69, 74], notes: [{ position: 1 }, { position: 3 }, { position: 6 }] },
          { label: 'I⁶', midis: [64, 67, 72], notes: [{ position: 0 }, { position: 2 }, { position: 5 }] },
          { label: 'IV', midis: [65, 69, 72], notes: [{ position: 1 }, { position: 3 }, { position: 5 }] },
          { label: 'V⁶', midis: [71, 74, 79], notes: [{ position: 4 }, { position: 6 }, { position: 9 }] },
          { label: 'I', midis: [60, 64, 67], notes: [{ position: -2 }, { position: 0 }, { position: 2 }] },
        ]}
      />

      <p>
        First inversions give composers a smoother, more connected sound while maintaining harmonic clarity.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonTriadsSecondInversion({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Triads in Second Inversion" footer={footer}>
      <p>
        <strong>Second inversion triads</strong> (with the fifth in the bass) are inherently less stable than root
        position or first inversion because the bass note forms a fourth with the root — an interval treated as a
        dissonance in common-practice harmony. As a result, second inversions appear in specific, well-defined contexts:
      </p>
      <h3>Three standard uses</h3>
      <ul>
        <li>
          <strong>Cadential 6/4</strong> — the most important use. A tonic triad in second inversion (I<sup>6/4</sup>)
          appears over the dominant bass note, resolving to V. The I<sup>6/4</sup> acts as an embellishment of V, not as
          a true tonic chord. This pattern is heard in nearly every classical cadence.
        </li>
        <li>
          <strong>Passing 6/4</strong> — connects two chords through a stepwise bass line. For example: I – V
          <sup>6/4</sup> – I<sup>6</sup>, where the bass moves down by step.
        </li>
        <li>
          <strong>Pedal (or neighbor) 6/4</strong> — the bass note stays the same while upper voices move away and
          return. For example: I – IV<sup>6/4</sup> – I, where the bass remains on the tonic.
        </li>
      </ul>
      <ChordOnStaff
        title="Cadential 6/4 → V → I"
        chords={[
          { label: 'I⁶⁄₄', midis: [67, 72, 76], notes: [{ position: 2 }, { position: 5 }, { position: 7 }] },
          { label: 'V', midis: [67, 71, 74], notes: [{ position: 2 }, { position: 4 }, { position: 6 }] },
          { label: 'I', midis: [60, 64, 67], notes: [{ position: -2 }, { position: 0 }, { position: 2 }] },
        ]}
      />

      <ChordOnStaff
        title="Pedal 6/4: I – IV⁶⁄₄ – I (bass stays on C)"
        chords={[
          { label: 'I', midis: [60, 64, 67], notes: [{ position: -2 }, { position: 0 }, { position: 2 }] },
          { label: 'IV⁶⁄₄', midis: [60, 65, 69], notes: [{ position: -2 }, { position: 1 }, { position: 3 }] },
          { label: 'I', midis: [60, 64, 67], notes: [{ position: -2 }, { position: 0 }, { position: 2 }] },
        ]}
      />

      <p>
        Unlike first inversions, second inversions should not be used freely. Each use has a specific voice-leading
        justification.
      </p>
    </LearnTheoryArticle>
  );
}

/* ═══════════════════════════════════════════════════════════
   NEAPOLITAN CHORDS
   ═══════════════════════════════════════════════════════════ */

export function LessonBuildingNeapolitan({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Building Neapolitan Chords" footer={footer}>
      <p>
        The <strong>Neapolitan chord</strong> (often labeled <strong>N</strong> or <strong>♭II</strong>) is a major triad
        built on the lowered second degree of the scale. In C minor or C major, the Neapolitan chord is{' '}
        <strong>D♭ major</strong> (D♭–F–A♭).
      </p>
      <h3>Construction</h3>
      <ul>
        <li>Take the second scale degree and lower it by a half step (D becomes D♭ in C).</li>
        <li>Build a <strong>major</strong> triad on that lowered note: D♭–F–A♭.</li>
        <li>The result is a major chord a half step above the tonic — hence "flat-two."</li>
      </ul>

      <ChordBank
        title="Compare the Neapolitan to nearby chords in C minor"
        chords={[
          { label: 'i (Cm)', midis: [60, 63, 67], desc: 'C–E♭–G' },
          { label: 'iv (Fm)', midis: [65, 68, 72], desc: 'F–A♭–C' },
          { label: 'N (D♭)', midis: [61, 65, 68], desc: 'D♭–F–A♭' },
          { label: 'V (G)', midis: [55, 59, 62], desc: 'G–B–D' },
        ]}
      />

      <ChordOnStaff
        title="Neapolitan and nearby chords in C minor"
        chords={[
          { label: 'i (Cm)', midis: [60, 63, 67], notes: [{ position: -2 }, { position: 0, label: 'E♭' }, { position: 2 }] },
          { label: 'iv (Fm)', midis: [65, 68, 72], notes: [{ position: 1 }, { position: 3, label: 'A♭' }, { position: 5 }] },
          { label: 'N (D♭)', midis: [61, 65, 68], notes: [{ position: -1, label: 'D♭' }, { position: 1 }, { position: 3, label: 'A♭' }] },
          { label: 'V (G)', midis: [67, 71, 74], notes: [{ position: 2 }, { position: 4 }, { position: 6 }] },
        ]}
      />

      <h3>Characteristics</h3>
      <p>
        The Neapolitan has a dark, dramatic, and slightly exotic sound. It is most commonly found in <strong>minor
        keys</strong> but occasionally appears in major keys for expressive effect. The chord shares two notes with the
        minor iv chord (F and A♭ in C minor), which is why it functions as an intensified pre-dominant.
      </p>
      <p>
        Named after the Neapolitan opera school of the 17th and 18th centuries, this chord became a standard expressive
        tool throughout the Classical and Romantic periods.
      </p>
    </LearnTheoryArticle>
  );
}

export function LessonUsingNeapolitan({ footer }: FooterProps) {
  return (
    <LearnTheoryArticle title="Using Neapolitan Chords" footer={footer}>
      <p>
        The Neapolitan chord almost always appears in <strong>first inversion</strong> (N<sup>6</sup> or
        ♭II<sup>6</sup>), which is why it is often simply called the "Neapolitan sixth." In first inversion, the
        fourth degree of the scale is in the bass, providing a smooth connection to the dominant.
      </p>
      <h3>Typical progression</h3>
      <p>
        The standard usage is: <strong>N<sup>6</sup> → V → i</strong>. In C minor: D♭/F → G → Cm. The bass moves F → G
        → C — a simple, strong ascending line. Sometimes a cadential I<sup>6/4</sup> is inserted:{' '}
        <strong>N<sup>6</sup> → i<sup>6/4</sup> → V → i</strong>.
      </p>

      <ProgressionPlayer
        title="Neapolitan cadence in C minor"
        progressions={[
          { label: 'N⁶ → V → i', chords: [
            { midis: [53, 61, 68], label: 'N⁶' },
            { midis: [55, 59, 62], label: 'V' },
            { midis: [48, 60, 63], label: 'i' },
          ]},
        ]}
      />

      <h3>Voice leading</h3>
      <ul>
        <li>
          The root of the Neapolitan (♭2̂) typically resolves <strong>down</strong> to the leading tone (7̂) when moving
          to V.
        </li>
        <li>
          This creates a striking chromatic descent: ♭2̂ → 7̂ → 1̂ (in C minor: D♭ → B♮ → C).
        </li>
      </ul>
      <h3>Emotional effect</h3>
      <p>
        The Neapolitan sixth adds gravity and pathos to cadences. Composers use it at moments of heightened drama — a
        key modulation, a climactic phrase, or a final cadence — where the ordinary iv → V → i feels too plain.
      </p>
    </LearnTheoryArticle>
  );
}

