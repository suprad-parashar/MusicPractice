import type { Artists, Composition, CompositionSection, CompositionSummary } from './types';
import { COMPOSITION_REGISTRY } from './registry.generated';
import type { SongLine } from '@/data/songs/types';

function mapPhrases(arr: unknown[]): CompositionSection['phrases'] {
  return arr.map((p) => {
    const o = p as Record<string, unknown>;
    return {
      notes: String(o.notes ?? ''),
      repeat: typeof o.repeat === 'number' ? o.repeat : undefined,
      lyrics: o.lyrics as string | undefined,
      translation: o.translation as string | undefined,
      tala: o.tala !== undefined && o.tala !== null ? String(o.tala) : undefined,
      tempo_multiplier:
        typeof o.tempo_multiplier === 'number' && Number.isFinite(o.tempo_multiplier)
          ? o.tempo_multiplier
          : undefined,
    };
  });
}

function mapLines(arr: unknown[]): SongLine[] {
  return arr.map((l) => {
    const o = l as Record<string, unknown>;
    return {
      notes: String(o.notes ?? ''),
      lyrics: String(o.lyrics ?? ''),
      translation: o.translation as string | undefined,
    };
  });
}

function normalizeSection(raw: unknown): CompositionSection {
  const s = raw as Record<string, unknown>;
  const phrases = s.phrases;
  const lines = s.lines;
  const talaRaw = s.tala;
  return {
    name: String(s.name ?? ''),
    raga_id: s.raga_id as string | undefined,
    raga: s.raga as string | undefined,
    tala: talaRaw !== undefined && talaRaw !== null ? String(talaRaw) : undefined,
    tempo: typeof s.tempo === 'number' ? s.tempo : undefined,
    phrases: Array.isArray(phrases) ? mapPhrases(phrases) : undefined,
    lines: Array.isArray(lines) ? mapLines(lines) : undefined,
  };
}

function normalizeComposition(slug: string, raw: unknown): Composition {
  const r = raw as Record<string, unknown>;
  const st = r.stanzas;
  const ch = r.chittaswarams;
  const perf = r.performance;
  return {
    slug,
    name: String(r.name ?? 'Untitled'),
    artists: r.artists as Artists | undefined,
    language: r.language as string | undefined,
    type: r.type as string | undefined,
    tag: r.tag as string | undefined,
    url: (r.url ?? r.song_link) as string | undefined,
    raga_id: r.raga_id as string | undefined,
    raga: r.raga as string | undefined,
    tala: r.tala as string | undefined,
    tempo: typeof r.tempo === 'number' ? r.tempo : undefined,
    stanzas: Array.isArray(st) ? st.map(normalizeSection) : undefined,
    chittaswarams: Array.isArray(ch) ? ch.map(normalizeSection) : undefined,
    performance: Array.isArray(perf) ? perf.map(String) : undefined,
  };
}

const compositionEntries = COMPOSITION_REGISTRY.map(({ slug, raw }) => {
  const c = normalizeComposition(slug, raw);
  return [slug, c] as const;
});
const COMPOSITIONS_DATA: Record<string, Composition> = Object.fromEntries(compositionEntries);

function summaryFromComposition(slug: string, c: Composition): CompositionSummary {
  const composers = c.artists?.composer ?? [];
  return {
    slug,
    name: c.name,
    composer: composers.join(', ') || '—',
    language: c.language ?? '—',
    type: c.type ?? '—',
    tag: c.tag,
    raga_id: c.raga_id ?? c.stanzas?.[0]?.raga_id ?? c.chittaswarams?.[0]?.raga_id,
    tala: c.tala ?? c.stanzas?.[0]?.tala ?? c.chittaswarams?.[0]?.tala,
  };
}

export const COMPOSITIONS: CompositionSummary[] = compositionEntries.map(([slug, c]) =>
  summaryFromComposition(slug, c),
);

export function getComposition(slug: string): Composition | null {
  return COMPOSITIONS_DATA[slug] ?? null;
}

export type { Composition, CompositionSummary, CompositionSection, Artists, PhraseBlock } from './types';
export {
  formatComposer,
  formatCompositionArtistLine,
  formatTypeLabel,
  humanizeCompositionType,
  humanizeSectionTabLabel,
  humanizeStanzaHeading,
  sectionToSongStanza,
  findSectionByName,
  compositionToSongCatalogOrder,
  compositionToSongPerformance,
  sectionToChittaswaramModel,
  buildCompositionSubtabs,
  type CompositionSubtab,
} from './helpers';
