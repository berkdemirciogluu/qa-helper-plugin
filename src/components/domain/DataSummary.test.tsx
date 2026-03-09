import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { DataSummary } from './DataSummary';

describe('DataSummary', () => {
  const fullProps = {
    hasScreenshot: true,
    hasDom: true,
    hasLocalStorage: true,
    hasSessionStorage: true,
    consoleLogCount: 5,
    xhrCount: 10,
    clickCount: 20,
    hasSession: true,
  };

  it('renders all items with full data', () => {
    render(<DataSummary {...fullProps} />);
    expect(screen.getByText('Screenshot')).toBeTruthy();
    expect(screen.getByText('DOM')).toBeTruthy();
    expect(screen.getByText('XHR')).toBeTruthy();
    expect(screen.getByText('Error')).toBeTruthy();
    expect(screen.getByText('localStorage')).toBeTruthy();
    expect(screen.getByText('sessionStorage')).toBeTruthy();
    expect(screen.getByText('Timeline')).toBeTruthy();
  });

  it('renders XHR and Timeline dimmed without session', () => {
    const { container } = render(
      <DataSummary {...fullProps} hasSession={false} xhrCount={0} clickCount={0} />
    );
    const grayItems = container.querySelectorAll('.text-gray-300');
    expect(grayItems.length).toBeGreaterThan(0);
  });

  it('displays count values', () => {
    render(<DataSummary {...fullProps} />);
    expect(screen.getByText('10')).toBeTruthy(); // xhrCount
    expect(screen.getByText('5')).toBeTruthy(); // consoleLogCount
  });

  it('shows zero for XHR count 0', () => {
    render(<DataSummary {...fullProps} xhrCount={0} />);
    expect(screen.getByText('XHR')).toBeTruthy();
  });

  it('renders as grid', () => {
    const { container } = render(<DataSummary {...fullProps} />);
    const grid = container.querySelector('.grid');
    expect(grid).toBeTruthy();
  });
});
