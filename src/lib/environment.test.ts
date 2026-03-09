import { describe, it, expect, vi, beforeEach } from 'vitest';
import { collectEnvironmentInfo } from './environment';

describe('collectEnvironmentInfo', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      language: 'tr-TR',
    });
    vi.stubGlobal('window', {
      innerWidth: 1920,
      innerHeight: 1080,
      devicePixelRatio: 1,
      location: { href: 'chrome-extension://abc/popup/index.html' },
    });
  });

  it('captures Chrome browser version', () => {
    const info = collectEnvironmentInfo();
    expect(info.browser).toBe('Chrome 133');
  });

  it('returns "Windows 10/11" for Windows NT user-agent', () => {
    const info = collectEnvironmentInfo();
    expect(info.os).toBe('Windows 10/11');
  });

  it('returns "macOS" for macOS user-agent', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/133.0.0.0',
      language: 'en-US',
    });
    const info = collectEnvironmentInfo();
    expect(info.os).toBe('macOS');
  });

  it('returns "Linux" for Linux user-agent', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/133.0.0.0',
      language: 'en-US',
    });
    const info = collectEnvironmentInfo();
    expect(info.os).toBe('Linux');
  });

  it('returns "Chrome" when version not found', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0) UnknownBrowser/1.0',
      language: 'tr-TR',
    });
    const info = collectEnvironmentInfo();
    expect(info.browser).toBe('Chrome');
  });

  it('calculates viewport correctly', () => {
    const info = collectEnvironmentInfo();
    expect(info.viewport).toBe('1920x1080');
  });

  it('uses navigator.language for language', () => {
    const info = collectEnvironmentInfo();
    expect(info.language).toBe('tr-TR');
  });

  it('uses window.devicePixelRatio for pixelRatio', () => {
    const info = collectEnvironmentInfo();
    expect(info.pixelRatio).toBe(1);
  });
});
