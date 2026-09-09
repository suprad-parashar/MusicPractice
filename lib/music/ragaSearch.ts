import type { Raga } from '@/data/ragas';

/** Lowercase ASCII-ish key: strip diacritics and non-alphanumeric for matching. */
export function normalizeSearchText(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const t = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = t;
    }
  }
  return dp[n];
}

function maxLevDistance(q: string): number {
  const n = q.length;
  if (n <= 4) return 0;
  if (n <= 8) return 1;
  return Math.min(3, Math.floor(n / 5));
}

/**
 * Lower score = better match. `null` = no match.
 * Considers primary name and all `otherNames` (with Unicode folded).
 */
export function scoreRagaSearch(raga: Raga, query: string): number | null {
  const q = normalizeSearchText(query);
  if (q.length === 0) return 0;

  const candidates = [raga.name, ...raga.meta.otherNames];
  let best: number | null = null;

  for (const raw of candidates) {
    const c = normalizeSearchText(raw);
    if (!c) continue;

    if (c === q) {
      return 0;
    }
    if (c.startsWith(q)) {
      best = Math.min(best ?? 999, 1);
      continue;
    }
    if (c.includes(q)) {
      best = Math.min(best ?? 999, 2);
      continue;
    }
    if (q.includes(c) && c.length >= 4) {
      best = Math.min(best ?? 999, 3);
      continue;
    }
    if (q.length >= 4 && c.length >= 4) {
      const d = levenshtein(q, c);
      if (d <= maxLevDistance(q)) {
        best = Math.min(best ?? 999, 10 + d);
      }
    }
  }

  return best;
}

export function filterAndSortRagasBySearch(ragas: Raga[], query: string): Raga[] {
  const q = query.trim();
  if (q.length === 0) return ragas;

  const scored: { raga: Raga; score: number }[] = [];
  for (const raga of ragas) {
    const score = scoreRagaSearch(raga, q);
    if (score !== null) {
      scored.push({ raga, score });
    }
  }
  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.raga.name.localeCompare(b.raga.name);
  });
  return scored.map((x) => x.raga);
}
