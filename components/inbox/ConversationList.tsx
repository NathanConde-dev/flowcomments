'use client';

import { Search, Star } from 'lucide-react';
import { InstagramDirectIcon } from '@/components/icons/InstagramDirectIcon';
import { InboxListRowsSkeleton } from '@/components/ui/skeletons';
import { contactDisplayName, contactInitial } from '@/lib/inbox/contacts';
import { formatRelativePt } from './relative-time';
import type { InboxFilter, InboxListItem } from './types';

const FILTERS: Array<{ id: InboxFilter; label: string }> = [
  { id: 'open', label: 'Abertas' },
  { id: 'unread', label: 'Não lidas' },
  { id: 'reminders', label: 'Lembretes' },
  { id: 'favorites', label: 'Favoritos' },
  { id: 'closed', label: 'Fechadas' },
  { id: 'all', label: 'Todas' },
];

export function ConversationList({
  items,
  selectedId,
  filter,
  query,
  loading,
  onSelect,
  onFilterChange,
  onQueryChange,
}: {
  items: InboxListItem[];
  selectedId: string | null;
  filter: InboxFilter;
  query: string;
  loading: boolean;
  onSelect: (id: string) => void;
  onFilterChange: (filter: InboxFilter) => void;
  onQueryChange: (query: string) => void;
}) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col border-r border-border bg-white">
      <div className="space-y-3 border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Pesquisar conversas"
            className="h-10 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onFilterChange(item.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === item.id
                  ? 'bg-black text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Só aparecem conversas que vieram de automações criadas. Mensagens fora disso ficam fora da inbox.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && items.length === 0 ? (
          <InboxListRowsSkeleton rows={8} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <InstagramDirectIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Nenhuma conversa de automação</p>
            <p className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
              O chat só mostra mensagens que vieram de automações criadas.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const active = item.id === selectedId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left transition-colors ${
                  active ? 'bg-muted/80' : 'hover:bg-muted/50'
                }`}
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-muted">
                  {item.contact.profilePic ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.contact.profilePic}
                      alt=""
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                      {contactInitial(item.contact)}
                    </div>
                  )}
                  {item.unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-sky-500 ring-2 ring-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{contactDisplayName(item.contact)}</p>
                    {item.isFavorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                    <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                      {formatRelativePt(item.lastMessageAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {item.preview || 'Sem mensagens'}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
