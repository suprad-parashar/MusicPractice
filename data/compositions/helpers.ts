import type { Song, SongStanza } from '@/data/songs/types';
import type { Chittaswaram, ChittaswaramPhrase } from '@/data/chittaswarams/types';
import type { Composition, CompositionSection } from './types';

function trimOrEmpty(s: string | undefined): string {
  return (s ?? '').trim();
}

/** Stanza overrides parent when it has a non-empty value. */
function mergedStanzaFields(section: CompositionSection, c: Composition) {
  const talaFromSection = trimOrEmpty(section.tala);
  const tala = talaFromSection !== '' ? talaFromSection : trimOrEmpty(c.tala);
  return {
    raga_id: section.raga_id ?? c.raga_id,
    raga: section.raga ?? c.raga,
    tala,
    tempo: section.tempo ?? c.tempo,
  };
}

export function formatComposer(c: Composition): string {
  const list = c.artists?.composer;
  if (list?.length) return list.join(', ');
  return '';
}

export function humanizeCompositionType(type: string): string {
  const lower = type.toLowerCase();
  const map: Record<string, string> = {
    song: 'Song',
    chittaswaram: 'Chittaswaram',
    geetam: 'Geetam',
    kriti: 'Kriti',
  };
  if (map[lower]) return map[lower];
  return type.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function formatTypeLabel(c: Composition): string {
  const typePart = c.type ? humanizeCompositionType(c.type) : '';
  const parts = [typePart, c.tag].filter(Boolean) as string[];
  return parts.join(' · ') || 'Composition';
}

export function humanizeSectionTabLabel(sectionName: string): string {
  const m = /^chittaswaram_(\d+)$/i.exec(sectionName);
  if (m) return `Chittaswaram ${m[1]}`;
  return sectionName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/** UI label for a stanza `name` from JSON: `pallavi` → Pallavi, `charanam_0` → Charanam 1. */
export function humanizeStanzaHeading(sectionName: string): string {
  const raw = sectionName.trim();
  if (!raw) return 'Section';
  const charanam = /^charanam_(\d+)$/i.exec(raw);
  if (charanam) return `Charanam ${parseInt(charanam[1], 10) + 1}`;
  const chitta = /^chittaswaram_(\d+)$/i.exec(raw);
  if (chitta) return `Chittaswaram ${chitta[1]}`;
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function sectionToSongStanza(section: CompositionSection, composition: Composition): SongStanza {
  const m = mergedStanzaFields(section, composition);
  if (section.lines?.length) {
    return {
      section_name: section.name,
      raga_id: m.raga_id,
      raga: m.raga,
      tala: m.tala,
      tempo: m.tempo,
      lines: section.lines,
    };
  }
  if (section.phrases?.length) {
    return {
      section_name: section.name,
      raga_id: m.raga_id,
      raga: m.raga,
      tala: m.tala,
      tempo: m.tempo,
      lines: section.phrases.map((p) => ({
        notes: p.notes,
        lyrics: p.lyrics ?? '',
        translation: p.translation,
      })),
    };
  }
  return {
    section_name: section.name,
    raga_id: m.raga_id,
    raga: m.raga,
    tala: m.tala,
    tempo: m.tempo,
    lines: [],
  };
}

export function findSectionByName(c: Composition, name: string): CompositionSection | undefined {
  return c.stanzas?.find((s) => s.name === name) ?? c.chittaswarams?.find((s) => s.name === name);
}

/** Full piece as a Song using catalog stanza order. */
export function compositionToSongCatalogOrder(c: Composition): Song | null {
  if (!c.stanzas?.length) return null;
  return {
    name: c.name,
    composer: formatComposer(c),
    language: c.language ?? '',
    stanzas: c.stanzas.map((s) => sectionToSongStanza(s, c)),
  };
}

/** Song built from `performance` name order; skips unknown names. */
export function compositionToSongPerformance(c: Composition): Song | null {
  if (!c.performance?.length) return null;
  const stanzas: SongStanza[] = [];
  for (const name of c.performance) {
    const sec = findSectionByName(c, name);
    if (sec) stanzas.push(sectionToSongStanza(sec, c));
  }
  if (!stanzas.length) return null;
  return {
    name: c.name,
    composer: formatComposer(c),
    language: c.language ?? '',
    stanzas,
  };
}

export function sectionToChittaswaramModel(c: Composition, section: CompositionSection): Chittaswaram {
  const phrases: ChittaswaramPhrase[] = (section.phrases ?? []).map((p) => ({
    notes: p.notes ?? '',
    repeat: p.repeat ?? 1,
  }));
  const m = mergedStanzaFields(section, c);
  return {
    name: `${c.name} — ${humanizeSectionTabLabel(section.name)}`,
    source: formatComposer(c) || '—',
    tempo: m.tempo != null ? m.tempo : 120,
    raga_id: m.raga_id,
    tala: m.tala,
    song_title: c.name,
    song_link: c.url,
    phrases: phrases.length ? phrases : [{ notes: '', repeat: 1 }],
  };
}

export type CompositionSubtab =
  | { kind: 'performance' }
  | { kind: 'stanzas' }
  | { kind: 'chitta'; section: CompositionSection };

export function buildCompositionSubtabs(c: Composition): CompositionSubtab[] {
  const out: CompositionSubtab[] = [];
  if (c.performance?.length && compositionToSongPerformance(c)) {
    out.push({ kind: 'performance' });
  }
  if (c.stanzas?.length && compositionToSongCatalogOrder(c)) {
    out.push({ kind: 'stanzas' });
  }
  for (const section of c.chittaswarams ?? []) {
    out.push({ kind: 'chitta', section });
  }
  return out;
}
