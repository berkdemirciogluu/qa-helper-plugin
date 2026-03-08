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
  url: string;
  title: string;
}

export interface ClickEvent {
  type: 'click';
  timestamp: number;
  selector: string;
  text: string;
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
