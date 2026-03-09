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
  it('renders wizard first step', () => {
    render(<OnboardingView />);

    expect(screen.getByText('Environment Info')).toBeTruthy();
  });

  it('progress indicator shows 1/3', () => {
    render(<OnboardingView />);

    expect(screen.getByText('Step 1/3')).toBeTruthy();
  });

  it('navigates to second step with Next button', () => {
    render(<OnboardingView />);

    fireEvent.click(screen.getByText('Next →'));

    expect(screen.getByText('Jira Connection')).toBeTruthy();
  });

  it('completes all steps and writes to storage', async () => {
    render(<OnboardingView />);

    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Start →'));

    await waitFor(() => {
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({ onboarding_completed: true })
      );
    });
  });

  it('sets currentView to dashboard on completion', async () => {
    render(<OnboardingView />);

    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Start →'));

    await waitFor(() => {
      expect(viewState.currentView.value).toBe('dashboard');
    });
  });

  it('sets onboardingPulse to true on completion', async () => {
    render(<OnboardingView />);

    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Start →'));

    await waitFor(() => {
      expect(viewState.onboardingPulse.value).toBe(true);
    });
  });

  it('Skip button skips the step', () => {
    render(<OnboardingView />);

    fireEvent.click(screen.getByText('Skip'));

    expect(screen.getByText('Jira Connection')).toBeTruthy();
  });

  it('Skip button does not exist on third step', () => {
    render(<OnboardingView />);

    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Next →'));

    expect(screen.queryByText('Skip')).toBeNull();
  });
});
