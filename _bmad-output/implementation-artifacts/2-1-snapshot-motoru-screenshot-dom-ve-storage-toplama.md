# Story 2.1: Snapshot Motoru — Screenshot, DOM ve Storage Toplama

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **tester**,
I want **bug raporlama anında sayfanın ekran görüntüsünün, DOM'unun ve storage verilerinin otomatik toplanmasını**,
So that **developer'a tüm teknik bağlamı tek seferde verebilmeliyim**.

## Acceptance Criteria

1. **Given** tester "Bug Raporla" butonuna basar, **When** snapshot süreci başlar, **Then** `chrome.tabs.captureVisibleTab` ile aktif sayfanın screenshot'ı alınır **And** screenshot'a metadata eklenir: viewport boyutu, browser versiyonu, OS, zoom seviyesi, pixel ratio, dil.

2. **Given** snapshot süreci başlamış, **When** DOM snapshot alınır, **Then** content script aktif sayfanın tam DOM'unu serialize eder ve `dom-snapshot.html` olarak paketler.

3. **Given** snapshot süreci başlamış, **When** storage dump alınır, **Then** `localStorage` içeriği JSON olarak dump edilir **And** `sessionStorage` içeriği JSON olarak dump edilir.

4. **Given** snapshot süreci başlamış, **When** console logları derlenir, **Then** kaydedilmiş console logları stack trace parse edilerek `console-logs.json` olarak paketlenir.

5. **Given** tüm snapshot bileşenleri tamamlanmış, **When** sonuçlar birleştirilir, **Then** tüm snapshot işlemi < 3 saniyede tamamlanır **And** popup'a hazır olduğu bildirilir.

## Tasks / Subtasks

- [x] **Task 1: Snapshot tipler ve sabitler (AC: tümü)**
  - [x] 1.1 `src/lib/types.ts` — MODIFY: `SnapshotData`, `ScreenshotMetadata`, `DomSnapshot`, `StorageDump`, `ConsoleLogEntry`, `TakeSnapshotPayload`, `SnapshotDataPayload` interface'leri ekle
  - [x] 1.2 `src/lib/constants.ts` — MODIFY: `STORAGE_KEYS.SESSION_SNAPSHOT` ekle, `MAX_SNAPSHOT_TIMEOUT_MS = 3000` sabiti ekle

