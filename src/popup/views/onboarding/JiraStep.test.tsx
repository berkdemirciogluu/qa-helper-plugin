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
  it('renders platform selection, shows URL and token fields when Server selected', async () => {
    render(<JiraStep />);

    expect(screen.getByLabelText('Jira platform selection')).toBeTruthy();
    expect(screen.queryByLabelText('Jira URL address')).toBeNull();

    const platformSelect = screen.getByLabelText('Jira platform selection');
    fireEvent.change(platformSelect, { target: { value: 'server' } });

    await waitFor(() => {
      expect(screen.getByLabelText('Jira URL address')).toBeTruthy();
      expect(screen.getByLabelText('Jira API token')).toBeTruthy();
    });
  });

  it('Test Connection button not shown without platform selection', () => {
    render(<JiraStep />);

    expect(screen.queryByLabelText('Test connection')).toBeNull();
  });

  it('test button becomes active when Server selected with URL and token', async () => {
    render(<JiraStep />);

    const platformSelect = screen.getByLabelText('Jira platform selection');
    fireEvent.change(platformSelect, { target: { value: 'server' } });

    const urlInput = screen.getByLabelText('Jira URL address');
    const tokenInput = screen.getByLabelText('Jira API token');
    fireEvent.input(urlInput, { target: { value: 'https://jira.company.com' } });
    fireEvent.input(tokenInput, { target: { value: 'valid-token-12345' } });

    await waitFor(() => {
      const testButton = screen.getByLabelText('Test connection');
      expect(testButton.hasAttribute('disabled')).toBe(false);
    });
  });

  it('shows "Use the Settings page" message when Cloud selected', async () => {
    render(<JiraStep />);

    const platformSelect = screen.getByLabelText('Jira platform selection');
    fireEvent.change(platformSelect, { target: { value: 'cloud' } });

    await waitFor(() => {
      expect(screen.getByText(/Use the Settings page/)).toBeTruthy();
    });
  });

  it('shows success message when Server connection test succeeds', async () => {
    render(<JiraStep />);

    const platformSelect = screen.getByLabelText('Jira platform selection');
    fireEvent.change(platformSelect, { target: { value: 'server' } });

    const urlInput = screen.getByLabelText('Jira URL address');
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

    const testButton = screen.getByLabelText('Test connection');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByText(/Connected/)).toBeTruthy();
    });
  });

  it('shows error when Server connection test fails', async () => {
    render(<JiraStep />);

    const platformSelect = screen.getByLabelText('Jira platform selection');
    fireEvent.change(platformSelect, { target: { value: 'server' } });

    const urlInput = screen.getByLabelText('Jira URL address');
    const tokenInput = screen.getByLabelText('Jira API token');
    fireEvent.input(urlInput, { target: { value: 'https://jira.company.com' } });
    fireEvent.input(tokenInput, { target: { value: 'invalid-pat-12345' } });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const testButton = screen.getByLabelText('Test connection');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });
  });

  it('URL placeholder updates when Server selected', async () => {
    render(<JiraStep />);

    const platformSelect = screen.getByLabelText('Jira platform selection');
    fireEvent.change(platformSelect, { target: { value: 'server' } });

    await waitFor(() => {
      const urlInput = screen.getByLabelText('Jira URL address');
      expect((urlInput as HTMLInputElement).placeholder).toBe('https://jira.yourcompany.com');
    });
  });

  it('URL input writes to storage', async () => {
    render(<JiraStep />);

    const platformSelect = screen.getByLabelText('Jira platform selection');
    fireEvent.change(platformSelect, { target: { value: 'server' } });

    await waitFor(() => {
      const urlInput = screen.getByLabelText('Jira URL address');
      fireEvent.input(urlInput, { target: { value: 'https://mycompany.atlassian.net' } });
    });

    await waitFor(() => {
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  it('token input shown as type=password', async () => {
    render(<JiraStep />);

    const platformSelect = screen.getByLabelText('Jira platform selection');
    fireEvent.change(platformSelect, { target: { value: 'server' } });

    await waitFor(() => {
      const tokenInput = screen.getByLabelText('Jira API token');
      expect((tokenInput as HTMLInputElement).type).toBe('password');
    });
  });
});
