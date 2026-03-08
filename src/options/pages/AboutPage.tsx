import { SectionGroup } from '@/components/layout/SectionGroup';
import { storageRemove } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';
import { showToast } from '@/components/ui/Toast';

export function AboutPage() {
  const version = chrome.runtime.getManifest().version;

  async function handleResetOnboarding() {
    await storageRemove(STORAGE_KEYS.ONBOARDING_COMPLETED);
    showToast('info', "Popup'ı açtığınızda kurulum sihirbazı tekrar gösterilecek");
  }

  return (
    <div class="flex flex-col gap-6">
      <SectionGroup title="Hakkında">
        <div class="flex flex-col gap-2">
          <h3 class="text-base font-semibold text-gray-900">QA Helper</h3>
          <p class="text-sm text-gray-600">
            Versiyon: {version}
          </p>
          <p class="text-sm text-gray-500 mt-1">
            Manuel test süreçlerinde bug raporlama ve veri toplama aracı.
          </p>
          <p class="text-sm text-gray-500 mt-1">
            Geliştirici: QA Helper Ekibi
          </p>
        </div>
      </SectionGroup>

      <SectionGroup title="Lisans">
        <p class="text-sm text-gray-500">
          Durum: Ücretsiz (Phase 2'de lisans eklenecek)
        </p>
      </SectionGroup>

      <SectionGroup title="Diğer">
        <button
          type="button"
          onClick={() => void handleResetOnboarding()}
          class="text-sm text-blue-600 hover:text-blue-700 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 rounded"
          aria-label="Kurulum sihirbazını tekrar aç"
        >
          Kurulum sihirbazını tekrar aç
        </button>
      </SectionGroup>
    </div>
  );
}
