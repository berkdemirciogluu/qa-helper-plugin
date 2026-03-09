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
  it('shows extension version', () => {
    render(<AboutPage />);

    expect(screen.getByText('Version: 1.2.3')).toBeTruthy();
  });

  it('shows developer info', () => {
    render(<AboutPage />);

    expect(screen.getByText(/Developer:/)).toBeTruthy();
  });

  it('shows license status', () => {
    render(<AboutPage />);

    expect(screen.getByText(/Free/)).toBeTruthy();
  });

  it('shows app name', () => {
    render(<AboutPage />);

    expect(screen.getByText('QA Helper')).toBeTruthy();
  });

  it('shows description text', () => {
    render(<AboutPage />);

    expect(screen.getByText(/bug reporting and data collection/)).toBeTruthy();
  });

  it('setup wizard button is active and clickable', () => {
    render(<AboutPage />);

    const wizardButton = screen.getByLabelText('Reopen setup wizard');
    expect(wizardButton).toBeTruthy();
    expect(wizardButton.hasAttribute('disabled')).toBe(false);
  });

  it('uses semantic section elements', () => {
    const { container } = render(<AboutPage />);

    const sections = container.querySelectorAll('section');
    expect(sections.length).toBe(3);
  });

  it('clears onboarding_completed from storage on wizard click', async () => {
    render(<AboutPage />);

    const wizardButton = screen.getByLabelText('Reopen setup wizard');
    fireEvent.click(wizardButton);

    await waitFor(() => {
      expect(chrome.storage.local.remove).toHaveBeenCalledWith('onboarding_completed');
    });
  });

  it('shows info toast on wizard click', async () => {
    render(
      <>
        <ToastContainer />
        <AboutPage />
      </>,
    );

    const wizardButton = screen.getByLabelText('Reopen setup wizard');
    fireEvent.click(wizardButton);

    await waitFor(() => {
      expect(screen.getByText(/setup wizard will appear/i)).toBeTruthy();
    });
  });
});
