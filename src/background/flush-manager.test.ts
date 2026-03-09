import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enqueueFlush, clearFlushQueue } from './flush-manager';
import type { ConsoleEvent, XhrEvent, ClickEvent } from '../lib/types';

const mockStorageGet = vi.fn();
const mockStorageSet = vi.fn();

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: mockStorageGet,
      set: mockStorageSet,
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // Modül-level buffer/timer state'ini sıfırla
  clearFlushQueue(42);
  clearFlushQueue(99);
  mockStorageGet.mockResolvedValue({});
  mockStorageSet.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

const makeConsoleEvent = (level: 'log' | 'warn' | 'error' | 'info'): ConsoleEvent => ({
  type: 'console',
  timestamp: Date.now(),
  level,
  message: 'test message',
});

const makeXhrEvent = (status: number): XhrEvent => ({
  type: 'xhr',
  timestamp: Date.now(),
  method: 'GET',
  url: 'https://api.example.com',
  status,
  duration: 100,
});

const makeClickEvent = (): ClickEvent => ({
  type: 'click',
  timestamp: Date.now(),
  selector: 'button',
  text: 'Click me',
  x: 100,
  y: 200,
});

describe('enqueueFlush — non-critical', () => {
  it('does not write to storage before debounce expires', async () => {
    const event = makeClickEvent();
    await enqueueFlush(42, 'click', [event]);

    expect(mockStorageSet).not.toHaveBeenCalled();
  });

  it('writes to storage after debounce period (2500ms)', async () => {
    const event = makeClickEvent();
    await enqueueFlush(42, 'click', [event]);

    await vi.advanceTimersByTimeAsync(2500);

    expect(mockStorageSet).toHaveBeenCalledWith({
      session_clicks_42: [event],
    });
  });

  it('multiple events merge with debounce before writing', async () => {
    const e1 = makeClickEvent();
    const e2 = makeClickEvent();
    await enqueueFlush(42, 'click', [e1]);
    await enqueueFlush(42, 'click', [e2]);

    await vi.advanceTimersByTimeAsync(2500);

    expect(mockStorageSet).toHaveBeenCalledTimes(1);
    const stored = (mockStorageSet.mock.calls[0][0] as Record<string, unknown>)[
      'session_clicks_42'
    ] as ClickEvent[];
    expect(stored).toHaveLength(2);
  });
});

describe('enqueueFlush — ConsoleEvent level=error → immediate flush', () => {
  it('console error writes immediately', async () => {
    const errorEvent = makeConsoleEvent('error');
    await enqueueFlush(42, 'console', [errorEvent]);

    expect(mockStorageSet).toHaveBeenCalledWith({
      session_console_42: [errorEvent],
    });
  });

  it('console log/warn does not write immediately', async () => {
    const logEvent = makeConsoleEvent('log');
    await enqueueFlush(42, 'console', [logEvent]);

    expect(mockStorageSet).not.toHaveBeenCalled();
  });
});

describe('enqueueFlush — XhrEvent status>=400 → immediate flush', () => {
  it('status=500 writes immediately', async () => {
    const failedXhr = makeXhrEvent(500);
    await enqueueFlush(42, 'xhr', [failedXhr]);

    expect(mockStorageSet).toHaveBeenCalledWith({
      session_xhr_42: [failedXhr],
    });
  });

  it('status=404 writes immediately', async () => {
    const notFound = makeXhrEvent(404);
    await enqueueFlush(42, 'xhr', [notFound]);

    expect(mockStorageSet).toHaveBeenCalled();
  });

  it('status=200 does not write immediately', async () => {
    const okXhr = makeXhrEvent(200);
    await enqueueFlush(42, 'xhr', [okXhr]);

    expect(mockStorageSet).not.toHaveBeenCalled();
  });
});

describe('enqueueFlush — critical=true → immediate flush', () => {
  it('writes immediately with critical flag', async () => {
    const event = makeClickEvent();
    await enqueueFlush(42, 'click', [event], true);

    expect(mockStorageSet).toHaveBeenCalledWith({
      session_clicks_42: [event],
    });
  });
});

describe('flushBuffer — storage append pattern', () => {
  it('merges with existing storage data (append, not overwrite)', async () => {
    const existingEvent = makeClickEvent();
    const newEvent = makeClickEvent();

    mockStorageGet.mockResolvedValue({ session_clicks_42: [existingEvent] });

    await enqueueFlush(42, 'click', [newEvent]);
    await vi.advanceTimersByTimeAsync(2500);

    const stored = (mockStorageSet.mock.calls[0][0] as Record<string, unknown>)[
      'session_clicks_42'
    ] as ClickEvent[];
    expect(stored).toHaveLength(2);
    expect(stored[0]).toEqual(existingEvent);
    expect(stored[1]).toEqual(newEvent);
  });

  it('writes only new events when storage is empty', async () => {
    mockStorageGet.mockResolvedValue({});
    const event = makeClickEvent();

    await enqueueFlush(42, 'click', [event]);
    await vi.advanceTimersByTimeAsync(2500);

    const stored = (mockStorageSet.mock.calls[0][0] as Record<string, unknown>)[
      'session_clicks_42'
    ] as ClickEvent[];
    expect(stored).toHaveLength(1);
  });
});

describe('clearFlushQueue', () => {
  it('cancels timer — does not write even after debounce expires', async () => {
    const event = makeClickEvent();
    await enqueueFlush(42, 'click', [event]);

    clearFlushQueue(42);
    await vi.advanceTimersByTimeAsync(2500);

    expect(mockStorageSet).not.toHaveBeenCalled();
  });

  it('clears buffer — buffer stays empty after immediate flush', async () => {
    const event = makeClickEvent();
    await enqueueFlush(42, 'click', [event]);

    clearFlushQueue(42);

    // Başka bir critical event gelirse, buffer boş olmalı (sadece yeni event yazılmalı)
    const criticalEvent = makeConsoleEvent('error');
    await enqueueFlush(42, 'console', [criticalEvent]);

    // Sadece console event yazılmış olmalı, önceki click event değil
    expect(mockStorageSet).toHaveBeenCalledTimes(1);
    expect(mockStorageSet.mock.calls[0][0]).toHaveProperty('session_console_42');
  });
});
