import { signal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { Lock, Settings, Bug } from 'lucide-preact';

import { SessionControl } from '@/components/domain/SessionControl';
import { LiveCounters } from '@/components/domain/LiveCounters';
import { Button } from '@/components/ui/Button';

import { sendMessage } from '@/lib/messaging';
import { MESSAGE_ACTIONS, STORAGE_KEYS } from '@/lib/constants';
import { storageGet } from '@/lib/storage';
import { showToast } from '@/components/ui/Toast';
import type {
  SessionMeta,
  SessionConfig,
  ConfigFields,
  StartSessionPayload,
  StopSessionPayload,
  GetSessionStatusPayload,
} from '@/lib/types';

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
const configFields = signal<ConfigFields>({
  environment: '',
  testCycle: '',
  agileTeam: '',
  project: '',
});

interface DashboardViewProps {
  onOpenBugReport: () => void;
}

export function DashboardView({ onOpenBugReport }: DashboardViewProps) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    // 1. Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabIdRef.current = tab?.id ?? null;
    tabUrlRef.current = tab?.url ?? '';

    // 2. Load toggle config and config fields from storage
    const configResult = await storageGet<SessionConfig>(STORAGE_KEYS.SESSION_CONFIG);
    if (configResult.success && configResult.data?.toggles) {
      toggles.value = configResult.data.toggles;
    }
    if (configResult.success && configResult.data?.configFields) {
      configFields.value = configResult.data.configFields;
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
      showToast('error', 'No active tab found.');
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
      showToast('error', `Failed to start session: ${result.error}`);
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
      showToast('error', `Failed to stop session: ${result.error}`);
    }
  }

  function handleOpenSettings() {
    chrome.runtime.openOptionsPage();
  }

  const c = counters.value;
  const status = sessionStatus.value;
  const cfg = configFields.value;
  const hasConfig = cfg.environment || cfg.project || cfg.testCycle;

  return (
    <div class="flex flex-col h-full overflow-x-hidden overflow-y-auto">
      {/* Header */}
      <header class="flex items-center justify-between px-3 py-3 border-b border-gray-200">
        <div class="flex items-center gap-2">
          <div
            class="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center text-white text-xs font-bold"
            aria-hidden="true"
          >
            Q
          </div>
          <h1 class="text-sm font-semibold text-gray-900">QA Helper</h1>
        </div>
        <button
          type="button"
          onClick={handleOpenSettings}
          aria-label="Open settings"
          class="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
        >
          <Settings size={14} />
        </button>
      </header>

      {/* Main content */}
      <main class="flex flex-col gap-3 p-4 flex-1">
        {/* Session Control */}
        <div class="bg-gray-50 rounded-lg p-3">
          <SessionControl
            status={status}
            elapsedSeconds={elapsedSeconds.value}
            onStart={() => void handleStartSession()}
            onStop={() => void handleStopSession()}
            loading={isActionLoading.value}
          />
        </div>

        {/* Live Counters — Stat Chips */}
        <LiveCounters
          xhrRequests={c.xhrRequests}
          consoleErrors={c.consoleErrors}
          navEvents={c.navEvents}
          clicks={c.clicks}
        />

        {/* Config Section */}
        {hasConfig && (
          <div class="bg-gray-50 rounded-lg px-3 py-2 text-xs">
            {cfg.environment && (
              <div class="flex justify-between py-1 text-gray-500">
                <span>Environment</span>
                <span class="text-gray-700 font-medium capitalize">{cfg.environment}</span>
              </div>
            )}
            {cfg.project && (
              <div class="flex justify-between py-1 text-gray-500">
                <span>Project</span>
                <span class="text-gray-700 font-medium">{cfg.project}</span>
              </div>
            )}
            {cfg.testCycle && (
              <div class="flex justify-between py-1 text-gray-500">
                <span>Sprint</span>
                <span class="text-gray-700 font-medium">{cfg.testCycle}</span>
              </div>
            )}
          </div>
        )}

        {/* Bug Report Button */}
        <Button
          variant="primary"
          size="lg"
          onClick={onOpenBugReport}
          iconLeft={<Bug size={16} />}
          aria-label="Report bug"
          class="w-full"
        >
          Report Bug
        </Button>
      </main>

      {/* Footer */}
      <footer class="flex items-center gap-1.5 px-4 py-2 border-t border-gray-200">
        <Lock size={16} class="text-neutral-400 shrink-0" />
        <span class="text-xs text-neutral-500">All data stays on your device</span>
      </footer>
    </div>
  );
}
