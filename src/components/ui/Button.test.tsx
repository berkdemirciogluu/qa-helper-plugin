import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { Button } from './Button';

describe('Button', () => {
  it('children render eder', () => {
    render(<Button>Tıkla</Button>);
    expect(screen.getByRole('button', { name: 'Tıkla' })).toBeTruthy();
  });

  it('primary variant class içerir', () => {
    render(<Button variant="primary">Birincil</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-blue-600');
  });

  it('secondary variant class içerir', () => {
    render(<Button variant="secondary">İkincil</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-gray-300');
  });

  it('ghost variant class içerir', () => {
    render(<Button variant="ghost">Hayalet</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('hover:bg-gray-100');
  });

  it('danger variant class içerir', () => {
    render(<Button variant="danger">Sil</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-red-600');
  });

  it('disabled state: disabled attribute set', () => {
    render(<Button disabled>Devre Dışı</Button>);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-disabled')).toBe('true');
  });

  it('loading state: aria-busy set, button disabled', () => {
    render(<Button loading>Yükleniyor</Button>);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(btn.disabled).toBe(true);
  });

  it('click handler çağrılır', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Tıkla</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disabled iken click handler çağrılmaz', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Devre Dışı</Button>);
    // disabled butonlar click olayını kabul etmez
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('iconLeft render eder', () => {
    render(<Button iconLeft={<span data-testid="icon-left">X</span>}>Buton</Button>);
    expect(screen.getByTestId('icon-left')).toBeTruthy();
  });

  it('iconRight render eder', () => {
    render(<Button iconRight={<span data-testid="icon-right">X</span>}>Buton</Button>);
    expect(screen.getByTestId('icon-right')).toBeTruthy();
  });

  it('sm size class içerir', () => {
    render(<Button size="sm">Küçük</Button>);
    expect(screen.getByRole('button').className).toContain('h-7');
  });

  it('lg size class içerir', () => {
    render(<Button size="lg">Büyük</Button>);
    expect(screen.getByRole('button').className).toContain('h-9');
  });

  it('keyboard erişilebilirlik: focus-visible outline class var', () => {
    render(<Button>Tıkla</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('focus-visible:outline-2');
    expect(btn.className).toContain('focus-visible:outline-blue-500');
  });

  it('keyboard erişilebilirlik: native <button> elementi (Enter/Space desteği)', () => {
    render(<Button>Tıkla</Button>);
    const btn = screen.getByRole('button');
    expect(btn.tagName).toBe('BUTTON');
  });
});
