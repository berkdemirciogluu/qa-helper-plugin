import type { Result } from '@/lib/types';
import type { JiraOAuthTokens, JiraAccessibleResource } from './jira-types';
import {
  JIRA_OAUTH_CLIENT_ID,
  JIRA_OAUTH_CLIENT_SECRET,
  JIRA_AUTH_URL,
  JIRA_TOKEN_URL,
  JIRA_ACCESSIBLE_RESOURCES_URL,
  JIRA_OAUTH_SCOPES,
} from '@/lib/constants';

export interface OAuthFlowResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  cloudId: string;
  siteName: string;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/** Atlassian OAuth 2.0 authorization URL oluşturur */
export function buildAuthUrl(state: string): string {
  const redirectUri = chrome.identity.getRedirectURL('atlassian');
  const e = encodeURIComponent;
  return `${JIRA_AUTH_URL}?audience=${e('api.atlassian.com')}&client_id=${e(JIRA_OAUTH_CLIENT_ID)}&scope=${e(JIRA_OAUTH_SCOPES)}&redirect_uri=${e(redirectUri)}&state=${e(state)}&response_type=code&prompt=consent`;
}

/** Chrome extension OAuth 2.0 (3LO) akışını başlatır */
export async function startOAuthFlow(): Promise<Result<OAuthFlowResult>> {
  try {
    const state = crypto.randomUUID();
    const authUrl = buildAuthUrl(state);
    console.log('[JiraAuth] redirect_uri:', chrome.identity.getRedirectURL('atlassian'));
    console.log('[JiraAuth] auth URL:', authUrl);

    let redirectUrl: string | undefined;
    try {
      redirectUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[JiraAuth] OAuth flow failed:', msg);
      if (msg.includes('did not approve') || msg.includes('cancelled') || msg.includes('canceled')) {
        return { success: false, error: 'Authorization cancelled. Press the button to try again.' };
      }
      return { success: false, error: 'Could not connect to Jira. Check your internet connection and try again.' };
    }

    if (!redirectUrl) {
      return { success: false, error: 'Authorization failed. Please try again.' };
    }

    // Auth code'u redirect URL'den çıkar
    const url = new URL(redirectUrl);
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (returnedState !== state) {
      console.error('[JiraAuth] State mismatch — possible CSRF attack');
      return { success: false, error: 'Security validation failed. Please try again.' };
    }

    if (error || !code) {
      console.error('[JiraAuth] OAuth redirect error:', error);
      return { success: false, error: 'Authorization failed. Please try again.' };
    }

    // Token exchange
    const tokenResult = await exchangeCodeForTokens(code);
    if (!tokenResult.success) return tokenResult;

    const tokens = tokenResult.data;

    // Accessible resources — cloudId alma
    const resourceResult = await getAccessibleResources(tokens.access_token);
    if (!resourceResult.success) return resourceResult;

    const resources = resourceResult.data;
    if (resources.length === 0) {
      return { success: false, error: 'No accessible Jira site found. Check your Jira permissions.' };
    }

    const resource = resources[0];

    return {
      success: true,
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
        cloudId: resource.id,
        siteName: resource.name,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[JiraAuth] startOAuthFlow error:', msg);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}

/** Authorization code → access_token + refresh_token exchange */
async function exchangeCodeForTokens(code: string): Promise<Result<JiraOAuthTokens>> {
  const redirectUri = chrome.identity.getRedirectURL('atlassian');
  const response = await fetch(JIRA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: JIRA_OAUTH_CLIENT_ID,
      client_secret: JIRA_OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    console.error('[JiraAuth] Token exchange failed:', response.status);
    return { success: false, error: 'Could not retrieve token. Please try again.' };
  }

  const tokens: JiraOAuthTokens = await response.json();
  return { success: true, data: tokens };
}

/** OAuth token ile erişilebilir Jira site'larını alır */
export async function getAccessibleResources(
  accessToken: string,
): Promise<Result<JiraAccessibleResource[]>> {
  try {
    const response = await fetch(JIRA_ACCESSIBLE_RESOURCES_URL, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      console.error('[JiraAuth] Accessible resources failed:', response.status);
      return { success: false, error: 'Could not retrieve Jira site information.' };
    }

    const resources: JiraAccessibleResource[] = await response.json();
    return { success: true, data: resources };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[JiraAuth] getAccessibleResources error:', msg);
    return { success: false, error: 'Could not retrieve Jira site information.' };
  }
}

/** Refresh token ile yeni access token alır (rotating refresh token) */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<Result<RefreshResult>> {
  try {
    const response = await fetch(JIRA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: JIRA_OAUTH_CLIENT_ID,
        client_secret: JIRA_OAUTH_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      console.error('[JiraAuth] Token refresh failed:', response.status);
      return { success: false, error: 'Session expired. Please reconnect.' };
    }

    const tokens: JiraOAuthTokens = await response.json();

    return {
      success: true,
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[JiraAuth] refreshAccessToken error:', msg);
    return { success: false, error: 'Error occurred while refreshing token.' };
  }
}

/** PAT format kontrolü */
export function validatePat(pat: string): Result<string> {
  const trimmed = pat.trim();
  if (!trimmed) {
    return { success: false, error: 'API token cannot be empty.' };
  }
  if (trimmed.length < 10) {
    return { success: false, error: 'API token is too short. Enter a valid token.' };
  }
  return { success: true, data: trimmed };
}
