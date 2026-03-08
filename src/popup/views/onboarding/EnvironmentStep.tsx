import { useState } from 'preact/hooks';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { storageGet, storageSet } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';
import type { SessionConfig } from '@/lib/types';

const DEFAULT_TOGGLES: SessionConfig['toggles'] = {
  har: true,
  console: true,
  dom: true,
  localStorage: true,
  sessionStorage: true,
};

const environmentOptions = [
  { value: '', label: 'Seçiniz...' },
  { value: 'development', label: 'Development' },
  { value: 'staging', label: 'Staging' },
  { value: 'qa', label: 'QA' },
  { value: 'uat', label: 'UAT' },
  { value: 'production', label: 'Production' },
];

export function EnvironmentStep() {
  const [projectName, setProjectName] = useState('');
  const [environment, setEnvironment] = useState('');
  const [agileTeam, setAgileTeam] = useState('');

  async function writeToStorage(fields: {
    project: string;
    environment: string;
    agileTeam: string;
  }) {
    const result = await storageGet<SessionConfig>(STORAGE_KEYS.SESSION_CONFIG);
    const existing =
      result.success && result.data ? result.data : { toggles: DEFAULT_TOGGLES };
    const updated: SessionConfig = {
      ...existing,
      configFields: {
        testCycle: existing.configFields?.testCycle ?? '',
        ...fields,
      },
    };
    await storageSet(STORAGE_KEYS.SESSION_CONFIG, updated);
  }

  async function handleProjectChange(value: string) {
    setProjectName(value);
    await writeToStorage({ project: value, environment, agileTeam });
  }

  async function handleEnvironmentChange(value: string) {
    setEnvironment(value);
    await writeToStorage({ project: projectName, environment: value, agileTeam });
  }

  async function handleAgileTeamChange(value: string) {
    setAgileTeam(value);
    await writeToStorage({ project: projectName, environment, agileTeam: value });
  }

  return (
    <div class="flex flex-col gap-4">
      <p class="text-sm text-gray-500">
        İsteğe bağlı — tüm alanlar opsiyonel, dilediğinizde atlayabilirsiniz.
      </p>
      <Input
        label="Proje Adı"
        htmlFor="env-project"
        value={projectName}
        onChange={handleProjectChange}
        placeholder="e-commerce"
        aria-label="Proje adı"
      />
      <Select
        label="Ortam"
        htmlFor="env-environment"
        options={environmentOptions}
        value={environment}
        onChange={handleEnvironmentChange}
        aria-label="Test ortamı"
      />
      <Input
        label="Agile Takım"
        htmlFor="env-agile-team"
        value={agileTeam}
        onChange={handleAgileTeamChange}
        placeholder="Team Alpha"
        aria-label="Agile takım"
      />
    </div>
  );
}
