/**
 * Rhythm training drills: 4/4 measures on a 16-sixteenth grid (4 beats × 4 sixteenths per beat).
 * Rests in patterns are limited to quarter and eighth rests only (no half / whole / sixteenth rests).
 */

export type RhythmLevel = 1 | 2 | 3 | 4 | 5;

export type RhythmKind =
  | 'half'
  | 'quarter'
  | 'eighthPair'
  | 'singleEighth'
  | 'sixteenthFour'
  | 'quarterRest'
  | 'eighthRest'
  | 'dottedQuarter'
  | 'eighthTriplet'
  | 'eighthSixteenthSixteenth'
  | 'sixteenthSixteenthEighth'
  | 'sixteenthEighthSixteenth'
  | 'dottedEighthSixteenth';

export type RhythmSegment = { kind: RhythmKind; span16: number };

export type RhythmRow = RhythmSegment[];

export type RhythmDrill = { rows: RhythmRow[]; id: string };

const BEATS_PER_ROW = 4;
const SIXTEENTHS_PER_BEAT = 4;
export const SIXTEENTHS_PER_ROW = BEATS_PER_ROW * SIXTEENTHS_PER_BEAT;

function seg(kind: RhythmKind, span16: number): RhythmSegment {
  return { kind, span16 };
}

/** Per-segment note onsets (sixteenth offsets from segment start). Rests → none. */
export function onsetsInSegment(kind: RhythmKind): number[] {
  switch (kind) {
    case 'half':
    case 'quarter':
    case 'dottedQuarter':
      return [0];
    case 'eighthTriplet':
      return [0, 4 / 3, 8 / 3];
    case 'eighthPair':
      return [0, 2];
    case 'singleEighth':
      return [0];
    case 'sixteenthFour':
      return [0, 1, 2, 3];
    case 'eighthSixteenthSixteenth':
      return [0, 2, 3];
    case 'sixteenthSixteenthEighth':
      return [0, 1, 2];
    case 'sixteenthEighthSixteenth':
      return [0, 1, 3];
    case 'dottedEighthSixteenth':
      return [0, 3];
    case 'quarterRest':
    case 'eighthRest':
      return [];
    default:
      return [0];
  }
}

/** All onsets in a row (sixteenth offsets from row start). */
export function rowOnsets(row: RhythmRow): number[] {
  let at = 0;
  const out: number[] = [];
  for (const s of row) {
    for (const o of onsetsInSegment(s.kind)) {
      out.push(at + o);
    }
    at += s.span16;
  }
  return out;
}

function sumSpan(row: RhythmRow): number {
  return row.reduce((a, s) => a + s.span16, 0);
}

function validateRow(row: RhythmRow): void {
  if (sumSpan(row) !== SIXTEENTHS_PER_ROW) {
    throw new Error(`Invalid row span: ${sumSpan(row)} (expected ${SIXTEENTHS_PER_ROW})`);
  }
}

function filterValid(rows: RhythmRow[]): RhythmRow[] {
  return rows.filter((r) => {
    try {
      validateRow(r);
      return true;
    } catch {
      return false;
    }
  });
}

function rowKinds(row: RhythmRow): Set<RhythmKind> {
  return new Set(row.map((s) => s.kind));
}

/** Level 2+: at least one row per drill must come from this pool (sixteenths and/or written rests). */
function rowHasLevel2Feature(row: RhythmRow): boolean {
  const k = rowKinds(row);
  return (
    k.has('sixteenthFour') ||
    k.has('quarterRest') ||
    k.has('eighthRest')
  );
}

function rowHasLevel3Feature(row: RhythmRow): boolean {
  const k = rowKinds(row);
  return k.has('dottedQuarter') || k.has('eighthTriplet');
}

/** Level 4 syncopation: a beat mixes eighth + sixteenth groupings. */
function rowHasLevel4Feature(row: RhythmRow): boolean {
  const k = rowKinds(row);
  return k.has('eighthSixteenthSixteenth') || k.has('sixteenthSixteenthEighth') || k.has('sixteenthEighthSixteenth');
}

