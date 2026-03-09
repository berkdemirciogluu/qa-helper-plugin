import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { SidebarNav } from './SidebarNav';

function MockIcon({ size, class: className }: { size?: number; class?: string }) {
  return <svg data-testid="mock-icon" data-size={size} class={className} />;
}

const defaultItems = [
  { key: 'general', label: 'General', icon: MockIcon },
  { key: 'configuration', label: 'Configuration', icon: MockIcon },
  { key: 'data-management', label: 'Data Management', icon: MockIcon },
  { key: 'about', label: 'About', icon: MockIcon },
];

describe('SidebarNav', () => {
  it('renders all navigation items', () => {
    render(<SidebarNav items={defaultItems} activeKey="general" onSelect={() => {}} />);

    expect(screen.getByText('General')).toBeTruthy();
    expect(screen.getByText('Configuration')).toBeTruthy();
    expect(screen.getByText('Data Management')).toBeTruthy();
    expect(screen.getByText('About')).toBeTruthy();
  });

  it('nav element gets aria-label', () => {
    render(<SidebarNav items={defaultItems} activeKey="general" onSelect={() => {}} />);

    const nav = screen.getByRole('navigation');
    expect(nav).toBeTruthy();
    expect(nav.tagName.toLowerCase()).toBe('nav');
    expect(nav.getAttribute('aria-label')).toBe('Settings menu');
  });

  it('aktif iteme aria-current="page" atar', () => {
    render(<SidebarNav items={defaultItems} activeKey="configuration" onSelect={() => {}} />);

    const activeButton = screen.getByText('Configuration').closest('button');
    expect(activeButton?.getAttribute('aria-current')).toBe('page');

    const inactiveButton = screen.getByText('General').closest('button');
    expect(inactiveButton?.getAttribute('aria-current')).toBeNull();
  });

  it('active item is highlighted', () => {
    render(<SidebarNav items={defaultItems} activeKey="general" onSelect={() => {}} />);

    const activeButton = screen.getByText('General').closest('button');
    expect(activeButton?.className).toContain('bg-blue-50');
    expect(activeButton?.className).toContain('text-blue-700');
    expect(activeButton?.className).toContain('font-medium');
  });

  it('inactive item has appropriate style', () => {
    render(<SidebarNav items={defaultItems} activeKey="general" onSelect={() => {}} />);

    const inactiveButton = screen.getByText('Configuration').closest('button');
    expect(inactiveButton?.className).toContain('text-gray-600');
  });

  it('calls onSelect on click', () => {
    const onSelect = vi.fn();
    render(<SidebarNav items={defaultItems} activeKey="general" onSelect={onSelect} />);

    fireEvent.click(screen.getByText('About'));
    expect(onSelect).toHaveBeenCalledWith('about');
  });

  it('nav items rendered as button elements (native keyboard access)', () => {
    render(<SidebarNav items={defaultItems} activeKey="general" onSelect={() => {}} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(4);
    buttons.forEach((button) => {
      expect(button.getAttribute('type')).toBe('button');
    });
  });

  it('buttons have minimum 44px height', () => {
    render(<SidebarNav items={defaultItems} activeKey="general" onSelect={() => {}} />);

    const button = screen.getByText('General').closest('button');
    expect(button?.className).toContain('min-h-[44px]');
  });
});
