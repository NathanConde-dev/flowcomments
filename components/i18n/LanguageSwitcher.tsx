'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { toast } from '@/lib/ui/toast';
import { localeLabels, locales, type AppLocale } from '@/i18n/config';

export function LanguageSwitcher({
  variant = 'settings',
}: {
  variant?: 'settings' | 'nav';
}) {
  const t = useTranslations('language');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const setLocale = (next: AppLocale) => {
    if (next === locale) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const res = await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      });
      if (!res.ok) {
        toast.error(tCommon('error'));
        return;
      }
      if (variant === 'settings') toast.success(t('saved'));
      setOpen(false);
      router.refresh();
    });
  };

  if (variant === 'nav') {
    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          aria-expanded={open}
          disabled={pending}
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
            open
              ? 'bg-zinc-900 text-white'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <span>{locale.toUpperCase()}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
        {open ? (
          <div
            role="listbox"
            className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[11rem] overflow-hidden rounded-2xl border border-border/70 bg-white p-1.5 text-sm shadow-float"
          >
            {locales.map((code) => {
              const active = code === locale;
              return (
                <button
                  key={code}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => setLocale(code)}
                  className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left transition ${
                    active
                      ? 'bg-muted font-semibold text-foreground'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  }`}
                >
                  {localeLabels[code]}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{t('title')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
      </div>
      <div className="relative inline-block" ref={ref}>
        <button
          type="button"
          aria-expanded={open}
          disabled={pending}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium"
        >
          {localeLabels[locale]}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
        {open ? (
          <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 min-w-[12rem] overflow-hidden rounded-2xl border border-border/70 bg-white p-1.5 text-sm shadow-float">
            {locales.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left transition ${
                  code === locale
                    ? 'bg-muted font-semibold text-foreground'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                }`}
              >
                {localeLabels[code]}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
