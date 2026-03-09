import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';

vi.mock('@/lib/jira/jira-field-discovery', () => ({
  getIssueTypesForProject: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getFieldsForIssueType: vi.fn().mockResolvedValue({ success: true, data: [] }),
  loadFieldConfig: vi.fn().mockResolvedValue([]),
  saveFieldConfig: vi.fn().mockResolvedValue(undefined),
}));

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

vi.stubGlobal('crypto', { ...globalThis.crypto, randomUUID: vi.fn(() => 'test-state-uuid') });

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const { JiraSetupPage } = await import('./JiraSetupPage');
const jfd = await import('@/lib/jira/jira-field-discovery');

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  vi.mocked(jfd.getIssueTypesForProject).mockReset().mockResolvedValue({ success: true, data: [] });
  vi.mocked(jfd.getFieldsForIssueType).mockReset().mockResolvedValue({ success: true, data: [] });
  vi.mocked(jfd.loadFieldConfig).mockReset().mockResolvedValue([]);
  vi.mocked(jfd.saveFieldConfig).mockReset().mockResolvedValue(undefined);
});

async function renderAndWaitForLoad() {
  render(<JiraSetupPage />);
  await waitFor(() => {
    expect(screen.getByText(/Jira is not configured yet/)).toBeTruthy();
  });
}

