import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyToClipboard } from './clipboard';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('copyToClipboard', () => {
  it('copies text to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const result = await copyToClipboard('Test metin');

    expect(result.success).toBe(true);
    expect(writeText).toHaveBeenCalledWith('Test metin');
  });

  it('returns Result error when clipboard API fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Clipboard access denied'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const result = await copyToClipboard('Test');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Clipboard access denied');
    }
  });

  it('works with empty text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const result = await copyToClipboard('');

    expect(result.success).toBe(true);
    expect(writeText).toHaveBeenCalledWith('');
  });
});
