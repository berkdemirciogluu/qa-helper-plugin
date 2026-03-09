import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { Select } from './Select';

const options = [
  { value: '', label: 'Select...' },
  { value: 'staging', label: 'Staging' },
  { value: 'qa', label: 'QA' },
  { value: 'production', label: 'Production' },
];

describe('Select', () => {
  it('renders options', () => {
    render(<Select options={options} value="" onChange={() => undefined} />);
    expect(screen.getByText('Select...')).toBeTruthy();
    expect(screen.getByText('Staging')).toBeTruthy();
    expect(screen.getByText('QA')).toBeTruthy();
    expect(screen.getByText('Production')).toBeTruthy();
  });

  it('shows current value as selected', () => {
    render(<Select options={options} value="qa" onChange={() => undefined} htmlFor="env" />);
    const select = document.getElementById('env') as HTMLSelectElement;
    expect(select.value).toBe('qa');
  });

  it('calls onChange on change', () => {
    const onChange = vi.fn();
    render(<Select options={options} value="" onChange={onChange} htmlFor="env" />);
    const select = document.getElementById('env') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'staging' } });
    expect(onChange).toHaveBeenCalledWith('staging');
  });

  it('renders with label and htmlFor connection is correct', () => {
    render(
      <Select
        label="Environment"
        htmlFor="env-select"
        options={options}
        value=""
        onChange={() => undefined}
      />
    );
    const label = screen.getByText('Environment');
    expect(label.getAttribute('for')).toBe('env-select');
    expect(document.getElementById('env-select')).toBeTruthy();
  });

  it('sets disabled attribute when disabled', () => {
    render(<Select options={options} value="" onChange={() => undefined} disabled htmlFor="env" />);
    const select = document.getElementById('env') as HTMLSelectElement;
    expect(select.disabled).toBe(true);
  });
});
