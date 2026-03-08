import { STORAGE_KEYS, FLUSH_INTERVAL_MS } from '../lib/constants';
import { storageGet, storageSet, getSessionKey } from '../lib/storage';
import type { TimelineEvent, ConsoleEvent, XhrEvent } from '../lib/types';

type DataType = 'xhr' | 'click' | 'console' | 'nav';

const pendingBuffers = new Map<string, TimelineEvent[]>();
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Read-then-write race condition'ı önleyen per-key lock
const flushLocks = new Map<string, Promise<void>>();

function withFlushLock(bufferKey: string, fn: () => Promise<void>): Promise<void> {
  const prev = flushLocks.get(bufferKey) ?? Promise.resolve();
  const execute = prev.then(() => fn());
  flushLocks.set(bufferKey, execute.then(() => undefined, () => undefined));
  return execute;
}

function getStorageKey(dataType: DataType, tabId: number): string {
  switch (dataType) {
    case 'xhr':
      return getSessionKey(STORAGE_KEYS.SESSION_XHR, tabId);
    case 'click':
      return getSessionKey(STORAGE_KEYS.SESSION_CLICKS, tabId);
    case 'console':
      return getSessionKey(STORAGE_KEYS.SESSION_CONSOLE, tabId);
    case 'nav':
      return getSessionKey(STORAGE_KEYS.SESSION_NAV, tabId);
  }
}

function getBufferKey(tabId: number, dataType: DataType): string {
  return `${tabId}_${dataType}`;
}

async function flushBuffer(tabId: number, dataType: DataType): Promise<void> {
  const bufferKey = getBufferKey(tabId, dataType);
  const pending = pendingBuffers.get(bufferKey);
  if (!pending || pending.length === 0) return;

  pendingBuffers.delete(bufferKey);
  pendingTimers.delete(bufferKey);

  await withFlushLock(bufferKey, async () => {
    const storageKey = getStorageKey(dataType, tabId);
    const existing = await storageGet<TimelineEvent[]>(storageKey);
    const existingEvents = existing.success && existing.data ? existing.data : [];
    const result = await storageSet(storageKey, [...existingEvents, ...pending]);
    if (!result.success) {
      console.error(`[FlushManager] Storage write failed for ${storageKey}:`, result.error);
    }
  });
}

async function flushImmediate(tabId: number, dataType: DataType, events: TimelineEvent[]): Promise<void> {
  const bufferKey = getBufferKey(tabId, dataType);

  const timer = pendingTimers.get(bufferKey);
  if (timer !== undefined) {
    clearTimeout(timer);
    pendingTimers.delete(bufferKey);
  }

  const buffered = pendingBuffers.get(bufferKey) ?? [];
  pendingBuffers.delete(bufferKey);

  const allEvents = [...buffered, ...events];
  if (allEvents.length === 0) return;

  await withFlushLock(bufferKey, async () => {
    const storageKey = getStorageKey(dataType, tabId);
    const existing = await storageGet<TimelineEvent[]>(storageKey);
    const existingEvents = existing.success && existing.data ? existing.data : [];
    const result = await storageSet(storageKey, [...existingEvents, ...allEvents]);
    if (!result.success) {
      console.error(`[FlushManager] Storage write failed for ${storageKey}:`, result.error);
    }
  });
}

function scheduleFlush(tabId: number, dataType: DataType): void {
  const bufferKey = getBufferKey(tabId, dataType);
  const existing = pendingTimers.get(bufferKey);
  if (existing !== undefined) {
    clearTimeout(existing);
  }
  const timer = setTimeout(() => {
    flushBuffer(tabId, dataType).catch((err: unknown) => {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[FlushManager] flushBuffer failed for ${bufferKey}:`, error);
    });
  }, FLUSH_INTERVAL_MS);
  pendingTimers.set(bufferKey, timer);
}

export async function enqueueFlush(
  tabId: number,
  dataType: DataType,
  events: TimelineEvent[],
  critical?: boolean,
): Promise<void> {
  const hasCriticalConsole = events.some(
    (e) => e.type === 'console' && (e as ConsoleEvent).level === 'error',
  );
  const hasCriticalXhr = events.some(
    (e) => e.type === 'xhr' && (e as XhrEvent).status >= 400,
  );
  const isCritical = critical === true || hasCriticalConsole || hasCriticalXhr;

  if (isCritical) {
    await flushImmediate(tabId, dataType, events);
    return;
  }

  const bufferKey = getBufferKey(tabId, dataType);
  const current = pendingBuffers.get(bufferKey) ?? [];
  pendingBuffers.set(bufferKey, [...current, ...events]);
  scheduleFlush(tabId, dataType);
}

export function clearFlushQueue(tabId: number): void {
  for (const dataType of ['xhr', 'click', 'console', 'nav'] as DataType[]) {
    const bufferKey = getBufferKey(tabId, dataType);
    const timer = pendingTimers.get(bufferKey);
    if (timer !== undefined) {
      clearTimeout(timer);
      pendingTimers.delete(bufferKey);
    }
    pendingBuffers.delete(bufferKey);
    flushLocks.delete(bufferKey);
  }
}
