import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Zap, Users, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

async function getDashboardStats(userId: string) {
  const [automations, contacts, messages, igAccounts] = await Promise.all([
    prisma.automation.count({
      where: { userId, isActive: true },
    }),
    prisma.contact.count({
      where: { userId },
    }),
    prisma.dmLog.count({
      where: { userId, status: 'sent' },
    }),
    prisma.instagramAccount.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        igUsername: true,
        lastSyncAt: true,
      },
    }),
  ]);

  return { automations, contacts, messages, igAccounts };
}

export default async function DashboardPage() {
  const session = await requireAuth();
  const stats = await getDashboardStats(session.userId);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Bem-vindo, {session.username}</p>
      </div>

      {stats.igAccounts.length === 0 && (
        <Card className="mb-8 border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <p className="mb-4 text-yellow-900">
              Você ainda não conectou nenhuma conta do Instagram. Conecte agora para começar a automatizar!
            </p>
            <Link href="/settings">
              <Button>Conectar Instagram</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Automações Ativas
            </CardTitle>
            <Zap className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.automations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Contatos
            </CardTitle>
            <Users className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contacts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Mensagens Enviadas
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.messages}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Contas Conectadas
            </CardTitle>
            <Activity className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.igAccounts.length}</div>
          </CardContent>
        </Card>
      </div>

      {stats.igAccounts.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Contas do Instagram</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.igAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                >
                  <div>
                    <p className="font-medium">@{account.igUsername}</p>
                    <p className="text-sm text-gray-500">
                      {account.lastSyncAt
                        ? `Última sincronização: ${new Date(account.lastSyncAt).toLocaleDateString('pt-BR')}`
                        : 'Nunca sincronizado'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/automations">
                      <Button variant="outline" size="sm">
                        Ver Automações
                      </Button>
                    </Link>
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
