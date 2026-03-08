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

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const { JiraStep } = await import('./JiraStep');

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
});

describe('JiraStep', () => {
  it('platform seçimi render eder, Server seçilince URL ve token alanları gösterilir', async () => {
    render(<JiraStep />);

    expect(screen.getByLabelText('Jira platform seçimi')).toBeTruthy();
    expect(screen.queryByLabelText('Jira URL adresi')).toBeNull();

    const platformSelect = screen.getByLabelText('Jira platform seçimi');
    fireEvent.change(platformSelect, { target: { value: 'server' } });

    await waitFor(() => {
      expect(screen.getByLabelText('Jira URL adresi')).toBeTruthy();
      expect(screen.getByLabelText('Jira API token')).toBeTruthy();
    });
  });

  it('"Bağlantıyı Test Et" butonu platform seçilmeden gösterilmez', () => {
    render(<JiraStep />);

    expect(screen.queryByLabelText('Bağlantıyı test et')).toBeNull();
  });

  it('Server seçilip URL ve token girildiğinde test butonu aktif olur', async () => {
    render(<JiraStep />);

    const platformSelect = screen.getByLabelText('Jira platform seçimi');
    fireEvent.change(platformSelect, { target: { value: 'server' } });

    const urlInput = screen.getByLabelText('Jira URL adresi');
    const tokenInput = screen.getByLabelText('Jira API token');
    fireEvent.input(urlInput, { target: { value: 'https://jira.company.com' } });
    fireEvent.input(tokenInput, { target: { value: 'valid-token-12345' } });

    await waitFor(() => {
      const testButton = screen.getByLabelText('Bağlantıyı test et');
      expect(testButton.hasAttribute('disabled')).toBe(false);
    });
  });

  it('Cloud seçildiğinde "Ayarlar sayfasını kullanın" mesajı gösterilir', async () => {
    render(<JiraStep />);

    const platformSelect = screen.getByLabelText('Jira platform seçimi');
    fireEvent.change(platformSelect, { target: { value: 'cloud' } });

    await waitFor(() => {
      expect(screen.getByText(/Ayarlar sayfasını kullanın/)).toBeTruthy();
    });
  });

  it('Server bağlantı testi başarılı olursa mesaj gösterilir', async () => {
    render(<JiraStep />);

    const platformSelect = screen.getByLabelText('Jira platform seçimi');
    fireEvent.change(platformSelect, { target: { value: 'server' } });

    const urlInput = screen.getByLabelText('Jira URL adresi');
    const tokenInput = screen.getByLabelText('Jira API token');
    fireEvent.input(urlInput, { target: { value: 'https://jira.company.com' } });
    fireEvent.input(tokenInput, { target: { value: 'valid-pat-token-12345' } });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          accountId: 'user-1',
          displayName: 'Test User',
          avatarUrls: {},
        }),
    });

    const testButton = screen.getByLabelText('Bağlantıyı test et');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByText(/Bağlantı başarılı/)).toBeTruthy();
    });
  });

  it('Server bağlantı testi başarısız olursa hata gösterilir', async () => {
    render(<JiraStep />);

    const platformSelect = screen.getByLabelText('Jira platform seçimi');
    fireEvent.change(platformSelect, { target: { value: 'server' } });

    const urlInput = screen.getByLabelText('Jira URL adresi');
    const tokenInput = screen.getByLabelText('Jira API token');
    fireEvent.input(urlInput, { target: { value: 'https://jira.company.com' } });
    fireEvent.input(tokenInput, { target: { value: 'invalid-pat-12345' } });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const testButton = screen.getByLabelText('Bağlantıyı test et');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });
  });

  it('Server seçildiğinde URL placeholder güncellenir', async () => {
    render(<JiraStep />);

    const platformSelect = screen.getByLabelText('Jira platform seçimi');
    fireEvent.change(platformSelect, { target: { value: 'server' } });

    await waitFor(() => {
      const urlInput = screen.getByLabelText('Jira URL adresi');
      expect((urlInput as HTMLInputElement).placeholder).toBe('https://jira.sirketiniz.com');
    });
  });

  it('URL girişi storage\'a yazar', async () => {
    render(<JiraStep />);

    const platformSelect = screen.getByLabelText('Jira platform seçimi');
    fireEvent.change(platformSelect, { target: { value: 'server' } });

    await waitFor(() => {
      const urlInput = screen.getByLabelText('Jira URL adresi');
      fireEvent.input(urlInput, { target: { value: 'https://mycompany.atlassian.net' } });
    });

    await waitFor(() => {
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  it('token input type=password olarak gösterilir', async () => {
    render(<JiraStep />);

    const platformSelect = screen.getByLabelText('Jira platform seçimi');
    fireEvent.change(platformSelect, { target: { value: 'server' } });

    await waitFor(() => {
      const tokenInput = screen.getByLabelText('Jira API token');
      expect((tokenInput as HTMLInputElement).type).toBe('password');
    });
  });
});
