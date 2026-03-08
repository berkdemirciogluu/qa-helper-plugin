import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { StepWizard } from './StepWizard';
import type { WizardStep } from './StepWizard';

const steps: WizardStep[] = [
  { title: 'Adım 1', content: <div>İçerik 1</div> },
  { title: 'Adım 2', content: <div>İçerik 2</div> },
  { title: 'Adım 3', content: <div>İçerik 3</div>, hideSkip: true, nextLabel: 'Başla' },
];

describe('StepWizard', () => {
  it('ilk adımı doğru render eder', () => {
    render(<StepWizard steps={steps} onComplete={vi.fn()} />);

    expect(screen.getByText('Adım 1')).toBeTruthy();
    expect(screen.getByText('İçerik 1')).toBeTruthy();
  });

  it('progress indicator doğru adım sayısını gösterir', () => {
    render(<StepWizard steps={steps} onComplete={vi.fn()} />);

    expect(screen.getByText('Adım 1/3')).toBeTruthy();
  });

  it('İleri butonuna tıklayınca sonraki adıma geçer', () => {
    render(<StepWizard steps={steps} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByText('İleri →'));

    expect(screen.getByText('Adım 2')).toBeTruthy();
    expect(screen.getByText('Adım 2/3')).toBeTruthy();
  });

  it('Atla butonuna tıklayınca sonraki adıma geçer', () => {
    render(<StepWizard steps={steps} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByText('Atla'));

    expect(screen.getByText('Adım 2')).toBeTruthy();
  });

  it('son adımda Başla butonu gösterilir', () => {
    render(<StepWizard steps={steps} onComplete={vi.fn()} />);

    // İleri iki kez tıkla, son adıma ulaş
    fireEvent.click(screen.getByText('İleri →'));
    fireEvent.click(screen.getByText('İleri →'));

    expect(screen.getByText('Başla →')).toBeTruthy();
  });

  it('son adımda Atla butonu gizlidir', () => {
    render(<StepWizard steps={steps} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByText('İleri →'));
    fireEvent.click(screen.getByText('İleri →'));

    expect(screen.queryByText('Atla')).toBeNull();
  });

  it('son adımda Başla tıklanınca onComplete çağrılır', () => {
    const onComplete = vi.fn();
    render(<StepWizard steps={steps} onComplete={onComplete} />);

    fireEvent.click(screen.getByText('İleri →'));
    fireEvent.click(screen.getByText('İleri →'));
    fireEvent.click(screen.getByText('Başla →'));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('klavye Enter tuşu ile sonraki adıma geçilir', () => {
    render(<StepWizard steps={steps} onComplete={vi.fn()} />);

    fireEvent.keyDown(document, { key: 'Enter' });

    expect(screen.getByText('Adım 2')).toBeTruthy();
  });
});