- [x] **Task 2: Screenshot modülü (AC: #1)**
  - [x] 2.1 `src/lib/screenshot.ts` — CREATE: `captureScreenshot(tabId: number)` fonksiyonu — `chrome.tabs.captureVisibleTab` wrapper, data URL olarak PNG döner
  - [x] 2.2 `src/lib/screenshot.ts` — `getScreenshotMetadata()` fonksiyonu — viewport, browser version, OS, zoom, pixel ratio, dil bilgisi toplama
  - [x] 2.3 `src/lib/screenshot.test.ts` — CREATE: Screenshot modülü testleri — chrome.tabs.captureVisibleTab mock, metadata extraction test

- [x] **Task 3: Content script snapshot.ts — DOM ve Storage toplama (AC: #2, #3)**
  - [x] 3.1 `src/content-scripts/snapshot.ts` — REWRITE: `TAKE_SNAPSHOT` mesajı dinle → DOM serialize + localStorage dump + sessionStorage dump → `SNAPSHOT_DATA` mesajı ile service worker'a gönder
  - [x] 3.2 DOM serialization: `document.documentElement.outerHTML` ile tam DOM'u serialize et, `<!DOCTYPE html>` prefix ekle
  - [x] 3.3 Storage dump: `localStorage` ve `sessionStorage` key-value pair'lerini JSON objesine dönüştür; erişim hatası olursa boş obje döndür (cross-origin iframe'lerde erişilemez)
  - [x] 3.4 `src/content-scripts/snapshot.test.ts` — CREATE: Snapshot content script testleri

- [x] **Task 4: Console log derleme (AC: #4)**
  - [x] 4.1 `src/lib/console-compiler.ts` — CREATE: Storage'daki `session_console_{tabId}` verisini oku → stack trace parse et → `ConsoleLogEntry[]` formatına dönüştür
  - [x] 4.2 Stack trace parsing: her `ConsoleEvent` için `stack` alanını parse et → dosya adı, satır numarası, fonksiyon adı çıkar
  - [x] 4.3 `src/lib/console-compiler.test.ts` — CREATE: Console compiler testleri — stack trace parse, farklı console level'lar

- [x] **Task 5: Service worker snapshot orchestration (AC: #1, #2, #3, #4, #5)**
  - [x] 5.1 `src/background/snapshot-handler.ts` — CREATE: `handleTakeSnapshot(tabId: number)` — tüm snapshot adımlarını orkestra eder
  - [x] 5.2 Orchestration akışı: `Promise.all([captureScreenshot, sendSnapshotCommand(tabId), compileConsoleLogs(tabId)])` ile paralel toplama
  - [x] 5.3 Timeout: `Promise.race` ile 3 saniye timeout — herhangi bir adım 3 saniyeyi aşarsa mevcut verilerle devam et (graceful degradation)
  - [x] 5.4 `src/background/message-handler.ts` — MODIFY: `TAKE_SNAPSHOT` action handler ekle → `handleTakeSnapshot` çağır
  - [x] 5.5 `src/background/message-handler.ts` — MODIFY: `SNAPSHOT_DATA` action handler ekle → content script'ten gelen DOM/storage verisini al
  - [x] 5.6 `src/background/snapshot-handler.test.ts` — CREATE: Snapshot orchestration testleri

- [x] **Task 6: Popup entegrasyonu — BugReportView placeholder (AC: #5)**
  - [x] 6.1 `src/popup/views/BugReportView.tsx` — CREATE: Placeholder view — `TAKE_SNAPSHOT` tetikle, sonuç gelene kadar loading göster
  - [x] 6.2 `src/popup/App.tsx` — MODIFY: `currentView === "bugReport"` durumunda `BugReportView` render et; Dashboard'daki "Bug Raporla" butonunu aktif yap (disabled → enabled)
  - [ ] 6.3 View geçiş animasyonu: Dashboard → BugReport sağa slide (`slide-left` 200ms ease) — Story 2.2'ye ertelendi (placeholder view yeterli)

- [x] **Task 7: Testler (AC: tümü)**
  - [x] 7.1 Tüm test dosyaları co-located olarak oluşturulmuş olacak (Task 2-6'daki .test.ts dosyaları)
  - [x] 7.2 Entegrasyon testi: `src/background/snapshot-handler.test.ts` — tam akış testi (screenshot + DOM + storage + console → birleşik SnapshotData)

## Dev Notes

### Kritik Mimari Kısıtlamalar

**Snapshot Veri Akışı (EN KRİTİK):**

```
Popup: "Bug Raporla" click
  → sendMessage(TAKE_SNAPSHOT, { tabId })
  → Service Worker: snapshot-handler.ts
      ├── [1] chrome.tabs.captureVisibleTab(tabId) → screenshot (data URL)
      ├── [2] chrome.tabs.sendMessage(tabId, TAKE_SNAPSHOT) → Content Script
      │         ├── DOM: document.documentElement.outerHTML
      │         ├── localStorage: JSON dump
      │         └── sessionStorage: JSON dump
      │         → sendMessage(SNAPSHOT_DATA, { dom, localStorage, sessionStorage })
      └── [3] storageGet(session_console_{tabId}) → console log derleme
  → 3 paralel Promise.all + Promise.race(3000ms timeout)
  → Birleşik SnapshotData → Popup'a response
```

**Service Worker Rolleri:**
- Screenshot alma (`chrome.tabs.captureVisibleTab`) **sadece service worker'dan** çağrılabilir — content script'in bu API'ye erişimi yok
- Content script'e `TAKE_SNAPSHOT` komutu gönderir → content script DOM + storage toplar → `SNAPSHOT_DATA` ile geri gönderir
- Console logları zaten `session_console_{tabId}` storage key'inde mevcut — doğrudan okunur

**Content Script Rolleri:**
- `snapshot.ts` şu an placeholder — tamamen yeniden yazılacak
- IIFE isolation pattern'ı kullanılacak (recorder.ts'deki pattern ile uyumlu)
- DOM serialize + storage dump sonuçlarını `chrome.runtime.sendMessage(SNAPSHOT_DATA)` ile service worker'a gönderir
- Cross-origin iframe'lerde `localStorage`/`sessionStorage` erişimi kısıtlı olabilir — `try/catch` ile graceful degradation

### Mevcut Altyapı (Dokunulmayacak veya Genişletilecek)

**message-handler.ts — Yeni action'lar eklenecek:**
- `TAKE_SNAPSHOT`: Popup'tan gelen snapshot talebi → `handleTakeSnapshot(tabId)` çağır
- `SNAPSHOT_DATA`: Content script'ten gelen DOM/storage verisi → geçici olarak sakla (in-memory, storage'a yazma)

**Mevcut message action'lar (constants.ts'de zaten tanımlı):**
- `TAKE_SNAPSHOT` ve `SNAPSHOT_DATA` action'ları `MESSAGE_ACTIONS` objesinde **zaten mevcut** — yeni sabit eklemeye gerek yok

**storage.ts wrapper'ı kullanılacak:**
- `storageGet<ConsoleEvent[]>(getSessionKey(STORAGE_KEYS.SESSION_CONSOLE, tabId))` ile console loglarını oku
- Snapshot verisi storage'a **yazılmayacak** — sadece in-memory olarak popup'a dönecek (export anında tekrar toplanabilir veya bellekte tutulur)

**messaging.ts pattern'ı:**
```typescript
import { sendMessage, sendTabMessage } from '@/lib/messaging';
import { MESSAGE_ACTIONS } from '@/lib/constants';

// Service worker'dan content script'e snapshot komutu
const result = await sendTabMessage<TakeSnapshotPayload, SnapshotDataPayload>(tabId, {
  action: MESSAGE_ACTIONS.TAKE_SNAPSHOT,
  payload: { tabId },
});
```

### Yeni Tipler (lib/types.ts'e eklenecek)

```typescript
/** Screenshot metadata */
export interface ScreenshotMetadata {
  viewport: { width: number; height: number };
  browserVersion: string;
  os: string;
  zoomLevel: number;
  pixelRatio: number;
  language: string;
  url: string;
  timestamp: number;
}

/** DOM snapshot verisi */
export interface DomSnapshot {
  html: string;        // document.documentElement.outerHTML
  doctype: string;     // '<!DOCTYPE html>'
  url: string;
}

/** Storage dump */
export interface StorageDump {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

/** Derlenmiş console log entry */
export interface ConsoleLogEntry {
  timestamp: number;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  stack?: string;
  parsedStack?: {
    fileName: string;
    lineNumber: number;
    columnNumber: number;
    functionName: string;
  }[];
}

/** Content script'ten gelen snapshot verisi */
export interface SnapshotDataPayload {
  tabId: number;
  dom: DomSnapshot;
  storage: StorageDump;
}

/** Popup'a dönen birleşik snapshot */
export interface SnapshotData {
  screenshot: {
    dataUrl: string;     // PNG data URL
    metadata: ScreenshotMetadata;
  };
  dom: DomSnapshot;
  storage: StorageDump;
  consoleLogs: ConsoleLogEntry[];
  timestamp: number;
  collectionDurationMs: number;
}

/** Take snapshot payload */
export interface TakeSnapshotPayload {
  tabId: number;
}
```

### Screenshot Modülü (lib/screenshot.ts)

```typescript
// chrome.tabs.captureVisibleTab — sadece service worker context'inde çalışır
export async function captureScreenshot(tabId: number): Promise<Result<{ dataUrl: string; metadata: ScreenshotMetadata }>> {
  try {
    // Tab'ın bulunduğu pencereyi al
    const tab = await chrome.tabs.get(tabId);
    const windowId = tab.windowId;

    // Screenshot al — PNG formatında data URL
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format: 'png',
    });

    const metadata = await getScreenshotMetadata(tab);
    return { success: true, data: { dataUrl, metadata } };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[Screenshot]', error);
    return { success: false, error };
  }
}
```

**DİKKAT — `captureVisibleTab` kısıtlamaları:**
- Sadece `activeTab` permission ile mevcut aktif tab'ı yakalar
- `chrome://` veya `edge://` sayfalarında çalışmaz — bu durumda error dönecek, UI'da "Screenshot alınamadı" gösterilecek
- data URL olarak döner — Blob'a çevirmeye gerek yok (ZIP export'ta base64 decode yapılacak)

### Content Script Snapshot (content-scripts/snapshot.ts)

**Mevcut dosya placeholder:**
```typescript
(() => {
  console.log('[Snapshot] Content script loaded');
})();
```

**Yeniden yazılacak yapı:**
```typescript
(() => {
  // TAKE_SNAPSHOT mesajı dinle
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'TAKE_SNAPSHOT') {
      collectSnapshot()
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // async response
    }
  });

  async function collectSnapshot(): Promise<SnapshotDataPayload> {
    const dom = serializeDOM();
    const storage = dumpStorage();
    return {
      tabId: 0, // service worker tarafından set edilecek
      dom,
      storage,
    };
  }

  function serializeDOM(): DomSnapshot { /* ... */ }
  function dumpStorage(): StorageDump { /* ... */ }
})();
```

**DİKKAT — Content script build:**
- `snapshot.ts` şu an manifest.json'da content_scripts altında **değil** — sadece `recorder.js` tanımlı
- `snapshot.ts` service worker tarafından `chrome.scripting.executeScript` ile **programatik olarak** enjekte edilecek
- VEYA manifest.json'a ikinci content script olarak eklenecek
- **Mimari karar:** Manifest'e ekleme daha güvenilir (programatik injection bazı sayfalarda CSP ile engellenebilir)
- Manifest'e eklenecekse `run_at: "document_idle"` ile yüklenecek (recorder'ın `document_start`'ından farklı)

**MANIFEST.JSON GÜNCELLEMESİ GEREKLİ:**
```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-scripts/recorder.js"],
      "all_frames": true,
      "run_at": "document_start"
    },
    {
      "matches": ["<all_urls>"],
      "js": ["content-scripts/snapshot.js"],
      "all_frames": false,
      "run_at": "document_idle"
    }
  ]
}
```

**NOT:** Snapshot sadece ana frame'den alınmalı (`all_frames: false`) — iframe'lerin DOM'u ayrı ayrı serialize etmek gereksiz karmaşıklık. localStorage/sessionStorage zaten ana frame scope'unda.

### Console Log Derleme (lib/console-compiler.ts)

Console logları `session_console_{tabId}` storage key'inde `ConsoleEvent[]` olarak zaten saklanıyor (Story 1.3'te implement edildi).

