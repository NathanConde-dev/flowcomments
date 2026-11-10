'use client';

import { Plus } from 'lucide-react';
import { FlowNode } from './FlowNode';
import type { AutomationDraft, FlowNodeId, IGAccountOption } from './types';

interface FlowCanvasProps {
  draft: AutomationDraft;
  accounts: IGAccountOption[];
  selected: FlowNodeId;
  onSelect: (id: FlowNodeId) => void;
}

function Connector() {
  return (
    <div className="flex flex-col items-center py-1">
      <div className="h-5 w-px bg-primary-200" />
      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary-200 bg-white text-primary-500 shadow-sm">
        <Plus className="h-3.5 w-3.5" />
      </div>
      <div className="h-5 w-px bg-primary-200" />
    </div>
  );
}

export function FlowCanvas({ draft, accounts, selected, onSelect }: FlowCanvasProps) {
  const account = accounts.find((a) => a.id === draft.igAccountId);
  const keywords = draft.keywords.map((k) => k.trim()).filter(Boolean);

  return (
    <div className="flex flex-col items-center py-8 px-4">
      <FlowNode
        id="start"
        selected={selected === 'start'}
        onSelect={() => onSelect('start')}
        summary={
          <div className="space-y-1">
            <p className="truncate font-medium text-foreground">
              {draft.name.trim() || 'Sem nome'}
            </p>
            <p className="truncate text-xs">
              {account ? `@${account.igUsername}` : 'Selecione uma conta'}
            </p>
          </div>
        }
      />

      <Connector />

      <FlowNode
        id="trigger"
        selected={selected === 'trigger'}
        onSelect={() => onSelect('trigger')}
        summary={
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">
              {draft.mediaScope === 'any'
                ? 'Qualquer publicação'
                : `${draft.selectedPosts.length} publicação${draft.selectedPosts.length === 1 ? '' : 'ões'}`}
            </p>
            {keywords.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {keywords.slice(0, 4).map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700"
                  >
                    {keyword}
                  </span>
                ))}
                {keywords.length > 4 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    +{keywords.length - 4}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs">Defina palavras-chave do comentário</span>
            )}
          </div>
        }
      />

      <Connector />

      <FlowNode
        id="reply"
        selected={selected === 'reply'}
        disabled={!draft.replyEnabled}
        onSelect={() => onSelect('reply')}
        summary={
          draft.replyEnabled ? (
            <p className="line-clamp-2 text-xs leading-relaxed">
              {draft.replyComment.trim() || 'Escreva a resposta do comentário'}
            </p>
          ) : (
            <span className="text-xs">Ação desativada</span>
          )
        }
      />

      <Connector />

      <FlowNode
        id="dm"
        selected={selected === 'dm'}
        disabled={!draft.dmEnabled}
        onSelect={() => onSelect('dm')}
        summary={
          draft.dmEnabled ? (
            <div className="space-y-1">
              <p className="line-clamp-2 text-xs leading-relaxed">
                {draft.sendDm.trim() || 'Escreva a mensagem do direct'}
              </p>
              <p className="text-[11px] font-medium text-primary-600">
                Delay {draft.dmDelay}s
              </p>
            </div>
          ) : (
            <span className="text-xs">Ação desativada</span>
          )
        }
      />
    </div>
  );
}
