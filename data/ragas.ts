import allRagasJson from './all_ragas.json';

/** Carnatic raga for playback / notation (compatible with former melakarta + janya split). */
export interface Raga {
  number: number;
  name: string;
  arohana: string[];
  avarohana: string[];
  isMelakarta?: boolean;
  parentMelakarta?: number;
  ragaId: string;
  meta: RagaMeta;
}

export type MelakartaRaga = Raga;

export type RagaComposition = {
  name: string;
  composer: string;
  language: string;
};

export type RagaMeta = {
  ragaId: string;
  otherNames: string[];
  melakartaNumber: number | null;
  isMelakarta: boolean;
  parentMelakarta: number | null;
  inventor: string;
  chakra: string;
  ragaType: string;
  isVakra: boolean;
  isBhashanga: boolean;
  anyaSwaras: string[];
  usesVivadiSwaras: boolean;
  rasa: string[];
  mood: string;
  description: string;
  timeOfDay: string;
  gamakaUsage: string;
  hindustaniEquivalent: string;
  westernEquivalent: string;
  /** raga_id values (not display names), matching `raga_id` in the catalog */
  popularJanyaRagas: string[];
  notableCompositions: RagaComposition[];
  notableFeatures: string;
  wikipediaUrl: string;
  ragasurabhiUrl: string;
  youtubeUrl: string;
};

type RagaJsonRow = {
  raga_id: string;
  raga_name: string;
  other_names: string[];
  melakarta_number: number | null;
  is_melakarta: boolean;
  parent_raga: number | null;
  inventor?: string;
  chakra: string;
  arohana: string[];
  avrohana: string[];
  raga_type: string;
  is_vakra: boolean;
  is_bhashanga: boolean;
  anya_swaras: string[];
  uses_vivadi_swaras: boolean;
  rasa: string[];
  mood: string;
  description: string;
  time_of_day: string;
  gamaka_usage: string;
  hindustani_equivalent: string;
  western_equivalent: string;
  /** Each entry is a janya raga's `raga_id` (ASCII slug) */
  popular_janya_ragas: string[];
  notable_compositions: { name: string; composer: string; language: string }[];
  notable_features: string;
  wikipedia_url: string;
  ragasurabhi_url?: string;
  youtube_url?: string;
};

function rowToMeta(row: RagaJsonRow): RagaMeta {
  return {
    ragaId: row.raga_id,
    otherNames: row.other_names ?? [],
    melakartaNumber: row.melakarta_number,
    isMelakarta: row.is_melakarta,
    parentMelakarta: row.parent_raga,
    inventor: (row.inventor ?? '').trim(),
    chakra: row.chakra ?? '',
    ragaType: row.raga_type ?? '',
    isVakra: row.is_vakra ?? false,
    isBhashanga: row.is_bhashanga ?? false,
    anyaSwaras: row.anya_swaras ?? [],
    usesVivadiSwaras: row.uses_vivadi_swaras ?? false,
    rasa: row.rasa ?? [],
    mood: row.mood ?? '',
    description: row.description ?? '',
    timeOfDay: row.time_of_day ?? '',
    gamakaUsage: row.gamaka_usage ?? '',
    hindustaniEquivalent: row.hindustani_equivalent ?? '',
    westernEquivalent: row.western_equivalent ?? '',
    popularJanyaRagas: row.popular_janya_ragas ?? [],
    notableCompositions: row.notable_compositions ?? [],
    notableFeatures: row.notable_features ?? '',
    wikipediaUrl: row.wikipedia_url ?? '',
    ragasurabhiUrl: row.ragasurabhi_url ?? '',
    youtubeUrl: row.youtube_url ?? '',
  };
}

function buildRagas(): { all: Raga[]; melakarta: Raga[]; janya: Raga[] } {
  const rows = allRagasJson as RagaJsonRow[];
  const all: Raga[] = [];
  let janyaSeq = 0;
  const seenIds = new Set<string>();

  for (const row of rows) {
    if (seenIds.has(row.raga_id)) {
      continue;
    }
    seenIds.add(row.raga_id);
    const meta = rowToMeta(row);
    const arohana = [...row.arohana];
    const avarohana = [...row.avrohana];

    if (row.is_melakarta && row.melakarta_number != null) {
      all.push({
        number: row.melakarta_number,
        name: row.raga_name,
        arohana,
        avarohana,
        isMelakarta: true,
        ragaId: row.raga_id,
        meta,
      });
    } else {
      janyaSeq += 1;
      all.push({
        number: 100 + janyaSeq,
        name: row.raga_name,
        arohana,
        avarohana,
        isMelakarta: false,
        parentMelakarta: row.parent_raga ?? undefined,
        ragaId: row.raga_id,
        meta,
      });
    }
  }

  const melakarta = all.filter((r) => r.isMelakarta);
  const janya = all.filter((r) => !r.isMelakarta);
  return { all, melakarta, janya };
}

const { all: ALL_RAGAS_BUILT, melakarta: MELAKARTA_BUILT, janya: JANYA_BUILT } = buildRagas();

/** All ragas from `all_ragas.json` (melakarta first in file order, then janyas). */
export const ALL_RAGAS: Raga[] = ALL_RAGAS_BUILT;
export const MELAKARTA_RAGAS: Raga[] = MELAKARTA_BUILT;
export const JANYA_RAGAS: Raga[] = JANYA_BUILT;

const byId = new Map<string, Raga>(ALL_RAGAS.map((r) => [r.ragaId, r]));

export function getRagaById(id: string): Raga | undefined {
  return byId.get(id);
}

export function getRagaByName(name: string): Raga | null {
  const lower = name.trim().toLowerCase();
  return (
    ALL_RAGAS.find(
      (r) =>
        r.name.toLowerCase() === lower ||
        r.meta.otherNames.some((o) => o.toLowerCase() === lower)
    ) ?? null
  );
}

/** `popular_janya_ragas` entries are `raga_id` values; older data may use display names. */
export function getRagaByIdOrName(ref: string): Raga | undefined {
  const s = ref.trim();
  if (!s) return undefined;
  return getRagaById(s) ?? getRagaByName(s) ?? undefined;
}

/** Melakarta raga with the given mela number (1–72), if present in the catalog. */
export function getMelakartaByNumber(num: number): Raga | undefined {
  return MELAKARTA_RAGAS.find(
    (r) => r.meta.melakartaNumber === num || r.number === num
  );
}

/**
 * Equal temperament frequency for a Carnatic swara relative to Sa (`baseFreq`).
 */
export function getSwarafrequency(baseFreq: number, swara: string): number {
  const cleanSwara = swara.replace(/^[><]/, '');

  const swaraSemitones: { [key: string]: number } = {
    S: 0,
    R1: 1,
    R2: 2,
    R3: 3,
    G1: 2,
    G2: 3,
    G3: 4,
    M1: 5,
    M2: 6,
    P: 7,
    D1: 8,
    D2: 9,
    D3: 10,
    N1: 9,
    N2: 10,
    N3: 11,
  };

  const semitones = swaraSemitones[cleanSwara] ?? 0;
  const ratio = Math.pow(2, semitones / 12);
  return baseFreq * ratio;
}
