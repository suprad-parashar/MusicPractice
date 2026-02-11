import type { Song, SongSummary } from './types';

// Import song data (add new songs here when you add JSON files)
import sriGananathaEn from './sri_gananatha[en].json';

const SONGS_DATA: Record<string, Song> = {
  'sri_gananatha_en': sriGananathaEn as Song,
};

export const SONGS: SongSummary[] = Object.entries(SONGS_DATA).map(([slug, song]) => ({
  slug,
  name: song.name,
  composer: song.composer,
  language: song.language,
}));

export function getSong(slug: string): Song | null {
  return SONGS_DATA[slug] ?? null;
}

export type { Song, SongSummary, SongLine, SongStanza } from './types';
