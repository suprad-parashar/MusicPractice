/**
 * Thirds exercise: scale-wise thirds (Sa–Ga, Re–Ma, …) up to tāra ṣaḍjam, then the same backward.
 */

/** Visual wrap width in the warm-up UI (must match chunking in WarmUpExercises). */
export const THIRDS_NOTES_PER_ROW = 6;

export const THIRDS_ASC_NOTES = [
  'S',
  'G',
  'R',
  'M',
  'G',
  'P',
  'M',
  'D',
  'P',
  'N',
  'D',
  '>S',
] as const;

export const THIRDS_DESC_NOTES: string[] = [...THIRDS_ASC_NOTES].slice().reverse();
