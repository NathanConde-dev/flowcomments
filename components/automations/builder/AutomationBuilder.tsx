'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FlowCanvas } from './FlowCanvas';
import { NodeInspector } from './NodeInspector';
import { PostSelectStep } from './PostSelectStep';
import { AutomationBuilderSkeleton } from '@/components/ui/skeletons';
import {
  defaultAutomationDraft,
  type AutomationDraft,
  type BuilderStep,
  type FlowNodeId,
  type IGAccountOption,
  type InstagramMediaPost,
  type MatchType,
  type MediaScope,
} from './types';
import { toast } from '@/lib/ui/toast';

type AutomationBuilderProps = {
  automationId?: string;
};

function draftFromAutomation(automation: {
  name: string;
  igAccountId: string;
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
    actions?: Array<{ type: string; text?: string; delay?: number }>;
  };
}): { draft: AutomationDraft; mediaIds: string[] } {
  const trigger = automation.triggerConfig?.trigger || {};
  const actions = automation.actionsConfig?.actions || [];
  const reply = actions.find((a) => a.type === 'reply_comment');
  const dm = actions.find((a) => a.type === 'send_dm');
  const mediaIds = trigger.mediaIds || [];
  const mediaScope: MediaScope =
    trigger.mediaScope || (mediaIds.length > 0 ? 'specific' : 'any');

  return {
    mediaIds,
    draft: {
      name: automation.name || '',
      igAccountId: automation.igAccountId || '',
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
      keywords: trigger.keywords?.length ? trigger.keywords : [''],
      matchType: trigger.matchType || 'contains',
      caseSensitive: Boolean(trigger.caseSensitive),
      replyEnabled: Boolean(reply),
      replyComment: reply?.text || '',
      dmEnabled: Boolean(dm),
      sendDm: dm?.text || '',
      dmDelay: typeof dm?.delay === 'number' ? dm.delay : 1,
    },
  };
}

export function AutomationBuilder({ automationId }: AutomationBuilderProps) {
  const router = useRouter();
  const isEdit = Boolean(automationId);
  const [accounts, setAccounts] = useState<IGAccountOption[]>([]);
  const [draft, setDraft] = useState<AutomationDraft>(defaultAutomationDraft);
  const [step, setStep] = useState<BuilderStep>('post');
  const [selected, setSelected] = useState<FlowNodeId>('trigger');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingAutomation, setLoadingAutomation] = useState(isEdit);
  const [saving, setSaving] = useState(false);

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
    if (!automationId) return;

    const load = async () => {
      setLoadingAutomation(true);
      try {
        const res = await fetch(`/api/automations/${automationId}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Automação não encontrada');
        }

        const { draft: nextDraft, mediaIds } = draftFromAutomation(data.automation);
        let selectedPosts = nextDraft.selectedPosts;

        if (nextDraft.mediaScope === 'specific' && mediaIds.length > 0 && nextDraft.igAccountId) {
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
        setStep('post');
        throw new Error('Selecione uma conta do Instagram');
      }
      if (draft.mediaScope === 'specific' && draft.selectedPosts.length === 0) {
        setStep('post');
        throw new Error('Selecione pelo menos uma publicação');
      }
      if (validKeywords.length === 0) {
        setSelected('trigger');
        throw new Error('Adicione pelo menos uma palavra-chave');
      }

      const actions = [];
      if (draft.replyEnabled && draft.replyComment.trim()) {
        actions.push({ type: 'reply_comment', text: draft.replyComment.trim() });
      }
      if (draft.dmEnabled && draft.sendDm.trim()) {
        actions.push({
          type: 'send_dm',
          text: draft.sendDm.trim(),
          delay: draft.dmDelay,
        });
      }

      if (actions.length === 0) {
        setSelected(draft.replyEnabled ? 'reply' : 'dm');
        throw new Error('Ative e preencha pelo menos uma ação (reply ou DM)');
      }

      const mediaIds = draft.selectedPosts.map((p) => p.id);
      const payload = {
        name: draft.name.trim(),
        igAccountId: draft.igAccountId,
        triggerConfig: {
          trigger: {
            keywords: validKeywords,
            matchType: draft.matchType,
            caseSensitive: draft.caseSensitive,
            mediaScope: draft.mediaScope,
            mediaIds: draft.mediaScope === 'specific' ? mediaIds : [],
          },
        },
        actionsConfig: { actions },
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
              name: prev.name.trim() || `Comentário · ${label}${account ? ` · @${account.igUsername}` : ''}`,
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
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-white px-3 py-3 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => setStep('post')}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Publicações</span>
          </Button>
          <div className="hidden h-6 w-px bg-border sm:block" />
          <Input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Nome da automação"
            className="h-9 min-w-0 max-w-full flex-1 border-transparent bg-transparent px-2 text-base font-semibold tracking-tight shadow-none focus-visible:border-border focus-visible:bg-white sm:max-w-xs"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
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
        <div className="fc-canvas-dot min-h-[280px] flex-1 overflow-auto sm:min-h-[420px]">
          <FlowCanvas
            draft={draft}
            accounts={accounts}
            selected={selected}
            onSelect={setSelected}
          />
        </div>

        <NodeInspector
          selected={selected}
          draft={draft}
          accounts={accounts}
          onChange={setDraft}
        />
      </div>
    </div>
  );
}
