'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { toast } from '@/lib/ui/toast';

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || tCommon('error'));
      }

      toast.success(t('loginSuccess'));
      router.push('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F7F7] p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 fc-canvas-dot opacity-70"
        style={{
          maskImage: 'radial-gradient(ellipse 75% 65% at 50% 45%, #000 20%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 75% 65% at 50% 45%, #000 20%, transparent 75%)',
        }}
      />

      <a
        href="https://flowcomments.com"
        className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-3 py-2 text-sm font-medium text-muted-foreground shadow-soft backdrop-blur-sm transition-colors hover:bg-white hover:text-foreground sm:left-6 sm:top-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('backHome')}
      </a>

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <LanguageSwitcher variant="nav" />
      </div>

      <Card className="relative z-10 w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center">
            <BrandLogo className="text-3xl tracking-normal" />
          </div>
          <CardDescription>{t('loginSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">{t('username')}</label>
              <Input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                placeholder="you@email.com"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">{t('password')}</label>
              <Input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('signingIn') : t('signIn')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
