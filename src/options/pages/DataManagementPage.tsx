import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { HardDrive, Trash2, AlertTriangle } from 'lucide-preact';

import { SectionGroup } from '@/components/layout/SectionGroup';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';
import { storageGetUsage, storageClearSessions } from '@/lib/storage';
import type { StorageUsageInfo } from '@/lib/types';

const storageUsage = signal<StorageUsageInfo | null>(null);
const isLoading = signal(true);
const isModalOpen = signal(false);
const isClearing = signal(false);

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DataManagementPage() {
  useEffect(() => {
    storageUsage.value = null;
    isLoading.value = true;
    isModalOpen.value = false;
    isClearing.value = false;
    loadUsage();
  }, []);

  if (isLoading.value) {
    return (
      <SectionGroup title="Storage Status">
        <p class="text-sm text-gray-400">Loading...</p>
      </SectionGroup>
    );
  }

  const usage = storageUsage.value;

  return (
    <div class="flex flex-col gap-6">
      <SectionGroup title="Storage Status" description="Session records and storage usage">
        <div class="flex flex-col gap-3" aria-live="polite">
          <div class="flex items-center gap-2 text-sm text-gray-700">
            <HardDrive size={16} class="text-gray-400" aria-hidden="true" />
            <span>Total usage: <strong>{usage ? formatBytes(usage.totalBytes) : '—'}</strong></span>
          </div>
          <div class="text-sm text-gray-700">
            Active sessions: <strong>{usage?.sessionCount ?? 0}</strong>
          </div>

          {usage && usage.sessions.length > 0 && (
            <ul class="mt-2 flex flex-col gap-1">
              {usage.sessions.map((s) => (
                <li
                  key={s.tabId}
                  class="text-xs text-gray-600 bg-gray-50 rounded px-3 py-2"
                >
                  <span class="font-medium">Tab #{s.tabId}</span>
                  {' — '}
                  <span>{s.url}</span>
                  {' ('}
                  {formatTime(s.startTime)}, {s.eventCount} events
                  {')'}
                </li>
              ))}
            </ul>
          )}

          {usage && usage.sessions.length === 0 && (
            <p class="text-xs text-gray-400 mt-1">No active sessions found.</p>
          )}
        </div>
      </SectionGroup>

      <SectionGroup title="Danger Zone">
        <p class="text-sm text-gray-500 mb-2">
          Deletes all session records. Configuration settings are preserved.
        </p>
        <Button
          variant="danger"
          size="lg"
          iconLeft={<Trash2 size={16} />}
          onClick={() => { isModalOpen.value = true; }}
          aria-label="Clear all session data"
        >
          Clear All Data
        </Button>
      </SectionGroup>

      <Modal
        isOpen={isModalOpen.value}
        onClose={() => { isModalOpen.value = false; }}
        title="Clear Data"
      >
        <div class="flex items-center gap-2 text-amber-600 mb-2">
          <AlertTriangle size={20} aria-hidden="true" />
          <span class="text-sm font-medium">This action cannot be undone</span>
        </div>
        <p class="text-sm text-gray-600">
          All session data (XHR records, click flows, console logs) will be deleted.
        </p>
        <p class="text-sm text-gray-500 mt-1">
          Configuration settings and Jira connection are preserved.
        </p>
        <div class="flex justify-end gap-2 mt-4">
          <Button
            variant="ghost"
            onClick={() => { isModalOpen.value = false; }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={isClearing.value}
            onClick={() => void handleClearData()}
          >
            Clear
          </Button>
        </div>
      </Modal>
    </div>
  );
}

async function loadUsage() {
  const result = await storageGetUsage();
  if (result.success) {
    storageUsage.value = result.data;
  }
  isLoading.value = false;
}

async function handleClearData() {
  isClearing.value = true;

  const result = await storageClearSessions();
  if (result.success) {
    showToast('success', 'All data cleared');
    await loadUsage();
  } else {
    showToast('error', 'Clear operation failed');
  }

  isClearing.value = false;
  isModalOpen.value = false;
}
