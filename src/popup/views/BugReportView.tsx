import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { ArrowLeft, RefreshCw } from 'lucide-preact';

import { Button } from '@/components/ui/Button';
import { sendMessage } from '@/lib/messaging';
import { MESSAGE_ACTIONS } from '@/lib/constants';
import { showToast } from '@/components/ui/Toast';
import { currentView } from '@/popup/App';
import type { SnapshotData, TakeSnapshotPayload } from '@/lib/types';

type SnapshotStatus = 'loading' | 'success' | 'error';

const snapshotStatus = signal<SnapshotStatus>('loading');
const snapshotData = signal<SnapshotData | null>(null);

export function BugReportView() {
  useEffect(() => {
    void triggerSnapshot();
  }, []);

  async function triggerSnapshot() {
    snapshotStatus.value = 'loading';
    snapshotData.value = null;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tab?.id;

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

  const status = snapshotStatus.value;
  const data = snapshotData.value;

  return (
    <div class="flex flex-col h-full overflow-x-hidden overflow-y-auto">
      {/* Header */}
      <header class="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
        <button
          type="button"
          onClick={() => { currentView.value = 'dashboard'; }}
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
            <p class="text-sm text-gray-400">Screenshot yükleniyor...</p>
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

        {/* Retake button */}
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

        {/* Snapshot status */}
        <div
          aria-live="polite"
          class="rounded-lg border border-gray-200 p-3"
        >
          {status === 'loading' && (
            <p class="text-sm text-gray-500">Veriler toplanıyor...</p>
          )}

          {status === 'success' && data && (
            <ul class="flex flex-col gap-1.5 text-sm text-gray-700">
              <li class="flex items-center gap-1.5">
                <span class={data.screenshot.dataUrl ? 'text-emerald-500' : 'text-amber-500'}>
                  {data.screenshot.dataUrl ? '✓' : '⚠'}
                </span>
                Screenshot
              </li>
              <li class="flex items-center gap-1.5">
                <span class={data.dom.html ? 'text-emerald-500' : 'text-amber-500'}>
                  {data.dom.html ? '✓' : '⚠'}
                </span>
                DOM Snapshot
              </li>
              <li class="flex items-center gap-1.5">
                <span class={Object.keys(data.storage.localStorage).length > 0 ? 'text-emerald-500' : 'text-gray-400'}>
                  {Object.keys(data.storage.localStorage).length > 0 ? '✓' : '—'}
                </span>
                localStorage
              </li>
              <li class="flex items-center gap-1.5">
                <span class={Object.keys(data.storage.sessionStorage).length > 0 ? 'text-emerald-500' : 'text-gray-400'}>
                  {Object.keys(data.storage.sessionStorage).length > 0 ? '✓' : '—'}
                </span>
                sessionStorage
              </li>
              <li class="flex items-center gap-1.5">
                <span class="text-emerald-500">✓</span>
                Console Logs ({data.consoleLogs.length})
              </li>
            </ul>
          )}

          {status === 'error' && (
            <p class="text-sm text-red-500">Veriler toplanamadı. Tekrar deneyin.</p>
          )}
        </div>

        {/* Form placeholder — Story 2.2 */}
        <div class="rounded-lg border border-dashed border-gray-300 p-3 text-center">
          <p class="text-xs text-gray-400">Bug form alanları — Story 2.2'de eklenecek</p>
        </div>

        {/* Action buttons — disabled until later stories */}
        <div class="flex flex-col gap-2">
          <Button variant="secondary" size="md" disabled class="w-full">
            ZIP İndir
          </Button>
          <Button variant="secondary" size="md" disabled class="w-full">
            Jira'ya Gönder
          </Button>
        </div>
      </main>
    </div>
  );
}
