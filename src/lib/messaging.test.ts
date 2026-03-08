import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMessage, sendTabMessage, onMessage } from './messaging';
import type { Message } from './types';

// Mock chrome.runtime and chrome.tabs
const mockSendMessage = vi.fn();
const mockTabsSendMessage = vi.fn();
const mockAddListener = vi.fn();

vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: mockSendMessage,
    onMessage: {
      addListener: mockAddListener,
    },
    lastError: null,
  },
  tabs: {
    sendMessage: mockTabsSendMessage,
  },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sendMessage', () => {
  it('returns success result with response data', async () => {
    const responseData = { sessionId: '123' };
    mockSendMessage.mockResolvedValue({ success: true, data: responseData });

    const msg: Message<{ action: string }> = {
      action: 'GET_SESSION_STATUS',
      payload: { action: 'test' },
    };
    const result = await sendMessage<{ action: string }, { sessionId: string }>(msg);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(responseData);
    }
  });

  it('returns failure result when response is null', async () => {
    mockSendMessage.mockResolvedValue(null);

    const msg: Message<null> = { action: 'START_SESSION', payload: null };
    const result = await sendMessage<null, unknown>(msg);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('No response received');
    }
  });

  it('returns failure result on chrome runtime error', async () => {
    mockSendMessage.mockRejectedValue(new Error('Extension context invalidated'));

    const msg: Message<null> = { action: 'START_SESSION', payload: null };
    const result = await sendMessage<null, unknown>(msg);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Extension context invalidated');
    }
  });
});

describe('sendTabMessage', () => {
  it('sends message to specific tab and returns success result', async () => {
    mockTabsSendMessage.mockResolvedValue({ success: true, data: 'ok' });

    const msg: Message<string> = { action: 'FLUSH_DATA', payload: 'flush' };
    const result = await sendTabMessage<string, string>(42, msg);

    expect(mockTabsSendMessage).toHaveBeenCalledWith(42, msg);
    expect(result.success).toBe(true);
  });

  it('returns failure result on tab message error', async () => {
    mockTabsSendMessage.mockRejectedValue(new Error('Tab not found'));

    const msg: Message<null> = { action: 'STOP_SESSION', payload: null };
    const result = await sendTabMessage<null, unknown>(99, msg);

    expect(result.success).toBe(false);
  });
});

describe('onMessage', () => {
  it('registers a message listener with chrome.runtime.onMessage', () => {
    const handler = vi.fn();
    onMessage(handler);
    expect(mockAddListener).toHaveBeenCalledTimes(1);
  });
});
