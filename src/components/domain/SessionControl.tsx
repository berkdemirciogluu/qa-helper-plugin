import type { SessionStatus } from '@/lib/types';
import { StatusDot } from '@/components/ui/StatusDot';
import { Toggle } from '@/components/ui/Toggle';

interface SessionControlProps {
  status: SessionStatus;
  elapsedSeconds: number;
  onStart: () => void;
  onStop: () => void;
  loading?: boolean;
  startPulse?: boolean;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function SessionControl({
  status,
  elapsedSeconds,
  onStart,
  onStop,
  loading = false,
}: SessionControlProps) {
  const isRecording = status === 'recording';
  const dotVariant = isRecording ? 'active' : 'inactive';

  function handleToggle(checked: boolean) {
    if (loading) return;
    if (checked) onStart();
    else onStop();
  }

  return (
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2.5">
        <StatusDot variant={dotVariant} />
        <span
          class="text-sm font-medium text-gray-700"
          aria-label={`Session durumu: ${isRecording ? 'Aktif' : 'Pasif'}`}
        >
          {isRecording ? (
            <>
              Session Aktif — <span class="tabular-nums">{formatDuration(elapsedSeconds)}</span>
            </>
          ) : (
            'Session Pasif'
          )}
        </span>
      </div>

      <Toggle
        checked={isRecording}
        onChange={handleToggle}
        label={isRecording ? 'Session durdur' : 'Session başlat'}
        disabled={loading}
        color="green"
      />
    </div>
  );
}
