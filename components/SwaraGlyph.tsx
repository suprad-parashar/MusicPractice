'use client';

import { getSwaraInScript, splitSwaraVariant, type NotationLanguage } from '@/lib/swaraNotation';

/**
 * Renders a swara with optional variant number as a subscript (e.g. R₁-style) for clearer typography.
 */
export function SwaraGlyph({
  swara,
  language,
  className,
}: {
  swara: string;
  language: NotationLanguage;
  className?: string;
}) {
  const { letter, variantDigits } = splitSwaraVariant(swara);
  const script = getSwaraInScript(letter, language);
  return (
    <span className={`inline-flex items-baseline ${className ?? ''}`}>
      <span>{script}</span>
      {variantDigits ? (
        <sub className="text-[0.62em] font-semibold leading-none ml-px translate-y-[0.05em]">{variantDigits}</sub>
      ) : null}
    </span>
  );
}

const NOTE_CHIP_DOT_TEXT: Record<'compact' | 'default' | 'comfortable', string> = {
  compact: 'text-[5px] sm:text-[6px]',
  default: 'text-[6px] sm:text-[7px]',
  comfortable: 'text-[7px] sm:text-[8px]',
};

/**
 * Swara is the only in-flow content (sizes the box), so the chip centers the note.
 * Octave dots are absolutely placed just above / below the glyph (same horizontal center).
 */
export function SwaraInNoteChip({
  swara,
  language,
  octave,
  density = 'default',
}: {
  swara: string;
  language: NotationLanguage;
  octave: 'higher' | 'lower' | 'normal';
  density?: 'compact' | 'default' | 'comfortable';
}) {
  const dotText = NOTE_CHIP_DOT_TEXT[density];
  const dotCls = `pointer-events-none absolute left-1/2 -translate-x-1/2 ${dotText} leading-none`;
  return (
    <span className="relative inline-flex max-w-full leading-none">
      <SwaraGlyph swara={swara} language={language} className="leading-none" />
      {octave === 'higher' && (
        <span className={`${dotCls} bottom-full mb-px`} aria-hidden>
          •
        </span>
      )}
      {octave === 'lower' && (
        <span className={`${dotCls} top-full mt-px`} aria-hidden>
          •
        </span>
      )}
    </span>
  );
}
