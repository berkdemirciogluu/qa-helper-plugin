# Story 4.2: Jira Ticket Oluşturma ve Dosya Ekleme

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **tester**,
I want **bug raporumu doğrudan Jira ticket olarak oluşturup tüm dosyaları otomatik ekleyebilmeyi**,
So that **developer ticket'ı açtığında tüm teknik bağlamı hemen görebilsin**.

## Acceptance Criteria

1. **Given** Jira bağlantısı kurulmuş ve bug raporu hazır, **When** tester "Jira'ya Gönder" butonuna basar, **Then** buton loading state'e geçer: spinner + "Gönderiliyor..." **And** Jira REST API ile yeni ticket oluşturulur.

2. **Given** ticket oluşturma başarılı, **When** description formatlanır, **Then** Jira Cloud için ADF JSON formatında oluşturulur **And** Jira Server için Wiki markup formatında oluşturulur **And** description şunları içerir: steps to reproduce, beklenen sonuç, gerçekleşen sonuç, environment bilgisi, cihaz özet kartı.

3. **Given** ticket oluşturulmuş, **When** dosya ekleme başlar, **Then** toplanan tüm dosyalar (screenshot.png, dom-snapshot.html, console-logs.json, network.har, local-storage.json, session-storage.json, timeline.json) Jira REST API ile attachment olarak eklenir.

4. **Given** tester mevcut bir ticket'a sub-bug açmak istiyor, **When** "Mevcut ticket'a bağla" seçeneğini kullanır, **Then** parent ticket key'i girilir (ör. PROJ-123) **And** yeni ticket parent'a link ile bağlanır.

5. **Given** ticket oluşturma ve dosya ekleme başarılı, **When** sonuç gösterilir, **Then** başarı toast'ı gösterilir: "Jira ticket oluşturuldu — PROJ-456" **And** ticket linki tıklanabilir olarak gösterilir.

6. **Given** Jira'ya gönderim başarısız, **When** hata oluşur, **Then** hata mesajı gösterilir: "Jira'ya bağlanılamadı. ZIP olarak indirmek ister misiniz?" **And** ZIP İndir butonu aktif olarak sunulur (fallback).

7. **Given** popup'ta ExportBar görünür ve Jira yapılandırılmış, **When** Jira butonu aktif hale gelir, **Then** "Jira'ya Gönder" butonu enabled gösterilir (Epic 2'deki disabled placeholder aktifleşir).

## Tasks / Subtasks

- [x] **Task 1: Jira issue oluşturma tipleri (AC: tümü)**
  - [x] 1.1 `src/lib/jira/jira-types.ts` — MODIFY: Ticket oluşturma tipleri ekle
  - [x] 1.2 `JiraIssueCreateRequest` — `{ fields: { project: {key}, summary, description, issuetype: {name}, priority?: {name}, parent?: {key} } }`
  - [x] 1.3 `JiraIssueCreateResponse` — `{ id: string, key: string, self: string }`
  - [x] 1.4 `JiraAttachmentResponse` — `{ id: string, filename: string, size: number, mimeType: string, content: string }`
  - [x] 1.5 `JiraIssueLinkRequest` — `{ type: {name}, inwardIssue: {key}, outwardIssue: {key} }`
  - [x] 1.6 `JiraIssueType` — `{ id: string, name: string, subtask: boolean }`
  - [x] 1.7 `JiraErrorResponse` — `{ errorMessages: string[], errors: Record<string, string> }`
  - [x] 1.8 ADF node tipleri: `AdfDoc`, `AdfNode`, `AdfTextMark` — ADF JSON yapısı için

- [x] **Task 2: jira-client.ts'e issue CRUD fonksiyonları ekle (AC: #1, #3, #4)**
  - [x] 2.1 `src/lib/jira/jira-client.ts` — MODIFY: 3 yeni fonksiyon ekle
  - [x] 2.2 `createIssue(credentials, issueData: JiraIssueCreateRequest)` — `POST /rest/api/{version}/issue`
  - [x] 2.3 `addAttachments(credentials, issueKey, files: File[])` — `POST /rest/api/{version}/issue/{issueKey}/attachments`, header: `X-Atlassian-Token: no-check`, Content-Type: multipart/form-data, her dosya ayrı request (sıralı)
  - [x] 2.4 `linkIssue(credentials, childKey, parentKey)` — `POST /rest/api/{version}/issueLink`, type: "Relates"
  - [x] 2.5 `src/lib/jira/jira-client.test.ts` — MODIFY: +10 test (createIssue başarılı/başarısız, addAttachments başarılı/kısmi hata, linkIssue başarılı/başarısız, Cloud vs Server API version, multipart form-data header kontrolü, 401 auto-refresh)

