const TWELVE_DATA_KEY_STORAGE_KEY = 'pc:twelvedata:apiKey';

/**
 * Market data API key storage.
 *
 * Stored in localStorage, in the browser, per the person's explicit
 * choice (Commit 008b): "local/simple" over a backend proxy. This means
 * the key is visible to anyone with access to this browser/machine, and
 * would be visible in the bundle if this app is ever deployed publicly
 * rather than run locally. That trade-off was made knowingly — see
 * CHANGELOG Commit 008b.
 */
export function getTwelveDataApiKey(): string | null {
  try {
    return localStorage.getItem(TWELVE_DATA_KEY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setTwelveDataApiKey(key: string): void {
  localStorage.setItem(TWELVE_DATA_KEY_STORAGE_KEY, key);
}

export function clearTwelveDataApiKey(): void {
  localStorage.removeItem(TWELVE_DATA_KEY_STORAGE_KEY);
}
