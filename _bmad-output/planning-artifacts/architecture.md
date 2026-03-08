---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/prd-validation-report.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
  - "_bmad-output/brainstorming/brainstorming-session-2026-03-08-000000.md"
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-03-08'
project_name: 'qa-helper-plugin'
user_name: 'Berk'
date: '2026-03-08'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Fonksiyonel Gereksinimler (35 FR — 6 Kategori):**

| Kategori | FR Aralığı | Sayı | Mimari Etki |
|---|---|---|---|
| Session Yönetimi | FR1-FR6 | 6 | Service worker + chrome.storage.local persist, tab-bazlı izolasyon, cross-app tracking |
| Veri Toplama & Kayıt | FR7-FR12 | 6 | Content script monkey-patching (XHR/Fetch/console), MutationObserver, SPA event listeners, iframe injection |
| Bug Anı Snapshot | FR13-FR18 | 6 | chrome.tabs.captureVisibleTab, DOM serialization, storage API dump, stack trace parsing |
| Bug Raporlama | FR19-FR22 | 4 | Preact form components, otomatik veri birleştirme (İki Kanal → timeline), konfigürasyon state management |
| Export — ZIP | FR23-FR25 | 3 | Client-side ZIP oluşturma (JSZip veya benzeri), Blob/download API, clipboard API |
| Export — Jira | FR26-FR31 | 6 | Jira REST API v2/v3 client, OAuth 2.0 token yönetimi, PAT desteği, ADF JSON + Wiki markup formatter, multipart attachment upload |

**Anahtar Mimari Gözlemler:**
- Session kayıt motoru ve veri toplama birlikte 12 FR — en geniş ve en riskli bileşen grubu
- Jira entegrasyonu 6 FR ile ikinci en büyük kategori — iki farklı Jira platformu (Cloud/Server) iki farklı auth + format stratejisi gerektiriyor
- FR4 (persist) ve FR5 (cross-app) kritik altyapı gereksinimleri — tüm diğer session FR'lerinin temelini oluşturuyor

**Non-Fonksiyonel Gereksinimler (22 NFR — 5 Kategori):**

| Kategori | NFR Aralığı | Sayı | Mimari Etkisi |
|---|---|---|---|
| Performance | NFR1-NFR7 | 7 | Content script injection < 5ms, popup < 100ms, toplam bellek < 50MB, sayfa yükü < 50ms ek gecikme |
| Security | NFR8-NFR11 | 4 | Sıfır harici bağlantı (lisans hariç), content script scope izolasyonu, chrome.storage.local-only veri |
| Privacy | NFR12-NFR15 | 4 | Explicit export-only veri paylaşımı, tek tıkla veri temizleme, URL raporlama yasağı |
| Integration | NFR16-NFR19 | 4 | Jira REST API v2/v3 uyumluluk, OAuth 2.0 refresh token, PAT error handling, ZIP fallback |
| Reliability | NFR20-NFR22 | 3 | Service worker restart dayanıklılığı, tab crash veri koruması, offline işlevsellik |

**Mimariyi Şekillendiren Kritik NFR'ler:**
- NFR1 + NFR5 + NFR7: Content script performans bütçesi çok dar — tüm veri toplama < %2 CPU overhead, < 5ms DOM gecikme
- NFR8 + NFR10 + NFR12: Privacy-first yaklaşım mimari sınır koşulu — harici sunucu yok, tüm veri lokalde
- NFR20 + NFR21: Veri kaybı sıfır toleransı — service worker lifecycle ve crash recovery mimarinin temel taşı

**UX Tasarım Spesifikasyonundan Mimari Çıkarımlar:**

- **Hibrit framework stratejisi:** Preact (popup/options UI) + vanilla JS (content scripts) — iki farklı build target
- **Design system:** Tailwind CSS + custom Preact component set — 26 component tanımlanmış (10 foundation, 7 domain, 5 options-page, 4 feedback)
- **Popup kısıtları:** 400×600px sabit boyut, < 100ms açılış, slide/fade animasyonlar (200ms max)
- **Options Page:** Responsive (3 breakpoint: <768px, 768-1199px, ≥1200px), sidebar navigasyon
- **Erişilebilirlik:** WCAG 2.1 AA hedefi — semantic HTML, ARIA, keyboard nav, focus management, reduced-motion desteği
- **İkon sistemi:** Lucide Icons (tree-shakeable SVG), inline SVG olarak bundle
- **State management:** Session verisi chrome.storage.local, form verisi session storage, UI state Preact signals/state

### Ölçek & Karmaşıklık

- **Birincil domain:** Browser Extension (Chrome, Manifest V3)
- **Karmaşıklık seviyesi:** Medium-High
- **Tahmini mimari bileşenler:** ~8-10 (Service Worker, Content Script Manager, Session Engine, Data Collectors, Snapshot Engine, Report Builder, ZIP Exporter, Jira Client, Popup UI, Options UI)

### Teknik Kısıtlamalar & Bağımlılıklar

| Kısıtlama | Kaynak | Mimari Etkisi |
|---|---|---|
| Service worker 5dk timeout | Manifest V3 | Tüm state chrome.storage.local'a persist edilmeli, event-driven mimari zorunlu |
| Blocking webRequest yok | Manifest V3 | XHR/Fetch kaydı content script monkey-patching ile çözülmeli |
| Content script CSP | Web platformu | Bazı sitelerde injection sınırlı olabilir, error handling gerekli |
| chrome.storage.local 10MB limit | Chrome API | Büyük session verilerinde truncation/rotation stratejisi gerekli |
| Cross-origin iframe | Web güvenliği | all_frames: true ile injection, ama cross-origin DOM erişimi sınırlı |
| Popup lifecycle | Chrome Extension | Popup kapandığında state kaybolur — service worker'a iletişim zorunlu |
| Tek geliştirici | Kaynak kısıtı | Mimari basitlik ve bakım kolaylığı öncelikli |

### Cross-Cutting Concern'ler

