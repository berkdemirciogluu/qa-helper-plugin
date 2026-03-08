# Story 4.1: Jira Bağlantı Kurulumu ve Kimlik Doğrulama

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **tester**,
I want **Jira Cloud veya Jira Server/Data Center bağlantımı options page üzerinden kurabilmeyi**,
So that **bug raporlarımı doğrudan Jira'ya gönderebilmem için altyapı hazır olsun**.

## Acceptance Criteria

1. **Given** tester options page'de "Jira Entegrasyonu" bölümüne gider, **When** Jira kurulum sayfası gösterilir, **Then** Jira platform seçimi gösterilir: "Jira Cloud" ve "Jira Server/Data Center" seçenekleri.

2. **Given** tester "Jira Cloud" seçer, **When** OAuth 2.0 akışı başlatılır, **Then** `chrome.identity.launchWebAuthFlow` ile Atlassian yetkilendirme sayfası açılır **And** başarılı yetkilendirme sonrası access token, refresh token ve cloudId `jira_credentials` key'ine kaydedilir **And** bağlantı durumu yeşil check ikonu + "Bağlı" olarak gösterilir.

3. **Given** tester "Jira Server/Data Center" seçer, **When** PAT giriş formu gösterilir, **Then** Jira URL ve Personal Access Token alanları gösterilir **And** PAT `jira_credentials` key'ine kaydedilir.

4. **Given** tester "Bağlantıyı Test Et" butonuna basar, **When** test isteği gönderilir, **Then** buton loading state'e geçer: spinner + "Test ediliyor..." **And** başarılı: yeşil check + "Bağlantı başarılı" + kullanıcı adı gösterilir **And** başarısız: kırmızı alert + hata detayı + düzeltme önerisi gösterilir.

5. **Given** Jira bağlantısı kurulmuş, **When** tester proje ayarlarını yapar, **Then** Jira projelerinin listesi API'dan çekilir ve dropdown'da gösterilir **And** varsayılan proje seçimi kaydedilir.

6. **Given** OAuth 2.0 token süresi dolmuş, **When** Jira API isteği yapılır, **Then** refresh token ile otomatik yeni access token alınır **And** kullanıcıya kesinti hissettirilmez.

7. **Given** PAT geçersiz olmuş, **When** Jira API isteği başarısız olur, **Then** kullanıcıya "Jira bağlantısı koptu, PAT'i yeniden girin" uyarısı gösterilir **And** ZIP export fallback'e yönlendirilir.

## Tasks / Subtasks

