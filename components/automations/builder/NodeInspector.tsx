'use client';

import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { TEMPLATE_VARIABLE_HINTS } from '@/lib/automation/types';
import {
  TRIGGER_KIND_LABELS,
  firstVariant,
  needsKeywords,
  type AutomationDraft,
  type ConditionRule,
  type DelayUnit,
  type FlowNodeId,
  type IGAccountOption,
  type MatchType,
  type VariantPickMode,
} from './types';
import { DmMediaFields } from './DmMediaFields';
import { InspectorAccordion } from './InspectorAccordion';

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
    description: 'Resumo fixo do gatilho e do conteúdo escolhidos nos passos anteriores.',
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
    description: 'Ramifica o fluxo: Sim continua, Não encerra.',
  },
  conditionElse: {
    title: 'Senão (Não)',
    description: 'Quando a condição falha, o fluxo para neste ramo.',
  },
  addTag: {
    title: 'Adicionar tag',
    description: 'Marca o contato para segmentação e condições.',
  },
  askInput: {
    title: 'Pedir dado',
    description: 'Pergunta algo no DM e salva a resposta no contato.',
  },
  handoff: {
    title: 'Falar com humano',
    description:
      'Envia uma mensagem e pausa a automação até alguém retomar no Inbox.',
  },
};

function VariableHints({
  onInsert,
  disabled,
}: {
  onInsert: (token: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TEMPLATE_VARIABLE_HINTS.map((item) => (
        <button
          key={item.key}
          type="button"
          disabled={disabled}
          onClick={() => onInsert(`{{${item.key}}}`)}
          className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:border-zinc-400 hover:text-foreground disabled:opacity-50"
          title={item.label}
        >
          {`{{${item.key}}}`}
        </button>
      ))}
    </div>
  );
}

function TextVariantsEditor({
  label,
  hint,
  variants,
  disabled,
  placeholder,
  onChange,
  compact,
}: {
  label: string;
  hint: string;
  variants: string[];
  disabled?: boolean;
  placeholder: string;
  onChange: (next: string[]) => void;
  compact?: boolean;
}) {
  const list = variants.length > 0 ? variants : [''];

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-semibold text-foreground">{label}</label>
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      </div>
      <VariableHints
        disabled={disabled}
        onInsert={(token) => {
          const next = [...list];
          const index = Math.max(0, next.length - 1);
          next[index] = `${next[index] || ''}${token}`;
          onChange(next);
        }}
      />
      <div className="space-y-2">
        {list.map((variant, index) => (
          <div key={index} className="space-y-1.5 rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Variante {index + 1}
              </span>
              {list.length > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => onChange(list.filter((_, i) => i !== index))}
                >
                  Remover
                </Button>
              ) : null}
            </div>
            <textarea
              disabled={disabled}
              className={`flex w-full rounded-md border border-border bg-white px-3 py-2 text-sm disabled:bg-muted disabled:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                compact ? 'min-h-[72px]' : 'min-h-[100px]'
              }`}
              value={variant}
              onChange={(e) => {
                const next = [...list];
                next[index] = e.target.value;
                onChange(next);
              }}
              placeholder={placeholder}
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || list.length >= 8}
        onClick={() => onChange([...list, ''])}
      >
        + Adicionar variante
      </Button>
    </div>
  );
}

