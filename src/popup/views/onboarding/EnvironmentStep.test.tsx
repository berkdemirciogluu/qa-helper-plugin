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

const { EnvironmentStep } = await import('./EnvironmentStep');

beforeEach(() => {
  vi.clearAllMocks();
  (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
});

describe('EnvironmentStep', () => {
  it('renders project name, environment and agile team fields', () => {
    render(<EnvironmentStep />);

    expect(screen.getByLabelText('Project name')).toBeTruthy();
    expect(screen.getByLabelText('Test environment')).toBeTruthy();
    expect(screen.getByLabelText('Agile team')).toBeTruthy();
  });

  it('shows optional description text', () => {
    render(<EnvironmentStep />);

    expect(screen.getByText(/Optional/)).toBeTruthy();
  });

  it('project name input writes to storage', async () => {
    render(<EnvironmentStep />);

    const projectInput = screen.getByLabelText('Project name');
    fireEvent.input(projectInput, { target: { value: 'my-project' } });

    await waitFor(() => {
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  it('environment selection writes to storage', async () => {
    render(<EnvironmentStep />);

    const envSelect = screen.getByLabelText('Test environment');
    fireEvent.change(envSelect, { target: { value: 'staging' } });

    await waitFor(() => {
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  it('environment options are shown correctly', () => {
    render(<EnvironmentStep />);

    expect(screen.getByText('Staging')).toBeTruthy();
    expect(screen.getByText('Production')).toBeTruthy();
  });
});
