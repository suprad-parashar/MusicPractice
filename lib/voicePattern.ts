import { parseVarisaiNote } from '@/data/saraliVarisai';

/** Ordered ladder from lowest to highest selectable swara (mandra through madhya panchama). */
export const VOICE_NOTE_LADDER = ['<D', '<N', 'S', 'R', 'G', 'M', 'P'] as const;

export type VoiceLowNote = (typeof VOICE_NOTE_LADDER)[0] | (typeof VOICE_NOTE_LADDER)[1] | (typeof VOICE_NOTE_LADDER)[2];
export type VoiceHighNote = (typeof VOICE_NOTE_LADDER)[4] | (typeof VOICE_NOTE_LADDER)[5] | (typeof VOICE_NOTE_LADDER)[6];

/**
 * One step “rising” along pitch: madhya ṇiṣāda goes to **tara ṣaḍjam** (`>S`), not back to madhya S.
 * Tara register continues `>S`→`>R`→…→`>N`, then `>N` resolves to madhya `S` (turnaround).
 */
export const VOICE_NEXT_RISE: Record<string, string> = {
  '<D': '<N',
  '<N': 'S',
  S: 'R',
  R: 'G',
  G: 'M',
  M: 'P',
  P: 'D',
  D: 'N',
  N: '>S',
  '>S': '>R',
  '>R': '>G',
  '>G': '>M',
  '>M': '>P',
  '>P': '>D',
  '>D': '>N',
  '>N': 'S',
};

export function voiceNotePool(low: VoiceLowNote, high: VoiceHighNote): string[] {
  const li = VOICE_NOTE_LADDER.indexOf(low);
  const hi = VOICE_NOTE_LADDER.indexOf(high);
  if (li < 0 || hi < 0 || li > hi) return [];
  return VOICE_NOTE_LADDER.slice(li, hi + 1) as string[];
}

export function maxPatternLengthForPool(pool: string[]): number {
  return 5 * pool.length;
}

/** Mulberry32 PRNG */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_RUN = 3;
const MAX_COUNT = 5;

/** Pool tokens sit on {@link VOICE_PITCH_LADDER} indices 0–6; max |Δindex| between two consecutive notes (e.g. S→P = 4 OK; <D→M = 5 not OK). */
const MAX_CONSECUTIVE_LADDER_SPAN = 4;

function poolTokenPitchIndex(t: string): number {
  return (VOICE_PITCH_LADDER as readonly string[]).indexOf(t);
}

/**
 * Generates a random sequence of note tokens with:
 * - at least one madhya **S** (ṣaḍjam)
 * - at most 3 consecutive identical notes
 * - at most 5 occurrences of any single note
 * - no two consecutive notes more than {@link MAX_CONSECUTIVE_LADDER_SPAN} apart on the pitch ladder (e.g. S→P allowed; <D→M not)
 */
export function generateVoicePatternTokens(
  pool: string[],
  n: number,
  rng: () => number
): string[] | null {
  if (pool.length === 0 || n < 1) return null;
  const poolWithS = pool.includes('S') ? pool : [...pool, 'S'];
  if (n > maxPatternLengthForPool(poolWithS)) return null;

  for (let attempt = 0; attempt < 8000; attempt++) {
    const counts: Record<string, number> = {};
    for (const p of poolWithS) counts[p] = 0;

    const out: string[] = [];
    let last: string | null = null;
    let run = 0;

    let ok = true;
    for (let i = 0; i < n; i++) {
      const candidates = poolWithS.filter((p) => {
        if ((counts[p] ?? 0) >= MAX_COUNT) return false;
        if (p === last && run >= MAX_RUN) return false;
        if (last !== null) {
          const a = poolTokenPitchIndex(p);
          const b = poolTokenPitchIndex(last);
          if (a < 0 || b < 0) return false;
          if (Math.abs(a - b) > MAX_CONSECUTIVE_LADDER_SPAN) return false;
        }
        return true;
      });
      if (candidates.length === 0) {
        ok = false;
        break;
      }
      const pick = candidates[Math.floor(rng() * candidates.length)];
      if (pick === last) run++;
      else run = 1;
      last = pick;
      out.push(pick);
      counts[pick] = (counts[pick] ?? 0) + 1;
    }
    if (ok && out.length === n && out.includes('S')) return out;
  }
  return null;
}

/** Rows of rising patterns until the last note is tāra ṣaḍjam (`>S`). Ascent stops there; descent uses this peak row. */
export function buildVoiceRisingRows(tokens: string[]): string[][] {
  if (tokens.length === 0) return [];
  const rows: string[][] = [[...tokens]];
  let current = [...tokens];
  const maxRows = 64;
  let guard = 0;
  while (current.length > 0 && current[current.length - 1] !== '>S' && guard < maxRows) {
    current = current.map((t) => VOICE_NEXT_RISE[t] ?? t);
    rows.push([...current]);
    guard++;
  }
  return rows;
}

