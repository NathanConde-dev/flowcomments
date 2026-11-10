import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Send, Sparkles, Check, Circle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

async function getDashboardData(userId: string) {
  const [user, automations, contacts, igAccounts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    }),
    prisma.automation.count({
      where: { userId, isActive: true },
    }),
    prisma.contact.count({
      where: { userId },
    }),
    prisma.instagramAccount.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        igUsername: true,
      },
    }),
  ]);

  return { user, automations, contacts, igAccounts };
}

export default async function DashboardPage() {
  const session = await requireAuth();
  const data = await getDashboardData(session.userId);

  const checklist = [
    {
      id: 'connect-instagram',
      label: 'Conectar conta do Instagram',
      completed: data.igAccounts.length > 0,
      href: '/settings',
    },
    {
      id: 'create-automation',
      label: 'Criar sua primeira automação',
      completed: data.automations > 0,
      href: '/automations',
    },
    {
      id: 'add-contact',
      label: 'Adicionar contatos',
      completed: data.contacts > 0,
      href: '/contacts',
    },
  ];

  const completedCount = checklist.filter((item) => item.completed).length;
  const progressPercent = Math.round((completedCount / checklist.length) * 100);

  const quickStartTemplates = [
    {
      id: 'comment-to-dm',
      title: 'Enviar link por DM a partir de comentários',
      description: 'Quando alguém comentar em uma publicação, envie automaticamente uma DM com link',
      badge: 'Popular',
      icon: MessageSquare,
    },
    {
      id: 'auto-reply-dm',
      title: 'Responder DMs automaticamente',
      description: 'Configure respostas automáticas para mensagens recebidas',
      badge: null,
      icon: Send,
    },
    {
      id: 'story-reply',
      title: 'Responder menções nos Stories',
      description: 'Automatize respostas quando mencionarem você nos Stories',
      badge: null,
      icon: Sparkles,
    },
  ];

  return (
    <div className="space-y-8 p-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-semibold text-neutral-900">
          Olá, {data.user?.username || session.username}!
        </h1>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase tracking-wide text-neutral-500">
              Canais Conectados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-neutral-900">{data.igAccounts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase tracking-wide text-neutral-500">
              Contatos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-neutral-900">{data.contacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase tracking-wide text-neutral-500">
              Automações Ativas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-neutral-900">{data.automations}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start Templates */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-neutral-900">Comece aqui</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickStartTemplates.map((template) => {
            const Icon = template.icon;
            return (
              <Card
                key={template.id}
                className="group cursor-pointer border border-neutral-200 transition-all hover:border-neutral-900 hover:shadow-md"
              >
                <CardHeader className="space-y-1">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 group-hover:bg-neutral-900">
                      <Icon className="h-5 w-5 text-neutral-700 group-hover:text-white" />
                    </div>
                    {template.badge && (
                      <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white">
                        {template.badge}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-base font-semibold text-neutral-900">
                    {template.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-600">{template.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="mt-4">
          <Link href="/automations">
            <Button variant="outline" className="border-neutral-300 text-neutral-700">
              Ver todos os modelos
            </Button>
          </Link>
        </div>
      </div>

      {/* Getting Started Checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-neutral-900">Primeiros passos</CardTitle>
            <span className="text-sm font-medium text-neutral-600">
              {completedCount} de {checklist.length}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full bg-neutral-900 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {checklist.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {item.completed ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                ) : (
                  <Circle className="h-5 w-5 text-neutral-300" />
                )}
                <span
                  className={item.completed ? 'text-neutral-500 line-through' : 'text-neutral-900'}
                >
                  {item.label}
                </span>
              </div>
              {!item.completed && (
                <Link href={item.href}>
                  <Button variant="ghost" size="sm" className="text-neutral-700">
                    Fazer agora
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
