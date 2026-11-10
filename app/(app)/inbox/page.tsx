import { requireAuth } from '@/lib/auth/session';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const session = await requireAuth();

  // TODO: Fetch conversations from database
  const conversations: any[] = [];

  return (
    <div className="flex h-full">
      {/* Conversations List */}
      <aside className="w-80 border-r border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 p-4">
          <h2 className="font-semibold text-neutral-900">Todas as conversas</h2>
          <p className="text-sm text-neutral-500">0 conversas</p>
        </div>
        <div className="overflow-y-auto">
          {conversations.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-neutral-500">Nenhuma conversa</p>
            </div>
          )}
        </div>
      </aside>

      {/* Empty State */}
      <div className="flex flex-1 items-center justify-center bg-neutral-50">
        <div className="max-w-md text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100">
              <MessageSquare className="h-10 w-10 text-neutral-400" />
            </div>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-neutral-900">
            Este é um espaço para conversar com seus contatos de todos os canais conectados
          </h3>
          <p className="mb-6 text-sm text-neutral-600">
            Toda mensagem que você receber será exibida aqui. Você pode fazer ajustes nas Configurações da caixa de entrada.
          </p>
          <Link href="/settings">
            <Button className="bg-neutral-900 hover:bg-neutral-800">
              Ir para as Configurações da Caixa de Entrada
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
