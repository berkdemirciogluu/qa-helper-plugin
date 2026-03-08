import { Check, X } from 'lucide-preact';

interface DataSummaryProps {
  hasScreenshot: boolean;
  hasDom: boolean;
  hasLocalStorage: boolean;
  hasSessionStorage: boolean;
  consoleLogCount: number;
  xhrCount: number;
  clickCount: number;
  hasSession: boolean;
}

interface SummaryItem {
  label: string;
  available: boolean;
  count?: number;
  sessionRequired?: boolean;
}

export function DataSummary({
  hasScreenshot,
  hasDom,
  hasLocalStorage,
  hasSessionStorage,
  consoleLogCount,
  xhrCount,
  clickCount,
  hasSession,
}: DataSummaryProps) {
  const items: SummaryItem[] = [
    { label: 'Screenshot', available: hasScreenshot },
    { label: 'DOM Snapshot', available: hasDom },
    {
      label: `Console Logs${consoleLogCount > 0 ? ` (${consoleLogCount})` : ''}`,
      available: true,
    },
    { label: 'localStorage', available: hasLocalStorage },
    { label: 'sessionStorage', available: hasSessionStorage },
    {
      label: `XHR${xhrCount > 0 ? ` (${xhrCount})` : ''}`,
      available: hasSession && xhrCount > 0,
      sessionRequired: true,
    },
    {
      label: `Timeline${clickCount > 0 ? ` (${clickCount} olay)` : ''}`,
      available: hasSession && clickCount > 0,
      sessionRequired: true,
    },
  ];

  return (
    <ul class="flex flex-col gap-1.5" aria-label="Toplanan veriler">
      {items.map((item) => {
        const isUnavailable = item.sessionRequired && !hasSession;
        const iconColor = isUnavailable
          ? 'text-gray-300'
          : item.available
            ? 'text-emerald-500'
            : 'text-gray-300';
        const textColor = isUnavailable ? 'text-gray-300' : 'text-gray-700';

        return (
          <li key={item.label} class={`flex items-center gap-1.5 text-sm ${textColor}`}>
            {isUnavailable ? (
              <X size={14} class={iconColor} aria-hidden="true" />
            ) : (
              <Check size={14} class={iconColor} aria-hidden="true" />
            )}
            {item.label}
          </li>
        );
      })}
    </ul>
  );
}