/**
 * One step down in pitch (inverse of {@link VOICE_NEXT_RISE} on the scalar ladder).
 * Madhya ṣaḍjam steps down to madhya niṣāda; tāra ṣaḍjam steps down to madhya niṣāda.
 */
export const VOICE_STEP_DOWN: Record<string, string> = {
  '>R': '>S',
  '>G': '>R',
  '>M': '>G',
  '>P': '>M',
  '>D': '>P',
  '>N': '>D',
  '>S': 'N',
  N: 'D',
  D: 'P',
  P: 'M',
  M: 'G',
  G: 'R',
  R: 'S',
  /** Below madhya ṣaḍjam is mandra niṣāda (not madhya ni, which sits above Sa). */
  S: '<N',
  '<N': '<D',
  '<D': '<D',
};

export function stepVoiceDown(token: string): string {
  return VOICE_STEP_DOWN[token] ?? token;
}

/**
 * Strict pitch order from mandra ṣaḍjam through tāra niṣāda (no wrap to madhya S).
 * Index of madhya `S` is 2; index of tāra `>S` is 9.
 */
export const VOICE_PITCH_LADDER = [
  '<D',
  '<N',
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
  '>M',
  '>P',
  '>D',
  '>N',
] as const;

function canonicalVarisaiToken(t: string): string {
  const p = parseVarisaiNote(t);
  const L = p.swara;
  if (p.octave === 'lower') return `<${L}`;
  if (p.octave === 'higher') return `>${L}`;
  return L;
}

function ladderIndexOf(token: string): number {
  const c = canonicalVarisaiToken(token);
  const i = (VOICE_PITCH_LADDER as readonly string[]).indexOf(c);
  return i;
}

/** Steps from madhya ṣaḍjam on the ladder (S = 0, R = 1, …, N = 6 within madhya octave). Mandra/tāra use full ladder delta from `S`. */
export function seedRelativeDegreesFromMadhyaS(seedTokens: string[]): number[] {
  const iS = ladderIndexOf('S');
  return seedTokens.map((t) => ladderIndexOf(t) - iS);
}

/**
 * First descending row: always **starts** on tāra ṣaḍjam (`>S`). Each position i uses the same *shape* as the
 * seed relative to its **first** note: ladder index = `index(>S) + rel[0] - rel[i]`.
 * - SRGSR (rel 0,1,2,0,1) → `>SNDSN` (same as `index(>S) - rel[i]` when rel[0]=0).
 * - GSSS (rel 2,0,0,0) → `>S>G>G>G` (first column `>S`, rest follow the G–S–S–S contour in tāra).
 */
export function firstDescendingRowFromOffsets(seedTokens: string[]): string[] {
  const base = ladderIndexOf('>S');
  const rel = seedRelativeDegreesFromMadhyaS(seedTokens);
  const ladder = VOICE_PITCH_LADDER as readonly string[];
  const r0 = rel[0] ?? 0;
  return rel.map((ri) => {
    const idx = Math.max(0, Math.min(base + r0 - ri, ladder.length - 1));
    return ladder[idx]!;
  });
}

function lastCellIsMadhyaS(row: string[]): boolean {
  if (row.length === 0) return false;
  const p = parseVarisaiNote(row[row.length - 1]!);
  return p.swara === 'S' && p.octave === 'normal';
}

/**
 * Descending block (after ascent to `>S` on the last note):
 * 1. Seed → relative degrees from madhya S on {@link VOICE_PITCH_LADDER}.
 * 2. First row: tāra `>S` at index 0; position i = `ladder[index(>S) + rel[0] - rel[i]]` (forces first note `>S`, preserves contour vs first seed swara).
 * 3. Later rows: one {@link stepVoiceDown} per cell until the **last** note is madhya `S`.
 */
export function buildVoiceDescendingRows(seedTokens: string[]): string[][] {
  if (seedTokens.length === 0) return [];
  let current = firstDescendingRowFromOffsets(seedTokens);
  const rows: string[][] = [current];
  if (lastCellIsMadhyaS(current)) return rows;

  for (let guard = 0; guard < 64; guard++) {
    current = current.map(stepVoiceDown);
    rows.push(current);
    if (lastCellIsMadhyaS(current)) break;
  }
  return rows;
}

/**
 * Chooses a fixed group size 3, 4, or 5 from sequence length (prefer divisors, then sensible default).
 */
export function voicePatternGroupSize(n: number): 3 | 4 | 5 {
  if (n <= 0) return 4;
  if (n % 5 === 0) return 5;
  if (n % 4 === 0) return 4;
  if (n % 3 === 0) return 3;
  if (n <= 8) return 4;
  return 3;
}

export function chunkTokens<T>(arr: T[], size: number): T[][] {
  if (size < 1) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
