import {
  AlertTriangle,
  BadgeCheck,
  CircleX,
  Clock,
  Clock3,
  Loader,
  Send,
  Smile,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type StatusTone =
  | 'pending'
  | 'progress'
  | 'submitted'
  | 'review'
  | 'success'
  | 'failed'
  | 'expired';

const toneStyles: Record<
  StatusTone,
  { className: string; icon: LucideIcon }
> = {
  pending: {
    className: 'bg-[#F8EDE4] text-[#9A5B2F]',
    icon: AlertTriangle,
  },
  progress: {
    className: 'bg-[#E7F0FE] text-[#2F6FED]',
    icon: Loader,
  },
  submitted: {
    className: 'bg-[#EEE8FE] text-[#6B4DE6]',
    icon: Send,
  },
  review: {
    className: 'bg-[#F4EFD8] text-[#8A6A1F]',
    icon: Smile,
  },
  success: {
    className: 'bg-[#E5F6EA] text-[#1F7A45]',
    icon: BadgeCheck,
  },
  failed: {
    className: 'bg-[#FCE8E8] text-[#C23B3B]',
    icon: CircleX,
  },
  expired: {
    className: 'bg-[#ECECEC] text-[#5C5C5C]',
    icon: Clock,
  },
};

interface StatusBadgeProps {
  tone: StatusTone;
  children: React.ReactNode;
  icon?: LucideIcon | false;
  className?: string;
}

export function StatusBadge({ tone, children, icon, className }: StatusBadgeProps) {
  const config = toneStyles[tone];
  const Icon = icon === false ? null : icon || config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold tracking-tight',
        config.className,
        className
      )}
    >
      {Icon && (
        <Icon
          className={cn('h-3.5 w-3.5 shrink-0', tone === 'progress' && 'animate-spin')}
        />
      )}
      {children}
    </span>
  );
}

/** Convenience aliases for common product states */
export function ActiveBadge() {
  return <StatusBadge tone="success">Ativo</StatusBadge>;
}

export function PausedBadge() {
  return <StatusBadge tone="expired" icon={Clock3}>Pausado</StatusBadge>;
}

export function ConnectedBadge() {
  return <StatusBadge tone="success">Conectado</StatusBadge>;
}

export function OpenBadge() {
  return <StatusBadge tone="progress" icon={false}>Aberto</StatusBadge>;
}

export function ClosedBadge() {
  return <StatusBadge tone="expired" icon={false}>Fechado</StatusBadge>;
}