- [x] **Task 3: Jira Description Formatter (AC: #2)**
  - [x] 3.1 `src/lib/jira/jira-formatter.ts` — CREATE: Description formatlama modülü
  - [x] 3.2 `formatDescriptionAdf(reportData)` — ADF JSON Cloud description (doc → heading, orderedList, paragraph, table, panel)
  - [x] 3.3 `formatDescriptionWiki(reportData)` — Wiki markup Server description (`h3.`, `#`, `||header||`, `|cell|`)
  - [x] 3.4 `formatDescription(credentials, reportData)` — platform'a göre yönlendirme (Cloud → ADF, Server → Wiki)
  - [x] 3.5 Description bölümleri: Steps to Reproduce (numaralı liste), Beklenen Sonuç, Gerçekleşen Sonuç (Neden Bug), Environment (tablo), Cihaz Özet Kartı (tablo), Konfigürasyon bilgileri, Ekli dosyalar listesi
  - [x] 3.6 `src/lib/jira/jira-formatter.test.ts` — CREATE: 16 test (ADF doğruluğu, Wiki doğruluğu, eksik alan handling, steps formatlama, environment tablosu, konfigürasyon alanları, dosya listesi, XSS sanitization)

- [x] **Task 4: Jira File Builder — Snapshot → File[] dönüşümü (AC: #3)**
  - [x] 4.1 `src/lib/jira/jira-file-builder.ts` — CREATE: Snapshot verilerinden File nesneleri oluştur
  - [x] 4.2 `buildAttachmentFiles(snapshotData, timelineJson?)` — her veri kaynağını File nesnesine çevir:
    - `screenshot.png` — base64 dataURL → blob → File (type: `image/png`)
    - `dom-snapshot.html` — HTML string → File (type: `text/html`)
    - `console-logs.json` — JSON.stringify → File (type: `application/json`)
    - `network.har` — JSON.stringify HAR format → File (type: `application/json`)
    - `local-storage.json` — JSON.stringify → File (type: `application/json`)
    - `session-storage.json` — JSON.stringify → File (type: `application/json`)
    - `timeline.json` — JSON.stringify → File (type: `application/json`)
  - [x] 4.3 Null/undefined veri kaynakları atlanır (session'sız bug durumu)
  - [x] 4.4 `src/lib/jira/jira-file-builder.test.ts` — CREATE: 6 test (tam dosya listesi, eksik veri, screenshot base64 dönüşümü, MIME type kontrolü, dosya isimleri)

- [x] **Task 5: Jira Export Orchestrator (AC: #1, #3, #4, #5, #6)**
  - [x] 5.1 `src/lib/jira/jira-exporter.ts` — CREATE: Export akış kontrolü
  - [x] 5.2 `exportToJira(params: JiraExportParams): Promise<Result<JiraExportResult>>`
  - [x] 5.3 Akış: credentials kontrol → description formatla → issue oluştur → attachments ekle (sıralı) → parent link varsa bağla → sonuç dön
  - [x] 5.4 `JiraExportParams`: credentials, formData (expected, reason, priority), snapshotData, configFields, environmentInfo, stepsText, parentKey?
  - [x] 5.5 `JiraExportResult`: `{ issueKey: string, issueUrl: string, attachmentCount: number, warning?: string }`
  - [x] 5.6 Her adımda hata → Result pattern ile dön, partial success: `{ success: true, data: { issueKey, issueUrl, attachmentCount }, warning?: string }` (issue oluştu ama attachment/link hata verdi → issueKey + warning dön)
  - [x] 5.7 `src/lib/jira/jira-exporter.test.ts` — CREATE: 8 test (tam akış başarılı, credentials hatalı, issue oluşturma hatası, attachment hatası, link hatası, partial success, fallback mesajı)

- [x] **Task 6: Barrel export güncelle**
  - [x] 6.1 `src/lib/jira/index.ts` — CREATE: Barrel export
    ```
    export type { ... } from './jira-types';
    export { exportToJira } from './jira-exporter';
    export { testConnection, getProjects, getAccessibleResources, createIssue, addAttachments, linkIssue } from './jira-client';
    export { startOAuthFlow, refreshAccessToken, validatePat } from './jira-auth';
    export { formatDescription } from './jira-formatter';
    export { buildAttachmentFiles } from './jira-file-builder';
    ```

- [x] **Task 7: BugReportView — Jira buton aktivasyonu (AC: #1, #5, #6, #7)**
  - [x] 7.1 `src/popup/views/BugReportView.tsx` — MODIFY: Import ekle + Jira state signal'ları
  - [x] 7.2 Component mount'ta `storageGet<JiraCredentials>(STORAGE_KEYS.JIRA_CREDENTIALS)` ile bağlantı kontrol
  - [x] 7.3 `jiraConfigured` signal: `credentials.platform && credentials.url && credentials.token && credentials.connected`
  - [x] 7.4 `jiraExportStatus` signal: `'idle' | 'loading' | 'success' | 'error'`
  - [x] 7.5 Jira butonu koşullu: `disabled={!jiraConfigured || snapshotStatus !== 'success' || jiraExportStatus === 'loading'}`
  - [x] 7.6 Loading state: `loading={jiraExportStatus === 'loading'}`, label: "Gönderiliyor...", `aria-busy="true"`
  - [x] 7.7 `handleJiraExport()` fonksiyonu: `exportToJira()` çağır → başarılı: toast + ticket link → başarısız: hata toast + ZIP fallback vurgu
  - [x] 7.8 Parent ticket input: "Mevcut ticket'a bağla" checkbox + `<Input placeholder="PROJ-123" />` (regex: `/^[A-Z][A-Z0-9]+-\d+$/`)
  - [x] 7.9 `src/popup/views/BugReportView.test.tsx` — MODIFY: +6 test:
    - Jira credentials yok → buton disabled + title tooltip
    - Jira credentials var → buton enabled
    - Export loading → spinner + "Gönderiliyor..." + aria-busy
    - Export başarılı → showToast success + issueKey
    - Export başarısız → showToast error + ZIP fallback mesajı
    - Parent ticket input → regex validation PROJ-123 formatı

- [x] **Task 8: Testler ve entegrasyon doğrulama (AC: tümü)**
  - [x] 8.1 Tüm yeni test dosyaları co-located
  - [x] 8.2 `npx vitest run` — 47 dosya, 468 test geçti (422 mevcut + 46 yeni)
  - [x] 8.3 TypeScript strict mode — yeni dosyalarda hata yok (mevcut DashboardView.test.tsx hatası pre-existing)

## Dev Notes

### Story 4-1 TAMAMLANDI — Mevcut Altyapı

Story 4-1 implement edildi (status: review, 422 test geçiyor). Aşağıdaki modüller MEVCUT ve KULLANIMA HAZIR:

**Mevcut dosyalar (MODIFY et, yeniden OLUŞTURMA):**

- `src/lib/jira/jira-types.ts` — `JiraUser`, `JiraProject`, `JiraAccessibleResource`, `JiraOAuthTokens`, `JiraApiVersion`
- `src/lib/jira/jira-auth.ts` — `startOAuthFlow()` (CSRF state doğrulama + AbortSignal.timeout dahil), `refreshAccessToken()`, `validatePat()`, `buildAuthUrl()`, `getAccessibleResources()` (JiraAccessibleResource[] döner)
- `src/lib/jira/jira-client.ts` — `jiraFetch()` (proaktif token refresh: `accessTokenExpiresAt` kontrolü + 401 fallback retry), `testConnection()`, `getProjects()`, `getApiBaseUrl()`, `getAuthHeaders()`. NOT: `getAccessibleResources` jira-auth'tan re-export edilir
- `src/lib/types.ts` — `JiraCredentials` interface (platform, url, token, refreshToken, accessTokenExpiresAt, cloudId, siteName, displayName, defaultProjectKey, connected)
- `src/lib/constants.ts` — `JIRA_*` sabitler, `STORAGE_KEYS.JIRA_CREDENTIALS`, `MESSAGE_ACTIONS.EXPORT_JIRA`
- `src/manifest.json` — `identity` permission, `host_permissions` (Atlassian), `optional_host_permissions`

**Mevcut jiraFetch davranışı (KRİTİK — anla ve kullan):**

- İstek öncesi `accessTokenExpiresAt` kontrolü → süresi dolmuşsa proaktif refresh yapar
- 401 dönerse fallback olarak tekrar refresh dener
- Her iki refresh'te de yeni token'lar storage'a kaydedilir
- `AbortSignal.timeout(15_000)` auth modülünde kullanılıyor — client modülünde de kullan

**Bu story'de OLUŞTURULACAK yeni dosyalar:**

- `src/lib/jira/jira-formatter.ts` + test
- `src/lib/jira/jira-file-builder.ts` + test
- `src/lib/jira/jira-exporter.ts` + test
- `src/lib/jira/index.ts`

### jira-client.ts Genişletme — Mevcut Yapıya Ek Fonksiyonlar

**MEVCUT fonksiyonlar (DOKUNMA):** `jiraFetch`, `getApiBaseUrl`, `getAuthHeaders`, `getErrorMessage`, `testConnection`, `getProjects`, `getAccessibleResources`

**EKLENECEK fonksiyonlar:**

```typescript
/** Jira issue oluştur — POST /rest/api/{version}/issue */
export async function createIssue(
  credentials: JiraCredentials,
  issueData: JiraIssueCreateRequest
): Promise<Result<JiraIssueCreateResponse>> {
  try {
    const version = getApiVersion(credentials);
    const response = await jiraFetch(credentials, `/rest/api/${version}/issue`, {
      method: 'POST',
      body: JSON.stringify(issueData),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const errorMessages = (errorBody as JiraErrorResponse)?.errorMessages?.join(', ');
      const fieldErrors = Object.values((errorBody as JiraErrorResponse)?.errors ?? {}).join(', ');
      const detail = errorMessages || fieldErrors || getErrorMessage(response.status, credentials);
      console.error('[JiraClient] createIssue failed:', response.status, detail);
      return { success: false, error: `Ticket oluşturulamadı: ${detail}` };
    }

    const result: JiraIssueCreateResponse = await response.json();
    return { success: true, data: result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[JiraClient] createIssue error:', msg);
    return { success: false, error: 'Jira sunucusuna ulaşılamıyor. Ağ bağlantınızı kontrol edin.' };
  }
}
```

```typescript
/** Dosya attachment ekle — POST /rest/api/{version}/issue/{issueKey}/attachments
 * Sıralı upload — paralel Jira rate limit'e takılabilir
 * Her dosya ayrı request (Jira multipart'ta tek dosya destekler güvenilir şekilde)
 */
export async function addAttachments(
  credentials: JiraCredentials,
  issueKey: string,
  files: File[]
): Promise<Result<JiraAttachmentResponse[]>> {
  const version = getApiVersion(credentials);
  const results: JiraAttachmentResponse[] = [];

  for (const file of files) {
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);

      const baseUrl = getApiBaseUrl(credentials);
      const url = `${baseUrl}/rest/api/${version}/issue/${issueKey}/attachments`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.token}`,
          'X-Atlassian-Token': 'no-check',
          // Content-Type otomatik FormData boundary ile set edilir — ELLE SET ETME
        },
        body: formData,
      });

      if (!response.ok) {
        console.error('[JiraClient] addAttachment failed:', file.name, response.status);
        // Partial success — devam et, hataları topla
        continue;
      }

      const attachments: JiraAttachmentResponse[] = await response.json();
      results.push(...attachments);
    } catch (err) {
      console.error('[JiraClient] addAttachment error:', file.name, err);
      // Partial success — devam et
    }
  }

  if (results.length === 0 && files.length > 0) {
    return { success: false, error: 'Hiçbir dosya eklenemedi. Ağ bağlantınızı kontrol edin.' };
  }

  return { success: true, data: results };
}
```

```typescript
/** Issue link oluştur — POST /rest/api/{version}/issueLink */
export async function linkIssue(
  credentials: JiraCredentials,
  childKey: string,
  parentKey: string
): Promise<Result<void>> {
  try {
    const version = getApiVersion(credentials);
    const response = await jiraFetch(credentials, `/rest/api/${version}/issueLink`, {
      method: 'POST',
      body: JSON.stringify({
        type: { name: 'Relates' },
        inwardIssue: { key: parentKey },
        outwardIssue: { key: childKey },
      }),
    });

    if (!response.ok) {
      const msg = getErrorMessage(response.status, credentials);
      console.error('[JiraClient] linkIssue failed:', response.status);
      return { success: false, error: `Ticket bağlanamadı: ${msg}` };
    }

    return { success: true, data: undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[JiraClient] linkIssue error:', msg);
    return { success: false, error: 'Ticket bağlama sırasında hata oluştu.' };
  }
}
```

**KRİTİK — addAttachments'ta Content-Type header:**

- `FormData` kullanılırken `Content-Type` header'ını ELLE SET ETME
- Tarayıcı otomatik olarak `multipart/form-data; boundary=...` ekler
- Elle set edersen boundary bilgisi kaybolur ve Jira 400 döner

**KRİTİK — addAttachments'ta jiraFetch KULLANMA:**

- `jiraFetch()` otomatik `Content-Type: application/json` header ekler
- Multipart upload için bu header'ı override etmek sorun çıkarır
- Doğrudan `fetch()` kullan, sadece `Authorization` ve `X-Atlassian-Token` header'ları ile

### Jira Description Formatter — ADF JSON + Wiki Markup

**ADF JSON (Cloud) örnek çıktı:**

```json
{
  "type": "doc",
  "version": 1,
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 3 },
      "content": [{ "type": "text", "text": "Steps to Reproduce" }]
    },
    {
      "type": "orderedList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Login sayfasına git" }]
            }
          ]
        }
      ]
    },
    {
      "type": "heading",
      "attrs": { "level": 3 },
      "content": [{ "type": "text", "text": "Beklenen Sonuç" }]
    },
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Kullanıcı giriş yapabilmeli" }]
    },
    {
      "type": "heading",
      "attrs": { "level": 3 },
      "content": [{ "type": "text", "text": "Gerçekleşen Sonuç" }]
    },
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "500 hatası alınıyor" }]
    },
    {
      "type": "heading",
      "attrs": { "level": 3 },
      "content": [{ "type": "text", "text": "Environment" }]
    },
    {
      "type": "table",
      "content": [
        {
          "type": "tableRow",
          "content": [
            {
              "type": "tableHeader",
              "content": [
                { "type": "paragraph", "content": [{ "type": "text", "text": "Browser" }] }
              ]
            },
            {
              "type": "tableHeader",
              "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "OS" }] }]
            },
            {
              "type": "tableHeader",
              "content": [
                { "type": "paragraph", "content": [{ "type": "text", "text": "Viewport" }] }
              ]
            }
          ]
        },
        {
          "type": "tableRow",
          "content": [
            {
              "type": "tableCell",
              "content": [
                { "type": "paragraph", "content": [{ "type": "text", "text": "Chrome 133" }] }
              ]
            },
            {
              "type": "tableCell",
              "content": [
                { "type": "paragraph", "content": [{ "type": "text", "text": "Windows 11" }] }
              ]
            },
            {
              "type": "tableCell",
              "content": [
                { "type": "paragraph", "content": [{ "type": "text", "text": "1920x1080" }] }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "panel",
      "attrs": { "panelType": "info" },
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "Ekli dosyalar: screenshot.png, console-logs.json, network.har, timeline.json"
            }
          ]
        }
      ]
    }
  ]
}
```

**Wiki Markup (Server) örnek çıktı:**

```
h3. Steps to Reproduce
# Login sayfasına git
# Kullanıcı adı ve şifre gir
# "Giriş Yap" butonuna tıkla