**Stack trace parse formatı:**
```
TypeError: Cannot read property 'foo' of undefined
    at Object.handleClick (https://app.com/static/js/main.chunk.js:42:15)
    at HTMLButtonElement.onClick (https://app.com/static/js/main.chunk.js:108:3)
```

**Parse çıktısı:**
```typescript
[
  { fileName: 'main.chunk.js', lineNumber: 42, columnNumber: 15, functionName: 'Object.handleClick' },
  { fileName: 'main.chunk.js', lineNumber: 108, columnNumber: 3, functionName: 'HTMLButtonElement.onClick' },
]
```

**Stack trace regex pattern:**
```typescript
// Chrome format: "    at FunctionName (url:line:col)"
const CHROME_STACK_REGEX = /^\s*at\s+(?:(.+?)\s+\()?(.*?):(\d+):(\d+)\)?$/;
```

### Snapshot Orchestration (background/snapshot-handler.ts)

```typescript
export async function handleTakeSnapshot(tabId: number): Promise<Result<SnapshotData>> {
  const startTime = Date.now();

  try {
    // 3 paralel toplama + 3 saniye timeout
    const [screenshotResult, contentResult, consoleResult] = await Promise.race([
      Promise.all([
        captureScreenshot(tabId),
        requestContentSnapshot(tabId),
        compileConsoleLogs(tabId),
      ]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Snapshot timeout')), MAX_SNAPSHOT_TIMEOUT_MS)
      ),
    ]);

    // Graceful degradation — herhangi biri başarısız olsa da devam et
    const snapshotData: SnapshotData = {
      screenshot: screenshotResult.success
        ? screenshotResult.data
        : { dataUrl: '', metadata: {} as ScreenshotMetadata },
      dom: contentResult.success
        ? contentResult.data.dom
        : { html: '', doctype: '', url: '' },
      storage: contentResult.success
        ? contentResult.data.storage
        : { localStorage: {}, sessionStorage: {} },
      consoleLogs: consoleResult.success ? consoleResult.data : [],
      timestamp: Date.now(),
      collectionDurationMs: Date.now() - startTime,
    };

    return { success: true, data: snapshotData };
  } catch (err) {
    // Timeout durumunda bile partial data dönmeyi dene
    const error = err instanceof Error ? err.message : String(err);
    console.error('[SnapshotHandler]', error);
    return { success: false, error };
  }
}
```

