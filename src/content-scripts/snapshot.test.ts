import { describe, it, expect, vi, beforeEach } from 'vitest';

type MessageListener = (
  message: { action: string; payload?: unknown },
  sender: chrome.runtime.MessageSender,
  sendResponse: (r: { success: boolean; data?: unknown; error?: string }) => void,
) => boolean | undefined;

let capturedListener: MessageListener | null = null;

vi.stubGlobal('chrome', {
  runtime: {
    onMessage: {
      addListener: (fn: MessageListener) => {
        capturedListener = fn;
      },
    },
  },
});

// DOM ve Storage mock'ları
vi.stubGlobal('document', {
  documentElement: {
    outerHTML: '<html><head></head><body>Test</body></html>',
  },
});

vi.stubGlobal('window', {
  location: { href: 'https://example.com/page' },
  localStorage: {
    length: 2,
    key: (i: number) => ['foo', 'bar'][i] ?? null,
    getItem: (k: string) => ({ foo: 'foo-value', bar: 'bar-value' }[k] ?? null),
  },
  sessionStorage: {
    length: 1,
    key: (i: number) => ['sess'][i] ?? null,
    getItem: (k: string) => ({ sess: 'sess-value' }[k] ?? null),
  },
});

// Import snapshot script after mocks
await import('./snapshot');

async function dispatch(action: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
  return new Promise((resolve) => {
    if (!capturedListener) throw new Error('No listener registered');
    capturedListener({ action }, {} as chrome.runtime.MessageSender, (response) => {
      resolve(response);
    });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('snapshot content script', () => {
  it('TAKE_SNAPSHOT mesajı için listener kayıt edilir', () => {
    expect(capturedListener).not.toBeNull();
  });

  it('TAKE_SNAPSHOT: DOM serialize edilir', async () => {
    const result = await dispatch('TAKE_SNAPSHOT');
    expect(result.success).toBe(true);
    const data = result.data as { dom: { html: string; doctype: string; url: string } };
    expect(data.dom.html).toContain('<html>');
    expect(data.dom.doctype).toBe('<!DOCTYPE html>');
    expect(data.dom.url).toBe('https://example.com/page');
  });

  it('TAKE_SNAPSHOT: localStorage dump edilir', async () => {
    const result = await dispatch('TAKE_SNAPSHOT');
    expect(result.success).toBe(true);
    const data = result.data as { storage: { localStorage: Record<string, string> } };
    expect(data.storage.localStorage['foo']).toBe('foo-value');
    expect(data.storage.localStorage['bar']).toBe('bar-value');
  });

  it('TAKE_SNAPSHOT: sessionStorage dump edilir', async () => {
    const result = await dispatch('TAKE_SNAPSHOT');
    expect(result.success).toBe(true);
    const data = result.data as { storage: { sessionStorage: Record<string, string> } };
    expect(data.storage.sessionStorage['sess']).toBe('sess-value');
  });

  it('Bilinmeyen action için true return etmez (listener sadece TAKE_SNAPSHOT işler)', () => {
    if (!capturedListener) throw new Error('No listener');
    const result = capturedListener(
      { action: 'UNKNOWN_ACTION' },
      {} as chrome.runtime.MessageSender,
      () => {},
    );
    // TAKE_SNAPSHOT dışında true dönmemeli
    expect(result).toBeUndefined();
  });
});
