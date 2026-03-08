import type { ConsoleLogEntry, ConsoleEvent, Result } from './types';
import { storageGet, getSessionKey } from './storage';
import { STORAGE_KEYS } from './constants';

// Chrome format: "    at FunctionName (url:line:col)" veya "    at url:line:col"
const CHROME_STACK_REGEX = /^\s*at\s+(?:(.+?)\s+\()?(.*?):(\d+):(\d+)\)?$/;

export function parseStackTrace(
  stack: string,
): { fileName: string; lineNumber: number; columnNumber: number; functionName: string }[] {
  return stack
    .split('\n')
    .slice(1) // ilk satır hata mesajı — atla
    .map((line) => {
      const match = CHROME_STACK_REGEX.exec(line);
      if (!match) return null;
      const [, fnName, rawUrl, lineStr, colStr] = match;
      const fileName = extractFileName(rawUrl ?? '');
      return {
        fileName,
        lineNumber: parseInt(lineStr ?? '0', 10),
        columnNumber: parseInt(colStr ?? '0', 10),
        functionName: fnName ?? '<anonymous>',
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function extractFileName(url: string): string {
  const lastSlash = url.lastIndexOf('/');
  return lastSlash >= 0 ? url.slice(lastSlash + 1) : url;
}

export function compileConsoleEvents(events: ConsoleEvent[]): ConsoleLogEntry[] {
  return events.map((event): ConsoleLogEntry => {
    const entry: ConsoleLogEntry = {
      timestamp: event.timestamp,
      level: event.level,
      message: event.message,
    };
    if (event.stack) {
      entry.stack = event.stack;
      const parsed = parseStackTrace(event.stack);
      if (parsed.length > 0) {
        entry.parsedStack = parsed;
      }
    }
    return entry;
  });
}

export async function compileConsoleLogs(tabId: number): Promise<Result<ConsoleLogEntry[]>> {
  const result = await storageGet<ConsoleEvent[]>(getSessionKey(STORAGE_KEYS.SESSION_CONSOLE, tabId));
  if (!result.success) {
    return { success: false, error: result.error };
  }
  const events = result.data ?? [];
  return { success: true, data: compileConsoleEvents(events) };
}
