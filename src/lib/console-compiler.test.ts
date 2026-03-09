import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseStackTrace, compileConsoleEvents, compileConsoleLogs } from './console-compiler';
import type { ConsoleEvent } from './types';

const mockStorageGet = vi.fn();

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: mockStorageGet,
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('parseStackTrace', () => {
  it('parses Chrome format stack trace', () => {
    const stack = `TypeError: Cannot read property 'foo' of undefined
    at Object.handleClick (https://app.com/static/js/main.chunk.js:42:15)
    at HTMLButtonElement.onClick (https://app.com/static/js/main.chunk.js:108:3)`;

    const result = parseStackTrace(stack);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      fileName: 'main.chunk.js',
      lineNumber: 42,
      columnNumber: 15,
      functionName: 'Object.handleClick',
    });
    expect(result[1]).toEqual({
      fileName: 'main.chunk.js',
      lineNumber: 108,
      columnNumber: 3,
      functionName: 'HTMLButtonElement.onClick',
    });
  });

  it('returns <anonymous> for unnamed functions', () => {
    const stack = `Error: test
    at https://app.com/bundle.js:10:5`;

    const result = parseStackTrace(stack);
    expect(result[0]?.functionName).toBe('<anonymous>');
    expect(result[0]?.lineNumber).toBe(10);
    expect(result[0]?.columnNumber).toBe(5);
  });

  it('skips invalid lines', () => {
    const stack = `Error: test
    not a valid stack line
    at Object.foo (https://app.com/a.js:1:1)`;

    const result = parseStackTrace(stack);
    expect(result).toHaveLength(1);
    expect(result[0]?.functionName).toBe('Object.foo');
  });

  it('returns empty array for empty stack', () => {
    expect(parseStackTrace('')).toHaveLength(0);
    expect(parseStackTrace('Just a message')).toHaveLength(0);
  });
});

describe('compileConsoleEvents', () => {
  it('converts ConsoleEvent list to ConsoleLogEntry list', () => {
    const events: ConsoleEvent[] = [
      { type: 'console', timestamp: 1000, level: 'log', message: 'Hello' },
      {
        type: 'console',
        timestamp: 2000,
        level: 'error',
        message: 'Fail',
        stack: 'Error: Fail\n    at fn (app.js:5:3)',
      },
    ];

    const result = compileConsoleEvents(events);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ timestamp: 1000, level: 'log', message: 'Hello' });
    expect(result[1]?.level).toBe('error');
    expect(result[1]?.parsedStack).toBeDefined();
    expect(result[1]?.parsedStack?.[0]?.fileName).toBe('app.js');
  });

  it('does not add parsedStack when no stack', () => {
    const events: ConsoleEvent[] = [
      { type: 'console', timestamp: 1000, level: 'warn', message: 'Warning' },
    ];
    const result = compileConsoleEvents(events);
    expect(result[0]?.parsedStack).toBeUndefined();
  });

  it('preserves all log levels', () => {
    const events: ConsoleEvent[] = [
      { type: 'console', timestamp: 1, level: 'log', message: 'a' },
      { type: 'console', timestamp: 2, level: 'warn', message: 'b' },
      { type: 'console', timestamp: 3, level: 'error', message: 'c' },
      { type: 'console', timestamp: 4, level: 'info', message: 'd' },
    ];
    const result = compileConsoleEvents(events);
    expect(result.map((e) => e.level)).toEqual(['log', 'warn', 'error', 'info']);
  });
});

describe('compileConsoleLogs', () => {
  it('reads console events from storage and compiles', async () => {
    const events: ConsoleEvent[] = [
      { type: 'console', timestamp: 1000, level: 'log', message: 'test' },
    ];
    mockStorageGet.mockResolvedValue({ session_console_42: events });

    const result = await compileConsoleLogs(42);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.message).toBe('test');
    }
  });

  it('returns empty array when storage is empty', async () => {
    mockStorageGet.mockResolvedValue({});

    const result = await compileConsoleLogs(99);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it('Storage hatasında failure döner', async () => {
    mockStorageGet.mockRejectedValue(new Error('Storage error'));

    const result = await compileConsoleLogs(1);

    expect(result.success).toBe(false);
  });
});
