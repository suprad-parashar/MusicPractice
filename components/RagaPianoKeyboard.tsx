'use client';

import { useMemo } from 'react';
import type { Raga } from '@/data/ragas';
import { parseVarisaiNote } from '@/data/saraliVarisai';
import type { NotationLanguage } from '@/lib/swaraNotation';
import {
  blackKeyStylePct,
  buildMidiToRagaNoteLabel,
  getRagaPianoRangeMidis,
  isBlackKeyMidi,
  ragaNoteToPianoKeyMidi,
} from '@/lib/ragaPianoKeyboard';
import { SwaraGlyph } from '@/components/SwaraGlyph';

const KEY_H = 128;

/**
 * Fixed range F#₃–G#₅; layout never moves. For practice keys G–B, labels and playback highlight
 * use the lower-octave key on the strip when it fits. Full width, no horizontal scroll.
 */
export default function RagaPianoKeyboard({
  baseFreq,
  raga,
  notationLanguage,
  activeNoteString,
  onMidiClick,
}: {
  baseFreq: number;
  raga: Raga;
  notationLanguage: NotationLanguage;
  /** Raw note token from playback (e.g. `>S`, `R1`); null when idle. */
  activeNoteString: string | null;
  onMidiClick: (midi: number) => void;
}) {
  const { startMidi, endMidi } = useMemo(() => getRagaPianoRangeMidis(), []);
  const labels = useMemo(
    () => buildMidiToRagaNoteLabel(baseFreq, raga),
    [baseFreq, raga.ragaId]
  );

  const activeMidi = useMemo(() => {
    if (!activeNoteString) return null;
    return ragaNoteToPianoKeyMidi(baseFreq, activeNoteString);
  }, [baseFreq, activeNoteString]);

  const whiteMidis: number[] = [];
  const blackMidis: number[] = [];
  for (let m = startMidi; m <= endMidi; m++) {
    if (isBlackKeyMidi(m)) blackMidis.push(m);
    else whiteMidis.push(m);
  }

  const whiteCount = whiteMidis.length;
  /** Range F#₃… starts on a black key; half-width spacer aligns G with real piano geometry. */
  const keyboardStartsWithBlackKey = isBlackKeyMidi(startMidi);

  return (
    <div className="mt-5 pt-5 border-t border-slate-700/35">
      <div className="text-center mb-3">
        <h3 className="text-slate-200 text-sm font-semibold tracking-tight">Piano keyboard</h3>
      </div>

      <div className="w-full min-w-0 pb-1 overflow-visible pl-1 pr-0.5">
        <div
          className="relative w-full max-w-full min-w-0 select-none overflow-visible"
          style={{ height: KEY_H }}
          role="group"
          aria-label="Piano keyboard; raga swaras labelled on matching keys"
        >
          <div className="flex h-full w-full min-w-0 items-stretch">
            {keyboardStartsWithBlackKey && whiteCount > 0 && (
              <div
                className="min-w-0 shrink-0"
                style={{ flex: '0.5 0 0%' }}
                aria-hidden
              />
            )}
            {whiteMidis.map((midi) => {
              const label = labels.get(midi);
              const parsed = label ? parseVarisaiNote(label) : null;
              const isActive = activeMidi === midi;
              return (
                <button
                  key={midi}
                  type="button"
                  onClick={() => onMidiClick(midi)}
                  className={`
                    p-0 m-0 appearance-none relative z-0 min-w-0 flex-1 flex flex-col justify-end items-center pb-1.5 box-border rounded-b-md border border-slate-600/90
                    cursor-pointer touch-manipulation
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
                    ${isActive ? 'bg-amber-400 border-amber-600 z-[1] shadow-md' : 'bg-gradient-to-b from-neutral-100 to-neutral-200 hover:from-white hover:to-neutral-100'}
                  `}
                  aria-label={label ? `Key ${midi}, ${label}` : `Key ${midi}`}
                >
                  {parsed && (
                    <span
                      className={`pointer-events-none text-[10px] sm:text-[11px] font-semibold leading-none mb-0.5 flex flex-col items-center gap-0 max-w-full truncate px-px ${isActive ? 'text-neutral-950' : 'text-slate-700'}`}
                    >
                      <span className="relative inline-flex flex-col items-center">
                        {parsed.octave === 'higher' && (
                          <span className="text-[8px] leading-none -mb-0.5 text-slate-600">•</span>
                        )}
                        <SwaraGlyph swara={parsed.swara} language={notationLanguage} />
                        {parsed.octave === 'lower' && (
                          <span className="text-[8px] leading-none -mt-0.5 text-slate-600">•</span>
                        )}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {blackMidis.map((midi) => {
            const label = labels.get(midi);
            const parsed = label ? parseVarisaiNote(label) : null;
            const isActive = activeMidi === midi;
            const belowWhite = midi - 1;
            let idx = whiteMidis.indexOf(belowWhite);
            if (idx === -1) {
              idx = -1;
              for (let i = 0; i < whiteMidis.length; i++) {
                if (whiteMidis[i] < midi) idx = i;
              }
            }
            const { leftPct, widthPct } =
              whiteCount > 0
                ? blackKeyStylePct(whiteCount, idx, keyboardStartsWithBlackKey)
                : { leftPct: 0, widthPct: 0 };
            return (
              <button
                key={midi}
                type="button"
                onClick={() => onMidiClick(midi)}
                className={`
                  p-0 m-0 appearance-none absolute top-0 z-20 rounded-b-[5px] border-x border-b border-black/90 box-border flex flex-col justify-end items-center pb-0.5
                  shadow-[0_3px_6px_rgba(0,0,0,0.45)]
                  cursor-pointer touch-manipulation
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900
                  ${isActive ? 'bg-amber-500 border-amber-800 shadow-lg' : 'bg-gradient-to-b from-neutral-800 via-neutral-950 to-black hover:from-neutral-700'}
                `}
                style={{
                  left: `${leftPct}%`,
                  transform: 'translateX(-50%)',
                  width: `${widthPct}%`,
                  height: '55%',
                }}
                aria-label={label ? `Key ${midi}, ${label}` : `Key ${midi}`}
              >
                {parsed && (
                  <span
                    className="pointer-events-none text-[8px] sm:text-[9px] font-semibold leading-none flex flex-col items-center gap-0 max-w-full truncate px-px text-white"
                  >
                    <span className="relative inline-flex flex-col items-center">
                      {parsed.octave === 'higher' && (
                        <span className="text-[7px] leading-none -mb-0.5 text-white/85">•</span>
                      )}
                      <SwaraGlyph swara={parsed.swara} language={notationLanguage} />
                      {parsed.octave === 'lower' && (
                        <span className="text-[7px] leading-none -mt-0.5 text-white/85">•</span>
                      )}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
