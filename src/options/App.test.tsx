import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { App, currentPage } from './App';

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      getBytesInUse: vi.fn(() => Promise.resolve(0)),
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

  it('shows General page by default', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Data Sources')).toBeTruthy();
    });
  });

  it('renders sidebar navigation', () => {
    render(<App />);

    expect(screen.getByText('General')).toBeTruthy();
    expect(screen.getByText('Configuration')).toBeTruthy();
    expect(screen.getByText('Data Management')).toBeTruthy();
    expect(screen.getByText('About')).toBeTruthy();
  });

  it('shows page heading', () => {
    render(<App />);

    const headings = screen.getAllByText('QA Helper Settings');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('can navigate to About page from sidebar', async () => {
    render(<App />);

    // Sidebar'daki ilk "About" butonunu bul (sidebar nav item)
    const aboutButtons = screen.getAllByText('About');
    const navButton = aboutButtons.find(
      (el) => el.closest('button[aria-current]') || el.closest('nav button')
    );
    fireEvent.click(navButton || aboutButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Version: 0.1.0')).toBeTruthy();
    });
  });

  it('can navigate to Configuration page from sidebar', async () => {
    render(<App />);

    const configButtons = screen.getAllByText('Configuration');
    const navButton = configButtons.find((el) => el.closest('nav button'));
    fireEvent.click(navButton || configButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Configuration Fields')).toBeTruthy();
    });
  });

  it('can navigate to Data Management page from sidebar', async () => {
    render(<App />);

    const dmButtons = screen.getAllByText('Data Management');
    const navButton = dmButtons.find((el) => el.closest('nav button'));
    fireEvent.click(navButton || dmButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Storage Status')).toBeTruthy();
    });
  });

  it('active page is highlighted in sidebar', () => {
    render(<App />);

    const generalButton = screen.getAllByText('General').find((el) => el.closest('nav button'));
    const button = generalButton?.closest('button');
    expect(button?.getAttribute('aria-current')).toBe('page');
  });

  it('hamburger menu button is available on mobile', () => {
    render(<App />);

    const menuButton = screen.getByLabelText('Open menu');
    expect(menuButton).toBeTruthy();
  });

  it('hamburger menu button toggles aria-expanded on click', () => {
    render(<App />);

    const menuButton = screen.getByLabelText('Open menu');
    expect(menuButton.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(menuButton);

    const closeButton = screen.getByLabelText('Close menu');
    expect(closeButton.getAttribute('aria-expanded')).toBe('true');
  });

  it('uses semantic HTML elements', () => {
    const { container } = render(<App />);

    expect(container.querySelector('nav')).toBeTruthy();
    expect(container.querySelector('main')).toBeTruthy();
    expect(container.querySelector('aside')).toBeTruthy();
  });
});
