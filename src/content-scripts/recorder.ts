import { MESSAGE_ACTIONS, RECORDER_FLUSH_INTERVAL_MS, QA_HELPER_MSG_TYPES } from '../lib/constants';
import type {
  FlushDataPayload,
  RecorderCommandPayload,
  TimelineEvent,
  XhrEvent,
  ConsoleEvent,
  ClickEvent,
  NavEvent,
} from '../lib/types';

// ─── Session State ───────────────────────────────────────────────────────────
let isRecording = false;
let isPaused = false;
let isContextValid = true;
let currentTabId = -1;
let currentPageUrl = location.href;

// Extension reload/update sonrası context geçersiz olur — sessizce dur
function checkContext(): boolean {
  try {
    void chrome.runtime.id;
    return true;
  } catch {
    teardown();
    return false;
  }
}

function teardown(): void {
  isContextValid = false;
  isRecording = false;
  isPaused = false;
  stopFlushTimer();
  window.removeEventListener('message', handlePageMessage);
}

// ─── Event Buffers ───────────────────────────────────────────────────────────
type DataType = FlushDataPayload['dataType'];

const pendingEvents = new Map<DataType, TimelineEvent[]>();
pendingEvents.set('xhr', []);
pendingEvents.set('console', []);
pendingEvents.set('click', []);
pendingEvents.set('nav', []);

// Console rolling window (previousPageLogs snapshot/bug-report story'de okunacak)
let currentPageLogs: ConsoleEvent[] = [];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let previousPageLogs: ConsoleEvent[] = [];

// ─── Flush Timer ─────────────────────────────────────────────────────────────
let flushTimerId: ReturnType<typeof setInterval> | null = null;

function flushEvents(dataType: DataType, critical?: boolean): void {
  if (!isRecording || !isContextValid) return;
  if (!checkContext()) return;
  const events = pendingEvents.get(dataType);
  if (!events || events.length === 0) return;

  const payload: FlushDataPayload = {
    tabId: currentTabId,
    dataType,
    events: events.splice(0, events.length),
    critical,
  };

  chrome.runtime
    .sendMessage({
      action: MESSAGE_ACTIONS.FLUSH_DATA,
      payload,
    })
    .catch(() => {
      // Service worker bağlantı hatası — veri kaybedilir ama çökmez
    });
}

function flushAll(): void {
  for (const dataType of pendingEvents.keys()) {
    flushEvents(dataType);
  }
}

function startFlushTimer(): void {
  if (flushTimerId !== null) return;
  flushTimerId = setInterval(flushAll, RECORDER_FLUSH_INTERVAL_MS);
}

function stopFlushTimer(): void {
  if (flushTimerId !== null) {
    clearInterval(flushTimerId);
    flushTimerId = null;
  }
}

// ─── Buffer Helpers ──────────────────────────────────────────────────────────
const MAX_PRE_RECORDING_BUFFER = 200;

function addEvent(dataType: DataType, event: TimelineEvent): void {
  if (isPaused || !isContextValid) return;
  const buffer = pendingEvents.get(dataType);
  if (!buffer) return;
  // Kayıt başlamadan önce buffer boyutunu sınırla
  if (!isRecording && buffer.length >= MAX_PRE_RECORDING_BUFFER) return;
  buffer.push(event);
}

// ─── Console Rolling Window ──────────────────────────────────────────────────
function shiftConsoleLogs(): void {
  previousPageLogs = currentPageLogs;
  currentPageLogs = [];
}

// ─── postMessage Listener (MAIN world → ISOLATED world) ─────────────────────
function handlePageMessage(event: MessageEvent): void {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || typeof data.type !== 'string') return;

  switch (data.type) {
    case QA_HELPER_MSG_TYPES.XHR: {
      const xhrEvent: XhrEvent = {
        type: 'xhr',
        timestamp: data.timestamp ?? Date.now(),
        method: data.method,
        url: data.url,
        status: data.status,
        duration: data.duration,
        requestBody: data.requestBody,
        responseBody: data.responseBody,
      };
      addEvent('xhr', xhrEvent);
      // Kritik XHR (status >= 400) — hemen flush
      if (data.status >= 400) {
        flushEvents('xhr', true);
      }
      break;
    }
    case QA_HELPER_MSG_TYPES.CONSOLE: {
      const consoleEvent: ConsoleEvent = {
        type: 'console',
        timestamp: data.timestamp ?? Date.now(),
        level: data.level,
        message: data.message,
        stack: data.level === 'error' ? data.stack : undefined,
      };
      addEvent('console', consoleEvent);
      if (isRecording && !isPaused) {
        currentPageLogs.push(consoleEvent);
      }
      // Error seviyesi — hemen flush
      if (data.level === 'error') {
        flushEvents('console', true);
      }
      break;
    }
    case QA_HELPER_MSG_TYPES.NAV: {
      const navEvent: NavEvent = {
        type: 'nav',
        timestamp: data.timestamp ?? Date.now(),
        oldUrl: data.oldUrl ?? currentPageUrl,
        url: data.newUrl,
        title: data.title ?? '',
      };
      addEvent('nav', navEvent);
      currentPageUrl = data.newUrl;
      shiftConsoleLogs();
      break;
    }
  }
}

// ─── Recording Control ──────────────────────────────────────────────────────
function startRecording(payload: RecorderCommandPayload): void {
  currentTabId = payload.tabId;
  currentPageUrl = location.href;
  isRecording = true;
  isPaused = false;

  currentPageLogs = [];
  previousPageLogs = [];

  startFlushTimer();
  flushAll(); // Kayıt öncesi biriken event'leri flush et
}

