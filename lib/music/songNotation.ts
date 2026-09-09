/**
 * Parse song notation string (e.g. "MPD>S>S>R>R>SDPMP") into swara tokens.
 * Format: S,R,G,M,P,D,N for swaras; ">" / "<" = octave; letter case kept so `n` vs `N` can
 * mean different variants in ragas with two of the same letter (e.g. Kambhoji N2 vs N3); ";" = rest.
 */
export function parseSongNotes(notesStr: string): string[] {
  const result: string[] = [];
  for (let i = 0; i < notesStr.length; i++) {
    const c = notesStr[i];
    if (c === '>' || c === '<') {
      if (i + 1 < notesStr.length && /[SRGMPDN]/i.test(notesStr[i + 1])) {
        result.push(c + notesStr[i + 1]);
        i++;
      }
    } else if (c === ';') {
      result.push(';');
    } else if (/[SRGMPDN]/i.test(c)) {
      result.push(c);
    }
  }
  return result;
}
