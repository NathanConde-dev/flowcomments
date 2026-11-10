import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Play, Pause } from 'lucide-react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getAutomations(userId: string) {
  return prisma.automation.findMany({
    where: { userId },
    include: {
      igAccount: {
        select: {
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

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Automações</h1>
          <p className="text-gray-600">
            Gerencie suas automações de comentários e DMs
          </p>
        </div>
        <Link href="/automations/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Automação
          </Button>
        </Link>
      </div>

      {automations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 rounded-full bg-zinc-50 p-4">
              <Play className="h-8 w-8 text-zinc-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Nenhuma automação criada</h3>
            <p className="mb-4 text-center text-gray-600">
              Crie sua primeira automação para responder comentários automaticamente
            </p>
            <Link href="/automations/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Automação
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {automations.map((automation) => {
            const config = JSON.parse(automation.triggerConfig);
            const keywords = config.trigger?.keywords || [];

            return (
              <Card key={automation.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {automation.name}
                        {automation.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                            <Play className="h-3 w-3" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                            <Pause className="h-3 w-3" />
                            Pausado
                          </span>
                        )}
                      </CardTitle>
                      <p className="mt-1 text-sm text-gray-500">
                        @{automation.igAccount.igUsername}
                      </p>
                    </div>
                    <Link href={`/automations/${automation.id}`}>
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Gatilho:{' '}
                      </span>
                      <span className="text-sm text-gray-600">
                        {automation.triggerType === 'comment' && 'Comentário'}
                      </span>
                    </div>
                    {keywords.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          Palavras-chave:{' '}
                        </span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {keywords.slice(0, 5).map((keyword: string, idx: number) => (
                            <span
                              key={idx}
                              className="rounded-full bg-zinc-50 px-2 py-1 text-xs text-zinc-700"
                            >
                              {keyword}
                            </span>
                          ))}
                          {keywords.length > 5 && (
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                              +{keywords.length - 5}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