### Popup BugReportView Placeholder

Bu story'de BugReportView **sadece snapshot tetikleme ve sonuç gösterme** yapacak. Tam form Story 2.2'de implement edilecek.

```
┌─────────────────────────────────────┐
│ ← Geri                    Bug Rapor │  ← Header (geri ok + başlık)
├─────────────────────────────────────┤
│ [Screenshot Önizleme]               │  ← Yükleniyor... → thumbnail
│ "Yeniden Çek" ghost buton           │
├─────────────────────────────────────┤
│ ⏳ Veriler toplanıyor...            │  ← Loading state
│ veya                                │
│ ✓ Snapshot hazır                    │  ← Success state
│   • Screenshot ✓                    │
│   • DOM Snapshot ✓                  │
│   • localStorage ✓                 │
│   • sessionStorage ✓               │
│   • Console Logs (N) ✓             │
├─────────────────────────────────────┤
│ [Form alanları → Story 2.2]         │  ← Placeholder
├─────────────────────────────────────┤
│ [ZIP İndir (disabled)]              │  ← Epic 2 Story 3'te aktif
│ [Jira'ya Gönder (disabled)]         │  ← Epic 4'te aktif
└─────────────────────────────────────┘
```

### Performans Bütçesi (NFR4 — < 3 saniye)

