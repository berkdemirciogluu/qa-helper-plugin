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
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
});

const { App } = await import('./App');
const viewState = await import('./view-state');

beforeEach(() => {
  vi.clearAllMocks();
  viewState.currentView.value = 'dashboard';
  (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
});

describe('App', () => {
  it('renders DashboardView by default', async () => {
    render(<App />);
    await waitFor(() => {
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
});
