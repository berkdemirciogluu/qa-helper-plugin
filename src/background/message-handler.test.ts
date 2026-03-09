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

// index mock — tabPreviousUrls for QUERY_RECORDING_STATE
vi.mock('./index', () => ({
  tabPreviousUrls: new Map<number, string>(),
}));

// Captured onMessage listener
type MessageHandler = (
  message: { action: string; payload: unknown },
  sender: chrome.runtime.MessageSender,
  sendResponse: (r: unknown) => void
) => boolean;

let capturedListener: MessageHandler | null = null;

const mockSendTabMessage = vi.fn().mockResolvedValue(undefined);

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
    sendMessage: mockSendTabMessage,
    onActivated: {
      addListener: vi.fn(),
    },
  },
});

async function dispatch(
  action: string,
  payload: unknown,
  sender?: Partial<chrome.runtime.MessageSender>
): Promise<unknown> {
  return new Promise((resolve) => {
    if (!capturedListener) throw new Error('No listener registered');
    capturedListener(
      { action, payload },
      (sender ?? {}) as chrome.runtime.MessageSender,
      (response) => resolve(response)
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
  it('registers onMessage listener', () => {
    expect(capturedListener).not.toBeNull();
  });
});

describe('START_SESSION message', () => {
  it('calls startSession and returns success response', async () => {
    const meta: SessionMeta = {
      tabId: 42,
      startTime: 1000,
      url: 'https://example.com',
      status: 'recording',
      counters: { clicks: 0, xhrRequests: 0, consoleErrors: 0, navEvents: 0 },
    };
    mockStartSession.mockResolvedValue({ success: true, data: meta });

    const response = (await dispatch('START_SESSION', {
      tabId: 42,
      url: 'https://example.com',
    })) as { success: boolean; data: SessionMeta };

    expect(mockStartSession).toHaveBeenCalledWith(42, 'https://example.com');
    expect(response.success).toBe(true);
    expect(response.data).toEqual(meta);
  });

  it('returns error response on startSession failure', async () => {
    mockStartSession.mockResolvedValue({ success: false, error: 'Quota exceeded' });

    const response = (await dispatch('START_SESSION', { tabId: 42, url: 'https://x.com' })) as {
      success: boolean;
      error: string;
    };

    expect(response.success).toBe(false);
    expect(response.error).toBe('Quota exceeded');
  });
});

describe('STOP_SESSION message', () => {
  it('calls stopSession and returns success response', async () => {
    mockStopSession.mockResolvedValue({ success: true, data: undefined });

    const response = (await dispatch('STOP_SESSION', { tabId: 42 })) as { success: boolean };

    expect(mockStopSession).toHaveBeenCalledWith(42);
    expect(response.success).toBe(true);
  });
});

describe('GET_SESSION_STATUS message', () => {
  it('calls getSession and returns session data in response', async () => {
    const meta: SessionMeta = {
      tabId: 42,
      startTime: 1000,
      url: 'https://example.com',
      status: 'recording',
      counters: { clicks: 0, xhrRequests: 0, consoleErrors: 0, navEvents: 0 },
    };
    mockGetSession.mockResolvedValue({ success: true, data: meta });

    const response = (await dispatch('GET_SESSION_STATUS', { tabId: 42 })) as {
      success: boolean;
      data: SessionMeta;
    };

    expect(mockGetSession).toHaveBeenCalledWith(42);
    expect(response.success).toBe(true);
    expect(response.data).toEqual(meta);
  });

  it('returns null when no session exists', async () => {
    mockGetSession.mockResolvedValue({ success: true, data: null });

    const response = (await dispatch('GET_SESSION_STATUS', { tabId: 99 })) as {
      success: boolean;
      data: null;
    };

    expect(response.success).toBe(true);
    expect(response.data).toBeNull();
  });
});

describe('FLUSH_DATA message', () => {
  const recordingSession = {
    success: true,
    data: {
      tabId: 42,
      startTime: 1000,
      url: 'https://example.com',
      status: 'recording',
      counters: { clicks: 0, xhrRequests: 0, consoleErrors: 0, navEvents: 0 },
    },
  };

  it('calls enqueueFlush and returns success response', async () => {
    mockGetSession.mockResolvedValue(recordingSession);
    mockEnqueueFlush.mockResolvedValue(undefined);

    const payload = {
      tabId: 42,
      dataType: 'click' as const,
      events: [{ type: 'click', timestamp: 1, selector: 'btn', text: 'OK', x: 0, y: 0 }],
    };

    const response = (await dispatch('FLUSH_DATA', payload)) as { success: boolean };

    expect(mockEnqueueFlush).toHaveBeenCalledWith(42, 'click', payload.events, undefined);
    expect(response.success).toBe(true);
  });

  it('xhr event → updateCounters is called', async () => {
    mockGetSession.mockResolvedValue(recordingSession);
    mockEnqueueFlush.mockResolvedValue(undefined);

    const payload = {
      tabId: 42,
      dataType: 'xhr' as const,
      events: [
        {
          type: 'xhr',
          timestamp: 1,
          method: 'GET',
          url: 'https://api.x.com',
          status: 200,
          duration: 50,
        },
        {
          type: 'xhr',
          timestamp: 2,
          method: 'POST',
          url: 'https://api.x.com',
          status: 201,
          duration: 80,
        },
      ],
    };

    await dispatch('FLUSH_DATA', payload);

    expect(mockUpdateCounters).toHaveBeenCalledWith(42, 'xhr', 2);
  });

  it('console error event → consoleError counter is updated', async () => {
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

    // Only error level events are counted
    expect(mockUpdateCounters).toHaveBeenCalledWith(42, 'consoleError', 1);
  });

  it('skips flush when session is not recording', async () => {
    mockGetSession.mockResolvedValue({
      success: true,
      data: {
        tabId: 42,
        startTime: 1000,
        url: 'https://x.com',
        status: 'stopped',
        counters: { clicks: 0, xhrRequests: 0, consoleErrors: 0, navEvents: 0 },
      },
    });

    const payload = {
      tabId: 42,
      dataType: 'click' as const,
      events: [{ type: 'click', timestamp: 1, selector: 'btn', text: 'OK', x: 0, y: 0 }],
    };

    const response = (await dispatch('FLUSH_DATA', payload)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mockEnqueueFlush).not.toHaveBeenCalled();
  });

  it('skips flush when no session exists', async () => {
    mockGetSession.mockResolvedValue({ success: true, data: null });

    const payload = {
      tabId: 99,
      dataType: 'click' as const,
      events: [{ type: 'click', timestamp: 1, selector: 'btn', text: 'OK', x: 0, y: 0 }],
    };

    const response = (await dispatch('FLUSH_DATA', payload)) as { success: boolean };

    expect(response.success).toBe(true);
    expect(mockEnqueueFlush).not.toHaveBeenCalled();
  });
});

describe('Payload validation', () => {
  it('START_SESSION — returns error when tabId or url is missing', async () => {
    const response = (await dispatch('START_SESSION', { tabId: 42 })) as {
      success: boolean;
      error: string;
    };

    expect(response.success).toBe(false);
    expect(response.error).toContain('Invalid payload');
  });

  it('FLUSH_DATA — returns error when events is missing', async () => {
    const response = (await dispatch('FLUSH_DATA', { tabId: 42, dataType: 'click' })) as {
      success: boolean;
      error: string;
    };

    expect(response.success).toBe(false);
    expect(response.error).toContain('Invalid payload');
  });
});

describe('Unknown action', () => {
  it('returns error response', async () => {
    const response = (await dispatch('UNKNOWN_ACTION', {})) as { success: boolean; error: string };

    expect(response.success).toBe(false);
    expect(response.error).toBe('Unknown action');
  });
});

// START_SESSION sends START_RECORDING to content script
describe('START_SESSION → content script START_RECORDING', () => {
  it('sends START_RECORDING to content script on successful startSession', async () => {
    const meta: SessionMeta = {
      tabId: 42,
      startTime: 1000,
      url: 'https://example.com',
      status: 'recording',
      counters: { clicks: 0, xhrRequests: 0, consoleErrors: 0, navEvents: 0 },
    };
    mockStartSession.mockResolvedValue({ success: true, data: meta });

    await dispatch('START_SESSION', { tabId: 42, url: 'https://example.com' });

    // sendTabMessage calls chrome.tabs.sendMessage
    // message-handler calls sendTabMessage as fire-and-forget
    await vi.waitFor(() => {
      expect(mockSendTabMessage).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          action: 'START_RECORDING',
          payload: { tabId: 42 },
        })
      );
    });
  });

  it('does not send message to content script when startSession fails', async () => {
    mockStartSession.mockResolvedValue({ success: false, error: 'Failed' });

    await dispatch('START_SESSION', { tabId: 42, url: 'https://example.com' });

    expect(mockSendTabMessage).not.toHaveBeenCalled();
  });
});