| Concern | Etkilediği Bileşenler | Mimari Strateji |
|---|---|---|
| **Privacy/Data Isolation** | Tüm bileşenler | Sıfır harici bağlantı politikası (lisans hariç), veri yalnızca explicit export ile paylaşılır |
| **Performance Budget** | Content scripts, service worker | Async veri toplama, aktif tab öncelikli kayıt, debounce, rolling window |
| **Data Persistence** | Session engine, service worker | chrome.storage.local merkezi persist katmanı, service worker restart dayanıklılığı |
| **Error Resilience** | Tüm bileşenler | Graceful degradation her seviyede — session'sız snapshot, Jira'sız ZIP, crash kurtarma |
| **Session Isolation** | Session engine, content scripts | Tab ID bazlı veri partitioning, aktif tab algılama, bağımsız lifecycle |
| **Message Passing** | Popup ↔ Service Worker ↔ Content Script | Chrome messaging API (chrome.runtime.sendMessage, chrome.tabs.sendMessage) — tüm bileşenler arası iletişim |

## Starter Template Evaluation

### Primary Technology Domain

Chrome Extension (Manifest V3) — Preact UI + Vanilla JS content scripts + Tailwind CSS, Vite ile build

### Starter Options Considered

| Seçenek | Teknoloji | Avantaj | Risk | Karar |
|---|---|---|---|---|
| CRXJS Vite Plugin + Preact | @crxjs/vite-plugin 2.3.0 + Preact | HMR, otomatik manifest, zero-config | Vite uyumluluk kırılma geçmişi, peer dependency sorunları | Reddedildi |
| Custom Vite Setup (Manuel) | Vite 7.x + Preact + Tailwind v4 | Tam kontrol, bağımsız güncelleme, vanilla JS content script desteği | Daha fazla başlangıç kurulumu | **Seçildi** |
| fell-lucas/chrome-extension-template-preact-vite | Preact + Vite template | Preact-özel, küçük bundle | Bakım durumu belirsiz, eski bağımlılıklar | Reddedildi |

### Selected Starter: Custom Vite Setup (Preact-TS Template + Manuel Chrome Extension Konfigürasyonu)

**Rationale for Selection:**
- CRXJS plugin'in Vite major version geçişlerinde sürekli kırılma geçmişi, tek geliştirici projesi için kabul edilemez risk
- Content scripts vanilla JS olduğundan CRXJS'in HMR avantajı büyük ölçüde geçersiz — HMR sadece popup/options için anlamlı ve Vite'ın kendi dev server'ı bunu manuel konfigürasyonla karşılayabilir
- Tailwind CSS v4'ün yeni Lightning CSS tabanlı mimarisi Vite ile doğrudan entegre çalışır
- Bağımsız versiyon yönetimi — Vite, Preact, Tailwind güncellemeleri birbirini engellemez

**Initialization Command:**

