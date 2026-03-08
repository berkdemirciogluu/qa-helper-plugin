# Story 1.4: Popup — Dashboard ve Session Kontrol

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **tester**,
I want **popup'ı açtığımda session durumunu, canlı sayaçları ve veri toggle'larını tek bakışta görebilmeyi**,
So that **extension'ın arka planda ne yaptığını bilip güven duyayım**.

## Acceptance Criteria

1. **Given** tester extension ikonuna tıklar, **When** popup açılır, **Then** Compact Dashboard görünümü yüklenir (< 100ms açılış süresi) **And** popup 400px genişliğinde sabit boyutta görünür.

2. **Given** popup açık ve session pasif, **When** tester dashboard'ı görüntüler, **Then** gri StatusDot + "Pasif" metni gösterilir **And** "Session Başlat" primary butonu görünür **And** sayaçlar "0 XHR · 0 Error · 0 Sayfa" gösterir.

3. **Given** popup açık, **When** tester "Session Başlat" butonuna basar, **Then** service worker'a `START_SESSION` mesajı gönderilir **And** StatusDot yeşile döner + pulse animasyonu başlar + "Aktif" metni gösterilir **And** süre sayacı başlar **And** icon badge yeşil arka plana geçer.

4. **Given** session aktif, **When** arka planda yeni veriler kaydedilir, **Then** LiveCounters (XHR sayısı, Error sayısı, Ziyaret edilen sayfa sayısı) canlı güncellenir.

5. **Given** popup açık, **When** tester veri kaynağı toggle'larını görüntüler, **Then** HAR, Console, DOM, localStorage, sessionStorage toggle'ları gösterilir (varsayılan: hepsi açık) **And** tester istediği kaynağı kapatabilir/açabilir.

6. **Given** popup açık, **When** tester footer'a bakar, **Then** "Tüm veriler cihazınızda" privacy trust indicator'ı Lucide lock ikonu ile gösterilir.

7. **Given** popup açık, **When** keyboard ile navigasyon yapılır, **Then** tüm interactive elementler Tab ile erişilebilir ve focus ring görünür **And** tüm butonlar ve toggle'lar ARIA label'lara sahiptir.

## Tasks / Subtasks

