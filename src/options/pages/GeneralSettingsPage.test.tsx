import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { GeneralSettingsPage } from './GeneralSettingsPage';

const mockGet = vi.fn();
const mockSet = vi.fn();

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: mockGet,
      set: mockSet,
    },
  },
});

describe('GeneralSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((_key: string) =>
      Promise.resolve({
        session_config: {
          toggles: {
            har: true,
            console: true,
            dom: true,
            localStorage: true,
            sessionStorage: true,
          },
        },
      })
    );
    mockSet.mockImplementation(() => Promise.resolve());
  });

  it('tüm toggle ları render eder', async () => {
    render(<GeneralSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('XHR/Fetch Kaydı')).toBeTruthy();
      expect(screen.getByText('Console Logları')).toBeTruthy();
      expect(screen.getByText('DOM Snapshot')).toBeTruthy();
      expect(screen.getByText('localStorage')).toBeTruthy();
      expect(screen.getByText('sessionStorage')).toBeTruthy();
    });
  });

  it('SectionGroup başlığını gösterir', () => {
    render(<GeneralSettingsPage />);

    expect(screen.getByText('Veri Kaynakları')).toBeTruthy();
    expect(screen.getByText('Bug raporlarına dahil edilecek veri türleri')).toBeTruthy();
  });

  it('storage dan toggle değerlerini yükler', async () => {
    mockGet.mockImplementation(() =>
      Promise.resolve({
        session_config: {
          toggles: {
            har: false,
            console: true,
            dom: true,
            localStorage: false,
            sessionStorage: true,
          },
        },
      })
    );

    render(<GeneralSettingsPage />);

    await waitFor(() => {
      const harToggle = screen.getByLabelText('XHR/Fetch Kaydı');
      expect(harToggle.getAttribute('aria-checked')).toBe('false');
    });
  });

  it('toggle değişikliğinde mevcut config ile merge ederek kaydeder', async () => {
    mockGet.mockImplementation(() =>
      Promise.resolve({
        session_config: {
          toggles: {
            har: true,
            console: true,
            dom: true,
            localStorage: true,
            sessionStorage: true,
          },
          someOtherProperty: 'preserved',
        },
      })
    );

    render(<GeneralSettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('XHR/Fetch Kaydı')).toBeTruthy();
    });

    const harToggle = screen.getByLabelText('XHR/Fetch Kaydı');
    fireEvent.click(harToggle);

    await waitFor(() => {
      expect(mockSet).toHaveBeenCalledWith({
        session_config: expect.objectContaining({
          someOtherProperty: 'preserved',
          toggles: expect.objectContaining({ har: false }),
        }),
      });
    });
  });

  it('storage kaydetme başarısız olursa toggle ı geri alır', async () => {
    mockSet.mockImplementation(() => Promise.reject(new Error('Storage full')));

    render(<GeneralSettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('XHR/Fetch Kaydı')).toBeTruthy();
    });

    const harToggle = screen.getByLabelText('XHR/Fetch Kaydı');
    expect(harToggle.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(harToggle);

    await waitFor(() => {
      expect(harToggle.getAttribute('aria-checked')).toBe('true');
    });
  });

  it('toggle açıklamalarını gösterir', async () => {
    render(<GeneralSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Ağ isteklerini (XHR ve Fetch) kaydeder')).toBeTruthy();
      expect(screen.getByText('Console log, warn ve error mesajlarını kaydeder')).toBeTruthy();
    });
  });
});