h3. Beklenen Sonuç
Kullanıcı giriş yapabilmeli

h3. Gerçekleşen Sonuç
500 hatası alınıyor

h3. Environment
||Browser||OS||Viewport||
|Chrome 133|Windows 11|1920x1080|

{panel:title=Ekli Dosyalar|borderStyle=solid}
screenshot.png, console-logs.json, network.har, timeline.json
{panel}
```

**Formatter tasarım kararları:**

- Input olarak `ReportData` alır: `{ stepsText, expected, reason, environment, configFields, attachmentNames }`
- `stepsText` zaten `buildStepsToReproduce()` (mevcut, `src/lib/steps-builder.ts`) çıktısı — satır bazlı parse et, her satır bir adım
- Environment bilgisi `ScreenshotMetadata`'dan gelir (browser, OS, viewport, dil, URL)
- Config alanları `ConfigFields`'dan gelir (environment, testCycle, agileTeam, project)
- XSS prevention: Kullanıcı input'unda özel ADF/Wiki karakterleri escape edilmeli

**ADF Node Type'lar — KULLANILACAK:**

- `doc` (kök), `heading` (attrs: level 3), `paragraph`, `text`
- `orderedList` + `listItem` (Steps to Reproduce)
- `table` + `tableRow` + `tableHeader` + `tableCell` (Environment)
- `panel` (attrs: panelType: "info") (Ekli dosyalar)
- Text marks: `strong` (kalın metin)
- `hardBreak` (satır sonu)
- `rule` (ayırıcı çizgi)

### Jira File Builder — Snapshot Verisi → File[]

**Dönüşüm tablosu:**

| Kaynak                                | Dosya Adı              | MIME Type          | Dönüşüm                            |
| ------------------------------------- | ---------------------- | ------------------ | ---------------------------------- |
| `snapshotData.screenshot`             | `screenshot.png`       | `image/png`        | base64 dataURL → Blob → File       |
| `snapshotData.dom`                    | `dom-snapshot.html`    | `text/html`        | `dom.html` string → File           |
| `snapshotData.consoleLogs`            | `console-logs.json`    | `application/json` | JSON.stringify → File              |
| `snapshotData.xhrLogs`                | `network.har`          | `application/json` | JSON.stringify (HAR format) → File |
| `snapshotData.storage.localStorage`   | `local-storage.json`   | `application/json` | JSON.stringify → File              |
| `snapshotData.storage.sessionStorage` | `session-storage.json` | `application/json` | JSON.stringify → File              |
| timeline (ayrı param)                 | `timeline.json`        | `application/json` | JSON.stringify → File              |

**Base64 dataURL → File dönüşüm pattern'ı:**

```typescript
function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const byteString = atob(base64);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mime });
}
```

**DİKKAT:** Session'sız bug durumunda XHR logları, tıklama akışı ve navigasyon geçmişi mevcut olmaz. `buildAttachmentFiles` null/undefined alanları atlar ve sadece mevcut verileri File'a çevirir.

### Jira Export Orchestrator — Tam Akış

```
exportToJira(params)
│
├── 1. Credentials kontrolü (platform + url + token + connected)
│   └── Hatalı → return { success: false, error: "Jira yapılandırması eksik..." }
│
├── 2. Description formatla
│   ├── Cloud → formatDescriptionAdf(reportData) → ADF JSON
│   └── Server → formatDescriptionWiki(reportData) → string
│
├── 3. Issue summary oluştur
│   └── "Bug: {ilk 80 karakter expected veya reason}" veya "[QA Helper] Bug Report"
│
├── 4. createIssue(credentials, { fields: { project, summary, description, issuetype: "Bug", priority } })
│   └── Hatalı → return { success: false, error: "Ticket oluşturulamadı: {detail}" }
│
├── 5. buildAttachmentFiles(snapshotData, timelineJson)
│   └── File[] oluştur (null alanları atla)
│
├── 6. addAttachments(credentials, issueKey, files)
│   └── Partial hata → log ama devam et (issue zaten oluşturuldu)
│
├── 7. parentKey varsa → linkIssue(credentials, issueKey, parentKey)
│   └── Hatalı → log ama devam et (issue + attachment zaten tamam)
│
└── 8. return { success: true, data: { issueKey, issueUrl, attachmentCount } }
```

**Issue URL oluşturma:**

- Cloud: `https://{siteName}/browse/{issueKey}` (siteName: `myteam.atlassian.net`)
- Server: `{credentials.url}/browse/{issueKey}`

