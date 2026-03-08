# Story 3.1: Options Page — Layout, Navigasyon ve Genel Ayarlar

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **tester**,
I want **options page üzerinden extension ayarlarımı merkezi bir sayfadan yönetebilmeyi**,
So that **Jira, konfigürasyon ve veri yönetimi gibi detaylı ayarlara tek yerden erişebileyim**.

## Acceptance Criteria

1. **Given** tester popup'ta "Ayarlar" linkine tıklar, **When** `chrome.runtime.openOptionsPage()` çağrılır, **Then** yeni bir tab'da options page açılır.

2. **Given** options page açılmış, **When** sayfa yüklenir, **Then** sol tarafta SidebarNav görünür: Genel, Konfigürasyon, Veri Yönetimi, Hakkında bölümleri listelenir **And** aktif bölüm vurgulu gösterilir **And** sağ tarafta seçili bölümün içeriği gösterilir.

3. **Given** options page ekran genişliği < 768px, **When** responsive layout uygulanır, **Then** sidebar hamburger menüye dönüşür ve tek kolon layout gösterilir.

4. **Given** options page ekran genişliği 768-1199px, **When** standard layout uygulanır, **Then** sidebar (200px) + content area yan yana gösterilir.

5. **Given** options page ekran genişliği >= 1200px, **When** wide layout uygulanır, **Then** sidebar (240px) + content area (max-width 800px, ortada) gösterilir.

6. **Given** tester "Genel" bölümünü seçer, **When** genel ayarlar sayfası gösterilir, **Then** veri kaynağı toggle'ları (HAR, Console, DOM, localStorage, sessionStorage) gösterilir **And** toggle değişiklikleri anında chrome.storage.local'a kaydedilir.

7. **Given** tester "Hakkında" bölümünü seçer, **When** hakkında sayfası gösterilir, **Then** extension versiyonu, geliştirici bilgisi ve lisans durumu gösterilir.

8. **Given** options page açık, **When** keyboard ile navigasyon yapılır, **Then** sidebar ve form alanları Tab ile erişilebilir, focus ring görünür, semantic HTML kullanılır.

## Tasks / Subtasks

