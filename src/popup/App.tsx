import { signal } from '@preact/signals';
import { useState } from 'preact/hooks';
import { AlertCircle } from 'lucide-preact';
import { DashboardView } from './views/DashboardView';
import { BugReportView } from './views/BugReportView';
import { ToastContainer } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { sendMessage } from '@/lib/messaging';
import { MESSAGE_ACTIONS } from '@/lib/constants';
import type { GetSessionStatusPayload, SessionMeta } from '@/lib/types';

type View = 'dashboard' | 'bugReport';

const currentView = signal<View>('dashboard');
// Animasyon yönü: dashboard→bugReport='right', bugReport→dashboard='left'
const slideDirection = signal<'right' | 'left'>('right');

export function App() {
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  async function handleOpenBugReport() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tab?.id;

    if (tabId !== undefined) {
      const result = await sendMessage<GetSessionStatusPayload, SessionMeta | null>({
        action: MESSAGE_ACTIONS.GET_SESSION_STATUS,
        payload: { tabId },
      });

      const isRecording = result.success && result.data?.status === 'recording';
      setHasSession(isRecording);

      if (!isRecording) {
        setShowSessionWarning(true);
        return;
      }
    }

    slideDirection.value = 'right';
    currentView.value = 'bugReport';
  }

  function handleWarningContinue() {
    setShowSessionWarning(false);
    slideDirection.value = 'right';
    currentView.value = 'bugReport';
  }

  function handleWarningCancel() {
    setShowSessionWarning(false);
  }

  const view = currentView.value;
  const direction = slideDirection.value;
  const animClass = view === 'bugReport'
    ? (direction === 'right' ? 'slide-enter-right' : 'slide-enter-left')
    : (direction === 'left' ? 'slide-enter-left' : 'slide-enter-right');

  return (
    <div class="w-[400px] min-h-0 max-h-[600px] bg-white flex flex-col overflow-hidden relative">
      <ToastContainer />

      {/* Session'sız uyarı modalı — DashboardView seviyesinde */}
      <Modal
        isOpen={showSessionWarning}
        onClose={handleWarningCancel}
        title="Session Kaydı Yok"
      >
        <div class="flex items-start gap-3">
          <AlertCircle size={20} class="text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
          <p class="text-sm text-gray-700">
            Session kaydı yok, sadece anlık snapshot alınacak. Tıklama akışı ve XHR geçmişi
            dahil edilemez.
          </p>
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleWarningCancel}>
            İptal
          </Button>
          <Button variant="primary" size="sm" onClick={handleWarningContinue}>
            Devam Et
          </Button>
        </div>
      </Modal>

      {view === 'dashboard' && (
        <div class={`flex flex-col h-full ${animClass}`}>
          <DashboardView onOpenBugReport={() => void handleOpenBugReport()} />
        </div>
      )}
      {view === 'bugReport' && (
        <div class={`flex flex-col h-full ${animClass}`}>
          <BugReportView hasSession={hasSession} />
        </div>
      )}
    </div>
  );
}

export { currentView, slideDirection };
