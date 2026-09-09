/**
 * Abstract varisai letters for one octave (middle Ṣaḍjam through Kakali Niṣāda).
 * Mapped to the selected raga’s arohana via VarisaiPlayer’s convertVarisaiNoteToRaga.
 */
const DEGREES = ['S', 'R', 'G', 'M', 'P', 'D', 'N', '>S'] as const;

/**
 * All two-note combinations in ascending order (lower swara first, then higher),
 * then the same pairs in reverse order with each pair played high-to-low (descending intervals).
 */
export function buildJumpingNotesLetterNotes(): string[] {
  const n = DEGREES.length;
  const pairs: [number, number][] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      pairs.push([i, j]);
    }
  }
  const reversePairs: [number, number][] = [];
  for (let i = n - 1; i >= 1; i--) {
    for (let j = i - 1; j >= 0; j--) {
      reversePairs.push([i, j]);
    }
  }
  const notes: string[] = [];
  for (const [i, j] of pairs) {
    notes.push(DEGREES[i], DEGREES[j]);
  }
  for (const [i, j] of reversePairs) {
    notes.push(DEGREES[i], DEGREES[j]);
  }
  return notes;
}
