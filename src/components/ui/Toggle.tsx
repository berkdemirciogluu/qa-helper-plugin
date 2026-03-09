import type { JSX } from 'preact';

type ToggleColor = 'blue' | 'green';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
  color?: ToggleColor;
}

const checkedColorClasses: Record<ToggleColor, string> = {
  blue: 'bg-blue-600',
  green: 'bg-green-500',
};

export function Toggle({ checked, onChange, label, disabled = false, id, color = 'blue' }: ToggleProps) {
  const handleClick = () => {
    if (!disabled) onChange(!checked);
  };

  const handleKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!disabled) onChange(!checked);
    }
  };

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      class={[
        'relative inline-flex w-9 h-5 rounded-full p-[2px] transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2',
        checked ? checkedColorClasses[color] : 'bg-gray-300',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ]
        .join(' ')}
    >
      <span
        class={[
          'inline-block w-4 h-4 rounded-full bg-white shadow transition-transform duration-150',
          checked ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}
