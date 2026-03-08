import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { AboutPage } from './AboutPage';

vi.stubGlobal('chrome', {
  runtime: {
    getManifest: vi.fn(() => ({ version: '1.2.3' })),
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

  it('kurulum sihirbazı butonu disabled', () => {
    render(<AboutPage />);

    const wizardButton = screen.getByLabelText('Kurulum sihirbazını tekrar aç');
    expect(wizardButton).toBeTruthy();
    expect(wizardButton.hasAttribute('disabled')).toBe(true);
  });

  it('semantic section elementleri kullanır', () => {
    const { container } = render(<AboutPage />);

    const sections = container.querySelectorAll('section');
    expect(sections.length).toBe(3);
  });
});
