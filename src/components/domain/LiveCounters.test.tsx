import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { LiveCounters } from './LiveCounters';

describe('LiveCounters', () => {
  it('sıfır değerler doğru render', () => {
    render(<LiveCounters xhrRequests={0} consoleErrors={0} navEvents={0} />);
    expect(screen.getByText('0 XHR')).toBeTruthy();
    expect(screen.getByText('0 Error')).toBeTruthy();
    expect(screen.getByText('0 Sayfa')).toBeTruthy();
  });

  it('XHR sayısı render', () => {
    render(<LiveCounters xhrRequests={12} consoleErrors={0} navEvents={3} />);
    expect(screen.getByText('12 XHR')).toBeTruthy();
    expect(screen.getByText('3 Sayfa')).toBeTruthy();
  });

  it('hata varsa Badge ile kırmızı gösterilir', () => {
    render(<LiveCounters xhrRequests={5} consoleErrors={3} navEvents={1} />);
    expect(screen.getByText('3 Error')).toBeTruthy();
    const badge = document.querySelector('.bg-red-100');
    expect(badge).toBeTruthy();
  });

  it('hata yokken düz text gösterilir (Badge yok)', () => {
    render(<LiveCounters xhrRequests={0} consoleErrors={0} navEvents={0} />);
    const badge = document.querySelector('.bg-red-100');
    expect(badge).toBeNull();
  });

  it('role="status" ve aria-live="polite" var', () => {
    render(<LiveCounters xhrRequests={0} consoleErrors={0} navEvents={0} />);
    const container = screen.getByRole('status');
    expect(container.getAttribute('aria-live')).toBe('polite');
  });
});
