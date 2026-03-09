import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { SessionControl } from './SessionControl';

describe('SessionControl', () => {
  it('idle state: shows "Session Inactive" text', () => {
    render(
      <SessionControl status="idle" elapsedSeconds={0} onStart={() => {}} onStop={() => {}} />
    );
    expect(screen.getByText('Session Inactive')).toBeTruthy();
  });

  it('idle state: toggle switch OFF durumunda', () => {
    render(
      <SessionControl status="idle" elapsedSeconds={0} onStart={() => {}} onStop={() => {}} />
    );
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });

  it('recording state: shows "Session Active" text and duration', () => {
    render(
      <SessionControl status="recording" elapsedSeconds={65} onStart={() => {}} onStop={() => {}} />
    );
    expect(screen.getByText(/Session Active/)).toBeTruthy();
    expect(screen.getByText('01:05')).toBeTruthy();
  });

  it('recording state: toggle switch ON durumunda', () => {
    render(
      <SessionControl status="recording" elapsedSeconds={10} onStart={() => {}} onStop={() => {}} />
    );
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('idle state: calls onStart when toggle ON', () => {
    const onStart = vi.fn();
    render(<SessionControl status="idle" elapsedSeconds={0} onStart={onStart} onStop={() => {}} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onStart).toHaveBeenCalled();
  });

  it('recording state: calls onStop when toggle OFF', () => {
    const onStop = vi.fn();
    render(
      <SessionControl status="recording" elapsedSeconds={10} onStart={() => {}} onStop={onStop} />
    );
    fireEvent.click(screen.getByRole('switch'));
    expect(onStop).toHaveBeenCalled();
  });

  it('00:00 format correct: zero seconds', () => {
    render(
      <SessionControl status="recording" elapsedSeconds={0} onStart={() => {}} onStop={() => {}} />
    );
    expect(screen.getByText('00:00')).toBeTruthy();
  });
});
