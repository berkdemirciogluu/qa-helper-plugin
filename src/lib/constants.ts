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
  SESSION_SNAPSHOT: 'session_snapshot',
  JIRA_CREDENTIALS: 'jira_credentials',
  BUG_REPORT_CONFIG: 'bug_report_config',
} as const;

/** Varsayılan bug raporu önceliği */
export const DEFAULT_PRIORITY = 'medium' as const;

/** Snapshot işlemi maksimum timeout süresi (3 saniye) */
export const MAX_SNAPSHOT_TIMEOUT_MS = 3000;

/** Content script flush interval (3 saniye) */
export const RECORDER_FLUSH_INTERVAL_MS = 3000;

/** Injected page script postMessage tipleri */
export const QA_HELPER_MSG_TYPES = {
  XHR: '__QA_HELPER_XHR__',
  CONSOLE: '__QA_HELPER_CONSOLE__',
  NAV: '__QA_HELPER_NAV__',
} as const;

/** Static asset uzantıları — XHR/Fetch kaydından hariç tutulur */
export const STATIC_ASSET_EXTENSIONS = [
  '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg',
  '.woff', '.woff2', '.ttf', '.eot', '.ico', '.map', '.webp', '.avif',
] as const;

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
  START_RECORDING: 'START_RECORDING',
  STOP_RECORDING: 'STOP_RECORDING',
  PAUSE_RECORDING: 'PAUSE_RECORDING',
  RESUME_RECORDING: 'RESUME_RECORDING',
  QUERY_RECORDING_STATE: 'QUERY_RECORDING_STATE',
} as const;