```bash
npm create vite@latest qa-helper-plugin -- --template preact-ts
cd qa-helper-plugin
npm install tailwindcss @tailwindcss/vite lucide-preact
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- TypeScript (strict mode) — Preact-TS template ile hazır
- Preact 10.28.4 — 3KB React alternatifi, signals desteği
- Node.js 20.19+ (Vite 7 gereksinimi)

**Styling Solution:**
- Tailwind CSS v4 — `@import "tailwindcss"` ile zero-config, Lightning CSS backend
- @tailwindcss/vite plugin ile Vite entegrasyonu
- JIT derleme — sadece kullanılan class'lar bundle'a girer

**Build Tooling:**
- Vite 7.x — Rollup tabanlı production build, esbuild dev transform
- Çoklu entry point: `rollupOptions.input` ile popup.html, options.html, background.ts, content-scripts/*.ts
- Ayrı output: popup/options → Preact bundle, content scripts → vanilla JS bundle, background → service worker bundle

**Testing Framework:**
- Starter ile gelmez — mimari karar adımında belirlenecek (Vitest önerisi)

**Code Organization:**
```
src/
├── popup/              # Preact popup UI
│   ├── index.html
│   ├── main.tsx
│   └── App.tsx
├── options/            # Preact options page UI
│   ├── index.html
│   ├── main.tsx
│   └── App.tsx
├── background/         # Service worker
│   └── index.ts
├── content-scripts/    # Vanilla JS content scripts
│   ├── recorder.ts     # XHR/Fetch/console/click recording
│   └── snapshot.ts     # DOM/storage snapshot
├── components/         # Shared Preact components (popup + options)
│   ├── ui/             # Foundation components
│   └── domain/         # Domain-specific components
├── lib/                # Shared utilities & types
│   ├── storage.ts      # chrome.storage.local wrapper
│   ├── messaging.ts    # Chrome messaging helpers
│   └── types.ts        # Shared TypeScript types
├── styles/
│   └── tailwind.css    # @import "tailwindcss"
├── manifest.json       # Chrome Extension manifest
└── vite.config.ts      # Multi-entry Vite config
```

**Development Experience:**
- Vite HMR — popup ve options page'de anlık güncelleme
- TypeScript strict mode — tip güvenliği
- Tailwind IntelliSense — VS Code entegrasyonu
- Content scripts için watch mode + manual reload

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Storage architecture (chrome.storage.local hibrit key yapısı + unlimitedStorage)
- AI-ready veri şeması (İki Kanal timeline formatı)
- Communication pattern (Service Worker merkezi hub)
- Content script izolasyon stratejisi

**Important Decisions (Shape Architecture):**
- Jira authentication dual-path (OAuth 2.0 + PAT)
- State management (Preact Signals)
- Testing framework (Vitest)
- Persist/flush stratejisi (debounce batch write)

**Deferred Decisions (Post-MVP):**
- LemonSqueezy lisans entegrasyonu (Phase 2 — mimari hazırlık yapıldı: `lib/license.ts` placeholder)
- Chrome Web Store CI/CD pipeline (manuel upload yeterli)
- Karanlık tema (Phase 2)

### Data Architecture

**Storage Engine: chrome.storage.local + `unlimitedStorage` permission**
- Rationale: 10MB default limit session verileri için yetersiz, `unlimitedStorage` kullanıcıya görünür permission prompt üretmez
- Affects: Tüm veri persist eden bileşenler

**Key Yapısı: Hibrit Partitioning**
- `session_meta_{tabId}` — Session metadata (başlangıç zamanı, URL, durum, sayaçlar)
- `session_xhr_{tabId}` — XHR/Fetch kayıtları (HAR formatında)
- `session_clicks_{tabId}` — Tıklama akışı
- `session_console_{tabId}` — Console logları (rolling window: mevcut + önceki sayfa)
- `session_config` — Konfigürasyon alanları (environment, proje, agile team — tüm tab'larda ortak)
- `jira_credentials` — Jira OAuth token veya PAT
- Rationale: Büyük veri parçaları (XHR, console) bağımsız okunup yazılabilir, metadata'ya hızlı erişim korunur

**Truncation & Rotation:**
- XHR body: max 50KB/istek, file upload body'leri atlanır
- Console: rolling window — mevcut sayfa + bir önceki sayfa
- Toplam session: soft limit yok (unlimitedStorage), ama export öncesi büyük veriler optimize edilir
- Uyarı: Depolama kullanımı popup'ta gösterilmez (gereksiz karmaşıklık) — gerekirse Phase 2

**AI-Ready Veri Şeması (İki Kanal Mimarisi):**

Timeline formatı — AI Bug Analyzer için optimize, hikaye anlatır, detay dosyalarına referans verir:

```json
{
  "schemaVersion": "1.0",
  "sessionId": "uuid-v4",
  "bugReport": {
    "expectedResult": "...",
    "actualResult": "...",
    "priority": "high"
  },
  "environment": {
    "browser": "Chrome 133",
    "os": "Windows 11",
    "viewport": "1920x1080",
    "pixelRatio": 1,
    "language": "tr-TR",
    "url": "https://app.com/checkout"
  },
  "context": {
    "environment": "staging",
    "project": "e-commerce",
    "agileTeam": "Team Alpha"
  },
  "timeline": [
    { "ts": 1709900000, "ch": "user", "type": "nav", "url": "/cart" },
    { "ts": 1709900500, "ch": "user", "type": "click", "text": "Ödeme Yap", "el": "button.checkout-btn" },
    { "ts": 1709900550, "ch": "sys", "type": "xhr", "method": "POST", "url": "/api/checkout", "status": 500, "ms": 230 },
    { "ts": 1709900560, "ch": "sys", "type": "error", "msg": "TypeError: Cannot read property...", "source": "checkout.js:42" }
  ],
  "errorSummary": {
    "consoleErrors": 3,
    "failedRequests": 1,
    "crashDetected": false
  },
  "attachments": {
    "screenshot": "screenshot.png",
    "har": "network.har",
    "dom": "dom-snapshot.html",
    "consoleLogs": "console-logs.json",
    "localStorage": "local-storage.json",
    "sessionStorage": "session-storage.json"
  }
}
```

- Timeline kompakt: XHR'da sadece method/url/status/süre (detay HAR'da), console error'da sadece mesaj+kaynak (tam stack console-logs.json'da)
- `errorSummary`: AI agent'ın ilk bakışta triyaj yapması için
- `attachments`: Detay dosyalarına pointer — AI hangi dosyayı incelemesi gerektiğini bilir
- `schemaVersion`: Geriye dönük uyumluluk — yeni versiyon geldiğinde parser adapte edilir
- TypeScript discriminated union ile tip güvenliği sağlanır

### Authentication & Security

**Jira Cloud — OAuth 2.0:**
- `chrome.identity.launchWebAuthFlow` ile token alma
- Token chrome.storage.local'da saklanır
- Refresh token ile otomatik yenileme
- Affects: FR26, FR27, NFR16, NFR19

**Jira Server/DC — PAT (Personal Access Token):**
- Kullanıcı options page'den girer, chrome.storage.local'da saklanır
- Her istekte Authorization header'a eklenir
- PAT geçersiz → kullanıcıya uyarı + ZIP fallback
- Affects: FR26, FR27, NFR17, NFR19

**Content Script İzolasyonu:**
- Monkey-patching (XHR/Fetch/console) IIFE içinde çalışır
- Global namespace'e sızma yok — Symbol veya WeakMap ile wrapper gizleme
- Host sayfanın JS scope'u kirletilmez (NFR11)
- Affects: FR7-FR12, NFR7, NFR11

**Lisans Doğrulama (Phase 2 — Mimari Hazırlık):**
- `lib/license.ts` modülü soyutlanır — Phase 2'de LemonSqueezy API implement edilir
- Service worker'dan 7 günde bir periyodik kontrol
- Affects: Post-MVP ticari altyapı

### Communication Patterns

**Service Worker = Merkezi Hub:**

```
Content Script ←→ Service Worker ←→ Popup/Options
     ↑                    ↑
  (sayfadaki veri)    (merkezi koordinatör)