function VariantModeSelect({
  value,
  onChange,
}: {
  value: VariantPickMode;
  onChange: (mode: VariantPickMode) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-foreground">
        Como escolher a variante
      </label>
      <select
        className="flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value as VariantPickMode)}
      >
        <option value="random">Aleatória (ManyChat-style)</option>
        <option value="sequential">Sequencial (roda na ordem)</option>
      </select>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Sequencial lembra a última variante por contato e avança a cada envio.
      </p>
    </div>
  );
}

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

  const startAccount = accounts.find((a) => a.id === draft.igAccountId);

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

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {selected === 'start' && (
          <>
            <div className="rounded-xl border border-border bg-muted/50 p-3 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Tipo de automação
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {TRIGGER_KIND_LABELS[draft.triggerKind]}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/50 p-3 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Conta do Instagram
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {startAccount ? `@${startAccount.igUsername}` : 'Conta não definida'}
              </p>
            </div>

            {(draft.triggerKind === 'comment' || draft.triggerKind === 'live_comment') && (
              <div className="rounded-xl border border-border bg-muted/50 p-3 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Conteúdo
                </p>
                {draft.mediaScope === 'any' ? (
                  <p className="mt-1 font-semibold text-foreground">Qualquer publicação ou Reel</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {draft.selectedPosts.length} selecionada
                      {draft.selectedPosts.length === 1 ? '' : 's'}
                    </p>
                    {draft.selectedPosts.slice(0, 4).map((post) => (
                      <div key={post.id} className="flex items-center gap-2">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {post.thumbnailUrl || post.mediaUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={post.thumbnailUrl || post.mediaUrl || ''}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <p className="line-clamp-2 text-xs text-foreground">
                          {post.caption?.trim() || post.id}
                        </p>
                      </div>
                    ))}
                    {draft.selectedPosts.length > 4 ? (
                      <p className="text-[11px] text-muted-foreground">
                        +{draft.selectedPosts.length - 4} mais
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            <p className="text-xs leading-relaxed text-muted-foreground">
              Este bloco é fixo. Para mudar conta, tipo ou posts, use Voltar nos passos anteriores.
              O nome da automação fica no topo da página.
            </p>
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
                <InspectorAccordion
                  title="Palavras-chave"
                  summary={
                    draft.keywords.filter((k) => k.trim()).join(', ') ||
                    'Defina o que dispara o fluxo'
                  }
                  defaultOpen
                >
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
                  <Button type="button" variant="outline" size="sm" onClick={addKeyword}>
                    + Adicionar palavra-chave
                  </Button>
                </InspectorAccordion>

                <InspectorAccordion
                  title="Correspondência"
                  summary={`${
                    draft.matchType === 'exact'
                      ? 'Exato'
                      : draft.matchType === 'starts_with'
                        ? 'Começa com'
                        : draft.matchType === 'ends_with'
                          ? 'Termina com'
                          : draft.matchType === 'any'
                            ? 'Qualquer'
                            : 'Contém'
                  }${draft.caseSensitive ? ' · case-sensitive' : ''}`}
                >
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-foreground">
                      Tipo
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
                </InspectorAccordion>
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
            <InspectorAccordion
              title="Texto da resposta"
              summary={
                firstVariant(draft.replyVariants) ||
                `${draft.replyVariants.filter((v) => v.trim()).length || 0} variante(s)`
              }
              defaultOpen
            >
              <VariantModeSelect
                value={draft.variantPickMode}
                onChange={(variantPickMode) => onChange({ ...draft, variantPickMode })}
              />
              <TextVariantsEditor
                label="Variantes"
                hint="Use {{nome}}, {{username}}, {{comentario}}… Com várias variantes, uma é escolhida a cada envio."
                disabled={!draft.replyEnabled}
                variants={draft.replyVariants}
                placeholder="Ex: Oi {{primeiro_nome}}! Enviei os detalhes no direct"
                onChange={(replyVariants) => onChange({ ...draft, replyVariants })}
              />
            </InspectorAccordion>
          </>
        )}

        {selected === 'delay' && (
          <div className="space-y-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Tempo de espera
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  value={draft.delayAmount}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      delayAmount: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="flex-1"
                />
                <select
                  className="flex h-10 w-[9.5rem] shrink-0 rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={draft.delayUnit}
                  onChange={(e) =>
                    onChange({ ...draft, delayUnit: e.target.value as DelayUnit })
                  }
                >
                  <option value="seconds">Segundos</option>
                  <option value="minutes">Minutos</option>
                  <option value="days">Dias</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              O fluxo pausa por esse intervalo antes de seguir para a próxima ação.
            </p>
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
              No canvas: ramo <strong>Sim</strong> continua o fluxo; ramo <strong>Não</strong>{' '}
              encerra (nó “Senão”).
            </p>
          </>
        )}

        {selected === 'conditionElse' && (
          <div className="rounded-xl border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            Este ramo representa a falha da condição. Hoje ele só encerra o fluxo — sem ações
            extras. O ramo Sim leva para DM, tags, follow gate, etc.
          </div>
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

        {selected === 'handoff' && (
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Mensagem ao transferir
            </label>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={draft.handoffText}
              onChange={(e) => onChange({ ...draft, handoffText: e.target.value })}
              placeholder="Um atendente vai te responder em breve."
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              A automação pausa até alguém retomar no Inbox.
            </p>
          </div>
        )}

        {selected === 'askInput' && (
          <>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Pergunta</label>
              <VariableHints
                onInsert={(token) =>
                  onChange({
                    ...draft,
                    askInputPrompt: `${draft.askInputPrompt || ''}${token}`,
                  })
                }
              />
              <textarea
                className="mt-2 flex min-h-[100px] w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={draft.askInputPrompt}
                onChange={(e) => onChange({ ...draft, askInputPrompt: e.target.value })}
                placeholder="Oi {{primeiro_nome}}, me envia seu e-mail:"
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
            <InspectorAccordion
              title="Pedido pra seguir"
              summary={
                firstVariant(draft.gatePromptVariants) ||
                'Texto do private reply + botão'
              }
              defaultOpen
            >
              <VariantModeSelect
                value={draft.variantPickMode}
                onChange={(variantPickMode) => onChange({ ...draft, variantPickMode })}
              />
              <TextVariantsEditor
                label="Texto do private reply"
                hint="Variantes + variáveis {{nome}}, {{username}}…"
                variants={draft.gatePromptVariants}
                placeholder="Toque abaixo pra receber o link — precisa estar me seguindo."
                onChange={(gatePromptVariants) =>
                  onChange({ ...draft, gatePromptVariants })
                }
              />
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
            </InspectorAccordion>
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
            <InspectorAccordion
              title={draft.followCheckEnabled ? 'Conteúdo liberado' : 'Texto da DM'}
              summary={
                firstVariant(draft.dmVariants) ||
                `${draft.dmVariants.filter((v) => v.trim()).length || 0} variante(s)`
              }
              defaultOpen
            >
              <VariantModeSelect
                value={draft.variantPickMode}
                onChange={(variantPickMode) => onChange({ ...draft, variantPickMode })}
              />
              <TextVariantsEditor
                label="Variantes"
                hint="Variáveis {{nome}}, {{username}}… e variantes rotativas."
                disabled={!draft.dmEnabled && !draft.followCheckEnabled}
                variants={draft.dmVariants}
                placeholder="Ex: Oi {{primeiro_nome}}! O preço é R$ 99,90."
                onChange={(dmVariants) => onChange({ ...draft, dmVariants })}
              />
            </InspectorAccordion>

            <InspectorAccordion
              title="Mídia"
              summary={
                [
                  draft.dmImageUrl.trim() || draft.dmImageAttachmentId.trim()
                    ? 'imagem'
                    : null,
                  draft.dmAudioUrl.trim() || draft.dmAudioAttachmentId.trim()
                    ? 'áudio'
                    : null,
                ]
                  .filter(Boolean)
                  .join(' + ') || 'Imagem e áudio opcionais'
              }
            >
              <DmMediaFields
                draft={draft}
                disabled={!draft.dmEnabled && !draft.followCheckEnabled}
                onChange={onChange}
              />
            </InspectorAccordion>

            {!draft.followCheckEnabled && (
              <InspectorAccordion
                title="Botões"
                summary={
                  draft.dmButtons.length
                    ? draft.dmButtons
                        .map((b) => b.title.trim() || 'Sem título')
                        .join(', ')
                    : 'Até 3 botões (link, resposta, handoff)'
                }
                defaultOpen={draft.dmButtons.length > 0}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">Máximo 3 botões</p>
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
                            url: '',
                            responseVariants: [''],
                            addTag: '',
                            requireFollow: true,
                            notFollowingVariants: [
                              'Hum, olhei aqui e ainda não seguiu. Segue que te mando o link.',
                            ],
                            handoff: false,
                          },
                        ],
                      })
                    }
                  >
                    + Botão
                  </Button>
                </div>
                {draft.dmButtons.map((button, index) => (
                  <InspectorAccordion
                    key={index}
                    title={button.title.trim() || `Botão ${index + 1}`}
                    summary={
                      button.url?.trim()
                        ? 'Link'
                        : button.handoff
                          ? 'Handoff'
                          : button.requireFollow
                            ? 'Exige follow'
                            : firstVariant(button.responseVariants) || 'Postback'
                    }
                    defaultOpen={index === 0}
                  >
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
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Link (abre URL — ideal p/ checkout)
                      </label>
                      <Input
                        value={button.url || ''}
                        onChange={(e) => {
                          const dmButtons = [...draft.dmButtons];
                          dmButtons[index] = { ...button, url: e.target.value };
                          onChange({ ...draft, dmButtons });
                        }}
                        placeholder="https://seu-checkout.com/..."
                      />
                    </div>
                    {!button.url?.trim() && (
                      <>
                        <TextVariantsEditor
                          label="Resposta ao tocar"
                          hint="Variantes da resposta do botão."
                          compact
                          variants={button.responseVariants}
                          placeholder="Resposta liberada ao tocar"
                          onChange={(responseVariants) => {
                            const dmButtons = [...draft.dmButtons];
                            dmButtons[index] = { ...button, responseVariants };
                            onChange({ ...draft, dmButtons });
                          }}
                        />
                        <ToggleSwitch
                          checked={Boolean(button.handoff)}
                          onCheckedChange={(handoff) => {
                            const dmButtons = [...draft.dmButtons];
                            dmButtons[index] = {
                              ...button,
                              handoff,
                              requireFollow: handoff ? false : button.requireFollow,
                            };
                            onChange({ ...draft, dmButtons });
                          }}
                          label="Transferir para humano"
                        />
                        {!button.handoff && (
                          <>
                            <ToggleSwitch
                              checked={Boolean(button.requireFollow)}
                              onCheckedChange={(requireFollow) => {
                                const dmButtons = [...draft.dmButtons];
                                dmButtons[index] = {
                                  ...button,
                                  requireFollow,
                                  notFollowingVariants: firstVariant(
                                    button.notFollowingVariants
                                  )
                                    ? button.notFollowingVariants
                                    : [
                                        'Hum, olhei aqui e ainda não seguiu. Segue que te mando o link.',
                                      ],
                                };
                                onChange({ ...draft, dmButtons });
                              }}
                              label="Só libera se seguir"
                            />
                            {button.requireFollow && (
                              <TextVariantsEditor
                                label="Se ainda não segue"
                                hint="Variantes do pedido pra seguir."
                                compact
                                variants={button.notFollowingVariants}
                                placeholder="Mensagem se ainda não segue"
                                onChange={(notFollowingVariants) => {
                                  const dmButtons = [...draft.dmButtons];
                                  dmButtons[index] = {
                                    ...button,
                                    notFollowingVariants,
                                  };
                                  onChange({ ...draft, dmButtons });
                                }}
                              />
                            )}
                          </>
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
                      </>
                    )}
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
                  </InspectorAccordion>
                ))}
              </InspectorAccordion>
            )}
          </>
        )}

        {selected === 'dmNotFollowing' && (
          <InspectorAccordion
            title="Pedido pra seguir"
            summary={
              firstVariant(draft.dmIfNotFollowingVariants) ||
              `Botão: ${draft.recheckButtonLabel || 'Já segui'}`
            }
            defaultOpen
          >
            <TextVariantsEditor
              label="Mensagem se ainda não segue"
              hint="Variantes usadas quando o follow check falha."
              variants={draft.dmIfNotFollowingVariants}
              placeholder="Hum, olhei aqui e ainda não seguiu. Segue que te mando o link."
              onChange={(dmIfNotFollowingVariants) =>
                onChange({ ...draft, dmIfNotFollowingVariants })
              }
            />
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
          </InspectorAccordion>
        )}
      </div>
    </aside>
  );
}
