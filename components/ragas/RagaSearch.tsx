'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ALL_RAGAS, type Raga } from '@/data/ragas';
import { filterAndSortRagasBySearch } from '@/lib/music/ragaSearch';
import { Icon } from '@/components/ui/Icon';

const SORTED_RAGAS = [...ALL_RAGAS].sort((a, b) => a.name.localeCompare(b.name));

export function RagaSearch({
  selected,
  onSelect,
  ragas = SORTED_RAGAS,
  showSelection = false,
  disabled = false,
  className = '',
}: {
  selected: Raga;
  onSelect: (raga: Raga) => void;
  ragas?: Raga[];
  showSelection?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const sorted = useMemo(() => [...ragas].sort((a, b) => a.name.localeCompare(b.name)), [ragas]);
  const results = useMemo(() => filterAndSortRagasBySearch(sorted, query), [sorted, query]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  useEffect(() => {
    if (open)
      document.getElementById(`${listId}-${highlight}`)?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open, listId, results]);

  const select = (raga: Raga) => {
    onSelect(raga);
    setQuery('');
    setOpen(false);
    input.current?.focus();
  };

  return (
    <div
      className={`raga-search ${className}`}
      ref={wrapper}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="raga-search-shell">
        <Icon name="search" size={15} />
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-label="Find a raga"
          aria-expanded={open && !disabled}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results.length ? `${listId}-${highlight}` : undefined}
          autoComplete="off"
          placeholder="Find a raga…"
          disabled={disabled}
          value={showSelection && !open ? selected.name : query}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setOpen(true);
              setHighlight((index) =>
                !open
                  ? 0
                  : Math.max(
                      0,
                      Math.min(results.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)),
                    ),
              );
            }
            if (event.key === 'Enter' && open && results[highlight]) {
              event.preventDefault();
              select(results[highlight]);
            }
          }}
        />
        <Icon name="down" size={12} />
      </div>
      {open && !disabled && (
        <div id={listId} role="listbox" aria-label="Ragas" className="raga-results">
          {results.length ? (
            results.map((raga, index) => (
              <button
                id={`${listId}-${index}`}
                key={raga.ragaId}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={raga.ragaId === selected.ragaId}
                className={index === highlight ? 'is-highlighted' : ''}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(raga)}
              >
                <span>{raga.name}</span>
                <small>{raga.meta.isMelakarta ? `Melakarta ${raga.number}` : 'Janya'}</small>
              </button>
            ))
          ) : (
            <p>No ragas found. Try another spelling.</p>
          )}
        </div>
      )}
    </div>
  );
}
