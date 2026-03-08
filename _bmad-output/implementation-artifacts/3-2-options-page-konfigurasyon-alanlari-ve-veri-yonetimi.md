# Story 3.2: Options Page — Konfigürasyon Alanları ve Veri Yönetimi

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **tester**,
I want **konfigürasyon alanlarımı (environment, proje, agile team) merkezi olarak yönetebilmeyi ve session verilerimi temizleyebilmeyi**,
So that **ayarlarımı bir kez yapıp her raporda otomatik kullanılmasını sağlayabileyim**.

## Acceptance Criteria

1. **Given** tester "Konfigürasyon" bölümünü seçer, **When** konfigürasyon sayfası gösterilir, **Then** environment, test cycle, agile team, proje alanları FormRow layout'unda gösterilir (label solda, input sağda) **And** mevcut değerler chrome.storage.local'dan yüklenir **And** değişiklikler anında kaydedilir.

2. **Given** tester "Veri Yönetimi" bölümünü seçer, **When** veri yönetimi sayfası gösterilir, **Then** aktif session'ların listesi ve depolama durumu gösterilir **And** "Tüm Verileri Temizle" danger butonu gösterilir.

3. **Given** tester "Tüm Verileri Temizle" butonuna basar, **When** onay modalı gösterilir, **Then** "Bu işlem geri alınamaz. Tüm session verileri silinecek. Devam?" uyarısı gösterilir **And** "Temizle" (danger) ve "İptal" (ghost) butonları sunulur.

4. **Given** tester temizleme onaylar, **When** veriler silinir, **Then** chrome.storage.local'daki tüm session_* key'leri temizlenir **And** başarı toast'ı gösterilir: "Tüm veriler temizlendi" **And** depolama durumu güncellenir.

## Tasks / Subtasks

- [x] **Task 1: Tipler ve sabitler (AC: tümü)**
  - [x] 1.1 `src/lib/types.ts` — MODIFY: Mevcut `SessionConfig` interface'ine `configFields?: ConfigFields` property ekle (Story 2.2 ile paylaşılan tip — zaten mevcuttu)
  - [x] 1.2 `src/lib/types.ts` — MODIFY: `ConfigFields` interface ekle (Story 2.2 tarafından zaten eklenmiş — doğrulandı)
  - [x] 1.3 `src/lib/types.ts` — MODIFY: `StorageUsageInfo` interface ekle (depolama durumu gösterimi için)

