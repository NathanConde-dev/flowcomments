import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PageShell } from '@/components/ui/motion';
import {
  AutomationsList,
  type AutomationListItem,
} from '@/components/automations/AutomationsList';

export const dynamic = 'force-dynamic';

async function getAutomations(userId: string) {
  return prisma.automation.findMany({
    where: { userId },
    include: {
      igAccount: {
        select: {
          id: true,
          igUsername: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export default async function AutomationsPage() {
  const session = await readSession();

  if (!session.isLoggedIn) {
    redirect('/login');
  }

  const automations = await getAutomations(session.userId);

  const items: AutomationListItem[] = automations.map((automation) => {
    let keywords: string[] = [];
    let mediaScope: 'specific' | 'any' = 'any';
    let mediaIds: string[] = [];

    try {
      const config = JSON.parse(automation.triggerConfig);
      const trigger = config.trigger || {};
      keywords = Array.isArray(trigger.keywords) ? trigger.keywords : [];
      mediaIds = Array.isArray(trigger.mediaIds) ? trigger.mediaIds : [];
      mediaScope =
        trigger.mediaScope || (mediaIds.length > 0 ? 'specific' : 'any');
    } catch {
      // keep defaults
    }

    return {
      id: automation.id,
      name: automation.name,
      isActive: automation.isActive,
      triggerType: automation.triggerType,
      igAccountId: automation.igAccount.id,
      igUsername: automation.igAccount.igUsername,
      keywords,
      mediaScope,
      mediaIds,
    };
  });

  return (
    <PageShell className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Automações</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Gerencie fluxos de comentários e DMs
          </p>
        </div>
        <Link href="/automations/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nova Automação
          </Button>
        </Link>
      </div>

      <AutomationsList initialItems={items} />
    </PageShell>
  );
}
