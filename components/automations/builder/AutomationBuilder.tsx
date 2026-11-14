'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FlowCanvas } from './FlowCanvas';
import { NodeInspector } from './NodeInspector';
import { PostSelectStep } from './PostSelectStep';
import { TriggerSetupStep } from './TriggerSetupStep';
import { AutomationBuilderSkeleton } from '@/components/ui/skeletons';
import {
  DEFAULT_NODE_POSITIONS,
  applyAutomationTemplate,
  defaultAutomationDraft,
  delayToSeconds,
  filledVariants,
  firstVariant,
  needsKeywords,
  needsPostSelection,
  splitDelaySeconds,
  type AutomationDraft,
  type AutomationTemplateId,
  type BuilderStep,
  type FlowNodeId,
  type IGAccountOption,
  type InstagramMediaPost,
  type MatchType,
  type MediaScope,
  type TriggerKind,
} from './types';
import { toast } from '@/lib/ui/toast';
import { signalEngagement } from '@/lib/engagement/storage';
import { normalizeTextVariants } from '@/lib/automation/types';

type AutomationBuilderProps = {
  automationId?: string;
};

type ActionConfig = {
  type: string;
  text?: string;
  texts?: string[];
  textPickMode?: 'random' | 'sequential';
  delay?: number;
  prompt?: string;
  promptTexts?: string[];
  buttonLabel?: string;
  rewardText?: string;
  notFollowingText?: string;
  notFollowingTexts?: string[];
  recheckButtonLabel?: string;
  imageUrl?: string;
  imageAttachmentId?: string;
  audioUrl?: string;
  audioAttachmentId?: string;
  tag?: string;
  buttons?: Array<{
    title: string;
    url?: string;
    responseText?: string;
    responseTexts?: string[];
    addTag?: string;
    handoff?: boolean;
    requireFollow?: boolean;
    notFollowingText?: string;
    notFollowingTexts?: string[];
  }>;
  rule?: string;
  field?: string;
  value?: string;
  then?: ActionConfig[];
  else?: ActionConfig[];
  saveKey?: string;
  fieldType?: 'text' | 'email' | 'phone';
};

function withPickMode<T extends ActionConfig>(
  action: T,
  mode: 'random' | 'sequential'
): T {
  return mode === 'sequential' ? { ...action, textPickMode: 'sequential' } : action;
}

function actionVariants(action?: ActionConfig | null, fallbackText?: string): string[] {
  return normalizeTextVariants(action?.texts, action?.text, fallbackText);
}

