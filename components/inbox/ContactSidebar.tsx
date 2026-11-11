'use client';

import { useEffect, useState } from 'react';
import { Pause, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBrasiliaDateTime } from '@/lib/utils/datetime';
import { toast } from '@/lib/ui/toast';
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
}: {
  conversation: InboxConversationDetail;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [logs, setLogs] = useState<LogsPayload | null>(null);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    let cancelled = false;
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
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erro');
    onRefresh();
  };

  const customEntries = Object.entries(conversation.contact.customData).filter(
    ([key]) => !key.startsWith('_')
  );

  return (
    <aside className="flex h-full w-full min-w-0 flex-col border-l border-border bg-white md:w-[320px] lg:w-[360px]">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-semibold">@{conversation.contact.igUsername}</p>
          {conversation.contact.fullName && (
            <p className="text-xs text-muted-foreground">{conversation.contact.fullName}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-20 w-20 overflow-hidden rounded-full bg-muted">
            {conversation.contact.profilePic ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={conversation.contact.profilePic}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-muted-foreground">
                {conversation.contact.igUsername[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Via Instagram · @{conversation.igAccount.igUsername}
          </p>
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Automações</h3>
          </div>
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
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Tags do contato</h3>
          </div>
          <div className="flex flex-wrap gap-1">
            {conversation.contact.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="rounded-full bg-muted px-2 py-0.5 text-xs hover:bg-red-50"
                onClick={() => {
                  void patchContact({ removeTag: tag }).catch((err) =>
                    toast.error(err instanceof Error ? err.message : 'Erro')
                  );
                }}
              >
                {tag} ×
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Adicionar tag"
              className="h-8 flex-1 rounded-lg border border-border px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
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
          <h3 className="text-sm font-semibold">Campos personalizados</h3>
          {customEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum campo ainda</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {customEntries.map(([key, value]) => (
                <li key={key} className="rounded-lg border border-border px-2 py-1.5">
                  <span className="font-medium">{key}:</span>{' '}
                  <span className="text-muted-foreground">{String(value ?? '—')}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Logs importantes</h3>
          {!logs ? (
            <p className="text-xs text-muted-foreground">Carregando…</p>
          ) : (
            <ul className="space-y-2">
              {logs.executions.slice(0, 8).map((exec) => (
                <li key={exec.id} className="rounded-lg border border-border px-2 py-1.5 text-xs">
                  <p className="font-medium">{exec.automation.name}</p>
                  <p className="text-muted-foreground">
                    {exec.status}
                    {exec.error ? ` · ${exec.error}` : ''}
                  </p>
                  <p className="text-muted-foreground">{formatBrasiliaDateTime(exec.createdAt)}</p>
                </li>
              ))}
              {logs.dmLogs.slice(0, 6).map((log) => (
                <li key={log.id} className="rounded-lg border border-border px-2 py-1.5 text-xs">
                  <p className="font-medium">{log.messageType}</p>
                  <p className="text-muted-foreground">
                    {log.status}
                    {log.error ? ` · ${log.error}` : ''}
                  </p>
                  <p className="text-muted-foreground">
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
