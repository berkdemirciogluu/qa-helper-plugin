import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';

import { SectionGroup } from '@/components/layout/SectionGroup';
import { Toggle } from '@/components/ui/Toggle';
import { storageGet, storageSet } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';
import type { SessionConfig } from '@/lib/types';

const defaultToggles: SessionConfig['toggles'] = {
  har: true,
  console: true,
  dom: true,
  localStorage: true,
  sessionStorage: true,
};

const toggles = signal<SessionConfig['toggles']>({ ...defaultToggles });
const isLoaded = signal(false);

interface ToggleItem {
  key: keyof SessionConfig['toggles'];
  label: string;
  description: string;
  id: string;
}

const toggleItems: ToggleItem[] = [
  { key: 'har', label: 'XHR/Fetch Recording', description: 'Records network requests (XHR and Fetch)', id: 'toggle-har' },
  { key: 'console', label: 'Console Logs', description: 'Records console log, warn and error messages', id: 'toggle-console' },
  { key: 'dom', label: 'DOM Snapshot', description: 'Captures the page DOM at bug report time', id: 'toggle-dom' },
  { key: 'localStorage', label: 'localStorage', description: 'Includes localStorage contents in bug reports', id: 'toggle-localstorage' },
  { key: 'sessionStorage', label: 'sessionStorage', description: 'Includes sessionStorage contents in bug reports', id: 'toggle-sessionstorage' },
];

export function GeneralSettingsPage() {
  useEffect(() => {
    toggles.value = { ...defaultToggles };
    isLoaded.value = false;
    loadToggles();
  }, []);

  if (!isLoaded.value) {
    return (
      <SectionGroup
        title="Data Sources"
        description="Data types to include in bug reports"
      >
        <p class="text-sm text-gray-400">Loading...</p>
      </SectionGroup>
    );
  }

  return (
    <SectionGroup
      title="Data Sources"
      description="Data types to include in bug reports"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {toggleItems.map((item) => (
          <div
            key={item.key}
            class="flex items-center justify-between gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3 hover:border-blue-200 transition-colors"
          >
            <div class="min-w-0">
              <label
                htmlFor={item.id}
                class="text-sm font-medium text-gray-800 cursor-pointer"
              >
                {item.label}
              </label>
              <p class="text-xs text-gray-400 mt-0.5">{item.description}</p>
            </div>
            <Toggle
              id={item.id}
              checked={toggles.value[item.key]}
              onChange={(checked) => handleToggleChange(item.key, checked)}
              label={item.label}
            />
          </div>
        ))}
      </div>
    </SectionGroup>
  );
}

async function loadToggles() {
  const result = await storageGet<SessionConfig>(STORAGE_KEYS.SESSION_CONFIG);
  if (result.success && result.data?.toggles) {
    toggles.value = { ...defaultToggles, ...result.data.toggles };
  }
  isLoaded.value = true;
}

async function handleToggleChange(key: keyof SessionConfig['toggles'], checked: boolean) {
  const previous = toggles.value;
  const updated = { ...previous, [key]: checked };
  toggles.value = updated;

  const currentConfig = await storageGet<SessionConfig>(STORAGE_KEYS.SESSION_CONFIG);
  const config: SessionConfig = currentConfig.success && currentConfig.data
    ? { ...currentConfig.data, toggles: updated }
    : { toggles: updated };

  const result = await storageSet(STORAGE_KEYS.SESSION_CONFIG, config);
  if (!result.success) {
    toggles.value = previous;
  }
}
