import type { Result, JiraCredentials, SnapshotData, XhrEvent, ConfigFields } from '@/lib/types';
import type { TimelineJSON } from '@/lib/timeline-builder';
import { createIssue, addAttachments, linkIssue } from './jira-client';
import { formatDescription } from './jira-formatter';
import type { ReportData } from './jira-formatter';
import { buildAttachmentFiles, getAttachmentFileNames } from './jira-file-builder';

export interface JiraExportParams {
  credentials: JiraCredentials;
  expected: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  snapshotData: SnapshotData;
  stepsText: string;
  configFields: ConfigFields;
  environmentInfo: {
    browserVersion: string;
    os: string;
    viewport: { width: number; height: number };
    language: string;
    url: string;
  };
  xhrs?: XhrEvent[];
  timelineJson?: TimelineJSON;
  parentKey?: string;
}

export interface JiraExportResult {
  issueKey: string;
  issueUrl: string;
  attachmentCount: number;
  warning?: string;
}

/** Jira priority mapping */
function mapPriority(priority: string): string {
  const map: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Highest',
  };
  return map[priority] || 'Medium';
}

/** Issue URL oluştur */
function buildIssueUrl(credentials: JiraCredentials, issueKey: string): string {
  if (credentials.platform === 'cloud' && credentials.siteName) {
    return `https://${credentials.siteName}/browse/${issueKey}`;
  }
  return `${credentials.url}/browse/${issueKey}`;
}

/** Issue summary oluştur (max 80 karakter) */
function buildSummary(expected: string, reason: string): string {
  const source = expected || reason;
  if (!source) return '[QA Helper] Bug Report';
  const truncated = source.length > 80 ? source.slice(0, 80) + '...' : source;
  return `Bug: ${truncated}`;
}

/**
 * Jira'ya bug raporu export et.
 * Akış: credentials kontrol → description formatla → issue oluştur → attachments ekle → parent link → sonuç
 */
export async function exportToJira(params: JiraExportParams): Promise<Result<JiraExportResult>> {
  const {
    credentials,
    expected,
    reason,
    priority,
    snapshotData,
    stepsText,
    configFields,
    environmentInfo,
    xhrs,
    timelineJson,
    parentKey,
  } = params;

  // 1. Credentials kontrolü
  if (!credentials.platform || !credentials.url || !credentials.token || !credentials.connected) {
    return {
      success: false,
      error: 'Jira configuration is missing. Set up Jira from the Settings page.',
    };
  }

  if (!credentials.defaultProjectKey) {
    return {
      success: false,
      error: 'No default project selected. Select a project from the Settings page.',
    };
  }

  // 2. Attachment file isimlerini hazırla (description'a eklenecek)
  const attachmentNames = getAttachmentFileNames({ snapshotData, xhrs, timelineJson });

  // 3. Description formatla
  const reportData: ReportData = {
    stepsText,
    expected,
    reason,
    environment: {
      browser: environmentInfo.browserVersion,
      os: environmentInfo.os,
      viewport: `${environmentInfo.viewport.width}x${environmentInfo.viewport.height}`,
      language: environmentInfo.language,
      url: environmentInfo.url,
    },
    configFields,
    attachmentNames,
  };

  const description = formatDescription(credentials, reportData);

  // 4. Issue oluştur
  const summary = buildSummary(expected, reason);
  const issueResult = await createIssue(credentials, {
    fields: {
      project: { key: credentials.defaultProjectKey },
      summary,
      description,
      issuetype: { name: 'Bug' },
      priority: { name: mapPriority(priority) },
    },
  });

  if (!issueResult.success) {
    return { success: false, error: issueResult.error };
  }

  const { key: issueKey } = issueResult.data;
  const issueUrl = buildIssueUrl(credentials, issueKey);
  const warnings: string[] = [];

  // 5. Attachments ekle
  const files = buildAttachmentFiles({ snapshotData, xhrs, timelineJson });
  let attachmentCount = 0;
  if (files.length > 0) {
    const attachResult = await addAttachments(credentials, issueKey, files);
    if (attachResult.success) {
      attachmentCount = attachResult.data.length;
      if (attachmentCount < files.length) {
        warnings.push('Some files could not be attached');
      }
    } else {
      warnings.push('Files could not be attached');
    }
  }

  // 6. Parent link
  if (parentKey) {
    const linkResult = await linkIssue(credentials, issueKey, parentKey);
    if (!linkResult.success) {
      warnings.push('Could not link to parent ticket');
    }
  }

  return {
    success: true,
    data: {
      issueKey,
      issueUrl,
      attachmentCount,
      warning: warnings.length > 0 ? warnings.join('. ') : undefined,
    },
  };
}
