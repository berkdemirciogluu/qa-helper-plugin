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

  it('renders all toggles', async () => {
    render(<GeneralSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('XHR/Fetch Recording')).toBeTruthy();
      expect(screen.getByText('Console Logs')).toBeTruthy();
      expect(screen.getByText('DOM Snapshot')).toBeTruthy();
      expect(screen.getByText('localStorage')).toBeTruthy();
      expect(screen.getByText('sessionStorage')).toBeTruthy();
    });
  });

  it('shows SectionGroup title', () => {
    render(<GeneralSettingsPage />);

    expect(screen.getByText('Data Sources')).toBeTruthy();
    expect(screen.getByText('Data types to include in bug reports')).toBeTruthy();
  });

  it('loads toggle values from storage', async () => {
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
      const harToggle = screen.getByLabelText('XHR/Fetch Recording');
      expect(harToggle.getAttribute('aria-checked')).toBe('false');
    });
  });

  it('saves merged config on toggle change', async () => {
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
      expect(screen.getByLabelText('XHR/Fetch Recording')).toBeTruthy();
    });

    const harToggle = screen.getByLabelText('XHR/Fetch Recording');
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

  it('reverts toggle on storage save failure', async () => {
    mockSet.mockImplementation(() => Promise.reject(new Error('Storage full')));

    render(<GeneralSettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('XHR/Fetch Recording')).toBeTruthy();
    });

    const harToggle = screen.getByLabelText('XHR/Fetch Recording');
    expect(harToggle.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(harToggle);

    await waitFor(() => {
      expect(harToggle.getAttribute('aria-checked')).toBe('true');
    });
  });

  it('shows toggle descriptions', async () => {
    render(<GeneralSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Records network requests (XHR and Fetch)')).toBeTruthy();
      expect(screen.getByText('Records console log, warn and error messages')).toBeTruthy();
    });
  });
});
