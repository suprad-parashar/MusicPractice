import { ALL_RAGAS, getRagaByIdOrName, type Raga } from '@/data/ragas';
import type { SongStanza } from './types';

const FALLBACK_RAGA_ID = 'malahari';

function fallbackRaga(): Raga {
  return getRagaByIdOrName(FALLBACK_RAGA_ID) ?? ALL_RAGAS[0];
}

/**
 * Resolve a stanza's raga from `raga_id` (preferred) or legacy `raga` display name.
 */
export function resolveStanzaRaga(stanza: SongStanza | undefined): Raga {
  const id = stanza?.raga_id?.trim();
  if (id) {
    const r = getRagaByIdOrName(id);
    if (r) return r;
  }
  const name = stanza?.raga?.trim();
  if (name) {
    const r = getRagaByIdOrName(name);
    if (r) return r;
  }
  return fallbackRaga();
}
