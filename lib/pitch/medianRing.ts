/** Fixed-size buffer for rolling median (reduces single-frame pitch spikes). */
export class MedianRing {
  private readonly buf: number[] = [];
  constructor(private readonly maxLen: number) {}

  push(v: number): number {
    this.buf.push(v);
    if (this.buf.length > this.maxLen) this.buf.shift();
    if (this.buf.length === 0) return v;
    const s = [...this.buf].sort((a, b) => a - b);
    const mid = Math.floor((s.length - 1) / 2);
    return s.length % 2 === 1 ? s[mid]! : (s[mid]! + s[mid + 1]!) / 2;
  }

  clear(): void {
    this.buf.length = 0;
  }
}
