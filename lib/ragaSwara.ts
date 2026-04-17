import type { Raga } from '@/data/ragas';
import { parseVarisaiNote } from '@/data/saraliVarisai';

/** Semitone offsets from Sa (same ordering as getSwarafrequency). */
const SWARA_SEMITONES: Record<string, number> = {
  S: 0,
  R1: 1,
  R2: 2,
  R3: 3,
  G1: 2,
  G2: 3,
  G3: 4,
  M1: 5,
  M2: 6,
  P: 7,
  D1: 8,
  D2: 9,
  D3: 10,
  N1: 9,
  N2: 10,
  N3: 11,
};

const DEFAULT_LETTER_SWARA: Record<string, string> = {
  S: 'S',
  R: 'R1',
  G: 'G3',
  M: 'M1',
  P: 'P',
  D: 'D1',
  N: 'N3',
};

const variantCache = new WeakMap<Raga, Map<string, string[]>>();

function buildLetterVariants(raga: Raga): Map<string, string[]> {
  const byLetter = new Map<string, Set<string>>();
  for (const note of [...raga.arohana, ...raga.avarohana]) {
    const { swara } = parseVarisaiNote(note);
    if (!swara) continue;
    const L0 = swara.charAt(0);
    if (!/[SRGMPDN]/i.test(L0)) continue;
    const L = L0.toUpperCase();
    if (!byLetter.has(L)) byLetter.set(L, new Set());
    byLetter.get(L)!.add(swara);
  }
  const out = new Map<string, string[]>();
  for (const [L, set] of byLetter) {
    const arr = [...set].sort((a, b) => (SWARA_SEMITONES[a] ?? 99) - (SWARA_SEMITONES[b] ?? 99));
    out.set(L, arr);
  }
  return out;
}

export function getRagaLetterVariants(raga: Raga): Map<string, string[]> {
  let m = variantCache.get(raga);
  if (!m) {
    m = buildLetterVariants(raga);
    variantCache.set(raga, m);
  }
  return m;
}

/**
 * Map a simple notation token (e.g. `N`, `n`, `>n`, `<N`) onto concrete swaras for the raga.
 * When the raga lists more than one variant for a letter (e.g. N2 and N3), lowercase selects
 * the lower variant and uppercase the higher. Single-variant letters ignore case.
 */
export function resolveSwaraTokenForRaga(swaraToken: string, raga: Raga | null): string {
  const parsed = parseVarisaiNote(swaraToken);
  const body = parsed.swara;
  if (!body) return swaraToken;
  const letterChar = body.charAt(0);
  if (!/[SRGMPDN]/i.test(letterChar)) {
    return swaraToken;
  }
  const key = letterChar.toUpperCase();
  const rest = body.slice(1);
  if (rest.length > 0) {
    return swaraToken;
  }

  let concrete: string;
  if (raga) {
    const variants = getRagaLetterVariants(raga).get(key) ?? [];
    if (variants.length === 0) {
      concrete = DEFAULT_LETTER_SWARA[key] ?? key;
    } else if (variants.length === 1) {
      concrete = variants[0]!;
    } else {
      const isUpper = letterChar === letterChar.toUpperCase() && letterChar !== letterChar.toLowerCase();
      const isLower = letterChar === letterChar.toLowerCase() && letterChar !== letterChar.toUpperCase();
      if (isLower) concrete = variants[0]!;
      else if (isUpper) concrete = variants[variants.length - 1]!;
      else concrete = variants[0]!;
    }
  } else {
    concrete = DEFAULT_LETTER_SWARA[key] ?? letterChar.toUpperCase();
  }

  if (parsed.octave === 'higher') return `>${concrete}`;
  if (parsed.octave === 'lower') return `<${concrete}`;
  return concrete;
}
