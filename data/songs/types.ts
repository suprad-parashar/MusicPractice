export interface SongLine {
  notes: string;
  lyrics: string;
  translation?: string;
}

export interface SongStanza {
  raga: string;
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
