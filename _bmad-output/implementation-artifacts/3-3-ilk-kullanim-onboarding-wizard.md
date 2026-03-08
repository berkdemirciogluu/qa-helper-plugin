# Story 3.3: İlk Kullanım Onboarding Wizard

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **tester**,
I want **extension'ı ilk kez yüklediğimde kısa bir kurulum sihirbazı ile temel ayarlarımı yapabilmeyi**,
So that **hızlıca konfigürasyonumu tamamlayıp test etmeye başlayabileyim**.

## Acceptance Criteria

1. **Given** extension ilk kez yükleniyor ve daha önce onboarding tamamlanmamış, **When** tester popup'ı ilk kez açar, **Then** 3 adımlı onboarding wizard gösterilir (progress indicator: 1/3, 2/3, 3/3) **And** dashboard görünmez.

2. **Given** onboarding wizard Adım 1/3 gösteriliyor, **When** "Ortam Bilgisi" adımı açılır, **Then** proje adı (Input), ortam seçimi (Select — development/staging/QA/UAT/production) ve agile team (Input) alanları gösterilir **And** tüm alanlar opsiyonel — "Atla" butonu her zaman mevcut **And** doldurulan değerler chrome.storage.local'a `session_config` key'ine kaydedilir (merge pattern — mevcut toggles korunur).

3. **Given** onboarding wizard Adım 2/3 gösteriliyor, **When** "Jira Bağlantısı" adımı açılır, **Then** Jira platform seçimi (Cloud / Server) ve bağlantı bilgileri alanları gösterilir **And** "Bağlantıyı Test Et" butonu gösterilir (Epic 4 tamamlanana kadar disabled — tooltip: "Jira entegrasyonu yakında") **And** "Atla" butonu her zaman mevcut — Jira zorunlu değil **And** girilen değerler `jira_credentials` key'ine kaydedilir.

4. **Given** onboarding wizard Adım 3/3 gösteriliyor, **When** "Hazır!" adımı açılır, **Then** "Kurulum tamam! İlk session'ınızı başlatın." mesajı gösterilir **And** "Başla" butonu dashboard'a yönlendirir **And** dashboard'ta "Session Başlat" butonu pulse animasyonu ile vurgulu gösterilir.

5. **Given** onboarding tamamlanmış, **When** tester popup'ı tekrar açar, **Then** onboarding wizard bir daha gösterilmez — direkt dashboard açılır **And** chrome.storage.local'da `onboarding_completed: true` flag'i saklanır.

