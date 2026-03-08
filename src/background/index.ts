import { MESSAGE_ACTIONS } from '../lib/constants';
import { sendTabMessage } from '../lib/messaging';
import type { RecorderCommandPayload } from '../lib/types';
import { setupMessageHandler } from './message-handler';
import { getSession, updateBadge } from './session-manager';

setupMessageHandler();

chrome.runtime.onInstalled.addListener(() => {
  console.warn('[Background] Extension installed');
});

// Önceki aktif tab'ı takip et — tab değişiminde PAUSE/RESUME göndermek için
let previousActiveTabId: number | null = null;

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    // Önceki tab'a PAUSE gönder (session'ı varsa)
    if (previousActiveTabId !== null && previousActiveTabId !== tabId) {
      const prevSession = await getSession(previousActiveTabId);
      if (prevSession.success && prevSession.data && prevSession.data.status === 'recording') {
        sendTabMessage<RecorderCommandPayload, unknown>(previousActiveTabId, {
          action: MESSAGE_ACTIONS.PAUSE_RECORDING,
          payload: { tabId: previousActiveTabId },
        }).catch(() => {});
      }
    }

    // Yeni aktif tab'a RESUME gönder ve badge güncelle
    const result = await getSession(tabId);
    if (result.success && result.data && result.data.status === 'recording') {
      sendTabMessage<RecorderCommandPayload, unknown>(tabId, {
        action: MESSAGE_ACTIONS.RESUME_RECORDING,
        payload: { tabId },
      }).catch(() => {});
      updateBadge(tabId, result.data.counters.consoleErrors);
    } else {
      updateBadge(tabId, null);
    }

    previousActiveTabId = tabId;
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[Background] onActivated failed:', error);
  }
});
