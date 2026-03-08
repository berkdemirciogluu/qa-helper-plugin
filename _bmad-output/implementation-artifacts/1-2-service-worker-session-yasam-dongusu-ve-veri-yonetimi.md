# Story 1.2: Service Worker — Session Yaşam Döngüsü ve Veri Yönetimi

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **tester**,
I want **session'ı başlatıp durdurabilmeyi ve session verisinin kaybolmamasını**,
So that **tab kapansa veya extension yeniden başlasa bile kayıt verilerim korunsun**.

## Acceptance Criteria

1. **Given** extension yüklü ve service worker aktif, **When** popup'tan `START_SESSION` mesajı gönderilir, **Then** service worker aktif tab için yeni bir session oluşturur ve `session_meta_{tabId}` key'i ile chrome.storage.local'a yazar **And** session metadata başlangıç zamanı (`startTime`), URL, durum (`recording`) ve sıfırlanmış sayaçları (`clicks`, `xhrRequests`, `consoleErrors`, `navEvents`) içerir.

2. **Given** session aktif, **When** `STOP_SESSION` mesajı gönderilir, **Then** session durumu `"stopped"` olarak güncellenir ve storage'a yazılır.

3. **Given** session aktif, **When** content script'ten veri mesajları gelir (`FLUSH_DATA`), **Then** flush-manager verileri 2-3 saniye debounce ile batch olarak chrome.storage.local'a yazar **And** kritik veriler (console error (`level: 'error'`), başarısız XHR (`status >= 400`)) debounce atlanarak anında yazılır.

4. **Given** birden fazla tab açık ve farklı session'ları var, **When** tab'lar arası geçiş yapılır, **Then** her tab'ın session verisi bağımsız olarak `session_meta_{tabId}`, `session_xhr_{tabId}`, `session_clicks_{tabId}`, `session_console_{tabId}` key'lerinde saklanır.

5. **Given** session aktif ve aynı tab'da domain değişir, **When** kullanıcı aynı tab'da farklı bir siteye navigate eder, **Then** session kesintisiz devam eder ve yeni domain timeline'a kaydedilir (service worker session'ı durdurmaz).

