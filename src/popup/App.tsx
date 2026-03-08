import { signal } from '@preact/signals';
import { DashboardView } from './views/DashboardView';
import { BugReportView } from './views/BugReportView';
import { ToastContainer } from '@/components/ui/Toast';

type View = 'dashboard' | 'bugReport';

const currentView = signal<View>('dashboard');

export function App() {
  return (
    <div class="w-[400px] min-h-0 max-h-[600px] bg-white flex flex-col overflow-hidden relative">
      <ToastContainer />
      {currentView.value === 'dashboard' && (
        <DashboardView />
      )}
      {currentView.value === 'bugReport' && (
        <BugReportView />
      )}
    </div>
  );
}

export { currentView };
