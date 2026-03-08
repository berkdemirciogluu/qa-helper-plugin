import type { Result, ScreenshotMetadata } from './types';

export async function captureScreenshot(
  tabId: number,
): Promise<Result<{ dataUrl: string; metadata: ScreenshotMetadata }>> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.windowId) {
      return { success: false, error: 'Tab has no windowId' };
    }

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    const metadata = await getScreenshotMetadata(tab);
    return { success: true, data: { dataUrl, metadata } };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[Screenshot] captureScreenshot failed:', error);
    return { success: false, error };
  }
}

export async function getScreenshotMetadata(tab: chrome.tabs.Tab): Promise<ScreenshotMetadata> {
  const zoomLevel = tab.id != null
    ? await chrome.tabs.getZoom(tab.id).catch(() => 1)
    : 1;

  return {
    viewport: {
      width: tab.width ?? 0,
      height: tab.height ?? 0,
    },
    browserVersion: navigator.userAgent,
    os: getOS(),
    zoomLevel,
    pixelRatio: 1,
    language: navigator.language,
    url: tab.url ?? '',
    timestamp: Date.now(),
  };
}

function getOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
}
