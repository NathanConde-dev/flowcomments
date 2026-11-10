'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { AutomationDraft, FlowNodeId, IGAccountOption, MatchType } from './types';

interface NodeInspectorProps {
  selected: FlowNodeId;
  draft: AutomationDraft;
  accounts: IGAccountOption[];
  onChange: (next: AutomationDraft) => void;
}

const titles: Record<FlowNodeId, { title: string; description: string }> = {
  start: {
    title: 'Início',
    description: 'Nome da automação e conta do Instagram.',
  },
  trigger: {
    title: 'Gatilho de comentário',
    description: 'Quando um comentário combinar com as palavras-chave.',
  },
  reply: {
    title: 'Responder comentário',
    description: 'Resposta pública no comentário que disparou o fluxo.',
  },
  dm: {
    title: 'Enviar DM',
    description: 'Mensagem privada enviada após o gatilho.',
  },
};

export function NodeInspector({ selected, draft, accounts, onChange }: NodeInspectorProps) {
  const meta = titles[selected];

  const updateKeyword = (index: number, value: string) => {
    const keywords = [...draft.keywords];
    keywords[index] = value;
    onChange({ ...draft, keywords });
  };

  const addKeyword = () => onChange({ ...draft, keywords: [...draft.keywords, ''] });

  const removeKeyword = (index: number) => {
    onChange({
      ...draft,
      keywords: draft.keywords.filter((_, i) => i !== index),
    });
  };

  return (
    <aside className="flex h-full w-full flex-col border-t border-border bg-card lg:w-[360px] lg:border-l lg:border-t-0">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-bold text-foreground">{meta.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {selected === 'start' && (
          <>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Nome da automação
              </label>
              <Input
                value={draft.name}
                onChange={(e) => onChange({ ...draft, name: e.target.value })}
                placeholder="Ex: Resposta para preço"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Conta do Instagram
              </label>
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
          </>
        )}

        {selected === 'trigger' && (
          <>
            <div className="rounded-xl border border-border bg-muted/60 p-3 text-sm">
              <p className="font-semibold text-foreground">Publicações</p>
              <p className="mt-1 text-muted-foreground">
                {draft.mediaScope === 'any'
                  ? 'Qualquer publicação ou Reel'
                  : `${draft.selectedPosts.length} selecionada${draft.selectedPosts.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Palavras-chave
              </label>
              <div className="space-y-2">
                {draft.keywords.map((keyword, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={keyword}
                      onChange={(e) => updateKeyword(index, e.target.value)}
                      placeholder="Ex: preço"
                    />
                    {draft.keywords.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeKeyword(index)}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addKeyword} className="mt-2">
                + Adicionar palavra-chave
              </Button>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Tipo de correspondência
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={draft.matchType}
                onChange={(e) =>
                  onChange({ ...draft, matchType: e.target.value as MatchType })
                }
              >
                <option value="contains">Contém</option>
                <option value="exact">Exato</option>
                <option value="starts_with">Começa com</option>
                <option value="ends_with">Termina com</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={draft.caseSensitive}
                onChange={(e) => onChange({ ...draft, caseSensitive: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              Diferenciar maiúsculas/minúsculas
            </label>
          </>
        )}

        {selected === 'reply' && (
          <>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={draft.replyEnabled}
                onChange={(e) => onChange({ ...draft, replyEnabled: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              Ativar resposta no comentário
            </label>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Texto da resposta
              </label>
              <textarea
                disabled={!draft.replyEnabled}
                className="flex min-h-[140px] w-full rounded-md border border-border bg-white px-3 py-2 text-sm disabled:bg-muted disabled:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={draft.replyComment}
                onChange={(e) => onChange({ ...draft, replyComment: e.target.value })}
                placeholder="Ex: Olá! Enviei os detalhes no seu direct"
              />
            </div>
          </>
        )}

        {selected === 'dm' && (
          <>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={draft.dmEnabled}
                onChange={(e) => onChange({ ...draft, dmEnabled: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              Ativar envio de DM
            </label>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Texto da DM
              </label>
              <textarea
                disabled={!draft.dmEnabled}
                className="flex min-h-[140px] w-full rounded-md border border-border bg-white px-3 py-2 text-sm disabled:bg-muted disabled:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={draft.sendDm}
                onChange={(e) => onChange({ ...draft, sendDm: e.target.value })}
                placeholder="Ex: Oi! O preço do produto é R$ 99,90."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Delay (segundos)
              </label>
              <Input
                type="number"
                min={0}
                disabled={!draft.dmEnabled}
                value={draft.dmDelay}
                onChange={(e) =>
                  onChange({ ...draft, dmDelay: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
