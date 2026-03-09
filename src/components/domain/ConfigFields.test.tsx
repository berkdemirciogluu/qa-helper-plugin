import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { ConfigFields } from './ConfigFields';
import type { ConfigFields as ConfigFieldsType } from '@/lib/types';

const mockStorageGet = vi.fn();
const mockStorageSet = vi.fn();

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: mockStorageGet,
      set: mockStorageSet,
    },
  },
});

const defaultValue: ConfigFieldsType = {
  environment: '',
  testCycle: '',
  agileTeam: '',
  project: '',
};

describe('ConfigFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageGet.mockResolvedValue({});
    mockStorageSet.mockResolvedValue(undefined);
  });

  it('renders all fields', () => {
    render(<ConfigFields value={defaultValue} onChange={() => undefined} />);
    expect(screen.getByLabelText('Environment')).toBeTruthy();
    expect(screen.getByLabelText('Test Cycle')).toBeTruthy();
    expect(screen.getByLabelText('Agile Team')).toBeTruthy();
    expect(screen.getByLabelText('Project')).toBeTruthy();
  });

  it('environment select değişiminde onChange çağrılır', async () => {
    const onChange = vi.fn();
    render(<ConfigFields value={defaultValue} onChange={onChange} />);
    const select = screen.getByLabelText('Environment') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'staging' } });
    // onChange sync çağrılır
    expect(onChange).toHaveBeenCalledWith({ ...defaultValue, environment: 'staging' });
  });

  it('testCycle input değişiminde onChange çağrılır', () => {
    const onChange = vi.fn();
    render(<ConfigFields value={defaultValue} onChange={onChange} />);
    const input = screen.getByLabelText('Test Cycle') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'Sprint 3' } });
    expect(onChange).toHaveBeenCalledWith({ ...defaultValue, testCycle: 'Sprint 3' });
  });

  it('displays current values', () => {
    const value: ConfigFieldsType = {
      environment: 'qa',
      testCycle: 'Sprint 1',
      agileTeam: 'Team Alpha',
      project: 'CRM',
    };
    render(<ConfigFields value={value} onChange={() => undefined} />);
    expect((screen.getByLabelText('Environment') as HTMLSelectElement).value).toBe('qa');
    expect((screen.getByLabelText('Test Cycle') as HTMLInputElement).value).toBe('Sprint 1');
    expect((screen.getByLabelText('Agile Team') as HTMLInputElement).value).toBe('Team Alpha');
    expect((screen.getByLabelText('Project') as HTMLInputElement).value).toBe('CRM');
  });

  it('değişiklikte session_config storage\'a merge pattern ile yazılır', async () => {
    const existingConfig = { session_config: { toggles: { har: true, console: true, dom: true, localStorage: true, sessionStorage: true } } };
    mockStorageGet.mockResolvedValue(existingConfig);

    render(<ConfigFields value={defaultValue} onChange={() => undefined} />);
    const select = screen.getByLabelText('Environment') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'staging' } });

    await waitFor(() => {
      expect(mockStorageSet).toHaveBeenCalledWith({
        session_config: {
          toggles: { har: true, console: true, dom: true, localStorage: true, sessionStorage: true },
          configFields: { ...defaultValue, environment: 'staging' },
        },
      });
    });
  });
});
