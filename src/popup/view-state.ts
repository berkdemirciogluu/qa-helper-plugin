import { signal } from '@preact/signals';

export type View = 'dashboard' | 'bugReport' | 'onboarding';

export const currentView = signal<View>('dashboard');
// Animasyon yönü: dashboard→bugReport='right', bugReport→dashboard='left'
export const slideDirection = signal<'right' | 'left'>('right');
// Onboarding tamamlandıktan sonra dashboard'taki 'Session Başlat' butonunun pulse animasyonu
export const onboardingPulse = signal(false);
