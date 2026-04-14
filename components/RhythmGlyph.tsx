'use client';

import type { RhythmKind } from '@/lib/rhythmTraining';

/** SMuFL (Bravura) — quarter & eighth rests */
const SMUFL_QUARTER_REST = 0xe4e5;
const SMUFL_EIGHTH_REST = 0xe4e6;

const STEM = 1.12;
const BEAM_THICK = 2.85;
const BEAM_GAP = 3.15;

function SmuflRest({ code }: { code: number }) {
  return (
    <span
      className="inline-flex items-center justify-center leading-none select-none"
      style={{
        fontFamily: '"Bravura", "Bravura Text", serif',
        fontSize: 'clamp(2rem, 5vw, 2.85rem)',
        color: 'currentColor',
      }}
      aria-hidden
    >
      {String.fromCodePoint(code)}
    </span>
  );
}

/** Filled notehead — classic engraved lean (~22°). */
function HeadBlack({ cx, cy }: { cx: number; cy: number }) {
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={7.15}
      ry={5.45}
      fill="currentColor"
      transform={`rotate(-22 ${cx} ${cy})`}
    />
  );
}

function HeadHalf({ cx, cy }: { cx: number; cy: number }) {
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={7.15}
      ry={5.45}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.28}
      transform={`rotate(-22 ${cx} ${cy})`}
    />
  );
}

/**
 * Engraved-style rhythm symbols for tile cells (no staff): tilted heads, thin stems, thick beamed groups.
 */
/** Horizontal bounds of drawn ink — tight viewBoxes so tiles center glyphs (wide cells + meet scaling). */
const VB_SINGLE = '8.35 0 15 56';
const VB_DOTTED_Q = '7.55 0 32.55 56';
const VB_EIGHTH_PAIR = '10.65 0 49.1 56';
const VB_SIXTEENTH_4 = '6.55 0 111.85 56';
const VB_TRIPLET_BEAM = '8.55 0 83.75 56';
const VB_EIGHTH_TRIPLET = '4 -18 92 74';
const VB_DOTTED_EIGHT_SIXTEENTH = '8.55 0 53.75 56';
/** Single eighth: same head+stem as quarter plus one flag — must not mirror `quarter` or measures look an eighth too long. */
const VB_SINGLE_EIGHTH = '8.35 0 22.25 56';

