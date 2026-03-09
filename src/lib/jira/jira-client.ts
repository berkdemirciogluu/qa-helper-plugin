import type { Result, JiraCredentials } from '@/lib/types';
import type {
  JiraUser,
  JiraProject,
  JiraApiVersion,
  JiraIssueCreateRequest,
  JiraIssueCreateResponse,
  JiraAttachmentResponse,
  JiraErrorResponse,
} from './jira-types';
import { refreshAccessToken } from './jira-auth';
import { storageGet, storageSet } from '@/lib/storage';
import { STORAGE_KEYS, JIRA_CLOUD_API_BASE } from '@/lib/constants';

export { getAccessibleResources } from './jira-auth';

/** Cloud vs Server API versiyon seçimi */
function getApiVersion(credentials: JiraCredentials): JiraApiVersion {
  return credentials.platform === 'cloud' ? '3' : '2';
}

/** API base URL oluşturma */
export function getApiBaseUrl(credentials: JiraCredentials): string {
  if (credentials.platform === 'cloud') {
    return `${JIRA_CLOUD_API_BASE}/${credentials.cloudId}`;
  }
  return credentials.url;
}

/** Authorization header oluşturma */
export function getAuthHeaders(credentials: JiraCredentials): Record<string, string> {
  return {
    Authorization: `Bearer ${credentials.token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

/** Hata mesajı oluşturma */
function getErrorMessage(status: number, credentials: JiraCredentials): string {
  if (status === 401) {
    return credentials.platform === 'cloud'
      ? 'Session expired. Please reconnect.'
      : 'API token is invalid. You can generate a new token from your Jira profile.';
  }
  if (status === 403) {
    return 'Access denied. Check your Jira permissions.';
  }
  if (status === 404) {
    return 'Cannot reach Jira server. Check the URL.';
  }
  return 'Cannot reach Jira server. Check the URL and your network connection.';
}

/**
 * Auto-refresh interceptor: 401 → refresh token → retry
 * Yeni token'ları storage'a kaydeder.
 */
export async function jiraFetch(
  credentials: JiraCredentials,
  path: string,
  options?: RequestInit
): Promise<Response> {
  const baseUrl = getApiBaseUrl(credentials);
  const url = `${baseUrl}${path}`;
  let headers = { ...getAuthHeaders(credentials), ...options?.headers };

  // Proaktif token yenileme — süresi dolmuşsa istek yapmadan önce refresh
  if (
    credentials.platform === 'cloud' &&
    credentials.refreshToken &&
    credentials.accessTokenExpiresAt &&
    Date.now() >= credentials.accessTokenExpiresAt
  ) {
    const proactiveRefresh = await refreshAccessToken(credentials.refreshToken);
    if (proactiveRefresh.success) {
      const stored = await storageGet<JiraCredentials>(STORAGE_KEYS.JIRA_CREDENTIALS);
      if (stored.success && stored.data) {
        await storageSet(STORAGE_KEYS.JIRA_CREDENTIALS, {
          ...stored.data,
          token: proactiveRefresh.data.accessToken,
          refreshToken: proactiveRefresh.data.refreshToken,
          accessTokenExpiresAt: proactiveRefresh.data.expiresAt,
        });
      }
      headers = { ...headers, Authorization: `Bearer ${proactiveRefresh.data.accessToken}` };
    }
  }

  let response = await fetch(url, { ...options, headers });

  // 401 ve Cloud → refresh token dene (fallback)
  if (response.status === 401 && credentials.platform === 'cloud' && credentials.refreshToken) {
    const refreshResult = await refreshAccessToken(credentials.refreshToken);
    if (refreshResult.success) {
      // Yeni token'ları storage'a kaydet
      const stored = await storageGet<JiraCredentials>(STORAGE_KEYS.JIRA_CREDENTIALS);
      if (stored.success && stored.data) {
        const updated: JiraCredentials = {
          ...stored.data,
          token: refreshResult.data.accessToken,
          refreshToken: refreshResult.data.refreshToken,
          accessTokenExpiresAt: refreshResult.data.expiresAt,
        };
        await storageSet(STORAGE_KEYS.JIRA_CREDENTIALS, updated);
      }

      // Yeni token ile tekrar dene
      const newHeaders = {
        ...headers,
        Authorization: `Bearer ${refreshResult.data.accessToken}`,
      };
      response = await fetch(url, { ...options, headers: newHeaders });
    }
  }

  return response;
}

/** Bağlantı testi — /rest/api/{version}/myself */
export async function testConnection(credentials: JiraCredentials): Promise<Result<JiraUser>> {
  try {
    const version = getApiVersion(credentials);
    const response = await jiraFetch(credentials, `/rest/api/${version}/myself`);

    if (!response.ok) {
      const msg = getErrorMessage(response.status, credentials);
      return { success: false, error: msg };
    }

    const user: JiraUser = await response.json();
    return { success: true, data: user };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[JiraClient] testConnection error:', msg);
    return {
      success: false,
      error: 'Cannot reach Jira server. Check the URL and your network connection.',
    };
  }
}

/** Proje listesi — /rest/api/{version}/project */
export async function getProjects(credentials: JiraCredentials): Promise<Result<JiraProject[]>> {
  try {
    const version = getApiVersion(credentials);
    const response = await jiraFetch(credentials, `/rest/api/${version}/project`);

    if (!response.ok) {
      const msg = getErrorMessage(response.status, credentials);
      return { success: false, error: msg };
    }

    const projects: JiraProject[] = await response.json();
    return { success: true, data: projects };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[JiraClient] getProjects error:', msg);
    return { success: false, error: 'Could not retrieve project list. Check your network connection.' };
  }
}

/** Jira issue oluştur — POST /rest/api/{version}/issue */
export async function createIssue(
  credentials: JiraCredentials,
  issueData: JiraIssueCreateRequest
): Promise<Result<JiraIssueCreateResponse>> {
  try {
    const version = getApiVersion(credentials);
    const response = await jiraFetch(credentials, `/rest/api/${version}/issue`, {
      method: 'POST',
      body: JSON.stringify(issueData),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const errorMessages = (errorBody as JiraErrorResponse)?.errorMessages?.join(', ');
      const fieldErrors = Object.values((errorBody as JiraErrorResponse)?.errors ?? {}).join(', ');
      const detail = errorMessages || fieldErrors || getErrorMessage(response.status, credentials);
      console.error('[JiraClient] createIssue failed:', response.status, detail);
      return { success: false, error: `Failed to create ticket: ${detail}` };
    }

    const result: JiraIssueCreateResponse = await response.json();
    return { success: true, data: result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[JiraClient] createIssue error:', msg);
    return { success: false, error: 'Cannot reach Jira server. Check your network connection.' };
  }
}

/**
 * Dosya attachment ekle — POST /rest/api/{version}/issue/{issueKey}/attachments
 * Sıralı upload — paralel Jira rate limit'e takılabilir.
 * Her dosya ayrı request (Jira multipart'ta tek dosya destekler güvenilir şekilde).
 * KRİTİK: jiraFetch kullanılmaz — Content-Type çakışması olur.
 * Token expiry: proaktif refresh + 401 fallback refresh.
 */
export async function addAttachments(
  credentials: JiraCredentials,
  issueKey: string,
  files: File[]
): Promise<Result<JiraAttachmentResponse[]>> {
  const version = getApiVersion(credentials);
  const results: JiraAttachmentResponse[] = [];

  // Proaktif token yenileme — süresi dolmuşsa istek yapmadan önce refresh
  let activeToken = credentials.token;
  if (
    credentials.platform === 'cloud' &&
    credentials.refreshToken &&
    credentials.accessTokenExpiresAt &&
    Date.now() >= credentials.accessTokenExpiresAt
  ) {
    const proactiveRefresh = await refreshAccessToken(credentials.refreshToken);
    if (proactiveRefresh.success) {
      activeToken = proactiveRefresh.data.accessToken;
      const stored = await storageGet<JiraCredentials>(STORAGE_KEYS.JIRA_CREDENTIALS);
      if (stored.success && stored.data) {
        await storageSet(STORAGE_KEYS.JIRA_CREDENTIALS, {
          ...stored.data,
          token: proactiveRefresh.data.accessToken,
          refreshToken: proactiveRefresh.data.refreshToken,
          accessTokenExpiresAt: proactiveRefresh.data.expiresAt,
        });
      }
    }
  }

  const baseUrl = getApiBaseUrl(credentials);
  const url = `${baseUrl}/rest/api/${version}/issue/${encodeURIComponent(issueKey)}/attachments`;

  for (const file of files) {
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);

      let response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken}`,
          'X-Atlassian-Token': 'no-check',
          // Content-Type otomatik FormData boundary ile set edilir — ELLE SET ETME
        },
        body: formData,
      });

      // 401 → Cloud için token refresh ve retry
      if (response.status === 401 && credentials.platform === 'cloud' && credentials.refreshToken) {
        const refreshResult = await refreshAccessToken(credentials.refreshToken);
        if (refreshResult.success) {
          activeToken = refreshResult.data.accessToken;
          const stored = await storageGet<JiraCredentials>(STORAGE_KEYS.JIRA_CREDENTIALS);
          if (stored.success && stored.data) {
            await storageSet(STORAGE_KEYS.JIRA_CREDENTIALS, {
              ...stored.data,
              token: refreshResult.data.accessToken,
              refreshToken: refreshResult.data.refreshToken,
              accessTokenExpiresAt: refreshResult.data.expiresAt,
            });
          }
          const retryForm = new FormData();
          retryForm.append('file', file, file.name);
          response = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${activeToken}`,
              'X-Atlassian-Token': 'no-check',
            },
            body: retryForm,
          });
        }
      }

      if (!response.ok) {
        console.error('[JiraClient] addAttachment failed:', file.name, response.status);
        continue;
      }

      const attachments: JiraAttachmentResponse[] = await response.json();
      results.push(...attachments);
    } catch (err) {
      console.error('[JiraClient] addAttachment error:', file.name, err);
    }
  }

  if (results.length === 0 && files.length > 0) {
    return { success: false, error: 'No files could be attached. Check your network connection.' };
  }

  return { success: true, data: results };
}

/** Issue link oluştur — POST /rest/api/{version}/issueLink */
export async function linkIssue(
  credentials: JiraCredentials,
  childKey: string,
  parentKey: string
): Promise<Result<void>> {
  try {
    const version = getApiVersion(credentials);
    const response = await jiraFetch(credentials, `/rest/api/${version}/issueLink`, {
      method: 'POST',
      body: JSON.stringify({
        type: { name: 'Relates' },
        inwardIssue: { key: parentKey },
        outwardIssue: { key: childKey },
      }),
    });

    if (!response.ok) {
      const msg = getErrorMessage(response.status, credentials);
      console.error('[JiraClient] linkIssue failed:', response.status);
      return { success: false, error: `Could not link ticket: ${msg}` };
    }

    return { success: true, data: undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[JiraClient] linkIssue error:', msg);
    return { success: false, error: 'An error occurred while linking ticket.' };
  }
}
