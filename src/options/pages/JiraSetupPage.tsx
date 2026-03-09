import { useState, useEffect } from 'preact/hooks';
import { CheckCircle, AlertCircle, Loader2, Unplug } from 'lucide-preact';

import { SectionGroup } from '@/components/layout/SectionGroup';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { storageGet, storageSet } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';
import { startOAuthFlow, validatePat } from '@/lib/jira/jira-auth';
import { testConnection, getProjects } from '@/lib/jira/jira-client';
import type { JiraCredentials } from '@/lib/types';
import type { JiraProject } from '@/lib/jira/jira-types';

type ConnectionStatus = 'idle' | 'loading' | 'success' | 'error';
type Platform = JiraCredentials['platform'];

export function JiraSetupPage() {
  const [credentials, setCredentials] = useState<JiraCredentials>({
    platform: '',
    url: '',
    token: '',
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    void loadCredentials();
  }, []);

  async function loadCredentials() {
    const result = await storageGet<JiraCredentials>(STORAGE_KEYS.JIRA_CREDENTIALS);
    if (result.success && result.data) {
      setCredentials(result.data);
      if (result.data.connected) {
        setConnectionStatus('success');
        setStatusMessage(`Connected — ${result.data.displayName}`);
        void loadProjects(result.data);
      }
    }
    setIsLoaded(true);
  }

  async function loadProjects(creds: JiraCredentials) {
    setProjectsLoading(true);
    const result = await getProjects(creds);
    if (result.success) {
      setProjects(result.data);
    }
    setProjectsLoading(false);
  }

  function handlePlatformChange(platform: Platform) {
    setCredentials((prev) => ({ ...prev, platform }));
    setConnectionStatus('idle');
    setStatusMessage('');
  }

  function handleUrlChange(url: string) {
    setCredentials((prev) => ({ ...prev, url }));
  }

  function handleTokenChange(token: string) {
    setCredentials((prev) => ({ ...prev, token }));
  }

  async function handleOAuthConnect() {
    setConnectionStatus('loading');
    setStatusMessage('');

    const result = await startOAuthFlow();
    if (!result.success) {
      setConnectionStatus('error');
      setStatusMessage(result.error);
      return;
    }

    const newCreds: JiraCredentials = {
      platform: 'cloud',
      url: `https://${result.data.siteName}`,
      token: result.data.accessToken,
      refreshToken: result.data.refreshToken,
      accessTokenExpiresAt: result.data.expiresAt,
      cloudId: result.data.cloudId,
      siteName: result.data.siteName,
    };

    // Bağlantı testi
    const testResult = await testConnection(newCreds);
    if (!testResult.success) {
      setConnectionStatus('error');
      setStatusMessage(testResult.error);
      return;
    }

    const finalCreds: JiraCredentials = {
      ...newCreds,
      displayName: testResult.data.displayName,
      connected: true,
    };

    await storageSet(STORAGE_KEYS.JIRA_CREDENTIALS, finalCreds);
    setCredentials(finalCreds);
    setConnectionStatus('success');
    setStatusMessage(`Connected — ${testResult.data.displayName}`);
    void loadProjects(finalCreds);
  }

  async function handleTestConnection() {
    if (!credentials.url || !credentials.token) return;

    // PAT doğrulama
    const patResult = validatePat(credentials.token);
    if (!patResult.success) {
      setConnectionStatus('error');
      setStatusMessage(patResult.error);
      return;
    }

    setConnectionStatus('loading');
    setStatusMessage('');

    // Server/DC runtime permission isteği
    try {
      const granted = await chrome.permissions.request({
        origins: [`${credentials.url}/*`],
      });
      if (!granted) {
        setConnectionStatus('error');
        setStatusMessage('Permission denied. Permission is required to connect to the Jira server.');
        return;
      }
    } catch {
      // permissions API mevcut değilse devam et
    }

    const creds: JiraCredentials = {
      ...credentials,
      token: patResult.data,
    };

    const result = await testConnection(creds);
    if (!result.success) {
      setConnectionStatus('error');
      setStatusMessage(result.error);
      return;
    }

    const finalCreds: JiraCredentials = {
      ...creds,
      displayName: result.data.displayName,
      connected: true,
    };

    await storageSet(STORAGE_KEYS.JIRA_CREDENTIALS, finalCreds);
    setCredentials(finalCreds);
    setConnectionStatus('success');
    setStatusMessage(`Connected — ${result.data.displayName}`);
    void loadProjects(finalCreds);
  }

  async function handleDisconnect() {
    const cleared: JiraCredentials = { platform: '', url: '', token: '' };
    await storageSet(STORAGE_KEYS.JIRA_CREDENTIALS, cleared);
    setCredentials(cleared);
    setConnectionStatus('idle');
    setStatusMessage('');
    setProjects([]);
  }

  async function handleProjectChange(projectKey: string) {
    const updated: JiraCredentials = { ...credentials, defaultProjectKey: projectKey };
    setCredentials(updated);
    await storageSet(STORAGE_KEYS.JIRA_CREDENTIALS, updated);
  }

  if (!isLoaded) {
    return (
      <SectionGroup title="Jira Integration">
        <p class="text-sm text-gray-400">Loading...</p>
      </SectionGroup>
    );
  }

  const isConnected = credentials.connected && connectionStatus !== 'error';

  return (
    <div class="flex flex-col gap-6">
      <SectionGroup
        title="Jira Integration"
        description="Send your bug reports directly to Jira."
      >
        {/* Connection status announcement */}
        <div aria-live="polite" class="sr-only">
          {connectionStatus === 'success' && statusMessage}
          {connectionStatus === 'error' && statusMessage}
        </div>

        {isConnected ? (
          <ConnectedView
            credentials={credentials}
            projects={projects}
            projectsLoading={projectsLoading}
            onProjectChange={handleProjectChange}
            onTestConnection={
              credentials.platform === 'server' ? handleTestConnection : handleOAuthConnect
            }
            connectionStatus={connectionStatus}
            statusMessage={statusMessage}
            onDisconnect={handleDisconnect}
          />
        ) : (
          <SetupView
            credentials={credentials}
            connectionStatus={connectionStatus}
            statusMessage={statusMessage}
            onPlatformChange={handlePlatformChange}
            onUrlChange={handleUrlChange}
            onTokenChange={handleTokenChange}
            onOAuthConnect={handleOAuthConnect}
            onTestConnection={handleTestConnection}
          />
        )}
      </SectionGroup>
    </div>
  );
}

