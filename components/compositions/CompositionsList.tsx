'use client';

import { useMemo, useState } from 'react';
import { COMPOSITIONS, getComposition, humanizeCompositionType } from '@/data/compositions';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

const PAGE_SIZE = 12;
const TYPES = [...new Set(COMPOSITIONS.map((item) => item.type))];
const CATALOG = [...COMPOSITIONS]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((item) => {
    const full = getComposition(item.slug);
    return {
      ...item,
      search: [
        item.name,
        item.composer,
        item.language,
        item.type,
        item.tag,
        item.raga_id,
        item.tala,
        ...(full?.artists?.lyricist ?? []),
        ...(full?.artists?.singer ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    };
  });

export default function CompositionsList({ onSelect }: { onSelect: (slug: string) => void }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const filtered = useMemo(
    () =>
      CATALOG.filter(
        (item) =>
          (type === 'all' || item.type === type) &&
          item.search.includes(query.trim().toLowerCase()),
      ),
    [query, type],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="composition-search">
        <Icon name="search" size={17} />
        <input
          type="search"
          aria-label="Search compositions"
          placeholder="Search by title, composer, raga…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
      </div>
      <div className="composition-filters" role="group" aria-label="Composition type">
        <button
          type="button"
          aria-pressed={type === 'all'}
          onClick={() => {
            setType('all');
            setPage(1);
          }}
        >
          All compositions
        </button>
        {TYPES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={type === value}
            onClick={() => {
              setType(value);
              setPage(1);
            }}
          >
            {humanizeCompositionType(value)}
          </button>
        ))}
      </div>
      <div className="composition-library">
        {shown.length ? (
          shown.map((item) => (
            <button
              key={item.slug}
              type="button"
              className="composition-row"
              onClick={() => onSelect(item.slug)}
            >
              <span className="composition-art">
                <Icon name="music" size={21} />
              </span>
              <div>
                <h2>{item.name}</h2>
                <p>{[item.composer, item.language, item.tag].filter(Boolean).join(' · ')}</p>
              </div>
              <span className="composition-type">{humanizeCompositionType(item.type)}</span>
              <Icon name="arrow" size={17} />
            </button>
          ))
        ) : (
          <div className="library-empty">
            <h2>No compositions found.</h2>
            <p>Try a different title, composer, or raga.</p>
            <Button
              onClick={() => {
                setQuery('');
                setType('all');
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>
      <div className="library-footer">
        <span>
          {filtered.length} {filtered.length === 1 ? 'composition' : 'compositions'} in your library
        </span>
        {pages > 1 && (
          <div>
            <Button
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              ←
            </Button>
            <span>
              {page} / {pages}
            </span>
            <Button
              aria-label="Next page"
              disabled={page === pages}
              onClick={() => setPage((value) => value + 1)}
            >
              →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
