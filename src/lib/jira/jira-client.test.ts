import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.stubGlobal('chrome', {
  identity: {
    getRedirectURL: vi.fn(() => 'https://ext-id.chromiumapp.org/atlassian'),
    launchWebAuthFlow: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
  permissions: {
    request: vi.fn(() => Promise.resolve(true)),
  },
});

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const {
  testConnection,
  getProjects,
  getAccessibleResources,
  jiraFetch,
  getApiBaseUrl,
  getAuthHeaders,
  createIssue,
  addAttachments,
  linkIssue,
} = await import('./jira-client');

import type { JiraCredentials } from '@/lib/types';

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
  siteName: 'My Site',
  connected: true,
};

const serverCredentials: JiraCredentials = {
  platform: 'server',
  url: 'https://jira.company.com',
  token: 'pat-token-abc',
  connected: true,
};

describe('getApiBaseUrl', () => {
  it('builds correct base URL for Cloud', () => {
    const url = getApiBaseUrl(cloudCredentials);
    expect(url).toBe('https://api.atlassian.com/ex/jira/cloud-id-789');
  });

  it('builds correct base URL for Server', () => {
    const url = getApiBaseUrl(serverCredentials);
    expect(url).toBe('https://jira.company.com');
  });
});

describe('getAuthHeaders', () => {
  it('returns Bearer header for Cloud credentials', () => {
    const headers = getAuthHeaders(cloudCredentials);
    expect(headers['Authorization']).toBe('Bearer access-token-123');
  });

  it('returns Bearer header for Server credentials', () => {
    const headers = getAuthHeaders(serverCredentials);
    expect(headers['Authorization']).toBe('Bearer pat-token-abc');
  });
});

describe('testConnection', () => {
  it('Cloud connection test succeeds — returns user info', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          accountId: 'user-123',
          displayName: 'John Doe',
          emailAddress: 'john@example.com',
          avatarUrls: {},
        }),
    });

    const result = await testConnection(cloudCredentials);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe('John Doe');
    }
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.atlassian.com/ex/jira/cloud-id-789/rest/api/3/myself',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token-123' }),
      })
    );
  });

  it('Server connection test succeeds', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          accountId: 'user-456',
          displayName: 'Jane Smith',
          avatarUrls: {},
        }),
    });

    const result = await testConnection(serverCredentials);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe('Jane Smith');
    }
    expect(mockFetch).toHaveBeenCalledWith(
      'https://jira.company.com/rest/api/2/myself',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer pat-token-abc' }),
      })
    );
  });

  it('returns error on connection failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const result = await testConnection(serverCredentials);
    expect(result.success).toBe(false);
  });

  it('returns error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    const result = await testConnection(cloudCredentials);
    expect(result.success).toBe(false);
  });
});

describe('getProjects', () => {
  it('Cloud project list returns successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          { id: '1', key: 'PROJ', name: 'E-Commerce', avatarUrls: {} },
          { id: '2', key: 'MOBILE', name: 'Mobile App', avatarUrls: {} },
        ]),
    });

    const result = await getProjects(cloudCredentials);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].key).toBe('PROJ');
    }
  });

  it('Server project list returns successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([{ id: '10', key: 'TEST', name: 'Test Project', avatarUrls: {} }]),
    });

    const result = await getProjects(serverCredentials);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
    }
  });

  it('returns success with empty array when no projects', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const result = await getProjects(cloudCredentials);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it('returns error on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    const result = await getProjects(serverCredentials);
    expect(result.success).toBe(false);
  });
});

describe('getAccessibleResources', () => {
  it('fetches accessible resources', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: 'cloud-123',
            name: 'My Jira',
            url: 'https://myjira.atlassian.net',
            scopes: [],
            avatarUrl: '',
          },
        ]),
    });

    const result = await getAccessibleResources('access-token');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('cloud-123');
    }
  });

  it('returns error on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const result = await getAccessibleResources('invalid-token');
    expect(result.success).toBe(false);
  });
});

