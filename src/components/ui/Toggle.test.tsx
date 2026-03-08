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

  it('tıklayınca onChange çağrılır ve ters değer geçer', () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Test toggle" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('checked=true iken tıklayınca false geçer', () => {
    const onChange = vi.fn();
    render(<Toggle checked={true} onChange={onChange} label="Test toggle" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('disabled iken onChange çağrılmaz', () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Test toggle" disabled />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Space tuşu ile toggle', () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Test toggle" />);
    fireEvent.keyDown(screen.getByRole('switch'), { key: ' ' });
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('Enter tuşu ile toggle', () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Test toggle" />);
    fireEvent.keyDown(screen.getByRole('switch'), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('ARIA label set', () => {
    render(<Toggle checked={false} onChange={() => {}} label="HAR kaydını aç" />);
    expect(screen.getByRole('switch', { name: 'HAR kaydını aç' })).toBeTruthy();
  });

  it('checked=true: bg-blue-600 class var', () => {
    render(<Toggle checked={true} onChange={() => {}} label="Toggle" />);
    expect(screen.getByRole('switch').className).toContain('bg-blue-600');
  });

  it('checked=false: bg-gray-300 class var', () => {
    render(<Toggle checked={false} onChange={() => {}} label="Toggle" />);
    expect(screen.getByRole('switch').className).toContain('bg-gray-300');
  });
});
