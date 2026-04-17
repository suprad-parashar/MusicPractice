'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  COMPOSITIONS,
  formatTypeLabel,
  getComposition,
  humanizeCompositionType,
  type CompositionSummary,
} from '@/data/compositions';

const PAGE_SIZES = [10, 25, 50, 100];

function typeBadgeClasses(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('chittaswaram') || t === 'chittaswaram') {
    return 'bg-violet-500/20 text-violet-200 border-violet-500/40';
  }
  if (t === 'song') return 'bg-sky-500/20 text-sky-200 border-sky-500/40';
  if (t.includes('geetam')) return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40';
  if (t.includes('kriti')) return 'bg-amber-500/20 text-amber-200 border-amber-500/40';
  return 'bg-slate-600/40 text-slate-300 border-slate-500/40';
}

/**
 * Unified compositions browser: songs, chittaswarams, and future types in one searchable list.
 */
export default function CompositionsList({ onSelect }: { onSelect: (slug: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const sorted = useMemo(
    () => [...COMPOSITIONS].sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return sorted.filter((c) => {
      const full = getComposition(c.slug);
      const extra = [
        c.composer,
        c.language,
        c.type,
        c.tag ?? '',
        c.raga_id ?? '',
        c.tala ?? '',
        full?.artists?.lyricist?.join(' ') ?? '',
        full?.artists?.singer?.join(' ') ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        extra.includes(q)
      );
    });
  }, [sorted, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false);
    }
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const selectItem = (item: CompositionSummary) => {
    setDropdownOpen(false);
    setSearchQuery('');
    setCurrentPage(1);
    onSelect(item.slug);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setDropdownOpen(true);
    setCurrentPage(1);
  };

  const rowMeta = (c: CompositionSummary) => {
    const full = getComposition(c.slug);
    const label = full
      ? formatTypeLabel(full)
      : [humanizeCompositionType(c.type), c.tag].filter(Boolean).join(' · ') || 'Composition';
    return { label, badgeClass: typeBadgeClasses(c.type) };
  };

  return (
    <div className="w-full max-w-4xl mx-auto min-w-0 px-3 sm:px-4 md:px-6">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-10 shadow-2xl border border-slate-700/50 overflow-hidden">
        <div className="border-b border-slate-600/60 pb-2 mb-4">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light mb-3 tracking-wide text-[var(--text-primary)]">
              Compositions
            </h1>
            <p className="text-slate-400 text-sm md:text-base">
              Search kritis, geetams, chittaswarams, and more
            </p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full min-w-0" ref={dropdownRef}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setDropdownOpen(true)}
                placeholder="Search by title, composer, language, type…"
                className="w-full pl-2 pr-6 py-4 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent/50 placeholder:opacity-80"
              />
              {dropdownOpen && (
                <div
                  className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl py-2 border-t-2 border-t-accent/80"
                  style={{ maxHeight: '280px', overflowY: 'auto' }}
                >
                  {filtered.length > 0 ? (
                    filtered.map((c) => {
                      const { label, badgeClass } = rowMeta(c);
                      return (
                        <button
                          key={c.slug}
                          type="button"
                          onClick={() => selectItem(c)}
                          className="w-full flex items-center gap-3 text-left pl-4 pr-4 py-3.5 text-sm cursor-pointer text-slate-200 hover:bg-accent hover:text-slate-900 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-medium block">{c.name}</span>
                            <span className="text-slate-400 block mt-0.5">
                              {c.composer} · {c.language}
                            </span>
                          </div>
                          <span
                            className={`shrink-0 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${badgeClass}`}
                          >
                            {label}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="pl-4 pr-4 py-3 text-sm text-slate-400 text-center">
                      No compositions found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pb-2"><hr className="border-slate-600/60" /></div>

        {COMPOSITIONS.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-10">No compositions in the library yet.</p>
        ) : (
          <>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 pt-4">All compositions</p>
            <div className="pb-4"><hr className="border-slate-600/60" /></div>
            <div className="divide-y divide-slate-700/60 rounded-lg border border-slate-700/50 overflow-hidden">
              {paginated.map((c) => {
                const { label, badgeClass } = rowMeta(c);
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => onSelect(c.slug)}
                    className="w-full flex items-center gap-3 text-left pl-4 pr-4 py-3 text-sm hover:bg-slate-700/50 hover:text-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-slate-200 block">{c.name}</span>
                      <p className="text-slate-400 mt-0.5 text-xs">
                        {c.composer}
                        <span className="text-slate-600 mx-1.5">·</span>
                        {c.language}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${badgeClass}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 pb-4"><hr className="border-slate-600/60" /></div>

            {filtered.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-10">No compositions found</p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-6 border-slate-600/60">
                <div className="flex flex-wrap items-center gap-4">
                  <p className="text-slate-400 text-sm">
                    Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
                  </p>
                  <span className="text-slate-600">|</span>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-400 whitespace-nowrap">Show:</label>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="pl-3 pr-8 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      {PAGE_SIZES.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <span className="text-slate-400 text-sm">per page</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-200 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-slate-400 text-sm">
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-200 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
