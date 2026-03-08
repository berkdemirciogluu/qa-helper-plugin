import { signal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { ArrowLeft, RefreshCw, ChevronDown, ChevronRight, AlertCircle } from 'lucide-preact';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataSummary } from '@/components/domain/DataSummary';
import { ConfigFields } from '@/components/domain/ConfigFields';

import { sendMessage } from '@/lib/messaging';
import { storageGet } from '@/lib/storage';
import { MESSAGE_ACTIONS, STORAGE_KEYS, DEFAULT_PRIORITY } from '@/lib/constants';
import { showToast } from '@/components/ui/Toast';
import { buildStepsToReproduce } from '@/lib/steps-builder';

import { currentView } from '@/popup/App';
import type {
  SnapshotData,
  TakeSnapshotPayload,
  ClickEvent,
  NavEvent,
  XhrEvent,
  ConfigFields as ConfigFieldsType,
  SessionConfig,
} from '@/lib/types';

type SnapshotStatus = 'loading' | 'success' | 'error';

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

export function BugReportView({ hasSession }: { hasSession: boolean }) {
  const tabIdRef = useRef<number | null>(null);

  useEffect(() => {
    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabIdRef.current = tab?.id ?? null;

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
            <p class="text-sm text-gray-400" aria-live="polite">Screenshot yükleniyor...</p>
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
          {status === 'error' && (
            <p class="text-sm text-red-500">Screenshot alınamadı</p>
          )}
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
              <label
                for="bug-expected"
                class="text-xs font-medium text-gray-700"
              >
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
                  formPriority.value = (e.target as HTMLSelectElement).value as typeof formPriority.value;
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
            onClick={() => { isStepsOpen.value = !isStepsOpen.value; }}
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
                placeholder={hasSession ? 'Adımlar otomatik oluşturuldu, düzenleyebilirsiniz…' : 'Session kaydı yok — adımlar mevcut değil.'}
              />
            </div>
          )}
        </Card>

        {/* Konfigürasyon */}
        <Card>
          <ConfigFields
            value={configFields.value}
            onChange={(updated) => { configFields.value = updated; }}
          />
        </Card>

        {/* Toplanan Veriler */}
        <Card>
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Toplanan Veriler</p>
          <div aria-live="polite">
            {status === 'loading' && (
              <p class="text-sm text-gray-400">Veriler toplanıyor…</p>
            )}
            {status !== 'loading' && (
              <DataSummary
                hasScreenshot={Boolean(data?.screenshot.dataUrl)}
                hasDom={Boolean(data?.dom.html)}
                hasLocalStorage={Boolean(data && Object.keys(data.storage.localStorage).length > 0)}
                hasSessionStorage={Boolean(data && Object.keys(data.storage.sessionStorage).length > 0)}
                consoleLogCount={data?.consoleLogs.length ?? 0}
                xhrCount={sessionXhrCount.value}
                clickCount={sessionClickCount.value}
                hasSession={hasSession}
              />
            )}
          </div>
        </Card>

        {/* Export butonları */}
        <div class="flex flex-col gap-2">
          <Button variant="secondary" size="md" disabled class="w-full">
            ZIP İndir
          </Button>
          <Button variant="secondary" size="md" disabled class="w-full">
            Jira'ya Gönder
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer class="flex items-center gap-1.5 px-4 py-2 border-t border-gray-200 shrink-0">
        <AlertCircle size={14} class="text-neutral-400 shrink-0" aria-hidden="true" />
        <span class="text-xs text-neutral-500">Tüm veriler cihazınızda</span>
      </footer>
    </div>
  );
}