function rowHasDottedEighthSixteenth(row: RhythmRow): boolean {
  return rowKinds(row).has('dottedEighthSixteenth');
}

function rowHasWrittenRest(row: RhythmRow): boolean {
  const k = rowKinds(row);
  return k.has('quarterRest') || k.has('eighthRest');
}

function featureSubpool(level: RhythmLevel, pool: RhythmRow[]): RhythmRow[] | null {
  switch (level) {
    case 1:
      return null;
    case 2:
      return pool.filter(rowHasLevel2Feature);
    case 3:
      return pool.filter(rowHasLevel3Feature);
    case 4:
      return pool.filter(rowHasLevel4Feature);
    case 5:
      return null;
    default:
      return null;
  }
}

// —— Level 1: half, quarter, eighth (pairs) ——
const L1: RhythmRow[] = [
  [seg('half', 8), seg('half', 8)],
  [seg('quarter', 4), seg('quarter', 4), seg('quarter', 4), seg('quarter', 4)],
  [seg('eighthPair', 4), seg('eighthPair', 4), seg('eighthPair', 4), seg('eighthPair', 4)],
  [seg('quarter', 4), seg('eighthPair', 4), seg('eighthPair', 4), seg('quarter', 4)],
  [seg('eighthPair', 4), seg('quarter', 4), seg('quarter', 4), seg('eighthPair', 4)],
  [seg('half', 8), seg('quarter', 4), seg('quarter', 4)],
  [seg('quarter', 4), seg('quarter', 4), seg('half', 8)],
  [seg('eighthPair', 4), seg('half', 8), seg('eighthPair', 4)],
  [seg('quarter', 4), seg('eighthPair', 4), seg('half', 8)],
  [seg('half', 8), seg('eighthPair', 4), seg('quarter', 4)],
];

// —— Level 2: L1 + sixteenths, quarter & eighth rests only ——
const L2: RhythmRow[] = [
  ...L1,
  [seg('sixteenthFour', 4), seg('quarter', 4), seg('quarter', 4), seg('quarter', 4)],
  [seg('quarter', 4), seg('sixteenthFour', 4), seg('eighthPair', 4), seg('quarter', 4)],
  [seg('eighthPair', 4), seg('sixteenthFour', 4), seg('eighthPair', 4), seg('quarter', 4)],
  [seg('quarterRest', 4), seg('quarter', 4), seg('quarter', 4), seg('quarter', 4)],
  [seg('quarter', 4), seg('quarterRest', 4), seg('eighthPair', 4), seg('eighthPair', 4)],
  [seg('quarterRest', 4), seg('quarterRest', 4), seg('quarter', 4), seg('quarter', 4)],
  [seg('quarter', 4), seg('quarter', 4), seg('quarterRest', 4), seg('quarterRest', 4)],
  // ½ + ½ + 1 + 2 beats — singleEighth must render with a flag, not like a quarter (same 16 sixteenths).
  [seg('eighthRest', 2), seg('singleEighth', 2), seg('eighthPair', 4), seg('half', 8)],
];

