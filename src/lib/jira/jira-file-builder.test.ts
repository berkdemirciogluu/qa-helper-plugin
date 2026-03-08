import { describe, it, expect } from 'vitest';
import { buildAttachmentFiles, getAttachmentFileNames } from './jira-file-builder';
import type { SnapshotData } from '@/lib/types';

const fullSnapshotData: SnapshotData = {
  screenshot: {
    dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
    metadata: {
      viewport: { width: 1920, height: 1080 },
      browserVersion: 'Chrome 133',
      os: 'Windows 11',
      zoomLevel: 1,
      pixelRatio: 1,
      language: 'tr-TR',
      url: 'https://example.com',
      timestamp: Date.now(),
    },
  },
  dom: {
    html: '<html><body>test</body></html>',
    doctype: '<!DOCTYPE html>',
    url: 'https://example.com',
  },
  storage: {
    localStorage: { key1: 'value1' },
    sessionStorage: { key2: 'value2' },
  },
  consoleLogs: [
    { timestamp: Date.now(), level: 'error', message: 'Test error' },
  ],
  timestamp: Date.now(),
  collectionDurationMs: 100,
};

describe('buildAttachmentFiles', () => {
  it('tam veri ile 7 dosya oluşturur', () => {
    const files = buildAttachmentFiles({
      snapshotData: fullSnapshotData,
      xhrs: [{ type: 'xhr', timestamp: Date.now(), method: 'GET', url: 'https://api.test.com', status: 200, duration: 100 }],
      timelineJson: { schemaVersion: '1.0', sessionId: 'test' } as never,
    });

    expect(files).toHaveLength(7);
    const names = files.map((f) => f.name);
    expect(names).toContain('screenshot.png');
    expect(names).toContain('dom-snapshot.html');
    expect(names).toContain('console-logs.json');
    expect(names).toContain('network.har');
    expect(names).toContain('local-storage.json');
    expect(names).toContain('session-storage.json');
    expect(names).toContain('timeline.json');
  });

  it('eksik veri kaynakları atlanır', () => {
    const minimal: SnapshotData = {
      screenshot: { dataUrl: '', metadata: {} as never },
      dom: { html: '', doctype: '', url: '' },
      storage: { localStorage: {}, sessionStorage: {} },
      consoleLogs: [],
      timestamp: Date.now(),
      collectionDurationMs: 50,
    };

    const files = buildAttachmentFiles({ snapshotData: minimal });

    expect(files).toHaveLength(0);
  });

  it('screenshot base64 → File dönüşümü doğru MIME type ile yapılır', () => {
    const files = buildAttachmentFiles({ snapshotData: fullSnapshotData });
    const screenshot = files.find((f) => f.name === 'screenshot.png');

    expect(screenshot).toBeDefined();
    expect(screenshot!.type).toBe('image/png');
    expect(screenshot!.size).toBeGreaterThan(0);
  });

  it('JSON dosyaları application/json MIME type ile oluşturulur', () => {
    const files = buildAttachmentFiles({
      snapshotData: fullSnapshotData,
      xhrs: [{ type: 'xhr', timestamp: Date.now(), method: 'POST', url: 'https://api.test.com', status: 500, duration: 200 }],
    });

    const consoleLogs = files.find((f) => f.name === 'console-logs.json');
    const networkHar = files.find((f) => f.name === 'network.har');
    const localStorage = files.find((f) => f.name === 'local-storage.json');

    expect(consoleLogs!.type).toBe('application/json');
    expect(networkHar!.type).toBe('application/json');
    expect(localStorage!.type).toBe('application/json');
  });

  it('DOM snapshot text/html MIME type ile oluşturulur', () => {
    const files = buildAttachmentFiles({ snapshotData: fullSnapshotData });
    const dom = files.find((f) => f.name === 'dom-snapshot.html');

    expect(dom).toBeDefined();
    expect(dom!.type).toBe('text/html');
  });
});

describe('getAttachmentFileNames', () => {
  it('dosya isimlerini döner', () => {
    const names = getAttachmentFileNames({ snapshotData: fullSnapshotData });
    expect(names).toContain('screenshot.png');
    expect(names).toContain('dom-snapshot.html');
  });
});
