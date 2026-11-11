'use client';

import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/motion';
import {
  TRIGGER_KIND_LABELS,
  type AutomationDraft,
  type IGAccountOption,
  type TriggerKind,
} from './types';

const OPTIONS: Array<{ id: TriggerKind; hint: string }> = [
  { id: 'comment', hint: 'Comentário em post ou reel com palavra-chave' },
  { id: 'live_comment', hint: 'Comentário durante o Instagram Live' },
  { id: 'dm_keyword', hint: 'Mensagem no direct com palavra-chave' },
  { id: 'default_reply', hint: 'Resposta padrão quando nenhuma outra automação casa' },
  { id: 'story_reply', hint: 'Alguém responde o seu story' },
  { id: 'story_mention', hint: 'Alguém te marca no story' },
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
        <select
          className="flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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

      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const selected = draft.triggerKind === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                onChange({
                  ...draft,
                  triggerKind: option.id,
                  matchType: option.id === 'default_reply' || option.id === 'story_mention' ? 'any' : draft.matchType,
                  replyEnabled:
                    option.id === 'comment' || option.id === 'live_comment'
                      ? draft.replyEnabled
                      : false,
                })
              }
              className={`rounded-2xl border p-4 text-left transition-colors ${
                selected
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-border bg-white hover:border-zinc-300 hover:bg-muted/40'
              }`}
            >
              <p className="text-sm font-bold">{TRIGGER_KIND_LABELS[option.id]}</p>
              <p className={`mt-1 text-xs ${selected ? 'text-white/70' : 'text-muted-foreground'}`}>
                {option.hint}
              </p>
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
