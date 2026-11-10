'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Zap, MessageSquare, Send, Sparkles, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const templates = [
  {
    id: 'comment-to-dm',
    title: 'Enviar links automaticamente por DM a partir dos comentários',
    description: 'Envie um link sempre que alguém comentar em uma publicação ou reel',
    category: 'Recomendados',
    badge: 'Popular',
    icon: MessageSquare,
  },
  {
    id: 'story-leads',
    title: 'Gere leads com stories',
    description: 'Aproveite ofertas exclusivas nos Stories para transformar todos em clientes',
    category: 'Recomendados',
    icon: Sparkles,
  },
  {
    id: 'auto-reply-dm',
    title: 'Responda todas as suas DMs',
    description: 'Envie respostas automaticamente quando alguém te enviar uma DM',
    category: 'Recomendados',
    icon: Send,
  },
  {
    id: 'comment-post',
    title: 'Comentário na publicação',
    description: 'Ative quando alguém comentar em uma publicação específica',
    category: 'Por gatilho',
    icon: MessageSquare,
  },
  {
    id: 'dm-trigger',
    title: 'DM',
    description: 'Ative quando alguém enviar uma mensagem direta',
    category: 'Por gatilho',
    icon: Send,
  },
  {
    id: 'story-reply',
    title: 'Resposta ao story',
    description: 'Ative quando alguém responder ao seu story',
    category: 'Por gatilho',
    icon: Sparkles,
  },
];

export default function AutomationsPage() {
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos os modelos');

  const categories = [
    'Todos os modelos',
    'Recomendados',
    'Por objetivo',
    'Por gatilho',
  ];

  const filteredTemplates =
    selectedCategory === 'Todos os modelos'
      ? templates
      : templates.filter((t) => t.category === selectedCategory);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Automações</h1>
        <Button
          onClick={() => setShowTemplates(true)}
          className="bg-neutral-900 hover:bg-neutral-800"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Automação
        </Button>
      </div>

      {/* Empty State */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
            <Zap className="h-8 w-8 text-neutral-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-neutral-900">
            Crie sua primeira automação
          </h3>
          <p className="mb-6 max-w-md text-sm text-neutral-600">
            A funcionalidade de Automação é onde você cria fluxos de conversa visual usando uma interface de arrastar e soltar. Experimente algumas automações rápidas e fáceis para deixar sua conta crescer.
          </p>
          <Button
            onClick={() => setShowTemplates(true)}
            className="bg-neutral-900 hover:bg-neutral-800"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Automação
          </Button>
        </CardContent>
      </Card>

      {/* Templates Modal */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Modelos</DialogTitle>
            <DialogDescription>
              Escolha um modelo para começar ou crie do zero
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {/* Category Pills */}
            <div className="mb-6 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                    selectedCategory === category
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400'
                  )}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Templates Grid */}
            <div className="grid max-h-96 gap-4 overflow-y-auto md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <Card
                    key={template.id}
                    className="group cursor-pointer border border-neutral-200 transition-all hover:border-neutral-900 hover:shadow-md"
                  >
                    <CardHeader className="space-y-2">
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
                      <CardTitle className="text-sm font-semibold text-neutral-900">
                        {template.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-neutral-600">{template.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Start from Scratch */}
            <div className="mt-6 border-t border-neutral-200 pt-6">
              <button className="flex w-full items-center justify-between rounded-lg border border-neutral-200 p-4 transition-all hover:border-neutral-900 hover:bg-neutral-50">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
                    <FileText className="h-5 w-5 text-neutral-700" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-neutral-900">Começar do zero</p>
                    <p className="text-sm text-neutral-600">
                      Crie uma automação personalizada sem usar modelo
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
