import { signal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import {
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Download,
  Copy,
  Send,
  Loader2,
} from 'lucide-preact';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataSummary } from '@/components/domain/DataSummary';
import { ConfigFields } from '@/components/domain/ConfigFields';

import { sendMessage } from '@/lib/messaging';
import { storageGet, storageClearSessions } from '@/lib/storage';
import { MESSAGE_ACTIONS, STORAGE_KEYS, DEFAULT_PRIORITY } from '@/lib/constants';
import { showToast } from '@/components/ui/Toast';
import { buildStepsToReproduce } from '@/lib/steps-builder';
import { buildTimeline } from '@/lib/timeline-builder';
import { buildDescription } from '@/lib/description-builder';
import { exportBugReportZip } from '@/lib/zip-exporter';
import { copyToClipboard } from '@/lib/clipboard';
import { exportToJira } from '@/lib/jira/jira-exporter';
import { Input } from '@/components/ui/Input';

import { currentView, slideDirection } from '@/popup/view-state';
import type {
  SnapshotData,
  TakeSnapshotPayload,
  ClickEvent,
  NavEvent,
  XhrEvent,
  ConfigFields as ConfigFieldsType,
  SessionConfig,
  JiraCredentials,
} from '@/lib/types';

type SnapshotStatus = 'loading' | 'success' | 'error';
type ExportStatus = 'idle' | 'loading' | 'success' | 'error';

// Module-level signals — component unmount/remount'ta korunur
const snapshotStatus = signal<SnapshotStatus>('loading');
const snapshotData = signal<SnapshotData | null>(null);
const formExpected = signal('');
const formReason = signal('');
const formPriority = signal<'low' | 'medium' | 'high' | 'critical'>(DEFAULT_PRIORITY);
const stepsText = signal('');
const isStepsOpen = signal(false);
const sessionXhrCount = signal(0);
const sessionClickCount = signal(0);
const configFields = signal<ConfigFieldsType>({
  environment: '',
  testCycle: '',
  agileTeam: '',
  project: '',
});
const exportStatus = signal<ExportStatus>('idle');
const exportFileName = signal('');
const exportFileSize = signal('');
const jiraConfigured = signal(false);
const jiraExportStatus = signal<ExportStatus>('idle');
const jiraExportResult = signal<{ issueKey: string; issueUrl: string } | null>(null);
const parentTicketKey = signal('');
const parentKeyValid = signal(true);
const linkToParent = signal(false);

/** Test helper — module-level signal'ları sıfırlar */
export function _resetSignalsForTest() {
  snapshotStatus.value = 'loading';
  snapshotData.value = null;
  formExpected.value = '';
  formReason.value = '';
  formPriority.value = DEFAULT_PRIORITY;
  stepsText.value = '';
  isStepsOpen.value = false;
  sessionXhrCount.value = 0;
  sessionClickCount.value = 0;
  configFields.value = { environment: '', testCycle: '', agileTeam: '', project: '' };
  exportStatus.value = 'idle';
  exportFileName.value = '';
  exportFileSize.value = '';
  jiraConfigured.value = false;
  jiraExportStatus.value = 'idle';
  jiraExportResult.value = null;
  parentTicketKey.value = '';
  parentKeyValid.value = true;
  linkToParent.value = false;
}

