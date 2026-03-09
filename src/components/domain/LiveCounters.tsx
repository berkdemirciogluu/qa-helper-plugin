interface LiveCountersProps {
  xhrRequests: number;
  consoleErrors: number;
  navEvents: number;
  clicks: number;
}

interface StatChipProps {
  value: number;
  label: string;
  isError?: boolean;
}

function StatChip({ value, label, isError = false }: StatChipProps) {
  return (
    <div class="flex-1 py-2 px-1 bg-gray-50 rounded-md border border-gray-100 text-center">
      <div class={`text-base font-bold ${isError ? 'text-red-500' : 'text-gray-900'}`}>{value}</div>
      <div class="text-[10px] text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

export function LiveCounters({ xhrRequests, consoleErrors, navEvents, clicks }: LiveCountersProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${xhrRequests} XHR, ${navEvents} sayfa, ${consoleErrors} hata, ${clicks} olay`}
      class="flex gap-2"
    >
      <StatChip value={xhrRequests} label="XHR" />
      <StatChip value={navEvents} label="Sayfa" />
      <StatChip value={consoleErrors} label="Error" isError={consoleErrors > 0} />
      <StatChip value={clicks} label="Olay" />
    </div>
  );
}
