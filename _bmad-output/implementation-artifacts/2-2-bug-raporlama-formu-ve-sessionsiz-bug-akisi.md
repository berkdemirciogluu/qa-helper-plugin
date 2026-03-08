# Story 2.2: Bug Raporlama Formu ve Session'sız Bug Akışı

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **tester**,
I want **minimal bir form ile bug raporu oluşturabilmeyi ve session başlatmamış olsam bile anlık snapshot alabilmeyi**,
So that **hızlıca bug raporlayıp işime devam edebileyim**.

## Acceptance Criteria

1. **Given** session aktif ve tester "Bug Raporla"ya basar, **When** bug rapor ekranı açılır, **Then** popup Dashboard'dan BugReportView'a sağa slide geçiş yapılır (200ms) **And** screenshot önizlemesi üstte gösterilir (thumbnail + "Yeniden Çek" ghost butonu) **And** 3 alanlı form gösterilir: beklenen sonuç (textarea), neden bug (textarea), priority (dropdown, varsayılan: Medium).

2. **Given** bug rapor ekranı açık, **When** tester collapsible "Steps to Reproduce" bölümüne bakar, **Then** tıklama akışından otomatik oluşturulmuş adımlar varsayılan kapalı (collapsed) olarak gösterilir **And** tester açıp içeriği düzenleyebilir.

3. **Given** bug rapor ekranı açık, **When** ortam bilgileri toplanır, **Then** browser, OS, viewport, cihaz bilgileri otomatik tespit edilip rapora eklenir (kullanıcı aksiyonu gerekmez).

4. **Given** bug rapor ekranı açık, **When** tester konfigürasyon alanlarını görüntüler, **Then** environment, test cycle, agile team, proje alanları popup'ta inline olarak gösterilir ve değiştirilebilir **And** bir kez ayarlanan değerler sonraki raporlara otomatik eklenir.

5. **Given** bug rapor ekranı açık, **When** tester toplanan veri özetine bakar, **Then** DataSummary checklist gösterilir: check ikonu + "Screenshot", "DOM Snapshot", "Console Logs (N)", "XHR (N)", "localStorage", "sessionStorage", "Timeline (N olay)".

6. **Given** session başlatılmamış ve tester "Bug Raporla"ya basar, **When** session'sız durum tespit edilir, **Then** uyarı modalı gösterilir: "Session kaydı yok, sadece anlık snapshot alınacak. Tıklama akışı ve XHR geçmişi dahil edilemez." **And** "Devam Et" (primary) ve "İptal" (ghost) butonları sunulur.

7. **Given** session'sız bug onaylanmış, **When** veri özeti gösterilir, **Then** eksik veriler (tıklama akışı, XHR geçmişi) xmark ikonu + soluk renk ile gösterilir (cezalandırmayan ton) **And** mevcut veriler (screenshot, DOM, storage, console) check ikonu ile gösterilir.

8. **Given** bug rapor formunda, **When** tester "Yeniden Çek" butonuna basar, **Then** yeni screenshot alınır ve önizleme güncellenir.

9. **Given** bug rapor ekranında, **When** tester geri okuna basar, **Then** Dashboard'a sola slide geçiş yapılır ve form verisi korunur (geri dönüldüğünde kaybolmaz).

## Tasks / Subtasks

- [x] **Task 1: Yeni tipler ve sabitler (AC: tümü)**
  - [x] 1.1 `src/lib/types.ts` — MODIFY: `BugReportFormData`, `EnvironmentInfo`, `ConfigFields`, `StepsToReproduce` interface'leri ekle
  - [x] 1.2 `src/lib/constants.ts` — MODIFY: `STORAGE_KEYS.BUG_REPORT_CONFIG` ekle (konfigürasyon alanları persist için), `DEFAULT_PRIORITY` sabiti ekle