function draftFromAutomation(automation: {
  name: string;
  igAccountId: string;
  triggerType?: string;
  triggerConfig: {
    trigger?: {
      keywords?: string[];
      matchType?: MatchType;
      caseSensitive?: boolean;
      mediaScope?: MediaScope;
      mediaIds?: string[];
    };
  };
  actionsConfig: {
    actions?: ActionConfig[];
    canvas?: {
      nodePositions?: Partial<AutomationDraft['nodePositions']>;
    };
  };
}): { draft: AutomationDraft; mediaIds: string[] } {
  const trigger = automation.triggerConfig?.trigger || {};
  const actions = automation.actionsConfig?.actions || [];
  const savedPositions = automation.actionsConfig?.canvas?.nodePositions || {};
  const findDeep = (list: ActionConfig[], type: ActionConfig['type']): ActionConfig | undefined => {
    for (const action of list) {
      if (action.type === type) return action;
      const nested =
        (action.then && findDeep(action.then, type)) ||
        (action.else && findDeep(action.else, type));
      if (nested) return nested;
    }
    return undefined;
  };
  const reply = findDeep(actions, 'reply_comment');
  const followGate = findDeep(actions, 'follow_gate');
  const dm = findDeep(actions, 'send_dm');
  const delay = findDeep(actions, 'delay');
  const condition = actions.find((a) => a.type === 'condition');
  const addTag = findDeep(actions, 'add_tag');
  const askInput = findDeep(actions, 'ask_input');
  const handoff = findDeep(actions, 'human_handoff');
  const mediaIds = trigger.mediaIds || [];
  const mediaScope: MediaScope =
    trigger.mediaScope || (mediaIds.length > 0 ? 'specific' : 'any');
  const followCheckEnabled = Boolean(followGate);
  const triggerKind = (automation.triggerType as TriggerKind) || 'comment';

  const base = defaultAutomationDraft();

  return {
    mediaIds,
    draft: {
      ...base,
      name: automation.name || '',
      igAccountId: automation.igAccountId || '',
      triggerKind,
      mediaScope,
      selectedPosts: mediaIds.map((id) => ({
        id,
        caption: '',
        mediaType: 'IMAGE',
        mediaUrl: null,
        thumbnailUrl: null,
        permalink: '',
        timestamp: '',
        isReel: false,
      })),
      keywords: trigger.keywords?.length ? trigger.keywords : triggerKind === 'default_reply' ? [] : [''],
      matchType: trigger.matchType || (triggerKind === 'default_reply' ? 'any' : 'contains'),
      caseSensitive: Boolean(trigger.caseSensitive),
      replyEnabled: Boolean(reply),
      replyVariants: actionVariants(reply),
      dmEnabled: followCheckEnabled || Boolean(dm),
      dmVariants: actionVariants(
        followGate
          ? { type: 'follow_gate', text: followGate.rewardText, texts: followGate.texts }
          : dm
      ),
      dmImageUrl: followGate?.imageUrl || dm?.imageUrl || '',
      dmImageAttachmentId:
        followGate?.imageAttachmentId || dm?.imageAttachmentId || '',
      dmAudioUrl: followGate?.audioUrl || dm?.audioUrl || '',
      dmAudioAttachmentId:
        followGate?.audioAttachmentId || dm?.audioAttachmentId || '',
      dmAudioName:
        followGate?.audioUrl || dm?.audioUrl
          ? 'Áudio anexado'
          : '',
      variantPickMode:
        reply?.textPickMode === 'sequential' ||
        dm?.textPickMode === 'sequential' ||
        followGate?.textPickMode === 'sequential'
          ? 'sequential'
          : 'random',
      dmDelay: typeof dm?.delay === 'number' ? dm.delay : 0,
      dmButtons: (dm?.buttons || []).map((b) => ({
        title: b.title || '',
        url: b.url || '',
        responseVariants: normalizeTextVariants(b.responseTexts, b.responseText),
        addTag: b.addTag || '',
        requireFollow: Boolean(b.requireFollow),
        notFollowingVariants: normalizeTextVariants(b.notFollowingTexts, b.notFollowingText),
        handoff: Boolean(b.handoff),
      })),
      followCheckEnabled,
      gatePromptVariants: normalizeTextVariants(followGate?.promptTexts, followGate?.prompt),
      gateButtonLabel: followGate?.buttonLabel || 'Já sigo',
      dmIfNotFollowingVariants: normalizeTextVariants(
        followGate?.notFollowingTexts,
        followGate?.notFollowingText
      ),
      recheckButtonLabel:
        !followGate?.recheckButtonLabel || followGate.recheckButtonLabel === 'Verificar de novo'
          ? 'Já segui'
          : followGate.recheckButtonLabel,
      delayEnabled: Boolean(delay),
      ...(() => {
        const split = splitDelaySeconds(typeof delay?.delay === 'number' ? delay.delay : 3);
        return { delayAmount: split.amount, delayUnit: split.unit };
      })(),
      conditionEnabled: Boolean(condition),
      conditionRule: (condition?.rule as AutomationDraft['conditionRule']) || 'has_tag',
      conditionTag: condition?.tag || '',
      conditionField: condition?.field || '',
      conditionValue: condition?.value || '',
      addTagEnabled: Boolean(addTag),
      tagToAdd: addTag?.tag || '',
      askInputEnabled: Boolean(askInput),
      askInputPrompt: askInput?.prompt || '',
      askInputSaveKey: askInput?.saveKey || 'email',
      askInputFieldType: askInput?.fieldType || 'email',
      handoffEnabled: Boolean(handoff),
      handoffText: handoff?.text || 'Um atendente vai te responder em breve.',
      nodePositions: {
        ...DEFAULT_NODE_POSITIONS,
        ...(followCheckEnabled ? {} : { dm: { x: 260, y: 450 } }),
        ...savedPositions,
      },
    },
  };
}

function parseTemplate(value: string | null): AutomationTemplateId | null {
  if (
    value === 'follow-gate' ||
    value === 'reply-dm' ||
    value === 'faq' ||
    value === 'dm-keyword' ||
    value === 'default-reply' ||
    value === 'story-mention'
  ) {
    return value;
  }
  return null;
}

