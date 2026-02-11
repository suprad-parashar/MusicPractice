/**
 * Parse song notation string (e.g. "MPD>S>S>R>R>SDPMP") into swara tokens.
 * Format: S,R,G,M,P,D,N for swaras; ">" prefix = higher octave; ";" = rest.
 */
export function parseSongNotes(notesStr: string): string[] {
  const result: string[] = [];
  for (let i = 0; i < notesStr.length; i++) {
    const c = notesStr[i];
    if (c === '>') {
      if (i + 1 < notesStr.length && /[SRGMPDN]/i.test(notesStr[i + 1])) {
        result.push('>' + notesStr[i + 1].toUpperCase());
        i++;
      }
    } else if (c === ';') {
      result.push(';');
    } else if (/[SRGMPDN]/i.test(c)) {
      result.push(c.toUpperCase());
    }
  }
  return result;
}
