import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { Modal } from './Modal';

describe('Modal', () => {
  it('does not render when isOpen=false', () => {
    render(
      <Modal isOpen={false} onClose={() => undefined} title="Test">
        <p>Content</p>
      </Modal>
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders when isOpen=true', () => {
    render(
      <Modal isOpen={true} onClose={() => undefined} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Test Modal')).toBeTruthy();
    expect(screen.getByText('Modal content')).toBeTruthy();
  });

  it('renders without title', () => {
    render(
      <Modal isOpen={true} onClose={() => undefined}>
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('closes with ESC key', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <button>Button</button>
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on overlay click', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has aria-modal="true" set', () => {
    render(
      <Modal isOpen={true} onClose={() => undefined} title="Test">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
  });
});
