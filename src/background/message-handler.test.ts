import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMessageHandler } from './message-handler';
import type { SessionMeta } from '../lib/types';

// session-manager mock
const mockStartSession = vi.fn();
const mockStopSession = vi.fn();
const mockGetSession = vi.fn();
const mockUpdateCounters = vi.fn();

vi.mock('./session-manager', () => ({
  startSession: (...args: unknown[]) => mockStartSession(...args),
  stopSession: (...args: unknown[]) => mockStopSession(...args),
  getSession: (...args: unknown[]) => mockGetSession(...args),
  updateCounters: (...args: unknown[]) => mockUpdateCounters(...args),
  updateBadge: vi.fn(),
}));

// flush-manager mock
const mockEnqueueFlush = vi.fn();

vi.mock('./flush-manager', () => ({
  enqueueFlush: (...args: unknown[]) => mockEnqueueFlush(...args),
  clearFlushQueue: vi.fn(),
}));

// onMessage listener'ı yakalayacak değişken
type MessageHandler = (
  message: { action: string; payload: unknown },
  sender: chrome.runtime.MessageSender,
  sendResponse: (r: unknown) => void,
) => boolean;

let capturedListener: MessageHandler | null = null;

vi.stubGlobal('chrome', {
  runtime: {
    onMessage: {
      addListener: (fn: MessageHandler) => {
        capturedListener = fn;
      },
    },
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
  tabs: {
    onActivated: {
      addListener: vi.fn(),
    },
  },
});

async function dispatch(action: string, payload: unknown): Promise<unknown> {
  return new Promise((resolve) => {
    if (!capturedListener) throw new Error('No listener registered');
    capturedListener(
      { action, payload },
      {} as chrome.runtime.MessageSender,
      (response) => resolve(response),
    );
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  capturedListener = null;
  mockUpdateCounters.mockResolvedValue({ success: true, data: undefined });
  setupMessageHandler();
});

describe('setupMessageHandler', () => {
  it('onMessage listener kayıt eder', () => {
    expect(capturedListener).not.toBeNull();
  });
});

describe('START_SESSION mesajı', () => {
  it('startSession çağrılır ve success response döner', async () => {
    const meta: SessionMeta = {
      tabId: 42, startTime: 1000, url: 'https://example.com', status: 'recording',
      counters: { clicks: 0, xhrRequests: 0, consoleErrors: 0, navEvents: 0 },
    };
    mockStartSession.mockResolvedValue({ success: true, data: meta });

    const response = await dispatch('START_SESSION', { tabId: 42, url: 'https://example.com' }) as { success: boolean; data: SessionMeta };

    expect(mockStartSession).toHaveBeenCalledWith(42, 'https://example.com');
    expect(response.success).toBe(true);
    expect(response.data).toEqual(meta);
  });

  it('startSession başarısız olursa error response döner', async () => {
    mockStartSession.mockResolvedValue({ success: false, error: 'Quota exceeded' });

    const response = await dispatch('START_SESSION', { tabId: 42, url: 'https://x.com' }) as { success: boolean; error: string };

    expect(response.success).toBe(false);
    expect(response.error).toBe('Quota exceeded');
  });
});

describe('STOP_SESSION mesajı', () => {
  it('stopSession çağrılır ve success response döner', async () => {
    mockStopSession.mockResolvedValue({ success: true, data: undefined });

    const response = await dispatch('STOP_SESSION', { tabId: 42 }) as { success: boolean };

    expect(mockStopSession).toHaveBeenCalledWith(42);
    expect(response.success).toBe(true);
  });
});

describe('GET_SESSION_STATUS mesajı', () => {
  it('getSession çağrılır ve session data response\'ta döner', async () => {
    const meta: SessionMeta = {
      tabId: 42, startTime: 1000, url: 'https://example.com', status: 'recording',
      counters: { clicks: 0, xhrRequests: 0, consoleErrors: 0, navEvents: 0 },
    };
    mockGetSession.mockResolvedValue({ success: true, data: meta });

    const response = await dispatch('GET_SESSION_STATUS', { tabId: 42 }) as { success: boolean; data: SessionMeta };

    expect(mockGetSession).toHaveBeenCalledWith(42);
    expect(response.success).toBe(true);
    expect(response.data).toEqual(meta);
  });

  it('session yoksa null döner', async () => {
    mockGetSession.mockResolvedValue({ success: true, data: null });

    const response = await dispatch('GET_SESSION_STATUS', { tabId: 99 }) as { success: boolean; data: null };

    expect(response.success).toBe(true);
    expect(response.data).toBeNull();
  });
});

describe('FLUSH_DATA mesajı', () => {
  const recordingSession = {
    success: true,
    data: {
      tabId: 42, startTime: 1000, url: 'https://example.com', status: 'recording',
      counters: { clicks: 0, xhrRequests: 0, consoleErrors: 0, navEvents: 0 },
    },
  };

  it('enqueueFlush çağrılır ve success response döner', async () => {
    mockGetSession.mockResolvedValue(recordingSession);
    mockEnqueueFlush.mockResolvedValue(undefined);

    const payload = {
      tabId: 42,
      dataType: 'click' as const,
      events: [{ type: 'click', timestamp: 1, selector: 'btn', text: 'OK', x: 0, y: 0 }],
    };

    const response = await dispatch('FLUSH_DATA', payload) as { success: boolean };

    expect(mockEnqueueFlush).toHaveBeenCalledWith(42, 'click', payload.events, undefined);
    expect(response.success).toBe(true);
  });

  it('xhr event → updateCounters çağrılır', async () => {
    mockGetSession.mockResolvedValue(recordingSession);
    mockEnqueueFlush.mockResolvedValue(undefined);

    const payload = {
      tabId: 42,
      dataType: 'xhr' as const,
      events: [
        { type: 'xhr', timestamp: 1, method: 'GET', url: 'https://api.x.com', status: 200, duration: 50 },
        { type: 'xhr', timestamp: 2, method: 'POST', url: 'https://api.x.com', status: 201, duration: 80 },
      ],
    };

    await dispatch('FLUSH_DATA', payload);

    expect(mockUpdateCounters).toHaveBeenCalledWith(42, 'xhr', 2);
  });

  it('console error event → consoleError sayacı güncellenir', async () => {
    mockGetSession.mockResolvedValue(recordingSession);
    mockEnqueueFlush.mockResolvedValue(undefined);

    const payload = {
      tabId: 42,
      dataType: 'console' as const,
      events: [
        { type: 'console', timestamp: 1, level: 'error', message: 'Failed!' },
        { type: 'console', timestamp: 2, level: 'log', message: 'Info' },
      ],
    };

    await dispatch('FLUSH_DATA', payload);

    // Sadece error level olanlar sayılır
    expect(mockUpdateCounters).toHaveBeenCalledWith(42, 'consoleError', 1);
  });

  it('session recording değilse flush atlanır', async () => {
    mockGetSession.mockResolvedValue({
      success: true,
      data: { tabId: 42, startTime: 1000, url: 'https://x.com', status: 'stopped', counters: { clicks: 0, xhrRequests: 0, consoleErrors: 0, navEvents: 0 } },
    });

    const payload = {
      tabId: 42,
      dataType: 'click' as const,
      events: [{ type: 'click', timestamp: 1, selector: 'btn', text: 'OK', x: 0, y: 0 }],
    };

    const response = await dispatch('FLUSH_DATA', payload) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mockEnqueueFlush).not.toHaveBeenCalled();
  });

  it('session yoksa flush atlanır', async () => {
    mockGetSession.mockResolvedValue({ success: true, data: null });

    const payload = {
      tabId: 99,
      dataType: 'click' as const,
      events: [{ type: 'click', timestamp: 1, selector: 'btn', text: 'OK', x: 0, y: 0 }],
    };

    const response = await dispatch('FLUSH_DATA', payload) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mockEnqueueFlush).not.toHaveBeenCalled();
  });
});

describe('Payload validation', () => {
  it('START_SESSION — tabId veya url eksikse error döner', async () => {
    const response = await dispatch('START_SESSION', { tabId: 42 }) as { success: boolean; error: string };

    expect(response.success).toBe(false);
    expect(response.error).toContain('Invalid payload');
  });

  it('FLUSH_DATA — events eksikse error döner', async () => {
    const response = await dispatch('FLUSH_DATA', { tabId: 42, dataType: 'click' }) as { success: boolean; error: string };

    expect(response.success).toBe(false);
    expect(response.error).toContain('Invalid payload');
  });
});

describe('Bilinmeyen action', () => {
  it('error response döner', async () => {
    const response = await dispatch('UNKNOWN_ACTION', {}) as { success: boolean; error: string };

    expect(response.success).toBe(false);
    expect(response.error).toBe('Unknown action');
  });
});
