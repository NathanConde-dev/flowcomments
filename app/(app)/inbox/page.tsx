import { readSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { PageShell } from '@/components/ui/motion';
import { ClosedBadge, OpenBadge } from '@/components/ui/status-badge';
import { InstagramDirectIcon } from '@/components/icons/InstagramDirectIcon';
import {
  DEFAULT_PAGE_SIZE,
  PaginationNav,
  parsePage,
} from '@/components/ui/pagination-nav';

export const dynamic = 'force-dynamic';

export default async function InboxPage({
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
  const totalItems = await prisma.conversation.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      contact: {
        select: {
          igUsername: true,
          fullName: true,
          profilePic: true,
        },
      },
      igAccount: {
        select: {
          igUsername: true,
        },
      },
    },
    orderBy: { lastMessageAt: 'desc' },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
  });

  return (
    <PageShell className="p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Inbox</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Conversas e mensagens recebidas
          {totalItems > 0 ? ` · ${totalItems} no total` : ''}
        </p>
      </div>

      {conversations.length === 0 ? (
        <Card className="fc-scale-in">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 rounded-full bg-muted p-4">
              <InstagramDirectIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-bold">Nenhuma conversa ainda</h3>
            <p className="text-center text-muted-foreground">
              Quando alguém enviar uma mensagem, aparecerá aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="fc-stagger divide-y divide-border">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="flex cursor-pointer items-center gap-4 p-4 transition-colors duration-200 hover:bg-muted/70"
                >
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-muted">
                    {conversation.contact.profilePic ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={conversation.contact.profilePic}
                        alt={`@${conversation.contact.igUsername}`}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <InstagramDirectIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">@{conversation.contact.igUsername}</p>
                      {conversation.unreadCount > 0 && (
                        <span className="rounded-full bg-black px-2 py-0.5 text-xs text-white">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    {conversation.contact.fullName && (
                      <p className="text-sm text-muted-foreground">
                        {conversation.contact.fullName}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Via @{conversation.igAccount.igUsername}
                      {conversation.lastMessageAt && (
                        <>
                          {' '}
                          ·{' '}
                          {new Date(conversation.lastMessageAt).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </>
                      )}
                    </p>
                  </div>
                  {conversation.status === 'open' ? <OpenBadge /> : <ClosedBadge />}
                </div>
              ))}
            </div>
            <PaginationNav
              page={safePage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              basePath="/inbox"
            />
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
