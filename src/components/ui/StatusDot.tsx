type StatusDotVariant = 'active' | 'inactive' | 'error';

interface StatusDotProps {
  variant: StatusDotVariant;
}

const variantClasses: Record<StatusDotVariant, string> = {
  active: 'bg-emerald-500 animate-pulse motion-reduce:animate-none',
  inactive: 'bg-gray-400',
  error: 'bg-red-500',
};

export function StatusDot({ variant }: StatusDotProps) {
  return (
    <span
      class={['w-2 h-2 rounded-full inline-block shrink-0', variantClasses[variant]]
        .join(' ')}
      aria-hidden="true"
    />
  );
}
