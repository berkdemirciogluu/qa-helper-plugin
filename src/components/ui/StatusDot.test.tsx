import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/preact';
import { StatusDot } from './StatusDot';

describe('StatusDot', () => {
  it('active variant: emerald color and pulse animation', () => {
    render(<StatusDot variant="active" />);
    const dot = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.className).toContain('bg-emerald-500');
    expect(dot.className).toContain('animate-pulse');
  });

  it('inactive variant: gray color, no pulse', () => {
    render(<StatusDot variant="inactive" />);
    const dot = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.className).toContain('bg-gray-400');
    expect(dot.className).not.toContain('animate-pulse');
  });

  it('error variant: red color', () => {
    render(<StatusDot variant="error" />);
    const dot = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.className).toContain('bg-red-500');
  });

  it('active variant: has reduced-motion disabled class', () => {
    render(<StatusDot variant="active" />);
    const dot = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.className).toContain('motion-reduce:animate-none');
  });

  it('hidden from screen readers with aria-hidden', () => {
    render(<StatusDot variant="inactive" />);
    const dot = document.querySelector('[aria-hidden="true"]');
    expect(dot).toBeTruthy();
  });
});
