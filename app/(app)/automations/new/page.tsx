import { Suspense } from 'react';
import { AutomationBuilder } from '@/components/automations/builder/AutomationBuilder';
import { AutomationBuilderSkeleton } from '@/components/ui/skeletons';

export default function NewAutomationPage() {
  return (
    <Suspense fallback={<AutomationBuilderSkeleton />}>
      <AutomationBuilder />
    </Suspense>
  );
}
