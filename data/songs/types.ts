export interface SongLine {
  notes: string;
  lyrics: string;
  translation?: string;
}

export interface SongStanza {
  /** Section id from composition JSON, e.g. `pallavi`, `charanam_0` — for display labels */
  section_name?: string;
  /** Catalog `raga_id` (e.g. `malahari`) — preferred */
  raga_id?: string;
  /** Legacy: display name only — used when `raga_id` is absent */
  raga?: string;
  tala: string;
  tempo?: number;
  lines: SongLine[];
}

export interface Song {
  name: string;
  composer: string;
  language: string;
  stanzas: SongStanza[];
}

export interface SongSummary {
  slug: string;
  name: string;
  composer: string;
  language: string;
}
