import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
});

const { JiraStep } = await import('./JiraStep');

beforeEach(() => {
  vi.clearAllMocks();
  (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
});

describe('JiraStep', () => {
  it('platform seçimi, URL ve token alanlarını render eder', () => {
    render(<JiraStep />);

    expect(screen.getByLabelText('Jira platform seçimi')).toBeTruthy();
    expect(screen.getByLabelText('Jira URL adresi')).toBeTruthy();
    expect(screen.getByLabelText('Jira API token')).toBeTruthy();
  });

  it('"Bağlantıyı Test Et" butonu disabled gösterilir', () => {
    render(<JiraStep />);

    const testButton = screen.getByLabelText('Bağlantıyı test et');
    expect(testButton.hasAttribute('disabled')).toBe(true);
  });

  it('platform seçiminde URL placeholder güncellenir', async () => {
    render(<JiraStep />);

    const platformSelect = screen.getByLabelText('Jira platform seçimi');
    fireEvent.change(platformSelect, { target: { value: 'cloud' } });

    await waitFor(() => {
      const urlInput = screen.getByLabelText('Jira URL adresi');
      expect((urlInput as HTMLInputElement).placeholder).toBe('https://domain.atlassian.net');
    });
  });

  it('URL girişi storage\'a yazar', async () => {
    render(<JiraStep />);

    const urlInput = screen.getByLabelText('Jira URL adresi');
    fireEvent.input(urlInput, { target: { value: 'https://mycompany.atlassian.net' } });

    await waitFor(() => {
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  it('token input type=password olarak gösterilir', () => {
    render(<JiraStep />);

    const tokenInput = screen.getByLabelText('Jira API token');
    expect((tokenInput as HTMLInputElement).type).toBe('password');
  });
});
