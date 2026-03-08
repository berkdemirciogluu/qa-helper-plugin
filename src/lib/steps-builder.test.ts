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
  it('boş listeler için boş string döner', () => {
    expect(buildStepsToReproduce([], [])).toBe('');
  });

  it('tek tıklama için adım oluşturur', () => {
    const result = buildStepsToReproduce([makeClick({ text: 'Giriş Yap' })], []);
    expect(result).toBe("1. 'Giriş Yap' elementine tıklandı");
  });

  it('tek navigasyon için adım oluşturur', () => {
    const result = buildStepsToReproduce([], [makeNav({ url: 'https://example.com/login' })]);
    expect(result).toBe('1. https://example.com/login sayfasına gidildi');
  });

  it('50 karakterden uzun metin kırpılır', () => {
    const longText = 'A'.repeat(60);
    const result = buildStepsToReproduce([makeClick({ text: longText })], []);
    expect(result).toContain('...');
    const step = result.split('\n')[0];
    // "1. '" + 50 chars + "...' elementine..." şeklinde
    expect(step).toContain('A'.repeat(50) + '...');
  });

  it('olaylar timestamp sırasına göre sıralanır', () => {
    const click = makeClick({ timestamp: 3000, text: 'İkinci' });
    const nav = makeNav({ timestamp: 1000, url: 'https://example.com/page' });
    const result = buildStepsToReproduce([click], [nav]);
    const lines = result.split('\n');
    expect(lines[0]).toContain('sayfasına gidildi'); // nav önce
    expect(lines[1]).toContain("tıklandı"); // click sonra
  });

  it('çoklu olaylar için sıralı numaralar kullanır', () => {
    const clicks = [
      makeClick({ timestamp: 1000, text: 'Birinci' }),
      makeClick({ timestamp: 3000, text: 'Üçüncü' }),
    ];
    const navs = [makeNav({ timestamp: 2000, url: 'https://example.com/sonraki' })];
    const result = buildStepsToReproduce(clicks, navs);
    const lines = result.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/^1\./);
    expect(lines[1]).toMatch(/^2\./);
    expect(lines[2]).toMatch(/^3\./);
  });

  it('50 karakter metin kırpılmaz', () => {
    const text = 'A'.repeat(50);
    const result = buildStepsToReproduce([makeClick({ text })], []);
    expect(result).not.toContain('...');
  });
});