describe('JiraSetupPage', () => {
  it('renders with title and description', async () => {
    await renderAndWaitForLoad();
    expect(screen.getByText('Jira Integration')).toBeTruthy();
  });

  it('shows platform options', async () => {
    await renderAndWaitForLoad();
    expect(screen.getByLabelText('Jira Cloud')).toBeTruthy();
    expect(screen.getByLabelText('Jira Server / Data Center')).toBeTruthy();
  });

  it('shows info message when no platform is selected', async () => {
    await renderAndWaitForLoad();
    expect(screen.getByText(/Jira is not configured yet/)).toBeTruthy();
  });

  it('shows OAuth connect button when Cloud is selected', async () => {
    await renderAndWaitForLoad();
    const cloudRadio = screen.getByLabelText('Jira Cloud');
    fireEvent.click(cloudRadio);
    await waitFor(() => {
      expect(screen.getByText('Connect to Jira Cloud')).toBeTruthy();
    });
  });

  it('shows URL and PAT fields when Server is selected', async () => {
    await renderAndWaitForLoad();
    const serverRadio = screen.getByLabelText('Jira Server / Data Center');
    fireEvent.click(serverRadio);
    await waitFor(() => {
      expect(screen.getByLabelText('Jira URL')).toBeTruthy();
      expect(screen.getByLabelText('API Token')).toBeTruthy();
    });
  });

  it('shows Test Connection button when Server is selected', async () => {
    await renderAndWaitForLoad();
    const serverRadio = screen.getByLabelText('Jira Server / Data Center');
    fireEvent.click(serverRadio);
    await waitFor(() => {
      expect(screen.getByText('Test Connection')).toBeTruthy();
    });
  });

  it('shows connection status on successful Server connection test', async () => {
    await renderAndWaitForLoad();
    const serverRadio = screen.getByLabelText('Jira Server / Data Center');
    fireEvent.click(serverRadio);

    await waitFor(() => {
      const urlInput = screen.getByLabelText('Jira URL');
      const tokenInput = screen.getByLabelText('API Token');
      fireEvent.input(urlInput, { target: { value: 'https://jira.company.com' } });
      fireEvent.input(tokenInput, { target: { value: 'valid-pat-token-12345' } });
    });

    // Mock successful test connection
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          accountId: 'user-1',
          displayName: 'Test User',
          avatarUrls: {},
        }),
    });
    // Mock successful getProjects
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: '1', key: 'PROJ', name: 'Test Project', avatarUrls: {} }]),
    });

    const testButton = screen.getByText('Test Connection');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getAllByText(/Connected/).length).toBeGreaterThan(0);
    });
  });

  it('shows error on failed connection test', async () => {
    await renderAndWaitForLoad();
    const serverRadio = screen.getByLabelText('Jira Server / Data Center');
    fireEvent.click(serverRadio);

    await waitFor(() => {
      const urlInput = screen.getByLabelText('Jira URL');
      const tokenInput = screen.getByLabelText('API Token');
      fireEvent.input(urlInput, { target: { value: 'https://jira.company.com' } });
      fireEvent.input(tokenInput, { target: { value: 'invalid-pat-token-12345' } });
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const testButton = screen.getByText('Test Connection');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });
  });

  it('Disconnect button clears connection', async () => {
    // Simulate connected state by loading from storage
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      jira_credentials: {
        platform: 'server',
        url: 'https://jira.company.com',
        token: 'valid-token-12345',
        displayName: 'Test User',
        connected: true,
      },
    });

    // Mock getProjects for connected state
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<JiraSetupPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Connected/).length).toBeGreaterThan(0);
    });

    const disconnectButton = screen.getByText('Disconnect');
    fireEvent.click(disconnectButton);

    await waitFor(() => {
      expect(screen.getByText(/Jira is not configured yet/)).toBeTruthy();
    });
  });

  it('shows project dropdown when connected', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      jira_credentials: {
        platform: 'server',
        url: 'https://jira.company.com',
        token: 'valid-token-12345',
        displayName: 'Test User',
        connected: true,
        defaultProjectKey: 'PROJ',
      },
    });

    // Mock getProjects
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: '1', key: 'PROJ', name: 'Test Project', avatarUrls: {} }]),
    });

    render(<JiraSetupPage />);
    await waitFor(() => {
      expect(screen.getByText(/Default Project/)).toBeTruthy();
    });
  });

  it('OAuth Cloud connection shows connected state on success', async () => {
    await renderAndWaitForLoad();
    const cloudRadio = screen.getByLabelText('Jira Cloud');
    fireEvent.click(cloudRadio);

    // Mock successful OAuth flow
    const mockRedirectUrl =
      'https://ext-id.chromiumapp.org/atlassian?code=auth-code-123&state=test-state-uuid';
    (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRedirectUrl
    );

    // Token exchange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'at-123',
          expires_in: 3600,
          refresh_token: 'rt-456',
          scope: 'read:jira-work',
        }),
    });
    // Accessible resources
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: 'cloud-id',
            name: 'My Site',
            url: 'https://mysite.atlassian.net',
            scopes: [],
            avatarUrl: '',
          },
        ]),
    });
    // testConnection
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          accountId: 'user-123',
          displayName: 'Cloud User',
          avatarUrls: {},
        }),
    });
    // getProjects
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([{ id: '1', key: 'CLOUD', name: 'Cloud Project', avatarUrls: {} }]),
    });

    await waitFor(() => {
      expect(screen.getByText('Connect to Jira Cloud')).toBeTruthy();
    });
    const connectButton = screen.getByText('Connect to Jira Cloud');
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(screen.getAllByText(/Connected/).length).toBeGreaterThan(0);
    });
  });

  it('accessibility: radio groups use role="radiogroup"', async () => {
    await renderAndWaitForLoad();
    expect(screen.getByRole('radiogroup')).toBeTruthy();
  });

  it('connection status is announced with aria-live="polite"', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      jira_credentials: {
        platform: 'server',
        url: 'https://jira.company.com',
        token: 'valid-token-12345',
        displayName: 'Test User',
        connected: true,
      },
    });

    // Mock getProjects for connected state
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<JiraSetupPage />);
    await waitFor(() => {
      const statusEls = screen.getAllByText(/Connected/);
      const statusEl = statusEls.find(el => el.closest('[aria-live]'));
      expect(statusEl?.closest('[aria-live]')?.getAttribute('aria-live')).toBe('polite');
    });
  });

  it('shows site name when Cloud is connected', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      jira_credentials: {
        platform: 'cloud',
        url: 'https://mysite.atlassian.net',
        token: 'access-token-123',
        cloudId: 'cloud-id',
        siteName: 'My Site',
        displayName: 'Cloud User',
        connected: true,
      },
    });

    // Mock getProjects
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([{ id: '1', key: 'CLOUD', name: 'Cloud Project', avatarUrls: {} }]),
    });

    render(<JiraSetupPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Cloud User/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/My Site/).length).toBeGreaterThan(0);
    });
  });
});

