import { signal } from '@preact/signals';
import { X } from 'lucide-preact';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
}

let nextId = 0;
export const toasts = signal<ToastItem[]>([]);

const AUTO_DISMISS_MS: Record<ToastVariant, number> = {
  success: 3000,
  info: 3000,
  warning: 5000,
  error: 5000,
};

const variantClasses: Record<ToastVariant, string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

function dismiss(id: number) {
  const timer = activeTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(id);
  }
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

const activeTimers = new Map<number, ReturnType<typeof setTimeout>>();

export function showToast(variant: ToastVariant, message: string) {
  const id = ++nextId;
  toasts.value = [...toasts.value, { id, variant, message }];
  const timer = setTimeout(() => {
    dismiss(id);
  }, AUTO_DISMISS_MS[variant]);
  activeTimers.set(id, timer);
}

function ToastItem({ item }: { item: ToastItem }) {
  const ariaLive = item.variant === 'error' ? 'assertive' : 'polite';

  return (
    <div
      role="alert"
      aria-live={ariaLive}
      class={[
        'flex items-start gap-2 px-3 py-2 rounded-md border text-sm shadow-sm',
        'animate-[slideInFromTop_0.2s_ease-out]',
        variantClasses[item.variant],
      ].join(' ')}
    >
      <span class="flex-1">{item.message}</span>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label="Bildirimi kapat"
        class="shrink-0 opacity-60 hover:opacity-100 transition-opacity focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const items = toasts.value;
  if (items.length === 0) return null;

  return (
    <div
      class="fixed top-2 left-2 right-2 z-50 flex flex-col gap-1.5"
      aria-label="Bildirimler"
    >
      {items.map((item) => (
        <ToastItem key={item.id} item={item} />
      ))}
    </div>
  );
}
