'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ALL_RAGAS, MELAKARTA_RAGAS, JANYA_RAGAS, getRagaById, type Raga } from '@/data/ragas';
import type { InstrumentId } from '@/lib/music/instruments';
import type { NotationLanguage } from '@/lib/music/swaraNotation';
import { DEFAULT_PRACTICE_BPM } from '@/lib/music/defaultTempo';
import { getStored, setStored } from '@/lib/storage';
import { useRagaPlayback } from '@/hooks/useRagaPlayback';
import { PlaybackButton } from '@/components/ui/Button';
import { Disclosure } from '@/components/ui/Disclosure';
import { Icon } from '@/components/ui/Icon';
import { LoadingState } from '@/components/ui/LoadingState';
import TempoControl from '@/components/ui/TempoControl';
import RagaPianoKeyboard from './RagaPianoKeyboard';
import { RagaSearch } from './RagaSearch';
import { RagaReference, displayText } from './RagaReference';
import { SwaraRow } from './SwaraRow';

interface Props {
  baseFreq: number;
  /** Keep keyboard labels fixed when the playback octave changes. */
  pianoLayoutSaFreq?: number;
  instrumentId?: InstrumentId;
  volume?: number;
  notationLanguage?: NotationLanguage;
  openRagaRequest?: { ragaId: string; nonce: number } | null;
  onOpenRagaRequestConsumed?: () => void;
}

export default function RagaPlayer({
  baseFreq,
  pianoLayoutSaFreq,
  instrumentId = 'piano',
  volume = 0.5,
  notationLanguage = 'english',
  openRagaRequest,
  onOpenRagaRequestConsumed,
}: Props) {
  const [raga, setRaga] = useState<Raga>(
    () => ALL_RAGAS.find((item) => item.name === 'Mayamalavagowla') ?? ALL_RAGAS[14],
  );
  const [bpm, setBpm] = useState(DEFAULT_PRACTICE_BPM);
  const [loop, setLoop] = useState(false);
  const [ready, setReady] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const playback = useRagaPlayback({ raga, baseFreq, instrumentId, volume, bpm, loop });

  useLayoutEffect(() => {
    const stored = getStored<{ ragaId?: string; ragaNumber?: number; loop?: boolean }>(
      'ragaSettings',
      {},
    );
    const saved = ALL_RAGAS.find((item) =>
      stored.ragaId ? item.ragaId === stored.ragaId : item.number === stored.ragaNumber,
    );
    if (saved) setRaga(saved);
    if (typeof stored.loop === 'boolean') setLoop(stored.loop);
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) setStored('ragaSettings', { ragaId: raga.ragaId, ragaNumber: raga.number, loop });
  }, [raga, loop, ready]);
  useEffect(() => {
    if (!openRagaRequest) return;
    const selected = getRagaById(openRagaRequest.ragaId);
    if (selected) {
      setRaga(selected);
      card.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    onOpenRagaRequestConsumed?.();
  }, [openRagaRequest, onOpenRagaRequestConsumed]);

  if (!ready) return <LoadingState label="Opening the raga explorer…" />;
  const notes = [...raga.arohana, ...raga.avarohana];
  const meta = raga.meta;

  return (
    <div className="raga-explorer">
      <div className="explorer-toolbar">
        <div>
          <h2>Find your next raga</h2>
          <p className="catalog-count">
            {MELAKARTA_RAGAS.length} melakarta · {JANYA_RAGAS.length} janya ragas
          </p>
        </div>
        <RagaSearch selected={raga} onSelect={setRaga} />
      </div>
      <div className="raga-card" ref={card}>
        <header className="raga-card-heading">
          <div>
            <h3>{raga.name}</h3>
            <div className="raga-meta">
              <span className="raga-badge">
                {meta.isMelakarta ? `Melakarta ${meta.melakartaNumber}` : 'Janya raga'}
              </span>
              {meta.chakra && <span>{displayText(meta.chakra)} chakra</span>}
              {meta.isVakra && <span>· Vakra</span>}
              {meta.isBhashanga && <span>· Bhashanga</span>}
            </div>
          </div>
          <span className="raga-number" aria-hidden="true">
            {meta.isMelakarta ? String(meta.melakartaNumber).padStart(2, '0') : '♪'}
          </span>
        </header>
        <div className="raga-notes">
          <SwaraRow
            title="Arohana"
            direction="ascending"
            notes={raga.arohana}
            activeIndex={playback.activeIndex}
            language={notationLanguage}
            onPlay={playback.start}
          />
          <SwaraRow
            title="Avarohana"
            direction="descending"
            notes={raga.avarohana}
            offset={raga.arohana.length}
            activeIndex={playback.activeIndex}
            language={notationLanguage}
            onPlay={playback.start}
          />
          <p className="raga-hint">
            <Icon name="headphones" size={12} />
            Tap any swara to listen from that note.
          </p>
        </div>
        <div className="raga-playback">
          <PlaybackButton
            label="raga"
            playing={playback.playing}
            loading={playback.loading}
            onClick={() => (playback.playing ? playback.stop() : playback.start())}
          />
          <button
            type="button"
            className="raga-loop"
            aria-label="Loop playback"
            aria-pressed={loop}
            title="Loop playback"
            onClick={() => setLoop((value) => !value)}
          >
            <Icon name="loop" size={18} />
          </button>
          <TempoControl value={bpm} onChange={setBpm} />
        </div>
        {playback.error && (
          <p role="alert" className="inline-error">
            {playback.error}
          </p>
        )}
        <div className="raga-keyboard">
          <Disclosure title="Explore on the piano">
            <RagaPianoKeyboard
              baseFreq={pianoLayoutSaFreq ?? baseFreq}
              raga={raga}
              notationLanguage={notationLanguage}
              activeNoteString={playback.playing ? notes[playback.activeIndex] : null}
              onMidiClick={playback.playMidi}
            />
          </Disclosure>
        </div>
      </div>
      <RagaReference
        key={raga.ragaId}
        raga={raga}
        onSelect={(selected) => {
          setRaga(selected);
          card.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }}
      />
    </div>
  );
}
