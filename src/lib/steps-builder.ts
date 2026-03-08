import type { ClickEvent, NavEvent } from './types';

/**
 * Tıklama ve navigasyon olaylarından okunabilir adımlar oluşturur.
 * Tüm olaylar timestamp'e göre sıralanır.
 */
export function buildStepsToReproduce(clicks: ClickEvent[], navs: NavEvent[]): string {
  type AnyEvent = (ClickEvent | NavEvent) & { type: string };
  const events = ([...clicks, ...navs] as AnyEvent[]).sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  const steps: string[] = [];
  let stepNum = 1;

  for (const event of events) {
    if (event.type === 'nav') {
      const navEvent = event as NavEvent;
      steps.push(`${stepNum}. ${navEvent.url} sayfasına gidildi`);
    } else if (event.type === 'click') {
      const clickEvent = event as ClickEvent;
      const text =
        clickEvent.text.length > 50
          ? `${clickEvent.text.slice(0, 50)}...`
          : clickEvent.text;
      steps.push(`${stepNum}. '${text}' elementine tıklandı`);
    }
    stepNum++;
  }

  return steps.join('\n');
}
