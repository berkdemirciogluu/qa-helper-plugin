# Story 2.3: ZIP Export ve Timeline Builder

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **tester**,
I want **bug raporumu yapılandırılmış ZIP dosyası olarak indirip description'ı clipboard'a kopyalayabilmeyi**,
So that **developer'a düzgün organize edilmiş bir rapor verebilmeliyim**.

## Acceptance Criteria

1. **Given** bug rapor formu doldurulmuş ve veriler toplanmış, **When** timeline builder çalışır, **Then** AI-ready İki Kanal timeline JSON'ı oluşturulur: schemaVersion, sessionId, bugReport, environment, context, timeline array (user + sys channel), errorSummary, attachments.

2. **Given** tester "ZIP İndir" butonuna basar, **When** ZIP oluşturma başlar, **Then** buton loading state'e geçer: spinner + "Hazırlanıyor..." **And** JSZip ile yapılandırılmış ZIP oluşturulur.

3. **Given** ZIP oluşturma tamamlanmış, **When** dosya indirilir, **Then** ZIP şu dosyaları içerir: `description.txt`, `screenshot.png`, `dom-snapshot.html`, `console-logs.json`, `network.har`, `local-storage.json`, `session-storage.json`, `timeline.json` **And** dosya adı formatı: `bug-report-YYYY-MM-DD.zip` **And** başarı toast'ı gösterilir: "ZIP indirildi — bug-report-2026-03-08.zip (2.3 MB)".

4. **Given** bug rapor ekranı açık, **When** tester "Clipboard'a Kopyala" butonuna basar, **Then** description metni (steps to reproduce + beklenen sonuç + environment bilgisi) clipboard'a kopyalanır **And** başarı toast'ı gösterilir: "Description kopyalandı".

5. **Given** export başarılı, **When** tamamlanma ekranı gösterilir, **Then** "Session verilerini temizlemek ister misiniz?" sorusu gösterilir **And** "Temizle" ve "Koru" butonları sunulur **And** seçim sonrası Dashboard'a dönülür.

6. **Given** bug rapor ekranında Jira butonu görünür, **When** Jira henüz yapılandırılmamış, **Then** "Jira'ya Gönder" butonu disabled gösterilir **And** tooltip: "Ayarlardan Jira'yı kurun".

## Tasks / Subtasks

