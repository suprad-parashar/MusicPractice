/**
 * Display gate from [App.jsx visualize](https://github.com/christian-spooner/vocal-pitch-monitor/blob/master/src/components/App.jsx):
 * only commit a new displayed Hz when it is within `thresholdHz` of the running comparison value; large jumps update
 * the internal reference but do not refresh the UI until readings stabilize (reduces jitter).
 *
 * First valid sample after silence always displays (when `comparisonHz` is NaN).
 */
export function vpmDisplayFilterStep(
  rawHz: number,
  comparisonHz: number,
  thresholdHz: number
): { displayHz: number | null; nextComparisonHz: number } {
  if (!Number.isFinite(rawHz) || rawHz <= 0) {
    return { displayHz: null, nextComparisonHz: comparisonHz };
  }

  if (!Number.isFinite(comparisonHz)) {
    return { displayHz: rawHz, nextComparisonHz: rawHz };
  }

  if (Math.abs(rawHz - comparisonHz) < thresholdHz) {
    return { displayHz: rawHz, nextComparisonHz: rawHz };
  }

  return { displayHz: null, nextComparisonHz: rawHz };
}
