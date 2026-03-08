import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Chrome API Mock ─────────────────────────────────────────────────────────
type MessageListener = (
  message: { action: string; payload?: unknown },
  sender: chrome.runtime.MessageSender,
  sendResponse: (r: unknown) => void,
) => boolean;

let capturedMessageListener: MessageListener | null = null;
const mockSendMessage = vi.fn().mockResolvedValue(undefined);

vi.stubGlobal('chrome', {
  runtime: {
    onMessage: {
      addListener: (fn: MessageListener) => {
        capturedMessageListener = fn;
      },
    },
    sendMessage: mockSendMessage,
  },
});

// Import recorder after chrome mock is set up
// recorder.ts registers listeners on import
await import('./recorder');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sendCommand(action: string, payload?: unknown): { success: boolean } {
  if (!capturedMessageListener) throw new Error('No message listener registered');
  let response: { success: boolean } = { success: false };
  capturedMessageListener(
    { action, payload },
    {} as chrome.runtime.MessageSender,
    (r) => { response = r as { success: boolean }; },
  );
  return response;
}

function startRecording(tabId = 42): void {
  sendCommand('START_RECORDING', { tabId });
}

function stopRecording(): void {
  sendCommand('STOP_RECORDING');
}

function pauseRecording(): void {
  sendCommand('PAUSE_RECORDING');
}

function resumeRecording(): void {
  sendCommand('RESUME_RECORDING');
}

function postXhrMessage(overrides: Record<string, unknown> = {}): void {
  const data = {
    type: '__QA_HELPER_XHR__',
    method: 'GET',
    url: 'https://api.example.com/data',
    status: 200,
    duration: 150,
    requestBody: null,
    responseBody: '{"ok":true}',
    timestamp: Date.now(),
    ...overrides,
  };
  window.dispatchEvent(new MessageEvent('message', { data, source: window }));
}

function postConsoleMessage(overrides: Record<string, unknown> = {}): void {
  const data = {
    type: '__QA_HELPER_CONSOLE__',
    level: 'log',
    message: 'test message',
    timestamp: Date.now(),
    ...overrides,
  };
  window.dispatchEvent(new MessageEvent('message', { data, source: window }));
}

function postNavMessage(overrides: Record<string, unknown> = {}): void {
  const data = {
    type: '__QA_HELPER_NAV__',
    oldUrl: 'https://example.com/page1',
    newUrl: 'https://example.com/page2',
    title: 'Page 2',
    timestamp: Date.now(),
    ...overrides,
  };
  window.dispatchEvent(new MessageEvent('message', { data, source: window }));
}

function getFlushCalls(dataType?: string): Array<{ action: string; payload: Record<string, unknown> }> {
  return mockSendMessage.mock.calls
    .map((call: unknown[]) => call[0] as { action: string; payload: Record<string, unknown> })
    .filter((msg: { action: string; payload: Record<string, unknown> }) => {
      if (msg.action !== 'FLUSH_DATA') return false;
      if (dataType && msg.payload.dataType !== dataType) return false;
      return true;
    });
}

// ─── Tests ───────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  stopRecording(); // Ensure clean state
});

afterEach(() => {
  vi.useRealTimers();
});

// 7.1 Content script başlatma ve session yönetimi
describe('Content script başlatma ve session yönetimi', () => {
  it('chrome.runtime.onMessage listener kayıt eder', () => {
    expect(capturedMessageListener).not.toBeNull();
  });

  it('START_RECORDING komutu ile recording başlar', () => {
    const response = sendCommand('START_RECORDING', { tabId: 42 });
    expect(response.success).toBe(true);
  });

  it('STOP_RECORDING komutu ile recording durur', () => {
    startRecording();
    const response = sendCommand('STOP_RECORDING');
    expect(response.success).toBe(true);
  });
});

