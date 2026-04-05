/**
 * Triad mirror: each line is three consecutive ārōhaṇa (or avarōhaṇa) swaras,
 * then the same three in reverse with the middle repeated at the join — e.g. S R G G R S.
 */

/** Madhya ṣaḍjam through tāra gāndhāra (inclusive). */
export const TRIAD_MIRROR_ASC_TOKENS = [
  'S',
  'R',
  'G',
  'M',
  'P',
  'D',
  'N',
  '>S',
  '>R',
  '>G',
] as const;

/** Tāra gāndhāra down through mandhra dhaivata (lower Ḍha), ·S then <Ni ·Dha. */
export const TRIAD_MIRROR_DESC_TOKENS = [
  '>G',
  '>R',
  '>S',
  'N',
  'D',
  'P',
  'M',
  'G',
  'R',
  'S',
  '<N',
  '<D',
] as const;

/** One line: indices `start`, `start+1`, `start+2` → a b c c b a. */
export function triadMirrorLineNotes(tokens: readonly string[], start: number): string[] {
  const n = tokens.length;
  if (start < 0 || start > n - 3) return [];
  const a = tokens[start];
  const b = tokens[start + 1];
  const c = tokens[start + 2];
  return [a, b, c, c, b, a];
}

/** Ascending through tāra gāndhāra (last line ·S ·R ·G ·G ·R ·S). */
export function triadMirrorLines(): string[][] {
  const n = TRIAD_MIRROR_ASC_TOKENS.length;
  return Array.from({ length: n - 2 }, (_, i) => triadMirrorLineNotes(TRIAD_MIRROR_ASC_TOKENS, i));
}

/** Descending from tāra gāndhāra (… down through G R S S R G, then into mandhra to S <N <D <D <N S). */
export function descendingTriadMirrorLines(): string[][] {
  const n = TRIAD_MIRROR_DESC_TOKENS.length;
  return Array.from({ length: n - 2 }, (_, i) => triadMirrorLineNotes(TRIAD_MIRROR_DESC_TOKENS, i));
}
