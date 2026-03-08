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
          toggles: { har: true, console: true, dom: true, localStorage: true, sessionStorage: true },
          configFields: {
            environment: 'staging',
            testCycle: 'Sprint 1',
            agileTeam: 'Team Alpha',
            project: 'e-commerce',
          },
        },
      }),
    );
    mockSet.mockImplementation(() => Promise.resolve());
  });

  it('SectionGroup başlık ve açıklaması gösterilir', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText('Konfigürasyon Alanları')).toBeTruthy();
    });
    expect(
      screen.getByText('Bug raporlarına otomatik eklenen bağlam bilgileri. Bir kez ayarlayın, her raporda kullanılsın.'),
    ).toBeTruthy();
  });

  it('tüm form alanlarını render eder', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText('Ortam')).toBeTruthy();
      expect(screen.getByText('Test Döngüsü')).toBeTruthy();
      expect(screen.getByText('Agile Takım')).toBeTruthy();
      expect(screen.getByText('Proje')).toBeTruthy();
    });
  });

  it('storage dan mevcut değerleri yükler', async () => {
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

  it('environment seçim değişikliğinde storage a kaydeder', async () => {
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

  it('input değişikliğinde mevcut config ile merge ederek kaydeder', async () => {
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

  it('storage boşken varsayılan toggles ile config oluşturur', async () => {
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
          toggles: { har: true, console: true, dom: true, localStorage: true, sessionStorage: true },
          configFields: expect.objectContaining({ project: 'test-proje' }),
        }),
      });
    });
  });

  it('yükleme sırasında Yükleniyor mesajı gösterilir', () => {
    mockGet.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<ConfigurationPage />);
    expect(screen.getByText('Yükleniyor...')).toBeTruthy();
  });
});