// 7.7 Session start/stop/pause/resume
describe('Session start/stop/pause/resume', () => {
  it('START_RECORDING sonrası event buffer dolmaya başlar', () => {
    startRecording();
    postXhrMessage();
    vi.advanceTimersByTime(3000);
    const flushes = getFlushCalls('xhr');
    expect(flushes.length).toBeGreaterThan(0);
  });

  it('STOP_RECORDING sonrası buffer flush edilir ve yeni event kabul edilmez', () => {
    startRecording();
    postXhrMessage();
    stopRecording();
    vi.clearAllMocks();

    // Yeni event gönder — kaydedilmemeli
    postXhrMessage({ url: 'https://api.example.com/after-stop' });
    vi.advanceTimersByTime(3000);

    const flushes = getFlushCalls('xhr');
    expect(flushes.length).toBe(0);
  });

  it('PAUSE_RECORDING sonrası event buffer\'a eklenmez', () => {
    startRecording();
    pauseRecording();
    vi.clearAllMocks();

    postXhrMessage();
    vi.advanceTimersByTime(3000);

    const flushes = getFlushCalls('xhr');
    expect(flushes.length).toBe(0);
  });

  it('RESUME_RECORDING sonrası event buffer\'a tekrar eklenir', () => {
    startRecording();
    pauseRecording();
    resumeRecording();
    vi.clearAllMocks();

    postXhrMessage();
    vi.advanceTimersByTime(3000);

    const flushes = getFlushCalls('xhr');
    expect(flushes.length).toBeGreaterThan(0);
  });

  it('recording başlamadan önce PAUSE/RESUME etkisizdir', () => {
    pauseRecording();
    resumeRecording();
    // No error thrown
  });

  it('START_RECORDING payload olmadan çökmez ve false döner', () => {
    const response = sendCommand('START_RECORDING');
    expect(response.success).toBe(false);
  });
});

// 7.2 postMessage ile XHR event alma ve XhrEvent oluşturma
describe('postMessage ile XHR event alma', () => {
  it('XHR event postMessage ile alınır ve buffer\'a eklenir', () => {
    startRecording();
    postXhrMessage();
    vi.advanceTimersByTime(3000);

    const flushes = getFlushCalls('xhr');
    expect(flushes.length).toBe(1);
    const events = flushes[0].payload.events as Array<Record<string, unknown>>;
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('xhr');
    expect(events[0].method).toBe('GET');
    expect(events[0].url).toBe('https://api.example.com/data');
    expect(events[0].status).toBe(200);
  });

  it('XHR event doğru alanları içerir (method, url, status, duration, body)', () => {
    startRecording();
    postXhrMessage({
      method: 'POST',
      url: 'https://api.example.com/create',
      status: 201,
      duration: 300,
      requestBody: '{"name":"test"}',
      responseBody: '{"id":1}',
    });
    vi.advanceTimersByTime(3000);

    const events = getFlushCalls('xhr')[0].payload.events as Array<Record<string, unknown>>;
    expect(events[0]).toMatchObject({
      type: 'xhr',
      method: 'POST',
      url: 'https://api.example.com/create',
      status: 201,
      duration: 300,
      requestBody: '{"name":"test"}',
      responseBody: '{"id":1}',
    });
  });

  it('kritik XHR (status >= 400) hemen flush edilir', () => {
    startRecording();
    postXhrMessage({ status: 500, url: 'https://api.example.com/error' });

    // Timer beklemeden flush olmalı
    const flushes = getFlushCalls('xhr');
    expect(flushes.length).toBe(1);
    expect(flushes[0].payload.critical).toBe(true);
  });

  it('status 404 de kritik olarak flush edilir', () => {
    startRecording();
    postXhrMessage({ status: 404 });

    const flushes = getFlushCalls('xhr');
    expect(flushes.length).toBe(1);
    expect(flushes[0].payload.critical).toBe(true);
  });
});

// 7.3 postMessage ile Console event alma ve ConsoleEvent oluşturma
describe('postMessage ile Console event alma', () => {
  it('console log event buffer\'a eklenir', () => {
    startRecording();
    postConsoleMessage({ level: 'log', message: 'hello world' });
    vi.advanceTimersByTime(3000);

    const flushes = getFlushCalls('console');
    expect(flushes.length).toBe(1);
    const events = flushes[0].payload.events as Array<Record<string, unknown>>;
    expect(events[0]).toMatchObject({
      type: 'console',
      level: 'log',
      message: 'hello world',
    });
  });

  it('console warn event buffer\'a eklenir', () => {
    startRecording();
    postConsoleMessage({ level: 'warn', message: 'warning!' });
    vi.advanceTimersByTime(3000);

    const events = (getFlushCalls('console')[0].payload.events) as Array<Record<string, unknown>>;
    expect(events[0].level).toBe('warn');
  });

  it('console error hemen flush edilir (critical) ve stack trace korunur', () => {
    startRecording();
    const testStack = 'Error: Fatal error\n    at Object.<anonymous> (app.js:42:5)';
    postConsoleMessage({ level: 'error', message: 'Fatal error', stack: testStack });

    const flushes = getFlushCalls('console');
    expect(flushes.length).toBe(1);
    expect(flushes[0].payload.critical).toBe(true);
    const events = flushes[0].payload.events as Array<Record<string, unknown>>;
    expect(events[0].stack).toBe(testStack);
  });

  it('console log event stack alanı içermez', () => {
    startRecording();
    postConsoleMessage({ level: 'log', message: 'no stack' });
    vi.advanceTimersByTime(3000);

    const events = (getFlushCalls('console')[0].payload.events) as Array<Record<string, unknown>>;
    expect(events[0].stack).toBeUndefined();
  });

  it('console info event buffer\'a eklenir', () => {
    startRecording();
    postConsoleMessage({ level: 'info', message: 'info msg' });
    vi.advanceTimersByTime(3000);

    const events = (getFlushCalls('console')[0].payload.events) as Array<Record<string, unknown>>;
    expect(events[0].level).toBe('info');
  });
});

