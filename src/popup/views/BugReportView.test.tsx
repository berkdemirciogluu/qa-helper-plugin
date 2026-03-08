import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/preact';
import { BugReportView } from './BugReportView';
import type { SnapshotData } from '@/lib/types';

const mockSnapshotData: SnapshotData = {
  screenshot: {
    dataUrl: 'data:image/png;base64,abc',
    metadata: {
      viewport: { width: 1920, height: 1080 },
      browserVersion: 'Chrome 133',
      os: 'Windows 10/11',
      zoomLevel: 1,
      pixelRatio: 1,
      language: 'tr-TR',
      url: 'https://example.com',
      timestamp: Date.now(),
    },
  },
  dom: { html: '<html></html>', doctype: '<!DOCTYPE html>', url: 'https://example.com' },
  storage: { localStorage: { key: 'val' }, sessionStorage: {} },
  consoleLogs: [
    { timestamp: Date.now(), level: 'error', message: 'Test error' },
  ],
  timestamp: Date.now(),
  collectionDurationMs: 100,
};

vi.stubGlobal('chrome', {
  tabs: {
    query: vi.fn().mockResolvedValue([{ id: 42, url: 'https://example.com' }]),
  },
  runtime: {
    sendMessage: vi.fn().mockResolvedValue({
      success: true,
      data: mockSnapshotData,
    }),
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  (chrome.tabs.query as ReturnType<typeof vi.fn>).mockResolvedValue([
    { id: 42, url: 'https://example.com' },
  ]);
  (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
    success: true,
    data: mockSnapshotData,
  });
  (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
});

describe('BugReportView', () => {
  it('başlık render edilir', () => {
    render(<BugReportView hasSession={true} />);
    expect(screen.getByText('Bug Raporu')).toBeTruthy();
  });

  it('geri ok butonu render edilir', () => {
    render(<BugReportView hasSession={true} />);
    expect(screen.getByLabelText("Dashboard'a dön")).toBeTruthy();
  });

  it('snapshot yüklenirken chrome API çağrılır', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(chrome.tabs.query).toHaveBeenCalled();
    });
  });

  it('snapshot başarılı olduğunda görüntü gösterilir', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByAltText('Sayfa ekran görüntüsü')).toBeTruthy();
    });
  });

  it('form alanları render edilir', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByLabelText('Beklenen sonuç')).toBeTruthy();
      expect(screen.getByLabelText('Neden bug')).toBeTruthy();
    });
  });

  it('priority select Medium varsayılan değer ile render edilir', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      const select = screen.getByRole('combobox', { name: 'Öncelik' }) as HTMLSelectElement;
      expect(select.value).toBe('medium');
    });
  });

  it("Steps to Reproduce varsayılan kapalı", async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      const btn = screen.getByText('Steps to Reproduce');
      expect(btn).toBeTruthy();
      // Textarea görünmemeli
      expect(screen.queryByLabelText('Steps to reproduce')).toBeNull();
    });
  });

  it("Steps to Reproduce açılıp kapatılabiliyor", async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => screen.getByText('Steps to Reproduce'));
    const toggle = screen.getByText('Steps to Reproduce').closest('button')!;
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Steps to reproduce')).toBeTruthy();
    fireEvent.click(toggle);
    expect(screen.queryByLabelText('Steps to reproduce')).toBeNull();
  });

  it('Yeniden Çek butonu render edilir', async () => {
    render(<BugReportView hasSession={true} />);
    expect(screen.getByLabelText("Screenshot'ı yeniden çek")).toBeTruthy();
  });

  it('DataSummary render edilir (snapshot sonrası)', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Toplanan veriler' })).toBeTruthy();
    });
  });

  it("session'sız modda steps placeholder farklı", async () => {
    render(<BugReportView hasSession={false} />);
    await waitFor(() => screen.getByText('Steps to Reproduce'));
    const toggle = screen.getByText('Steps to Reproduce').closest('button')!;
    fireEvent.click(toggle);
    const textarea = screen.getByLabelText('Steps to reproduce') as HTMLTextAreaElement;
    expect(textarea.placeholder).toContain('Session kaydı yok');
  });

  it('export butonları disabled', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      const zipBtn = screen.getByText('ZIP İndir').closest('button')! as HTMLButtonElement;
      const jiraBtn = screen.getByText("Jira'ya Gönder").closest('button')! as HTMLButtonElement;
      expect(zipBtn.disabled).toBe(true);
      expect(jiraBtn.disabled).toBe(true);
    });
  });

  it('Konfigürasyon alanları render edilir', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByLabelText('Environment')).toBeTruthy();
    });
  });

  it('snapshot hata durumunda hata mesajı gösterilir', async () => {
    (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: false,
      error: 'Screenshot alınamadı',
    });
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getAllByText('Screenshot alınamadı').length).toBeGreaterThan(0);
    });
  });
});
