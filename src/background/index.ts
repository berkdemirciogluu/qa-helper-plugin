import { setupMessageHandler } from './message-handler';
import { getSession, updateBadge } from './session-manager';

setupMessageHandler();

chrome.runtime.onInstalled.addListener(() => {
  console.warn('[Background] Extension installed');
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const result = await getSession(tabId);
    if (result.success && result.data && result.data.status === 'recording') {
      updateBadge(tabId, result.data.counters.consoleErrors);
    } else {
      updateBadge(tabId, null);
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[Background] onActivated badge update failed:', error);
  }
});
