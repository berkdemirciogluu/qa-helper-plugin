import type { ComponentChildren } from 'preact';

interface FormRowProps {
  label: string;
  htmlFor?: string;
  description?: string;
  children: ComponentChildren;
}

export function FormRow({ label, htmlFor, description, children }: FormRowProps) {
  return (
    <div class="flex flex-col gap-1 md:flex-row md:items-center md:gap-4 py-2">
      <div class="md:w-[160px] md:flex-shrink-0">
        <label
          htmlFor={htmlFor}
          class="text-sm font-medium text-gray-700"
        >
          {label}
        </label>
        {description && (
          <p class="text-xs text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <div class="flex-1">
        {children}
      </div>
    </div>
  );
}
