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
    { label: 'Screenshot', available: hasScreenshot, count: hasScreenshot ? 1 : 0 },
    { label: 'DOM', available: hasDom, count: hasDom ? 1 : 0 },
    {
      label: 'XHR',
      available: hasSession,
      count: xhrCount,
      sessionRequired: true,
    },
    {
      label: 'Error',
      available: true,
      count: consoleLogCount,
    },
    { label: 'localStorage', available: hasLocalStorage },
    { label: 'sessionStorage', available: hasSessionStorage },
    {
      label: 'Timeline',
      available: hasSession,
      count: clickCount > 0 ? clickCount : undefined,
      sessionRequired: true,
    },
  ];

  return (
    <div class="grid grid-cols-2 gap-1" aria-label="Toplanan veriler">
      {items.map((item) => {
        const isUnavailable = item.sessionRequired && !hasSession;
        const iconColor = isUnavailable
          ? 'text-gray-300'
          : item.available
            ? 'text-emerald-500'
            : 'text-gray-300';
        const textColor = isUnavailable ? 'text-gray-300' : '';

        return (
          <div key={item.label} class={`flex items-center gap-1 text-xs py-0.5 ${textColor}`}>
            {isUnavailable ? (
              <X size={12} class={iconColor} aria-hidden="true" />
            ) : (
              <Check size={12} class={iconColor} aria-hidden="true" />
            )}
            {item.count !== undefined && (
              <span class="font-semibold text-gray-700">{item.count}</span>
            )}
            <span class="text-gray-500">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
