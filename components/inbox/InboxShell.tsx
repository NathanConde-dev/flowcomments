'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/lib/ui/toast';
import { ChatThread } from './ChatThread';
import { ContactSidebar } from './ContactSidebar';
import { ConversationList } from './ConversationList';
import type { InboxConversationDetail, InboxFilter, InboxListItem } from './types';

export function InboxShell({ initialConversationId }: { initialConversationId?: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<InboxFilter>('open');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [items, setItems] = useState<InboxListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId || null);
  const [detail, setDetail] = useState<InboxConversationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileShowChat, setMobileShowChat] = useState(Boolean(initialConversationId));

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('filter', filter);
      if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim());
      const res = await fetch(`/api/inbox/conversations?${params.toString()}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar');
      setItems(json.conversations || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar inbox');
    } finally {
      setListLoading(false);
    }
  }, [filter, debouncedQuery]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/inbox/conversations/${id}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao abrir conversa');
      setDetail(json.conversation);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, unreadCount: 0 } : item))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao abrir conversa');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    const fromUrl = searchParams.get('c');
    if (fromUrl && fromUrl !== selectedId) {
      setSelectedId(fromUrl);
      setMobileShowChat(true);
    }
  }, [searchParams, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const selectConversation = (id: string) => {
    setSelectedId(id);
    setMobileShowChat(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('c', id);
    router.replace(`/inbox?${params.toString()}`);
  };

  const refreshAll = async () => {
    await Promise.all([loadList(), selectedId ? loadDetail(selectedId) : Promise.resolve()]);
  };

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-background">
      <div className={`${mobileShowChat ? 'hidden md:flex' : 'flex'} h-full min-h-0`}>
        <ConversationList
          items={items}
          selectedId={selectedId}
          filter={filter}
          query={query}
          loading={listLoading}
          onSelect={selectConversation}
          onFilterChange={setFilter}
          onQueryChange={setQuery}
        />
      </div>

      <div className={`${mobileShowChat ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-1`}>
        {detailLoading && !detail ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Carregando conversa…
          </div>
        ) : (
          <ChatThread
            conversation={detail}
            sidebarOpen={sidebarOpen}
            onRefresh={() => void refreshAll()}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            onBack={() => setMobileShowChat(false)}
          />
        )}
      </div>

      {detail && sidebarOpen && (
        <div className="hidden h-full min-h-0 lg:flex">
          <ContactSidebar
            conversation={detail}
            onClose={() => setSidebarOpen(false)}
            onRefresh={() => void refreshAll()}
          />
        </div>
      )}
    </div>
  );
}
