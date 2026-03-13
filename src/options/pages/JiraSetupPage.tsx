import { useState, useEffect } from 'preact/hooks';
import { CheckCircle, AlertCircle, Loader2, Unplug, RefreshCw } from 'lucide-preact';

import { SectionGroup } from '@/components/layout/SectionGroup';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { storageGet, storageSet } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';
import { startOAuthFlow, validatePat } from '@/lib/jira/jira-auth';
import { testConnection, getProjects } from '@/lib/jira/jira-client';
import {
  getIssueTypesForProject,
  getFieldsForIssueType,
  loadFieldConfig,
  saveFieldConfig,
} from '@/lib/jira/jira-field-discovery';
import type { JiraCredentials } from '@/lib/types';
import type { JiraProject, JiraIssueType, JiraConfiguredField } from '@/lib/jira/jira-types';

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
  const [issueTypes, setIssueTypes] = useState<JiraIssueType[]>([]);
  const [issueTypesLoading, setIssueTypesLoading] = useState(false);
  const [configuredFields, setConfiguredFields] = useState<JiraConfiguredField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldsError, setFieldsError] = useState('');
  const [issueTypesError, setIssueTypesError] = useState('');

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
        if (result.data.defaultProjectKey) {
          void loadIssueTypes(result.data, result.data.defaultProjectKey);
          if (result.data.defaultIssueTypeId) {
            void loadFields(result.data, result.data.defaultProjectKey, result.data.defaultIssueTypeId);
          }
        }
      }
    }
    setIsLoaded(true);
  }

  async function loadIssueTypes(creds: JiraCredentials, projectKey: string) {
    setIssueTypesLoading(true);
    setIssueTypesError('');
    const result = await getIssueTypesForProject(creds, projectKey);
    if (result.success) {
      setIssueTypes(result.data);
    } else {
      setIssueTypesError(result.error);
    }
    setIssueTypesLoading(false);
  }

  async function loadFields(creds: JiraCredentials, projectKey: string, issueTypeId: string) {
    setFieldsLoading(true);
    setFieldsError('');

    const [fieldsResult, savedConfig] = await Promise.all([
      getFieldsForIssueType(creds, projectKey, issueTypeId),
      loadFieldConfig(projectKey, issueTypeId),
    ]);

    if (!fieldsResult.success) {
      setFieldsError(fieldsResult.error);
      setFieldsLoading(false);
      return;
    }

    const merged: JiraConfiguredField[] = fieldsResult.data.map((def) => {
      const saved = savedConfig.find((s) => s.fieldId === def.fieldId);
      return {
        fieldId: def.fieldId,
        name: def.name,
        required: def.required,
        alwaysFill: saved?.alwaysFill ?? def.required,
        defaultValue: saved?.defaultValue ?? '',
        schemaType: def.schema.type,
        schemaItems: def.schema.items,
        allowedValues: def.allowedValues,
      };
    });
    setConfiguredFields(merged);
    setFieldsLoading(false);
  }

  async function handleIssueTypeChange(issueTypeId: string) {
    const selected = issueTypes.find((t) => t.id === issueTypeId);
    const updated: JiraCredentials = {
      ...credentials,
      defaultIssueTypeId: issueTypeId,
      defaultIssueTypeName: selected?.name,
    };
    setCredentials(updated);
    await storageSet(STORAGE_KEYS.JIRA_CREDENTIALS, updated);
    if (issueTypeId && credentials.defaultProjectKey) {
      void loadFields(updated, credentials.defaultProjectKey, issueTypeId);
    }
  }

  async function handleFieldToggle(fieldId: string, alwaysFill: boolean) {
    const updated = configuredFields.map((f) =>
      f.fieldId === fieldId ? { ...f, alwaysFill } : f,
    );
    setConfiguredFields(updated);
    if (credentials.defaultProjectKey && credentials.defaultIssueTypeId) {
      await saveFieldConfig(credentials.defaultProjectKey, credentials.defaultIssueTypeId, updated);
    }
  }

  async function handleFieldDefaultValue(fieldId: string, defaultValue: string) {
    const updated = configuredFields.map((f) =>
      f.fieldId === fieldId ? { ...f, defaultValue } : f,
    );
    setConfiguredFields(updated);
    if (credentials.defaultProjectKey && credentials.defaultIssueTypeId) {
      await saveFieldConfig(credentials.defaultProjectKey, credentials.defaultIssueTypeId, updated);
    }
  }

  async function handleRefreshFields() {
    if (credentials.defaultProjectKey && credentials.defaultIssueTypeId) {
      await loadFields(credentials, credentials.defaultProjectKey, credentials.defaultIssueTypeId);
    }
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
    const updated: JiraCredentials = {
      ...credentials,
      defaultProjectKey: projectKey,
      defaultIssueTypeId: undefined,
      defaultIssueTypeName: undefined,
    };
    setCredentials(updated);
    await storageSet(STORAGE_KEYS.JIRA_CREDENTIALS, updated);
    setConfiguredFields([]);
    setIssueTypes([]);
    if (projectKey) {
      void loadIssueTypes(updated, projectKey);
    }
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
            issueTypes={issueTypes}
            issueTypesLoading={issueTypesLoading}
            onIssueTypeChange={handleIssueTypeChange}
            configuredFields={configuredFields}
            fieldsLoading={fieldsLoading}
            fieldsError={fieldsError}
            onFieldToggle={handleFieldToggle}
            onFieldDefaultValue={handleFieldDefaultValue}
            onRefreshFields={handleRefreshFields}
            issueTypesError={issueTypesError}
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
  issueTypes: JiraIssueType[];
  issueTypesLoading: boolean;
  onIssueTypeChange: (id: string) => void;
  configuredFields: JiraConfiguredField[];
  fieldsLoading: boolean;
  fieldsError: string;
  onFieldToggle: (fieldId: string, alwaysFill: boolean) => void;
  onFieldDefaultValue: (fieldId: string, value: string) => void;
  onRefreshFields: () => void;
  issueTypesError: string;
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
  issueTypes,
  issueTypesLoading,
  onIssueTypeChange,
  configuredFields,
  fieldsLoading,
  fieldsError,
  onFieldToggle,
  onFieldDefaultValue,
  onRefreshFields,
  issueTypesError,
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

  const issueTypeOptions = [
    { value: '', label: issueTypesLoading ? 'Loading...' : 'Select issue type...' },
    ...issueTypes.map((t) => ({ value: t.id, label: t.name })),
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

      {/* Field Configuration — issue type + alan konfigürasyonu */}
      {credentials.defaultProjectKey && (
        <div class="flex flex-col gap-3 border-t border-gray-100 pt-4">
          <p class="text-sm font-medium text-gray-700">Field Configuration</p>

          <div class="flex items-center gap-2">
            <div class="flex-1">
              <Select
                htmlFor="jira-issue-type"
                options={issueTypeOptions}
                value={credentials.defaultIssueTypeId ?? ''}
                onChange={onIssueTypeChange}
                disabled={issueTypesLoading}
                aria-label="Issue type"
              />
            </div>
            {credentials.defaultIssueTypeId && (
              <Button
                variant="ghost"
                size="md"
                onClick={() => void onRefreshFields()}
                loading={fieldsLoading}
                aria-label="Refresh fields"
                title="Refresh Fields"
              >
                <RefreshCw size={14} />
              </Button>
            )}
          </div>

          {issueTypesError && (
            <div role="alert" class="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle size={14} class="shrink-0" />
              <span>{issueTypesError}</span>
            </div>
          )}

          {fieldsLoading && (
            <div class="flex items-center gap-2 text-sm text-gray-400" aria-busy="true" aria-label="Loading fields">
              <Loader2 size={14} class="animate-spin" />
              <span>Loading fields...</span>
            </div>
          )}

          {fieldsError && (
            <div role="alert" class="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle size={14} class="shrink-0" />
              <span>{fieldsError}</span>
            </div>
          )}

          {!fieldsLoading && !fieldsError && configuredFields.length > 0 && (
            <div class="flex flex-col gap-2 rounded-md border border-gray-200 p-3">
              {configuredFields.map((field) => {
                const showInput = field.required || field.alwaysFill;
                return (
                  <div key={field.fieldId} class="flex flex-col gap-1.5">
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="text-sm text-gray-700 truncate">{field.name}</span>
                        <span class="text-[10px] text-gray-400 shrink-0">[{field.schemaType}]</span>
                        {field.required && (
                          <span
                            class="text-[10px] font-medium text-red-600 bg-red-50 px-1 rounded shrink-0"
                            aria-label="Required field"
                          >
                            Required
                          </span>
                        )}
                      </div>
                      {!field.required && (
                        <label class="flex items-center gap-1.5 shrink-0">
                          <input
                            type="checkbox"
                            checked={field.alwaysFill}
                            onChange={(e) =>
                              void onFieldToggle(field.fieldId, (e.target as HTMLInputElement).checked)
                            }
                            aria-label={`${field.name} always fill`}
                            class="rounded border-gray-300"
                          />
                          <span class="text-xs text-gray-500">Always fill</span>
                        </label>
                      )}
                    </div>
                    {showInput && (
                      field.allowedValues && field.allowedValues.length > 0 ? (
                        <Select
                          htmlFor={`field-${field.fieldId}`}
                          options={[
                            { value: '', label: 'Select default...' },
                            ...field.allowedValues
                              .filter((v) => !v.disabled)
                              .map((v) => ({ value: v.id, label: v.value ?? v.name ?? v.id })),
                          ]}
                          value={field.defaultValue}
                          onChange={(v) => void onFieldDefaultValue(field.fieldId, v)}
                          aria-label={`${field.name} default value`}
                        />
                      ) : (
                        <Input
                          htmlFor={`field-${field.fieldId}`}
                          value={field.defaultValue}
                          onChange={(v) => void onFieldDefaultValue(field.fieldId, v)}
                          placeholder="Default value..."
                          aria-label={`${field.name} default value`}
                        />
                      )
                    )}
                  </div>
                );
              })}
              <p class="text-xs text-gray-400 mt-1">(Changes are saved automatically)</p>
            </div>
          )}
        </div>
      )}

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
        <div role="radiogroup" aria-label="Jira platform selection" class="grid grid-cols-2 gap-3 max-w-md">
          <label
            class={[
              'flex items-center gap-2 cursor-pointer rounded-lg border px-4 py-3 transition-colors',
              credentials.platform === 'cloud'
                ? 'border-blue-400 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
            ].join(' ')}
          >
            <input
              type="radio"
              name="jira-platform"
              value="cloud"
              checked={credentials.platform === 'cloud'}
              onChange={() => onPlatformChange('cloud')}
              aria-label="Jira Cloud"
              class="w-4 h-4 text-blue-600"
            />
            <span class="text-sm font-medium">Jira Cloud</span>
          </label>
          <label
            class={[
              'flex items-center gap-2 cursor-pointer rounded-lg border px-4 py-3 transition-colors',
              credentials.platform === 'server'
                ? 'border-blue-400 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
            ].join(' ')}
          >
            <input
              type="radio"
              name="jira-platform"
              value="server"
              checked={credentials.platform === 'server'}
              onChange={() => onPlatformChange('server')}
              aria-label="Jira Server / Data Center"
              class="w-4 h-4 text-blue-600"
            />
            <span class="text-sm font-medium">Server / DC</span>
          </label>
        </div>
      </div>

      {/* Cloud: OAuth button */}
      {credentials.platform === 'cloud' && (
        <div>
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
        <div class="flex flex-col gap-3 max-w-md">
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
