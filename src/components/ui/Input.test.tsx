import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { Input } from './Input';

describe('Input', () => {
  it('renders with value and placeholder', () => {
    render(<Input value="test" onChange={() => undefined} placeholder="Type..." />);
    const input = screen.getByPlaceholderText('Type...');
    expect(input).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe('test');
  });

  it('calls onChange on change', () => {
    const onChange = vi.fn();
    render(<Input value="" onChange={onChange} placeholder="Input" />);
    const input = screen.getByPlaceholderText('Input');
    fireEvent.input(input, { target: { value: 'new value' } });
    expect(onChange).toHaveBeenCalledWith('new value');
  });

  it('renders with label and htmlFor connection is correct', () => {
    render(<Input label="Name" htmlFor="name-input" value="" onChange={() => undefined} />);
    const label = screen.getByText('Name');
    expect(label).toBeTruthy();
    expect(label.getAttribute('for')).toBe('name-input');
    const input = document.getElementById('name-input');
    expect(input).toBeTruthy();
  });

  it('sets disabled attribute when disabled', () => {
    render(<Input value="test" onChange={() => undefined} disabled placeholder="test" />);
    const input = screen.getByPlaceholderText('test');
    expect((input as HTMLInputElement).disabled).toBe(true);
  });

  it('shows error message on error state', () => {
    render(
      <Input
        value=""
        onChange={() => undefined}
        htmlFor="err-input"
        error="This field is required"
      />
    );
    expect(screen.getByText('This field is required')).toBeTruthy();
    const input = document.getElementById('err-input');
    expect(input?.getAttribute('aria-invalid')).toBe('true');
    expect(input?.getAttribute('aria-describedby')).toBe('err-input-error');
  });

  it('does not set aria-invalid when no error', () => {
    render(<Input value="" onChange={() => undefined} htmlFor="ok-input" />);
    const input = document.getElementById('ok-input');
    expect(input?.getAttribute('aria-invalid')).toBeNull();
  });
});
