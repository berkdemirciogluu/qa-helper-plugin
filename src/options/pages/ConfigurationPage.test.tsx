import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { ConfigurationPage } from './ConfigurationPage';

const mockGet = vi.fn();
const mockSet = vi.fn();

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: mockGet,
      set: mockSet,
    },
  },
});

describe('ConfigurationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation(() =>
      Promise.resolve({
        session_config: {
          toggles: {
            har: true,
            console: true,
            dom: true,
            localStorage: true,
            sessionStorage: true,
          },
          configFields: {
            environment: 'staging',
            testCycle: 'Sprint 1',
            agileTeam: 'Team Alpha',
            project: 'e-commerce',
          },
        },
      })
    );
    mockSet.mockImplementation(() => Promise.resolve());
  });

  it('shows SectionGroup title and description', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText('Configuration Fields')).toBeTruthy();
    });
    expect(
      screen.getByText(
        'Context fields automatically included in bug reports. Set once, use in every report.'
      )
    ).toBeTruthy();
  });

  it('renders all form fields', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText('Environment')).toBeTruthy();
      expect(screen.getByText('Test Cycle')).toBeTruthy();
      expect(screen.getByText('Agile Team')).toBeTruthy();
      expect(screen.getByText('Project')).toBeTruthy();
    });
  });

  it('loads existing values from storage', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      const envSelect = document.getElementById('config-environment') as HTMLSelectElement;
      expect(envSelect.value).toBe('staging');

      const testCycleInput = document.getElementById('config-test-cycle') as HTMLInputElement;
      expect(testCycleInput.value).toBe('Sprint 1');

      const agileTeamInput = document.getElementById('config-agile-team') as HTMLInputElement;
      expect(agileTeamInput.value).toBe('Team Alpha');

      const projectInput = document.getElementById('config-project') as HTMLInputElement;
      expect(projectInput.value).toBe('e-commerce');
    });
  });

  it('saves to storage on environment selection change', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(document.getElementById('config-environment')).toBeTruthy();
    });

    const envSelect = document.getElementById('config-environment') as HTMLSelectElement;
    fireEvent.change(envSelect, { target: { value: 'qa' } });

    await waitFor(() => {
      expect(mockSet).toHaveBeenCalledWith({
        session_config: expect.objectContaining({
          configFields: expect.objectContaining({ environment: 'qa' }),
        }),
      });
    });
  });

  it('merges with existing config when saving input changes', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(document.getElementById('config-test-cycle')).toBeTruthy();
    });

    const testCycleInput = document.getElementById('config-test-cycle') as HTMLInputElement;
    fireEvent.input(testCycleInput, { target: { value: 'Sprint 2' } });

    await waitFor(() => {
      expect(mockSet).toHaveBeenCalledWith({
        session_config: expect.objectContaining({
          toggles: expect.objectContaining({ har: true }),
          configFields: expect.objectContaining({ testCycle: 'Sprint 2' }),
        }),
      });
    });
  });

  it('creates config with default toggles when storage is empty', async () => {
    mockGet.mockImplementation(() => Promise.resolve({}));

    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(document.getElementById('config-project')).toBeTruthy();
    });

    const projectInput = document.getElementById('config-project') as HTMLInputElement;
    fireEvent.input(projectInput, { target: { value: 'test-proje' } });

    await waitFor(() => {
      expect(mockSet).toHaveBeenCalledWith({
        session_config: expect.objectContaining({
          toggles: {
            har: true,
            console: true,
            dom: true,
            localStorage: true,
            sessionStorage: true,
          },
          configFields: expect.objectContaining({ project: 'test-proje' }),
        }),
      });
    });
  });

  it('shows Loading message during load', () => {
    mockGet.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<ConfigurationPage />);
    expect(screen.getByText('Loading...')).toBeTruthy();
  });
});
