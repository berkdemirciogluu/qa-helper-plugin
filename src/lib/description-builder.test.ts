import { describe, it, expect } from 'vitest';
import { buildDescription } from './description-builder';
import type { ConfigFields } from './types';

const defaultForm = {
  expectedResult: 'Clicking the login button should redirect to the homepage',
  reason: 'Clicking the login button returns a 500 error',
  priority: 'high' as const,
};

const defaultConfig: ConfigFields = {
  environment: 'staging',
  project: 'e-commerce',
  agileTeam: 'Team Alpha',
  testCycle: 'Sprint 1',
};

const defaultEnvironment = {
  browser: 'Chrome 133',
  os: 'Windows 11',
  viewport: '1920x1080',
  pixelRatio: 1,
  language: 'tr-TR',
  url: 'https://app.com/login',
};

describe('buildDescription', () => {
  it('produces description with all sections', () => {
    const result = buildDescription({
      form: defaultForm,
      stepsText: '1. Navigated to page\n2. Clicked button',
      environment: defaultEnvironment,
      configFields: defaultConfig,
    });

    expect(result).toContain('## Bug Report');
    expect(result).toContain('**Expected Result:**');
    expect(result).toContain('Clicking the login button should redirect to the homepage');
    expect(result).toContain('**Why Bug:**');
    expect(result).toContain('Clicking the login button returns a 500 error');
    expect(result).toContain('**Priority:** High');
    expect(result).toContain('**Steps to Reproduce:**');
    expect(result).toContain('1. Navigated to page');
    expect(result).toContain('**Environment:**');
    expect(result).toContain('Chrome 133');
    expect(result).toContain('**Configuration:**');
    expect(result).toContain('staging');
  });

  it('works with empty form data', () => {
    const result = buildDescription({
      form: { expectedResult: '', reason: '', priority: 'medium' },
      stepsText: '',
      environment: defaultEnvironment,
      configFields: defaultConfig,
    });

    expect(result).toContain('## Bug Report');
    expect(result).toContain('**Priority:** Medium');
  });

  it('formats and includes environment info correctly', () => {
    const result = buildDescription({
      form: defaultForm,
      stepsText: '',
      environment: defaultEnvironment,
      configFields: defaultConfig,
    });

    expect(result).toContain('- Browser: Chrome 133');
    expect(result).toContain('- OS: Windows 11');
    expect(result).toContain('- Viewport: 1920x1080');
    expect(result).toContain('- Pixel Ratio: 1');
    expect(result).toContain('- Language: tr-TR');
    expect(result).toContain('- URL: https://app.com/login');
  });

  it('formats and includes configuration fields correctly', () => {
    const result = buildDescription({
      form: defaultForm,
      stepsText: '',
      environment: defaultEnvironment,
      configFields: defaultConfig,
    });

    expect(result).toContain('- Environment: staging');
    expect(result).toContain('- Project: e-commerce');
    expect(result).toContain('- Agile Team: Team Alpha');
    expect(result).toContain('- Test Cycle: Sprint 1');
  });

  it('capitalizes priority value', () => {
    const result = buildDescription({
      form: { expectedResult: '', reason: '', priority: 'critical' },
      stepsText: '',
      environment: defaultEnvironment,
      configFields: defaultConfig,
    });

    expect(result).toContain('**Priority:** Critical');
  });

  it('footer contains date and project name', () => {
    const result = buildDescription({
      form: defaultForm,
      stepsText: '',
      environment: defaultEnvironment,
      configFields: defaultConfig,
    });

    expect(result).toContain('Report: qa-helper-plugin');
  });
});
