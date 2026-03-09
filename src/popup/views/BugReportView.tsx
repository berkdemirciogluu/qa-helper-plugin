import { signal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import {
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Download,
  Send,
  Loader2,
} from 'lucide-preact';

import { Button } from '@/components/ui/Button';
import { DataSummary } from '@/components/domain/DataSummary';

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
import { loadFieldConfig } from '@/lib/jira/jira-field-discovery';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

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
import type { JiraConfiguredField } from '@/lib/jira/jira-types';

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
const jiraConfiguredFields = signal<JiraConfiguredField[]>([]);
const dynamicFieldValues = signal<Record<string, string>>({});

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
  jiraConfiguredFields.value = [];
  dynamicFieldValues.value = {};
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

    // Jira credentials kontrolü + dinamik alan konfigürasyonu yükle
    const jiraCreds = await storageGet<JiraCredentials>(STORAGE_KEYS.JIRA_CREDENTIALS);
    if (jiraCreds.success && jiraCreds.data) {
      const c = jiraCreds.data;
      jiraConfigured.value = !!(c.platform && c.url && c.token && c.connected);

      if (jiraConfigured.value && c.defaultProjectKey && c.defaultIssueTypeId) {
        const fields = await loadFieldConfig(c.defaultProjectKey, c.defaultIssueTypeId);
        const displayFields = fields.filter((f) => f.required || f.alwaysFill);
        jiraConfiguredFields.value = displayFields;
        const defaults: Record<string, string> = {};
        for (const f of displayFields) {
          defaults[f.fieldId] = f.defaultValue;
        }
        dynamicFieldValues.value = defaults;
      }
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
      showToast('error', 'No active tab found.');
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
      showToast('error', `Snapshot failed: ${result.error}`);
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
        showToast('error', 'Jira configuration not found.');
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
        dynamicFields: jiraConfiguredFields.value,
        dynamicFieldValues: dynamicFieldValues.value,
      });

      if (result.success) {
        jiraExportStatus.value = 'success';
        jiraExportResult.value = { issueKey: result.data.issueKey, issueUrl: result.data.issueUrl };
        showToast('success', `Jira ticket created — ${result.data.issueKey}`);
        if (result.data.warning) {
          showToast('warning', result.data.warning);
        }
      } else {
        jiraExportStatus.value = 'error';
        showToast('error', `Could not connect to Jira. Would you like to download as ZIP?`);
      }
    } catch {
      jiraExportStatus.value = 'error';
      showToast('error', 'An unexpected error occurred.');
    }
  }

  async function handleZipExport() {
    const data = snapshotData.value;
    if (!data) {
      showToast('error', 'No snapshot data available.');
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
      showToast('success', `ZIP downloaded — ${result.data.fileName} (${result.data.fileSize})`);
    } else {
      exportStatus.value = 'error';
      showToast('error', `ZIP creation failed: ${result.error}`);
    }
  }

  async function handleClipboardCopy() {
    const data = snapshotData.value;
    if (!data) {
      showToast('error', 'No snapshot data available.');
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
      showToast('success', 'Description copied');
    } else {
      showToast('error', `Copy failed: ${result.error}`);
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
    <div class="flex flex-col flex-1 min-h-0 overflow-x-hidden overflow-y-auto">
      {/* Header */}
      <header class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 shrink-0">
        <button
          type="button"
          onClick={handleGoBack}
          aria-label="Go back to dashboard"
          class="flex items-center justify-center w-8 h-8 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 class="text-sm font-semibold text-gray-900">Report Bug</h1>
      </header>

      <main class="flex flex-col gap-3 p-3 flex-1">
        {/* Screenshot Preview */}
        <div class="relative rounded-lg border border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center min-h-[100px]">
          {status === 'loading' && (
            <p class="text-xs text-gray-400" aria-live="polite">
              Loading screenshot...
            </p>
          )}
          {status === 'success' && data?.screenshot.dataUrl ? (
            <img
              src={data.screenshot.dataUrl}
              alt="Page screenshot"
              class="w-full object-contain max-h-[200px]"
            />
          ) : status === 'success' ? (
            <p class="text-xs text-gray-400">Screenshot not available</p>
          ) : null}
          {status === 'error' && <p class="text-xs text-red-500">Screenshot failed</p>}
          {/* Retake overlay button */}
          <button
            type="button"
            onClick={() => void triggerSnapshot()}
            disabled={status === 'loading'}
            aria-label="Retake screenshot"
            class="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-[11px] rounded hover:bg-black/70 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50"
          >
            <RefreshCw size={10} class="inline mr-1" />
            Retake
          </button>
        </div>

        {/* Bug Formu */}
        <div class="flex flex-col gap-2.5">
          {/* Expected Result */}
          <div class="flex flex-col gap-1">
            <label for="bug-expected" class="text-xs font-medium text-gray-700">
              Expected Result
            </label>
            <textarea
              id="bug-expected"
              aria-label="Expected result"
              placeholder="What did you expect to happen?"
              value={formExpected.value}
              onInput={(e) => {
                formExpected.value = (e.target as HTMLTextAreaElement).value;
                handleTextareaResize(e);
              }}
              rows={2}
              class="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-[13px] text-gray-700 resize-vertical focus:outline-2 focus:outline-blue-500 focus:outline-offset-[-1px] focus:border-blue-500"
            />
          </div>

          {/* Why is this a Bug */}
          <div class="flex flex-col gap-1">
            <label for="bug-reason" class="text-xs font-medium text-gray-700">
              Why is this a Bug?
            </label>
            <textarea
              id="bug-reason"
              aria-label="Why is this a bug"
              placeholder="What happened? What's the issue?"
              value={formReason.value}
              onInput={(e) => {
                formReason.value = (e.target as HTMLTextAreaElement).value;
                handleTextareaResize(e);
              }}
              rows={2}
              class="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-[13px] text-gray-700 resize-vertical focus:outline-2 focus:outline-blue-500 focus:outline-offset-[-1px] focus:border-blue-500"
            />
          </div>

          {/* Priority */}
          <div class="flex flex-col gap-1">
            <label for="bug-priority" class="text-xs font-medium text-gray-700">
              Priority
            </label>
            <select
              id="bug-priority"
              value={formPriority.value}
              onChange={(e) => {
                formPriority.value = (e.target as HTMLSelectElement)
                  .value as typeof formPriority.value;
              }}
              class="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-[13px] text-gray-700 focus:outline-2 focus:outline-blue-500 focus:outline-offset-[-1px] focus:border-blue-500"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Steps to Reproduce — collapsible */}
        <div class="rounded-md border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              isStepsOpen.value = !isStepsOpen.value;
            }}
            aria-expanded={isStepsOpen.value}
            aria-controls="steps-to-reproduce"
            class="flex items-center justify-between w-full px-2.5 py-2 text-xs font-medium text-gray-500 bg-gray-50 hover:text-gray-700 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
          >
            <span class="flex items-center gap-1.5">
              {isStepsOpen.value ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Steps to Reproduce{hasSession ? ` (auto)` : ''}
            </span>
          </button>

          {isStepsOpen.value && (
            <div id="steps-to-reproduce" class="p-2.5 border-t border-gray-200">
              <textarea
                aria-label="Steps to reproduce"
                value={stepsText.value}
                onInput={(e) => {
                  stepsText.value = (e.target as HTMLTextAreaElement).value;
                }}
                rows={4}
                class="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-[13px] text-gray-700 resize-none focus:outline-2 focus:outline-blue-500 focus:outline-offset-[-1px] focus:border-blue-500 font-mono text-xs"
                placeholder={
                  hasSession
                    ? 'Steps were auto-generated, you can edit them…'
                    : 'No session recording — steps are not available.'
                }
              />
            </div>
          )}
        </div>

        {/* Collected Data */}
        <div class="bg-gray-50 rounded-lg p-2.5 border border-gray-200">
          <p class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Collected Data
          </p>
          <div aria-live="polite">
            {status === 'loading' && <p class="text-xs text-gray-400">Collecting data…</p>}
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
        </div>

        {/* Export butonları / Post-export UI */}
        {exportStatus.value === 'success' ? (
          <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div class="flex flex-col gap-3 text-center" aria-live="polite">
              <div>
                <p class="text-sm font-medium text-gray-900">ZIP downloaded</p>
                <p class="text-xs text-gray-500">{exportFileName.value}</p>
                <p class="text-xs text-gray-400">({exportFileSize.value})</p>
              </div>
              <p class="text-sm text-gray-700">Would you like to clear session data?</p>
              <div class="flex gap-2">
                <Button
                  variant="danger"
                  size="md"
                  class="flex-1"
                  onClick={() => void handleClearSession()}
                >
                  Clear
                </Button>
                <Button variant="ghost" size="md" class="flex-1" onClick={handleKeepSession}>
                  Keep
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div class="flex flex-col gap-2">
            {/* Dinamik Jira alanları */}
            {jiraConfiguredFields.value.length > 0 && (
              <div class="flex flex-col gap-2">
                <p class="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Jira Fields
                </p>
                {jiraConfiguredFields.value.map((field) => {
                  const value = dynamicFieldValues.value[field.fieldId] ?? '';
                  const isEmpty = field.required && !value;
                  return (
                    <div key={field.fieldId} class="flex flex-col gap-1">
                      <label class="text-xs text-neutral-600">
                        {field.name}
                        {field.required && <span class="text-red-500 ml-1">*</span>}
                      </label>
                      {field.allowedValues && field.allowedValues.length > 0 ? (
                        <Select
                          htmlFor={`dynamic-${field.fieldId}`}
                          options={[
                            { value: '', label: 'Select...' },
                            ...field.allowedValues
                              .filter((v) => !v.disabled)
                              .map((v) => ({ value: v.id, label: v.value ?? v.name ?? v.id })),
                          ]}
                          value={value}
                          onChange={(v) => {
                            dynamicFieldValues.value = {
                              ...dynamicFieldValues.value,
                              [field.fieldId]: v,
                            };
                          }}
                          class={isEmpty ? 'border-red-400' : ''}
                          aria-required={field.required}
                        />
                      ) : (
                        <Input
                          htmlFor={`dynamic-${field.fieldId}`}
                          value={value}
                          onChange={(v) => {
                            dynamicFieldValues.value = {
                              ...dynamicFieldValues.value,
                              [field.fieldId]: v,
                            };
                          }}
                          class={isEmpty ? 'border-red-400' : ''}
                          aria-required={field.required}
                          aria-invalid={isEmpty}
                        />
                      )}
                      {isEmpty && (
                        <p class="text-xs text-red-500" role="alert">
                          {field.name} is required
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Yan yana ZIP + Jira */}
            <div class="flex gap-2">
              <Button
                variant="primary"
                size="md"
                class="flex-1"
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
                {exportStatus.value === 'loading' ? 'Preparing...' : 'Download ZIP'}
              </Button>
              <Button
                variant="secondary"
                size="md"
                class="flex-1"
                disabled={
                  !jiraConfigured.value ||
                  snapshotStatus.value !== 'success' ||
                  jiraExportStatus.value === 'loading' ||
                  jiraConfiguredFields.value
                    .filter((f) => f.required)
                    .some((f) => !dynamicFieldValues.value[f.fieldId])
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
                title={!jiraConfigured.value ? 'Set up Jira from Settings' : undefined}
                aria-disabled={!jiraConfigured.value ? 'true' : undefined}
                aria-busy={jiraExportStatus.value === 'loading'}
              >
                {jiraExportStatus.value === 'loading' ? 'Sending...' : 'Send to Jira'}
              </Button>
            </div>
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
                  Link to existing ticket
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
                    error={!parentKeyValid.value ? 'Invalid format. Example: PROJ-123' : undefined}
                  />
                )}
              </div>
            )}
            {jiraExportStatus.value === 'success' && jiraExportResult.value && (
              <button
                type="button"
                onClick={() => {
                  const url = jiraExportResult.value?.issueUrl;
                  if (url) void chrome.tabs.create({ url });
                }}
                class="text-xs text-blue-600 hover:underline text-left truncate"
                aria-label={`${jiraExportResult.value.issueKey} — View in Jira`}
              >
                {jiraExportResult.value.issueKey} — View in Jira →
              </button>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer class="flex items-center gap-1.5 px-4 py-2 border-t border-gray-200 shrink-0">
        <AlertCircle size={14} class="text-neutral-400 shrink-0" aria-hidden="true" />
        <span class="text-xs text-neutral-500">All data stays on your device</span>
      </footer>
    </div>
  );
}
