/**
 * Threes and fours: each line is three consecutive swaras, then four from the same starting degree.
 * Ārōhaṇa: up the scale from ṣaḍjam (S R G S R G M, …).
 * Avarōhaṇa: down from tāra ṣaḍjam (·S N D ·S N D P, N D P N D P M, …).
 */

/** Madhya ṣaḍjam through tāra ṣaḍjam (one octave of abstract letters). */
export const THREES_FOURS_ASC_SCALE = ['S', 'R', 'G', 'M', 'P', 'D', 'N', '>S'] as const;

/** Tāra ṣaḍjam down to madhya ṣaḍjam. */
export const THREES_FOURS_DESC_SCALE = ['>S', 'N', 'D', 'P', 'M', 'G', 'R', 'S'] as const;

function lineTripleQuad(scale: readonly string[], start: number): string[] {
  return [...scale.slice(start, start + 3), ...scale.slice(start, start + 4)];
}

/** One ārōhaṇa line from `start` (0 = ṣaḍjam). */
export function threesAndFoursLine(start: number): string[] {
  return lineTripleQuad(THREES_FOURS_ASC_SCALE, start);
}

/** One avarōhaṇa line from `start` (0 = tāra ṣaḍjam). */
export function threesAndFoursDescLine(start: number): string[] {
  return lineTripleQuad(THREES_FOURS_DESC_SCALE, start);
}

/** Ascending lines until the four-note group ends on tāra ṣaḍjam. */
export function threesAndFoursAscLines(): string[][] {
  const n = THREES_FOURS_ASC_SCALE.length;
  const lines: string[][] = [];
  for (let start = 0; start <= n - 4; start++) {
    lines.push(threesAndFoursLine(start));
  }
  return lines;
}

/** Descending lines from tāra ṣaḍjam until the four-note group ends on madhya ṣaḍjam. */
export function threesAndFoursDescLines(): string[][] {
  const n = THREES_FOURS_DESC_SCALE.length;
  const lines: string[][] = [];
  for (let start = 0; start <= n - 4; start++) {
    lines.push(threesAndFoursDescLine(start));
  }
  return lines;
}
