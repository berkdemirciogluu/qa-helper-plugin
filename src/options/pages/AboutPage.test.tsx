import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { AboutPage } from './AboutPage';

vi.stubGlobal('chrome', {
  runtime: {
    getManifest: vi.fn(() => ({ version: '1.2.3' })),
  },
});

describe('AboutPage', () => {
  it('shows extension version', () => {
    render(<AboutPage />);

    expect(screen.getByText('Version: 1.2.3')).toBeTruthy();
  });

  it('shows developer info', () => {
    render(<AboutPage />);

    expect(screen.getByText(/Developer:/)).toBeTruthy();
  });

  it('shows license status', () => {
    render(<AboutPage />);

    expect(screen.getByText(/Free/)).toBeTruthy();
  });

  it('shows app name', () => {
    render(<AboutPage />);

    expect(screen.getByText('QA Helper')).toBeTruthy();
  });

  it('shows description text', () => {
    render(<AboutPage />);

    expect(screen.getByText(/bug reporting and data collection/)).toBeTruthy();
  });

  it('uses semantic section elements', () => {
    const { container } = render(<AboutPage />);

    const sections = container.querySelectorAll('section');
    expect(sections.length).toBe(2);
  });
});
