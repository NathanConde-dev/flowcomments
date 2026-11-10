'use client';

import { MessageCircle, MessageSquare, Play, Zap } from 'lucide-react';
import type { FlowNodeId } from './types';
import { cn } from '@/lib/utils/cn';
import { StatusBadge } from '@/components/ui/status-badge';

const nodeMeta: Record<
  FlowNodeId,
  { title: string; icon: typeof Zap; accent: string }
> = {
  start: {
    title: 'Início',
    icon: Play,
    accent: 'from-primary-500 to-primary-700',
  },
  trigger: {
    title: 'Gatilho',
    icon: Zap,
    accent: 'from-violet-500 to-primary-600',
  },
  reply: {
    title: 'Responder comentário',
    icon: MessageCircle,
    accent: 'from-sky-500 to-blue-600',
  },
  dm: {
    title: 'Enviar DM',
    icon: MessageSquare,
    accent: 'from-emerald-500 to-teal-600',
  },
};

interface FlowNodeProps {
  id: FlowNodeId;
  selected: boolean;
  disabled?: boolean;
  summary: React.ReactNode;
  onSelect: () => void;
}

export function FlowNode({ id, selected, disabled, summary, onSelect }: FlowNodeProps) {
  const meta = nodeMeta[id];
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full max-w-md text-left rounded-2xl border bg-white p-4 shadow-soft cursor-pointer transition-[transform,box-shadow,border-color,opacity] duration-200 ease-out hover:-translate-y-0.5',
        selected
          ? 'border-foreground ring-2 ring-black/10 shadow-node'
          : 'border-border hover:border-zinc-300 hover:shadow-md',
        disabled && 'opacity-55'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
            meta.accent
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground">{meta.title}</h3>
            {disabled && (
              <StatusBadge tone="expired" icon={false} className="uppercase text-[10px]">
                Off
              </StatusBadge>
            )}
          </div>
          <div className="mt-1.5 text-sm text-muted-foreground">{summary}</div>
        </div>
      </div>
    </button>
  );
}
