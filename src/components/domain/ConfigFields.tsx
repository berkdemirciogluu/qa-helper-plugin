import type { ConfigFields as ConfigFieldsType, SessionConfig } from '@/lib/types';
import { storageGet, storageSet } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';

interface ConfigFieldsProps {
  value: ConfigFieldsType;
  onChange: (updated: ConfigFieldsType) => void;
}

export function ConfigFields({ value, onChange }: ConfigFieldsProps) {
  async function handleChange(field: keyof ConfigFieldsType, fieldValue: string) {
    const updated: ConfigFieldsType = { ...value, [field]: fieldValue };
    onChange(updated);

    const existing = await storageGet<SessionConfig>(STORAGE_KEYS.SESSION_CONFIG);
    const config: SessionConfig =
      existing.success && existing.data
        ? { ...existing.data, configFields: updated }
        : { toggles: { har: true, console: true, dom: true, localStorage: true, sessionStorage: true }, configFields: updated };

    await storageSet(STORAGE_KEYS.SESSION_CONFIG, config);
  }

  return (
    <div class="flex flex-col gap-2">
      <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Konfigürasyon</p>

      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <label for="config-environment" class="text-xs text-gray-600 w-24 shrink-0">
            Environment
          </label>
          <select
            id="config-environment"
            value={value.environment}
            onChange={(e) => void handleChange('environment', (e.target as HTMLSelectElement).value)}
            class="flex-1 h-7 rounded border border-gray-300 px-2 text-xs text-gray-700 bg-white focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-1"
          >
            <option value="">—</option>
            <option value="staging">Staging</option>
            <option value="qa">QA</option>
            <option value="uat">UAT</option>
            <option value="production">Production</option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <label for="config-test-cycle" class="text-xs text-gray-600 w-24 shrink-0">
            Test Cycle
          </label>
          <input
            id="config-test-cycle"
            type="text"
            value={value.testCycle}
            onInput={(e) => void handleChange('testCycle', (e.target as HTMLInputElement).value)}
            placeholder="Sprint 1"
            class="flex-1 h-7 rounded border border-gray-300 px-2 text-xs text-gray-700 focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-1"
          />
        </div>

        <div class="flex items-center gap-2">
          <label for="config-agile-team" class="text-xs text-gray-600 w-24 shrink-0">
            Agile Team
          </label>
          <input
            id="config-agile-team"
            type="text"
            value={value.agileTeam}
            onInput={(e) => void handleChange('agileTeam', (e.target as HTMLInputElement).value)}
            placeholder="Team Alpha"
            class="flex-1 h-7 rounded border border-gray-300 px-2 text-xs text-gray-700 focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-1"
          />
        </div>

        <div class="flex items-center gap-2">
          <label for="config-project" class="text-xs text-gray-600 w-24 shrink-0">
            Proje
          </label>
          <input
            id="config-project"
            type="text"
            value={value.project}
            onInput={(e) => void handleChange('project', (e.target as HTMLInputElement).value)}
            placeholder="e-commerce"
            class="flex-1 h-7 rounded border border-gray-300 px-2 text-xs text-gray-700 focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-1"
          />
        </div>
      </div>
    </div>
  );
}
