import { readSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { PageShell } from '@/components/ui/motion';
import {
  DEFAULT_PAGE_SIZE,
  PaginationNav,
  parsePage,
} from '@/components/ui/pagination-nav';
import { ExportContactsButton } from '@/components/contacts/ExportContactsButton';
import { ContactsFilters } from '@/components/contacts/ContactsFilters';
import {
  ContactsBulkList,
  type ContactListItem,
} from '@/components/contacts/ContactsBulkList';
import { formatBrasiliaDateTime } from '@/lib/utils/datetime';
import { Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

function parseCustomData(raw: string | null) {
  if (!raw) return [] as Array<[string, string]>;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    return Object.entries(data)
      .filter(([key, value]) => !key.startsWith('_') && value != null && String(value).trim())
      .map(([key, value]) => [key, String(value)] as [string, string]);
  } catch {
    return [];
  }
}

function parseTags(raw: string | null) {
  if (!raw) return [] as string[];
  try {
    const tags = JSON.parse(raw) as unknown;
    return Array.isArray(tags) ? tags.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function firstParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() || '';
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string;
    q?: string;
    account?: string;
    automation?: string;
  }>;
}) {
  const session = await readSession();
  if (!session.isLoggedIn) redirect('/login');

  const params = (await searchParams) || {};
  const page = parsePage(params.page);
  const pageSize = DEFAULT_PAGE_SIZE;
  const q = firstParam(params.q);
  const account = firstParam(params.account);
  const automation = firstParam(params.automation);

  const [accounts, automationRows, livingAutomations] = await Promise.all([
    prisma.instagramAccount.findMany({
      where: { userId: session.userId },
      select: { id: true, igUsername: true },
      orderBy: { igUsername: 'asc' },
    }),
    prisma.contact.findMany({
      where: {
        userId: session.userId,
        sourceAutomationName: { not: null },
      },
      distinct: ['sourceAutomationName'],
      select: { sourceAutomationName: true },
      orderBy: { sourceAutomationName: 'asc' },
    }),
    prisma.automation.findMany({
      where: { userId: session.userId },
      select: { id: true },
    }),
  ]);

  const livingIds = livingAutomations.map((a) => a.id);
  const livingSet = new Set(livingIds);
  const automationNames = automationRows
    .map((row) => row.sourceAutomationName?.trim())
    .filter((name): name is string => Boolean(name));

  const where: Prisma.ContactWhereInput = {
    userId: session.userId,
  };

  if (q) {
    where.OR = [
      { igUsername: { contains: q, mode: 'insensitive' } },
      { fullName: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (account) {
    where.igAccountId = account;
  }

  if (automation === 'unknown') {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [{ sourceAutomationName: null }, { sourceAutomationName: '' }],
      },
    ];
  } else if (automation === 'removed') {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      { sourceAutomationId: { not: null } },
      livingIds.length > 0
        ? { sourceAutomationId: { notIn: livingIds } }
        : { sourceAutomationId: { not: null } },
    ];
  } else if (automation) {
    where.sourceAutomationName = automation;
  }

  const totalItems = await prisma.contact.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const hasFilters = Boolean(q || account || automation);

  const contacts = await prisma.contact.findMany({
    where,
    include: {
      igAccount: {
        select: { igUsername: true },
      },
    },
    orderBy: { lastSeenAt: 'desc' },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
  });

  const listItems: ContactListItem[] = contacts.map((contact) => ({
    id: contact.id,
    igUsername: contact.igUsername,
    fullName: contact.fullName,
    profilePic: contact.profilePic,
    accountUsername: contact.igAccount.igUsername,
    lastSeenLabel: contact.lastSeenAt
      ? formatBrasiliaDateTime(contact.lastSeenAt)
      : null,
    sourceName: contact.sourceAutomationName?.trim() || null,
    sourceRemoved:
      Boolean(contact.sourceAutomationId) &&
      !livingSet.has(contact.sourceAutomationId!),
    lastName: contact.lastAutomationName?.trim() || null,
    tags: parseTags(contact.tags),
    fields: parseCustomData(contact.customData),
  }));

  const filterQuery = {
    q: q || undefined,
    account: account || undefined,
    automation: automation || undefined,
  };

  return (
    <PageShell className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Contatos</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Pessoas que interagiram com suas automações
            {totalItems > 0
              ? hasFilters
                ? ` · ${totalItems} encontrado${totalItems === 1 ? '' : 's'}`
                : ` · ${totalItems} no total`
              : ''}
          </p>
        </div>
        <ExportContactsButton />
      </div>

      <div className="mb-4">
        <ContactsFilters
          values={{ q, account, automation }}
          accounts={accounts}
          automations={automationNames}
        />
      </div>

      {contacts.length === 0 ? (
        <Card className="fc-scale-in">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-bold">
              {hasFilters ? 'Nenhum contato encontrado' : 'Nenhum contato ainda'}
            </h3>
            <p className="text-center text-muted-foreground">
              {hasFilters
                ? 'Ajuste a busca ou os filtros e tente de novo'
                : 'Quando alguém interagir com suas automações, aparecerá aqui'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <ContactsBulkList
              key={`${q}|${account}|${automation}|${safePage}`}
              contacts={listItems}
            />
            <PaginationNav
              page={safePage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              basePath="/contacts"
              query={filterQuery}
            />
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
