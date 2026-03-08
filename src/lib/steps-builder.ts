import type { ClickEvent, NavEvent } from './types';

/**
 * Tıklama ve navigasyon olaylarından okunabilir adımlar oluşturur.
 * Tüm olaylar timestamp'e göre sıralanır.
 */
export function buildStepsToReproduce(clicks: ClickEvent[], navs: NavEvent[]): string {
  const events: (ClickEvent | NavEvent)[] = [...clicks, ...navs].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  const steps: string[] = [];
  let stepNum = 1;

  for (const event of events) {
    if (event.type === 'nav') {
      steps.push(`${stepNum}. ${event.url} sayfasına gidildi`);
    } else if (event.type === 'click') {
      const text =
        event.text.length > 50
          ? `${event.text.slice(0, 50)}...`
          : event.text;
      steps.push(`${stepNum}. '${text}' elementine tıklandı`);
    }
    stepNum++;
  }

  return steps.join('\n');
}
