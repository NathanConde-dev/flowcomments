import { AutomationBuilder } from '@/components/automations/builder/AutomationBuilder';

export default async function EditAutomationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AutomationBuilder automationId={id} />;
}