**Partial Success Handling:**

- Issue oluşturuldu ama attachment hata verdi → `{ success: true, data: { issueKey, attachmentCount: partial }, warning: "Bazı dosyalar eklenemedi" }`
- Issue oluşturulamadı → `{ success: false, error: "..." }`
- Link hata verdi → Sonuç yine başarılı, warning ile bildir

### BugReportView Güncelleme — Detaylı

**Mevcut Jira butonu (satır 514-524):**

```tsx
<Button
  variant="secondary"
  size="md"
  class="w-full"
  disabled // ← KALDIRILACAK: koşullu yapılacak
  iconLeft={<Send size={14} />}
  title="Ayarlardan Jira'yı kurun" // ← KOŞULLU
  aria-disabled="true" // ← KOŞULLU
>
  Jira'ya Gönder
</Button>
```

**Güncellenmiş buton:**

```tsx
<Button
  variant="secondary"
  size="md"
  class="w-full"
  disabled={
    !jiraConfigured.value ||
    snapshotStatus.value !== 'success' ||
    jiraExportStatus.value === 'loading'
  }
  loading={jiraExportStatus.value === 'loading'}
  iconLeft={
    jiraExportStatus.value === 'loading' ? (
      <Loader2 size={14} class="animate-spin" />
    ) : (
      <Send size={14} />
    )
  }
  onClick={() => void handleJiraExport()}
  title={!jiraConfigured.value ? "Ayarlardan Jira'yı kurun" : undefined}
  aria-disabled={!jiraConfigured.value ? 'true' : undefined}
  aria-busy={jiraExportStatus.value === 'loading'}
>
  {jiraExportStatus.value === 'loading' ? 'Gönderiliyor...' : "Jira'ya Gönder"}
</Button>
```

