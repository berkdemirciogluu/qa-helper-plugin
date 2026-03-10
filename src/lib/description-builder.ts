interface BuildDescriptionInput {
  form: {
    expectedResult: string;
    reason: string;
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
}

export function buildDescription(input: BuildDescriptionInput): string {
  const { form, stepsText, environment } = input;
  const date = new Date().toISOString().slice(0, 10);

  const lines: string[] = [
    '## Bug Report',
    '',
    '**Expected Result:**',
    form.expectedResult,
    '',
    '**Why Bug:**',
    form.reason,
    '',
    '---',
    '',
    '**Steps to Reproduce:**',
    stepsText,
    '',
    '---',
    '',
    '**Environment:**',
    `- Browser: ${environment.browser}`,
    `- OS: ${environment.os}`,
    `- Viewport: ${environment.viewport}`,
    `- Pixel Ratio: ${environment.pixelRatio}`,
    `- Language: ${environment.language}`,
    `- URL: ${environment.url}`,
    '',
    '---',
    `Report: qa-helper-plugin | ${date}`,
  ];

  return lines.join('\n');
}
