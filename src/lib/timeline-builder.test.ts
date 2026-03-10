import { describe, it, expect } from 'vitest';
import { buildTimeline } from './timeline-builder';
import type {
  SnapshotData,
  ClickEvent,
  NavEvent,
  XhrEvent,
  ConsoleLogEntry,
  ConfigFields,
} from './types';

const makeSnapshotData = (overrides: Partial<SnapshotData> = {}): SnapshotData => ({
  screenshot: {
    dataUrl: 'data:image/png;base64,abc',
    metadata: {
      viewport: { width: 1920, height: 1080 },
      browserVersion: 'Chrome 133',
      os: 'Windows 11',
      zoomLevel: 1,
      pixelRatio: 1,
      language: 'tr-TR',
      url: 'https://app.com/login',
      timestamp: 1000,
    },
  },
  dom: { html: '<html></html>', doctype: '<!DOCTYPE html>', url: 'https://app.com/login' },
  storage: { localStorage: {}, sessionStorage: {} },
  consoleLogs: [],
  timestamp: 1000,
  collectionDurationMs: 100,
  ...overrides,
});

const makeClick = (overrides: Partial<ClickEvent> = {}): ClickEvent => ({
  type: 'click',
  timestamp: 2000,
  selector: 'button',
  text: 'Submit',
  pageUrl: 'https://app.com',
  x: 100,
  y: 200,
  ...overrides,
});

const makeNav = (overrides: Partial<NavEvent> = {}): NavEvent => ({
  type: 'nav',
  timestamp: 1000,
  oldUrl: 'https://app.com',
  url: 'https://app.com/login',
  title: 'Login',
  ...overrides,
});

const makeXhr = (overrides: Partial<XhrEvent> = {}): XhrEvent => ({
  type: 'xhr',
  timestamp: 3000,
  method: 'GET',
  url: 'https://api.com/data',
  status: 200,
  duration: 150,
  ...overrides,
});

const makeConsoleLog = (overrides: Partial<ConsoleLogEntry> = {}): ConsoleLogEntry => ({
  timestamp: 4000,
  level: 'error',
  message: 'Uncaught TypeError',
  ...overrides,
});

const defaultConfig: ConfigFields = {
  environment: 'staging',
  project: 'e-commerce',
  agileTeam: 'Team Alpha',
  testCycle: 'Sprint 1',
};

const defaultForm = {
  expectedResult: 'Login should succeed',
  reason: 'Login returns 500 error',
  priority: 'high' as const,
};

