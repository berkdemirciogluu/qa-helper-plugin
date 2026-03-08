import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  storageGet,
  storageSet,
  storageRemove,
  storageClear,
  getSessionKey,
  storageGetAllSessionKeys,
  storageClearSessions,
  storageGetUsage,
} from './storage';

// Mock chrome.storage.local
const mockStorageGet = vi.fn();
const mockStorageSet = vi.fn();
const mockStorageRemove = vi.fn();
const mockStorageClear = vi.fn();
const mockGetBytesInUse = vi.fn();

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: mockStorageGet,
      set: mockStorageSet,
      remove: mockStorageRemove,
      clear: mockStorageClear,
      getBytesInUse: mockGetBytesInUse,
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('storageGet', () => {
  it('returns success result with data when key exists', async () => {
    mockStorageGet.mockResolvedValue({ testKey: 'testValue' });
    const result = await storageGet<string>('testKey');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('testValue');
    }
  });

  it('returns success result with null when key does not exist', async () => {
    mockStorageGet.mockResolvedValue({});
    const result = await storageGet<string>('missingKey');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('returns failure result on chrome storage error', async () => {
    mockStorageGet.mockRejectedValue(new Error('Storage quota exceeded'));
    const result = await storageGet<string>('testKey');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Storage quota exceeded');
    }
  });
});

describe('storageSet', () => {
  it('returns success result on successful set', async () => {
    mockStorageSet.mockResolvedValue(undefined);
    const result = await storageSet('testKey', { data: 42 });
    expect(result.success).toBe(true);
  });

  it('returns failure result on chrome storage error', async () => {
    mockStorageSet.mockRejectedValue(new Error('Quota exceeded'));
    const result = await storageSet('testKey', 'value');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Quota exceeded');
    }
  });
});

describe('storageRemove', () => {
  it('returns success result on successful remove', async () => {
    mockStorageRemove.mockResolvedValue(undefined);
    const result = await storageRemove('testKey');
    expect(result.success).toBe(true);
  });

  it('returns failure result on error', async () => {
    mockStorageRemove.mockRejectedValue(new Error('Remove failed'));
    const result = await storageRemove('testKey');
    expect(result.success).toBe(false);
  });
});

describe('storageClear', () => {
  it('returns success result on successful clear', async () => {
    mockStorageClear.mockResolvedValue(undefined);
    const result = await storageClear();
    expect(result.success).toBe(true);
  });

  it('returns failure result on error', async () => {
    mockStorageClear.mockRejectedValue(new Error('Clear failed'));
    const result = await storageClear();
    expect(result.success).toBe(false);
  });
});

describe('getSessionKey', () => {
  it('returns formatted key with prefix and tabId', () => {
    expect(getSessionKey('session_meta', 42)).toBe('session_meta_42');
    expect(getSessionKey('session_xhr', 1)).toBe('session_xhr_1');
  });
});

describe('storageGetAllSessionKeys', () => {
  it('sadece session prefix li key leri döner', async () => {
    mockStorageGet.mockResolvedValue({
      session_meta_1: {},
      session_xhr_1: [],
      session_clicks_1: [],
      session_config: {},
      jira_credentials: {},
      extension_settings: {},
    });

    const result = await storageGetAllSessionKeys();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([
        'session_meta_1',
        'session_xhr_1',
        'session_clicks_1',
      ]);
    }
  });

  it('session key yoksa boş dizi döner', async () => {
    mockStorageGet.mockResolvedValue({ session_config: {} });

    const result = await storageGetAllSessionKeys();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it('hata durumunda failure döner', async () => {
    mockStorageGet.mockRejectedValue(new Error('Access denied'));

    const result = await storageGetAllSessionKeys();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Access denied');
    }
  });
});

describe('storageClearSessions', () => {
  it('sadece session key lerini siler, config korunur', async () => {
    mockStorageGet.mockResolvedValue({
      session_meta_1: {},
      session_xhr_1: [],
      session_console_2: [],
      session_nav_1: [],
      session_snapshot_1: {},
      session_config: { toggles: {} },
      jira_credentials: { token: 'abc' },
    });
    mockStorageRemove.mockResolvedValue(undefined);

    const result = await storageClearSessions();
    expect(result.success).toBe(true);
    expect(mockStorageRemove).toHaveBeenCalledWith([
      'session_meta_1',
      'session_xhr_1',
      'session_console_2',
      'session_nav_1',
      'session_snapshot_1',
    ]);
  });

  it('silinecek key yoksa remove çağırmaz', async () => {
    mockStorageGet.mockResolvedValue({ session_config: {} });

    const result = await storageClearSessions();
    expect(result.success).toBe(true);
    expect(mockStorageRemove).not.toHaveBeenCalled();
  });

  it('hata durumunda failure döner', async () => {
    mockStorageGet.mockRejectedValue(new Error('Storage error'));

    const result = await storageClearSessions();
    expect(result.success).toBe(false);
  });
});

describe('storageGetUsage', () => {
  it('depolama bilgisini doğru hesaplar', async () => {
    mockStorageGet.mockResolvedValue({
      session_meta_1: {
        tabId: 1,
        url: 'https://app.com',
        startTime: 1000,
        status: 'recording',
        counters: { clicks: 5, xhrRequests: 3, consoleErrors: 1, navEvents: 2 },
      },
      session_meta_2: {
        tabId: 2,
        url: 'https://dash.com',
        startTime: 2000,
        status: 'stopped',
        counters: { clicks: 1, xhrRequests: 0, consoleErrors: 0, navEvents: 1 },
      },
      session_xhr_1: [],
      session_config: {},
    });
    mockGetBytesInUse.mockResolvedValue(12345);

    const result = await storageGetUsage();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalBytes).toBe(12345);
      expect(result.data.sessionCount).toBe(2);
      expect(result.data.sessions).toHaveLength(2);
      expect(result.data.sessions[0]).toEqual({
        tabId: 1,
        url: 'https://app.com',
        startTime: 1000,
        status: 'recording',
        eventCount: 11,
      });
      expect(result.data.sessions[1]).toEqual({
        tabId: 2,
        url: 'https://dash.com',
        startTime: 2000,
        status: 'stopped',
        eventCount: 2,
      });
    }
  });

  it('session yoksa boş liste döner', async () => {
    mockStorageGet.mockResolvedValue({ session_config: {} });
    mockGetBytesInUse.mockResolvedValue(100);

    const result = await storageGetUsage();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sessionCount).toBe(0);
      expect(result.data.sessions).toEqual([]);
    }
  });

  it('hata durumunda failure döner', async () => {
    mockStorageGet.mockRejectedValue(new Error('Usage error'));

    const result = await storageGetUsage();
    expect(result.success).toBe(false);
  });
});
