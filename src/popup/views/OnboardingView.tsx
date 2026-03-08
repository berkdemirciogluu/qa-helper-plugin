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
    await storageSet(STORAGE_KEYS.ONBOARDING_COMPLETED, true);
    onboardingPulse.value = true;
    // 5 saniye sonra pulse otomatik kapanır
    setTimeout(() => {
      onboardingPulse.value = false;
    }, 5000);
    currentView.value = 'dashboard';
  }

  return (
    <div class="flex flex-col h-full fade-enter">
      <StepWizard steps={steps} onComplete={() => void handleComplete()} />
    </div>
  );
}
