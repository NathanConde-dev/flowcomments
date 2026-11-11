'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/lib/ui/toast';
import { InboxContactSidebarSkeleton, InboxThreadSkeleton } from '@/components/ui/skeletons';
import { WithTooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils/cn';
import { ChatThread } from './ChatThread';
import { ContactSidebar } from './ContactSidebar';
import { ConversationList } from './ConversationList';
import type { InboxConversationDetail, InboxFilter, InboxListItem } from './types';

const LIST_WIDTH_KEY = 'fc-inbox-list-width';
const LIST_WIDTH_DEFAULT = 340;
const LIST_WIDTH_MIN = 280;
const LIST_WIDTH_MAX = 480;

function clampListWidth(value: number) {
  if (!Number.isFinite(value)) return LIST_WIDTH_DEFAULT;
  return Math.min(LIST_WIDTH_MAX, Math.max(LIST_WIDTH_MIN, Math.round(value)));
}

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(Boolean(initialConversationId));
  const [listWidth, setListWidth] = useState(LIST_WIDTH_DEFAULT);
  const [isResizing, setIsResizing] = useState(false);
  const listPaneRef = useRef<HTMLDivElement>(null);
  const listWidthRef = useRef(listWidth);

  useEffect(() => {
    listWidthRef.current = listWidth;
  }, [listWidth]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LIST_WIDTH_KEY);
      if (saved) setListWidth(clampListWidth(Number(saved)));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const persistListWidth = useCallback((width: number) => {
    try {
      localStorage.setItem(LIST_WIDTH_KEY, String(width));
    } catch {
      // ignore
    }
  }, []);

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

  const loadDetail = useCallback(async (id: string, opts?: { soft?: boolean }) => {
    if (!opts?.soft) setDetailLoading(true);
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
      if (!opts?.soft) setDetailLoading(false);
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

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  const selectConversation = (id: string) => {
    if (id !== selectedId) {
      setDetail(null);
      setDetailLoading(true);
      setSidebarOpen(false);
    }
    setSelectedId(id);
    setMobileShowChat(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('c', id);
    router.replace(`/inbox?${params.toString()}`);
  };

  const refreshAll = async () => {
    await Promise.all([
      loadList(),
      selectedId ? loadDetail(selectedId, { soft: true }) : Promise.resolve(),
    ]);
  };

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const onResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing || !listPaneRef.current) return;
    const left = listPaneRef.current.getBoundingClientRect().left;
    setListWidth(clampListWidth(event.clientX - left));
  };

  const stopResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    persistListWidth(listWidthRef.current);
  };

  const resetListWidth = () => {
    setListWidth(LIST_WIDTH_DEFAULT);
    persistListWidth(LIST_WIDTH_DEFAULT);
  };

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full overflow-hidden bg-background',
        isResizing && 'select-none'
      )}
    >
      <div
        ref={listPaneRef}
        className={cn(
          'relative h-full min-h-0 shrink-0 max-md:!w-full',
          mobileShowChat ? 'hidden md:block' : 'block'
        )}
        style={{ width: listWidth }}
      >
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

        <WithTooltip
          label="Arraste para redimensionar · duplo clique restaura"
          side="right"
          disabled={isResizing}
        >
          <div
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={listWidth}
            aria-valuemin={LIST_WIDTH_MIN}
            aria-valuemax={LIST_WIDTH_MAX}
            aria-label="Redimensionar lista de conversas"
            onPointerDown={startResize}
            onPointerMove={onResizeMove}
            onPointerUp={stopResize}
            onPointerCancel={stopResize}
            onDoubleClick={resetListWidth}
            className="absolute inset-y-0 -right-1.5 z-20 hidden w-3 cursor-col-resize touch-none md:block"
          >
            <span
              className={cn(
                'absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors',
                isResizing ? 'bg-foreground' : 'bg-transparent'
              )}
            />
            <span
              className={cn(
                'absolute left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors',
                isResizing ? 'bg-foreground' : 'bg-border hover:bg-foreground/60'
              )}
            />
          </div>
        </WithTooltip>
      </div>

      <div
        className={cn(
          'min-h-0 min-w-0 flex-1',
          mobileShowChat ? 'flex' : 'hidden md:flex'
        )}
      >
        {selectedId && (!detail || detail.id !== selectedId) ? (
          <InboxThreadSkeleton />
        ) : (
          <ChatThread
            conversation={detail}
            sidebarOpen={sidebarOpen}
            onRefresh={() => void refreshAll()}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            onBack={() => {
              setSidebarOpen(false);
              setMobileShowChat(false);
            }}
          />
        )}
      </div>

      {sidebarOpen && selectedId && (
        <>
          <button
            type="button"
            aria-label="Fechar painel do contato"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] xl:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div
            className={cn(
              'z-50 flex h-full min-h-0 w-full max-w-[100vw] flex-col',
              'fixed inset-y-0 right-0 max-w-sm sm:max-w-md',
              'xl:static xl:z-auto xl:w-[300px] xl:max-w-[300px] xl:shrink-0'
            )}
          >
            {detail && detail.id === selectedId ? (
              <ContactSidebar
                conversation={detail}
                onClose={() => setSidebarOpen(false)}
                onRefresh={() => void refreshAll()}
              />
            ) : (
              <InboxContactSidebarSkeleton />
            )}
          </div>
        </>
      )}
    </div>
  );
}