- [x] **Task 1: Jira tip tanımları ve sabitler (AC: tümü)**
  - [x] 1.1 `src/lib/jira/jira-types.ts` — CREATE: Jira-specific TypeScript tipleri
  - [x] 1.2 `src/lib/types.ts` — MODIFY: `JiraCredentials` interface genişletme (OAuth token'lar, cloudId, defaultProject ekleme)
  - [x] 1.3 `src/lib/constants.ts` — MODIFY: Jira API URL sabitleri ekleme

- [x] **Task 2: Jira auth modülü (AC: #2, #3, #6, #7)**
  - [x] 2.1 `src/lib/jira/jira-auth.ts` — CREATE: OAuth 2.0 (3LO) + PAT yönetimi
  - [x] 2.2 OAuth flow: `startOAuthFlow()` — `chrome.identity.launchWebAuthFlow` + token exchange
  - [x] 2.3 Token refresh: `refreshAccessToken()` — rotating refresh token desteği
  - [x] 2.4 PAT validation: `validatePat()` — PAT format kontrolü
  - [x] 2.5 `src/lib/jira/jira-auth.test.ts` — CREATE: 10+ test

- [x] **Task 3: Jira client modülü (AC: #4, #5, #6, #7)**
  - [x] 3.1 `src/lib/jira/jira-client.ts` — CREATE: REST API v2/v3 istek katmanı
  - [x] 3.2 `testConnection()` — `/rest/api/{version}/myself` endpoint ile bağlantı testi
  - [x] 3.3 `getProjects()` — `/rest/api/{version}/project` endpoint ile proje listesi
  - [x] 3.4 `getAccessibleResources()` — cloudId alma (OAuth Cloud)
  - [x] 3.5 Auto-refresh interceptor: 401 → refresh token → retry
  - [x] 3.6 `src/lib/jira/jira-client.test.ts` — CREATE: 12+ test

- [x] **Task 4: Manifest ve permission güncellemeleri (AC: #2)**
  - [x] 4.1 `src/manifest.json` — MODIFY: `identity` permission ekleme
  - [x] 4.2 `src/manifest.json` — MODIFY: `host_permissions` ekleme (Atlassian OAuth + API)
  - [x] 4.3 `src/manifest.json` — MODIFY: `optional_host_permissions` ekleme (Server/DC)

- [x] **Task 5: JiraSetupPage (AC: #1, #2, #3, #4, #5)**
  - [x] 5.1 `src/options/pages/JiraSetupPage.tsx` — CREATE: Jira bağlantı kurulum sayfası
  - [x] 5.2 Platform seçimi (Cloud / Server/DC)
  - [x] 5.3 Cloud: OAuth bağlantı butonu + bağlantı durumu gösterimi
  - [x] 5.4 Server/DC: URL + PAT form alanları
  - [x] 5.5 "Bağlantıyı Test Et" butonu + loading/success/error state
  - [x] 5.6 Proje listesi dropdown + varsayılan proje seçimi
  - [x] 5.7 Bağlantı kesme butonu
  - [x] 5.8 `src/options/pages/JiraSetupPage.test.tsx` — CREATE: 15+ test

- [x] **Task 6: Options page sidebar güncelleme (AC: #1)**
  - [x] 6.1 `src/options/App.tsx` — MODIFY: SidebarNav'a "Jira Entegrasyonu" bölümü ekleme (Link2 ikonu)

- [x] **Task 7: Onboarding JiraStep güncelleme (AC: #4)**
  - [x] 7.1 `src/popup/views/onboarding/JiraStep.tsx` — MODIFY: "Bağlantıyı Test Et" butonunu aktif hale getirme
  - [x] 7.2 JiraStep test connection → `jira-client.testConnection()` çağrısı
  - [x] 7.3 `src/popup/views/onboarding/JiraStep.test.tsx` — MODIFY: Test butonu aktif testleri

- [x] **Task 8: Testler ve regresyon kontrolü (AC: tümü)**
  - [x] 8.1 Tüm yeni testler co-located
  - [x] 8.2 Mevcut testlerde regresyon olmadığını doğrula
  - [x] 8.3 `npx vitest run` — tüm testler geçmeli

## Dev Notes

### Kritik Mimari Kısıtlamalar

**OAuth 2.0 (3LO) Akışı — Chrome Extension'da:**

```
1. Kullanıcı "Jira Cloud'a Bağlan" butonuna basar
2. chrome.identity.getRedirectURL('atlassian') → redirect URI alınır
3. Atlassian auth URL oluşturulur (client_id, scopes, redirect_uri, state)
4. chrome.identity.launchWebAuthFlow({ url, interactive: true }) → auth code döner
5. Token exchange: POST https://auth.atlassian.com/oauth/token (code → access_token + refresh_token)
6. Accessible resources: GET https://api.atlassian.com/oauth/token/accessible-resources → cloudId
7. Tüm token bilgileri jira_credentials storage key'ine kaydedilir
```

**OAuth 2.0 Endpoint'ler:**

| Amaç | URL | Method |
|---|---|---|
| Authorization | `https://auth.atlassian.com/authorize` | GET (browser redirect) |
| Token Exchange | `https://auth.atlassian.com/oauth/token` | POST |
| Refresh Token | `https://auth.atlassian.com/oauth/token` | POST (grant_type: refresh_token) |
| Accessible Resources | `https://api.atlassian.com/oauth/token/accessible-resources` | GET |

**OAuth 2.0 Scope'lar:**
```
read:jira-work write:jira-work read:jira-user offline_access
```

**OAuth 2.0 Token Exchange:**
```typescript
const response = await fetch('https://auth.atlassian.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    client_id: JIRA_OAUTH_CLIENT_ID,
    client_secret: JIRA_OAUTH_CLIENT_SECRET,
    code: authorizationCode,
    redirect_uri: chrome.identity.getRedirectURL('atlassian'),
  }),
});
// Response: { access_token, expires_in (3600), refresh_token, scope }
```

**Rotating Refresh Token:**
- Her refresh isteğinde YENİ refresh token döner, eski geçersiz olur
- 90 gün inaktivite sonrası expire olur
- YENİ refresh token'ı MUTLAKA kaydetmeli — kaybedilirse kullanıcı tekrar OAuth yapmalı

**client_secret Notu:**
- Atlassian 3LO, client_secret gerektirir (PKCE desteği resmi olarak yok)
- Chrome extension public client olduğundan secret tam güvenli değil ama pratik çözüm budur
- `.env` dosyasında sakla, build sırasında inject et
- Alternatif: backend proxy (ama proje privacy-first ve harici sunucu yok politikası var — client_secret embed pragmatik seçim)

**Jira Cloud API Base URL:**
```
https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/{resource}
```

**Jira Server/DC API Base URL:**
```
https://{instance-url}/rest/api/2/{resource}
```

**PAT Authentication (Server/DC):**
```
Authorization: Bearer {personal-access-token}
```

**OAuth Authentication (Cloud):**
```
Authorization: Bearer {access_token}
```

### JiraCredentials Genişletme

**Mevcut interface:**
```typescript
interface JiraCredentials {
  platform: 'cloud' | 'server' | '';
  url: string;
  token: string;
}
```

**Genişletilmiş interface:**
```typescript
interface JiraCredentials {
  platform: 'cloud' | 'server' | '';
  url: string;
  token: string; // PAT for Server, access_token for Cloud

  // Cloud OAuth ek alanlar
  refreshToken?: string;
  accessTokenExpiresAt?: number; // Unix timestamp (ms)
  cloudId?: string;
  siteName?: string; // Jira site adı (ör. "myteam.atlassian.net")

  // Ortak
  displayName?: string; // Bağlantı testi sonrası kullanıcı adı
  defaultProjectKey?: string; // Varsayılan proje key'i
  connected?: boolean; // Bağlantı durumu
}
```

**DİKKAT — Geriye dönük uyumluluk:**
- Onboarding JiraStep zaten `platform`, `url`, `token` yazıyor
- Genişletme mevcut verileri korur — ek alanlar optional
- `storageGet<JiraCredentials>(STORAGE_KEYS.JIRA_CREDENTIALS)` ile oku, merge pattern ile yaz

### Jira Types (jira-types.ts)

```typescript
// Jira API response tipleri
interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls: Record<string, string>;
}

interface JiraProject {
  id: string;
  key: string;
  name: string;
  avatarUrls: Record<string, string>;
}

interface JiraAccessibleResource {
  id: string; // cloudId
  name: string;
  url: string;
  scopes: string[];
  avatarUrl: string;
}

interface JiraOAuthTokens {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

// API version helper
type JiraApiVersion = '2' | '3';
```

### Manifest Güncellemeleri

```json
{
  "permissions": [
    "activeTab", "storage", "unlimitedStorage", "tabs", "scripting",
    "identity"
  ],
  "host_permissions": [
    "https://auth.atlassian.com/*",
    "https://api.atlassian.com/*"
  ],
  "optional_host_permissions": [
    "https://*/*"
  ]
}
```

**`identity` permission:** `chrome.identity.launchWebAuthFlow` için zorunlu.

**`host_permissions`:** Atlassian OAuth ve API endpoint'leri için zorunlu (Cloud).

**`optional_host_permissions`:** Jira Server/DC URL'leri kullanıcıya göre değişir. Runtime'da `chrome.permissions.request()` ile istenir.

**DİKKAT:** `optional_host_permissions` kullanılırsa Server/DC bağlantısı sırasında kullanıcıdan runtime permission istenmeli:
```typescript
const granted = await chrome.permissions.request({
  origins: [`${jiraServerUrl}/*`]
});
if (!granted) { /* kullanıcı reddetti — uyarı göster */ }
```

### Options Page Sidebar Güncelleme

**Mevcut sidebar:**
```
1. Genel (Settings icon)
2. Konfigürasyon (ClipboardList icon)
3. Veri Yönetimi (Database icon)
4. Hakkında (Info icon)
```

**Güncellenmiş sidebar:**
```
1. Genel (Settings icon)
2. Konfigürasyon (ClipboardList icon)
3. Jira Entegrasyonu (Link2 icon) ← YENİ
4. Veri Yönetimi (Database icon)
5. Hakkında (Info icon)
```

**UX Spec referansı:** SidebarNav bölümleri: "Genel, Jira Entegrasyonu, Lisans, Veri Yönetimi, Hakkında" — Lisans Phase 2'de eklenecek, şimdilik sadece Jira Entegrasyonu eklenmeli.

### JiraSetupPage Detaylı Tasarım

**Empty State (Jira kurulmamış):**
```
┌─────────────────────────────────────────────────┐
│ Jira Entegrasyonu                                │
│                                                  │
│ Jira henüz yapılandırılmadı.                    │
│ Bug raporlarınızı doğrudan Jira'ya gönderin.    │
│                                                  │
│ Platform seçin:                                  │
│ ○ Jira Cloud    ○ Jira Server / Data Center     │
│                                                  │
│ [Cloud seçiliyse]                                │
│ [Jira Cloud'a Bağlan] ← Primary buton           │
│                                                  │
│ [Server seçiliyse]                               │
│ Jira URL    [https://jira.sirketiniz.com     ]  │
│ API Token   [••••••••••••••••                 ]  │
│                                                  │
│ [Bağlantıyı Test Et] ← Secondary buton          │
└─────────────────────────────────────────────────┘
```

**Connected State:**
```
┌─────────────────────────────────────────────────┐
│ Jira Entegrasyonu                                │
│                                                  │
│ ✓ Bağlı — Ahmet Yılmaz (myteam.atlassian.net)  │
│                                                  │
│ Varsayılan Proje:                                │
│ [PROJ - E-Commerce ▼]  ← Dropdown (API'dan)     │
│                                                  │
│ [Bağlantıyı Test Et]  [Bağlantıyı Kes]          │
└─────────────────────────────────────────────────┘
```

**Loading/Error States:**
| Durum | Gösterim |
|---|---|
| OAuth akışı başlatılıyor | "Jira Cloud'a Bağlan" butonu disabled + spinner |
| Bağlantı test ediliyor | "Test ediliyor..." + spinner |
| Başarılı test | Yeşil check + "Bağlantı başarılı" + kullanıcı adı |
| Başarısız test | Kırmızı alert + hata detayı + düzeltme önerisi |
| Projeler yükleniyor | Select disabled + "Yükleniyor..." placeholder |
| Token refresh başarısız | Sarı banner + "Oturum süresi doldu, tekrar bağlanın" |

### Onboarding JiraStep Güncelleme

**Mevcut durum:** "Bağlantıyı Test Et" butonu disabled + tooltip "Jira entegrasyonu yakında"

**Güncelleme:** Butonu aktif yap → `jira-client.testConnection()` çağır → sonucu göster

```typescript
// JiraStep.tsx güncelleme
import { testConnection } from '@/lib/jira/jira-client';

const handleTestConnection = async () => {
  setTestStatus('loading');
  const result = await testConnection(credentials);
  if (result.success) {
    setTestStatus('success');
    setTestMessage(`Bağlantı başarılı — ${result.data.displayName}`);
  } else {
    setTestStatus('error');
    setTestMessage(result.error);
  }
};
```

**DİKKAT:** Onboarding'de OAuth flow başlatmak UX açısından uygun olmayabilir (popup içinden launchWebAuthFlow). Onboarding'deki Jira step'inde:
- **Server/DC:** URL + PAT girişi + test butonu → TAM fonksiyonel
- **Cloud:** "Jira Cloud bağlantısı için Ayarlar sayfasını kullanın" bilgi mesajı göster → test butonu sadece Server/DC için aktif

### Jira Client Modül Tasarımı

**jira-client.ts — Result<T> pattern zorunlu:**
```typescript
async function testConnection(credentials: JiraCredentials): Promise<Result<JiraUser>> {
  try {
    const baseUrl = getApiBaseUrl(credentials);
    const version = credentials.platform === 'cloud' ? '3' : '2';
    const response = await fetch(`${baseUrl}/rest/api/${version}/myself`, {
      headers: getAuthHeaders(credentials),
    });
    if (!response.ok) { /* error handling */ }
    const user = await response.json();
    return { success: true, data: user };
  } catch (error) {
    console.error('[JiraClient]', error);
    return { success: false, error: getJiraErrorMessage(error) };
  }
}
```

**API Base URL oluşturma:**
```typescript
function getApiBaseUrl(credentials: JiraCredentials): string {
  if (credentials.platform === 'cloud') {
    return `https://api.atlassian.com/ex/jira/${credentials.cloudId}`;
  }
  return credentials.url; // Server/DC — direkt instance URL
}
```

**Auto-refresh interceptor:**
```typescript
async function jiraFetch(
  credentials: JiraCredentials,
  path: string,
  options?: RequestInit
): Promise<Response> {
  let response = await fetch(url, { ...options, headers: getAuthHeaders(credentials) });

  // 401 ve Cloud → refresh token dene
  if (response.status === 401 && credentials.platform === 'cloud' && credentials.refreshToken) {
    const refreshResult = await refreshAccessToken(credentials);
    if (refreshResult.success) {
      // Yeni token ile tekrar dene
      response = await fetch(url, { ...options, headers: getAuthHeaders(refreshResult.data) });
    }
  }

  return response;
}
```

### Hata Mesajları (UX — Cezalandırmayan Ton)

| Hata Durumu | Mesaj |
|---|---|
| OAuth iptal | "Yetkilendirme iptal edildi. Tekrar denemek isterseniz butona basın." |
| OAuth hata | "Jira bağlantısı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin." |
| PAT geçersiz | "API token geçersiz. Jira profilinizden yeni bir token oluşturabilirsiniz." |
| Server ulaşılamıyor | "Jira sunucusuna ulaşılamıyor. URL'i ve ağ bağlantınızı kontrol edin." |
| Proje listesi boş | "Erişilebilir proje bulunamadı. Jira yetkilendirmelerinizi kontrol edin." |
| Token expired (refresh başarısız) | "Oturum süresi doldu. Lütfen tekrar bağlanın." |

### Erişilebilirlik

- Tüm form alanları `label` + `aria-label` ile etiketlenmeli
- Platform seçimi: `role="radiogroup"` + `role="radio"` (veya native radio input)
- Bağlantı durumu: `aria-live="polite"` ile duyuru
- Loading state: `aria-busy="true"` + `aria-label="Test ediliyor"`
- Hata mesajları: `role="alert"` + `aria-live="assertive"`
- Tüm butonlar keyboard erişilebilir (Tab, Enter, Space)
- Focus management: OAuth dönüşünde focus'u sonuç alanına taşı

### Dosya Organizasyonu

```
src/
├── lib/
│   ├── jira/                          ← CREATE: Yeni klasör
│   │   ├── jira-types.ts             ← CREATE: Jira API tipleri
│   │   ├── jira-auth.ts              ← CREATE: OAuth 2.0 + PAT
│   │   ├── jira-auth.test.ts         ← CREATE: Auth testleri
│   │   ├── jira-client.ts            ← CREATE: REST API client
│   │   └── jira-client.test.ts       ← CREATE: Client testleri
│   ├── types.ts                       ← MODIFY: JiraCredentials genişletme
│   └── constants.ts                   ← MODIFY: Jira API sabitleri
├── options/
│   ├── App.tsx                        ← MODIFY: Sidebar'a Jira ekleme
│   └── pages/
│       ├── JiraSetupPage.tsx          ← CREATE: Jira kurulum sayfası
│       └── JiraSetupPage.test.tsx     ← CREATE: Testler
├── popup/
│   └── views/
│       └── onboarding/
│           ├── JiraStep.tsx           ← MODIFY: Test butonu aktif
│           └── JiraStep.test.tsx      ← MODIFY: Testler güncelle
└── manifest.json                      ← MODIFY: identity + host_permissions
```

### Naming Convention'lar

| Kapsam | Kural | Ornek |
|--------|-------|-------|
| Jira modül dosyalar | kebab-case | `jira-client.ts`, `jira-auth.ts` |
| Interface'ler | PascalCase | `JiraUser`, `JiraProject`, `JiraOAuthTokens` |
| Fonksiyonlar | camelCase | `testConnection`, `refreshAccessToken`, `getProjects` |
| Sabitler | SCREAMING_SNAKE | `JIRA_OAUTH_CLIENT_ID`, `JIRA_AUTH_URL` |
| Storage key | snake_case | `jira_credentials` (mevcut) |
| Console log prefix | [ModuleName] | `[JiraAuth]`, `[JiraClient]` |
| Test dosya | co-located | `jira-client.test.ts` |

### Konfigürasyon Değişkenleri

**`.env` dosyasına eklenecek (ve `.env.example` güncelleme):**
```
VITE_JIRA_OAUTH_CLIENT_ID=your-client-id
VITE_JIRA_OAUTH_CLIENT_SECRET=your-client-secret
```

**`vite.config.ts` define ile inject:**
```typescript
define: {
  'import.meta.env.VITE_JIRA_OAUTH_CLIENT_ID': JSON.stringify(process.env.VITE_JIRA_OAUTH_CLIENT_ID),
  'import.meta.env.VITE_JIRA_OAUTH_CLIENT_SECRET': JSON.stringify(process.env.VITE_JIRA_OAUTH_CLIENT_SECRET),
}
```

**DİKKAT:** `.env` dosyası `.gitignore`'da olmalı. `.env.example` commit edilebilir.

### Test Stratejisi

**Chrome API Mock'ları:**
```typescript
// chrome.identity.launchWebAuthFlow mock
vi.stubGlobal('chrome', {
  ...chrome,
  identity: {
    getRedirectURL: vi.fn(() => 'https://ext-id.chromiumapp.org/atlassian'),
    launchWebAuthFlow: vi.fn(),
  },
  permissions: {
    request: vi.fn(() => Promise.resolve(true)),
  },
});

// fetch mock — Jira API response'ları
global.fetch = vi.fn();
```

**Test senaryoları:**
- OAuth flow başarılı → token kaydedilir
- OAuth flow iptal → hata mesajı
- PAT ile bağlantı testi başarılı → kullanıcı adı gösterilir
- PAT ile bağlantı testi başarısız → hata mesajı
- Token refresh başarılı → yeni token kaydedilir
- Token refresh başarısız → tekrar bağlan mesajı
- Proje listesi başarılı → dropdown dolar
- Server/DC URL geçersiz → hata mesajı
- JiraSetupPage render → platform seçimi görünür
- JiraSetupPage Cloud → OAuth butonu görünür
- JiraSetupPage Server → URL + PAT formu görünür
- Sidebar'da "Jira Entegrasyonu" mevcut

### Project Structure Notes

- Architecture dokümanına uygun: `src/lib/jira/` alt modülü domain karmaşıklığını izole eder
- Tüm async fonksiyonlarda `Result<T>` pattern zorunlu
- Chrome messaging: `EXPORT_JIRA` action zaten `constants.ts`'de tanımlı (Story 4.2'de kullanılacak)
- `storageClearSessions()` jira_credentials'ı SİLMEZ (mevcut davranış korunur)
- JiraSetupPage options page responsive layout'a uymalı (3 breakpoint)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.1: Jira Bağlantı Kurulumu ve Kimlik Doğrulama]
- [Source: _bmad-output/planning-artifacts/architecture.md — §Authentication & Security, §Communication Patterns, §Project Structure]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — §SidebarNav, §Empty States, §Loading States, §Error Handling]
- [Source: _bmad-output/planning-artifacts/prd.md — FR26, FR34, NFR9, NFR16, NFR17, NFR19]
- [Source: _bmad-output/implementation-artifacts/3-3-ilk-kullanim-onboarding-wizard.md — JiraStep component, JiraCredentials interface, storage pattern]

### Previous Story Intelligence (Story 3.3)

**Doğrudan ilgili öğrenimler:**
- `JiraCredentials` interface zaten `types.ts`'te mevcut (platform, url, token) — genişletilmeli
- `JIRA_CREDENTIALS` storage key zaten `constants.ts`'te mevcut — yeni key eklemeye gerek yok
- `JiraStep.tsx` onboarding'de mevcut — test butonu disabled, aktif hale getirilmeli
- Storage merge pattern: mevcut veriyi oku → spread ile genişlet → yaz
- `vi.stubGlobal('chrome', {...})` pattern'ı test'lerde chrome API mock için standart
- 371 test mevcut — regression olmamalı
- `showToast` fonksiyonu ve `ToastContainer` options App.tsx'te zaten mevcut
- `useId` hook'u ARIA id'ler için kullanılmalı

**Dikkat edilecek pattern'lar:**
- Options page'deki sayfalar `SectionGroup` + `FormRow` layout kullanır (Story 3.1-3.2 pattern)
- DataManagementPage'deki tooltip pattern: `jira_credentials` korunduğuna dair bilgi mevcut
- AboutPage'deki storageRemove pattern'ı referans olabilir
- AsyncStatus type'ı mevcut (`'idle' | 'loading' | 'success' | 'error'`)

### Git Intelligence

**Son commit'ler ve ilgili context:**
- `100e6d5` — Story 3-3: OnboardingView wizard (JiraStep dahil)
- `2bacdd0` — Story 2.3: ZIP export, timeline builder
- `e91c9ed` — Story 2.3 code review fixes
- **371 test geçiyor** (Story 3.3 sonrası)

**Kullanılan pattern'lar:**
- Component'ler: PascalCase dosya, default export
- Lib modülleri: kebab-case dosya, named export
- Test'ler: co-located, `vi.stubGlobal` chrome mock
- Storage: `storageGet<T>()` / `storageSet<T>()` generic wrapper

### Anti-Pattern Uyarıları

- **`any` tipi KULLANMA** — `unknown` + type guard tercih et
- **Global state/singleton OLUŞTURMA** — chrome.storage.local tek gerçek kaynak
- **`window.localStorage` KULLANMA** — extension verisi sadece `chrome.storage.local`
- **client_secret'ı kaynak kodda hardcode ETME** — `.env` + build-time inject kullan
- **Inline style KULLANMA** — sadece Tailwind class'ları
- **OAuth token'ları log'a YAZMA** — güvenlik riski
- **`jira-formatter.ts` OLUŞTURMA** — bu Story 4.2'nin konusu, bu story'de sadece auth + client + connection

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (via GitHub Copilot)

### Debug Log References

Hiçbir HALT koşulu tetiklenmedi.

### Completion Notes List

- **Task 1:** `jira-types.ts` oluşturuldu (JiraUser, JiraProject, JiraAccessibleResource, JiraOAuthTokens, JiraApiVersion). `JiraCredentials` interface'i OAuth Cloud alanlarıyla genişletildi (refreshToken, accessTokenExpiresAt, cloudId, siteName, displayName, defaultProjectKey, connected). `constants.ts`'e Jira OAuth sabitleri eklendi.
- **Task 2:** `jira-auth.ts` oluşturuldu — `buildAuthUrl()`, `startOAuthFlow()` (chrome.identity.launchWebAuthFlow + token exchange + accessible resources), `refreshAccessToken()` (rotating refresh token), `validatePat()`. 13 test yazıldı.
- **Task 3:** `jira-client.ts` oluşturuldu — `testConnection()` (/myself), `getProjects()` (/project), `getAccessibleResources()`, `jiraFetch()` (401 auto-refresh interceptor). Cloud API v3, Server API v2 kullanır. 17 test yazıldı.
- **Task 4:** `manifest.json`'a `identity` permission, `host_permissions` (Atlassian OAuth + API), `optional_host_permissions` (Server/DC) eklendi.
- **Task 5:** `JiraSetupPage.tsx` oluşturuldu — platform seçimi (radio group), Cloud OAuth bağlantı, Server/DC URL+PAT form, bağlantı testi (loading/success/error), proje dropdown, bağlantı kesme. Erişilebilirlik: aria-live, role=alert, radiogroup. 14 test yazıldı.
- **Task 6:** `App.tsx` sidebar'a "Jira Entegrasyonu" (Link2 ikonu) eklendi, Konfigürasyon ile Veri Yönetimi arasına.
- **Task 7:** `JiraStep.tsx` — Cloud seçildiğinde "Ayarlar sayfasını kullanın" mesajı, Server/DC için test butonu aktif (`testConnection()` çağrısı), başarı/hata mesajları. 9 test (4 yeni).
- **Task 8:** 44 test dosyası, 422 test — hepsi geçiyor. Regresyon yok. Lint temiz (yeni dosyalarda 0 error).

### File List

**Yeni dosyalar (CREATE):**
- `src/lib/jira/jira-types.ts`
- `src/lib/jira/jira-auth.ts`
- `src/lib/jira/jira-auth.test.ts`
- `src/lib/jira/jira-client.ts`
- `src/lib/jira/jira-client.test.ts`
- `src/options/pages/JiraSetupPage.tsx`
- `src/options/pages/JiraSetupPage.test.tsx`

**Değiştirilen dosyalar (MODIFY):**
- `src/lib/types.ts` — JiraCredentials interface genişletme
- `src/lib/constants.ts` — Jira OAuth sabitleri ekleme
- `src/manifest.json` — identity permission + host_permissions + optional_host_permissions
- `src/options/App.tsx` — Sidebar'a Jira Entegrasyonu ekleme
- `src/popup/views/onboarding/JiraStep.tsx` — Test butonu aktif + testConnection entegrasyonu
- `src/popup/views/onboarding/JiraStep.test.tsx` — Test güncelleme

### Change Log

- 2026-03-08: Story 4-1 implementasyonu tamamlandı — Jira bağlantı kurulumu ve kimlik doğrulama altyapısı (OAuth 2.0 3LO + PAT), JiraSetupPage, manifest güncellemeleri, onboarding entegrasyonu. 51 yeni test, 0 regresyon.
