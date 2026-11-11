'use client';

import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import {
  TRIGGER_KIND_LABELS,
  needsKeywords,
  type AutomationDraft,
  type ConditionRule,
  type FlowNodeId,
  type IGAccountOption,
  type MatchType,
} from './types';

interface NodeInspectorProps {
  selected: FlowNodeId;
  draft: AutomationDraft;
  accounts: IGAccountOption[];
  onChange: (next: AutomationDraft) => void;
  onClose?: () => void;
}

const titles: Record<FlowNodeId, { title: string; description: string }> = {
  start: {
    title: 'Início',
    description: 'Nome da automação e conta do Instagram.',
  },
  trigger: {
    title: 'Gatilho',
    description: 'Quando esta automação deve disparar.',
  },
  reply: {
    title: 'Responder comentário',
    description: 'Resposta pública no comentário que disparou o fluxo.',
  },
  followCheck: {
    title: 'Só se seguiu',
    description:
      'Envia um private reply com botão. Só libera o conteúdo depois de confirmar que a pessoa te segue.',
  },
  dm: {
    title: 'Enviar DM',
    description: 'Mensagem privada enviada após o gatilho.',
  },
  dmNotFollowing: {
    title: 'Pedir pra seguir',
    description: 'Mensagem + botão de rechecagem quando a pessoa ainda não segue.',
  },
  delay: {
    title: 'Delay',
    description: 'Espera antes de continuar o fluxo.',
  },
  condition: {
    title: 'Condição',
    description: 'Ramifica o fluxo com base em tag, campo ou follow.',
  },
  addTag: {
    title: 'Adicionar tag',
    description: 'Marca o contato para segmentação e condições.',
  },
  askInput: {
    title: 'Pedir dado',
    description: 'Pergunta algo no DM e salva a resposta no contato.',
  },
};

