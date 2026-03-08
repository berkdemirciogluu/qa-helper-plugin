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

const { testConnection, getProjects, getAccessibleResources, jiraFetch, getApiBaseUrl, getAuthHeaders } =
  await import('./jira-client');

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
  it('Cloud için doğru base URL oluşturur', () => {
    const url = getApiBaseUrl(cloudCredentials);
    expect(url).toBe('https://api.atlassian.com/ex/jira/cloud-id-789');
  });

  it('Server için doğru base URL oluşturur', () => {
    const url = getApiBaseUrl(serverCredentials);
    expect(url).toBe('https://jira.company.com');
  });
});

describe('getAuthHeaders', () => {
  it('Cloud credentials için Bearer header döner', () => {
    const headers = getAuthHeaders(cloudCredentials);
    expect(headers['Authorization']).toBe('Bearer access-token-123');
  });

  it('Server credentials için Bearer header döner', () => {
    const headers = getAuthHeaders(serverCredentials);
    expect(headers['Authorization']).toBe('Bearer pat-token-abc');
  });
});

describe('testConnection', () => {
  it('Cloud bağlantı testi başarılı — kullanıcı bilgisi döner', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          accountId: 'user-123',
          displayName: 'Ahmet Yılmaz',
          emailAddress: 'ahmet@example.com',
          avatarUrls: {},
        }),
    });

    const result = await testConnection(cloudCredentials);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe('Ahmet Yılmaz');
    }
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.atlassian.com/ex/jira/cloud-id-789/rest/api/3/myself',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token-123' }),
      }),
    );
  });

  it('Server bağlantı testi başarılı', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          accountId: 'user-456',
          displayName: 'Mehmet Kara',
          avatarUrls: {},
        }),
    });

    const result = await testConnection(serverCredentials);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe('Mehmet Kara');
    }
    expect(mockFetch).toHaveBeenCalledWith(
      'https://jira.company.com/rest/api/2/myself',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer pat-token-abc' }),
      }),
    );
  });

  it('bağlantı başarısız olursa hata döner', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const result = await testConnection(serverCredentials);
    expect(result.success).toBe(false);
  });

  it('network hatası olursa hata döner', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    const result = await testConnection(cloudCredentials);
    expect(result.success).toBe(false);
  });
});

describe('getProjects', () => {
  it('Cloud proje listesi başarılı döner', async () => {
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

  it('Server proje listesi başarılı döner', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          { id: '10', key: 'TEST', name: 'Test Project', avatarUrls: {} },
        ]),
    });

    const result = await getProjects(serverCredentials);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
    }
  });

  it('proje listesi boşsa başarılı ancak boş array döner', async () => {
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

  it('API hatası olursa hata döner', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    const result = await getProjects(serverCredentials);
    expect(result.success).toBe(false);
  });
});

describe('getAccessibleResources', () => {
  it('erişilebilir kaynakları getirir', async () => {
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

  it('API hatası olursa hata döner', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const result = await getAccessibleResources('invalid-token');
    expect(result.success).toBe(false);
  });
});

describe('jiraFetch — auto-refresh interceptor', () => {
  it('401 ve Cloud credentials ile otomatik refresh ve retry yapar', async () => {
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

  it('Server credentials ile 401 olursa refresh denemez', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const result = await jiraFetch(serverCredentials, '/rest/api/2/myself');
    expect(result.ok).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('refresh token yoksa retry denemez', async () => {
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
