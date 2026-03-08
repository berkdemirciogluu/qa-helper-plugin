import type { AdfDoc, AdfNode } from './jira-types';
import type { JiraCredentials } from '@/lib/types';

/** Formatter için giriş verisi */
export interface ReportData {
  stepsText: string;
  expected: string;
  reason: string;
  environment: {
    browser: string;
    os: string;
    viewport: string;
    language: string;
    url: string;
  };
  configFields: {
    environment: string;
    testCycle: string;
    agileTeam: string;
    project: string;
  };
  attachmentNames: string[];
}

// --- ADF helpers ---

function adfText(text: string, marks?: AdfNode['marks']): AdfNode {
  const node: AdfNode = { type: 'text', text };
  if (marks?.length) node.marks = marks;
  return node;
}

function adfParagraph(...content: AdfNode[]): AdfNode {
  return { type: 'paragraph', content };
}

function adfHeading(level: number, text: string): AdfNode {
  return {
    type: 'heading',
    attrs: { level },
    content: [adfText(text)],
  };
}

function adfListItem(text: string): AdfNode {
  return {
    type: 'listItem',
    content: [adfParagraph(adfText(text))],
  };
}

function adfTableCell(type: 'tableHeader' | 'tableCell', text: string): AdfNode {
  return {
    type,
    content: [adfParagraph(adfText(text))],
  };
}

function adfTableRow(cells: AdfNode[]): AdfNode {
  return { type: 'tableRow', content: cells };
}

// --- Wiki escape ---

// Hyphen (-) özellikle hariç tutuldu — Jira Wiki'de standart escape değil
const WIKI_SPECIAL_CHARS = /([{}\[\]|#*_~^+])/g;

function escapeWiki(text: string): string {
  return text.replace(WIKI_SPECIAL_CHARS, '\\$1');
}

// --- Steps parser ---

function parseSteps(stepsText: string): string[] {
  if (!stepsText.trim()) return [];
  return stepsText
    .split('\n')
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
}

// --- Public API ---

/** ADF JSON formatında description oluştur (Jira Cloud) */
export function formatDescriptionAdf(data: ReportData): AdfDoc {
  const content: AdfNode[] = [];

  // Steps to Reproduce
  const steps = parseSteps(data.stepsText);
  if (steps.length > 0) {
    content.push(adfHeading(3, 'Steps to Reproduce'));
    content.push({
      type: 'orderedList',
      content: steps.map((step) => adfListItem(step)),
    });
  }

  // Beklenen Sonuç
  if (data.expected) {
    content.push(adfHeading(3, 'Beklenen Sonuç'));
    content.push(adfParagraph(adfText(data.expected)));
  }

  // Gerçekleşen Sonuç
  if (data.reason) {
    content.push(adfHeading(3, 'Gerçekleşen Sonuç'));
    content.push(adfParagraph(adfText(data.reason)));
  }

  // Environment tablosu
  const env = data.environment;
  content.push(adfHeading(3, 'Environment'));
  content.push({
    type: 'table',
    content: [
      adfTableRow([
        adfTableCell('tableHeader', 'Browser'),
        adfTableCell('tableHeader', 'OS'),
        adfTableCell('tableHeader', 'Viewport'),
        adfTableCell('tableHeader', 'Dil'),
        adfTableCell('tableHeader', 'URL'),
      ]),
      adfTableRow([
        adfTableCell('tableCell', env.browser),
        adfTableCell('tableCell', env.os),
        adfTableCell('tableCell', env.viewport),
        adfTableCell('tableCell', env.language),
        adfTableCell('tableCell', env.url),
      ]),
    ],
  });

  // Konfigürasyon alanları
  const cfg = data.configFields;
  const cfgEntries = [
    ['Environment', cfg.environment],
    ['Test Cycle', cfg.testCycle],
    ['Agile Team', cfg.agileTeam],
    ['Project', cfg.project],
  ].filter(([, v]) => v);

  if (cfgEntries.length > 0) {
    content.push(adfHeading(3, 'Konfigürasyon'));
    content.push({
      type: 'table',
      content: [
        adfTableRow([adfTableCell('tableHeader', 'Alan'), adfTableCell('tableHeader', 'Değer')]),
        ...cfgEntries.map(([k, v]) =>
          adfTableRow([adfTableCell('tableCell', k), adfTableCell('tableCell', v)])
        ),
      ],
    });
  }

  // Ekli dosyalar
  if (data.attachmentNames.length > 0) {
    content.push({
      type: 'panel',
      attrs: { panelType: 'info' },
      content: [adfParagraph(adfText(`Ekli dosyalar: ${data.attachmentNames.join(', ')}`))],
    });
  }

  return { type: 'doc', version: 1, content };
}

/** Wiki markup formatında description oluştur (Jira Server/DC) */
export function formatDescriptionWiki(data: ReportData): string {
  const lines: string[] = [];

  // Steps to Reproduce
  const steps = parseSteps(data.stepsText);
  if (steps.length > 0) {
    lines.push('h3. Steps to Reproduce');
    steps.forEach((step) => lines.push(`# ${escapeWiki(step)}`));
    lines.push('');
  }

  // Beklenen Sonuç
  if (data.expected) {
    lines.push('h3. Beklenen Sonuç');
    lines.push(escapeWiki(data.expected));
    lines.push('');
  }

  // Gerçekleşen Sonuç
  if (data.reason) {
    lines.push('h3. Gerçekleşen Sonuç');
    lines.push(escapeWiki(data.reason));
    lines.push('');
  }

  // Environment tablosu
  const env = data.environment;
  lines.push('h3. Environment');
  lines.push('||Browser||OS||Viewport||Dil||URL||');
  lines.push(
    `|${escapeWiki(env.browser)}|${escapeWiki(env.os)}|${escapeWiki(env.viewport)}|${escapeWiki(env.language)}|${escapeWiki(env.url)}|`
  );
  lines.push('');

  // Konfigürasyon alanları
  const cfg = data.configFields;
  const cfgEntries = [
    ['Environment', cfg.environment],
    ['Test Cycle', cfg.testCycle],
    ['Agile Team', cfg.agileTeam],
    ['Project', cfg.project],
  ].filter(([, v]) => v);

  if (cfgEntries.length > 0) {
    lines.push('h3. Konfigürasyon');
    lines.push('||Alan||Değer||');
    cfgEntries.forEach(([k, v]) => lines.push(`|${escapeWiki(k)}|${escapeWiki(v)}|`));
    lines.push('');
  }

  // Ekli dosyalar
  if (data.attachmentNames.length > 0) {
    lines.push('{panel:title=Ekli Dosyalar|borderStyle=solid}');
    lines.push(data.attachmentNames.join(', '));
    lines.push('{panel}');
  }

  return lines.join('\n');
}

/** Platform'a göre description formatla */
export function formatDescription(credentials: JiraCredentials, data: ReportData): AdfDoc | string {
  if (credentials.platform === 'cloud') {
    return formatDescriptionAdf(data);
  }
  return formatDescriptionWiki(data);
}
