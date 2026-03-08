---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete', 'step-e-01-discovery', 'step-e-02-review', 'step-e-03-edit']
inputDocuments: ['_bmad-output/brainstorming/brainstorming-session-2026-03-08-000000.md', '_bmad-output/planning-artifacts/prd-validation-report.md']
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 0
classification:
  projectType: 'web_app (Browser Extension)'
  domain: 'developer_tool (QA/Testing)'
  complexity: 'medium'
  projectContext: 'greenfield'
lastEdited: '2026-03-08'
editHistory:
  - date: '2026-03-08'
    changes: 'Doğrulama raporu bulgularının sistematik düzeltmesi: 3 yeni edge-case user journey, AI-readiness başarı kriteri, MVP kapsamı güncellemeleri (FR4/FR21/Options Page), 6 FR düzeltmesi (FR3/FR19/FR24/FR28/FR32/FR33), 4 NFR düzeltmesi (NFR5/NFR7/NFR9/NFR19)'
---

# Product Requirements Document - qa-helper-plugin

**Author:** Berk
**Date:** 2026-03-08

## Executive Summary

qa-helper-plugin, manuel test süreçlerinde bug raporlama ve veri toplama problemini çözen, privacy-first bir Chrome Extension'dır. Hedef kullanıcılar manuel testerlar ve QA mühendisleridir. Tester'ın test akışını arka planda sessizce kaydeder — tıklama akışı, XHR/Fetch istekleri, console logları, SPA route değişimleri — ve bug anında tek tıkla ekran görüntüsü, DOM snapshot, localStorage, sessionStorage, console logları ve network verilerini toplar. Toplanan veriler ZIP olarak indirilebilir veya Jira'ya doğrudan gönderilebilir.

Extension iki stratejik amaca hizmet eder: (1) bağımsız, satılabilir bir ticari ürün olarak QA ekiplerine değer sunmak, (2) ileriki fazda geliştirilecek AI Bug Analyzer'a zengin, yapılandırılmış veri beslemek. Ticari model, lisans koruması, dağıtım stratejisi ve izinsiz paylaşımı önleme mekanizmaları ürün planının parçasıdır.

### What Makes This Special

- **Teknik derinlik:** Rakipler (BugHerd, Marker.io, Jam.dev) genelde screenshot + annotation sunarken, bu araç DOM, XHR, console, localStorage, sessionStorage verilerini tek pakette toplar — developer'ın "reproduce edemiyorum" demesini ortadan kaldırır.
- **Privacy-first:** Tamamen lokal çalışır, hiçbir veri 3. parti sunucuya gitmez. SaaS rakiplerinden temel ayrışma noktası.
- **Bağımsızlık:** Jira olmadan tam fonksiyonel — ZIP export her zaman çalışır, Jira entegrasyonu opsiyonel.
- **AI-ready veri yapısı:** İki Kanal Mimarisi (kullanıcı hikayesi + sistem hikayesi) ile toplanan veriler, AI Bug Analyzer'a doğrudan beslenebilecek yapıda.
- **Tek tıkla her şey hazır:** Tester uğraşmaz — bug butonuna basar, tüm veriler otomatik toplanır ve raporlanır.

## Project Classification

- **Proje Tipi:** Browser Extension (Chrome, Manifest V3)
- **Domain:** Developer/QA Tool — Manuel test ve bug raporlama
- **Karmaşıklık:** Medium — Chrome Extension API, service worker, cross-origin/iframe, SPA desteği gibi teknik zorluklar mevcut; ancak regüle bir endüstri değil
- **Proje Bağlamı:** Greenfield — sıfırdan yeni ürün
- **Ticari Bağlam:** Satılabilir ürün — lisans koruması, dağıtım ve fiyatlandırma stratejisi gerekli

## Success Criteria

### User Success

- Tester, bug bulduğu anda tek tıkla tüm teknik verileri (screenshot, DOM, XHR, console, storage) toplayabilir — manuel veri toplama süreci ortadan kalkar
- Extension arka planda sessizce çalışır, tester test akışında hiçbir kesinti veya yavaşlama hissetmez
- Sayfa crash olmaz — extension hiçbir koşulda test edilen uygulamayı bozmamalı
- Zero config start: yükle → session başlat → test et → bug raporla — öğrenme eğrisi minimal
- Bug raporu developer'a ulaştığında "reproduce edemiyorum" sorunu ortadan kalkar