describe('jiraFetch — auto-refresh interceptor', () => {
  it('auto-refreshes and retries on 401 with Cloud credentials', async () => {
    // İlk istek: 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });
    // Refresh token isteği
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'new-access-token',
          expires_in: 3600,
          refresh_token: 'new-refresh-token',
          scope: 'read:jira-work',
        }),
    });
    // Retry isteği
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: 'success' }),
    });

    const result = await jiraFetch(cloudCredentials, '/rest/api/3/myself');
    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('does not attempt refresh on 401 with Server credentials', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const result = await jiraFetch(serverCredentials, '/rest/api/2/myself');
    expect(result.ok).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does not attempt retry without refresh token', async () => {
    const credsNoRefresh: JiraCredentials = { ...cloudCredentials, refreshToken: undefined };
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const result = await jiraFetch(credsNoRefresh, '/rest/api/3/myself');
    expect(result.ok).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('createIssue', () => {
  it('creates issue with Cloud successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ id: '10001', key: 'PROJ-123', self: 'https://jira/issue/10001' }),
    });

    const result = await createIssue(cloudCredentials, {
      fields: {
        project: { key: 'PROJ' },
        summary: 'Test Bug',
        description: 'Bug description',
        issuetype: { name: 'Bug' },
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.key).toBe('PROJ-123');
      expect(result.data.id).toBe('10001');
    }
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/rest/api/3/issue'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('uses API v2 with Server', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ id: '10002', key: 'TEST-456', self: 'https://jira/issue/10002' }),
    });

    const result = await createIssue(serverCredentials, {
      fields: {
        project: { key: 'TEST' },
        summary: 'Server Bug',
        description: 'desc',
        issuetype: { name: 'Bug' },
      },
    });

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/rest/api/2/issue'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('returns error messages on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ errorMessages: ['Project is required'], errors: {} }),
    });

    const result = await createIssue(cloudCredentials, {
      fields: {
        project: { key: '' },
        summary: 'Test',
        description: 'desc',
        issuetype: { name: 'Bug' },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Project is required');
    }
  });

  it('returns error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    const result = await createIssue(cloudCredentials, {
      fields: {
        project: { key: 'PROJ' },
        summary: 'Test',
        description: 'desc',
        issuetype: { name: 'Bug' },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Check your network connection');
    }
  });
});

describe('addAttachments', () => {
  it('successful file attachment', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: '1',
            filename: 'screenshot.png',
            size: 1024,
            mimeType: 'image/png',
            content: 'url',
          },
        ]),
    });

    const file = new File(['test'], 'screenshot.png', { type: 'image/png' });
    const result = await addAttachments(cloudCredentials, 'PROJ-123', [file]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].filename).toBe('screenshot.png');
    }
  });

  it('partial failure — some files fail to upload', async () => {
    // İlk dosya başarılı
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: '1',
            filename: 'file1.json',
            size: 100,
            mimeType: 'application/json',
            content: 'url',
          },
        ]),
    });
    // İkinci dosya başarısız
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 413,
    });

    const file1 = new File(['test1'], 'file1.json', { type: 'application/json' });
    const file2 = new File(['test2'], 'file2.json', { type: 'application/json' });
    const result = await addAttachments(cloudCredentials, 'PROJ-123', [file1, file2]);

    // Partial success — en az bir dosya eklendi
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
    }
  });

  it('returns error when all files fail', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const file = new File(['test'], 'fail.json', { type: 'application/json' });
    const result = await addAttachments(cloudCredentials, 'PROJ-123', [file]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('No files could be attached');
    }
  });

  it('sends X-Atlassian-Token header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: '1',
            filename: 'test.json',
            size: 10,
            mimeType: 'application/json',
            content: 'url',
          },
        ]),
    });

    const file = new File(['data'], 'test.json', { type: 'application/json' });
    await addAttachments(cloudCredentials, 'PROJ-123', [file]);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/attachments'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Atlassian-Token': 'no-check',
        }),
      })
    );
  });

  it('does not send Content-Type header (FormData boundary auto)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: '1',
            filename: 'test.json',
            size: 10,
            mimeType: 'application/json',
            content: 'url',
          },
        ]),
    });

    const file = new File(['data'], 'test.json', { type: 'application/json' });
    await addAttachments(cloudCredentials, 'PROJ-123', [file]);

    const callHeaders = mockFetch.mock.calls[0][1].headers;
    expect(callHeaders['Content-Type']).toBeUndefined();
  });

  it('refreshes token and retries on 401 for Cloud', async () => {
    // İlk deneme 401
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    // Refresh token exchange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'new-access-token',
          expires_in: 3600,
          refresh_token: 'new-refresh-token',
          scope: 'read:jira-work',
        }),
    });
    // Retry başarılı
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: '1',
            filename: 'screenshot.png',
            size: 1024,
            mimeType: 'image/png',
            content: 'url',
          },
        ]),
    });

    const file = new File(['data'], 'screenshot.png', { type: 'image/png' });
    const result = await addAttachments(cloudCredentials, 'PROJ-123', [file]);

    expect(result.success).toBe(true);
    // initial + refresh token + retry = 3 fetch çağrısı
    expect(mockFetch).toHaveBeenCalledTimes(3);
    // Retry isteğinde yeni token kullanılmış olmalı
    const retryCall = mockFetch.mock.calls[2];
    expect(retryCall[1].headers['Authorization']).toBe('Bearer new-access-token');
  });
});

describe('linkIssue', () => {
  it('creates link successfully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const result = await linkIssue(cloudCredentials, 'PROJ-456', 'PROJ-123');

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/rest/api/3/issueLink'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          type: { name: 'Relates' },
          inwardIssue: { key: 'PROJ-123' },
          outwardIssue: { key: 'PROJ-456' },
        }),
      })
    );
  });

  it('returns error on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const result = await linkIssue(cloudCredentials, 'PROJ-456', 'INVALID-999');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Could not link ticket');
    }
  });
});
