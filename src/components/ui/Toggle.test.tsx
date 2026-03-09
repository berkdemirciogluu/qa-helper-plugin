import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('checked=false: unchecked render', () => {
    render(<Toggle checked={false} onChange={() => {}} label="Test toggle" />);
    const btn = screen.getByRole('switch', { name: 'Test toggle' });
    expect(btn.getAttribute('aria-checked')).toBe('false');
  });

  it('checked=true: checked render', () => {
    render(<Toggle checked={true} onChange={() => {}} label="Test toggle" />);
    const btn = screen.getByRole('switch', { name: 'Test toggle' });
    expect(btn.getAttribute('aria-checked')).toBe('true');
  });

  it('calls onChange with opposite value on click', () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Test toggle" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('passes false on click when checked=true', () => {
    const onChange = vi.fn();
    render(<Toggle checked={true} onChange={onChange} label="Test toggle" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('does not call onChange when disabled', () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Test toggle" disabled />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('toggles with Space key', () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Test toggle" />);
    fireEvent.keyDown(screen.getByRole('switch'), { key: ' ' });
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('toggles with Enter key', () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Test toggle" />);
    fireEvent.keyDown(screen.getByRole('switch'), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('ARIA label is set', () => {
    render(<Toggle checked={false} onChange={() => {}} label="Enable HAR recording" />);
    expect(screen.getByRole('switch', { name: 'Enable HAR recording' })).toBeTruthy();
  });

  it('checked=true: has bg-blue-600 class', () => {
    render(<Toggle checked={true} onChange={() => {}} label="Toggle" />);
    expect(screen.getByRole('switch').className).toContain('bg-blue-600');
  });

  it('checked=false: has bg-gray-300 class', () => {
    render(<Toggle checked={false} onChange={() => {}} label="Toggle" />);
    expect(screen.getByRole('switch').className).toContain('bg-gray-300');
  });
});