- [x] **Task 1: Foundation UI componentleri (AC: #1, #7)**
  - [x] 1.1 `src/components/ui/Button.tsx` — Button component: `primary`, `secondary`, `ghost`, `danger` variants; `sm`, `md`, `lg` boyutlar; loading state (spinner); disabled; ikon desteği (sol/sağ); `aria-disabled`, `aria-busy`, keyboard focus ring (`focus-visible:outline-2 outline-primary-500 outline-offset-2`)
  - [x] 1.2 `src/components/ui/StatusDot.tsx` — 8px renkli nokta: `active` (yeşil, pulse animasyonu), `inactive` (gri), `error` (kırmızı); `prefers-reduced-motion` desteği ile pulse devre dışı bırakılabilir
  - [x] 1.3 `src/components/ui/Toggle.tsx` — On/off toggle switch: pill şekli (`rounded-full`), 4px padding, kontrollü component (`checked`/`onChange` props); `role="switch"`, `aria-checked`, `aria-label`; disabled state
  - [x] 1.4 `src/components/ui/Badge.tsx` — Durum etiketi/sayı göstergesi: `success`, `warning`, `error`, `info`, `neutral` variants; `sm`/`md` boyutlar; pill şekli (`rounded-full`); 2px 6px padding
  - [x] 1.5 `src/components/ui/Toast.tsx` — Geçici bildirim: `success`, `error`, `warning`, `info` variants; üstten slide-in animasyonu; auto-dismiss (3sn başarı, 5sn hata); X ile kapatılabilir; `aria-live="polite"` (success/info), `aria-live="assertive"` (error)
  - [x] 1.6 `src/components/ui/Card.tsx` — İçerik gruplama container: `default` (border), `elevated` (shadow); 12px padding, 8px border-radius, 8px gap

- [x] **Task 2: Domain componentleri — SessionControl ve LiveCounters (AC: #2, #3, #4)**
  - [x] 2.1 `src/components/domain/SessionControl.tsx` — Session kontrol paneli: StatusDot + durum metni ("Pasif"/"Aktif") + süre sayacı + "Session Başlat"/"Durdur" butonu; `idle` state → gri dot + "Pasif" + "Session Başlat" primary buton; `recording` state → yeşil dot + pulse + "Aktif" + süre sayacı (MM:SS formatı) + "Durdur" ghost buton; `aria-label` her elemente
  - [x] 2.2 `src/components/domain/LiveCounters.tsx` — Canlı sayaç göstergesi: tek satır "N XHR · N Error · N Sayfa" formatında; Badge veya inline counter kullanılır; `role="status"` + `aria-live="polite"` ile screen reader'a bildirilir

- [x] **Task 3: Popup App routing ve DashboardView (AC: #1, #2, #3, #4, #5, #6)**
  - [x] 3.1 `src/popup/App.tsx` — Root component REWRITE: `currentView` signal (`"dashboard" | "bugReport"`), view routing, Toast context provider, popup sabit boyut (`w-[400px] min-h-0 max-h-[600px]`)
  - [x] 3.2 `src/popup/views/DashboardView.tsx` — Compact Dashboard view: Header (QA Helper başlık + Ayarlar linki), SessionControl, LiveCounters, veri kaynağı toggle'ları (CollapsibleSection içinde), "Bug Raporla" primary buton (en altta), footer ("Tüm veriler cihazınızda" + Lucide Lock ikonu)
  - [x] 3.3 Popup açılış akışı: `useEffect` ile aktif tab'ın `tabId`'sini `chrome.tabs.query({ active: true, currentWindow: true })` ile al → `GET_SESSION_STATUS` mesajı gönder → session durumuna göre UI state'i güncelle
  - [x] 3.4 Session başlatma akışı: "Session Başlat" butonuna basınca → aktif tab'ın URL'ini al → `START_SESSION` mesajı gönder → response'a göre UI güncelle (StatusDot, süre sayacı başlat, LiveCounters sıfırla)
  - [x] 3.5 Session durdurma akışı: "Durdur" butonuna basınca → `STOP_SESSION` mesajı gönder → UI güncelle (gri dot, sayaç durdur)
  - [x] 3.6 Canlı sayaç polling: session aktifken `setInterval` ile 2 saniyede bir `GET_SESSION_STATUS` sorgusu → `counters` alanından LiveCounters güncelle; session durursa interval temizle
  - [x] 3.7 Süre sayacı: `startTime` alınır, `requestAnimationFrame` veya 1 saniye interval ile geçen süre hesaplanır ve `MM:SS` formatında gösterilir
  - [x] 3.8 Veri kaynağı toggle'ları: toggle state'leri `session_config` storage key'den okunur/yazılır; varsayılan hepsi açık; değişiklik anında `chrome.storage.local`'a kaydedilir

- [x] **Task 4: Ayarlar linki ve footer (AC: #6)**
  - [x] 4.1 Header'da "Ayarlar" linki: `chrome.runtime.openOptionsPage()` çağrısı ile options page'i yeni tab'da açar; Lucide `settings` ikonu kullanılır
  - [x] 4.2 Footer: `border-t` divider, `padding-top: 8px`, Lucide `lock` ikon (16px) + "Tüm veriler cihazınızda" metni, `text-xs text-neutral-500`

- [x] **Task 5: Testler (AC: tümü)**
  - [x] 5.1 `src/components/ui/Button.test.tsx` — Button component testleri: render, variant class'ları, disabled state, loading state, ikon render, click handler, keyboard (Enter/Space)
  - [x] 5.2 `src/components/ui/StatusDot.test.tsx` — StatusDot component testleri: variant renkleri, pulse animasyon class'ı, reduced-motion class
  - [x] 5.3 `src/components/ui/Toggle.test.tsx` — Toggle component testleri: checked/unchecked durumu, onChange callback, ARIA attributes, disabled, keyboard toggle
  - [x] 5.4 `src/components/domain/SessionControl.test.tsx` — Session kontrol testleri: idle state render, recording state render, buton tıklama callback'leri, süre sayacı formatı
  - [x] 5.5 `src/components/domain/LiveCounters.test.tsx` — LiveCounters testleri: sayaç render, sıfır değerler, güncelleme, ARIA attributes
  - [x] 5.6 `src/popup/views/DashboardView.test.tsx` — Dashboard entegrasyon testleri: session durumuna göre render, toggle'lar, footer render; chrome.runtime.sendMessage mock
  - [x] 5.7 `src/popup/App.test.tsx` — App routing testleri: varsayılan view = dashboard, view geçişi

## Dev Notes

### Kritik Mimari Kısıtlamalar

**Popup Yaşam Döngüsü (EN KRİTİK):**
- Popup kapandığında **tüm state kaybolur** — Preact component'leri unmount olur
- Popup açıldığında **her seferinde** `GET_SESSION_STATUS` ile service worker'dan güncel durumu sorgulamalı
- chrome.storage.local = single source of truth, popup sadece **okuyan + komut gönderen** tarafta
- Session verilerini (XHR, click, console) popup **doğrudan okumaz** — session metadata'daki `counters` alanını kullanır

**Popup Boyutu ve Layout:**
- Chrome popup: sabit boyut `400px` genişlik, max `600px` yükseklik (Chrome limiti)
- `w-[400px]` Tailwind class ile sabit genişlik (fluid değil)
- Dikey scroll doğal — `overflow-y-auto` gerekebilir
- Yatay scroll **asla** olmamalı — `overflow-x-hidden`

**State Management — Preact Signals:**
- `@preact/signals` kullan — hafif, reaktif state management
- Global state yok — DashboardView kendi signal'ları ile çalışır
- Signal örnekleri: `const sessionStatus = signal<SessionStatus>('idle')`, `const counters = signal<SessionMeta['counters']>({...})`
- Boolean signal'lar `is` prefix: `const isLoading = signal(false)`

**Performans Bütçesi (NFR2 — Popup < 100ms):**
- Popup açılış hedefi < 100ms — minimum JS bundle, lazy olmayan import
- `GET_SESSION_STATUS` sorgusu paralel render ile — UI skeleton göster, data gelince güncelle
- Tab sorgusu asenkron: `chrome.tabs.query({ active: true, currentWindow: true })` sonucu bekle
- Canlı sayaç polling 2 saniye interval ile — daha sık gereksiz, daha seyrek güncelleme yavaş hisseder

**Tailwind CSS v4 — Önemli Farklar:**
- Tailwind v4 config dosyası **yoktur** — `tailwind.config.js` yerine CSS `@theme` directive ile özelleştirme yapılır
- Custom renkler `src/styles/tailwind.css` içinde `@theme` bloğunda tanımlıdır
- Kullanılabilir renkler: standart Tailwind palette (slate, gray, red, green, blue, yellow, emerald, etc.)
- Projede custom color token varsa `tailwind.css` dosyasını kontrol et

### Mevcut Service Worker Altyapısı (Dokunulmayacak)

Service worker (Story 1.2-1.3'te tamamlandı) aşağıdaki mesaj action'larını zaten destekliyor:
- `START_SESSION`: `{ tabId, url }` payload → session oluşturur, `session_meta_{tabId}` storage'a yazar, badge'i yeşile çevirir
- `STOP_SESSION`: `{ tabId }` payload → session durumunu "stopped" yapar, badge'i temizler
- `GET_SESSION_STATUS`: `{ tabId }` payload → `SessionMeta | null` döner (counters dahil)

**SessionMeta alanları (lib/types.ts):**
```typescript
interface SessionMeta {
  tabId: number;
  startTime: number;   // Date.now() — süre sayacı için kullanılacak
  url: string;
  status: SessionStatus; // 'idle' | 'recording' | 'stopped'
  counters: {
    clicks: number;        // LiveCounters: "N Sayfa" olarak gösterilecek (navEvents daha doğru olabilir)
    xhrRequests: number;   // LiveCounters: "N XHR"
    consoleErrors: number; // LiveCounters: "N Error"
    navEvents: number;     // Sayfa geçiş sayısı
  };
}
```

**Mesaj Gönderme Pattern'ı (mevcut lib/messaging.ts kullanılmalı):**
```typescript
import { sendMessage } from '@/lib/messaging';
import { MESSAGE_ACTIONS } from '@/lib/constants';
import type { StartSessionPayload, SessionMeta } from '@/lib/types';

// Session başlat
const result = await sendMessage<StartSessionPayload, SessionMeta>({
  action: MESSAGE_ACTIONS.START_SESSION,
  payload: { tabId, url },
});

if (result.success) {
  // result.data → SessionMeta
} else {
  // result.error → string
}
```

**DİKKAT — Tab ID Alma:**
```typescript
// Popup açılışında aktif tab'ın ID'sini al
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const tabId = tab?.id;
const tabUrl = tab?.url ?? '';
```

### Component Tasarım Spesifikasyonları

**Button Component:**
| Variant | Background | Text | Border | Hover |
|---|---|---|---|---|
| `primary` | `bg-blue-600` | `text-white` | — | `hover:bg-blue-700` |
| `secondary` | `bg-white` | `text-gray-700` | `border border-gray-300` | `hover:bg-gray-50` |
| `ghost` | Transparent | `text-gray-600` | — | `hover:bg-gray-100` |
| `danger` | `bg-red-600` | `text-white` | — | `hover:bg-red-700` |

Boyutlar: `sm` 28px height (`h-7 text-xs px-3`), `md` 32px height (`h-8 text-sm px-4`), `lg` 36px height (`h-9 text-sm px-4`)
Border radius: `rounded-md` (6px)
Loading: `aria-busy="true"` + spinner yerine buton metni, `pointer-events-none opacity-70`
Disabled: `opacity-50 cursor-not-allowed`
Focus: `focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2`

**StatusDot Component:**
- 8px × 8px (`w-2 h-2`) + `rounded-full`
- `active`: `bg-emerald-500` + CSS `animate-pulse` (veya custom `@keyframes pulse` 2s infinite)
- `inactive`: `bg-gray-400`
- `error`: `bg-red-500`
- `motion-reduce:animate-none` ile pulse devre dışı bırakılır

**Toggle Component:**
- Track: `w-9 h-5 rounded-full` — off: `bg-gray-300`, on: `bg-blue-600`
- Knob: `w-4 h-4 rounded-full bg-white shadow` — off: `translate-x-0.5`, on: `translate-x-4`
- Transition: `transition-colors duration-150` (track), `transition-transform duration-150` (knob)
- `role="switch"`, `aria-checked={checked}`, `tabIndex={0}`
- Keyboard: Space/Enter ile toggle

**LiveCounters Formatı:**
```
12 XHR · 3 Error · 5 Sayfa
```
- `·` (middle dot) ayırıcı
- Error sayısı 0'dan büyükse kırmızı Badge ile vurgulanır
- `role="status"` container'da, screen reader anlık durumu okur

**Popup Layout (DashboardView):**
```
┌─────────────────────────────────────┐
│ [QA Helper]              [⚙ Ayarlar]│  ← Header
├─────────────────────────────────────┤
│ ● Pasif                             │  ← SessionControl Card
│ [Session Başlat]            00:00   │
├─────────────────────────────────────┤
│ 0 XHR · 0 Error · 0 Sayfa          │  ← LiveCounters
├─────────────────────────────────────┤
│ ▸ Veri Kaynakları                   │  ← CollapsibleSection
│   ✓ HAR  ✓ Console  ✓ DOM          │
│   ✓ localStorage  ✓ sessionStorage  │
├─────────────────────────────────────┤
│ [🐛 Bug Raporla]                    │  ← Primary buton (disabled — Epic 2)
├─────────────────────────────────────┤
│ 🔒 Tüm veriler cihazınızda         │  ← Footer
└─────────────────────────────────────┘
```

### Veri Kaynağı Toggle'ları

Toggle state'leri `session_config` storage key'inde saklanır. Popup açılışında `storageGet('session_config')` ile okunur.

```typescript
interface SessionConfig {
  toggles: {
    har: boolean;      // XHR/Fetch kayıt
    console: boolean;  // Console log kayıt
    dom: boolean;      // DOM snapshot
    localStorage: boolean;
    sessionStorage: boolean;
  };
  // ... diğer config alanları (environment, project vb. — Epic 3'te)
}
```

Varsayılan: tüm toggle'lar `true`. Toggle değiştiğinde `storageSet('session_config', updatedConfig)` ile anında kaydedilir.

**NOT:** Bu story'de toggle'lar UI olarak gösterilecek ve storage'a kaydedilecek, ancak content script'e gönderilmeyecek. Content script bu toggle'ları henüz okumuyor — toggle etkisi Epic 2'de snapshot alırken filtreleme olarak eklenecek.

### "Bug Raporla" Butonu

Bu story'de "Bug Raporla" butonu **gösterilecek ama disabled olacak** — `BugReportView` Epic 2'de implement edilecek. Buton `disabled` state'de, tooltip ile "Yakında" yazılabilir veya hiç tooltip gerekmez (buton text'i yeterli).

Alternatif: Eğer epics dosyasında "Bug Raporla" butonu bu story'nin scope'unda ise, sadece view geçişi yapılır ama `BugReportView` bir placeholder olarak bırakılabilir. **Scope kararı: AC'de "Bug Raporla" butonu var ama BugReportView yok — buton göster, view geçişini hazırla, BugReportView placeholder olsun.**

### Dosyalar Dokunulacaklar

```
src/
├── components/
│   ├── ui/
│   │   ├── Button.tsx             ← CREATE: Foundation button component
│   │   ├── Button.test.tsx        ← CREATE: Button testleri
│   │   ├── StatusDot.tsx          ← CREATE: Durum nokta göstergesi
│   │   ├── StatusDot.test.tsx     ← CREATE: StatusDot testleri
│   │   ├── Toggle.tsx             ← CREATE: Toggle switch component
│   │   ├── Toggle.test.tsx        ← CREATE: Toggle testleri
│   │   ├── Badge.tsx              ← CREATE: Sayı/durum etiketi
│   │   ├── Toast.tsx              ← CREATE: Bildirim component
│   │   ├── Card.tsx               ← CREATE: İçerik gruplama container
│   │   └── .gitkeep              ← DELETE: artık gereksiz
│   └── domain/
│       ├── SessionControl.tsx     ← CREATE: Session başlat/durdur kontrol paneli
│       ├── SessionControl.test.tsx ← CREATE: SessionControl testleri
│       ├── LiveCounters.tsx       ← CREATE: Canlı veri sayaçları
│       ├── LiveCounters.test.tsx  ← CREATE: LiveCounters testleri
│       └── .gitkeep              ← DELETE: artık gereksiz
├── popup/
│   ├── App.tsx                    ← REWRITE: signal-based routing, Toast provider
│   ├── App.test.tsx               ← CREATE: App routing testleri
│   └── views/
│       ├── DashboardView.tsx      ← CREATE: Compact Dashboard — tüm AC'lerin birleşimi
│       ├── DashboardView.test.tsx ← CREATE: Dashboard entegrasyon testleri
│       └── .gitkeep              ← DELETE: artık gereksiz
├── lib/
│   ├── types.ts                   ← MODIFY: SessionConfig interface ekle (toggle state'leri)
│   └── constants.ts               ← MODIFY: STORAGE_KEYS.SESSION_CONFIG zaten var — gerekirse toggle defaults ekle
```

### Naming Convention'lar

| Kapsam | Kural | Örnek |
|---|---|---|
| Component dosyaları | PascalCase.tsx | `Button.tsx`, `SessionControl.tsx`, `DashboardView.tsx` |
| Test dosyaları | PascalCase.test.tsx | `Button.test.tsx`, `DashboardView.test.tsx` |
| Signal değişkenler | camelCase | `sessionStatus`, `isLoading`, `counters` |
| Event handler'lar | handle + Action | `handleStartSession`, `handleToggleChange` |
| CSS class'ları | Tailwind utility | `bg-blue-600 text-white rounded-md` |
| ARIA label'lar | Türkçe | `aria-label="Session başlat"`, `aria-label="XHR kaydı aç/kapat"` |

### Import Sırası

```typescript
// 1. Preact/external kütüphaneler
import { signal, computed } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { Lock, Settings } from 'lucide-preact';

// 2. Components
import { Button } from '@/components/ui/Button';
import { SessionControl } from '@/components/domain/SessionControl';

// 3. Lib/utilities
import { sendMessage } from '@/lib/messaging';
import { MESSAGE_ACTIONS, STORAGE_KEYS } from '@/lib/constants';
import { storageGet, storageSet } from '@/lib/storage';

// 4. Types (type-only)
import type { SessionMeta, SessionConfig } from '@/lib/types';
```

### Önceki Story'den Öğrenilenler (Story 1.3 → 1.4)

1. **Result<T> pattern tutarlılığı:** `sendMessage` zaten `Result<T>` döner — popup'ta da bu pattern ile hata yönetimi yap. `if (result.success)` ile kontrol et, `else` durumunda Toast ile hata göster.

2. **ESLint no-console kuralı:** `console.log` kullanma — gerekiyorsa `console.warn('[Popup]', ...)` kullan. Mevcut `messaging.ts` ve `storage.ts` zaten `console.log`/`console.error` içeriyor, popup'ta ek console gerekmez.

3. **Chrome API mock pattern:** Testlerde `vi.stubGlobal('chrome', {...})` kullanılıyor. Popup testleri için `chrome.tabs.query`, `chrome.runtime.sendMessage`, `chrome.runtime.openOptionsPage`, `chrome.storage.local.get/set` mock'lanmalı.

4. **@testing-library/preact:** Component testleri için `render`, `screen`, `fireEvent`, `waitFor` kullan. `@testing-library/preact` zaten devDependencies'de mevcut.

5. **Code review dersleri (Story 1.3):** Payload validation zorunlu, non-null assertion (`!`) kaçın, `as unknown as R` güvensiz cast kaçın. Tab ID null kontrolü kritik — `tab?.id` undefined olabilir.

6. **npm install:** `--legacy-peer-deps` flag'i gerekiyor. Bu story'de yeni paket eklenmesi beklenmemektedir — tüm bağımlılıklar (preact, @preact/signals, lucide-preact, tailwindcss, @testing-library/preact) zaten mevcut.

7. **Recording state recovery (Story 1.3):** Content script `QUERY_RECORDING_STATE` ile service worker'a sorgu yapıyor. Popup bu mekanizmayı kullanmaz — doğrudan `GET_SESSION_STATUS` kullanır.

8. **SessionMeta.counters.navEvents:** LiveCounters'ta "Sayfa" sayısı olarak `navEvents` gösterilmeli (SPA route değişim sayısı). `clicks` alanı tıklama sayısıdır, sayfa sayısı değil.

### Anti-Pattern'ler (YAPILMAYACAK)

- ❌ `window.localStorage` veya `document.cookie` kullanmak — sadece `chrome.storage.local`
- ❌ Global state/singleton — her popup açılışında fresh state, chrome.storage tek kaynak
- ❌ `any` tipi — `unknown` + type guard tercih et
- ❌ Inline style — sadece Tailwind class'ları kullan
- ❌ `setTimeout` / `setInterval` temizlemeden bırakmak — `useEffect` cleanup fonksiyonunda `clearInterval` yap
- ❌ Emoji kullanmak — Lucide çizgi ikonlar kullan (kurumsal, profesyonel ton)
- ❌ Session verisini (XHR logları, click verisi) doğrudan popup'tan okumak — sadece `session_meta` counters'ı oku
- ❌ Callback-based async — `async/await` kullan
- ❌ `div` + `onClick` → semantic `<button>` kullan
- ❌ Form alanları için `<label>` veya `aria-label` eksik bırakmak
- ❌ `console.log` debug amaçlı bırakmak

### Erişilebilirlik Checklist

- [ ] Tüm butonlar `<button>` element ile, `div` değil
- [ ] Toggle'lar `role="switch"` + `aria-checked` + `aria-label`
- [ ] LiveCounters container `role="status"` + `aria-live="polite"`
- [ ] Focus ring: `focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2`
- [ ] Renk bağımsızlığı: StatusDot yanında her zaman metin label ("Pasif", "Aktif")
- [ ] Heading hiyerarşisi: `h1` → "QA Helper", `h2` yok (popup'ta tek seviye yeterli)
- [ ] `prefers-reduced-motion` desteği: pulse animasyonu `motion-reduce:animate-none`
- [ ] Minimum tıklanabilir alan: 32×32px (popup standardı)
- [ ] Tab sırası DOM sırasına uygun — mantıksal akış: Header → SessionControl → LiveCounters → Toggle'lar → Bug Raporla → Footer

### Lucide Icon Kullanımı

```typescript
import { Lock, Settings, Bug, Play, Square, Activity } from 'lucide-preact';

// Kullanım
<Lock size={16} class="text-gray-400" />
<Settings size={18} class="text-gray-500" />
```

Projede mevcut: `lucide-preact@^0.555.0` — tree-shakeable, sadece import edilen ikonlar bundle'a girer.

### Project Structure Notes

**Mimari Uyum:**
- `popup/App.tsx` → Architecture: "Root component — currentView signal routing" [Source: architecture.md#Project Structure & Boundaries]
- `popup/views/DashboardView.tsx` → Architecture: "Session kontrol + veri özeti" [Source: architecture.md#Project Structure & Boundaries]
- `components/ui/` → Architecture: "Foundation components" [Source: architecture.md#Project Structure & Boundaries]
- `components/domain/` → Architecture: "Domain-specific components" [Source: architecture.md#Project Structure & Boundaries]
- UX spec "Compact Dashboard" yönü seçildi [Source: ux-design-specification.md#Design Direction Decision]
- Popup 400×600px sabit boyut [Source: ux-design-specification.md#Popup Tasarım Stratejisi]
- WCAG 2.1 AA erişilebilirlik hedefi [Source: ux-design-specification.md#Accessibility Strategy]

**Bağımlılık Akışı:**
```
DashboardView.tsx → SessionControl.tsx → Button, StatusDot
                  → LiveCounters.tsx → Badge
                  → Toggle.tsx
                  → sendMessage() → service worker (GET_SESSION_STATUS, START_SESSION, STOP_SESSION)
                  → storageGet/Set() → chrome.storage.local (session_config)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy — Foundation & Domain Components]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Direction Decision — Compact Dashboard]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Popup Tasarım Stratejisi]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility Strategy]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#User Journey Flows — Ana Akış]
- [Source: _bmad-output/implementation-artifacts/1-3-content-script-veri-kayit-motoru.md#Dev Notes]
- [Source: _bmad-output/implementation-artifacts/1-3-content-script-veri-kayit-motoru.md#Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

### Completion Notes List

- Tüm UI foundation componentleri (Button, StatusDot, Toggle, Badge, Toast, Card) oluşturuldu
- Domain componentleri (SessionControl, LiveCounters) implement edildi
- DashboardView: popup açılış, session başlat/durdur, canlı polling, süre sayacı, toggle storage entegrasyonu
- App.tsx sinyal tabanlı routing ile yeniden yazıldı
- `SessionConfig` interface `lib/types.ts`'e eklendi
- Button `disabled` prop tipi açıkça eklendi (Preact JSX HTMLAttributes Omit uyumsuzluğu)
- 13 test dosyası, 154 test — tümü geçti (review sonrası 2 keyboard erişilebilirlik testi eklendi)

### File List

- `src/lib/types.ts` — MODIFY: SessionConfig interface eklendi
- `src/components/ui/Button.tsx` — CREATE
- `src/components/ui/Button.test.tsx` — CREATE
- `src/components/ui/StatusDot.tsx` — CREATE
- `src/components/ui/StatusDot.test.tsx` — CREATE
- `src/components/ui/Toggle.tsx` — CREATE
- `src/components/ui/Toggle.test.tsx` — CREATE
- `src/components/ui/Badge.tsx` — CREATE
- `src/components/ui/Toast.tsx` — CREATE
- `src/components/ui/Card.tsx` — CREATE
- `src/components/domain/SessionControl.tsx` — CREATE
- `src/components/domain/SessionControl.test.tsx` — CREATE
- `src/components/domain/LiveCounters.tsx` — CREATE
- `src/components/domain/LiveCounters.test.tsx` — CREATE
- `src/popup/App.tsx` — REWRITE
- `src/popup/App.test.tsx` — CREATE
- `src/popup/views/DashboardView.tsx` — CREATE
- `src/popup/views/DashboardView.test.tsx` — CREATE
- `src/components/ui/.gitkeep` — DELETE
- `src/components/domain/.gitkeep` — DELETE
- `src/popup/views/.gitkeep` — DELETE

### Senior Developer Review (AI)

**Reviewer:** Berk — 2026-03-08
**Model:** Claude Opus 4.6

**Review Findings (9 bulgu — 3 HIGH, 3 MEDIUM, 3 LOW):**

Tüm bulgular düzeltildi:

1. **[FIXED][HIGH]** `.gitkeep` dosyaları silinmedi → Silindi
2. **[FIXED][HIGH]** TypeScript hatası: `StatusDot.test.tsx` kullanılmayan `screen` import → Kaldırıldı
3. **[FIXED][HIGH]** `handleStopSession` son sayaçları uygulamıyordu → `applySessionMeta(result.data)` eklendi
4. **[FIXED][MEDIUM]** Lock ikon boyutu 14px → 16px (spec uyumu)
5. **[FIXED][MEDIUM]** `Toast.tsx` boş useEffect cleanup → Kaldırıldı, setTimeout cleanup eklendi
6. **[FIXED][MEDIUM]** Button keyboard testleri eksik → 2 erişilebilirlik testi eklendi
7. **[FIXED][LOW]** Footer text rengi `text-gray-500` → `text-neutral-500` (spec uyumu)
8. **[FIXED][LOW]** `startTime.value` stop sonrası null yapılmıyordu → Düzeltildi
9. **[FIXED][LOW]** Toast setTimeout temizlenmiyordu → `activeTimers` Map ile cleanup eklendi

**AC Doğrulama:** 7/7 AC karşılanmış. Tüm testler geçti (154 test).
