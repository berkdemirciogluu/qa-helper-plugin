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

// --- Issue CRUD tipleri ---

/** Jira issue oluşturma isteği */
export interface JiraIssueCreateRequest {
  fields: {
    project: { key: string };
    summary: string;
    description: AdfDoc | string; // ADF JSON (Cloud) veya Wiki markup (Server)
    issuetype: { name: string };
    priority?: { name: string };
    parent?: { key: string };
  };
}

/** Jira issue oluşturma yanıtı */
export interface JiraIssueCreateResponse {
  id: string;
  key: string;
  self: string;
}

/** Jira attachment yanıtı */
export interface JiraAttachmentResponse {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  content: string;
}

/** Jira issue link isteği */
export interface JiraIssueLinkRequest {
  type: { name: string };
  inwardIssue: { key: string };
  outwardIssue: { key: string };
}

/** Jira issue type */
export interface JiraIssueType {
  id: string;
  name: string;
  subtask: boolean;
}

/** Jira hata yanıtı */
export interface JiraErrorResponse {
  errorMessages: string[];
  errors: Record<string, string>;
}

// --- ADF (Atlassian Document Format) tipleri ---

/** ADF text mark */
export interface AdfTextMark {
  type: 'strong' | 'em' | 'code' | 'underline' | 'strike';
}

/** ADF node */
export interface AdfNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  text?: string;
  marks?: AdfTextMark[];
}

/** ADF kök döküman */
export interface AdfDoc {
  type: 'doc';
  version: 1;
  content: AdfNode[];
}
