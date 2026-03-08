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

  it('depolama durumu bölümünü gösterir', async () => {
    render(<DataManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Depolama Durumu')).toBeTruthy();
    });
  });

  it('toplam kullanımı ve session sayısını gösterir', async () => {
    render(<DataManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('122.1 KB')).toBeTruthy();
      expect(screen.getByText('1')).toBeTruthy();
    });
  });

  it('session listesini gösterir', async () => {
    render(<DataManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/Tab #1/)).toBeTruthy();
      expect(screen.getByText(/app\.com/)).toBeTruthy();
      expect(screen.getByText(/11 olay/)).toBeTruthy();
    });
  });

  it('session yoksa bilgi mesajı gösterir', async () => {
    mockGet.mockImplementation(() =>
      Promise.resolve({ session_config: { toggles: {} } }),
    );
    mockGetBytesInUse.mockResolvedValue(50);

    render(<DataManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Aktif session bulunmuyor.')).toBeTruthy();
    });
  });

  it('Tüm Verileri Temizle butonu gösterilir', async () => {
    render(<DataManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Tüm Verileri Temizle')).toBeTruthy();
    });
  });

  it('buton tıklandığında onay modalı açılır', async () => {
    render(<DataManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Tüm Verileri Temizle')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Tüm Verileri Temizle'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText('Bu işlem geri alınamaz')).toBeTruthy();
      expect(screen.getByText('Temizle')).toBeTruthy();
      expect(screen.getByText('İptal')).toBeTruthy();
    });
  });

  it('İptal butonuna basınca modal kapanır', async () => {
    render(<DataManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Tüm Verileri Temizle')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Tüm Verileri Temizle'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('İptal'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('Temizle butonuna basınca veriler silinir ve toast gösterilir', async () => {
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
      expect(screen.getByText('Tüm Verileri Temizle')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Tüm Verileri Temizle'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Temizle'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByText('Tüm veriler temizlendi')).toBeTruthy();
    });
  });

  it('tehlikeli bölge açıklaması gösterilir', async () => {
    render(<DataManagementPage />);

    await waitFor(() => {
      expect(
        screen.getByText('Tüm session kayıtlarını siler. Konfigürasyon ayarları korunur.'),
      ).toBeTruthy();
    });
  });

  it('yükleme sırasında Yükleniyor mesajı gösterilir', () => {
    mockGet.mockImplementation(() => new Promise(() => {}));
    mockGetBytesInUse.mockImplementation(() => new Promise(() => {}));
    render(<DataManagementPage />);
    expect(screen.getByText('Yükleniyor...')).toBeTruthy();
  });
});