- Screenshot: `captureVisibleTab` genellikle < 200ms
- DOM serialize: küçük-orta sayfalarda < 100ms, büyük sayfalarda < 500ms
- Storage dump: < 50ms
- Console log okuma: storage'dan okuma < 100ms
- **Toplam hedef:** < 1 saniye normal koşullarda, < 3 saniye worst case
- 3 saniye timeout ile hard limit — aşılırsa mevcut verilerle devam (graceful degradation)

### Dosyalar

```
src/
├── lib/
│   ├── types.ts                  ← MODIFY: Snapshot tipleri ekle
│   ├── constants.ts              ← MODIFY: MAX_SNAPSHOT_TIMEOUT_MS ekle
│   ├── screenshot.ts             ← CREATE: captureVisibleTab wrapper + metadata
│   ├── screenshot.test.ts        ← CREATE: Screenshot testleri
│   ├── console-compiler.ts       ← CREATE: Console log derleme + stack trace parse
│   └── console-compiler.test.ts  ← CREATE: Console compiler testleri
├── content-scripts/
│   ├── snapshot.ts               ← REWRITE: DOM serialize + storage dump + TAKE_SNAPSHOT handler
│   └── snapshot.test.ts          ← CREATE: Snapshot content script testleri
├── background/
│   ├── snapshot-handler.ts       ← CREATE: Snapshot orchestration (paralel toplama + timeout)
│   ├── snapshot-handler.test.ts  ← CREATE: Snapshot orchestration testleri
│   └── message-handler.ts        ← MODIFY: TAKE_SNAPSHOT + SNAPSHOT_DATA action handler'lar
├── popup/
│   ├── App.tsx                   ← MODIFY: "Bug Raporla" butonunu aktif yap, BugReportView route
│   └── views/
│       └── BugReportView.tsx     ← CREATE: Placeholder — snapshot tetikleme + sonuç gösterme
└── manifest.json                 ← MODIFY: snapshot.ts content script entry ekle
```

