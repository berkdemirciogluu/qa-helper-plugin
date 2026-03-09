import type { Result, SnapshotData, XhrEvent } from './types';
import type { TimelineJSON } from './timeline-builder';

interface ExportResult {
  fileName: string;
  fileSize: string;
}

interface ExportBugReportInput {
  snapshotData: SnapshotData;
  timeline: TimelineJSON;
  description: string;
  xhrs: XhrEvent[];
}

function buildHar(xhrs: XhrEvent[]): Record<string, unknown> {
  const sorted = [...xhrs].sort((a, b) => a.timestamp - b.timestamp);
  return {
    log: {
      version: '1.2',
      creator: { name: 'QA Helper', version: '0.1.0' },
      entries: sorted.map((xhr) => {
        const duration = Number(xhr.duration) || 0;
        const reqBodySize = xhr.requestBody ? new Blob([xhr.requestBody]).size : 0;
        const resBodySize = xhr.responseBody ? new Blob([xhr.responseBody]).size : 0;
        return {
          _resourceType: 'xhr',
          startedDateTime: new Date(xhr.timestamp).toISOString(),
          time: duration,
          request: {
            method: xhr.method,
            url: xhr.url,
            httpVersion: 'HTTP/1.1',
            cookies: [],
            headers: [],
            queryString: [],
            headersSize: -1,
            bodySize: reqBodySize,
            ...(xhr.requestBody
              ? { postData: { mimeType: 'application/json', text: xhr.requestBody } }
              : {}),
          },
          response: {
            status: xhr.status,
            statusText: '',
            httpVersion: 'HTTP/1.1',
            cookies: [],
            headers: [],
            content: {
              size: resBodySize,
              mimeType: 'application/json',
              text: xhr.responseBody ?? '',
            },
            redirectURL: '',
            headersSize: -1,
            bodySize: resBodySize,
            _transferSize: resBodySize,
          },
          cache: {},
          timings: {
            blocked: -1,
            dns: -1,
            ssl: -1,
            connect: -1,
            send: 0,
            wait: duration,
            receive: 0,
          },
        };
      }),
    },
  };
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export async function exportBugReportZip(
  input: ExportBugReportInput
): Promise<Result<ExportResult>> {
  try {
    const { snapshotData, timeline, description, xhrs } = input;
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // description.txt
    zip.file('description.txt', description);

    // screenshot.png — base64 olarak ekle
    const base64Data = snapshotData.screenshot.dataUrl.split(',')[1];
    zip.file('screenshot.png', base64Data, { base64: true });

    // dom-snapshot.html
    zip.file('dom-snapshot.html', snapshotData.dom.html);

    // console-logs.json
    zip.file('console-logs.json', JSON.stringify(snapshotData.consoleLogs, null, 2));

    // network.har — basitleştirilmiş HAR formatı
    zip.file('network.har', JSON.stringify(buildHar(xhrs), null, 2));

    // local-storage.json
    zip.file('local-storage.json', JSON.stringify(snapshotData.storage.localStorage, null, 2));

    // session-storage.json
    zip.file('session-storage.json', JSON.stringify(snapshotData.storage.sessionStorage, null, 2));

    // timeline.json
    zip.file('timeline.json', JSON.stringify(timeline, null, 2));

    // Blob oluştur
    const blob = await zip.generateAsync({ type: 'blob' });
    const fileName = `bug-report-${new Date().toISOString().slice(0, 10)}.zip`;

    // İndirme tetikle
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      success: true,
      data: {
        fileName,
        fileSize: formatFileSize(blob.size),
      },
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[ZipExporter] export failed:', error);
    return { success: false, error };
  }
}
