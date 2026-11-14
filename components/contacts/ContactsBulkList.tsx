'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Users, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteContactButton } from '@/components/contacts/DeleteContactButton';
import { toast } from '@/lib/ui/toast';
import { cn } from '@/lib/utils/cn';

export type ContactListItem = {
  id: string;
  igUsername: string;
  fullName: string | null;
  profilePic: string | null;
  accountUsername: string;
  lastSeenLabel: string | null;
  sourceName: string | null;
  sourceRemoved: boolean;
  lastName: string | null;
  tags: string[];
  fields: Array<[string, string]>;
};

export function ContactsBulkList({ contacts }: { contacts: ContactListItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const allIds = useMemo(() => contacts.map((c) => c.id), [contacts]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    setConfirming(false);
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(allIds));
  };

  const toggleOne = (id: string) => {
    setConfirming(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const res = await fetch('/api/contacts/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao remover');
      toast.success(
        data.deleted === 1
          ? '1 contato removido'
          : `${data.deleted} contatos removidos`
      );
      setSelected(new Set());
      setConfirming(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-border bg-zinc-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-zinc-300/80 bg-white text-zinc-400 accent-zinc-400"
          />
          {selected.size > 0
            ? `${selected.size} selecionado${selected.size > 1 ? 's' : ''}`
            : 'Selecionar página'}
        </label>

        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {confirming ? (
              <>
                <span className="text-xs text-muted-foreground">
                  Remover {selected.size} contato{selected.size > 1 ? 's' : ''}?
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={bulkDelete}
                  className="rounded-full"
                >
                  {busy ? '…' : 'Confirmar exclusão'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setConfirming(false)}
                  className="rounded-full"
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => setConfirming(true)}
                className="rounded-full"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir selecionados
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <div className="fc-stagger divide-y divide-border">
        {contacts.map((contact) => {
          const checked = selected.has(contact.id);
          const showLast =
            contact.lastName &&
            contact.sourceName &&
            contact.lastName !== contact.sourceName
              ? contact.lastName
              : null;

          return (
            <div
              key={contact.id}
              className={cn(
                'flex flex-col gap-3 p-4 transition-colors duration-200 sm:flex-row sm:items-start sm:gap-4',
                checked ? 'bg-zinc-50' : 'hover:bg-muted/70'
              )}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleOne(contact.id)}
                  aria-label={`Selecionar @${contact.igUsername}`}
                  className="mt-3.5 h-4 w-4 shrink-0 rounded border-zinc-300/80 bg-white text-zinc-400 accent-zinc-400"
                />
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                  {contact.profilePic ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={contact.profilePic}
                      alt={`@${contact.igUsername}`}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Users className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">@{contact.igUsername}</p>
                  {contact.fullName ? (
                    <p className="text-sm text-muted-foreground">{contact.fullName}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Via @{contact.accountUsername}
                    {contact.lastSeenLabel ? (
                      <> · Última interação: {contact.lastSeenLabel}</>
                    ) : null}
                  </p>

                  {contact.sourceName ? (
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-foreground">
                      <Workflow className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">Origem:</span>
                      <span className="font-medium">{contact.sourceName}</span>
                      {contact.sourceRemoved ? (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          removida
                        </span>
                      ) : null}
                      {showLast ? (
                        <span className="text-muted-foreground">
                          · Última:{' '}
                          <span className="font-medium text-foreground">{showLast}</span>
                        </span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Origem da automação não registrada
                    </p>
                  )}

                  {contact.fields.length > 0 ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {contact.fields.map(([key, value]) => (
                        <span
                          key={key}
                          className="inline-flex max-w-full items-center gap-1 rounded-lg border border-border bg-zinc-50 px-2 py-1 text-[11px] text-foreground"
                          title={`${key}: ${value}`}
                        >
                          <span className="font-semibold text-muted-foreground">{key}</span>
                          <span className="truncate">{value}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col items-stretch gap-2 pl-7 sm:items-end sm:pl-0">
                {contact.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1 sm:max-w-[220px] sm:justify-end">
                    {contact.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-muted px-2 py-1 text-xs text-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <DeleteContactButton
                  contactId={contact.id}
                  username={contact.igUsername}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
