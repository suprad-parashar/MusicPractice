/**
 * Each of the six tritone pairs in 12-TET: (0,6), (1,7), … (5,11) as pitch classes mod 12.
 * Picks three **distinct** pairs, then one endpoint per pair and a singable MIDI (roughly C3–B4).
 */
export function pickThreeTritoneTargetHz(rng: () => number): number[] {
  const pairLowPitchClasses = [0, 1, 2, 3, 4, 5];
  for (let i = pairLowPitchClasses.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pairLowPitchClasses[i], pairLowPitchClasses[j]] = [pairLowPitchClasses[j]!, pairLowPitchClasses[i]!];
  }

  const hz: number[] = [];
  for (let i = 0; i < 3; i++) {
    const lowPc = pairLowPitchClasses[i]!;
    const pc = rng() < 0.5 ? lowPc : (lowPc + 6) % 12;
    const octaveLift = Math.floor(rng() * 2);
    const midi = 48 + pc + 12 * octaveLift;
    hz.push(440 * Math.pow(2, (midi - 69) / 12));
  }
  return hz;
}
