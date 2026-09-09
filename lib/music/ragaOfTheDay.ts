import { ALL_RAGAS, type Raga } from '@/data/ragas';

/** Local calendar date as YYYY-MM-DD (user's timezone). */
export function getLocalCalendarDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Milliseconds from `now` until the next local midnight. */
export function msUntilNextLocalMidnight(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

function hashStringToIndex(s: string, mod: number): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return mod > 0 ? Math.abs(h) % mod : 0;
}

/**
 * Deterministic raga for a calendar day: same date string → same raga for all users,
 * using the stable order of `ALL_RAGAS` from the catalog.
 */
export function getRagaOfTheDayForDate(dateKey: string): Raga {
  const n = ALL_RAGAS.length;
  const idx = hashStringToIndex(dateKey, n);
  return ALL_RAGAS[idx];
}