**Yeni signal'lar (module-level, mevcut pattern'a uygun):**

```typescript
const jiraConfigured = signal(false);
const jiraExportStatus = signal<ExportStatus>('idle');
const parentTicketKey = signal('');
const linkToParent = signal(false);
```

**Jira credentials kontrolü (useEffect içinde, mount'ta):**

```typescript
useEffect(() => {
  storageGet<JiraCredentials>(STORAGE_KEYS.JIRA_CREDENTIALS).then((result) => {
    if (result.success && result.data) {
      const c = result.data;
      jiraConfigured.value = !!(c.platform && c.url && c.token && c.connected);
    }
  });
}, []);
```

**handleJiraExport fonksiyonu:**

```typescript
async function handleJiraExport() {
  if (!snapshotData.value || jiraExportStatus.value === 'loading') return;

  jiraExportStatus.value = 'loading';
  try {
    const credResult = await storageGet<JiraCredentials>(STORAGE_KEYS.JIRA_CREDENTIALS);
    if (!credResult.success || !credResult.data) {
      showToast({ message: 'Jira yapılandırması bulunamadı.', type: 'error' });
      jiraExportStatus.value = 'error';
      return;
    }

    const timelineJson = buildTimeline(/* mevcut parametreler */);

    const result = await exportToJira({
      credentials: credResult.data,
      expected: formExpected.value,
      reason: formReason.value,
      priority: formPriority.value,
      snapshotData: snapshotData.value,
      stepsText: stepsText.value,
      configFields: configFields.value,
      environmentInfo: snapshotData.value.metadata,
      timelineJson,
      parentKey: linkToParent.value ? parentTicketKey.value : undefined,
    });

    if (result.success) {
      jiraExportStatus.value = 'success';
      showToast({
        message: `Jira ticket oluşturuldu — ${result.data.issueKey}`,
        type: 'success',
      });
    } else {
      jiraExportStatus.value = 'error';
      showToast({
        message: `Jira'ya bağlanılamadı. ZIP olarak indirmek ister misiniz?`,
        type: 'error',
      });
    }
  } catch {
    jiraExportStatus.value = 'error';
    showToast({
      message: 'Beklenmeyen bir hata oluştu.',
      type: 'error',
    });
  }
}
```

**Parent Ticket UI (Jira butonunun üstüne ekle):**

```tsx
{
  jiraConfigured.value && (
    <div class="flex flex-col gap-1.5">
      <label class="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer">
        <input
          type="checkbox"
          checked={linkToParent.value}
          onChange={(e) => {
            linkToParent.value = (e.target as HTMLInputElement).checked;
          }}
          class="rounded border-neutral-300"
        />
        Mevcut ticket'a bağla
      </label>
      {linkToParent.value && (
        <Input
          size="sm"
          placeholder="PROJ-123"
          value={parentTicketKey.value}
          onInput={(e) => {
            parentTicketKey.value = (e.target as HTMLInputElement).value;
          }}
          aria-label="Parent ticket key"
        />
      )}
    </div>
  );
}
```

### Jira REST API — Kesin Endpoint'ler

| İşlem           | Endpoint                                         | Method | Headers                                       | Body                                                                          |
| --------------- | ------------------------------------------------ | ------ | --------------------------------------------- | ----------------------------------------------------------------------------- |
| Issue oluştur   | `/rest/api/{v}/issue`                            | POST   | Authorization, Content-Type: application/json | `{ fields: { project, summary, description, issuetype, priority, parent? } }` |
| Attachment ekle | `/rest/api/{v}/issue/{key}/attachments`          | POST   | Authorization, X-Atlassian-Token: no-check    | FormData (file field)                                                         |
| Issue link      | `/rest/api/{v}/issueLink`                        | POST   | Authorization, Content-Type: application/json | `{ type, inwardIssue, outwardIssue }`                                         |
| Issue types     | `/rest/api/{v}/issuetype/project?projectId={id}` | GET    | Authorization                                 | —                                                                             |

**API Versiyon:** Cloud → `3`, Server/DC → `2` (mevcut `getApiVersion()` kullanır)

**Issue Type Notu:**

- Bug raporu için `issuetype: { name: "Bug" }` kullan
- Çoğu Jira projelerinde "Bug" issue type mevcut
- Yoksa `issuetype: { name: "Task" }` fallback

### Güvenlik Kısıtlamaları

- **XSS Prevention:** Kullanıcı input'u ADF/Wiki'ye eklenirken özel karakterler escape edilmeli
  - ADF: JSON string olduğundan JSON.stringify otomatik escape eder
  - Wiki: `{`, `}`, `[`, `]`, `|`, `#`, `*`, `_` karakterleri escape edilmeli
