import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { DataManagementPage } from './DataManagementPage';
import { ToastContainer } from '@/components/ui/Toast';

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockRemove = vi.fn();
const mockGetBytesInUse = vi.fn();

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: mockGet,
      set: mockSet,
      remove: mockRemove,
      getBytesInUse: mockGetBytesInUse,
    },
  },
});

const mockStorageData: Record<string, unknown> = {
  session_meta_1: {
    tabId: 1,
    url: 'https://app.com',
    startTime: 1709900000000,
    status: 'recording',
    counters: { clicks: 5, xhrRequests: 3, consoleErrors: 1, navEvents: 2 },
  },
  session_xhr_1: [{ type: 'xhr' }],
  session_clicks_1: [{ type: 'click' }],
  session_config: { toggles: { har: true } },
};

describe('DataManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation(() => Promise.resolve({ ...mockStorageData }));
    mockGetBytesInUse.mockResolvedValue(125000);
    mockRemove.mockResolvedValue(undefined);
    mockSet.mockResolvedValue(undefined);
  });

  it('shows storage status section', async () => {
    render(<DataManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Storage Status')).toBeTruthy();
    });
  });

  it('shows total usage and session count', async () => {
    render(<DataManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('122.1 KB')).toBeTruthy();
      expect(screen.getByText('1')).toBeTruthy();
    });
  });

  it('shows session list', async () => {
    render(<DataManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/Tab #1/)).toBeTruthy();
      expect(screen.getByText(/app\.com/)).toBeTruthy();
      expect(screen.getByText(/11 events/)).toBeTruthy();
    });
  });

  it('shows info message when no sessions exist', async () => {
    mockGet.mockImplementation(() =>
      Promise.resolve({ session_config: { toggles: {} } }),
    );
    mockGetBytesInUse.mockResolvedValue(50);

    render(<DataManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('No active sessions found.')).toBeTruthy();
    });
  });

  it('shows Clear All Data button', async () => {
    render(<DataManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Clear All Data')).toBeTruthy();
    });
  });

  it('opens confirm modal on button click', async () => {
    render(<DataManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Clear All Data')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Clear All Data'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText('This action cannot be undone')).toBeTruthy();
      expect(screen.getByText('Clear')).toBeTruthy();
      expect(screen.getByText('Cancel')).toBeTruthy();
    });
  });

  it('closes modal on Cancel click', async () => {
    render(<DataManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Clear All Data')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Clear All Data'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('clears data and shows toast on Clear click', async () => {
    // After clear, return empty data
    let cleared = false;
    mockGet.mockImplementation(() => {
      if (cleared) {
        return Promise.resolve({ session_config: { toggles: {} } });
      }
      return Promise.resolve({ ...mockStorageData });
    });
    mockRemove.mockImplementation(() => {
      cleared = true;
      return Promise.resolve();
    });
    mockGetBytesInUse.mockImplementation(() =>
      Promise.resolve(cleared ? 50 : 125000),
    );

    render(
      <div>
        <ToastContainer />
        <DataManagementPage />
      </div>,
    );

    await waitFor(() => {
      expect(screen.getByText('Clear All Data')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Clear All Data'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Clear'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByText('All data cleared')).toBeTruthy();
    });
  });

  it('shows danger zone description', async () => {
    render(<DataManagementPage />);

    await waitFor(() => {
      expect(
        screen.getByText('Deletes all session records. Configuration settings are preserved.'),
      ).toBeTruthy();
    });
  });

  it('shows Loading message during load', () => {
    mockGet.mockImplementation(() => new Promise(() => {}));
    mockGetBytesInUse.mockImplementation(() => new Promise(() => {}));
    render(<DataManagementPage />);
    expect(screen.getByText('Loading...')).toBeTruthy();
  });
});
