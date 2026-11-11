'use client';

import { cn } from '@/lib/utils/cn';

type ToggleSwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
};

export function ToggleSwitch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className,
}: ToggleSwitchProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 text-sm font-medium text-foreground',
        disabled && 'opacity-60',
        className
      )}
    >
      <span className="min-w-0 flex-1 leading-snug">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed',
          checked ? 'bg-emerald-500' : 'bg-zinc-300'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}
