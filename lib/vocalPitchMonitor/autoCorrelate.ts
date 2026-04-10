/**
 * Autocorrelation pitch estimate — ported from
 * [vocal-pitch-monitor](https://github.com/christian-spooner/vocal-pitch-monitor/blob/master/src/utils/autoCorrelate.js)
 */

export function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  let sumOfSquares = 0;
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i]!;
    sumOfSquares += val * val;
  }
  const rootMeanSquare = Math.sqrt(sumOfSquares / SIZE);
  if (rootMeanSquare < 0.01) {
    return -1;
  }

  let r1 = 0;
  let r2 = SIZE - 1;
  const threshold = 0.2;

  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]!) < threshold) {
      r1 = i;
      break;
    }
  }

  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]!) < threshold) {
      r2 = SIZE - i;
      break;
    }
  }

  const trimmed = buffer.subarray(r1, r2);
  let n = trimmed.length;

  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n - i; j++) {
      sum += trimmed[j]! * trimmed[j + i]!;
    }
    c[i] = sum;
  }

  let d = 0;
  while (d < n - 1 && c[d]! > c[d + 1]!) {
    d++;
  }

  let maxValue = -1;
  let maxIndex = -1;
  for (let i = d; i < n; i++) {
    if (c[i]! > maxValue) {
      maxValue = c[i]!;
      maxIndex = i;
    }
  }

  let T0 = maxIndex;
  if (T0 <= 0 || T0 >= n - 1) {
    return -1;
  }

  const x1 = c[T0 - 1]!;
  const x2 = c[T0]!;
  const x3 = c[T0 + 1]!;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a !== 0) {
    T0 = T0 - b / (2 * a);
  }

  return sampleRate / T0;
}