function buildActions(draft: AutomationDraft): ActionConfig[] {
  const actions: ActionConfig[] = [];

  const delaySeconds = delayToSeconds(draft.delayAmount, draft.delayUnit);
  if (draft.delayEnabled && delaySeconds > 0) {
    actions.push({ type: 'delay', delay: delaySeconds });
  }

  const replyTexts = filledVariants(draft.replyVariants);
  if (draft.replyEnabled && replyTexts.length > 0) {
    actions.push(
      withPickMode(
        {
          type: 'reply_comment',
          text: replyTexts[0],
          ...(replyTexts.length > 1 ? { texts: replyTexts } : {}),
        },
        draft.variantPickMode
      )
    );
  }

  if (draft.addTagEnabled && draft.tagToAdd.trim()) {
    actions.push({ type: 'add_tag', tag: draft.tagToAdd.trim() });
  }

  if (draft.askInputEnabled && draft.askInputPrompt.trim() && draft.askInputSaveKey.trim()) {
    actions.push({
      type: 'ask_input',
      prompt: draft.askInputPrompt.trim(),
      saveKey: draft.askInputSaveKey.trim(),
      fieldType: draft.askInputFieldType,
    });
  }

  const deliveryActions: ActionConfig[] = [];

  const dmTexts = filledVariants(draft.dmVariants);
  const gatePrompts = filledVariants(draft.gatePromptVariants);
  const notFollowingTexts = filledVariants(draft.dmIfNotFollowingVariants);
  const imageUrl = draft.dmImageUrl.trim();
  const imageAttachmentId = draft.dmImageAttachmentId.trim();
  const audioUrl = draft.dmAudioUrl.trim();
  const audioAttachmentId = draft.dmAudioAttachmentId.trim();
  const mediaFields = {
    ...(imageUrl ? { imageUrl } : {}),
    ...(imageAttachmentId ? { imageAttachmentId } : {}),
    ...(audioUrl ? { audioUrl } : {}),
    ...(audioAttachmentId ? { audioAttachmentId } : {}),
  };
  const hasMedia = Boolean(imageUrl || imageAttachmentId || audioUrl || audioAttachmentId);
  if (draft.followCheckEnabled) {
    deliveryActions.push(
      withPickMode(
        {
          type: 'follow_gate',
          prompt: gatePrompts[0] || '',
          ...(gatePrompts.length > 1 ? { promptTexts: gatePrompts } : {}),
          buttonLabel: draft.gateButtonLabel.trim().slice(0, 20),
          rewardText: dmTexts[0] || '',
          ...(dmTexts.length > 1 ? { texts: dmTexts } : {}),
          notFollowingText: notFollowingTexts[0] || '',
          ...(notFollowingTexts.length > 1 ? { notFollowingTexts } : {}),
          recheckButtonLabel: (draft.recheckButtonLabel.trim() || 'Já segui').slice(0, 20),
          ...mediaFields,
        },
        draft.variantPickMode
      )
    );
  } else if (draft.dmEnabled && (dmTexts.length > 0 || hasMedia)) {
    deliveryActions.push(
      withPickMode(
        {
          type: 'send_dm',
          text: dmTexts[0] || '',
          ...(dmTexts.length > 1 ? { texts: dmTexts } : {}),
          delay: draft.dmDelay,
          ...mediaFields,
          buttons: draft.dmButtons
            .filter((b) => b.title.trim())
            .map((b) => {
              const url = b.url.trim();
              if (url) {
                return {
                  title: b.title.trim().slice(0, 20),
                  url,
                };
              }
              const responseTexts = filledVariants(b.responseVariants);
              const notFollowing = filledVariants(b.notFollowingVariants);
              return {
                title: b.title.trim().slice(0, 20),
                responseText: responseTexts[0] || undefined,
                ...(responseTexts.length > 1 ? { responseTexts } : {}),
                addTag: b.addTag.trim() || undefined,
                handoff: b.handoff || undefined,
                requireFollow: b.handoff ? undefined : b.requireFollow || undefined,
                notFollowingText:
                  !b.handoff && b.requireFollow
                    ? notFollowing[0] ||
                      'Hum, olhei aqui e ainda não seguiu. Segue que te mando o link.'
                    : undefined,
                ...(!b.handoff && b.requireFollow && notFollowing.length > 1
                  ? { notFollowingTexts: notFollowing }
                  : {}),
              };
            }),
        },
        draft.variantPickMode
      )
    );
  }

  if (draft.handoffEnabled) {
    deliveryActions.push({
      type: 'human_handoff',
      text: draft.handoffText.trim() || 'Um atendente vai te responder em breve.',
    });
  }

  if (draft.conditionEnabled) {
    actions.push({
      type: 'condition',
      rule: draft.conditionRule,
      tag: draft.conditionTag.trim() || undefined,
      field: draft.conditionField.trim() || undefined,
      value: draft.conditionValue.trim() || undefined,
      then: deliveryActions,
      else: [],
    });
  } else {
    actions.push(...deliveryActions);
  }

  return actions;
}

