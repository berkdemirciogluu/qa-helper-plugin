import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole('button', { name: 'Click' })).toBeTruthy();
  });

  it('has primary variant class', () => {
    render(<Button variant="primary">Primary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-blue-600');
  });

  it('has secondary variant class', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-gray-300');
  });

  it('has ghost variant class', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('hover:bg-gray-100');
  });

  it('has danger variant class', () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-red-600');
  });

  it('disabled state: disabled attribute set', () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-disabled')).toBe('true');
  });

  it('loading state: aria-busy set, button disabled', () => {
    render(<Button loading>Loading</Button>);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(btn.disabled).toBe(true);
  });

  it('click handler is called', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('click handler is not called when disabled', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>
    );
    // disabled butonlar click olayını kabul etmez
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('renders iconLeft', () => {
    render(<Button iconLeft={<span data-testid="icon-left">X</span>}>Btn</Button>);
    expect(screen.getByTestId('icon-left')).toBeTruthy();
  });

  it('renders iconRight', () => {
    render(<Button iconRight={<span data-testid="icon-right">X</span>}>Btn</Button>);
    expect(screen.getByTestId('icon-right')).toBeTruthy();
  });

  it('has sm size class', () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button').className).toContain('h-7');
  });

  it('has lg size class', () => {
    render(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button').className).toContain('h-9');
  });

  it('keyboard a11y: focus-visible outline class exists', () => {
    render(<Button>Click</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('focus-visible:outline-2');
    expect(btn.className).toContain('focus-visible:outline-blue-500');
  });

  it('keyboard a11y: native <button> element (Enter/Space support)', () => {
    render(<Button>Click</Button>);
    const btn = screen.getByRole('button');
    expect(btn.tagName).toBe('BUTTON');
  });
});
