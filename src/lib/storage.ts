import type { Result } from './types';

/**
 * chrome.storage.local wrapper — tüm işlemler Result<T> pattern ile döner.
 */

export async function storageGet<T>(key: string): Promise<Result<T | null>> {
  try {
    const result = await chrome.storage.local.get(key);
    const data = key in result ? (result[key] as T) : null;
    console.log(`[Storage] get "${key}":`, data);
    return { success: true, data };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[Storage] get "${key}" failed:`, error);
    return { success: false, error };
  }
}

export async function storageSet<T>(key: string, value: T): Promise<Result<void>> {
  try {
    await chrome.storage.local.set({ [key]: value });
    console.log(`[Storage] set "${key}" ✓`);
    return { success: true, data: undefined };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[Storage] set "${key}" failed:`, error);
    return { success: false, error };
  }
}

export async function storageRemove(key: string): Promise<Result<void>> {
  try {
    await chrome.storage.local.remove(key);
    console.log(`[Storage] remove "${key}" ✓`);
    return { success: true, data: undefined };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[Storage] remove "${key}" failed:`, error);
    return { success: false, error };
  }
}

export async function storageClear(): Promise<Result<void>> {
  try {
    await chrome.storage.local.clear();
    console.log('[Storage] clear ✓');
    return { success: true, data: undefined };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[Storage] clear failed:', error);
    return { success: false, error };
  }
}

/** Oturum verisi için bileşik anahtar: `${prefix}_${tabId}` */
export function getSessionKey(prefix: string, tabId: number): string {
  return `${prefix}_${tabId}`;
}
