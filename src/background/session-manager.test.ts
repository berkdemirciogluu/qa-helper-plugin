import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  startSession,
  stopSession,
  getSession,
  updateCounters,
  updateBadge,
} from './session-manager';

const mockStorageGet = vi.fn();
const mockStorageSet = vi.fn();
const mockStorageRemove = vi.fn();
const mockBadgeSetText = vi.fn();
const mockBadgeSetColor = vi.fn();

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: mockStorageGet,
      set: mockStorageSet,
      remove: mockStorageRemove,
    },
  },
  action: {
    setBadgeText: mockBadgeSetText,
    setBadgeBackgroundColor: mockBadgeSetColor,
  },
});

// flush-manager mock (clearFlushQueue çağrısı)
vi.mock('./flush-manager', () => ({
  clearFlushQueue: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockStorageRemove.mockResolvedValue(undefined);
});

describe('startSession', () => {
  it('storage\'a doğru key/value yazar ve success döner', async () => {
    mockStorageSet.mockResolvedValue(undefined);

    const result = await startSession(42, 'https://example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tabId).toBe(42);
      expect(result.data.url).toBe('https://example.com');
      expect(result.data.status).toBe('recording');
      expect(result.data.counters).toEqual({
        clicks: 0,
        xhrRequests: 0,
        consoleErrors: 0,
        navEvents: 0,
      });
      expect(typeof result.data.startTime).toBe('number');
    }

    expect(mockStorageSet).toHaveBeenCalledWith({
      session_meta_42: expect.objectContaining({
        tabId: 42,
        url: 'https://example.com',
        status: 'recording',
      }),
    });
  });

  it('mevcut session varsa üzerine yazar', async () => {
    mockStorageSet.mockResolvedValue(undefined);

    await startSession(42, 'https://site-a.com');
    await startSession(42, 'https://site-b.com');

    expect(mockStorageSet).toHaveBeenCalledTimes(2);
    const secondCall = mockStorageSet.mock.calls[1][0] as Record<string, unknown>;
    const meta = secondCall['session_meta_42'] as { url: string };
    expect(meta.url).toBe('https://site-b.com');
  });

  it('storage hatası olduğunda failure döner', async () => {
    mockStorageSet.mockRejectedValue(new Error('Quota exceeded'));

    const result = await startSession(42, 'https://example.com');
    expect(result.success).toBe(false);
  });

  it('eski session event verilerini temizler', async () => {
    mockStorageSet.mockResolvedValue(undefined);

    await startSession(42, 'https://example.com');

    // 4 event key temizlenmeli: xhr, clicks, console, nav
    expect(mockStorageRemove).toHaveBeenCalledTimes(4);
    expect(mockStorageRemove).toHaveBeenCalledWith('session_xhr_42');
    expect(mockStorageRemove).toHaveBeenCalledWith('session_clicks_42');
    expect(mockStorageRemove).toHaveBeenCalledWith('session_console_42');
    expect(mockStorageRemove).toHaveBeenCalledWith('session_nav_42');
  });

  it('startSession başarılı olduğunda yeşil badge ayarlar', async () => {
    mockStorageSet.mockResolvedValue(undefined);

    await startSession(42, 'https://example.com');

    expect(mockBadgeSetText).toHaveBeenCalledWith({ text: ' ', tabId: 42 });
    expect(mockBadgeSetColor).toHaveBeenCalledWith({ color: '#22c55e', tabId: 42 });
  });
});

describe('stopSession', () => {
  it('status\'u \'stopped\' olarak günceller', async () => {
    const existingMeta = {
      tabId: 42,
      startTime: 1000,
      url: 'https://example.com',
      status: 'recording',
      counters: { clicks: 1, xhrRequests: 0, consoleErrors: 0, navEvents: 0 },
    };
    mockStorageGet.mockResolvedValue({ session_meta_42: existingMeta });
    mockStorageSet.mockResolvedValue(undefined);

    const result = await stopSession(42);

    expect(result.success).toBe(true);
    expect(mockStorageSet).toHaveBeenCalledWith({
      session_meta_42: expect.objectContaining({ status: 'stopped' }),
    });
  });

  it('session yoksa graceful handle eder', async () => {
    mockStorageGet.mockResolvedValue({});

    const result = await stopSession(42);
    expect(result.success).toBe(true);
    expect(mockStorageSet).not.toHaveBeenCalled();
  });

  it('badge\'i temizler', async () => {
    const existingMeta = {
      tabId: 42, startTime: 1000, url: 'https://x.com', status: 'recording',
      counters: { clicks: 0, xhrRequests: 0, consoleErrors: 0, navEvents: 0 },
    };
    mockStorageGet.mockResolvedValue({ session_meta_42: existingMeta });
    mockStorageSet.mockResolvedValue(undefined);

    await stopSession(42);

    expect(mockBadgeSetText).toHaveBeenCalledWith({ text: '', tabId: 42 });
  });
});

describe('getSession', () => {
  it('session varsa döner', async () => {
    const meta = {
      tabId: 42, startTime: 1000, url: 'https://x.com', status: 'recording',
      counters: { clicks: 0, xhrRequests: 0, consoleErrors: 0, navEvents: 0 },
    };
    mockStorageGet.mockResolvedValue({ session_meta_42: meta });

    const result = await getSession(42);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(meta);
    }
  });

  it('session yoksa null döner (error değil)', async () => {
    mockStorageGet.mockResolvedValue({});

    const result = await getSession(42);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });
});

