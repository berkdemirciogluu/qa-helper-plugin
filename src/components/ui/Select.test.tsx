import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { Select } from './Select';

const options = [
  { value: '', label: 'Seçiniz...' },
  { value: 'staging', label: 'Staging' },
  { value: 'qa', label: 'QA' },
  { value: 'production', label: 'Production' },
];

describe('Select', () => {
  it('seçenekleri render eder', () => {
    render(<Select options={options} value="" onChange={() => undefined} />);
    expect(screen.getByText('Seçiniz...')).toBeTruthy();
    expect(screen.getByText('Staging')).toBeTruthy();
    expect(screen.getByText('QA')).toBeTruthy();
    expect(screen.getByText('Production')).toBeTruthy();
  });

  it('mevcut değeri seçili gösterir', () => {
    render(<Select options={options} value="qa" onChange={() => undefined} htmlFor="env" />);
    const select = document.getElementById('env') as HTMLSelectElement;
    expect(select.value).toBe('qa');
  });

  it('değişiklikte onChange çağrılır', () => {
    const onChange = vi.fn();
    render(<Select options={options} value="" onChange={onChange} htmlFor="env" />);
    const select = document.getElementById('env') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'staging' } });
    expect(onChange).toHaveBeenCalledWith('staging');
  });

  it('label ile render edilir ve htmlFor bağlantısı doğru', () => {
    render(
      <Select label="Ortam" htmlFor="env-select" options={options} value="" onChange={() => undefined} />,
    );
    const label = screen.getByText('Ortam');
    expect(label.getAttribute('for')).toBe('env-select');
    expect(document.getElementById('env-select')).toBeTruthy();
  });

  it('disabled durumunda disabled attribute set edilir', () => {
    render(<Select options={options} value="" onChange={() => undefined} disabled htmlFor="env" />);
    const select = document.getElementById('env') as HTMLSelectElement;
    expect(select.disabled).toBe(true);
  });
});
