---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/architecture.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
---

# qa-helper-plugin - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for qa-helper-plugin, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**Session Yönetimi (FR1-FR6):**

FR1: Tester, extension popup'ından tek tıkla test session'ı başlatabilir ve durdurabilir
FR2: Extension, her tab için bağımsız session yönetebilir
FR3: Extension, aktif tab'da tüm veri kaynaklarını (tıklama, XHR, console, DOM) kaydeder; background tab'larda yalnızca session state'i (URL, tab ID) korur, aktif kayıt yapmaz
FR4: Extension, session verisini tarayıcı/tab kapansa bile persist edebilir
FR5: Extension, aynı tab'da domain değişse bile session'ı sürdürebilir (cross-app tracking)
FR6: Tester, export sonrası session verilerini temizleyip temizlememeyi seçebilir

**Veri Toplama & Kayıt (FR7-FR12):**

FR7: Extension, session boyunca kullanıcının tıklama akışını (sayfa URL/route + tıklanan element text) sıralı olarak kaydedebilir
FR8: Extension, session boyunca tüm XHR/Fetch isteklerini (static asset hariç) DevTools açık olmadan kaydedebilir
FR9: Extension, console loglarını mevcut sayfa + bir önceki sayfa için rolling window ile kaydedebilir
FR10: Extension, SPA route değişimlerini (pushState, popState, hashchange) tespit edip kaydedebilir
FR11: Extension, iframe içindeki verileri toplayabilir (all_frames desteği)
FR12: Tester, hangi veri kaynaklarının aktif olacağını toggle ile kontrol edebilir (HAR, Console, DOM, localStorage, sessionStorage)

**Bug Anı Snapshot (FR13-FR18):**

FR13: Extension, bug raporlama anında aktif sayfanın ekran görüntüsünü alabilir
FR14: Extension, screenshot'a metadata ekleyebilir (viewport, browser, OS, zoom, pixel ratio, dil)
FR15: Extension, son sayfanın tam DOM snapshot'ını alabilir
FR16: Extension, localStorage ve sessionStorage içeriğini dump edebilir
FR17: Extension, console loglarını stack trace parse ederek toplayabilir
FR18: Extension, session'sız durumda sadece anlık snapshot alabilir ve tester'ı uyarabilir

**Bug Raporlama (FR19-FR22):**

FR19: Tester, maksimum 3 alanlı bir form ile bug raporu oluşturabilir (beklenen sonuç, neden bug, priority)
FR20: Extension, tıklama akışından otomatik steps to reproduce oluşturabilir
FR21: Extension, ortam bilgilerini (browser, OS, viewport, cihaz) otomatik toplayıp rapora ekleyebilir
FR22: Tester, konfigürasyon alanlarını (environment, test cycle, agile team, proje) bir kez ayarlayıp her rapora otomatik ekleyebilir

**Export — ZIP (FR23-FR25):**

FR23: Tester, bug raporunu yapılandırılmış ZIP dosyası olarak indirebilir
FR24: ZIP, standart veri kategorilerinde olmalı: açıklama metni, ekran görüntüsü, DOM snapshot, console logları, XHR/Fetch kayıtları, localStorage dump, sessionStorage dump, birleşik timeline
FR25: Tester, description text'ini tek tıkla clipboard'a kopyalayabilir

**Export — Jira (FR26-FR31):**

FR26: Tester, Jira Cloud ve Jira Server/Data Center'a bağlantı kurabilir
FR27: Tester, extension üzerinden Jira ticket oluşturabilir
FR28: Tester, mevcut bir ticket'a sub-bug olarak yeni ticket açabilir
FR29: Extension, toplanan dosyaları Jira ticket'a otomatik attachment olarak ekleyebilir
FR30: Extension, description'ı Jira formatında (Wiki markup veya ADF JSON) oluşturabilir
FR31: Extension, steps to reproduce, beklenen sonuç, environment ve cihaz özet kartını description'a ekleyebilir

**Extension UI & Deneyim (FR32-FR35):**

FR32: Extension, icon badge ile durumu gösterebilir: pasif durumda varsayılan ikon, session aktifken görsel farklılaştırma, console error yakalandığında badge ile bildirim
FR33: Tester, popup üzerinden session bilgisini görebilir: geçen süre, ziyaret edilen sayfa sayısı, kaydedilen XHR istek sayısı, yakalanan console error sayısı
FR34: Tester, options page üzerinden Jira bağlantısını yapılandırabilir
FR35: Tester, options page üzerinden konfigürasyon alanlarını yönetebilir

### NonFunctional Requirements

**Performance (NFR1-NFR7):**

NFR1: Extension aktifken sayfa yüklenme süresine eklenen gecikme < 50ms
NFR2: Popup açılış süresi < 100ms
NFR3: Session başına toplam bellek kullanımı < 50MB
NFR4: Bug raporlama (snapshot toplama + paketleme) < 3 saniye
NFR5: XHR/console kayıt overhead'i sayfa CPU kullanımına < %2 ek yük getirir
NFR6: 100+ XHR isteği olan sayfalarda performans degradasyonu < %5
NFR7: Content script injection, host sayfanın DOM manipülasyonlarına < 5ms gecikme ekler

**Security (NFR8-NFR11):**

