# Story 1.3: Content Script — Veri Kayıt Motoru

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **tester**,
I want **extension'ın test ettiğim sayfadaki XHR isteklerini, console loglarını, tıklama akışımı ve sayfa geçişlerimi arka planda kaydetmesini**,
So that **bug bulduğumda tüm teknik bağlam otomatik olarak hazır olsun**.

## Acceptance Criteria

1. **Given** session aktif ve content script sayfaya enjekte edilmiş, **When** sayfada bir XHR veya Fetch isteği yapılır (static asset hariç), **Then** istek kaydedilir: method, URL, status, süre, request/response body (max 50KB truncation) **And** kayıt IIFE içinde monkey-patching ile yapılır, host sayfanın JS scope'u kirletilmez.

2. **Given** session aktif, **When** sayfada `console.log`, `console.warn`, `console.error` çağrılır, **Then** log mesajı, seviyesi ve zaman damgası kaydedilir **And** `console.error` için stack trace parse edilir **And** rolling window uygulanır: mevcut sayfa + bir önceki sayfa logları tutulur.

3. **Given** session aktif, **When** kullanıcı sayfada bir elemente tıklar, **Then** tıklanan elementin text'i, CSS selector'ı ve sayfa URL'i zaman damgası ile kaydedilir.

4. **Given** SPA uygulamasında session aktif, **When** `pushState`, `popState` veya `hashchange` event'i tetiklenir, **Then** route değişimi timeline'a kaydedilir (eski URL → yeni URL + zaman damgası).

5. **Given** sayfa iframe içeriyor ve manifest'te `all_frames: true` tanımlı, **When** iframe yüklenir, **Then** content script iframe içine de enjekte edilir ve iframe'deki veriler (DOM, console, XHR) toplanır.

6. **Given** session aktif ve content script veri topluyor, **When** aktif tab'dan background tab'a geçiş yapılır, **Then** background tab'da aktif kayıt durur, yalnızca session state (URL, tab ID) korunur **And** tab tekrar aktif olduğunda kayıt devam eder.

7. **Given** content script çalışıyor, **When** sayfa performans metrikleri ölçülür, **Then** content script injection < 5ms DOM gecikme ekler **And** XHR/console kayıt overhead'i < %2 CPU ek yükü getirir.

## Tasks / Subtasks