export function AutomationBuilder({ automationId }: AutomationBuilderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = Boolean(automationId);
  const [accounts, setAccounts] = useState<IGAccountOption[]>([]);
  const [draft, setDraft] = useState<AutomationDraft>(defaultAutomationDraft);
  const [step, setStep] = useState<BuilderStep>('setup');
  const [selected, setSelected] = useState<FlowNodeId | null>('trigger');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingAutomation, setLoadingAutomation] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [templateApplied, setTemplateApplied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/instagram/accounts');
        if (res.ok) {
          const data = await res.json();
          const list: IGAccountOption[] = data.accounts || [];
          setAccounts(list);
          if (!isEdit && list.length === 1) {
            setDraft((prev) => ({ ...prev, igAccountId: list[0].id }));
          }
        }
      } catch (err) {
        console.error('Error fetching accounts:', err);
      } finally {
        setLoadingAccounts(false);
      }
    };
    load();
  }, [isEdit]);

  useEffect(() => {
    if (isEdit || templateApplied) return;
    const template = parseTemplate(searchParams.get('template'));
    if (!template) return;
    setDraft((prev) => applyAutomationTemplate(template, prev));
    setTemplateApplied(true);
  }, [isEdit, searchParams, templateApplied]);

  useEffect(() => {
    if (!automationId) return;

    const load = async () => {
      setLoadingAutomation(true);
      try {
        const res = await fetch(`/api/automations/${automationId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Automação não encontrada');

        const { draft: nextDraft, mediaIds } = draftFromAutomation(data.automation);
        let selectedPosts = nextDraft.selectedPosts;

        if (needsPostSelection(nextDraft.triggerKind) && mediaIds.length > 0 && nextDraft.igAccountId) {
          try {
            const mediaRes = await fetch(
              `/api/instagram/media?accountId=${nextDraft.igAccountId}&limit=50`
            );
            if (mediaRes.ok) {
              const mediaData = await mediaRes.json();
              const byId = new Map<string, InstagramMediaPost>(
                (mediaData.posts || []).map((post: InstagramMediaPost) => [post.id, post])
              );
              selectedPosts = mediaIds.map(
                (id) =>
                  byId.get(id) || {
                    id,
                    caption: 'Publicação salva',
                    mediaType: 'IMAGE',
                    mediaUrl: null,
                    thumbnailUrl: null,
                    permalink: '',
                    timestamp: '',
                    isReel: false,
                  }
              );
            }
          } catch (err) {
            console.error('Error hydrating selected posts:', err);
          }
        }

        setDraft({ ...nextDraft, selectedPosts });
        setStep('flow');
        setSelected('trigger');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao carregar automação');
        router.replace('/automations');
      } finally {
        setLoadingAutomation(false);
      }
    };

    load();
  }, [automationId, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const validKeywords = draft.keywords.map((k) => k.trim()).filter(Boolean);

      if (!draft.name.trim()) {
        setSelected('start');
        throw new Error('Informe o nome da automação');
      }
      if (!draft.igAccountId) {
        setStep('setup');
        throw new Error('Selecione uma conta do Instagram');
      }
      if (needsPostSelection(draft.triggerKind) && draft.mediaScope === 'specific' && draft.selectedPosts.length === 0) {
        setStep('post');
        throw new Error('Selecione pelo menos uma publicação');
      }
      if (needsKeywords(draft.triggerKind) && draft.matchType !== 'any' && validKeywords.length === 0) {
        setSelected('trigger');
        throw new Error('Adicione pelo menos uma palavra-chave');
      }

      if (draft.followCheckEnabled) {
        if (
          !firstVariant(draft.gatePromptVariants) ||
          !firstVariant(draft.dmVariants) ||
          !firstVariant(draft.dmIfNotFollowingVariants)
        ) {
          setSelected('followCheck');
          throw new Error('Preencha o follow gate (prompt, conteúdo e mensagem se não segue)');
        }
      }

      const actions = buildActions(draft);
      if (actions.length === 0) {
        throw new Error('Adicione pelo menos uma ação ao fluxo');
      }

      const mediaIds = draft.selectedPosts.map((p) => p.id);
      const payload = {
        name: draft.name.trim(),
        igAccountId: draft.igAccountId,
        triggerType: draft.triggerKind,
        triggerConfig: {
          trigger: {
            keywords: draft.matchType === 'any' ? [] : validKeywords,
            matchType: draft.matchType,
            caseSensitive: draft.caseSensitive,
            mediaScope: needsPostSelection(draft.triggerKind) ? draft.mediaScope : 'any',
            mediaIds:
              needsPostSelection(draft.triggerKind) && draft.mediaScope === 'specific'
                ? mediaIds
                : [],
          },
        },
        actionsConfig: {
          actions,
          canvas: {
            nodePositions: draft.nodePositions,
          },
        },
      };

      const res = await fetch(isEdit ? `/api/automations/${automationId}` : '/api/automations', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || (isEdit ? 'Erro ao atualizar automação' : 'Erro ao criar automação'));
      }

      toast.success(isEdit ? 'Automação atualizada' : 'Automação criada');
      signalEngagement({ source: isEdit ? 'automation-update' : 'automation-create' });
      router.push('/automations');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSaving(false);
    }
  };

  if (loadingAccounts || loadingAutomation) {
    return <AutomationBuilderSkeleton />;
  }

  if (step === 'setup') {
    return (
      <TriggerSetupStep
        draft={draft}
        accounts={accounts}
        onChange={setDraft}
        onNext={() => {
          if (needsPostSelection(draft.triggerKind)) {
            setStep('post');
          } else {
            if (!draft.name.trim()) {
              setDraft((prev) => ({
                ...prev,
                name: prev.name.trim() || TRIGGER_NAME_FALLBACK[prev.triggerKind],
              }));
            }
            setStep('flow');
            setSelected('trigger');
          }
        }}
      />
    );
  }

  if (step === 'post') {
    return (
      <PostSelectStep
        draft={draft}
        accounts={accounts}
        onChange={setDraft}
        onNext={() => {
          if (!draft.name.trim()) {
            const account = accounts.find((a) => a.id === draft.igAccountId);
            const label =
              draft.mediaScope === 'any'
                ? 'Qualquer publicação'
                : draft.selectedPosts[0]?.caption?.slice(0, 28) || 'Publicação';
            setDraft((prev) => ({
              ...prev,
              name:
                prev.name.trim() ||
                `Comentário · ${label}${account ? ` · @${account.igUsername}` : ''}`,
            }));
          }
          setStep('flow');
          setSelected('trigger');
        }}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <header
        className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-white px-3 sm:gap-3 sm:px-4"
        onMouseDown={() => setSelected(null)}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStep(needsPostSelection(draft.triggerKind) ? 'post' : 'setup')}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Button>
          <div className="hidden h-6 w-px bg-border sm:block" />
          <Input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Nome da automação"
            className="h-9 min-w-0 max-w-full flex-1 border-transparent bg-transparent px-2 text-base font-semibold tracking-tight shadow-none focus-visible:border-border focus-visible:bg-white sm:max-w-xs"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
          <Link href="/automations" className="hidden sm:block">
            <Button type="button" variant="outline" size="sm">
              Cancelar
            </Button>
          </Link>
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              'Salvando...'
            ) : (
              <>
                <Save className="mr-1.5 h-4 w-4" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-[280px] flex-1 overflow-hidden sm:min-h-[420px]">
          <FlowCanvas
            draft={draft}
            accounts={accounts}
            selected={selected}
            onSelect={setSelected}
            onChange={setDraft}
          />
        </div>

        {selected ? (
          <NodeInspector
            selected={selected}
            draft={draft}
            accounts={accounts}
            onChange={setDraft}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

const TRIGGER_NAME_FALLBACK: Record<TriggerKind, string> = {
  comment: 'Automação de comentário',
  live_comment: 'Automação de Live',
  dm_keyword: 'DM por palavra-chave',
  default_reply: 'Default Reply',
  story_reply: 'Resposta de Story',
  story_mention: 'Menção no Story',
};