interface ConnectedViewProps {
  credentials: JiraCredentials;
  projects: JiraProject[];
  projectsLoading: boolean;
  onProjectChange: (key: string) => void;
  onTestConnection: () => void;
  connectionStatus: ConnectionStatus;
  statusMessage: string;
  onDisconnect: () => void;
}

function ConnectedView({
  credentials,
  projects,
  projectsLoading,
  onProjectChange,
  onTestConnection,
  connectionStatus,
  statusMessage,
  onDisconnect,
}: ConnectedViewProps) {
  const siteInfo =
    credentials.platform === 'cloud' && credentials.siteName
      ? ` (${credentials.siteName})`
      : credentials.url
        ? ` (${credentials.url})`
        : '';

  const projectOptions = [
    { value: '', label: projectsLoading ? 'Loading...' : 'Select project...' },
    ...projects.map((p) => ({ value: p.key, label: `${p.key} - ${p.name}` })),
  ];

  return (
    <div class="flex flex-col gap-4">
      <div aria-live="polite" class="flex items-center gap-2 text-sm">
        <CheckCircle size={18} class="text-green-600 shrink-0" />
        <span class="text-green-700 font-medium">
          Connected — {credentials.displayName}{siteInfo}
        </span>
      </div>

      <div class="flex flex-col gap-3">
        <p class="text-sm font-medium text-gray-700">Default Project</p>
        <Select
          htmlFor="jira-default-project"
          options={projectOptions}
          value={credentials.defaultProjectKey ?? ''}
          onChange={onProjectChange}
          disabled={projectsLoading}
          aria-label="Default Jira project"
        />
      </div>

      {/* Status message after re-test */}
      {connectionStatus === 'loading' && (
        <div class="flex items-center gap-2 text-sm text-gray-500" aria-busy="true">
          <Loader2 size={16} class="animate-spin" />
          <span>Testing...</span>
        </div>
      )}
      {connectionStatus === 'error' && statusMessage && (
        <div role="alert" class="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle size={16} class="shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div class="flex gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={onTestConnection}
          loading={connectionStatus === 'loading'}
          aria-label="Test connection"
        >
          Test Connection
        </Button>
        <Button
          variant="danger"
          size="md"
          onClick={onDisconnect}
          iconLeft={<Unplug size={14} />}
          aria-label="Disconnect Jira"
        >
          Disconnect
        </Button>
      </div>
    </div>
  );
}

interface SetupViewProps {
  credentials: JiraCredentials;
  connectionStatus: ConnectionStatus;
  statusMessage: string;
  onPlatformChange: (platform: Platform) => void;
  onUrlChange: (url: string) => void;
  onTokenChange: (token: string) => void;
  onOAuthConnect: () => void;
  onTestConnection: () => void;
}

function SetupView({
  credentials,
  connectionStatus,
  statusMessage,
  onPlatformChange,
  onUrlChange,
  onTokenChange,
  onOAuthConnect,
  onTestConnection,
}: SetupViewProps) {
  return (
    <div class="flex flex-col gap-4">
      <p class="text-sm text-gray-500">
        Jira is not configured yet. Send your bug reports directly to Jira.
      </p>

      {/* Platform selection */}
      <div>
        <p class="text-sm font-medium text-gray-700 mb-2">Select platform</p>
        <div role="radiogroup" aria-label="Jira platform selection" class="flex gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="jira-platform"
              value="cloud"
              checked={credentials.platform === 'cloud'}
              onChange={() => onPlatformChange('cloud')}
              aria-label="Jira Cloud"
              class="w-4 h-4 text-blue-600"
            />
            <span class="text-sm text-gray-700">Jira Cloud</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="jira-platform"
              value="server"
              checked={credentials.platform === 'server'}
              onChange={() => onPlatformChange('server')}
              aria-label="Jira Server / Data Center"
              class="w-4 h-4 text-blue-600"
            />
            <span class="text-sm text-gray-700">Jira Server / Data Center</span>
          </label>
        </div>
      </div>

      {/* Cloud: OAuth button */}
      {credentials.platform === 'cloud' && (
        <div class="flex flex-col gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={onOAuthConnect}
            loading={connectionStatus === 'loading'}
            aria-label="Connect to Jira Cloud"
          >
            Connect to Jira Cloud
          </Button>
        </div>
      )}

      {/* Server/DC: URL + PAT form */}
      {credentials.platform === 'server' && (
        <div class="flex flex-col gap-3">
          <Input
            label="Jira URL"
            htmlFor="jira-url"
            value={credentials.url}
            onChange={onUrlChange}
            placeholder="https://jira.sirketiniz.com"
            type="url"
            aria-label="Jira URL"
          />
          {credentials.url.startsWith('http://') && (
            <p class="text-xs text-amber-600">
              HTTP connection is not secure — API token is sent as plain text. Use HTTPS if possible.
            </p>
          )}
          <Input
            label="API Token"
            htmlFor="jira-token"
            type="password"
            value={credentials.token}
            onChange={onTokenChange}
            placeholder="Personal Access Token"
            aria-label="API Token"
          />
          <Button
            variant="secondary"
            size="md"
            onClick={onTestConnection}
            loading={connectionStatus === 'loading'}
            disabled={!credentials.url || !credentials.token}
            aria-label="Test connection"
          >
            Test Connection
          </Button>
        </div>
      )}

      {/* Status messages */}
      {connectionStatus === 'loading' && (
        <div class="flex items-center gap-2 text-sm text-gray-500" aria-busy="true" aria-label="Testing">
          <Loader2 size={16} class="animate-spin" />
          <span>Testing...</span>
        </div>
      )}
      {connectionStatus === 'success' && statusMessage && (
        <div aria-live="polite" class="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle size={16} class="shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
      {connectionStatus === 'error' && statusMessage && (
        <div role="alert" aria-live="assertive" class="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle size={16} class="shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
}