- [x] **Task 1: Content script temel altyapısı ve session yönetimi (AC: #5, #6)**
  - [x] 1.1 `src/content-scripts/recorder.ts` — ISOLATED world content script iskelet: session state yönetimi (`isRecording`, `isPaused`, `currentTabId`, `currentPageUrl`)
  - [x] 1.2 `chrome.runtime.onMessage` listener — service worker'dan `START_RECORDING`, `STOP_RECORDING`, `PAUSE_RECORDING`, `RESUME_RECORDING` komutlarını dinle
  - [x] 1.3 `window.addEventListener('message')` listener — MAIN world injected script'ten gelen verileri dinle (`__QA_HELPER_` prefix ile filtrele)
  - [x] 1.4 Olay buffer yönetimi — `pendingEvents: Map<DataType, TimelineEvent[]>` yapısı, buffer boyutu veya interval'e göre flush
  - [x] 1.5 `flushEvents(dataType, critical?)` fonksiyonu — `chrome.runtime.sendMessage` ile `FLUSH_DATA` gönder
  - [x] 1.6 Periyodik flush timer (3 saniye interval) — session aktifken çalışır, durduğunda temizlenir
  - [x] 1.7 iframe desteği: `window === window.top` kontrolü, her frame kendi recorder instance'ını çalıştırır, tabId paylaşılır

- [x] **Task 2: Injected page script — XHR/Fetch monkey-patching (AC: #1) [MAIN WORLD]**
  - [x] 2.1 `injectPageScript()` fonksiyonu — `document.createElement('script').textContent = '...'` ile MAIN world'e enjekte et, enjeksiyon sonrası script element'i kaldır
  - [x] 2.2 MAIN world'de `XMLHttpRequest.prototype.open` ve `XMLHttpRequest.prototype.send` monkey-patch — WeakMap ile metadata sakla (method, URL, startTime, requestBody)
  - [x] 2.3 MAIN world'de `XMLHttpRequest` `load`/`error`/`timeout` event listener — status, duration, responseBody (max 50KB) kaydet, `window.postMessage({ type: '__QA_HELPER_XHR__', ... })` ile content script'e gönder
  - [x] 2.4 MAIN world'de `window.fetch` monkey-patch — `response.clone()` ile body oku, `window.postMessage({ type: '__QA_HELPER_XHR__', ... })` ile gönder
  - [x] 2.5 Static asset filtresi (MAIN world'de) — `.js`, `.css`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.woff`, `.woff2`, `.ttf`, `.eot`, `.ico`, `.map`, `.webp`, `.avif` uzantıları + `data:` ve `blob:` URL'ler hariç tut
  - [x] 2.6 Body truncation (MAIN world'de) — 50KB aşan body'ler kesilir, `[truncated at 50KB]` notu eklenir
  - [x] 2.7 ISOLATED world'de `__QA_HELPER_XHR__` mesajlarını dinle, XhrEvent oluştur ve buffer'a ekle, kritik XHR (status >= 400) `critical: true` ile flush

- [x] **Task 3: Injected page script — Console interception (AC: #2) [MAIN WORLD]**
  - [x] 3.1 MAIN world'de `console.log`, `console.warn`, `console.error`, `console.info` orijinal referanslarını sakla (`.bind(console)`)
  - [x] 3.2 MAIN world'de her console method'u override — orijinal fonksiyonu çağır + `window.postMessage({ type: '__QA_HELPER_CONSOLE__', ... })` gönder
  - [x] 3.3 MAIN world'de `console.error` için stack trace: `new Error().stack` oluştur, mesajla birlikte gönder
  - [x] 3.4 ISOLATED world'de `__QA_HELPER_CONSOLE__` mesajlarını dinle, ConsoleEvent oluştur
  - [x] 3.5 Rolling window (ISOLATED world): `currentPageLogs` ve `previousPageLogs` — sayfa/route değişiminde shift
  - [x] 3.6 `level: 'error'` olan ConsoleEvent'ler `critical: true` ile flush

- [x] **Task 4: Click tracking — ISOLATED world (AC: #3) [doğrudan DOM erişimi]**
  - [x] 4.1 `document.addEventListener('click', handler, true)` — capture phase ile tüm tıklamaları yakala (ISOLATED world DOM event'leri çalışır)
  - [x] 4.2 Tıklanan element bilgisi çıkar: `text` (innerText, value, alt, placeholder, aria-label sırasıyla), CSS `selector` (unique selector oluştur), `pageUrl` (location.href)
  - [x] 4.3 Unique CSS selector oluşturma: id varsa `#id`, yoksa tag + class + nth-child
  - [x] 4.4 ClickEvent oluştur ve buffer'a ekle

- [x] **Task 5: SPA route tracking — hibrit (AC: #4)**
  - [x] 5.1 MAIN world'de `history.pushState` monkey-patch — orijinal fonksiyonu sakla, çağır, `window.postMessage({ type: '__QA_HELPER_NAV__', ... })` gönder
  - [x] 5.2 MAIN world'de `history.replaceState` monkey-patch — aynı pattern
  - [x] 5.3 ISOLATED world'de `window.addEventListener('popstate')` — NavEvent oluştur (DOM event, ISOLATED'da çalışır)
  - [x] 5.4 ISOLATED world'de `window.addEventListener('hashchange')` — NavEvent oluştur (DOM event, ISOLATED'da çalışır)
  - [x] 5.5 ISOLATED world'de `__QA_HELPER_NAV__` mesajlarını dinle (pushState/replaceState), NavEvent oluştur
  - [x] 5.6 NavEvent: eski URL → yeni URL + timestamp + document.title
  - [x] 5.7 Console rolling window shift: route değişiminde `previousPageLogs = currentPageLogs`, `currentPageLogs = []`

- [x] **Task 6: Service worker iletişim entegrasyonu (AC: #1, #6)**
  - [x] 6.1 `src/background/message-handler.ts` güncelle: `START_SESSION` handler'ında session oluşturulduktan sonra `chrome.tabs.sendMessage(tabId, { action: 'START_RECORDING', payload: { tabId } })` gönder
  - [x] 6.2 `src/background/message-handler.ts` güncelle: `STOP_SESSION` handler'ında session durdurulduktan sonra `chrome.tabs.sendMessage(tabId, { action: 'STOP_RECORDING', payload: { tabId } })` gönder
  - [x] 6.3 `src/background/index.ts` güncelle: `chrome.tabs.onActivated` listener'da aktif tab'ın session'ı varsa `RESUME_RECORDING` gönder, önceki aktif tab'a `PAUSE_RECORDING` gönder (önceki tabId'yi track et)
  - [x] 6.4 `src/lib/constants.ts` güncelle: `MESSAGE_ACTIONS`'a `START_RECORDING`, `STOP_RECORDING`, `PAUSE_RECORDING`, `RESUME_RECORDING` ekle
  - [x] 6.5 `src/lib/types.ts` güncelle: `RecorderCommandPayload` interface ekle (`{ tabId: number }`)

- [x] **Task 7: Testler (AC: tümü)**
  - [x] 7.1 `src/content-scripts/recorder.test.ts` — Content script başlatma ve session yönetimi testleri
  - [x] 7.2 `src/content-scripts/recorder.test.ts` — postMessage ile XHR event alma ve XhrEvent oluşturma testleri
  - [x] 7.3 `src/content-scripts/recorder.test.ts` — postMessage ile Console event alma ve ConsoleEvent oluşturma testleri
  - [x] 7.4 `src/content-scripts/recorder.test.ts` — Click tracking testleri (DOM event simulation)
  - [x] 7.5 `src/content-scripts/recorder.test.ts` — SPA route tracking testleri (popstate/hashchange DOM events + postMessage nav events)
  - [x] 7.6 `src/content-scripts/recorder.test.ts` — Buffer flush ve periyodik flush testleri
  - [x] 7.7 `src/content-scripts/recorder.test.ts` — Session start/stop/pause/resume testleri
  - [x] 7.8 `src/content-scripts/recorder.test.ts` — Static asset filtresi testleri
  - [x] 7.9 `src/content-scripts/recorder.test.ts` — Body truncation testleri
  - [x] 7.10 `src/content-scripts/recorder.test.ts` — Console rolling window testleri
  - [x] 7.11 `src/background/message-handler.test.ts` — START_SESSION sonrası content script'e START_RECORDING gönderme testi
  - [x] 7.12 `src/background/message-handler.test.ts` — STOP_SESSION sonrası content script'e STOP_RECORDING gönderme testi

## Dev Notes

### Kritik Mimari Kısıtlamalar

**Chrome MV3 İki Dünya Modeli — ISOLATED vs MAIN World (EN KRİTİK):**
Chrome MV3'te content script'ler varsayılan olarak **ISOLATED world**'de çalışır. Bu şu anlama gelir:
- Content script'in `window.XMLHttpRequest`'i ile sayfanın `window.XMLHttpRequest`'i **FARKLI nesnelerdir**
- Content script içinde doğrudan monkey-patching (XHR/Fetch/console/history.pushState) **ÇALIŞMAZ** — sayfanın JS scope'unu görmezsin
- Content script DOM'a erişebilir, DOM event'leri dinleyebilir (click, popstate, hashchange) — bunlar ÇALIŞIR

**Çözüm — İkili Mimari:**
1. **Content Script (ISOLATED world):** Session state yönetimi, `chrome.runtime` API erişimi, DOM event listener'ları (click, popstate, hashchange), service worker iletişimi
2. **Injected Page Script (MAIN world):** `document.createElement('script').textContent = '...'` ile enjekte edilir, XHR/Fetch/console/history.pushState monkey-patching yapar
3. **İletişim:** MAIN world → ISOLATED world arası `window.postMessage` ile, message type prefix (`__QA_HELPER_`) ile filtrelenir

**Content Script İzolasyonu — IIFE + WeakMap/Symbol:**
- `recorder.ts` Vite tarafından IIFE ile sarılır (`vite.config.ts:iifeWrapPlugin`) — ek IIFE gerekmez
- Injected page script de kendi IIFE'si içinde çalışır (string olarak enjekte edilir)
- Monkey-patching yapıldığında orijinal referanslar closure içinde saklanmalı, WeakMap ile XHR metadata gizlenmeli
- Host sayfanın JS scope'u kirletilmemeli (NFR11) — global değişken bırakılmamalı
- `all_frames: true` tanımlı — her iframe'de ayrı bir recorder instance'ı çalışır

**Content Script → Service Worker İletişim:**
- Content script `chrome.runtime.sendMessage` kullanır (background'a)
- Service worker `chrome.tabs.sendMessage` kullanır (content script'e)
- Content script'te `sender.tab.id` tabId olarak kullanılabilir ama tutarlılık için payload'da gönderilmeli
- `chrome.runtime.sendMessage` asenkron — content script'in kendi buffer'ında tutup batch göndermesi gerekir

**Performans Bütçesi (NFR1, NFR5, NFR7):**
- Content script injection < 5ms DOM gecikme
- XHR/console kayıt overhead < %2 CPU
- Monkey-patching `document_start`'ta yapılır (manifest: `run_at: "document_start"`) — bu en erken nokta, tüm XHR'lar yakalanır
- Olay listener'ları passive olmalı (click hariç — capture gerekli)
- Buffer flush 3 saniye interval — çok sık mesaj gönderimi performansı düşürür

**Static Asset Filtresi:**
Aşağıdaki uzantılar XHR/Fetch kaydından hariç tutulur:
```
.js, .css, .png, .jpg, .jpeg, .gif, .svg, .woff, .woff2, .ttf, .eot, .ico, .map, .webp, .avif
```
Ayrıca `data:` ve `blob:` URL'ler de hariç tutulur.

**XHR Body Truncation:**
```typescript
const MAX_BODY_SIZE = 50 * 1024; // 50KB
function truncateBody(body: string | null): string | undefined {
  if (!body) return undefined;
  if (body.length > MAX_BODY_SIZE) {
    return body.slice(0, MAX_BODY_SIZE) + '\n[truncated at 50KB]';
  }
  return body;
}
```

**Console Rolling Window:**
- `currentPageLogs: ConsoleEvent[]` — mevcut sayfa logları
- `previousPageLogs: ConsoleEvent[]` — bir önceki sayfa logları
- Sayfa değişiminde (pushState/popState/hashchange veya navigation): `previousPageLogs = currentPageLogs`, `currentPageLogs = []`
- FLUSH_DATA gönderilirken sadece `currentPageLogs` gönderilir; `previousPageLogs` önceki sayfanın flush'ında zaten gönderilmiş

**Tab Activation/Deactivation (AC #6):**
- Service worker `chrome.tabs.onActivated` dinler
- Tab aktif olduğunda content script'e `RESUME_RECORDING` gönderir
- Tab pasif olduğunda content script'e `PAUSE_RECORDING` gönderir
- Content script `isPaused` flag'i ile kayıt durumunu kontrol eder
- Paused durumdayken monkey-patch'ler aktif kalır ama event buffer'a eklenmez

### Dosyalar Dokunulacaklar

```
src/
├── content-scripts/
│   ├── recorder.ts               ← REWRITE: Tam content script (ISOLATED world) + injected page script (MAIN world)
│   └── recorder.test.ts          ← CREATE: Kapsamlı test suite (postMessage simulation, DOM event simulation)
├── background/
│   ├── index.ts                  ← MODIFY: Tab activation/deactivation → content script'e PAUSE/RESUME gönder
│   ├── message-handler.ts        ← MODIFY: START/STOP_SESSION sonrası content script'e START/STOP_RECORDING gönder
│   └── message-handler.test.ts   ← MODIFY: Yeni handler testleri ekle
├── lib/
│   ├── constants.ts              ← MODIFY: MESSAGE_ACTIONS'a START_RECORDING, STOP_RECORDING, PAUSE_RECORDING, RESUME_RECORDING ekle
│   └── types.ts                  ← MODIFY: RecorderCommandPayload interface ekle
```

### Naming Convention'lar

| Kapsam | Kural | Örnek |
|---|---|---|
| Dosyalar | kebab-case.ts | `recorder.ts`, `recorder.test.ts` |
| Fonksiyonlar (IIFE içi) | camelCase | `interceptXhr`, `interceptFetch`, `trackClick`, `flushEvents` |
| Sabitler (IIFE içi) | SCREAMING_SNAKE | `STATIC_ASSET_EXTENSIONS`, `FLUSH_INTERVAL_MS` |
| Message actions | SCREAMING_SNAKE | `START_RECORDING`, `STOP_RECORDING`, `PAUSE_RECORDING`, `RESUME_RECORDING` |
| Console prefix | `[Recorder]` | `console.warn('[Recorder] XHR intercepted')` |

### Chrome API Kullanım Notları

**Content Script Message Gönderimi:**
```typescript
// Content script → Service worker
chrome.runtime.sendMessage({
  action: 'FLUSH_DATA',
  payload: {
    tabId: currentTabId,
    dataType: 'xhr',
    events: pendingXhrEvents,
    critical: hasCriticalEvent,
  }
});
```

**Content Script Message Alma:**
```typescript
// Service worker → Content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'START_RECORDING') {
    startRecording(message.payload);
    sendResponse({ success: true });
  }
  // ...
  return true; // async response için
});
```

**TabId Alma:**
Content script kendi tabId'sini bilmez. İlk session sorgusu sırasında service worker'dan öğrenir:
```typescript
// Content script başlangıcında — tabId'yi service worker'dan al
// Alternatif: sender.tab.id service worker tarafında zaten kullanılabilir
// Bu story'de yaklaşım: content script tabId'yi START_RECORDING payload'ından alır
```

### Dual-World Mimari: Injected Page Script Stratejisi

**MAIN World → ISOLATED World İletişim Akışı:**
```
[MAIN WORLD - Injected Script]     [ISOLATED WORLD - Content Script]     [Service Worker]
  XHR/Fetch monkey-patch        →   window.addEventListener('message')  →  chrome.runtime.sendMessage
  console override              →   postMessage event handler           →  FLUSH_DATA payload
  history.pushState override    →   event → buffer → flush              →  flush-manager → storage
```

**Injected Script Enjeksiyon Pattern'ı:**
```typescript
// ISOLATED world (recorder.ts) — document_start'ta çalışır
function injectPageScript(): void {
  const script = document.createElement('script');
  script.textContent = `(function() {
    // Tüm MAIN world kodu burada string olarak
    // XHR, Fetch, console, history monkey-patching
  })();`;
  // document_start'ta documentElement henüz olmayabilir
  const target = document.documentElement || document.head || document.body;
  if (target) {
    target.appendChild(script);
    script.remove(); // DOM'dan kaldır, ama kod zaten çalıştı
  }
}
```

**MAIN World XHR Monkey-Patch Pattern (string olarak enjekte edilir):**
```javascript
// Injected page script — MAIN world (vanilla JS, TypeScript yok)
const _xhrMeta = new WeakMap();
const _origOpen = XMLHttpRequest.prototype.open;
const _origSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url) {
  _xhrMeta.set(this, { method: method, url: url, startTime: Date.now() });
  return _origOpen.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function(body) {
  var meta = _xhrMeta.get(this);
  if (meta) {
    meta.requestBody = typeof body === 'string' ? body : null;
    var xhr = this;
    xhr.addEventListener('loadend', function() {
      var duration = Date.now() - meta.startTime;
      window.postMessage({
        type: '__QA_HELPER_XHR__',
        method: meta.method,
        url: meta.url,
        status: xhr.status,
        duration: duration,
        requestBody: meta.requestBody,
        responseBody: xhr.responseText,
        timestamp: Date.now()
      }, '*');
    });
  }
  return _origSend.apply(this, arguments);
};
```

**MAIN World Fetch Monkey-Patch Pattern:**
```javascript
var _origFetch = window.fetch;
window.fetch = function(input, init) {
  var startTime = Date.now();
  var method = (init && init.method) || 'GET';
  var url = typeof input === 'string' ? input
          : input instanceof URL ? input.href
          : input.url;

  return _origFetch.apply(this, arguments).then(function(response) {
    var duration = Date.now() - startTime;
    var cloned = response.clone();
    cloned.text().then(function(body) {
      window.postMessage({
        type: '__QA_HELPER_XHR__',
        method: method, url: url,
        status: response.status, duration: duration,
        requestBody: null, responseBody: body,
        timestamp: Date.now()
      }, '*');
    }).catch(function() {});
    return response;
  }).catch(function(err) {
    window.postMessage({
      type: '__QA_HELPER_XHR__',
      method: method, url: url,
      status: 0, duration: Date.now() - startTime,
      requestBody: null, responseBody: null,
      timestamp: Date.now()
    }, '*');
    throw err;
  });
};
```

**MAIN World Console Interception Pattern:**
```javascript
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
      return typeof a === 'object' ? JSON.stringify(a) : String(a);
    }).join(' ');
    var stack = level === 'error' ? (new Error()).stack || '' : undefined;
    window.postMessage({
      type: '__QA_HELPER_CONSOLE__',
      level: level, message: msg, stack: stack,
      timestamp: Date.now()
    }, '*');
    _origConsole[level].apply(console, args);
  };
});
```

**MAIN World History Monkey-Patch Pattern:**
```javascript
var _origPush = history.pushState;
var _origReplace = history.replaceState;

history.pushState = function() {
  var oldUrl = location.href;
  var result = _origPush.apply(this, arguments);
  window.postMessage({
    type: '__QA_HELPER_NAV__',
    oldUrl: oldUrl, newUrl: location.href,
    title: document.title, timestamp: Date.now()
  }, '*');
  return result;
};

history.replaceState = function() {
  var oldUrl = location.href;
  var result = _origReplace.apply(this, arguments);
  window.postMessage({
    type: '__QA_HELPER_NAV__',
    oldUrl: oldUrl, newUrl: location.href,
    title: document.title, timestamp: Date.now()
  }, '*');
  return result;
};
```

**DİKKAT — Injected Script Vanilla JS Olmalı:**
- İnjekte edilen script string olarak gömülür, TypeScript derlenmez
- `const`/`let` yerine `var` kullanılabilir (eski browser uyumu gerekmez ama basitlik için)
- Arrow function yerine `function` kullanılabilir
- Template literal yerine string concatenation
- WeakMap kullanılabilir (modern Chrome'da her zaman mevcut)

### Önceki Story'den Öğrenilenler (Story 1.2 → 1.3)

1. **Result<T> pattern tutarlılığı:** Tüm async fonksiyonlarda Result<T> kullan. Content script içindeki fonksiyonlar da bu pattern'ı takip etmeli (en azından service worker ile iletişimde).

2. **ESLint no-console kuralı:** Background kodda `console.log` ESLint hatası veriyor. Content script'te de aynı kural geçerli olabilir — sadece `console.warn` ve `console.error` kullan (ama dikkat: console.warn/error intercept edilen console metodları olacak — sonsuz döngü riski! Orijinal console referansını kullanmak ZORUNLU).

3. **Storage mock pattern:** `vi.stubGlobal('chrome', {...})` pattern'ı testlerde kullanılıyor. Content script testleri için `window.XMLHttpRequest`, `window.fetch`, `console` mock'ları da gerekecek.

4. **Mevcut flush-manager pattern:** Service worker'daki flush-manager zaten debounce + critical flush mantığını handle ediyor. Content script'in kendi tarafında da hafif bir buffer tutması ve 3 saniyelik interval ile göndermesi yeterli — çift taraflı debounce gereksiz karmaşıklık.

5. **SESSION_NAV storage key:** Story 1.2'de eklendi (`STORAGE_KEYS.SESSION_NAV = 'session_nav'`). Nav event'ler bu key altında saklanacak.

6. **Code review dersleri:** Race condition'lara dikkat (flush-manager'da per-key lock eklendi), payload validation zorunlu, güvensiz cast (`as unknown as R`) kaçın.

7. **npm install:** `--legacy-peer-deps` flag'i gerekiyor. Bu story'de yeni paket eklenmesi beklenmemektedir.

### Anti-Pattern'ler (YAPILMAYACAK)

- ❌ Global değişken bırakmak — tüm state IIFE/closure içinde
- ❌ `window.myRecorder = ...` — host sayfanın scope'u kirletilmez
- ❌ Orijinal console/XHR/fetch referansını kaybetmek — closure'da sakla
- ❌ Console intercept'te sonsuz döngü — MAIN world'de console override yapılıyor, ISOLATED world'den gelen postMessage handler'ında console kullanırsan sonsuz döngü olmaz (farklı dünyalar). Ama MAIN world script içinde kendi override'ını çağırma — orijinal referansı kullan
- ❌ Her event'te ayrı `chrome.runtime.sendMessage` — batch flush kullan
- ❌ Senkron XHR kaydı — performans bütçesi aşılır
- ❌ `document.querySelectorAll('*')` ile DOM tarama — performans felaketi
- ❌ `MutationObserver` ile her DOM değişikliğini kaydetmek — bu story'de gerekli değil
- ❌ Content script içinde `chrome.storage.local` doğrudan kullanmak — tüm veri service worker üzerinden akmalı
- ❌ `any` tipi — `unknown + type guard` tercih et

### Git Bağlamı

Son commit: `3c914c1 feat: service worker session yaşam döngüsü ve veri yönetimi (Story 1.2)`

Story 1.2'de oluşturulan service worker altyapısı (session-manager, flush-manager, message-handler) bu story'nin temelini oluşturur. Content script recorder.ts şu an sadece placeholder — tamamen yeniden yazılacak.

### Project Structure Notes

**Mimari Uyum:**
- `content-scripts/recorder.ts` → Architecture: "XHR/Fetch monkey-patch, console intercept, click/navigation tracking" [Source: architecture.md#Project Structure & Boundaries]
- Manifest `all_frames: true` → Architecture: "iframe veri toplama" [Source: architecture.md#Architectural Boundaries]
- IIFE isolation → Architecture: "Content script izolasyonu: IIFE + Symbol/WeakMap ile wrapper gizleme" [Source: architecture.md#Authentication & Security]

**Bağımlılık Akışı:**
```
recorder.ts → chrome.runtime.sendMessage → message-handler.ts → flush-manager.ts → storage
                                          → session-manager.ts (sayaç güncelleme)
recorder.ts ← chrome.runtime.onMessage ← background/index.ts (tab activation)
                                        ← message-handler.ts (session start/stop)
```

**Kısıtlama — Önemli:**
Popup (Story 1.4) henüz implement edilmemiş. Session başlatma/durdurma bu story'de test amaçlı doğrudan service worker mesajı ile yapılacak. Story 1.4'te popup bu akışı tetikleyecek.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security — Content Script İzolasyonu]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Core User Experience]
- [Source: _bmad-output/implementation-artifacts/1-2-service-worker-session-yasam-dongusu-ve-veri-yonetimi.md#Dev Notes]
- [Source: _bmad-output/implementation-artifacts/1-2-service-worker-session-yasam-dongusu-ve-veri-yonetimi.md#Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- jsdom'da `innerText` property'si çalışmadığı için `getElementText` fonksiyonuna `textContent` fallback'i eklendi
- `previousPageLogs` rolling window buffer'ı henüz okunmuyor (snapshot story'de kullanılacak), eslint-disable-next-line ile suppress edildi

### Completion Notes List

- Content script (recorder.ts) tamamen yeniden yazıldı: ISOLATED world session yönetimi, postMessage listener'ları, click tracking, SPA route tracking
- Injected page script (MAIN world): XHR/Fetch monkey-patch, console interception, history.pushState/replaceState monkey-patch — tümü `injectPageScript()` fonksiyonu içinde string template olarak
- Buffer yönetimi: 4 veri tipi (xhr, console, click, nav) için Map tabanlı buffer, 3 saniyelik periyodik flush, kritik event'ler (XHR status>=400, console error) anında flush
- Console rolling window: sayfa/route değişiminde currentPageLogs → previousPageLogs shift
- Service worker entegrasyonu: START_SESSION → START_RECORDING, STOP_SESSION → STOP_RECORDING, tab activation → PAUSE/RESUME_RECORDING
- constants.ts ve types.ts'e yeni message action'lar ve RecorderCommandPayload eklendi
- 34 yeni recorder testi + 7 yeni message-handler testi = 41 yeni test (toplam 101 test, tümü geçiyor)
- Lint: 0 hata, mevcut uyarılar (no-console) önceki story'lerden kalma

### Code Review Düzeltmeleri (AI)

- **H1** ConsoleEvent tipine `stack?: string` alanı eklendi, console.error stack trace verisi artık korunuyor
- **H2** ClickEvent tipine `pageUrl: string` alanı eklendi, tıklama event'lerinde sayfa URL'si kaydediliyor
- **H3** NavEvent tipine `oldUrl: string` alanı eklendi, navigasyon event'lerinde eski URL kaydediliyor
- **H4** Recording state recovery mekanizması eklendi: content script yüklendiğinde QUERY_RECORDING_STATE ile service worker'a sorgu yapıyor, tam sayfa navigasyonu ve dinamik iframe'lerde recording otomatik kurtarılıyor
- **M1** `currentPageLogs.push()` çağrısı `isRecording && !isPaused` guard'ı altına alındı — bellek sızıntısı önlendi
- **M2** `message.payload!` non-null assertion kaldırıldı, payload validasyonu eklendi
- **M3** H4 ile birlikte çözüldü — dinamik iframe'ler QUERY_RECORDING_STATE ile recording state'ini kurtarıyor
- **L1** `getUniqueSelector` fonksiyonuna `MAX_SELECTOR_DEPTH = 10` derinlik limiti eklendi

### File List

- `src/content-scripts/recorder.ts` — REWRITE: Tam content script implementasyonu (ISOLATED + MAIN world) + recording state recovery
- `src/content-scripts/recorder.test.ts` — CREATE: 34 test (session, XHR, console, click, nav, flush, rolling window, stack trace, pageUrl, oldUrl, payload validation)
- `src/background/message-handler.ts` — MODIFY: START/STOP_SESSION sonrası content script'e START/STOP_RECORDING gönderme + QUERY_RECORDING_STATE handler
- `src/background/message-handler.test.ts` — MODIFY: 7 yeni test (START/STOP_RECORDING gönderme + QUERY_RECORDING_STATE)
- `src/background/index.ts` — MODIFY: Tab activation/deactivation → PAUSE/RESUME_RECORDING gönderme (previousActiveTabId tracking)
- `src/lib/constants.ts` — MODIFY: RECORDER_FLUSH_INTERVAL_MS, QA_HELPER_MSG_TYPES, STATIC_ASSET_EXTENSIONS sabitleri + MESSAGE_ACTIONS'a 5 yeni action
- `src/lib/types.ts` — MODIFY: RecorderCommandPayload interface, ConsoleEvent.stack, ClickEvent.pageUrl, NavEvent.oldUrl eklendi

## Change Log

- 2026-03-08: Story 1.3 implementasyonu tamamlandı — Content script veri kayıt motoru (XHR/Fetch, console, click, SPA navigation tracking), service worker entegrasyonu (START/STOP/PAUSE/RESUME_RECORDING), 35 yeni test
- 2026-03-08: Code review düzeltmeleri — 4 HIGH, 3 MEDIUM, 1 LOW sorun düzeltildi, 6 yeni test eklendi (toplam 101 test)
