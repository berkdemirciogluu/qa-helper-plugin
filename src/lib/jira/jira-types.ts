/** Jira API response — kullanıcı bilgileri */
export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls: Record<string, string>;
}

/** Jira API response — proje bilgileri */
export interface JiraProject {
  id: string;
  key: string;
  name: string;
  avatarUrls: Record<string, string>;
}

/** Jira OAuth accessible resource (Cloud) */
export interface JiraAccessibleResource {
  id: string; // cloudId
  name: string;
  url: string;
  scopes: string[];
  avatarUrl: string;
}

/** OAuth 2.0 token exchange response */
export interface JiraOAuthTokens {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

/** Jira API versiyon seçimi */
export type JiraApiVersion = '2' | '3';