// 7.4 Click tracking testleri (DOM event simulation)
describe('Click tracking', () => {
  it('click event buffer\'a eklenir', () => {
    startRecording();

    const btn = document.createElement('button');
    btn.id = 'test-btn';
    btn.textContent = 'Click Me';
    document.body.appendChild(btn);

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 100, clientY: 200 }));
    vi.advanceTimersByTime(3000);

    const flushes = getFlushCalls('click');
    expect(flushes.length).toBe(1);
    const events = flushes[0].payload.events as Array<Record<string, unknown>>;
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('click');
    expect(events[0].selector).toBe('#test-btn');
    expect(events[0].text).toBe('Click Me');
    expect(events[0].pageUrl).toBeDefined();

    document.body.removeChild(btn);
  });

  it('click event unique CSS selector oluşturur (id)', () => {
    startRecording();

    const el = document.createElement('div');
    el.id = 'unique-el';
    document.body.appendChild(el);

    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.advanceTimersByTime(3000);

    const events = (getFlushCalls('click')[0].payload.events) as Array<Record<string, unknown>>;
    expect(events[0].selector).toBe('#unique-el');

    document.body.removeChild(el);
  });

  it('click event class-based selector oluşturur (id yoksa)', () => {
    startRecording();

    const el = document.createElement('span');
    el.className = 'my-class';
    document.body.appendChild(el);

    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.advanceTimersByTime(3000);

    const events = (getFlushCalls('click')[0].payload.events) as Array<Record<string, unknown>>;
    expect(events[0].selector).toContain('span');

    document.body.removeChild(el);
  });

  it('paused durumdayken click kaydedilmez', () => {
    startRecording();
    pauseRecording();

    const btn = document.createElement('button');
    btn.textContent = 'No Click';
    document.body.appendChild(btn);

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.advanceTimersByTime(3000);

    const flushes = getFlushCalls('click');
    expect(flushes.length).toBe(0);

    document.body.removeChild(btn);
  });
});

// 7.5 SPA route tracking testleri
describe('SPA route tracking', () => {
  it('popstate event NavEvent olarak kaydedilir', () => {
    startRecording();

    window.dispatchEvent(new PopStateEvent('popstate'));
    vi.advanceTimersByTime(3000);

    const flushes = getFlushCalls('nav');
    expect(flushes.length).toBe(1);
    const events = flushes[0].payload.events as Array<Record<string, unknown>>;
    expect(events[0].type).toBe('nav');
  });

  it('hashchange event NavEvent olarak kaydedilir', () => {
    startRecording();

    window.dispatchEvent(new HashChangeEvent('hashchange'));
    vi.advanceTimersByTime(3000);

    const flushes = getFlushCalls('nav');
    expect(flushes.length).toBe(1);
  });

  it('postMessage nav event (pushState/replaceState) kaydedilir', () => {
    startRecording();

    postNavMessage({
      oldUrl: 'https://example.com/page1',
      newUrl: 'https://example.com/page2',
      title: 'Page 2',
    });
    vi.advanceTimersByTime(3000);

    const flushes = getFlushCalls('nav');
    expect(flushes.length).toBe(1);
    const events = flushes[0].payload.events as Array<Record<string, unknown>>;
    expect(events[0].url).toBe('https://example.com/page2');
    expect(events[0].oldUrl).toBe('https://example.com/page1');
  });

  it('popstate NavEvent oldUrl alanı içerir', () => {
    startRecording();

    window.dispatchEvent(new PopStateEvent('popstate'));
    vi.advanceTimersByTime(3000);

    const events = (getFlushCalls('nav')[0].payload.events) as Array<Record<string, unknown>>;
    expect(events[0].oldUrl).toBeDefined();
  });
});

