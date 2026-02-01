const PREFIX = 'carnatic-practice';

function key(k: string): string {
  return `${PREFIX}:${k}`;
}

export function getStored<T>(storageKey: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key(storageKey));
    if (raw == null) return defaultValue;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStored(storageKey: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key(storageKey), JSON.stringify(value));
  } catch {
    // ignore quota / private mode
  }
}
