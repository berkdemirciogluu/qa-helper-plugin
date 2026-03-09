import type { Result, JiraCredentials } from '@/lib/types';
import type {
  JiraIssueType,
  JiraFieldDefinition,
  JiraConfiguredField,
  JiraFieldConfigMap,
} from './jira-types';
import { jiraFetch } from './jira-client';
import { storageGet, storageSet } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';

/** Hariç tutulacak alanlar — exporter zaten bunları yönetiyor */
export const EXCLUDED_FIELD_KEYS = new Set([
  'summary',
  'description',
  'issuetype',
  'project',
  'attachment',
  'reporter',
]);

function getDiscoveryErrorMessage(status: number): string {
  if (status === 401) return 'Session expired. Reconnect to Jira.';
  if (status === 403) return 'No permissions to access field metadata.';
  if (status === 404) return 'Project not found or createmeta endpoint unavailable.';
  return 'Cannot reach Jira server.';
}

/** Proje için issue type listesi */
export async function getIssueTypesForProject(
  credentials: JiraCredentials,
  projectKey: string,
): Promise<Result<JiraIssueType[]>> {
  try {
    const version = credentials.platform === 'cloud' ? '3' : '2';
    const path = `/rest/api/${version}/issue/createmeta/${projectKey}/issuetypes`;
    const issueTypes: JiraIssueType[] = [];
    let startAt = 0;
    while (true) {
      const response = await jiraFetch(credentials, `${path}?startAt=${startAt}&maxResults=50`);
      if (!response.ok) {
        return { success: false, error: getDiscoveryErrorMessage(response.status) };
      }
      const data = (await response.json()) as {
        issueTypes: JiraIssueType[];
        total: number;
        maxResults: number;
      };
      issueTypes.push(...data.issueTypes);
      if (issueTypes.length >= data.total || data.maxResults <= 0) break;
      startAt += data.maxResults;
    }
    return { success: true, data: issueTypes };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[JiraFieldDiscovery] getIssueTypesForProject error:', msg);
    return { success: false, error: 'Cannot reach Jira server. Check your network connection.' };
  }
}

/** Proje+issueType için alan listesi */
export async function getFieldsForIssueType(
  credentials: JiraCredentials,
  projectKey: string,
  issueTypeId: string,
): Promise<Result<JiraFieldDefinition[]>> {
  try {
    const version = credentials.platform === 'cloud' ? '3' : '2';
    const path = `/rest/api/${version}/issue/createmeta/${projectKey}/issuetypes/${issueTypeId}`;
    const fields: JiraFieldDefinition[] = [];
    let startAt = 0;
    while (true) {
      const response = await jiraFetch(credentials, `${path}?startAt=${startAt}&maxResults=50`);
      if (!response.ok) {
        return { success: false, error: getDiscoveryErrorMessage(response.status) };
      }
      const data = (await response.json()) as {
        fields: JiraFieldDefinition[];
        total: number;
        maxResults: number;
      };
      fields.push(...data.fields);
      if (fields.length >= data.total || data.maxResults <= 0) break;
      startAt += data.maxResults;
    }
    const filtered = fields.filter((f) => !EXCLUDED_FIELD_KEYS.has(f.fieldId));
    return { success: true, data: filtered };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[JiraFieldDiscovery] getFieldsForIssueType error:', msg);
    return { success: false, error: 'Cannot reach Jira server. Check your network connection.' };
  }
}

/** Config key formatı */
export function buildConfigKey(projectKey: string, issueTypeId: string): string {
  return `${projectKey}_${issueTypeId}`;
}

/** Storage'dan field config yükle */
export async function loadFieldConfig(
  projectKey: string,
  issueTypeId: string,
): Promise<JiraConfiguredField[]> {
  const configKey = buildConfigKey(projectKey, issueTypeId);
  const result = await storageGet<JiraFieldConfigMap>(STORAGE_KEYS.JIRA_FIELD_CONFIG);
  if (!result.success || !result.data) return [];
  return result.data[configKey]?.fields ?? [];
}

/** Storage'a field config kaydet (diğer proje+issueType konfigürasyonlarını koru) */
export async function saveFieldConfig(
  projectKey: string,
  issueTypeId: string,
  fields: JiraConfiguredField[],
): Promise<void> {
  const configKey = buildConfigKey(projectKey, issueTypeId);
  const existing = await storageGet<JiraFieldConfigMap>(STORAGE_KEYS.JIRA_FIELD_CONFIG);
  const map: JiraFieldConfigMap =
    existing.success && existing.data ? existing.data : {};
  map[configKey] = { fields, lastFetched: Date.now() };
  await storageSet(STORAGE_KEYS.JIRA_FIELD_CONFIG, map);
}
