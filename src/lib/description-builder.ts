import type { ConfigFields } from './types';

interface BuildDescriptionInput {
  form: {
    expectedResult: string;
    reason: string;
    priority: string;
  };
  stepsText: string;
  environment: {
    browser: string;
    os: string;
    viewport: string;
    pixelRatio: number;
    language: string;
    url: string;
  };
  configFields: ConfigFields;
}

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function buildDescription(input: BuildDescriptionInput): string {
  const { form, stepsText, environment, configFields } = input;
  const date = new Date().toISOString().slice(0, 10);

  const lines: string[] = [
    '## Bug Raporu',
    '',
    '**Beklenen Sonuç:**',
    form.expectedResult,
    '',
    '**Neden Bug:**',
    form.reason,
    '',
    `**Öncelik:** ${capitalize(form.priority)}`,
    '',
    '---',
    '',
    '**Steps to Reproduce:**',
    stepsText,
    '',
    '---',
    '',
    '**Ortam:**',
    `- Browser: ${environment.browser}`,
    `- OS: ${environment.os}`,
    `- Viewport: ${environment.viewport}`,
    `- Pixel Ratio: ${environment.pixelRatio}`,
    `- Dil: ${environment.language}`,
    `- URL: ${environment.url}`,
    '',
    '**Konfigürasyon:**',
    `- Environment: ${configFields.environment}`,
    `- Proje: ${configFields.project}`,
    `- Agile Team: ${configFields.agileTeam}`,
    `- Test Cycle: ${configFields.testCycle}`,
    '',
    '---',
    `Rapor: qa-helper-plugin | ${date}`,
  ];

  return lines.join('\n');
}
