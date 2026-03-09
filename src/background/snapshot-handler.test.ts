import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DomSnapshot, StorageDump } from '../lib/types';

// Mocks
const mockCaptureVisibleTab = vi.fn();
const mockTabsGet = vi.fn();
const mockTabsGetZoom = vi.fn();
const mockStorageGet = vi.fn();
const mockStorageSet = vi.fn();
const mockSendTabMessage = vi.fn();

vi.stubGlobal('chrome', {
  tabs: {
    get: mockTabsGet,
    captureVisibleTab: mockCaptureVisibleTab,
    getZoom: mockTabsGetZoom,
  },
  storage: {
    local: {
      get: mockStorageGet,
      set: mockStorageSet,
    },
  },
});

vi.stubGlobal('navigator', {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
  language: 'tr-TR',
});

// Mock messaging module
vi.mock('../lib/messaging', () => ({
  sendTabMessage: (...args: unknown[]) => mockSendTabMessage(...args),
  sendMessage: vi.fn(),
  onMessage: vi.fn(),
}));

const mockTab = {
  id: 42,
  index: 0,
  pinned: false,
  highlighted: false,
  windowId: 1,
  active: true,
  incognito: false,
  selected: false,
  discarded: false,
  autoDiscardable: true,
  groupId: -1,
  frozen: false,
  url: 'https://example.com',
  title: 'Example',
  width: 1920,
  height: 1080,
} as chrome.tabs.Tab;

const mockContentResponse: { dom: DomSnapshot; storage: StorageDump } = {
  dom: { html: '<html>test</html>', doctype: '<!DOCTYPE html>', url: 'https://example.com' },
  storage: { localStorage: { key: 'val' }, sessionStorage: {} },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockTabsGet.mockResolvedValue(mockTab);
  mockTabsGetZoom.mockResolvedValue(1);
  mockCaptureVisibleTab.mockResolvedValue('data:image/png;base64,abc');
  mockSendTabMessage.mockResolvedValue({ success: true, data: mockContentResponse });
  mockStorageGet.mockResolvedValue({});
});

describe('handleTakeSnapshot', () => {
  it('successful snapshot: returns screenshot + DOM + storage + consoleLogs', async () => {
    const { handleTakeSnapshot } = await import('./snapshot-handler');
    const result = await handleTakeSnapshot(42);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.screenshot.dataUrl).toBe('data:image/png;base64,abc');
      expect(result.data.dom.url).toBe('https://example.com');
      expect(result.data.storage.localStorage['key']).toBe('val');
      expect(result.data.consoleLogs).toEqual([]);
      expect(result.data.collectionDurationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('continues even if screenshot fails (graceful degradation)', async () => {
    mockCaptureVisibleTab.mockRejectedValue(new Error('Cannot capture'));
    const { handleTakeSnapshot } = await import('./snapshot-handler');
    const result = await handleTakeSnapshot(42);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.screenshot.dataUrl).toBe('');
      // DOM ve storage yine de gelmeli
      expect(result.data.dom.url).toBe('https://example.com');
    }
  });

  it('continues even if content script fails', async () => {
    mockSendTabMessage.mockResolvedValue({ success: false, error: 'Content script unreachable' });
    const { handleTakeSnapshot } = await import('./snapshot-handler');
    const result = await handleTakeSnapshot(42);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dom.html).toBe('');
    }
  });

  it('compiles console logs', async () => {
    mockStorageGet.mockResolvedValue({
      session_console_42: [{ type: 'console', timestamp: 1000, level: 'error', message: 'Oops' }],
    });
    const { handleTakeSnapshot } = await import('./snapshot-handler');
    const result = await handleTakeSnapshot(42);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.consoleLogs).toHaveLength(1);
      expect(result.data.consoleLogs[0]?.message).toBe('Oops');
    }
  });

  it('collectionDurationMs is populated', async () => {
    const { handleTakeSnapshot } = await import('./snapshot-handler');
    const result = await handleTakeSnapshot(42);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.collectionDurationMs).toBe('number');
      expect(result.data.collectionDurationMs).toBeGreaterThanOrEqual(0);
    }
  });
});
