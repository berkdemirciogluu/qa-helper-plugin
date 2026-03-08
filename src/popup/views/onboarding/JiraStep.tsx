import { useState } from 'preact/hooks';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { storageSet } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';
import type { JiraCredentials } from '@/lib/types';

const platformOptions = [
  { value: '', label: 'Seçiniz...' },
  { value: 'cloud', label: 'Jira Cloud' },
  { value: 'server', label: 'Jira Server / Data Center' },
];

export function JiraStep() {
  const [platform, setPlatform] = useState<JiraCredentials['platform']>('');
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');

  const urlPlaceholder =
    platform === 'cloud'
      ? 'https://domain.atlassian.net'
      : platform === 'server'
        ? 'https://jira.sirketiniz.com'
        : 'Jira URL';

  async function saveCredentials(overrides: Partial<JiraCredentials>) {
    const creds: JiraCredentials = { platform, url, token, ...overrides };
    await storageSet(STORAGE_KEYS.JIRA_CREDENTIALS, creds);
  }

  async function handlePlatformChange(value: string) {
    const p = value as JiraCredentials['platform'];
    setPlatform(p);
    await saveCredentials({ platform: p });
  }

  async function handleUrlChange(value: string) {
    setUrl(value);
    await saveCredentials({ url: value });
  }

  async function handleTokenChange(value: string) {
    setToken(value);
    await saveCredentials({ token: value });
  }

  return (
    <div class="flex flex-col gap-4">
      <p class="text-sm text-gray-500">
        İsteğe bağlı — Jira entegrasyonu zorunlu değil, dilediğinizde atlayabilirsiniz.
      </p>
      <Select
        label="Platform"
        htmlFor="jira-platform"
        options={platformOptions}
        value={platform}
        onChange={handlePlatformChange}
        aria-label="Jira platform seçimi"
      />
      <Input
        label="Jira URL"
        htmlFor="jira-url"
        value={url}
        onChange={handleUrlChange}
        placeholder={urlPlaceholder}
        aria-label="Jira URL adresi"
      />
      <div class="flex flex-col gap-1">
        <label htmlFor="jira-token" class="text-sm font-medium text-gray-700">
          API Token
        </label>
        <input
          id="jira-token"
          type="password"
          value={token}
          onInput={(e) =>
            void handleTokenChange((e.target as HTMLInputElement).value)
          }
          placeholder="API Token"
          aria-label="Jira API token"
          class="w-full rounded-md border border-gray-200 bg-white px-3 min-h-[44px] text-sm text-gray-700 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
        />
      </div>
      <div>
        <Button
          variant="secondary"
          size="md"
          disabled
          aria-label="Bağlantıyı test et"
          aria-describedby="jira-test-tooltip"
        >
          Bağlantıyı Test Et
        </Button>
        <span id="jira-test-tooltip" class="sr-only">
          Jira entegrasyonu yakında
        </span>
      </div>
    </div>
  );
}
