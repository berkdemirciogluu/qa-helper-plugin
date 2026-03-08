import { STORAGE_KEYS } from '../lib/constants';
import { storageGet, storageSet, storageRemove, getSessionKey } from '../lib/storage';
import type { Result, SessionMeta } from '../lib/types';
import { clearFlushQueue } from './flush-manager';

// Read-then-write race condition'ı önleyen per-tab lock
const counterLocks = new Map<number, Promise<void>>();

function withCounterLock<T>(tabId: number, fn: () => Promise<T>): Promise<T> {
  const prev = counterLocks.get(tabId) ?? Promise.resolve();
  const execute = prev.then(() => fn());
  counterLocks.set(tabId, execute.then(() => undefined, () => undefined));
  return execute;
}

export async function startSession(tabId: number, url: string): Promise<Result<SessionMeta>> {
  const key = getSessionKey(STORAGE_KEYS.SESSION_META, tabId);

  // Eski session event verilerini temizle — veri bozulmasını önler
  clearFlushQueue(tabId);
  const eventKeys = [
    getSessionKey(STORAGE_KEYS.SESSION_XHR, tabId),
    getSessionKey(STORAGE_KEYS.SESSION_CLICKS, tabId),
    getSessionKey(STORAGE_KEYS.SESSION_CONSOLE, tabId),
    getSessionKey(STORAGE_KEYS.SESSION_NAV, tabId),
  ];
  await Promise.all(eventKeys.map((k) => storageRemove(k)));

  const meta: SessionMeta = {
    tabId,
    startTime: Date.now(),
    url,
    status: 'recording',
    counters: {
      clicks: 0,
      xhrRequests: 0,
      consoleErrors: 0,
      navEvents: 0,
    },
  };
  const result = await storageSet(key, meta);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  updateBadge(tabId, 0);
  return { success: true, data: meta };
}

export async function stopSession(tabId: number): Promise<Result<void>> {
  const key = getSessionKey(STORAGE_KEYS.SESSION_META, tabId);
  const existing = await storageGet<SessionMeta>(key);

  if (!existing.success) {
    return { success: false, error: existing.error };
  }

  if (!existing.data) {
    return { success: true, data: undefined };
  }

  const updated: SessionMeta = { ...existing.data, status: 'stopped' };
  const result = await storageSet(key, updated);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  clearFlushQueue(tabId);
  updateBadge(tabId, null);
  return { success: true, data: undefined };
}

export async function getSession(tabId: number): Promise<Result<SessionMeta | null>> {
  const key = getSessionKey(STORAGE_KEYS.SESSION_META, tabId);
  const result = await storageGet<SessionMeta>(key);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data };
}

export function updateCounters(
  tabId: number,
  type: 'click' | 'xhr' | 'consoleError' | 'nav',
  amount: number,
): Promise<Result<void>> {
  return withCounterLock(tabId, async () => {
    const key = getSessionKey(STORAGE_KEYS.SESSION_META, tabId);
    const existing = await storageGet<SessionMeta>(key);

    if (!existing.success) {
      return { success: false, error: existing.error } as Result<void>;
    }

    if (!existing.data) {
      return { success: false, error: 'Session not found' } as Result<void>;
    }

    const counters = { ...existing.data.counters };
    switch (type) {
      case 'click':
        counters.clicks += amount;
        break;
      case 'xhr':
        counters.xhrRequests += amount;
        break;
      case 'consoleError':
        counters.consoleErrors += amount;
        break;
      case 'nav':
        counters.navEvents += amount;
        break;
    }

    const updated: SessionMeta = { ...existing.data, counters };
    const result = await storageSet(key, updated);
    if (!result.success) {
      return { success: false, error: result.error } as Result<void>;
    }

    if (type === 'consoleError') {
      updateBadge(tabId, counters.consoleErrors);
    }

    return { success: true, data: undefined } as Result<void>;
  });
}

export function updateBadge(tabId: number, errorCount: number | null): void {
  if (errorCount === null) {
    chrome.action.setBadgeText({ text: '', tabId });
  } else if (errorCount === 0) {
    chrome.action.setBadgeText({ text: ' ', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId });
  } else {
    chrome.action.setBadgeText({ text: String(errorCount), tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId });
  }
}