```

- Content script → Service Worker: `chrome.runtime.sendMessage` ile ham veri gönderimi
- Service Worker → Content Script: `chrome.tabs.sendMessage` ile komutlar (session başlat/durdur)
- Popup → Service Worker: `chrome.runtime.sendMessage` veya direkt `chrome.storage.local.get`
- Rationale: Service worker tüm tab'lar arası koordinasyonu sağlar, popup geçici (kapanır)

**Persist/Flush Stratejisi:**
- Service worker debounce ile batch yazma (her 2-3 saniyede bir chrome.storage.local'a flush)
- Kritik veriler (console error, failed XHR) anında yazılır — debounce atlanır
- Rationale: Çok sık storage yazma performansı düşürür, ama kritik veriler kaybedilemez

**Error Handling Standardı:**
- Her message handler `try/catch` ile sarılır
- Service worker ulaşılamazsa content script veriyi kendi belleğinde tutar, bağlantı gelince gönderir
- Popup service worker'a bağlanamazsa son bilinen state'i storage'dan okur
- Affects: Tüm bileşenler, NFR20-22

### Frontend Architecture

**State Management: Preact Signals (`@preact/signals`)**
- Popup ve options page'de hafif, reaktif state management
- Global state yok — her view kendi signal'ları
- chrome.storage.local = single source of truth — popup açıldığında storage'dan okunur, popup kapanınca state kaybolur (sorun değil)
- Affects: FR19, FR22, FR32-35

**Popup Routing: Custom Signal-Based**
- `currentView` signal'ı: `"dashboard"` | `"bugReport"`
- preact-router gereksiz — sadece 2 view
- UX spec'teki slide animasyonları CSS transition ile
- Affects: Popup UI

**Testing: Vitest**
- Vite-native test runner — ek konfigürasyon minimal
- Unit test: `lib/` modülleri (storage wrapper, messaging, data formatters, timeline builder)
- Component test: `@testing-library/preact` ile popup/options UI
- E2E: MVP'de yok — Chrome Extension E2E karmaşık, manuel test yeterli
- Affects: Tüm bileşenler

### Infrastructure & Deployment

**Build Konfigürasyonu:**
- `npm run dev` — Vite dev server (popup/options HMR) + content scripts watch
- `npm run build` — Production build, `dist/` klasörüne Chrome'a yüklenebilir extension çıktısı
- `npm run build:zip` — `dist/` klasörünü ZIP'leyip Chrome Web Store upload-ready paket

**Chrome Web Store Deployment:**
- Manuel upload (tek geliştirici, CI/CD gereksiz karmaşıklık)
- Versiyon: `manifest.json` version alanı, semver

**Linting/Formatting:**
- ESLint + Prettier
- Preact ESLint config: `eslint-config-preact`

**Monitoring:**
- Extension içi error logging — privacy-first, harici servise veri gitmez
- Debug amaçlı hatalar chrome.storage.local'a yazılır, kullanıcı temizleyebilir

### Decision Impact Analysis

**Implementation Sequence:**
1. Proje kurulumu (Vite + Preact + Tailwind + manifest.json + multi-entry config)
2. chrome.storage.local wrapper (`lib/storage.ts`) + messaging helper (`lib/messaging.ts`)
3. Service worker temel yapısı (session lifecycle, message handling)
4. Content script recorder (XHR/Fetch monkey-patch, console intercept, click tracking)
5. Popup UI (dashboard view + bug report view)
6. Snapshot engine (screenshot, DOM, storage dump)
7. Export — ZIP (timeline.json builder + JSZip paketleme)
8. Export — Jira (REST API client, OAuth/PAT, format builder)
9. Options page (Jira kurulumu, konfigürasyon, toggle'lar)

**Cross-Component Dependencies:**
- Storage wrapper → tüm bileşenler tarafından kullanılır (ilk implement edilmeli)
- Messaging helper → content script ↔ service worker ↔ popup iletişimi (ikinci sırada)
- Service worker → content script ve popup'ın bağlandığı merkezi hub
- Timeline builder → hem popup (veri özeti) hem export (timeline.json) tarafından kullanılır
- Jira client → options page (bağlantı kurulumu) ve popup (export) tarafından kullanılır

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Tespit Edilen Potansiyel Çakışma Alanları:** 12 alan — naming, structure, communication, format, process

### Naming Patterns

**Dosya & Klasör İsimlendirme:**
- Componentler: `PascalCase.tsx` — `SessionControl.tsx`, `DataSummary.tsx`
- Utility/lib dosyaları: `kebab-case.ts` — `storage-wrapper.ts`, `timeline-builder.ts`
- Content scripts: `kebab-case.ts` — `recorder.ts`, `snapshot.ts`
- Test dosyaları: co-located `*.test.ts` / `*.test.tsx` — `storage-wrapper.test.ts`
- Tip dosyaları: `kebab-case.ts` — `types.ts`, `jira-types.ts`

**TypeScript İsimlendirme:**
- Değişkenler/fonksiyonlar: `camelCase` — `getSessionData`, `handleBugReport`
- Componentler: `PascalCase` — `SessionControl`, `ExportBar`
- Interface/Type: `PascalCase` — `SessionMeta`, `TimelineEvent`
- Enum: `PascalCase` enum adı, `PascalCase` üyeler — `EventType.Click`, `Channel.User`
- Sabitler: `SCREAMING_SNAKE_CASE` — `MAX_XHR_BODY_SIZE`, `FLUSH_INTERVAL_MS`

**Chrome Storage Key'leri:**
- Tab-scoped: `snake_case` prefix + tabId — `session_meta_123`, `session_xhr_123`
- Global: `snake_case` — `jira_credentials`, `session_config`, `extension_settings`

### Structure Patterns

**Test Dosyaları: Co-located**
- Her dosyanın yanında `.test.ts` — `lib/storage-wrapper.ts` → `lib/storage-wrapper.test.ts`
- Component testleri: `components/ui/Button.tsx` → `components/ui/Button.test.tsx`

**Component Organizasyonu:**
- Tek dosya component — ayrı klasör yok (component küçükse)
- Büyük component (3+ yardımcı dosya): kendi klasörü + `index.tsx`
```
components/ui/Button.tsx              # tek dosya yeterli
components/domain/BugReportForm/      # büyük component
├── index.tsx
├── FormFields.tsx
└── BugReportForm.test.tsx
```

**Import Sırası (her dosyada tutarlı):**
1. Preact/external kütüphaneler
2. `@/components/` — componentler
3. `@/lib/` — utility'ler
4. Relative import'lar (aynı klasör)
5. Tipler (type-only import)

### Communication Patterns

**Chrome Message Action İsimleri:**
- `SCREAMING_SNAKE_CASE` — `START_SESSION`, `STOP_SESSION`, `REPORT_BUG`, `FLUSH_DATA`

**Message Payload Yapısı:**
```typescript
interface Message<T = unknown> {
  action: string;
  payload: T;
}

interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
```
Tüm message handler'lar bu yapıyı kullanır — hiçbir agent farklı response format'ı icat etmez.

**Preact Signal Adlandırma:**
- `camelCase` + anlamlı isim — `currentView`, `sessionActive`, `xhrCount`
- Boolean signal'lar: `is` prefix — `isRecording`, `isExporting`

### Format Patterns

**JSON Field Naming:**
- `camelCase` — tüm JSON çıktılarında (timeline.json, console-logs.json)
- TypeScript interface'leri ile JSON şeması 1:1 eşleşir

**Tarih/Zaman:**
- Storage ve timeline'da: Unix timestamp (millisecond) — `Date.now()`
- UI'da gösterim: `Intl.DateTimeFormat` ile locale-aware
- Export dosya adlarında: `YYYY-MM-DD` — `bug-report-2026-03-08.zip`

**Boolean:**
- `true`/`false` — string `"true"` veya `1`/`0` asla kullanılmaz

### Process Patterns

**Error Handling — Result Pattern:**
```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Her async fonksiyon bu pattern'ı takip eder
async function doSomething(): Promise<Result<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    console.error('[ModuleName]', error);
    return { success: false, error: error.message };
  }
}
```
- Console log prefix: `[ModuleName]` — `[Storage]`, `[Recorder]`, `[JiraClient]`
- Kullanıcıya gösterilen hata mesajları: çözüm odaklı, suçlamayan ton (UX spec'ten)

**Loading State Enum:**
```typescript
type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';
```
- Her async aksiyon bu enum'u kullanır
- UI'da: `idle` = normal, `loading` = spinner + disabled buton, `success` = toast, `error` = inline mesaj

**Graceful Degradation Sırası:**
1. Önce normal akışı dene
2. Başarısızsa fallback sun (Jira → ZIP, session → snapshot)
3. Fallback da başarısızsa kullanıcıya net hata mesajı + alternatif yol
4. Hiçbir durumda sessiz hata — her hata loglanır veya gösterilir

### Enforcement Guidelines

**Tüm AI Agent'lar ZORUNLU olarak:**
- Bu dosyadaki naming convention'lara uyar — dosya, değişken, component, message action
- `Result<T>` pattern'ını async fonksiyonlarda kullanır
- Chrome message'larda `Message` / `MessageResponse` interface'lerini kullanır
- Test dosyalarını co-located yazar
- Import sırasını takip eder
- Console log'larda `[ModuleName]` prefix'i kullanır

**Anti-Pattern'ler (YAPILMAYACAK):**
- ❌ `any` tipi kullanmak — `unknown` + type guard tercih edilir
- ❌ Callback-based async — her zaman `async/await`
- ❌ Global state/singleton — chrome.storage.local tek gerçek kaynak
- ❌ `window.localStorage` veya `document.cookie` — extension verisi sadece `chrome.storage.local`
- ❌ Inline style — sadece Tailwind class'ları (animasyonlar hariç)
- ❌ `console.log` debug amaçlı bırakmak — production build'de console çıktısı yok

## Project Structure & Boundaries

### Complete Project Directory Structure

```
qa-helper-plugin/
├── .github/
│   └── ISSUE_TEMPLATE/
├── .vscode/
│   └── extensions.json                # Önerilen VS Code eklentileri
├── dist/                              # Build çıktısı (gitignore)
├── public/
│   └── icons/
│       ├── icon-16.png
│       ├── icon-32.png
│       ├── icon-48.png
│       └── icon-128.png
├── src/
│   ├── popup/
│   │   ├── index.html                 # Popup entry HTML
│   │   ├── main.tsx                   # Preact mount point
│   │   ├── App.tsx                    # Root component — currentView signal routing
│   │   ├── views/
│   │   │   ├── DashboardView.tsx      # Session kontrol + veri özeti
│   │   │   └── BugReportView.tsx      # Bug rapor formu + export aksiyonları
│   │   └── App.test.tsx
│   ├── options/
│   │   ├── index.html                 # Options entry HTML
│   │   ├── main.tsx                   # Preact mount point
│   │   ├── App.tsx                    # Root component — sidebar routing
│   │   ├── pages/
│   │   │   ├── JiraSetupPage.tsx      # Jira Cloud/Server bağlantı kurulumu
│   │   │   ├── GeneralSettingsPage.tsx # Genel ayarlar
│   │   │   ├── DataManagementPage.tsx # Veri temizleme, depolama durumu
│   │   │   └── AboutPage.tsx          # Hakkında, versiyon, lisans
│   │   └── App.test.tsx
│   ├── background/
│   │   ├── index.ts                   # Service worker entry — event listeners
│   │   ├── session-manager.ts         # Session lifecycle (start/stop/persist/restore)
│   │   ├── message-handler.ts         # Gelen mesaj routing + dispatch
│   │   ├── flush-manager.ts           # Debounce batch write (2-3s interval)
│   │   ├── session-manager.test.ts
│   │   ├── message-handler.test.ts
│   │   └── flush-manager.test.ts
│   ├── content-scripts/
│   │   ├── recorder.ts               # XHR/Fetch monkey-patch, console intercept, click/navigation tracking
│   │   ├── snapshot.ts               # DOM serialization, storage dump, viewport bilgisi
│   │   ├── recorder.test.ts
│   │   └── snapshot.test.ts
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Toggle.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── IconButton.tsx
│   │   │   └── Card.tsx
│   │   └── domain/
│   │       ├── SessionControl.tsx     # Kayıt başlat/durdur kontrolleri
│   │       ├── DataSummary.tsx        # XHR/click/console sayaçları
│   │       ├── ExportBar.tsx          # ZIP + Jira export butonları
│   │       ├── BugReportForm/
│   │       │   ├── index.tsx          # Form container
│   │       │   ├── FormFields.tsx     # expected/actual/priority alanları
│   │       │   └── BugReportForm.test.tsx
│   │       ├── EnvironmentConfig.tsx  # Environment/project/team konfigürasyonu
│   │       └── JiraConnectionForm.tsx # OAuth/PAT giriş formu
│   ├── lib/
│   │   ├── storage.ts                # chrome.storage.local wrapper — get/set/remove/clear
│   │   ├── messaging.ts              # sendMessage/onMessage wrapper — Message<T>/MessageResponse<T>
│   │   ├── types.ts                  # Shared types — SessionMeta, TimelineEvent, Result<T>, AsyncStatus
│   │   ├── constants.ts              # SCREAMING_SNAKE sabitler — MAX_XHR_BODY_SIZE, FLUSH_INTERVAL_MS
│   │   ├── timeline-builder.ts       # Session verisinden AI-ready timeline JSON oluşturma
│   │   ├── zip-exporter.ts           # JSZip ile bug report paketi oluşturma
│   │   ├── screenshot.ts             # chrome.tabs.captureVisibleTab wrapper
│   │   ├── jira/
│   │   │   ├── jira-client.ts        # REST API v2/v3 istek katmanı
│   │   │   ├── jira-auth.ts          # OAuth 2.0 + PAT yönetimi
│   │   │   ├── jira-formatter.ts     # ADF JSON + Wiki markup formatter
│   │   │   └── jira-types.ts         # Jira-specific TypeScript tipleri
│   │   ├── license.ts                # Phase 2 placeholder — LemonSqueezy entegrasyonu
│   │   ├── storage.test.ts
│   │   ├── messaging.test.ts
│   │   ├── timeline-builder.test.ts
│   │   ├── zip-exporter.test.ts
│   │   └── jira/
│   │       ├── jira-client.test.ts
│   │       └── jira-formatter.test.ts
│   ├── styles/
│   │   └── tailwind.css              # @import "tailwindcss"
│   └── manifest.json                 # Chrome Extension MV3 manifest
├── package.json
├── tsconfig.json
├── vite.config.ts                    # Multi-entry: popup, options, background, content-scripts
├── .env.example                      # Jira OAuth client ID (development)
├── .gitignore
├── .prettierrc
└── eslint.config.js                  # Flat config — eslint-config-preact
```

### Architectural Boundaries

**Extension Context Sınırları (Chrome MV3 izolasyon modeli):**

| Context | Çalışma Ortamı | Erişebildiği API'ler | Yaşam Süresi |
|---|---|---|---|
| Service Worker (`background/`) | Arka plan | Tüm chrome.* API'ler, chrome.storage, chrome.tabs | Event-driven, 5dk idle timeout |
| Content Scripts (`content-scripts/`) | Web sayfası DOM | Sınırlı chrome.runtime, DOM API, monkey-patch | Sayfa ömrü boyunca |
| Popup (`popup/`) | Extension popup | chrome.runtime, chrome.storage | Popup açıkken |
| Options Page (`options/`) | Extension sayfası | Tüm chrome.* API'ler | Sekme açıkken |

**İletişim Sınırları:**

```
┌──────────────────┐    chrome.runtime.sendMessage    ┌──────────────────────┐
│  Content Script   │ ──────────────────────────────→ │   Service Worker      │
│  (recorder.ts)    │ ←────────────────────────────── │   (session-manager)   │
│                   │    chrome.tabs.sendMessage       │   (flush-manager)     │
└──────────────────┘                                  └──────────┬───────────┘
                                                                 │
                                                      chrome.storage.local
                                                                 │
