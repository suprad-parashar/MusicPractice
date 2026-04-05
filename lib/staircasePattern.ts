/**
 * Carnatic "staircase" warm-up: each line ascends to the next swara and returns to Ṣaḍjam.
 * Line 1: S — line 2: S R S — line 3: S R G R S — … through higher Ṣaḍjam.
 */

/** Varisai-style tokens (middle octave + one higher Ṣaḍjam). */
export const STAIR_VARISAI_TOKENS = ['S', 'R', 'G', 'M', 'P', 'D', 'N', '>S'] as const;

/**
 * One staircase line: 1-based line number (1 = S only, 2 = S R S, …).
 */
export function staircaseLineNotes(line: number): string[] {
  if (line < 1) return ['S'];
  if (line === 1) return ['S'];
  const peak = line - 1;
  if (peak >= STAIR_VARISAI_TOKENS.length) {
    return staircaseLineNotes(STAIR_VARISAI_TOKENS.length);
  }
  const out: string[] = [];
  for (let i = 0; i <= peak; i++) out.push(STAIR_VARISAI_TOKENS[i]);
  for (let i = peak - 1; i >= 0; i--) out.push(STAIR_VARISAI_TOKENS[i]);
  return out;
}

/** All lines from 1 through `maxLine` inclusive (capped to full scale). */
export function staircaseLines(maxLine: number): string[][] {
  const cap = Math.min(Math.max(maxLine, 1), STAIR_VARISAI_TOKENS.length);
  return Array.from({ length: cap }, (_, i) => staircaseLineNotes(i + 1));
}

/**
 * Descending staircase from tāra ṣaḍjam: each line reaches one step lower and returns to ·S.
 * Line 1: ·S — line 2: ·S N ·S — line 3: ·S N D N ·S — … down to madhya ṣaḍjam.
 */
export const DESC_STAIR_VARISAI_TOKENS = ['>S', 'N', 'D', 'P', 'M', 'G', 'R', 'S'] as const;

export function descendingStaircaseLineNotes(line: number): string[] {
  if (line < 1) return ['>S'];
  if (line === 1) return ['>S'];
  const peak = line - 1;
  if (peak >= DESC_STAIR_VARISAI_TOKENS.length) {
    return descendingStaircaseLineNotes(DESC_STAIR_VARISAI_TOKENS.length);
  }
  const out: string[] = [];
  for (let i = 0; i <= peak; i++) out.push(DESC_STAIR_VARISAI_TOKENS[i]);
  for (let i = peak - 1; i >= 0; i--) out.push(DESC_STAIR_VARISAI_TOKENS[i]);
  return out;
}

export function descendingStaircaseLines(maxLine: number): string[][] {
  const cap = Math.min(Math.max(maxLine, 1), DESC_STAIR_VARISAI_TOKENS.length);
  return Array.from({ length: cap }, (_, i) => descendingStaircaseLineNotes(i + 1));
}
