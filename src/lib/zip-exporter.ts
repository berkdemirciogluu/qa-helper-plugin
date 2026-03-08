import type { Result, SnapshotData, XhrEvent } from './types';
import type { TimelineJSON } from './timeline-builder';

interface ExportResult {
  fileName: string;
  fileSize: string;
}

interface SimplifiedHarEntry {
  startedDateTime: string;
  request: {
    method: string;
    url: string;
    headers: never[];
    bodySize: number;
  };
  response: {
    status: number;
    statusText: string;
    headers: never[];
    bodySize: number;
  };
  time: number;
}

interface SimplifiedHar {
  log: {
    version: '1.2';
    entries: SimplifiedHarEntry[];
  };
}

interface ExportBugReportInput {
  snapshotData: SnapshotData;
  timeline: TimelineJSON;
  description: string;
  xhrs: XhrEvent[];
}

function buildHar(xhrs: XhrEvent[]): SimplifiedHar {
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

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export async function exportBugReportZip(input: ExportBugReportInput): Promise<Result<ExportResult>> {
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