6. **Given** service worker kapanmış (5dk idle timeout), **When** service worker yeniden başlar ve yeni bir mesaj alır, **Then** chrome.storage.local'dan session state'i geri yüklenir ve kayıp olmaz (tüm state zaten storage'da olduğu için kayıp sıfırdır).

7. **Given** session aktif, **When** icon badge güncellemesi gerekir, **Then** service worker `chrome.action.setBadgeText` ve `chrome.action.setBadgeBackgroundColor` ile badge'i günceller: session aktifken yeşil arka plan (`#22c55e`), console error varsa kırmızı arka plan (`#ef4444`) + error sayısı. Session yoksa boş badge (varsayılan ikon).

## Tasks / Subtasks

- [x] **Task 1: FlushDataPayload tipini types.ts'e ekle (AC: #3)**
  - [x] 1.1 `src/lib/types.ts` içine `FlushDataPayload` interface'ini ekle:
    - `tabId: number`
    - `dataType: 'xhr' | 'click' | 'console' | 'nav'`
    - `events: TimelineEvent[]`
    - `critical?: boolean` — true olduğunda debounce atlanır
  - [x] 1.2 `StartSessionPayload` interface'ini ekle: `{ tabId: number; url: string }`
  - [x] 1.3 `StopSessionPayload` interface'ini ekle: `{ tabId: number }`
  - [x] 1.4 `GetSessionStatusPayload` interface'ini ekle: `{ tabId: number }`

- [x] **Task 2: Flush Manager oluştur — `src/background/flush-manager.ts` (AC: #3, #4)**
  - [x] 2.1 `type DataType = 'xhr' | 'click' | 'console' | 'nav'` tanımla
  - [x] 2.2 `pendingBuffers: Map<string, TimelineEvent[]>` yapısını oluştur — key: `{tabId}_{dataType}` format
  - [x] 2.3 `enqueueFlush(tabId, dataType, events, critical?)` fonksiyonu:
    - `critical === true` → `flushImmediate()` çağır
    - events içinde `ConsoleEvent.level === 'error'` varsa → `flushImmediate()`
    - events içinde `XhrEvent.status >= 400` varsa → `flushImmediate()`
    - Aksi hâlde pending buffer'a ekle, `scheduleFlush()` çağır
  - [x] 2.4 `scheduleFlush(tabId, dataType)` — `FLUSH_INTERVAL_MS` (2500ms) sonra `flushBuffer()` çağıracak debounce timer (her key için ayrı timer, var olanı iptal et ve yenile)
  - [x] 2.5 `flushBuffer(tabId, dataType)` — storage'dan mevcut diziyi oku, pending events'i ekle, storage'a yaz
  - [x] 2.6 `flushImmediate(tabId, dataType, events)` — buffer'daki ve yeni gelen events'i birleştirip hemen yaz
  - [x] 2.7 `clearFlushQueue(tabId)` — o tab'a ait tüm pending buffer'ları ve timer'ları temizle (session durdurulduğunda çağrılır)
  - [x] 2.8 `getStorageKey(dataType, tabId)` — `STORAGE_KEYS.SESSION_XHR/CLICKS/CONSOLE` + `_` + tabId pattern

- [x] **Task 3: Session Manager oluştur — `src/background/session-manager.ts` (AC: #1, #2, #5, #6, #7)**
  - [x] 3.1 `startSession(tabId, url)` — `Result<SessionMeta>` döner:
    - `getSessionKey(STORAGE_KEYS.SESSION_META, tabId)` ile storage'a yeni `SessionMeta` yaz
    - `status: 'recording'`, `startTime: Date.now()`, `url`, sıfır sayaçlar
    - `updateBadge(tabId, 0)` çağır (yeşil, hata yok)
  - [x] 3.2 `stopSession(tabId)` — `Result<void>` döner:
    - Storage'dan mevcut session_meta oku
    - `status: 'stopped'` olarak güncelle, storage'a yaz
    - `clearFlushQueue(tabId)` çağır
    - `updateBadge(tabId, null)` çağır (badge temizle)
  - [x] 3.3 `getSession(tabId)` — `Promise<Result<SessionMeta | null>>`:
    - Storage'dan session_meta_{tabId} oku ve döndür
    - Session yoksa `null` döner (error değil)
  - [x] 3.4 `updateCounters(tabId, type: 'click' | 'xhr' | 'consoleError' | 'nav', amount: number)` — `Result<void>`:
    - Storage'dan mevcut metadata oku → sayacı artır → storage'a yaz
    - `consoleError` sayacı arttığında `updateBadge(tabId, yeniSayaç)` çağır
  - [x] 3.5 `updateBadge(tabId, errorCount: number | null)` — `void`:
    - `errorCount === null`: `setBadgeText({ text: '', tabId })` — badge kaldır
    - `errorCount === 0`: `setBadgeText({ text: ' ', tabId })` + `setBadgeBackgroundColor({ color: '#22c55e', tabId })` — yeşil
    - `errorCount > 0`: `setBadgeText({ text: String(errorCount), tabId })` + `setBadgeBackgroundColor({ color: '#ef4444', tabId })` — kırmızı sayaç

- [x] **Task 4: Message Handler oluştur — `src/background/message-handler.ts` (AC: tümü)**
  - [x] 4.1 `setupMessageHandler()` — `onMessage()` wrapper'ını kaydet, şu action'ları yönet:
  - [x] 4.2 `START_SESSION` handler:
    - payload: `StartSessionPayload`
    - `startSession(tabId, url)` çağır
    - `MessageResponse<SessionMeta>` döndür
  - [x] 4.3 `STOP_SESSION` handler:
    - payload: `StopSessionPayload`
    - `stopSession(tabId)` çağır
    - `MessageResponse<void>` döndür
  - [x] 4.4 `GET_SESSION_STATUS` handler:
    - payload: `GetSessionStatusPayload`
    - `getSession(tabId)` çağır, `MessageResponse<SessionMeta | null>` döndür
  - [x] 4.5 `FLUSH_DATA` handler:
    - payload: `FlushDataPayload`
    - `enqueueFlush(tabId, dataType, events, critical)` çağır
    - xhr/click/console olaylarına göre `updateCounters()` çağır
    - `MessageResponse<void>` döndür
  - [x] 4.6 Bilinmeyen action için: `{ success: false, error: 'Unknown action' }` döndür
  - [x] 4.7 Her handler `try/catch` ile sarılmış, `[MessageHandler]` prefix'i ile console.error

- [x] **Task 5: background/index.ts güncelle (AC: #6, #7)**
  - [x] 5.1 `setupMessageHandler()` import edip çağır
  - [x] 5.2 `chrome.runtime.onInstalled` listener'ı koru — `[Background] Extension installed` logu
  - [x] 5.3 `chrome.tabs.onActivated` listener ekle:
    - Aktif tab değiştiğinde o tab'ın session'ını oku
    - Session varsa badge'i güncelle; yoksa badge'i temizle
  - [x] 5.4 Not: `chrome.runtime.onStartup` gereksiz — state chrome.storage.local'da, recovery otomatik

- [x] **Task 6: Testler yaz (AC: tümü)**
  - [x] 6.1 `src/background/session-manager.test.ts`:
    - startSession: storage'a doğru key/value yazar, success döner
    - startSession: mevcut session varsa üzerine yazar
    - stopSession: status'u 'stopped' olarak günceller
    - stopSession: session yoksa `success: false` değil, graceful handle
    - getSession: session varsa döner; yoksa null döner
    - updateCounters: sayaçları doğru artırır
    - updateBadge: errorCount=0 yeşil badge, errorCount>0 kırmızı badge, null badge siler
  - [x] 6.2 `src/background/flush-manager.test.ts`:
    - enqueueFlush: kritik olmayan → timer sonra flush
    - enqueueFlush: ConsoleEvent level='error' → anında flush
    - enqueueFlush: XhrEvent status=500 → anında flush
    - flushBuffer: mevcut storage veriyle merge eder (append, overwrite değil)
    - clearFlushQueue: timer iptal edilir, buffer temizlenir
  - [x] 6.3 `src/background/message-handler.test.ts`:
    - START_SESSION mesajı → startSession çağrılır, success response döner
    - STOP_SESSION mesajı → stopSession çağrılır
    - GET_SESSION_STATUS → getSession çağrılır, session data response'ta
    - FLUSH_DATA → enqueueFlush çağrılır
    - Bilinmeyen action → error response döner

## Dev Notes

### Kritik Mimari Kısıtlamalar

**Service Worker = Event-Driven, Stateless:**
- SW 5 dakika idle sonra Chrome tarafından öldürülür
- In-memory state (sınıf instance'ları, module-level değişkenler) SW öldüğünde kaybolur
- Tüm kalıcı state `chrome.storage.local`'da tutulmalı
- `session-manager.ts` fonksiyonları her çağrıda storage'dan okur — cache YAPMA
- `flush-manager.ts`'deki pending buffer'lar ve timer'lar uçabilir (kabul edilebilir trade-off: max 2.5s veri kaybı)

**SW Restart Recovery — Neden Basit:**
AC #6 için özel bir recovery mekanizmasına gerek yoktur. Session verisi zaten `chrome.storage.local`'da olduğundan SW restart şeffaftır. Sonraki mesaj geldiğinde `getSession(tabId)` storage'dan okur. `chrome.runtime.onStartup` sadece Chrome browser açılışında tetiklenir, SW idle restart'ta değil — bu listener'a gerek yok.

**Flush Manager — Kritik Veri Tespiti:**
Flush manager content script'ten gelen events'i inspect ederek kritikliği tespit eder:
```typescript
// Kritik: ConsoleEvent
const hasCriticalConsole = events.some(
  (e) => e.type === 'console' && (e as ConsoleEvent).level === 'error'
);
// Kritik: Başarısız XHR
const hasCriticalXhr = events.some(
  (e) => e.type === 'xhr' && (e as XhrEvent).status >= 400
);
const isCritical = critical === true || hasCriticalConsole || hasCriticalXhr;
```

**Flush Manager — Storage Append Pattern:**
XHR/click/console verileri ARRAY olarak saklanır. Yeni event geldiğinde array'e APPEND edilir:
```typescript
// flush-manager içinde
const existing = await storageGet<TimelineEvent[]>(storageKey);
const existingEvents = (existing.success && existing.data) ? existing.data : [];
await storageSet(storageKey, [...existingEvents, ...newEvents]);
```
Storage key mapping:
- `dataType: 'xhr'` → `getSessionKey(STORAGE_KEYS.SESSION_XHR, tabId)` → `session_xhr_123`
- `dataType: 'click'` → `getSessionKey(STORAGE_KEYS.SESSION_CLICKS, tabId)` → `session_clicks_123`
- `dataType: 'console'` → `getSessionKey(STORAGE_KEYS.SESSION_CONSOLE, tabId)` → `session_console_123`
- `dataType: 'nav'` → `session_nav_{tabId}` — **YENİ KEY GEREKEBİLİR** — `STORAGE_KEYS`'e `SESSION_NAV: 'session_nav'` ekle

**Cross-App Tracking (AC #5) — Yapılmaması Gereken:**
`chrome.tabs.onUpdated` listener'a gerek yok bu story'de. Domain değişimi content script (Story 1.3) tarafından `SESSION_EVENT` mesajıyla bildirilir. Service worker session'ı durdurmaz çünkü `START_SESSION` yeniden gelmediği sürece `session_meta_{tabId}` state'i değişmez. Sadece badge güncellemesi için `chrome.tabs.onActivated` yeterli.

### Dosyaları Dokunulacaklar

```
src/
├── lib/
│   └── types.ts                    ← MODIFY: FlushDataPayload, StartSessionPayload, StopSessionPayload, GetSessionStatusPayload ekle
│   └── constants.ts                ← MODIFY: STORAGE_KEYS.SESSION_NAV ekle (gerekirse)
├── background/
│   ├── index.ts                    ← MODIFY: setupMessageHandler() + onActivated listener
│   ├── session-manager.ts          ← CREATE
│   ├── flush-manager.ts            ← CREATE
│   ├── message-handler.ts          ← CREATE
│   ├── session-manager.test.ts     ← CREATE
│   ├── flush-manager.test.ts       ← CREATE
│   └── message-handler.test.ts     ← CREATE
```

### Naming Convention'lar

| Kapsam | Kural | Örnek |
|---|---|---|
| Dosyalar | kebab-case.ts | `session-manager.ts`, `flush-manager.ts` |
| Fonksiyonlar | camelCase | `startSession`, `enqueueFlush`, `updateBadge` |
| Interface/Type | PascalCase | `FlushDataPayload`, `StartSessionPayload` |
| Console prefix | `[ClassName]` | `[SessionManager]`, `[FlushManager]`, `[MessageHandler]` |
| Storage keys | snake_case + tabId | `session_meta_42`, `session_xhr_42` |

### Chrome API Kullanım Notları

**Badge API — Per-Tab Support:**
```typescript
// Tüm chrome.action badge fonksiyonları tabId kabul eder
chrome.action.setBadgeText({ text: ' ', tabId });      // boş string badge gizler
chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId }); // Tailwind green-500
chrome.action.setBadgeText({ text: '3', tabId });      // console error sayısı
chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId }); // Tailwind red-500
```
**Önemli:** Badge'ı göstermek için `text` en az 1 karakter içermeli. Boş string badge'ı gizler. Aktif session için `' '` (boşluk) kullan — görünür colored badge için.

**Storage onChanged — Bu Story'de Gerekmiyor:**
Popup'ın canlı sayaç güncellemesi almak için `chrome.storage.onChanged` kullanacak (Story 1.4). Bu story'de sadece okuma/yazma, event emit gerekmez.

**Tab ID Kaynağı — Popup vs Content Script:**
- Popup'tan gelen mesajlarda `sender.tab` null olur — `tabId` payload'da gelmeli
- Content script'ten gelen mesajlarda `sender.tab.id` kullanılabilir — ama tutarlılık için payload'da gönder

### Test Chrome Mock Kalıbı

Story 1.1'den gelen mevcut pattern (`vi.stubGlobal`) kullanılmalı. Background testleri için:
```typescript
// Her test dosyasının başında
const mockStorageGet = vi.fn();
const mockStorageSet = vi.fn();
const mockBadgeSetText = vi.fn();
const mockBadgeSetColor = vi.fn();

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: mockStorageGet,
      set: mockStorageSet,
    },
  },
  action: {
    setBadgeText: mockBadgeSetText,
    setBadgeBackgroundColor: mockBadgeSetColor,
  },
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    onActivated: {
      addListener: vi.fn(),
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
});
```

**Storage Mock Dikkat:** `storageGet` `chrome.storage.local.get(key)` çağırır, `key` adında property içeren obje bekler:
```typescript
// Doğru mock:
mockStorageGet.mockResolvedValue({ session_meta_42: { tabId: 42, status: 'recording', ... } });
// Yanlış mock:
mockStorageGet.mockResolvedValue({ tabId: 42 }); // key wrapper eksik
```

### Anti-Pattern'ler (YAPILMAYACAK)

- ❌ Module-level `let sessions = new Map()` — SW restart'ta kaybolur
- ❌ `async` fonksiyon dışında `chrome.storage` çağırmak — her zaman await kullan
- ❌ `any` tipi — `unknown + type guard` kullan
- ❌ Badge text için `String(0)` — 0 error'da `' '` (boşluk) kullan, sayıyı sadece >0'da göster
- ❌ `chrome.storage.local.set` ile array OVERWRITE — her zaman önce oku, sonra append et
- ❌ `console.log` üretim kodunda bırakmak — ESLint no-console kuralı aktif

### Önceki Story'den Öğrenilenler (Story 1.1 → 1.2)

1. **npm install**: `--legacy-peer-deps` flag'i gerekiyor (eslint peer dep uyumsuzluğu). Yeni paket eklenirse aynı flag kullanılmalı.

2. **Mevcut lib dosyaları hazır:**
   - `storageGet<T>` — null döner (key yoksa), error değil
   - `storageSet<T>` — `Result<void>` döner
   - `getSessionKey(prefix, tabId)` — `${prefix}_${tabId}` format (STORAGE_KEYS sabiti prefix olarak kullanılır)
   - `sendTabMessage<T,R>(tabId, message)` — content script'e mesaj için
   - `onMessage<T>(handler)` — message listener kaydetmek için

3. **STORAGE_KEYS sabitleri:** `session_meta` (prefix), `session_xhr`, `session_clicks`, `session_console`. `getSessionKey('session_meta', 42)` → `'session_meta_42'`

4. **MESSAGE_ACTIONS sabitleri:** `START_SESSION`, `STOP_SESSION`, `FLUSH_DATA`, `GET_SESSION_STATUS`, `SESSION_EVENT`, `SNAPSHOT_DATA` zaten tanımlı.

5. **Vitest:** `globals: true` — `describe/it/expect/vi` import'suz kullanılabilir (ama explicit import tercih edilir — Story 1.1 testlerinde import var).

6. **Code Review Dersi:** `sendMessage` daha önce `as unknown as R` cast kullanıyordu, düzeltildi. Bu story'de de güvensiz cast yapmaktan kaçın.

7. **ESLint konfigürasyonu:** `no-console` kuralı background kodu için ERROR verecek. `console.log` yerine **yalnızca** `console.error` kullanılabilir. Eğer debug log gerekiyorsa: ya ESLint disable comment ekle ya da tamamen kaldır.
   - Mevcut `storage.ts` ve `messaging.ts` içinde `console.log` çağrıları var — bu bir tutarsızlık ama mevcut kod dokunulmadan bırakılacak.

### Git Bağlamı

Son commit: `b3c50b6 feat: proje altyapısı kurulumu — Vite 7 + Preact + Tailwind v4 + MV3 Chrome Extension`

Bu story'de background module sistemi başlatılıyor. `background/index.ts` şu an sadece `onInstalled` listener içeriyor, genişletilecek.

### Project Structure Notes

**Mimari Uyum:**
- `background/session-manager.ts` → Architecture: "Session lifecycle (start/stop/persist/restore)" [Source: architecture.md#Project Structure & Boundaries]
- `background/flush-manager.ts` → Architecture: "Debounce batch write (2-3s interval)" [Source: architecture.md#Project Structure & Boundaries]
- `background/message-handler.ts` → Architecture: "Gelen mesaj routing + dispatch" [Source: architecture.md#Project Structure & Boundaries]

**Bağımlılık Akışı:**
```
index.ts → message-handler.ts → session-manager.ts → lib/storage.ts
                               → flush-manager.ts → lib/storage.ts
index.ts → (event listeners) → session-manager.ts (badge için)
```

**SESSION_NAV Storage Key:**
`lib/constants.ts`'te `SESSION_NAV: 'session_nav'` yoktur. Flush manager `nav` dataType'ını handle etmek için bu key'e ihtiyaç duyar. Bunu da `STORAGE_KEYS` objesine ekle ya da nav olaylarını `session_meta` içinde array olarak sakla. **Tercih:** `STORAGE_KEYS.SESSION_NAV = 'session_nav'` ekle — diğer key'lerle tutarlı.

**Kısıtlama — Önemli:**
Content script (Story 1.3) henüz implement edilmemiş. Bu story'de FLUSH_DATA mesajı test amaçlı manuel gönderilir. Session Manager'ın `updateCounters()` fonksiyonu ileride Story 1.3'te content script tarafından tetiklenecek. Şimdilik `FLUSH_DATA` handler içinde sayaçları güncelle.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/implementation-artifacts/1-1-proje-kurulumu-ve-chrome-extension-altyapisi.md#Dev Notes]
- [Source: _bmad-output/implementation-artifacts/1-1-proje-kurulumu-ve-chrome-extension-altyapisi.md#Dev Agent Record]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- flush-manager.test.ts: Modül-level state (pendingBuffers/pendingTimers) testler arası sızdığı için `beforeEach`'e `clearFlushQueue(42)` eklendi.
- message-handler.ts: `_sender` parametresi kullanılmıyor, ESLint `no-unused-vars` hatası için parametre kaldırıldı (TypeScript callback contravariance geçerli).

### Completion Notes List

- Task 1: `src/lib/types.ts`'e `FlushDataPayload`, `StartSessionPayload`, `StopSessionPayload`, `GetSessionStatusPayload` interface'leri eklendi. `src/lib/constants.ts`'e `SESSION_NAV` key'i eklendi.
- Task 2: `src/background/flush-manager.ts` oluşturuldu. Debounce (2500ms) ile normal flush, kritik event tespiti (console error, XHR 4xx/5xx) ile immediate flush, storage append pattern, tab bazlı buffer/timer yönetimi implement edildi.
- Task 3: `src/background/session-manager.ts` oluşturuldu. `startSession`, `stopSession`, `getSession`, `updateCounters`, `updateBadge` fonksiyonları — tümü `Result<T>` pattern ile. Badge AC tam karşılandı (yeşil/kırmızı/temiz).
- Task 4: `src/background/message-handler.ts` oluşturuldu. `setupMessageHandler()` tüm 4 action'ı handle ediyor (START_SESSION, STOP_SESSION, GET_SESSION_STATUS, FLUSH_DATA), try/catch ile sarılı.
- Task 5: `src/background/index.ts` güncellendi. `setupMessageHandler()` çağrısı + `chrome.tabs.onActivated` listener eklendi.
- Task 6: 3 test dosyası oluşturuldu, toplam 55 test geçiyor (önceki 14 test de dahil 5 dosya, 55 test). ESLint: 0 error.

### Code Review (AI) — 2026-03-08

**Reviewer:** claude-opus-4-6
**Findings:** 2 High, 3 Medium, 4 Low → Tümü düzeltildi

**Düzeltmeler:**
- H1: `startSession` artık eski session event verilerini (xhr, clicks, console, nav) temizliyor — veri bozulması önlendi
- H2: `flush-manager` `storageSet` sonucunu kontrol ediyor, hata durumunda `console.error` ile loglama
- M1: `FLUSH_DATA` handler session durumunu kontrol ediyor — sadece `recording` session'a veri kabul edilir
- M2: `flush-manager` ve `session-manager`'a per-key/per-tab lock eklendi — read-then-write race condition önlendi
- M3: `message-handler` her action'da payload validation yapıyor — gerekli alanlar kontrol ediliyor
- L1: `console.log` → `console.warn` (ESLint uyumlu)
- L2: `onActivated` callback async/await pattern'a dönüştürüldü
- L3: Gereksiz `as SessionMeta | null` cast kaldırıldı
- L4: `AnyPayload` → `KnownPayload` (`Record<string, unknown>` catch-all kaldırıldı)

**Test sonucu:** 60/60 geçiyor (önceki 55 + 5 yeni test). ESLint: 0 error, 0 warning.

### File List

- `src/lib/types.ts` (modified)
- `src/lib/constants.ts` (modified)
- `src/background/index.ts` (modified)
- `src/background/flush-manager.ts` (created)
- `src/background/session-manager.ts` (created)
- `src/background/message-handler.ts` (created)
- `src/background/flush-manager.test.ts` (created)
- `src/background/session-manager.test.ts` (created)
- `src/background/message-handler.test.ts` (created)
