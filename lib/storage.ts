const PREFIX = 'carnatic-practice';

/**
 * Builds a namespaced storage key using the module prefix.
 *
 * @param k - Unprefixed storage key to namespace
 * @returns The namespaced storage key combining the module prefix and `k` separated by a colon
 */
function key(k: string): string {
  return `${PREFIX}:${k}`;
}

/**
 * Retrieve a JSON-parsed value from the module-prefixed localStorage key or fall back to a provided default.
 *
 * @param storageKey - The unprefixed storage key; the implementation will namespace it with the module prefix before accessing localStorage.
 * @param defaultValue - Value returned when running outside a browser, when no stored value exists, or when stored data is not valid JSON.
 * @returns The stored value parsed as `T` if present and valid; otherwise `defaultValue`.
 */
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

/**
 * Stores a value in localStorage under a namespaced key.
 *
 * If not running in a browser, this is a no-op. Errors during JSON serialization or storage (for example quota limits or private browsing restrictions) are silently ignored.
 *
 * @param storageKey - The storage key name (will be prefixed for namespacing)
 * @param value - The value to serialize to JSON and store
 */
export function setStored(storageKey: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key(storageKey), JSON.stringify(value));
  } catch {
    // ignore quota / private mode
  }
}