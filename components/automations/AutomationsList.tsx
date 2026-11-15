'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clapperboard, Pencil, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Stagger } from '@/components/ui/motion';
import { WithTooltip } from '@/components/ui/tooltip';
import { toast } from '@/lib/ui/toast';
import { cn } from '@/lib/utils/cn';
import type { InstagramMediaPost } from '@/components/automations/builder/types';

export type AutomationListItem = {
  id: string;
  name: string;
  isActive: boolean;
  triggerType: string;
  igAccountId: string;
  igUsername: string;
  keywords: string[];
  mediaScope: 'specific' | 'any';
  mediaIds: string[];
  stats: {
    triggers: number;
    dms: number;
    taps: number;
    tags: number;
  };
};

type AutomationsListProps = {
  initialItems: AutomationListItem[];
};

export function AutomationsList({ initialItems }: AutomationsListProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [mediaById, setMediaById] = useState<Record<string, InstagramMediaPost>>({});
  const [pendingToggle, setPendingToggle] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AutomationListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const accountIds = useMemo(
    () => [...new Set(items.map((item) => item.igAccountId))],
    [items]
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const next: Record<string, InstagramMediaPost> = {};
      await Promise.all(
        accountIds.map(async (accountId) => {
          try {
            const res = await fetch(`/api/instagram/media?accountId=${accountId}&limit=50`);
            if (!res.ok) return;
            const data = await res.json();
            for (const post of data.posts || []) {
              next[post.id] = post;
            }
          } catch {
            // ignore preview failures
          }
        })
      );
      if (!cancelled) setMediaById(next);
    };

    if (accountIds.length > 0) load();
    return () => {
      cancelled = true;
    };
  }, [accountIds]);

  const toggleActive = async (item: AutomationListItem) => {
    setPendingToggle(item.id);
    const nextActive = !item.isActive;
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, isActive: nextActive } : row))
    );

    try {
      const res = await fetch(`/api/automations/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const docs = typeof data.docsUrl === 'string' ? ` ${data.docsUrl}` : '';
        throw new Error(`${data.error || 'Falha ao atualizar'}${docs}`);
      }
      toast.success(nextActive ? 'Automação ativada' : 'Automação pausada');
    } catch (err) {
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, isActive: item.isActive } : row))
      );
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar');
    } finally {
      setPendingToggle(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/automations/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao excluir');
      }
      setItems((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      toast.success('Automação excluída');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  };

  if (items.length === 0) {
    return (
      <Card className="border-dashed fc-scale-in">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 rounded-2xl bg-muted p-4 ring-1 ring-border">
            <Zap className="h-8 w-8 text-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-foreground">Nenhuma automação criada</h3>
          <p className="mb-6 max-w-md text-center text-muted-foreground">
            Monte um fluxo visual com gatilho, resposta e DM, sem formulário seco.
          </p>
          <Link href="/automations/new">
            <Button>
              <Zap className="mr-2 h-4 w-4" />
              Criar primeira automação
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Stagger className="space-y-3">
        {items.map((item) => {
          const cover = item.mediaIds.map((id) => mediaById[id]).find(Boolean);
          const coverSrc = cover?.thumbnailUrl || cover?.mediaUrl || null;

          return (
            <Card
              key={item.id}
              role="link"
              tabIndex={0}
              className="cursor-pointer fc-hover-lift"
              onClick={() => router.push(`/automations/${item.id}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  router.push(`/automations/${item.id}`);
                }
              }}
            >
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
                <div className="group/preview relative z-10 shrink-0 cursor-pointer">
                  <div className="relative h-28 w-20 overflow-hidden rounded-md bg-muted ring-1 ring-border">
                    {item.mediaScope === 'any' ? (
                      <div className="flex h-full w-full items-center justify-center">
                        <Zap className="h-6 w-6 text-muted-foreground" />
                      </div>
                    ) : coverSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverSrc} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Clapperboard className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    {cover?.isReel && (
                      <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 p-1 text-white">
                        <Clapperboard className="h-3 w-3" />
                      </span>
                    )}
                  </div>

                  {coverSrc ? (
                    <div
                      className={cn(
                        'pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 w-[220px] -translate-y-1/2',
                        'origin-left scale-95 opacity-0 transition-[opacity,transform] duration-75 ease-out',
                        'invisible group-hover/preview:visible group-hover/preview:scale-100 group-hover/preview:opacity-100'
                      )}
                    >
                      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-[0_18px_50px_-18px_rgba(0,0,0,0.45)] ring-1 ring-black/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={coverSrc}
                          alt=""
                          className={cn(
                            'w-full object-cover',
                            cover?.isReel ? 'aspect-[9/16]' : 'aspect-[4/5]'
                          )}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold tracking-tight text-foreground">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      @{item.igUsername}
                      {item.mediaScope === 'any'
                        ? ' · Qualquer publicação'
                        : item.mediaIds.length > 1
                          ? ` · ${item.mediaIds.length} publicações`
                          : cover?.caption
                            ? ` · ${cover.caption.slice(0, 56)}${cover.caption.length > 56 ? '…' : ''}`
                            : ''}
                    </p>
                    {(item.stats.triggers > 0 ||
                      item.stats.dms > 0 ||
                      item.stats.taps > 0) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.stats.triggers} disparos · {item.stats.dms} DMs ·{' '}
                        {item.stats.taps} taps
                        {item.stats.tags > 0 ? ` · ${item.stats.tags} tags` : ''}
                      </p>
                    )}
                  </div>
                  {item.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.keywords.slice(0, 5).map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 ring-1 ring-primary-100"
                        >
                          {keyword}
                        </span>
                      ))}
                      {item.keywords.length > 5 && (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          +{item.keywords.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div
                  className="flex items-center gap-2.5 sm:shrink-0"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <WithTooltip label={item.isActive ? 'Desativar' : 'Ativar'}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.isActive}
                      aria-label={item.isActive ? 'Desativar' : 'Ativar'}
                      disabled={pendingToggle === item.id}
                      onClick={() => toggleActive(item)}
                      className={cn(
                        'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-60',
                        item.isActive ? 'bg-emerald-500' : 'bg-zinc-300'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                          item.isActive ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </WithTooltip>

                  <Link href={`/automations/${item.id}`}>
                    <Button type="button" variant="outline" size="sm">
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Editar
                    </Button>
                  </Link>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/5"
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </Stagger>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir automação?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `“${deleteTarget.name}” será removida permanentemente. Essa ação não pode ser desfeita.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={confirmDelete}
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
