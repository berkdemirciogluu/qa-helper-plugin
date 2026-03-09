import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { ReadyStep } from './ReadyStep';

describe('ReadyStep', () => {
  it('shows completion message', () => {
    render(<ReadyStep />);

    expect(screen.getByText('Setup complete!')).toBeTruthy();
  });

  it('shows session start guidance', () => {
    render(<ReadyStep />);

    expect(screen.getByText(/Start your first session/)).toBeTruthy();
  });

  it('CheckCircle icon is rendered', () => {
    const { container } = render(<ReadyStep />);

    // Lucide SVG icon rendered with aria-hidden
    const svg = container.querySelector('svg[aria-hidden="true"]');
    expect(svg).toBeTruthy();
  });
});
