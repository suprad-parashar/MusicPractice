export const storageKey = (name: string) => `carnatic-practice:${name}`;

/** Storage is optional: private browsing and malformed JSON must not prevent practice. */
export function getStored<T>(name: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(storageKey(name));
    if (raw == null) return defaultValue;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStored(name: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(name), JSON.stringify(value));
  } catch {
    // Quota limits and private browsing should leave the in-memory settings usable.
  }
}