┌──────────────────┐    chrome.runtime.sendMessage    ┌──────────┴───────────┐
│  Popup UI         │ ──────────────────────────────→ │   Service Worker      │
│  (DashboardView)  │                                 │                       │
│  (BugReportView)  │ ← chrome.storage.local.get ──  │                       │
└──────────────────┘                                  └──────────────────────┘
```

**Data Boundaries:**

| Veri Türü | Kaynak | Yazan | Okuyan | Storage Key Pattern |
|---|---|---|---|---|
| Session metadata | Content script → SW | Service Worker | Popup, Export | `session_meta_{tabId}` |
| XHR/Fetch logları | Content script → SW | Service Worker | Export (ZIP/Jira) | `session_xhr_{tabId}` |
| Click stream | Content script → SW | Service Worker | Export | `session_clicks_{tabId}` |
| Console logları | Content script → SW | Service Worker | Export | `session_console_{tabId}` |
| Konfigürasyon | Options page | Popup/Options | Tüm bileşenler | `session_config` |
| Jira credentials | Options page | Options | Service Worker (export) | `jira_credentials` |

### Requirements to Structure Mapping

**FR Kategori → Dosya Eşleşmesi:**

| FR Kategorisi | Birincil Dosyalar | İlişkili Dosyalar |
|---|---|---|
| **Session Yönetimi (FR1-6)** | `background/session-manager.ts` | `lib/storage.ts`, `lib/messaging.ts`, `content-scripts/recorder.ts` |
| **Veri Toplama (FR7-12)** | `content-scripts/recorder.ts` | `background/flush-manager.ts`, `lib/types.ts` |
| **Bug Anı Snapshot (FR13-18)** | `content-scripts/snapshot.ts`, `lib/screenshot.ts` | `background/session-manager.ts` |
| **Bug Raporlama (FR19-22)** | `popup/views/BugReportView.tsx`, `components/domain/BugReportForm/` | `lib/timeline-builder.ts`, `lib/types.ts` |
| **Export — ZIP (FR23-25)** | `lib/zip-exporter.ts`, `lib/timeline-builder.ts` | `components/domain/ExportBar.tsx` |
| **Export — Jira (FR26-31)** | `lib/jira/jira-client.ts`, `lib/jira/jira-formatter.ts` | `lib/jira/jira-auth.ts`, `options/pages/JiraSetupPage.tsx` |

**Cross-Cutting Concerns → Dosya Eşleşmesi:**

| Concern | Dosya(lar) |
|---|---|
| Privacy & Data Isolation | `lib/storage.ts` (tüm veri erişimi buradan), `manifest.json` (permission'lar) |
| Performance Budget | `content-scripts/recorder.ts` (debounce/throttle), `background/flush-manager.ts` |
| Error Resilience | `lib/types.ts` (Result<T>), `background/message-handler.ts` (try/catch wrapper) |
| Message Passing | `lib/messaging.ts` (Message/MessageResponse), `background/message-handler.ts` |

### Integration Points

**Internal Communication:**
- Content Script → Service Worker: `FLUSH_DATA`, `SESSION_EVENT` action'ları
- Service Worker → Content Script: `START_SESSION`, `STOP_SESSION`, `TAKE_SNAPSHOT`
- Popup → Service Worker: `GET_SESSION_STATUS`, `REPORT_BUG`, `EXPORT_ZIP`, `EXPORT_JIRA`
- Options → Storage: Direkt `chrome.storage.local` okuma/yazma

**External Integrations:**
- Jira Cloud: `lib/jira/jira-client.ts` → Atlassian REST API v3 + OAuth 2.0
- Jira Server/DC: `lib/jira/jira-client.ts` → REST API v2 + PAT header
- Screenshot: `lib/screenshot.ts` → `chrome.tabs.captureVisibleTab` (Chrome API)

**Data Flow — Bug Report Oluşturma:**
```
User clicks "Report Bug"
  → Popup: BugReportView → sendMessage(TAKE_SNAPSHOT)
  → Service Worker → chrome.tabs.sendMessage(TAKE_SNAPSHOT)
  → Content Script: snapshot.ts → DOM + storage dump → sendMessage(SNAPSHOT_DATA)
  → Service Worker: captureVisibleTab → screenshot
  → Service Worker: session-manager → session verilerini topla
  → Storage'dan oku: session_meta, session_xhr, session_clicks, session_console
  → timeline-builder.ts → AI-ready JSON oluştur
  → Popup'a response: snapshot hazır
  → User fills form → Export seçer (ZIP veya Jira)
  → zip-exporter.ts veya jira-client.ts → export tamamlanır
