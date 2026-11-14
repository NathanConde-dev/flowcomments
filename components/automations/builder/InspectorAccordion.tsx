'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type InspectorAccordionProps = {
  title: string;
  /** Shown when collapsed — keeps context without opening. */
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function InspectorAccordion({
  title,
  summary,
  defaultOpen = false,
  children,
  className,
}: InspectorAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-white', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {!open && summary ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{summary}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150',
            open && 'rotate-180'
          )}
        />
      </button>
      {open ? (
        <div id={panelId} className="space-y-3 border-t border-border px-3 py-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
