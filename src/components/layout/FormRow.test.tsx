import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { FormRow } from './FormRow';

describe('FormRow', () => {
  it('renders label and children', () => {
    render(
      <FormRow label="Test Label">
        <input type="text" data-testid="test-input" />
      </FormRow>
    );

    expect(screen.getByText('Test Label')).toBeTruthy();
    expect(screen.getByTestId('test-input')).toBeTruthy();
  });

  it('connects label and control via htmlFor', () => {
    render(
      <FormRow label="Email" htmlFor="email-input">
        <input id="email-input" type="email" />
      </FormRow>
    );

    const label = screen.getByText('Email');
    expect(label.getAttribute('for')).toBe('email-input');
  });

  it('shows description', () => {
    render(
      <FormRow label="Setting" description="This setting is important">
        <input type="text" />
      </FormRow>
    );

    expect(screen.getByText('This setting is important')).toBeTruthy();
  });

  it('works without description', () => {
    render(
      <FormRow label="Simple Setting">
        <input type="text" data-testid="simple-input" />
      </FormRow>
    );

    expect(screen.getByText('Simple Setting')).toBeTruthy();
    expect(screen.getByTestId('simple-input')).toBeTruthy();
  });

  it('has responsive layout classes', () => {
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
