/** One phrase of notation; omit `repeat` or use 1 for a single play-through. */
export interface ChittaswaramPhrase {
  notes: string;
  repeat?: number;
  tala?: string;
  /** 1 = default; 0.25 = quarter speed (4× longer notes) relative to practice BPM */
  tempo_multiplier?: number;
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
