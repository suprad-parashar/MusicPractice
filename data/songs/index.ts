import type { Song } from './types';
import type { SongSummary } from './types';
import {
  COMPOSITIONS,
  getComposition,
  compositionToSongCatalogOrder,
} from '@/data/compositions';

/** @deprecated Use COMPOSITIONS from @/data/compositions — kept for static routes and legacy imports */
export const SONGS: SongSummary[] = COMPOSITIONS.map((c) => ({
  slug: c.slug,
  name: c.name,
  composer: c.composer,
  language: c.language,
}));

export function getSong(slug: string): Song | null {
  const c = getComposition(slug);
  if (!c) return null;
  return compositionToSongCatalogOrder(c);
}

export type { Song, SongSummary, SongLine, SongStanza } from './types';
export { resolveStanzaRaga } from './stanzaRaga';
