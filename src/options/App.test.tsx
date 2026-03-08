import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { App, currentPage } from './App';

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
  },
  runtime: {
    getManifest: vi.fn(() => ({ version: '0.1.0' })),
  },
});

describe('Options App', () => {
  beforeEach(() => {
    currentPage.value = 'general';
  });

  it('varsayılan olarak Genel sayfasını gösterir', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Veri Kaynakları')).toBeTruthy();
    });
  });

  it('sidebar navigasyonu render eder', () => {
    render(<App />);

    expect(screen.getByText('Genel')).toBeTruthy();
    expect(screen.getByText('Konfigürasyon')).toBeTruthy();
    expect(screen.getByText('Veri Yönetimi')).toBeTruthy();
    expect(screen.getByText('Hakkında')).toBeTruthy();
  });

  it('sayfa başlığı gösterilir', () => {
    render(<App />);

    const headings = screen.getAllByText('QA Helper Ayarları');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('sidebar dan Hakkında sayfasına geçiş yapabilir', async () => {
    render(<App />);

    // Sidebar'daki ilk "Hakkında" butonunu bul (sidebar nav item)
    const aboutButtons = screen.getAllByText('Hakkında');
    const navButton = aboutButtons.find(el => el.closest('button[aria-current]') || el.closest('nav button'));
    fireEvent.click(navButton || aboutButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Versiyon: 0.1.0')).toBeTruthy();
    });
  });

  it('sidebar dan Konfigürasyon sayfasına geçiş yapabilir', async () => {
    render(<App />);

    const configButtons = screen.getAllByText('Konfigürasyon');
    const navButton = configButtons.find(el => el.closest('nav button'));
    fireEvent.click(navButton || configButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Konfigürasyon ayarları yakında eklenecek.')).toBeTruthy();
    });
  });

  it('sidebar dan Veri Yönetimi sayfasına geçiş yapabilir', async () => {
    render(<App />);

    const dmButtons = screen.getAllByText('Veri Yönetimi');
    const navButton = dmButtons.find(el => el.closest('nav button'));
    fireEvent.click(navButton || dmButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Veri yönetimi ayarları yakında eklenecek.')).toBeTruthy();
    });
  });

  it('aktif sayfa sidebar da vurgulu gösterilir', () => {
    render(<App />);

    const genelButton = screen.getAllByText('Genel').find(el => el.closest('nav button'));
    const button = genelButton?.closest('button');
    expect(button?.getAttribute('aria-current')).toBe('page');
  });

  it('hamburger menü butonu mobil görünümde mevcut', () => {
    render(<App />);

    const menuButton = screen.getByLabelText('Menüyü aç');
    expect(menuButton).toBeTruthy();
  });

  it('hamburger menü butonu tıklayınca aria-expanded değişir', () => {
    render(<App />);

    const menuButton = screen.getByLabelText('Menüyü aç');
    expect(menuButton.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(menuButton);

    const closeButton = screen.getByLabelText('Menüyü kapat');
    expect(closeButton.getAttribute('aria-expanded')).toBe('true');
  });

  it('semantic HTML elementleri kullanır', () => {
    const { container } = render(<App />);

    expect(container.querySelector('nav')).toBeTruthy();
    expect(container.querySelector('main')).toBeTruthy();
    expect(container.querySelector('aside')).toBeTruthy();
  });
});
