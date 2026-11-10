'use client';

import { useEffect, useState } from 'use';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Circle, Sparkles } from 'lucide-react';

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
}

const templates: Template[] = [
  {
    id: '1',
    title: 'Resposta Automática',
    description: 'Responda automaticamente comentários com palavras-chave',
    category: 'Automação',
  },
  {
    id: '2',
    title: 'Boas-vindas por DM',
    description: 'Envie mensagem automática para novos seguidores',
    category: 'Engajamento',
  },
  {
    id: '3',
    title: 'FAQ Automático',
    description: 'Responda perguntas frequentes automaticamente',
    category: 'Suporte',
  },
];

const checklistItems = [
  { id: '1', title: 'Conectar conta do Instagram', href: '/settings/instagram', done: false },
  { id: '2', title: 'Configurar primeira automação', href: '/automations/new', done: false },
  { id: '3', title: 'Importar contatos', href: '/contacts', done: false },
];

export default function DashboardPage() {
  const [user, setUser] = useState<{ username: string } | null>(null);

  useEffect(() => {
    // Get user from session
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => setUser(data))
      .catch(() => {});
  }, []);

  return (
    <div className="p-8 space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">
          Olá, {user?.username || 'Admin'}! 👋
        </h1>
        <p className="mt-2 text-zinc-600">
          Bem-vindo ao Flowcomments. Comece automatizando suas interações no Instagram.
        </p>
      </div>

      {/* Getting Started Checklist */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-5 w-5 text-zinc-900" />
          <h2 className="text-lg font-semibold text-zinc-900">Primeiros Passos</h2>
        </div>
        <div className="space-y-3">
          {checklistItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 text-zinc-900 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-zinc-300 flex-shrink-0" />
              )}
              <span className="text-sm font-medium text-zinc-700">{item.title}</span>
            </a>
          ))}
        </div>
      </Card>

      {/* Templates Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900">Comece Aqui</h2>
          <Button variant="ghost" size="sm">Ver todos</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="space-y-3">
                <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  {template.category}
                </div>
                <h3 className="font-semibold text-zinc-900">{template.title}</h3>
                <p className="text-sm text-zinc-600">{template.description}</p>
                <Button variant="outline" size="sm" className="w-full mt-2">
                  Usar template
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