// STOP_SESSION sends STOP_RECORDING to content script
describe('STOP_SESSION → content script STOP_RECORDING', () => {
  it('sends STOP_RECORDING to content script on successful stopSession', async () => {
    mockStopSession.mockResolvedValue({ success: true, data: undefined });

    await dispatch('STOP_SESSION', { tabId: 42 });

    await vi.waitFor(() => {
      expect(mockSendTabMessage).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          action: 'STOP_RECORDING',
          payload: { tabId: 42 },
        })
      );
    });
  });

  it('does not send message to content script when stopSession fails', async () => {
    mockStopSession.mockResolvedValue({ success: false, error: 'No session' });

    await dispatch('STOP_SESSION', { tabId: 42 });

    expect(mockSendTabMessage).not.toHaveBeenCalled();
  });
});

// QUERY_RECORDING_STATE — content script recording state query
describe('QUERY_RECORDING_STATE', () => {
  it('returns { recording: true, tabId } when session is recording', async () => {
    const meta: SessionMeta = {
      tabId: 42,
      startTime: 1000,
      url: 'https://example.com',
      status: 'recording',
      counters: { clicks: 0, xhrRequests: 0, consoleErrors: 0, navEvents: 0 },
    };
    mockGetSession.mockResolvedValue({ success: true, data: meta });

    const response = (await dispatch(
      'QUERY_RECORDING_STATE',
      {},
      { tab: { id: 42 } as chrome.tabs.Tab }
    )) as { success: boolean; data: { recording: boolean; tabId: number } };

    expect(response.success).toBe(true);
    expect(response.data.recording).toBe(true);
    expect(response.data.tabId).toBe(42);
  });

  it('returns { recording: false } when no session exists', async () => {
    mockGetSession.mockResolvedValue({ success: true, data: null });

    const response = (await dispatch(
      'QUERY_RECORDING_STATE',
      {},
      { tab: { id: 99 } as chrome.tabs.Tab }
    )) as { success: boolean; data: { recording: boolean; tabId: number } };

    expect(response.success).toBe(true);
    expect(response.data.recording).toBe(false);
  });

  it('returns error when sender.tab is missing', async () => {
    const response = (await dispatch('QUERY_RECORDING_STATE', {}, {})) as {
      success: boolean;
      error: string;
    };

    expect(response.success).toBe(false);
    expect(response.error).toContain('No tab ID');
  });
});
