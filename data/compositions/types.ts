import type { SongLine, SongStanza } from '@/data/songs/types';

export interface Artists {
  singer?: string[];
  composer?: string[];
  lyricist?: string[];
}

export interface PhraseBlock {
  notes: string;
  repeat?: number;
  lyrics?: string;
  translation?: string;
  /** Overrides section / piece tala for this phrase only (e.g. Sextuplet-4) */
  tala?: string;
  /** Scales phrase tempo vs practice BPM: 1 = default, 0.5 = half speed (longer notes), 2 = double speed */
  tempo_multiplier?: number;
}

/** A stanza, charanam, chittaswaram block, etc. — either `lines` (notation + lyrics) or `phrases` (compact notation). */
export interface CompositionSection {
  name: string;
  raga_id?: string;
  /** Legacy: display name only — used when `raga_id` is absent */
  raga?: string;
  /** When omitted or blank, inherited from the parent composition. */
  tala?: string;
  tempo?: number;
  phrases?: PhraseBlock[];
  lines?: SongLine[];
}

export interface Composition {
  slug: string;
  name: string;
  artists?: Artists;
  language?: string;
  /** Primary catalog type, e.g. Geetam, kriti, chittaswaram */
  type?: string;
  /** Secondary label, e.g. Kriti, Chittaswaram */
  tag?: string;
  url?: string;
  raga_id?: string;
  /** Legacy display name — stanzas may omit `raga` / `raga_id` and inherit these */
  raga?: string;
  tala?: string;
  tempo?: number;
  stanzas?: CompositionSection[];
  chittaswarams?: CompositionSection[];
  /** Names of sections (from `stanzas` / `chittaswarams`) in performance order */
  performance?: string[];
}

export interface CompositionSummary {
  slug: string;
  name: string;
  composer: string;
  language: string;
  type: string;
  tag?: string;
  raga_id?: string;
  tala?: string;
}