function stopRecording(): void {
  flushAll();
  stopFlushTimer();
  isRecording = false;
  isPaused = false;
}

function pauseRecording(): void {
  if (!isRecording) return;
  isPaused = true;
}

function resumeRecording(): void {
  if (!isRecording) return;
  isPaused = false;
}

// ─── chrome.runtime.onMessage — Service Worker komutları ─────────────────────
try {
  chrome.runtime.onMessage.addListener(
    (
      message: { action: string; payload?: RecorderCommandPayload },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: { success: boolean }) => void
    ) => {
      if (!isContextValid) return;
      switch (message.action) {
        case MESSAGE_ACTIONS.START_RECORDING:
          if (message.payload) {
            startRecording(message.payload);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false });
          }
          break;
        case MESSAGE_ACTIONS.STOP_RECORDING:
          stopRecording();
          sendResponse({ success: true });
          break;
        case MESSAGE_ACTIONS.PAUSE_RECORDING:
          pauseRecording();
          sendResponse({ success: true });
          break;
        case MESSAGE_ACTIONS.RESUME_RECORDING:
          resumeRecording();
          sendResponse({ success: true });
          break;
      }
      return true;
    }
  );
} catch {
  // Extension context invalidated — sessizce dur
  teardown();
}

// ─── postMessage Listener ────────────────────────────────────────────────────
window.addEventListener('message', handlePageMessage);

// ─── Click Tracking (ISOLATED world — DOM erişimi) ───────────────────────────
function getElementText(el: Element): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.value || el.placeholder || '';
  }
  return (
    (el as HTMLElement).innerText?.trim().slice(0, 100) ||
    el.textContent?.trim().slice(0, 100) ||
    el.getAttribute('alt') ||
    el.getAttribute('placeholder') ||
    el.getAttribute('aria-label') ||
    ''
  );
}

const MAX_SELECTOR_DEPTH = 10;

function getUniqueSelector(el: Element, depth = 0): string {
  if (el.id) return `#${el.id}`;

  const tag = el.tagName.toLowerCase();
  const classes = Array.from(el.classList)
    .filter((c) => c.length > 0)
    .map((c) => `.${c}`)
    .join('');

  if (classes) {
    const selector = `${tag}${classes}`;
    if (document.querySelectorAll(selector).length === 1) return selector;
  }

  // nth-child fallback — derinlik limiti ile
  const parent = el.parentElement;
  if (parent && depth < MAX_SELECTOR_DEPTH) {
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(el) + 1;
    const parentSelector = getUniqueSelector(parent, depth + 1);
    return `${parentSelector} > ${tag}:nth-child(${index})`;
  }

  return tag;
}

document.addEventListener(
  'click',
  (event: MouseEvent) => {
    if (!isRecording || isPaused) return;
    const target = event.target;
    if (!(target instanceof Element)) return;

    const clickEvent: ClickEvent = {
      type: 'click',
      timestamp: Date.now(),
      selector: getUniqueSelector(target),
      text: getElementText(target),
      pageUrl: currentPageUrl,
      x: event.clientX,
      y: event.clientY,
    };
    addEvent('click', clickEvent);
  },
  true // capture phase
);

// ─── SPA Route Tracking (ISOLATED world — DOM events) ────────────────────────
function handleNavigation(oldUrl: string, newUrl: string): void {
  if (!isRecording || isPaused) return;
  const navEvent: NavEvent = {
    type: 'nav',
    timestamp: Date.now(),
    oldUrl,
    url: newUrl,
    title: document.title,
  };
  addEvent('nav', navEvent);
  currentPageUrl = newUrl;
  shiftConsoleLogs();
}

window.addEventListener('popstate', () => {
  const newUrl = location.href;
  handleNavigation(currentPageUrl, newUrl);
});

window.addEventListener('hashchange', () => {
  const newUrl = location.href;
  handleNavigation(currentPageUrl, newUrl);
});

// ─── iframe detection ────────────────────────────────────────────────────────
// Her frame kendi recorder instance'ını çalıştırır (all_frames: true).
// window === window.top kontrolü: top frame'de ve iframe'de aynı script çalışır.
// tabId paylaşılır (service worker'dan gelir).

// ─── Recording State Recovery ────────────────────────────────────────────────
// Tam sayfa navigasyonunda veya dinamik iframe yüklendiğinde recording state'i
// sıfırlanır. Service worker'a aktif session var mı diye sorarak kurtarma yapar.
if (isContextValid && checkContext()) {
  chrome.runtime
    .sendMessage({
      action: MESSAGE_ACTIONS.QUERY_RECORDING_STATE,
      payload: {},
    })
    .then(
      (response: { success: boolean; data?: { recording: boolean; tabId: number; previousUrl?: string } } | undefined) => {
        if (response?.success && response.data?.recording && response.data.tabId) {
          const prevUrl = response.data.previousUrl ?? '';
          const currentUrl = location.href;
          startRecording({ tabId: response.data.tabId });
          if (prevUrl && prevUrl !== currentUrl) {
            const navEvent: NavEvent = {
              type: 'nav',
              timestamp: Date.now(),
              oldUrl: prevUrl,
              url: currentUrl,
              title: document.title,
            };
            addEvent('nav', navEvent);
            currentPageUrl = currentUrl;
            shiftConsoleLogs();
          }
        }
      }
    )
    .catch(() => {
      // Service worker henüz hazır değil veya context invalidated
      teardown();
    });
}
