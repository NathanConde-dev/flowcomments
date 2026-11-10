import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
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
  const session = await requireAuth();
  const contacts = await getContacts(session.userId);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Contatos</h1>
        <p className="text-gray-600">
          Pessoas que interagiram com suas automações
        </p>
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 rounded-full bg-primary-50 p-4">
              <Users className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Nenhum contato ainda</h3>
            <p className="text-center text-gray-600">
              Quando alguém interagir com suas automações, aparecerá aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                    <Users className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">@{contact.igUsername}</p>
                    {contact.fullName && (
                      <p className="text-sm text-gray-600">{contact.fullName}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Via @{contact.igAccount.igUsername}
                      {contact.lastSeenAt && (
                        <> • Última interação: {new Date(contact.lastSeenAt).toLocaleDateString('pt-BR')}</>
                      )}
                    </p>
                  </div>
                  {contact.tags && JSON.parse(contact.tags).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {JSON.parse(contact.tags).map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="rounded-full bg-primary-50 px-2 py-1 text-xs text-primary-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
