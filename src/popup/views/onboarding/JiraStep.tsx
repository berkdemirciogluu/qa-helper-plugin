import { useState, useRef } from 'preact/hooks';
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
  const writeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const urlPlaceholder =
    platform === 'cloud'
      ? 'https://domain.atlassian.net'
      : platform === 'server'
        ? 'https://jira.sirketiniz.com'
        : 'Jira URL';

  async function saveCredentials(overrides: Partial<JiraCredentials>) {
    try {
      const creds: JiraCredentials = { platform, url, token, ...overrides };
      await storageSet(STORAGE_KEYS.JIRA_CREDENTIALS, creds);
    } catch {
      // Storage hatası — opsiyonel alan, sessizce devam et
    }
  }

  function debouncedSave(overrides: Partial<JiraCredentials>) {
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    writeTimerRef.current = setTimeout(() => void saveCredentials(overrides), 300);
  }

  function handlePlatformChange(value: string) {
    const p = value as JiraCredentials['platform'];
    setPlatform(p);
    // Select değişikliği anında kaydedilir (debounce yok)
    void saveCredentials({ platform: p });
  }

  function handleUrlChange(value: string) {
    setUrl(value);
    debouncedSave({ url: value });
  }

  function handleTokenChange(value: string) {
    setToken(value);
    debouncedSave({ token: value });
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
      <Input
        label="API Token"
        htmlFor="jira-token"
        type="password"
        value={token}
        onChange={handleTokenChange}
        placeholder="API Token"
        aria-label="Jira API token"
      />
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
