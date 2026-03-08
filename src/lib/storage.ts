import type { Result, SessionMeta, StorageUsageInfo } from './types';

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

/** Silinecek session key prefix'leri — config ve credentials korunur */
const SESSION_PREFIXES = [
  'session_meta_',
  'session_xhr_',
  'session_clicks_',
  'session_console_',
  'session_nav_',
  'session_snapshot_',
];

/** Tüm session_* key'lerini döner (config/credentials hariç) */
export async function storageGetAllSessionKeys(): Promise<Result<string[]>> {
  try {
    const allData = await chrome.storage.local.get(null);
    const sessionKeys = Object.keys(allData).filter((key) =>
      SESSION_PREFIXES.some((prefix) => key.startsWith(prefix)),
    );
    return { success: true, data: sessionKeys };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[Storage] getAllSessionKeys failed:', error);
    return { success: false, error };
  }
}

/** Tüm session verilerini temizler — config ve credentials korunur */
export async function storageClearSessions(): Promise<Result<void>> {
  try {
    const allData = await chrome.storage.local.get(null);
    const keysToRemove: string[] = [];

    for (const key of Object.keys(allData)) {
      if (SESSION_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
    }

    console.log(`[Storage] clearSessions: ${keysToRemove.length} key silindi`);
    return { success: true, data: undefined };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[Storage] clearSessions failed:', error);
    return { success: false, error };
  }
}

/** Depolama kullanım bilgisi — toplam byte, session sayısı, session listesi */
export async function storageGetUsage(): Promise<Result<StorageUsageInfo>> {
  try {
    const allData = await chrome.storage.local.get(null);
    const totalBytes = await chrome.storage.local.getBytesInUse(null);

    const sessions: StorageUsageInfo['sessions'] = [];
    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith('session_meta_')) {
        const meta = value as Record<string, unknown>;
        if (
          meta &&
          typeof meta === 'object' &&
          typeof meta.url === 'string' &&
          typeof meta.startTime === 'number' &&
          typeof meta.status === 'string' &&
          meta.counters &&
          typeof meta.counters === 'object'
        ) {
          const counters = meta.counters as Record<string, unknown>;
          const tabId = parseInt(key.replace('session_meta_', ''), 10);
          sessions.push({
            tabId,
            url: meta.url as string,
            startTime: meta.startTime as number,
            status: meta.status as SessionMeta['status'],
            eventCount:
              (typeof counters.clicks === 'number' ? counters.clicks : 0) +
              (typeof counters.xhrRequests === 'number' ? counters.xhrRequests : 0) +
              (typeof counters.consoleErrors === 'number' ? counters.consoleErrors : 0) +
              (typeof counters.navEvents === 'number' ? counters.navEvents : 0),
          });
        }
      }
    }

    return { success: true, data: { totalBytes, sessionCount: sessions.length, sessions } };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[Storage] getUsage failed:', error);
    return { success: false, error };
  }
}
