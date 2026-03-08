import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/preact';
import { StatusDot } from './StatusDot';

describe('StatusDot', () => {
  it('active variant: emerald rengi ve pulse animasyonu', () => {
    render(<StatusDot variant="active" />);
    const dot = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.className).toContain('bg-emerald-500');
    expect(dot.className).toContain('animate-pulse');
  });

  it('inactive variant: gri renk, pulse yok', () => {
    render(<StatusDot variant="inactive" />);
    const dot = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.className).toContain('bg-gray-400');
    expect(dot.className).not.toContain('animate-pulse');
  });

  it('error variant: kırmızı renk', () => {
    render(<StatusDot variant="error" />);
    const dot = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.className).toContain('bg-red-500');
  });

  it('active variant: reduced-motion devre dışı class var', () => {
    render(<StatusDot variant="active" />);
    const dot = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.className).toContain('motion-reduce:animate-none');
  });

  it('aria-hidden ile screen reader\'dan gizlenmiş', () => {
    render(<StatusDot variant="inactive" />);
    const dot = document.querySelector('[aria-hidden="true"]');
    expect(dot).toBeTruthy();
  });
});
