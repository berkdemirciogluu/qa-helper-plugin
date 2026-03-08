import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { AboutPage } from './AboutPage';
import { ToastContainer } from '@/components/ui/Toast';

vi.stubGlobal('chrome', {
  runtime: {
    getManifest: vi.fn(() => ({ version: '1.2.3' })),
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      remove: vi.fn().mockResolvedValue(undefined),
    },
  },
});

describe('AboutPage', () => {
  it('extension versiyonunu gösterir', () => {
    render(<AboutPage />);

    expect(screen.getByText('Versiyon: 1.2.3')).toBeTruthy();
  });

  it('geliştirici bilgisini gösterir', () => {
    render(<AboutPage />);

    expect(screen.getByText(/Geliştirici:/)).toBeTruthy();
  });

  it('lisans durumunu gösterir', () => {
    render(<AboutPage />);

    expect(screen.getByText(/Ücretsiz/)).toBeTruthy();
  });

  it('uygulama adını gösterir', () => {
    render(<AboutPage />);

    expect(screen.getByText('QA Helper')).toBeTruthy();
  });

  it('açıklama metnini gösterir', () => {
    render(<AboutPage />);

    expect(screen.getByText(/bug raporlama ve veri toplama/)).toBeTruthy();
  });

  it('kurulum sihirbazı butonu aktif ve tıklanabilir', () => {
    render(<AboutPage />);

    const wizardButton = screen.getByLabelText('Kurulum sihirbazını tekrar aç');
    expect(wizardButton).toBeTruthy();
    expect(wizardButton.hasAttribute('disabled')).toBe(false);
  });

  it('semantic section elementleri kullanır', () => {
    const { container } = render(<AboutPage />);

    const sections = container.querySelectorAll('section');
    expect(sections.length).toBe(3);
  });

  it('kurulum sihirbazına tıklanınca onboarding_completed storage\'dan silinir', async () => {
    render(<AboutPage />);

    const wizardButton = screen.getByLabelText('Kurulum sihirbazını tekrar aç');
    fireEvent.click(wizardButton);

    await waitFor(() => {
      expect(chrome.storage.local.remove).toHaveBeenCalledWith('onboarding_completed');
    });
  });

  it('kurulum sihirbazına tıklanınca bilgi toast gösterilir', async () => {
    render(
      <>
        <ToastContainer />
        <AboutPage />
      </>,
    );

    const wizardButton = screen.getByLabelText('Kurulum sihirbazını tekrar aç');
    fireEvent.click(wizardButton);

    await waitFor(() => {
      expect(screen.getByText(/kurulum sihirbazı tekrar gösterilecek/i)).toBeTruthy();
    });
  });
});
