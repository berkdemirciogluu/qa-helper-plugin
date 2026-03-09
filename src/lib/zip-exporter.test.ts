import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportBugReportZip } from './zip-exporter';
import type { SnapshotData, XhrEvent } from './types';
import type { TimelineJSON } from './timeline-builder';

// Mock JSZip
const mockFile = vi.fn();
const mockGenerateAsync = vi.fn();
vi.mock('jszip', () => {
  return {
    default: class MockJSZip {
      file = mockFile;
      generateAsync = mockGenerateAsync;
    },
  };
});

const makeSnapshotData = (): SnapshotData => ({
  screenshot: {
    dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    metadata: {
      viewport: { width: 1920, height: 1080 },
      browserVersion: 'Chrome 133',
      os: 'Windows 11',
      zoomLevel: 1,
      pixelRatio: 1,
      language: 'tr-TR',
      url: 'https://app.com/login',
      timestamp: 1000,
    },
  },
  dom: { html: '<html><body>Test</body></html>', doctype: '<!DOCTYPE html>', url: 'https://app.com' },
  storage: {
    localStorage: { key1: 'val1' },
    sessionStorage: { key2: 'val2' },
  },
  consoleLogs: [
    { timestamp: 1000, level: 'error', message: 'Test error' },
  ],
  timestamp: 1000,
  collectionDurationMs: 100,
});

const makeTimeline = (): TimelineJSON => ({
  schemaVersion: '1.0',
  sessionId: 'test-uuid',
  bugReport: { expectedResult: 'ok', actualResult: 'fail', priority: 'high' },
  environment: { browser: 'Chrome', os: 'Win', viewport: '1920x1080', pixelRatio: 1, language: 'tr', url: 'https://app.com' },
  context: { environment: 'staging', project: 'test', agileTeam: 'team', testCycle: 'sprint1' },
  timeline: [],
  errorSummary: { consoleErrors: 0, failedRequests: 0, crashDetected: false },
  attachments: {
    screenshot: 'screenshot.png',
    har: 'network.har',
    dom: 'dom-snapshot.html',
    consoleLogs: 'console-logs.json',
    localStorage: 'local-storage.json',
    sessionStorage: 'session-storage.json',
  },
});

const makeXhrs = (): XhrEvent[] => [
  { type: 'xhr', timestamp: 1000, method: 'GET', url: 'https://api.com/data', status: 200, duration: 150 },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGenerateAsync.mockResolvedValue(new Blob(['test'], { type: 'application/zip' }));

  // Mock URL and DOM APIs
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:test-url'),
    revokeObjectURL: vi.fn(),
  });
});

describe('exportBugReportZip', () => {
  it('adds all files to ZIP', async () => {
    const result = await exportBugReportZip({
      snapshotData: makeSnapshotData(),
      timeline: makeTimeline(),
      description: 'Test description',
      xhrs: makeXhrs(),
    });

    expect(result.success).toBe(true);

    const fileNames = mockFile.mock.calls.map((call: unknown[]) => call[0] as string);
    expect(fileNames).toContain('description.txt');
    expect(fileNames).toContain('screenshot.png');
    expect(fileNames).toContain('dom-snapshot.html');
    expect(fileNames).toContain('console-logs.json');
    expect(fileNames).toContain('network.har');
    expect(fileNames).toContain('local-storage.json');
    expect(fileNames).toContain('session-storage.json');
    expect(fileNames).toContain('timeline.json');
  });

  it('adds screenshot as base64 (data URL prefix removed)', async () => {
    await exportBugReportZip({
      snapshotData: makeSnapshotData(),
      timeline: makeTimeline(),
      description: 'Test',
      xhrs: [],
    });

    const screenshotCall = mockFile.mock.calls.find((call: unknown[]) => call[0] === 'screenshot.png') as unknown[] | undefined;
    expect(screenshotCall).toBeTruthy();
    expect(screenshotCall![1]).toBe('iVBORw0KGgo=');
    expect(screenshotCall![2]).toEqual({ base64: true });
  });

  it('filename format is bug-report-YYYY-MM-DD.zip', async () => {
    const result = await exportBugReportZip({
      snapshotData: makeSnapshotData(),
      timeline: makeTimeline(),
      description: 'Test',
      xhrs: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fileName).toMatch(/^bug-report-\d{4}-\d{2}-\d{2}\.zip$/);
    }
  });

  it('returns file size in MB', async () => {
    const blob = new Blob(['x'.repeat(1024 * 1024 * 2)]);
    mockGenerateAsync.mockResolvedValue(blob);

    const result = await exportBugReportZip({
      snapshotData: makeSnapshotData(),
      timeline: makeTimeline(),
      description: 'Test',
      xhrs: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fileSize).toContain('MB');
    }
  });

  it('returns KB format for small files', async () => {
    const blob = new Blob(['x'.repeat(500)]);
    mockGenerateAsync.mockResolvedValue(blob);

    const result = await exportBugReportZip({
      snapshotData: makeSnapshotData(),
      timeline: makeTimeline(),
      description: 'Test',
      xhrs: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fileSize).toContain('KB');
    }
  });

  it('creates network.har in simplified HAR format', async () => {
    await exportBugReportZip({
      snapshotData: makeSnapshotData(),
      timeline: makeTimeline(),
      description: 'Test',
      xhrs: makeXhrs(),
    });

    const harCall = mockFile.mock.calls.find((call: unknown[]) => call[0] === 'network.har') as unknown[] | undefined;
    expect(harCall).toBeTruthy();
    const harContent = JSON.parse(harCall![1] as string) as { log: { version: string; entries: unknown[] } };
    expect(harContent.log.version).toBe('1.2');
    expect(harContent.log.entries).toHaveLength(1);
  });

  it('returns Result error when JSZip generateAsync fails', async () => {
    mockGenerateAsync.mockRejectedValue(new Error('ZIP generation failed'));

    const result = await exportBugReportZip({
      snapshotData: makeSnapshotData(),
      timeline: makeTimeline(),
      description: 'Test',
      xhrs: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('ZIP generation failed');
    }
  });
});
