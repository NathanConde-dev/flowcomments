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
import { reconcileAutomationTriggerStats } from '@/lib/automation/stats';
import {
  DEFAULT_PAGE_SIZE,
  PaginationNav,
  parsePage,
} from '@/components/ui/pagination-nav';

export const dynamic = 'force-dynamic';

export default async function AutomationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const session = await readSession();
  if (!session.isLoggedIn) redirect('/login');

  const params = (await searchParams) || {};
  const page = parsePage(params.page);
  const pageSize = DEFAULT_PAGE_SIZE;
  const where = { userId: session.userId };
  const totalItems = await prisma.automation.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const automations = await prisma.automation.findMany({
    where,
    include: {
      igAccount: {
        select: {
          id: true,
          igUsername: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
  });

  const items: AutomationListItem[] = await Promise.all(
    automations.map(async (automation) => {
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

      // Heal inflated "disparos" from recovery retries of the same comment.
      const stats = await reconcileAutomationTriggerStats(automation.id);

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
        stats,
      };
    })
  );

  return (
    <PageShell className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Automações</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Gerencie fluxos de comentários e DMs
            {totalItems > 0 ? ` · ${totalItems} no total` : ''}
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
      {totalItems > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-white shadow-soft">
          <PaginationNav
            page={safePage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            basePath="/automations"
          />
        </div>
      )}
    </PageShell>
  );
}
