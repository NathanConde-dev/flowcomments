import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getConversations(userId: string) {
  return prisma.conversation.findMany({
    where: { userId },
    include: {
      contact: {
        select: {
          igUsername: true,
          fullName: true,
        },
      },
      igAccount: {
        select: {
          igUsername: true,
        },
      },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 50,
  });
}

export default async function InboxPage() {
  const session = await requireAuth();
  const conversations = await getConversations(session.userId);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inbox</h1>
        <p className="text-gray-600">
          Conversas e mensagens recebidas
        </p>
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 rounded-full bg-primary-50 p-4">
              <MessageSquare className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Nenhuma conversa ainda</h3>
            <p className="text-center text-gray-600">
              Quando alguém enviar uma mensagem, aparecerá aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                    <MessageSquare className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">@{conversation.contact.igUsername}</p>
                      {conversation.unreadCount > 0 && (
                        <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs text-white">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    {conversation.contact.fullName && (
                      <p className="text-sm text-gray-600">{conversation.contact.fullName}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Via @{conversation.igAccount.igUsername}
                      {conversation.lastMessageAt && (
                        <> • {new Date(conversation.lastMessageAt).toLocaleDateString('pt-BR')}</>
                      )}
                    </p>
                  </div>
                  <div className={`text-sm ${conversation.status === 'open' ? 'text-green-600' : 'text-gray-500'}`}>
                    {conversation.status === 'open' ? 'Aberto' : 'Fechado'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
