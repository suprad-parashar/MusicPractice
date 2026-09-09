import type { CSSProperties } from 'react';
import { parseVarisaiNote } from '@/data/exercises/saraliVarisai';
import type { NotationLanguage } from '@/lib/music/swaraNotation';
import { SwaraInNoteChip } from '@/components/notation/SwaraGlyph';

export function SwaraRow({
  title,
  direction,
  notes,
  offset = 0,
  activeIndex,
  language,
  onPlay,
}: {
  title: string;
  direction: 'ascending' | 'descending';
  notes: string[];
  offset?: number;
  activeIndex: number;
  language: NotationLanguage;
  onPlay: (index: number) => void;
}) {
  return (
    <div className="swara-row">
      <div className="swara-row-heading">
        <h4>
          {title}
          <span aria-hidden="true">{direction === 'ascending' ? '↗' : '↘'}</span>
        </h4>
        <span>{direction === 'ascending' ? 'Ascending' : 'Descending'}</span>
      </div>
      <div
        className="swara-chips"
        style={{ '--note-count': Math.min(notes.length, 9) } as CSSProperties}
      >
        {notes.map((token, index) => {
          const note = parseVarisaiNote(token);
          const position = offset + index;
          return (
            <button
              key={`${token}-${index}`}
              type="button"
              className={`swara-chip ${position === activeIndex ? 'is-active' : ''} ${activeIndex > position ? 'is-past' : ''}`}
              aria-label={`Play ${token}, ${direction} note ${index + 1}`}
              aria-current={position === activeIndex ? 'step' : undefined}
              onClick={() => onPlay(position)}
            >
              <SwaraInNoteChip
                swara={note.swara}
                language={language}
                octave={note.octave}
                density="comfortable"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
