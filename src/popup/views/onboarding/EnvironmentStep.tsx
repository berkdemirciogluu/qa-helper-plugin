import { useState, useRef } from 'preact/hooks';
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
  { value: '', label: 'Select...' },
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
  const writeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  async function writeToStorage(fields: {
    project: string;
    environment: string;
    agileTeam: string;
  }) {
    try {
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
    } catch {
      // Storage hatası — opsiyonel alan, sessizce devam et
    }
  }

  function debouncedWrite(fields: {
    project: string;
    environment: string;
    agileTeam: string;
  }) {
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    writeTimerRef.current = setTimeout(() => void writeToStorage(fields), 300);
  }

  function handleProjectChange(value: string) {
    setProjectName(value);
    debouncedWrite({ project: value, environment, agileTeam });
  }

  function handleEnvironmentChange(value: string) {
    setEnvironment(value);
    // Select değişikliği anında kaydedilir (debounce yok)
    void writeToStorage({ project: projectName, environment: value, agileTeam });
  }

  function handleAgileTeamChange(value: string) {
    setAgileTeam(value);
    debouncedWrite({ project: projectName, environment, agileTeam: value });
  }

  return (
    <div class="flex flex-col gap-4">
      <p class="text-sm text-gray-500">
        Optional — all fields are optional, you can skip this anytime.
      </p>
      <Input
        label="Project Name"
        htmlFor="env-project"
        value={projectName}
        onChange={handleProjectChange}
        placeholder="e-commerce"
        aria-label="Project name"
      />
      <Select
        label="Environment"
        htmlFor="env-environment"
        options={environmentOptions}
        value={environment}
        onChange={handleEnvironmentChange}
        aria-label="Test environment"
      />
      <Input
        label="Agile Team"
        htmlFor="env-agile-team"
        value={agileTeam}
        onChange={handleAgileTeamChange}
        placeholder="Team Alpha"
        aria-label="Agile team"
      />
    </div>
  );
}
