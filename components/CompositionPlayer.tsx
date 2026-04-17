'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  buildCompositionSubtabs,
  compositionToSongPerformance,
  compositionToSongCatalogOrder,
  formatCompositionArtistLine,
  formatTypeLabel,
  humanizeSectionTabLabel,
  sectionToChittaswaramModel,
  type Composition,
  type CompositionSubtab,
} from '@/data/compositions';
import SongPlayer from '@/components/SongPlayer';
import ChittaswaramPlayer from '@/components/ChittaswaramPlayer';
import type { InstrumentId } from '@/lib/instrumentLoader';
import type { NotationLanguage } from '@/lib/swaraNotation';

function subtabId(t: CompositionSubtab): string {
  if (t.kind === 'performance') return 'performance';
  if (t.kind === 'stanzas') return 'stanzas';
  return `chitta:${t.section.name}`;
}

function subtabLabel(t: CompositionSubtab): string {
  if (t.kind === 'performance') return 'Performance';
  if (t.kind === 'stanzas') return 'Stanzas';
  return humanizeSectionTabLabel(t.section.name);
}

type Props = {
  composition: Composition;
  baseFreq: number;
  instrumentId?: InstrumentId;
  volume?: number;
  notationLanguage?: NotationLanguage;
  onBack: () => void;
};

export default function CompositionPlayer({
  composition,
  baseFreq,
  instrumentId = 'violin',
  volume = 0.8,
  notationLanguage = 'english',
  onBack,
}: Props) {
  const subtabs = useMemo(() => buildCompositionSubtabs(composition), [composition]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (subtabs.length) setActiveId(subtabId(subtabs[0]));
  }, [composition.slug, subtabs]);

  const activeSubtab = subtabs.find((t) => subtabId(t) === activeId) ?? subtabs[0];

  const performanceSong = useMemo(
    () => compositionToSongPerformance(composition),
    [composition]
  );
  const catalogSong = useMemo(
    () => compositionToSongCatalogOrder(composition),
    [composition]
  );
  const artistLine = formatCompositionArtistLine(composition);

  return (
    <div className="w-full max-w-4xl mx-auto min-w-0 px-3 sm:px-4 md:px-0">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-[var(--accent)] transition-colors -ml-0.5 mb-2"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to compositions
          </button>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-slate-50 break-words">
            {composition.name}
          </h1>
          <p className="text-sm text-slate-400">
            <span className="inline-flex items-center rounded-md border border-slate-600/70 bg-slate-800/50 px-2 py-0.5 text-xs font-medium text-slate-300 mr-2">
              {formatTypeLabel(composition)}
            </span>
            {artistLine && <span>{artistLine}</span>}
            {composition.language && (
              <>
                <span className="text-slate-600 mx-1.5" aria-hidden>
                  ·
                </span>
                <span>{composition.language}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {subtabs.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-700/50 pb-px">
          {subtabs.map((t) => {
            const id = subtabId(t);
            const active = activeId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveId(id)}
                className={`
                  shrink-0 rounded-t-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors
                  ${active
                    ? 'border-b-2 border-accent text-accent bg-slate-900/30'
                    : 'text-slate-400 hover:text-slate-200'}
                `}
                aria-current={active ? 'page' : undefined}
              >
                {subtabLabel(t)}
              </button>
            );
          })}
        </div>
      )}

      <div className="min-w-0">
        {!activeSubtab ? null : activeSubtab.kind === 'performance' && performanceSong ? (
          <SongPlayer
            song={performanceSong}
            baseFreq={baseFreq}
            instrumentId={instrumentId}
            volume={volume}
            notationLanguage={notationLanguage}
          />
        ) : activeSubtab.kind === 'stanzas' && catalogSong ? (
          <SongPlayer
            song={catalogSong}
            baseFreq={baseFreq}
            instrumentId={instrumentId}
            volume={volume}
            notationLanguage={notationLanguage}
          />
        ) : activeSubtab.kind === 'chitta' ? (
          <ChittaswaramPlayer
            chittaswaram={sectionToChittaswaramModel(composition, activeSubtab.section)}
            baseFreq={baseFreq}
            instrumentId={instrumentId}
            volume={volume}
            notationLanguage={notationLanguage}
          />
        ) : null}
      </div>
    </div>
  );
}
