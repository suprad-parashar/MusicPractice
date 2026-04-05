/**
 * Fourths: scale-wise fourths as pairs (S–M, R–P, G–D, M–N, P–·S), then the flattened sequence reversed in pairs.
 */

const OCTAVE = ['S', 'R', 'G', 'M', 'P', 'D', 'N', '>S'] as const;

/** Ārōhaṇa: one pair per line, degrees i and i+3. */
export function fourthsAscLines(): string[][] {
  const lines: string[][] = [];
  for (let i = 0; i <= 4; i++) {
    lines.push([OCTAVE[i], OCTAVE[i + 3]]);
  }
  return lines;
}

/** Avarōhaṇa: reverse of the full ārohaṇa stream, chunked in twos (·S P, N M, …). */
export function fourthsDescLines(): string[][] {
  const flat = fourthsAscLines().flat();
  const rev = flat.slice().reverse();
  const lines: string[][] = [];
  for (let i = 0; i < rev.length; i += 2) {
    lines.push(rev.slice(i, i + 2));
  }
  return lines;
}
