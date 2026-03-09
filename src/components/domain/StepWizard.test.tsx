import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { StepWizard } from './StepWizard';
import type { WizardStep } from './StepWizard';

const steps: WizardStep[] = [
  { title: 'Step 1', content: <div>Content 1</div> },
  { title: 'Step 2', content: <div>Content 2</div> },
  { title: 'Step 3', content: <div>Content 3</div>, hideSkip: true, nextLabel: 'Start' },
];

describe('StepWizard', () => {
  it('renders first step correctly', () => {
    render(<StepWizard steps={steps} onComplete={vi.fn()} />);

    expect(screen.getByText('Step 1')).toBeTruthy();
    expect(screen.getByText('Content 1')).toBeTruthy();
  });

  it('progress indicator shows correct step count', () => {
    render(<StepWizard steps={steps} onComplete={vi.fn()} />);

    expect(screen.getByText('Step 1/3')).toBeTruthy();
  });

  it('navigates to next step when Next button clicked', () => {
    render(<StepWizard steps={steps} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByText('Next →'));

    expect(screen.getByText('Step 2')).toBeTruthy();
    expect(screen.getByText('Step 2/3')).toBeTruthy();
  });

  it('navigates to next step when Skip button clicked', () => {
    render(<StepWizard steps={steps} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByText('Skip'));

    expect(screen.getByText('Step 2')).toBeTruthy();
  });

  it('shows Start button on last step', () => {
    render(<StepWizard steps={steps} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Next →'));

    expect(screen.getByText('Start →')).toBeTruthy();
  });

  it('Skip button is hidden on last step', () => {
    render(<StepWizard steps={steps} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Next →'));

    expect(screen.queryByText('Skip')).toBeNull();
  });

  it('calls onComplete when Start clicked on last step', () => {
    const onComplete = vi.fn();
    render(<StepWizard steps={steps} onComplete={onComplete} />);

    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Start →'));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('navigates to next step with Enter key', () => {
    render(<StepWizard steps={steps} onComplete={vi.fn()} />);

    fireEvent.keyDown(document, { key: 'Enter' });

    expect(screen.getByText('Step 2')).toBeTruthy();
  });

  it('skips step with Escape key', () => {
    render(<StepWizard steps={steps} onComplete={vi.fn()} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.getByText('Step 2')).toBeTruthy();
  });

  it('Escape key does not work on last step (hideSkip)', () => {
    render(<StepWizard steps={steps} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('Next →'));

    // ESC key should not change step on last step
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.getByText('Step 3')).toBeTruthy();
  });
});
