import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';

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

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
});

async function renderAndWaitForLoad() {
  render(<JiraSetupPage />);
  await waitFor(() => {
    expect(screen.getByText(/Jira henüz yapılandırılmadı/)).toBeTruthy();
  });
}

describe('JiraSetupPage', () => {
  it('başlık ve açıklama ile render eder', async () => {
    await renderAndWaitForLoad();
    expect(screen.getByText('Jira Entegrasyonu')).toBeTruthy();
  });

  it('platform seçenekleri gösterilir', async () => {
    await renderAndWaitForLoad();
    expect(screen.getByLabelText('Jira Cloud')).toBeTruthy();
    expect(screen.getByLabelText('Jira Server / Data Center')).toBeTruthy();
  });

  it('başlangıçta hiç platform seçili değilken bilgi mesajı gösterilir', async () => {
    await renderAndWaitForLoad();
    expect(screen.getByText(/Jira henüz yapılandırılmadı/)).toBeTruthy();
  });

  it('Cloud seçildiğinde OAuth bağlantı butonu gösterilir', async () => {
    await renderAndWaitForLoad();
    const cloudRadio = screen.getByLabelText('Jira Cloud');
    fireEvent.click(cloudRadio);
    await waitFor(() => {
      expect(screen.getByText("Jira Cloud'a Bağlan")).toBeTruthy();
    });
  });

  it('Server seçildiğinde URL ve PAT alanları gösterilir', async () => {
    await renderAndWaitForLoad();
    const serverRadio = screen.getByLabelText('Jira Server / Data Center');
    fireEvent.click(serverRadio);
    await waitFor(() => {
      expect(screen.getByLabelText('Jira URL')).toBeTruthy();
      expect(screen.getByLabelText('API Token')).toBeTruthy();
    });
  });

  it('Server seçildiğinde "Bağlantıyı Test Et" butonu gösterilir', async () => {
    await renderAndWaitForLoad();
    const serverRadio = screen.getByLabelText('Jira Server / Data Center');
    fireEvent.click(serverRadio);
    await waitFor(() => {
      expect(screen.getByText('Bağlantıyı Test Et')).toBeTruthy();
    });
  });

  it('Server bağlantı testi başarılı olursa bağlantı durumu gösterilir', async () => {
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
      json: () =>
        Promise.resolve([
          { id: '1', key: 'PROJ', name: 'Test Project', avatarUrls: {} },
        ]),
    });

    const testButton = screen.getByText('Bağlantıyı Test Et');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByText(/Bağlantı başarılı/)).toBeTruthy();
    });
  });

  it('bağlantı testi başarısız olursa hata gösterilir', async () => {
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

    const testButton = screen.getByText('Bağlantıyı Test Et');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });
  });

  it('"Bağlantıyı Kes" butonu bağlantıyı temizler', async () => {
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
      expect(screen.getByText(/Bağlı/)).toBeTruthy();
    });

    const disconnectButton = screen.getByText('Bağlantıyı Kes');
    fireEvent.click(disconnectButton);

    await waitFor(() => {
      expect(screen.getByText(/Jira henüz yapılandırılmadı/)).toBeTruthy();
    });
  });

  it('bağlı durumdayken proje dropdown gösterilir', async () => {
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
      json: () =>
        Promise.resolve([
          { id: '1', key: 'PROJ', name: 'Test Project', avatarUrls: {} },
        ]),
    });

    render(<JiraSetupPage />);
    await waitFor(() => {
      expect(screen.getByText(/Varsayılan Proje/)).toBeTruthy();
    });
  });

  it('OAuth Cloud bağlantısı başarılı olursa connected state gösterilir', async () => {
    await renderAndWaitForLoad();
    const cloudRadio = screen.getByLabelText('Jira Cloud');
    fireEvent.click(cloudRadio);

    // Mock successful OAuth flow
    const mockRedirectUrl =
      'https://ext-id.chromiumapp.org/atlassian?code=auth-code-123&state=test-state-uuid';
    (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRedirectUrl,
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
        Promise.resolve([
          { id: '1', key: 'CLOUD', name: 'Cloud Project', avatarUrls: {} },
        ]),
    });

    await waitFor(() => {
      expect(screen.getByText("Jira Cloud'a Bağlan")).toBeTruthy();
    });
    const connectButton = screen.getByText("Jira Cloud'a Bağlan");
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(screen.getByText(/Bağlı/)).toBeTruthy();
    });
  });

  it('erişilebilirlik: radio gruplar role="radiogroup" kullanır', async () => {
    await renderAndWaitForLoad();
    expect(screen.getByRole('radiogroup')).toBeTruthy();
  });

  it('bağlantı durumu aria-live="polite" ile duyurulur', async () => {
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
      const statusEl = screen.getByText(/Bağlı/).closest('[aria-live]');
      expect(statusEl?.getAttribute('aria-live')).toBe('polite');
    });
  });

  it('Cloud bağlı durumdayken site adı gösterilir', async () => {
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
        Promise.resolve([
          { id: '1', key: 'CLOUD', name: 'Cloud Project', avatarUrls: {} },
        ]),
    });

    render(<JiraSetupPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Cloud User/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/My Site/).length).toBeGreaterThan(0);
    });
  });
});