- **SSRF Prevention:** Jira URL sadece HTTPS kabul edilmeli (mevcut JiraSetupPage'de zaten kontrol var)
- **Token güvenliği:** OAuth token'ları ve PAT console.log'a YAZILMAZ — sadece `[JiraClient]` prefix ile hata mesajları
- **CORS:** Chrome extension manifest `host_permissions` ile CORS bypass eder — ek ayar gerekmez

### Performance Hedefleri

- Attachment upload sıralı (paralel rate limit riski)
- Tek dosya upload timeout: 15 saniye (büyük screenshot ~2MB)
- Toplam export hedefi: < 15 saniye (issue oluştur ~1s + 7 dosya × ~2s/dosya)
- Loading state 300ms+ süren işlemler için gösterilir

### Hata Mesajları (UX — Cezalandırmayan Ton)

| Hata Durumu         | Mesaj                                                                |
| ------------------- | -------------------------------------------------------------------- |
| Credentials eksik   | "Jira yapılandırması bulunamadı. Ayarlar sayfasından Jira'yı kurun." |
| Issue oluşturma 400 | "Ticket oluşturulamadı: {Jira hata detayı}"                          |
| Issue oluşturma 401 | "Oturum süresi doldu. Lütfen Jira'ya tekrar bağlanın."               |
| Issue oluşturma 403 | "Bu projede ticket oluşturma yetkiniz yok."                          |
| Attachment hatası   | "Ticket oluşturuldu ({issueKey}) ancak bazı dosyalar eklenemedi."    |
| Link hatası         | "Ticket oluşturuldu ({issueKey}) ancak parent ticket'a bağlanamadı." |
| Ağ hatası           | "Jira'ya bağlanılamadı. ZIP olarak indirmek ister misiniz?"          |
| Parent key geçersiz | "Geçersiz ticket formatı. Örnek: PROJ-123"                           |

### Erişilebilirlik Gereksinimleri

- Jira butonu: `aria-busy="true"` (loading), `aria-disabled="true"` (not configured)
- Toast mesajları: `aria-live="polite"` (başarı), `aria-live="assertive"` (hata)
- Parent ticket input: `aria-label="Parent ticket key"`, `aria-describedby` hata mesajı için
- Loading state: `aria-label="Jira'ya gönderiliyor"` screen reader duyurusu
- Checkbox: native `<input type="checkbox">` (Preact-uyumlu)
- Focus management: hata sonrası focus'u hata mesajına taşı

### Naming Convention'lar

| Kapsam             | Kural          | Örnek                                                                    |
| ------------------ | -------------- | ------------------------------------------------------------------------ |
| Yeni lib dosyalar  | kebab-case     | `jira-formatter.ts`, `jira-file-builder.ts`, `jira-exporter.ts`          |
| Interface/Type     | PascalCase     | `JiraIssueCreateRequest`, `AdfDoc`, `JiraExportResult`                   |
| Fonksiyonlar       | camelCase      | `createIssue`, `buildAttachmentFiles`, `formatDescriptionAdf`            |
| Console log prefix | `[ModuleName]` | `[JiraClient]`, `[JiraFormatter]`, `[JiraExporter]`, `[JiraFileBuilder]` |
| Test dosya         | co-located     | `jira-formatter.test.ts`, `jira-exporter.test.ts`                        |

### Dosya Organizasyonu — Nihai Durum

```
src/lib/jira/
├── index.ts                  ← CREATE: Barrel export
├── jira-types.ts             ← MODIFY: Issue oluşturma tipleri ekle
├── jira-auth.ts              ← MEVCUT (dokunma)
├── jira-auth.test.ts         ← MEVCUT (dokunma)
├── jira-client.ts            ← MODIFY: createIssue, addAttachments, linkIssue ekle
├── jira-client.test.ts       ← MODIFY: Yeni fonksiyon testleri ekle
├── jira-formatter.ts         ← CREATE: ADF JSON + Wiki markup formatter
├── jira-formatter.test.ts    ← CREATE: Formatter testleri
├── jira-file-builder.ts      ← CREATE: Snapshot → File[] dönüştürme
├── jira-file-builder.test.ts ← CREATE: File builder testleri
├── jira-exporter.ts          ← CREATE: Export orkestrasyon
└── jira-exporter.test.ts     ← CREATE: Exporter testleri
```

### Anti-Pattern Uyarıları

- **jira-auth.ts'i MODIFY ETME** — bu story auth ile ilgilenmiyor, mevcut haliyle kullan
- **`Content-Type: multipart/form-data` ELLE SET ETME** — FormData ile tarayıcı otomatik boundary ekler
- **jiraFetch'i attachment upload için KULLANMA** — Content-Type çakışması olur, doğrudan fetch kullan
- **Attachment'ları paralel upload ETME** — Jira rate limit riski, sıralı yap
- **`any` tipi KULLANMA** — `unknown` + type guard tercih et
- **OAuth token'ları console.log'a YAZMA** — güvenlik riski
- **Mevcut fonksiyonları YENİDEN YAZMA** — sadece YENİ fonksiyon EKLE
- **ExportBar component'i ÇIKARMA** — bu story scope'unda değil, mevcut inline yapıyı güncelle
- **Issue type'ı hardcode "Bug" dışında bir şey YAPMA** — ilk sürüm için "Bug" yeterli

### Önceki Story'lerden Öğrenilen Dersler

**Story 4-1 (Jira Bağlantı Kurulumu):**

- `jiraFetch()` auto-refresh interceptor iyi çalışıyor — 401'de otomatik token yenileme
- `getAuthHeaders()` her zaman `Bearer {token}` kullanıyor (hem Cloud hem Server)
- `Result<T>` pattern tüm fonksiyonlarda tutarlı
- Error mesajları Türkçe ve cezalandırmayan tonda
- Console log prefix pattern: `[JiraClient]`, `[JiraAuth]`
- `JiraCredentials.connected` field'ı bağlantı durumunu belirtir

**Story 2-3 (ZIP Export):**

- `exportBugReportZip()` pattern'ı başarılı — Jira exporter da benzer param/return yapısı kullanmalı
- `buildTimeline()` çıktısı timeline JSON — Jira'ya da attachment olarak gönderilecek
- `buildDescription()` çıktısı plain text description — Jira formatter bunun yerine ADF/Wiki oluşturur
- `buildStepsToReproduce()` steps text — satır bazlı parse et, her satır bir ADF listItem
- Toast pattern: `showToast({ message, type: 'success' | 'error' })`

**Story 3-3 (Onboarding):**

- `storageGet<JiraCredentials>(STORAGE_KEYS.JIRA_CREDENTIALS)` ile credentials okuma pattern'ı
- `ConfigFields` type ve storage pattern'ı mevcut

### Project Structure Notes

- `src/lib/jira/` klasörü Story 4-1'de oluşturuldu — 5 dosya mevcut
- `src/components/domain/ExportBar.tsx` mimaride planlanmış ama implement edilmemiş — export butonları BugReportView içinde inline. Bu story ExportBar'ı ayrı component olarak ÇIKARMAZ
- `MESSAGE_ACTIONS.EXPORT_JIRA` tanımlı ama handler yok — bu story'de popup'tan doğrudan Jira API çağrısı yapılacak (service worker proxy gereksiz), bu action kullanılmayacak
- Input component `src/components/ui/Input.tsx`'te mevcut — parent ticket input için kullan

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — Authentication & Security, Jira Cloud/Server API patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md — Data Architecture, Storage Key Yapısı]
- [Source: _bmad-output/planning-artifacts/architecture.md — Project Structure & Boundaries, lib/jira/]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — ExportBar, Toast patterns, Loading States]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Graceful Degradation, Accessibility]
- [Source: _bmad-output/planning-artifacts/prd.md — FR27, FR28, FR29, FR30, FR31]
- [Source: src/lib/jira/jira-types.ts — Mevcut Jira tipleri]
- [Source: src/lib/jira/jira-client.ts — Mevcut jiraFetch, testConnection, getProjects, getAuthHeaders]
- [Source: src/lib/jira/jira-auth.ts — Mevcut OAuth flow, token refresh]
- [Source: src/lib/types.ts — JiraCredentials, Result<T>, SnapshotData, ConfigFields]
- [Source: src/lib/constants.ts — STORAGE_KEYS, MESSAGE_ACTIONS, JIRA_* constants]
- [Source: src/popup/views/BugReportView.tsx — Mevcut Jira disabled buton (satır 514-524), export akışı]
- [Source: src/lib/zip-exporter.ts — exportBugReportZip pattern referansı]
- [Source: src/lib/timeline-builder.ts — buildTimeline pattern referansı]
- [Source: src/lib/steps-builder.ts — buildStepsToReproduce pattern referansı]
- [Source: src/lib/description-builder.ts — buildDescription pattern referansı]
- [Source: Jira Cloud REST API v3 — Issue creation, attachment, issue link endpoints]
- [Source: Atlassian Document Format (ADF) v1 — doc, heading, paragraph, orderedList, table, panel nodes]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (GitHub Copilot)

