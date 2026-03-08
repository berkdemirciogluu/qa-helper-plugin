/** XHR request/response body maksimum boyutu (50KB) */
export const MAX_XHR_BODY_SIZE = 50 * 1024;

/** Veri flush debounce süresi (2.5 saniye) */
export const FLUSH_INTERVAL_MS = 2500;

/** chrome.storage.local anahtar isimleri */
export const STORAGE_KEYS = {
  SESSION_META: 'session_meta',
  SESSION_XHR: 'session_xhr',
  SESSION_CLICKS: 'session_clicks',
  SESSION_CONSOLE: 'session_console',
  SESSION_NAV: 'session_nav',
  SESSION_CONFIG: 'session_config',
  JIRA_CREDENTIALS: 'jira_credentials',
} as const;

/** Mesaj action isimleri */
export const MESSAGE_ACTIONS = {
  START_SESSION: 'START_SESSION',
  STOP_SESSION: 'STOP_SESSION',
  FLUSH_DATA: 'FLUSH_DATA',
  TAKE_SNAPSHOT: 'TAKE_SNAPSHOT',
  GET_SESSION_STATUS: 'GET_SESSION_STATUS',
  REPORT_BUG: 'REPORT_BUG',
  EXPORT_ZIP: 'EXPORT_ZIP',
  EXPORT_JIRA: 'EXPORT_JIRA',
  SESSION_EVENT: 'SESSION_EVENT',
  SNAPSHOT_DATA: 'SNAPSHOT_DATA',
} as const;
