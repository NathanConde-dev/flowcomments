import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';

export default async function NotFound() {
  const t = await getTranslations('common');

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#F7F7F7] px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(24,24,27,0.08), transparent), radial-gradient(circle at 90% 80%, rgba(24,24,27,0.04), transparent)',
        }}
      />
      <div className="relative z-10 w-full max-w-lg text-center">
        <div className="mb-8 flex justify-center">
          <BrandLogo href="/" className="text-2xl" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t('notFoundCode')}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t('notFoundTitle')}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-pretty text-[15px] leading-relaxed text-muted-foreground">
          {t('notFoundBody')}
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link href="/">
            <Button className="w-full rounded-full px-6 sm:w-auto">{t('notFoundHome')}</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full rounded-full bg-white/80 px-6 sm:w-auto">
              {t('notFoundDashboard')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
