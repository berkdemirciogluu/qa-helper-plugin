import type { Message, MessageResponse, Result } from './types';

/**
 * Chrome extension mesajlaşma wrapper'ları — tüm işlemler Result<T> pattern ile döner.
 */

export async function sendMessage<T, R>(message: Message<T>): Promise<Result<R>> {
  try {
    const response = (await chrome.runtime.sendMessage(message)) as MessageResponse<R>;
    console.log('[Messaging] sendMessage response:', response);
    if (!response) {
      return { success: false, error: 'No response received' };
    }
    if (response.success) {
      return { success: true, data: response.data as R };
    }
    return { success: false, error: response.error ?? 'Unknown error' };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[Messaging] sendMessage failed:', error);
    return { success: false, error };
  }
}

export async function sendTabMessage<T, R>(tabId: number, message: Message<T>): Promise<Result<R>> {
  try {
    const response = (await chrome.tabs.sendMessage(tabId, message)) as MessageResponse<R>;
    if (!response) {
      return { success: false, error: 'No response received' };
    }
    if (response.success) {
      return { success: true, data: response.data as R };
    }
    return { success: false, error: response.error ?? 'Unknown error' };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}

export function onMessage<T>(
  handler: (
    message: Message<T>,
    sender: chrome.runtime.MessageSender
  ) => Promise<MessageResponse<unknown>>
): void {
  chrome.runtime.onMessage.addListener(
    (
      message: Message<T>,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: MessageResponse<unknown>) => void
    ) => {
      console.log('[Messaging] onMessage received:', message.action);
      handler(message, sender)
        .then(sendResponse)
        .catch((err: unknown) => {
          const error = err instanceof Error ? err.message : String(err);
          sendResponse({ success: false, error });
        });
      return true; // keep channel open for async response
    }
  );
}
