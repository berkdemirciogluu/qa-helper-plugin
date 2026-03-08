import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  storageGet,
  storageSet,
  storageRemove,
  storageClear,
  getSessionKey,
} from './storage';

// Mock chrome.storage.local
const mockStorageGet = vi.fn();
const mockStorageSet = vi.fn();
const mockStorageRemove = vi.fn();
const mockStorageClear = vi.fn();

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: mockStorageGet,
      set: mockStorageSet,
      remove: mockStorageRemove,
      clear: mockStorageClear,
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
