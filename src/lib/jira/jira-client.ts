import type { Result, JiraCredentials } from '@/lib/types';
import type { JiraUser, JiraProject, JiraApiVersion } from './jira-types';
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
      ? 'Oturum süresi doldu. Lütfen tekrar bağlanın.'
      : 'API token geçersiz. Jira profilinizden yeni bir token oluşturabilirsiniz.';
  }
  if (status === 403) {
    return 'Erişim reddedildi. Jira yetkilendirmelerinizi kontrol edin.';
  }
  if (status === 404) {
    return 'Jira sunucusuna ulaşılamıyor. URL\'i kontrol edin.';
  }
  return 'Jira sunucusuna ulaşılamıyor. URL\'i ve ağ bağlantınızı kontrol edin.';
}

/**
 * Auto-refresh interceptor: 401 → refresh token → retry
 * Yeni token'ları storage'a kaydeder.
 */
export async function jiraFetch(
  credentials: JiraCredentials,
  path: string,
  options?: RequestInit,
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
  if (
    response.status === 401 &&
    credentials.platform === 'cloud' &&
    credentials.refreshToken
  ) {
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
export async function testConnection(
  credentials: JiraCredentials,
): Promise<Result<JiraUser>> {
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
    return { success: false, error: 'Jira sunucusuna ulaşılamıyor. URL\'i ve ağ bağlantınızı kontrol edin.' };
  }
}

/** Proje listesi — /rest/api/{version}/project */
export async function getProjects(
  credentials: JiraCredentials,
): Promise<Result<JiraProject[]>> {
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
    return { success: false, error: 'Proje listesi alınamadı. Ağ bağlantınızı kontrol edin.' };
  }
}