// —— Level 3: L2 + dotted quarter + eighth-note triplets ——
const L3: RhythmRow[] = [
  ...filterValid(L2),
  [seg('dottedQuarter', 6), seg('quarter', 4), seg('quarter', 4), seg('singleEighth', 2)],
  [seg('quarter', 4), seg('dottedQuarter', 6), seg('singleEighth', 2), seg('quarter', 4)],
  [seg('dottedQuarter', 6), seg('eighthPair', 4), seg('quarter', 4), seg('singleEighth', 2)],
  [seg('eighthPair', 4), seg('dottedQuarter', 6), seg('quarter', 4), seg('singleEighth', 2)],
  [seg('dottedQuarter', 6), seg('dottedQuarter', 6), seg('quarter', 4)],
  [seg('quarterRest', 4), seg('dottedQuarter', 6), seg('quarter', 4), seg('singleEighth', 2)],
  [seg('eighthTriplet', 4), seg('quarter', 4), seg('quarter', 4), seg('quarter', 4)],
  [seg('quarter', 4), seg('eighthTriplet', 4), seg('quarter', 4), seg('quarter', 4)],
  [seg('quarter', 4), seg('quarter', 4), seg('eighthTriplet', 4), seg('quarter', 4)],
  [seg('eighthTriplet', 4), seg('eighthPair', 4), seg('quarter', 4), seg('quarter', 4)],
  [seg('eighthPair', 4), seg('eighthTriplet', 4), seg('eighthPair', 4), seg('quarter', 4)],
  [seg('eighthTriplet', 4), seg('eighthTriplet', 4), seg('quarter', 4), seg('quarter', 4)],
  [seg('eighthTriplet', 4), seg('quarter', 4), seg('eighthTriplet', 4), seg('quarter', 4)],
  [seg('half', 8), seg('eighthTriplet', 4), seg('quarter', 4)],
];

// —— Level 4: mixed eighth & sixteenth in a beat (all 3 combos) ——
const L4: RhythmRow[] = [
  ...filterValid(L3),
  [seg('eighthSixteenthSixteenth', 4), seg('quarter', 4), seg('quarter', 4), seg('quarter', 4)],
  [seg('quarter', 4), seg('sixteenthSixteenthEighth', 4), seg('eighthPair', 4), seg('quarter', 4)],
  [seg('sixteenthEighthSixteenth', 4), seg('quarter', 4), seg('quarter', 4), seg('quarter', 4)],
  [seg('eighthPair', 4), seg('eighthSixteenthSixteenth', 4), seg('sixteenthFour', 4), seg('quarter', 4)],
  [seg('sixteenthFour', 4), seg('eighthSixteenthSixteenth', 4), seg('eighthPair', 4), seg('quarter', 4)],
  [seg('eighthSixteenthSixteenth', 4), seg('eighthSixteenthSixteenth', 4), seg('eighthPair', 4), seg('quarter', 4)],
  [seg('sixteenthSixteenthEighth', 4), seg('quarter', 4), seg('eighthSixteenthSixteenth', 4), seg('quarter', 4)],
  [seg('quarter', 4), seg('sixteenthEighthSixteenth', 4), seg('eighthPair', 4), seg('quarter', 4)],
  [seg('sixteenthEighthSixteenth', 4), seg('eighthPair', 4), seg('sixteenthSixteenthEighth', 4), seg('quarter', 4)],
  [seg('eighthSixteenthSixteenth', 4), seg('sixteenthEighthSixteenth', 4), seg('quarter', 4), seg('quarter', 4)],
  [seg('sixteenthSixteenthEighth', 4), seg('sixteenthEighthSixteenth', 4), seg('eighthPair', 4), seg('quarter', 4)],
  [seg('sixteenthEighthSixteenth', 4), seg('sixteenthEighthSixteenth', 4), seg('quarter', 4), seg('quarter', 4)],
];

// —— Level 5: dotted eighth + sixteenth figures; quarter & eighth rests only ——
const L5: RhythmRow[] = [
  ...filterValid(L4),
  [seg('dottedEighthSixteenth', 4), seg('quarter', 4), seg('quarter', 4), seg('quarter', 4)],
  [seg('quarter', 4), seg('dottedEighthSixteenth', 4), seg('eighthPair', 4), seg('quarter', 4)],
  [seg('quarter', 4), seg('eighthRest', 2), seg('singleEighth', 2), seg('dottedQuarter', 6), seg('singleEighth', 2)],
  [seg('dottedEighthSixteenth', 4), seg('eighthRest', 2), seg('singleEighth', 2), seg('half', 8)],
  [seg('eighthPair', 4), seg('dottedEighthSixteenth', 4), seg('dottedQuarter', 6), seg('singleEighth', 2)],
  [seg('eighthRest', 2), seg('singleEighth', 2), seg('dottedEighthSixteenth', 4), seg('quarter', 4), seg('quarter', 4)],
];

