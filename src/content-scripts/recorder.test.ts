import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Chrome API Mock ─────────────────────────────────────────────────────────
type MessageListener = (
  message: { action: string; payload?: unknown },
  sender: chrome.runtime.MessageSender,
  sendResponse: (r: unknown) => void
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
  capturedMessageListener({ action, payload }, {} as chrome.runtime.MessageSender, (r) => {
    response = r as { success: boolean };
  });
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

function getFlushCalls(
  dataType?: string
): Array<{ action: string; payload: Record<string, unknown> }> {
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

// 7.1 Content script startup and session management
describe('Content script startup and session management', () => {
  it('registers chrome.runtime.onMessage listener', () => {
    expect(capturedMessageListener).not.toBeNull();
  });

  it('starts recording with START_RECORDING command', () => {
    const response = sendCommand('START_RECORDING', { tabId: 42 });
    expect(response.success).toBe(true);
  });

  it('stops recording with STOP_RECORDING command', () => {
    startRecording();
    const response = sendCommand('STOP_RECORDING');
    expect(response.success).toBe(true);
  });
});

// 7.7 Session start/stop/pause/resume
describe('Session start/stop/pause/resume', () => {
  it('event buffer starts filling after START_RECORDING', () => {
    startRecording();
    postXhrMessage();
    vi.advanceTimersByTime(3000);
    const flushes = getFlushCalls('xhr');
    expect(flushes.length).toBeGreaterThan(0);
  });

  it('buffer is flushed after STOP_RECORDING and new events are rejected', () => {
    startRecording();
    postXhrMessage();
    stopRecording();
    vi.clearAllMocks();

    // Send new event — should not be recorded
    postXhrMessage({ url: 'https://api.example.com/after-stop' });
    vi.advanceTimersByTime(3000);

    const flushes = getFlushCalls('xhr');
    expect(flushes.length).toBe(0);
  });

  it('events are not added to buffer after PAUSE_RECORDING', () => {
    startRecording();
    pauseRecording();
    vi.clearAllMocks();

    postXhrMessage();
    vi.advanceTimersByTime(3000);

    const flushes = getFlushCalls('xhr');
    expect(flushes.length).toBe(0);
  });

  it('events are added to buffer again after RESUME_RECORDING', () => {
    startRecording();
    pauseRecording();
    resumeRecording();
    vi.clearAllMocks();

    postXhrMessage();
    vi.advanceTimersByTime(3000);

    const flushes = getFlushCalls('xhr');
    expect(flushes.length).toBeGreaterThan(0);
  });

  it('PAUSE/RESUME has no effect before recording starts', () => {
    pauseRecording();
    resumeRecording();
    // No error thrown
  });

  it('does not crash without payload and returns false', () => {
    const response = sendCommand('START_RECORDING');
    expect(response.success).toBe(false);
  });
});

// 7.2 Receiving XHR events via postMessage and creating XhrEvent
describe('Receiving XHR events via postMessage', () => {
  it('XHR event is received via postMessage and added to buffer', () => {
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

  it('XHR event contains correct fields (method, url, status, duration, body)', () => {
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

  it('critical XHR (status >= 400) is flushed immediately', () => {
    startRecording();
    postXhrMessage({ status: 500, url: 'https://api.example.com/error' });

    // Timer beklemeden flush olmalı
    const flushes = getFlushCalls('xhr');
    expect(flushes.length).toBe(1);
    expect(flushes[0].payload.critical).toBe(true);
  });

  it('status 404 is also flushed as critical', () => {
    startRecording();
    postXhrMessage({ status: 404 });

    const flushes = getFlushCalls('xhr');
    expect(flushes.length).toBe(1);
    expect(flushes[0].payload.critical).toBe(true);
  });
});

// 7.3 Receiving Console events via postMessage and creating ConsoleEvent
describe('Receiving Console events via postMessage', () => {
  it('console log event is added to buffer', () => {
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

  it('console warn event is added to buffer', () => {
    startRecording();
    postConsoleMessage({ level: 'warn', message: 'warning!' });
    vi.advanceTimersByTime(3000);

    const events = getFlushCalls('console')[0].payload.events as Array<Record<string, unknown>>;
    expect(events[0].level).toBe('warn');
  });

  it('console error is flushed immediately (critical) and stack trace is preserved', () => {
    startRecording();
    const testStack = 'Error: Fatal error\n    at Object.<anonymous> (app.js:42:5)';
    postConsoleMessage({ level: 'error', message: 'Fatal error', stack: testStack });

    const flushes = getFlushCalls('console');
    expect(flushes.length).toBe(1);
    expect(flushes[0].payload.critical).toBe(true);
    const events = flushes[0].payload.events as Array<Record<string, unknown>>;
    expect(events[0].stack).toBe(testStack);
  });

  it('console log event does not contain stack field', () => {
    startRecording();
    postConsoleMessage({ level: 'log', message: 'no stack' });
    vi.advanceTimersByTime(3000);

    const events = getFlushCalls('console')[0].payload.events as Array<Record<string, unknown>>;
    expect(events[0].stack).toBeUndefined();
  });

  it('console info event is added to buffer', () => {
    startRecording();
    postConsoleMessage({ level: 'info', message: 'info msg' });
    vi.advanceTimersByTime(3000);

    const events = getFlushCalls('console')[0].payload.events as Array<Record<string, unknown>>;
    expect(events[0].level).toBe('info');
  });
});

// 7.4 Click tracking testleri (DOM event simulation)
describe('Click tracking', () => {
  it('click event is added to buffer', () => {
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

  it('click event creates unique CSS selector (id)', () => {
    startRecording();

    const el = document.createElement('div');
    el.id = 'unique-el';
    document.body.appendChild(el);

    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.advanceTimersByTime(3000);

    const events = getFlushCalls('click')[0].payload.events as Array<Record<string, unknown>>;
    expect(events[0].selector).toBe('#unique-el');

    document.body.removeChild(el);
  });

  it('click event creates class-based selector (no id)', () => {
    startRecording();

    const el = document.createElement('span');
    el.className = 'my-class';
    document.body.appendChild(el);

    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.advanceTimersByTime(3000);

    const events = getFlushCalls('click')[0].payload.events as Array<Record<string, unknown>>;
    expect(events[0].selector).toContain('span');

    document.body.removeChild(el);
  });

  it('click is not recorded when paused', () => {
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
  it('popstate event is recorded as NavEvent', () => {
    startRecording();

    window.dispatchEvent(new PopStateEvent('popstate'));
    vi.advanceTimersByTime(3000);

    const flushes = getFlushCalls('nav');
    expect(flushes.length).toBe(1);
    const events = flushes[0].payload.events as Array<Record<string, unknown>>;
    expect(events[0].type).toBe('nav');
  });

  it('hashchange event is recorded as NavEvent', () => {
    startRecording();

    window.dispatchEvent(new HashChangeEvent('hashchange'));
    vi.advanceTimersByTime(3000);

    const flushes = getFlushCalls('nav');
    expect(flushes.length).toBe(1);
  });

  it('postMessage nav event (pushState/replaceState) is recorded', () => {
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

  it('popstate NavEvent contains oldUrl field', () => {
    startRecording();

    window.dispatchEvent(new PopStateEvent('popstate'));
    vi.advanceTimersByTime(3000);

    const events = getFlushCalls('nav')[0].payload.events as Array<Record<string, unknown>>;
    expect(events[0].oldUrl).toBeDefined();
  });
});

// 7.6 Buffer flush and periodic flush
describe('Buffer flush and periodic flush', () => {
  it('auto-flushes at 3 second interval', () => {
    startRecording();
    postXhrMessage();

    // 3 saniye öncesinde flush olmamalı (kritik olmayan)
    expect(getFlushCalls('xhr').length).toBe(0);

    vi.advanceTimersByTime(3000);
    expect(getFlushCalls('xhr').length).toBe(1);
  });

  it('multiple events are sent in the same flush', () => {
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

  it('periodic flush stops after STOP_RECORDING', () => {
    startRecording();
    stopRecording();
    vi.clearAllMocks();

    vi.advanceTimersByTime(6000);
    expect(getFlushCalls().length).toBe(0);
  });

  it('FLUSH_DATA message is sent with correct tabId', () => {
    startRecording(99);
    postXhrMessage();
    vi.advanceTimersByTime(3000);

    const flush = getFlushCalls('xhr')[0];
    expect(flush.payload.tabId).toBe(99);
  });

  it('empty buffer is not flushed', () => {
    startRecording();
    vi.advanceTimersByTime(3000);

    // No events added — flush should not be called
    expect(getFlushCalls().length).toBe(0);
  });
});

// 7.8 Static asset filter (MAIN world side — postMessage simulation here)
describe('Static asset filter', () => {
  it('static asset URL XHR event is processed normally (filtering is in MAIN world)', () => {
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
  it('body truncation is applied in MAIN world (content script receives data as-is)', () => {
    startRecording();
    const largeBody = `${'x'.repeat(60000)}\n[truncated at 50KB]`;
    postXhrMessage({ responseBody: largeBody });
    vi.advanceTimersByTime(3000);

    const events = getFlushCalls('xhr')[0].payload.events as Array<Record<string, unknown>>;
    expect(events[0].responseBody).toBe(largeBody);
  });
});

// 7.10 Console rolling window
describe('Console rolling window', () => {
  it('console logs are reset on route change (page navigation)', () => {
    startRecording();

    // Console log on page 1
    postConsoleMessage({ message: 'page1 log' });
    vi.advanceTimersByTime(3000);
    vi.clearAllMocks();

    // Route change
    postNavMessage({ newUrl: 'https://example.com/page2' });

    // Console log on page 2
    postConsoleMessage({ message: 'page2 log' });
    vi.advanceTimersByTime(3000);

    const flushes = getFlushCalls('console');
    expect(flushes.length).toBe(1);
    const events = flushes[0].payload.events as Array<Record<string, unknown>>;
    // Only new page logs should come
    expect(events.length).toBe(1);
    expect(events[0].message).toBe('page2 log');
  });
});
