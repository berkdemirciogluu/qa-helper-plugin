import type {
  SnapshotData,
  ClickEvent,
  NavEvent,
  XhrEvent,
  ConsoleLogEntry,
  ConfigFields,
} from './types';

interface TimelineEntryNav {
  ts: number;
  ch: 'user';
  type: 'nav';
  url: string;
}

interface TimelineEntryClick {
  ts: number;
  ch: 'user';
  type: 'click';
  text: string;
  el: string;
}

interface TimelineEntryXhr {
  ts: number;
  ch: 'sys';
  type: 'xhr';
  method: string;
  url: string;
  status: number;
  ms: number;
}

interface TimelineEntryError {
  ts: number;
  ch: 'sys';
  type: 'error';
  msg: string;
  source: string;
}

type TimelineEntry = TimelineEntryNav | TimelineEntryClick | TimelineEntryXhr | TimelineEntryError;

export interface TimelineJSON {
  schemaVersion: '1.0';
  sessionId: string;
  bugReport: {
    expectedResult: string;
    actualResult: string;
    priority: string;
  };
  environment: {
    browser: string;
    os: string;
    viewport: string;
    pixelRatio: number;
    language: string;
    url: string;
  };
  context: {
    environment: string;
    project: string;
    agileTeam: string;
    testCycle: string;
  };
  timeline: TimelineEntry[];
  errorSummary: {
    consoleErrors: number;
    failedRequests: number;
    crashDetected: boolean;
  };
  attachments: {
    screenshot: 'screenshot.png';
    har: 'network.har';
    dom: 'dom-snapshot.html';
    consoleLogs: 'console-logs.json';
    localStorage: 'local-storage.json';
    sessionStorage: 'session-storage.json';
  };
}

interface BuildTimelineInput {
  snapshotData: SnapshotData;
  clicks: ClickEvent[];
  navs: NavEvent[];
  xhrs: XhrEvent[];
  consoleLogs: ConsoleLogEntry[];
  form: {
    expectedResult: string;
    reason: string;
    priority: string;
  };
  configFields?: ConfigFields;
}

export function buildTimeline(input: BuildTimelineInput): TimelineJSON {
  const { snapshotData, clicks, navs, xhrs, consoleLogs, form, configFields } = input;
  const meta = snapshotData.screenshot.metadata;

  const timeline: TimelineEntry[] = [];

  for (const nav of navs) {
    timeline.push({ ts: nav.timestamp, ch: 'user', type: 'nav', url: nav.url });
  }

  for (const click of clicks) {
    timeline.push({ ts: click.timestamp, ch: 'user', type: 'click', text: click.text, el: click.selector });
  }

  for (const xhr of xhrs) {
    timeline.push({ ts: xhr.timestamp, ch: 'sys', type: 'xhr', method: xhr.method, url: xhr.url, status: xhr.status, ms: xhr.duration });
  }

  const errorLogs = consoleLogs.filter((log) => log.level === 'error');
  for (const log of errorLogs) {
    const source = log.parsedStack?.[0]
      ? `${log.parsedStack[0].fileName}:${log.parsedStack[0].lineNumber}`
      : log.stack ?? '';
    timeline.push({ ts: log.timestamp, ch: 'sys', type: 'error', msg: log.message, source });
  }

  timeline.sort((a, b) => a.ts - b.ts);

  const consoleErrors = errorLogs.length;
  const failedRequests = xhrs.filter((xhr) => xhr.status >= 400).length;

  return {
    schemaVersion: '1.0',
    sessionId: crypto.randomUUID(),
    bugReport: {
      expectedResult: form.expectedResult,
      actualResult: form.reason,
      priority: form.priority,
    },
    environment: {
      browser: meta.browserVersion,
      os: meta.os,
      viewport: `${meta.viewport.width}x${meta.viewport.height}`,
      pixelRatio: meta.pixelRatio,
      language: meta.language,
      url: meta.url,
    },
    context: {
      environment: configFields?.environment ?? '',
      project: configFields?.project ?? '',
      agileTeam: configFields?.agileTeam ?? '',
      testCycle: configFields?.testCycle ?? '',
    },
    timeline,
    errorSummary: {
      consoleErrors,
      failedRequests,
      crashDetected: false,
    },
    attachments: {
      screenshot: 'screenshot.png',
      har: 'network.har',
      dom: 'dom-snapshot.html',
      consoleLogs: 'console-logs.json',
      localStorage: 'local-storage.json',
      sessionStorage: 'session-storage.json',
    },
  };
}
