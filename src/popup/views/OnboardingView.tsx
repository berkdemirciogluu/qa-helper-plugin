import { StepWizard } from '@/components/domain/StepWizard';
import { storageSet } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';
import { currentView, onboardingPulse } from '../view-state';
import { EnvironmentStep } from './onboarding/EnvironmentStep';
import { JiraStep } from './onboarding/JiraStep';
import { ReadyStep } from './onboarding/ReadyStep';

const steps = [
  {
    title: 'Ortam Bilgisi',
    content: <EnvironmentStep />,
  },
  {
    title: 'Jira Bağlantısı',
    content: <JiraStep />,
  },
  {
    title: 'Hazır!',
    content: <ReadyStep />,
    hideSkip: true,
    nextLabel: 'Başla',
  },
];

export function OnboardingView() {
  async function handleComplete() {
    try {
      await storageSet(STORAGE_KEYS.ONBOARDING_COMPLETED, true);
    } catch {
      // Storage hatası — yine de dashboard'a geç
    }
    onboardingPulse.value = true;
    currentView.value = 'dashboard';
  }

  return (
    <div class="flex flex-col h-full fade-enter">
      <StepWizard steps={steps} onComplete={() => void handleComplete()} />
    </div>
  );
}
