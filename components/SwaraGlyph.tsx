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
