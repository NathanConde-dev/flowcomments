'use client';

import { useEffect, useState } from 'react';
import { Clapperboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { InstagramMediaPost } from './types';
import { relativeTimePt } from './types';

interface PostPickerModalProps {
  open: boolean;
  accountId: string;
  selectedIds: string[];
  onClose: () => void;
  onConfirm: (posts: InstagramMediaPost[]) => void;
}

export function PostPickerModal({
  open,
  accountId,
  selectedIds,
  onClose,
  onConfirm,
}: PostPickerModalProps) {
  const [posts, setPosts] = useState<InstagramMediaPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set(selectedIds));

  useEffect(() => {
    if (!open) return;
    setPicked(new Set(selectedIds));
  }, [open, selectedIds]);

  useEffect(() => {
    if (!open || !accountId) return;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/instagram/media?accountId=${accountId}&limit=30`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao carregar');
        setPosts(data.posts || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar publicações');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, accountId]);

  if (!open) return null;

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = () => {
    const selected = posts.filter((p) => picked.has(p.id));
    onConfirm(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="fc-scrim absolute inset-0 cursor-pointer fc-fade-in"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_24px_80px_-24px_rgba(0,0,0,0.35)] fc-scale-in sm:h-auto sm:max-h-[88vh] sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              Selecione qualquer publicação ou reel para automatizar
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha um ou mais posts. Comentários nesses conteúdos disparam o fluxo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 cursor-pointer rounded-full p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square w-full rounded-xl" />
                  <Skeleton className="h-3 w-[80%]" />
                  <Skeleton className="h-3 w-[33%]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl bg-red-50 px-4 py-6 text-sm text-red-700">{error}</div>
          ) : posts.length === 0 ? (
            <div className="rounded-xl bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhuma publicação encontrada nesta conta.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {posts.map((post) => {
                const active = picked.has(post.id);
                const preview = post.thumbnailUrl || post.mediaUrl;
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => toggle(post.id)}
                    className={`group overflow-hidden rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'border-zinc-900 ring-2 ring-black/10 shadow-soft'
                        : 'border-border hover:border-zinc-400'
                    }`}
                  >
                    <div className="relative aspect-square bg-muted">
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preview}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          Sem preview
                        </div>
                      )}
                      {post.isReel && (
                        <span className="absolute right-2 top-2 rounded-md bg-black/55 p-1 text-white">
                          <Clapperboard className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 p-3">
                      <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
                        {post.caption?.trim() || 'Sem legenda'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {relativeTimePt(post.timestamp)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6 sm:py-4"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <p className="text-sm text-muted-foreground">
            {picked.size} selecionada{picked.size === 1 ? '' : 's'}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="hidden sm:inline-flex">
              Cancelar
            </Button>
            <Button type="button" onClick={confirm} disabled={picked.size === 0}>
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
