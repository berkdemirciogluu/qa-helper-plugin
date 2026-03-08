import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { Input } from './Input';

describe('Input', () => {
  it('value ve placeholder ile render edilir', () => {
    render(<Input value="test" onChange={() => undefined} placeholder="Yazınız..." />);
    const input = screen.getByPlaceholderText('Yazınız...');
    expect(input).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe('test');
  });

  it('değişiklikte onChange çağrılır', () => {
    const onChange = vi.fn();
    render(<Input value="" onChange={onChange} placeholder="Giriş" />);
    const input = screen.getByPlaceholderText('Giriş');
    fireEvent.input(input, { target: { value: 'yeni değer' } });
    expect(onChange).toHaveBeenCalledWith('yeni değer');
  });

  it('label ile render edilir ve htmlFor bağlantısı doğru', () => {
    render(<Input label="İsim" htmlFor="name-input" value="" onChange={() => undefined} />);
    const label = screen.getByText('İsim');
    expect(label).toBeTruthy();
    expect(label.getAttribute('for')).toBe('name-input');
    const input = document.getElementById('name-input');
    expect(input).toBeTruthy();
  });

  it('disabled durumunda disabled attribute set edilir', () => {
    render(<Input value="test" onChange={() => undefined} disabled placeholder="test" />);
    const input = screen.getByPlaceholderText('test');
    expect((input as HTMLInputElement).disabled).toBe(true);
  });

  it('error durumunda hata mesajı gösterilir', () => {
    render(
      <Input value="" onChange={() => undefined} htmlFor="err-input" error="Bu alan zorunlu" />,
    );
    expect(screen.getByText('Bu alan zorunlu')).toBeTruthy();
    const input = document.getElementById('err-input');
    expect(input?.getAttribute('aria-invalid')).toBe('true');
    expect(input?.getAttribute('aria-describedby')).toBe('err-input-error');
  });

  it('error yokken aria-invalid set edilmez', () => {
    render(<Input value="" onChange={() => undefined} htmlFor="ok-input" />);
    const input = document.getElementById('ok-input');
    expect(input?.getAttribute('aria-invalid')).toBeNull();
  });
});