### Business Success

- Chrome Web Store üzerinden global pazara açılma — bireysel testerlar self-serve olarak indirir ve kullanır
- Kişi başı ücretlendirme modeli (fiyat aralığı pazar araştırmasıyla belirlenecek)
- Lisans koruması ile izinsiz paylaşım engellenir
- Organik büyüme — kullanıcı sayısı hedefi yok, ürün kalitesi ile büyüme

### Technical Success

- Extension aktifken sayfa performansında kullanıcının fark edebileceği hiçbir düşüş olmaz
- Session kaydı sırasında sayfa crash olmaz — hiçbir senaryoda
- chrome.storage.local ile veri persist — extension/tab kapansa bile veri kaybolmaz
- Manifest V3 + service worker mimarisi ile Chrome Web Store uyumlu
- SPA, iframe, cross-app (aynı tab'da domain değişimi) senaryolarında sorunsuz çalışır

### AI-Readiness

- Toplanan veri dosyaları (XHR, console, DOM, storage, timeline) makine tarafından parse edilebilir yapıda — JSON formatında, tutarlı şema ile
- İki Kanal Mimarisi çıktısı (kullanıcı hikayesi + sistem hikayesi) tek bir birleşik timeline JSON'ında zaman damgası ile sıralı
- Veri şeması belgelenmiş ve versiyonlanmış — AI Bug Analyzer entegrasyonu ek dönüşüm gerektirmeden doğrudan tüketebilir

### Measurable Outcomes

- Bug raporu oluşturma: tek tıkla tamamlanır (< 30 saniye, form dahil)
- Extension kaynaklı sayfa crash oranı: %0
- Kullanıcının fark edeceği performans etkisi: sıfır
- Session verisi kaybı: %0 (persist mekanizması ile)

## User Journeys

### Yolculuk 1: Elif — Manuel Tester (Başarı Yolu)

**Kim:** Elif, 28 yaşında, bir e-ticaret şirketinde 3 yıldır manuel tester. Her sprint'te 15-20 test senaryosu yürütüyor.

**Açılış:** Elif bug bulduğunda her seferinde aynı ritüeli yaşıyor — screenshot al, DevTools aç, console'u kopyala, localStorage'ı kontrol et, network tab'ından ilgili istekleri bul, hepsini bir Jira ticket'a yapıştır. Bir bug raporlamak 10-15 dakikasını alıyor. Bazen aceleyle eksik veri gönderiyor, developer "reproduce edemiyorum" diyor, Elif tekrar aynı bug'ı yakalamaya çalışıyor.

**Yükseliş:** Elif, qa-helper-plugin'i Chrome Web Store'dan indirip lisansını aktive ediyor. İlk test session'ında extension ikonuna tıklayıp "Session Başlat" diyor. Testine normal devam ediyor — extension sessizce arka planda tıklama akışını, XHR isteklerini, console loglarını kaydediyor. Elif hiçbir fark hissetmiyor.

**Doruk Anı:** Elif ödeme sayfasında bir bug buluyor. Extension ikonundaki kırmızı badge zaten console error olduğunu gösteriyor. "Bug Raporla" butonuna basıyor. Minimal formda "Ödeme butonu tıklanınca 500 hatası" yazıyor, priority seçiyor. Tek tıkla — screenshot, DOM, XHR logları, console, localStorage, sessionStorage, tıklama akışı — hepsi toplanıyor. ZIP indir veya Jira'ya gönder seçenekleri çıkıyor. Jira'ya gönderiyor — ticket otomatik oluşuyor, tüm dosyalar attachment olarak ekleniyor, steps to reproduce otomatik dolduruluyor.

**Çözüm:** Developer ticket'ı açtığında, XHR loglarından 500 dönen endpoint'i, DOM snapshot'tan formun durumunu, console'dan stack trace'i hemen görüyor. "Reproduce edemiyorum" demiyor, direkt fix'e başlıyor. Elif'in bug raporlama süresi 10 dakikadan 30 saniyeye düşüyor.

### Yolculuk 2: Elif — Manuel Tester (Edge Case — Session'sız Bug)

**Açılış:** Elif session başlatmayı unutuyor ve test ederken bir bug buluyor.

**Yükseliş:** Bug raporla butonuna basıyor. Extension uyarı veriyor: "Session başlatılmadı, sadece anlık snapshot alınacak. Devam etmek istiyor musun?"

**Doruk Anı:** Elif "Evet" diyor. Extension o anın snapshot'ını alıyor — screenshot, DOM, localStorage, sessionStorage, console (mevcut sayfa). Tıklama akışı ve XHR geçmişi yok ama anlık durum yakalanıyor.

**Çözüm:** Elif eksik ama yine de değerli bir rapor oluşturuyor. Bir dahaki sefere session başlatmayı hatırlıyor. Araç onu cezalandırmıyor, elinden gelenin en iyisini yapıyor.

### Yolculuk 3: Ahmet — Developer (Rapor Tüketici)

**Kim:** Ahmet, 32 yaşında frontend developer. Elif'in takımında çalışıyor.

**Açılış:** Ahmet her gün Jira'da bug ticket'ları alıyor. Çoğunda "ödeme sayfası çalışmıyor" gibi belirsiz açıklamalar, bazen ekran görüntüsü bile yok. "Hangi tarayıcı? Hangi adımlar? Console'da ne var?" diye sorarak vakit kaybediyor.

**Yükseliş:** Elif'in qa-helper-plugin ile oluşturduğu ticket'ı açıyor. Description'da otomatik oluşturulmuş steps to reproduce, environment bilgisi ve cihaz özet kartı var.

**Doruk Anı:** Attachment'lardaki dosyalara bakıyor — `xhr-log.json`'da 500 dönen API isteğinin request/response body'sini, `console-logs.json`'da tam stack trace'i, `dom-snapshot.html`'de formun o anki durumunu görüyor. Timeline'dan kullanıcının hangi adımlardan geçtiğini takip ediyor. Reproduce etmesine bile gerek kalmıyor — sorun apaçık ortada.

**Çözüm:** Ahmet bug'ı 5 dakikada fix'liyor. Elif'e geri dönüp "reproduce edemiyorum" demesi tarihe karışıyor. "Bu extension'ı tüm testerlar kullansın" diyor.

### Yolculuk 4: Berk — Lisans Sahibi / Satın Alan

**Kim:** Bir tester ya da küçük QA ekibinin lideri. Extension'ı satın almak ve kullanmaya başlamak istiyor.

**Açılış:** Chrome Web Store'da bug raporlama araçları arıyor. qa-helper-plugin'i buluyor — "privacy-first, lokal çalışır, tek tıkla bug raporu" açıklaması dikkatini çekiyor.

**Yükseliş:** Extension'ı satın alıyor, lisans anahtarını alıyor. Extension'ı yüklüyor, ayarlar sayfasında lisans anahtarını giriyor, aktive oluyor. Jira bağlantısını ayarlardan kuruyor (opsiyonel). Environment, proje, agile team gibi konfigürasyon alanlarını bir kez dolduruyor.

**Doruk Anı:** İlk bug raporunu oluşturuyor. "Bu kadar kolay mıydı?" Zero config start vaadi gerçekleşiyor — yükle, ayarla, başla.

**Çözüm:** Araç tam istediği gibi çalışıyor. Takımındaki diğer testerlara da öneriyor — her biri kendi lisansını alıyor.

### Yolculuk 5: Elif — Sayfa Crash / Extension Kurtarma

**Açılış:** Elif session sırasında test ettiği sayfa tamamen çöküyor (tab crash) veya extension beklenmedik şekilde yeniden başlıyor.

**Yükseliş:** Tab crash sonrası Elif sayfayı yeniden açıyor. Extension otomatik olarak crash öncesi kaydedilmiş session verisini chrome.storage.local'dan geri yüklüyor. Popup'ta "Önceki session kurtarıldı" bildirimi gösteriyor.

**Doruk Anı:** Elif crash anındaki bug'ı raporlamak istiyor. "Bug Raporla" butonuna basıyor — crash öncesine kadar olan tüm veriler (tıklama akışı, XHR logları, console) raporda mevcut. Crash anı timeline'da işaretleniyor.

**Çözüm:** Crash durumunda bile veri kaybı sıfır. Developer, crash'e yol açan akışı timeline'dan net olarak takip edebiliyor.

### Yolculuk 6: Elif — SPA Route Değişimi & iframe İçeriği

**Açılış:** Elif, SPA yapısındaki bir uygulamayı test ediyor. Sayfa yenilenmeden birden fazla route arasında geçiş yapıyor, bazı bölümlerde iframe içinde üçüncü parti widget'lar var.

**Yükseliş:** Extension, pushState/popState/hashchange eventlerini yakalayarak her route değişimini timeline'a kaydediyor. iframe içindeki content script (all_frames: true) sayesinde iframe içi DOM ve console verileri de toplanıyor.

**Doruk Anı:** Elif, iframe içindeki ödeme widget'ında bir hata buluyor. Bug raporunda hem ana sayfa hem de iframe'in DOM snapshot'ı, console logları ve XHR istekleri ayrı ayrı listeleniyor. Timeline'da hangi route'ta ve hangi iframe'de hata oluştuğu net.

**Çözüm:** Developer, SPA route geçişleri ve iframe sınırları arasında oluşan bug'ları tam bağlamıyla görüyor — hangi route'ta, hangi iframe'de, hangi veriyle hata oluştuğu açık.

### Yolculuk 7: Elif — Çoklu Tab ile Eşzamanlı Test

**Açılış:** Elif aynı anda birden fazla tab'da farklı ortamları (staging, QA, production) test ediyor. Her tab'da ayrı session çalışması gerekiyor.

**Yükseliş:** Extension, her tab için bağımsız session yönetiyor. Popup'ta aktif tab'ın session bilgisi gösteriliyor. Elif tab'lar arası geçiş yaptığında popup otomatik olarak o tab'ın session'ını gösteriyor.

**Doruk Anı:** Elif staging tab'ında bir bug buluyor. Bug raporla butonuna basıyor — yalnızca o tab'a ait session verisi toplanıyor, diğer tab'ların verileri karışmıyor.

**Çözüm:** Birden fazla ortamda eşzamanlı test yaparken veri izolasyonu tam sağlanıyor. Her tab'ın raporu yalnızca kendi session verisini içeriyor.

### Journey Requirements Summary

| Yolculuk | Ortaya Çıkan Gereksinimler |
|---|---|
| Elif - Başarı Yolu | Session kayıt motoru, snapshot, bug form, ZIP/Jira export, otomatik steps to reproduce, icon badge |
| Elif - Session'sız | Session'sız snapshot uyarısı, graceful degradation, anlık veri toplama |
| Ahmet - Developer | Yapılandırılmış export formatı, okunabilir timeline, ayrı dosyalar (XHR, console, DOM, storage) |
| Berk - Satın Alan | Chrome Web Store dağıtım, lisans aktivasyonu, ayarlar sayfası, Jira kurulumu, konfigürasyon alanları |
| Elif - Crash/Kurtarma | chrome.storage.local persist, crash sonrası session kurtarma, crash anı timeline işaretlemesi |
| Elif - SPA/iframe | pushState/popState/hashchange tespiti, iframe content script (all_frames), çoklu DOM snapshot |
| Elif - Çoklu Tab | Tab bazlı bağımsız session, aktif tab kontekst geçişi, session veri izolasyonu |

## Domain-Specific Requirements

### Chrome Web Store & Manifest V3 Kısıtlamaları

- Chrome Web Store'da doğrudan ödeme yok — harici lisanslama sistemi gerekli
- Service worker 5 dk inaktivitede kapanır — session verisini chrome.storage.local'a persist etme zorunlu
- MV3'te blocking webRequest yok — XHR/Fetch kaydı content script injection veya declarativeNetRequest ile çözülmeli
- Content script CSP kısıtlamaları — bazı sitelerde injection sınırlı olabilir

### Ticari Model & Lisanslama

- **Ödeme platformu:** LemonSqueezy (Merchant of Record, Türkiye'den payout destekli, banka havalesi ile)
- **Model:** 14 gün ücretsiz deneme, sonra ücretli (trial with paywall)
- **Platform komisyonu:** %5 + $0.50 işlem başına (+%1.5 uluslararası)
- **Lisans koruması:** LemonSqueezy License API ile key doğrulama + cihaz aktivasyon limiti (ör. 2 cihaz)
- **Periyodik doğrulama:** 7 günde bir online key kontrolü
- **Paylaşım önleme:** Lisans key + tarayıcı fingerprint eşleştirmesi, aktivasyon limiti
- **Fiyatlandırma:** Kişi başı ücret (fiyat aralığı pazar araştırmasıyla belirlenecek)

### Jira Entegrasyonu

- Jira Cloud (OAuth 2.0) ve Server/Data Center (Personal Access Token) desteği
- Wiki markup (Server) ve ADF JSON (Cloud) formatlarında description oluşturma
- Attachment upload için Jira REST API

### Teknik Kısıtlamalar

- Cross-origin iframe'lerde veri toplama sınırlı olabilir — all_frames: true ile content script injection
- SPA route tespiti: pushState, popState, hashchange dinleme
- Büyük DOM/XHR verilerinde truncation stratejisi gerekli (bellek yönetimi)

## Innovation & Novel Patterns

### Detected Innovation Areas

- **İki Kanal Mimarisi:** Havacılıktaki kara kutudan ilham — kullanıcı hikayesi (tıklama akışı, navigasyon) ve sistem hikayesi (XHR, console, storage) paralel kaydedilip birleşik timeline olarak sunulur. Rakiplerde bu yaklaşım yok.
- **Privacy-first Debug Kit:** Rakipler SaaS modelinde veriyi sunucularına gönderirken, bu araç tamamen lokal çalışır. DOM, XHR, console, storage derinliğinde veri toplayan ve hiçbir veriyi dışarı göndermeyen tek araç.
- **AI-ready Veri Pipeline:** Extension sadece bug raporlama aracı değil, aynı zamanda AI Bug Analyzer için yapılandırılmış veri toplama katmanı. Çift amaçlı mimari.
- **DevTools-sız Tam Kayıt:** Tester DevTools açmadan session boyunca tüm network istekleri ve console logları arka planda kaydedilir.

### Market Context & Competitive Landscape

- Mevcut rakipler (BugHerd, Marker.io, Jam.dev) screenshot + annotation odaklı SaaS araçları
- Hiçbiri tamamen lokal çalışmıyor, hiçbiri bu derinlikte teknik veri toplamıyor
- Privacy-first yaklaşım özellikle güvenlik bilincine sahip şirketlerde satın alma kararını doğrudan etkiler
- İki Kanal Mimarisi developer'lar için en büyük farklılaştırıcı — "reproduce edemiyorum" problemini tamamen ortadan kaldırıyor

### Validation Approach

- **Şirket içi beta test:** Mevcut QA ekibindeki testerlara kullandırarak gerçek dünya validasyonu
- Validasyon metrikleri: bug raporlama süresi düşüşü, developer geri bildirim kalitesi, "reproduce edemiyorum" oranı
- Beta sonrası kullanıcı geri bildirimi ile inovasyon değerinin doğrulanması

### Risk Mitigation

- **İki Kanal Mimarisi karmaşıklığı:** Basit bir timeline formatıyla başla, kullanıcı geri bildirimine göre derinleştir
- **Privacy-first + lisans doğrulama çelişkisi:** Lisans doğrulama tek harici bağlantı, test verileri asla dışarı çıkmaz — bu ayrımı net ilet
- **AI-ready yapı karmaşıklığı:** MVP'de AI entegrasyonu yok, sadece veri yapısı AI-uyumlu olsun — overengineering riski düşük

## Browser Extension Specific Requirements

### Project-Type Overview

- **Hedef Tarayıcı:** Sadece Chrome (Manifest V3)
- **UI Framework:** Preact (React API uyumlu, 3KB, extension için optimize)
- **Extension Bileşenleri:** Popup (minimal), Options Page (ayarlar), Content Scripts (veri toplama), Service Worker (background)

### Technical Architecture Considerations

- **Popup:** Preact ile minimal UI — session toggle, bug raporla, session bilgisi, ayarlara link
- **Options Page:** Preact ile full-page ayarlar — Jira kurulumu, lisans yönetimi, toggle'lar, konfigürasyon alanları
- **Content Scripts:** Vanilla JS — DOM, tıklama, XHR/Fetch, console kayıt. Performans kritik.
- **Service Worker:** Event-driven background logic — session yönetimi, veri persist, lisans doğrulama
- **Veri toplama zamanlaması:** Session boyunca arka planda kayıt, bug raporlama anında snapshot ve birleştirme

### Implementation Considerations

- Content script'ler vanilla JS olmalı — framework overhead'i sayfa performansını etkiler
- Popup ve options page Preact ile geliştirilebilir — bu bileşenler extension'ın kendi UI'ı
- Build tool: Vite veya webpack ile Preact + content script birlikte bundle edilebilir
- Erişilebilirlik (WCAG): gerekli değil, temel UI erişilebilirliği yeterli

## Product Scope & Phased Development

### MVP Strategy & Philosophy

**MVP Yaklaşımı:** Problem-solving MVP — tester'ın bug raporlama acısını tamamen çözen, tam fonksiyonel bir araç. Ticari altyapı hariç tüm temel özellikler ilk sürümde mevcut. Beta sürecinde şirket içi testerlara ücretsiz kullandırılarak validasyon yapılacak.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Elif (Tester) — tam başarı yolu: session kayıt → bug bul → tek tıkla raporla → ZIP/Jira export
- Elif — session'sız bug: anlık snapshot ile graceful degradation
- Elif — crash/kurtarma: session verisi persist ve otomatik kurtarma
- Elif — SPA/iframe: route değişimi ve iframe içerik kaydı
- Elif — çoklu tab: tab bazlı bağımsız session yönetimi
- Ahmet (Developer) — yapılandırılmış bug raporu tüketimi

**Must-Have Capabilities:**

1. **Session Kayıt Motoru** (öncelikli geliştirme — en riskli bileşen)
   - Tıklama akışı kaydı
   - XHR/Fetch intercept (DevTools'suz)
   - Console log kaydı (rolling window — mevcut + önceki sayfa)
   - SPA route tespiti (pushState, popState, hashchange)
   - Tab bazlı bağımsız session
   - Aktif tab öncelikli kayıt
   - Cross-app tracking (aynı tab'da domain değişimi)
   - Session verisini chrome.storage.local'a persist (tab/extension kapansa bile kaybolmaz)

2. **Bug Anı Snapshot**
   - Screenshot + metadata (viewport, browser, OS, zoom, pixel ratio, dil)
   - DOM snapshot (son sayfa)
   - localStorage / sessionStorage dump
   - Console logları + stack trace parse
   - iframe desteği (all_frames: true)

3. **Bug Raporlama UX**
   - Minimal form: beklenen sonuç, neden bug, priority
   - Otomatik steps to reproduce (akıştan)
   - Ortam bilgileri otomatik toplama (browser, OS, viewport, cihaz) — rapora otomatik ekleme
   - Konfigürasyon alanları: environment, test cycle, agile team, proje
   - Session'sız bug uyarısı

4. **Export — ZIP**
   - Yapılandırılmış dosya sistemi (description, screenshot, DOM, console, XHR, storage, timeline)
   - Clipboard'a description kopyalama

5. **Export — Jira**
   - Jira Cloud (OAuth 2.0) + Server/Data Center (PAT) desteği
   - Ticket oluşturma, attachment ekleme
   - Wiki markup / ADF JSON formatları
   - Description: steps to reproduce, beklenen sonuç, environment, cihaz kartı

6. **Extension UI**
   - Icon badge (gri/yeşil/kırmızı)
   - Minimal popup (Preact): session toggle, bug raporla, session bilgisi, ayarlara link
   - Options page (Preact): Jira bağlantı kurulumu, konfigürasyon alanları yönetimi, toggle ayarları
   - Toggle bazlı modüler kontrol (HAR, Console, DOM, localStorage, sessionStorage)
   - Session temizleme: export sonrası sor

### Post-MVP Features

**Phase 2 — Ticari Altyapı + Gelişmiş Özellikler:**
- LemonSqueezy entegrasyonu (lisans key, ödeme, trial)
- Lisans koruması (key doğrulama, cihaz limiti, periyodik kontrol)
- Chrome Web Store yayını (ücretli)
- Screenshot annotation (ok, daire, text)
- Keyboard shortcut (Ctrl+Shift+B)
- Bug raporu önizleme

**Phase 3 — Expansion:**
- Kara kutu döngüsel buffer
- Settings sync (Chrome profili)
- Console error + tıklama anı eşleştirmesi
- AI Bug Analyzer entegrasyonu

### Risk Mitigation Strategy

**Teknik Riskler:**
- Session kayıt motoru en karmaşık bileşen — öncelikli geliştirme ile erken risk azaltma
- MV3 service worker timeout — chrome.storage.local ile persist, erken prototip ile doğrulama
- XHR/Fetch intercept yöntemi — content script ile monkey-patching, CSP sorunları erken tespit

**Pazar Riskleri:**
- Şirket içi beta test ile ürün-pazar uyumu doğrulama
- Beta'da tester ve developer geri bildirimleri ile iterasyon
- Fiyatlandırma kararı beta sonrası pazar araştırmasıyla

**Kaynak Riskleri:**
- Tek geliştirici projesi — MVP kapsamı geniş ama tüm bileşenler bağımsız geliştirilebilir
- Ticari altyapı Faz 2'ye bırakılarak MVP odağı daraltıldı
- En kötü senaryo: Jira entegrasyonu MVP'den çıkarılıp sadece ZIP export ile çıkılabilir (fallback)

## Functional Requirements

### Session Yönetimi

- FR1: Tester, extension popup'ından tek tıkla test session'ı başlatabilir ve durdurabilir
- FR2: Extension, her tab için bağımsız session yönetebilir
- FR3: Extension, aktif tab'da tüm veri kaynaklarını (tıklama, XHR, console, DOM) kaydeder; background tab'larda yalnızca session state'i (URL, tab ID) korur, aktif kayıt yapmaz
- FR4: Extension, session verisini tarayıcı/tab kapansa bile persist edebilir
- FR5: Extension, aynı tab'da domain değişse bile session'ı sürdürebilir (cross-app tracking)
- FR6: Tester, export sonrası session verilerini temizleyip temizlememeyi seçebilir

### Veri Toplama & Kayıt

- FR7: Extension, session boyunca kullanıcının tıklama akışını (sayfa URL/route + tıklanan element text) sıralı olarak kaydedebilir
- FR8: Extension, session boyunca tüm XHR/Fetch isteklerini (static asset hariç) DevTools açık olmadan kaydedebilir
- FR9: Extension, console loglarını mevcut sayfa + bir önceki sayfa için rolling window ile kaydedebilir
- FR10: Extension, SPA route değişimlerini (pushState, popState, hashchange) tespit edip kaydedebilir
- FR11: Extension, iframe içindeki verileri toplayabilir (all_frames desteği)
- FR12: Tester, hangi veri kaynaklarının aktif olacağını toggle ile kontrol edebilir (HAR, Console, DOM, localStorage, sessionStorage)

### Bug Anı Snapshot

- FR13: Extension, bug raporlama anında aktif sayfanın ekran görüntüsünü alabilir
- FR14: Extension, screenshot'a metadata ekleyebilir (viewport, browser, OS, zoom, pixel ratio, dil)
- FR15: Extension, son sayfanın tam DOM snapshot'ını alabilir
- FR16: Extension, localStorage ve sessionStorage içeriğini dump edebilir
- FR17: Extension, console loglarını stack trace parse ederek toplayabilir
- FR18: Extension, session'sız durumda sadece anlık snapshot alabilir ve tester'ı uyarabilir

### Bug Raporlama

- FR19: Tester, maksimum 3 alanlı bir form ile bug raporu oluşturabilir (beklenen sonuç, neden bug, priority)
- FR20: Extension, tıklama akışından otomatik steps to reproduce oluşturabilir
- FR21: Extension, ortam bilgilerini (browser, OS, viewport, cihaz) otomatik toplayıp rapora ekleyebilir
- FR22: Tester, konfigürasyon alanlarını (environment, test cycle, agile team, proje) bir kez ayarlayıp her rapora otomatik ekleyebilir

### Export — ZIP

- FR23: Tester, bug raporunu yapılandırılmış ZIP dosyası olarak indirebilir
- FR24: ZIP, standart veri kategorilerinde olmalı: açıklama metni, ekran görüntüsü, DOM snapshot, console logları, XHR/Fetch kayıtları, localStorage dump, sessionStorage dump, birleşik timeline
- FR25: Tester, description text'ini tek tıkla clipboard'a kopyalayabilir

### Export — Jira

- FR26: Tester, Jira Cloud ve Jira Server/Data Center'a bağlantı kurabilir
- FR27: Tester, extension üzerinden Jira ticket oluşturabilir
- FR28: Tester, mevcut bir ticket'a sub-bug olarak yeni ticket açabilir
- FR29: Extension, toplanan dosyaları Jira ticket'a otomatik attachment olarak ekleyebilir
- FR30: Extension, description'ı Jira formatında (Wiki markup veya ADF JSON) oluşturabilir
- FR31: Extension, steps to reproduce, beklenen sonuç, environment ve cihaz özet kartını description'a ekleyebilir

### Extension UI & Deneyim

- FR32: Extension, icon badge ile durumu gösterebilir: pasif durumda varsayılan ikon, session aktifken görsel farklılaştırma, console error yakalandığında badge ile bildirim
- FR33: Tester, popup üzerinden session bilgisini görebilir: geçen süre, ziyaret edilen sayfa sayısı, kaydedilen XHR istek sayısı, yakalanan console error sayısı
- FR34: Tester, options page üzerinden Jira bağlantısını yapılandırabilir
- FR35: Tester, options page üzerinden konfigürasyon alanlarını yönetebilir

## Non-Functional Requirements

### Performance

- NFR1: Extension aktifken sayfa yüklenme süresine eklenen gecikme < 50ms
- NFR2: Popup açılış süresi < 100ms
- NFR3: Session başına toplam bellek kullanımı < 50MB
- NFR4: Bug raporlama (snapshot toplama + paketleme) < 3 saniye
- NFR5: XHR/console kayıt overhead'i sayfa CPU kullanımına < %2 ek yük getirir
- NFR6: 100+ XHR isteği olan sayfalarda performans degradasyonu < %5
- NFR7: Content script injection, host sayfanın DOM manipülasyonlarına < 5ms gecikme ekler

### Security

- NFR8: Toplanan tüm test verileri yalnızca chrome.storage.local'da saklanır, harici sunucuya gönderilmez
- NFR9: Jira credentials chrome.storage.local'da saklanır; OAuth 2.0 token'ları Chrome'un dahili token yönetimi (chrome.identity) ile korunur, PAT'ler ise chrome.storage.local'da tutulur ve yalnızca Jira API çağrıları sırasında okunur
- NFR10: Lisans key doğrulama dışında hiçbir harici ağ bağlantısı yapılmaz
- NFR11: Content script'ler host sayfanın JavaScript scope'unu kirletmez

### Privacy

- NFR12: Kullanıcı verileri hiçbir koşulda extension dışına gönderilmez (lisans doğrulama hariç)
- NFR13: Toplanan DOM/XHR/console verileri yalnızca kullanıcının explicit export aksiyonu ile paylaşılır
- NFR14: Session verileri kullanıcı tarafından tek tıkla temizlenebilir
- NFR15: Extension, kullanıcının ziyaret ettiği URL'leri veya gezinti geçmişini harici servislere raporlamaz

### Integration

- NFR16: Jira Cloud REST API v3 ile uyumlu çalışır
- NFR17: Jira Server/Data Center REST API v2 ile uyumlu çalışır
- NFR18: Jira bağlantısı kurulamadığında ZIP export fallback her zaman çalışır
- NFR19: OAuth 2.0 token süresi dolduğunda otomatik refresh token ile yeniler; PAT geçersiz olduğunda kullanıcıya "Jira bağlantısı koptu, PAT'i yeniden girin" uyarısı gösterir ve ZIP export fallback'e yönlendirir

### Reliability

- NFR20: Service worker kapansa bile session verisi kaybolmaz (chrome.storage.local persist)
- NFR21: Tab crash durumunda o ana kadar toplanan veriler korunur
- NFR22: Network bağlantısı kesilse bile lokal işlevsellik (kayıt, snapshot, ZIP export) çalışmaya devam eder
