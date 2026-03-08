import type { JSX } from 'preact';

interface InputProps extends Omit<JSX.HTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  htmlFor?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  type?: 'text' | 'password' | 'email' | 'url' | 'number';
}

export function Input({
  label,
  htmlFor,
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
  type = 'text',
  class: className,
  ...rest
}: InputProps) {
  const inputId = htmlFor ?? rest.id;
  const errorId = error && inputId ? `${inputId}-error` : undefined;

  return (
    <div class="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} class="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        {...rest}
        id={inputId}
        type={type}
        value={value}
        onInput={(e) => onChange((e.target as HTMLInputElement).value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-describedby={errorId}
        aria-invalid={error ? true : undefined}
        class={[
          'w-full rounded-md border px-3 min-h-[44px] text-sm transition-colors',
          'focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2',
          error
            ? 'border-red-500 bg-white text-gray-700'
            : 'border-gray-200 bg-white text-gray-700',
          disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : '',
          String(className ?? ''),
        ]
          .filter(Boolean)
          .join(' ')}
      />
      {error && (
        <p id={errorId} class="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
