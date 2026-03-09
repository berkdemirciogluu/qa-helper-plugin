import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { LiveCounters } from './LiveCounters';

describe('LiveCounters', () => {
  it('renders zero values correctly', () => {
    render(<LiveCounters xhrRequests={0} consoleErrors={0} navEvents={0} clicks={0} />);
    expect(screen.getByText('XHR')).toBeTruthy();
    expect(screen.getByText('Error')).toBeTruthy();
    expect(screen.getByText('Page')).toBeTruthy();
    expect(screen.getByText('Event')).toBeTruthy();
  });

  it('displays numerical values in stat chips', () => {
    render(<LiveCounters xhrRequests={12} consoleErrors={3} navEvents={5} clicks={47} />);
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('47')).toBeTruthy();
  });

  it('applies red color when errors exist', () => {
    const { container } = render(
      <LiveCounters xhrRequests={5} consoleErrors={3} navEvents={1} clicks={10} />
    );
    const errorNum = container.querySelector('.text-red-500');
    expect(errorNum).toBeTruthy();
    expect(errorNum!.textContent).toBe('3');
  });

  it('does not apply red color when no errors', () => {
    const { container } = render(
      <LiveCounters xhrRequests={0} consoleErrors={0} navEvents={0} clicks={0} />
    );
    const errorNum = container.querySelector('.text-red-500');
    expect(errorNum).toBeNull();
  });

  it('has role="status" and aria-live="polite"', () => {
    render(<LiveCounters xhrRequests={0} consoleErrors={0} navEvents={0} clicks={0} />);
    const container = screen.getByRole('status');
    expect(container.getAttribute('aria-live')).toBe('polite');
  });
});