NFR8: Toplanan tüm test verileri yalnızca chrome.storage.local'da saklanır, harici sunucuya gönderilmez
NFR9: Jira credentials chrome.storage.local'da saklanır; OAuth 2.0 token'ları Chrome'un dahili token yönetimi (chrome.identity) ile korunur, PAT'ler ise chrome.storage.local'da tutulur ve yalnızca Jira API çağrıları sırasında okunur
NFR10: Lisans key doğrulama dışında hiçbir harici ağ bağlantısı yapılmaz
NFR11: Content script'ler host sayfanın JavaScript scope'unu kirletmez

**Privacy (NFR12-NFR15):**

NFR12: Kullanıcı verileri hiçbir koşulda extension dışına gönderilmez (lisans doğrulama hariç)
NFR13: Toplanan DOM/XHR/console verileri yalnızca kullanıcının explicit export aksiyonu ile paylaşılır
NFR14: Session verileri kullanıcı tarafından tek tıkla temizlenebilir
NFR15: Extension, kullanıcının ziyaret ettiği URL'leri veya gezinti geçmişini harici servislere raporlamaz

**Integration (NFR16-NFR19):**

NFR16: Jira Cloud REST API v3 ile uyumlu çalışır
NFR17: Jira Server/Data Center REST API v2 ile uyumlu çalışır
NFR18: Jira bağlantısı kurulamadığında ZIP export fallback her zaman çalışır
NFR19: OAuth 2.0 token süresi dolduğunda otomatik refresh token ile yeniler; PAT geçersiz olduğunda kullanıcıya "Jira bağlantısı koptu, PAT'i yeniden girin" uyarısı gösterir ve ZIP export fallback'e yönlendirir

**Reliability (NFR20-NFR22):**

NFR20: Service worker kapansa bile session verisi kaybolmaz (chrome.storage.local persist)
NFR21: Tab crash durumunda o ana kadar toplanan veriler korunur
NFR22: Network bağlantısı kesilse bile lokal işlevsellik (kayıt, snapshot, ZIP export) çalışmaya devam eder

### Additional Requirements

**Architecture'dan Gelen Teknik Gereksinimler:**

