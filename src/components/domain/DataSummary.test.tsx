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

  it('tam veri ile tüm öğeleri render eder', () => {
    render(<DataSummary {...fullProps} />);
    expect(screen.getByText('Screenshot')).toBeTruthy();
    expect(screen.getByText('DOM Snapshot')).toBeTruthy();
    expect(screen.getByText('Console Logs (5)')).toBeTruthy();
    expect(screen.getByText('localStorage')).toBeTruthy();
    expect(screen.getByText('sessionStorage')).toBeTruthy();
    expect(screen.getByText('XHR (10)')).toBeTruthy();
    expect(screen.getByText('Timeline (20 olay)')).toBeTruthy();
  });

  it("session'sız modda XHR ve Timeline xmark ile render edilir", () => {
    render(<DataSummary {...fullProps} hasSession={false} xhrCount={0} clickCount={0} />);
    // XHR ve Timeline öğeleri var ama soluk (text-gray-300)
    const items = screen.getAllByRole('listitem');
    const xhrItem = items.find((i) => i.textContent?.includes('XHR'));
    const timelineItem = items.find((i) => i.textContent?.includes('Timeline'));
    expect(xhrItem?.className).toContain('text-gray-300');
    expect(timelineItem?.className).toContain('text-gray-300');
  });

  it('consoleLogCount 0 ise parantez göstermez', () => {
    render(<DataSummary {...fullProps} consoleLogCount={0} />);
    expect(screen.getByText('Console Logs')).toBeTruthy();
  });

  it('XHR count 0 ise parantez göstermez', () => {
    render(<DataSummary {...fullProps} xhrCount={0} />);
    expect(screen.getByText('XHR')).toBeTruthy();
  });

  it('liste olarak render edilir', () => {
    render(<DataSummary {...fullProps} />);
    const list = screen.getByRole('list');
    expect(list).toBeTruthy();
  });
});
