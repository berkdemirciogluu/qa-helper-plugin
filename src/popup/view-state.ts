import { signal } from '@preact/signals';

export type View = 'dashboard' | 'bugReport';

export const currentView = signal<View>('dashboard');
// Animasyon yönü: dashboard→bugReport='right', bugReport→dashboard='left'
export const slideDirection = signal<'right' | 'left'>('right');
