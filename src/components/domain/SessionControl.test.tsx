import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { SessionControl } from './SessionControl';

describe('SessionControl', () => {
  it('idle state: "Pasif" metni ve "Session Başlat" butonu gösterilir', () => {
    render(
      <SessionControl
        status="idle"
        elapsedSeconds={0}
        onStart={() => {}}
        onStop={() => {}}
      />,
    );
    expect(screen.getByText('Pasif')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Session başlat' })).toBeTruthy();
  });

  it('idle state: "Durdur" butonu gösterilmez', () => {
    render(
      <SessionControl
        status="idle"
        elapsedSeconds={0}
        onStart={() => {}}
        onStop={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Session durdur' })).toBeNull();
  });

  it('recording state: "Aktif" metni ve "Durdur" butonu gösterilir', () => {
    render(
      <SessionControl
        status="recording"
        elapsedSeconds={65}
        onStart={() => {}}
        onStop={() => {}}
      />,
    );
    expect(screen.getByText('Aktif')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Session durdur' })).toBeTruthy();
  });

  it('recording state: süre MM:SS formatında gösterilir', () => {
    render(
      <SessionControl
        status="recording"
        elapsedSeconds={65}
        onStart={() => {}}
        onStop={() => {}}
      />,
    );
    expect(screen.getByText('01:05')).toBeTruthy();
  });

  it('idle state: "Session Başlat" butonuna basınca onStart çağrılır', () => {
    const onStart = vi.fn();
    render(
      <SessionControl
        status="idle"
        elapsedSeconds={0}
        onStart={onStart}
        onStop={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Session başlat' }));
    expect(onStart).toHaveBeenCalled();
  });

  it('recording state: "Durdur" butonuna basınca onStop çağrılır', () => {
    const onStop = vi.fn();
    render(
      <SessionControl
        status="recording"
        elapsedSeconds={10}
        onStart={() => {}}
        onStop={onStop}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Session durdur' }));
    expect(onStop).toHaveBeenCalled();
  });

  it('00:00 formatı doğru: sıfır saniye', () => {
    render(
      <SessionControl
        status="recording"
        elapsedSeconds={0}
        onStart={() => {}}
        onStop={() => {}}
      />,
    );
    expect(screen.getByText('00:00')).toBeTruthy();
  });
});