### Debug Log References

### Completion Notes List

- Task 1: `jira-types.ts`'e 8 yeni tip eklendi (JiraIssueCreateRequest, JiraIssueCreateResponse, JiraAttachmentResponse, JiraIssueLinkRequest, JiraIssueType, JiraErrorResponse, AdfDoc, AdfNode, AdfTextMark)
- Task 2: `jira-client.ts`'e `createIssue`, `addAttachments`, `linkIssue` eklendi. addAttachments için doğrudan `fetch()` kullanıldı (Content-Type çakışması önleme) + proaktif token refresh + 401 fallback retry. 12 yeni test eklendi.
- Task 3: `jira-formatter.ts` oluşturuldu. ADF JSON (Cloud) ve Wiki markup (Server) format desteği. XSS sanitization (Wiki özel karakter escape). 16 test.
- Task 4: `jira-file-builder.ts` oluşturuldu. Snapshot veri→File[] dönüşümü. Null/undefined veri kaynakları atlanır. 6 test.
- Task 5: `jira-exporter.ts` oluşturuldu. Tam export orkestrasyon: credentials kontrol → description formatla → issue oluştur → attachments ekle → parent link. Partial success pattern (warning ile). 8 test.
- Task 6: `index.ts` barrel export oluşturuldu.
- Task 7: `BugReportView.tsx` güncellendi. Jira buton koşullu enabled, loading state, handleJiraExport, parent ticket input (checkbox + PROJ-123 regex + format validation feedback). Başarı sonrası tıklanabilir ticket linki (AC #5). Partial success warning toast (H-2). 6 yeni test.
- Task 8: Tüm 469 test geçti (47 dosya). Yeni dosyalarda TypeScript hatası yok.

### File List

- `src/lib/jira/jira-types.ts` — MODIFIED: Issue CRUD tipleri ve ADF tipleri eklendi
- `src/lib/jira/jira-client.ts` — MODIFIED: createIssue, addAttachments, linkIssue fonksiyonları eklendi
- `src/lib/jira/jira-client.test.ts` — MODIFIED: 12 yeni test eklendi
- `src/lib/jira/jira-formatter.ts` — CREATED: ADF JSON + Wiki markup description formatter
- `src/lib/jira/jira-formatter.test.ts` — CREATED: 16 formatter testi
- `src/lib/jira/jira-file-builder.ts` — CREATED: Snapshot → File[] dönüştürme
- `src/lib/jira/jira-file-builder.test.ts` — CREATED: 6 file builder testi
- `src/lib/jira/jira-exporter.ts` — CREATED: Export orkestrasyon
- `src/lib/jira/jira-exporter.test.ts` — CREATED: 8 exporter testi
- `src/lib/jira/index.ts` — CREATED: Barrel export
- `src/popup/views/BugReportView.tsx` — MODIFIED: Jira buton aktivasyonu, handleJiraExport, parent ticket input
- `src/popup/views/BugReportView.test.tsx` — MODIFIED: 6 yeni Jira testi

## Change Log

- 2026-03-08: Story 4-2 implement edildi — Jira ticket oluşturma, dosya ekleme, description formatlama (ADF/Wiki), export orkestrasyon, BugReportView Jira buton aktivasyonu. 46 yeni test eklendi (toplam 468).
- 2026-03-08: Code review bulguları düzeltildi — AC #5 tıklanabilir ticket linki eklendi, partial success warning toast eklendi, addAttachments 401 token refresh desteği, Wiki escape hyphen hatası düzeltildi, barrel export getAttachmentFileNames eklendi, duplicate import konsolide edildi, parent ticket format validation feedback eklendi, toast mesaj içeriği testleri gelen.
