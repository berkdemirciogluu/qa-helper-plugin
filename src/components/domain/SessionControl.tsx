import type { SessionStatus } from '@/lib/types';
import { StatusDot } from '@/components/ui/StatusDot';
import { Button } from '@/components/ui/Button';

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
  startPulse = false,
}: SessionControlProps) {
  const isRecording = status === 'recording';
  const dotVariant = isRecording ? 'active' : 'inactive';
  const statusLabel = isRecording ? 'Aktif' : 'Pasif';

  return (
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <StatusDot variant={dotVariant} />
        <span
          class="text-sm font-medium text-gray-700"
          aria-label={`Session durumu: ${statusLabel}`}
        >
          {statusLabel}
        </span>
        {isRecording && (
          <span
            class="text-sm text-gray-500 tabular-nums"
            aria-label={`Geçen süre: ${formatDuration(elapsedSeconds)}`}
          >
            {formatDuration(elapsedSeconds)}
          </span>
        )}
      </div>

      {isRecording ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onStop}
          loading={loading}
          aria-label="Session durdur"
        >
          Durdur
        </Button>
      ) : (
        <Button
          variant="primary"
          size="sm"
          onClick={onStart}
          loading={loading}
          aria-label="Session başlat"
          class={startPulse ? 'animate-pulse' : ''}
        >
          Session Başlat
        </Button>
      )}
    </div>
  );
}
