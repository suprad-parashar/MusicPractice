/** One phrase of notation; omit `repeat` or use 1 for a single play-through. */
export interface ChittaswaramPhrase {
  notes: string;
  repeat?: number;
}

export interface Chittaswaram {
  name: string;
  source: string;
  tempo: number;
  raga_id?: string;
  tala?: string;
  song_title?: string;
  song_link?: string;
  phrases: ChittaswaramPhrase[];
}

export interface ChittaswaramSummary {
  slug: string;
  name: string;
  source: string;
  raga_id?: string;
  tala?: string;
}
