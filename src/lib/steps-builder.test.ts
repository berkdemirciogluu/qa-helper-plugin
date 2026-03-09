import { describe, it, expect } from 'vitest';
import { buildStepsToReproduce } from './steps-builder';
import type { ClickEvent, NavEvent } from './types';

const makeClick = (overrides: Partial<ClickEvent> = {}): ClickEvent => ({
  type: 'click',
  timestamp: 1000,
  selector: 'button',
  text: 'Submit',
  pageUrl: 'https://example.com',
  x: 100,
  y: 200,
  ...overrides,
});

const makeNav = (overrides: Partial<NavEvent> = {}): NavEvent => ({
  type: 'nav',
  timestamp: 2000,
  oldUrl: 'https://example.com',
  url: 'https://example.com/about',
  title: 'About',
  ...overrides,
});

describe('buildStepsToReproduce', () => {
  it('returns empty string for empty lists', () => {
    expect(buildStepsToReproduce([], [])).toBe('');
  });

  it('creates step for single click', () => {
    const result = buildStepsToReproduce([makeClick({ text: 'Login' })], []);
    expect(result).toBe("1. Clicked 'Login' element");
  });

  it('creates step for single navigation', () => {
    const result = buildStepsToReproduce([], [makeNav({ url: 'https://example.com/login' })]);
    expect(result).toBe('1. Navigated to https://example.com/login');
  });

  it('truncates text longer than 50 characters', () => {
    const longText = 'A'.repeat(60);
    const result = buildStepsToReproduce([makeClick({ text: longText })], []);
    expect(result).toContain('...');
    const step = result.split('\n')[0];
    // "1. '" + 50 chars + "...' elementine..." şeklinde
    expect(step).toContain('A'.repeat(50) + '...');
  });

  it('sorts events by timestamp', () => {
    const click = makeClick({ timestamp: 3000, text: 'Second' });
    const nav = makeNav({ timestamp: 1000, url: 'https://example.com/page' });
    const result = buildStepsToReproduce([click], [nav]);
    const lines = result.split('\n');
    expect(lines[0]).toContain('Navigated to'); // nav first
    expect(lines[1]).toContain('Clicked'); // click second
  });

  it('uses sequential numbers for multiple events', () => {
    const clicks = [
      makeClick({ timestamp: 1000, text: 'First' }),
      makeClick({ timestamp: 3000, text: 'Third' }),
    ];
    const navs = [makeNav({ timestamp: 2000, url: 'https://example.com/next' })];
    const result = buildStepsToReproduce(clicks, navs);
    const lines = result.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/^1\./);
    expect(lines[1]).toMatch(/^2\./);
    expect(lines[2]).toMatch(/^3\./);
  });

  it('does not truncate 50 character text', () => {
    const text = 'A'.repeat(50);
    const result = buildStepsToReproduce([makeClick({ text })], []);
    expect(result).not.toContain('...');
  });
});
