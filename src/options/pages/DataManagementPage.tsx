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
  return new Date(timestamp).toLocaleString('tr-TR', {
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
      <SectionGroup title="Depolama Durumu">
        <p class="text-sm text-gray-400">Yükleniyor...</p>
      </SectionGroup>
    );
  }

  const usage = storageUsage.value;

  return (
    <div class="flex flex-col gap-6">
      <SectionGroup title="Depolama Durumu" description="Session kayıtları ve depolama kullanımı">
        <div class="flex flex-col gap-3" aria-live="polite">
          <div class="flex items-center gap-2 text-sm text-gray-700">
            <HardDrive size={16} class="text-gray-400" aria-hidden="true" />
            <span>Toplam kullanım: <strong>{usage ? formatBytes(usage.totalBytes) : '—'}</strong></span>
          </div>
          <div class="text-sm text-gray-700">
            Aktif session: <strong>{usage?.sessionCount ?? 0}</strong> adet
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
                  {formatTime(s.startTime)}, {s.eventCount} olay
                  {')'}
                </li>
              ))}
            </ul>
          )}

          {usage && usage.sessions.length === 0 && (
            <p class="text-xs text-gray-400 mt-1">Aktif session bulunmuyor.</p>
          )}
        </div>
      </SectionGroup>

      <SectionGroup title="Tehlikeli Bölge">
        <p class="text-sm text-gray-500 mb-2">
          Tüm session kayıtlarını siler. Konfigürasyon ayarları korunur.
        </p>
        <Button
          variant="danger"
          size="lg"
          iconLeft={<Trash2 size={16} />}
          onClick={() => { isModalOpen.value = true; }}
          aria-label="Tüm session verilerini temizle"
        >
          Tüm Verileri Temizle
        </Button>
      </SectionGroup>

      <Modal
        isOpen={isModalOpen.value}
        onClose={() => { isModalOpen.value = false; }}
        title="Verileri Temizle"
      >
        <div class="flex items-center gap-2 text-amber-600 mb-2">
          <AlertTriangle size={20} aria-hidden="true" />
          <span class="text-sm font-medium">Bu işlem geri alınamaz</span>
        </div>
        <p class="text-sm text-gray-600">
          Tüm session verileri (XHR kayıtları, tıklama akışları, console logları) silinecek.
        </p>
        <p class="text-sm text-gray-500 mt-1">
          Konfigürasyon ayarları ve Jira bağlantısı korunur.
        </p>
        <div class="flex justify-end gap-2 mt-4">
          <Button
            variant="ghost"
            onClick={() => { isModalOpen.value = false; }}
          >
            İptal
          </Button>
          <Button
            variant="danger"
            loading={isClearing.value}
            onClick={() => void handleClearData()}
          >
            Temizle
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
    showToast('success', 'Tüm veriler temizlendi');
    await loadUsage();
  } else {
    showToast('error', 'Temizleme başarısız oldu');
  }

  isClearing.value = false;
  isModalOpen.value = false;
}
