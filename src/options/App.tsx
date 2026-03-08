import type { JSX } from 'preact';
import { signal } from '@preact/signals';
import { Settings, ClipboardList, Database, Info, Menu, X, Link2 } from 'lucide-preact';

import { SidebarNav } from '@/components/layout/SidebarNav';
import { GeneralSettingsPage } from '@/options/pages/GeneralSettingsPage';
import { ConfigurationPage } from '@/options/pages/ConfigurationPage';
import { JiraSetupPage } from '@/options/pages/JiraSetupPage';
import { DataManagementPage } from '@/options/pages/DataManagementPage';
import { AboutPage } from '@/options/pages/AboutPage';
import { ToastContainer } from '@/components/ui/Toast';

type PageKey = 'general' | 'configuration' | 'jira' | 'data-management' | 'about';

export const currentPage = signal<PageKey>('general');
const isMenuOpen = signal(false);

const navItems = [
  { key: 'general' as const, label: 'Genel', icon: Settings },
  { key: 'configuration' as const, label: 'Konfigürasyon', icon: ClipboardList },
  { key: 'jira' as const, label: 'Jira Entegrasyonu', icon: Link2 },
  { key: 'data-management' as const, label: 'Veri Yönetimi', icon: Database },
  { key: 'about' as const, label: 'Hakkında', icon: Info },
];

const pages: Record<PageKey, () => JSX.Element> = {
  general: GeneralSettingsPage,
  configuration: ConfigurationPage,
  jira: JiraSetupPage,
  'data-management': DataManagementPage,
  about: AboutPage,
};

function handlePageSelect(key: string) {
  currentPage.value = key as PageKey;
  isMenuOpen.value = false;
}

export function App() {
  const PageComponent = pages[currentPage.value];

  return (
    <div class="min-h-screen bg-gray-50">
      <ToastContainer />
      {/* Mobile header */}
      <header class="md:hidden flex items-center justify-between p-4 bg-white border-b">
        <h1 class="text-lg font-semibold text-gray-900">QA Helper Ayarları</h1>
        <button
          type="button"
          onClick={() => { isMenuOpen.value = !isMenuOpen.value; }}
          aria-label={isMenuOpen.value ? 'Menüyü kapat' : 'Menüyü aç'}
          aria-expanded={isMenuOpen.value}
          class="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
        >
          {isMenuOpen.value ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <div class="md:flex">
        {/* Sidebar */}
        <aside
          class={[
            isMenuOpen.value ? 'block' : 'hidden',
            'md:block',
            'md:w-[200px] xl:w-[240px]',
            'md:min-h-screen',
            'bg-white border-r border-gray-200',
            'md:sticky md:top-0',
          ].join(' ')}
        >
          <h1 class="hidden md:block text-lg font-semibold text-gray-900 p-6">
            QA Helper Ayarları
          </h1>
          <SidebarNav
            items={navItems}
            activeKey={currentPage.value}
            onSelect={handlePageSelect}
          />
        </aside>

        {/* Content area */}
        <main class="flex-1 p-6 xl:max-w-[800px] xl:mx-auto">
          <PageComponent />
        </main>
      </div>
    </div>
  );
}
