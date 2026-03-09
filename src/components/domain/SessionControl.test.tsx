import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { SessionControl } from './SessionControl';

describe('SessionControl', () => {
  it('idle state: "Session Pasif" metni gösterilir', () => {
    render(
      <SessionControl status="idle" elapsedSeconds={0} onStart={() => {}} onStop={() => {}} />
    );
    expect(screen.getByText('Session Pasif')).toBeTruthy();
  });

  it('idle state: toggle switch OFF durumunda', () => {
    render(
      <SessionControl status="idle" elapsedSeconds={0} onStart={() => {}} onStop={() => {}} />
    );
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });

  it('recording state: "Session Aktif" metni ve süre gösterilir', () => {
    render(
      <SessionControl status="recording" elapsedSeconds={65} onStart={() => {}} onStop={() => {}} />
    );
    expect(screen.getByText(/Session Aktif/)).toBeTruthy();
    expect(screen.getByText('01:05')).toBeTruthy();
  });

  it('recording state: toggle switch ON durumunda', () => {
    render(
      <SessionControl status="recording" elapsedSeconds={10} onStart={() => {}} onStop={() => {}} />
    );
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('idle state: toggle ON yapınca onStart çağrılır', () => {
    const onStart = vi.fn();
    render(<SessionControl status="idle" elapsedSeconds={0} onStart={onStart} onStop={() => {}} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onStart).toHaveBeenCalled();
  });

  it('recording state: toggle OFF yapınca onStop çağrılır', () => {
    const onStop = vi.fn();
    render(
      <SessionControl status="recording" elapsedSeconds={10} onStart={() => {}} onStop={onStop} />
    );
    fireEvent.click(screen.getByRole('switch'));
    expect(onStop).toHaveBeenCalled();
  });

  it('00:00 formatı doğru: sıfır saniye', () => {
    render(
      <SessionControl status="recording" elapsedSeconds={0} onStart={() => {}} onStop={() => {}} />
    );
    expect(screen.getByText('00:00')).toBeTruthy();
  });
});
