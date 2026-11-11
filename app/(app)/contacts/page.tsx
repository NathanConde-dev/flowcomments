import { readSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { PageShell } from '@/components/ui/motion';
import { Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getContacts(userId: string) {
  return prisma.contact.findMany({
    where: { userId },
    include: {
      igAccount: {
        select: {
          igUsername: true,
        },
      },
    },
    orderBy: { lastSeenAt: 'desc' },
    take: 50,
  });
}

export default async function ContactsPage() {
  const session = await readSession();

  if (!session.isLoggedIn) {
    redirect('/login');
  }
  const contacts = await getContacts(session.userId);

  return (
    <PageShell className="p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Contatos</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Pessoas que interagiram com suas automações
        </p>
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
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/70 transition-colors duration-200"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">@{contact.igUsername}</p>
                    {contact.fullName && (
                      <p className="text-sm text-muted-foreground">{contact.fullName}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Via @{contact.igAccount.igUsername}
                      {contact.lastSeenAt && (
                        <>
                          {' '}
                          • Última interação:{' '}
                          {new Date(contact.lastSeenAt).toLocaleDateString('pt-BR')}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex max-w-[220px] flex-col items-end gap-1">
                    {contact.tags && JSON.parse(contact.tags).length > 0 && (
                      <div className="flex flex-wrap justify-end gap-1">
                        {JSON.parse(contact.tags).map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className="rounded-full bg-muted px-2 py-1 text-xs text-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {contact.customData &&
                      Object.entries(JSON.parse(contact.customData) as Record<string, unknown>)
                        .filter(([key]) => !key.startsWith('_'))
                        .slice(0, 3)
                        .map(([key, value]) => (
                          <span key={key} className="truncate text-[11px] text-muted-foreground">
                            {key}: {String(value)}
                          </span>
                        ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