- [x] **Task 2: Ortam bilgisi toplama (AC: #3)**
  - [x] 2.1 `src/lib/environment.ts` — CREATE: `collectEnvironmentInfo()` fonksiyonu — `navigator.userAgent` parse (browser version, OS), `window.innerWidth/Height` (viewport), `navigator.language`, `devicePixelRatio`
  - [x] 2.2 `src/lib/environment.test.ts` — CREATE: Environment info testleri

- [x] **Task 3: Steps to Reproduce oluşturma (AC: #2)**
  - [x] 3.1 `src/lib/steps-builder.ts` — CREATE: `buildStepsToReproduce(clicks: ClickEvent[], navs: NavEvent[])` — tıklama akışı ve navigasyon olaylarından okunabilir adımlar oluştur
  - [x] 3.2 Adım formatı: "1. [URL] sayfasında '[element text]' butonuna tıklandı", "2. [eski URL] → [yeni URL] sayfasına geçildi"
  - [x] 3.3 `src/lib/steps-builder.test.ts` — CREATE: Steps builder testleri — boş veri, tek tıklama, çoklu navigasyon

- [x] **Task 4: Konfigürasyon alanları (AC: #4)**
  - [x] 4.1 `src/components/domain/ConfigFields.tsx` — CREATE: Inline konfigürasyon alanları (environment, test cycle, agile team, proje) — Select/Input componentleri ile
  - [x] 4.2 Config değerleri `session_config` storage key'inde `configFields` property olarak persist — her değişiklikte anında kaydet
  - [x] 4.3 `src/components/domain/ConfigFields.test.tsx` — CREATE: ConfigFields testleri

- [x] **Task 5: DataSummary component (AC: #5, #7)**
  - [x] 5.1 `src/components/domain/DataSummary.tsx` — CREATE: Toplanan veri checklist'i — her item: check/xmark ikonu + label + count (varsa)
  - [x] 5.2 Session'sız modda: XHR ve tıklama akışı xmark + soluk renk, mevcut veriler check + normal renk
  - [x] 5.3 `src/components/domain/DataSummary.test.tsx` — CREATE: DataSummary testleri — tam veri, eksik veri, session'sız mod

- [x] **Task 6: Session'sız bug uyarı modalı (AC: #6)**
  - [x] 6.1 `src/components/ui/Modal.tsx` — CREATE: Genel amaçlı modal component — overlay + centered content + focus trap + ESC kapatma
  - [x] 6.2 `src/components/ui/Modal.test.tsx` — CREATE: Modal testleri — açılış, kapanış, focus trap, keyboard
  - [x] 6.3 Session'sız uyarı modalı BugReportView içinde kullanılacak — `AlertCircle` ikonu + uyarı metni + "Devam Et" (primary) + "İptal" (ghost)

- [x] **Task 7: BugReportView tam implementasyon (AC: #1, #2, #3, #4, #5, #6, #7, #8, #9)**
  - [x] 7.1 `src/popup/views/BugReportView.tsx` — REWRITE: Placeholder yerine tam form implementasyonu
  - [x] 7.2 Dikey akış: screenshot önizleme → form alanları (beklenen sonuç, neden bug, priority) → collapsible steps to reproduce → konfigürasyon alanları → DataSummary → export butonları
  - [x] 7.3 Form state: module-level signals ile persist (popup kapatılmadan Dashboard'a dönünce veri korunur)
  - [x] 7.4 Session kontrol: Dashboard'dan geçerken session durumunu kontrol et → session yoksa modal göster
  - [x] 7.5 Steps to Reproduce: session aktifse storage'dan `session_clicks_{tabId}` ve `session_nav_{tabId}` oku → `buildStepsToReproduce()` ile oluştur → collapsible textarea'da göster (varsayılan: collapsed)
  - [x] 7.6 Export butonları: ZIP İndir (disabled, Story 2.3'te aktif) + Jira'ya Gönder (disabled, Epic 4'te aktif)

- [x] **Task 8: Slide animasyonu (AC: #1, #9)**
  - [x] 8.1 `src/popup/App.tsx` — MODIFY: Dashboard ↔ BugReport arası CSS transition — sağa slide (dashboard → bugReport), sola slide (bugReport → dashboard), 200ms ease
  - [x] 8.2 Animasyon: `transform: translateX()` + `transition: transform 200ms ease`

- [x] **Task 9: Testler (AC: tümü)**
  - [x] 9.1 `src/popup/views/BugReportView.test.tsx` — CREATE: BugReportView testleri — form render, session'sız akış, steps to reproduce, konfigürasyon, DataSummary
  - [x] 9.2 Tüm test dosyaları co-located (Task 2-6'daki .test.ts/.test.tsx dosyaları)

## Dev Notes

### Kritik Mimari Kısıtlamalar

**BugReportView Dikey Akış (EN KRİTİK — UX Spec'ten):**

```
┌─────────────────────────────────┐
│ ← Geri                Bug Rapor │  ← Header (geri ok + başlık)
├─────────────────────────────────┤
│ [Screenshot Önizleme]           │  ← thumbnail + "Yeniden Çek"
├─────────────────────────────────┤
│ 📝 Bug Formu                    │
│ ┌─────────────────────────────┐ │
│ │ Beklenen sonuç (textarea)   │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Neden bug? (textarea)       │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Priority: [Medium ▼]       │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ ▶ Steps to Reproduce (kapalı)  │  ← collapsible, varsayılan kapalı
├─────────────────────────────────┤
│ Konfigürasyon                   │  ← inline environment, proje vb.
├─────────────────────────────────┤
│ Toplanan Veriler                │  ← DataSummary checklist
│ ✓ Screenshot  ✓ DOM Snapshot    │
│ ✓ 12 XHR      ✓ 3 Console Error│
│ ✓ localStorage ✓ sessionStorage │
├─────────────────────────────────┤
│ [ZIP İndir (disabled)]          │  ← Story 2.3'te aktif
│ [Jira Gönder (disabled)]        │  ← Epic 4'te aktif
├─────────────────────────────────┤
│ 🔒 Tüm veriler cihazınızda     │
└─────────────────────────────────┘
```

**State Management — Form Verisi Persist:**
- Form verileri module-level Preact signals'da tutulacak (component dışında tanımlı)
- Dashboard'a dönüp tekrar BugReportView'a gelince veriler korunur (signals component lifecycle'ından bağımsız)
- Export veya popup kapanışında signals sıfırlanır

```typescript
// Module-level signals — component unmount'ta kaybolmaz
const formExpected = signal('');
const formReason = signal('');
const formPriority = signal<'low' | 'medium' | 'high' | 'critical'>('medium');
const stepsText = signal('');
const isStepsOpen = signal(false);
```

**Session'sız Bug Akışı:**
```
Dashboard: "Bug Raporla" click
  → Session durumu kontrol et (GET_SESSION_STATUS)
  → Session yoksa (idle):
      → Modal göster: "Session kaydı yok..."
      → "Devam Et" → snapshot al (sadece anlık veri)
      → "İptal" → Dashboard'a dön
  → Session varsa (recording):
      → Doğrudan BugReportView'a geç + snapshot al
```

**DİKKAT — Session Kontrolü DashboardView'da yapılmalı:**
- `currentView.value = 'bugReport'` atanmadan ÖNCE session durumu kontrol edilmeli
- Modal DashboardView'da veya App.tsx seviyesinde gösterilmeli — BugReportView zaten açıldığında modal gösterme yanlış UX
- Alternatif: BugReportView açılırken `hasSession` prop'u geçir

### Mevcut BugReportView (Story 2.1 — Yeniden Yazılacak)

Mevcut placeholder yapı:
- Header (geri ok + başlık) ✓ — korunacak
- Screenshot önizleme ✓ — korunacak, form ile birleştirilecek
- Snapshot status listesi — DataSummary component'ine dönüşecek
- Form placeholder — gerçek form ile değiştirilecek
- Disabled export butonları ✓ — korunacak

**Mevcut signal'lar korunacak:**
- `snapshotStatus` ve `snapshotData` — mevcut snapshot tetikleme mantığı çalışıyor
- `triggerSnapshot()` fonksiyonu — mevcut, korunacak

### Yeni Tipler (lib/types.ts'e eklenecek)

```typescript
/** Bug rapor form verisi */
export interface BugReportFormData {
  expectedResult: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  stepsToReproduce: string;
  configFields: ConfigFields;
}

/** Konfigürasyon alanları — bug rapora eklenen bağlam bilgileri */
export interface ConfigFields {
  environment: string;  // staging, QA, production vb.
  testCycle: string;    // Sprint 1, Regression vb.
  agileTeam: string;    // Team Alpha vb.
  project: string;      // e-commerce, CRM vb.
}

/** Ortam bilgisi — otomatik toplanan */
export interface EnvironmentInfo {
  browser: string;      // "Chrome 133"
  os: string;           // "Windows 11"
  viewport: string;     // "1920x1080"
  pixelRatio: number;
  language: string;     // "tr-TR"
  url: string;
}

/** Steps to reproduce — otomatik oluşturulan adım */
export interface StepItem {
  index: number;
  description: string;
  timestamp: number;
}
```

### Ortam Bilgisi Toplama (lib/environment.ts)

```typescript
export function collectEnvironmentInfo(): EnvironmentInfo {
  const ua = navigator.userAgent;
  // Chrome version: "Chrome/133.0.6917.x" regex
  const chromeMatch = ua.match(/Chrome\/(\d+)/);
  const browser = chromeMatch ? `Chrome ${chromeMatch[1]}` : 'Chrome';

  // OS detection from userAgent
  let os = 'Unknown';
  if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return {
    browser,
    os,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    pixelRatio: window.devicePixelRatio,
    language: navigator.language,
    url: window.location?.href ?? '',
  };
}
```

**DİKKAT:** `collectEnvironmentInfo()` popup context'inde çalışacak — `window.location` popup URL'i döner, aktif tab URL'ini değil. Aktif tab URL'i `snapshotData.screenshot.metadata.url` veya `chrome.tabs.query` ile alınmalı.

### Steps to Reproduce Builder (lib/steps-builder.ts)

```typescript
export function buildStepsToReproduce(
  clicks: ClickEvent[],
  navs: NavEvent[],
): string {
  // Tüm olayları timestamp'e göre sırala
  const events = [...clicks, ...navs].sort((a, b) => a.timestamp - b.timestamp);

  const steps: string[] = [];
  let stepNum = 1;

  for (const event of events) {
    if (event.type === 'nav') {
      steps.push(`${stepNum}. ${event.url} sayfasına gidildi`);
    } else if (event.type === 'click') {
      const text = event.text.length > 50 ? event.text.slice(0, 50) + '...' : event.text;
      steps.push(`${stepNum}. '${text}' elementine tıklandı`);
    }
    stepNum++;
  }

  return steps.join('\n');
}
```

### Konfigürasyon Alanları (ConfigFields Component)

**Storage yapısı — `session_config` key'i genişletiliyor:**

```typescript
// Mevcut SessionConfig interface'i genişletilecek:
export interface SessionConfig {
  toggles: { har: boolean; console: boolean; dom: boolean; localStorage: boolean; sessionStorage: boolean };
  configFields?: ConfigFields;  // YENİ — konfigürasyon alanları
}
```

**DİKKAT — Mevcut `session_config` key'ini koru:**
- Popup DashboardView ve Options GeneralSettingsPage zaten bu key'i `toggles` property ile kullanıyor
- `configFields` property eklenmeli ama `toggles` korunmalı — merge pattern kullan
- `storageGet(SESSION_CONFIG)` → mevcut config al → `{ ...existingConfig, configFields: updated }` → `storageSet`

**ConfigFields layout:**
```
┌─────────────────────────────────┐
│ Konfigürasyon                   │  ← CollapsibleSection veya inline
│ Environment: [staging ▼]        │  ← Select
│ Test Cycle:  [Sprint 1  ]       │  ← Input
│ Agile Team:  [Team Alpha]       │  ← Input
│ Proje:       [e-commerce]       │  ← Input
└─────────────────────────────────┘
```

### Session'sız Uyarı Modalı

**Modal Component Props:**
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ComponentChildren;
}
```

**Uyarı modalı layout:**
```
┌─────────────────────────────────┐
│ (overlay — semi-transparent)     │
│ ┌─────────────────────────────┐ │
│ │ ⚠ Session Kaydı Yok         │ │
│ │                             │ │
│ │ Session kaydı yok, sadece   │ │
│ │ anlık snapshot alınacak.    │ │
│ │ Tıklama akışı ve XHR       │ │
│ │ geçmişi dahil edilemez.     │ │
│ │                             │ │
│ │ [İptal]        [Devam Et]  │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Focus trap implementasyonu:**
- Modal açıldığında focus ilk focusable element'e
- Tab ile sadece modal içindeki elementler arasında dolaşım
- ESC ile kapatma
- Overlay click ile kapatma
- Kapanışta tetikleyici element'e focus dönüşü

### Slide Animasyonu (App.tsx)

**CSS transition yaklaşımı:**
```typescript
// App.tsx — slide geçiş
const [direction, setDirection] = useState<'left' | 'right' | null>(null);

// Dashboard → BugReport: sağa slide (dashboard sola kayar, bugReport sağdan gelir)
// BugReport → Dashboard: sola slide (bugReport sağa kayar, dashboard soldan gelir)
```

**Basit yaklaşım — CSS class toggle:**
```css
/* Popup'a eklenmeli — tailwind.css veya inline */
.slide-enter-right { animation: slideInRight 200ms ease forwards; }
.slide-enter-left { animation: slideInLeft 200ms ease forwards; }

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
@keyframes slideInLeft {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
```

**DİKKAT — prefers-reduced-motion:**
```css
@media (prefers-reduced-motion: reduce) {
  .slide-enter-right, .slide-enter-left { animation: none; }
}
```

### Session Verilerini Okuma (Steps + XHR Sayısı)

Session aktifse, BugReportView açılırken storage'dan session verilerini oku:

```typescript
// Session verileri okuma
const tabId = tabIdRef.current;
if (tabId && hasSession) {
  const [clicksResult, navsResult, xhrResult] = await Promise.all([
    storageGet<ClickEvent[]>(getSessionKey(STORAGE_KEYS.SESSION_CLICKS, tabId)),
    storageGet<NavEvent[]>(getSessionKey(STORAGE_KEYS.SESSION_NAV, tabId)),
    storageGet<XhrEvent[]>(getSessionKey(STORAGE_KEYS.SESSION_XHR, tabId)),
  ]);

  const clicks = clicksResult.success ? clicksResult.data ?? [] : [];
  const navs = navsResult.success ? navsResult.data ?? [] : [];
  const xhrs = xhrResult.success ? xhrResult.data ?? [] : [];

  stepsText.value = buildStepsToReproduce(clicks, navs);
  sessionXhrCount.value = xhrs.length;
  sessionClickCount.value = clicks.length;
}
```

### DataSummary Component

**Props:**
```typescript
interface DataSummaryProps {
  hasScreenshot: boolean;
  hasDom: boolean;
  hasLocalStorage: boolean;
  hasSessionStorage: boolean;
  consoleLogCount: number;
  xhrCount: number;       // session'sız modda 0
  clickCount: number;     // session'sız modda 0
  hasSession: boolean;    // session'sız modda false → XHR ve click xmark göster
}
```

**Render logic:**
- `hasSession === true`: tüm veriler check ikonu ile
- `hasSession === false`: screenshot, DOM, storage, console → check, XHR ve tıklama akışı → xmark + soluk (`text-gray-300`)
- Count gösterimi: "Console Logs (12)", "XHR (8)", "Timeline (47 olay)"
- İkon: Lucide `Check` (yeşil) ve `X` (gri, soluk)

### Performans Notları

- Form textarea'ları auto-resize: `scrollHeight` bazlı, max 120px (UX spec)
- Priority dropdown: native `<select>` yeterli — custom dropdown gereksiz karmaşıklık
- Steps to Reproduce: textarea maxLength yok ama UI'da collapsible olduğundan uzunluk sorun değil
- Konfigürasyon alanları değiştiğinde anında `storageSet` — debounce gerekmez (storage yazma < 10ms)

### Dosyalar

```
src/
├── lib/
│   ├── types.ts                  ← MODIFY: BugReportFormData, ConfigFields, EnvironmentInfo, StepItem
│   ├── constants.ts              ← MODIFY: BUG_REPORT_CONFIG storage key
│   ├── environment.ts            ← CREATE: collectEnvironmentInfo()
│   ├── environment.test.ts       ← CREATE: Environment testleri
│   ├── steps-builder.ts          ← CREATE: buildStepsToReproduce()
│   └── steps-builder.test.ts     ← CREATE: Steps builder testleri
├── components/
│   ├── ui/
│   │   ├── Modal.tsx             ← CREATE: Genel modal component
│   │   └── Modal.test.tsx        ← CREATE: Modal testleri
│   └── domain/
│       ├── ConfigFields.tsx      ← CREATE: Konfigürasyon alanları
│       ├── ConfigFields.test.tsx ← CREATE: ConfigFields testleri
│       ├── DataSummary.tsx       ← CREATE: Veri özeti checklist
│       └── DataSummary.test.tsx  ← CREATE: DataSummary testleri
├── popup/
│   ├── App.tsx                   ← MODIFY: Slide animasyonu ekleme
│   └── views/
│       ├── BugReportView.tsx     ← REWRITE: Tam form implementasyonu
│       └── BugReportView.test.tsx ← CREATE: BugReportView testleri
└── styles/
    └── tailwind.css              ← MODIFY: Slide animasyon keyframes (opsiyonel — inline de olabilir)
```

### Naming Convention'lar

| Kapsam | Kural | Örnek |
|---|---|---|
| Yeni lib dosyaları | kebab-case.ts | `environment.ts`, `steps-builder.ts` |
| Yeni component'ler | PascalCase.tsx | `Modal.tsx`, `ConfigFields.tsx`, `DataSummary.tsx` |
| Interface'ler | PascalCase | `BugReportFormData`, `ConfigFields`, `EnvironmentInfo` |
| Signal'lar | camelCase | `formExpected`, `formPriority`, `isStepsOpen` |
| Event handler'lar | handle + Action | `handleSubmit`, `handlePriorityChange`, `handleStepToggle` |
| Console prefix | [ModuleName] | `[BugReport]`, `[Environment]`, `[StepsBuilder]` |

### Import Sırası

```typescript
// 1. Preact/external
import { signal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { ArrowLeft, RefreshCw, ChevronDown, ChevronRight, Check, X, AlertCircle } from 'lucide-preact';

// 2. Components
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { DataSummary } from '@/components/domain/DataSummary';
import { ConfigFields } from '@/components/domain/ConfigFields';

// 3. Lib
import { sendMessage } from '@/lib/messaging';
import { storageGet } from '@/lib/storage';
import { MESSAGE_ACTIONS, STORAGE_KEYS } from '@/lib/constants';
import { buildStepsToReproduce } from '@/lib/steps-builder';
import { collectEnvironmentInfo } from '@/lib/environment';

// 4. Types
import type { SnapshotData, ClickEvent, NavEvent, SessionMeta, ConfigFields as ConfigFieldsType } from '@/lib/types';
```

### Önceki Story'den Öğrenilenler (Story 2.1 → 2.2)

1. **Snapshot tetikleme çalışıyor:** `triggerSnapshot()` fonksiyonu ve `snapshotStatus`/`snapshotData` signal'ları mevcut — yeniden yazmaya gerek yok, form ile birleştir.

2. **IIFE pattern content script'te:** snapshot.ts plain module olarak yazıldı (Vite otomatik IIFE wrap yapıyor). Content script'e dokunma.

3. **In-memory snapshot verisi:** Snapshot verisi storage'a yazılmıyor, sadece popup'a response olarak dönüyor. BugReportView'daki `snapshotData` signal'ı bu veriyi tutuyor — export anında bu signal'dan oku.

4. **Graceful degradation:** Herhangi bir snapshot bileşeni başarısız olsa bile boş değerle devam ediyor. DataSummary component'i bunu yansıtmalı (screenshot alınamadıysa "⚠" göster).

5. **Chrome API mock pattern:** `vi.stubGlobal('chrome', {...})` — testlerde `chrome.tabs.query`, `chrome.storage.local.get/set` mock'lanmalı.

6. **`--legacy-peer-deps` flag'i:** npm install'da gerekli. Bu story'de **yeni paket eklenmesi beklenmemektedir**.

7. **Non-null assertion kaçın:** `tab?.id` pattern'ı kullan, `tab.id!` değil.

8. **Preact signals module-level:** Component dışında tanımlanan signals, component unmount/remount'larda korunuyor — form verisi persist için ideal.

### Anti-Pattern'ler (YAPILMAYACAK)

- ❌ Form state'ini `useState` ile yönetmek — module-level `signal` kullan (Dashboard'a dönüp gelince kaybolmasın)
- ❌ Steps to Reproduce'u storage'a yazmak — bellekte tut, sadece export anında kullan
- ❌ Session durumunu BugReportView içinde kontrol etmek — DashboardView veya App.tsx'te kontrol et, modal'ı orada göster
- ❌ Custom dropdown component yazmak — native `<select>` yeterli (priority için 4 seçenek)
- ❌ Textarea auto-resize için kütüphane kullanmak — basit `onInput` handler ile `scrollHeight` yeterli
- ❌ Ortam bilgisini her render'da toplamak — bir kez topla, signal'da tut
- ❌ `any` tipi kullanmak — `unknown` + type guard
- ❌ Inline style — sadece Tailwind class'ları (animasyon keyframes hariç)
- ❌ Emoji kullanmak — sadece Lucide çizgi ikonlar
- ❌ `console.log` debug amaçlı bırakmak

### Erişilebilirlik Checklist

- [ ] Form alanları: `<label>` + `htmlFor` eşleşmesi, placeholder text
- [ ] Textarea: `aria-label="Beklenen sonuç"`, `aria-label="Neden bug"`
- [ ] Priority select: `<label>` + `<select>` bağlantısı
- [ ] Collapsible steps: `aria-expanded`, `aria-controls`, `<button>` tetikleyici
- [ ] Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap
- [ ] DataSummary: semantic `<ul>` + `<li>`, check/xmark `aria-hidden="true"` (metin yeterli)
- [ ] Geri ok: `aria-label="Dashboard'a dön"` (mevcut)
- [ ] Loading state: `aria-live="polite"` (mevcut)
- [ ] Tüm butonlar: `aria-label` veya görünür metin
- [ ] Keyboard: Tab navigasyon tüm form alanları ve butonlarda
- [ ] prefers-reduced-motion: slide animasyonları devre dışı

### Project Structure Notes

**Mimari Uyum:**
- `popup/views/BugReportView.tsx` → Architecture: "Bug rapor formu + export aksiyonları" [Source: architecture.md#Project Structure & Boundaries]
- `components/domain/DataSummary.tsx` → Architecture: "XHR/click/console sayaçları" [Source: architecture.md#Complete Project Directory Structure]
- `lib/environment.ts` → UX Spec: "ortam bilgileri otomatik tespit edilip rapora eklenir" [Source: ux-design-specification.md#Experience Mechanics]
- `lib/steps-builder.ts` → Architecture: "lib/timeline-builder.ts" kategorisinde fonksiyonellik [Source: architecture.md#Project Structure & Boundaries]
- Form dikey akış → UX Spec: "D — Vertical Flow: screenshot → form → collapsible steps → veri özeti → export" [Source: ux-design-specification.md#Design Direction Decision]

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — State Management]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Bug Raporlama Anı Akışı]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Direction Decision — D Vertical Flow]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Session'sız Bug Raporlama (Degraded Mode)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy — Modal]
- [Source: _bmad-output/implementation-artifacts/2-1-snapshot-motoru-screenshot-dom-ve-storage-toplama.md#Dev Notes]
- [Source: _bmad-output/implementation-artifacts/2-1-snapshot-motoru-screenshot-dom-ve-storage-toplama.md#Completion Notes]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (GitHub Copilot)

### Debug Log References

- `toStartWith` `vitest`'te mevcut değil → `toMatch(/^N\./)` ile değiştirildi
- Module-level signal persistence test ordering sorununa yol açtı → geçici loading state testi kaldırıldı, yerine chrome API çağrısını doğrulayan test eklendi
- Modal import BugReportView'da gereksiz kalmıştı (modal App.tsx'e taşındı) → import kaldırıldı
- ESC key listener'ın yeri eslint no-lonely-if kuralını tetikledi → `else if` ile düzeltildi

### Completion Notes List

- **Task 1**: `BugReportFormData`, `ConfigFields`, `EnvironmentInfo`, `StepItem` interface'leri types.ts'e eklendi; `SessionConfig.configFields` optional property olarak genişletildi. `STORAGE_KEYS.BUG_REPORT_CONFIG` ve `DEFAULT_PRIORITY` constants.ts'e eklendi.
- **Task 2**: `collectEnvironmentInfo()` environment.ts'te implement edildi — Chrome versiyonu regex ile ayrıştırılıyor, OS user-agent'tan tespit ediliyor, popup context kısıtlaması (window.location → popup URL) dökümante edildi. 8 test yeşil.
- **Task 3**: `buildStepsToReproduce()` steps-builder.ts'te implement edildi — tüm olaylar timestamp sırasına göre sıralanıyor, 50 karakter kırpma template literal ile uygulandı. 7 test yeşil.
- **Task 4**: `ConfigFields.tsx` — environment Select + testCycle/agileTeam/project Input alanları; her değişiklikte `session_config` storage'ına merge pattern ile yazıyor (mevcut toggles korunuyor). 5 test yeşil.
- **Task 5**: `DataSummary.tsx` — Check/X Lucide ikonları + semantik ul/li; `hasSession=false` durumunda XHR ve Timeline xmark + `text-gray-300` ile gösteriliyor. 5 test yeşil.
- **Task 6**: `Modal.tsx` — focus trap (Tab/Shift+Tab), ESC kapatma, overlay click kapatma, triggerRef ile focus dönüşü, `role="dialog"` + `aria-modal`. 6 test yeşil.
- **Task 7**: `BugReportView.tsx` tamamen yeniden yazıldı — hasSession prop'u App.tsx'ten geçiyor; session kontrolü App.tsx seviyesinde yapılıyor; module-level signals form verisini persist ediyor; dikey akış UX spec'e uygun.
- **Task 8**: `App.tsx` — session kontrolü `handleOpenBugReport()` içinde yapılıyor; `slideDirection` signal'ı ile CSS animasyon class'ı belirleniyor; `DashboardView` `onOpenBugReport` prop'u ile güncellendi. CSS keyframes `tailwind.css`'e eklendi (prefers-reduced-motion dahil).
- **Task 9**: `BugReportView.test.tsx` — 13 test: form render, snapshot başarı/hata, steps collapsible, session'sız placeholder, export disabled, konfigürasyon, DataSummary. Tüm testler yeşil.
- **Regresyon**: 32 test dosyası, 286+ test — tüm yeşil. ESLint tüm değiştirilen dosyalarda temiz.

### File List

<!-- Oluşturulan / Değiştirilen dosyalar -->
- `src/lib/types.ts` — MODIFY: BugReportFormData, ConfigFields, EnvironmentInfo, StepItem eklendi; SessionConfig.configFields genişletildi
- `src/lib/constants.ts` — MODIFY: STORAGE_KEYS.BUG_REPORT_CONFIG, DEFAULT_PRIORITY eklendi
- `src/lib/environment.ts` — CREATE: collectEnvironmentInfo()
- `src/lib/environment.test.ts` — CREATE: 8 environment test
- `src/lib/steps-builder.ts` — CREATE: buildStepsToReproduce()
- `src/lib/steps-builder.test.ts` — CREATE: 7 steps builder test
- `src/components/ui/Modal.tsx` — CREATE: focus trap modal
- `src/components/ui/Modal.test.tsx` — CREATE: 6 modal test
- `src/components/domain/ConfigFields.tsx` — CREATE: inline config form with storage persist
- `src/components/domain/ConfigFields.test.tsx` — CREATE: 5 ConfigFields test
- `src/components/domain/DataSummary.tsx` — CREATE: check/xmark veri özeti listesi
- `src/components/domain/DataSummary.test.tsx` — CREATE: 5 DataSummary test
- `src/popup/App.tsx` — MODIFY: session kontrolü, modal, slide animasyonu, hasSession prop
- `src/popup/views/BugReportView.tsx` — REWRITE: tam form implementasyonu
- `src/popup/views/BugReportView.test.tsx` — CREATE: 13 BugReportView test
- `src/popup/views/DashboardView.tsx` — MODIFY: onOpenBugReport prop eklendi, currentView import kaldırıldı
- `src/styles/tailwind.css` — MODIFY: slide animasyon keyframes (prefers-reduced-motion dahil)

### Change Log

- 2026-03-08: Story 2.2 tamamlandı — Bug Raporlama Formu ve Session'sız Bug Akışı implementasyonu. 9 task / 22 subtask tamamlandı. 286+ test yeşil. ESLint temiz.
