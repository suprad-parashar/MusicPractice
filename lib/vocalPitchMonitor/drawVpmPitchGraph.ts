import { scaleLinear, scaleLog } from 'd3-scale';
import { line, curveMonotoneX } from 'd3-shape';
import { formatAxisLabel, type NoteFrequencyRow } from './noteFrequencyTable';

/** Same margins as [PitchGraph.jsx](https://github.com/christian-spooner/vocal-pitch-monitor/blob/master/src/components/PitchGraph.jsx) */
const margin = { top: 20, right: 50, bottom: 30, left: 52 };

const pitchTraceLine = line<{ x: number; y: number }>()
  .x((d) => d.x)
  .y((d) => d.y)
  .curve(curveMonotoneX);

export function drawVpmPitchGraph(
  ctx: CanvasRenderingContext2D,
  wCss: number,
  hCss: number,
  history: { t: number; hz: number }[],
  options: {
    noteRows: readonly NoteFrequencyRow[];
    nowSec: number;
    timeWindowSec: number;
    traceGapBreakSec: number;
    accidentals: 'sharp' | 'flat' | 'both';
    /** ±cents bands at every octave of this fundamental (pitch-class match visualization). */
    targetFundamentalHz: number | null;
    matchCents: number;
    /** If true, yellow band and dashed line only at `targetFundamentalHz` (not at every octave). */
    targetLiteralFrequencyOnly?: boolean;
    /**
     * When non-empty, draws match bands and guide lines only at these Hz (ignores octave-spread logic).
     * Overrides the usual `targetFundamentalHz` / `targetLiteralFrequencyOnly` band placement.
     */
    matchCenterFrequenciesHz?: number[];
  }
) {
  const {
    noteRows,
    nowSec,
    timeWindowSec,
    traceGapBreakSec,
    accidentals,
    targetFundamentalHz,
    matchCents,
    targetLiteralFrequencyOnly = false,
    matchCenterFrequenciesHz,
  } = options;

  const minFreq = noteRows[0]![1];
  const maxFreq = noteRows[noteRows.length - 1]![1];
  const frequencies = noteRows.map((r) => r[1]);

  ctx.clearRect(0, 0, wCss, hCss);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, wCss, hCss);

  const innerW = wCss - margin.left - margin.right;
  const innerH = hCss - margin.top - margin.bottom;

  const tEnd = nowSec;
  const tStart = tEnd - timeWindowSec;

  const xScale = scaleLinear().domain([tStart, tEnd]).range([0, innerW]);
  const yScale = scaleLog().domain([minFreq, maxFreq]).range([innerH, 0]);

  const xOf = (t: number) => margin.left + xScale(t);
  const yOf = (hz: number) => margin.top + yScale(hz);

  for (let i = 0; i < frequencies.length; i++) {
    const f = frequencies[i]!;
    const y = yOf(f);
    ctx.beginPath();
    ctx.strokeStyle = '#cccccc';
    ctx.globalAlpha = i % 2 === 0 ? 0.2 : 0.6;
    ctx.lineWidth = 1;
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + innerW, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const centsFactor = (c: number) => Math.pow(2, c / 1200);
  const drawMatchBandsAtCenters = (centers: readonly number[]) => {
    ctx.fillStyle = 'rgba(250, 204, 21, 0.12)';
    for (const center of centers) {
      if (!(center > 0) || !Number.isFinite(center)) continue;
      if (center < minFreq * 0.95 || center > maxFreq * 1.05) continue;
      const lo = center / centsFactor(matchCents);
      const hi = center * centsFactor(matchCents);
      const yTop = yOf(hi);
      const yBot = yOf(lo);
      const top = Math.min(yTop, yBot);
      const h = Math.max(1, Math.abs(yBot - yTop));
      ctx.fillRect(margin.left, top, innerW, h);
    }
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.55)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const center of centers) {
      if (!(center > 0) || !Number.isFinite(center)) continue;
      if (center < minFreq || center > maxFreq) continue;
      const y = yOf(center);
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + innerW, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  };

  if (matchCenterFrequenciesHz && matchCenterFrequenciesHz.length > 0) {
    drawMatchBandsAtCenters(matchCenterFrequenciesHz);
  } else if (targetFundamentalHz !== null && targetFundamentalHz > 0) {
    const octaveKs = targetLiteralFrequencyOnly ? [0] : Array.from({ length: 13 }, (_, i) => i - 6);
    const centers = octaveKs.map((k) => targetFundamentalHz * Math.pow(2, k));
    drawMatchBandsAtCenters(centers);
  }

  ctx.fillStyle = '#334155';
  ctx.font = '10px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Time →', margin.left + innerW * 0.88, hCss - 10);

  ctx.textAlign = 'right';
  ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#475569';
  for (let i = 0; i < noteRows.length; i++) {
    const f = noteRows[i]![1];
    const label = formatAxisLabel(noteRows[i]![0], accidentals);
    const y = yOf(f);
    ctx.fillText(label, margin.left - 6, y + 3);
  }

  if (history.length >= 1) {
    const visible = history.filter((p) => p.t >= tStart && p.hz > minFreq && p.hz < maxFreq);
    if (visible.length > 0) {
      const segments: { x: number; y: number }[][] = [];
      let cur: { x: number; y: number }[] = [];
      let lastT = -Infinity;
      for (const pt of visible) {
        const x = xOf(pt.t);
        const y = yOf(pt.hz);
        if (cur.length === 0) {
          cur.push({ x, y });
          lastT = pt.t;
          continue;
        }
        if (pt.t - lastT > traceGapBreakSec) {
          segments.push(cur);
          cur = [{ x, y }];
        } else {
          cur.push({ x, y });
        }
        lastT = pt.t;
      }
      if (cur.length) segments.push(cur);

      ctx.strokeStyle = 'green';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.fillStyle = 'green';
      for (const seg of segments) {
        if (seg.length === 1) {
          const p = seg[0]!;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const d = pitchTraceLine(seg);
          if (d) {
            ctx.beginPath();
            ctx.stroke(new Path2D(d));
          }
        }
      }
    }
  }

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, wCss - 1, hCss - 1);
}
