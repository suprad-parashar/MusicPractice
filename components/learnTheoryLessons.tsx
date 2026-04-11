'use client';

import type { ReactNode } from 'react';
import { LearnTheoryArticle } from '@/components/LearnTheoryArticle';

type TheoryFooterProps = { footer?: ReactNode };

export function LearnTheoryIntroToMusic({ footer }: TheoryFooterProps = {}) {
  return (
    <LearnTheoryArticle title="Introduction to Music" footer={footer}>
      <p>
        Music, at its core, is <strong>organized sound in time</strong>. We care about how high or low a sound feels (
        <strong>pitch</strong>), how long events last (<strong>rhythm</strong> and <strong>meter</strong>), and how
        tones combine into memorable shapes (<strong>melody</strong> and <strong>harmony</strong>).
      </p>
      <p>
        This app focuses on <strong>listening and singing in tune</strong>—skills that support any tradition. You will
        use short exercises with clear feedback so your ear and voice learn the same “map” your brain already uses when
        you recognize a tune.
      </p>
      <h3>How this section is structured</h3>
      <p>
        We move from pure listening (the tritone game) to naming ideas (swara, the twelve chromatic steps), then to your
        personal range and key, simple Carnatic-style patterns (Sa Pa Sa), and finally a full scale in Mayamalavagowla
        before a short note on how to keep practicing.
      </p>
    </LearnTheoryArticle>
  );
}

export function LearnTheoryWhatIsSwara({ footer }: TheoryFooterProps = {}) {
  return (
    <LearnTheoryArticle title="What is a Swara or a Musical Note?" footer={footer}>
      <p>
        A <strong>musical note</strong> (Western usage) usually means a named pitch class—like “C” or “F♯”—together with
        the idea that doubling or halving frequency produces the <strong>same note in another octave</strong>.
      </p>
      <p>
        In Carnatic practice, a <strong>swara</strong> is a solfa syllable for a pitch within a rāga’s context:{' '}
        <strong>ṣaḍjam (Sa)</strong>, <strong>ṛṣabham (Ri)</strong>, <strong>gāndhāram (Ga)</strong>, and so on. The
        same letter can carry different <strong>variants</strong> (for example Ri₁ vs Ri₂), which is how one rāga’s
        “Ri” can differ from another’s even though we still call it Ri in that rāga.
      </p>
      <h3>What you will do in the exercises</h3>
      <p>
        The interactive lessons play a <strong>reference frequency</strong> for a swara in your chosen key. You sing
        back; the app compares your pitch to that goal (and, where noted, to the same swara <strong>an octave lower</strong>
        ), so you learn stable intonation, not letter names alone.
      </p>
    </LearnTheoryArticle>
  );
}

export function LearnTheoryTwelveNotes({ footer }: TheoryFooterProps = {}) {
  return (
    <LearnTheoryArticle title="Understanding the twelve notes of music and how they are related" footer={footer}>
      <p>
        In common twelve-tone equal temperament (12-TET), an <strong>octave</strong> is divided into twelve equally
        spaced steps called <strong>semitones</strong> (half steps). Moving up by one semitone multiplies frequency by
        the twelfth root of 2; twelve such steps double the frequency—one octave.
      </p>
      <h3>Whole steps and the chromatic collection</h3>
      <p>
        A <strong>whole step</strong> is two semitones. The piano’s white and black keys in an octave are twelve distinct
        pitch classes; <strong>chromatic</strong> means “by semitone,” visiting each of those steps in order.
      </p>
      <h3>How this relates to Indian solfa</h3>
      <p>
        Carnatic syllables (Sa, Ri, Ga, …) name <strong>scale degrees within a rāga</strong>, while the underlying
        tuning in this app follows 12-TET semitone positions for each variant (R₁, R₂, G₂, …). That keeps exercises
        consistent on digital instruments and still lets you hear classical <strong>interval patterns</strong> clearly.
      </p>
    </LearnTheoryArticle>
  );
}

export function LearnTheoryScalesAndRagas({ footer }: TheoryFooterProps = {}) {
  return (
    <LearnTheoryArticle title="Introduction to Scales and Ragas" footer={footer}>
      <p>
        In Western terms, a <strong>scale</strong> is an ordered set of pitch classes within an octave, often built
        from a tonic using a fixed pattern of whole and half steps (major, minor, etc.).
      </p>
      <p>
        A Carnatic <strong>rāga</strong> is richer than a scale on paper: it specifies which swaras appear, typical
        ascent and descent paths (<strong>arohaṇa</strong> / <strong>avarohaṇa</strong>), and—when you study deeply—
        characteristic phrases and ornamentation (<strong>gamaka</strong>). Still, the <strong>skeletal swara set</strong>{' '}
        of a rāga is a good first mental picture, and that is what the Mayamalavagowla exercise walks through.
      </p>
      <h3>Melakarta</h3>
      <p>
        <strong>Mayamalavagowla</strong> is the 15th <strong>melakarta</strong>—one of the 72 parent scales in the
        system—often used for beginners because it uses seven distinct swaras in ascent and descent with a stable,
        symmetrical shape. Once you can follow it by ear, other ragas become easier to map by comparison.
      </p>
    </LearnTheoryArticle>
  );
}

export function LearnTheoryHowToPractice({ footer }: TheoryFooterProps = {}) {
  return (
    <LearnTheoryArticle title="How to practice from here" footer={footer}>
      <p>
        Short, regular sessions beat rare long marathons. Even <strong>ten focused minutes</strong> with the mic, a few
        times a week, will sharpen pitch faster than occasional cramming.
      </p>
      <h3>A simple loop</h3>
      <ul>
        <li>Warm up with <strong>Range and Key</strong> when you change keys or after a break.</li>
        <li>Revisit <strong>Tritone Match</strong> or <strong>Sa Pa Sa</strong> for ear–voice coordination.</li>
        <li>Use the <strong>Mayamalavagowla scale</strong> lesson when you want a full ladder in one rāga skeleton.</li>
        <li>Explore <strong>Rāga</strong> and <strong>Varisai</strong> tools elsewhere in the app for repertoire and
          keyboard context.</li>
      </ul>
      <h3>Tone and posture</h3>
      <p>
        Keep vowels relaxed, breath steady, and the reference volume moderate. If the detector is unsure, move closer to
        the mic, reduce background noise, and favor a clear, sustained tone on held targets.
      </p>
    </LearnTheoryArticle>
  );
}
