import type { ComponentChildren, JSX } from 'preact';

type CardVariant = 'default' | 'elevated';

interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  children: ComponentChildren;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'border border-gray-200 bg-white',
  elevated: 'bg-white shadow-sm',
};

export function Card({ variant = 'default', children, class: className = '', ...rest }: CardProps) {
  return (
    <div
      {...rest}
      class={[
        'rounded-lg p-3 flex flex-col gap-2',
        variantClasses[variant],
        String(className),
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
