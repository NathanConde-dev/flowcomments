'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronLeft,
  Clapperboard,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostPickerModal } from './PostPickerModal';
import {
  relativeTimePt,
  type AutomationDraft,
  type IGAccountOption,
  type InstagramMediaPost,
  type MediaScope,
} from './types';

interface PostSelectStepProps {
  draft: AutomationDraft;
  accounts: IGAccountOption[];
  onChange: (draft: AutomationDraft) => void;
  onNext: () => void;
}

function ScopeCard({
  active,
  title,
  description,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left cursor-pointer transition-[transform,border-color,box-shadow,background-color] duration-200 ease-out hover:-translate-y-0.5 ${
        active
          ? 'border-foreground bg-muted/60 ring-1 ring-black/10 shadow-soft'
          : 'border-border bg-white hover:border-zinc-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            active ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 bg-white'
          }`}
        >
          {active && <Check className="h-3 w-3" strokeWidth={2.5} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold tracking-tight text-foreground">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          {children}
        </div>
      </div>
    </button>
  );
}

function PhonePreview({
  post,
  username,
  profilePictureUrl,
}: {
  post?: InstagramMediaPost;
  username?: string;
  profilePictureUrl?: string | null;
}) {
  const preview = post?.thumbnailUrl || post?.mediaUrl;
  const handle = username || 'conta';
  const caption = post?.caption?.trim() || 'A legenda do post aparece aqui.';
  const timeLabel = post?.timestamp ? relativeTimePt(post.timestamp) : 'agora';

  return (
    <div className="mx-auto w-[300px]">
      <div className="relative overflow-hidden rounded-[2.4rem] border-[8px] border-zinc-900 bg-black shadow-[0_28px_70px_-24px_rgba(0,0,0,0.55)]">
        <div className="flex h-[620px] flex-col bg-black text-white">
          {/* Status bar */}
          <div className="relative z-20 flex h-11 shrink-0 items-end justify-between px-5 pb-1.5">
            <span className="text-[12px] font-semibold tracking-tight">9:41</span>
            <div className="absolute left-1/2 top-2 h-[22px] w-[90px] -translate-x-1/2 rounded-full bg-black" />
            <div className="flex items-center gap-1.5">
              <span className="flex items-end gap-[2px]">
                <span className="h-[4px] w-[3px] rounded-[1px] bg-white" />
                <span className="h-[6px] w-[3px] rounded-[1px] bg-white" />
                <span className="h-[8px] w-[3px] rounded-[1px] bg-white" />
                <span className="h-[10px] w-[3px] rounded-[1px] bg-white/40" />
              </span>
              <svg viewBox="0 0 16 12" className="h-3 w-4 fill-white" aria-hidden>
                <path d="M8 2.4c2.1 0 4 .8 5.5 2.1l-1.1 1.1A6.3 6.3 0 0 0 8 3.9a6.3 6.3 0 0 0-4.4 1.7L2.5 4.5A7.9 7.9 0 0 1 8 2.4Zm0 2.9c1.3 0 2.5.5 3.4 1.3L10.3 7.7A3.7 3.7 0 0 0 8 6.8c-1 0-1.9.4-2.6 1L4.3 6.6A5.2 5.2 0 0 1 8 5.3Zm0 2.9c.7 0 1.3.3 1.7.7L8 10.6 6.3 8.9c.4-.4 1-.7 1.7-.7Z" />
              </svg>
              <span className="relative h-[10px] w-[22px] rounded-[3px] border border-white/90 p-[1px]">
                <span className="block h-full w-[70%] rounded-[1px] bg-white" />
                <span className="absolute -right-[3px] top-1/2 h-[5px] w-[1.5px] -translate-y-1/2 rounded-r-[1px] bg-white/90" />
              </span>
            </div>
          </div>

          {/* IG top bar */}
          <div className="flex h-11 shrink-0 items-center justify-between px-2">
            <button type="button" className="flex h-9 w-9 items-center justify-center" tabIndex={-1}>
              <ChevronLeft className="h-7 w-7" strokeWidth={1.75} />
            </button>
            <div className="min-w-0 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">
                {post?.isReel ? 'Reels' : 'Publicações'}
              </p>
              <p className="truncate text-[13px] font-semibold leading-tight">{handle}</p>
            </div>
            <button type="button" className="flex h-9 w-9 items-center justify-center" tabIndex={-1}>
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>

          {/* Author row */}
          <div className="flex shrink-0 items-center gap-2.5 px-3 py-2.5">
            <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[1.5px]">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-black text-[10px] font-bold uppercase">
                {profilePictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profilePictureUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  handle.slice(0, 1)
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-none">{handle}</p>
              {post?.isReel ? (
                <p className="mt-1 text-[11px] text-white/55">Áudio original</p>
              ) : null}
            </div>
            <button
              type="button"
              tabIndex={-1}
              className="rounded-lg border border-white/25 px-3 py-1 text-[12px] font-semibold"
            >
              Seguir
            </button>
          </div>

          {/* Media */}
          <div
            className={`relative w-full shrink-0 overflow-hidden bg-[#1a1a1a] ${
              post?.isReel ? 'flex-1' : 'aspect-square'
            }`}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full min-h-[280px] items-center justify-center px-8 text-center">
                <p className="text-[13px] leading-relaxed text-white/35">
                  Selecione uma publicação para pré-visualizar
                </p>
              </div>
            )}
            {post?.isReel && (
              <span className="absolute bottom-3 right-3 rounded-full bg-black/55 p-2 backdrop-blur-sm">
                <Clapperboard className="h-4 w-4" />
              </span>
            )}
          </div>

          {/* Actions + caption */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between px-2.5 py-2">
              <div className="flex items-center gap-3.5 pl-0.5">
                <Heart className="h-[26px] w-[26px]" strokeWidth={1.7} />
                <MessageCircle className="h-[26px] w-[26px] -scale-x-100" strokeWidth={1.7} />
                <Send className="h-[24px] w-[24px] -rotate-12" strokeWidth={1.7} />
              </div>
              <Bookmark className="h-[26px] w-[26px]" strokeWidth={1.7} />
            </div>

            <div className="space-y-1.5 px-3 pb-4">
              <p className="text-[13px] font-semibold">128 curtidas</p>
              <p className="line-clamp-3 text-[13px] leading-[18px]">
                <span className="font-semibold">{handle}</span>{' '}
                <span className="text-white/90">{caption}</span>
              </p>
              <p className="text-[12px] text-white/45">Ver todos os comentários</p>
              <p className="text-[10px] uppercase tracking-wide text-white/35">{timeLabel}</p>
            </div>

            <div className="mt-auto flex justify-center pb-2 pt-1">
              <div className="h-1 w-[108px] rounded-full bg-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostSelectStep({ draft, accounts, onChange, onNext }: PostSelectStepProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const account = accounts.find((a) => a.id === draft.igAccountId);
  const previewPost = draft.selectedPosts[0];

  const setScope = (mediaScope: MediaScope) => {
    onChange({
      ...draft,
      mediaScope,
      selectedPosts: mediaScope === 'any' ? [] : draft.selectedPosts,
    });
  };

  const canContinue =
    !!draft.igAccountId &&
    (draft.mediaScope === 'any' || draft.selectedPosts.length > 0);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-white px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link href="/automations">
            <Button type="button" variant="ghost" size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
          </Link>
          <div className="hidden h-5 w-px bg-border sm:block" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">Nova automação</p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Escolha o gatilho do comentário
            </p>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="flex w-full flex-col border-b border-border bg-white lg:w-[420px] lg:border-b-0 lg:border-r">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Quando alguém faz um comentário
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Defina em quais publicações essa automação deve ouvir comentários.
            </p>

            <div className="mt-6 space-y-3">
              <label className="block text-sm font-semibold text-foreground">Conta do Instagram</label>
              <select
                className="flex h-11 w-full rounded-md border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={draft.igAccountId}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    igAccountId: e.target.value,
                    selectedPosts: [],
                  })
                }
              >
                <option value="">Selecione uma conta</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    @{acc.igUsername}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 space-y-3 fc-stagger">
              <ScopeCard
                active={draft.mediaScope === 'specific'}
                title="uma publicação ou Reels específico"
                description="Escolha posts existentes para monitorar"
                onClick={() => setScope('specific')}
              >
                {draft.mediaScope === 'specific' && (
                  <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                    {draft.selectedPosts.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2">
                        {draft.selectedPosts.slice(0, 4).map((post) => {
                          const src = post.thumbnailUrl || post.mediaUrl;
                          return (
                            <div
                              key={post.id}
                              className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                            >
                              {src ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={src} alt="" className="h-full w-full object-cover" />
                              ) : null}
                              {post.isReel && (
                                <Clapperboard className="absolute right-1 top-1 h-3 w-3 text-white drop-shadow" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      disabled={!draft.igAccountId}
                      onClick={() => setModalOpen(true)}
                      className="cursor-pointer text-sm font-semibold text-foreground hover:underline disabled:opacity-40"
                    >
                      {draft.selectedPosts.length > 0 ? 'Mostrar Todos' : 'Selecionar publicações'}
                    </button>
                  </div>
                )}
              </ScopeCard>

              <ScopeCard
                active={draft.mediaScope === 'any'}
                title="qualquer publicação ou Reel"
                description="Dispara em comentários de qualquer post da conta"
                onClick={() => setScope('any')}
              />
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-border bg-white p-4 sm:p-6">
            <Button type="button" onClick={onNext} disabled={!canContinue} className="w-full">
              Próximo
            </Button>
          </div>
        </aside>

        <section className="fc-canvas-dot hidden flex-1 items-center justify-center bg-canvas p-6 lg:flex lg:p-8">
          <div>
            <p className="mb-5 text-center text-sm font-medium text-muted-foreground">
              Visualização
              {account ? ` · @${account.igUsername}` : ''}
            </p>
            <PhonePreview
              post={previewPost}
              username={account?.igUsername}
              profilePictureUrl={account?.profilePictureUrl}
            />
          </div>
        </section>
      </div>

      <PostPickerModal
        open={modalOpen}
        accountId={draft.igAccountId}
        selectedIds={draft.selectedPosts.map((p) => p.id)}
        onClose={() => setModalOpen(false)}
        onConfirm={(posts) => onChange({ ...draft, selectedPosts: posts, mediaScope: 'specific' })}
      />
    </div>
  );
}
