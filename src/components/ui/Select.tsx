import type { JSX } from 'preact';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<JSX.HTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  htmlFor?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function Select({
  label,
  htmlFor,
  options,
  value,
  onChange,
  disabled = false,
  class: className,
  ...rest
}: SelectProps) {
  const selectId = htmlFor ?? rest.id;

  return (
    <div class="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} class="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        {...rest}
        id={selectId}
        value={value}
        onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
        disabled={disabled}
        class={[
          'w-full rounded-md border border-gray-200 px-3 min-h-[44px] bg-white text-sm text-gray-700 transition-colors',
          'focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2',
          disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : '',
          String(className ?? ''),
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
