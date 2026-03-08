import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { SidebarNav } from './SidebarNav';

function MockIcon({ size, class: className }: { size?: number; class?: string }) {
  return <svg data-testid="mock-icon" data-size={size} class={className} />;
}

const defaultItems = [
  { key: 'general', label: 'Genel', icon: MockIcon },
  { key: 'configuration', label: 'Konfigürasyon', icon: MockIcon },
  { key: 'data-management', label: 'Veri Yönetimi', icon: MockIcon },
  { key: 'about', label: 'Hakkında', icon: MockIcon },
];

describe('SidebarNav', () => {
  it('tüm navigasyon itemlarını render eder', () => {
    render(<SidebarNav items={defaultItems} activeKey="general" onSelect={() => {}} />);

    expect(screen.getByText('Genel')).toBeTruthy();
    expect(screen.getByText('Konfigürasyon')).toBeTruthy();
    expect(screen.getByText('Veri Yönetimi')).toBeTruthy();
    expect(screen.getByText('Hakkında')).toBeTruthy();
  });

  it('nav elementine aria-label atar', () => {
    render(<SidebarNav items={defaultItems} activeKey="general" onSelect={() => {}} />);

    const nav = screen.getByRole('navigation');
    expect(nav).toBeTruthy();
    expect(nav.tagName.toLowerCase()).toBe('nav');
    expect(nav.getAttribute('aria-label')).toBe('Ayarlar menüsü');
  });

  it('aktif iteme aria-current="page" atar', () => {
    render(<SidebarNav items={defaultItems} activeKey="configuration" onSelect={() => {}} />);

    const activeButton = screen.getByText('Konfigürasyon').closest('button');
    expect(activeButton?.getAttribute('aria-current')).toBe('page');

    const inactiveButton = screen.getByText('Genel').closest('button');
    expect(inactiveButton?.getAttribute('aria-current')).toBeNull();
  });

  it('aktif item vurgulu gösterilir', () => {
    render(<SidebarNav items={defaultItems} activeKey="general" onSelect={() => {}} />);

    const activeButton = screen.getByText('Genel').closest('button');
    expect(activeButton?.className).toContain('bg-blue-50');
    expect(activeButton?.className).toContain('text-blue-700');
    expect(activeButton?.className).toContain('font-medium');
  });

  it('pasif item uygun stilde gösterilir', () => {
    render(<SidebarNav items={defaultItems} activeKey="general" onSelect={() => {}} />);

    const inactiveButton = screen.getByText('Konfigürasyon').closest('button');
    expect(inactiveButton?.className).toContain('text-gray-600');
  });

  it('tıklama ile onSelect çağrılır', () => {
    const onSelect = vi.fn();
    render(<SidebarNav items={defaultItems} activeKey="general" onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Hakkında'));
    expect(onSelect).toHaveBeenCalledWith('about');
  });

  it('navigasyon itemları button elementi ile render edilir (native keyboard erişimi)', () => {
    render(<SidebarNav items={defaultItems} activeKey="general" onSelect={() => {}} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(4);
    buttons.forEach((button) => {
      expect(button.getAttribute('type')).toBe('button');
    });
  });

  it('butonlar minimum 44px yüksekliğe sahip', () => {
    render(<SidebarNav items={defaultItems} activeKey="general" onSelect={() => {}} />);

    const button = screen.getByText('Genel').closest('button');
    expect(button?.className).toContain('min-h-[44px]');
  });
});
