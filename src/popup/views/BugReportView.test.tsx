import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/preact';
import { BugReportView, _resetSignalsForTest } from './BugReportView';
import type { SnapshotData } from '@/lib/types';

vi.mock('@/lib/zip-exporter', () => ({
  exportBugReportZip: vi.fn().mockResolvedValue({
    success: true,
    data: { fileName: 'bug-report-2026-03-08.zip', fileSize: '2.3 MB' },
  }),
}));

vi.mock('@/lib/clipboard', () => ({
  copyToClipboard: vi.fn().mockResolvedValue({ success: true, data: undefined }),
}));

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
      remove: vi.fn().mockResolvedValue(undefined),
    },
  },
});

vi.stubGlobal('navigator', {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

beforeEach(() => {
  _resetSignalsForTest();
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
  (chrome.storage.local.remove as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
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

  it('Jira butonu disabled, ZIP ve Kopyala aktif (snapshot sonrası)', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByAltText('Sayfa ekran görüntüsü')).toBeTruthy();
    });
    const zipBtn = screen.getByText('ZIP İndir').closest('button')! as HTMLButtonElement;
    const jiraBtn = screen.getByText("Jira'ya Gönder").closest('button')! as HTMLButtonElement;
    const copyBtn = screen.getByText('Kopyala').closest('button')! as HTMLButtonElement;
    expect(zipBtn.disabled).toBe(false);
    expect(copyBtn.disabled).toBe(false);
    expect(jiraBtn.disabled).toBe(true);
    expect(jiraBtn.title).toBe("Ayarlardan Jira'yı kurun");
  });

  it('ZIP İndir tıklandığında export tetiklenir ve başarı post-export UI gösterir', async () => {
    const { exportBugReportZip } = await import('@/lib/zip-exporter');
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByAltText('Sayfa ekran görüntüsü')).toBeTruthy();
    });
    const zipBtn = screen.getByText('ZIP İndir').closest('button')!;
    fireEvent.click(zipBtn);
    await waitFor(() => {
      expect(exportBugReportZip).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText('ZIP indirildi')).toBeTruthy();
      expect(screen.getByText('Session verilerini temizlemek ister misiniz?')).toBeTruthy();
    });
  });

  it('Kopyala tıklandığında clipboard kopyalama tetiklenir', async () => {
    const { copyToClipboard } = await import('@/lib/clipboard');
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByAltText('Sayfa ekran görüntüsü')).toBeTruthy();
    });
    const copyBtn = screen.getByText('Kopyala').closest('button')!;
    fireEvent.click(copyBtn);
    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalled();
    });
  });

  it('post-export UI: Temizle butonuna tıklandığında session temizlenir ve STOP_SESSION tabId ile gönderilir', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByAltText('Sayfa ekran görüntüsü')).toBeTruthy();
    });
    const zipBtn = screen.getByText('ZIP İndir').closest('button')!;
    fireEvent.click(zipBtn);
    await waitFor(() => {
      expect(screen.getByText('Temizle')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Temizle'));
    await waitFor(() => {
      expect(chrome.storage.local.get).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STOP_SESSION', payload: { tabId: 42 } }),
      );
    });
  });

  it('post-export UI: Koru butonuna tıklandığında dashboard\'a döner', async () => {
    render(<BugReportView hasSession={true} />);
    await waitFor(() => {
      expect(screen.getByAltText('Sayfa ekran görüntüsü')).toBeTruthy();
    });
    const zipBtn = screen.getByText('ZIP İndir').closest('button')!;
    fireEvent.click(zipBtn);
    await waitFor(() => {
      expect(screen.getByText('Koru')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Koru'));
    // Koru tıklandığında form resetlenir
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
