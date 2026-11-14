'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  name: string;
  value?: string;
  defaultValue?: string;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
};

export function SelectField({
  name,
  value,
  defaultValue = '',
  options,
  placeholder = 'Selecionar',
  className,
  buttonClassName,
  disabled,
  onChange,
}: SelectFieldProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const selected = value ?? uncontrolled;

  const selectedLabel = useMemo(() => {
    const match = options.find((option) => option.value === selected);
    return match?.label || placeholder;
  }, [options, placeholder, selected]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (next: string) => {
    if (value === undefined) setUncontrolled(next);
    onChange?.(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <input type="hidden" name={name} value={selected} />
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border bg-white px-3 text-left text-sm text-foreground transition',
          'hover:border-border/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'ring-2 ring-ring',
          buttonClassName
        )}
      >
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 max-h-64 overflow-auto rounded-2xl border border-border/70 bg-white p-1.5 shadow-float"
        >
          {options.map((option) => {
            const active = option.value === selected;
            return (
              <button
                key={`${option.value}::${option.label}`}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => choose(option.value)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition',
                  active
                    ? 'bg-muted font-semibold text-foreground'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                )}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {active ? <Check className="h-4 w-4 shrink-0 text-foreground" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