### Naming Convention'lar

| Kapsam | Kural | Örnek |
|---|---|---|
| Yeni lib dosyaları | kebab-case.ts | `screenshot.ts`, `console-compiler.ts` |
| Yeni handler dosyaları | kebab-case.ts | `snapshot-handler.ts` |
| Interface'ler | PascalCase | `SnapshotData`, `ScreenshotMetadata` |
| Fonksiyonlar | camelCase | `captureScreenshot`, `compileConsoleLogs` |
| Console prefix | [ModuleName] | `[Screenshot]`, `[SnapshotHandler]`, `[Snapshot]` |

### Import Sırası

```typescript
// 1. External
import type { Result } from '@/lib/types';

// 2. Lib
import { storageGet, getSessionKey } from '@/lib/storage';
import { sendTabMessage } from '@/lib/messaging';
import { MESSAGE_ACTIONS, STORAGE_KEYS } from '@/lib/constants';

// 3. Types (type-only)
import type { ConsoleEvent, SnapshotData, SnapshotDataPayload } from '@/lib/types';
```

### Önceki Story'den Öğrenilenler (Story 1.4 → 2.1)

1. **Result<T> pattern tutarlılığı:** Tüm async fonksiyonlar `Result<T>` döner. Screenshot, content script iletişimi, console okuma — hepsi bu pattern ile.

2. **Chrome API mock pattern:** Testlerde `vi.stubGlobal('chrome', {...})`. Bu story için ek mock'lar: `chrome.tabs.captureVisibleTab`, `chrome.tabs.get`, `chrome.scripting.executeScript` (programatik injection kullanılırsa).

3. **Content script IIFE isolation:** `recorder.ts` IIFE pattern kullanıyor — `snapshot.ts` de aynı pattern'ı kullanmalı.

4. **Tab ID null kontrolü:** `chrome.tabs.get(tabId)` undefined dönebilir — defensive coding zorunlu.

5. **Code review dersleri:** Non-null assertion (`!`) kaçın. Payload validation zorunlu. `as unknown as R` güvensiz cast kaçın.

6. **npm install:** `--legacy-peer-deps` flag'i gerekiyor. Bu story'de **yeni paket eklenmesi beklenmemektedir**.

7. **Preact signals:** BugReportView'da snapshot durumu signal ile yönetilecek: `const snapshotStatus = signal<AsyncStatus>('idle')`, `const snapshotData = signal<SnapshotData | null>(null)`.

### Anti-Pattern'ler (YAPILMAYACAK)

- ❌ Snapshot verisini chrome.storage.local'a yazmak — sadece in-memory, popup'a response olarak dön
- ❌ `document.cloneNode(true)` ile DOM klonlamak — `outerHTML` yeterli ve daha hızlı
- ❌ Screenshot'ı Blob olarak almak — data URL formatı ZIP export ve popup preview için yeterli
- ❌ iframe'lerin DOM'unu ayrı ayrı toplamak — `all_frames: false` ile sadece ana frame
- ❌ Snapshot timeout'unda hata fırlatmak — graceful degradation ile mevcut verilerle devam
- ❌ `any` tipi kullanmak — `unknown` + type guard tercih et
- ❌ Global state/singleton — fonksiyonel yaklaşım
- ❌ `console.log` debug amaçlı bırakmak — production'da console çıktısı yok
- ❌ Callback-based async — `async/await` kullan

### Erişilebilirlik Checklist (BugReportView)

- [ ] Geri ok butonu `<button>` element, `aria-label="Dashboard'a dön"`
- [ ] Loading state: `aria-live="polite"` container, "Veriler toplanıyor" metin
- [ ] Screenshot önizleme: `alt="Sayfa ekran görüntüsü"` attribute
- [ ] Veri özeti listesi: semantic `<ul>` + `<li>` yapısı
- [ ] "Yeniden Çek" butonu: `aria-label="Screenshot'ı yeniden çek"`