- [x] **Task 1: Layout componentleri (AC: #2, #3, #4, #5, #8)**
  - [x] 1.1 `src/components/layout/SidebarNav.tsx` — CREATE: Sol navigasyon menüsü — dikey link listesi `[Icon] [Label]`, aktif item vurgulu, responsive (768px altında hamburger), `<nav>` + `role="navigation"` + `aria-label="Ayarlar menüsü"`
  - [x] 1.2 `src/components/layout/SidebarNav.test.tsx` — CREATE: SidebarNav testleri — navigasyon, aktif item, responsive, keyboard
  - [x] 1.3 `src/components/layout/SectionGroup.tsx` — CREATE: Ayar bölümü gruplandırma — `[Section Title] [Description?] [Children]`, `<section>` + `aria-labelledby`
  - [x] 1.4 `src/components/layout/FormRow.tsx` — CREATE: Label + Control yatay layout — label solda (sabit genişlik), control sağda (esnek), responsive: 768px altında dikey stack
  - [x] 1.5 `src/components/layout/FormRow.test.tsx` — CREATE: FormRow testleri — layout, responsive, label association

- [x] **Task 2: Options page App.tsx ve routing (AC: #1, #2)**
  - [x] 2.1 `src/options/App.tsx` — REWRITE: Signal-based sayfa routing (`currentPage` signal), SidebarNav + content area layout, responsive container
  - [x] 2.2 Routing: `currentPage` signal — `"general" | "configuration" | "data-management" | "about"`, varsayılan: `"general"`
  - [x] 2.3 Responsive layout container: Tailwind `md:` ve `xl:` breakpoint'ler ile 3-tier layout

- [x] **Task 3: Genel Ayarlar sayfası (AC: #6)**
  - [x] 3.1 `src/options/pages/GeneralSettingsPage.tsx` — CREATE: Veri kaynağı toggle'ları (HAR, Console, DOM, localStorage, sessionStorage) + SectionGroup layout
  - [x] 3.2 Toggle state: `session_config` storage key'inden oku, değişiklik anında kaydet (mevcut `SessionConfig.toggles` interface kullanılacak)
  - [x] 3.3 `src/options/pages/GeneralSettingsPage.test.tsx` — CREATE: Genel ayarlar testleri — toggle render, storage entegrasyonu

- [x] **Task 4: Hakkında sayfası (AC: #7)**
  - [x] 4.1 `src/options/pages/AboutPage.tsx` — CREATE: Extension versiyonu (`chrome.runtime.getManifest().version`), geliştirici bilgisi, lisans durumu placeholder
  - [x] 4.2 "Kurulum sihirbazını tekrar aç" linki — placeholder (Story 3.3'te aktif olacak)

- [x] **Task 5: Placeholder sayfalar (AC: #2)**
  - [x] 5.1 `src/options/pages/ConfigurationPage.tsx` — CREATE: Placeholder — "Konfigürasyon ayarları yakında" metni (Story 3.2'de implement edilecek)
  - [x] 5.2 `src/options/pages/DataManagementPage.tsx` — CREATE: Placeholder — "Veri yönetimi yakında" metni (Story 3.2'de implement edilecek)

- [x] **Task 6: Popup Ayarlar linki doğrulama (AC: #1)**
  - [x] 6.1 Popup DashboardView'daki "Ayarlar" linkinin `chrome.runtime.openOptionsPage()` çağrısını doğrula (Story 1.4'te zaten implement edildi — sadece çalıştığını doğrula)

- [x] **Task 7: Testler (AC: tümü)**
  - [x] 7.1 `src/options/App.test.tsx` — CREATE: Options page routing testleri — varsayılan sayfa, navigasyon, responsive layout
  - [x] 7.2 Tüm test dosyaları co-located (Task 1-5'teki .test.tsx dosyaları)

## Dev Notes

### Kritik Mimari Kısıtlamalar

**Options Page Context:**
- Options page Chrome extension tab'ı olarak çalışır — tüm `chrome.*` API'lere erişimi var
- Popup'tan bağımsız lifecycle — tab açık olduğu sürece state korunur (popup gibi kapanmaz)
- `chrome.runtime.openOptionsPage()` ile açılır — manifest.json'daki `options_page` tanımı kullanılır
- Mevcut manifest: `"options_page": "options/index.html"` — değişiklik gerekmez

**Responsive Layout Stratejisi (Desktop-First):**
- Options page genellikle masaüstünde açılır — desktop-first yaklaşım
- 3 breakpoint: `<768px` (compact), `768-1199px` (standard), `>=1200px` (wide)
- Tailwind breakpoint'leri: `md:` (768px), `xl:` (1280px — en yakın Tailwind breakpoint, 1200px yerine kullanılacak)

**NOT:** Tailwind v4'te custom breakpoint tanımı `@theme` bloğu ile yapılır. Tam 1200px isteniyorsa:
```css
@theme {
  --breakpoint-lg-custom: 1200px;
}
```
Ancak Tailwind'in mevcut `xl:` (1280px) breakpoint'i yeterince yakın — UX spec'teki 1200px'den 80px farkla pragmatik bir tercih. Eğer tam uyum istenirse custom breakpoint eklenebilir.

**State Management:**
- Options page'de **Preact Signals** kullanılacak — popup ile aynı pattern
- `currentPage` signal ile sayfa routing
- Form state'leri direkt `chrome.storage.local`'dan okunur/yazılır — ara state gereksiz
- `storageGet`/`storageSet` wrapper kullanılacak (mevcut `lib/storage.ts`)

### Mevcut Altyapı (Kullanılacak Mevcut Componentler)

**Popup'ta oluşturulan ve options page'de yeniden kullanılacak componentler:**
- `src/components/ui/Button.tsx` — Butonlar (primary, secondary, ghost, danger)
- `src/components/ui/Toggle.tsx` — Veri kaynağı toggle'ları (`role="switch"`, `aria-checked`)
- `src/components/ui/Card.tsx` — İçerik gruplama container'ı
- `src/components/ui/Toast.tsx` — Bildirim mesajları
- `src/components/ui/Badge.tsx` — Durum etiketleri

**Mevcut options/ yapısı:**
```
src/options/
├── index.html   # Entry HTML — mevcut
├── main.tsx     # Preact mount point — mevcut
└── App.tsx      # Root component — placeholder (yeniden yazılacak)
```

**Mevcut options App.tsx (placeholder):**
```typescript
export function App() {
  return (
    <div class="min-h-screen bg-white">
      <h1 class="text-xl font-semibold p-6">QA Helper Ayarları</h1>
    </div>
  );
}
```

### Layout Component Spesifikasyonları

**SidebarNav Component:**
```
Breakpoint < 768px:
┌─────────────────────────────┐
│ [☰] QA Helper Ayarları       │  ← Hamburger + başlık
├─────────────────────────────┤
│ (Hamburger açık → overlay)   │
│ ┌───────────────┐           │
│ │ ⚙ Genel       │ ← aktif  │
│ │ 📋 Konfigüra. │           │
│ │ 🗄 Veri Yön.  │           │
│ │ ℹ Hakkında    │           │
│ └───────────────┘           │
│ İçerik (tam genişlik)       │
└─────────────────────────────┘

Breakpoint 768-1199px:
┌──────────────┬──────────────────────────────┐
│ ⚙ Genel      │                              │
│ 📋 Konfig.   │  İçerik Alanı                │
│ 🗄 Veri Yön. │  (kalan genişlik)            │
│ ℹ Hakkında   │                              │
│              │                              │
│  200px       │                              │
└──────────────┴──────────────────────────────┘

Breakpoint >= 1200px (xl):
┌───────────────┬──────────────────────────────────────┐
│ ⚙ Genel       │                                      │
│ 📋 Konfig.    │  İçerik Alanı                        │
│ 🗄 Veri Yön.  │  (max-width: 800px, margin: auto)    │
│ ℹ Hakkında    │                                      │
│               │                                      │
│  240px        │                                      │
└───────────────┴──────────────────────────────────────┘
```

**SidebarNav Props:**
```typescript
interface SidebarNavProps {
  items: Array<{
    key: string;
    label: string;
    icon: ComponentType<LucideProps>;
  }>;
  activeKey: string;
  onSelect: (key: string) => void;
}
```

**SidebarNav İkon Eşleşmesi (Lucide ikonları):**
- Genel: `Settings` ikonu
- Konfigürasyon: `ClipboardList` ikonu
- Veri Yönetimi: `Database` ikonu
- Hakkında: `Info` ikonu

**Aktif Item Stili:**
- Aktif: `bg-blue-50 text-blue-700 border-l-2 border-blue-600 font-medium`
- Pasif: `text-gray-600 hover:bg-gray-50 hover:text-gray-900`

**SectionGroup Component:**
```typescript
interface SectionGroupProps {
  title: string;
  description?: string;
  children: ComponentChildren;
}
```
Render: `<section>` + `<h2>` başlık + opsiyonel `<p>` açıklama + children

**FormRow Component:**
```typescript
interface FormRowProps {
  label: string;
  htmlFor?: string;
  description?: string;
  children: ComponentChildren;
}
```

Layout:
- `>=768px`: Yatay — label solda (160px sabit), control sağda (esnek)
- `<768px`: Dikey — label üstte, control altta
- `<label>` ve control arasında `htmlFor`/`id` bağlantısı

### Genel Ayarlar Sayfası

**Veri Kaynağı Toggle'ları:**
- Popup DashboardView'daki toggle'larla **aynı storage key'i** kullanır: `session_config`
- `SessionConfig.toggles` interface'i zaten tanımlı (`lib/types.ts`)
- Toggle değişikliğinde `storageSet(STORAGE_KEYS.SESSION_CONFIG, updatedConfig)` ile anında kaydet
- Varsayılan: tüm toggle'lar `true`

**Toggle Listesi:**
| Toggle | Label | Açıklama |
|---|---|---|
| har | XHR/Fetch Kaydı | Ağ isteklerini (XHR ve Fetch) kaydeder |
| console | Console Logları | Console log, warn ve error mesajlarını kaydeder |
| dom | DOM Snapshot | Bug raporlama anında sayfanın DOM'unu yakalar |
| localStorage | localStorage | localStorage içeriğini bug raporuna dahil eder |
| sessionStorage | sessionStorage | sessionStorage içeriğini bug raporuna dahil eder |

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Veri Kaynakları                             │  ← SectionGroup başlık
│ Bug raporlarına dahil edilecek veri türleri  │  ← SectionGroup açıklama
├─────────────────────────────────────────────┤
│ XHR/Fetch Kaydı               [====]       │  ← FormRow + Toggle
│ Console Logları                [====]       │
│ DOM Snapshot                   [====]       │
│ localStorage                   [====]       │
│ sessionStorage                 [====]       │
└─────────────────────────────────────────────┘
```

### Hakkında Sayfası

```
┌─────────────────────────────────────────────┐
│ Hakkında                                    │  ← SectionGroup
├─────────────────────────────────────────────┤
│ QA Helper                                   │
│ Versiyon: 0.1.0                             │  ← chrome.runtime.getManifest().version
│                                             │
│ Manuel test süreçlerinde bug raporlama ve   │
│ veri toplama aracı.                         │
├─────────────────────────────────────────────┤
│ Lisans                                      │  ← SectionGroup
├─────────────────────────────────────────────┤
│ Durum: Ücretsiz (Phase 2'de lisans eklenecek)│
├─────────────────────────────────────────────┤
│ [Kurulum sihirbazını tekrar aç] (link)      │  ← Story 3.3'te aktif
└─────────────────────────────────────────────┘
```

### Dosyalar

```
src/
├── components/
│   └── layout/                          ← CREATE: Yeni klasör
│       ├── SidebarNav.tsx               ← CREATE: Sol navigasyon menüsü
│       ├── SidebarNav.test.tsx          ← CREATE: SidebarNav testleri
│       ├── SectionGroup.tsx             ← CREATE: Ayar bölümü gruplandırma
│       ├── FormRow.tsx                  ← CREATE: Label + Control yatay layout
│       └── FormRow.test.tsx             ← CREATE: FormRow testleri
├── options/
│   ├── App.tsx                          ← REWRITE: Signal routing + responsive layout
│   ├── App.test.tsx                     ← CREATE: Options page routing testleri
│   └── pages/                           ← CREATE: Yeni klasör
│       ├── GeneralSettingsPage.tsx       ← CREATE: Veri kaynağı toggle'ları
│       ├── GeneralSettingsPage.test.tsx  ← CREATE: Genel ayarlar testleri
│       ├── ConfigurationPage.tsx         ← CREATE: Placeholder (Story 3.2)
│       ├── DataManagementPage.tsx        ← CREATE: Placeholder (Story 3.2)
│       └── AboutPage.tsx                ← CREATE: Versiyon, lisans, sihirbaz linki
└── styles/
    └── tailwind.css                     ← MODIFY (opsiyonel): Custom breakpoint ekle
```

### Naming Convention'lar

| Kapsam | Kural | Örnek |
|---|---|---|
| Layout componentleri | PascalCase.tsx | `SidebarNav.tsx`, `SectionGroup.tsx`, `FormRow.tsx` |
| Options sayfaları | PascalCase + "Page" suffix | `GeneralSettingsPage.tsx`, `AboutPage.tsx` |
| Signal değişkenler | camelCase | `currentPage`, `isMenuOpen` |
| Event handler'lar | handle + Action | `handlePageSelect`, `handleToggleChange` |
| CSS class'ları | Tailwind utility + responsive prefix | `md:flex md:w-[200px] xl:w-[240px]` |
| ARIA label'lar | Türkçe | `aria-label="Ayarlar menüsü"`, `aria-label="XHR kaydı"` |

### Import Sırası

```typescript
// 1. Preact/external
import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { Settings, ClipboardList, Database, Info, Menu, X } from 'lucide-preact';

// 2. Components
import { SidebarNav } from '@/components/layout/SidebarNav';
import { SectionGroup } from '@/components/layout/SectionGroup';
import { FormRow } from '@/components/layout/FormRow';
import { Toggle } from '@/components/ui/Toggle';

// 3. Lib
import { storageGet, storageSet } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';

// 4. Types
import type { SessionConfig } from '@/lib/types';
```

### Önceki Story'den Öğrenilenler (Story 1.4 → 3.1)

1. **Toggle component kullanımı:** Popup'ta toggle'lar zaten çalışıyor. Options page'de **aynı `SessionConfig.toggles` interface'ini** ve **aynı storage key'ini** kullan. State sync doğal olarak olur — her iki UI da `session_config` key'ini okur/yazar.

2. **Tailwind v4 config:** `tailwind.config.js` **yoktur** — Tailwind v4 CSS `@theme` directive kullanır. Custom breakpoint gerekiyorsa `src/styles/tailwind.css` içinde `@theme` bloğuna ekle.

3. **Chrome API mock pattern:** `vi.stubGlobal('chrome', {...})`. Options page testleri için `chrome.runtime.getManifest`, `chrome.runtime.openOptionsPage`, `chrome.storage.local.get/set` mock'lanmalı.

4. **Preact signals:** `signal<string>('general')` ile sayfa routing. Signal değişikliğinde component otomatik re-render — explicit `setState` gerekmez.

5. **Focus ring standardı:** `focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2` — tüm interactive elementlerde.

6. **Code review dersleri:** Semantic HTML zorunlu (`<nav>`, `<section>`, `<main>`, `<aside>`), `div` soup kaçın. `<label>` ve `htmlFor` eşleşmesi zorunlu.

7. **npm install:** `--legacy-peer-deps` flag'i gerekiyor. Bu story'de **yeni paket eklenmesi beklenmemektedir** — mevcut Lucide ikonlar ve Preact yeterli.

8. **Options page minimum tıklanabilir alan:** 44×44px (popup'un 32×32px'inden farklı — UX spec'ten).

### Anti-Pattern'ler (YAPILMAYACAK)

- ❌ React Router veya preact-router kullanmak — signal-based routing yeterli (sadece 4 sayfa)
- ❌ Sidebar'ı ayrı bir state management ile yönetmek — `currentPage` signal tek yeterli
- ❌ Toggle state'ini lokal state'te tutmak — `chrome.storage.local` tek kaynak
- ❌ Options page'de popup boyut kısıtlamalarını uygulamak — tam ekran, responsive
- ❌ Inline style kullanmak — sadece Tailwind class'ları
- ❌ `any` tipi — `unknown` + type guard
- ❌ `console.log` debug amaçlı bırakmak
- ❌ `div` + `onClick` ile navigasyon — semantic `<button>` veya `<a>` kullan
- ❌ Popup component'lerini options page'e kopyalamak — paylaşılan component'ler `components/` klasöründe, import et
- ❌ Form alanları için `<label>` veya `aria-label` eksik bırakmak
- ❌ Emoji kullanmak — sadece Lucide çizgi ikonlar

### Erişilebilirlik Checklist

- [ ] SidebarNav: `<nav>` element + `role="navigation"` + `aria-label="Ayarlar menüsü"`
- [ ] Sidebar item'lar: `<button>` element, aktif item `aria-current="page"`
- [ ] Hamburger butonu: `aria-label="Menüyü aç"` / `aria-label="Menüyü kapat"`, `aria-expanded`
- [ ] SectionGroup: `<section>` + `aria-labelledby={titleId}`
- [ ] FormRow: `<label>` + `htmlFor` ile control bağlantısı
- [ ] Toggle'lar: `role="switch"` + `aria-checked` + `aria-label` (mevcut Toggle component zaten destekliyor)
- [ ] Focus ring: `focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2`
- [ ] Heading hiyerarşisi: `h1` → "QA Helper Ayarları", `h2` → bölüm başlıkları
- [ ] Tab sırası DOM sırasına uygun
- [ ] Minimum tıklanabilir alan: 44×44px (options page standardı)
- [ ] Renk kontrastı: WCAG AA minimum (4.5:1)

### Responsive CSS Pattern'ı

```typescript
// Options page root layout
<div class="min-h-screen bg-gray-50">
  {/* Mobile header — md altında göster */}
  <header class="md:hidden flex items-center justify-between p-4 bg-white border-b">
    <h1 class="text-lg font-semibold">QA Helper Ayarları</h1>
    <button onClick={toggleMenu} aria-label={isMenuOpen.value ? "Menüyü kapat" : "Menüyü aç"}>
      {isMenuOpen.value ? <X size={24} /> : <Menu size={24} />}
    </button>
  </header>

  <div class="md:flex">
    {/* Sidebar — md üstünde her zaman görünür */}
    <aside class={`
      ${isMenuOpen.value ? 'block' : 'hidden'}
      md:block
      md:w-[200px] xl:w-[240px]
      md:min-h-screen
      bg-white border-r
      md:sticky md:top-0
    `}>
      <h1 class="hidden md:block text-lg font-semibold p-6">QA Helper Ayarları</h1>
      <SidebarNav ... />
    </aside>

    {/* Content area */}
    <main class="flex-1 p-6 xl:max-w-[800px] xl:mx-auto">
      {/* Sayfa içeriği burada render edilir */}
    </main>
  </div>
</div>
```

### Project Structure Notes

**Mimari Uyum:**
- `options/App.tsx` → Architecture: "Root component — sidebar routing" [Source: architecture.md#Project Structure & Boundaries]
- `options/pages/` → Architecture: "JiraSetupPage.tsx, GeneralSettingsPage.tsx, DataManagementPage.tsx, AboutPage.tsx" [Source: architecture.md#Complete Project Directory Structure]
- `components/layout/` → UX Spec: "Options Page componentleri → src/components/layout/" [Source: ux-design-specification.md#Component Implementation Strategy]
- Responsive breakpoints → UX Spec: "3 breakpoint: <768px, 768-1199px, >=1200px" [Source: ux-design-specification.md#Options Page Breakpoint Strategy]

**Bağımlılık Akışı:**
```
options/App.tsx → SidebarNav → Lucide icons
               → GeneralSettingsPage → Toggle, SectionGroup, FormRow
               → ConfigurationPage → Placeholder
               → DataManagementPage → Placeholder
               → AboutPage → SectionGroup
               → storageGet/Set → chrome.storage.local
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Options Page Breakpoint Strategy]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Options Page Ek Componentleri — SidebarNav, SectionGroup, FormRow]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Form Layout Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility Strategy]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Implementation Strategy]
- [Source: _bmad-output/implementation-artifacts/1-4-popup-dashboard-ve-session-kontrol.md#Dev Notes — Toggle, Signals]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Tüm 212 test geçti (21 test dosyası), regression yok
- Yeni eklenen 29 test (4 dosya): SidebarNav (9), FormRow (5), GeneralSettingsPage (5), App (10)

### Completion Notes List

- **Task 1:** Layout componentleri oluşturuldu — SidebarNav (`<nav>` + `role="navigation"` + `aria-current="page"`), SectionGroup (`<section>` + `aria-labelledby`), FormRow (`<label>` + `htmlFor` + responsive layout). 14 test geçti.
- **Task 2:** Options page App.tsx yeniden yazıldı — `currentPage` signal ile 4 sayfalı routing, `md:` ve `xl:` breakpoint'li 3-tier responsive layout, hamburger menü (mobil), `<aside>` + `<main>` + `<nav>` semantic HTML.
- **Task 3:** GeneralSettingsPage oluşturuldu — 5 toggle (har, console, dom, localStorage, sessionStorage), `session_config` storage key'i ile anında kayıt, SectionGroup + FormRow layout, mevcut Toggle component yeniden kullanıldı.
- **Task 4:** AboutPage oluşturuldu — `chrome.runtime.getManifest().version` ile versiyon bilgisi, lisans placeholder, kurulum sihirbazı placeholder (disabled).
- **Task 5:** ConfigurationPage ve DataManagementPage placeholder sayfaları oluşturuldu (Story 3.2'de implement edilecek).
- **Task 6:** Popup DashboardView'daki "Ayarlar" butonunun `chrome.runtime.openOptionsPage()` çağrısı doğrulandı — Story 1.4'te zaten implement edilmiş ve test edilmiş.
- **Task 7:** App.test.tsx oluşturuldu — routing, navigasyon, responsive layout, semantic HTML, hamburger menü testleri. Tüm test dosyaları co-located.

### Change Log

- 2026-03-08: Story 3.1 implementasyonu tamamlandı — Options page layout, navigasyon ve genel ayarlar. 10 yeni dosya oluşturuldu, 1 dosya yeniden yazıldı.
- 2026-03-08: Code review düzeltmeleri — H1: GeneralSettingsPage veri kaybı bug'ı (config merge + rollback), H2: AboutPage geliştirici bilgisi, H3: Test güncelleme, H4: AboutPage testleri, M2: Loading state, M3: JSX type import, L1: Gereksiz keyboard handler kaldırıldı, L2: Redundant role kaldırıldı.

### File List

- `src/components/layout/SidebarNav.tsx` — CREATE (review: L1+L2 düzeltmesi)
- `src/components/layout/SidebarNav.test.tsx` — CREATE (review: keyboard test güncelleme)
- `src/components/layout/SectionGroup.tsx` — CREATE
- `src/components/layout/FormRow.tsx` — CREATE
- `src/components/layout/FormRow.test.tsx` — CREATE
- `src/options/App.tsx` — REWRITE (review: M3 JSX type import)
- `src/options/App.test.tsx` — CREATE
- `src/options/pages/GeneralSettingsPage.tsx` — CREATE (review: H1+M1+M2 düzeltmesi)
- `src/options/pages/GeneralSettingsPage.test.tsx` — CREATE (review: H3 test güncelleme)
- `src/options/pages/ConfigurationPage.tsx` — CREATE
- `src/options/pages/DataManagementPage.tsx` — CREATE
- `src/options/pages/AboutPage.tsx` — CREATE (review: H2 geliştirici bilgisi)
- `src/options/pages/AboutPage.test.tsx` — CREATE (review: H4 yeni test dosyası)
