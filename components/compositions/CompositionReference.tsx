import { Fragment, type ReactNode } from 'react';
import type { Raga } from '@/data/ragas';
import { parseVarisaiNote } from '@/data/exercises/saraliVarisai';
import {
  angPatternNotationFromParsedTala,
  patternFromParsedTala,
  primaryLabelFromParsedTala,
  secondaryLabelFromParsedTala,
  type ParsedTala,
  type TalaBeat,
} from '@/data/talas';
import type { NotationLanguage } from '@/lib/music/swaraNotation';
import { SwaraInNoteChip } from '@/components/notation/SwaraGlyph';
import { PlaybackButton } from '@/components/ui/Button';

function ReferenceCard({
  label,
  name,
  action,
  children,
}: {
  label: string;
  name: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="composition-reference-card" aria-label={`${label}: ${name}`}>
      <header>
        <div>
          <p className="eyebrow">{label}</p>
          <h3>{name}</h3>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function RagaReferenceCard({
  raga,
  language,
  playing,
  activeIndex,
  onToggle,
}: {
  raga: Raga;
  language: NotationLanguage;
  playing: boolean;
  activeIndex: number;
  onToggle: () => void;
}) {
  return (
    <ReferenceCard
      label="Raga"
      name={raga.name}
      action={<PlaybackButton compact label="scale" playing={playing} onClick={onToggle} />}
    >
      {[
        { label: 'Arohana', notes: raga.arohana, offset: 0 },
        { label: 'Avarohana', notes: raga.avarohana, offset: raga.arohana.length },
      ].map(({ label, notes, offset }) => (
        <div key={label} className="reference-scale">
          <h4>{label}</h4>
          <div className="reference-scale-notes">
            {notes.map((token, index) => {
              const note = parseVarisaiNote(token);
              const active = playing && activeIndex === offset + index;
              return (
                <span key={index} className={active ? 'is-active' : ''}>
                  <SwaraInNoteChip swara={note.swara} octave={note.octave} language={language} />
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </ReferenceCard>
  );
}

function TalaBeatStrip({ beats, activeIndex }: { beats: TalaBeat[]; activeIndex: number }) {
  return (
    <div
      className="reference-beats"
      role="img"
      aria-label={`${beats.length} beats; squares mark main beats and bars separate angas`}
    >
      {beats.map((beat, index) => (
        <Fragment key={index}>
          {index > 0 && beat.angaIndex !== beats[index - 1].angaIndex && (
            <span className="reference-anga-bar" />
          )}
          <span
            className={`reference-beat ${beat.emphasis !== 'beat' ? 'is-main' : ''} ${index === activeIndex ? 'is-active' : ''}`}
          />
        </Fragment>
      ))}
    </div>
  );
}

export function TalaReferenceCard({
  parsed,
  fallback,
  playing,
  activeIndex,
  tempo,
  onToggle,
}: {
  parsed: ParsedTala | null;
  fallback: string;
  playing: boolean;
  activeIndex: number;
  tempo?: number;
  onToggle: () => void;
}) {
  const beats = parsed ? patternFromParsedTala(parsed) : [];
  const subline = parsed ? secondaryLabelFromParsedTala(parsed) : null;
  return (
    <ReferenceCard
      label="Tala"
      name={parsed ? primaryLabelFromParsedTala(parsed) : fallback || 'Unspecified'}
      action={
        parsed && <PlaybackButton compact label="tala" playing={playing} onClick={onToggle} />
      }
    >
      {subline && <p>{subline}</p>}
      {parsed && (
        <p className="reference-tala-pattern">
          {angPatternNotationFromParsedTala(parsed)} · {beats.length} beats per cycle
        </p>
      )}
      {tempo != null && <p>Marked tempo · {tempo} BPM</p>}
      {beats.length > 0 && (
        <div className="reference-beat-details">
          <TalaBeatStrip beats={beats} activeIndex={playing ? activeIndex : -1} />
          <p>Square = main beat · circle = sub-beat · bar = anga</p>
          {playing && activeIndex >= 0 && (
            <p>
              Beat {activeIndex + 1} of {beats.length}
            </p>
          )}
        </div>
      )}
    </ReferenceCard>
  );
}
