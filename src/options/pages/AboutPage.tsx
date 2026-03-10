import { SectionGroup } from '@/components/layout/SectionGroup';

export function AboutPage() {
  const version = chrome.runtime.getManifest().version;

  return (
    <div class="flex flex-col gap-6">
      <SectionGroup title="About">
        <div class="flex flex-col gap-2">
          <h3 class="text-base font-semibold text-gray-900">QA Helper</h3>
          <p class="text-sm text-gray-600">Version: {version}</p>
          <p class="text-sm text-gray-500 mt-1">
            A bug reporting and data collection tool for manual testing.
          </p>
          <p class="text-sm text-gray-500 mt-1">Developer: QA Helper Team</p>
        </div>
      </SectionGroup>

      <SectionGroup title="License">
        <p class="text-sm text-gray-500">Status: Free (license will be added in Phase 2)</p>
      </SectionGroup>
    </div>
  );
}
