import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { UserRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

async function formatDate(value: Date) {
  const locale = await getLocale();
  return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-BR' : 'en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(value);
}

export default async function AccountSettingsPage() {
  const session = await readSession();
  if (!session.isLoggedIn) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      username: true,
      email: true,
      isAdmin: true,
      createdAt: true,
      _count: {
        select: {
          instagramAccounts: true,
          automations: true,
        },
      },
    },
  });

  if (!user) {
    redirect('/login');
  }

  const initial = user.username[0]?.toUpperCase() || 'U';
  const memberSince = await formatDate(user.createdAt);

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5" />
            Sua conta
          </CardTitle>
          <CardDescription>
            Dados do usuário logado nesta instalação do Flowcomments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-lg font-semibold text-white">
                {initial}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-lg font-semibold tracking-tight text-foreground">
                    {user.username}
                  </p>
                  <StatusBadge tone={user.isAdmin ? 'success' : 'expired'} icon={false}>
                    {user.isAdmin ? 'Administrador' : 'Uuário'}
                  </StatusBadge>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {user.email || 'E-mail não informado'}
                </p>
              </div>
            </div>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-white p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Usuário
              </dt>
              <dd className="mt-1.5 text-sm font-semibold text-foreground">{user.username}</dd>
            </div>
            <div className="rounded-xl border border-border/70 bg-white p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                E-mail
              </dt>
              <dd className="mt-1.5 break-all text-sm font-semibold text-foreground">
                {user.email || '—'}
              </dd>
            </div>
            <div className="rounded-xl border border-border/70 bg-white p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Função
              </dt>
              <dd className="mt-1.5 text-sm font-semibold text-foreground">
                {user.isAdmin ? 'Administrador' : 'Uuário'}
              </dd>
            </div>
            <div className="rounded-xl border border-border/70 bg-white p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Conta criada em
              </dt>
              <dd className="mt-1.5 text-sm font-semibold text-foreground">
                {memberSince}
              </dd>
            </div>
            <div className="rounded-xl border border-border/70 bg-white p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Contas Instagram
              </dt>
              <dd className="mt-1.5 text-sm font-semibold text-foreground">
                {user._count.instagramAccounts}
              </dd>
            </div>
            <div className="rounded-xl border border-border/70 bg-white p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Automações
              </dt>
              <dd className="mt-1.5 text-sm font-semibold text-foreground">
                {user._count.automations}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sobre o Flowcomments</CardTitle>
          <CardDescription>Informações da instalação e da licença.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Versão:</span> 0.1.0
            </div>
            <div>
              <span className="font-medium">Licença:</span> Flowcomments Sustainable Use License
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-medium">Powered by Flowcomments</p>
              <p className="text-muted-foreground">© 2026 Nathan Condé</p>
              <p className="text-muted-foreground">
                Self-host sob a Sustainable Use License — uso próprio permitido; revender como SaaS
                concorrente é proibido. Atribuição “Powered by Flowcomments” deve permanecer visível.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/licenca" className="text-muted-foreground hover:underline">
                  Ver Licença
                </Link>
                <a
                  href="https://github.com/NathanConde-dev/flowcomments"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                >
                  ★ Star no GitHub
                </a>
                <a
                  href="https://flowcomments.com/donate"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-100"
                >
                  ♥ Doe para o projeto
                </a>
                <a
                  href="mailto:contato@nathanconde.com"
                  className="text-muted-foreground hover:underline"
                >
                  Contato
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
