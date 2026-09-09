/**
 * One-pole low-pass on fundamental frequency (Hz) for a steadier trace / scoring input.
 * Reset on silence so a new phrase doesn’t slew from the old pitch.
 */
export class EmaPitchHz {
  private v: number | null = null;

  constructor(private readonly alpha: number) {}

  next(hz: number): number {
    if (this.v === null) {
      this.v = hz;
      return hz;
    }
    this.v = this.alpha * hz + (1 - this.alpha) * this.v;
    return this.v;
  }

  reset(): void {
    this.v = null;
  }
}