export default function RhythmGlyph({ kind, className = '' }: { kind: RhythmKind; className?: string }) {
  const c = 'currentColor';
  const svgProps = { className, fill: 'none' as const, 'aria-hidden': true as const, preserveAspectRatio: 'xMidYMid meet' as const };

  switch (kind) {
    case 'half':
      return (
        <svg {...svgProps} viewBox={VB_SINGLE}>
          <HeadHalf cx={16} cy={38} />
          <line x1="23.2" y1="38" x2="23.2" y2="7" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
        </svg>
      );
    case 'quarter':
      return (
        <svg {...svgProps} viewBox={VB_SINGLE}>
          <HeadBlack cx={16} cy={38} />
          <line x1="23.2" y1="38" x2="23.2" y2="7" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
        </svg>
      );
    case 'dottedQuarter':
      return (
        <svg {...svgProps} viewBox={VB_DOTTED_Q}>
          <HeadBlack cx={15} cy={38} />
          <line x1="22.2" y1="38" x2="22.2" y2="7" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
          <circle cx="38" cy="39" r="2" fill={c} />
        </svg>
      );
    case 'eighthTriplet':
      return (
        <svg {...svgProps} viewBox={VB_EIGHTH_TRIPLET}>
          <HeadBlack cx={16} cy={38} />
          <HeadBlack cx={50} cy={38} />
          <HeadBlack cx={84} cy={38} />
          <line x1="23.2" y1="38" x2="23.2" y2="8" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
          <line x1="57.2" y1="38" x2="57.2" y2="8" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
          <line x1="91.2" y1="38" x2="91.2" y2="8" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
          <rect x="23.2" y="5.5" width="68" height={BEAM_THICK} rx={0.35} fill={c} />
          {/* "3" bracket above the beam */}
          <line x1="24" y1="-7" x2="40" y2="-7" stroke={c} strokeWidth={1.1} />
          <line x1="24" y1="-7" x2="24" y2="-3" stroke={c} strokeWidth={1.1} />
          <text x="50.5" y="-4" textAnchor="middle" dominantBaseline="central" fill={c} fontSize="14" fontWeight="bold" fontFamily="sans-serif">3</text>
          <line x1="61" y1="-7" x2="90" y2="-7" stroke={c} strokeWidth={1.1} />
          <line x1="90" y1="-7" x2="90" y2="-3" stroke={c} strokeWidth={1.1} />
        </svg>
      );
    case 'eighthPair':
      return (
        <svg {...svgProps} viewBox={VB_EIGHTH_PAIR}>
          <HeadBlack cx={18} cy={38} />
          <HeadBlack cx={52} cy={38} />
          <line x1="25.2" y1="38" x2="25.2" y2="8" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
          <line x1="59.2" y1="38" x2="59.2" y2="8" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
          <rect x="25.2" y="5" width="34" height={BEAM_THICK} rx={0.35} fill={c} />
        </svg>
      );
    case 'singleEighth':
      return (
        <svg {...svgProps} viewBox={VB_SINGLE_EIGHTH}>
          <HeadBlack cx={16} cy={38} />
          <line x1="23.2" y1="38" x2="23.2" y2="7.5" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
          {/* One flag (stem-up): must differ from quarter — same span as eighth in a beamed pair (½ beat). */}
          <path
            d="M23.4 7.8 C30.5 9.2 31.5 18.5 24.8 27.2"
            fill="none"
            stroke={c}
            strokeWidth={2.65}
            strokeLinecap="round"
          />
        </svg>
      );
    case 'sixteenthFour':
      return (
        <svg {...svgProps} viewBox={VB_SIXTEENTH_4}>
          {[14, 46, 78, 110].map((cx) => (
            <HeadBlack key={cx} cx={cx} cy={38} />
          ))}
          {[21, 53, 85, 117].map((x) => (
            <line key={x} x1={x} y1="38" x2={x} y2="6.5" stroke={c} strokeWidth={STEM * 0.98} strokeLinecap="round" />
          ))}
          <rect x="21" y="4.5" width="96" height={BEAM_THICK} rx={0.35} fill={c} />
          <rect x="21" y={4.5 + BEAM_THICK + BEAM_GAP} width="96" height={BEAM_THICK} rx={0.35} fill={c} />
        </svg>
      );
    case 'eighthSixteenthSixteenth':
      return (
        <svg {...svgProps} viewBox={VB_TRIPLET_BEAM}>
          <HeadBlack cx={16} cy={38} />
          <HeadBlack cx={50} cy={38} />
          <HeadBlack cx={84} cy={38} />
          <line x1="23.2" y1="38" x2="23.2" y2="6.5" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
          <line x1="57.2" y1="38" x2="57.2" y2="6.5" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
          <line x1="91.2" y1="38" x2="91.2" y2="6.5" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
          {/* Primary beam spans all three */}
          <rect x="23.2" y="4.5" width="68" height={BEAM_THICK} rx={0.35} fill={c} />
          {/* Secondary beam only on the two sixteenths (notes 2 & 3) */}
          <rect x="57.2" y={4.5 + BEAM_THICK + BEAM_GAP} width="34" height={BEAM_THICK} rx={0.35} fill={c} />
        </svg>
      );
    case 'sixteenthSixteenthEighth':
      return (
        <svg {...svgProps} viewBox={VB_TRIPLET_BEAM}>
          <HeadBlack cx={16} cy={38} />
          <HeadBlack cx={50} cy={38} />
          <HeadBlack cx={84} cy={38} />
          <line x1="23.2" y1="38" x2="23.2" y2="6.5" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
          <line x1="57.2" y1="38" x2="57.2" y2="6.5" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
          <line x1="91.2" y1="38" x2="91.2" y2="6.5" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
          {/* Primary beam spans all three */}
          <rect x="23.2" y="4.5" width="68" height={BEAM_THICK} rx={0.35} fill={c} />
          {/* Secondary beam only on the two sixteenths (notes 1 & 2) */}
          <rect x="23.2" y={4.5 + BEAM_THICK + BEAM_GAP} width="34" height={BEAM_THICK} rx={0.35} fill={c} />
        </svg>
      );
    case 'sixteenthEighthSixteenth':
      return (
        <svg {...svgProps} viewBox={VB_TRIPLET_BEAM}>
          <HeadBlack cx={16} cy={38} />
          <HeadBlack cx={50} cy={38} />
          <HeadBlack cx={84} cy={38} />
          <line x1="23.2" y1="38" x2="23.2" y2="6.5" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
          <line x1="57.2" y1="38" x2="57.2" y2="6.5" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
          <line x1="91.2" y1="38" x2="91.2" y2="6.5" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
          {/* Primary beam spans all three */}
          <rect x="23.2" y="4.5" width="68" height={BEAM_THICK} rx={0.35} fill={c} />
          {/* Partial secondary beams: left on note 1, right on note 3 — middle (eighth) has none */}
          <rect x="23.2" y={4.5 + BEAM_THICK + BEAM_GAP} width="17" height={BEAM_THICK} rx={0.35} fill={c} />
          <rect x="74.2" y={4.5 + BEAM_THICK + BEAM_GAP} width="17" height={BEAM_THICK} rx={0.35} fill={c} />
        </svg>
      );
    case 'dottedEighthSixteenth':
      return (
        <svg {...svgProps} viewBox={VB_DOTTED_EIGHT_SIXTEENTH}>
          <HeadBlack cx={16} cy={38} />
          <HeadBlack cx={54} cy={38} />
          <line x1="23.2" y1="38" x2="23.2" y2="6.5" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
          <line x1="61.2" y1="38" x2="61.2" y2="6.5" stroke={c} strokeWidth={STEM} strokeLinecap="round" />
          <rect x="23.2" y="5" width="38" height={BEAM_THICK} rx={0.35} fill={c} />
          <circle cx="30" cy="42" r="1.85" fill={c} />
        </svg>
      );
    case 'quarterRest':
      return (
        <span className={`inline-flex items-center justify-center ${className}`}>
          <SmuflRest code={SMUFL_QUARTER_REST} />
        </span>
      );
    case 'eighthRest':
      return (
        <span className={`inline-flex items-center justify-center ${className}`}>
          <SmuflRest code={SMUFL_EIGHTH_REST} />
        </span>
      );
    default:
      return null;
  }
}
