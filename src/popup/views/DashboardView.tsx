import { signal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { Lock, Settings, Bug, ChevronDown, ChevronRight } from 'lucide-preact';

import { SessionControl } from '@/components/domain/SessionControl';
import { LiveCounters } from '@/components/domain/LiveCounters';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import { sendMessage } from '@/lib/messaging';
import { MESSAGE_ACTIONS, STORAGE_KEYS } from '@/lib/constants';
import { storageGet, storageSet } from '@/lib/storage';
import { showToast } from '@/components/ui/Toast';
import { currentView } from '@/popup/App';
import type { SessionMeta, SessionConfig, StartSessionPayload, StopSessionPayload, GetSessionStatusPayload } from '@/lib/types';

const DEFAULT_TOGGLES: SessionConfig['toggles'] = {
  har: true,
  console: true,
  dom: true,
  localStorage: true,
  sessionStorage: true,
};

// View-local signals
const sessionStatus = signal<SessionMeta['status']>('idle');
const startTime = signal<number | null>(null);
const elapsedSeconds = signal(0);
const counters = signal<SessionMeta['counters']>({
  clicks: 0,
  xhrRequests: 0,
  consoleErrors: 0,
  navEvents: 0,
});
const toggles = signal<SessionConfig['toggles']>({ ...DEFAULT_TOGGLES });
const isActionLoading = signal(false);
const isTogglesOpen = signal(false);

export function DashboardView() {
  const tabIdRef = useRef<number | null>(null);
  const tabUrlRef = useRef<string>('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize: load tab info, session status, and config toggles
  useEffect(() => {
    void init();
    return () => {
      stopPolling();
      stopDurationTimer();
    };
  }, []);

  async function init() {
    // 1. Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabIdRef.current = tab?.id ?? null;
    tabUrlRef.current = tab?.url ?? '';

    // 2. Load toggle config from storage
    const configResult = await storageGet<SessionConfig>(STORAGE_KEYS.SESSION_CONFIG);
    if (configResult.success && configResult.data?.toggles) {
      toggles.value = configResult.data.toggles;
    }

    // 3. Query session status
    if (tabIdRef.current !== null) {
      await fetchSessionStatus();
    }
  }

  async function fetchSessionStatus() {
    const tabId = tabIdRef.current;
    if (tabId === null) return;

    const result = await sendMessage<GetSessionStatusPayload, SessionMeta | null>({
      action: MESSAGE_ACTIONS.GET_SESSION_STATUS,
      payload: { tabId },
    });

    if (result.success && result.data) {
      applySessionMeta(result.data);
    }
  }

  function applySessionMeta(meta: SessionMeta) {
    sessionStatus.value = meta.status;
    counters.value = meta.counters;

    if (meta.status === 'recording') {
      startTime.value = meta.startTime;
      startDurationTimer(meta.startTime);
      startPolling();
    } else {
      startTime.value = null;
      stopDurationTimer();
      stopPolling();
    }
  }

  function startDurationTimer(fromTimestamp: number) {
    stopDurationTimer();
    function tick() {
      elapsedSeconds.value = Math.floor((Date.now() - fromTimestamp) / 1000);
    }
    tick();
    durationRef.current = setInterval(tick, 1000);
  }

  function stopDurationTimer() {
    if (durationRef.current !== null) {
      clearInterval(durationRef.current);
      durationRef.current = null;
    }
    elapsedSeconds.value = 0;
  }

  function startPolling() {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      const tabId = tabIdRef.current;
      if (tabId === null) return;

      const result = await sendMessage<GetSessionStatusPayload, SessionMeta | null>({
        action: MESSAGE_ACTIONS.GET_SESSION_STATUS,
        payload: { tabId },
      });

      if (result.success && result.data) {
        counters.value = result.data.counters;
        if (result.data.status !== 'recording') {
          stopPolling();
          stopDurationTimer();
          sessionStatus.value = result.data.status;
        }
      }
    }, 2000);
  }

  function stopPolling() {
    if (pollingRef.current !== null) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  async function handleStartSession() {
    const tabId = tabIdRef.current;
    if (tabId === null) {
      showToast('error', 'Aktif sekme bulunamadı.');
      return;
    }

    isActionLoading.value = true;
    const result = await sendMessage<StartSessionPayload, SessionMeta>({
      action: MESSAGE_ACTIONS.START_SESSION,
      payload: { tabId, url: tabUrlRef.current },
    });
    isActionLoading.value = false;

    if (result.success) {
      applySessionMeta(result.data);
    } else {
      showToast('error', `Session başlatılamadı: ${result.error}`);
    }
  }

  async function handleStopSession() {
    const tabId = tabIdRef.current;
    if (tabId === null) return;

    isActionLoading.value = true;
    const result = await sendMessage<StopSessionPayload, SessionMeta>({
      action: MESSAGE_ACTIONS.STOP_SESSION,
      payload: { tabId },
    });
    isActionLoading.value = false;

    if (result.success && result.data) {
      applySessionMeta(result.data);
    } else if (result.success) {
      sessionStatus.value = 'stopped';
      stopPolling();
      stopDurationTimer();
      startTime.value = null;
    } else {
      showToast('error', `Session durdurulamadı: ${result.error}`);
    }
  }

  async function handleToggleChange(
    key: keyof SessionConfig['toggles'],
    value: boolean,
  ) {
    const updated = { ...toggles.value, [key]: value };
    toggles.value = updated;

    const currentConfig = await storageGet<SessionConfig>(STORAGE_KEYS.SESSION_CONFIG);
    const config: SessionConfig = currentConfig.success && currentConfig.data
      ? { ...currentConfig.data, toggles: updated }
      : { toggles: updated };

    await storageSet(STORAGE_KEYS.SESSION_CONFIG, config);
  }

  function handleOpenSettings() {
    chrome.runtime.openOptionsPage();
  }

  const t = toggles.value;
  const c = counters.value;
  const status = sessionStatus.value;

  return (
    <div class="flex flex-col h-full overflow-x-hidden overflow-y-auto">
      {/* Header */}
      <header class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h1 class="text-sm font-semibold text-gray-900">QA Helper</h1>
        <button
          type="button"
          onClick={handleOpenSettings}
          aria-label="Ayarlar sayfasını aç"
          class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 rounded"
        >
          <Settings size={14} />
          Ayarlar
        </button>
      </header>

      {/* Main content */}
      <main class="flex flex-col gap-3 p-4 flex-1">
        {/* Session Control Card */}
        <Card>
          <SessionControl
            status={status}
            elapsedSeconds={elapsedSeconds.value}
            onStart={() => void handleStartSession()}
            onStop={() => void handleStopSession()}
            loading={isActionLoading.value}
          />
        </Card>

        {/* Live Counters */}
        <Card>
          <LiveCounters
            xhrRequests={c.xhrRequests}
            consoleErrors={c.consoleErrors}
            navEvents={c.navEvents}
          />
        </Card>

        {/* Data Sources Toggle Section */}
        <Card>
          <button
            type="button"
            onClick={() => { isTogglesOpen.value = !isTogglesOpen.value; }}
            aria-expanded={isTogglesOpen.value}
            aria-label="Veri kaynakları bölümünü aç/kapat"
            class="flex items-center gap-1.5 text-sm font-medium text-gray-700 w-full text-left focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 rounded"
          >
            {isTogglesOpen.value ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Veri Kaynakları
          </button>

          {isTogglesOpen.value && (
            <div class="flex flex-col gap-2 mt-1">
              {(
                [
                  ['har', 'HAR (XHR/Fetch)'],
                  ['console', 'Console'],
                  ['dom', 'DOM'],
                  ['localStorage', 'localStorage'],
                  ['sessionStorage', 'sessionStorage'],
                ] as [keyof SessionConfig['toggles'], string][]
              ).map(([key, label]) => (
                <div key={key} class="flex items-center justify-between gap-2">
                  <label
                    for={`toggle-${key}`}
                    class="text-sm text-gray-600 cursor-pointer select-none"
                  >
                    {label}
                  </label>
                  <Toggle
                    id={`toggle-${key}`}
                    checked={t[key]}
                    onChange={(val) => void handleToggleChange(key, val)}
                    label={`${label} kaydını ${t[key] ? 'kapat' : 'aç'}`}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Bug Report Button */}
        <Button
          variant="primary"
          size="md"
          onClick={() => { currentView.value = 'bugReport'; }}
          iconLeft={<Bug size={14} />}
          aria-label="Bug raporla"
          class="w-full"
        >
          Bug Raporla
        </Button>
      </main>

      {/* Footer */}
      <footer class="flex items-center gap-1.5 px-4 py-2 border-t border-gray-200">
        <Lock size={16} class="text-neutral-400 shrink-0" />
        <span class="text-xs text-neutral-500">Tüm veriler cihazınızda</span>
      </footer>
    </div>
  );
}
