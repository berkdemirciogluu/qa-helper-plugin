import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { FormRow } from './FormRow';

describe('FormRow', () => {
  it('label ve children render eder', () => {
    render(
      <FormRow label="Test Label">
        <input type="text" data-testid="test-input" />
      </FormRow>
    );

    expect(screen.getByText('Test Label')).toBeTruthy();
    expect(screen.getByTestId('test-input')).toBeTruthy();
  });

  it('htmlFor ile label-control bağlantısı kurar', () => {
    render(
      <FormRow label="Email" htmlFor="email-input">
        <input id="email-input" type="email" />
      </FormRow>
    );

    const label = screen.getByText('Email');
    expect(label.getAttribute('for')).toBe('email-input');
  });

  it('description gösterir', () => {
    render(
      <FormRow label="Ayar" description="Bu ayar önemli">
        <input type="text" />
      </FormRow>
    );

    expect(screen.getByText('Bu ayar önemli')).toBeTruthy();
  });

  it('description olmadan da çalışır', () => {
    render(
      <FormRow label="Basit Ayar">
        <input type="text" data-testid="simple-input" />
      </FormRow>
    );

    expect(screen.getByText('Basit Ayar')).toBeTruthy();
    expect(screen.getByTestId('simple-input')).toBeTruthy();
  });

  it('responsive layout class ları içerir', () => {
    const { container } = render(
      <FormRow label="Responsive">
        <input type="text" />
      </FormRow>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('md:flex-row');
    expect(wrapper.className).toContain('flex-col');
  });
});
