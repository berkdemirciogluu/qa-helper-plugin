# QA Helper — Chrome Extension

> Session kayıt, bug raporlama, ZIP export ve Jira entegrasyonu sağlayan Chrome Extension (Manifest V3).

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=googlechrome)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![Preact](https://img.shields.io/badge/Preact-10.x-673ab8)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38bdf8)
![Version](https://img.shields.io/badge/version-0.1.0-orange)

---

## İçindekiler

- [Özellikler](#özellikler)
- [Mimari](#mimari)
- [Kurulum](#kurulum)
- [Geliştirme](#geliştirme)
- [Build & Dağıtım](#build--dağıtım)
- [Proje Yapısı](#proje-yapısı)
- [Veri Akışı](#veri-akışı)
- [Content Script Mimarisi](#content-script-mimarisi)
- [Session Yönetimi](#session-yönetimi)
- [Bug Raporlama](#bug-raporlama)
- [ZIP Export Formatı](#zip-export-formatı)
- [HAR Formatı](#har-formatı)
- [Timeline Şeması](#timeline-şeması)
- [DOM Snapshot](#dom-snapshot)
- [Jira Entegrasyonu](#jira-entegrasyonu)
- [Options Sayfası](#options-sayfası)
- [Onboarding](#onboarding)
- [Test](#test)
- [Yapılandırma ve Sabitler](#yapılandırma-ve-sabitler)
- [Özel Vite Pluginleri](#özel-vite-pluginleri)
- [Lisans](#lisans)

---

## Özellikler

### Canlı Session Kayıt
- **Tıklama İzleme** — CSS selector, metin, koordinat (x/y), sayfa URL'i
- **XHR/Fetch İstekleri** — Method, URL, status, süre, request/response body (max 50KB)
- **Konsol Logları** — log, warn, error, info seviyeleri + error stack trace
- **Sayfa Navigasyonları** — SPA (pushState/popstate) ve tam sayfa navigasyon desteği
- **Hata Yakalama** — Konsol error'ları, başarısız HTTP istekleri

### Bug Raporlama
- Beklenen sonuç, gerçekleşen sonuç, öncelik (low/medium/high/critical)
- Otomatik ortam bilgisi (browser, OS, viewport, dil, URL)
- Screenshot (base64 PNG)
- DOM snapshot (CSS inline edilmiş)
- Yapılandırma alanları: ortam, test döngüsü, agile takım, proje

### Dışa Aktarma
- **ZIP Export** — Tüm verileri tek bir dosyada indir
- **Jira Entegrasyonu** — Doğrudan bug ticket oluştur + dosya ekle

### Diğer
- Onboarding wizard (ilk kullanım)
- Options sayfası (ayarlar, Jira kurulumu, veri yönetimi)
- Canlı sayaçlar (XHR, Error, Sayfa, Tıklama)
- Badge ile error sayısı gösterimi
- Tab değişiminde otomatik pause/resume

---

## Mimari

```
┌─────────────────────────────────────────────────────────┐
│                    Chrome Extension                      │
├─────────────┬───────────────────┬───────────────────────┤
│   Popup UI  │  Options Page     │  Background (SW)      │
│  (Preact)   │  (Preact)         │                       │
│             │                   │  ├── message-handler   │
│  Dashboard  │  GeneralSettings  │  ├── session-manager   │
│  BugReport  │  Configuration    │  ├── flush-manager     │
│  Onboarding │  JiraSetup        │  └── snapshot-handler  │
│             │  DataManagement   │                       │
│             │  About            │                       │
├─────────────┴───────────────────┴───────────────────────┤
│                    Content Scripts                        │
│                                                          │
│  page-interceptors.js  │  recorder.ts  │  snapshot.ts    │
│  (MAIN world)          │  (ISOLATED)   │  (ISOLATED)     │
│  XHR/Fetch/Console/    │  Event buffer │  DOM + Storage  │
│  History monkey-patch  │  & flush      │  capture        │
└─────────────────────────────────────────────────────────┘
```

---

## Kurulum

### Gereksinimler

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Google Chrome** (veya Chromium-tabanlı tarayıcı)

### Bağımlılıkları Yükle

```bash
git clone https://github.com/berkdemirciogluu/qa-helper-plugin.git
cd qa-helper-plugin
npm install
```

### Chrome'a Yükle

1. `npm run build` ile projeyi derle
2. Chrome'da `chrome://extensions/` adresine git
3. **Geliştirici modu**'nu aç (sağ üst köşe)
4. **Paketlenmemiş öğe yükle** butonuna tıkla
5. Proje içindeki `dist/` klasörünü seç

---

## Geliştirme

```bash
# Geliştirme sunucusu (popup/options için)
npm run dev

# Testleri çalıştır
npm run test

# Testleri izleme modunda çalıştır
npm run test:watch

# Lint kontrolü
npm run lint

# Kod formatlama
npm run format
```

> **Not:** Content script'ler ve background service worker Vite dev server'da çalışmaz.
> Her değişiklikten sonra `npm run build` ve Chrome'da extension'ı yenile (reload).
> Sayfa üzerindeki content script'ler için sayfayı da F5 ile yenilemelisin.

---

## Build & Dağıtım

```bash
# Production build
npm run build

# Build + Extension ZIP oluştur (Chrome Web Store için)
npm run build:zip
# → qa-helper-plugin-v0.1.0.zip

# İkonları yeniden oluştur (scripts/icon.svg'den)
node scripts/generate-icons.mjs
```

### Build Çıktısı (`dist/`)

```
dist/
├── manifest.json
├── background/
│   └── index.js              # Service Worker
├── content-scripts/
│   ├── page-interceptors.js  # MAIN world (IIFE wrapped)
│   ├── recorder.js           # ISOLATED world (IIFE wrapped)
│   └── snapshot.js           # ISOLATED world (IIFE wrapped)
├── popup/
│   └── index.html            # Popup UI
├── options/
│   └── index.html            # Options sayfası
├── assets/
│   ├── popup-*.js
│   ├── options-*.js
│   ├── tailwind-*.css
│   └── ...
└── icons/
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-48.png
    └── icon-128.png
```

---

## Proje Yapısı

```
src/
├── manifest.json                    # Extension manifest (MV3)
├── vite-env.d.ts                    # Vite type declarations
│
├── background/                      # Service Worker
│   ├── index.ts                     # Entry point, tab event listeners
│   ├── message-handler.ts           # Chrome message routing
│   ├── session-manager.ts           # Session CRUD, counters, badge
│   ├── flush-manager.ts             # Event buffering, debounced flush
│   ├── snapshot-handler.ts          # Screenshot + DOM snapshot orchestration
│   └── *.test.ts                    # Unit testlar
│
├── content-scripts/                 # Content script'ler
│   ├── page-interceptors.js         # MAIN world — API monkey-patching
│   ├── recorder.ts                  # ISOLATED world — event buffer & relay
│   ├── snapshot.ts                  # ISOLATED world — DOM/storage capture
│   └── *.test.ts
│
├── lib/                             # Paylaşılan kütüphaneler
│   ├── types.ts                     # Tüm TypeScript arayüzleri
│   ├── constants.ts                 # Mesaj aksiyonları, storage key'leri
│   ├── messaging.ts                 # Chrome message API wrapper
│   ├── storage.ts                   # chrome.storage helper'ları
│   ├── timeline-builder.ts          # Timeline JSON oluşturma
│   ├── zip-exporter.ts              # JSZip ile ZIP export
│   ├── snapshot.ts                  # Screenshot capture & metadata
│   ├── console-compiler.ts          # Error stack parsing
│   └── jira/                        # Jira entgrasyonu
│       ├── jira-auth.ts             # OAuth 2.0 / PAT kimlik doğrulama
│       ├── jira-client.ts           # Jira REST API istemcisi
│       └── jira-formatter.ts        # Bug açıklama formatlama
│
├── popup/                           # Popup UI (Preact)
│   ├── index.html
│   ├── index.tsx                    # Entry point
│   ├── App.tsx                      # View routing, session warning modal
│   └── views/
│       ├── DashboardView.tsx        # Session kontrol, canlı sayaçlar
│       ├── BugReportView.tsx        # Bug formu, export butonları
│       └── onboarding/
│           ├── OnboardingView.tsx   # Wizard container
│           ├── EnvironmentStep.tsx  # Ortam ayarları
│           ├── ConfigStep.tsx       # Yapılandırma alanları
│           ├── JiraStep.tsx         # Jira kurulumu
│           └── ReadyStep.tsx        # Tamamlanma ekranı
│
├── options/                         # Options sayfası (Preact)
│   ├── index.html
│   ├── index.tsx
│   ├── App.tsx
│   └── pages/
│       ├── GeneralSettingsPage.tsx
│       ├── ConfigurationPage.tsx
│       ├── JiraSetupPage.tsx
│       ├── DataManagementPage.tsx
│       └── AboutPage.tsx
│
├── components/                      # Yeniden kullanılabilir bileşenler
│   ├── ui/                          # Button, Input, Select, Modal, Toggle, ...
│   ├── domain/                      # SessionControl, LiveCounters, ConfigFields, ...
│   └── layout/                      # SidebarNav, FormRow, SectionGroup
│
└── styles/                          # Global stiller
```

---

## Veri Akışı

```
┌──────────────────────┐
│  Kullanıcı Aksiyonu  │  (tıklama, XHR, navigasyon, console.log)
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  page-interceptors   │  MAIN world — monkey-patch ile yakalar
│  (XHR, Fetch,        │  window.postMessage() ile ISOLATED world'e gönderir
│   console, history)  │
└──────────┬───────────┘
           ▼ postMessage
┌──────────────────────┐
│  recorder.ts         │  ISOLATED world — event buffer'lar
│  Buffer (max 200     │  3 saniyede bir chrome.runtime.sendMessage()
│   pre-recording)     │  ile background'a flush eder
└──────────┬───────────┘
           ▼ FLUSH_DATA message
┌──────────────────────┐
│  message-handler     │  Background Service Worker
│  → flush-manager     │  2.5s debounce ile storage'a yazar
│  → session-manager   │  Sayaçları günceller (XHR, click, error, nav)
│  → chrome.storage    │  chrome.storage.local'a kaydeder
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  Bug Raporu Export    │  Popup UI'dan tetiklenir
│  → ZIP (7 dosya)     │  Tüm session verilerini paketler
│  → Jira ticket       │  Ticket oluşturur + dosya ekler
└──────────────────────┘
```

### Kritik Event'ler
- `console.error` → Anında flush (beklemeden)
- `XHR status ≥ 400` → Anında flush (beklemeden)
- Normal event'ler → 3s buffer → 2.5s debounce → storage

---

## Content Script Mimarisi

### page-interceptors.js (MAIN world)

Web sayfasının API'lerini monkey-patch ederek veri yakalar:

| API | Yakalanan Veri |
|-----|---------------|
| `XMLHttpRequest.open/send` | Method, URL, status, duration, request/response body |
| `window.fetch` | Method, URL, status, duration, request/response body |
| `console.log/warn/error/info` | Level, message, stack trace (error için) |
| `history.pushState/replaceState` | Eski/yeni URL, sayfa başlığı |

**Güvenlik özellikleri:**
- Statik asset'ler filtrelenir (JS, CSS, PNG, JPG, SVG, WOFF, vb.)
- Response body max 50KB'a truncate edilir
- `responseType: blob/arraybuffer/document` olan XHR'lar için body okunmaz
- Data URI ve Blob URL'ler atlanır

### recorder.ts (ISOLATED world)

- `window.addEventListener('message')` ile MAIN world'den event alır
- Event türüne göre buffer'a ekler (`xhr`, `console`, `click`, `nav`)
- 3 saniyede bir `flushAll()` ile background'a gönderir
- Pre-recording buffer (max 200 event) — session başlamadan önce gelen event'ler korunur
- Extension context invalidated olursa sessizce teardown yapar
- `popstate` ve `hashchange` dinler (SPA navigasyon)
- Tam sayfa navigasyonda `QUERY_RECORDING_STATE` ile recovery yapar

### snapshot.ts (ISOLATED world)

- `TAKE_SNAPSHOT` mesajına yanıt olarak çalışır
- DOM'u klonlayıp CSS'leri inline eder
- External stylesheet'leri `<style>` bloğuna dönüştürür
- `<base href>` ekler (görsellerin yüklenmesi için)
- localStorage ve sessionStorage dump'ı alır

---

## Session Yönetimi

### Yaşam Döngüsü

```
┌─────────┐    START_SESSION    ┌───────────┐    STOP_SESSION    ┌─────────┐
│  idle   │ ─────────────────▶ │ recording │ ─────────────────▶ │ stopped │
└─────────┘                    └───────────┘                    └─────────┘
                                    │   ▲
                              PAUSE │   │ RESUME
                                    ▼   │
                               ┌─────────┐
                               │ paused  │
                               └─────────┘
```

### Session Meta
```typescript
{
  tabId: number
  url: string
  status: 'recording' | 'stopped'
  startedAt: number
  counters: {
    clicks: number
    xhrs: number
    consoleErrors: number
    pages: number
  }
}
```

### Sayaç Kilitleme

Her tab için promise-tabanlı kilit (_withCounterLock_): Eşzamanlı sayaç güncellemelerinde race condition'ı önler.

### Badge

- Session aktifken: Error sayısını kırmızı badge ile gösterir
- Session yokken: Badge temizlenir

---

## Bug Raporlama

### Form Alanları

| Alan | Açıklama | Zorunlu |
|------|----------|---------|
| Beklenen Sonuç | Ne olması gerekiyordu | Evet |
| Gerçekleşen Sonuç | Ne oldu | Evet |
| Öncelik | low / medium / high / critical | Evet |
| Adımlar | Yeniden üretim adımları | Hayır |
| Ortam | Test ortamı | Hayır |
| Test Döngüsü | Sprint/döngü bilgisi | Hayır |
| Agile Takım | Takım adı | Hayır |
| Proje | Proje adı | Hayır |

### Otomatik Toplanan Veriler

- **Screenshot** — Aktif tab'ın ekran görüntüsü (PNG, base64)
- **DOM Snapshot** — Sayfanın tam HTML'i (CSS inline edilmiş)
- **Console Logları** — Tüm konsol çıktıları
- **Network İstekleri** — HAR 1.2 formatında tüm XHR/Fetch istekleri
- **Storage** — localStorage ve sessionStorage dump'ı
- **Timeline** — Tüm event'lerin kronolojik sıralaması
- **Ortam Bilgisi** — Browser, OS, viewport, zoom, dil, URL

---

## ZIP Export Formatı

`bug-report-YYYY-MM-DD.zip` dosyası şunları içerir:

| Dosya | Format | İçerik |
|-------|--------|--------|
| `description.txt` | Text | Bug açıklaması |
| `screenshot.png` | PNG | Sayfa ekran görüntüsü |
| `dom-snapshot.html` | HTML | CSS inline edilmiş tam DOM |
| `console-logs.json` | JSON | Tüm konsol çıktıları |
| `network.har` | HAR 1.2 | HTTP istekleri (Chrome DevTools uyumlu) |
| `local-storage.json` | JSON | localStorage dump |
| `session-storage.json` | JSON | sessionStorage dump |
| `timeline.json` | JSON | Timeline v1.0 şeması |

---

## HAR Formatı

HAR 1.2 spesifikasyonuna uygun, Chrome DevTools Network tab'ına import edilebilir.

```json
{
  "log": {
    "version": "1.2",
    "creator": { "name": "QA Helper", "version": "0.1.0" },
    "entries": [
      {
        "_resourceType": "xhr",
        "startedDateTime": "2026-03-09T12:00:00.000Z",
        "time": 120,
        "request": {
          "method": "GET",
          "url": "https://api.example.com/data",
          "httpVersion": "HTTP/1.1",
          "cookies": [],
          "headers": [],
          "queryString": [],
          "headersSize": -1,
          "bodySize": 0
        },
        "response": {
          "status": 200,
          "statusText": "",
          "httpVersion": "HTTP/1.1",
          "cookies": [],
          "headers": [],
          "content": { "size": 1024, "mimeType": "application/json", "text": "..." },
          "redirectURL": "",
          "headersSize": -1,
          "bodySize": 1024,
          "_transferSize": 1024
        },
        "cache": {},
        "timings": {
          "blocked": -1, "dns": -1, "ssl": -1, "connect": -1,
          "send": 0, "wait": 120, "receive": 0
        }
      }
    ]
  }
}
```

---

## Timeline Şeması

Timeline JSON v1.0 — tüm event'lerin kronolojik ve yapılandırılmış görünümü:

```json
{
  "schemaVersion": "1.0",
  "sessionId": "uuid",
  "bugReport": {
    "expectedResult": "...",
    "actualResult": "...",
    "priority": "high"
  },
  "environment": {
    "browser": "Chrome 145",
    "os": "Windows",
    "viewport": "1920x1080",
    "pixelRatio": 1,
    "language": "tr-TR",
    "url": "https://..."
  },
  "timeline": [
    { "ts": 1709000000000, "ch": "user", "type": "nav", "url": "https://..." },
    { "ts": 1709000001000, "ch": "user", "type": "click", "text": "Giriş Yap", "el": "button.login" },
    { "ts": 1709000001500, "ch": "sys", "type": "xhr", "method": "POST", "url": "/api/login", "status": 200, "ms": 150 },
    { "ts": 1709000002000, "ch": "sys", "type": "error", "msg": "TypeError: ...", "source": "app.js:42" }
  ],
  "errorSummary": {
    "consoleErrors": 1,
    "failedRequests": 0,
    "crashDetected": false
  }
}
```

**Kanallar:**
- `user` — Kullanıcı aksiyonları (click, nav)
- `sys` — Sistem olayları (xhr, error)

---

## DOM Snapshot

DOM snapshot offline görüntüleme için optimize edilmiştir:

1. **CSS Inline** — Tüm external stylesheet'lerin (`<link rel="stylesheet">`) CSS kuralları `document.styleSheets` API'sinden okunup tek bir `<style>` bloğuna yazılır
2. **External Link Temizleme** — Erişilemeyen `<link>` etiketleri kaldırılır
3. **Base HREF** — `<base href="orijinal-url">` eklenerek görseller ve diğer relative URL'ler çalışır durumda kalır
4. **Cross-origin** — Erişilemeyen stylesheet'ler yorum olarak işaretlenir

---

## Jira Entegrasyonu

### Desteklenen Platformlar

| Platform | Kimlik Doğrulama | Özellikler |
|----------|-----------------|------------|
| **Jira Cloud** | OAuth 2.0 (3-legged) | Otomatik token yenileme, site seçimi |
| **Jira Server** | Personal Access Token (PAT) | Doğrudan bağlantı |

### OAuth 2.0 Akışı (Cloud)

```
Kullanıcı → "Jira'ya Bağlan" butonuna tıklar
    ↓
chrome.identity.launchWebAuthFlow()
    ↓
Atlassian yetkilendirme sayfası
    ↓
Authorization code → Token exchange
    ↓
Accessible resources (cloud instance'lar) sorgulanır
    ↓
Token + cloudId + siteName saklanır
```

### Jira Ticket Oluşturma

1. Kimlik doğrulama kontrolü
2. Bug açıklaması formatlanır (ortam bilgisi, adımlar, beklenen/gerçekleşen sonuç)
3. Issue oluşturulur (tip: Bug, öncelik mapping: critical→Highest, high→High, vb.)
4. Dosyalar eklenir: screenshot.png, network.har, dom-snapshot.html, console-logs.json, timeline.json, storage.json
5. (Opsiyonel) Parent ticket'a bağlanır ("relates to" link tipi)
6. Issue key ve URL döndürülür

### Kimlik Bilgileri

```typescript
{
  platform: 'cloud' | 'server'
  url: string              // Jira base URL
  token: string            // Access token veya PAT
  refreshToken?: string    // Cloud only
  cloudId?: string         // Cloud only
  siteName?: string        // Cloud only
  defaultProjectKey?: string
  connected?: boolean
}
```

---

## Options Sayfası

| Sayfa | İçerik |
|-------|--------|
| **Genel Ayarlar** | Extension tercihleri |
| **Yapılandırma** | Varsayılan ortam, test döngüsü, agile takım, proje |
| **Jira Kurulumu** | Platform seçimi, OAuth/PAT yapılandırma, bağlantı testi |
| **Veri Yönetimi** | Storage kullanımı görüntüleme, session temizleme |
| **Hakkında** | Versiyon, yardım, dökümantasyon |

---

## Onboarding

İlk kullanımda otomatik açılan 4 adımlı wizard:

1. **Ortam Ayarları** — Test ortamı bilgisi
2. **Yapılandırma** — Varsayılan proje, takım, test döngüsü
3. **Jira Kurulumu** — (İsteğe bağlı) Jira bağlantısı
4. **Hazır** — Tamamlanma ekranı

Her adım atlanabilir. Tamamlandığında `ONBOARDING_COMPLETED` flag'i saklanır.

---

## Test

```bash
# Tüm testleri çalıştır
npm run test

# İzleme modunda
npm run test:watch
```

### Test Altyapısı

| Araç | Amaç |
|------|------|
| **Vitest** | Test runner |
| **@testing-library/preact** | Component testleri |
| **jsdom** | DOM simülasyonu |

### Test Dosyaları

Test dosyaları kaynak dosyaların yanında `.test.ts` / `.test.tsx` uzantısıyla yer alır:

```
src/background/session-manager.test.ts
src/background/message-handler.test.ts
src/background/flush-manager.test.ts
src/background/snapshot-handler.test.ts
src/content-scripts/recorder.test.ts
src/lib/timeline-builder.test.ts
src/lib/jira/jira-auth.test.ts
src/popup/views/DashboardView.test.tsx
```

---

## Yapılandırma ve Sabitler

### Mesaj Aksiyonları

```
START_SESSION        STOP_SESSION         GET_SESSION_STATUS
FLUSH_DATA           TAKE_SNAPSHOT        REPORT_BUG
EXPORT_ZIP           EXPORT_JIRA          SESSION_EVENT
SNAPSHOT_DATA        START_RECORDING      STOP_RECORDING
PAUSE_RECORDING      RESUME_RECORDING     QUERY_RECORDING_STATE
```

### Storage Key'leri

```
SESSION_META         SESSION_XHR          SESSION_CLICKS
SESSION_CONSOLE      SESSION_NAV          SESSION_CONFIG
SESSION_SNAPSHOT     JIRA_CREDENTIALS     ONBOARDING_COMPLETED
```

### Sabitler

| Sabit | Değer | Açıklama |
|-------|-------|----------|
| `MAX_XHR_BODY_SIZE` | 50 KB | XHR body truncation limiti |
| `RECORDER_FLUSH_INTERVAL_MS` | 3000 ms | Content script flush periyodu |
| `FLUSH_INTERVAL_MS` | 2500 ms | Background debounce süresi |
| `MAX_SNAPSHOT_TIMEOUT_MS` | 3000 ms | Snapshot zaman aşımı |
| `MAX_PRE_RECORDING_BUFFER` | 200 | Kayıt öncesi event buffer limiti |

### İzinler (Permissions)

| İzin | Amaç |
|------|------|
| `activeTab` | Aktif tab erişimi |
| `storage` | chrome.storage API |
| `unlimitedStorage` | Büyük session verisi |
| `tabs` | Tab URL ve durum izleme |
| `scripting` | Dinamik script enjeksiyonu |
| `identity` | OAuth 2.0 akışı (Jira Cloud) |

---

## Özel Vite Pluginleri

### manifestCopyPlugin

`src/manifest.json` → `dist/manifest.json` kopyalar.

### rebaseHtmlPlugin

Build çıktısındaki HTML dosyalarını doğru konuma taşır ve asset yollarını düzeltir:
- `dist/src/popup/index.html` → `dist/popup/index.html`
- `dist/src/options/index.html` → `dist/options/index.html`

### iifeWrapPlugin

Content script'leri IIFE ile sarar ve ES module import'larını inline eder:

**Sorun:** Vite/Rollup content script'lerde `import {...} from "../assets/chunk.js"` üretir. Chrome content script'ler ES module değildir — bu `SyntaxError` oluşturur.

**Çözüm:** Plugin, import ifadelerini tespit eder, referans edilen chunk dosyasını okur, export mapping'lerini parse eder ve kodu scoped IIFE içinde inline eder:

```javascript
// Önce (Vite çıktısı):
import { a, b } from "../assets/constants-xxx.js";

// Sonra (plugin çıktısı):
(function(){
  var __chunk__ = (function(){ /* chunk kodu */ return { a: a, b: b }; })();
  var a = __chunk__.a;
  var b = __chunk__.b;
  // ... content script kodu
})();
```

---

## Lisans

Bu proje özel bir projedir. Tüm hakları saklıdır.
