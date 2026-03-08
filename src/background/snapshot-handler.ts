import type { Result, SnapshotData, DomSnapshot, StorageDump, TakeSnapshotPayload } from '../lib/types';
import { captureScreenshot, getScreenshotMetadata } from '../lib/screenshot';
import { compileConsoleLogs } from '../lib/console-compiler';
import { sendTabMessage } from '../lib/messaging';
import { MESSAGE_ACTIONS, MAX_SNAPSHOT_TIMEOUT_MS } from '../lib/constants';

interface ContentSnapshotResponse {
  dom: DomSnapshot;
  storage: StorageDump;
}

async function requestContentSnapshot(tabId: number): Promise<Result<ContentSnapshotResponse>> {
  return sendTabMessage<TakeSnapshotPayload, ContentSnapshotResponse>(tabId, {
    action: MESSAGE_ACTIONS.TAKE_SNAPSHOT,
    payload: { tabId },
  });
}

export async function handleTakeSnapshot(tabId: number): Promise<Result<SnapshotData>> {
  const startTime = Date.now();

  const raceResult = await Promise.race<
    [
      Awaited<ReturnType<typeof captureScreenshot>>,
      Result<ContentSnapshotResponse>,
      Awaited<ReturnType<typeof compileConsoleLogs>>,
    ] | never
  >([
    Promise.all([
      captureScreenshot(tabId),
      requestContentSnapshot(tabId),
      compileConsoleLogs(tabId),
    ]),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Snapshot timeout')), MAX_SNAPSHOT_TIMEOUT_MS),
    ),
  ]).catch((err: unknown) => {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[SnapshotHandler] Snapshot failed or timed out:', error);
    return null;
  });

  const collectionDurationMs = Date.now() - startTime;

  if (!raceResult) {
    // Timeout — return empty snapshot
    const emptySnapshot: SnapshotData = buildEmptySnapshot(collectionDurationMs);
    return { success: true, data: emptySnapshot };
  }

  const [screenshotResult, contentResult, consoleResult] = raceResult;

  // Graceful degradation — herhangi biri başarısız olsa da devam et
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  const emptyMeta = tab
    ? await getScreenshotMetadata(tab)
    : {
        viewport: { width: 0, height: 0 },
        browserVersion: '',
        os: '',
        zoomLevel: 1,
        pixelRatio: 1,
        language: '',
        url: '',
        timestamp: Date.now(),
      };

  const snapshotData: SnapshotData = {
    screenshot: screenshotResult.success
      ? screenshotResult.data
      : { dataUrl: '', metadata: emptyMeta },
    dom: contentResult.success
      ? contentResult.data.dom
      : { html: '', doctype: '', url: '' },
    storage: contentResult.success
      ? contentResult.data.storage
      : { localStorage: {}, sessionStorage: {} },
    consoleLogs: consoleResult.success ? consoleResult.data : [],
    timestamp: Date.now(),
    collectionDurationMs,
  };

  return { success: true, data: snapshotData };
}

function buildEmptySnapshot(collectionDurationMs: number): SnapshotData {
  return {
    screenshot: { dataUrl: '', metadata: { viewport: { width: 0, height: 0 }, browserVersion: '', os: '', zoomLevel: 1, pixelRatio: 1, language: '', url: '', timestamp: Date.now() } },
    dom: { html: '', doctype: '', url: '' },
    storage: { localStorage: {}, sessionStorage: {} },
    consoleLogs: [],
    timestamp: Date.now(),
    collectionDurationMs,
  };
}
