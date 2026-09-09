// Tanpura pattern types
export type TanpuraPatternId = 'p-hs-hs-s' | 's-p-hs' | 's-s-hs-hs' | 'm-hs-hs-s';

export interface TanpuraPattern {
  id: TanpuraPatternId;
  label: string; // Display label like "P >S >S S"
  ratios: number[]; // Pitch ratios for each string pluck
}

// Predefined tanpura patterns (ratios relative to kharaj / reference Śa = 1.0)
// P = 1.5 (pancham), M = 1.25 (śuddha madhyam 5/4), S = 1.0 (śadja), Ṡ = 2.0 (high śadja)
export const TANPURA_PATTERNS: TanpuraPattern[] = [
  { id: 'p-hs-hs-s', label: 'P Ṡ Ṡ S', ratios: [1.5, 2.0, 2.0, 1.0] },
  { id: 's-p-hs', label: 'S P Ṡ', ratios: [1.0, 1.5, 2.0] },
  { id: 's-s-hs-hs', label: 'S S Ṡ Ṡ', ratios: [1.0, 1.0, 2.0, 2.0] },
  /** M Ṡ Ṡ S (M >S >S Ś): śuddha madhyam + two taar śadja + mandra śadja — parallel to P Ṡ Ṡ S. */
  { id: 'm-hs-hs-s', label: 'M Ṡ Ṡ S', ratios: [1.25, 2.0, 2.0, 1.0] },
];

export const TANPURA_PATTERN_ORDER: TanpuraPatternId[] = TANPURA_PATTERNS.map((p) => p.id);

export type Octave = 'low' | 'medium' | 'high';

/**
 * Convert an octave label to its frequency multiplier.
 *
 * @returns The multiplier to apply to a base frequency: `0.5` for `'low'`, `1` for `'medium'`, `2` for `'high'`.
 */
export function getOctaveMultiplier(octave: Octave): number {
  switch (octave) {
    case 'low':
      return 0.5;
    case 'high':
      return 2;
    default:
      return 1; // medium
  }
}