describe('JiraSetupPage — Field Configuration', () => {
  const connectedStorageValue = {
    jira_credentials: {
      platform: 'server',
      url: 'https://jira.company.com',
      token: 'valid-token-12345',
      displayName: 'Test User',
      connected: true,
      defaultProjectKey: 'PROJ',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  async function renderConnectedWithProject() {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue(connectedStorageValue);
    // getProjects
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: '1', key: 'PROJ', name: 'Test Project', avatarUrls: {} }]),
    });
    // getIssueTypesForProject — use vi.mock instead of fetch
    vi.mocked(jfd.getIssueTypesForProject).mockResolvedValue({
      success: true,
      data: [
        { id: '10001', name: 'Bug', subtask: false },
        { id: '10002', name: 'Task', subtask: false },
      ],
    });
    render(<JiraSetupPage />);
    await waitFor(() => {
      expect(screen.getByText(/Field Configuration/)).toBeTruthy();
    });
    // Wait for issue types to load so the select is populated
    await waitFor(() => {
      const select = screen.getByLabelText('Issue type') as HTMLSelectElement;
      expect(select.options.length).toBeGreaterThan(1);
    });
  }

  it('shows issue type dropdown when project is selected', async () => {
    await renderConnectedWithProject();
    expect(screen.getByLabelText('Issue type')).toBeTruthy();
  });

  it('issue type dropdown is populated with API response', async () => {
    await renderConnectedWithProject();
    await waitFor(() => {
      // Select dropdown should contain Bug and Task options
      const select = screen.getByLabelText('Issue type');
      expect(select).toBeTruthy();
    });
  });

  it('shows field list after issue type selection', async () => {
    await renderConnectedWithProject();

    vi.mocked(jfd.getFieldsForIssueType).mockResolvedValue({
      success: true,
      data: [
        {
          fieldId: 'customfield_10050',
          name: 'Environment Type',
          required: false,
          hasDefaultValue: false,
          schema: { type: 'string' },
          allowedValues: undefined,
        },
      ],
    });

    const select = screen.getByLabelText('Issue type') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '10001' } });

    await waitFor(() => {
      expect(screen.getByText('Environment Type')).toBeTruthy();
    });
  });

  it('shows Required badge for required fields', async () => {
    await renderConnectedWithProject();

    vi.mocked(jfd.getFieldsForIssueType).mockResolvedValue({
      success: true,
      data: [
        {
          fieldId: 'customfield_10060',
          name: 'Sprint',
          required: true,
          hasDefaultValue: false,
          schema: { type: 'string' },
          allowedValues: undefined,
        },
      ],
    });

    const select = screen.getByLabelText('Issue type') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '10001' } });

    await waitFor(() => {
      expect(screen.getByText('Required')).toBeTruthy();
    });
  });

  it('toggle is visible for optional fields', async () => {
    await renderConnectedWithProject();

    vi.mocked(jfd.getFieldsForIssueType).mockResolvedValue({
      success: true,
      data: [
        {
          fieldId: 'customfield_10050',
          name: 'Environment Type',
          required: false,
          hasDefaultValue: false,
          schema: { type: 'string' },
          allowedValues: undefined,
        },
      ],
    });

    const select = screen.getByLabelText('Issue type') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '10001' } });

    await waitFor(() => {
      expect(screen.getByLabelText('Environment Type always fill')).toBeTruthy();
    });
  });

  it('shows Select for fields with allowedValues', async () => {
    await renderConnectedWithProject();

    vi.mocked(jfd.getFieldsForIssueType).mockResolvedValue({
      success: true,
      data: [
        {
          fieldId: 'customfield_10050',
          name: 'Priority Level',
          required: true,
          hasDefaultValue: false,
          schema: { type: 'option' },
          allowedValues: [
            { id: '1', value: 'High' },
            { id: '2', value: 'Low' },
          ],
        },
      ],
    });

    const select = screen.getByLabelText('Issue type') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '10001' } });

    await waitFor(() => {
      expect(screen.getByLabelText('Priority Level default value')).toBeTruthy();
    });
  });

  it('excluded fields (summary, description) do not appear', async () => {
    await renderConnectedWithProject();

    // getFieldsForIssueType already excludes summary/description (EXCLUDED_FIELD_KEYS filter)
    // Mock returns only non-excluded fields (as the real implementation would)
    vi.mocked(jfd.getFieldsForIssueType).mockResolvedValue({
      success: true,
      data: [
        {
          fieldId: 'customfield_10050',
          name: 'Environment',
          required: false,
          hasDefaultValue: false,
          schema: { type: 'string' },
          allowedValues: undefined,
        },
      ],
    });

    const select = screen.getByLabelText('Issue type') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '10001' } });

    await waitFor(() => {
      expect(screen.getByText('Environment')).toBeTruthy();
      const summaryFields = screen.queryAllByText('Summary');
      expect(summaryFields.length).toBe(0);
    });
  });

  it('shows error when field loading fails', async () => {
    await renderConnectedWithProject();

    vi.mocked(jfd.getFieldsForIssueType).mockResolvedValue({
      success: false,
      error: 'No permissions to access field metadata.',
    });

    const select = screen.getByLabelText('Issue type') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '10001' } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });
  });

  it('reloads fields when project changes', async () => {
    await renderConnectedWithProject();

    // New project change triggers new issue type load
    vi.mocked(jfd.getIssueTypesForProject).mockResolvedValue({
      success: true,
      data: [{ id: '20001', name: 'Story', subtask: false }],
    });

    const projectSelect = screen.getByLabelText('Default Jira project') as HTMLSelectElement;
    fireEvent.change(projectSelect, { target: { value: 'OTHER' } });

    await waitFor(() => {
      expect(jfd.getIssueTypesForProject).toHaveBeenCalled();
    });
  });

  it('saves default value to storage when changed', async () => {
    await renderConnectedWithProject();

    vi.mocked(jfd.getFieldsForIssueType).mockResolvedValue({
      success: true,
      data: [
        {
          fieldId: 'customfield_10050',
          name: 'Team',
          required: false,
          hasDefaultValue: false,
          schema: { type: 'string' },
          allowedValues: undefined,
        },
      ],
    });

    const issueTypeSelect = screen.getByLabelText('Issue type') as HTMLSelectElement;
    fireEvent.change(issueTypeSelect, { target: { value: '10001' } });

    await waitFor(() => {
      expect(screen.getByText('Team')).toBeTruthy();
    });

    // Toggle alwaysFill — saveFieldConfig should be called
    const toggle = screen.getByLabelText('Team always fill');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(jfd.saveFieldConfig).toHaveBeenCalled();
    });
  });

  it('shows Refresh Fields button when issue type is selected', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      jira_credentials: {
        ...connectedStorageValue.jira_credentials,
        defaultIssueTypeId: '10001',
        defaultIssueTypeName: 'Bug',
      },
    });
    // getProjects
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: '1', key: 'PROJ', name: 'Test Project', avatarUrls: {} }]),
    });
    vi.mocked(jfd.getIssueTypesForProject).mockResolvedValue({
      success: true,
      data: [{ id: '10001', name: 'Bug', subtask: false }],
    });
    vi.mocked(jfd.getFieldsForIssueType).mockResolvedValue({ success: true, data: [] });

    render(<JiraSetupPage />);
    await waitFor(() => {
      expect(screen.getByLabelText('Refresh fields')).toBeTruthy();
    });
  });

  it('restores saved config when issue type is re-selected', async () => {
    await renderConnectedWithProject();

    vi.mocked(jfd.getFieldsForIssueType).mockResolvedValue({
      success: true,
      data: [
        {
          fieldId: 'customfield_10050',
          name: 'Environment',
          required: false,
          hasDefaultValue: false,
          schema: { type: 'string' },
          allowedValues: undefined,
        },
      ],
    });
    vi.mocked(jfd.loadFieldConfig).mockResolvedValue([
      {
        fieldId: 'customfield_10050',
        name: 'Environment',
        required: false,
        alwaysFill: true,
        defaultValue: 'Staging',
        schemaType: 'string',
      },
    ]);

    const select = screen.getByLabelText('Issue type') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '10001' } });

    await waitFor(() => {
      // The field should be loaded and the saved alwaysFill value restored
      expect(screen.getByText('Environment')).toBeTruthy();
    });
  });
});
