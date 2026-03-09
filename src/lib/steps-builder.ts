import type { ClickEvent, NavEvent } from './types';

/**
 * Builds readable steps from click and navigation events.
 * All events are sorted by timestamp.
 */
export function buildStepsToReproduce(clicks: ClickEvent[], navs: NavEvent[]): string {
  const events: (ClickEvent | NavEvent)[] = [...clicks, ...navs].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  const steps: string[] = [];
  let stepNum = 1;

  for (const event of events) {
    if (event.type === 'nav') {
      steps.push(`${stepNum}. Navigated to ${event.url}`);
    } else if (event.type === 'click') {
      const text =
        event.text.length > 50
          ? `${event.text.slice(0, 50)}...`
          : event.text;
      steps.push(`${stepNum}. Clicked '${text}' element`);
    }
    stepNum++;
  }

  return steps.join('\n');
}
