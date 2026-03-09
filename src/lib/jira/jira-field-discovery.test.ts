import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { JiraCredentials } from '@/lib/types';

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
});

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const {
  getIssueTypesForProject,
  getFieldsForIssueType,
  buildConfigKey,
  loadFieldConfig,
  saveFieldConfig,
  EXCLUDED_FIELD_KEYS,
} = await import('./jira-field-discovery');

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
});

const serverCredentials: JiraCredentials = {
  platform: 'server',
  url: 'https://jira.company.com',
  token: 'pat-token-123',
  defaultProjectKey: 'PROJ',
  connected: true,
};

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

describe('buildConfigKey', () => {
  it('returns correct format', () => {
    expect(buildConfigKey('PROJ', '10001')).toBe('PROJ_10001');
  });

  it('handles special characters in project key', () => {
    expect(buildConfigKey('MY-PROJ', '99999')).toBe('MY-PROJ_99999');
  });
});

describe('getIssueTypesForProject', () => {
  it('loads issue types for server platform (v2 endpoint)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          issueTypes: [
            { id: '10001', name: 'Bug', subtask: false },
            { id: '10002', name: 'Task', subtask: false },
          ],
          total: 2,
          maxResults: 50,
        }),
    });

    const result = await getIssueTypesForProject(serverCredentials, 'PROJ');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Bug');
    }

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[0]).toContain('/rest/api/2/issue/createmeta/PROJ/issuetypes');
  });

  it('loads issue types for cloud platform (v3 endpoint)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          issueTypes: [{ id: '10001', name: 'Bug', subtask: false }],
          total: 1,
          maxResults: 50,
        }),
    });

    const result = await getIssueTypesForProject(cloudCredentials, 'PROJ');

    expect(result.success).toBe(true);
    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[0]).toContain('/rest/api/3/issue/createmeta/PROJ/issuetypes');
  });

  it('paginates through all issue types', async () => {
    // Page 1
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          issueTypes: [{ id: '10001', name: 'Bug', subtask: false }],
          total: 2,
          maxResults: 1,
        }),
    });
    // Page 2
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          issueTypes: [{ id: '10002', name: 'Task', subtask: false }],
          total: 2,
          maxResults: 1,
        }),
    });

    const result = await getIssueTypesForProject(serverCredentials, 'PROJ');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns error on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const result = await getIssueTypesForProject(serverCredentials, 'PROJ');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Project not found');
    }
  });

  it('returns error on 401', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

    const result = await getIssueTypesForProject(serverCredentials, 'PROJ');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Session expired');
    }
  });

  it('returns error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await getIssueTypesForProject(serverCredentials, 'PROJ');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Cannot reach Jira server');
    }
  });
});

describe('getFieldsForIssueType', () => {
  it('loads fields and excludes EXCLUDED_FIELD_KEYS', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          fields: [
            {
              fieldId: 'summary',
              name: 'Summary',
              required: true,
              hasDefaultValue: false,
              schema: { type: 'string' },
            },
            {
              fieldId: 'customfield_10050',
              name: 'Environment',
              required: false,
              hasDefaultValue: false,
              schema: { type: 'string' },
            },
          ],
          total: 2,
          maxResults: 50,
        }),
    });

    const result = await getFieldsForIssueType(serverCredentials, 'PROJ', '10001');

    expect(result.success).toBe(true);
    if (result.success) {
      // summary is in EXCLUDED_FIELD_KEYS, only customfield_10050 should remain
      expect(result.data).toHaveLength(1);
      expect(result.data[0].fieldId).toBe('customfield_10050');
    }
  });

  it('uses v2 endpoint for server platform', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ fields: [], total: 0, maxResults: 50 }),
    });

    await getFieldsForIssueType(serverCredentials, 'PROJ', '10001');

    expect(mockFetch.mock.calls[0][0]).toContain('/rest/api/2/issue/createmeta/PROJ/issuetypes/10001');
  });

  it('paginates through all fields', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          fields: [
            {
              fieldId: 'customfield_1',
              name: 'Field 1',
              required: false,
              hasDefaultValue: false,
              schema: { type: 'string' },
            },
          ],
          total: 2,
          maxResults: 1,
        }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          fields: [
            {
              fieldId: 'customfield_2',
              name: 'Field 2',
              required: false,
              hasDefaultValue: false,
              schema: { type: 'string' },
            },
          ],
          total: 2,
          maxResults: 1,
        }),
    });

    const result = await getFieldsForIssueType(serverCredentials, 'PROJ', '10001');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns error on 403', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

    const result = await getFieldsForIssueType(serverCredentials, 'PROJ', '10001');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('No permissions');
    }
  });

  it('filters all excluded fields', () => {
    const excluded = ['summary', 'description', 'issuetype', 'project', 'attachment', 'reporter'];
    for (const key of excluded) {
      expect(EXCLUDED_FIELD_KEYS.has(key)).toBe(true);
    }
  });
});

describe('loadFieldConfig', () => {
  it('returns empty array when no config stored', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await loadFieldConfig('PROJ', '10001');

    expect(result).toEqual([]);
  });

  it('returns fields for matching configKey', async () => {
    const storedFields = [
      {
        fieldId: 'customfield_10050',
        name: 'Environment',
        required: false,
        alwaysFill: true,
        defaultValue: 'Production',
        schemaType: 'string',
      },
    ];
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      jira_field_config: {
        PROJ_10001: { fields: storedFields, lastFetched: Date.now() },
      },
    });

    const result = await loadFieldConfig('PROJ', '10001');

    expect(result).toEqual(storedFields);
  });

  it('returns empty array for non-matching configKey', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      jira_field_config: {
        OTHER_99999: { fields: [], lastFetched: Date.now() },
      },
    });

    const result = await loadFieldConfig('PROJ', '10001');

    expect(result).toEqual([]);
  });
});

describe('saveFieldConfig', () => {
  it('saves fields under correct configKey', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const fields = [
      {
        fieldId: 'customfield_10050',
        name: 'Environment',
        required: false,
        alwaysFill: true,
        defaultValue: 'Production',
        schemaType: 'string',
      },
    ];

    await saveFieldConfig('PROJ', '10001', fields);

    const setCall = (chrome.storage.local.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(setCall.jira_field_config).toBeDefined();
    expect(setCall.jira_field_config['PROJ_10001'].fields).toEqual(fields);
  });

  it('preserves existing configs for other project+issueType', async () => {
    const existingConfig = {
      OTHER_99999: {
        fields: [{ fieldId: 'f1', name: 'F1', required: false, alwaysFill: false, defaultValue: '', schemaType: 'string' }],
        lastFetched: 1000,
      },
    };
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      jira_field_config: existingConfig,
    });

    await saveFieldConfig('PROJ', '10001', []);

    const setCall = (chrome.storage.local.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // Should preserve OTHER_99999
    expect(setCall.jira_field_config['OTHER_99999']).toBeDefined();
    // Should add new PROJ_10001
    expect(setCall.jira_field_config['PROJ_10001']).toBeDefined();
  });

  it('records lastFetched timestamp', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const before = Date.now();

    await saveFieldConfig('PROJ', '10001', []);

    const after = Date.now();
    const setCall = (chrome.storage.local.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const lastFetched = setCall.jira_field_config['PROJ_10001'].lastFetched;
    expect(lastFetched).toBeGreaterThanOrEqual(before);
    expect(lastFetched).toBeLessThanOrEqual(after);
  });
});