// 7.6 Buffer flush ve periyodik flush
describe('Buffer flush ve periyodik flush', () => {
  it('3 saniye interval ile otomatik flush yapılır', () => {
    startRecording();
    postXhrMessage();

    // 3 saniye öncesinde flush olmamalı (kritik olmayan)
    expect(getFlushCalls('xhr').length).toBe(0);

    vi.advanceTimersByTime(3000);
    expect(getFlushCalls('xhr').length).toBe(1);
  });

  it('birden fazla event aynı flush\'ta gönderilir', () => {
    startRecording();
    postXhrMessage({ url: 'https://api.example.com/1' });
    postXhrMessage({ url: 'https://api.example.com/2' });
    postXhrMessage({ url: 'https://api.example.com/3' });
    vi.advanceTimersByTime(3000);

    const flushes = getFlushCalls('xhr');
    expect(flushes.length).toBe(1);
    const events = flushes[0].payload.events as Array<Record<string, unknown>>;
    expect(events.length).toBe(3);
  });

  it('STOP_RECORDING sonrası periyodik flush durur', () => {
    startRecording();
    stopRecording();
    vi.clearAllMocks();

    vi.advanceTimersByTime(6000);
    expect(getFlushCalls().length).toBe(0);
  });

  it('FLUSH_DATA mesajı doğru tabId ile gönderilir', () => {
    startRecording(99);
    postXhrMessage();
    vi.advanceTimersByTime(3000);

    const flush = getFlushCalls('xhr')[0];
    expect(flush.payload.tabId).toBe(99);
  });

  it('boş buffer flush edilmez', () => {
    startRecording();
    vi.advanceTimersByTime(3000);

    // Hiç event eklenmedi — flush çağrılmamalı
    expect(getFlushCalls().length).toBe(0);
  });
});

// 7.8 Static asset filtresi (MAIN world tarafı — burada postMessage simulation)
describe('Static asset filtresi', () => {
  it('static asset URL\'li XHR event normal şekilde işlenir (filtreleme MAIN world\'de)', () => {
    // Not: Static asset filtresi MAIN world injected script'te çalışır.
    // Content script (ISOLATED world) kendisine gelen tüm XHR postMessage'ları kabul eder.
    // Bu test, MAIN world'ün filtreleme yaptığı senaryoyu simüle eder:
    // MAIN world filtre yaptığı için bu mesaj asla gelmez.
    // Ama content script tarafına bir mesaj gelirse, onu işler.
    startRecording();
    postXhrMessage({ url: 'https://cdn.example.com/api/data' });
    vi.advanceTimersByTime(3000);

    const flushes = getFlushCalls('xhr');
    expect(flushes.length).toBe(1);
  });
});

// 7.9 Body truncation (MAIN world tarafı — injected script'te)
describe('Body truncation', () => {
  it('body truncation MAIN world\'de uygulanır (content script gelen veriyi olduğu gibi alır)', () => {
    startRecording();
    const largeBody = `${'x'.repeat(60000)}\n[truncated at 50KB]`;
    postXhrMessage({ responseBody: largeBody });
    vi.advanceTimersByTime(3000);

    const events = (getFlushCalls('xhr')[0].payload.events) as Array<Record<string, unknown>>;
    expect(events[0].responseBody).toBe(largeBody);
  });
});

// 7.10 Console rolling window
describe('Console rolling window', () => {
  it('route değişiminde console logları sıfırlanır (yeni sayfaya geçiş)', () => {
    startRecording();

    // Sayfa 1'de console log
    postConsoleMessage({ message: 'page1 log' });
    vi.advanceTimersByTime(3000);
    vi.clearAllMocks();

    // Route değişimi
    postNavMessage({ newUrl: 'https://example.com/page2' });

    // Sayfa 2'de console log
    postConsoleMessage({ message: 'page2 log' });
    vi.advanceTimersByTime(3000);

    const flushes = getFlushCalls('console');
    expect(flushes.length).toBe(1);
    const events = flushes[0].payload.events as Array<Record<string, unknown>>;
    // Sadece yeni sayfa logları gelmeli
    expect(events.length).toBe(1);
    expect(events[0].message).toBe('page2 log');
  });
});