- [x] **Task 2: Storage yardımcı fonksiyonlar (AC: #2, #4)**
  - [x] 2.1 `src/lib/storage.ts` — MODIFY: `storageGetAllSessionKeys()` fonksiyonu eklendi
  - [x] 2.2 `src/lib/storage.ts` — MODIFY: `storageClearSessions()` fonksiyonu eklendi — session_config ve jira_credentials korunuyor
  - [x] 2.3 `src/lib/storage.ts` — MODIFY: `storageGetUsage()` fonksiyonu eklendi

- [x] **Task 3: ConfigurationPage implementasyonu (AC: #1)**
  - [x] 3.1 `src/options/pages/ConfigurationPage.tsx` — REWRITE: Placeholder yerine tam implementasyon
  - [x] 3.2 4 alan: environment (Select — development/staging/QA/UAT/production), test cycle (Input), agile team (Input), proje (Input)
  - [x] 3.3 Her alan FormRow layout'unda: label solda, input sağda
  - [x] 3.4 Sayfa açılışında `session_config.configFields` storage'dan okunur → alanlara doldurulur
  - [x] 3.5 Her değişiklikte anında `storageSet` ile kaydet — merge pattern kullanıldı
  - [x] 3.6 `src/options/pages/ConfigurationPage.test.tsx` — CREATE: 7 test — render, storage read/write, value persistence, merge pattern

- [x] **Task 4: DataManagementPage implementasyonu (AC: #2, #3, #4)**
  - [x] 4.1 `src/options/pages/DataManagementPage.tsx` — REWRITE: Placeholder yerine tam implementasyon
  - [x] 4.2 Depolama Durumu bölümü: toplam kullanım + aktif session sayısı
  - [x] 4.3 Session listesi: her aktif session için tabId, başlangıç zamanı, URL, olay sayısı
  - [x] 4.4 "Tüm Verileri Temizle" danger butonu + açıklama
  - [x] 4.5 Onay modalı: "Bu işlem geri alınamaz..." uyarısı + "Temizle" (danger) + "İptal" (ghost)
  - [x] 4.6 Temizleme sonrası: toast gösterilir, session listesi ve depolama durumu güncellenir
  - [x] 4.7 `src/options/pages/DataManagementPage.test.tsx` — CREATE: 10 test — session listesi, temizleme, modal, toast

- [x] **Task 5: Modal component (AC: #3)**
  - [x] 5.1 Story 2.2'de oluşturulan `src/components/ui/Modal.tsx` kullanıldı — zaten mevcut ve tam fonksiyonel
  - [x] 5.2 Modal: overlay + centered content + focus trap + ESC kapatma + overlay click kapatma — doğrulandı

- [x] **Task 6: Input component (AC: #1)**
  - [x] 6.1 `src/components/ui/Input.tsx` — CREATE: Genel input component — label, placeholder, disabled, error state, aria desteği
  - [x] 6.2 Props: `label`, `value`, `onChange`, `placeholder`, `disabled`, `error`, `htmlFor`
  - [x] 6.3 `src/components/ui/Input.test.tsx` — CREATE: 6 test

- [x] **Task 7: Select component (AC: #1)**
  - [x] 7.1 `src/components/ui/Select.tsx` — CREATE: Native select wrapper — label, options, value, onChange
  - [x] 7.2 Props: `label`, `options: {value: string, label: string}[]`, `value`, `onChange`, `htmlFor`
  - [x] 7.3 `src/components/ui/Select.test.tsx` — CREATE: 5 test

- [x] **Task 8: Testler (AC: tümü)**
  - [x] 8.1 Tüm test dosyaları co-located (Task 3-7'deki .test.tsx dosyaları)
  - [x] 8.2 Mevcut testlerde regression olmadığı doğrulandı — 303/303 test geçti

## Dev Notes

### Kritik Mimari Kısıtlamalar

**Options Page Context:**
- Options page Chrome extension tab'ı olarak çalışır — tüm `chrome.*` API'lere erişimi var
- `chrome.storage.local.getBytesInUse()` ile depolama kullanımı sorgulanabilir
- `chrome.storage.local.get(null)` ile TÜM key'ler okunabilir — session key'leri filtrelemek için kullan

**Storage Key Pattern — Session Verilerini Temizleme:**
```typescript
// Silinecek key pattern'ları:
const SESSION_PREFIXES = [
  'session_meta_',    // session_meta_{tabId}
  'session_xhr_',     // session_xhr_{tabId}
  'session_clicks_',  // session_clicks_{tabId}
  'session_console_', // session_console_{tabId}
  'session_nav_',     // session_nav_{tabId}
  'session_snapshot_', // session_snapshot_{tabId}
];

// KORUNACAK key'ler (silinmeyecek):
// - session_config → konfigürasyon alanları ve toggle'lar
// - jira_credentials → Jira bağlantı bilgileri
// - extension_settings → genel ayarlar
// - onboarding_completed → onboarding durumu
```

**DİKKAT — `storageClear()` KULLANILMAMALI:**
- Mevcut `storageClear()` fonksiyonu `chrome.storage.local.clear()` çağırıyor — TÜM verileri siler
- Session temizleme SADECE `session_*_{tabId}` key'lerini silmeli
- Konfigürasyon (`session_config`), Jira credentials ve diğer global ayarlar KORUNMALI

### ConfigurationPage Detaylı Tasarım

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Konfigürasyon Alanları                       │  ← SectionGroup başlık
│ Bug raporlarına otomatik eklenen bağlam      │  ← SectionGroup açıklama
│ bilgileri. Bir kez ayarlayın, her raporda    │
│ kullanılsın.                                 │
├─────────────────────────────────────────────┤
│ Ortam          [staging          ▼]         │  ← FormRow + Select
│ Test Döngüsü   [Sprint 1          ]         │  ← FormRow + Input
│ Agile Takım    [Team Alpha         ]         │  ← FormRow + Input
│ Proje          [e-commerce         ]         │  ← FormRow + Input
└─────────────────────────────────────────────┘
```

**Ortam (Environment) Select Seçenekleri:**
```typescript
const environmentOptions = [
  { value: '', label: 'Seçiniz...' },
  { value: 'development', label: 'Development' },
  { value: 'staging', label: 'Staging' },
  { value: 'qa', label: 'QA' },
  { value: 'uat', label: 'UAT' },
  { value: 'production', label: 'Production' },
];
```

**State management:**
```typescript
// ConfigurationPage signal'ları
const configFields = signal<ConfigFields>({
  environment: '',
  testCycle: '',
  agileTeam: '',
  project: '',
});
const isLoading = signal(true);
```

**Storage okuma/yazma pattern'ı:**
```typescript
// Sayfa açılışında — mevcut config'i oku
useEffect(() => {
  async function load() {
    const result = await storageGet<SessionConfig>(STORAGE_KEYS.SESSION_CONFIG);
    if (result.success && result.data?.configFields) {
      configFields.value = result.data.configFields;
    }
    isLoading.value = false;
  }
  void load();
}, []);

// Alan değişikliğinde — anında kaydet
async function handleFieldChange(field: keyof ConfigFields, value: string) {
  const updated = { ...configFields.value, [field]: value };
  configFields.value = updated;

  // Mevcut config'i oku ve merge et (toggles korunmalı)
  const existing = await storageGet<SessionConfig>(STORAGE_KEYS.SESSION_CONFIG);
  const config: SessionConfig = existing.success && existing.data
    ? { ...existing.data, configFields: updated }
    : { toggles: DEFAULT_TOGGLES, configFields: updated };
  await storageSet(STORAGE_KEYS.SESSION_CONFIG, config);
}
```

### DataManagementPage Detaylı Tasarım

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Depolama Durumu                              │  ← SectionGroup
├─────────────────────────────────────────────┤
│ Toplam kullanım:  1.2 MB                    │
│ Aktif session:    2 adet                     │
│                                              │
│ ┌─ Session Listesi ────────────────────────┐│
│ │ Tab #1234 — app.com (15dk, 23 olay)     ││
│ │ Tab #5678 — dashboard.com (5dk, 8 olay) ││
│ └──────────────────────────────────────────┘│
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Tehlikeli Bölge                              │  ← SectionGroup
├─────────────────────────────────────────────┤
│ Tüm session kayıtlarını siler.              │
│ Konfigürasyon ayarları korunur.             │
│                                              │
│ [🗑 Tüm Verileri Temizle]  ← danger button │
└─────────────────────────────────────────────┘
```

**Depolama kullanımı hesaplama:**
```typescript
async function getStorageUsage(): Promise<{ totalBytes: number; sessionCount: number; sessions: SessionInfo[] }> {
  // Tüm storage key'lerini al
  const allData = await chrome.storage.local.get(null);
  const totalBytes = await chrome.storage.local.getBytesInUse(null);

  // session_meta_* key'lerini bul → aktif session'lar
  const sessions: SessionInfo[] = [];
  for (const [key, value] of Object.entries(allData)) {
    if (key.startsWith('session_meta_')) {
      const meta = value as SessionMeta;
      const tabId = parseInt(key.replace('session_meta_', ''), 10);
      sessions.push({
        tabId,
        url: meta.url,
        startTime: meta.startTime,
        status: meta.status,
        eventCount: meta.counters.clicks + meta.counters.xhrRequests + meta.counters.consoleErrors + meta.counters.navEvents,
      });
    }
  }

  return { totalBytes, sessionCount: sessions.length, sessions };
}
```

**Byte formatı:**
```typescript
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

**Session temizleme — SADECE session key'lerini sil:**
```typescript
async function clearAllSessions(): Promise<Result<void>> {
  try {
    const allData = await chrome.storage.local.get(null);
    const keysToRemove: string[] = [];

    const SESSION_PREFIXES = [
      'session_meta_', 'session_xhr_', 'session_clicks_',
      'session_console_', 'session_nav_', 'session_snapshot_',
    ];

    for (const key of Object.keys(allData)) {
      if (SESSION_PREFIXES.some(prefix => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
    }

    return { success: true, data: undefined };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[Storage]', error);
    return { success: false, error };
  }
}
```

### Onay Modalı (Veri Temizleme)

**Modal içeriği:**
```
┌─────────────────────────────────┐
│ ⚠ Verileri Temizle              │  ← AlertTriangle ikonu + başlık
│                                  │
│ Bu işlem geri alınamaz.          │
│ Tüm session verileri            │
│ (XHR kayıtları, tıklama         │
│ akışları, console logları)       │
│ silinecek.                       │
│                                  │
│ Konfigürasyon ayarları ve        │
│ Jira bağlantısı korunur.        │
│                                  │
│ [İptal]          [Temizle]       │  ← ghost + danger
└─────────────────────────────────┘
```

### Mevcut Placeholder Dosyalar (Yeniden Yazılacak)

**ConfigurationPage.tsx (mevcut):**
```typescript
export function ConfigurationPage() {
  return (
    <SectionGroup title="Konfigürasyon">
      <p class="text-sm text-gray-500">
        Konfigürasyon ayarları yakında eklenecek.
      </p>
    </SectionGroup>
  );
}
```

**DataManagementPage.tsx (mevcut):**
```typescript
export function DataManagementPage() {
  return (
    <SectionGroup title="Veri Yönetimi">
      <p class="text-sm text-gray-500">
        Veri yönetimi ayarları yakında eklenecek.
      </p>
    </SectionGroup>
  );
}
```

### Mevcut Altyapı (Kullanılacak Mevcut Componentler)

- `SectionGroup` — `src/components/layout/SectionGroup.tsx` — bölüm gruplandırma ✓
- `FormRow` — `src/components/layout/FormRow.tsx` — label + control yatay layout ✓
- `Button` — `src/components/ui/Button.tsx` — primary, secondary, ghost, danger variant'lar ✓
- `Toggle` — `src/components/ui/Toggle.tsx` — switch toggle ✓
- `Card` — `src/components/ui/Card.tsx` — içerik container ✓
- `Toast` — `src/components/ui/Toast.tsx` — bildirim mesajları ✓
- `storageGet/Set/Remove` — `src/lib/storage.ts` ✓
- `STORAGE_KEYS` — `src/lib/constants.ts` ✓

**Oluşturulacak yeni component'ler:**
- `Input` — `src/components/ui/Input.tsx` — metin girişi component'i (mevcut değil)
- `Select` — `src/components/ui/Select.tsx` — dropdown component'i (mevcut değil)
- `Modal` — `src/components/ui/Modal.tsx` — onay modalı (Story 2.2 ile paylaşılan, hangisi önce yapılırsa o oluşturur)

### Input Component Spesifikasyonu

```typescript
interface InputProps extends Omit<JSX.HTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  htmlFor?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}
```

**Styling:**
```
Default:  border-gray-200 bg-white text-gray-700
Focus:    border-blue-500 ring-1 ring-blue-500
Error:    border-red-500
Disabled: bg-gray-50 text-gray-400 cursor-not-allowed
```

**Options page minimum tıklanabilir alan:** 44×44px (input height: min-h-[44px])

### Select Component Spesifikasyonu

```typescript
interface SelectProps extends Omit<JSX.HTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  htmlFor?: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}
```

**Styling:** Native `<select>` element — Tailwind ile stillendirilmiş:
```
border border-gray-200 rounded-md px-3 min-h-[44px] bg-white text-gray-700
focus:border-blue-500 focus:ring-1 focus:ring-blue-500
```

### Dosyalar

```
src/
├── lib/
│   ├── types.ts                     ← MODIFY: ConfigFields, StorageUsageInfo, SessionConfig.configFields
│   ├── storage.ts                   ← MODIFY: storageGetAllSessionKeys, storageClearSessions, storageGetUsage
│   └── storage.test.ts              ← MODIFY: storageGetAllSessionKeys, storageClearSessions, storageGetUsage testleri
├── components/
│   └── ui/
│       ├── Input.tsx                ← CREATE: Metin girişi component
│       ├── Input.test.tsx           ← CREATE: Input testleri
│       ├── Select.tsx               ← CREATE: Dropdown component
│       ├── Select.test.tsx          ← CREATE: Select testleri
│       ├── Modal.tsx                ← CREATE (veya Story 2.2'den mevcut): Modal component
│       └── Modal.test.tsx           ← CREATE (veya mevcut): Modal testleri
├── options/
│   ├── App.test.tsx                 ← MODIFY: Konfigürasyon ve Veri Yönetimi sayfa geçiş testleri
│   └── pages/
│       ├── ConfigurationPage.tsx    ← REWRITE: Konfigürasyon alanları
│       ├── ConfigurationPage.test.tsx ← CREATE: Konfigürasyon testleri
│       ├── DataManagementPage.tsx   ← REWRITE: Depolama durumu + temizleme
│       └── DataManagementPage.test.tsx ← CREATE: Veri yönetimi testleri
```

### Naming Convention'lar

| Kapsam | Kural | Örnek |
|---|---|---|
| Options sayfaları | PascalCase + "Page" suffix | `ConfigurationPage.tsx`, `DataManagementPage.tsx` |
| UI component'ler | PascalCase.tsx | `Input.tsx`, `Select.tsx`, `Modal.tsx` |
| Interface'ler | PascalCase | `ConfigFields`, `StorageUsageInfo` |
| Signal'lar | camelCase | `configFields`, `isLoading`, `storageUsage` |
| Event handler'lar | handle + Action | `handleFieldChange`, `handleClearData`, `handleConfirmClear` |
| Yardımcı fonksiyonlar | camelCase | `formatBytes`, `clearAllSessions`, `getStorageUsage` |
| Console prefix | [ModuleName] | `[Configuration]`, `[DataManagement]`, `[Storage]` |

### Import Sırası

```typescript
// 1. Preact/external
import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { AlertTriangle, Trash2, HardDrive } from 'lucide-preact';

// 2. Components
import { SectionGroup } from '@/components/layout/SectionGroup';
import { FormRow } from '@/components/layout/FormRow';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';

// 3. Lib
import { storageGet, storageSet } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';

// 4. Types
import type { SessionConfig, ConfigFields } from '@/lib/types';
```

### Önceki Story'den Öğrenilenler (Story 3.1 → 3.2)

1. **SectionGroup + FormRow pattern:** Story 3.1'de GeneralSettingsPage'de kullanıldı — aynı pattern ConfigurationPage'de de kullanılacak. `<SectionGroup title="..." description="...">` → `<FormRow label="..." htmlFor="...">` → control.

2. **Storage merge pattern:** GeneralSettingsPage'de toggle değişikliğinde mevcut config okunup merge ediliyor — ConfigurationPage'de de aynı pattern: `{ ...existingConfig, configFields: updated }`. **DİKKAT: Story 3.1'deki H1 bug'ı (veri kaybı) düzeltildi — config merge yaparken mevcut config'i her zaman oku ve toggles'ı koru.**

3. **Preact signals:** `signal<ConfigFields>(...)` ile state yönetimi. `useEffect` ile sayfa açılışında storage'dan oku.

4. **Chrome API mock pattern:** `vi.stubGlobal('chrome', {...})`. `chrome.storage.local.get`, `chrome.storage.local.set`, `chrome.storage.local.remove`, `chrome.storage.local.getBytesInUse` mock'lanmalı.

5. **Options page 44×44px min tıklanabilir alan:** Input ve Select component'lerinde `min-h-[44px]` kullan.

6. **Tailwind v4:** `@theme` directive kullanılıyor. Custom breakpoint gerekmez bu story için.

7. **`--legacy-peer-deps` flag'i:** npm install'da gerekli. Bu story'de **yeni paket eklenmesi beklenmemektedir**.

8. **Semantic HTML:** `<section>`, `<label>`, `<input>`, `<select>` kullan. `div` + `onClick` kaçın.

9. **Focus ring standardı:** `focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2`

### Anti-Pattern'ler (YAPILMAYACAK)

- ❌ `storageClear()` ile tüm veriyi silmek — sadece session key'lerini sil, config ve credentials koru
- ❌ Custom dropdown component yazmak — native `<select>` yeterli
- ❌ Session listesinde tab'a bağlanmaya çalışmak — sadece bilgi göster (tab artık açık olmayabilir)
- ❌ Debounce ile storage yazma — konfigürasyon alanları az sayıda, anında kaydet
- ❌ Form state'ini `useState` ile yönetmek — `signal` kullan (tutarlılık için)
- ❌ `any` tipi kullanmak — `unknown` + type guard
- ❌ Inline style — sadece Tailwind class'ları
- ❌ Emoji kullanmak — sadece Lucide çizgi ikonlar
- ❌ `console.log` debug amaçlı bırakmak
- ❌ `getBytesInUse` sonucunu cache'lemek — her sayfa açılışında taze veri al
- ❌ Modal'ı ayrı bir route olarak yönetmek — signal ile açılıp kapanan overlay

### Erişilebilirlik Checklist

- [ ] Input alanları: `<label>` + `htmlFor` eşleşmesi, `aria-describedby` (hata mesajı varsa)
- [ ] Select: `<label>` + `<select>` bağlantısı
- [ ] "Tüm Verileri Temizle" butonu: `aria-label="Tüm session verilerini temizle"`
- [ ] Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap
- [ ] Modal kapanışta focus tetikleyiciye dönüş
- [ ] Session listesi: semantic `<ul>` + `<li>` veya `<table>` yapısı
- [ ] Depolama durumu: `aria-live="polite"` — temizleme sonrası güncelleme duyurulur
- [ ] Tüm interactive element'ler: focus ring (`focus-visible:outline-2 focus-visible:outline-blue-500`)
- [ ] Minimum tıklanabilir alan: 44×44px (options page standardı)
- [ ] Renk kontrastı: WCAG AA minimum (4.5:1)

### Project Structure Notes

**Mimari Uyum:**
- `options/pages/ConfigurationPage.tsx` → Architecture: "EnvironmentConfig.tsx — Environment/project/team konfigürasyonu" [Source: architecture.md#Complete Project Directory Structure]
- `options/pages/DataManagementPage.tsx` → Architecture: "DataManagementPage.tsx — Veri temizleme, depolama durumu" [Source: architecture.md#Complete Project Directory Structure]
- Storage key pattern → Architecture: "session_config — tüm tab'larda ortak" [Source: architecture.md#Data Architecture]
- Session temizleme → Architecture: "session_meta_{tabId}, session_xhr_{tabId}..." key pattern [Source: architecture.md#Data Architecture]

**NOT:** Architecture dokümanında `components/domain/EnvironmentConfig.tsx` tanımlı ama bu story'de ConfigurationPage doğrudan FormRow + Input/Select kullanacak — ayrı bir EnvironmentConfig component'i gereksiz (options page'de sadece bu sayfada kullanılacak). Popup'taki inline konfigürasyon (Story 2.2) için ayrı bir `ConfigFields.tsx` component'i oluşturulacak.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — Key Yapısı]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — State Management]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Options Page Breakpoint Strategy]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Form Layout Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility Strategy]
- [Source: _bmad-output/implementation-artifacts/3-1-options-page-layout-navigasyon-ve-genel-ayarlar.md#Dev Notes]
- [Source: _bmad-output/implementation-artifacts/3-1-options-page-layout-navigasyon-ve-genel-ayarlar.md#Completion Notes]

## Change Log

- **2026-03-08:** Story 3.2 implementasyonu tamamlandı — ConfigurationPage (konfigürasyon alanları), DataManagementPage (veri yönetimi + temizleme), Input/Select UI componentleri, storage yardımcı fonksiyonları eklendi. 303/303 test geçti, 0 regression.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- App.test.tsx güncellendi: Eski placeholder metin assertions'ları yeni component başlıklarıyla değiştirildi (Konfigürasyon Alanları, Depolama Durumu). `getBytesInUse` mock'u eklendi.

### Completion Notes List

- **Task 1:** `StorageUsageInfo` interface eklendi. `ConfigFields` ve `SessionConfig.configFields?` Story 2.2 tarafından zaten eklenmişti — doğrulandı.
- **Task 2:** `storageGetAllSessionKeys()`, `storageClearSessions()`, `storageGetUsage()` fonksiyonları `storage.ts`'e eklendi. SESSION_PREFIXES sabiti ile session key'leri filtreleniyor, config/credentials korunuyor. 9 yeni test eklendi.
- **Task 3:** ConfigurationPage — SectionGroup + FormRow layout, 4 alan (environment Select, testCycle/agileTeam/project Input), signal-based state, anında storage kaydetme (merge pattern). 7 test.
- **Task 4:** DataManagementPage — Depolama durumu (totalBytes, sessionCount, session listesi), "Tüm Verileri Temizle" danger butonu, onay modalı (AlertTriangle uyarı, İptal/Temizle butonları), toast bildirimi. 10 test.
- **Task 5:** Modal.tsx Story 2.2 tarafından zaten oluşturulmuştu — focus trap, ESC/overlay close, aria-modal doğrulandı.
- **Task 6:** Input component — label/htmlFor bağlantısı, error state (aria-invalid, aria-describedby), disabled state, 44px min height. 6 test.
- **Task 7:** Select component — native select wrapper, label bağlantısı, options rendering, disabled state. 5 test.
- **Task 8:** Tüm 303 test geçti. App.test.tsx regression düzeltildi (eski placeholder assertions güncellendi).

### File List

**Yeni dosyalar:**
- `src/components/ui/Input.tsx` — Genel metin girişi UI component
- `src/components/ui/Input.test.tsx` — Input testleri (6 test)
- `src/components/ui/Select.tsx` — Native select dropdown UI component
- `src/components/ui/Select.test.tsx` — Select testleri (5 test)
- `src/options/pages/ConfigurationPage.test.tsx` — ConfigurationPage testleri (7 test)
- `src/options/pages/DataManagementPage.test.tsx` — DataManagementPage testleri (10 test)

**Değiştirilen dosyalar:**
- `src/lib/types.ts` — StorageUsageInfo interface eklendi
- `src/lib/storage.ts` — storageGetAllSessionKeys, storageClearSessions, storageGetUsage fonksiyonları eklendi
- `src/lib/storage.test.ts` — Yeni storage fonksiyonları için 9 test eklendi
- `src/options/pages/ConfigurationPage.tsx` — Placeholder yerine tam implementasyon (REWRITE)
- `src/options/pages/DataManagementPage.tsx` — Placeholder yerine tam implementasyon (REWRITE)
- `src/options/App.test.tsx` — Eski placeholder assertion'ları güncellendi, getBytesInUse mock eklendi