describe('buildTimeline', () => {
  it('creates valid timeline JSON with empty data', () => {
    const result = buildTimeline({
      snapshotData: makeSnapshotData(),
      clicks: [],
      navs: [],
      xhrs: [],
      consoleLogs: [],
      form: defaultForm,
      configFields: defaultConfig,
    });

    expect(result.schemaVersion).toBe('1.0');
    expect(result.sessionId).toBeTruthy();
    expect(result.timeline).toEqual([]);
    expect(result.errorSummary.consoleErrors).toBe(0);
    expect(result.errorSummary.failedRequests).toBe(0);
    expect(result.errorSummary.crashDetected).toBe(false);
  });

  it('fills bugReport fields correctly', () => {
    const result = buildTimeline({
      snapshotData: makeSnapshotData(),
      clicks: [],
      navs: [],
      xhrs: [],
      consoleLogs: [],
      form: defaultForm,
      configFields: defaultConfig,
    });

    expect(result.bugReport).toEqual({
      expectedResult: 'Login should succeed',
      actualResult: 'Login returns 500 error',
      priority: 'high',
    });
  });

  it('gets environment info from snapshotData metadata', () => {
    const result = buildTimeline({
      snapshotData: makeSnapshotData(),
      clicks: [],
      navs: [],
      xhrs: [],
      consoleLogs: [],
      form: defaultForm,
      configFields: defaultConfig,
    });

    expect(result.environment).toEqual({
      browser: 'Chrome 133',
      os: 'Windows 11',
      viewport: '1920x1080',
      pixelRatio: 1,
      language: 'tr-TR',
      url: 'https://app.com/login',
    });
  });

  it('gets context fields from configFields', () => {
    const result = buildTimeline({
      snapshotData: makeSnapshotData(),
      clicks: [],
      navs: [],
      xhrs: [],
      consoleLogs: [],
      form: defaultForm,
      configFields: defaultConfig,
    });

    expect(result.context).toEqual({
      environment: 'staging',
      project: 'e-commerce',
      agileTeam: 'Team Alpha',
      testCycle: 'Sprint 1',
    });
  });

  it('defaults context to empty strings when configFields omitted', () => {
    const result = buildTimeline({
      snapshotData: makeSnapshotData(),
      clicks: [],
      navs: [],
      xhrs: [],
      consoleLogs: [],
      form: defaultForm,
    });

    expect(result.context).toEqual({
      environment: '',
      project: '',
      agileTeam: '',
      testCycle: '',
    });
  });

  it('sorts timeline entries by timestamp', () => {
    const result = buildTimeline({
      snapshotData: makeSnapshotData(),
      clicks: [makeClick({ timestamp: 3000 })],
      navs: [makeNav({ timestamp: 1000 })],
      xhrs: [makeXhr({ timestamp: 2000 })],
      consoleLogs: [],
      form: defaultForm,
      configFields: defaultConfig,
    });

    expect(result.timeline).toHaveLength(3);
    expect(result.timeline[0].ts).toBe(1000);
    expect(result.timeline[1].ts).toBe(2000);
    expect(result.timeline[2].ts).toBe(3000);
  });

  it('maps click events to user channel', () => {
    const result = buildTimeline({
      snapshotData: makeSnapshotData(),
      clicks: [makeClick({ text: 'Login', selector: 'button.login' })],
      navs: [],
      xhrs: [],
      consoleLogs: [],
      form: defaultForm,
      configFields: defaultConfig,
    });

    expect(result.timeline[0]).toEqual({
      ts: 2000,
      ch: 'user',
      type: 'click',
      text: 'Login',
      el: 'button.login',
    });
  });

  it('maps nav events to user channel', () => {
    const result = buildTimeline({
      snapshotData: makeSnapshotData(),
      clicks: [],
      navs: [makeNav({ url: 'https://app.com/dashboard' })],
      xhrs: [],
      consoleLogs: [],
      form: defaultForm,
      configFields: defaultConfig,
    });

    expect(result.timeline[0]).toEqual({
      ts: 1000,
      ch: 'user',
      type: 'nav',
      url: 'https://app.com/dashboard',
    });
  });

  it('maps xhr events to sys channel', () => {
    const result = buildTimeline({
      snapshotData: makeSnapshotData(),
      clicks: [],
      navs: [],
      xhrs: [makeXhr({ method: 'POST', url: 'https://api.com/login', status: 200, duration: 300 })],
      consoleLogs: [],
      form: defaultForm,
      configFields: defaultConfig,
    });

    expect(result.timeline[0]).toEqual({
      ts: 3000,
      ch: 'sys',
      type: 'xhr',
      method: 'POST',
      url: 'https://api.com/login',
      status: 200,
      ms: 300,
    });
  });

  it('maps console error events to sys channel', () => {
    const result = buildTimeline({
      snapshotData: makeSnapshotData(),
      clicks: [],
      navs: [],
      xhrs: [],
      consoleLogs: [makeConsoleLog({ message: 'TypeError: x is null', stack: 'at app.js:10' })],
      form: defaultForm,
      configFields: defaultConfig,
    });

    expect(result.timeline[0]).toEqual({
      ts: 4000,
      ch: 'sys',
      type: 'error',
      msg: 'TypeError: x is null',
      source: 'at app.js:10',
    });
  });

  it('uses fileName:lineNumber format for source when parsedStack exists', () => {
    const logWithParsedStack = makeConsoleLog({
      message: 'ReferenceError: x is not defined',
      stack: 'ReferenceError: x is not defined\n    at Object.<anonymous> (checkout.js:42:15)',
      parsedStack: [
        {
          fileName: 'checkout.js',
          lineNumber: 42,
          columnNumber: 15,
          functionName: 'Object.<anonymous>',
        },
      ],
    });

    const result = buildTimeline({
      snapshotData: makeSnapshotData(),
      clicks: [],
      navs: [],
      xhrs: [],
      consoleLogs: [logWithParsedStack],
      form: defaultForm,
      configFields: defaultConfig,
    });

    expect(result.timeline[0]).toEqual({
      ts: 4000,
      ch: 'sys',
      type: 'error',
      msg: 'ReferenceError: x is not defined',
      source: 'checkout.js:42',
    });
  });

  it('calculates consoleErrors count correctly', () => {
    const result = buildTimeline({
      snapshotData: makeSnapshotData(),
      clicks: [],
      navs: [],
      xhrs: [],
      consoleLogs: [
        makeConsoleLog({ level: 'error' }),
        makeConsoleLog({ level: 'error', timestamp: 5000 }),
        makeConsoleLog({ level: 'warn', timestamp: 6000 }),
      ],
      form: defaultForm,
      configFields: defaultConfig,
    });

    expect(result.errorSummary.consoleErrors).toBe(2);
  });

  it('calculates failedRequests (status >= 400) count correctly', () => {
    const result = buildTimeline({
      snapshotData: makeSnapshotData(),
      clicks: [],
      navs: [],
      xhrs: [
        makeXhr({ status: 200, timestamp: 1000 }),
        makeXhr({ status: 404, timestamp: 2000 }),
        makeXhr({ status: 500, timestamp: 3000 }),
        makeXhr({ status: 399, timestamp: 4000 }),
      ],
      consoleLogs: [],
      form: defaultForm,
      configFields: defaultConfig,
    });

    expect(result.errorSummary.failedRequests).toBe(2);
  });

  it('returns static attachment file names', () => {
    const result = buildTimeline({
      snapshotData: makeSnapshotData(),
      clicks: [],
      navs: [],
      xhrs: [],
      consoleLogs: [],
      form: defaultForm,
      configFields: defaultConfig,
    });

    expect(result.attachments).toEqual({
      screenshot: 'screenshot.png',
      har: 'network.har',
      dom: 'dom-snapshot.html',
      consoleLogs: 'console-logs.json',
      localStorage: 'local-storage.json',
      sessionStorage: 'session-storage.json',
    });
  });

  it('includes all timeline entry types with full data set', () => {
    const result = buildTimeline({
      snapshotData: makeSnapshotData(),
      clicks: [makeClick({ timestamp: 2000 })],
      navs: [makeNav({ timestamp: 1000 })],
      xhrs: [makeXhr({ timestamp: 3000 })],
      consoleLogs: [makeConsoleLog({ timestamp: 4000 })],
      form: defaultForm,
      configFields: defaultConfig,
    });

    expect(result.timeline).toHaveLength(4);
    const types = result.timeline.map((e) => e.type);
    expect(types).toContain('nav');
    expect(types).toContain('click');
    expect(types).toContain('xhr');
    expect(types).toContain('error');
  });

  it('only error level console logs are added to timeline', () => {
    const result = buildTimeline({
      snapshotData: makeSnapshotData(),
      clicks: [],
      navs: [],
      xhrs: [],
      consoleLogs: [
        makeConsoleLog({ level: 'log', timestamp: 1000 }),
        makeConsoleLog({ level: 'info', timestamp: 2000 }),
        makeConsoleLog({ level: 'warn', timestamp: 3000 }),
        makeConsoleLog({ level: 'error', timestamp: 4000 }),
      ],
      form: defaultForm,
      configFields: defaultConfig,
    });

    expect(result.timeline).toHaveLength(1);
    expect(result.timeline[0].type).toBe('error');
  });
});
