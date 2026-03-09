import { describe, it, expect } from 'vitest';
import { formatDescriptionAdf, formatDescriptionWiki, formatDescription } from './jira-formatter';
import type { ReportData } from './jira-formatter';
import type { JiraCredentials } from '@/lib/types';

const baseReportData: ReportData = {
  stepsText: '1. Login sayfasına git\n2. Kullanıcı adı gir\n3. Giriş butonuna tıkla',
  expected: 'Kullanıcı giriş yapabilmeli',
  reason: '500 hatası alınıyor',
  environment: {
    browser: 'Chrome 133',
    os: 'Windows 11',
    viewport: '1920x1080',
    language: 'tr-TR',
    url: 'https://app.example.com/login',
  },
  configFields: {
    environment: 'Staging',
    testCycle: 'Sprint 4',
    agileTeam: 'QA Team',
    project: 'E-Commerce',
  },
  attachmentNames: ['screenshot.png', 'console-logs.json', 'network.har'],
};

describe('formatDescriptionAdf', () => {
  it('returns ADF doc type and version 1', () => {
    const result = formatDescriptionAdf(baseReportData);
    expect(result.type).toBe('doc');
    expect(result.version).toBe(1);
    expect(result.content.length).toBeGreaterThan(0);
  });

  it('creates Steps to Reproduce orderedList', () => {
    const result = formatDescriptionAdf(baseReportData);
    const heading = result.content.find(
      (n) => n.type === 'heading' && n.content?.[0]?.text === 'Steps to Reproduce'
    );
    expect(heading).toBeDefined();

    const list = result.content.find((n) => n.type === 'orderedList');
    expect(list).toBeDefined();
    expect(list!.content).toHaveLength(3);
  });

  it('creates Environment table', () => {
    const result = formatDescriptionAdf(baseReportData);
    const table = result.content.find((n) => n.type === 'table');
    expect(table).toBeDefined();
    // header row + data row
    expect(table!.content).toHaveLength(2);
  });

  it('creates Configuration table', () => {
    const result = formatDescriptionAdf(baseReportData);
    const tables = result.content.filter((n) => n.type === 'table');
    // Environment + Configuration = 2 tables
    expect(tables.length).toBeGreaterThanOrEqual(2);
  });

  it('creates Attached Files panel', () => {
    const result = formatDescriptionAdf(baseReportData);
    const panel = result.content.find((n) => n.type === 'panel');
    expect(panel).toBeDefined();
    expect(panel!.attrs).toEqual({ panelType: 'info' });
  });

  it('does not create orderedList with empty stepsText', () => {
    const result = formatDescriptionAdf({ ...baseReportData, stepsText: '' });
    const list = result.content.find((n) => n.type === 'orderedList');
    expect(list).toBeUndefined();
  });

  it('does not create configuration table with empty configFields', () => {
    const result = formatDescriptionAdf({
      ...baseReportData,
      configFields: { environment: '', testCycle: '', agileTeam: '', project: '' },
    });
    const headings = result.content.filter(
      (n) => n.type === 'heading' && n.content?.[0]?.text === 'Configuration'
    );
    expect(headings).toHaveLength(0);
  });

  it('does not create panel with empty attachmentNames', () => {
    const result = formatDescriptionAdf({ ...baseReportData, attachmentNames: [] });
    const panel = result.content.find((n) => n.type === 'panel');
    expect(panel).toBeUndefined();
  });
});

describe('formatDescriptionWiki', () => {
  it('creates Steps to Reproduce numbered list', () => {
    const result = formatDescriptionWiki(baseReportData);
    expect(result).toContain('h3. Steps to Reproduce');
    expect(result).toContain('# Login sayfasına git');
    expect(result).toContain('# Kullanıcı adı gir');
    expect(result).toContain('# Giriş butonuna tıkla');
  });

  it('creates Environment table', () => {
    const result = formatDescriptionWiki(baseReportData);
    expect(result).toContain('||Browser||OS||Viewport||Language||URL||');
    expect(result).toContain('|Chrome 133|Windows 11|1920x1080|tr-TR|');
  });

  it('creates Configuration table', () => {
    const result = formatDescriptionWiki(baseReportData);
    expect(result).toContain('h3. Configuration');
    expect(result).toContain('|Staging|');
  });

  it('creates Attached Files panel', () => {
    const result = formatDescriptionWiki(baseReportData);
    expect(result).toContain('{panel:title=Attached Files|borderStyle=solid}');
    expect(result).toContain('screenshot.png, console-logs.json, network.har');
    expect(result).toContain('{panel}');
  });

  it('escapes XSS special characters', () => {
    const data: ReportData = {
      ...baseReportData,
      expected: 'Test {code} [link] |pipe| #hash *bold*',
    };
    const result = formatDescriptionWiki(data);
    expect(result).toContain('\\{code\\}');
    expect(result).toContain('\\[link\\]');
    expect(result).toContain('\\|pipe\\|');
    expect(result).toContain('\\#hash');
    expect(result).toContain('\\*bold\\*');
  });

  it('no steps section with empty stepsText', () => {
    const result = formatDescriptionWiki({ ...baseReportData, stepsText: '' });
    expect(result).not.toContain('h3. Steps to Reproduce');
  });
});

describe('formatDescription', () => {
  it('returns ADF for Cloud credentials', () => {
    const creds: JiraCredentials = {
      platform: 'cloud',
      url: 'https://x.atlassian.net',
      token: 't',
      connected: true,
    };
    const result = formatDescription(creds, baseReportData);
    expect(typeof result).toBe('object');
    expect((result as { type: string }).type).toBe('doc');
  });

  it('returns Wiki string for Server credentials', () => {
    const creds: JiraCredentials = {
      platform: 'server',
      url: 'https://jira.co',
      token: 't',
      connected: true,
    };
    const result = formatDescription(creds, baseReportData);
    expect(typeof result).toBe('string');
    expect(result as string).toContain('h3.');
  });
});
