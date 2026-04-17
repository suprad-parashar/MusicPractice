'use client';

import { useMemo, useState } from 'react';
import { COMPOSITIONS } from '@/data/compositions';
import { getRagaByIdOrName } from '@/data/ragas';

/** @deprecated Prefer {@link CompositionsList}. Filtered list for chittaswaram-tagged pieces only. */
export default function ChittaswaramsList({ onSelect }: { onSelect: (slug: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');

  const sorted = useMemo(() => {
    const q = (t: string | undefined) => (t ?? '').toLowerCase();
    return [...COMPOSITIONS]
      .filter(
        (c) =>
          q(c.type).includes('chittaswaram') ||
          q(c.tag).includes('chitta')
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return sorted.filter((c) => {
      const ragaName = c.raga_id ? getRagaByIdOrName(c.raga_id)?.name ?? '' : '';
      return (
        c.name.toLowerCase().includes(q) ||
        c.composer.toLowerCase().includes(q) ||
        ragaName.toLowerCase().includes(q) ||
        (c.tala ?? '').toLowerCase().includes(q)
      );
    });
  }, [sorted, searchQuery]);

  return (
    <div className="w-full max-w-4xl mx-auto min-w-0 px-3 sm:px-4 md:px-6">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-10 shadow-2xl border border-slate-700/50 overflow-hidden">
        <div className="border-b border-slate-600/60 pb-2 mb-4">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light mb-3 tracking-wide text-[var(--text-primary)]">
              Chittaswarams
            </h1>
            <p className="text-slate-400 text-sm md:text-base">
              Use the Compositions tab for the full catalog
            </p>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, raga, composer…"
            className="w-full pl-2 pr-6 py-4 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent/50 placeholder:opacity-80"
          />
        </div>

        <div className="pb-2"><hr className="border-slate-600/60" /></div>

        <div className="divide-y divide-slate-700/60 rounded-lg border border-slate-700/50 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">No chittaswarams found</div>
          ) : (
            filtered.map((c) => {
              const ragaName = c.raga_id ? getRagaByIdOrName(c.raga_id)?.name ?? null : null;
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => onSelect(c.slug)}
                  className="w-full text-left pl-4 pr-4 py-3 text-sm hover:bg-slate-700/50 hover:text-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-slate-200">{c.name}</span>
                    <span className="text-slate-500 text-xs shrink-0">{c.type}</span>
                  </div>
                  {(ragaName || c.tala) && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {ragaName && <span>Raga: {ragaName}</span>}
                      {ragaName && c.tala && <span className="mx-1.5">·</span>}
                      {c.tala && <span>Tala: {c.tala}</span>}
                    </p>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