const POOLS: Record<RhythmLevel, RhythmRow[]> = {
  1: filterValid(L1),
  2: filterValid(L2),
  3: filterValid(L3),
  4: filterValid(L4),
  5: filterValid(L5),
};

for (const lv of [1, 2, 3, 4, 5] as const) {
  if (POOLS[lv].length === 0) {
    throw new Error(`Rhythm pool for level ${lv} is empty`);
  }
  for (const row of POOLS[lv]) {
    validateRow(row);
  }
}

for (const lv of [2, 3, 4] as const) {
  const sub = featureSubpool(lv, POOLS[lv]);
  if (!sub || sub.length === 0) {
    throw new Error(`Rhythm level ${lv} feature subpool is empty (cannot satisfy level description)`);
  }
}
{
  const p = POOLS[5];
  if (p.filter(rowHasDottedEighthSixteenth).length === 0 || p.filter(rowHasWrittenRest).length === 0) {
    throw new Error('Rhythm level 5 needs rows with dotted eighth-sixteenth figures and with rests');
  }
}

export const LEVEL_DESCRIPTIONS: Record<RhythmLevel, string> = {
  1: 'Half, quarter, and eighth notes',
  2: 'Level 1 + sixteenth notes and rests',
  3: 'Level 2 + dotted quarters and triplets',
  4: 'Level 3 + mixed eighth and sixteenth groupings',
  5: 'Level 4 + dotted eighth figures and rests',
};

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

/** Deterministic PRNG (Mulberry32). */
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cloneRow(row: RhythmRow): RhythmRow {
  return row.map((s) => ({ kind: s.kind, span16: s.span16 }));
}

/**
 * Each drill uses four bars. For level ≥ 2, one bar is always chosen from a
 * feature subpool so the drill actually includes that level’s new material
 * (e.g. L3 always has a dotted quarter somewhere).
 */
export function generateDrill(level: RhythmLevel, seed: number): RhythmDrill {
  const pool = POOLS[level];
  if (pool.length === 0) {
    return generateDrill(1, seed);
  }
  const rng = mulberry32(seed);
  const n = 4;

  if (level === 1) {
    const rows = Array.from({ length: n }, () => cloneRow(pick(pool, rng)));
    rows.forEach(validateRow);
    return { rows, id: `${level}-${seed}` };
  }

  if (level === 5) {
    const d8Pool = pool.filter(rowHasDottedEighthSixteenth);
    const restPool = pool.filter(rowHasWrittenRest);
    const idxRest = Math.floor(rng() * n);
    let idxD8 = Math.floor(rng() * n);
    while (idxD8 === idxRest) {
      idxD8 = Math.floor(rng() * n);
    }
    const rows: RhythmRow[] = [];
    for (let i = 0; i < n; i++) {
      if (i === idxRest) {
        rows.push(cloneRow(pick(restPool, rng)));
      } else if (i === idxD8) {
        rows.push(cloneRow(pick(d8Pool, rng)));
      } else {
        rows.push(cloneRow(pick(pool, rng)));
      }
    }
    rows.forEach(validateRow);
    return { rows, id: `${level}-${seed}` };
  }

  const featurePool = featureSubpool(level, pool)!;
  const featureIndex = Math.floor(rng() * n);
  const rows: RhythmRow[] = [];
  for (let i = 0; i < n; i++) {
    const source = i === featureIndex ? featurePool : pool;
    rows.push(cloneRow(pick(source, rng)));
  }
  rows.forEach(validateRow);
  return { rows, id: `${level}-${seed}` };
}

export function durationSecondsForRow(bpm: number): number {
  return (BEATS_PER_ROW * 60) / bpm;
}

export function sixteenthSeconds(bpm: number): number {
  return (60 / bpm) / SIXTEENTHS_PER_BEAT;
}
