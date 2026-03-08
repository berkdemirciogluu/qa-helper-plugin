import type { ComponentChildren } from 'preact';
import { useId } from 'preact/hooks';

interface SectionGroupProps {
  title: string;
  description?: string;
  children: ComponentChildren;
}

export function SectionGroup({ title, description, children }: SectionGroupProps) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} class="mb-6">
      <h2 id={titleId} class="text-lg font-semibold text-gray-900 mb-1">
        {title}
      </h2>
      {description && (
        <p class="text-sm text-gray-500 mb-4">{description}</p>
      )}
      <div class="flex flex-col gap-3">
        {children}
      </div>
    </section>
  );
}
