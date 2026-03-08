import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';

import { SectionGroup } from '@/components/layout/SectionGroup';
import { FormRow } from '@/components/layout/FormRow';
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
  { key: 'har', label: 'XHR/Fetch Kaydı', description: 'Ağ isteklerini (XHR ve Fetch) kaydeder', id: 'toggle-har' },
  { key: 'console', label: 'Console Logları', description: 'Console log, warn ve error mesajlarını kaydeder', id: 'toggle-console' },
  { key: 'dom', label: 'DOM Snapshot', description: 'Bug raporlama anında sayfanın DOM\'unu yakalar', id: 'toggle-dom' },
  { key: 'localStorage', label: 'localStorage', description: 'localStorage içeriğini bug raporuna dahil eder', id: 'toggle-localstorage' },
  { key: 'sessionStorage', label: 'sessionStorage', description: 'sessionStorage içeriğini bug raporuna dahil eder', id: 'toggle-sessionstorage' },
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
        title="Veri Kaynakları"
        description="Bug raporlarına dahil edilecek veri türleri"
      >
        <p class="text-sm text-gray-400">Yükleniyor...</p>
      </SectionGroup>
    );
  }

  return (
    <SectionGroup
      title="Veri Kaynakları"
      description="Bug raporlarına dahil edilecek veri türleri"
    >
      {toggleItems.map((item) => (
        <FormRow
          key={item.key}
          label={item.label}
          htmlFor={item.id}
          description={item.description}
        >
          <Toggle
            id={item.id}
            checked={toggles.value[item.key]}
            onChange={(checked) => handleToggleChange(item.key, checked)}
            label={item.label}
          />
        </FormRow>
      ))}
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
