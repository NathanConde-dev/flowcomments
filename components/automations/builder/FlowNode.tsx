'use client';

import {
  CirclePlay,
  Clock3,
  Filter,
  GitBranch,
  MessageCircleMore,
  Reply,
  SendHorizontal,
  Tag,
  TextCursorInput,
  UserRoundCheck,
  type LucideIcon,
} from 'lucide-react';
import type { FlowNodeId } from './types';
import { cn } from '@/lib/utils/cn';
import { StatusBadge } from '@/components/ui/status-badge';

const nodeMeta: Record<
  FlowNodeId,
  {
    title: string;
    icon: LucideIcon;
    well: string;
    iconClass: string;
  }
> = {
  start: {
    title: 'Início',
    icon: CirclePlay,
    well: 'bg-zinc-900',
    iconClass: 'text-white',
  },
  trigger: {
    title: 'Gatilho',
    icon: MessageCircleMore,
    well: 'bg-amber-500',
    iconClass: 'text-white',
  },
  reply: {
    title: 'Responder comentário',
    icon: Reply,
    well: 'bg-sky-500',
    iconClass: 'text-white',
  },
  followCheck: {
    title: 'Só se seguiu',
    icon: GitBranch,
    well: 'bg-violet-500',
    iconClass: 'text-white',
  },
  dm: {
    title: 'Enviar DM',
    icon: SendHorizontal,
    well: 'bg-emerald-500',
    iconClass: 'text-white',
  },
  dmNotFollowing: {
    title: 'Pedir pra seguir',
    icon: UserRoundCheck,
    well: 'bg-rose-500',
    iconClass: 'text-white',
  },
  delay: {
    title: 'Delay',
    icon: Clock3,
    well: 'bg-zinc-500',
    iconClass: 'text-white',
  },
  condition: {
    title: 'Condição',
    icon: Filter,
    well: 'bg-indigo-500',
    iconClass: 'text-white',
  },
  addTag: {
    title: 'Adicionar tag',
    icon: Tag,
    well: 'bg-orange-500',
    iconClass: 'text-white',
  },
  askInput: {
    title: 'Pedir dado',
    icon: TextCursorInput,
    well: 'bg-teal-500',
    iconClass: 'text-white',
  },
};

interface FlowNodeProps {
  id: FlowNodeId;
  selected: boolean;
  disabled?: boolean;
  dragging?: boolean;
  summary: React.ReactNode;
  onSelect: () => void;
  onContextMenu?: (event: React.MouseEvent) => void;
  onPointerDown?: (event: React.PointerEvent) => void;
  className?: string;
  style?: React.CSSProperties;
  titleOverride?: string;
}

export function FlowNode({
  id,
  selected,
  disabled,
  dragging,
  summary,
  onSelect,
  onContextMenu,
  onPointerDown,
  className,
  style,
  titleOverride,
}: FlowNodeProps) {
  const meta = nodeMeta[id];
  const Icon = meta.icon;

  return (
    <button
      type="button"
      data-flow-node
      onClick={onSelect}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
      style={style}
      className={cn(
        'w-[280px] touch-none text-left rounded-xl border p-4 cursor-grab active:cursor-grabbing transition-[transform,box-shadow,border-color,opacity,background-color,color,left,top] duration-200 ease-out',
        selected
          ? 'border-zinc-900 bg-zinc-900 text-white shadow-[0_12px_28px_-14px_rgba(0,0,0,0.55)]'
          : 'border-border bg-white text-foreground shadow-soft hover:border-zinc-300 hover:shadow-md',
        dragging && 'z-30 scale-[1.03] shadow-[0_22px_40px_-18px_rgba(0,0,0,0.35)] !transition-none',
        !dragging && 'hover:-translate-y-0.5',
        disabled && 'opacity-55',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md shadow-sm',
            selected ? 'bg-white/15 ring-1 ring-white/20' : meta.well
          )}
        >
          <Icon
            className={cn('h-4 w-4', selected ? 'text-white' : meta.iconClass)}
            strokeWidth={2.25}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className={cn('text-sm font-bold', selected ? 'text-white' : 'text-foreground')}>
              {titleOverride || meta.title}
            </h3>
            {disabled && (
              <StatusBadge tone="expired" icon={false} className="uppercase text-[10px]">
                Off
              </StatusBadge>
            )}
          </div>
          <div
            className={cn(
              'mt-1.5 text-sm',
              selected
                ? 'text-white/70 [&_.text-foreground]:text-white [&_.text-primary-600]:text-white/80 [&_.text-primary-700]:text-white [&_.rounded-full]:bg-white/15 [&_.rounded-full]:text-white [&_.rounded-full]:ring-white/20'
                : 'text-muted-foreground'
            )}
          >
            {summary}
          </div>
        </div>
      </div>
    </button>
  );
}

export { nodeMeta };
