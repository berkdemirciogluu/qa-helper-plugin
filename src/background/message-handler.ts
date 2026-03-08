import { MESSAGE_ACTIONS } from '../lib/constants';
import { onMessage } from '../lib/messaging';
import type {
  Message,
  MessageResponse,
  FlushDataPayload,
  StartSessionPayload,
  StopSessionPayload,
  GetSessionStatusPayload,
} from '../lib/types';
import { startSession, stopSession, getSession, updateCounters } from './session-manager';
import { enqueueFlush } from './flush-manager';

type KnownPayload =
  | StartSessionPayload
  | StopSessionPayload
  | GetSessionStatusPayload
  | FlushDataPayload;

function isValidPayload(payload: unknown, ...requiredKeys: string[]): boolean {
  if (typeof payload !== 'object' || payload === null) return false;
  return requiredKeys.every((key) => key in payload);
}

export function setupMessageHandler(): void {
  onMessage<KnownPayload>(
    async (
      message: Message<KnownPayload>,
    ): Promise<MessageResponse<unknown>> => {
      const { action, payload } = message;

      try {
        switch (action) {
          case MESSAGE_ACTIONS.START_SESSION: {
            if (!isValidPayload(payload, 'tabId', 'url')) {
              return { success: false, error: 'Invalid payload: tabId and url required' };
            }
            const p = payload as StartSessionPayload;
            const result = await startSession(p.tabId, p.url);
            if (result.success) {
              return { success: true, data: result.data };
            }
            return { success: false, error: result.error };
          }

          case MESSAGE_ACTIONS.STOP_SESSION: {
            if (!isValidPayload(payload, 'tabId')) {
              return { success: false, error: 'Invalid payload: tabId required' };
            }
            const p = payload as StopSessionPayload;
            const result = await stopSession(p.tabId);
            if (result.success) {
              return { success: true };
            }
            return { success: false, error: result.error };
          }

          case MESSAGE_ACTIONS.GET_SESSION_STATUS: {
            if (!isValidPayload(payload, 'tabId')) {
              return { success: false, error: 'Invalid payload: tabId required' };
            }
            const p = payload as GetSessionStatusPayload;
            const result = await getSession(p.tabId);
            if (result.success) {
              return { success: true, data: result.data };
            }
            return { success: false, error: result.error };
          }

          case MESSAGE_ACTIONS.FLUSH_DATA: {
            if (!isValidPayload(payload, 'tabId', 'dataType', 'events')) {
              return { success: false, error: 'Invalid payload: tabId, dataType and events required' };
            }
            const p = payload as FlushDataPayload;

            // Session durumunu kontrol et — sadece recording session'a veri kabul et
            const session = await getSession(p.tabId);
            if (!session.success || !session.data || session.data.status !== 'recording') {
              return { success: true };
            }

            await enqueueFlush(p.tabId, p.dataType, p.events, p.critical);

            const xhrCount = p.dataType === 'xhr' ? p.events.length : 0;
            const clickCount = p.dataType === 'click' ? p.events.length : 0;
            const consoleErrorCount =
              p.dataType === 'console'
                ? p.events.filter(
                    (e) => e.type === 'console' && (e as { level: string }).level === 'error',
                  ).length
                : 0;
            const navCount = p.dataType === 'nav' ? p.events.length : 0;

            if (xhrCount > 0) await updateCounters(p.tabId, 'xhr', xhrCount);
            if (clickCount > 0) await updateCounters(p.tabId, 'click', clickCount);
            if (consoleErrorCount > 0) await updateCounters(p.tabId, 'consoleError', consoleErrorCount);
            if (navCount > 0) await updateCounters(p.tabId, 'nav', navCount);

            return { success: true };
          }

          default:
            return { success: false, error: 'Unknown action' };
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error(`[MessageHandler] Error handling action "${action}":`, error);
        return { success: false, error };
      }
    },
  );
}
