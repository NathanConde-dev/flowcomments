'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CheckCheck,
  Clock3,
  ContactRound,
  MessageCircleMore,
  Pause,
  Play,
  Tag,
} from 'lucide-react';
import { WithTooltip } from '@/components/ui/tooltip';
import { toast } from '@/lib/ui/toast';
import type { InboxConversationDetail } from './types';

const REMINDERS = [
  { label: '20 minutos', ms: 20 * 60 * 1000 },
  { label: '1 hora', ms: 60 * 60 * 1000 },
  { label: '6 horas', ms: 6 * 60 * 60 * 1000 },
  { label: '12 horas', ms: 12 * 60 * 60 * 1000 },
];

export function ConversationToolbar({
  conversation,
  sidebarOpen,
  onRefresh,
  onToggleSidebar,
}: {
  conversation: InboxConversationDetail;
  sidebarOpen: boolean;
  onRefresh: () => void;
  onToggleSidebar: () => void;
}) {
  const [tagsOpen, setTagsOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setTagsOpen(false);
        setRemindOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const patchConversation = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/inbox/conversations/${conversation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erro');
    onRefresh();
  };

  const patchContact = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/inbox/contacts/${conversation.contact.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, conversationId: conversation.id }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erro');
    onRefresh();
  };

  const run = async (fn: () => Promise<void>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  return (
    <div ref={rootRef} className="relative flex items-center gap-1">
      <div className="relative">
        <IconBtn title="Gerenciar legendas" onClick={() => { setTagsOpen((v) => !v); setRemindOpen(false); }}>
          <Tag className="h-4 w-4" />
        </IconBtn>
        {tagsOpen && (
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-border bg-white p-3 shadow-lg">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Gerenciar legendas</p>
            <div className="mb-2 flex flex-wrap gap-1">
              {conversation.contact.tags.length === 0 && (
                <span className="text-xs text-muted-foreground">Nenhuma tag</span>
              )}
              {conversation.contact.tags.map((tag) => (
                <WithTooltip key={tag} label="Remover tag">
                  <button
                    type="button"
                    className="rounded-full bg-muted px-2 py-0.5 text-xs hover:bg-red-50 hover:text-red-700"
                    onClick={() => void run(() => patchContact({ removeTag: tag }))}
                  >
                    {tag} ×
                  </button>
                </WithTooltip>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Nova legenda"
                className="h-8 flex-1 rounded-lg border border-border px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                className="rounded-lg bg-black px-2 text-xs text-white"
                onClick={() => {
                  if (!newTag.trim()) return;
                  void run(async () => {
                    await patchContact({ addTag: newTag.trim() });
                    setNewTag('');
                  }, 'Tag adicionada');
                }}
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="mt-2 text-xs text-sky-700 hover:underline"
              onClick={() =>
                void run(
                  () => patchConversation({ isFavorite: !conversation.isFavorite }),
                  conversation.isFavorite ? 'Removido dos favoritos' : 'Favorito'
                )
              }
            >
              {conversation.isFavorite ? 'Remover dos Favoritos' : '★ Favoritos'}
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <IconBtn title="Lembrar em" onClick={() => { setRemindOpen((v) => !v); setTagsOpen(false); }}>
          <Clock3 className="h-4 w-4" />
        </IconBtn>
        {remindOpen && (
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-border bg-white p-2 shadow-lg">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Lembrar em</p>
            {REMINDERS.map((item) => (
              <button
                key={item.label}
                type="button"
                className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  const at = new Date(Date.now() + item.ms).toISOString();
                  void run(() => patchConversation({ reminderAt: at }), `Lembrete: ${item.label}`);
                  setRemindOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              className="mt-1 block w-full rounded-lg px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
              onClick={() => {
                void run(() => patchConversation({ reminderAt: null }), 'Lembrete removido');
                setRemindOpen(false);
              }}
            >
              Limpar lembrete
            </button>
          </div>
        )}
      </div>

      <IconBtn
        title={conversation.status === 'open' ? 'Marcar como fechada' : 'Reabrir conversa'}
        onClick={() =>
          void run(
            () =>
              patchConversation({
                status: conversation.status === 'open' ? 'closed' : 'open',
              }),
            conversation.status === 'open' ? 'Conversa fechada' : 'Conversa reaberta'
          )
        }
      >
        <CheckCheck className="h-4 w-4" />
      </IconBtn>

      <IconBtn
        title="Marcar como não lida"
        onClick={() => void run(() => patchConversation({ markUnread: true }), 'Marcada como não lida')}
      >
        <MessageCircleMore className="h-4 w-4" />
      </IconBtn>

      <IconBtn
        title={conversation.contact.automationPaused ? 'Retomar automação' : 'Pausar automação'}
        onClick={() =>
          void run(
            () =>
              patchContact({
                automationPaused: !conversation.contact.automationPaused,
              }),
            conversation.contact.automationPaused ? 'Automação retomada' : 'Automação pausada'
          )
        }
      >
        {conversation.contact.automationPaused ? (
          <Play className="h-4 w-4" />
        ) : (
          <Pause className="h-4 w-4" />
        )}
      </IconBtn>

      <IconBtn
        title="Exibir contato e logs"
        active={sidebarOpen}
        onClick={onToggleSidebar}
      >
        <ContactRound className="h-4 w-4" />
      </IconBtn>
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  children,
  active,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <WithTooltip label={title}>
      <button
        type="button"
        aria-label={title}
        onClick={onClick}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
          active ? 'bg-muted text-foreground' : ''
        }`}
      >
        {children}
      </button>
    </WithTooltip>
  );
}
