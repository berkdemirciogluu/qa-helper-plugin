import { Badge } from '@/components/ui/Badge';

interface LiveCountersProps {
  xhrRequests: number;
  consoleErrors: number;
  navEvents: number;
}

export function LiveCounters({ xhrRequests, consoleErrors, navEvents }: LiveCountersProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${xhrRequests} XHR, ${consoleErrors} hata, ${navEvents} sayfa`}
      class="flex items-center gap-1.5 text-sm text-gray-600"
    >
      <span>{xhrRequests} XHR</span>
      <span aria-hidden="true" class="text-gray-400">·</span>
      {consoleErrors > 0 ? (
        <Badge variant="error">{consoleErrors} Error</Badge>
      ) : (
        <span>0 Error</span>
      )}
      <span aria-hidden="true" class="text-gray-400">·</span>
      <span>{navEvents} Sayfa</span>
    </div>
  );
}
