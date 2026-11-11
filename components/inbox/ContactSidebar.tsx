'use client';

import { useEffect, useState } from 'react';
import { Instagram, Pause, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InboxLogsSkeleton } from '@/components/ui/skeletons';
import { WithTooltip } from '@/components/ui/tooltip';
import { formatBrasiliaDateTime } from '@/lib/utils/datetime';
import { toast } from '@/lib/ui/toast';
import { cn } from '@/lib/utils/cn';
import type { InboxConversationDetail } from './types';

type LogsPayload = {
  dmLogs: Array<{
    id: string;
    status: string;
    messageType: string;
    error: string | null;
    sentAt: string | null;
    createdAt: string;
  }>;
  executions: Array<{
    id: string;
    status: string;
    error: string | null;
    triggeredBy: string | null;
    createdAt: string;
    automation: { id: string; name: string };
  }>;
};

export function ContactSidebar({
  conversation,
  onClose,
  onRefresh,
  className,
}: {
  conversation: InboxConversationDetail;
  onClose: () => void;
  onRefresh: () => void;
  className?: string;
}) {
  const [logs, setLogs] = useState<LogsPayload | null>(null);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLogs(null);
    (async () => {
      try {
        const res = await fetch(`/api/inbox/conversations/${conversation.id}/logs`);
        const json = await res.json();
        if (!cancelled && res.ok) setLogs(json);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversation.id]);

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

  const customEntries = Object.entries(conversation.contact.customData).filter(
    ([key]) => !key.startsWith('_')
  );

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 w-full flex-col border-l border-border bg-white shadow-float xl:shadow-none',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-muted">
            {conversation.contact.profilePic ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={conversation.contact.profilePic}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                {conversation.contact.igUsername[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold tracking-tight">
              @{conversation.contact.igUsername}
            </p>
            {conversation.contact.fullName && (
              <p className="truncate text-xs text-muted-foreground">
                {conversation.contact.fullName}
              </p>
            )}
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <Instagram className="h-3 w-3 shrink-0" />
              @{conversation.igAccount.igUsername}
            </p>
          </div>
        </div>
        <WithTooltip label="Fechar">
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </WithTooltip>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4">
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Automações
          </h3>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              void (async () => {
                try {
                  await patchContact({
                    automationPaused: !conversation.contact.automationPaused,
                  });
                  toast.success(
                    conversation.contact.automationPaused
                      ? 'Automação retomada'
                      : 'Automação pausada'
                  );
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Erro');
                }
              })();
            }}
          >
            {conversation.contact.automationPaused ? (
              <>
                <Play className="mr-2 h-4 w-4" /> Retomar
              </>
            ) : (
              <>
                <Pause className="mr-2 h-4 w-4" /> Suspender
              </>
            )}
          </Button>
          {conversation.contact.automationPaused && (
            <p className="text-xs text-amber-700">
              Automações pausadas para este contato.
            </p>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tags do contato
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {conversation.contact.tags.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma tag</p>
            )}
            {conversation.contact.tags.map((tag) => (
              <WithTooltip key={tag} label="Remover tag">
                <button
                  type="button"
                  className="rounded-full bg-muted px-2.5 py-1 text-xs hover:bg-red-50 hover:text-red-700"
                  onClick={() => {
                    void patchContact({ removeTag: tag }).catch((err) =>
                      toast.error(err instanceof Error ? err.message : 'Erro')
                    );
                  }}
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
              placeholder="Adicionar tag"
              className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-white px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || !newTag.trim()) return;
                e.preventDefault();
                void patchContact({ addTag: newTag.trim() })
                  .then(() => setNewTag(''))
                  .catch((err) => toast.error(err instanceof Error ? err.message : 'Erro'));
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 shrink-0"
              onClick={() => {
                if (!newTag.trim()) return;
                void patchContact({ addTag: newTag.trim() })
                  .then(() => setNewTag(''))
                  .catch((err) => toast.error(err instanceof Error ? err.message : 'Erro'));
              }}
            >
              +
            </Button>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Campos personalizados
          </h3>
          {customEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum campo ainda</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {customEntries.map(([key, value]) => (
                <li
                  key={key}
                  className="rounded-xl border border-border bg-muted/30 px-3 py-2"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {key}
                  </p>
                  <p className="mt-0.5 break-words text-foreground">
                    {String(value ?? '—')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2 pb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Logs importantes
          </h3>
          {!logs ? (
            <InboxLogsSkeleton />
          ) : (
            <ul className="space-y-2">
              {logs.executions.slice(0, 8).map((exec) => (
                <li
                  key={exec.id}
                  className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs"
                >
                  <p className="font-medium text-foreground">{exec.automation.name}</p>
                  <p className="mt-0.5 text-muted-foreground">
                    {exec.status}
                    {exec.error ? ` · ${exec.error}` : ''}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatBrasiliaDateTime(exec.createdAt)}
                  </p>
                </li>
              ))}
              {logs.dmLogs.slice(0, 6).map((log) => (
                <li
                  key={log.id}
                  className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs"
                >
                  <p className="font-medium text-foreground">{log.messageType}</p>
                  <p className="mt-0.5 text-muted-foreground">
                    {log.status}
                    {log.error ? ` · ${log.error}` : ''}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatBrasiliaDateTime(log.sentAt || log.createdAt)}
                  </p>
                </li>
              ))}
              {logs.executions.length === 0 && logs.dmLogs.length === 0 && (
                <p className="text-xs text-muted-foreground">Sem logs ainda</p>
              )}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
