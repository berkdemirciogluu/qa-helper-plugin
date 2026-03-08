import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { Modal } from './Modal';

describe('Modal', () => {
  it('isOpen=false iken render edilmez', () => {
    render(
      <Modal isOpen={false} onClose={() => undefined} title="Test">
        <p>İçerik</p>
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('isOpen=true iken render edilir', () => {
    render(
      <Modal isOpen={true} onClose={() => undefined} title="Test Modal">
        <p>Modal içeriği</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Test Modal')).toBeTruthy();
    expect(screen.getByText('Modal içeriği')).toBeTruthy();
  });

  it('title olmadan render edilir', () => {
    render(
      <Modal isOpen={true} onClose={() => undefined}>
        <p>İçerik</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('ESC tuşu ile kapatılır', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <button>Buton</button>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('overlay tıklaması ile kapatılır', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>İçerik</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('aria-modal="true" set edilmiş', () => {
    render(
      <Modal isOpen={true} onClose={() => undefined} title="Test">
        <p>İçerik</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
  });
});
