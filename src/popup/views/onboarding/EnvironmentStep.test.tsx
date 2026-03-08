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

const { EnvironmentStep } = await import('./EnvironmentStep');

beforeEach(() => {
  vi.clearAllMocks();
  (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
});

describe('EnvironmentStep', () => {
  it('proje adı, ortam ve agile takım alanlarını render eder', () => {
    render(<EnvironmentStep />);

    expect(screen.getByLabelText('Proje adı')).toBeTruthy();
    expect(screen.getByLabelText('Test ortamı')).toBeTruthy();
    expect(screen.getByLabelText('Agile takım')).toBeTruthy();
  });

  it('opsiyonel açıklama metnini gösterir', () => {
    render(<EnvironmentStep />);

    expect(screen.getByText(/İsteğe bağlı/)).toBeTruthy();
  });

  it('proje adı girişi storage\'a yazar', async () => {
    render(<EnvironmentStep />);

    const projectInput = screen.getByLabelText('Proje adı');
    fireEvent.input(projectInput, { target: { value: 'my-project' } });

    await waitFor(() => {
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  it('ortam seçimi storage\'a yazar', async () => {
    render(<EnvironmentStep />);

    const envSelect = screen.getByLabelText('Test ortamı');
    fireEvent.change(envSelect, { target: { value: 'staging' } });

    await waitFor(() => {
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  it('ortam seçenekleri doğru gösterilir', () => {
    render(<EnvironmentStep />);

    expect(screen.getByText('Staging')).toBeTruthy();
    expect(screen.getByText('Production')).toBeTruthy();
  });
});
