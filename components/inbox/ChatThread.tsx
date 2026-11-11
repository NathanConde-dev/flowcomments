'use client';

import { useEffect, useRef } from 'react';
import { ArrowLeft, Instagram } from 'lucide-react';
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
                {conversation.contact.igUsername[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">@{conversation.contact.igUsername}</p>
            <p className="truncate text-xs text-muted-foreground">
              {conversation.status === 'open' ? 'Aberta' : 'Fechada'}
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

      <Composer conversationId={conversation.id} onSent={onRefresh} />
    </div>
  );
}
