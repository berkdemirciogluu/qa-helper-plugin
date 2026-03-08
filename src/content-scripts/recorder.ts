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
let currentTabId = -1;
let currentPageUrl = location.href;

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
  const events = pendingEvents.get(dataType);
  if (!events || events.length === 0) return;

  const payload: FlushDataPayload = {
    tabId: currentTabId,
    dataType,
    events: events.splice(0, events.length),
    critical,
  };

  chrome.runtime.sendMessage({
    action: MESSAGE_ACTIONS.FLUSH_DATA,
    payload,
  }).catch(() => {
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
function addEvent(dataType: DataType, event: TimelineEvent): void {
  if (!isRecording || isPaused) return;
  const buffer = pendingEvents.get(dataType);
  if (buffer) buffer.push(event);
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

  // Buffer'ları temizle
  for (const events of pendingEvents.values()) {
    events.length = 0;
  }
  currentPageLogs = [];
  previousPageLogs = [];

  startFlushTimer();
  injectPageScript();
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
chrome.runtime.onMessage.addListener(
  (
    message: { action: string; payload?: RecorderCommandPayload },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: { success: boolean }) => void,
  ) => {
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
  },
);

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
  true, // capture phase
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

// ─── Injected Page Script (MAIN world enjeksiyonu) ───────────────────────────
function injectPageScript(): void {
  const script = document.createElement('script');
  script.textContent = `(function() {
    var QA_XHR = '__QA_HELPER_XHR__';
    var QA_CONSOLE = '__QA_HELPER_CONSOLE__';
    var QA_NAV = '__QA_HELPER_NAV__';
    var MAX_BODY = ${50 * 1024};

    // ── Static asset filter ──
    var STATIC_EXT = ['.js','.css','.png','.jpg','.jpeg','.gif','.svg','.woff','.woff2','.ttf','.eot','.ico','.map','.webp','.avif'];
    function isStaticAsset(url) {
      if (!url || typeof url !== 'string') return false;
      if (url.indexOf('data:') === 0 || url.indexOf('blob:') === 0) return true;
      try {
        var pathname = new URL(url, location.href).pathname.toLowerCase();
        for (var i = 0; i < STATIC_EXT.length; i++) {
          if (pathname.endsWith(STATIC_EXT[i])) return true;
        }
      } catch(e) {}
      return false;
    }

    // ── Body truncation ──
    function truncateBody(body) {
      if (!body) return undefined;
      if (typeof body !== 'string') return undefined;
      if (body.length > MAX_BODY) return body.slice(0, MAX_BODY) + '\\n[truncated at 50KB]';
      return body;
    }

    // ── XHR Monkey-Patch ──
    var _xhrMeta = new WeakMap();
    var _origOpen = XMLHttpRequest.prototype.open;
    var _origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
      _xhrMeta.set(this, { method: method, url: String(url), startTime: Date.now() });
      return _origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function(body) {
      var meta = _xhrMeta.get(this);
      if (meta && !isStaticAsset(meta.url)) {
        meta.requestBody = typeof body === 'string' ? body : null;
        var xhr = this;
        xhr.addEventListener('loadend', function() {
          var duration = Date.now() - meta.startTime;
          window.postMessage({
            type: QA_XHR,
            method: meta.method,
            url: meta.url,
            status: xhr.status,
            duration: duration,
            requestBody: truncateBody(meta.requestBody),
            responseBody: truncateBody(xhr.responseText),
            timestamp: Date.now()
          }, '*');
        });
      }
      return _origSend.apply(this, arguments);
    };

    // ── Fetch Monkey-Patch ──
    var _origFetch = window.fetch;
    window.fetch = function(input, init) {
      var startTime = Date.now();
      var method = (init && init.method) || 'GET';
      var url = typeof input === 'string' ? input
              : input instanceof URL ? input.href
              : input.url;

      if (isStaticAsset(url)) {
        return _origFetch.apply(this, arguments);
      }

      return _origFetch.apply(this, arguments).then(function(response) {
        var duration = Date.now() - startTime;
        var cloned = response.clone();
        cloned.text().then(function(body) {
          window.postMessage({
            type: QA_XHR,
            method: method, url: url,
            status: response.status, duration: duration,
            requestBody: truncateBody((init && typeof init.body === 'string') ? init.body : null),
            responseBody: truncateBody(body),
            timestamp: Date.now()
          }, '*');
        }).catch(function() {});
        return response;
      }).catch(function(err) {
        window.postMessage({
          type: QA_XHR,
          method: method, url: url,
          status: 0, duration: Date.now() - startTime,
          requestBody: null, responseBody: null,
          timestamp: Date.now()
        }, '*');
        throw err;
      });
    };

    // ── Console Interception ──
    var _origConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console)
    };

    ['log', 'warn', 'error', 'info'].forEach(function(level) {
      console[level] = function() {
        var args = Array.prototype.slice.call(arguments);
        var msg = args.map(function(a) {
          try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
          catch(e) { return String(a); }
        }).join(' ');
        var stack = level === 'error' ? (new Error()).stack || '' : undefined;
        window.postMessage({
          type: QA_CONSOLE,
          level: level, message: msg, stack: stack,
          timestamp: Date.now()
        }, '*');
        _origConsole[level].apply(console, args);
      };
    });

    // ── History Monkey-Patch ──
    var _origPush = history.pushState;
    var _origReplace = history.replaceState;

    history.pushState = function() {
      var oldUrl = location.href;
      var result = _origPush.apply(this, arguments);
      window.postMessage({
        type: QA_NAV,
        oldUrl: oldUrl, newUrl: location.href,
        title: document.title, timestamp: Date.now()
      }, '*');
      return result;
    };

    history.replaceState = function() {
      var oldUrl = location.href;
      var result = _origReplace.apply(this, arguments);
      window.postMessage({
        type: QA_NAV,
        oldUrl: oldUrl, newUrl: location.href,
        title: document.title, timestamp: Date.now()
      }, '*');
      return result;
    };
  })();`;

  const target = document.documentElement || document.head || document.body;
  if (target) {
    target.appendChild(script);
    script.remove();
  }
}

// ─── iframe detection ────────────────────────────────────────────────────────
// Her frame kendi recorder instance'ını çalıştırır (all_frames: true).
// window === window.top kontrolü: top frame'de ve iframe'de aynı script çalışır.
// tabId paylaşılır (service worker'dan gelir).

// ─── Recording State Recovery ────────────────────────────────────────────────
// Tam sayfa navigasyonunda veya dinamik iframe yüklendiğinde recording state'i
// sıfırlanır. Service worker'a aktif session var mı diye sorarak kurtarma yapar.
chrome.runtime
  .sendMessage({
    action: MESSAGE_ACTIONS.QUERY_RECORDING_STATE,
    payload: {},
  })
  .then(
    (response: { success: boolean; data?: { recording: boolean; tabId: number } } | undefined) => {
      if (response?.success && response.data?.recording && response.data.tabId) {
        startRecording({ tabId: response.data.tabId });
      }
    },
  )
  .catch(() => {
    // Service worker henüz hazır değil — ilk yükleme veya extension güncelleme
  });
