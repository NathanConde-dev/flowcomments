import { readSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { PageShell } from '@/components/ui/motion';
import {
  DEFAULT_PAGE_SIZE,
  PaginationNav,
  parsePage,
} from '@/components/ui/pagination-nav';
import { ExportContactsButton } from '@/components/contacts/ExportContactsButton';
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

export default async function ContactsPage({
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
  const totalItems = await prisma.contact.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

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

  return (
    <PageShell className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Contatos</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Pessoas que interagiram com suas automações
            {totalItems > 0 ? ` · ${totalItems} no total` : ''}
          </p>
        </div>
        {totalItems > 0 && <ExportContactsButton />}
      </div>

      {contacts.length === 0 ? (
        <Card className="fc-scale-in">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-bold">Nenhum contato ainda</h3>
            <p className="text-center text-muted-foreground">
              Quando alguém interagir com suas automações, aparecerá aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="fc-stagger divide-y divide-border">
              {contacts.map((contact) => {
                const tags = parseTags(contact.tags);
                const fields = parseCustomData(contact.customData);
                return (
                  <div
                    key={contact.id}
                    className="flex flex-col gap-3 p-4 transition-colors duration-200 hover:bg-muted/70 sm:flex-row sm:items-start sm:gap-4"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                        {contact.profilePic ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={contact.profilePic}
                            alt={`@${contact.igUsername}`}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Users className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">@{contact.igUsername}</p>
                        {contact.fullName && (
                          <p className="text-sm text-muted-foreground">{contact.fullName}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Via @{contact.igAccount.igUsername}
                          {contact.lastSeenAt && (
                            <>
                              {' '}
                              · Última interação:{' '}
                              {formatBrasiliaDateTime(contact.lastSeenAt)}
                            </>
                          )}
                        </p>

                        {fields.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {fields.map(([key, value]) => (
                              <span
                                key={key}
                                className="inline-flex max-w-full items-center gap-1 rounded-lg border border-border bg-zinc-50 px-2 py-1 text-[11px] text-foreground"
                                title={`${key}: ${value}`}
                              >
                                <span className="font-semibold text-muted-foreground">{key}</span>
                                <span className="truncate">{value}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 sm:max-w-[220px] sm:justify-end">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-muted px-2 py-1 text-xs text-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <PaginationNav
              page={safePage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              basePath="/contacts"
            />
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
