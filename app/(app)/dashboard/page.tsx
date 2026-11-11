'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageShell, Stagger } from '@/components/ui/motion';
import {
  Check,
  HelpCircle,
  ListTodo,
  MessageCircleReply,
  Send,
  type LucideIcon,
} from 'lucide-react';

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  href: string;
  icon: LucideIcon;
}

interface SetupStatus {
  username: string;
  metaConfigured: boolean;
  igConnected: boolean;
  hasAutomation: boolean;
  hasContacts: boolean;
}

const templates: Template[] = [
  {
    id: '1',
    title: 'Resposta Automática',
    description: 'Responda automaticamente comentários com palavras-chave',
    category: 'Automação',
    href: '/automations/new',
    icon: MessageCircleReply,
  },
  {
    id: '2',
    title: 'Boas-vindas por DM',
    description: 'Envie mensagem automática para novos seguidores',
    category: 'Engajamento',
    href: '/automations/new',
    icon: Send,
  },
  {
    id: '3',
    title: 'FAQ Automático',
    description: 'Responda perguntas frequentes automaticamente',
    category: 'Suporte',
    href: '/automations/new',
    icon: HelpCircle,
  },
];

export default function DashboardPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null);

  useEffect(() => {
    fetch('/api/settings/setup-status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStatus(data);
      })
      .catch(() => {});
  }, []);

  const checklistItems = [
    {
      id: 'meta',
      title: 'Configurar o App na Meta',
      description: 'App ID, App Secret e Webhook Verify Token no Meta for Developers',
      href: '/settings/meta',
      done: Boolean(status?.metaConfigured),
    },
    {
      id: 'instagram',
      title: 'Conectar conta do Instagram',
      description: status?.metaConfigured
        ? 'Autorize a conta e libere comentários e DMs'
        : 'Configure o Meta App antes de conectar',
      href: status?.metaConfigured ? '/settings/instagram' : '/settings/meta',
      done: Boolean(status?.igConnected),
    },
    {
      id: 'automation',
      title: 'Configurar primeira automação',
      description: 'Defina gatilho, resposta pública e DM',
      href: '/automations/new',
      done: Boolean(status?.hasAutomation),
    },
    {
      id: 'contacts',
      title: 'Importar contatos',
      description: 'Organize leads e tags das conversas',
      href: '/contacts',
      done: Boolean(status?.hasContacts),
    },
  ];

  const doneCount = checklistItems.filter((i) => i.done).length;

  return (
    <PageShell className="space-y-6 p-4 sm:space-y-8 sm:p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Olá, {status?.username || 'Admin'}
        </h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          Bem-vindo ao Flowcomments. Comece automatizando suas interações no Instagram.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-float">
        <div className="flex items-start justify-between gap-3 px-4 pb-4 pt-5 sm:gap-4 sm:px-6 sm:pt-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Primeiros passos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {doneCount}/{checklistItems.length} concluídos
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            <ListTodo className="h-3.5 w-3.5" />
            Setup
          </span>
        </div>

        <Stagger className="divide-y divide-border/70 border-t border-border/70">
          {checklistItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group flex items-start gap-3 px-4 py-4 transition-colors duration-200 hover:bg-muted/50 sm:px-6"
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
                  item.done
                    ? 'border-emerald-500/30 bg-emerald-500 text-white'
                    : 'border-zinc-300 bg-white text-transparent group-hover:border-zinc-400'
                }`}
                aria-hidden
              >
                <Check className="h-3 w-3" strokeWidth={2.5} />
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[15px] font-semibold tracking-tight ${
                    item.done ? 'text-muted-foreground line-through' : 'text-foreground'
                  }`}
                >
                  {item.title}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
              </div>
            </Link>
          ))}
        </Stagger>
      </section>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Comece Aqui</h2>
          <Link href="/automations">
            <Button variant="ghost" size="sm">
              Ver todos
            </Button>
          </Link>
        </div>
        <Stagger className="grid gap-4 md:grid-cols-3">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <Link key={template.id} href={template.href} className="block">
                <Card className="relative h-full cursor-pointer overflow-hidden p-6 fc-hover-lift">
                  <Icon
                    aria-hidden
                    strokeWidth={0.75}
                    className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 text-zinc-100"
                  />
                  <div className="relative space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {template.category}
                    </div>
                    <h3 className="font-bold text-foreground">{template.title}</h3>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                    <Button variant="outline" size="sm" className="mt-2 w-full">
                      Usar template
                    </Button>
                  </div>
                </Card>
              </Link>
            );
          })}
        </Stagger>
      </div>
    </PageShell>
  );
}
