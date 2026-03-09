import { useState, useEffect } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { Button } from '@/components/ui/Button';

export interface WizardStep {
  title: string;
  content: ComponentChildren;
  /** Son adımda Skip gizlenir */
  hideSkip?: boolean;
  /** Son adımda buton metni "Başla" olur */
  nextLabel?: string;
}

interface StepWizardProps {
  steps: WizardStep[];
  onComplete: () => void;
}

export function StepWizard({ steps, onComplete }: StepWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = steps.length;
  const step = steps[currentStep];
  const isLast = currentStep === totalSteps - 1;
  const nextLabel = step.nextLabel ?? (isLast ? 'Start' : 'Next');

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape' && !step.hideSkip) {
        e.preventDefault();
        handleSkip();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, steps]);

  function handleNext() {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  }

  function handleSkip() {
    if (!step.hideSkip) {
      if (isLast) {
        onComplete();
      } else {
        setCurrentStep((s) => s + 1);
      }
    }
  }

  return (
    <div class="flex flex-col h-full">
      {/* Progress indicator */}
      <div
        class="flex items-center justify-between px-4 py-3 border-b border-gray-100"
        role="progressbar"
        aria-valuenow={currentStep + 1}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Step ${currentStep + 1} / ${totalSteps}`}
      >
        <div class="flex items-center gap-2">
          {steps.map((s, i) => (
            <span
              key={s.title}
              class={[
                'w-2 h-2 rounded-full transition-colors',
                i <= currentStep ? 'bg-blue-600' : 'bg-gray-300',
              ].join(' ')}
              aria-hidden="true"
            />
          ))}
        </div>
        <span class="text-xs text-gray-500" aria-hidden="true">
          Step {currentStep + 1}/{totalSteps}
        </span>
      </div>

      {/* Step title */}
      <div class="px-4 pt-4 pb-2">
        <h2 class="text-base font-semibold text-gray-900">{step.title}</h2>
      </div>

      {/* Step content */}
      <div class="flex-1 overflow-y-auto px-4 py-2" aria-live="polite">
        {step.content}
      </div>

      {/* Footer */}
      <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        {!step.hideSkip ? (
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Skip
          </Button>
        ) : (
          <div />
        )}
        <Button variant="primary" size="sm" onClick={handleNext}>
          {nextLabel} →
        </Button>
      </div>
    </div>
  );
}
