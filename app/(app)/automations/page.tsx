import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Zap } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PageShell, Stagger } from '@/components/ui/motion';
import { ActiveBadge, PausedBadge } from '@/components/ui/status-badge';

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

      {automations.length === 0 ? (
        <Card className="border-dashed fc-scale-in">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-2xl bg-muted p-4 ring-1 ring-border">
              <Zap className="h-8 w-8 text-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-foreground">Nenhuma automação criada</h3>
            <p className="mb-6 max-w-md text-center text-muted-foreground">
              Monte um fluxo visual com gatilho, resposta e DM, sem formulário seco.
            </p>
            <Link href="/automations/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Criar primeira automação
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Stagger className="space-y-3">
          {automations.map((automation) => {
            const config = JSON.parse(automation.triggerConfig);
            const keywords = config.trigger?.keywords || [];

            return (
              <Card key={automation.id} className="fc-hover-lift">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                        <span className="truncate">{automation.name}</span>
                        {automation.isActive ? <ActiveBadge /> : <PausedBadge />}
                      </CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
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
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="font-semibold text-foreground">Gatilho: </span>
                      <span className="text-muted-foreground">
                        {automation.triggerType === 'comment' && 'Comentário'}
                      </span>
                    </div>
                    {keywords.length > 0 && (
                      <div>
                        <span className="text-sm font-semibold text-foreground">
                          Palavras-chave
                        </span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {keywords.slice(0, 5).map((keyword: string, idx: number) => (
                            <span
                              key={idx}
                              className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 ring-1 ring-primary-100"
                            >
                              {keyword}
                            </span>
                          ))}
                          {keywords.length > 5 && (
                            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
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
        </Stagger>
      )}
    </PageShell>
  );
}
