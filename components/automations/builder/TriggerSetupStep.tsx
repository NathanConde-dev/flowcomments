'use client';

import {
  AtSign,
  Clapperboard,
  Instagram,
  MessageCircleMore,
  MessageSquareReply,
  MessagesSquare,
  Radio,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/motion';
import { cn } from '@/lib/utils/cn';
import {
  TRIGGER_KIND_LABELS,
  type AutomationDraft,
  type IGAccountOption,
  type TriggerKind,
} from './types';

const OPTIONS: Array<{
  id: TriggerKind;
  hint: string;
  icon: LucideIcon;
  well: string;
}> = [
  {
    id: 'comment',
    hint: 'Comentário em post ou reel com palavra-chave',
    icon: MessageCircleMore,
    well: 'bg-amber-500',
  },
  {
    id: 'live_comment',
    hint: 'Comentário durante o Instagram Live',
    icon: Radio,
    well: 'bg-rose-500',
  },
  {
    id: 'dm_keyword',
    hint: 'Mensagem no direct com palavra-chave',
    icon: MessagesSquare,
    well: 'bg-emerald-500',
  },
  {
    id: 'default_reply',
    hint: 'Resposta padrão quando nenhuma outra automação casa',
    icon: MessageSquareReply,
    well: 'bg-sky-500',
  },
  {
    id: 'story_reply',
    hint: 'Alguém responde o seu story',
    icon: Clapperboard,
    well: 'bg-violet-500',
  },
  {
    id: 'story_mention',
    hint: 'Alguém te marca no story',
    icon: AtSign,
    well: 'bg-fuchsia-500',
  },
];

interface TriggerSetupStepProps {
  draft: AutomationDraft;
  accounts: IGAccountOption[];
  onChange: (draft: AutomationDraft) => void;
  onNext: () => void;
}

export function TriggerSetupStep({ draft, accounts, onChange, onNext }: TriggerSetupStepProps) {
  const canContinue = Boolean(draft.igAccountId && draft.triggerKind);

  return (
    <PageShell className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-4 sm:p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tipo de gatilho</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Escolha como a automação começa — no estilo ManyChat.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-foreground">Conta do Instagram</label>
        <div className="relative">
          <Instagram className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            className="flex h-11 w-full rounded-xl border border-border bg-white py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={draft.igAccountId}
            onChange={(e) => onChange({ ...draft, igAccountId: e.target.value })}
          >
            <option value="">Selecione uma conta</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                @{account.igUsername}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const selected = draft.triggerKind === option.id;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                onChange({
                  ...draft,
                  triggerKind: option.id,
                  matchType:
                    option.id === 'default_reply' || option.id === 'story_mention'
                      ? 'any'
                      : draft.matchType,
                  replyEnabled:
                    option.id === 'comment' || option.id === 'live_comment'
                      ? draft.replyEnabled
                      : false,
                })
              }
              className={cn(
                'group flex gap-3 rounded-2xl border p-4 text-left transition-all',
                selected
                  ? 'border-zinc-900 bg-zinc-900 text-white shadow-soft'
                  : 'border-border bg-white hover:border-zinc-300 hover:bg-muted/40'
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
                  selected ? 'bg-white/15 ring-1 ring-white/20' : option.well
                )}
              >
                <Icon className="h-5 w-5 text-white" strokeWidth={2.25} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-snug">
                  {TRIGGER_KIND_LABELS[option.id]}
                </span>
                <span
                  className={cn(
                    'mt-1 block text-xs leading-relaxed',
                    selected ? 'text-white/70' : 'text-muted-foreground'
                  )}
                >
                  {option.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex justify-end">
        <Button type="button" onClick={onNext} disabled={!canContinue}>
          Continuar
        </Button>
      </div>
    </PageShell>
  );
}