describe('updateCounters', () => {
  const baseMeta = {
    tabId: 42, startTime: 1000, url: 'https://x.com', status: 'recording',
    counters: { clicks: 0, xhrRequests: 0, consoleErrors: 0, navEvents: 0 },
  };

  it('click sayacını artırır', async () => {
    mockStorageGet.mockResolvedValue({ session_meta_42: { ...baseMeta } });
    mockStorageSet.mockResolvedValue(undefined);

    await updateCounters(42, 'click', 3);

    const stored = (mockStorageSet.mock.calls[0][0] as Record<string, unknown>)['session_meta_42'] as typeof baseMeta;
    expect(stored.counters.clicks).toBe(3);
  });

  it('xhr sayacını artırır', async () => {
    mockStorageGet.mockResolvedValue({ session_meta_42: { ...baseMeta } });
    mockStorageSet.mockResolvedValue(undefined);

    await updateCounters(42, 'xhr', 2);

    const stored = (mockStorageSet.mock.calls[0][0] as Record<string, unknown>)['session_meta_42'] as typeof baseMeta;
    expect(stored.counters.xhrRequests).toBe(2);
  });

  it('consoleError sayacını artırır ve kırmızı badge ayarlar', async () => {
    mockStorageGet.mockResolvedValue({
      session_meta_42: { ...baseMeta, counters: { clicks: 0, xhrRequests: 0, consoleErrors: 1, navEvents: 0 } },
    });
    mockStorageSet.mockResolvedValue(undefined);

    await updateCounters(42, 'consoleError', 2);

    const stored = (mockStorageSet.mock.calls[0][0] as Record<string, unknown>)['session_meta_42'] as typeof baseMeta;
    expect(stored.counters.consoleErrors).toBe(3);
    expect(mockBadgeSetText).toHaveBeenCalledWith({ text: '3', tabId: 42 });
    expect(mockBadgeSetColor).toHaveBeenCalledWith({ color: '#ef4444', tabId: 42 });
  });

  it('session yoksa failure döner', async () => {
    mockStorageGet.mockResolvedValue({});

    const result = await updateCounters(42, 'click', 1);
    expect(result.success).toBe(false);
  });
});

describe('updateBadge', () => {
  it('errorCount=0 → yeşil badge', () => {
    updateBadge(42, 0);
    expect(mockBadgeSetText).toHaveBeenCalledWith({ text: ' ', tabId: 42 });
    expect(mockBadgeSetColor).toHaveBeenCalledWith({ color: '#22c55e', tabId: 42 });
  });

  it('errorCount>0 → kırmızı badge + sayı', () => {
    updateBadge(42, 5);
    expect(mockBadgeSetText).toHaveBeenCalledWith({ text: '5', tabId: 42 });
    expect(mockBadgeSetColor).toHaveBeenCalledWith({ color: '#ef4444', tabId: 42 });
  });

  it('errorCount=null → badge siler', () => {
    updateBadge(42, null);
    expect(mockBadgeSetText).toHaveBeenCalledWith({ text: '', tabId: 42 });
    expect(mockBadgeSetColor).not.toHaveBeenCalled();
  });
});
