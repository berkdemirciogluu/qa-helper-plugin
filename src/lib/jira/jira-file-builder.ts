import type { SnapshotData, XhrEvent } from '@/lib/types';
import type { TimelineJSON } from '@/lib/timeline-builder';

/** Base64 dataURL → File dönüşümü */
function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const byteString = atob(base64);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mime });
}

/** JSON veriyi File nesnesine çevir */
function jsonToFile(data: unknown, fileName: string): File {
  const content = JSON.stringify(data, null, 2);
  return new File([content], fileName, { type: 'application/json' });
}

/** String veriyi File nesnesine çevir */
function stringToFile(content: string, fileName: string, mimeType: string): File {
  return new File([content], fileName, { type: mimeType });
}

/** HAR formatı oluştur */
function buildHar(xhrs: XhrEvent[]): object {
  return {
    log: {
      version: '1.2',
      entries: xhrs.map((xhr) => ({
        startedDateTime: new Date(xhr.timestamp).toISOString(),
        request: {
          method: xhr.method,
          url: xhr.url,
          headers: [],
          bodySize: xhr.requestBody?.length ?? 0,
        },
        response: {
          status: xhr.status,
          statusText: '',
          headers: [],
          bodySize: xhr.responseBody?.length ?? 0,
        },
        time: xhr.duration,
      })),
    },
  };
}

export interface BuildAttachmentFilesInput {
  snapshotData: SnapshotData;
  xhrs?: XhrEvent[];
  timelineJson?: TimelineJSON;
}

/**
 * Snapshot verilerinden Jira'ya yüklenecek File[] oluştur.
 * Null/undefined veri kaynakları atlanır.
 */
export function buildAttachmentFiles(input: BuildAttachmentFilesInput): File[] {
  const { snapshotData, xhrs, timelineJson } = input;
  const files: File[] = [];

  // screenshot.png
  if (snapshotData.screenshot?.dataUrl) {
    files.push(dataUrlToFile(snapshotData.screenshot.dataUrl, 'screenshot.png'));
  }

  // dom-snapshot.html
  if (snapshotData.dom?.html) {
    const doctype = snapshotData.dom.doctype || '<!DOCTYPE html>';
    files.push(stringToFile(`${doctype}\n${snapshotData.dom.html}`, 'dom-snapshot.html', 'text/html'));
  }

  // console-logs.json
  if (snapshotData.consoleLogs?.length) {
    files.push(jsonToFile(snapshotData.consoleLogs, 'console-logs.json'));
  }

  // network.har
  if (xhrs?.length) {
    files.push(jsonToFile(buildHar(xhrs), 'network.har'));
  }

  // local-storage.json
  if (snapshotData.storage?.localStorage && Object.keys(snapshotData.storage.localStorage).length > 0) {
    files.push(jsonToFile(snapshotData.storage.localStorage, 'local-storage.json'));
  }

  // session-storage.json
  if (snapshotData.storage?.sessionStorage && Object.keys(snapshotData.storage.sessionStorage).length > 0) {
    files.push(jsonToFile(snapshotData.storage.sessionStorage, 'session-storage.json'));
  }

  // timeline.json
  if (timelineJson) {
    files.push(jsonToFile(timelineJson, 'timeline.json'));
  }

  return files;
}

/** Oluşturulan dosya isimlerini döndür (description'a eklemek için) */
export function getAttachmentFileNames(input: BuildAttachmentFilesInput): string[] {
  return buildAttachmentFiles(input).map((f) => f.name);
}