- [x] **Task 1: JSZip bağımlılığı ekleme (AC: #2, #3)**
  - [x] 1.1 `npm install jszip --legacy-peer-deps` — JSZip kütüphanesini projeye ekle
  - [x] 1.2 TypeScript tip desteği kontrol et — JSZip kendi tiplerini içerir (`@types/jszip` gerekmez)

- [x] **Task 2: Timeline Builder (AC: #1)**
  - [x] 2.1 `src/lib/timeline-builder.ts` — CREATE: `buildTimeline()` fonksiyonu — session verileri (clicks, navs, xhrs, consoleEvents) + snapshot + form + config → AI-ready İki Kanal timeline JSON
  - [x] 2.2 Timeline formatı architecture.md'deki şemaya birebir uygun: `{ schemaVersion: "1.0", sessionId, bugReport, environment, context, timeline: [{ts, ch, type, ...}], errorSummary, attachments }`
  - [x] 2.3 Timeline array: clicks → `{ch: "user", type: "click"}`, navs → `{ch: "user", type: "nav"}`, xhrs → `{ch: "sys", type: "xhr"}`, consoleErrors → `{ch: "sys", type: "error"}` — tümü timestamp sırasına göre sıralanır
  - [x] 2.4 `errorSummary`: consoleErrors sayısı, failedRequests (status >= 400) sayısı, crashDetected: false
  - [x] 2.5 `src/lib/timeline-builder.test.ts` — CREATE: Timeline builder testleri — boş veri, tam veri, sıralama, errorSummary hesaplama

- [x] **Task 3: Description Builder (AC: #3, #4)**
  - [x] 3.1 `src/lib/description-builder.ts` — CREATE: `buildDescription()` fonksiyonu — form verileri + steps + environment + config → okunabilir metin
  - [x] 3.2 Description formatı: `## Bug Raporu\n\n**Beklenen Sonuç:**\n...\n\n**Neden Bug:**\n...\n\n**Öncelik:** ...\n\n**Steps to Reproduce:**\n...\n\n**Ortam:**\n...\n\n**Konfigürasyon:**\n...`
  - [x] 3.3 `src/lib/description-builder.test.ts` — CREATE: Description builder testleri

- [x] **Task 4: ZIP Exporter (AC: #2, #3)**
  - [x] 4.1 `src/lib/zip-exporter.ts` — CREATE: `exportBugReportZip()` fonksiyonu — SnapshotData + form + timeline + description → ZIP blob → indirme tetikleme
  - [x] 4.2 ZIP dosya yapısı: `description.txt` (metin), `screenshot.png` (base64 → binary), `dom-snapshot.html` (HTML string), `console-logs.json` (JSON), `network.har` (JSON — XHR verileri HAR formatında), `local-storage.json` (JSON), `session-storage.json` (JSON), `timeline.json` (JSON)
  - [x] 4.3 Screenshot: `snapshotData.screenshot.dataUrl`'den `data:image/png;base64,` prefix'i çıkarılarak base64 olarak eklenir
  - [x] 4.4 İndirme tetikleme: `URL.createObjectURL(blob)` + gizli `<a>` element + `click()` + `URL.revokeObjectURL()` — FileSaver.js gerekmez
  - [x] 4.5 Dosya adı: `bug-report-YYYY-MM-DD.zip` formatı (`new Date().toISOString().slice(0, 10)`)
  - [x] 4.6 ZIP boyut hesaplama: `blob.size` → MB/KB formatına dönüştür
  - [x] 4.7 `src/lib/zip-exporter.test.ts` — CREATE: ZIP exporter testleri — dosya varlığı, dosya adı formatı, hata durumları

- [x] **Task 5: Clipboard kopyalama (AC: #4)**
  - [x] 5.1 `src/lib/clipboard.ts` — CREATE: `copyToClipboard(text: string)` fonksiyonu — `navigator.clipboard.writeText` wrapper, Result<void> döner
  - [x] 5.2 `src/lib/clipboard.test.ts` — CREATE: Clipboard testleri

- [x] **Task 6: Session temizleme (AC: #5)**
  - [x] 6.1 Session temizleme fonksiyonu mevcut: `storageClearSessions()` (lib/storage.ts) — `session_*` key'leri temizler, config ve credentials korur
  - [x] 6.2 Temizleme sonrası service worker'a `STOP_SESSION` mesajı gönder (session devam ediyorsa durdur)

- [x] **Task 7: BugReportView export entegrasyonu (AC: #1, #2, #3, #4, #5, #6)**
  - [x] 7.1 `src/popup/views/BugReportView.tsx` — MODIFY: Disabled export butonlarını aktif ZIP + Clipboard + disabled Jira olarak değiştir
  - [x] 7.2 ZIP İndir butonu: `Download` Lucide ikonu + "ZIP İndir" → loading state: `Loader2` spin + "Hazırlanıyor..." → başarı toast
  - [x] 7.3 Clipboard'a Kopyala butonu: `Copy` Lucide ikonu + "Kopyala" → başarı toast: "Description kopyalandı"
  - [x] 7.4 Jira'ya Gönder butonu: disabled + tooltip "Ayarlardan Jira'yı kurun" (Epic 4'te aktifleşecek)
  - [x] 7.5 Export başarılı → post-export UI: "Session verilerini temizlemek ister misiniz?" + "Temizle" (danger) + "Koru" (ghost) butonları
  - [x] 7.6 Temizle/Koru seçimi → Dashboard'a dön (slideDirection = 'left') + form signals sıfırla
  - [x] 7.7 Export state yönetimi: `exportStatus` signal (idle/loading/success/error)

- [x] **Task 8: Testler (AC: tümü)**
  - [x] 8.1 `src/popup/views/BugReportView.test.tsx` — MODIFY: Export butonları testleri ekle — ZIP click, clipboard click, loading state, post-export UI, session temizleme
  - [x] 8.2 Tüm test dosyaları co-located (Task 2-5'teki .test.ts dosyaları)
  - [x] 8.3 Mevcut testlerin regresyon kontrolü — tüm testler yeşil kalmalı

## Dev Notes

### Kritik Mimari Kısıtlamalar

**ZIP Export Veri Akışı (EN KRİTİK):**

```
BugReportView: "ZIP İndir" click
  → exportStatus = 'loading'
  → Session verilerini storage'dan oku (clicks, navs, xhrs, console)
  → buildTimeline(...) → AI-ready timeline JSON oluştur
  → buildDescription(...) → description.txt metni oluştur
  → exportBugReportZip({
      snapshotData,       ← in-memory (module-level signal)
      timeline,           ← yeni oluşturulan
      description,        ← yeni oluşturulan
      sessionData         ← storage'dan okunan
    })
  → JSZip ile ZIP blob oluştur
  → <a download> ile indirme tetikle
  → exportStatus = 'success'
  → Başarı toast'ı: "ZIP indirildi — bug-report-2026-03-08.zip (2.3 MB)"
  → Post-export UI: "Session verilerini temizlemek ister misiniz?"
```

**DİKKAT — Veri Kaynakları:**

| Veri | Kaynak | Konum |
|---|---|---|
| Screenshot (PNG) | `snapshotData.screenshot.dataUrl` | In-memory (signal) |
| DOM Snapshot | `snapshotData.dom.html` | In-memory (signal) |
| localStorage dump | `snapshotData.storage.localStorage` | In-memory (signal) |
| sessionStorage dump | `snapshotData.storage.sessionStorage` | In-memory (signal) |
| Console logs | `snapshotData.consoleLogs` | In-memory (signal) |
| XHR kayıtları | `session_xhr_{tabId}` | chrome.storage.local |
| Click olayları | `session_clicks_{tabId}` | chrome.storage.local |
| Nav olayları | `session_nav_{tabId}` | chrome.storage.local |
| Form verileri | `formExpected`, `formReason`, `formPriority` | In-memory (signal) |
| Steps to reproduce | `stepsText` | In-memory (signal) |
| Config alanları | `configFields` | In-memory (signal) |
| Ortam bilgisi | `snapshotData.screenshot.metadata` | In-memory (signal) |

### İki Kanal Timeline JSON Şeması (Architecture.md'den)

```typescript
interface TimelineJSON {
  schemaVersion: '1.0';
  sessionId: string;             // crypto.randomUUID()
  bugReport: {
    expectedResult: string;
    actualResult: string;        // formReason
    priority: string;
  };
  environment: {
    browser: string;             // snapshotData.screenshot.metadata.browserVersion
    os: string;                  // snapshotData.screenshot.metadata.os
    viewport: string;            // `${width}x${height}`
    pixelRatio: number;
    language: string;
    url: string;
  };
  context: {
    environment: string;         // configFields.environment
    project: string;             // configFields.project
    agileTeam: string;           // configFields.agileTeam
    testCycle: string;           // configFields.testCycle
  };
  timeline: TimelineEntry[];     // user + sys channel, ts sırasına göre
  errorSummary: {
    consoleErrors: number;
    failedRequests: number;      // XHR status >= 400
    crashDetected: boolean;      // false (crash detection scope dışı)
  };
  attachments: {
    screenshot: 'screenshot.png';
    har: 'network.har';
    dom: 'dom-snapshot.html';
    consoleLogs: 'console-logs.json';
    localStorage: 'local-storage.json';
    sessionStorage: 'session-storage.json';
  };
}

type TimelineEntry =
  | { ts: number; ch: 'user'; type: 'nav'; url: string }
  | { ts: number; ch: 'user'; type: 'click'; text: string; el: string }
  | { ts: number; ch: 'sys'; type: 'xhr'; method: string; url: string; status: number; ms: number }
  | { ts: number; ch: 'sys'; type: 'error'; msg: string; source: string };
```

### ZIP Dosya Yapısı

```
bug-report-2026-03-08.zip
├── description.txt           ← Okunabilir metin (clipboard ile aynı içerik)
├── screenshot.png            ← Aktif sayfanın ekran görüntüsü (base64 → binary)
├── dom-snapshot.html         ← Tam DOM snapshot (<!DOCTYPE html> + outerHTML)
├── console-logs.json         ← Console logları (ConsoleLogEntry[] — stack trace parsed)
├── network.har               ← XHR/Fetch kayıtları (HAR-benzeri JSON)
├── local-storage.json        ← localStorage key-value dump
├── session-storage.json      ← sessionStorage key-value dump
└── timeline.json             ← AI-ready İki Kanal timeline
```

**DİKKAT — network.har formatı:**
Architecture'da "HAR formatında" belirtilmiş ama tam HAR 1.2 spec uygulamak gereksiz karmaşıklık. Basitleştirilmiş HAR-benzeri JSON kullan:

```typescript
interface SimplifiedHar {
  log: {
    version: '1.2';
    entries: {
      startedDateTime: string;       // ISO 8601
      request: {
        method: string;
        url: string;
        headers: [];                 // boş — header kaydetmiyoruz
        bodySize: number;
      };
      response: {
        status: number;
        statusText: string;
        headers: [];
        bodySize: number;
      };
      time: number;                  // ms
    }[];
  };
}
```

### Description.txt Formatı

```
## Bug Raporu

**Beklenen Sonuç:**
Login butonuna tıklayınca ana sayfaya yönlenmeli

**Neden Bug:**
Login butonuna tıklayınca 500 hatası alınıyor

**Öncelik:** High

---

**Steps to Reproduce:**
1. https://app.com/login sayfasına gidildi
2. 'Kullanıcı Adı' alanına tıklandı
3. 'Giriş Yap' butonuna tıklandı

---

**Ortam:**
- Browser: Chrome 133
- OS: Windows 11
- Viewport: 1920x1080
- Pixel Ratio: 1
- Dil: tr-TR
- URL: https://app.com/login

**Konfigürasyon:**
- Environment: staging
- Proje: e-commerce
- Agile Team: Team Alpha
- Test Cycle: Sprint 1

---
Rapor: qa-helper-plugin | 2026-03-08
```

### JSZip Kullanım Paterni

```typescript
import JSZip from 'jszip';

const zip = new JSZip();

// Metin dosyası
zip.file('description.txt', descriptionText);

// PNG screenshot — data URL'den base64 kısmını çıkar
const base64Data = screenshotDataUrl.split(',')[1];
zip.file('screenshot.png', base64Data, { base64: true });

// HTML dosyası
zip.file('dom-snapshot.html', domHtml);

// JSON dosyaları
zip.file('console-logs.json', JSON.stringify(consoleLogs, null, 2));
zip.file('network.har', JSON.stringify(harData, null, 2));
zip.file('local-storage.json', JSON.stringify(localStorageData, null, 2));
zip.file('session-storage.json', JSON.stringify(sessionStorageData, null, 2));
zip.file('timeline.json', JSON.stringify(timelineData, null, 2));

// Blob oluştur ve indir
const blob = await zip.generateAsync({ type: 'blob' });
const fileName = `bug-report-${new Date().toISOString().slice(0, 10)}.zip`;
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = fileName;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);

// Dosya boyutunu hesapla
const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
```

### Mevcut Export Butonları (BugReportView.tsx — Değiştirilecek)

Mevcut yapı (satır 299-306):
```tsx
{/* Export butonları */}
<div class="flex flex-col gap-2">
  <Button variant="secondary" size="md" disabled class="w-full">
    ZIP İndir
  </Button>
  <Button variant="secondary" size="md" disabled class="w-full">
    Jira'ya Gönder
  </Button>
</div>
```

**Yeni yapı:**
```
┌─────────────────────────────────┐
│ [Download + "ZIP İndir"]        │  ← Primary buton, aktif
│ [Copy + "Kopyala"]              │  ← Ghost buton, aktif
│ [Send + "Jira'ya Gönder"]      │  ← Secondary buton, disabled + tooltip
└─────────────────────────────────┘
```

**DİKKAT — Buton Layout:**
- UX spec ExportBar: "2× Button yan yana eşit genişlikte" — ama popup 400px'de yan yana iki tam buton sığmayabilir
- Mevcut implementasyon: dikey (flex-col gap-2) — bu yaklaşımı koru
- ZIP İndir: `variant="primary"` (en önemli aksiyon), Jira: `variant="secondary"` (disabled)
- Clipboard kopyalama: `variant="ghost"` (ikincil aksiyon)

### Post-Export UI

```
Export başarılı
       ↓
┌─────────────────────────────────┐
│ ✓ ZIP indirildi                  │
│ bug-report-2026-03-08.zip        │
│ (2.3 MB)                        │
│                                  │
│ Session verilerini temizlemek    │
│ ister misiniz?                   │
│                                  │
│ [Temizle]           [Koru]      │
└─────────────────────────────────┘
```

**State akışı:**
```
exportStatus: 'idle' → 'loading' → 'success' → (temizle/koru) → Dashboard'a dön
```

**Temizle seçilirse:**
1. `storageClearSessions()` — session_* key'leri temizle
2. `sendMessage({ action: MESSAGE_ACTIONS.STOP_SESSION })` — aktif session varsa durdur
3. Form signals sıfırla
4. `slideDirection.value = 'left'` + `currentView.value = 'dashboard'`

**Koru seçilirse:**
1. Form signals sıfırla
2. `slideDirection.value = 'left'` + `currentView.value = 'dashboard'`

### Önceki Story'lerden Öğrenilenler (Story 2.1 + 2.2 → 2.3)

1. **Snapshot verisi in-memory:** `snapshotData` signal'ında tutuluyor, storage'a yazılmıyor. Export anında bu signal'dan oku — storage'a yazmaya çalışma.

2. **Module-level signals form persist:** `formExpected`, `formReason`, `formPriority`, `stepsText`, `configFields` — tümü module-level signals. Export sonrası sıfırlanmalı.

3. **Session verileri storage'da:** XHR, click, nav verileri `session_xhr_{tabId}`, `session_clicks_{tabId}`, `session_nav_{tabId}` key'lerinde. init() fonksiyonunda zaten okunuyor ve `sessionXhrCount`, `sessionClickCount` signal'larına yazılıyor. Timeline builder için tam veriler (count değil, diziler) tekrar okunmalı.

4. **Result<T> pattern:** Tüm async fonksiyonlar `Result<T>` döner. `exportBugReportZip`, `copyToClipboard`, `buildTimeline` — hepsi bu pattern ile.

5. **Chrome API mock pattern:** `vi.stubGlobal('chrome', {...})` — testlerde chrome.storage.local mock'lanmalı.

6. **`--legacy-peer-deps` flag'i:** npm install'da gerekli (mevcut dependency uyumsuzlukları var).

7. **showToast kullanımı:** `showToast('success', 'mesaj')` ve `showToast('error', 'mesaj')` — mevcut Toast component'i kullanılacak.

8. **Non-null assertion kaçın:** `data?.screenshot.dataUrl` pattern'ı kullan, `data!.screenshot.dataUrl` değil.

9. **Ortam bilgisi snapshotData'dan gelir:** `snapshotData.screenshot.metadata` — `collectEnvironmentInfo()` fonksiyonu henüz BugReportView'da kullanılmıyor (popup context kısıtlaması).

10. **Console logları snapshotData'dan gelir:** `snapshotData.consoleLogs` — zaten derlenmiş `ConsoleLogEntry[]` formatında.

### Anti-Pattern'ler (YAPILMAYACAK)

- ❌ FileSaver.js kütüphanesi kullanmak — `URL.createObjectURL` + `<a download>` yeterli
- ❌ Snapshot verisini storage'a yazmak — zaten in-memory, signal'dan oku
- ❌ HAR 1.2 tam spec implementasyonu — basitleştirilmiş HAR-benzeri format yeterli
- ❌ Export fonksiyonunu service worker'a taşımak — popup context'te JSZip çalışır (Blob API mevcut)
- ❌ Session temizleme öncesi onay modalı kullanmak — post-export UI'daki inline butonlar yeterli (modal yok)
- ❌ Form validation eklemek (zorunlu alan kontrolü) — form alanları opsiyonel, boş da olabilir
- ❌ Timeline'ı storage'a yazmak — tek seferlik oluştur, ZIP'e ekle, bellekte tut
- ❌ `any` tipi kullanmak — `unknown` + type guard
- ❌ Inline style — sadece Tailwind class'ları
- ❌ Emoji kullanmak — sadece Lucide çizgi ikonlar
- ❌ `console.log` debug amaçlı bırakmak
- ❌ `async function` yerine `.then()` chain — `async/await` kullan

### Erişilebilirlik Checklist

- [ ] ZIP İndir butonu: `aria-label` veya görünür metin + ikon
- [ ] Clipboard kopyala butonu: `aria-label="Description'ı clipboard'a kopyala"`
- [ ] Jira disabled buton: `aria-disabled="true"` + `title="Ayarlardan Jira'yı kurun"`
- [ ] Loading state: `aria-live="polite"` + `aria-busy="true"` (buton üzerinde)
- [ ] Post-export UI: `aria-live="polite"` bölge, temizle/koru butonları focusable
- [ ] Toast bildirimi: mevcut Toast component `aria-live="assertive"` kullanıyor
- [ ] Keyboard: Tab ile tüm butonlara erişim, Enter ile aktivasyon

### Performans Notları

- JSZip bundle boyutu: ~45KB gzipped — popup JS hedefini < 50KB gzipped etkileyebilir, ama export anında lazy import veya dynamic import düşünülebilir
- **DİKKAT — Dynamic import önerisi:** `const JSZip = (await import('jszip')).default` — JSZip sadece export anında yüklenir, popup ilk açılışını yavaşlatmaz. Eğer bundle analizi yapıldıktan sonra sorun görülmezse static import de kabul edilebilir.
- ZIP oluşturma < 1 saniye (tipik bug raporu < 5MB)
- Clipboard API: `navigator.clipboard.writeText` — popup context'te çalışır (extension popup trusted context)
- Session temizleme: `storageClearSessions()` < 100ms

### Dosyalar

```
src/
├── lib/
│   ├── timeline-builder.ts        ← CREATE: AI-ready İki Kanal timeline JSON oluşturma
│   ├── timeline-builder.test.ts   ← CREATE: Timeline builder testleri
│   ├── description-builder.ts     ← CREATE: Okunabilir description metin oluşturma
│   ├── description-builder.test.ts ← CREATE: Description builder testleri
│   ├── zip-exporter.ts            ← CREATE: JSZip ile ZIP oluşturma ve indirme
│   ├── zip-exporter.test.ts       ← CREATE: ZIP exporter testleri
│   ├── clipboard.ts               ← CREATE: Clipboard API wrapper
│   └── clipboard.test.ts          ← CREATE: Clipboard testleri
├── popup/
│   └── views/
│       ├── BugReportView.tsx      ← MODIFY: Export butonları aktif, post-export UI
│       └── BugReportView.test.tsx ← MODIFY: Export testleri ekle
└── package.json                   ← MODIFY: jszip dependency ekle
```

### Naming Convention'lar

| Kapsam | Kural | Örnek |
|---|---|---|
| Yeni lib dosyaları | kebab-case.ts | `timeline-builder.ts`, `zip-exporter.ts`, `description-builder.ts`, `clipboard.ts` |
| Interface'ler | PascalCase | `TimelineJSON`, `TimelineEntry`, `SimplifiedHar`, `ExportResult` |
| Fonksiyonlar | camelCase | `buildTimeline`, `exportBugReportZip`, `buildDescription`, `copyToClipboard` |
| Signal'lar | camelCase | `exportStatus`, `exportFileName`, `exportFileSize` |
| Console prefix | [ModuleName] | `[TimelineBuilder]`, `[ZipExporter]`, `[DescriptionBuilder]`, `[Clipboard]` |

### Import Sırası (BugReportView.tsx'teki yeni importlar)

```typescript
// 1. Preact/external (mevcut)
import { signal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { ArrowLeft, RefreshCw, ChevronDown, ChevronRight, AlertCircle, Download, Copy, Send, Loader2 } from 'lucide-preact';

// 2. Components (mevcut)
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataSummary } from '@/components/domain/DataSummary';
import { ConfigFields } from '@/components/domain/ConfigFields';

// 3. Lib (mevcut + yeni)
import { sendMessage } from '@/lib/messaging';
import { storageGet, storageClearSessions } from '@/lib/storage';
import { MESSAGE_ACTIONS, STORAGE_KEYS, DEFAULT_PRIORITY } from '@/lib/constants';
import { showToast } from '@/components/ui/Toast';
import { buildStepsToReproduce } from '@/lib/steps-builder';
import { buildTimeline } from '@/lib/timeline-builder';           // YENİ
import { buildDescription } from '@/lib/description-builder';     // YENİ
import { exportBugReportZip } from '@/lib/zip-exporter';          // YENİ
import { copyToClipboard } from '@/lib/clipboard';                // YENİ

// 4. View state (mevcut)
import { currentView, slideDirection } from '@/popup/view-state';

// 5. Types (mevcut)
import type { ... } from '@/lib/types';
```

### Project Structure Notes

**Mimari Uyum:**
- `lib/timeline-builder.ts` → Architecture: "Session verisinden AI-ready timeline JSON oluşturma" [Source: architecture.md#Project Structure & Boundaries]
- `lib/zip-exporter.ts` → Architecture: "JSZip ile bug report paketi oluşturma" [Source: architecture.md#Project Structure & Boundaries]
- `lib/description-builder.ts` → PRD FR25: "description text'ini tek tıkla clipboard'a kopyalayabilir"
- `lib/clipboard.ts` → PRD FR25: "clipboard'a kopyalayabilir"
- Timeline JSON formatı → Architecture: "İki Kanal Mimarisi" [Source: architecture.md#Data Architecture]
- ZIP dosya yapısı → PRD FR24: "standart veri kategorilerinde" [Source: epics.md#Story 2.3]
- Post-export session temizleme → PRD FR6: "export sonrası session verilerini temizleyip temizlememeyi seçebilir"

**Tespit Edilen Uyumsuzluklar:**
- Architecture ExportBar component "yan yana eşit genişlik" tanımlıyor ama mevcut implementasyon dikey (flex-col). Popup 400px genişliğinde yan yana zor sığar — mevcut dikey layout korunsun.
- Architecture `lib/zip-exporter.ts` path tanımlı — birebir uyumlu.
- Architecture `lib/timeline-builder.ts` path tanımlı — birebir uyumlu.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — İki Kanal Mimarisi]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Integration Points — Data Flow Bug Report Oluşturma]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Bug Raporlama Anı Akışı — Completion]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#ExportBar Component]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Loading States — ZIP oluşturuluyor]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback — ZIP başarılı]
- [Source: _bmad-output/implementation-artifacts/2-2-bug-raporlama-formu-ve-sessionsiz-bug-akisi.md#Dev Notes]
- [Source: _bmad-output/implementation-artifacts/2-2-bug-raporlama-formu-ve-sessionsiz-bug-akisi.md#Completion Notes]
- [Source: _bmad-output/implementation-artifacts/2-1-snapshot-motoru-screenshot-dom-ve-storage-toplama.md#Dev Notes]

## Change Log

- 2026-03-08: Story 2.3 implementasyonu tamamlandı — ZIP export, timeline builder, description builder, clipboard kopyalama, post-export UI ve session temizleme

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Tüm yeni testler (30 test) ilk denemede geçti
- BugReportView testlerinde module-level signal persistence sorunu çözüldü (`_resetSignalsForTest` helper eklendi)
- Önceden var olan `AboutPage.test.tsx` hatası bu story kapsamı dışında

### Completion Notes List

- Task 1: JSZip (v3.x) bağımlılığı eklendi, kendi TypeScript tipleri mevcut
- Task 2: `buildTimeline()` — Architecture'daki İki Kanal şemasına birebir uygun timeline JSON üretir (14 test)
- Task 3: `buildDescription()` — Okunabilir bug rapor metni üretir, clipboard ve description.txt ile paylaşılan format (6 test)
- Task 4: `exportBugReportZip()` — JSZip ile 8 dosyalı ZIP oluşturur, dynamic import ile lazy yükleme, URL.createObjectURL ile indirme (7 test)
- Task 5: `copyToClipboard()` — navigator.clipboard.writeText wrapper, Result<void> pattern (3 test)
- Task 6: Mevcut `storageClearSessions()` + `STOP_SESSION` mesajı kullanıldı — yeni kod yazılmadı
- Task 7: BugReportView'a ZIP İndir (primary), Kopyala (ghost), Jira (disabled) butonları; export state yönetimi (idle/loading/success/error); post-export UI (Temizle/Koru); form signal reset
- Task 8: BugReportView testleri güncellendi (18 test), co-located testler oluşturuldu, regresyon kontrolü yapıldı (370/371 geçti — 1 önceden var olan hata)

### File List

- `package.json` — MODIFIED: jszip dependency eklendi
- `package-lock.json` — MODIFIED: jszip ve bağımlılıkları
- `src/lib/timeline-builder.ts` — CREATED: AI-ready İki Kanal timeline JSON oluşturma
- `src/lib/timeline-builder.test.ts` — CREATED: Timeline builder testleri (14 test)
- `src/lib/description-builder.ts` — CREATED: Okunabilir description metin oluşturma
- `src/lib/description-builder.test.ts` — CREATED: Description builder testleri (6 test)
- `src/lib/zip-exporter.ts` — CREATED: JSZip ile ZIP oluşturma ve indirme
- `src/lib/zip-exporter.test.ts` — CREATED: ZIP exporter testleri (7 test)
- `src/lib/clipboard.ts` — CREATED: Clipboard API wrapper
- `src/lib/clipboard.test.ts` — CREATED: Clipboard testleri (3 test)
- `src/popup/views/BugReportView.tsx` — MODIFIED: Export butonları aktif, post-export UI, session temizleme
- `src/popup/views/BugReportView.test.tsx` — MODIFIED: Export testleri eklendi (18 test)
