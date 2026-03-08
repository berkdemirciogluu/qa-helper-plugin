import type { ComponentType } from 'preact';

interface NavItem {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number; class?: string }>;
}

interface SidebarNavProps {
  items: NavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export function SidebarNav({ items, activeKey, onSelect }: SidebarNavProps) {
  return (
    <nav aria-label="Ayarlar menüsü">
      <ul class="flex flex-col gap-0.5 py-2">
        {items.map((item) => {
          const isActive = item.key === activeKey;
          const Icon = item.icon;
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onSelect(item.key)}
                aria-current={isActive ? 'page' : undefined}
                class={[
                  'flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors',
                  'min-h-[44px]',
                  'focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2',
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-2 border-transparent',
                ].join(' ')}
              >
                <Icon size={18} class={isActive ? 'text-blue-600' : 'text-gray-400'} />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