export function NodeInspector({ selected, draft, accounts, onChange, onClose }: NodeInspectorProps) {
  const meta =
    selected === 'dm' && draft.followCheckEnabled
      ? {
          title: 'Conteúdo liberado',
          description: 'DM enviada só se a pessoa estiver te seguindo.',
        }
      : titles[selected];

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
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">{meta.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Fechar painel"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
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
              <p className="font-semibold text-foreground">
                {TRIGGER_KIND_LABELS[draft.triggerKind]}
              </p>
              {(draft.triggerKind === 'comment' || draft.triggerKind === 'live_comment') && (
                <p className="mt-1 text-muted-foreground">
                  {draft.mediaScope === 'any'
                    ? 'Qualquer publicação ou Reel'
                    : `${draft.selectedPosts.length} selecionada${draft.selectedPosts.length === 1 ? '' : 's'}`}
                </p>
              )}
            </div>

            {needsKeywords(draft.triggerKind) && (
              <>
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addKeyword}
                    className="mt-2"
                  >
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
                    <option value="any">Qualquer mensagem</option>
                  </select>
                </div>

                <ToggleSwitch
                  checked={draft.caseSensitive}
                  onCheckedChange={(caseSensitive) => onChange({ ...draft, caseSensitive })}
                  label="Diferenciar maiúsculas/minúsculas"
                />
              </>
            )}
          </>
        )}

        {selected === 'reply' && (
          <>
            <ToggleSwitch
              checked={draft.replyEnabled}
              onCheckedChange={(replyEnabled) => onChange({ ...draft, replyEnabled })}
              label="Ativar resposta no comentário"
            />
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

        {selected === 'delay' && (
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Segundos de espera
            </label>
            <Input
              type="number"
              min={0}
              value={draft.delaySeconds}
              onChange={(e) =>
                onChange({ ...draft, delaySeconds: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </div>
        )}

        {selected === 'condition' && (
          <>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Regra</label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={draft.conditionRule}
                onChange={(e) =>
                  onChange({ ...draft, conditionRule: e.target.value as ConditionRule })
                }
              >
                <option value="has_tag">Tem tag</option>
                <option value="field_equals">Campo igual a</option>
                <option value="follows">Segue a conta</option>
              </select>
            </div>
            {draft.conditionRule === 'has_tag' && (
              <Input
                value={draft.conditionTag}
                onChange={(e) => onChange({ ...draft, conditionTag: e.target.value })}
                placeholder="Ex: vip"
              />
            )}
            {draft.conditionRule === 'field_equals' && (
              <div className="space-y-2">
                <Input
                  value={draft.conditionField}
                  onChange={(e) => onChange({ ...draft, conditionField: e.target.value })}
                  placeholder="Campo (ex: email)"
                />
                <Input
                  value={draft.conditionValue}
                  onChange={(e) => onChange({ ...draft, conditionValue: e.target.value })}
                  placeholder="Valor esperado"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Se passar, continua o fluxo; se falhar, pula ações seguintes até o próximo ramo
              explícito (then/else no runtime).
            </p>
          </>
        )}

        {selected === 'addTag' && (
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Tag</label>
            <Input
              value={draft.tagToAdd}
              onChange={(e) => onChange({ ...draft, tagToAdd: e.target.value })}
              placeholder="Ex: lead"
            />
          </div>
        )}

        {selected === 'askInput' && (
          <>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Pergunta</label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={draft.askInputPrompt}
                onChange={(e) => onChange({ ...draft, askInputPrompt: e.target.value })}
                placeholder="Me envia seu e-mail:"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Salvar como
              </label>
              <Input
                value={draft.askInputSaveKey}
                onChange={(e) => onChange({ ...draft, askInputSaveKey: e.target.value })}
                placeholder="email"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Tipo</label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={draft.askInputFieldType}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    askInputFieldType: e.target.value as 'text' | 'email' | 'phone',
                  })
                }
              >
                <option value="text">Texto</option>
                <option value="email">E-mail</option>
                <option value="phone">Telefone</option>
              </select>
            </div>
          </>
        )}

        {selected === 'followCheck' && (
          <>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Texto do private reply
              </label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={draft.gatePrompt}
                onChange={(e) => onChange({ ...draft, gatePrompt: e.target.value })}
                placeholder="Toque abaixo pra receber o link — precisa estar me seguindo."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Texto do botão
              </label>
              <Input
                value={draft.gateButtonLabel}
                onChange={(e) => onChange({ ...draft, gateButtonLabel: e.target.value })}
                placeholder="Já sigo"
                maxLength={20}
              />
            </div>
          </>
        )}

        {selected === 'dm' && (
          <>
            {!draft.followCheckEnabled && (
              <ToggleSwitch
                checked={draft.dmEnabled}
                onCheckedChange={(dmEnabled) => onChange({ ...draft, dmEnabled })}
                label="Ativar envio de DM"
              />
            )}
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                {draft.followCheckEnabled ? 'Conteúdo / link liberado' : 'Texto da DM'}
              </label>
              <textarea
                disabled={!draft.dmEnabled && !draft.followCheckEnabled}
                className="flex min-h-[140px] w-full rounded-md border border-border bg-white px-3 py-2 text-sm disabled:bg-muted disabled:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={draft.sendDm}
                onChange={(e) => onChange({ ...draft, sendDm: e.target.value })}
                placeholder="Ex: Oi! O preço do produto é R$ 99,90."
              />
            </div>

            {!draft.followCheckEnabled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-foreground">Botões</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={draft.dmButtons.length >= 3}
                    onClick={() =>
                      onChange({
                        ...draft,
                        dmButtons: [
                          ...draft.dmButtons,
                          {
                            title: 'Receber link',
                            responseText: '',
                            addTag: '',
                            requireFollow: true,
                            notFollowingText:
                              'Hum, olhei aqui e ainda não seguiu. Segue que te mando o link.',
                          },
                        ],
                      })
                    }
                  >
                    + Botão
                  </Button>
                </div>
                {draft.dmButtons.map((button, index) => (
                  <div key={index} className="space-y-2 rounded-xl border border-border p-3">
                    <Input
                      value={button.title}
                      maxLength={20}
                      onChange={(e) => {
                        const dmButtons = [...draft.dmButtons];
                        dmButtons[index] = { ...button, title: e.target.value };
                        onChange({ ...draft, dmButtons });
                      }}
                      placeholder="Título do botão"
                    />
                    <textarea
                      className="flex min-h-[72px] w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={button.responseText}
                      onChange={(e) => {
                        const dmButtons = [...draft.dmButtons];
                        dmButtons[index] = { ...button, responseText: e.target.value };
                        onChange({ ...draft, dmButtons });
                      }}
                      placeholder="Resposta liberada ao tocar"
                    />
                    <ToggleSwitch
                      checked={Boolean(button.requireFollow)}
                      onCheckedChange={(requireFollow) => {
                        const dmButtons = [...draft.dmButtons];
                        dmButtons[index] = {
                          ...button,
                          requireFollow,
                          notFollowingText:
                            button.notFollowingText ||
                            'Hum, olhei aqui e ainda não seguiu. Segue que te mando o link.',
                        };
                        onChange({ ...draft, dmButtons });
                      }}
                      label="Só libera se seguir"
                    />
                    {button.requireFollow && (
                      <textarea
                        className="flex min-h-[72px] w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={button.notFollowingText || ''}
                        onChange={(e) => {
                          const dmButtons = [...draft.dmButtons];
                          dmButtons[index] = {
                            ...button,
                            notFollowingText: e.target.value,
                          };
                          onChange({ ...draft, dmButtons });
                        }}
                        placeholder="Mensagem se ainda não segue"
                      />
                    )}
                    <Input
                      value={button.addTag}
                      onChange={(e) => {
                        const dmButtons = [...draft.dmButtons];
                        dmButtons[index] = { ...button, addTag: e.target.value };
                        onChange({ ...draft, dmButtons });
                      }}
                      placeholder="Tag opcional ao liberar"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onChange({
                          ...draft,
                          dmButtons: draft.dmButtons.filter((_, i) => i !== index),
                        })
                      }
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {selected === 'dmNotFollowing' && (
          <>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Mensagem se ainda não segue
              </label>
              <textarea
                className="flex min-h-[140px] w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={draft.dmIfNotFollowing}
                onChange={(e) => onChange({ ...draft, dmIfNotFollowing: e.target.value })}
                placeholder="Hum, olhei aqui e ainda não seguiu. Segue que te mando o link."
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Se a pessoa tocar em Já segui e ainda não seguir, a gente troca entre algumas
                mensagens pra não parecer robô.
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Botão de rechecagem
              </label>
              <Input
                value={draft.recheckButtonLabel}
                onChange={(e) => onChange({ ...draft, recheckButtonLabel: e.target.value })}
                placeholder="Já segui"
                maxLength={20}
              />
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
