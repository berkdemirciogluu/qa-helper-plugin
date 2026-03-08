import { SectionGroup } from '@/components/layout/SectionGroup';

export function AboutPage() {
  const version = chrome.runtime.getManifest().version;

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
          disabled
          class="text-sm text-gray-400 cursor-not-allowed"
          aria-label="Kurulum sihirbazını tekrar aç"
        >
          Kurulum sihirbazını tekrar aç (yakında)
        </button>
      </SectionGroup>
    </div>
  );
}
