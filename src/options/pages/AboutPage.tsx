import { SectionGroup } from '@/components/layout/SectionGroup';
import { storageRemove } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';
import { showToast } from '@/components/ui/Toast';

export function AboutPage() {
  const version = chrome.runtime.getManifest().version;

  async function handleResetOnboarding() {
    try {
      await storageRemove(STORAGE_KEYS.ONBOARDING_COMPLETED);
      showToast('info', 'Setup wizard will appear when you open the popup');
    } catch {
      showToast('error', 'Wizard reset failed.');
    }
  }

  return (
    <div class="flex flex-col gap-6">
      <SectionGroup title="About">
        <div class="flex flex-col gap-2">
          <h3 class="text-base font-semibold text-gray-900">QA Helper</h3>
          <p class="text-sm text-gray-600">
            Version: {version}
          </p>
          <p class="text-sm text-gray-500 mt-1">
            A bug reporting and data collection tool for manual testing.
          </p>
          <p class="text-sm text-gray-500 mt-1">
            Developer: QA Helper Team
          </p>
        </div>
      </SectionGroup>

      <SectionGroup title="License">
        <p class="text-sm text-gray-500">
          Status: Free (license will be added in Phase 2)
        </p>
      </SectionGroup>

      <SectionGroup title="Other">
        <button
          type="button"
          onClick={() => void handleResetOnboarding()}
          class="text-sm text-blue-600 hover:text-blue-700 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 rounded"
          aria-label="Reopen setup wizard"
        >
          Reopen setup wizard
        </button>
      </SectionGroup>
    </div>
  );
}
