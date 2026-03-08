import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
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

  it('tüm alanları render eder', () => {
    render(<ConfigFields value={defaultValue} onChange={() => undefined} />);
    expect(screen.getByLabelText('Environment')).toBeTruthy();
    expect(screen.getByLabelText('Test Cycle')).toBeTruthy();
    expect(screen.getByLabelText('Agile Team')).toBeTruthy();
    expect(screen.getByLabelText('Proje')).toBeTruthy();
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

  it('mevcut değerleri görüntüler', () => {
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
    expect((screen.getByLabelText('Proje') as HTMLInputElement).value).toBe('CRM');
  });
});
