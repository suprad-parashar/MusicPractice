/**
 * Fifths: scale-wise fifths as pairs (S–P, R–D, G–N, M–·S), then the flattened sequence reversed in pairs.
 */

const OCTAVE = ['S', 'R', 'G', 'M', 'P', 'D', 'N', '>S'] as const;

/** Ārōhaṇa: one pair per line, degrees i and i+4. */
export function fifthsAscLines(): string[][] {
  const lines: string[][] = [];
  for (let i = 0; i <= 3; i++) {
    lines.push([OCTAVE[i], OCTAVE[i + 4]]);
  }
  return lines;
}

/** Avarōhaṇa: reverse of the full ārohaṇa stream, chunked in twos (·S M, N G, …). */
export function fifthsDescLines(): string[][] {
  const flat = fifthsAscLines().flat();
  const rev = flat.slice().reverse();
  const lines: string[][] = [];
  for (let i = 0; i < rev.length; i += 2) {
    lines.push(rev.slice(i, i + 2));
  }
  return lines;
}