export function BugReportView({ hasSession }: { hasSession: boolean }) {
  const tabIdRef = useRef<number | null>(null);

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabIdRef.current = tab?.id ?? null;

    // Jira credentials kontrolü
    const jiraCreds = await storageGet<JiraCredentials>(STORAGE_KEYS.JIRA_CREDENTIALS);
    if (jiraCreds.success && jiraCreds.data) {
      const c = jiraCreds.data;
      jiraConfigured.value = !!(c.platform && c.url && c.token && c.connected);
    }

    // Config alanlarını storage'dan yükle
    const configResult = await storageGet<SessionConfig>(STORAGE_KEYS.SESSION_CONFIG);
    if (configResult.success && configResult.data?.configFields) {
      configFields.value = configResult.data.configFields;
    }

    // Session varsa tıklama ve XHR verilerini oku
    const tabId = tabIdRef.current;
    if (tabId !== null && hasSession) {
      const [clicksResult, navsResult, xhrResult] = await Promise.all([
        storageGet<ClickEvent[]>(`${STORAGE_KEYS.SESSION_CLICKS}_${tabId}`),
        storageGet<NavEvent[]>(`${STORAGE_KEYS.SESSION_NAV}_${tabId}`),
        storageGet<XhrEvent[]>(`${STORAGE_KEYS.SESSION_XHR}_${tabId}`),
      ]);

      const clicks = clicksResult.success && clicksResult.data ? clicksResult.data : [];
      const navs = navsResult.success && navsResult.data ? navsResult.data : [];
      const xhrs = xhrResult.success && xhrResult.data ? xhrResult.data : [];

      stepsText.value = buildStepsToReproduce(clicks, navs);
      sessionXhrCount.value = xhrs.length;
      sessionClickCount.value = clicks.length;
    }

    await triggerSnapshot();
  }

  async function triggerSnapshot() {
    snapshotStatus.value = 'loading';
    snapshotData.value = null;

    const tabId = tabIdRef.current;
    if (!tabId) {
      snapshotStatus.value = 'error';
      showToast('error', 'Aktif sekme bulunamadı.');
      return;
    }

    const result = await sendMessage<TakeSnapshotPayload, SnapshotData>({
      action: MESSAGE_ACTIONS.TAKE_SNAPSHOT,
      payload: { tabId },
    });

    if (result.success) {
      snapshotData.value = result.data;
      snapshotStatus.value = 'success';
    } else {
      snapshotStatus.value = 'error';
      showToast('error', `Snapshot alınamadı: ${result.error}`);
    }
  }

  function handleGoBack() {
    slideDirection.value = 'left';
    currentView.value = 'dashboard';
  }

  function resetFormSignals() {
    formExpected.value = '';
    formReason.value = '';
    formPriority.value = DEFAULT_PRIORITY;
    stepsText.value = '';
    isStepsOpen.value = false;
    exportStatus.value = 'idle';
    exportFileName.value = '';
    exportFileSize.value = '';
    jiraExportStatus.value = 'idle';
    jiraExportResult.value = null;
    parentTicketKey.value = '';
    parentKeyValid.value = true;
    linkToParent.value = false;
  }

  async function handleJiraExport() {
    const data = snapshotData.value;
    if (!data || jiraExportStatus.value === 'loading') return;

    // Parent ticket format validation
    if (
      linkToParent.value &&
      parentTicketKey.value &&
      !/^[A-Z][A-Z0-9]+-\d+$/.test(parentTicketKey.value)
    ) {
      parentKeyValid.value = false;
      return;
    }
    parentKeyValid.value = true;

    jiraExportStatus.value = 'loading';
    try {
      const credResult = await storageGet<JiraCredentials>(STORAGE_KEYS.JIRA_CREDENTIALS);
      if (!credResult.success || !credResult.data) {
        showToast('error', 'Jira yapılandırması bulunamadı.');
        jiraExportStatus.value = 'error';
        return;
      }

      const tabId = tabIdRef.current;
      const [clicksResult, navsResult, xhrResult] = await Promise.all([
        tabId !== null
          ? storageGet<ClickEvent[]>(`${STORAGE_KEYS.SESSION_CLICKS}_${tabId}`)
          : Promise.resolve({ success: true as const, data: [] as ClickEvent[] }),
        tabId !== null
          ? storageGet<NavEvent[]>(`${STORAGE_KEYS.SESSION_NAV}_${tabId}`)
          : Promise.resolve({ success: true as const, data: [] as NavEvent[] }),
        tabId !== null
          ? storageGet<XhrEvent[]>(`${STORAGE_KEYS.SESSION_XHR}_${tabId}`)
          : Promise.resolve({ success: true as const, data: [] as XhrEvent[] }),
      ]);

      const xhrs = xhrResult.success && xhrResult.data ? xhrResult.data : [];
      const clicks = clicksResult.success && clicksResult.data ? clicksResult.data : [];
      const navs = navsResult.success && navsResult.data ? navsResult.data : [];

      const meta = data.screenshot.metadata;
      const form = {
        expectedResult: formExpected.value,
        reason: formReason.value,
        priority: formPriority.value,
      };

      const timelineJson = buildTimeline({
        snapshotData: data,
        clicks,
        navs,
        xhrs,
        consoleLogs: data.consoleLogs,
        form,
        configFields: configFields.value,
      });

      const parentKey =
        linkToParent.value && /^[A-Z][A-Z0-9]+-\d+$/.test(parentTicketKey.value)
          ? parentTicketKey.value
          : undefined;

      const result = await exportToJira({
        credentials: credResult.data,
        expected: formExpected.value,
        reason: formReason.value,
        priority: formPriority.value,
        snapshotData: data,
        stepsText: stepsText.value,
        configFields: configFields.value,
        environmentInfo: meta,
        xhrs,
        timelineJson,
        parentKey,
      });

      if (result.success) {
        jiraExportStatus.value = 'success';
        jiraExportResult.value = { issueKey: result.data.issueKey, issueUrl: result.data.issueUrl };
        showToast('success', `Jira ticket oluşturuldu — ${result.data.issueKey}`);
        if (result.data.warning) {
          showToast('warning', result.data.warning);
        }
      } else {
        jiraExportStatus.value = 'error';
        showToast('error', `Jira'ya bağlanılamadı. ZIP olarak indirmek ister misiniz?`);
      }
    } catch {
      jiraExportStatus.value = 'error';
      showToast('error', 'Beklenmeyen bir hata oluştu.');
    }
  }

  async function handleZipExport() {
    const data = snapshotData.value;
    if (!data) {
      showToast('error', 'Snapshot verisi mevcut değil.');
      return;
    }

    exportStatus.value = 'loading';

    const tabId = tabIdRef.current;
    // Session verilerini storage'dan oku (timeline için tam diziler gerekli)
    const [clicksResult, navsResult, xhrResult] = await Promise.all([
      tabId !== null
        ? storageGet<ClickEvent[]>(`${STORAGE_KEYS.SESSION_CLICKS}_${tabId}`)
        : Promise.resolve({ success: true as const, data: [] as ClickEvent[] }),
      tabId !== null
        ? storageGet<NavEvent[]>(`${STORAGE_KEYS.SESSION_NAV}_${tabId}`)
        : Promise.resolve({ success: true as const, data: [] as NavEvent[] }),
      tabId !== null
        ? storageGet<XhrEvent[]>(`${STORAGE_KEYS.SESSION_XHR}_${tabId}`)
        : Promise.resolve({ success: true as const, data: [] as XhrEvent[] }),
    ]);

    const clicks = clicksResult.success && clicksResult.data ? clicksResult.data : [];
    const navs = navsResult.success && navsResult.data ? navsResult.data : [];
    const xhrs = xhrResult.success && xhrResult.data ? xhrResult.data : [];

    const meta = data.screenshot.metadata;
    const environment = {
      browser: meta.browserVersion,
      os: meta.os,
      viewport: `${meta.viewport.width}x${meta.viewport.height}`,
      pixelRatio: meta.pixelRatio,
      language: meta.language,
      url: meta.url,
    };

    const form = {
      expectedResult: formExpected.value,
      reason: formReason.value,
      priority: formPriority.value,
    };

    const timeline = buildTimeline({
      snapshotData: data,
      clicks,
      navs,
      xhrs,
      consoleLogs: data.consoleLogs,
      form,
      configFields: configFields.value,
    });

    const description = buildDescription({
      form,
      stepsText: stepsText.value,
      environment,
      configFields: configFields.value,
    });

    const result = await exportBugReportZip({
      snapshotData: data,
      timeline,
      description,
      xhrs,
    });

    if (result.success) {
      exportStatus.value = 'success';
      exportFileName.value = result.data.fileName;
      exportFileSize.value = result.data.fileSize;
      showToast('success', `ZIP indirildi — ${result.data.fileName} (${result.data.fileSize})`);
    } else {
      exportStatus.value = 'error';
      showToast('error', `ZIP oluşturulamadı: ${result.error}`);
    }
  }

  async function handleClipboardCopy() {
    const data = snapshotData.value;
    if (!data) {
      showToast('error', 'Snapshot verisi mevcut değil.');
      return;
    }

    const meta = data.screenshot.metadata;
    const environment = {
      browser: meta.browserVersion,
      os: meta.os,
      viewport: `${meta.viewport.width}x${meta.viewport.height}`,
      pixelRatio: meta.pixelRatio,
      language: meta.language,
      url: meta.url,
    };

    const description = buildDescription({
      form: {
        expectedResult: formExpected.value,
        reason: formReason.value,
        priority: formPriority.value,
      },
      stepsText: stepsText.value,
      environment,
      configFields: configFields.value,
    });

    const result = await copyToClipboard(description);
    if (result.success) {
      showToast('success', 'Description kopyalandı');
    } else {
      showToast('error', `Kopyalama başarısız: ${result.error}`);
    }
  }

  async function handleClearSession() {
    await storageClearSessions();
    const tabId = tabIdRef.current;
    if (tabId !== null) {
      await sendMessage({ action: MESSAGE_ACTIONS.STOP_SESSION, payload: { tabId } });
    }
    resetFormSignals();
    slideDirection.value = 'left';
    currentView.value = 'dashboard';
  }

  function handleKeepSession() {
    resetFormSignals();
    slideDirection.value = 'left';
    currentView.value = 'dashboard';
  }

  function handleTextareaResize(e: Event) {
    const el = e.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  const status = snapshotStatus.value;
  const data = snapshotData.value;

  return (
    <div class="flex flex-col h-full overflow-x-hidden overflow-y-auto">
      {/* Header */}
      <header class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 shrink-0">
        <button
          type="button"
          onClick={handleGoBack}
          aria-label="Dashboard'a dön"
          class="flex items-center justify-center w-8 h-8 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 class="text-sm font-semibold text-gray-900">Bug Raporu</h1>
      </header>

      <main class="flex flex-col gap-3 p-4 flex-1">
        {/* Screenshot Preview */}
        <div class="rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center min-h-[120px]">
          {status === 'loading' && (
            <p class="text-sm text-gray-400" aria-live="polite">
              Screenshot yükleniyor...
            </p>
          )}
          {status === 'success' && data?.screenshot.dataUrl ? (
            <img
              src={data.screenshot.dataUrl}
              alt="Sayfa ekran görüntüsü"
              class="w-full object-contain max-h-[200px]"
            />
          ) : status === 'success' ? (
            <p class="text-sm text-gray-400">Screenshot alınamadı</p>
          ) : null}
          {status === 'error' && <p class="text-sm text-red-500">Screenshot alınamadı</p>}
        </div>

        {/* Yeniden Çek */}
        <div class="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void triggerSnapshot()}
            loading={status === 'loading'}
            iconLeft={<RefreshCw size={12} />}
            aria-label="Screenshot'ı yeniden çek"
          >
            Yeniden Çek
          </Button>
        </div>

        {/* Bug Formu */}
        <Card>
          <div class="flex flex-col gap-3">
            {/* Beklenen Sonuç */}
            <div class="flex flex-col gap-1">
              <label for="bug-expected" class="text-xs font-medium text-gray-700">
                Beklenen Sonuç
              </label>
              <textarea
                id="bug-expected"
                aria-label="Beklenen sonuç"
                placeholder="Ne olmasını bekliyordunuz?"
                value={formExpected.value}
                onInput={(e) => {
                  formExpected.value = (e.target as HTMLTextAreaElement).value;
                  handleTextareaResize(e);
                }}
                rows={2}
                class="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 resize-none focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-1"
              />
            </div>

            {/* Neden Bug */}
            <div class="flex flex-col gap-1">
              <label for="bug-reason" class="text-xs font-medium text-gray-700">
                Neden Bug?
              </label>
              <textarea
                id="bug-reason"
                aria-label="Neden bug"
                placeholder="Neyin yanlış çalıştığını açıklayın…"
                value={formReason.value}
                onInput={(e) => {
                  formReason.value = (e.target as HTMLTextAreaElement).value;
                  handleTextareaResize(e);
                }}
                rows={2}
                class="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 resize-none focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-1"
              />
            </div>

            {/* Priority */}
            <div class="flex items-center gap-2">
              <label for="bug-priority" class="text-xs font-medium text-gray-700 shrink-0">
                Öncelik
              </label>
              <select
                id="bug-priority"
                value={formPriority.value}
                onChange={(e) => {
                  formPriority.value = (e.target as HTMLSelectElement)
                    .value as typeof formPriority.value;
                }}
                class="flex-1 h-7 rounded border border-gray-300 px-2 text-sm text-gray-700 bg-white focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-1"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Steps to Reproduce — collapsible, varsayılan kapalı */}
        <Card>
          <button
            type="button"
            onClick={() => {
              isStepsOpen.value = !isStepsOpen.value;
            }}
            aria-expanded={isStepsOpen.value}
            aria-controls="steps-to-reproduce"
            class="flex items-center gap-1.5 text-sm font-medium text-gray-700 w-full text-left focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 rounded"
          >
            {isStepsOpen.value ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Steps to Reproduce
          </button>

          {isStepsOpen.value && (
            <div id="steps-to-reproduce">
              <textarea
                aria-label="Steps to reproduce"
                value={stepsText.value}
                onInput={(e) => {
                  stepsText.value = (e.target as HTMLTextAreaElement).value;
                }}
                rows={4}
                class="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 resize-none focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-1 font-mono text-xs"
                placeholder={
                  hasSession
                    ? 'Adımlar otomatik oluşturuldu, düzenleyebilirsiniz…'
                    : 'Session kaydı yok — adımlar mevcut değil.'
                }
              />
            </div>
          )}
        </Card>

        {/* Konfigürasyon */}
        <Card>
          <ConfigFields
            value={configFields.value}
            onChange={(updated) => {
              configFields.value = updated;
            }}
          />
        </Card>

        {/* Toplanan Veriler */}
        <Card>
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Toplanan Veriler</p>
          <div aria-live="polite">
            {status === 'loading' && <p class="text-sm text-gray-400">Veriler toplanıyor…</p>}
            {status !== 'loading' && (
              <DataSummary
                hasScreenshot={Boolean(data?.screenshot.dataUrl)}
                hasDom={Boolean(data?.dom.html)}
                hasLocalStorage={Boolean(data && Object.keys(data.storage.localStorage).length > 0)}
                hasSessionStorage={Boolean(
                  data && Object.keys(data.storage.sessionStorage).length > 0
                )}
                consoleLogCount={data?.consoleLogs.length ?? 0}
                xhrCount={sessionXhrCount.value}
                clickCount={sessionClickCount.value}
                hasSession={hasSession}
              />
            )}
          </div>
        </Card>

        {/* Export butonları / Post-export UI */}
        {exportStatus.value === 'success' ? (
          <Card>
            <div class="flex flex-col gap-3 text-center" aria-live="polite">
              <div>
                <p class="text-sm font-medium text-gray-900">ZIP indirildi</p>
                <p class="text-xs text-gray-500">{exportFileName.value}</p>
                <p class="text-xs text-gray-400">({exportFileSize.value})</p>
              </div>
              <p class="text-sm text-gray-700">Session verilerini temizlemek ister misiniz?</p>
              <div class="flex gap-2">
                <Button
                  variant="danger"
                  size="md"
                  class="flex-1"
                  onClick={() => void handleClearSession()}
                >
                  Temizle
                </Button>
                <Button variant="ghost" size="md" class="flex-1" onClick={handleKeepSession}>
                  Koru
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div class="flex flex-col gap-2">
            <Button
              variant="primary"
              size="md"
              class="w-full"
              disabled={snapshotStatus.value !== 'success'}
              loading={exportStatus.value === 'loading'}
              iconLeft={
                exportStatus.value === 'loading' ? (
                  <Loader2 size={14} class="animate-spin" />
                ) : (
                  <Download size={14} />
                )
              }
              onClick={() => void handleZipExport()}
              aria-busy={exportStatus.value === 'loading'}
            >
              {exportStatus.value === 'loading' ? 'Hazırlanıyor...' : 'ZIP İndir'}
            </Button>
            <Button
              variant="ghost"
              size="md"
              class="w-full"
              disabled={snapshotStatus.value !== 'success'}
              iconLeft={<Copy size={14} />}
              onClick={() => void handleClipboardCopy()}
              aria-label="Description'ı clipboard'a kopyala"
            >
              Kopyala
            </Button>
            {jiraConfigured.value && (
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
                    placeholder="PROJ-123"
                    value={parentTicketKey.value}
                    onChange={(val) => {
                      parentTicketKey.value = val;
                      parentKeyValid.value = true;
                    }}
                    aria-label="Parent ticket key"
                    error={!parentKeyValid.value ? 'Geçersiz format. Örnek: PROJ-123' : undefined}
                  />
                )}
              </div>
            )}
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
            {jiraExportStatus.value === 'success' && jiraExportResult.value && (
              <button
                type="button"
                onClick={() => {
                  const url = jiraExportResult.value?.issueUrl;
                  if (url) void chrome.tabs.create({ url });
                }}
                class="text-xs text-blue-600 hover:underline text-left truncate"
                aria-label={`${jiraExportResult.value.issueKey} — Jira'da görüntüle`}
              >
                {jiraExportResult.value.issueKey} — Jira'da görüntüle →
              </button>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer class="flex items-center gap-1.5 px-4 py-2 border-t border-gray-200 shrink-0">
        <AlertCircle size={14} class="text-neutral-400 shrink-0" aria-hidden="true" />
        <span class="text-xs text-neutral-500">Tüm veriler cihazınızda</span>
      </footer>
    </div>
  );
}
