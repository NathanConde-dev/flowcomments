'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/ui/toast';
import type { AppLocale } from '@/i18n/config';

export function LanguageSwitcher() {
  const t = useTranslations('language');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const setLocale = (next: AppLocale) => {
    if (next === locale) return;
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
      toast.success(t('saved'));
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{t('title')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={locale === 'en' ? 'default' : 'outline'}
          disabled={pending}
          onClick={() => setLocale('en')}
        >
          {tCommon('english')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={locale === 'pt' ? 'default' : 'outline'}
          disabled={pending}
          onClick={() => setLocale('pt')}
        >
          {tCommon('portuguese')}
        </Button>
      </div>
    </div>
  );
}
