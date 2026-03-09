import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { JiraCredentials, SnapshotData } from '@/lib/types';

vi.stubGlobal('chrome', {
  identity: { getRedirectURL: vi.fn(() => 'https://ext-id.chromiumapp.org/atlassian'), launchWebAuthFlow: vi.fn() },
  storage: { local: { get: vi.fn().mockResolvedValue({}), set: vi.fn().mockResolvedValue(undefined) } },
  permissions: { request: vi.fn(() => Promise.resolve(true)) },
});

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const { exportToJira } = await import('./jira-exporter');

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

const cloudCredentials: JiraCredentials = {
  platform: 'cloud',
  url: 'https://mysite.atlassian.net',
  token: 'access-token-123',
  refreshToken: 'refresh-token-456',
  accessTokenExpiresAt: Date.now() + 3600_000,
  cloudId: 'cloud-id-789',
  siteName: 'mysite.atlassian.net',
  defaultProjectKey: 'PROJ',
  connected: true,
};

const snapshotData: SnapshotData = {
  screenshot: {
    dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
    metadata: {
      viewport: { width: 1920, height: 1080 },
      browserVersion: 'Chrome 133',
      os: 'Windows 11',
      zoomLevel: 1,
      pixelRatio: 1,
      language: 'tr-TR',
      url: 'https://app.example.com',
      timestamp: Date.now(),
    },
  },
  dom: { html: '<html></html>', doctype: '<!DOCTYPE html>', url: 'https://app.example.com' },
  storage: { localStorage: { k: 'v' }, sessionStorage: {} },
  consoleLogs: [{ timestamp: Date.now(), level: 'error', message: 'Error' }],
  timestamp: Date.now(),
  collectionDurationMs: 100,
};

const baseParams = {
  credentials: cloudCredentials,
  expected: 'Kullanıcı giriş yapabilmeli',
  reason: '500 hatası alınıyor',
  priority: 'high' as const,
  snapshotData,
  stepsText: '1. Login sayfasına git',
  configFields: { environment: 'Staging', testCycle: '', agileTeam: '', project: '' },
  environmentInfo: snapshotData.screenshot.metadata,
};

describe('exportToJira', () => {
  it('full flow succeeds — issue + attachments', async () => {
    // createIssue
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: '10001', key: 'PROJ-123', self: 'https://jira/10001' }),
    });
    // addAttachments (4 dosya: screenshot, dom, console-logs, local-storage)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: '1', filename: 'f', size: 10, mimeType: 'x', content: 'url' }]),
    });

    const result = await exportToJira(baseParams);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.issueKey).toBe('PROJ-123');
      expect(result.data.issueUrl).toContain('mysite.atlassian.net/browse/PROJ-123');
      expect(result.data.attachmentCount).toBeGreaterThan(0);
    }
  });

  it('returns error when credentials are missing', async () => {
    const result = await exportToJira({
      ...baseParams,
      credentials: { ...cloudCredentials, token: '', connected: false },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Jira configuration is missing');
    }
  });

  it('returns error when defaultProjectKey is missing', async () => {
    const result = await exportToJira({
      ...baseParams,
      credentials: { ...cloudCredentials, defaultProjectKey: undefined },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('No default project selected');
    }
  });

  it('returns error on issue creation failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ errorMessages: ['Project not found'], errors: {} }),
    });

    const result = await exportToJira(baseParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Failed to create ticket');
    }
  });

  it('attachment failure → partial success with warning', async () => {
    // createIssue başarılı
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: '10001', key: 'PROJ-456', self: 'https://jira/10001' }),
    });
    // tüm attachment'lar başarısız
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const result = await exportToJira(baseParams);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.issueKey).toBe('PROJ-456');
      expect(result.data.warning).toContain('could not be attached');
    }
  });

  it('link failure → partial success with warning', async () => {
    // createIssue başarılı
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: '10001', key: 'PROJ-789', self: 'https://jira/10001' }),
    });
    // attachment başarılı
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: '1', filename: 'f', size: 10, mimeType: 'x', content: 'url' }]),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: '2', filename: 'g', size: 20, mimeType: 'y', content: 'url' }]),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: '3', filename: 'h', size: 30, mimeType: 'z', content: 'url' }]),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: '4', filename: 'i', size: 40, mimeType: 'w', content: 'url' }]),
    });
    // linkIssue başarısız
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const result = await exportToJira({ ...baseParams, parentKey: 'PROJ-100' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.warning).toContain('Could not link to parent ticket');
    }
  });

  it('summary is truncated to 80 characters', async () => {
    const longExpected = 'A'.repeat(100);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: '10001', key: 'PROJ-999', self: 'https://jira/10001' }),
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: '1', filename: 'f', size: 10, mimeType: 'x', content: 'url' }]),
    });

    await exportToJira({ ...baseParams, expected: longExpected });

    const createCall = mockFetch.mock.calls[0];
    const body = JSON.parse(createCall[1].body);
    expect(body.fields.summary.length).toBeLessThanOrEqual(90); // "Bug: " + 80 + "..."
  });

  it('Cloud URL is generated correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: '10001', key: 'PROJ-200', self: 'url' }),
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: '1', filename: 'f', size: 10, mimeType: 'x', content: 'url' }]),
    });

    const result = await exportToJira(baseParams);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.issueUrl).toBe('https://mysite.atlassian.net/browse/PROJ-200');
    }
  });
});
