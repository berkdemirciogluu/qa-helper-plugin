import type { Result } from './types';

export async function copyToClipboard(text: string): Promise<Result<void>> {
  try {
    await navigator.clipboard.writeText(text);
    return { success: true, data: undefined };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[Clipboard] copy failed:', error);
    return { success: false, error };
  }
}