6. **Given** tester onboarding'i tekrar görmek istiyor, **When** options page'de "Hakkında" bölümünden "Kurulum sihirbazını tekrar aç" linkine tıklar, **Then** onboarding wizard tekrar gösterilir (popup açılır veya popup'ta onboarding durumuna geçiş yapılır).

## Tasks / Subtasks

- [x] **Task 1: Sabitler ve tipler (AC: tümü)**
  - [x] 1.1 `src/lib/constants.ts` — MODIFY: `STORAGE_KEYS` objesine `ONBOARDING_COMPLETED: 'onboarding_completed'` ekle
  - [x] 1.2 `src/lib/types.ts` — MODIFY: `JiraCredentials` interface ekle (platform: 'cloud' | 'server', url: string, token: string)

- [x] **Task 2: Popup view-state güncellemesi (AC: #1, #5)**
  - [x] 2.1 `src/popup/view-state.ts` — MODIFY: `View` type'ına `'onboarding'` ekle → `'dashboard' | 'bugReport' | 'onboarding'`
  - [x] 2.2 `src/popup/view-state.ts` — MODIFY: `onboardingPulse` signal ekle → `signal(false)` — dashboard'ta pulse animasyonu kontrolü

- [x] **Task 3: StepWizard component (AC: #1, #2, #3, #4)**
  - [x] 3.1 `src/components/domain/StepWizard.tsx` — CREATE: Çok adımlı wizard container component
  - [x] 3.2 Props: `steps: WizardStep[]`, iç currentStep state, `onComplete`
  - [x] 3.3 Progress indicator: yatay bar + step numarası (1/3, 2/3, 3/3)
  - [x] 3.4 Footer: "Atla" (ghost, sol) + "İleri"/"Başla" (primary, sağ) butonları
  - [x] 3.5 Keyboard: Enter → İleri, ESC → Atla
  - [x] 3.6 `src/components/domain/StepWizard.test.tsx` — CREATE: 8 test (render, step navigation, skip, complete, progress indicator, keyboard)

- [x] **Task 4: Onboarding adım component'leri (AC: #2, #3, #4)**
  - [x] 4.1 `src/popup/views/onboarding/EnvironmentStep.tsx` — CREATE: Adım 1/3 — proje adı (Input), ortam (Select), agile team (Input)
  - [x] 4.2 EnvironmentStep values signal → onChange'de anında `session_config.configFields` storage'a merge-write
  - [x] 4.3 `src/popup/views/onboarding/JiraStep.tsx` — CREATE: Adım 2/3 — platform Select (Cloud/Server), URL (Input), token (Input type=password)
  - [x] 4.4 JiraStep: "Bağlantıyı Test Et" butonu disabled state + tooltip "Jira entegrasyonu yakında"
  - [x] 4.5 JiraStep values → `jira_credentials` key'ine kaydet
  - [x] 4.6 `src/popup/views/onboarding/ReadyStep.tsx` — CREATE: Adım 3/3 — tamamlanma mesajı, Lucide `CheckCircle` icon, "Başla" butonu
  - [x] 4.7 `src/popup/views/onboarding/EnvironmentStep.test.tsx` — CREATE: 5 test
  - [x] 4.8 `src/popup/views/onboarding/JiraStep.test.tsx` — CREATE: 5 test
  - [x] 4.9 `src/popup/views/onboarding/ReadyStep.test.tsx` — CREATE: 3 test

- [x] **Task 5: OnboardingView (AC: #1, #2, #3, #4, #5)**
  - [x] 5.1 `src/popup/views/OnboardingView.tsx` — CREATE: 3 adımlı wizard container
  - [x] 5.2 StepWizard component kullan, adımları EnvironmentStep → JiraStep → ReadyStep sırasıyla geç
  - [x] 5.3 onComplete: `storageSet(STORAGE_KEYS.ONBOARDING_COMPLETED, true)` → `currentView.value = 'dashboard'` → `onboardingPulse.value = true`
  - [x] 5.4 onSkip: mevcut adımı atla, bir sonraki adıma geç (son adımda Skip yok — sadece "Başla")
  - [x] 5.5 `src/popup/views/OnboardingView.test.tsx` — CREATE: 8 test (render, step navigation, complete flow, storage write, skip behavior)

- [x] **Task 6: Popup App.tsx güncellemesi (AC: #1, #5)**
  - [x] 6.1 `src/popup/App.tsx` — MODIFY: Component mount'ta `storageGet(STORAGE_KEYS.ONBOARDING_COMPLETED)` kontrolü ekle
  - [x] 6.2 Eğer `onboarding_completed !== true` → `currentView.value = 'onboarding'`
  - [x] 6.3 OnboardingView render bloğu ekle — fade animasyonu ile (`Dashboard → Onboarding: fade 150ms`)
  - [x] 6.4 `src/popup/App.test.tsx` — MODIFY: Onboarding kontrolü testleri ekle (2 ek test — onboarding gösterilir/gösterilmez)

- [x] **Task 7: DashboardView pulse animasyonu (AC: #4)**
  - [x] 7.1 `src/popup/views/DashboardView.tsx` — MODIFY: `onboardingPulse` signal import, true ise SessionControl'un "Başlat" butonuna `animate-pulse` class'ı ekle
  - [x] 7.2 Pulse bir kez gösterilir — butona tıklanınca veya 5sn sonra otomatik kapanır
  - [x] 7.3 `src/styles/tailwind.css` — MODIFY: fade-enter animasyonu eklendi (150ms)

- [x] **Task 8: AboutPage "Kurulum sihirbazını tekrar aç" (AC: #6)**
  - [x] 8.1 `src/options/pages/AboutPage.tsx` — MODIFY: Disabled butonu aktif hale getir
  - [x] 8.2 Click handler: `storageRemove(STORAGE_KEYS.ONBOARDING_COMPLETED)` → popup'ta onboarding tetiklemesi için `onboarding_completed` flag'i silinir
  - [x] 8.3 Click sonrası toast: "Popup'ı açtığınızda kurulum sihirbazı tekrar gösterilecek"
  - [x] 8.4 `src/options/pages/AboutPage.test.tsx` — MODIFY: Buton aktifliği ve click testi ekle (2 ek test)

- [x] **Task 9: Testler (AC: tümü)**
  - [x] 9.1 Tüm test dosyaları co-located (Task 3-8'deki .test.tsx/.test.ts dosyaları)
  - [x] 9.2 Mevcut testlerde regression olmadığı doğrulandı

## Dev Notes

### Kritik Mimari Kısıtlamalar

**Popup Context ve Yaşam Döngüsü:**
- Popup 400x600px sabit boyut — wizard bu alana sığmalı
- Popup kapandığında state KAYBOLUR — onboarding ilerlemesi storage'da tutulmalıysa current step kaydedilmeli (ama 3 adımlık wizard için gerek yok — her açılışta baştan başlasın)
- `currentView` signal'ı popup kapatılıp açıldığında reset olur → App.tsx mount'ta storage'dan `onboarding_completed` kontrol edilmeli

**Onboarding Akışı — Popup İçi Navigasyon:**
```
Popup açılış → onboarding_completed kontrol
  ├── false/null → OnboardingView (fade 150ms)
  │   ├── Adım 1: EnvironmentStep
  │   ├── Adım 2: JiraStep
  │   └── Adım 3: ReadyStep → "Başla" → dashboard + pulse
  └── true → DashboardView (normal)
```

**Storage Key'ler ve Merge Pattern:**
```typescript
// Onboarding tamamlanma flag'i
STORAGE_KEYS.ONBOARDING_COMPLETED = 'onboarding_completed';
// Değer: true (boolean)

// Ortam bilgileri — session_config merge pattern
// Story 3-2'de ConfigurationPage tarafından kurulan pattern:
const existing = await storageGet<SessionConfig>(STORAGE_KEYS.SESSION_CONFIG);
const config: SessionConfig = existing.success && existing.data
  ? { ...existing.data, configFields: updatedFields }
  : { toggles: DEFAULT_TOGGLES, configFields: updatedFields };
await storageSet(STORAGE_KEYS.SESSION_CONFIG, config);

// Jira credentials — yeni key
STORAGE_KEYS.JIRA_CREDENTIALS = 'jira_credentials';
// Değer: JiraCredentials interface
```

**DİKKAT — Mevcut STORAGE_KEYS.JIRA_CREDENTIALS zaten tanımlı:**
- `constants.ts`'de `JIRA_CREDENTIALS: 'jira_credentials'` zaten mevcut
- Yeni key eklemeye GEREK YOK — sadece `ONBOARDING_COMPLETED` key'i eklenmeli

### Jira Adımı — Epic 4 Bağımlılığı

**ÖNEMLI:** Jira entegrasyonu (Epic 4) henüz backlog'da. Bu story'deki Jira adımı:
- UI form alanlarını gösterir (platform seçimi, URL, token)
- Girilen değerleri `jira_credentials` storage key'ine kaydeder
- "Bağlantıyı Test Et" butonu **disabled** — tooltip: "Jira entegrasyonu yakında"
- Epic 4 story 4-1 implementasyonu yapıldığında test butonu aktif hale gelecek
- "Atla" butonu her zaman mevcut — Jira zorunlu değil

```typescript
// JiraCredentials interface
interface JiraCredentials {
  platform: 'cloud' | 'server' | '';
  url: string;
  token: string;
}
```

### StepWizard Component Spesifikasyonu

**UX Spec'ten:**
- Progress bar (1/3, 2/3, 3/3) + step içeriği + "İleri"/"Atla" butonları
- Anatomy: `[Progress Indicator] [Step Title] [Step Content] [Footer: Skip + Next]`

**Layout (popup 400x600px içinde):**
```
┌─────────────────────────────────────────┐
│ ● ○ ○  Adım 1/3                        │  ← Progress indicator
├─────────────────────────────────────────┤
│                                          │
│ Ortam Bilgisi                           │  ← Step title
│                                          │
│ [Step Content — form alanları]           │  ← Step content (scrollable)
│                                          │
├─────────────────────────────────────────┤
│ [Atla]                     [İleri →]    │  ← Footer butonları
└─────────────────────────────────────────┘
```

**Son adımda (3/3):**
```
┌─────────────────────────────────────────┐
│ ● ● ●  Adım 3/3                        │
├─────────────────────────────────────────┤
│                                          │
│ ✓ Hazır!                                │  ← CheckCircle ikonu
│                                          │
│ Kurulum tamam!                          │
│ İlk session'ınızı başlatın.             │
│                                          │
├─────────────────────────────────────────┤
│                            [Başla →]    │  ← Sadece "Başla" (Skip yok)
└─────────────────────────────────────────┘
```

**Props interface:**
```typescript
interface WizardStep {
  title: string;
  content: ComponentChildren;
  /** Son adımda Skip gizlenir */
  hideSkip?: boolean;
  /** Son adımda buton metni "Başla" olur */
  nextLabel?: string;
}

interface StepWizardProps {
  steps: WizardStep[];
  onComplete: () => void;
}
```

### Adım 1 — EnvironmentStep Detaylı Tasarım

**Mevcut component'ler kullan:**
- `Input` — `src/components/ui/Input.tsx` (Story 3.2'de oluşturuldu) ✓
- `Select` — `src/components/ui/Select.tsx` (Story 3.2'de oluşturuldu) ✓

**Form alanları:**
```
Proje Adı    [e-commerce         ]  ← Input
Ortam        [Staging           ▼]  ← Select (development/staging/QA/UAT/production)
Agile Takım  [Team Alpha         ]  ← Input
```

**DİKKAT — Popup'ta FormRow KULLANILMAZ:**
- UX spec açıkça belirtir: "FormRow → Options Page form alanları — popup'ta kullanılmaz (dikey layout)"
- Popup'ta alanlar dikey düzende (label üstte, input altta) olmalı
- Popup alanı kısıtlı (400px genişlik) — yatay layout sığmaz

**Select seçenekleri — ConfigurationPage ile aynı:**
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

### Adım 2 — JiraStep Detaylı Tasarım

**Form alanları:**
```
Platform     [Cloud            ▼]  ← Select (Cloud / Server/DC)
Jira URL     [https://xxx.atlassian.net]  ← Input
API Token    [••••••••••••••••]  ← Input (type=password)

[Bağlantıyı Test Et]  ← disabled Button + tooltip
```

**Platform seçenekleri:**
```typescript
const platformOptions = [
  { value: '', label: 'Seçiniz...' },
  { value: 'cloud', label: 'Jira Cloud' },
  { value: 'server', label: 'Jira Server / Data Center' },
];
```

**Platform'a göre URL ipucu:**
- Cloud seçili → placeholder: "https://domain.atlassian.net"
- Server seçili → placeholder: "https://jira.sirketiniz.com"

### Animasyonlar

**Dashboard → Onboarding geçişi (UX spec):**
- `fade` transition — 150ms
- Popup App.tsx'te onboarding view için fade-in class

**Pulse animasyonu (Adım 3 → Dashboard):**
- Tailwind built-in `animate-pulse` class'ı kullan
- SessionControl'un "Başlat" butonuna uygulanır
- 5 saniye sonra veya butona tıklanınca otomatik kapanır

**CSS (src/styles/tailwind.css'e eklenecek):**
```css
/* Onboarding fade geçişi */
.fade-enter {
  animation: fadeIn 150ms ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### Erişilebilirlik Gereksinimleri

- Tüm form alanları `label` + `aria-label` ile etiketlenmeli
- Progress indicator `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `role="progressbar"` attribute'ları
- "Atla" ve "İleri" butonları keyboard erişilebilir (Tab order)
- Focus yönetimi: adım değiştiğinde yeni adımın ilk input'una focus
- Screen reader: adım geçişlerinde `aria-live="polite"` region ile duyuru

### Mevcut Altyapı (Kullanılacak Mevcut Component'ler)

- `Button` — `src/components/ui/Button.tsx` — primary, ghost variant'lar ✓
- `Input` — `src/components/ui/Input.tsx` — metin girişi ✓ (Story 3.2)
- `Select` — `src/components/ui/Select.tsx` — dropdown ✓ (Story 3.2)
- `Card` — `src/components/ui/Card.tsx` — container ✓
- `Toast` / `showToast` — `src/components/ui/Toast.tsx` — bildirim ✓
- `storageGet` / `storageSet` / `storageRemove` — `src/lib/storage.ts` ✓
- `STORAGE_KEYS` — `src/lib/constants.ts` ✓
- `SessionConfig`, `ConfigFields` — `src/lib/types.ts` ✓

**Yeni oluşturulacak component'ler:**
- `StepWizard` — `src/components/domain/StepWizard.tsx` — wizard container
- `EnvironmentStep` — `src/popup/views/onboarding/EnvironmentStep.tsx`
- `JiraStep` — `src/popup/views/onboarding/JiraStep.tsx`
- `ReadyStep` — `src/popup/views/onboarding/ReadyStep.tsx`
- `OnboardingView` — `src/popup/views/OnboardingView.tsx`

### Project Structure Notes

**Dosya organizasyonu — architecture dokümanına uygun:**
```
src/
├── lib/
│   ├── constants.ts                     ← MODIFY: ONBOARDING_COMPLETED key
│   └── types.ts                         ← MODIFY: JiraCredentials interface
├── components/
│   └── domain/
│       ├── StepWizard.tsx               ← CREATE: Wizard container component
│       └── StepWizard.test.tsx          ← CREATE: Wizard testleri
├── popup/
│   ├── App.tsx                          ← MODIFY: Onboarding kontrol + view
│   ├── App.test.tsx                     ← MODIFY: Onboarding testleri
│   ├── view-state.ts                    ← MODIFY: 'onboarding' view + pulse signal
│   └── views/
│       ├── DashboardView.tsx            ← MODIFY: Pulse animasyonu
│       ├── OnboardingView.tsx           ← CREATE: Wizard orchestrator
│       ├── OnboardingView.test.tsx      ← CREATE: Testler
│       └── onboarding/
│           ├── EnvironmentStep.tsx      ← CREATE: Adım 1/3
│           ├── EnvironmentStep.test.tsx ← CREATE: Testler
│           ├── JiraStep.tsx             ← CREATE: Adım 2/3
│           ├── JiraStep.test.tsx        ← CREATE: Testler
│           ├── ReadyStep.tsx            ← CREATE: Adım 3/3
│           └── ReadyStep.test.tsx       ← CREATE: Testler
├── options/
│   └── pages/
│       ├── AboutPage.tsx               ← MODIFY: "Sihirbazı tekrar aç" aktif
│       └── AboutPage.test.tsx          ← MODIFY: Buton testi
└── styles/
    └── tailwind.css                     ← MODIFY: fade-enter animasyonu (gerekirse)
```

### Naming Convention'lar

| Kapsam | Kural | Örnek |
|--------|-------|-------|
| Component dosya | PascalCase | `StepWizard.tsx`, `OnboardingView.tsx` |
| Test dosya | Co-located | `StepWizard.test.tsx` |
| Storage key | snake_case | `onboarding_completed` |
| Signal | camelCase | `onboardingPulse`, `currentStep` |
| CSS animation | kebab-case | `fade-enter` |
| Interface | PascalCase | `JiraCredentials`, `WizardStep` |
| Sabit | SCREAMING_SNAKE | `ONBOARDING_COMPLETED` |

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 3.3: İlk Kullanım Onboarding Wizard]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — §İlk Kurulum & Onboarding, §StepWizard component, §Navigation Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md — §Frontend Architecture, §Communication Patterns, §Data Architecture]
- [Source: _bmad-output/implementation-artifacts/3-2-options-page-konfigurasyon-alanlari-ve-veri-yonetimi.md — ConfigurationPage pattern, Input/Select component'ler, storage merge pattern]

### Previous Story Intelligence (Story 3.2)

**Öğrenilen Kalıplar:**
- Storage merge pattern: Mevcut config'i oku → merge et → yaz (toggles korunmalı)
- Input/Select component'leri kullanıma hazır — props: `label`, `value`, `onChange`, `placeholder`
- Modal component mevcut (Story 2.2)
- `useId` hook'u Preact'te mevcut — ARIA id'ler için kullanılmalı
- Story 3.2 code review'da düzeltilen sorunlar: overlay click pointer-events, dynamic aria-id, Input error bg-white, storage type guard, unused imports

**Dikkat Edilecekler:**
- Storage'a yazarken mevcut verileri SİLME — her zaman merge pattern kullan
- chrome.storage.local.get mock'ları test'lerde doğru yapılandırılmalı
- `vi.stubGlobal('chrome', {...})` pattern'ı test'lerde chrome API mock için standart

### Git Intelligence

**Son commit'ler (Story 3.3 ile ilgili context):**
- `b95647c` — Story 2.2 code review: ConfigFields storage persist testi
- `fa58c5c` — Story 3-2 status done
- `582125b` — Story 3-2 code review fixes: Modal overlay click, dynamic aria ID, Input error bg-white, storage type guard
- `6fe113d` — Story 2.1: Snapshot motoru
- `d963d24` — Story 3.1: Options page layout, navigasyon ve genel ayarlar

**Geçerli test durumu:** Tüm testler geçiyor (story 3.2 sonrası 303 test)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

- `AboutPage.test.tsx` toast testi için `ToastContainer` render edilmesi gerekti — DataManagementPage.test.tsx pattern'ı takip edildi
- `App.test.tsx` mock'u güncellendi: `onboarding_completed: true` varsayılan değer olarak eklendi; `currentView` signal her test öncesi sıfırlanıyor

### Completion Notes List

- **Task 1**: `ONBOARDING_COMPLETED` storage key eklendi; `JiraCredentials` interface (`platform: 'cloud' | 'server' | ''`, `url`, `token`) types.ts'e eklendi
- **Task 2**: `View` type `'onboarding'` ile genişletildi; `onboardingPulse = signal(false)` view-state'e eklendi
- **Task 3**: `StepWizard` component oluşturuldu — iç `currentStep` state ile çalışır, `WizardStep[]` + `onComplete` prop alır; `role="progressbar"` ARIA attribute'ları, keyboard handler (Enter/ESC), hideSkip/nextLabel desteği; 8 test (tümü geçiyor)
- **Task 4**: `EnvironmentStep` (merge-write pattern), `JiraStep` (type=password native input, disabled test butonu), `ReadyStep` (CheckCircle icon); her adım için 5/5/3 test
- **Task 5**: `OnboardingView` — 3 adımı sıralar, `handleComplete` storage'a yazar, pulse timer'ı başlatır, view'ı dashboard'a döndürür; 8 test
- **Task 6**: `App.tsx` `useEffect` mount'ta `checkOnboarding()` çağırır; `OnboardingView` render bloğu fade-enter ile eklendi; App.test.tsx 5 teste çıktı
- **Task 7**: `SessionControl` `startPulse?: boolean` prop aldı — `animate-pulse` class'ı "Session Başlat" butonuna uygulanır; `DashboardView` pulse'ı import eder ve `handleStartSession`'da kapatır; `OnboardingView.handleComplete` 5sn timer başlatır; `tailwind.css`'e `fade-enter` animasyonu eklendi
- **Task 8**: `AboutPage` butonu aktif hale getirildi — `storageRemove` + `showToast`; `options/App.tsx`'e `ToastContainer` eklendi (ConfigurationPage ve DataManagementPage da showToast kullanıyordu, eksikti); 2 ek test
- **Task 9**: 371 test geçiyor (303'ten +68); tüm yeni testler co-located

### File List

- `src/lib/constants.ts` — MODIFIED: ONBOARDING_COMPLETED key eklendi
- `src/lib/types.ts` — MODIFIED: JiraCredentials interface eklendi
- `src/popup/view-state.ts` — MODIFIED: View type + onboardingPulse signal
- `src/components/ui/Input.tsx` — MODIFIED: type prop eklendi (text/password/email/url/number)
- `src/components/domain/StepWizard.tsx` — CREATED (review: key={i} → key={s.title})
- `src/components/domain/StepWizard.test.tsx` — CREATED (review: +2 ESC key test)
- `src/popup/views/onboarding/EnvironmentStep.tsx` — CREATED (review: try-catch + debounce)
- `src/popup/views/onboarding/EnvironmentStep.test.tsx` — CREATED
- `src/popup/views/onboarding/JiraStep.tsx` — CREATED (review: Input type=password, try-catch, debounce)
- `src/popup/views/onboarding/JiraStep.test.tsx` — CREATED
- `src/popup/views/onboarding/ReadyStep.tsx` — CREATED
- `src/popup/views/onboarding/ReadyStep.test.tsx` — CREATED
- `src/popup/views/OnboardingView.tsx` — CREATED (review: try-catch, setTimeout DashboardView'a taşındı)
- `src/popup/views/OnboardingView.test.tsx` — CREATED
- `src/popup/App.tsx` — MODIFIED: useEffect onboarding check + OnboardingView render (review: try-catch)
- `src/popup/App.test.tsx` — MODIFIED: 2 yeni test + mock güncelleme
- `src/popup/views/DashboardView.tsx` — MODIFIED: onboardingPulse import + SessionControl startPulse prop (review: pulse useEffect cleanup)
- `src/components/domain/SessionControl.tsx` — MODIFIED: startPulse prop eklendi
- `src/styles/tailwind.css` — MODIFIED: fade-enter animasyonu (review: prefers-reduced-motion)
- `src/options/pages/AboutPage.tsx` — MODIFIED: Buton aktif + storageRemove + showToast (review: try-catch)
- `src/options/pages/AboutPage.test.tsx` — MODIFIED: 2 yeni test (review: misleading test adı düzeltildi)
- `src/options/App.tsx` — MODIFIED: ToastContainer eklendi

## Change Log

- 2026-03-08: Story 3.3 implement edildi — OnboardingView wizard (3 adım), storage entegrasyonu, pulse animasyon, AboutPage reset butonu; 371 test geçiyor
- 2026-03-08: Code review — 9 bulgu düzeltildi (2H, 4M, 3L): fade-enter a11y, Input type prop, JiraStep Input kullanımı, storage error handling (4 dosya), pulse timer DashboardView'a taşındı, debounce eklendi, ESC key testi, test adı düzeltmesi, StepWizard key düzeltmesi; 374 test geçiyor
