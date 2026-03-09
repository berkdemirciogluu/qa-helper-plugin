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
});

vi.stubGlobal('crypto', { ...globalThis.crypto, randomUUID: vi.fn(() => 'test-state-uuid') });

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const { startOAuthFlow, refreshAccessToken, validatePat, buildAuthUrl } = await import(
  './jira-auth'
);

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

describe('buildAuthUrl', () => {
  it('builds correct Atlassian OAuth URL', () => {
    const url = buildAuthUrl('test-state');
    expect(url).toContain('https://auth.atlassian.com/authorize');
    expect(url).toContain('response_type=code');
    expect(url).toContain('state=test-state');
    expect(url).toContain('prompt=consent');
    expect(url).toContain('redirect_uri=');
  });
});

describe('startOAuthFlow', () => {
  it('returns token and cloudId on successful OAuth flow', async () => {
    const mockRedirectUrl =
      'https://ext-id.chromiumapp.org/atlassian?code=auth-code-123&state=test-state-uuid';
    (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRedirectUrl,
    );

    mockFetch
      // Token exchange
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'at-123',
            expires_in: 3600,
            refresh_token: 'rt-456',
            scope: 'read:jira-work',
          }),
      })
      // Accessible resources
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 'cloud-id-789',
              name: 'My Site',
              url: 'https://mysite.atlassian.net',
              scopes: [],
              avatarUrl: '',
            },
          ]),
      });

    const result = await startOAuthFlow();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.accessToken).toBe('at-123');
      expect(result.data.refreshToken).toBe('rt-456');
      expect(result.data.cloudId).toBe('cloud-id-789');
      expect(result.data.siteName).toBe('My Site');
    }
  });

  it('returns error if user cancels OAuth', async () => {
    (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('The user did not approve access.'),
    );

    const result = await startOAuthFlow();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('cancelled');
    }
  });

  it('returns error if token exchange fails', async () => {
    const mockRedirectUrl =
      'https://ext-id.chromiumapp.org/atlassian?code=auth-code-123&state=test-state-uuid';
    (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRedirectUrl,
    );

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'invalid_grant' }),
    });

    const result = await startOAuthFlow();
    expect(result.success).toBe(false);
  });

  it('returns error if accessible resources is empty', async () => {
    const mockRedirectUrl =
      'https://ext-id.chromiumapp.org/atlassian?code=auth-code-123&state=test-state-uuid';
    (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRedirectUrl,
    );

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'at-123',
            expires_in: 3600,
            refresh_token: 'rt-456',
            scope: 'read:jira-work',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

    const result = await startOAuthFlow();
    expect(result.success).toBe(false);
  });

  it('returns error if redirect URL has no auth code', async () => {
    const mockRedirectUrl = 'https://ext-id.chromiumapp.org/atlassian?error=access_denied&state=test-state-uuid';
    (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRedirectUrl,
    );

    const result = await startOAuthFlow();
    expect(result.success).toBe(false);
  });
});

describe('refreshAccessToken', () => {
  it('returns new token on successful refresh', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'new-at-789',
          expires_in: 3600,
          refresh_token: 'new-rt-101',
          scope: 'read:jira-work',
        }),
    });

    const result = await refreshAccessToken('old-rt-456');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.accessToken).toBe('new-at-789');
      expect(result.data.refreshToken).toBe('new-rt-101');
      expect(result.data.expiresAt).toBeGreaterThan(Date.now());
    }
  });

  it('returns error if refresh fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'invalid_grant' }),
    });

    const result = await refreshAccessToken('invalid-rt');
    expect(result.success).toBe(false);
  });

  it('returns error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await refreshAccessToken('some-rt');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });
});

describe('validatePat', () => {
  it('empty PAT is invalid', () => {
    const result = validatePat('');
    expect(result.success).toBe(false);
  });

  it('too short PAT is invalid', () => {
    const result = validatePat('abc');
    expect(result.success).toBe(false);
  });

  it('valid PAT is accepted', () => {
    const result = validatePat('NjYwNTQ2MTkzMjM4OhGLgQlFthoyBg5lKSKs3cLZFqDO');
    expect(result.success).toBe(true);
  });

  it('PAT with whitespace is trimmed and validated', () => {
    const result = validatePat('  NjYwNTQ2MTkzMjM4OhGLgQlFthoyBg5lKSKs3cLZFqDO  ');
    expect(result.success).toBe(true);
  });
});
