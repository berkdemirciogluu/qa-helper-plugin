import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { ReadyStep } from './ReadyStep';

describe('ReadyStep', () => {
  it('tamamlanma mesajını gösterir', () => {
    render(<ReadyStep />);

    expect(screen.getByText('Kurulum tamam!')).toBeTruthy();
  });

  it('session başlatma yönlendirmesini gösterir', () => {
    render(<ReadyStep />);

    expect(screen.getByText(/İlk session'ınızı başlatın/)).toBeTruthy();
  });

  it('CheckCircle simgesi render edilir', () => {
    const { container } = render(<ReadyStep />);

    // Lucide SVG ikonu aria-hidden ile render edilir
    const svg = container.querySelector('svg[aria-hidden="true"]');
    expect(svg).toBeTruthy();
  });
});
