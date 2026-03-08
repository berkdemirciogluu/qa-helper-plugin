import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/preact';
import type { SessionMeta } from '@/lib/types';

// Chrome API mock
const mockTabsQuery = vi.fn();
const mockStorageGet = vi.fn();
const mockStorageSet = vi.fn();
const mockSendMessage = vi.fn();
const mockOpenOptionsPage = vi.fn();

vi.stubGlobal('chrome', {
  tabs: {
    query: mockTabsQuery,
  },
  runtime: {
    sendMessage: mockSendMessage,
    openOptionsPage: mockOpenOptionsPage,
  },
  storage: {
    local: {
      get: mockStorageGet,
      set: mockStorageSet,
    },
  },
});

// Import after stubbing globals
const { DashboardView } = await import('./DashboardView');

const mockIdleMeta: SessionMeta = {
  tabId: 1,
  startTime: Date.now(),
  url: 'https://example.com',
  status: 'idle',
  counters: { clicks: 0, xhrRequests: 0, consoleErrors: 0, navEvents: 0 },
};

const mockRecordingMeta: SessionMeta = {
  tabId: 1,
  startTime: Date.now() - 10000,
  url: 'https://example.com',
  status: 'recording',
  counters: { clicks: 2, xhrRequests: 5, consoleErrors: 1, navEvents: 3 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockTabsQuery.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
  mockStorageGet.mockResolvedValue({});
  mockStorageSet.mockResolvedValue(undefined);
  // Default: session idle
  mockSendMessage.mockResolvedValue({ success: true, data: mockIdleMeta });
});

describe('DashboardView', () => {
  it('başlangıçta "Session Başlat" butonu gösterilir (idle)', async () => {
    render(<DashboardView />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Session başlat' })).toBeTruthy();
    });
  });

  it('başlangıçta "Pasif" metni gösterilir', async () => {
    render(<DashboardView />);
    await waitFor(() => {
      expect(screen.getByText('Pasif')).toBeTruthy();
    });
  });

  it('sayaçlar sıfır gösterilir', async () => {
    render(<DashboardView />);
    await waitFor(() => {
      expect(screen.getByText('0 XHR')).toBeTruthy();
    });
  });

  it('recording state: "Aktif" metni ve "Durdur" butonu gösterilir', async () => {
    mockSendMessage.mockResolvedValue({ success: true, data: mockRecordingMeta });
    render(<DashboardView />);
    await waitFor(() => {
      expect(screen.getByText('Aktif')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Session durdur' })).toBeTruthy();
    });
  });

  it('"Session Başlat" basınca START_SESSION mesajı gönderilir', async () => {
    // İlk çekimde idle, başlatma sonrası recording
    mockSendMessage
      .mockResolvedValueOnce({ success: true, data: mockIdleMeta })
      .mockResolvedValueOnce({ success: true, data: mockRecordingMeta });

    render(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Session başlat' })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Session başlat' }));
    });

    await waitFor(() => {
      const calls = mockSendMessage.mock.calls as { action: string }[][];
      const startCall = calls.find((args) => args[0]?.action === 'START_SESSION');
      expect(startCall).toBeTruthy();
    });
  });

  it('footer "Tüm veriler cihazınızda" metni ile gösterilir', async () => {
    render(<DashboardView />);
    await waitFor(() => {
      expect(screen.getByText('Tüm veriler cihazınızda')).toBeTruthy();
    });
  });

  it('Veri Kaynakları bölümü tıklanınca toggle\'lar gösterilir', async () => {
    render(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByText('Veri Kaynakları')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Veri kaynakları bölümünü aç/kapat' }));
    });

    await waitFor(() => {
      expect(screen.getByText('HAR (XHR/Fetch)')).toBeTruthy();
      expect(screen.getByText('Console')).toBeTruthy();
    });
  });

  it('Ayarlar butonuna basınca openOptionsPage çağrılır', async () => {
    render(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ayarlar sayfasını aç' })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ayarlar sayfasını aç' }));
    });

    expect(mockOpenOptionsPage).toHaveBeenCalled();
  });
});