- Starter template: Custom Vite Setup — `npm create vite@latest qa-helper-plugin -- --template preact-ts` ile proje başlatılmalı (Epic 1 Story 1 için kritik)
- TypeScript strict mode zorunlu
- Preact 10.28.4 + @preact/signals state management
- Tailwind CSS v4 + @tailwindcss/vite plugin entegrasyonu
- Vite 7.x multi-entry build konfigürasyonu (popup.html, options.html, background/index.ts, content-scripts/*.ts)
- Vitest test framework — unit + component test
- ESLint (eslint-config-preact) + Prettier linting/formatting
- JSZip kütüphanesi ile client-side ZIP oluşturma
- Lucide Icons (lucide-preact) — tree-shakeable inline SVG
- chrome.storage.local + unlimitedStorage permission ile veri persist
- Hibrit key yapısı: session_meta_{tabId}, session_xhr_{tabId}, session_clicks_{tabId}, session_console_{tabId}, session_config, jira_credentials
- AI-ready veri şeması: İki Kanal timeline JSON formatı (schemaVersion: "1.0", timeline array, errorSummary, attachments)
- Service Worker = merkezi hub iletişim pattern'ı (chrome.runtime.sendMessage, chrome.tabs.sendMessage)
- Debounce batch write flush stratejisi (2-3 saniye interval, kritik veriler anında yazılır)
- Content script izolasyonu: IIFE + Symbol/WeakMap ile wrapper gizleme
- Result<T> pattern tüm async fonksiyonlarda zorunlu
- Message<T> / MessageResponse<T> interface'leri tüm chrome messaging'de zorunlu
- Naming pattern'lar: PascalCase componentler, kebab-case lib dosyaları, SCREAMING_SNAKE_CASE message action'ları, snake_case storage key'leri
- Co-located test dosyaları (*.test.ts / *.test.tsx)
- XHR body truncation: max 50KB/istek
- Console rolling window: mevcut sayfa + bir önceki sayfa

**UX Design'dan Gelen Ek Gereksinimler:**

- WCAG 2.1 Level AA erişilebilirlik hedefi
- Keyboard navigasyon tüm interactive elementlerde zorunlu (Tab, Enter, Space, ESC)
- Screen reader desteği: ARIA labels, aria-live regions, semantic HTML
- prefers-reduced-motion desteği — animasyonlar devre dışı bırakılabilir
- Focus management: modal açılışında focus trap, kapanışta tetikleyiciye dönüş
- 3 adımlı minimal onboarding wizard (tüm adımlar opsiyonel, "Atla" her zaman mevcut)
- Popup sabit boyut: 400×600px, dikey scroll, yatay scroll yok
- Options Page responsive: 3 breakpoint (<768px tek kolon, 768-1199px sidebar+content, ≥1200px geniş sidebar+ortada content)
- 26 custom Preact component tasarımı (10 foundation: Button, Input, Textarea, Select, Icon, Badge, StatusDot, Card, Toast, Banner, Modal; 7 domain: SessionControl, LiveCounters, ScreenshotPreview, CollapsibleSection, DataSummary, ExportBar, StepWizard; 5 options-page: SidebarNav, SectionGroup, FormRow + adaptasyonlar)
- Bug report form: dikey akış (screenshot önizleme → form → collapsible steps to reproduce → veri özeti → export butonları)
- Icon badge 3-state sistemi: gri (pasif), yeşil (session aktif), kırmızı badge (console error sayısı)
- Privacy trust indicator popup footer'da: "Tüm veriler cihazınızda"
- Graceful degradation her seviyede (session'sız → snapshot, Jira'sız → ZIP, crash → kurtarma)
- Emoji yok — sadece Lucide çizgi ikonlar (kurumsal, profesyonel ton)
- Animasyon süresi max 200ms, loading gösterimi 300ms+ süren işlemler için
- Sistem fontu (system-ui) — ek font yükleme yok
- Minimum tıklanabilir alan: 32×32px (popup), 44×44px (options page)

### FR Coverage Map

**Session Yönetimi:**
FR1: Epic 1 — Session başlat/durdur
FR2: Epic 1 — Tab bazlı bağımsız session
FR3: Epic 1 — Aktif tab kayıt, background tab state koruma
FR4: Epic 1 — Session verisi persist
FR5: Epic 1 — Cross-app tracking (domain değişimi)

**Veri Toplama & Kayıt:**
FR6: Epic 2 — Export sonrası session temizleme seçeneği
FR7: Epic 1 — Tıklama akışı kaydı
FR8: Epic 1 — XHR/Fetch intercept (DevTools'suz)
FR9: Epic 1 — Console log rolling window kaydı
FR10: Epic 1 — SPA route değişimi tespiti
FR11: Epic 1 — iframe veri toplama (all_frames)
FR12: Epic 1 — Veri kaynağı toggle kontrolü

**Bug Anı Snapshot:**
FR13: Epic 2 — Screenshot alma
FR14: Epic 2 — Screenshot metadata
FR15: Epic 2 — DOM snapshot
FR16: Epic 2 — localStorage/sessionStorage dump
FR17: Epic 2 — Console log stack trace parse
FR18: Epic 2 — Session'sız snapshot + uyarı

**Bug Raporlama:**
FR19: Epic 2 — 3 alanlı bug rapor formu
FR20: Epic 2 — Otomatik steps to reproduce
FR21: Epic 2 — Ortam bilgileri otomatik toplama
FR22: Epic 2 — Konfigürasyon alanları ayarlama ve rapora ekleme

**Export — ZIP:**
FR23: Epic 2 — ZIP dosyası olarak indirme
FR24: Epic 2 — Yapılandırılmış ZIP içeriği
FR25: Epic 2 — Clipboard'a description kopyalama

**Export — Jira:**
FR26: Epic 4 — Jira Cloud ve Server bağlantısı
FR27: Epic 4 — Jira ticket oluşturma
FR28: Epic 4 — Sub-bug ticket açma
FR29: Epic 4 — Otomatik attachment ekleme
FR30: Epic 4 — Jira formatında description (Wiki/ADF)
FR31: Epic 4 — Steps, environment, cihaz kartı description'a ekleme

**Extension UI & Deneyim:**
FR32: Epic 1 — Icon badge durum göstergesi (gri/yeşil/kırmızı)
FR33: Epic 1 — Popup session bilgisi (süre, sayfa, XHR, error sayaçları)
FR34: Epic 4 — Options page Jira bağlantı yapılandırması
FR35: Epic 3 — Options page konfigürasyon alanları yönetimi

## Epic List

### Epic 1: Proje Kurulumu ve Session Kayıt Motoru
Tester extension'ı kurup session başlatabilir. Extension arka planda XHR/Fetch isteklerini, console loglarını, tıklama akışını ve SPA route değişimlerini kaydeder. Popup'ta session durumu, canlı sayaçlar ve icon badge ile durum anlık görünür.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR7, FR8, FR9, FR10, FR11, FR12, FR32, FR33

### Epic 2: Bug Raporlama ve ZIP Export
Tester bug bulduğunda tek tıkla screenshot, DOM snapshot, storage dump ve tüm session verilerini toplayıp, minimal 3 alanlı form ile yapılandırılmış ZIP dosyası olarak indirebilir. Session olmasa bile anlık snapshot alabilir. Konfigürasyon alanlarını ayarlayıp rapora otomatik ekleyebilir.
**FRs covered:** FR6, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25

### Epic 3: Ayarlar Sayfası
Tester, options page üzerinden tüm extension ayarlarını merkezi olarak yönetebilir — konfigürasyon alanları, veri yönetimi, genel ayarlar, hakkında sayfası. Responsive sidebar navigasyonlu tam sayfa deneyimi.
**FRs covered:** FR35

### Epic 4: Jira Entegrasyonu
Tester, Jira Cloud (OAuth 2.0) veya Jira Server/Data Center (PAT) bağlantısı kurup bug raporlarını doğrudan Jira ticket olarak oluşturabilir. Tüm dosyalar otomatik attachment olarak eklenir, description ADF JSON veya Wiki markup formatında yapılandırılır.
**FRs covered:** FR26, FR27, FR28, FR29, FR30, FR31, FR34

## Epic 1: Proje Kurulumu ve Session Kayıt Motoru

Tester extension'ı kurup session başlatabilir. Extension arka planda XHR/Fetch isteklerini, console loglarını, tıklama akışını ve SPA route değişimlerini kaydeder. Popup'ta session durumu, canlı sayaçlar ve icon badge ile durum anlık görünür.

### Story 1.1: Proje Kurulumu ve Chrome Extension Altyapısı

As a **developer**,
I want **projenin temel yapısının kurulmasını** (Vite + Preact + Tailwind + MV3 manifest + multi-entry build),
So that **tüm bileşenler bu altyapı üzerine inşa edilebilsin**.

**Acceptance Criteria:**

**Given** proje henüz oluşturulmamış
**When** `npm create vite@latest` ile preact-ts template kullanılarak proje başlatılır
**Then** Vite 7.x + Preact + TypeScript strict mode ile çalışan bir proje oluşur
**And** Tailwind CSS v4 (`@tailwindcss/vite`) entegre edilir
**And** `vite.config.ts` multi-entry build konfigürasyonu yapılır (popup.html, options.html, background/index.ts, content-scripts/*.ts)
**And** `manifest.json` (MV3) oluşturulur — permissions: `activeTab`, `storage`, `unlimitedStorage`, `tabs`, `scripting`; content_scripts: `all_frames: true`
**And** Proje yapısı Architecture dokümanına uygun oluşturulur (popup/, options/, background/, content-scripts/, components/, lib/, styles/)
**And** Core lib dosyaları oluşturulur: `storage.ts` (chrome.storage.local wrapper), `messaging.ts` (Message/MessageResponse interface), `types.ts` (SessionMeta, TimelineEvent, Result<T>, AsyncStatus), `constants.ts` (SCREAMING_SNAKE sabitler)
**And** ESLint (eslint-config-preact) + Prettier + Vitest konfigürasyonu yapılır
**And** Popup ve options page boş shell olarak render edilir
**And** `npm run dev` ve `npm run build` komutları çalışır
**And** Extension `chrome://extensions`'tan load unpacked olarak yüklenebilir

### Story 1.2: Service Worker — Session Yaşam Döngüsü ve Veri Yönetimi

As a **tester**,
I want **session'ı başlatıp durdurabilmeyi ve session verisinin kaybolmamasını**,
So that **tab kapansa veya extension yeniden başlasa bile kayıt verilerim korunsun**.

**Acceptance Criteria:**

**Given** extension yüklü ve service worker aktif
**When** popup'tan `START_SESSION` mesajı gönderilir
**Then** service worker aktif tab için yeni bir session oluşturur ve `session_meta_{tabId}` key'i ile chrome.storage.local'a yazar
**And** session metadata başlangıç zamanı, URL, durum ve sayaçları içerir

**Given** session aktif
**When** `STOP_SESSION` mesajı gönderilir
**Then** session durumu "stopped" olarak güncellenir ve storage'a yazılır

**Given** session aktif
**When** content script'ten veri mesajları gelir (FLUSH_DATA)
**Then** flush-manager verileri 2-3 saniye debounce ile batch olarak chrome.storage.local'a yazar
**And** kritik veriler (console error, failed XHR) debounce atlanarak anında yazılır

**Given** birden fazla tab açık ve farklı session'ları var
**When** tab'lar arası geçiş yapılır
**Then** her tab'ın session verisi bağımsız olarak `session_meta_{tabId}`, `session_xhr_{tabId}`, `session_clicks_{tabId}`, `session_console_{tabId}` key'lerinde saklanır

**Given** session aktif ve aynı tab'da domain değişir
**When** kullanıcı aynı tab'da farklı bir siteye navigate eder
**Then** session kesintisiz devam eder ve yeni domain timeline'a kaydedilir

**Given** service worker kapanmış (5dk idle timeout)
**When** service worker yeniden başlar
**Then** chrome.storage.local'dan session state'i geri yüklenir ve kayıp olmaz

**Given** session aktif
**When** icon badge güncellemesi gerekir
**Then** service worker `chrome.action.setBadgeText` ve `chrome.action.setBadgeBackgroundColor` ile badge'i günceller: session aktifken yeşil arka plan, console error varsa kırmızı arka plan + error sayısı

### Story 1.3: Content Script — Veri Kayıt Motoru

As a **tester**,
I want **extension'ın test ettiğim sayfadaki XHR isteklerini, console loglarını, tıklama akışımı ve sayfa geçişlerimi arka planda kaydetmesini**,
So that **bug bulduğumda tüm teknik bağlam otomatik olarak hazır olsun**.

**Acceptance Criteria:**

**Given** session aktif ve content script sayfaya enjekte edilmiş
**When** sayfada bir XHR veya Fetch isteği yapılır (static asset hariç)
**Then** istek kaydedilir: method, URL, status, süre, request/response body (max 50KB truncation)
**And** kayıt IIFE içinde monkey-patching ile yapılır, host sayfanın JS scope'u kirletilmez

**Given** session aktif
**When** sayfada `console.log`, `console.warn`, `console.error` çağrılır
**Then** log mesajı, seviyesi ve zaman damgası kaydedilir
**And** console.error için stack trace parse edilir
**And** rolling window uygulanır: mevcut sayfa + bir önceki sayfa logları tutulur

**Given** session aktif
**When** kullanıcı sayfada bir elemente tıklar
**Then** tıklanan elementin text'i, CSS selector'ı ve sayfa URL'i zaman damgası ile kaydedilir

**Given** SPA uygulamasında session aktif
**When** pushState, popState veya hashchange event'i tetiklenir
**Then** route değişimi timeline'a kaydedilir (eski URL → yeni URL + zaman damgası)

**Given** sayfa iframe içeriyor ve manifest'te `all_frames: true` tanımlı
**When** iframe yüklenir
**Then** content script iframe içine de enjekte edilir ve iframe'deki veriler (DOM, console, XHR) toplanır

**Given** session aktif ve content script veri topluyor
**When** aktif tab'dan background tab'a geçiş yapılır
**Then** background tab'da aktif kayıt durur, yalnızca session state (URL, tab ID) korunur
**And** tab tekrar aktif olduğunda kayıt devam eder

**Given** content script çalışıyor
**When** sayfa performans metrikleri ölçülür
**Then** content script injection < 5ms DOM gecikme ekler
**And** XHR/console kayıt overhead'i < %2 CPU ek yükü getirir

### Story 1.4: Popup — Dashboard ve Session Kontrol

As a **tester**,
I want **popup'ı açtığımda session durumunu, canlı sayaçları ve veri toggle'larını tek bakışta görebilmeyi**,
So that **extension'ın arka planda ne yaptığını bilip güven duyayım**.

**Acceptance Criteria:**

**Given** tester extension ikonuna tıklar
**When** popup açılır
**Then** Compact Dashboard görünümü yüklenir (< 100ms açılış süresi)
**And** popup 400px genişliğinde sabit boyutta görünür

**Given** popup açık ve session pasif
**When** tester dashboard'ı görüntüler
**Then** gri StatusDot + "Pasif" metni gösterilir
**And** "Session Başlat" primary butonu görünür
**And** sayaçlar "0 XHR · 0 Error · 0 Sayfa" gösterir

**Given** popup açık
**When** tester "Session Başlat" butonuna basar
**Then** service worker'a `START_SESSION` mesajı gönderilir
**And** StatusDot yeşile döner + pulse animasyonu başlar + "Aktif" metni gösterilir
**And** süre sayacı başlar
**And** icon badge yeşil arka plana geçer

**Given** session aktif
**When** arka planda yeni veriler kaydedilir
**Then** LiveCounters (XHR sayısı, Error sayısı, Ziyaret edilen sayfa sayısı) canlı güncellenir

**Given** popup açık
**When** tester veri kaynağı toggle'larını görüntüler
**Then** HAR, Console, DOM, localStorage, sessionStorage toggle'ları gösterilir (varsayılan: hepsi açık)
**And** tester istediği kaynağı kapatabilir/açabilir

**Given** popup açık
**When** tester footer'a bakar
**Then** "Tüm veriler cihazınızda" privacy trust indicator'ı Lucide lock ikonu ile gösterilir

**Given** popup açık
**When** keyboard ile navigasyon yapılır
**Then** tüm interactive elementler Tab ile erişilebilir ve focus ring görünür
**And** tüm butonlar ve toggle'lar ARIA label'lara sahiptir

## Epic 2: Bug Raporlama ve ZIP Export

Tester bug bulduğunda tek tıkla screenshot, DOM snapshot, storage dump ve tüm session verilerini toplayıp, minimal 3 alanlı form ile yapılandırılmış ZIP dosyası olarak indirebilir. Session olmasa bile anlık snapshot alabilir. Konfigürasyon alanlarını ayarlayıp rapora otomatik ekleyebilir.

### Story 2.1: Snapshot Motoru — Screenshot, DOM ve Storage Toplama

As a **tester**,
I want **bug raporlama anında sayfanın ekran görüntüsünün, DOM'unun ve storage verilerinin otomatik toplanmasını**,
So that **developer'a tüm teknik bağlamı tek seferde verebilmeliyim**.

**Acceptance Criteria:**

**Given** tester "Bug Raporla" butonuna basar
**When** snapshot süreci başlar
**Then** `chrome.tabs.captureVisibleTab` ile aktif sayfanın screenshot'ı alınır
**And** screenshot'a metadata eklenir: viewport boyutu, browser versiyonu, OS, zoom seviyesi, pixel ratio, dil

**Given** snapshot süreci başlamış
**When** DOM snapshot alınır
**Then** content script aktif sayfanın tam DOM'unu serialize eder ve `dom-snapshot.html` olarak paketler

**Given** snapshot süreci başlamış
**When** storage dump alınır
**Then** `localStorage` içeriği JSON olarak dump edilir
**And** `sessionStorage` içeriği JSON olarak dump edilir

**Given** snapshot süreci başlamış
**When** console logları derlenir
**Then** kaydedilmiş console logları stack trace parse edilerek `console-logs.json` olarak paketlenir

**Given** tüm snapshot bileşenleri tamamlanmış
**When** sonuçlar birleştirilir
**Then** tüm snapshot işlemi < 3 saniyede tamamlanır
**And** popup'a hazır olduğu bildirilir

### Story 2.2: Bug Raporlama Formu ve Session'sız Bug Akışı

As a **tester**,
I want **minimal bir form ile bug raporu oluşturabilmeyi ve session başlatmamış olsam bile anlık snapshot alabilmeyi**,
So that **hızlıca bug raporlayıp işime devam edebileyim**.

**Acceptance Criteria:**

**Given** session aktif ve tester "Bug Raporla"ya basar
**When** bug rapor ekranı açılır
**Then** popup Dashboard'dan BugReportView'a sağa slide geçiş yapılır (200ms)
**And** screenshot önizlemesi üstte gösterilir (thumbnail + "Yeniden Çek" ghost butonu)
**And** 3 alanlı form gösterilir: beklenen sonuç (textarea), neden bug (textarea), priority (dropdown, varsayılan: Medium)

**Given** bug rapor ekranı açık
**When** tester collapsible "Steps to Reproduce" bölümüne bakar
**Then** tıklama akışından otomatik oluşturulmuş adımlar varsayılan kapalı (collapsed) olarak gösterilir
**And** tester açıp içeriği düzenleyebilir

**Given** bug rapor ekranı açık
**When** ortam bilgileri toplanır
**Then** browser, OS, viewport, cihaz bilgileri otomatik tespit edilip rapora eklenir (kullanıcı aksiyonu gerekmez)

**Given** bug rapor ekranı açık
**When** tester konfigürasyon alanlarını görüntüler
**Then** environment, test cycle, agile team, proje alanları popup'ta inline olarak gösterilir ve değiştirilebilir
**And** bir kez ayarlanan değerler sonraki raporlara otomatik eklenir

**Given** bug rapor ekranı açık
**When** tester toplanan veri özetine bakar
**Then** DataSummary checklist gösterilir: check ikonu + "Screenshot", "DOM Snapshot", "Console Logs (N)", "XHR (N)", "localStorage", "sessionStorage", "Timeline (N olay)"

**Given** session başlatılmamış ve tester "Bug Raporla"ya basar
**When** session'sız durum tespit edilir
**Then** uyarı modalı gösterilir: "Session kaydı yok, sadece anlık snapshot alınacak. Tıklama akışı ve XHR geçmişi dahil edilemez."
**And** "Devam Et" (primary) ve "İptal" (ghost) butonları sunulur

**Given** session'sız bug onaylanmış
**When** veri özeti gösterilir
**Then** eksik veriler (tıklama akışı, XHR geçmişi) xmark ikonu + soluk renk ile gösterilir (cezalandırmayan ton)
**And** mevcut veriler (screenshot, DOM, storage, console) check ikonu ile gösterilir

**Given** bug rapor formunda
**When** tester "Yeniden Çek" butonuna basar
**Then** yeni screenshot alınır ve önizleme güncellenir

**Given** bug rapor ekranında
**When** tester geri okuna basar
**Then** Dashboard'a sola slide geçiş yapılır ve form verisi korunur (geri dönüldüğünde kaybolmaz)

### Story 2.3: ZIP Export ve Timeline Builder

As a **tester**,
I want **bug raporumu yapılandırılmış ZIP dosyası olarak indirip description'ı clipboard'a kopyalayabilmeyi**,
So that **developer'a düzgün organize edilmiş bir rapor verebilmeliyim**.

**Acceptance Criteria:**

**Given** bug rapor formu doldurulmuş ve veriler toplanmış
**When** timeline builder çalışır
**Then** AI-ready İki Kanal timeline JSON'ı oluşturulur: schemaVersion, sessionId, bugReport, environment, context, timeline array (user + sys channel), errorSummary, attachments

**Given** tester "ZIP İndir" butonuna basar
**When** ZIP oluşturma başlar
**Then** buton loading state'e geçer: spinner + "Hazırlanıyor..."
**And** JSZip ile yapılandırılmış ZIP oluşturulur

**Given** ZIP oluşturma tamamlanmış
**When** dosya indirilir
**Then** ZIP şu dosyaları içerir: `description.txt`, `screenshot.png`, `dom-snapshot.html`, `console-logs.json`, `network.har`, `local-storage.json`, `session-storage.json`, `timeline.json`
**And** dosya adı formatı: `bug-report-YYYY-MM-DD.zip`
**And** başarı toast'ı gösterilir: "ZIP indirildi — bug-report-2026-03-08.zip (2.3 MB)"

**Given** bug rapor ekranı açık
**When** tester "Clipboard'a Kopyala" butonuna basar
**Then** description metni (steps to reproduce + beklenen sonuç + environment bilgisi) clipboard'a kopyalanır
**And** başarı toast'ı gösterilir: "Description kopyalandı"

**Given** export başarılı
**When** tamamlanma ekranı gösterilir
**Then** "Session verilerini temizlemek ister misiniz?" sorusu gösterilir
**And** "Temizle" ve "Koru" butonları sunulur
**And** seçim sonrası Dashboard'a dönülür

**Given** bug rapor ekranında Jira butonu görünür
**When** Jira henüz yapılandırılmamış
**Then** "Jira'ya Gönder" butonu disabled gösterilir
**And** tooltip: "Ayarlardan Jira'yı kurun"

## Epic 3: Ayarlar Sayfası

Tester, options page üzerinden tüm extension ayarlarını merkezi olarak yönetebilir — konfigürasyon alanları, veri yönetimi, genel ayarlar, hakkında sayfası. Responsive sidebar navigasyonlu tam sayfa deneyimi.

### Story 3.1: Options Page — Layout, Navigasyon ve Genel Ayarlar

As a **tester**,
I want **options page üzerinden extension ayarlarımı merkezi bir sayfadan yönetebilmeyi**,
So that **Jira, konfigürasyon ve veri yönetimi gibi detaylı ayarlara tek yerden erişebileyim**.

**Acceptance Criteria:**

**Given** tester popup'ta "Ayarlar" linkine tıklar
**When** `chrome.runtime.openOptionsPage()` çağrılır
**Then** yeni bir tab'da options page açılır

**Given** options page açılmış
**When** sayfa yüklenir
**Then** sol tarafta SidebarNav görünür: Genel, Konfigürasyon, Veri Yönetimi, Hakkında bölümleri listelenir
**And** aktif bölüm vurgulu gösterilir
**And** sağ tarafta seçili bölümün içeriği gösterilir

**Given** options page ekran genişliği < 768px
**When** responsive layout uygulanır
**Then** sidebar hamburger menüye dönüşür ve tek kolon layout gösterilir

**Given** options page ekran genişliği 768-1199px
**When** standard layout uygulanır
**Then** sidebar (200px) + content area yan yana gösterilir

**Given** options page ekran genişliği >= 1200px
**When** wide layout uygulanır
**Then** sidebar (240px) + content area (max-width 800px, ortada) gösterilir

**Given** tester "Genel" bölümünü seçer
**When** genel ayarlar sayfası gösterilir
**Then** veri kaynağı toggle'ları (HAR, Console, DOM, localStorage, sessionStorage) gösterilir
**And** toggle değişiklikleri anında chrome.storage.local'a kaydedilir

**Given** tester "Hakkında" bölümünü seçer
**When** hakkında sayfası gösterilir
**Then** extension versiyonu, geliştirici bilgisi ve lisans durumu gösterilir

**Given** options page açık
**When** keyboard ile navigasyon yapılır
**Then** sidebar ve form alanları Tab ile erişilebilir, focus ring görünür, semantic HTML kullanılır

### Story 3.2: Options Page — Konfigürasyon Alanları ve Veri Yönetimi

As a **tester**,
I want **konfigürasyon alanlarımı (environment, proje, agile team) merkezi olarak yönetebilmeyi ve session verilerimi temizleyebilmeyi**,
So that **ayarlarımı bir kez yapıp her raporda otomatik kullanılmasını sağlayabileyim**.

**Acceptance Criteria:**

**Given** tester "Konfigürasyon" bölümünü seçer
**When** konfigürasyon sayfası gösterilir
**Then** environment, test cycle, agile team, proje alanları FormRow layout'unda gösterilir (label solda, input sağda)
**And** mevcut değerler chrome.storage.local'dan yüklenir
**And** değişiklikler anında kaydedilir

**Given** tester "Veri Yönetimi" bölümünü seçer
**When** veri yönetimi sayfası gösterilir
**Then** aktif session'ların listesi ve depolama durumu gösterilir
**And** "Tüm Verileri Temizle" danger butonu gösterilir

**Given** tester "Tüm Verileri Temizle" butonuna basar
**When** onay modalı gösterilir
**Then** "Bu işlem geri alınamaz. Tüm session verileri silinecek. Devam?" uyarısı gösterilir
**And** "Temizle" (danger) ve "İptal" (ghost) butonları sunulur

**Given** tester temizleme onaylar
**When** veriler silinir
**Then** chrome.storage.local'daki tüm session_* key'leri temizlenir
**And** başarı toast'ı gösterilir: "Tüm veriler temizlendi"
**And** depolama durumu güncellenir

### Story 3.3: İlk Kullanım Onboarding Wizard

As a **tester**,
I want **extension'ı ilk kez yüklediğimde kısa bir kurulum sihirbazı ile temel ayarlarımı yapabilmeyi**,
So that **hızlıca konfigürasyonumu tamamlayıp test etmeye başlayabileyim**.

**Acceptance Criteria:**

**Given** extension ilk kez yükleniyor ve daha önce onboarding tamamlanmamış
**When** tester popup'ı ilk kez açar
**Then** 3 adımlı onboarding wizard gösterilir (progress indicator: 1/3, 2/3, 3/3)

**Given** onboarding wizard Adım 1/3 gösteriliyor
**When** "Ortam Bilgisi" adımı açılır
**Then** proje adı, ortam seçimi (staging/QA/prod) ve agile team alanları gösterilir
**And** tüm alanlar opsiyonel — "Atla" butonu her zaman mevcut
**And** doldurulan değerler chrome.storage.local'a `session_config` key'ine kaydedilir

**Given** onboarding wizard Adım 2/3 gösteriliyor
**When** "Jira Bağlantısı" adımı açılır
**Then** Jira platform seçimi (Cloud / Server) ve bağlantı bilgileri gösterilir
**And** "Bağlantıyı Test Et" butonu gösterilir
**And** başarılı test: yeşil check + "Bağlantı başarılı"
**And** başarısız test: kırmızı alert + hata detayı
**And** "Atla" butonu her zaman mevcut — Jira zorunlu değil

**Given** onboarding wizard Adım 3/3 gösteriliyor
**When** "Hazır!" adımı açılır
**Then** "Kurulum tamam! İlk session'ınızı başlatın." mesajı gösterilir
**And** "Başla" butonu dashboard'a yönlendirir
**And** dashboard'ta "Session Başlat" butonu pulse animasyonu ile vurgulu gösterilir

**Given** onboarding tamamlanmış
**When** tester popup'ı tekrar açar
**Then** onboarding wizard bir daha gösterilmez — direkt dashboard açılır
**And** chrome.storage.local'da `onboarding_completed: true` flag'i saklanır

**Given** tester onboarding'i tekrar görmek istiyor
**When** options page'de "Hakkında" bölümünden "Kurulum sihirbazını tekrar aç" linkine tıklar
**Then** onboarding wizard tekrar gösterilir

## Epic 4: Jira Entegrasyonu

Tester, Jira Cloud (OAuth 2.0) veya Jira Server/Data Center (PAT) bağlantısı kurup bug raporlarını doğrudan Jira ticket olarak oluşturabilir. Tüm dosyalar otomatik attachment olarak eklenir, description ADF JSON veya Wiki markup formatında yapılandırılır.

### Story 4.1: Jira Bağlantı Kurulumu ve Kimlik Doğrulama

As a **tester**,
I want **Jira Cloud veya Jira Server/Data Center bağlantımı options page üzerinden kurabilmeyi**,
So that **bug raporlarımı doğrudan Jira'ya gönderebilmem için altyapı hazır olsun**.

**Acceptance Criteria:**

**Given** tester options page'de "Jira Entegrasyonu" bölümüne gider
**When** Jira kurulum sayfası gösterilir
**Then** Jira platform seçimi gösterilir: "Jira Cloud" ve "Jira Server/Data Center" seçenekleri

**Given** tester "Jira Cloud" seçer
**When** OAuth 2.0 akışı başlatılır
**Then** `chrome.identity.launchWebAuthFlow` ile Atlassian yetkilendirme sayfası açılır
**And** başarılı yetkilendirme sonrası access token ve refresh token chrome.storage.local'a kaydedilir
**And** bağlantı durumu yeşil check ikonu + "Bağlı" olarak gösterilir

**Given** tester "Jira Server/Data Center" seçer
**When** PAT giriş formu gösterilir
**Then** Jira URL ve Personal Access Token alanları gösterilir
**And** PAT chrome.storage.local'a kaydedilir

**Given** tester "Bağlantıyı Test Et" butonuna basar
**When** test isteği gönderilir
**Then** buton loading state'e geçer: spinner + "Test ediliyor..."
**And** başarılı: yeşil check + "Bağlantı başarılı" + kullanıcı adı gösterilir
**And** başarısız: kırmızı alert + hata detayı + düzeltme önerisi gösterilir

**Given** Jira bağlantısı kurulmuş
**When** tester proje ayarlarını yapar
**Then** Jira projelerinin listesi API'dan çekilir ve dropdown'da gösterilir
**And** varsayılan proje seçimi kaydedilir

**Given** OAuth 2.0 token süresi dolmuş
**When** Jira API isteği yapılır
**Then** refresh token ile otomatik yeni access token alınır
**And** kullanıcıya kesinti hissettirilmez

**Given** PAT geçersiz olmuş
**When** Jira API isteği başarısız olur
**Then** kullanıcıya "Jira bağlantısı koptu, PAT'i yeniden girin" uyarısı gösterilir
**And** ZIP export fallback'e yönlendirilir

### Story 4.2: Jira Ticket Oluşturma ve Dosya Ekleme

As a **tester**,
I want **bug raporumu doğrudan Jira ticket olarak oluşturup tüm dosyaları otomatik ekleyebilmeyi**,
So that **developer ticket'ı açtığında tüm teknik bağlamı hemen görebilsin**.

**Acceptance Criteria:**

**Given** Jira bağlantısı kurulmuş ve bug raporu hazır
**When** tester "Jira'ya Gönder" butonuna basar
**Then** buton loading state'e geçer: spinner + "Gönderiliyor..."
**And** Jira REST API ile yeni ticket oluşturulur

**Given** ticket oluşturma başarılı
**When** description formatlanır
**Then** Jira Cloud için ADF JSON formatında oluşturulur
**And** Jira Server için Wiki markup formatında oluşturulur
**And** description şunları içerir: steps to reproduce, beklenen sonuç, gerçekleşen sonuç, environment bilgisi, cihaz özet kartı

**Given** ticket oluşturulmuş
**When** dosya ekleme başlar
**Then** toplanan tüm dosyalar (screenshot.png, dom-snapshot.html, console-logs.json, network.har, local-storage.json, session-storage.json, timeline.json) Jira REST API ile attachment olarak eklenir

**Given** tester mevcut bir ticket'a sub-bug açmak istiyor
**When** "Mevcut ticket'a bağla" seçeneğini kullanır
**Then** parent ticket key'i girilir (ör. PROJ-123)
**And** yeni ticket parent'a link ile bağlanır

**Given** ticket oluşturma ve dosya ekleme başarılı
**When** sonuç gösterilir
**Then** başarı toast'ı gösterilir: "Jira ticket oluşturuldu — PROJ-456"
**And** ticket linki tıklanabilir olarak gösterilir

**Given** Jira'ya gönderim başarısız
**When** hata oluşur
**Then** hata mesajı gösterilir: "Jira'ya bağlanılamadı. ZIP olarak indirmek ister misiniz?"
**And** ZIP İndir butonu aktif olarak sunulur (fallback)

**Given** popup'ta ExportBar görünür ve Jira yapılandırılmış
**When** Jira butonu aktif hale gelir
**Then** "Jira'ya Gönder" butonu enabled gösterilir (Epic 2'deki disabled placeholder aktifleşir)
