'use client';

import { useEffect, useRef } from 'react';
import { ArrowLeft, Instagram, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { contactDisplayName, contactInitial } from '@/lib/inbox/contacts';
import { toast } from '@/lib/ui/toast';
import { Composer } from './Composer';
import { ConversationToolbar } from './ConversationToolbar';
import { MessageBubble } from './MessageBubble';
import type { InboxConversationDetail } from './types';

export function ChatThread({
  conversation,
  sidebarOpen,
  onRefresh,
  onToggleSidebar,
  onBack,
}: {
  conversation: InboxConversationDetail | null;
  sidebarOpen: boolean;
  onRefresh: () => void;
  onToggleSidebar: () => void;
  onBack?: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.id, conversation?.messages.length]);

  if (!conversation) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-muted/20 p-8 text-center">
        <Instagram className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Selecione uma conversa</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe DMs, automações e responda direto pelo Instagram
        </p>
      </div>
    );
  }

  const isClosed = conversation.status === 'closed';

  const reopen = async () => {
    try {
      const res = await fetch(`/api/inbox/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'open' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao reabrir');
      toast.success('Conversa reaberta');
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao reabrir');
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#fafafa]">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted md:hidden"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
            {conversation.contact.profilePic ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={conversation.contact.profilePic}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                {contactInitial(conversation.contact)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{contactDisplayName(conversation.contact)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {isClosed ? 'Fechada' : 'Aberta'}
              {conversation.contact.automationPaused ? ' · automação pausada' : ''}
              {conversation.reminderAt ? ' · lembrete ativo' : ''}
            </p>
          </div>
        </div>
        <ConversationToolbar
          conversation={conversation}
          sidebarOpen={sidebarOpen}
          onRefresh={onRefresh}
          onToggleSidebar={onToggleSidebar}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
          <Instagram className="h-3.5 w-3.5" />
          Instagram · @{conversation.igAccount.igUsername}
        </div>
        {conversation.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>

      {isClosed && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/40 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Esta conversa está fechada. Reabra para continuar o atendimento ou envie uma resposta.
          </p>
          <Button type="button" variant="outline" onClick={() => void reopen()}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reabrir conversa
          </Button>
        </div>
      )}

      <Composer
        conversationId={conversation.id}
        conversationStatus={conversation.status}
        onSent={onRefresh}
      />
    </div>
  );
}
