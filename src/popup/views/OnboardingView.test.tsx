import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
});

const { OnboardingView } = await import('./OnboardingView');
const viewState = await import('../view-state');

beforeEach(() => {
  vi.clearAllMocks();
  (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  viewState.currentView.value = 'onboarding';
  viewState.onboardingPulse.value = false;
});

describe('OnboardingView', () => {
  it('wizard ilk adımını render eder', () => {
    render(<OnboardingView />);

    expect(screen.getByText('Ortam Bilgisi')).toBeTruthy();
  });

  it('progress indicator 1/3 gösterir', () => {
    render(<OnboardingView />);

    expect(screen.getByText('Adım 1/3')).toBeTruthy();
  });

  it('İleri butonuyla ikinci adıma geçilir', () => {
    render(<OnboardingView />);

    fireEvent.click(screen.getByText('İleri →'));

    expect(screen.getByText('Jira Bağlantısı')).toBeTruthy();
  });

  it('tüm adımları geçip onComplete çağrıldığında storage\'a yazar', async () => {
    render(<OnboardingView />);

    fireEvent.click(screen.getByText('İleri →'));
    fireEvent.click(screen.getByText('İleri →'));
    fireEvent.click(screen.getByText('Başla →'));

    await waitFor(() => {
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({ onboarding_completed: true }),
      );
    });
  });

  it('tamamlandığında currentView dashboard\'a döner', async () => {
    render(<OnboardingView />);

    fireEvent.click(screen.getByText('İleri →'));
    fireEvent.click(screen.getByText('İleri →'));
    fireEvent.click(screen.getByText('Başla →'));

    await waitFor(() => {
      expect(viewState.currentView.value).toBe('dashboard');
    });
  });

  it('tamamlandığında onboardingPulse true olur', async () => {
    render(<OnboardingView />);

    fireEvent.click(screen.getByText('İleri →'));
    fireEvent.click(screen.getByText('İleri →'));
    fireEvent.click(screen.getByText('Başla →'));

    await waitFor(() => {
      expect(viewState.onboardingPulse.value).toBe(true);
    });
  });

  it('Atla butonu ile adım atlanır', () => {
    render(<OnboardingView />);

    fireEvent.click(screen.getByText('Atla'));

    expect(screen.getByText('Jira Bağlantısı')).toBeTruthy();
  });

  it('üçüncü adımda Atla butonu yoktur', () => {
    render(<OnboardingView />);

    fireEvent.click(screen.getByText('İleri →'));
    fireEvent.click(screen.getByText('İleri →'));

    expect(screen.queryByText('Atla')).toBeNull();
  });
});
