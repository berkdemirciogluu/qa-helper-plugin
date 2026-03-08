import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';

import { SectionGroup } from '@/components/layout/SectionGroup';
import { FormRow } from '@/components/layout/FormRow';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { showToast } from '@/components/ui/Toast';
import { storageGet, storageSet } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';
import type { SessionConfig, ConfigFields } from '@/lib/types';

const environmentOptions = [
  { value: '', label: 'Seçiniz...' },
  { value: 'development', label: 'Development' },
  { value: 'staging', label: 'Staging' },
  { value: 'qa', label: 'QA' },
  { value: 'uat', label: 'UAT' },
  { value: 'production', label: 'Production' },
];

const defaultConfigFields: ConfigFields = {
  environment: '',
  testCycle: '',
  agileTeam: '',
  project: '',
};

const configFields = signal<ConfigFields>({ ...defaultConfigFields });
const isLoading = signal(true);

export function ConfigurationPage() {
  useEffect(() => {
    configFields.value = { ...defaultConfigFields };
    isLoading.value = true;
    loadConfigFields();
  }, []);

  if (isLoading.value) {
    return (
      <SectionGroup
        title="Konfigürasyon Alanları"
        description="Bug raporlarına otomatik eklenen bağlam bilgileri. Bir kez ayarlayın, her raporda kullanılsın."
      >
        <p class="text-sm text-gray-400">Yükleniyor...</p>
      </SectionGroup>
    );
  }

  return (
    <SectionGroup
      title="Konfigürasyon Alanları"
      description="Bug raporlarına otomatik eklenen bağlam bilgileri. Bir kez ayarlayın, her raporda kullanılsın."
    >
      <FormRow label="Ortam" htmlFor="config-environment">
        <Select
          htmlFor="config-environment"
          options={environmentOptions}
          value={configFields.value.environment}
          onChange={(value) => void handleFieldChange('environment', value)}
        />
      </FormRow>

      <FormRow label="Test Döngüsü" htmlFor="config-test-cycle">
        <Input
          htmlFor="config-test-cycle"
          value={configFields.value.testCycle}
          onChange={(value) => void handleFieldChange('testCycle', value)}
          placeholder="Sprint 1"
        />
      </FormRow>

      <FormRow label="Agile Takım" htmlFor="config-agile-team">
        <Input
          htmlFor="config-agile-team"
          value={configFields.value.agileTeam}
          onChange={(value) => void handleFieldChange('agileTeam', value)}
          placeholder="Team Alpha"
        />
      </FormRow>

      <FormRow label="Proje" htmlFor="config-project">
        <Input
          htmlFor="config-project"
          value={configFields.value.project}
          onChange={(value) => void handleFieldChange('project', value)}
          placeholder="e-commerce"
        />
      </FormRow>
    </SectionGroup>
  );
}

async function loadConfigFields() {
  const result = await storageGet<SessionConfig>(STORAGE_KEYS.SESSION_CONFIG);
  if (result.success && result.data?.configFields) {
    configFields.value = { ...defaultConfigFields, ...result.data.configFields };
  }
  isLoading.value = false;
}

async function handleFieldChange(field: keyof ConfigFields, value: string) {
  const updated = { ...configFields.value, [field]: value };
  configFields.value = updated;

  const existing = await storageGet<SessionConfig>(STORAGE_KEYS.SESSION_CONFIG);
  const config: SessionConfig =
    existing.success && existing.data
      ? { ...existing.data, configFields: updated }
      : {
          toggles: { har: true, console: true, dom: true, localStorage: true, sessionStorage: true },
          configFields: updated,
        };

  const saveResult = await storageSet(STORAGE_KEYS.SESSION_CONFIG, config);
  if (!saveResult.success) {
    showToast('error', 'Ayarlar kaydedilemedi');
  }
}
