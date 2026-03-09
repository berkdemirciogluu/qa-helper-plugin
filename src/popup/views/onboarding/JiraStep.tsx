import { useState, useRef } from 'preact/hooks';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { storageSet } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';
import { testConnection } from '@/lib/jira/jira-client';
import type { JiraCredentials } from '@/lib/types';

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

const platformOptions = [
  { value: '', label: 'Select...' },
  { value: 'cloud', label: 'Jira Cloud' },
  { value: 'server', label: 'Jira Server / Data Center' },
];

export function JiraStep() {
  const [platform, setPlatform] = useState<JiraCredentials['platform']>('');
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');
  const writeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const urlPlaceholder =
    platform === 'cloud'
      ? 'https://domain.atlassian.net'
      : platform === 'server'
        ? 'https://jira.yourcompany.com'
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
    setTestStatus('idle');
    setTestMessage('');
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

  async function handleTestConnection() {
    if (!url || !token) return;
    setTestStatus('loading');
    setTestMessage('');

    const creds: JiraCredentials = { platform, url, token };
    const result = await testConnection(creds);
    if (result.success) {
      setTestStatus('success');
      setTestMessage(`Connected — ${result.data.displayName}`);
      await saveCredentials({ displayName: result.data.displayName, connected: true });
    } else {
      setTestStatus('error');
      setTestMessage(result.error);
    }
  }

  const isServerWithCredentials = platform === 'server' && url && token;

  return (
    <div class="flex flex-col gap-4">
      <p class="text-sm text-gray-500">
        Optional — Jira integration is not required, you can skip this anytime.
      </p>
      <Select
        label="Platform"
        htmlFor="jira-platform"
        options={platformOptions}
        value={platform}
        onChange={handlePlatformChange}
        aria-label="Jira platform selection"
      />
      {platform === 'cloud' && (
        <p class="text-xs text-gray-400">Use the Settings page to connect to Jira Cloud.</p>
      )}
      {platform === 'server' && (
        <>
          <Input
            label="Jira URL"
            htmlFor="jira-url"
            value={url}
            onChange={handleUrlChange}
            placeholder={urlPlaceholder}
            aria-label="Jira URL address"
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
              disabled={!isServerWithCredentials}
              loading={testStatus === 'loading'}
              onClick={handleTestConnection}
              aria-label="Test connection"
            >
              Test Connection
            </Button>
          </div>
        </>
      )}
      {testStatus === 'success' && testMessage && (
        <p class="text-xs text-green-600" aria-live="polite">
          {testMessage}
        </p>
      )}
      {testStatus === 'error' && testMessage && (
        <p class="text-xs text-red-600" role="alert">
          {testMessage}
        </p>
      )}
    </div>
  );
}
