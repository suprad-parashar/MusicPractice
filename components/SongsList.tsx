'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { SONGS, type SongSummary } from '@/data/songs';

const PAGE_SIZES = [10, 25, 50, 100];

/**
 * Songs tab: searchable (with dropdown) + paginated list of songs in alphabetical order.
 * Clicking a song invokes onSelectSong.
 */
export default function SongsList({ onSelectSong }: { onSelectSong: (slug: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const sortedSongs = useMemo(
    () => [...SONGS].sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const filteredSongs = useMemo(
    () =>
      sortedSongs.filter(
        (song) =>
          song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          song.composer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          song.language.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [sortedSongs, searchQuery]
  );

  const totalPages = Math.max(1, Math.ceil(filteredSongs.length / pageSize));
  const paginatedSongs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSongs.slice(start, start + pageSize);
  }, [filteredSongs, currentPage, pageSize]);

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

  const handleSelectFromDropdown = (song: SongSummary) => {
    setDropdownOpen(false);
    setSearchQuery('');
    setCurrentPage(1);
    onSelectSong(song.slug);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setDropdownOpen(true);
    setCurrentPage(1);
  };
  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setCurrentPage(1);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-10 shadow-2xl border border-slate-700/50 overflow-hidden">
        <div className="border-b border-slate-600/60 pb-2 mb-4">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-light mb-3 tracking-wide text-[var(--text-primary)]">
              Songs
            </h1>
            <p className="text-slate-400 text-sm md:text-base">
              Browse and open Carnatic compositions
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
                placeholder="Search songs by name, composer, or language..."
                className="w-full pl-2 pr-6 py-4 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent/50 placeholder:opacity-80"
              />
              {dropdownOpen && (
                <div
                  className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl py-2 border-t-2 border-t-accent/80"
                  style={{ maxHeight: '280px', overflowY: 'auto' }}
                >
                  {filteredSongs.length > 0 ? (
                    filteredSongs.map((song) => (
                      <button
                        key={song.slug}
                        type="button"
                        onClick={() => handleSelectFromDropdown(song)}
                        className="w-full text-left pl-4 pr-4 py-3.5 text-sm cursor-pointer text-slate-200 hover:bg-accent hover:text-slate-900 transition-colors"
                      >
                        <span className="font-medium">{song.name}</span>
                        <span className="text-slate-400 ml-2">— {song.composer}</span>
                        <span className="text-slate-500 text-xs ml-2">({song.language})</span>
                      </button>
                    ))
                  ) : (
                    <div className="pl-4 pr-4 py-3 text-sm text-slate-400 text-center">
                      No songs found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pb-2"><hr className="border-slate-600/60" /></div>

        {SONGS.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-10">No songs in the library yet.</p>
        ) : (
          <>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 pt-4">All songs</p>
            <div className="pb-4"><hr className="border-slate-600/60" /></div>
            <div className="divide-y divide-slate-700/60 rounded-lg border border-slate-700/50 overflow-hidden">
              {paginatedSongs.map((song) => (
                <button
                  key={song.slug}
                  type="button"
                  onClick={() => onSelectSong(song.slug)}
                  className="w-full text-left pl-4 pr-4 py-3 text-sm hover:bg-slate-700/50 hover:text-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  <span className="font-medium text-slate-200">{song.name}</span>
                  <span className="text-slate-400 ml-2">— {song.composer}</span>
                  <span className="text-slate-500 text-xs ml-2">({song.language})</span>
                </button>
              ))}
            </div>

            <div className="pt-4 pb-4"><hr className="border-slate-600/60" /></div>

            {filteredSongs.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-10">No songs found</p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-6 border-slate-600/60">
                <div className="flex flex-wrap items-center gap-4">
                  <p className="text-slate-400 text-sm">
                    Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredSongs.length)} of {filteredSongs.length}
                  </p>
                  <span className="text-slate-600">|</span>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-400 whitespace-nowrap">Show:</label>
                    <select
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
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
                    className="px-5 py-2.5 rounded-lg bg-amber-500 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors font-medium"
                  >
                    Previous
                  </button>
                  <span className="text-slate-400 text-sm px-3 min-w-[100px] text-center">
                    Page <span className="text-accent font-medium">{currentPage}</span> of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-5 py-2.5 rounded-lg bg-amber-500 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors font-medium"
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
