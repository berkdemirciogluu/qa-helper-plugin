import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureScreenshot, getScreenshotMetadata } from './screenshot';

const mockTabsGet = vi.fn();
const mockCaptureVisibleTab = vi.fn();
const mockTabsGetZoom = vi.fn();

vi.stubGlobal('chrome', {
  tabs: {
    get: mockTabsGet,
    captureVisibleTab: mockCaptureVisibleTab,
    getZoom: mockTabsGetZoom,
  },
});

vi.stubGlobal('navigator', {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  language: 'tr-TR',
});

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

beforeEach(() => {
  vi.clearAllMocks();
  mockTabsGetZoom.mockResolvedValue(1);
});

describe('captureScreenshot', () => {
  it('başarılı screenshot: dataUrl ve metadata döner', async () => {
    mockTabsGet.mockResolvedValue(mockTab);
    mockCaptureVisibleTab.mockResolvedValue('data:image/png;base64,abc123');

    const result = await captureScreenshot(42);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dataUrl).toBe('data:image/png;base64,abc123');
      expect(result.data.metadata.url).toBe('https://example.com');
      expect(result.data.metadata.language).toBe('tr-TR');
    }
    expect(mockTabsGet).toHaveBeenCalledWith(42);
    expect(mockCaptureVisibleTab).toHaveBeenCalledWith(1, { format: 'png' });
  });

  it('tab.windowId yoksa failure döner', async () => {
    mockTabsGet.mockResolvedValue({ ...mockTab, windowId: undefined });

    const result = await captureScreenshot(42);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('windowId');
    }
  });

  it('captureVisibleTab hata fırlatırsa failure döner', async () => {
    mockTabsGet.mockResolvedValue(mockTab);
    mockCaptureVisibleTab.mockRejectedValue(new Error('Cannot capture chrome:// page'));

    const result = await captureScreenshot(42);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Cannot capture chrome:// page');
    }
  });

  it('tabs.get hata fırlatırsa failure döner', async () => {
    mockTabsGet.mockRejectedValue(new Error('Tab not found'));

    const result = await captureScreenshot(42);

    expect(result.success).toBe(false);
  });
});

describe('getScreenshotMetadata', () => {
  it('tab URL ve timestamp içerir', async () => {
    const before = Date.now();
    const meta = await getScreenshotMetadata(mockTab);
    const after = Date.now();

    expect(meta.url).toBe('https://example.com');
    expect(meta.timestamp).toBeGreaterThanOrEqual(before);
    expect(meta.timestamp).toBeLessThanOrEqual(after);
  });

  it('viewport tab.width/height kullanır', async () => {
    const meta = await getScreenshotMetadata(mockTab);
    expect(meta.viewport.width).toBe(1920);
    expect(meta.viewport.height).toBe(1080);
  });

  it('zoomLevel chrome.tabs.getZoom ile alınır', async () => {
    mockTabsGetZoom.mockResolvedValue(1.5);
    const meta = await getScreenshotMetadata(mockTab);
    expect(meta.zoomLevel).toBe(1.5);
    expect(mockTabsGetZoom).toHaveBeenCalledWith(42);
  });

  it('getZoom hata fırlatırsa zoomLevel 1 döner', async () => {
    mockTabsGetZoom.mockRejectedValue(new Error('fail'));
    const meta = await getScreenshotMetadata(mockTab);
    expect(meta.zoomLevel).toBe(1);
  });

  it('language navigator\'dan alınır', async () => {
    const meta = await getScreenshotMetadata(mockTab);
    expect(meta.language).toBe('tr-TR');
  });

  it('OS Windows olarak tespit edilir', async () => {
    const meta = await getScreenshotMetadata(mockTab);
    expect(meta.os).toBe('Windows');
  });

  it('URL undefined ise boş string döner', async () => {
    const meta = await getScreenshotMetadata({ ...mockTab, url: undefined } as chrome.tabs.Tab);
    expect(meta.url).toBe('');
  });

  it('tab.width/height undefined ise 0 döner', async () => {
    const meta = await getScreenshotMetadata({ ...mockTab, width: undefined, height: undefined } as unknown as chrome.tabs.Tab);
    expect(meta.viewport.width).toBe(0);
    expect(meta.viewport.height).toBe(0);
  });
});
