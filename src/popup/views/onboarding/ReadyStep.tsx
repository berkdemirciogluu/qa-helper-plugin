import { CheckCircle } from 'lucide-preact';

export function ReadyStep() {
  return (
    <div class="flex flex-col items-center justify-center h-full gap-4 py-8 text-center">
      <CheckCircle size={48} class="text-emerald-500" aria-hidden="true" />
      <div class="flex flex-col gap-2">
        <h3 class="text-lg font-semibold text-gray-900">Kurulum tamam!</h3>
        <p class="text-sm text-gray-500">İlk session'ınızı başlatın.</p>
      </div>
    </div>
  );
}