```

### File Organization Patterns

**Konfigürasyon Dosyaları:**
- Root seviyede: `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `.prettierrc`
- Extension: `src/manifest.json`
- Environment: `.env.example` (Jira OAuth client ID)

**Source Organization:**
- Entry point'lar context'e göre ayrılır: `popup/`, `options/`, `background/`, `content-scripts/`
- Paylaşılan kod: `components/` (UI) ve `lib/` (logic)
- Domain-specific modüller: `lib/jira/` alt klasörü

**Test Organization:**
- Co-located: `*.test.ts` / `*.test.tsx` dosyanın yanında
- `lib/jira/` altı da co-located: `jira-client.test.ts`
- Test config: `vite.config.ts` içinde Vitest ayarları

**Asset Organization:**
- İkonlar: `public/icons/`
- Stiller: `src/styles/tailwind.css` (tek dosya, Tailwind v4 zero-config)
- Lucide ikonları: import ile inline SVG, ayrı dosya yok

### Development Workflow Integration

**Development:**
- `npm run dev` → Vite dev server (popup/options HMR) + content scripts/background watch mode
- `chrome://extensions` → Load unpacked from `dist/`
- Content script değişikliklerinde extension manuel reload

**Build:**
- `npm run build` → Production build → `dist/` (Chrome'a yüklenebilir)
- Multi-entry rollup: popup.html, options.html, background/index.ts, content-scripts/recorder.ts, content-scripts/snapshot.ts
- Tree-shaking: Tailwind JIT + Vite rollup

**Deployment:**
- `npm run build:zip` → `dist/` → `qa-helper-plugin-v{version}.zip`
- Chrome Web Store'a manuel upload

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
Tüm teknoloji seçimleri çakışmasız çalışır:
- Preact 10.28.4 + Vite 7.x + Tailwind CSS v4 — Vite-native entegrasyon, uyumlu
- TypeScript strict + Preact-TS template — hazır
- Vitest + Vite — native test runner, ek konfigürasyon minimal
- Preact Signals + Preact — birinci sınıf destek
- Vanilla JS content scripts → TypeScript kaynak, Vite ile plain JS'e derlenir
- chrome.storage.local + unlimitedStorage — MV3 uyumlu, çakışma yok
- Lucide Icons (lucide-preact) + Preact — tree-shakeable SVG

**Pattern Consistency:**
- Naming convention'lar tutarlı: dosyalar (kebab-case lib, PascalCase component), kod (camelCase var, PascalCase type)
- Message format `Message<T>` / `MessageResponse<T>` tüm iletişim noktalarında tanımlı
- `Result<T>` pattern tüm async akışlarda standardize
- Storage key pattern `snake_case` + tabId tutarlı

**Structure Alignment:**
- Proje yapısı 4 Chrome MV3 context'i doğru yansıtır (popup, options, background, content-scripts)
- Co-located test'ler pattern tanımıyla uyumlu
- `lib/jira/` alt modülü domain karmaşıklığını izole eder
- Import sırası pattern'ı yapıyla uyumlu (`@/components/`, `@/lib/`)

### Requirements Coverage Validation ✅

**Fonksiyonel Gereksinimler (35 FR):**

| FR Kategorisi | Kapsam | Mimari Destek |
|---|---|---|
| Session Yönetimi (FR1-6) | ✅ Tam | `background/session-manager.ts`, tab-bazlı izolasyon, persist/restore |
| Veri Toplama (FR7-12) | ✅ Tam | `content-scripts/recorder.ts`, monkey-patching, iframe `all_frames: true` |
| Bug Anı Snapshot (FR13-18) | ✅ Tam | `content-scripts/snapshot.ts`, `lib/screenshot.ts`, DOM serialization |
| Bug Raporlama (FR19-22) | ✅ Tam | `popup/views/BugReportView.tsx`, `BugReportForm/`, timeline builder |
| Export — ZIP (FR23-25) | ✅ Tam | `lib/zip-exporter.ts`, `lib/timeline-builder.ts`, JSZip |
| Export — Jira (FR26-31) | ✅ Tam | `lib/jira/` modülü — dual auth, ADF/Wiki formatter, attachment upload |
| Ayarlar & Konfig (FR32-35) | ✅ Tam | `options/pages/`, `components/domain/EnvironmentConfig.tsx` |

**Non-Fonksiyonel Gereksinimler (22 NFR):**

| NFR Kategorisi | Kapsam | Mimari Destek |
|---|---|---|
| Performance (NFR1-7) | ✅ Tam | Debounce flush, content script IIFE izolasyonu, Preact 3KB |
| Security (NFR8-11) | ✅ Tam | Sıfır harici bağlantı, IIFE scope, chrome.storage.local only |
| Privacy (NFR12-15) | ✅ Tam | Export-only veri paylaşımı, `DataManagementPage.tsx` (temizleme) |
| Integration (NFR16-19) | ✅ Tam | Jira Cloud + Server dual-path, ZIP fallback |
| Reliability (NFR20-22) | ✅ Tam | SW restart dayanıklılığı, flush-manager kritik veri anında yazma |

### Implementation Readiness Validation ✅

**Decision Completeness:**
- Tüm kritik kararlar versiyon bilgisiyle belgelenmiş
- AI-ready veri şeması somut JSON örneğiyle tanımlı
- TypeScript interface'ler (`Message<T>`, `Result<T>`, `AsyncStatus`) implement-ready
- Anti-pattern'ler açıkça listelendi

**Structure Completeness:**
- ~45 dosya/dizin spesifik olarak tanımlanmış
- Her FR kategorisi spesifik dosyalara eşlenmiş
- Cross-cutting concern'ler dosya eşleşmesiyle belgelenmiş
- Data flow diyagramı (bug report akışı) adım adım tanımlı

**Pattern Completeness:**
- 12 çakışma alanı tespit edilip çözülmüş
- Naming pattern'lar 3 katmanda tanımlı (dosya, kod, storage)
- Message action isimleri somut örneklerle (`START_SESSION`, `FLUSH_DATA`)
- Graceful degradation sırası 4 adımda tanımlı

### Gap Analysis Results

**Kritik Gap: Yok** — Tüm implementation-blocking kararlar alınmış.

**Önemli Gaplar (2):**

1. **`@preact/signals` ve `jszip` package.json'a eklenmesi** — Init komutu sadece temel paketleri kurar. Implementation sırasında aşamalı eklenir, bu beklenen bir durumdur. İlk story'de tamamlanacak.

2. **FR5 (Cross-App Session Continuity) detayı** — Tab değişiminde session devamlılığı `session-manager.ts`'de handle edilecek. `chrome.tabs.onActivated` listener'ı ile aktif tab algılanacak. Mimari olarak kapsanmış ama implementasyon detayı story seviyesinde netleşecek.

**Nice-to-Have Gaplar (2):**

1. **Vitest mock stratejisi** — `chrome.*` API'lerin nasıl mock'lanacağı (webextension-polyfill-mock veya custom mock). Story seviyesinde karar verilebilir.
2. **Vite config detayı** — Multi-entry rollup konfigürasyonunun tam detayları. İlk setup story'sinde implement edilecek.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Proje bağlamı kapsamlı analiz edildi (35 FR, 22 NFR)
- [x] Ölçek ve karmaşıklık değerlendirildi (Medium-High)
- [x] Teknik kısıtlamalar tanımlandı (MV3, 5dk timeout, CSP)
- [x] Cross-cutting concern'ler eşlendi (6 concern)

**✅ Architectural Decisions**
- [x] Kritik kararlar versiyon bilgisiyle belgelendi
- [x] Teknoloji stack'i tam olarak tanımlandı
- [x] Entegrasyon pattern'ları tanımlandı (SW hub, dual Jira auth)
- [x] Performans gereksinimleri ele alındı (debounce, flush, budget)

**✅ Implementation Patterns**
- [x] İsimlendirme kuralları oluşturuldu (3 katman)
- [x] Yapı pattern'ları tanımlandı (co-located tests, component org)
- [x] İletişim pattern'ları tanımlandı (Message/Response, action names)
- [x] Süreç pattern'ları belgelendi (Result<T>, AsyncStatus, graceful degradation)

**✅ Project Structure**
- [x] Komple dizin yapısı tanımlandı (~45 dosya/dizin)
- [x] Bileşen sınırları oluşturuldu (4 Chrome context)
- [x] Entegrasyon noktaları eşlendi (internal + external)
- [x] Gereksinimler → yapı eşlemesi tamamlandı

### Architecture Readiness Assessment

**Overall Status:** IMPLEMENTATION'A HAZIR

**Güven Seviyesi:** Yüksek — Tüm kritik kararlar alınmış, gap'ler story seviyesinde çözülebilir düzeyde.

**Güçlü Yönler:**
- Privacy-first mimari tutarlı biçimde tüm katmanlara yansıtılmış
- AI-ready veri şeması kompakt ve pratik — HAR/DOM duplikasyonu önlenmiş
- Chrome MV3 kısıtlamaları mimarinin temelinde ele alınmış
- Tek geliştirici gerçekliğine uygun karmaşıklık seviyesi (fazla mühendislik yok)
- İki Kanal Mimarisi özgün ve etkili bir tasarım kararı

**Gelecek İyileştirme Alanları:**
- Phase 2: LemonSqueezy lisans entegrasyonu (`lib/license.ts` hazır)
- Phase 2: Karanlık tema desteği
- Chrome Web Store CI/CD pipeline (büyüme sonrası)
- E2E test altyapısı (Puppeteer/Playwright Chrome extension testi)

### Implementation Handoff

**AI Agent Guidelines:**
- Bu dokümandaki tüm mimari kararlara birebir uyulmalı
- Implementation pattern'ları tüm bileşenlerde tutarlı kullanılmalı
- Proje yapısı ve sınırlar korunmalı
- Tüm mimari sorularda bu dokümana başvurulmalı

**İlk Implementation Önceliği:**
```bash
npm create vite@latest qa-helper-plugin -- --template preact-ts
cd qa-helper-plugin
npm install tailwindcss @tailwindcss/vite lucide-preact
```
Ardından: `vite.config.ts` multi-entry konfigürasyonu + `manifest.json` + proje yapısının oluşturulması.