### Project Structure Notes

**Mimari Uyum:**
- `content-scripts/snapshot.ts` → Architecture: "DOM/storage snapshot" [Source: architecture.md#Project Structure & Boundaries]
- `lib/screenshot.ts` → Architecture: "chrome.tabs.captureVisibleTab wrapper" [Source: architecture.md#Project Structure & Boundaries]
- `background/snapshot-handler.ts` → Architecture: "Bug Report Oluşturma data flow" [Source: architecture.md#Integration Points]
- Snapshot orchestration paralel pattern → Architecture: "Promise.all ile paralel toplama" [Source: architecture.md#Data Flow — Bug Report Oluşturma]

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Integration Points — Data Flow]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Bug Raporlama Anı Akışı]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#ScreenshotPreview Component]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#DataSummary Component]
- [Source: _bmad-output/implementation-artifacts/1-4-popup-dashboard-ve-session-kontrol.md#Dev Notes]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

- `snapshot.ts` başlangıçta IIFE wrapper ile yazıldı, ancak Vite build plugin zaten otomatik IIFE wrap yaptığı için çift wrap oluşuyordu. Plain module olarak yeniden yazıldı.
- `snapshot.ts`'de `export {}` eklenmesi gerekti — TypeScript'in dosyayı global script yerine ES modülü olarak tanıması için.
- `chrome.tabs.Tab` tipinde `frozen` property eksikliği: test mock'larına `frozen: false` eklenerek ve `as chrome.tabs.Tab` cast ile çözüldü.
- Task 6.3 (slide animasyonu) Story 2.2'ye ertelendi — placeholder view için animasyon gereksiz karmaşıklık.

### Completion Notes List

- Tüm 7 task başarıyla tamamlandı (6.3 hariç, Story 2.2'ye ertelendi)
- 21 test dosyası, 212 test — hepsi geçti
- `snapshot.ts` IIFE yerine plain module olarak implement edildi (Vite plugin zaten IIFE wrap yapıyor)
- `storeSnapshotData` in-memory Map kullanıyor (storage'a yazılmıyor — anti-pattern listesinde)
- Graceful degradation: herhangi bir snapshot bileşeni başarısız olursa boş değerle devam eder
- `compileConsoleLogs` Chrome stack trace regex ile parse ediyor: `at FunctionName (url:line:col)` formatı

### File List

**Yeni dosyalar:**
- `src/lib/screenshot.ts`
- `src/lib/screenshot.test.ts`
- `src/lib/console-compiler.ts`
- `src/lib/console-compiler.test.ts`
- `src/background/snapshot-handler.ts`
- `src/background/snapshot-handler.test.ts`
- `src/content-scripts/snapshot.test.ts`
- `src/popup/views/BugReportView.tsx`

**Değiştirilen dosyalar:**
- `src/lib/types.ts` — 7 yeni interface eklendi
- `src/lib/constants.ts` — SESSION_SNAPSHOT, MAX_SNAPSHOT_TIMEOUT_MS eklendi
- `src/content-scripts/snapshot.ts` — tamamen yeniden yazıldı
- `src/background/message-handler.ts` — TAKE_SNAPSHOT + SNAPSHOT_DATA handler'ları eklendi
- `src/popup/App.tsx` — BugReportView import + route eklendi
- `src/popup/views/DashboardView.tsx` — "Bug Raporla" butonu aktif edildi
- `src/manifest.json` — snapshot.js content script entry eklendi

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-01-09 | 1.0 | Story implement edildi — snapshot motoru (screenshot, DOM, storage, console logs) + BugReportView placeholder | Claude Sonnet 4.6 (GitHub Copilot) |
| 2026-03-08 | 1.1 | Code review düzeltmeleri — H1/H2/H3: screenshot.ts service worker uyumluluğu (viewport, zoom, window kaldırıldı), M1: duplicate import, M2: BugReportView graceful degradation UI, M3: dead code temizliği, M4: tip uyumsuzluğu, L1: gereksiz try/catch | Claude Opus 4.6 (GitHub Copilot) |
