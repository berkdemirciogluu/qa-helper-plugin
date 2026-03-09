// Result pattern — tüm async işlemlerde kullanılır
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Async işlem durumu
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

// Mesajlaşma tipleri
export interface Message<T> {
  action: string;
  payload: T;
}

export interface MessageResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Session durumu
export type SessionStatus = 'idle' | 'recording' | 'stopped';

// Session metadata
export interface SessionMeta {
  tabId: number;
  startTime: number;
  url: string;
  status: SessionStatus;
  counters: {
    clicks: number;
    xhrRequests: number;
    consoleErrors: number;
    navEvents: number;
  };
}

// Timeline event discriminated union
export interface NavEvent {
  type: 'nav';
  timestamp: number;
  oldUrl: string;
  url: string;
  title: string;
}

export interface ClickEvent {
  type: 'click';
  timestamp: number;
  selector: string;
  text: string;
  pageUrl: string;
  x: number;
  y: number;
}

export interface XhrEvent {
  type: 'xhr';
  timestamp: number;
  method: string;
  url: string;
  status: number;
  duration: number;
  requestBody?: string;
  responseBody?: string;
}

export interface ConsoleEvent {
  type: 'console';
  timestamp: number;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  stack?: string;
}

export interface ErrorEvent {
  type: 'error';
  timestamp: number;
  message: string;
  stack?: string;
  source?: string;
}

export type TimelineEvent =
  | NavEvent
  | ClickEvent
  | XhrEvent
  | ConsoleEvent
  | ErrorEvent;

// Message payload tipleri
export interface FlushDataPayload {
  tabId: number;
  dataType: 'xhr' | 'click' | 'console' | 'nav';
  events: TimelineEvent[];
  critical?: boolean;
}

export interface StartSessionPayload {
  tabId: number;
  url: string;
}

export interface StopSessionPayload {
  tabId: number;
}

export interface GetSessionStatusPayload {
  tabId: number;
}

export interface RecorderCommandPayload {
  tabId: number;
}

/** Bug rapor form verisi */
export interface BugReportFormData {
  expectedResult: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  stepsToReproduce: string;
  configFields: ConfigFields;
}

/** Konfigürasyon alanları — bug rapora eklenen bağlam bilgileri */
export interface ConfigFields {
  environment: string;
  testCycle: string;
  agileTeam: string;
  project: string;
}

/** Ortam bilgisi — otomatik toplanan */
export interface EnvironmentInfo {
  browser: string;
  os: string;
  viewport: string;
  pixelRatio: number;
  language: string;
  url: string;
}

/** Depolama kullanım bilgisi */
export interface StorageUsageInfo {
  totalBytes: number;
  sessionCount: number;
  sessions: {
    tabId: number;
    url: string;
    startTime: number;
    status: SessionStatus;
    eventCount: number;
  }[];
}

// Veri kaynağı toggle konfigürasyonu
export interface SessionConfig {
  toggles: {
    har: boolean;
    console: boolean;
    dom: boolean;
    localStorage: boolean;
    sessionStorage: boolean;
  };
  configFields?: ConfigFields;
}

/** Jira bağlantı bilgileri */
export interface JiraCredentials {
  platform: 'cloud' | 'server' | '';
  url: string;
  token: string; // PAT for Server, access_token for Cloud

  // Cloud OAuth ek alanlar
  refreshToken?: string;
  accessTokenExpiresAt?: number; // Unix timestamp (ms)
  cloudId?: string;
  siteName?: string; // Jira site adı (ör. "myteam.atlassian.net")

  // Ortak
  displayName?: string; // Bağlantı testi sonrası kullanıcı adı
  defaultProjectKey?: string; // Varsayılan proje key'i
  defaultIssueTypeId?: string; // Seçili issue type ID (ör. "10001")
  defaultIssueTypeName?: string; // Seçili issue type adı (ör. "Bug")
  connected?: boolean; // Bağlantı durumu
}

// Snapshot tipleri
export interface ScreenshotMetadata {
  viewport: { width: number; height: number };
  browserVersion: string;
  os: string;
  zoomLevel: number;
  pixelRatio: number;
  language: string;
  url: string;
  timestamp: number;
}

export interface DomSnapshot {
  html: string;
  doctype: string;
  url: string;
}

export interface StorageDump {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

export interface ConsoleLogEntry {
  timestamp: number;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  stack?: string;
  parsedStack?: {
    fileName: string;
    lineNumber: number;
    columnNumber: number;
    functionName: string;
  }[];
}

export interface SnapshotDataPayload {
  tabId: number;
  dom: DomSnapshot;
  storage: StorageDump;
}

export interface SnapshotData {
  screenshot: {
    dataUrl: string;
    metadata: ScreenshotMetadata;
  };
  dom: DomSnapshot;
  storage: StorageDump;
  consoleLogs: ConsoleLogEntry[];
  timestamp: number;
  collectionDurationMs: number;
}

export interface TakeSnapshotPayload {
  tabId: number;
}
