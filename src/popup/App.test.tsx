import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/preact';
import type { SessionMeta } from '@/lib/types';

// Chrome API mock
vi.stubGlobal('chrome', {
  tabs: {
    query: vi.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
  },
  runtime: {
    sendMessage: vi.fn().mockResolvedValue({
      success: true,
      data: {
        tabId: 1,
        startTime: Date.now(),
        url: 'https://example.com',
        status: 'idle',
        counters: { clicks: 0, xhrRequests: 0, consoleErrors: 0, navEvents: 0 },
      } satisfies SessionMeta,
    }),
    openOptionsPage: vi.fn(),
  },
  storage: {
    local: {
      // Varsayılan: onboarding tamamlanmış — DashboardView gösterilir
      get: vi.fn().mockResolvedValue({ onboarding_completed: true }),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
});

const { App } = await import('./App');
const viewState = await import('./view-state');

beforeEach(() => {
  vi.clearAllMocks();
  // Her test öncesi view-state sıfırla
  viewState.currentView.value = 'dashboard';
  viewState.onboardingPulse.value = false;
  // Varsayılan storage mock'u geri yükle
  (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
    onboarding_completed: true,
  });
  (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
});

describe('App', () => {
  it('renders DashboardView by default', async () => {
    render(<App />);
    await waitFor(() => {
      // DashboardView içinde "QA Helper" başlığı var
      expect(screen.getByRole('heading', { name: 'QA Helper' })).toBeTruthy();
    });
  });

  it('popup has fixed width class', () => {
    render(<App />);
    const root = document.querySelector('.w-\\[400px\\]');
    expect(root).toBeTruthy();
  });

  it('has max-h-[600px] class', () => {
    render(<App />);
    const root = document.querySelector('.max-h-\\[600px\\]');
    expect(root).toBeTruthy();
  });

  it('shows OnboardingView when onboarding_completed is false', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({});
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Environment Info')).toBeTruthy();
    });
  });

  it('shows DashboardView when onboarding_completed is true', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'QA Helper' })).toBeTruthy();
    });
  });
});
